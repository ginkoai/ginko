/**
 * @fileType: api-route
 * @status: current
 * @updated: 2026-01-14
 * @tags: [sprint, graph-sync, epic-001, task-2]
 * @related: [_cloud-graph-client.ts, active/route.ts]
 * @priority: critical
 * @complexity: medium
 * @dependencies: [neo4j-driver]
 */

/**
 * POST /api/v1/sprint/sync
 *
 * Sync sprint markdown to graph (TASK-2)
 *
 * Creates Sprint and Task nodes with relationships:
 * - (Sprint)-[:CONTAINS]->(Task)
 * - (Sprint)-[:NEXT_TASK]->(Task) - First incomplete task
 *
 * Request Body:
 * - graphId: Graph namespace identifier
 * - sprintContent: Sprint markdown content to parse and sync
 *
 * Returns:
 * - success: boolean
 * - nodes: Count of nodes created
 * - relationships: Count of relationships created
 * - sprint: Sprint node data
 * - nextTask: ID of next incomplete task
 */

import { NextRequest, NextResponse } from 'next/server';
import { CloudGraphClient } from '../../graph/_cloud-graph-client';

interface SprintGraph {
  sprint: {
    id: string;
    name: string;
    goal: string;
    startDate: string;
    endDate: string;
    progress: number;
    epicId: string | null; // EPIC-011: Parent epic for hierarchy navigation
  };
  tasks: Array<{
    id: string;
    title: string;
    status: 'not_started' | 'in_progress' | 'complete';
    effort: string;
    priority: string;
    files: string[];
    relatedADRs: string[];
    relatedPatterns: string[]; // EPIC-002 Sprint 2: Pattern references
    relatedGotchas: string[]; // EPIC-002 Sprint 2: Gotcha warnings
    owner?: string;
    assignee?: string; // Email extracted from owner for dashboard matching
  }>;
}

export async function POST(request: NextRequest) {
  try {
    // Extract Bearer token
    const authHeader = request.headers.get('authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json(
        { error: 'Missing or invalid authorization header' },
        { status: 401 }
      );
    }

    const token = authHeader.substring(7);

    // Parse request body
    const body = await request.json();
    const { graphId, sprintContent } = body;

    if (!graphId) {
      return NextResponse.json(
        { error: 'Missing required parameter: graphId' },
        { status: 400 }
      );
    }

    if (!sprintContent) {
      return NextResponse.json(
        { error: 'Missing required parameter: sprintContent' },
        { status: 400 }
      );
    }

    // Create graph client
    const client = await CloudGraphClient.fromBearerToken(token, graphId);

    // Parse sprint to graph structure
    const sprintGraph = parseSprintToGraph(sprintContent);

    // Sync to graph
    const result = await syncSprintToGraph(client, sprintGraph, graphId);

    return NextResponse.json({
      success: true,
      ...result,
      sprint: sprintGraph.sprint,
      nextTask: result.nextTaskId,
    });

  } catch (error) {
    console.error('[Sprint Sync] Error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal server error' },
      { status: 500 }
    );
  }
}

/**
 * Extract epic and sprint number from sprint content (ADR-052)
 *
 * Looks for patterns like:
 * - "EPIC-005 Sprint 1" or "Epic 005 Sprint 1"
 * - Epic line: "**Epic:** EPIC-005" or "**Epic:** e005"
 * - Sprint title: "# SPRINT: Market Readiness Sprint 1"
 *
 * @returns { epicNum, sprintNum } or null if not found
 */
function extractEpicSprintNumbers(content: string): { epicNum: number; sprintNum: number } | null {
  // Pattern 1: "EPIC-NNN Sprint N" in content
  const epicSprintMatch = content.match(/EPIC[- ]?(\d{1,3})\s+Sprint\s+(\d{1,2})/i);
  if (epicSprintMatch) {
    return {
      epicNum: parseInt(epicSprintMatch[1], 10),
      sprintNum: parseInt(epicSprintMatch[2], 10),
    };
  }

  // Pattern 2: Separate epic and sprint lines
  const epicLineMatch = content.match(/\*\*Epic:\*\*\s*(?:EPIC[- ]?)?[eE]?(\d{1,3})/i);
  const sprintLineMatch = content.match(/Sprint\s+(\d{1,2})\b/i);
  if (epicLineMatch && sprintLineMatch) {
    return {
      epicNum: parseInt(epicLineMatch[1], 10),
      sprintNum: parseInt(sprintLineMatch[1], 10),
    };
  }

  // Pattern 3: e{NNN}_s{NN} format already in content
  const shortIdMatch = content.match(/\be(\d{3})_s(\d{2})\b/);
  if (shortIdMatch) {
    return {
      epicNum: parseInt(shortIdMatch[1], 10),
      sprintNum: parseInt(shortIdMatch[2], 10),
    };
  }

  return null;
}

/**
 * Extract ad-hoc sprint date from sprint content (ADR-052)
 *
 * Looks for patterns like:
 * - "adhoc_251209_s01" in content
 * - "Ad-hoc Sprint" with date reference
 *
 * @returns { dateStr, sprintNum } or null if not an ad-hoc sprint
 */
function extractAdhocInfo(content: string): { dateStr: string; sprintNum: number } | null {
  // Pattern 1: Explicit adhoc ID in content
  const adhocIdMatch = content.match(/adhoc_(\d{6})_s(\d{2})/i);
  if (adhocIdMatch) {
    return {
      dateStr: adhocIdMatch[1],
      sprintNum: parseInt(adhocIdMatch[2], 10),
    };
  }

  // Pattern 2: Ad-hoc sprint with date in title
  const adhocTitleMatch = content.match(/Ad[- ]?hoc\s+Sprint.*?(\d{4})[- ](\d{2})[- ](\d{2})/i);
  if (adhocTitleMatch) {
    const year = adhocTitleMatch[1].slice(2); // YY from YYYY
    const month = adhocTitleMatch[2];
    const day = adhocTitleMatch[3];
    return {
      dateStr: `${year}${month}${day}`,
      sprintNum: 1, // Default to first ad-hoc sprint of the day
    };
  }

  return null;
}

/**
 * Generate ADR-052 compliant sprint ID
 *
 * Format: e{NNN}_s{NN} for epic sprints, adhoc_{YYMMDD}_s{NN} for ad-hoc
 */
function generateSprintId(content: string): string {
  // Try ad-hoc format first
  const adhocInfo = extractAdhocInfo(content);
  if (adhocInfo) {
    return `adhoc_${adhocInfo.dateStr}_s${String(adhocInfo.sprintNum).padStart(2, '0')}`;
  }

  // Try epic/sprint format
  const epicSprintInfo = extractEpicSprintNumbers(content);
  if (epicSprintInfo) {
    return `e${String(epicSprintInfo.epicNum).padStart(3, '0')}_s${String(epicSprintInfo.sprintNum).padStart(2, '0')}`;
  }

  // Fallback: generate ad-hoc ID with today's date
  const now = new Date();
  const year = String(now.getFullYear()).slice(2);
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  return `adhoc_${year}${month}${day}_s01`;
}

/**
 * Generate ADR-052 compliant task ID
 *
 * Format: {sprintId}_t{NN}
 */
function generateTaskId(sprintId: string, taskNumber: number): string {
  return `${sprintId}_t${String(taskNumber).padStart(2, '0')}`;
}

/**
 * Parse sprint markdown into graph structure
 * Extracts Sprint and Task nodes with relationships
 *
 * Sprint format expected:
 * - Sprint name from filename: SPRINT-YYYY-MM-name.md
 * - Goal from top section
 * - Tasks from sections starting with "### TASK-XXX:"
 *
 * ADR-052: Uses hierarchical IDs (e{NNN}_s{NN}_t{NN})
 */
function parseSprintToGraph(content: string): SprintGraph {
  // Extract sprint metadata from header
  const sprintNameMatch = content.match(/^#\s+(.+?)(?:\n|$)/m);
  const sprintName = sprintNameMatch ? sprintNameMatch[1].trim() : 'Unknown Sprint';

  // Generate ADR-052 compliant sprint ID
  const sprintId = generateSprintId(content);

  // Extract start and end dates
  const dateRangeMatch = content.match(/\*\*(?:Duration|Timeline|Dates?):\*\*\s*([^\n]+)/i);
  let startDate = '';
  let endDate = '';

  if (dateRangeMatch) {
    const dateText = dateRangeMatch[1];
    // Try to parse date range like "2025-11-20 to 2025-12-04"
    const rangeMatch = dateText.match(/(\d{4}-\d{2}-\d{2})\s*(?:to|–|-)\s*(\d{4}-\d{2}-\d{2})/);
    if (rangeMatch) {
      startDate = rangeMatch[1];
      endDate = rangeMatch[2];
    }
  }

  // Extract goal
  const goalMatch = content.match(/\*\*(?:Goal|Sprint Goal):\*\*\s*([^\n]+)/i);
  const goal = goalMatch ? goalMatch[1].trim() : '';

  // Extract progress
  const progressMatch = content.match(/\*\*Progress:\*\*\s*(\d+)%/i);
  const progress = progressMatch ? parseInt(progressMatch[1], 10) : 0;

  // Extract epic ID for hierarchy (EPIC-011)
  const epicSprintInfo = extractEpicSprintNumbers(content);
  const epicId = epicSprintInfo
    ? `EPIC-${epicSprintInfo.epicNum}`
    : null;

  // Build sprint object
  const sprint = {
    id: sprintId,
    name: sprintName,
    goal,
    startDate,
    endDate,
    progress,
    epicId, // EPIC-011: Parent epic for hierarchy navigation
  };

  // Extract tasks
  const tasks: SprintGraph['tasks'] = [];

  // Match task sections: ### TASK-XXX: Title
  const taskSections = content.split(/\n### TASK-/);

  for (let i = 1; i < taskSections.length; i++) {
    const section = taskSections[i];

    // Extract task ID and title from first line
    const firstLine = section.split('\n')[0];
    const taskMatch = firstLine.match(/^(\d+):\s*(.+)$/);

    if (!taskMatch) continue;

    const taskNumber = parseInt(taskMatch[1], 10);
    const taskTitle = taskMatch[2].trim();
    // ADR-052: Generate hierarchical task ID (e.g., e005_s01_t01)
    const taskId = generateTaskId(sprintId, taskNumber);

    // Extract status
    let status: 'not_started' | 'in_progress' | 'complete' = 'not_started';
    const statusMatch = section.match(/\*\*Status:\*\*\s*(.+?)(?:\n|$)/);
    if (statusMatch) {
      const statusText = statusMatch[1].trim().toLowerCase();
      if (statusText.includes('complete') || statusText.includes('done')) {
        status = 'complete';
      } else if (statusText.includes('in progress') || statusText.includes('in-progress')) {
        status = 'in_progress';
      }
    }

    // Extract effort
    const effortMatch = section.match(/\*\*Effort:\*\*\s*([^\n]+)/i);
    const effort = effortMatch ? effortMatch[1].trim() : '';

    // Extract priority
    const priorityMatch = section.match(/\*\*Priority:\*\*\s*([^\n]+)/i);
    const priority = priorityMatch ? priorityMatch[1].trim().toUpperCase() : 'MEDIUM';

    // Extract owner/assignee (support both field names)
    const ownerMatch = section.match(/\*\*(?:Owner|Assignee):\*\*\s*([^\n]+)/i);
    const owner = ownerMatch ? ownerMatch[1].trim() : undefined;

    // Extract assignee email from owner (format: "Name (email)" or just "email")
    let assignee: string | undefined;
    if (owner) {
      const emailMatch = owner.match(/([a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,})/);
      assignee = emailMatch ? emailMatch[1].toLowerCase() : undefined;
    }

    // Extract files
    const filesMatch = section.match(/\*\*Files:\*\*\s*([\s\S]*?)(?=\n\*\*|$)/i);
    const files: string[] = [];
    if (filesMatch) {
      const fileLines = filesMatch[1].match(/[-*]\s*(?:Create|Update|Modify):\s*`([^`]+)`/gi);
      if (fileLines) {
        fileLines.forEach(line => {
          const fileMatch = line.match(/`([^`]+)`/);
          if (fileMatch) {
            files.push(fileMatch[1]);
          }
        });
      }
    }

    // Extract related ADRs - preserve CLI format (ADR-XXX)
    const relatedADRs: string[] = [];
    const adrPattern = /ADR-(\d{3})/gi;
    let adrMatch;
    while ((adrMatch = adrPattern.exec(section)) !== null) {
      const adrId = `ADR-${adrMatch[1].padStart(3, '0')}`;
      if (!relatedADRs.includes(adrId)) {
        relatedADRs.push(adrId);
      }
    }

    // Extract related patterns (EPIC-002 Sprint 2)
    // Preserve CLI format: kebab-case with -pattern suffix (e.g., retry-pattern)
    const relatedPatterns: string[] = [];

    // Match "pattern from/in file.ts" references - use filename as pattern ID
    const patternFileMatches = section.matchAll(/(?:use|apply|see|follow)\s+(?:the\s+)?(?:pattern|example)\s+(?:from|in)\s+[`"]?([a-zA-Z0-9_\-./]+\.[a-zA-Z]+)[`"]?/gi);
    for (const match of patternFileMatches) {
      // Keep the file path as-is for file-based patterns
      const patternId = match[1];
      if (!relatedPatterns.includes(patternId)) {
        relatedPatterns.push(patternId);
      }
    }

    // Match explicit kebab-case pattern names (e.g., retry-pattern, output-formatter-pattern)
    const explicitPatternMatches = section.matchAll(/\b([a-z][a-z0-9]*(?:-[a-z0-9]+)*-pattern)\b/gi);
    for (const match of explicitPatternMatches) {
      const patternId = match[1].toLowerCase();
      if (!relatedPatterns.includes(patternId)) {
        relatedPatterns.push(patternId);
      }
    }

    // Extract related gotchas (EPIC-002 Sprint 2)
    // Preserve CLI format: kebab-case with -gotcha suffix (e.g., timer-unref-gotcha)
    const relatedGotchas: string[] = [];

    // Priority: Match explicit kebab-case gotcha names first (e.g., timer-unref-gotcha)
    const explicitGotchaMatches = section.matchAll(/\b([a-z][a-z0-9]*(?:-[a-z0-9]+)*-gotcha)\b/gi);
    for (const match of explicitGotchaMatches) {
      const gotchaId = match[1].toLowerCase();
      if (!relatedGotchas.includes(gotchaId)) {
        relatedGotchas.push(gotchaId);
      }
    }

    // Fallback: Match "avoid X", "watch out for X" - convert to kebab-case
    const gotchaWarningMatches = section.matchAll(/(?:avoid|watch out for|beware of|gotcha:)\s+[`"]?([^`".\n]+)[`"]?/gi);
    for (const match of gotchaWarningMatches) {
      // Skip if already captured via explicit pattern
      const rawText = match[1].trim();
      if (rawText.match(/[a-z][a-z0-9]*(?:-[a-z0-9]+)*-gotcha/i)) {
        continue;
      }
      // Convert to kebab-case gotcha ID
      const gotchaId = rawText.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') + '-gotcha';
      if (!relatedGotchas.includes(gotchaId)) {
        relatedGotchas.push(gotchaId);
      }
    }

    tasks.push({
      id: taskId,
      title: taskTitle,
      status,
      effort,
      priority,
      files,
      relatedADRs,
      relatedPatterns,
      relatedGotchas,
      owner,
      assignee,
    });
  }

  return {
    sprint,
    tasks,
  };
}

/**
 * Sync sprint graph to Neo4j
 * Creates all nodes and relationships
 *
 * TASK-3: Now creates File nodes and MODIFIES relationships
 *
 * @param client - CloudGraphClient instance
 * @param graph - Parsed sprint graph structure
 * @returns Sync result with counts and next task
 */
async function syncSprintToGraph(
  client: CloudGraphClient,
  graph: SprintGraph,
  graphId: string
): Promise<{
  nodes: number;
  relationships: number;
  nextTaskId: string | null;
}> {
  let nodeCount = 0;
  let relCount = 0;

  // Create Sprint node with epic_id for hierarchy navigation (EPIC-011)
  await client.createNode('Sprint', {
    id: graph.sprint.id,
    name: graph.sprint.name,
    goal: graph.sprint.goal,
    startDate: graph.sprint.startDate,
    endDate: graph.sprint.endDate,
    progress: graph.sprint.progress,
    epic_id: graph.sprint.epicId, // EPIC-011: Parent epic for hierarchy queries
    graphId, // Required for nodes API filtering
    graph_id: graphId, // EPIC-011: Consistency with other node types
  });
  nodeCount++;

  // Collect all unique files across tasks (TASK-3)
  const allFiles = new Set<string>();
  for (const task of graph.tasks) {
    task.files.forEach(file => allFiles.add(file));
  }

  // Create File nodes (TASK-3)
  for (const filePath of allFiles) {
    await client.createNode('File', {
      id: `file_${filePath.replace(/[^a-zA-Z0-9]/g, '_')}`,
      path: filePath,
      status: 'current', // Default status
      graphId, // Required for nodes API filtering
      graph_id: graphId, // EPIC-011: Consistency with other node types
    });
    nodeCount++;
  }

  // Merge Task nodes (upsert - creates new or updates existing)
  // Fix: Use mergeNode instead of createNode to properly update status
  // when tasks are re-synced after completion
  for (const task of graph.tasks) {
    // Map status to graph-compatible values (not_started -> todo)
    const graphStatus = task.status === 'not_started' ? 'todo' : task.status;

    const { isNew } = await client.mergeNode('Task', task.id, {
      id: task.id,
      title: task.title,
      status: graphStatus,
      effort: task.effort,
      priority: task.priority,
      files: task.files,
      relatedADRs: task.relatedADRs,
      owner: task.owner || '',
      assignee: task.assignee || '', // Email for dashboard My Tasks matching
      sprintId: graph.sprint.id,
      sprint_id: graph.sprint.id, // EPIC-011: Consistency with other node types
      epic_id: graph.sprint.epicId, // EPIC-011: Grandparent epic for hierarchy
      graphId, // Required for nodes API filtering
      graph_id: graphId, // EPIC-011: Consistency with other node types
    });
    if (isNew) nodeCount++;
  }

  // Find first incomplete task (for NEXT_TASK relationship)
  const nextTask = graph.tasks.find(
    t => t.status === 'not_started' || t.status === 'in_progress'
  );

  // Create Sprint → Task relationships (CONTAINS)
  for (const task of graph.tasks) {
    await client.createRelationship(graph.sprint.id, task.id, {
      type: 'CONTAINS',
    });
    relCount++;
  }

  // Create Sprint → Next Task relationship
  if (nextTask) {
    await client.createRelationship(graph.sprint.id, nextTask.id, {
      type: 'NEXT_TASK',
    });
    relCount++;
  }

  // Create Task → File relationships (MODIFIES) - TASK-3
  for (const task of graph.tasks) {
    for (const filePath of task.files) {
      const fileId = `file_${filePath.replace(/[^a-zA-Z0-9]/g, '_')}`;
      await client.createRelationship(task.id, fileId, {
        type: 'MODIFIES',
      });
      relCount++;
    }
  }

  // Create Task → ADR relationships (MUST_FOLLOW) - EPIC-002 Sprint 1
  // Enables AI constraint awareness: when picking up a task, AI knows which ADRs to follow
  for (const task of graph.tasks) {
    for (const adrId of task.relatedADRs) {
      // Ensure ADR node exists (merge pattern)
      await client.createNode('ADR', {
        id: adrId,
        // Minimal data - ADR details loaded separately via adr-loader
      });
      nodeCount++;

      // Create MUST_FOLLOW relationship
      await client.createRelationship(task.id, adrId, {
        type: 'MUST_FOLLOW',
        source: 'sprint_definition', // Where the reference came from
        extracted_at: new Date().toISOString(),
      });
      relCount++;
    }
  }

  // Create Task → Pattern relationships (APPLIES_PATTERN) - EPIC-002 Sprint 2
  // Enables AI pattern reuse: when picking up a task, AI knows which patterns to apply
  // TASK-3: Track usage count for confidence scoring
  for (const task of graph.tasks) {
    for (const patternId of task.relatedPatterns) {
      // Merge Pattern node (upsert) - increments usageCount for confidence
      const { isNew } = await client.mergeNode(
        'Pattern',
        patternId,
        {
          id: patternId,
          category: 'pattern',
          // Default confidence for new patterns (medium)
          // Will be recalculated based on usageCount and age
          confidence: 'medium',
          confidenceScore: 50,
        },
        true // incrementUsage = true
      );
      if (isNew) nodeCount++;

      // Create APPLIES_PATTERN relationship
      await client.createRelationship(task.id, patternId, {
        type: 'APPLIES_PATTERN',
        source: 'sprint_definition',
        extracted_at: new Date().toISOString(),
      });
      relCount++;

      // Create Pattern → File relationships (APPLIED_IN)
      // If the pattern references a file, link the pattern to that file
      for (const filePath of task.files) {
        const fileId = `file_${filePath.replace(/[^a-zA-Z0-9]/g, '_')}`;
        await client.createRelationship(patternId, fileId, {
          type: 'APPLIED_IN',
          context: `Referenced in task ${task.id}`,
          extracted_at: new Date().toISOString(),
        });
        relCount++;
      }
    }
  }

  // Create Task → Gotcha relationships (AVOID_GOTCHA) - EPIC-002 Sprint 2
  // Enables AI gotcha awareness: when picking up a task, AI knows what pitfalls to avoid
  // TASK-3: Track encounters for confidence scoring
  for (const task of graph.tasks) {
    for (const gotchaId of task.relatedGotchas) {
      // Merge Gotcha node (upsert) - increments encounters for confidence
      const { isNew } = await client.mergeNode(
        'Gotcha',
        gotchaId,
        {
          id: gotchaId,
          category: 'gotcha',
          severity: 'medium', // Default severity
          // Default confidence for new gotchas
          confidence: 'medium',
          confidenceScore: 50,
          encounters: 0, // Will be incremented via ginko log --category=gotcha
          resolutions: 0, // Will be incremented via gotcha resolution API
        },
        true // incrementUsage = true (tracks reference count)
      );
      if (isNew) nodeCount++;

      // Create AVOID_GOTCHA relationship
      await client.createRelationship(task.id, gotchaId, {
        type: 'AVOID_GOTCHA',
        source: 'sprint_definition',
        extracted_at: new Date().toISOString(),
      });
      relCount++;
    }
  }

  return {
    nodes: nodeCount,
    relationships: relCount,
    nextTaskId: nextTask ? nextTask.id : null,
  };
}
