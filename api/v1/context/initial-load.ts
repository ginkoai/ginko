/**
 * @fileType: api-route
 * @status: current
 * @updated: 2025-11-07
 * @tags: [api, context-loading, performance, consolidation]
 * @related: [packages/cli/src/lib/context-loader-events.ts]
 * @priority: critical
 * @complexity: high
 * @dependencies: [neo4j-driver]
 */

/**
 * Consolidated Initial Context Load API
 *
 * Consolidates 4-5 client-side API calls into a single server-side operation:
 * 1. Read events backward from cursor
 * 2. Load team high-signal events
 * 3. Load documents referenced in events
 * 4. Follow typed relationships (graph traversal)
 * 5. Get active sprint
 *
 * Performance improvement:
 * - Before: 4-5 sequential API calls with network latency (~10-15s)
 * - After: 1 API call with server-side graph operations (~2-3s)
 *
 * Endpoint: GET /api/v1/context/initial-load
 *
 * Query Parameters:
 * - cursorId: string (required) - Session cursor ID
 * - userId: string (required) - User ID
 * - projectId: string (required) - Project ID
 * - eventLimit: number (default: 50) - Number of user events to load
 * - includeTeam: boolean (default: false) - Include team events
 * - teamEventLimit: number (default: 20) - Number of team events
 * - teamDays: number (default: 7) - Team events from last N days
 * - documentDepth: number (default: 2) - Graph relationship depth
 * - categories: string (optional) - Comma-separated event categories
 * - branch: string (optional) - Filter by branch
 */

import { VercelRequest, VercelResponse } from '@vercel/node';
import neo4j, { Driver, Session as Neo4jSession } from 'neo4j-driver';

// Types matching CLI interfaces
interface Event {
  id: string;
  user_id: string;
  project_id: string;
  timestamp: Date;
  category: string;
  description: string;
  files: string[];
  impact: string;
  pressure?: number;
  branch?: string;
  tags?: string[];
  shared?: boolean;
  commit_hash?: string;
}

interface KnowledgeNode {
  id: string;
  type: string;
  title?: string;
  content?: string;
  status?: string;
  tags?: string[];
  created?: Date;
  updated?: Date;
}

interface Sprint {
  id: string;
  title: string;
  goals: string[];
  progress: number;
  started: Date;
  deadline?: Date;
}

interface InitialLoadResponse {
  cursor: {
    id: string;
    current_event_id: string;
  };
  myEvents: Event[];
  teamEvents?: Event[];
  documents: KnowledgeNode[];
  relatedDocs: KnowledgeNode[];
  sprint?: Sprint;
  loaded_at: string;
  event_count: number;
  token_estimate: number;
  performance: {
    queryTimeMs: number;
    eventsLoaded: number;
    documentsLoaded: number;
    relationshipsTraversed: number;
  };
}

// Neo4j connection (reuse across requests)
let driver: Driver | null = null;

function getDriver(): Driver {
  if (!driver) {
    const uri = process.env.NEO4J_URI || 'bolt://localhost:7687';
    const user = process.env.NEO4J_USER || 'neo4j';
    const password = process.env.NEO4J_PASSWORD || 'password';

    driver = neo4j.driver(uri, neo4j.auth.basic(user, password));
  }
  return driver;
}

/**
 * Read events backward from cursor position (Cypher query)
 */
async function readEventsBackward(
  session: Neo4jSession,
  fromEventId: string,
  userId: string,
  projectId: string,
  limit: number,
  filters?: { categories?: string[]; branch?: string }
): Promise<Event[]> {
  const query = `
    MATCH (e:Event {project_id: $projectId, user_id: $userId})
    WHERE e.id <= $fromEventId
    ${filters?.categories ? 'AND e.category IN $categories' : ''}
    ${filters?.branch ? 'AND e.branch = $branch' : ''}
    RETURN e
    ORDER BY e.timestamp DESC
    LIMIT $limit
  `;

  const result = await session.run(query, {
    fromEventId,
    userId,
    projectId,
    limit: neo4j.int(limit),
    ...(filters?.categories && { categories: filters.categories }),
    ...(filters?.branch && { branch: filters.branch }),
  });

  return result.records.map(record => {
    const event = record.get('e').properties;
    return {
      ...event,
      timestamp: new Date(event.timestamp),
    };
  });
}

/**
 * Load team high-signal events
 */
async function loadTeamEvents(
  session: Neo4jSession,
  projectId: string,
  excludeUserId: string,
  limit: number,
  days: number
): Promise<Event[]> {
  const query = `
    MATCH (e:Event {project_id: $projectId})
    WHERE e.user_id <> $excludeUserId
      AND e.category IN ['decision', 'achievement', 'git']
      AND e.timestamp >= datetime() - duration({days: $days})
      AND (e.shared = true OR e.impact = 'high')
    RETURN e
    ORDER BY e.timestamp DESC
    LIMIT $limit
  `;

  const result = await session.run(query, {
    projectId,
    excludeUserId,
    limit: neo4j.int(limit),
    days: neo4j.int(days),
  });

  return result.records.map(record => {
    const event = record.get('e').properties;
    return {
      ...event,
      timestamp: new Date(event.timestamp),
    };
  });
}

/**
 * Extract document references from event descriptions
 */
function extractDocumentReferences(events: Event[]): Set<string> {
  const refs = new Set<string>();
  const patterns = [
    /ADR-\d+/g,
    /PRD-\d+/g,
    /TASK-\d+/g,
    /FEATURE-\d+/g,
    /Pattern-[\w-]+/g,
  ];

  for (const event of events) {
    for (const pattern of patterns) {
      const matches = event.description.match(pattern);
      if (matches) {
        matches.forEach(ref => refs.add(ref));
      }
    }

    // Also check files for document references
    event.files.forEach(file => {
      const filename = file.split('/').pop() || '';
      patterns.forEach(pattern => {
        const matches = filename.match(pattern);
        if (matches) {
          matches.forEach(ref => refs.add(ref));
        }
      });
    });
  }

  return refs;
}

/**
 * Load documents by IDs
 */
async function loadDocuments(
  session: Neo4jSession,
  documentIds: Set<string>
): Promise<KnowledgeNode[]> {
  if (documentIds.size === 0) {
    return [];
  }

  const query = `
    MATCH (d:Document)
    WHERE d.id IN $documentIds
    RETURN d
  `;

  const result = await session.run(query, {
    documentIds: Array.from(documentIds),
  });

  return result.records.map(record => {
    const doc = record.get('d').properties;
    return {
      ...doc,
      created: doc.created ? new Date(doc.created) : undefined,
      updated: doc.updated ? new Date(doc.updated) : undefined,
    };
  });
}

/**
 * Follow typed relationships to discover related documents
 */
async function followTypedRelationships(
  session: Neo4jSession,
  documents: KnowledgeNode[],
  depth: number
): Promise<KnowledgeNode[]> {
  if (documents.length === 0 || depth === 0) {
    return [];
  }

  const documentIds = documents.slice(0, 10).map(d => d.id);

  const query = `
    MATCH (d:Document)-[r:IMPLEMENTS|REFERENCES|DEPENDS_ON*1..${depth}]-(related:Document)
    WHERE d.id IN $documentIds
      AND NOT related.id IN $documentIds
    RETURN DISTINCT related
    LIMIT 50
  `;

  const result = await session.run(query, {
    documentIds,
  });

  return result.records.map(record => {
    const doc = record.get('related').properties;
    return {
      ...doc,
      created: doc.created ? new Date(doc.created) : undefined,
      updated: doc.updated ? new Date(doc.updated) : undefined,
    };
  });
}

/**
 * Get active sprint
 */
async function getActiveSprint(
  session: Neo4jSession,
  projectId: string
): Promise<Sprint | undefined> {
  const query = `
    MATCH (s:Sprint {project_id: $projectId, active: true})
    RETURN s
    ORDER BY s.started DESC
    LIMIT 1
  `;

  const result = await session.run(query, { projectId });

  if (result.records.length === 0) {
    return undefined;
  }

  const sprint = result.records[0].get('s').properties;
  return {
    ...sprint,
    started: new Date(sprint.started),
    deadline: sprint.deadline ? new Date(sprint.deadline) : undefined,
  };
}

/**
 * Estimate token count
 */
function estimateTokens(context: {
  myEvents: Event[];
  teamEvents?: Event[];
  documents: KnowledgeNode[];
  relatedDocs: KnowledgeNode[];
  sprint?: Sprint;
}): number {
  const eventTokens = (context.myEvents.length + (context.teamEvents?.length || 0)) * 100;
  const docTokens = (context.documents.length + context.relatedDocs.length) * 1000;
  const sprintTokens = context.sprint ? 500 : 0;

  return eventTokens + docTokens + sprintTokens;
}

/**
 * Main handler
 */
export default async function handler(
  req: VercelRequest,
  res: VercelResponse
): Promise<void> {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const startTime = Date.now();
  let session: Neo4jSession | null = null;

  try {
    // Parse query parameters
    const {
      cursorId,
      userId,
      projectId,
      eventLimit = '50',
      includeTeam = 'false',
      teamEventLimit = '20',
      teamDays = '7',
      documentDepth = '2',
      categories,
      branch,
    } = req.query;

    // Validate required params
    if (!cursorId || !userId || !projectId) {
      return res.status(400).json({
        error: 'Missing required parameters: cursorId, userId, projectId',
      });
    }

    // Connect to Neo4j
    const driver = getDriver();
    session = driver.session();

    // 1. Read my events backward from cursor
    const myEvents = await readEventsBackward(
      session,
      cursorId as string,
      userId as string,
      projectId as string,
      parseInt(eventLimit as string, 10),
      {
        categories: categories ? (categories as string).split(',') : undefined,
        branch: branch as string | undefined,
      }
    );

    // 2. Load team events (optional)
    let teamEvents: Event[] | undefined;
    if (includeTeam === 'true') {
      teamEvents = await loadTeamEvents(
        session,
        projectId as string,
        userId as string,
        parseInt(teamEventLimit as string, 10),
        parseInt(teamDays as string, 10)
      );
    }

    // 3. Extract document references from events
    const allEvents = [...myEvents, ...(teamEvents || [])];
    const documentRefs = extractDocumentReferences(allEvents);

    // 4. Load mentioned documents
    const documents = await loadDocuments(session, documentRefs);

    // 5. Follow typed relationships
    const relatedDocs = await followTypedRelationships(
      session,
      documents,
      parseInt(documentDepth as string, 10)
    );

    // 6. Get active sprint
    const sprint = await getActiveSprint(session, projectId as string);

    // 7. Calculate token estimate
    const tokenEstimate = estimateTokens({
      myEvents,
      teamEvents,
      documents,
      relatedDocs,
      sprint,
    });

    const queryTime = Date.now() - startTime;

    // Build response
    const response: InitialLoadResponse = {
      cursor: {
        id: cursorId as string,
        current_event_id: cursorId as string,
      },
      myEvents,
      teamEvents,
      documents,
      relatedDocs,
      sprint,
      loaded_at: new Date().toISOString(),
      event_count: allEvents.length,
      token_estimate: tokenEstimate,
      performance: {
        queryTimeMs: queryTime,
        eventsLoaded: allEvents.length,
        documentsLoaded: documents.length + relatedDocs.length,
        relationshipsTraversed: relatedDocs.length,
      },
    };

    return res.status(200).json(response);

  } catch (error) {
    console.error('Initial load failed:', error);
    return res.status(500).json({
      error: 'Failed to load initial context',
      message: error instanceof Error ? error.message : 'Unknown error',
    });

  } finally {
    if (session) {
      await session.close();
    }
  }
}
