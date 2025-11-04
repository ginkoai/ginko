/**
 * @fileType: utility
 * @status: current
 * @updated: 2025-11-04
 * @tags: [context-loading, events, adr-043, session-cursor, graph]
 * @related: [context-loader.ts, session-logger.ts, CloudGraphClient]
 * @priority: critical
 * @complexity: high
 * @dependencies: [fs-extra, path]
 */

/**
 * Event-Based Context Loader (ADR-043)
 *
 * Loads context by reading backwards through event stream from cursor position,
 * replacing handoff-based context loading with continuous event history.
 *
 * Key differences from handoff-based loading:
 * - Reads raw events instead of synthesized summaries
 * - Loads my events + team high-signal events
 * - Extracts document references from event descriptions
 * - Follows graph relationships to load related documents
 * - Target: <30K tokens total (vs 88K with handoff approach)
 *
 * Based on ADR-043 Event Stream Session Model
 */

import fs from 'fs-extra';
import path from 'path';

/**
 * Event category types
 */
export type EventCategory = 'fix' | 'feature' | 'decision' | 'insight' | 'git' | 'achievement';

/**
 * Event from graph database
 */
export interface Event {
  id: string;
  user_id: string;
  project_id: string;
  timestamp: Date;
  category: EventCategory;
  description: string;
  files: string[];
  impact: 'high' | 'medium' | 'low';
  pressure?: number;
  branch?: string;
  tags?: string[];
  shared?: boolean;
  commit_hash?: string;
}

/**
 * Session cursor (pointer into event stream)
 */
export interface SessionCursor {
  id: string;
  user_id: string;
  project_id: string;
  started: Date;
  last_active: Date;
  current_event_id: string;
  last_loaded_event_id?: string;
  branch?: string;
  status: 'active' | 'paused';
}

/**
 * Knowledge document node from graph
 */
export interface KnowledgeNode {
  id: string;
  type: string; // ADR, PRD, Pattern, etc.
  title?: string;
  content?: string;
  status?: string;
  tags?: string[];
  created?: Date;
  updated?: Date;
}

/**
 * Sprint information
 */
export interface Sprint {
  id: string;
  title: string;
  goals: string[];
  progress: number;
  started: Date;
  deadline?: Date;
}

/**
 * Context loading options
 */
export interface ContextLoadOptions {
  eventLimit?: number;        // Default: 50
  includeTeam?: boolean;      // Default: false
  teamEventLimit?: number;    // Default: 20
  categories?: EventCategory[];
  documentDepth?: number;     // Graph relationship depth: default 2
  teamDays?: number;          // Team events from last N days: default 7
}

/**
 * Loaded context from event stream
 */
export interface LoadedContext {
  cursor: SessionCursor;
  myEvents: Event[];           // My recent events
  teamEvents?: Event[];        // Team high-signal events
  documents: KnowledgeNode[];  // Documents mentioned in events
  relatedDocs: KnowledgeNode[]; // Graph neighborhood
  sprint?: Sprint;             // Active sprint
  loaded_at: Date;
  event_count: number;
  token_estimate: number;
}

/**
 * Load context from cursor position by reading events backwards
 *
 * @param cursor - Session cursor with current position
 * @param options - Loading options
 * @returns Loaded context with events, documents, and metadata
 */
export async function loadContextFromCursor(
  cursor: SessionCursor,
  options: ContextLoadOptions = {}
): Promise<LoadedContext> {
  const startTime = Date.now();

  const {
    eventLimit = 50,
    includeTeam = false,
    teamEventLimit = 20,
    categories,
    documentDepth = 2,
    teamDays = 7
  } = options;

  // 1. Read my events backwards from cursor
  const myEvents = await readEventsBackward(
    cursor.current_event_id,
    cursor.user_id,
    cursor.project_id,
    eventLimit,
    { categories, branch: cursor.branch }
  );

  // 2. Load team events (optional)
  let teamEvents: Event[] = [];
  if (includeTeam) {
    teamEvents = await loadTeamEvents(
      cursor.project_id,
      cursor.user_id,
      teamEventLimit,
      teamDays
    );
  }

  // 3. Extract document references from events
  const allEvents = [...myEvents, ...teamEvents];
  const documentRefs = extractDocumentReferences(allEvents);

  // 4. Load mentioned documents from graph
  const documents = await loadDocuments(documentRefs);

  // 5. Follow typed relationships (ADR-042)
  const relatedDocs = await followTypedRelationships(
    documents,
    documentDepth
  );

  // 6. Get active sprint context
  const sprint = await getActiveSprint(cursor.project_id);

  // 7. Calculate token estimate
  const tokenEstimate = estimateTokens({
    myEvents,
    teamEvents,
    documents,
    relatedDocs,
    sprint
  });

  const loadedContext: LoadedContext = {
    cursor,
    myEvents,
    teamEvents: includeTeam ? teamEvents : undefined,
    documents,
    relatedDocs,
    sprint,
    loaded_at: new Date(),
    event_count: allEvents.length,
    token_estimate: tokenEstimate
  };

  console.log(`⏱️  Context loaded in ${Date.now() - startTime}ms`);

  return loadedContext;
}

/**
 * Read events backwards from cursor position (Git log style)
 *
 * @param fromEventId - Starting event ID (cursor position)
 * @param userId - Filter by user
 * @param projectId - Filter by project (multi-tenant)
 * @param limit - Number of events to read
 * @param filters - Additional filters
 * @returns Array of events in reverse chronological order
 */
async function readEventsBackward(
  fromEventId: string,
  userId: string,
  projectId: string,
  limit: number = 50,
  filters?: {
    categories?: EventCategory[];
    branch?: string;
  }
): Promise<Event[]> {
  console.log(`📖 Reading ${limit} events backwards from ${fromEventId} for user ${userId}`);

  // Query events using graph traversal
  // This will be implemented via API call to /api/v1/events/read endpoint
  // which uses CloudGraphClient internally

  // For Phase 1: Return empty array until API endpoint is created
  // Phase 2 will add:
  // - POST /api/v1/events/read with cursor-based pagination
  // - CloudGraphClient query using NEXT relationship traversal
  // - Multi-tenant filtering via project_id

  return [];
}

/**
 * Load team high-signal events (decisions, achievements, git)
 *
 * @param projectId - Project ID for multi-tenant filtering
 * @param excludeUserId - Exclude events from this user
 * @param limit - Number of team events to load
 * @param days - Load events from last N days
 * @returns Array of high-signal team events
 */
async function loadTeamEvents(
  projectId: string,
  excludeUserId: string,
  limit: number = 20,
  days: number = 7
): Promise<Event[]> {
  console.log(`👥 Loading ${limit} team events from last ${days} days (excluding ${excludeUserId})`);

  // Query team high-signal events
  // This will be implemented via API call to /api/v1/events/team endpoint
  //
  // Cypher query used internally:
  // MATCH (user:User)-[:LOGGED]->(e:Event)
  // WHERE e.project_id = $projectId
  //   AND e.user_id <> $excludeUserId
  //   AND e.shared = true
  //   AND e.category IN ['decision', 'achievement', 'git']
  //   AND e.timestamp > datetime() - duration({days: $days})
  // ORDER BY e.timestamp DESC
  // LIMIT $limit

  return [];
}

/**
 * Extract document references from event descriptions
 *
 * Parses event descriptions for references to:
 * - ADR-XXX (Architecture Decision Records)
 * - PRD-XXX (Product Requirements Documents)
 * - Pattern-XXX (Design Patterns)
 * - TASK-XXX (Task references)
 *
 * @param events - Events to parse
 * @returns Array of document IDs referenced in events
 */
function extractDocumentReferences(events: Event[]): string[] {
  const refs = new Set<string>();

  // Regex patterns for document references
  const patterns = [
    /ADR-(\d+)/gi,
    /PRD-(\d+)/gi,
    /Pattern-(\d+)/gi,
    /TASK-(\d+)/gi,
  ];

  for (const event of events) {
    const text = event.description;

    for (const pattern of patterns) {
      const matches = text.matchAll(pattern);
      for (const match of matches) {
        refs.add(match[0]); // e.g., "ADR-043"
      }
    }
  }

  console.log(`📎 Extracted ${refs.size} document references from ${events.length} events`);

  return Array.from(refs);
}

/**
 * Load documents from graph by ID
 *
 * @param documentIds - Document IDs to load (e.g., ["ADR-043", "PRD-009"])
 * @returns Array of knowledge nodes
 */
async function loadDocuments(documentIds: string[]): Promise<KnowledgeNode[]> {
  if (documentIds.length === 0) {
    return [];
  }

  console.log(`📚 Loading ${documentIds.length} documents: ${documentIds.slice(0, 5).join(', ')}...`);

  // Load documents via API call to /api/v1/graph/documents/batch
  // This uses CloudGraphClient's queryNodes with id filtering
  //
  // Cypher query used internally:
  // MATCH (g:Graph {graphId: $graphId})-[:CONTAINS]->(doc)
  // WHERE doc.id IN $documentIds
  // RETURN doc

  return [];
}

/**
 * Follow typed relationships to discover related documents
 *
 * Uses ADR-042 relationship types:
 * - IMPLEMENTS (PRD -> ADR)
 * - REFERENCES (ADR -> ADR, Pattern -> ADR)
 * - DEPENDS_ON (Feature -> Feature)
 *
 * @param documents - Starting documents
 * @param depth - How many hops to follow
 * @returns Array of related documents
 */
async function followTypedRelationships(
  documents: KnowledgeNode[],
  depth: number = 2
): Promise<KnowledgeNode[]> {
  if (documents.length === 0 || depth === 0) {
    return [];
  }

  console.log(`🔗 Following relationships ${depth} hops from ${documents.length} documents`);

  // Load related documents via API call to /api/v1/graph/explore/{documentId}
  // This uses CloudGraphClient's relationship traversal
  //
  // Cypher query used internally:
  // MATCH (g:Graph {graphId: $graphId})-[:CONTAINS]->(start)
  // WHERE start.id IN $documentIds
  // MATCH path = (start)-[:IMPLEMENTS|REFERENCES|DEPENDS_ON*1..${depth}]-(related)
  // WHERE related.id IS NOT NULL
  // RETURN DISTINCT related

  return [];
}

/**
 * Get active sprint for project
 *
 * @param projectId - Project ID
 * @returns Active sprint or undefined
 */
async function getActiveSprint(projectId: string): Promise<Sprint | undefined> {
  console.log(`🎯 Loading active sprint for project ${projectId}`);

  // Load sprint from filesystem
  // Look for: docs/sprints/SPRINT-YYYY-MM-DD-*.md with status "active"
  //
  // Implementation options:
  // 1. Query graph for Sprint nodes with status="active"
  // 2. Read from filesystem directly (current approach in context-loader.ts)
  //
  // For consistency with existing code, we'll use filesystem reading
  // until sprints are fully migrated to graph

  return undefined;
}

/**
 * Estimate total token count for loaded context
 *
 * Token estimation:
 * - Events: ~100 tokens each
 * - Documents: ~1000 tokens each (average)
 * - Sprint: ~500 tokens
 *
 * Target: <30K tokens total
 *
 * @param context - Context components
 * @returns Estimated token count
 */
function estimateTokens(context: {
  myEvents: Event[];
  teamEvents?: Event[];
  documents: KnowledgeNode[];
  relatedDocs: KnowledgeNode[];
  sprint?: Sprint;
}): number {
  const eventTokens = (context.myEvents.length + (context.teamEvents?.length || 0)) * 100;
  const docTokens = context.documents.length * 1000;
  const relatedDocTokens = context.relatedDocs.length * 1000;
  const sprintTokens = context.sprint ? 500 : 0;

  return eventTokens + docTokens + relatedDocTokens + sprintTokens;
}

/**
 * Format context summary for display
 *
 * @param context - Loaded context
 * @returns Formatted summary string
 */
export function formatContextSummary(context: LoadedContext): string {
  const lines: string[] = [];

  lines.push('📊 Context Loaded:');
  lines.push(`   - ${context.myEvents.length} my events (last ${daysAgo(context.myEvents[0]?.timestamp)} days)`);

  if (context.teamEvents && context.teamEvents.length > 0) {
    lines.push(`   - ${context.teamEvents.length} team events (decisions + achievements)`);
  }

  // Group documents by type
  const docsByType = groupByType(context.documents);
  const totalDocs = context.documents.length;
  const docSummary = Object.entries(docsByType)
    .map(([type, count]) => `${count} ${type}${count > 1 ? 's' : ''}`)
    .join(', ');
  lines.push(`   - ${totalDocs} documents (${docSummary})`);

  if (context.relatedDocs.length > 0) {
    lines.push(`   - ${context.relatedDocs.length} related documents`);
  }

  if (context.sprint) {
    lines.push(`   - Sprint: ${context.sprint.title} (${context.sprint.progress}% complete)`);
  }

  lines.push(`   - Estimated tokens: ${context.token_estimate.toLocaleString()}`);

  return lines.join('\n');
}

/**
 * Calculate days ago from timestamp
 */
function daysAgo(timestamp?: Date): number {
  if (!timestamp) return 0;
  const now = new Date();
  const diff = now.getTime() - timestamp.getTime();
  return Math.round(diff / (1000 * 60 * 60 * 24));
}

/**
 * Group documents by type
 */
function groupByType(documents: KnowledgeNode[]): Record<string, number> {
  const groups: Record<string, number> = {};

  for (const doc of documents) {
    const type = doc.type || 'unknown';
    groups[type] = (groups[type] || 0) + 1;
  }

  return groups;
}
