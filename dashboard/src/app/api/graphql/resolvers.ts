/**
 * @fileType: utility
 * @status: current
 * @updated: 2026-02-05
 * @tags: [graphql, resolvers, knowledge, task-024, epic-018, session-start]
 * @related: [schema.ts, route.ts, _cloud-graph-client.ts]
 * @priority: high
 * @complexity: high
 * @dependencies: [graphql, neo4j-driver]
 */

/**
 * GraphQL Resolvers for Knowledge Graph API
 * TASK-024: GraphQL API Implementation
 */

import { CloudGraphClient } from '../v1/graph/_cloud-graph-client';
import { runQuery } from '../v1/graph/_neo4j';
import { getVoyageClient } from '@/lib/embeddings/voyage-client';
import { SIMILARITY_CONFIG } from '@/lib/embeddings/config';
import neo4j from 'neo4j-driver';

interface Context {
  token: string;
}

export const resolvers = {
  Query: {
    /**
     * Semantic search using vector similarity
     */
    search: async (
      _parent: any,
      args: {
        query: string;
        graphId: string;
        limit?: number;
        minScore?: number;
        type?: string;
        status?: string;
      },
      context: Context
    ) => {
      const { query, graphId, limit = 10, minScore = 0.75, type, status = 'active' } = args;

      // Generate query embedding
      const voyageClient = getVoyageClient();
      const embeddings = await voyageClient.embed([query], 'query');
      const queryEmbedding = embeddings[0];

      // Build Cypher query
      let cypherQuery = `
        CALL db.index.vector.queryNodes(
          'knowledge_embeddings',
          $limit,
          $queryEmbedding
        )
        YIELD node, score
        WHERE score >= $minScore
      `;

      const queryParams: Record<string, any> = {
        queryEmbedding,
        limit: neo4j.int(limit * 2),
        minScore,
      };

      // Add filters
      if (type) {
        cypherQuery += ` AND node:${type}`;
      }

      if (status) {
        cypherQuery += ` AND node.status = $status`;
        queryParams.status = status;
      }

      cypherQuery += `
        WITH node, score
        ORDER BY score DESC
        LIMIT $finalLimit
        RETURN node, score
      `;
      queryParams.finalLimit = neo4j.int(limit);

      const results = await runQuery<any>(cypherQuery, queryParams);

      return results.map((r: any) => {
        let relationshipType;
        if (r.score >= SIMILARITY_CONFIG.DUPLICATE_THRESHOLD) {
          relationshipType = 'DUPLICATE_OF';
        } else if (r.score >= SIMILARITY_CONFIG.HIGH_RELEVANCE_THRESHOLD) {
          relationshipType = 'HIGHLY_RELATED_TO';
        } else if (r.score >= SIMILARITY_CONFIG.MEDIUM_RELEVANCE_THRESHOLD) {
          relationshipType = 'RELATED_TO';
        } else {
          relationshipType = 'LOOSELY_RELATED_TO';
        }

        return {
          node: r.node.properties,
          score: r.score,
          relationshipType,
        };
      });
    },

    /**
     * Find nodes by tags
     */
    nodesByTag: async (
      _parent: any,
      args: {
        tags: string[];
        graphId: string;
        type?: string;
        status?: string;
        limit?: number;
      },
      context: Context
    ) => {
      const { tags, graphId, type, status = 'active', limit = 50 } = args;
      const client = await CloudGraphClient.fromBearerToken(context.token, graphId);

      const filters: any = {
        limit: Math.min(limit, 100),
      };

      if (type) {
        filters.labels = [type];
      }

      if (status) {
        filters.properties = { status };
      }

      const result = await client.queryNodes(filters);

      // Filter by tags (post-query)
      const nodes = result.nodes.filter((node: any) => {
        const nodeTags = node.tags || [];
        return tags.some(tag => nodeTags.includes(tag));
      });

      return nodes;
    },

    /**
     * Get node with its relationship graph
     */
    nodeGraph: async (
      _parent: any,
      args: {
        nodeId: string;
        graphId: string;
        depth?: number;
        relationshipTypes?: string[];
      },
      context: Context
    ) => {
      const { nodeId, graphId, depth = 1, relationshipTypes } = args;
      const client = await CloudGraphClient.fromBearerToken(context.token, graphId);

      // Get center node
      const centerNode = await client.getNode(nodeId);
      if (!centerNode) {
        throw new Error('Node not found');
      }

      // Build relationship type filter
      const relTypeFilter = relationshipTypes && relationshipTypes.length > 0
        ? relationshipTypes.map(t => `:${t}`).join('|')
        : '';

      // Query connected nodes
      const cypherQuery = `
        MATCH (g:Graph {graphId: $graphId})-[:CONTAINS]->(center {id: $nodeId})
        MATCH path = (center)-[r${relTypeFilter}*1..${depth}]-(connected)
        WHERE (g)-[:CONTAINS]->(connected)
        WITH center, connected, relationships(path) as rels
        RETURN DISTINCT
          connected,
          [rel IN rels | {
            type: type(rel),
            fromId: startNode(rel).id,
            toId: endNode(rel).id,
            properties: properties(rel)
          }] as pathRels
      `;

      const results = await runQuery<any>(cypherQuery, {
        graphId,
        nodeId,
      });

      const connectedNodes = results.map((r: any) => r.connected);
      const relationships: any[] = [];

      // Collect all relationships
      results.forEach((r: any) => {
        r.pathRels.forEach((rel: any) => {
          relationships.push(rel);
        });
      });

      return {
        centerNode,
        connectedNodes,
        relationships,
        depth,
      };
    },

    /**
     * Get single node by ID
     */
    node: async (
      _parent: any,
      args: { id: string; graphId: string },
      context: Context
    ) => {
      const { id, graphId } = args;
      const client = await CloudGraphClient.fromBearerToken(context.token, graphId);
      return await client.getNode(id);
    },

    /**
     * List nodes with filters
     */
    nodes: async (
      _parent: any,
      args: {
        graphId: string;
        type?: string;
        status?: string;
        tags?: string[];
        limit?: number;
        offset?: number;
      },
      context: Context
    ) => {
      const { graphId, type, status, tags, limit = 50, offset = 0 } = args;
      const client = await CloudGraphClient.fromBearerToken(context.token, graphId);

      const filters: any = {
        limit: Math.min(limit, 100),
        offset,
      };

      if (type) {
        filters.labels = [type];
      }

      if (status) {
        filters.properties = { status };
      }

      const result = await client.queryNodes(filters);

      // Filter by tags if provided
      let nodes = result.nodes;
      if (tags && tags.length > 0) {
        nodes = nodes.filter((node: any) => {
          const nodeTags = node.tags || [];
          return tags.some(tag => nodeTags.includes(tag));
        });
      }

      return {
        nodes,
        pageInfo: {
          hasNextPage: nodes.length === limit,
          hasPreviousPage: offset > 0,
          totalCount: nodes.length,
        },
      };
    },

    /**
     * Context-aware queries for AI assistance
     */
    contextualNodes: async (
      _parent: any,
      args: {
        graphId: string;
        context: {
          projectId?: string;
          branch?: string;
          timeRange?: string;
          userId?: string;
        };
        limit?: number;
      },
      context: Context
    ) => {
      const { graphId, context: ctx, limit = 20 } = args;
      const client = await CloudGraphClient.fromBearerToken(context.token, graphId);

      // Build context-aware query
      const filters: any = {
        limit: Math.min(limit, 50),
        properties: {},
      };

      if (ctx.projectId) {
        filters.properties.projectId = ctx.projectId;
      }

      const result = await client.queryNodes(filters);
      return result.nodes;
    },

    /**
     * Find ADRs implementing a specific PRD
     */
    adrsByPrd: async (
      _parent: any,
      args: { prdId: string; graphId: string },
      context: Context
    ) => {
      const { prdId, graphId } = args;

      const cypherQuery = `
        MATCH (g:Graph {graphId: $graphId})-[:CONTAINS]->(prd:PRD {id: $prdId})
        MATCH (adr:ADR)-[:IMPLEMENTS]->(prd)
        WHERE (g)-[:CONTAINS]->(adr)
        RETURN adr
      `;

      const results = await runQuery<any>(cypherQuery, { graphId, prdId });
      return results.map((r: any) => r.adr);
    },

    /**
     * Track implementation progress
     */
    implementationProgress: async (
      _parent: any,
      args: { projectId: string; graphId: string },
      context: Context
    ) => {
      const { projectId, graphId } = args;

      // Query PRDs and ADRs
      const statsQuery = `
        MATCH (g:Graph {graphId: $graphId})-[:CONTAINS]->(prd:PRD)
        WHERE prd.projectId = $projectId
        OPTIONAL MATCH (adr:ADR)-[:IMPLEMENTS]->(prd)
        WITH prd, count(adr) as adrCount
        RETURN
          count(prd) as totalPRDs,
          sum(CASE WHEN adrCount > 0 THEN 1 ELSE 0 END) as implementedPRDs,
          sum(CASE WHEN adrCount = 0 THEN 1 ELSE 0 END) as inProgressPRDs
      `;

      const adrCountQuery = `
        MATCH (g:Graph {graphId: $graphId})-[:CONTAINS]->(adr:ADR)
        WHERE adr.projectId = $projectId
        RETURN count(adr) as totalADRs
      `;

      const recentDecisionsQuery = `
        MATCH (g:Graph {graphId: $graphId})-[:CONTAINS]->(adr:ADR)
        WHERE adr.projectId = $projectId
        RETURN adr
        ORDER BY adr.createdAt DESC
        LIMIT 5
      `;

      const [stats, adrStats, recentDecisions] = await Promise.all([
        runQuery<any>(statsQuery, { graphId, projectId }),
        runQuery<any>(adrCountQuery, { graphId, projectId }),
        runQuery<any>(recentDecisionsQuery, { graphId, projectId }),
      ]);

      const totalPRDs = stats[0]?.totalPRDs || 0;
      const implementedPRDs = stats[0]?.implementedPRDs || 0;
      const inProgressPRDs = stats[0]?.inProgressPRDs || 0;
      const totalADRs = adrStats[0]?.totalADRs || 0;

      return {
        totalPRDs,
        implementedPRDs,
        inProgressPRDs,
        totalADRs,
        completionPercentage: totalPRDs > 0 ? (implementedPRDs / totalPRDs) * 100 : 0,
        recentDecisions: recentDecisions.map((r: any) => r.adr),
      };
    },

    /**
     * Session start context - all data needed for ginko start in one query
     * EPIC-018 Sprint 1 TASK-08
     *
     * Replaces 4-5 sequential REST calls with a single GraphQL query
     */
    sessionStart: async (
      _parent: any,
      args: {
        graphId: string;
        userId: string;
        sprintId?: string;
        eventLimit?: number;
        teamEventDays?: number;
      },
      context: Context
    ) => {
      const {
        graphId,
        userId,
        sprintId,
        eventLimit = 25,
        teamEventDays = 7,
      } = args;

      const startTime = Date.now();

      // Run all queries in parallel for performance
      const [
        activeSprintResult,
        recentEventsResult,
        charterResult,
        teamActivityResult,
      ] = await Promise.all([
        // 1. Get active sprint with tasks
        loadActiveSprint(graphId, sprintId, context.token),

        // 2. Get recent user events
        loadRecentEvents(graphId, userId, eventLimit),

        // 3. Load charter summary
        loadCharterSummary(graphId),

        // 4. Load team activity
        loadTeamActivitySummary(graphId, userId, teamEventDays),
      ]);

      // If we have an active sprint with a current task, enrich it with patterns/gotchas/constraints
      let enrichedSprint = activeSprintResult;
      if (activeSprintResult && activeSprintResult.currentTask) {
        const taskId = activeSprintResult.currentTask.id;
        const [patterns, gotchas, constraints] = await Promise.all([
          loadTaskPatterns(taskId),
          loadTaskGotchas(taskId),
          loadTaskConstraints(taskId),
        ]);

        enrichedSprint = {
          ...activeSprintResult,
          currentTask: {
            ...activeSprintResult.currentTask,
            patterns,
            gotchas,
            constraints,
          },
        };
      }

      const loadTimeMs = Date.now() - startTime;

      // Calculate token estimate
      const taskCount = enrichedSprint?.tasks?.length || 0;
      const tokenEstimate =
        500 + // base overhead
        (taskCount * 50) + // tasks
        (recentEventsResult.length * 30) + // events
        (charterResult ? 200 : 0) + // charter
        (teamActivityResult.length * 40); // team activity

      return {
        activeSprint: enrichedSprint,
        recentEvents: recentEventsResult,
        charter: charterResult,
        teamActivity: teamActivityResult,
        epic: enrichedSprint?.epic || null,
        metadata: {
          loadTimeMs,
          sprintFound: !!enrichedSprint,
          taskCount,
          eventCount: recentEventsResult.length,
          tokenEstimate,
        },
      };
    },

    /**
     * Strategic context for AI partner readiness
     * Loads charter + team activity + relevant patterns
     */
    strategicContext: async (
      _parent: any,
      args: {
        graphId: string;
        userId: string;
        projectId: string;
        teamEventDays?: number;
        teamEventLimit?: number;
        patternTags?: string[];
        patternLimit?: number;
      },
      context: Context
    ) => {
      const {
        graphId,
        userId,
        projectId,
        teamEventDays = 7,
        teamEventLimit = 10,
        patternTags = [],
        patternLimit = 5,
      } = args;

      const startTime = Date.now();

      // Run all queries in parallel for performance
      const [charterResult, teamEventsResult, patternsResult] = await Promise.all([
        // 1. Load charter from graph (future: will be in graph, for now returns null)
        loadCharter(graphId, projectId).catch(() => null),

        // 2. Load team activity (shared events from last N days)
        loadTeamActivity(graphId, userId, projectId, teamEventDays, teamEventLimit),

        // 3. Load relevant patterns/gotchas
        loadPatterns(graphId, projectId, patternTags, patternLimit),
      ]);

      const loadTimeMs = Date.now() - startTime;

      // Calculate token estimate
      const tokenEstimate =
        (charterResult ? 500 : 0) +
        (teamEventsResult.length * 100) +
        (patternsResult.length * 300);

      return {
        charter: charterResult,
        teamActivity: teamEventsResult,
        patterns: patternsResult,
        metadata: {
          charterStatus: charterResult ? 'loaded' : 'not_found',
          teamEventCount: teamEventsResult.length,
          patternCount: patternsResult.length,
          loadTimeMs,
          tokenEstimate,
        },
      };
    },
  },
};

// ============================================================================
// Helper Functions for Strategic Context
// ============================================================================

/**
 * Load charter from graph
 * TODO: Implement graph-based charter storage (currently returns null)
 */
async function loadCharter(graphId: string, projectId: string): Promise<any | null> {
  // Future: Query graph for Charter node
  // For now, return null (CLI will load from filesystem)
  return null;
}

/**
 * Load team activity from events
 */
async function loadTeamActivity(
  graphId: string,
  userId: string,
  projectId: string,
  days: number,
  limit: number
): Promise<any[]> {
  const query = `
    MATCH (e:Event {project_id: $projectId})
    WHERE e.user_id <> $userId
      AND e.category IN ['decision', 'achievement', 'git', 'fix', 'feature']
      AND e.timestamp >= datetime() - duration({days: $days})
      AND (e.shared = true OR e.impact = 'high')
    RETURN e
    ORDER BY e.timestamp DESC
    LIMIT $limit
  `;

  const results = await runQuery<any>(query, {
    projectId,
    userId,
    days: neo4j.int(days),
    limit: neo4j.int(limit),
  });

  return results.map((r: any) => {
    const event = r.e;
    return {
      id: event.id,
      category: event.category,
      description: event.description,
      impact: event.impact,
      user: event.user_id,
      timestamp: event.timestamp ? new Date(event.timestamp).toISOString() : new Date().toISOString(),
      branch: event.branch,
      shared: event.shared === true,
    };
  });
}

/**
 * Load relevant patterns/gotchas from ContextModules
 */
async function loadPatterns(
  graphId: string,
  projectId: string,
  tags: string[],
  limit: number
): Promise<any[]> {
  // Build query based on whether tags are provided
  let query: string;
  let params: any;

  if (tags.length > 0) {
    // Tag-based filtering
    query = `
      MATCH (g:Graph {graphId: $graphId})-[:CONTAINS]->(cm:ContextModule)
      WHERE cm.projectId = $projectId
        AND any(tag IN cm.tags WHERE tag IN $tags)
        AND cm.category IN ['pattern', 'gotcha', 'decision']
      RETURN cm
      ORDER BY cm.createdAt DESC
      LIMIT $limit
    `;
    params = {
      graphId,
      projectId,
      tags,
      limit: neo4j.int(limit),
    };
  } else {
    // No tags: get recent high-quality patterns
    query = `
      MATCH (g:Graph {graphId: $graphId})-[:CONTAINS]->(cm:ContextModule)
      WHERE cm.projectId = $projectId
        AND cm.category IN ['pattern', 'gotcha', 'decision']
      RETURN cm
      ORDER BY cm.createdAt DESC
      LIMIT $limit
    `;
    params = {
      graphId,
      projectId,
      limit: neo4j.int(limit * 2), // Get more, then filter for quality
    };
  }

  const results = await runQuery<any>(query, params);

  return results.map((r: any) => {
    const module = r.cm;
    return {
      id: module.id,
      title: module.title || 'Untitled',
      content: module.content || '',
      type: module.type || 'ContextModule',
      tags: module.tags || [],
      category: module.category,
      createdAt: module.createdAt ? new Date(module.createdAt).toISOString() : new Date().toISOString(),
    };
  }).slice(0, limit); // Apply limit after mapping
}

// Export helper functions for testing
export const strategicContextHelpers = {
  loadCharter,
  loadTeamActivity,
  loadPatterns,
};

// ============================================================================
// Helper Functions for Session Start (EPIC-018 Sprint 1 TASK-08)
// ============================================================================

/**
 * Extract epic_id from sprint ID using standard naming convention (ADR-052)
 */
function extractEpicId(sprintId: string): string {
  // Standard pattern: e{NNN}_s{NN}
  const standardMatch = sprintId.match(/^(e\d{3})_s\d{2}$/);
  if (standardMatch) return standardMatch[1];

  // Ad-hoc pattern: adhoc_{YYMMDD}_s{NN}
  const adhocMatch = sprintId.match(/^(adhoc_\d{6})_s\d{2}$/);
  if (adhocMatch) return adhocMatch[1];

  return sprintId;
}

/**
 * Load active sprint with tasks
 * Mirrors logic from /api/v1/sprint/active
 */
async function loadActiveSprint(
  graphId: string,
  preferredSprintId: string | undefined,
  token: string
): Promise<any | null> {
  const client = await CloudGraphClient.fromBearerToken(token, graphId);

  let result: any[] = [];

  // If user specified a preferred sprint, fetch that directly
  if (preferredSprintId) {
    result = await client.runScopedQuery<any>(`
      MATCH (g:Graph {graphId: $graphId})-[:CONTAINS]->(s:Sprint {id: $preferredSprintId})
      OPTIONAL MATCH (s)-[:BELONGS_TO]->(e:Epic)
      OPTIONAL MATCH (s)-[:CONTAINS]->(t:Task)
      OPTIONAL MATCH (s)-[:NEXT_TASK]->(next:Task)
      RETURN s as sprint, collect(DISTINCT t) as tasks, next as nextTask, e as epic
    `, { preferredSprintId });
  }

  // If no preferred sprint or not found, auto-detect
  if (result.length === 0) {
    result = await client.runScopedQuery<any>(`
      MATCH (g:Graph {graphId: $graphId})-[:CONTAINS]->(s:Sprint)
      OPTIONAL MATCH (s)-[:BELONGS_TO]->(e:Epic)
      OPTIONAL MATCH (s)-[:CONTAINS]->(t:Task)
      WITH s, e,
           count(t) as totalTasks,
           sum(CASE WHEN t.status = 'complete' THEN 1 ELSE 0 END) as completedTasks,
           max(t.updatedAt) as lastTaskActivity

      WITH s, e, totalTasks, completedTasks, lastTaskActivity,
           CASE WHEN totalTasks > 0 THEN toInteger((completedTasks * 100) / totalTasks) ELSE 0 END as progress
      WHERE (s.status IS NULL OR s.status <> 'complete')
        AND (e IS NULL OR e.roadmap_lane IS NULL OR NOT e.roadmap_lane IN ['done', 'dropped'])
        AND (totalTasks = 0 OR completedTasks < totalTasks)

      WITH s, e, totalTasks, progress, lastTaskActivity
      ORDER BY
        CASE WHEN lastTaskActivity IS NOT NULL THEN 0 ELSE 1 END,
        lastTaskActivity DESC
      LIMIT 1

      WITH s, e
      OPTIONAL MATCH (s)-[:CONTAINS]->(t:Task)
      OPTIONAL MATCH (s)-[:NEXT_TASK]->(next:Task)

      RETURN s as sprint, collect(DISTINCT t) as tasks, next as nextTask, e as epic
    `);
  }

  // Fallback: If no sprint found, get most recent
  if (result.length === 0) {
    result = await client.runScopedQuery<any>(`
      MATCH (g:Graph {graphId: $graphId})-[:CONTAINS]->(s:Sprint)
      OPTIONAL MATCH (s)-[:BELONGS_TO]->(e:Epic)
      WITH s, e
      ORDER BY s.createdAt DESC
      LIMIT 1

      OPTIONAL MATCH (s)-[:CONTAINS]->(t:Task)
      OPTIONAL MATCH (s)-[:NEXT_TASK]->(next:Task)

      RETURN s as sprint, collect(DISTINCT t) as tasks, next as nextTask, e as epic
    `);
  }

  if (result.length === 0) return null;

  const record = result[0];

  // Extract properties from Neo4j node objects
  const extractProps = <T>(node: any): T | null => {
    if (!node) return null;
    return (node.properties || node) as T;
  };

  const sprintData = extractProps<any>(record.sprint);
  if (!sprintData) return null;

  const rawTasks = record.tasks
    .filter((t: any) => t !== null)
    .map((t: any) => extractProps<any>(t)!);
  const nextTaskData = extractProps<any>(record.nextTask);
  const epicData = extractProps<any>(record.epic);

  // Calculate completion counts
  const completedTasks = rawTasks.filter((t: any) => t.status === 'complete').length;
  const blockedTasks = rawTasks.filter((t: any) => t.status === 'blocked');

  // Determine current/next task
  let currentTask = null;
  if (nextTaskData) {
    currentTask = {
      id: nextTaskData.id,
      title: nextTaskData.title,
      status: nextTaskData.status || 'not_started',
      blocked_reason: nextTaskData.blocked_reason,
      assignee: nextTaskData.owner,
      patterns: [],
      gotchas: [],
      constraints: [],
    };
  } else {
    // Find first non-complete task
    const firstIncomplete = rawTasks.find((t: any) =>
      t.status !== 'complete' && t.status !== 'blocked'
    );
    if (firstIncomplete) {
      currentTask = {
        id: firstIncomplete.id,
        title: firstIncomplete.title,
        status: firstIncomplete.status || 'not_started',
        blocked_reason: firstIncomplete.blocked_reason,
        assignee: firstIncomplete.owner,
        patterns: [],
        gotchas: [],
        constraints: [],
      };
    }
  }

  // Build next task indicator
  let nextTask = null;
  if (currentTask) {
    nextTask = {
      id: currentTask.id,
      title: currentTask.title,
      continue: currentTask.status === 'in_progress',
    };
  }

  // Build enriched tasks list
  const tasks = rawTasks.map((t: any) => ({
    id: t.id,
    title: t.title,
    status: t.status || 'not_started',
    blocked_reason: t.blocked_reason,
    assignee: t.owner,
    patterns: [],
    gotchas: [],
    constraints: [],
  }));

  // Build blocked tasks list
  const blocked_tasks = blockedTasks.map((t: any) => ({
    id: t.id,
    title: t.title,
    reason: t.blocked_reason || 'No reason provided',
  }));

  return {
    id: sprintData.id,
    name: sprintData.name || sprintData.id,
    epic_id: extractEpicId(sprintData.id),
    status: sprintData.status || 'active',
    progress: {
      complete: completedTasks,
      total: rawTasks.length,
      percent: rawTasks.length > 0
        ? Math.round((completedTasks / rawTasks.length) * 100)
        : 0,
    },
    currentTask,
    nextTask,
    tasks,
    blocked_tasks,
    epic: epicData ? {
      id: epicData.id,
      title: epicData.title,
      roadmap_lane: epicData.roadmap_lane,
      roadmap_status: epicData.roadmap_status,
    } : null,
  };
}

/**
 * Load recent events for user
 */
async function loadRecentEvents(
  graphId: string,
  userId: string,
  limit: number
): Promise<any[]> {
  try {
    const query = `
      MATCH (e:Event)
      WHERE e.project_id = $graphId AND e.user_id = $userId
      RETURN e
      ORDER BY e.timestamp DESC
      LIMIT $limit
    `;

    const results = await runQuery<any>(query, {
      graphId,
      userId,
      limit: neo4j.int(limit),
    });

    return results.map((r: any) => {
      const event = r.e.properties || r.e;
      return {
        id: event.id || `event_${Date.now()}`,
        category: event.category || 'general',
        description: event.description || '',
        timestamp: event.timestamp ? new Date(event.timestamp).toISOString() : new Date().toISOString(),
        files: event.files || [],
        impact: event.impact,
        branch: event.branch,
      };
    });
  } catch {
    // Events may not exist, return empty array
    return [];
  }
}

/**
 * Load charter summary (purpose and goals only)
 */
async function loadCharterSummary(graphId: string): Promise<any | null> {
  try {
    const query = `
      MATCH (c:Charter {graphId: $graphId})
      RETURN c.purpose as purpose, c.goals as goals
      LIMIT 1
    `;

    const results = await runQuery<any>(query, { graphId });

    if (results.length === 0) return null;

    const record = results[0];
    return {
      purpose: record.purpose || '',
      goals: record.goals || [],
    };
  } catch {
    return null;
  }
}

/**
 * Load team activity summary (other users' recent work)
 */
async function loadTeamActivitySummary(
  graphId: string,
  userId: string,
  days: number
): Promise<any[]> {
  try {
    const query = `
      MATCH (e:Event)
      WHERE e.project_id = $graphId
        AND e.user_id <> $userId
        AND e.category IN ['decision', 'achievement', 'git', 'fix', 'feature']
        AND e.timestamp >= datetime() - duration({days: $days})
        AND (e.shared = true OR e.impact = 'high')
      RETURN e
      ORDER BY e.timestamp DESC
      LIMIT 10
    `;

    const results = await runQuery<any>(query, {
      graphId,
      userId,
      days: neo4j.int(days),
    });

    return results.map((r: any) => {
      const event = r.e.properties || r.e;
      return {
        category: event.category || 'general',
        description: event.description || '',
        user: event.user_id || 'unknown',
        timestamp: event.timestamp ? new Date(event.timestamp).toISOString() : new Date().toISOString(),
      };
    });
  } catch {
    return [];
  }
}

/**
 * Load patterns for a task
 */
async function loadTaskPatterns(taskId: string): Promise<any[]> {
  try {
    const query = `
      MATCH (t:Task {id: $taskId})-[r:APPLIES_PATTERN]->(p:Pattern)
      RETURN p.id as id,
             p.title as title,
             p.confidence as confidence,
             p.confidenceScore as confidenceScore,
             p.category as category
      ORDER BY p.confidenceScore DESC
    `;

    const results = await runQuery<any>(query, { taskId });

    return results.map((r: any) => ({
      id: r.id,
      title: r.title || r.id,
      confidence: r.confidence || 'medium',
      confidenceScore: r.confidenceScore ?? 50,
      category: r.category || 'pattern',
    }));
  } catch {
    return [];
  }
}

/**
 * Load gotchas for a task
 */
async function loadTaskGotchas(taskId: string): Promise<any[]> {
  try {
    const query = `
      MATCH (t:Task {id: $taskId})-[r:AVOID_GOTCHA]->(g:Gotcha)
      RETURN g.id as id,
             g.title as title,
             g.severity as severity,
             g.confidenceScore as confidenceScore
      ORDER BY
        CASE g.severity
          WHEN 'critical' THEN 0
          WHEN 'high' THEN 1
          WHEN 'medium' THEN 2
          ELSE 3
        END,
        g.confidenceScore DESC
    `;

    const results = await runQuery<any>(query, { taskId });

    return results.map((r: any) => ({
      id: r.id,
      title: r.title || r.id,
      severity: r.severity || 'medium',
      confidenceScore: r.confidenceScore ?? 50,
    }));
  } catch {
    return [];
  }
}

/**
 * Load ADR constraints for a task
 */
async function loadTaskConstraints(taskId: string): Promise<any[]> {
  try {
    const query = `
      MATCH (t:Task {id: $taskId})-[r:MUST_FOLLOW]->(a:ADR)
      RETURN a.id as id,
             a.title as title,
             a.status as status
    `;

    const results = await runQuery<any>(query, { taskId });

    return results.map((r: any) => ({
      id: r.id,
      title: r.title || r.id,
      status: r.status || 'active',
    }));
  } catch {
    return [];
  }
}

// Export session start helpers for testing
export const sessionStartHelpers = {
  loadActiveSprint,
  loadRecentEvents,
  loadCharterSummary,
  loadTeamActivitySummary,
  loadTaskPatterns,
  loadTaskGotchas,
  loadTaskConstraints,
  extractEpicId,
};

// Add KnowledgeNode field resolvers to main resolvers export
resolvers.KnowledgeNode = {
  relationships: async (parent: any, _args: any, context: Context) => {
    // Extract graphId from parent or context
    const graphId = parent.projectId; // Using projectId as graphId
    const client = await CloudGraphClient.fromBearerToken(context.token, graphId);
    return await client.getRelationships(parent.id);
  },

  relatedNodes: async (parent: any, _args: any, context: Context) => {
    const graphId = parent.projectId;
    const client = await CloudGraphClient.fromBearerToken(context.token, graphId);

    const relationships = await client.getRelationships(parent.id);
    const relatedNodeIds = relationships.map((r: any) => r.toId);

    // Fetch related nodes
    const relatedNodes = await Promise.all(
      relatedNodeIds.map(id => client.getNode(id))
    );

    return relatedNodes.filter(node => node !== null);
  },
};
