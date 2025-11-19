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
  strategicContext?: StrategicContextData; // Strategic context (charter, team, patterns)
  loaded_at: Date;
  event_count: number;
  token_estimate: number;
}

/**
 * Strategic context from GraphQL query (EPIC-001)
 */
export interface StrategicContextData {
  charter?: {
    purpose: string;
    goals: string[];
    successCriteria: string[];
    scope?: {
      inScope: string[];
      outOfScope: string[];
      tbd: string[];
    };
  };
  teamActivity: Array<{
    category: string;
    description: string;
    impact?: string;
    user: string;
    timestamp: string;
  }>;
  patterns: Array<{
    title: string;
    content: string;
    tags: string[];
    category?: string;
  }>;
  metadata: {
    charterStatus: string;
    teamEventCount: number;
    patternCount: number;
    loadTimeMs: number;
    tokenEstimate: number;
  };
}

/**
 * Load recent events without cursor (TASK-011: Simplified chronological loading)
 *
 * Simple chronological query for last N events - no cursor state needed.
 * Replaces cursor-based loading with direct "ORDER BY timestamp DESC LIMIT N" query.
 *
 * TASK-012: Cloud-first architecture
 * - Cloud-only mode (GINKO_CLOUD_ONLY=true): Fails loudly if graph unavailable
 * - Dual-mode (default): Falls back to strategic loading if graph fails
 *
 * Performance: ~2-3s for consolidated load
 */
export async function loadRecentEvents(
  userId: string,
  projectId: string,
  options: ContextLoadOptions = {}
): Promise<LoadedContext> {
  const {
    eventLimit = 50,
    includeTeam = false,
    teamEventLimit = 20,
    categories,
    documentDepth = 2,
    teamDays = 7
  } = options;

  // TASK-012: Check cloud-only mode
  const cloudOnly = process.env.GINKO_CLOUD_ONLY === 'true';

  try {
    const { GraphApiClient } = await import('../commands/graph/api-client.js');
    const client = new GraphApiClient();

    // Build query parameters (use special cursor value for chronological loading)
    const params = new URLSearchParams({
      cursorId: 'chronological', // Special value to trigger chronological query on server
      userId,
      projectId,
      eventLimit: eventLimit.toString(),
      includeTeam: includeTeam.toString(),
      teamEventLimit: teamEventLimit.toString(),
      teamDays: teamDays.toString(),
      documentDepth: documentDepth.toString(),
    });

    if (categories && categories.length > 0) {
      params.append('categories', categories.join(','));
    }

    const mode = cloudOnly ? 'cloud-only' : 'chronological';
    console.log(`📡 Using consolidated API endpoint (${mode} mode)`);

    // Single API call - server detects "chronological" cursor and uses ORDER BY timestamp DESC
    const response = await (client as any).request('GET', `/api/v1/context/initial-load?${params.toString()}`);

    console.log(`⚡ Consolidated load: ${response.performance.queryTimeMs}ms (${response.event_count} events, ${response.performance.documentsLoaded} docs)`);

    // Load strategic context (EPIC-001: charter + team + patterns)
    const graphId = process.env.GINKO_GRAPH_ID || '';
    let strategicContext: StrategicContextData | undefined = undefined;

    if (graphId) {
      const loadedStrategic = await loadStrategicContext(graphId, userId, projectId);
      if (loadedStrategic) {
        strategicContext = loadedStrategic;
        if (strategicContext.metadata) {
          console.log(`📊 Strategic context loaded: ${strategicContext.metadata.teamEventCount} team events, ${strategicContext.metadata.patternCount} patterns`);
        }
      }
    }

    // Create a minimal cursor for backward compatibility
    const cursor: SessionCursor = {
      id: 'chronological-query',
      user_id: userId,
      project_id: projectId,
      started: new Date(),
      last_active: new Date(),
      current_event_id: response.myEvents?.[0]?.id || 'latest',
      status: 'active',
    };

    return {
      cursor,
      myEvents: normalizeEvents(response.myEvents || []),
      teamEvents: response.teamEvents ? normalizeEvents(response.teamEvents) : undefined,
      documents: response.documents || [],
      relatedDocs: response.relatedDocs || [],
      sprint: response.sprint,
      strategicContext,
      loaded_at: new Date(response.loaded_at),
      event_count: response.event_count,
      token_estimate: response.token_estimate,
    };
  } catch (error) {
    if (cloudOnly) {
      // CLOUD-ONLY MODE: Fail loudly, no fallback
      console.error('❌ Cloud-only mode: Graph API unavailable!');
      console.error('   Cannot load context from cloud graph.');
      console.error(`   Error: ${(error as Error).message}`);
      throw new Error(`Cloud-only mode: Graph API failed: ${(error as Error).message}`);
    } else {
      // DUAL-MODE: Log warning and re-throw for fallback handling
      console.log(`⚠️  Graph API failed: ${(error as Error).message}`);
      throw error; // Re-throw to trigger fallback
    }
  }
}

/**
 * Load context using consolidated API endpoint (performance optimized)
 *
 * @deprecated Use loadRecentEvents() instead (TASK-011). Cursors are unnecessary for "last N events" queries.
 *
 * Single API call that performs all operations server-side:
 * - Read events backward
 * - Load team events
 * - Extract & load documents
 * - Follow relationships
 * - Get active sprint
 *
 * Performance: ~2-3s vs ~10-15s (4-5 sequential calls)
 */
async function loadContextConsolidated(
  cursor: SessionCursor,
  options: ContextLoadOptions = {}
): Promise<LoadedContext> {
  const {
    eventLimit = 50,
    includeTeam = false,
    teamEventLimit = 20,
    categories,
    documentDepth = 2,
    teamDays = 7
  } = options;

  try {
    const { GraphApiClient } = await import('../commands/graph/api-client.js');
    const client = new GraphApiClient();

    // Build query parameters
    const params = new URLSearchParams({
      cursorId: cursor.current_event_id,
      userId: cursor.user_id,
      projectId: cursor.project_id,
      eventLimit: eventLimit.toString(),
      includeTeam: includeTeam.toString(),
      teamEventLimit: teamEventLimit.toString(),
      teamDays: teamDays.toString(),
      documentDepth: documentDepth.toString(),
    });

    if (categories && categories.length > 0) {
      params.append('categories', categories.join(','));
    }

    if (cursor.branch) {
      params.append('branch', cursor.branch);
    }

    console.log('📡 Using consolidated API endpoint (single call)');

    // Single API call for all context loading
    const response = await (client as any).request('GET', `/api/v1/context/initial-load?${params.toString()}`);

    console.log(`⚡ Consolidated load: ${response.performance.queryTimeMs}ms (${response.event_count} events, ${response.performance.documentsLoaded} docs)`);

    return {
      cursor,
      myEvents: normalizeEvents(response.myEvents || []),
      teamEvents: response.teamEvents ? normalizeEvents(response.teamEvents) : undefined,
      documents: response.documents,
      relatedDocs: response.relatedDocs,
      sprint: response.sprint,
      loaded_at: new Date(response.loaded_at),
      event_count: response.event_count,
      token_estimate: response.token_estimate,
    };
  } catch (error) {
    console.log(`⚠️  Consolidated endpoint failed: ${(error as Error).message}`);
    throw error; // Re-throw to trigger fallback
  }
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

  // Try consolidated endpoint first (performance optimized)
  try {
    return await loadContextConsolidated(cursor, options);
  } catch (error) {
    console.log('⚠️  Falling back to multi-call approach');
  }

  // Fallback: Multi-call approach (original behavior)
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

  try {
    const { GraphApiClient } = await import('../commands/graph/api-client.js');
    const client = new GraphApiClient();

    // Build query parameters
    const params = new URLSearchParams({
      cursorId: fromEventId,
      limit: limit.toString(),
    });

    if (filters?.categories && filters.categories.length > 0) {
      params.append('categories', filters.categories.join(','));
    }

    if (filters?.branch) {
      params.append('branch', filters.branch);
    }

    // Call API endpoint
    const response = await (client as any).request('GET', `/api/v1/events?${params.toString()}`);

    return normalizeEvents(response.events || []);
  } catch (error) {
    console.error('Failed to read events:', error);
    return [];
  }
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

  try {
    const { GraphApiClient } = await import('../commands/graph/api-client.js');
    const client = new GraphApiClient();

    // Build query parameters
    const params = new URLSearchParams({
      projectId,
      graphId: '', // Will be populated from context
      limit: limit.toString(),
      days: days.toString(),
      categories: 'decision,achievement,git',
    });

    // Call API endpoint
    const response = await (client as any).request('GET', `/api/v1/events/team?${params.toString()}`);

    return normalizeEvents(response.events || []);
  } catch (error) {
    console.error('Failed to load team events:', error);
    return [];
  }
}

/**
 * Load strategic context via GraphQL (EPIC-001)
 *
 * Fetches charter + team activity + relevant patterns in single GraphQL query
 *
 * @param graphId - Graph ID
 * @param userId - User ID
 * @param projectId - Project ID
 * @returns Strategic context data
 */
async function loadStrategicContext(
  graphId: string,
  userId: string,
  projectId: string
): Promise<StrategicContextData | null> {
  try {
    const fs = await import('fs-extra');
    const path = await import('path');
    const os = await import('os');

    // Read API key from ~/.ginko/auth.json
    const authPath = path.join(os.homedir(), '.ginko', 'auth.json');
    if (!fs.existsSync(authPath)) {
      return null;
    }

    const authData = JSON.parse(fs.readFileSync(authPath, 'utf-8'));
    const apiKey = authData.api_key;
    if (!apiKey) {
      return null;
    }

    const apiUrl = process.env.GINKO_API_URL || 'https://app.ginkoai.com';

    const query = `
      query GetStrategicContext($graphId: String!, $userId: String!, $projectId: String!) {
        strategicContext(
          graphId: $graphId
          userId: $userId
          projectId: $projectId
          teamEventDays: 7
          teamEventLimit: 10
          patternLimit: 5
        ) {
          charter {
            purpose
            goals
            successCriteria
            scope {
              inScope
              outOfScope
              tbd
            }
          }
          teamActivity {
            category
            description
            impact
            user
            timestamp
          }
          patterns {
            title
            content
            tags
            category
          }
          metadata {
            charterStatus
            teamEventCount
            patternCount
            loadTimeMs
            tokenEstimate
          }
        }
      }
    `;

    const variables = { graphId, userId, projectId };

    const response = await fetch(`${apiUrl}/api/graphql`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`,
      },
      body: JSON.stringify({ query, variables }),
    });

    if (!response.ok) {
      return null;
    }

    const result: any = await response.json();
    return result.data?.strategicContext || null;
  } catch (error) {
    console.log('⚠️  Strategic context not available (GraphQL query failed)');
    return null;
  }
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

  try {
    const { GraphApiClient } = await import('../commands/graph/api-client.js');
    const client = new GraphApiClient();

    // Get graphId from environment or config
    const graphId = process.env.GINKO_GRAPH_ID || '';

    // Call batch documents API
    const response = await (client as any).request('POST', '/api/v1/graph/documents/batch', {
      graphId,
      documentIds,
    });

    if (response.notFound && response.notFound.length > 0) {
      console.log(`⚠️  ${response.notFound.length} documents not found: ${response.notFound.slice(0, 3).join(', ')}...`);
    }

    return response.documents;
  } catch (error) {
    console.error('Failed to load documents:', error);
    return [];
  }
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

  try {
    const { GraphApiClient } = await import('../commands/graph/api-client.js');
    const client = new GraphApiClient();

    const relatedDocs = new Set<KnowledgeNode>();

    // For each starting document, explore its relationships
    for (const doc of documents.slice(0, 10)) { // Limit to first 10 to avoid too many API calls
      try {
        const response = await (client as any).request('GET', `/api/v1/graph/explore/${doc.id}`);

        // Collect all related documents from typed relationships
        const relationships = response.relationships;

        if (relationships.implements) {
          relationships.implements.forEach((rel: any) => {
            relatedDocs.add({
              id: rel.id,
              type: rel.type,
              title: rel.title,
            });
          });
        }

        if (relationships.referencedBy) {
          relationships.referencedBy.forEach((rel: any) => {
            relatedDocs.add({
              id: rel.id,
              type: rel.type,
              title: rel.title,
            });
          });
        }

        // Skip SIMILAR_TO as these are lower signal
      } catch (error) {
        console.log(`  ⚠️  Could not explore ${doc.id}:`, (error as Error).message);
      }
    }

    return Array.from(relatedDocs);
  } catch (error) {
    console.error('Failed to follow relationships:', error);
    return [];
  }
}

/**
 * Get active sprint for project
 *
 * @param projectId - Project ID
 * @returns Active sprint or undefined
 */
async function getActiveSprint(projectId: string): Promise<Sprint | undefined> {
  console.log(`🎯 Loading active sprint for project ${projectId}`);

  try {
    // Look for sprint files in docs/sprints/
    const sprintDir = path.join(process.cwd(), 'docs', 'sprints');

    if (!await fs.pathExists(sprintDir)) {
      return undefined;
    }

    // Read CURRENT-SPRINT.md first (optimized for readiness - ADR-043)
    const currentSprintPath = path.join(sprintDir, 'CURRENT-SPRINT.md');

    if (await fs.pathExists(currentSprintPath)) {
      const content = await fs.readFile(currentSprintPath, 'utf-8');

      // CURRENT-SPRINT.md contains all readiness info (WHY, WHAT, HOW, status)
      // No need to read the full sprint file during startup

      // Extract sprint reference (e.g., "**Sprint**: SPRINT-2025-10-27-cloud-knowledge-graph")
      const sprintMatch = content.match(/\*\*Sprint\*\*:\s*(SPRINT-[\w-]+)/);
      const sprintId = sprintMatch ? sprintMatch[1] : 'unknown';

      // Extract title from "Sprint Goal" section
      const titleMatch = content.match(/##\s+Sprint Goal\s+(.+?)(?=\n\n|\*\*|$)/s);
      const title = titleMatch ? titleMatch[1].trim() : 'Active Sprint';

      // Extract progress if available
      const progressMatch = content.match(/\*\*Progress\*\*:\s*(\d+)%/);
      const progress = progressMatch ? parseInt(progressMatch[1], 10) : 0;

      return {
        id: sprintId,
        title,
        goals: [], // Available in CURRENT-SPRINT.md if needed
        progress,
        started: new Date(), // Could parse from CURRENT-SPRINT.md if needed
      };
    }

    // Fallback: scan all sprint files (legacy behavior)
    const files = await fs.readdir(sprintDir);
    const sprintFiles = files.filter(f => f.startsWith('SPRINT-') && f.endsWith('.md'));

    for (const file of sprintFiles) {
      const filePath = path.join(sprintDir, file);
      const content = await fs.readFile(filePath, 'utf-8');

      if (content.toLowerCase().includes('status**: active') ||
          content.toLowerCase().includes('sprint status: active')) {

        const titleMatch = content.match(/^#\s+(.+)$/m);
        const title = titleMatch ? titleMatch[1] : file.replace('.md', '');

        return {
          id: file.replace('.md', ''),
          title,
          goals: [],
          progress: 0,
          started: new Date(),
        };
      }
    }

    return undefined;
  } catch (error) {
    console.log('Could not load sprint:', (error as Error).message);
    return undefined;
  }
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
 * Normalize event data from API (convert timestamp strings to Date objects)
 */
function normalizeEvent(event: any): Event {
  return {
    ...event,
    timestamp: event.timestamp ? new Date(event.timestamp) : new Date(),
  };
}

/**
 * Normalize array of events from API
 */
function normalizeEvents(events: any[]): Event[] {
  return events.map(normalizeEvent);
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
