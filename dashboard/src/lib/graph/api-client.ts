/**
 * @fileType: utility
 * @status: current
 * @updated: 2026-01-14
 * @tags: [graph, api, client, fetching]
 * @related: [types.ts, hooks.ts]
 * @priority: high
 * @complexity: medium
 * @dependencies: []
 */

import type {
  NodeLabel,
  GraphNode,
  ListNodesResponse,
  QueryResponse,
  GraphStatusResponse,
  AdjacenciesResponse,
  NodeFilters,
} from './types';

// =============================================================================
// Configuration
// =============================================================================

const API_BASE = '/api/v1/graph';

/** Get auth token from session storage or Supabase */
async function getAuthToken(): Promise<string | null> {
  // Try to get from Supabase session
  if (typeof window !== 'undefined') {
    const { createClient } = await import('@/lib/supabase/client');
    const supabase = createClient();
    const { data: { session } } = await supabase.auth.getSession();
    return session?.access_token ?? null;
  }
  return null;
}

/** Default graph ID - can be overridden per request */
let defaultGraphId: string | null = null;

export function setDefaultGraphId(graphId: string): void {
  defaultGraphId = graphId;
}

export function getDefaultGraphId(): string | null {
  return defaultGraphId;
}

// =============================================================================
// API Client
// =============================================================================

interface FetchOptions {
  graphId?: string;
  signal?: AbortSignal;
}

async function graphFetch<T>(
  endpoint: string,
  options: RequestInit & FetchOptions = {}
): Promise<T> {
  const { graphId = defaultGraphId, signal, ...fetchOptions } = options;

  const token = await getAuthToken();
  if (!token) {
    throw new Error('Authentication required');
  }

  if (!graphId) {
    throw new Error('Graph ID required. Call setDefaultGraphId() or pass graphId option.');
  }

  const url = new URL(endpoint, window.location.origin);
  url.searchParams.set('graphId', graphId);

  const response = await fetch(url.toString(), {
    ...fetchOptions,
    signal,
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
      ...fetchOptions.headers,
    },
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({ message: response.statusText }));

    // Special handling for 409 Conflict - include conflict info in error
    if (response.status === 409 && errorData.error?.conflict) {
      const conflictError = new Error(errorData.error.message || 'Content conflict detected') as Error & {
        status: number;
        conflict: unknown;
      };
      conflictError.status = 409;
      conflictError.conflict = errorData.error.conflict;
      throw conflictError;
    }

    throw new Error(errorData.error?.message || errorData.message || `API error: ${response.status}`);
  }

  return response.json();
}

// =============================================================================
// Node Operations
// =============================================================================

export interface ListNodesOptions extends FetchOptions {
  labels?: NodeLabel[];
  limit?: number;
  offset?: number;
  filters?: Record<string, string>;
}

/**
 * List nodes from the graph with optional filtering
 */
export async function listNodes(options: ListNodesOptions = {}): Promise<ListNodesResponse> {
  const { labels, limit = 50, offset = 0, filters = {}, ...fetchOptions } = options;

  const url = new URL(`${API_BASE}/nodes`, window.location.origin);

  if (fetchOptions.graphId || defaultGraphId) {
    url.searchParams.set('graphId', fetchOptions.graphId || defaultGraphId!);
  }
  if (labels?.length) {
    url.searchParams.set('labels', labels.join(','));
  }
  url.searchParams.set('limit', String(limit));
  url.searchParams.set('offset', String(offset));

  // Add property filters
  Object.entries(filters).forEach(([key, value]) => {
    url.searchParams.set(key, value);
  });

  return graphFetch<ListNodesResponse>(url.pathname + url.search, fetchOptions);
}

/**
 * Get nodes by specific labels (convenience wrapper)
 */
export async function getNodesByLabel(
  label: NodeLabel,
  options: Omit<ListNodesOptions, 'labels'> = {}
): Promise<GraphNode[]> {
  const response = await listNodes({ ...options, labels: [label] });
  return response.nodes;
}

/** Response from getNodeById including sync status */
export interface GetNodeResponse {
  node: GraphNode;
  syncStatus?: {
    synced: boolean;
    syncedAt: string | null;
    editedAt: string;
    editedBy: string;
    contentHash: string;
    gitHash: string | null;
  };
}

/**
 * Get a single node by ID
 * Returns full response including syncStatus for conflict detection
 */
export async function getNodeById(
  nodeId: string,
  options: FetchOptions = {}
): Promise<GetNodeResponse | null> {
  try {
    const response = await graphFetch<GetNodeResponse>(
      `${API_BASE}/nodes/${encodeURIComponent(nodeId)}`,
      options
    );
    return response;
  } catch {
    return null;
  }
}

// =============================================================================
// Node Update Operations
// =============================================================================

export interface UpdateNodeOptions extends FetchOptions {
  /** Properties to update (partial update supported) */
  properties: Record<string, unknown>;
  /** Content hash when editing started (for conflict detection) */
  baselineHash?: string;
  /** How to handle conflicts if detected */
  conflictStrategy?: 'skip' | 'force';
}

export interface UpdateNodeResponse {
  node: GraphNode;
  syncStatus: {
    synced: boolean;
    syncedAt: string | null;
    editedAt: string;
    editedBy: string;
    contentHash: string;
    gitHash: string | null;
  };
}

/**
 * Update a node's properties in the graph
 *
 * - Performs partial update (only specified properties are changed)
 * - Sets synced=false to indicate pending git sync
 * - Updates editedAt timestamp and editedBy user
 * - Computes contentHash if content field is updated
 *
 * @param nodeId - The ID of the node to update
 * @param options - Update options including properties to change
 * @returns Updated node with sync status
 * @throws Error if authentication fails, node not found, or update fails
 */
export async function updateNode(
  nodeId: string,
  options: UpdateNodeOptions
): Promise<UpdateNodeResponse> {
  const { properties, baselineHash, conflictStrategy, ...fetchOptions } = options;

  return graphFetch<UpdateNodeResponse>(
    `${API_BASE}/nodes/${encodeURIComponent(nodeId)}`,
    {
      ...fetchOptions,
      method: 'PATCH',
      body: JSON.stringify({
        properties,
        ...(baselineHash && { baselineHash }),
        ...(conflictStrategy && { conflictStrategy }),
      }),
    }
  );
}

// =============================================================================
// Node Create Operations
// =============================================================================

export interface CreateNodeOptions extends FetchOptions {
  /** Node type/label (e.g., 'ADR', 'Pattern', 'Gotcha') */
  label: NodeLabel;
  /** Properties for the new node */
  properties: Record<string, unknown>;
}

export interface CreateNodeResponse {
  node: GraphNode;
  syncStatus: {
    synced: boolean;
    syncedAt: string | null;
    editedAt: string;
    editedBy: string;
    contentHash: string;
    gitHash: string | null;
  };
}

/**
 * Create a new node in the graph
 *
 * - Creates node with specified label and properties
 * - Sets synced=false to indicate pending git sync
 * - Auto-generates ID if not provided
 * - Sets createdAt/editedAt timestamps
 *
 * @param options - Create options including label and properties
 * @returns Created node with sync status
 * @throws Error if authentication fails or creation fails
 */
export async function createNode(
  options: CreateNodeOptions
): Promise<CreateNodeResponse> {
  const { label, properties, ...fetchOptions } = options;

  return graphFetch<CreateNodeResponse>(
    `${API_BASE}/nodes`,
    {
      ...fetchOptions,
      method: 'POST',
      body: JSON.stringify({ label, data: properties }),
    }
  );
}

/**
 * Get the next available ADR number
 * Queries existing ADRs and returns the next sequential number
 */
export async function getNextADRNumber(options: FetchOptions = {}): Promise<string> {
  const { graphId = defaultGraphId } = options;

  if (!graphId) {
    throw new Error('Graph ID required');
  }

  // Fetch all ADRs to find the highest number
  const response = await listNodes({
    ...options,
    graphId,
    labels: ['ADR'],
    limit: 1000, // Should be enough for most projects
  });

  let maxNumber = 0;
  for (const node of response.nodes) {
    const props = node.properties as Record<string, unknown>;
    const adrId = (props.adr_id || props.id || '') as string;
    const match = adrId.match(/ADR-(\d+)/i);
    if (match) {
      const num = parseInt(match[1], 10);
      if (num > maxNumber) {
        maxNumber = num;
      }
    }
  }

  // Return next number formatted as ADR-XXX
  const nextNum = maxNumber + 1;
  return `ADR-${nextNum.toString().padStart(3, '0')}`;
}

/**
 * Get the next available Pattern ID
 */
export async function getNextPatternId(options: FetchOptions = {}): Promise<string> {
  const { graphId = defaultGraphId } = options;

  if (!graphId) {
    throw new Error('Graph ID required');
  }

  const response = await listNodes({
    ...options,
    graphId,
    labels: ['Pattern'],
    limit: 1000,
  });

  let maxNumber = 0;
  for (const node of response.nodes) {
    const props = node.properties as Record<string, unknown>;
    const patternId = (props.pattern_id || props.id || '') as string;
    const match = patternId.match(/PATTERN-(\d+)/i);
    if (match) {
      const num = parseInt(match[1], 10);
      if (num > maxNumber) {
        maxNumber = num;
      }
    }
  }

  const nextNum = maxNumber + 1;
  return `PATTERN-${nextNum.toString().padStart(3, '0')}`;
}

/**
 * Get the next available Gotcha ID
 */
export async function getNextGotchaId(options: FetchOptions = {}): Promise<string> {
  const { graphId = defaultGraphId } = options;

  if (!graphId) {
    throw new Error('Graph ID required');
  }

  const response = await listNodes({
    ...options,
    graphId,
    labels: ['Gotcha'],
    limit: 1000,
  });

  let maxNumber = 0;
  for (const node of response.nodes) {
    const props = node.properties as Record<string, unknown>;
    const gotchaId = (props.gotcha_id || props.id || '') as string;
    const match = gotchaId.match(/GOTCHA-(\d+)/i);
    if (match) {
      const num = parseInt(match[1], 10);
      if (num > maxNumber) {
        maxNumber = num;
      }
    }
  }

  const nextNum = maxNumber + 1;
  return `GOTCHA-${nextNum.toString().padStart(3, '0')}`;
}

// =============================================================================
// Search Operations
// =============================================================================

export interface SearchOptions extends FetchOptions {
  query: string;
  labels?: NodeLabel[];
  limit?: number;
}

/**
 * Semantic search across nodes
 */
export async function searchNodes(options: SearchOptions): Promise<QueryResponse> {
  const { query, labels, limit = 20, graphId = defaultGraphId, signal } = options;

  if (!graphId) {
    throw new Error('Graph ID required');
  }

  const token = await getAuthToken();
  if (!token) {
    throw new Error('Authentication required');
  }

  const response = await fetch(`${API_BASE}/query`, {
    method: 'POST',
    signal,
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({
      graphId,
      query,
      labels,
      limit,
    }),
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({ message: response.statusText }));
    throw new Error(error.error?.message || error.message || 'Search failed');
  }

  return response.json();
}

// =============================================================================
// Adjacency Operations
// =============================================================================

export interface GetAdjacenciesOptions extends FetchOptions {
  nodeId: string;
  relationshipTypes?: string[];
  direction?: 'incoming' | 'outgoing' | 'both';
  depth?: number;
}

/**
 * Get adjacent nodes (1-hop relationships)
 */
export async function getAdjacencies(options: GetAdjacenciesOptions): Promise<AdjacenciesResponse> {
  const {
    nodeId,
    relationshipTypes,
    direction = 'both',
    depth = 1,
    graphId = defaultGraphId,
    signal
  } = options;

  if (!graphId) {
    throw new Error('Graph ID required');
  }

  const token = await getAuthToken();
  if (!token) {
    throw new Error('Authentication required');
  }

  // Build query params
  const params = new URLSearchParams({
    graphId,
    direction,
    depth: String(depth),
  });

  if (relationshipTypes?.length) {
    params.set('types', relationshipTypes.join(','));
  }

  const response = await fetch(`${API_BASE}/adjacencies/${nodeId}?${params}`, {
    signal,
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({ message: response.statusText }));
    throw new Error(error.error?.message || error.message || 'Failed to get adjacencies');
  }

  return response.json();
}

// =============================================================================
// Status Operations
// =============================================================================

/**
 * Get graph status and statistics
 */
export async function getGraphStatus(options: FetchOptions = {}): Promise<GraphStatusResponse> {
  const url = new URL(`${API_BASE}/status`, window.location.origin);
  if (options.graphId || defaultGraphId) {
    url.searchParams.set('graphId', options.graphId || defaultGraphId!);
  }
  return graphFetch<GraphStatusResponse>(url.pathname + url.search, options);
}

// =============================================================================
// Tree Building Operations
// =============================================================================

import type { TreeNode } from './types';

/** Helper to safely get a property from node properties */
function getNodeProp(properties: Record<string, unknown>, key: string): string | undefined {
  const value = properties[key];
  return typeof value === 'string' ? value : undefined;
}

/**
 * Normalize an ID to a canonical form for deduplication
 * Handles:
 * - e012, EPIC-012, epic_012 -> e012 (epics)
 * - e008_s04_t08 -> e008_s04_t08 (preserve full task IDs)
 * - e008_s04 -> e008_s04 (preserve full sprint IDs)
 */
function normalizeId(id: string): string {
  const lower = id.toLowerCase().trim();

  // If it's a full task ID (e{NNN}_s{NN}_t{NN}), preserve it
  if (lower.match(/^e\d+_s\d+_t\d+$/)) {
    return lower;
  }

  // If it's a full sprint ID (e{NNN}_s{NN}), preserve it
  if (lower.match(/^e\d+_s\d+$/)) {
    return lower;
  }

  // Extract numeric part from epic formats
  // Pattern: e{NNN}, epic-{NNN}, epic_{NNN}
  const match = lower.match(/^(?:e|epic[-_]?)(\d+)$/);
  if (match) {
    // Pad to 3 digits for consistency
    return `e${match[1].padStart(3, '0')}`;
  }

  return lower;
}

/**
 * Normalize a title by stripping common prefixes like "EPIC-012:" or "ADR-001:"
 */
function normalizeTitle(title: string): string {
  // Remove prefixes like "EPIC-012:", "ADR-001:", etc.
  return title
    .replace(/^(?:EPIC|ADR|PRD|Sprint|Task)[-_]?\d+[:\s]+/i, '')
    .trim()
    .toLowerCase();
}

/**
 * Check if a title is malformed (contains code artifacts)
 * Returns true if the title appears to be corrupted data
 */
function isMalformedTitle(title: string): boolean {
  if (!title) return true;

  const malformedPatterns = [
    /^string[;,}\s]/i,           // starts with 'string;' or 'string,' or 'string }'
    /^["']?string["']?[;,]/i,    // quoted string with separator
    /^[{}\[\]];?$/,              // just braces/brackets
    /^\[object/i,                // stringified object
    /^undefined$/i,              // literal undefined
    /^null$/i,                   // literal null
    /^function\s*\(/i,           // function definition
    /\/\/\s*["']/,               // JS comment with quote
    /^["']?(GET|POST|PUT|PATCH|DELETE)\s+\/api/i,  // API endpoint
  ];

  return malformedPatterns.some(pattern => pattern.test(title));
}

/**
 * Extract a clean title from a potentially malformed string
 * Tries to find quoted content or meaningful text
 */
function extractCleanTitle(title: string): string | null {
  // Try to extract quoted string (handles 'string; // "Actual Title"')
  const quotedMatch = title.match(/"([^"]+)"|'([^']+)'/);
  if (quotedMatch) {
    const extracted = quotedMatch[1] || quotedMatch[2];
    // Don't return if the extracted content is also malformed
    if (extracted && !isMalformedTitle(extracted)) {
      return extracted;
    }
  }

  // Try to extract content after // comment marker
  const commentMatch = title.match(/\/\/\s*(.+)$/);
  if (commentMatch) {
    const afterComment = commentMatch[1].replace(/^["']|["']$/g, '').trim();
    if (afterComment && !isMalformedTitle(afterComment)) {
      return afterComment;
    }
  }

  return null;
}

/**
 * Sanitize a sprint title, handling malformed data from database
 * Examples of malformed titles:
 * - 'string; // "Graph-First Reading"' -> 'Graph-First Reading'
 * - 'string,' -> use fallback ID
 * - 'PATCH /api/v1/task/{id}/status Endpoint' -> use fallback ID
 */
function sanitizeSprintTitle(title: string, sprintId: string): string {
  if (!title) return sprintId;

  // If title is malformed, try to extract clean content or use fallback
  if (isMalformedTitle(title)) {
    const cleanTitle = extractCleanTitle(title);
    if (cleanTitle) {
      return cleanTitle;
    }

    // Generate fallback from sprint ID
    const normalizedId = extractNormalizedSprintId(sprintId, '');
    if (normalizedId) {
      const parts = normalizedId.match(/e(\d+)_s(\d+)/);
      if (parts) {
        return `Sprint ${parseInt(parts[2])} (Epic ${parseInt(parts[1])})`;
      }
    }
    return sprintId;
  }

  return title;
}

/**
 * Sanitize a task title, handling malformed data from database
 */
function sanitizeTaskTitle(title: string, taskId: string): string {
  if (!title) return taskId;

  if (isMalformedTitle(title)) {
    const cleanTitle = extractCleanTitle(title);
    if (cleanTitle) {
      return cleanTitle;
    }

    // Generate fallback from task ID
    const taskMatch = taskId.match(/e(\d+)_s(\d+)_t(\d+)/i);
    if (taskMatch) {
      return `Task ${parseInt(taskMatch[3])} (Sprint ${parseInt(taskMatch[2])})`;
    }
    return taskId;
  }

  return title;
}

/**
 * Deduplicate nodes by a property key, keeping the first occurrence
 * Uses normalized ID matching and title deduplication to handle various formats
 */
function deduplicateByProperty<T extends GraphNode>(
  nodes: T[],
  propKey: string
): T[] {
  const seenIds = new Set<string>();
  const seenTitles = new Set<string>();

  return nodes.filter((node) => {
    const props = node.properties as Record<string, unknown>;
    const rawId = (props[propKey] as string) || node.id;
    const normalizedId = normalizeId(rawId);
    const title = (props['title'] as string) || '';
    const normalizedTitleKey = normalizeTitle(title);

    // Check both normalized ID and normalized title
    if (seenIds.has(normalizedId)) {
      return false;
    }

    // Also check for title duplicates (handles cases where epic_id differs but title is same)
    if (normalizedTitleKey && seenTitles.has(normalizedTitleKey)) {
      return false;
    }

    seenIds.add(normalizedId);
    if (normalizedTitleKey) {
      seenTitles.add(normalizedTitleKey);
    }
    return true;
  });
}

/**
 * Extract epic identifier from a sprint_id, task_id, or node ID
 * Handles formats anywhere in string:
 * - e005_s01, e005-s01 → e005
 * - EPIC-005, epic_005, epic005 → e005
 * - SPRINT-2026-01-epic010-sprint2 → e010
 * - SPRINT-2026-02-e009-s05 → e009
 */
function extractEpicId(id: string): string | null {
  const lower = id.toLowerCase();

  // Pattern 1: e{NNN}[-_]s{NN} anywhere (e.g., "e009-s05", "e009_s01")
  const eMatch = lower.match(/e(\d{2,3})[-_]s\d+/);
  if (eMatch) return `e${eMatch[1].padStart(3, '0')}`;

  // Pattern 2: standalone e{NNN} at word boundary (e.g., "-e009-")
  const standaloneE = lower.match(/[-_]e(\d{2,3})[-_]/);
  if (standaloneE) return `e${standaloneE[1].padStart(3, '0')}`;

  // Pattern 3: epic{NNN} or epic-{NNN} or epic_{NNN} anywhere
  const epicMatch = lower.match(/epic[-_]?(\d{2,3})/);
  if (epicMatch) return `e${epicMatch[1].padStart(3, '0')}`;

  // Pattern 4: e{NNN} at start of string (original behavior)
  const prefixMatch = lower.match(/^e(\d+)/);
  if (prefixMatch) return `e${prefixMatch[1].padStart(3, '0')}`;

  return null;
}

/**
 * Extract sprint identifier from a task_id
 * Handles formats: e005_s01_t01 -> e005_s01
 */
function extractSprintId(taskId: string): string | null {
  const lower = taskId.toLowerCase();

  // Pattern: e{NNN}_s{NN}_t{NN} or e{NNN}_s{NN}
  const match = lower.match(/^(e\d+_s\d+)/);
  if (match) return match[1];

  return null;
}

/**
 * Extract normalized sprint ID from sprint node ID or title
 * Handles formats:
 * - SPRINT-2026-02-epic008-sprint4 → e008_s04
 * - SPRINT: EPIC-010 Sprint 3 → e010_s03
 * - e009_s05 (already normalized) → e009_s05
 */
function extractNormalizedSprintId(id: string, title?: string): string | null {
  const lower = id.toLowerCase();
  const titleLower = (title || '').toLowerCase();

  // Pattern 1: Already in e{NNN}_s{NN} format
  const directMatch = lower.match(/^(e\d+_s\d+)/);
  if (directMatch) return directMatch[1];

  // Pattern 2: epic{NNN}-sprint{N} or epic{NNN}sprint{N} in ID
  const epicSprintMatch = lower.match(/epic[-_]?(\d+)[-_]?sprint[-_]?(\d+)/);
  if (epicSprintMatch) {
    return `e${epicSprintMatch[1].padStart(3, '0')}_s${epicSprintMatch[2].padStart(2, '0')}`;
  }

  // Pattern 3: e{NNN}-s{NN} with dash instead of underscore
  const dashMatch = lower.match(/e(\d+)-s(\d+)/);
  if (dashMatch) {
    return `e${dashMatch[1].padStart(3, '0')}_s${dashMatch[2].padStart(2, '0')}`;
  }

  // Pattern 4: Check title for "Sprint {N}" with epic context
  const epicId = extractEpicId(id) || extractEpicId(title || '');
  if (epicId && titleLower) {
    const sprintNumMatch = titleLower.match(/sprint\s*(\d+)/);
    if (sprintNumMatch) {
      return `${epicId}_s${sprintNumMatch[1].padStart(2, '0')}`;
    }
  }

  return null;
}

/**
 * Extract canonical epic ID from a node (checks multiple sources)
 * Returns normalized form like "e015"
 */
function getCanonicalEpicId(epic: GraphNode): string | null {
  const props = epic.properties as Record<string, unknown>;
  const epicIdProp = getNodeProp(props, 'epic_id');
  const title = getNodeProp(props, 'title') || '';

  // Try to extract from: epic_id property, node.id, title
  return extractEpicId(epicIdProp || '') ||
         extractEpicId(epic.id) ||
         extractEpicId(title) ||
         null;
}

/**
 * Sanitize an epic title, handling malformed data
 * Similar to sanitizeSprintTitle but for epics
 */
function sanitizeEpicTitle(title: string, epicId: string): string {
  if (!title) return epicId;

  // Check for JavaScript comment pattern (data corruption)
  const jsCommentMatch = title.match(/^[^"]*\/\/\s*"([^"]+)"/);
  if (jsCommentMatch) {
    return jsCommentMatch[1];
  }

  // Check for 'string;' or 'string,' prefix patterns
  if (title.match(/^string[;,]\s*/i)) {
    const quotedMatch = title.match(/"([^"]+)"/);
    if (quotedMatch) {
      return quotedMatch[1];
    }
    // Remove the 'string,' prefix
    return title.replace(/^string[;,]\s*/i, '').trim() || epicId;
  }

  // If title is just an ID-like string (e.g., "e015"), prefer the epicId if it has more info
  if (title.match(/^e\d+$/i) && epicId && epicId.length > title.length) {
    return epicId;
  }

  return title;
}

/**
 * Build a tree structure from flat node list
 * Hierarchical structure: Project -> Epics -> Sprints -> Tasks
 */
export async function buildTreeHierarchy(options: FetchOptions = {}): Promise<TreeNode | null> {
  const graphId = options.graphId || defaultGraphId;
  if (!graphId) {
    throw new Error('Graph ID required');
  }

  // Fetch all hierarchical nodes in parallel
  const [rawEpics, rawSprints, rawTasks, adrs, prds, patterns, gotchas, principles] = await Promise.all([
    getNodesByLabel('Epic', options),
    getNodesByLabel('Sprint', options),
    getNodesByLabel('Task', options),
    getNodesByLabel('ADR', options),
    getNodesByLabel('PRD', options),
    getNodesByLabel('Pattern', options),
    getNodesByLabel('Gotcha', options),
    getNodesByLabel('Principle', options),
  ]);

  // Smart epic deduplication that preserves sprint linkage
  // Group epics by canonical ID, pick best display node, but keep ALL node IDs for sprint matching
  const epicsByCanonicalId = new Map<string, GraphNode[]>();
  const unmatchableEpics: GraphNode[] = [];

  rawEpics.forEach((epic) => {
    const canonicalId = getCanonicalEpicId(epic);
    if (canonicalId) {
      const group = epicsByCanonicalId.get(canonicalId) || [];
      group.push(epic);
      epicsByCanonicalId.set(canonicalId, group);
    } else {
      // Can't determine canonical ID - keep as separate
      unmatchableEpics.push(epic);
    }
  });

  // For each group, pick the "best" epic (one with a proper title)
  const deduplicatedEpics: GraphNode[] = [];
  const epicMap = new Map<string, TreeNode>(); // Will be populated with ALL variants

  epicsByCanonicalId.forEach((group, canonicalId) => {
    // Sort: prefer nodes with proper titles (not just IDs), then by longest title
    const sorted = group.sort((a, b) => {
      const propsA = a.properties as Record<string, unknown>;
      const propsB = b.properties as Record<string, unknown>;
      const titleA = getNodeProp(propsA, 'title') || '';
      const titleB = getNodeProp(propsB, 'title') || '';

      // Prefer nodes with non-ID titles
      const aIsIdOnly = titleA.match(/^e\d+$/i) || !titleA;
      const bIsIdOnly = titleB.match(/^e\d+$/i) || !titleB;
      if (aIsIdOnly && !bIsIdOnly) return 1;
      if (!aIsIdOnly && bIsIdOnly) return -1;

      // Then prefer longer titles (usually more descriptive)
      return titleB.length - titleA.length;
    });

    // Use the best one for display
    deduplicatedEpics.push(sorted[0]);
  });

  // Add unmatchable epics (couldn't determine canonical ID)
  unmatchableEpics.forEach((epic) => {
    const props = epic.properties as Record<string, unknown>;
    const title = getNodeProp(props, 'title') || '';
    // Skip if it's a malformed entry with no real content
    if (title && !title.match(/^string[;,]/i)) {
      deduplicatedEpics.push(epic);
    }
  });

  const tasks = deduplicateByProperty(rawTasks, 'task_id');

  // Deduplicate sprints by normalized sprint ID (e.g., e006_s03)
  const seenNormalizedSprintIds = new Set<string>();
  const sprints = rawSprints.filter((sprint) => {
    const props = sprint.properties as Record<string, unknown>;
    const title = getNodeProp(props, 'title') || '';
    const normalizedId = extractNormalizedSprintId(sprint.id, title);

    if (normalizedId) {
      if (seenNormalizedSprintIds.has(normalizedId)) {
        return false;
      }
      seenNormalizedSprintIds.add(normalizedId);
    }

    return true;
  });

  // Build epic tree nodes
  const epicNodes: TreeNode[] = deduplicatedEpics.map((epic) => {
    const props = epic.properties as Record<string, unknown>;
    const epicIdProp = getNodeProp(props, 'epic_id') || epic.id;
    const rawTitle = getNodeProp(props, 'title') || '';
    const canonicalId = getCanonicalEpicId(epic);

    const node: TreeNode = {
      id: epic.id,
      label: 'Epic' as const,
      name: sanitizeEpicTitle(rawTitle, epicIdProp),
      hasChildren: true,
      isExpanded: false,
      properties: epic.properties,
      children: [],
    };

    // Add to map with multiple possible keys for matching
    epicMap.set(epicIdProp.toLowerCase(), node);
    epicMap.set(epic.id.toLowerCase(), node);

    if (canonicalId) {
      epicMap.set(canonicalId, node);
      // Also store numeric part
      const numericMatch = canonicalId.match(/\d+/);
      if (numericMatch) {
        epicMap.set(numericMatch[0], node);
        epicMap.set(numericMatch[0].replace(/^0+/, '') || '0', node);
      }
    }

    return node;
  });

  // IMPORTANT: Also add epicMap entries for ALL duplicate nodes pointing to the canonical node
  // This ensures sprints linked to any variant find the correct tree node
  epicsByCanonicalId.forEach((group, canonicalId) => {
    const targetNode = epicMap.get(canonicalId);
    if (targetNode) {
      group.forEach((epic) => {
        const props = epic.properties as Record<string, unknown>;
        const epicIdProp = getNodeProp(props, 'epic_id');

        // Add all ID variants to map pointing to the canonical node
        epicMap.set(epic.id.toLowerCase(), targetNode);
        if (epicIdProp) {
          epicMap.set(epicIdProp.toLowerCase(), targetNode);
        }
      });
    }
  });

  // Map for sprint lookup when grouping tasks
  const sprintMap = new Map<string, TreeNode>();

  // Build sprint tree nodes and nest them under their parent Epic
  sprints.forEach((sprint) => {
    const props = sprint.properties as Record<string, unknown>;
    const sprintId = getNodeProp(props, 'sprint_id') || sprint.id;
    const rawTitle = getNodeProp(props, 'title') || '';

    const sprintTreeNode: TreeNode = {
      id: sprint.id,
      label: 'Sprint' as const,
      name: sanitizeSprintTitle(rawTitle, sprintId),
      hasChildren: true,
      isExpanded: false,
      properties: sprint.properties,
      children: [],
    };

    // Store in sprint map for task grouping with multiple lookup keys
    const title = getNodeProp(props, 'title') || '';
    sprintMap.set(sprintId.toLowerCase(), sprintTreeNode);
    sprintMap.set(sprint.id.toLowerCase(), sprintTreeNode);

    // Extract normalized sprint ID (e.g., e008_s04) for task matching
    const normalizedSprintId = extractNormalizedSprintId(sprint.id, title);
    if (normalizedSprintId) {
      sprintMap.set(normalizedSprintId, sprintTreeNode);
    }

    // Also try the old extraction method for backwards compatibility
    const extractedSprintId = extractSprintId(sprintId + '_t00');
    if (extractedSprintId) {
      sprintMap.set(extractedSprintId, sprintTreeNode);
    }

    // Nest sprint under parent Epic using extractEpicId
    // Try multiple sources: sprint_id property, node ID, title, and explicit epic_id property
    let parentEpic: TreeNode | undefined;

    // First, check for explicit epic_id property on sprint
    const explicitEpicId = getNodeProp(props, 'epic_id');
    if (explicitEpicId) {
      const normalized = normalizeId(explicitEpicId);
      parentEpic = epicMap.get(normalized) || epicMap.get(explicitEpicId.toLowerCase());
    }

    // Fall back to extracting from sprint_id, node ID, or title
    if (!parentEpic) {
      const epicIdFromSprint = extractEpicId(sprintId) || extractEpicId(sprint.id) || extractEpicId(rawTitle);
      if (epicIdFromSprint) {
        parentEpic = epicMap.get(epicIdFromSprint);
      }
    }

    // Last resort: try the normalized sprint ID to extract epic
    if (!parentEpic && normalizedSprintId) {
      const epicIdFromNormalized = extractEpicId(normalizedSprintId);
      if (epicIdFromNormalized) {
        parentEpic = epicMap.get(epicIdFromNormalized);
      }
    }

    if (parentEpic) {
      parentEpic.children = parentEpic.children || [];
      parentEpic.children.push(sprintTreeNode);
    }
  });

  // Group tasks by sprint
  tasks.forEach((task) => {
    const props = task.properties as Record<string, unknown>;
    const taskId = getNodeProp(props, 'task_id') || task.id;
    const rawTaskTitle = getNodeProp(props, 'title') || '';

    const taskTreeNode: TreeNode = {
      id: task.id,
      label: 'Task' as const,
      name: sanitizeTaskTitle(rawTaskTitle, taskId),
      hasChildren: false,
      properties: task.properties,
    };

    // Try to find parent sprint
    const sprintIdFromTask = extractSprintId(taskId);
    let sprintNode: TreeNode | undefined;

    if (sprintIdFromTask) {
      sprintNode = sprintMap.get(sprintIdFromTask);
    }

    if (sprintNode) {
      sprintNode.children = sprintNode.children || [];
      sprintNode.children.push(taskTreeNode);
    }
    // Note: Tasks without matching sprints are intentionally not shown in the tree
    // They can still be found via search or category view
  });

  // Build knowledge folder children (ADRs, PRDs, Patterns, Gotchas, Principles)
  const knowledgeChildren: TreeNode[] = [];

  if (adrs.length > 0) {
    knowledgeChildren.push({
      id: 'adrs-folder',
      label: 'Project' as const,
      name: `ADRs (${adrs.length})`,
      hasChildren: true,
      isExpanded: false,
      children: adrs.map((adr) => {
        const props = adr.properties as Record<string, unknown>;
        return {
          id: adr.id,
          label: 'ADR' as const,
          name: getNodeProp(props, 'title') || getNodeProp(props, 'adr_id') || adr.id,
          hasChildren: false,
          properties: adr.properties,
        };
      }),
    });
  }

  if (prds.length > 0) {
    knowledgeChildren.push({
      id: 'prds-folder',
      label: 'Project' as const,
      name: `PRDs (${prds.length})`,
      hasChildren: true,
      isExpanded: false,
      children: prds.map((prd) => {
        const props = prd.properties as Record<string, unknown>;
        return {
          id: prd.id,
          label: 'PRD' as const,
          name: getNodeProp(props, 'title') || getNodeProp(props, 'prd_id') || prd.id,
          hasChildren: false,
          properties: prd.properties,
        };
      }),
    });
  }

  if (patterns.length > 0) {
    knowledgeChildren.push({
      id: 'patterns-folder',
      label: 'Project' as const,
      name: `Patterns (${patterns.length})`,
      hasChildren: true,
      isExpanded: false,
      children: patterns.map((p) => {
        const props = p.properties as Record<string, unknown>;
        return {
          id: p.id,
          label: 'Pattern' as const,
          name: getNodeProp(props, 'name') || getNodeProp(props, 'pattern_id') || p.id,
          hasChildren: false,
          properties: p.properties,
        };
      }),
    });
  }

  if (gotchas.length > 0) {
    knowledgeChildren.push({
      id: 'gotchas-folder',
      label: 'Project' as const,
      name: `Gotchas (${gotchas.length})`,
      hasChildren: true,
      isExpanded: false,
      children: gotchas.map((g) => {
        const props = g.properties as Record<string, unknown>;
        return {
          id: g.id,
          label: 'Gotcha' as const,
          name: getNodeProp(props, 'title') || getNodeProp(props, 'gotcha_id') || g.id,
          hasChildren: false,
          properties: g.properties,
        };
      }),
    });
  }

  if (principles.length > 0) {
    knowledgeChildren.push({
      id: 'principles-folder',
      label: 'Project' as const,
      name: `Principles (${principles.length})`,
      hasChildren: true,
      isExpanded: false,
      children: principles.map((p) => {
        const props = p.properties as Record<string, unknown>;
        return {
          id: p.id,
          label: 'Principle' as const,
          name: getNodeProp(props, 'title') || getNodeProp(props, 'principle_id') || p.id,
          hasChildren: false,
          properties: p.properties,
        };
      }),
    });
  }

  // Build root tree with hierarchical Epic → Sprint → Task structure
  const root: TreeNode = {
    id: 'project-root',
    label: 'Project' as const,
    name: 'Project',
    hasChildren: true,
    isExpanded: true,
    children: [
      // Epics with nested Sprints and Tasks
      ...epicNodes,
      // Knowledge folder containing ADRs, PRDs, Patterns, Gotchas, Principles
      {
        id: 'knowledge-folder',
        label: 'Project' as const,
        name: 'Knowledge',
        hasChildren: knowledgeChildren.length > 0,
        isExpanded: false,
        children: knowledgeChildren,
      },
    ],
  };

  return root;
}

// =============================================================================
// Parent Node Lookup
// =============================================================================

/**
 * Determine the parent type and ID for a given node
 * Returns null if node has no parent (Epics, ADRs, etc.)
 */
export function getParentInfo(node: GraphNode): { type: NodeLabel; searchId: string } | null {
  const props = node.properties as Record<string, unknown>;

  // Tasks have Sprints as parents
  if (node.label === 'Task') {
    const taskId = getNodeProp(props, 'task_id') || node.id;
    const sprintId = extractSprintId(taskId);
    if (sprintId) {
      return { type: 'Sprint', searchId: sprintId };
    }
  }

  // Sprints have Epics as parents
  if (node.label === 'Sprint') {
    const sprintId = getNodeProp(props, 'sprint_id') || node.id;
    const title = getNodeProp(props, 'title') || '';
    const epicId = extractEpicId(sprintId) || extractEpicId(node.id) || extractEpicId(title);
    if (epicId) {
      return { type: 'Epic', searchId: epicId };
    }
  }

  // Other node types have no parent in our hierarchy
  return null;
}

/**
 * Find the parent node for a given node
 * Uses the hierarchy relationships: Task → Sprint → Epic
 */
export async function getParentNode(
  node: GraphNode,
  options: FetchOptions = {}
): Promise<GraphNode | null> {
  const parentInfo = getParentInfo(node);
  if (!parentInfo) {
    return null;
  }

  // Fetch all nodes of the parent type
  const candidates = await getNodesByLabel(parentInfo.type, options);

  // Find matching parent based on normalized IDs
  for (const candidate of candidates) {
    const props = candidate.properties as Record<string, unknown>;

    if (parentInfo.type === 'Sprint') {
      // Match sprint by extracting normalized sprint ID
      const title = getNodeProp(props, 'title') || '';
      const normalizedId = extractNormalizedSprintId(candidate.id, title);
      if (normalizedId === parentInfo.searchId) {
        return candidate;
      }
    }

    if (parentInfo.type === 'Epic') {
      // Match epic by extracting normalized epic ID
      const epicId = getNodeProp(props, 'epic_id') || candidate.id;
      const normalizedId = extractEpicId(epicId) || extractEpicId(candidate.id);
      if (normalizedId === parentInfo.searchId) {
        return candidate;
      }
    }
  }

  return null;
}

// =============================================================================
// Child Node Lookup
// =============================================================================

/**
 * Determine the child type and search criteria for a given node
 * Returns null if node has no children (Tasks, ADRs, etc.)
 */
export function getChildInfo(node: GraphNode): { type: NodeLabel; parentId: string } | null {
  const props = node.properties as Record<string, unknown>;

  // Epics have Sprints as children
  if (node.label === 'Epic') {
    const epicId = getNodeProp(props, 'epic_id') || node.id;
    const normalizedId = extractEpicId(epicId) || extractEpicId(node.id);
    if (normalizedId) {
      return { type: 'Sprint', parentId: normalizedId };
    }
  }

  // Sprints have Tasks as children
  if (node.label === 'Sprint') {
    const sprintId = getNodeProp(props, 'sprint_id') || node.id;
    const title = getNodeProp(props, 'title') || '';
    const normalizedId = extractNormalizedSprintId(sprintId, title) || extractNormalizedSprintId(node.id, title);
    if (normalizedId) {
      return { type: 'Task', parentId: normalizedId };
    }
  }

  // Other node types have no children in our hierarchy
  return null;
}

/**
 * Find child nodes for a given node
 * Uses the hierarchy relationships: Epic → Sprint, Sprint → Task
 */
export async function getChildNodes(
  node: GraphNode,
  options: FetchOptions = {}
): Promise<GraphNode[]> {
  const childInfo = getChildInfo(node);
  if (!childInfo) {
    return [];
  }

  // Fetch all nodes of the child type
  const candidates = await getNodesByLabel(childInfo.type, options);
  const children: GraphNode[] = [];

  // Find matching children based on parent ID
  for (const candidate of candidates) {
    const props = candidate.properties as Record<string, unknown>;

    if (childInfo.type === 'Sprint') {
      // Match sprints that belong to this epic
      const sprintId = getNodeProp(props, 'sprint_id') || candidate.id;
      const title = getNodeProp(props, 'title') || '';
      const epicId = extractEpicId(sprintId) || extractEpicId(candidate.id) || extractEpicId(title);
      if (epicId === childInfo.parentId) {
        children.push(candidate);
      }
    }

    if (childInfo.type === 'Task') {
      // Match tasks that belong to this sprint
      const taskId = getNodeProp(props, 'task_id') || candidate.id;
      const sprintId = extractSprintId(taskId);
      if (sprintId === childInfo.parentId) {
        children.push(candidate);
      }
    }
  }

  // Sort children by their ID for consistent ordering
  children.sort((a, b) => {
    const aProps = a.properties as Record<string, unknown>;
    const bProps = b.properties as Record<string, unknown>;
    const aId = getNodeProp(aProps, 'task_id') || getNodeProp(aProps, 'sprint_id') || a.id;
    const bId = getNodeProp(bProps, 'task_id') || getNodeProp(bProps, 'sprint_id') || b.id;
    return aId.localeCompare(bId);
  });

  return children;
}

// =============================================================================
// Export all
// =============================================================================

export const graphApi = {
  listNodes,
  getNodesByLabel,
  getNodeById,
  updateNode,
  createNode,
  getNextADRNumber,
  getNextPatternId,
  getNextGotchaId,
  searchNodes,
  getAdjacencies,
  getGraphStatus,
  buildTreeHierarchy,
  getParentNode,
  getParentInfo,
  getChildNodes,
  getChildInfo,
  setDefaultGraphId,
  getDefaultGraphId,
};
