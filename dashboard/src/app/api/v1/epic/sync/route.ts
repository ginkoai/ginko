/**
 * @fileType: api-route
 * @status: current
 * @updated: 2026-01-07
 * @tags: [epic, graph-sync, planning, ADR-058]
 * @related: [../../sprint/sync/route.ts, ../../../graph/_cloud-graph-client.ts, ../check/route.ts]
 * @priority: high
 * @complexity: medium
 * @dependencies: [neo4j-driver, supabase]
 */

/**
 * POST /api/v1/epic/sync
 *
 * Sync epic data to graph database
 *
 * Creates Epic node with relationships:
 * - (Epic)-[:CONTAINS]->(Sprint)
 * - (Epic)-[:HAS_CRITERION]->(SuccessCriterion)
 *
 * Request Body:
 * - id: Epic ID (e.g., "EPIC-003")
 * - title: Epic title
 * - goal: Epic goal statement
 * - vision: Epic vision (the WHY)
 * - status: active | complete | paused
 * - progress: 0-100
 * - successCriteria: string[]
 * - inScope: string[]
 * - outOfScope: string[]
 *
 * Returns:
 * - success: boolean
 * - epic: { id, title, status }
 * - nodesCreated: number
 * - relationshipsCreated: number
 *
 * ADR-058: Stores createdBy on first sync for conflict detection
 */

import { NextRequest, NextResponse } from 'next/server';
import { runQuery, verifyConnection } from '@/app/api/v1/graph/_neo4j';
import { createClient } from '@supabase/supabase-js';

interface EpicSyncRequest {
  graphId: string;
  id: string;
  title: string;
  goal: string;
  vision: string;
  status: string;
  progress: number;
  successCriteria: string[];
  inScope: string[];
  outOfScope: string[];
}

interface EpicSyncResponse {
  success: boolean;
  epic: {
    id: string;
    title: string;
    status: string;
  };
  nodesCreated: number;
  relationshipsCreated: number;
}

// Initialize Supabase admin client for auth validation
const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function POST(request: NextRequest) {
  try {
    // Extract Bearer token for authentication
    const authHeader = request.headers.get('authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json(
        { error: 'Missing or invalid authorization header' },
        { status: 401 }
      );
    }

    // Get user from token (ADR-058: track createdBy)
    const token = authHeader.substring(7);
    let userEmail = 'unknown';
    try {
      const { data: { user } } = await supabaseAdmin.auth.getUser(token);
      if (user?.email) {
        userEmail = user.email;
      }
    } catch {
      // Continue with 'unknown' if user lookup fails
    }

    // Verify Neo4j connection
    const isConnected = await verifyConnection();
    if (!isConnected) {
      return NextResponse.json(
        { error: 'Graph database is unavailable' },
        { status: 503 }
      );
    }

    // Parse request body
    const body: EpicSyncRequest = await request.json();

    // Validate required fields
    if (!body.graphId || !body.id || !body.title) {
      return NextResponse.json(
        { error: 'Missing required fields: graphId, id, and title are required' },
        { status: 400 }
      );
    }

    // Sync epic to graph (pass user for createdBy tracking)
    const result = await syncEpicToGraph(body, userEmail);

    return NextResponse.json(result);

  } catch (error) {
    console.error('[Epic Sync] Error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal server error' },
      { status: 500 }
    );
  }
}

/**
 * Convert Neo4j Integer/BigInt to JavaScript number
 */
function toNumber(value: any): number {
  if (typeof value === 'bigint') {
    return Number(value);
  }
  if (typeof value === 'object' && value !== null && 'toNumber' in value) {
    return value.toNumber();
  }
  return Number(value) || 0;
}

/**
 * Sync epic data to Neo4j graph
 * ADR-058: Tracks createdBy for conflict detection
 */
async function syncEpicToGraph(epic: EpicSyncRequest, userEmail: string): Promise<EpicSyncResponse> {
  let nodesCreated = 0;
  let relationshipsCreated = 0;

  // Create or update Epic node (scoped to graphId)
  // ADR-058: Store createdBy on creation, updatedBy on all updates
  const epicQuery = `
    MERGE (e:Epic {id: $id, graphId: $graphId})
    ON CREATE SET
      e.createdAt = datetime(),
      e.createdBy = $userEmail,
      e.nodesCreated = 1
    ON MATCH SET
      e.nodesCreated = 0
    SET
      e.title = $title,
      e.goal = $goal,
      e.vision = $vision,
      e.status = $status,
      e.progress = $progress,
      e.inScope = $inScope,
      e.outOfScope = $outOfScope,
      e.updatedAt = datetime(),
      e.updatedBy = $userEmail
    RETURN e.id as id, e.title as title, e.status as status, e.nodesCreated as created
  `;

  const epicResult = await runQuery(epicQuery, {
    graphId: epic.graphId,
    id: epic.id,
    title: epic.title,
    goal: epic.goal,
    vision: epic.vision || '',
    status: epic.status || 'active',
    progress: epic.progress || 0,
    inScope: epic.inScope || [],
    outOfScope: epic.outOfScope || [],
    userEmail,
  });

  if (epicResult.length > 0 && toNumber(epicResult[0].created) === 1) {
    nodesCreated += 1;
  }

  // Create SuccessCriterion nodes and relationships
  if (epic.successCriteria && epic.successCriteria.length > 0) {
    for (let i = 0; i < epic.successCriteria.length; i++) {
      const criterion = epic.successCriteria[i];
      const criterionId = `${epic.id}-criterion-${i + 1}`;

      const criterionQuery = `
        MATCH (e:Epic {id: $epicId})
        MERGE (c:SuccessCriterion {id: $criterionId})
        ON CREATE SET
          c.createdAt = datetime(),
          c.wasCreated = true
        ON MATCH SET
          c.wasCreated = false
        SET
          c.description = $description,
          c.epicId = $epicId,
          c.order = $order,
          c.updatedAt = datetime()
        MERGE (e)-[r:HAS_CRITERION]->(c)
        ON CREATE SET r.wasCreated = true
        ON MATCH SET r.wasCreated = false
        RETURN c.wasCreated as nodeCreated, r.wasCreated as relCreated
      `;

      const criterionResult = await runQuery(criterionQuery, {
        epicId: epic.id,
        criterionId,
        description: criterion,
        order: i + 1,
      });

      if (criterionResult.length > 0) {
        if (criterionResult[0].nodeCreated) nodesCreated += 1;
        if (criterionResult[0].relCreated) relationshipsCreated += 1;
      }
    }
  }

  // Link to existing sprints if they reference this epic
  const linkSprintsQuery = `
    MATCH (e:Epic {id: $epicId})
    MATCH (s:Sprint)
    WHERE s.name CONTAINS $epicIdLower OR s.name CONTAINS $epicIdUpper
    MERGE (e)-[r:CONTAINS]->(s)
    ON CREATE SET r.wasCreated = true
    ON MATCH SET r.wasCreated = false
    RETURN count(r) as linkedSprints, sum(CASE WHEN r.wasCreated THEN 1 ELSE 0 END) as newLinks
  `;

  const linkResult = await runQuery(linkSprintsQuery, {
    epicId: epic.id,
    epicIdLower: epic.id.toLowerCase().replace('-', ''),
    epicIdUpper: epic.id,
  });

  if (linkResult.length > 0) {
    relationshipsCreated += toNumber(linkResult[0].newLinks);
  }

  return {
    success: true,
    epic: {
      id: epic.id,
      title: epic.title,
      status: epic.status || 'active',
    },
    nodesCreated,
    relationshipsCreated,
  };
}

/**
 * GET /api/v1/epic/sync
 *
 * List all epics in the graph
 */
export async function GET(request: NextRequest) {
  try {
    // Verify Neo4j connection
    const isConnected = await verifyConnection();
    if (!isConnected) {
      return NextResponse.json(
        { error: 'Graph database is unavailable' },
        { status: 503 }
      );
    }

    const query = `
      MATCH (e:Epic)
      OPTIONAL MATCH (e)-[:CONTAINS]->(s:Sprint)
      RETURN e.id as id,
             e.title as title,
             e.goal as goal,
             e.status as status,
             e.progress as progress,
             count(s) as sprintCount,
             e.updatedAt as updatedAt
      ORDER BY e.createdAt DESC
    `;

    const result = await runQuery(query, {});

    const epics = result.map(row => ({
      id: row.id,
      title: row.title,
      goal: row.goal,
      status: row.status,
      progress: row.progress || 0,
      sprintCount: row.sprintCount,
      updatedAt: row.updatedAt,
    }));

    return NextResponse.json({
      epics,
      count: epics.length,
    });

  } catch (error) {
    console.error('[Epic List] Error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal server error' },
      { status: 500 }
    );
  }
}
