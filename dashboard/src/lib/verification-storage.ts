/**
 * @fileType: utility
 * @status: current
 * @updated: 2025-12-05
 * @tags: [verification, graph-storage, neo4j, epic-004, sprint-3, task-7]
 * @related: [../app/api/v1/graph/_neo4j.ts, ../app/api/v1/graph/events/route.ts, ../../packages/cli/src/commands/verify.ts]
 * @priority: high
 * @complexity: medium
 * @dependencies: [neo4j-driver]
 */

/**
 * Verification Result Storage (EPIC-004 Sprint 3 TASK-7)
 *
 * Stores verification results in Neo4j graph for audit trail.
 * Creates VerificationResult nodes and links them to tasks.
 *
 * This enables:
 * - Audit trail of verification attempts
 * - Tracking verification history per task
 * - Filtering by agent, time range, pass/fail status
 * - Analytics on verification patterns
 */

import { runQuery, getSession } from '../app/api/v1/graph/_neo4j';

/**
 * Result of verifying a single acceptance criterion
 */
export interface CriterionResult {
  id: string;
  description: string;
  passed: boolean;
  details?: string;
  duration_ms?: number;
}

/**
 * Overall verification result structure
 * Matches the interface from packages/cli/src/commands/verify.ts
 */
export interface VerificationResult {
  taskId: string;
  taskTitle?: string;
  passed: boolean;
  timestamp: Date;
  criteria: CriterionResult[];
  summary: string;
}

/**
 * Stored verification result node in Neo4j
 */
export interface StoredVerificationResult {
  id: string;
  task_id: string;
  passed: boolean;
  timestamp: string;
  criteria_passed: number;
  criteria_total: number;
  agent_id?: string;
  summary: string;
  criteria_details: CriterionResult[];
}

/**
 * Store a verification result in the Neo4j graph
 *
 * Creates a VerificationResult node and links it to the task (if exists).
 * Multiple verification attempts can exist for a single task.
 *
 * @param result - The verification result to store
 * @param agentId - Optional agent ID who performed the verification
 * @returns The ID of the created VerificationResult node
 */
export async function storeVerificationResult(
  result: VerificationResult,
  agentId?: string
): Promise<string> {
  const session = getSession();

  try {
    const criteriaPassed = result.criteria.filter(c => c.passed).length;
    const criteriaTotal = result.criteria.length;

    // Generate verification result ID
    const verificationId = `ver_${result.taskId}_${Date.now()}`;

    // Create VerificationResult node and link to task
    const query = `
      // Create the verification result node
      CREATE (v:VerificationResult {
        id: $id,
        task_id: $taskId,
        passed: $passed,
        timestamp: datetime($timestamp),
        criteria_passed: $criteriaPassed,
        criteria_total: $criteriaTotal,
        agent_id: $agentId,
        summary: $summary,
        criteria_details: $criteriaDetails
      })

      // Link to task if it exists
      WITH v
      OPTIONAL MATCH (t:Task {id: $taskId})
      FOREACH (task IN CASE WHEN t IS NOT NULL THEN [t] ELSE [] END |
        CREATE (task)-[:VERIFIED_BY]->(v)
      )

      // Link to agent if provided
      WITH v
      OPTIONAL MATCH (a:Agent {id: $agentId})
      FOREACH (agent IN CASE WHEN a IS NOT NULL THEN [a] ELSE [] END |
        CREATE (agent)-[:PERFORMED]->(v)
      )

      RETURN v.id as id
    `;

    const queryResult = await session.run(query, {
      id: verificationId,
      taskId: result.taskId,
      passed: result.passed,
      timestamp: result.timestamp.toISOString(),
      criteriaPassed,
      criteriaTotal,
      agentId: agentId || null,
      summary: result.summary,
      criteriaDetails: JSON.stringify(result.criteria),
    });

    if (queryResult.records.length === 0) {
      throw new Error('Failed to create verification result');
    }

    return queryResult.records[0].get('id');
  } finally {
    await session.close();
  }
}

/**
 * Get verification history for a task
 *
 * Retrieves all verification attempts for a given task, ordered by timestamp (newest first).
 *
 * @param taskId - The task ID to query
 * @param limit - Maximum number of results to return (default: 10)
 * @returns Array of verification results
 */
export async function getVerificationHistory(
  taskId: string,
  limit: number = 10
): Promise<StoredVerificationResult[]> {
  const query = `
    MATCH (t:Task {id: $taskId})-[:VERIFIED_BY]->(v:VerificationResult)
    RETURN v
    ORDER BY v.timestamp DESC
    LIMIT $limit
  `;

  const results = await runQuery<{ v: any }>(query, { taskId, limit });

  return results.map(record => {
    const v = record.v.properties;
    return {
      id: v.id,
      task_id: v.task_id,
      passed: v.passed,
      timestamp: v.timestamp,
      criteria_passed: v.criteria_passed,
      criteria_total: v.criteria_total,
      agent_id: v.agent_id,
      summary: v.summary,
      criteria_details: JSON.parse(v.criteria_details),
    };
  });
}

/**
 * Get recent verification results across all tasks
 *
 * Useful for dashboards or analytics.
 *
 * @param limit - Maximum number of results to return (default: 20)
 * @param agentId - Optional filter by agent ID
 * @param passedOnly - Optional filter for only passed verifications
 * @returns Array of verification results
 */
export async function getRecentVerifications(
  limit: number = 20,
  agentId?: string,
  passedOnly?: boolean
): Promise<StoredVerificationResult[]> {
  let query = `
    MATCH (v:VerificationResult)
  `;

  // Add agent filter if provided
  if (agentId) {
    query += `
    WHERE v.agent_id = $agentId
    `;
  }

  // Add passed filter if provided
  if (passedOnly !== undefined) {
    query += agentId ? 'AND ' : 'WHERE ';
    query += `v.passed = $passedOnly
    `;
  }

  query += `
    RETURN v
    ORDER BY v.timestamp DESC
    LIMIT $limit
  `;

  const params: any = { limit };
  if (agentId) params.agentId = agentId;
  if (passedOnly !== undefined) params.passedOnly = passedOnly;

  const results = await runQuery<{ v: any }>(query, params);

  return results.map(record => {
    const v = record.v.properties;
    return {
      id: v.id,
      task_id: v.task_id,
      passed: v.passed,
      timestamp: v.timestamp,
      criteria_passed: v.criteria_passed,
      criteria_total: v.criteria_total,
      agent_id: v.agent_id,
      summary: v.summary,
      criteria_details: JSON.parse(v.criteria_details),
    };
  });
}

/**
 * Get verification statistics for a task
 *
 * @param taskId - The task ID to query
 * @returns Statistics about verification attempts
 */
export async function getVerificationStats(taskId: string): Promise<{
  total_attempts: number;
  passed_attempts: number;
  failed_attempts: number;
  last_attempt_passed: boolean | null;
  last_attempt_timestamp: string | null;
}> {
  const query = `
    MATCH (t:Task {id: $taskId})-[:VERIFIED_BY]->(v:VerificationResult)
    WITH
      count(v) as total,
      sum(CASE WHEN v.passed THEN 1 ELSE 0 END) as passed,
      sum(CASE WHEN NOT v.passed THEN 1 ELSE 0 END) as failed
    OPTIONAL MATCH (t:Task {id: $taskId})-[:VERIFIED_BY]->(last:VerificationResult)
    WITH total, passed, failed, last
    ORDER BY last.timestamp DESC
    LIMIT 1
    RETURN
      total,
      passed,
      failed,
      last.passed as lastPassed,
      last.timestamp as lastTimestamp
  `;

  const results = await runQuery<{
    total: number;
    passed: number;
    failed: number;
    lastPassed: boolean | null;
    lastTimestamp: string | null;
  }>(query, { taskId });

  if (results.length === 0) {
    return {
      total_attempts: 0,
      passed_attempts: 0,
      failed_attempts: 0,
      last_attempt_passed: null,
      last_attempt_timestamp: null,
    };
  }

  const record = results[0];
  return {
    total_attempts: record.total || 0,
    passed_attempts: record.passed || 0,
    failed_attempts: record.failed || 0,
    last_attempt_passed: record.lastPassed,
    last_attempt_timestamp: record.lastTimestamp,
  };
}
