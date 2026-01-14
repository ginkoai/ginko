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
    const error = await response.json().catch(() => ({ message: response.statusText }));
    throw new Error(error.error?.message || error.message || `API error: ${response.status}`);
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

/**
 * Get a single node by ID
 */
export async function getNodeById(
  nodeId: string,
  options: FetchOptions = {}
): Promise<GraphNode | null> {
  try {
    const response = await graphFetch<{ node: GraphNode }>(
      `${API_BASE}/nodes/${encodeURIComponent(nodeId)}`,
      options
    );
    return response.node;
  } catch {
    return null;
  }
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
 * Handles: e012, EPIC-012, epic_012, Epic-12, etc. -> e012
 */
function normalizeId(id: string): string {
  const lower = id.toLowerCase().trim();

  // Extract numeric part from various formats
  // Pattern: e{NNN}, epic-{NNN}, epic_{NNN}
  const match = lower.match(/^(?:e|epic[-_]?)(\d+)/);
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

  // Pattern: e{NNN}_s{NN}_t{NN}
  const match = lower.match(/^(e\d+_s\d+)/);
  if (match) return match[1];

  return null;
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

  // Deduplicate by semantic ID to avoid showing duplicates
  const epics = deduplicateByProperty(rawEpics, 'epic_id');
  const sprints = deduplicateByProperty(rawSprints, 'sprint_id');
  const tasks = deduplicateByProperty(rawTasks, 'task_id');

  // Build epic tree nodes with a map for fast lookup
  const epicMap = new Map<string, TreeNode>();
  const epicNodes: TreeNode[] = epics.map((epic) => {
    const props = epic.properties as Record<string, unknown>;
    const epicId = getNodeProp(props, 'epic_id') || epic.id;
    const node: TreeNode = {
      id: epic.id,
      label: 'Epic' as const,
      name: getNodeProp(props, 'title') || epicId,
      hasChildren: true,
      isExpanded: false,
      properties: epic.properties,
      children: [],
    };

    // Add to map with multiple possible keys for matching
    epicMap.set(epicId.toLowerCase(), node);
    epicMap.set(epic.id.toLowerCase(), node);

    // Extract from both epic_id property and node ID
    const extracted = extractEpicId(epicId) || extractEpicId(epic.id);
    if (extracted) {
      epicMap.set(extracted, node);
      // Also store numeric part (e.g., "005" or "5")
      const numericMatch = extracted.match(/\d+/);
      if (numericMatch) {
        epicMap.set(numericMatch[0], node);
        epicMap.set(numericMatch[0].replace(/^0+/, '') || '0', node); // Without leading zeros
      }
    }

    return node;
  });

  // Map for sprint lookup when grouping tasks
  const sprintMap = new Map<string, TreeNode>();

  // Build sprint tree nodes and nest them under their parent Epic
  sprints.forEach((sprint) => {
    const props = sprint.properties as Record<string, unknown>;
    const sprintId = getNodeProp(props, 'sprint_id') || sprint.id;

    const sprintTreeNode: TreeNode = {
      id: sprint.id,
      label: 'Sprint' as const,
      name: getNodeProp(props, 'title') || sprintId,
      hasChildren: true,
      isExpanded: false,
      properties: sprint.properties,
      children: [],
    };

    // Store in sprint map for task grouping
    sprintMap.set(sprintId.toLowerCase(), sprintTreeNode);
    const extractedSprintId = extractSprintId(sprintId + '_t00'); // Reuse extraction
    if (extractedSprintId) {
      sprintMap.set(extractedSprintId, sprintTreeNode);
    }

    // Nest sprint under parent Epic using extractEpicId
    // Try extracting from sprint_id property, node ID, and title
    const epicIdFromSprint = extractEpicId(sprintId) || extractEpicId(sprint.id) || extractEpicId(getNodeProp(props, 'title') || '');
    if (epicIdFromSprint) {
      const parentEpic = epicMap.get(epicIdFromSprint);
      if (parentEpic) {
        parentEpic.children = parentEpic.children || [];
        parentEpic.children.push(sprintTreeNode);
      }
    }
  });

  // Group tasks by sprint
  tasks.forEach((task) => {
    const props = task.properties as Record<string, unknown>;
    const taskId = getNodeProp(props, 'task_id') || task.id;

    const taskTreeNode: TreeNode = {
      id: task.id,
      label: 'Task' as const,
      name: getNodeProp(props, 'title') || taskId,
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
// Export all
// =============================================================================

export const graphApi = {
  listNodes,
  getNodesByLabel,
  getNodeById,
  searchNodes,
  getAdjacencies,
  getGraphStatus,
  buildTreeHierarchy,
  setDefaultGraphId,
  getDefaultGraphId,
};
