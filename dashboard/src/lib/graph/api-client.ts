/**
 * @fileType: utility
 * @status: current
 * @updated: 2025-12-11
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
 * Build a tree structure from flat node list
 * Hierarchical structure: Project -> Epics -> Sprints -> Tasks
 */
export async function buildTreeHierarchy(options: FetchOptions = {}): Promise<TreeNode | null> {
  const graphId = options.graphId || defaultGraphId;
  if (!graphId) {
    throw new Error('Graph ID required');
  }

  // Fetch all hierarchical nodes in parallel
  const [epics, sprints, tasks, adrs, patterns, gotchas] = await Promise.all([
    getNodesByLabel('Epic', options),
    getNodesByLabel('Sprint', options),
    getNodesByLabel('Task', options),
    getNodesByLabel('ADR', options),
    getNodesByLabel('Pattern', options),
    getNodesByLabel('Gotcha', options),
  ]);

  // Build epic tree nodes
  const epicNodes: TreeNode[] = epics.map((epic) => {
    const props = epic.properties as Record<string, unknown>;
    return {
      id: epic.id,
      label: 'Epic' as const,
      name: getNodeProp(props, 'title') || getNodeProp(props, 'epic_id') || epic.id,
      hasChildren: true,
      isExpanded: false,
      properties: epic.properties,
      children: [], // Will be populated with sprints
    };
  });

  // Group sprints by epic (based on ID prefix: e005_s01 belongs to e005)
  sprints.forEach((sprint) => {
    const props = sprint.properties as Record<string, unknown>;
    const sprintId = getNodeProp(props, 'sprint_id') || sprint.id;
    const epicPrefix = sprintId.split('_s')[0]; // e.g., "e005"

    const epicNode = epicNodes.find((e) => {
      const eProps = e.properties as Record<string, unknown> | undefined;
      const epicId = (eProps ? getNodeProp(eProps, 'epic_id') : undefined) || e.id;
      return epicId.includes(epicPrefix);
    });

    if (epicNode) {
      const sprintTreeNode: TreeNode = {
        id: sprint.id,
        label: 'Sprint' as const,
        name: getNodeProp(props, 'title') || sprintId,
        hasChildren: true,
        isExpanded: false,
        properties: sprint.properties,
        children: [],
      };
      epicNode.children = epicNode.children || [];
      epicNode.children.push(sprintTreeNode);
    }
  });

  // Group tasks by sprint
  tasks.forEach((task) => {
    const props = task.properties as Record<string, unknown>;
    const taskId = getNodeProp(props, 'task_id') || task.id;
    // Parse task ID: e005_s01_t01 -> sprint e005_s01
    const parts = taskId.split('_t');
    if (parts.length >= 1) {
      const sprintPrefix = parts[0];

      // Find the sprint in the tree
      for (const epic of epicNodes) {
        const sprint = epic.children?.find((s) => {
          const sProps = s.properties as Record<string, unknown> | undefined;
          const sId = (sProps ? getNodeProp(sProps, 'sprint_id') : undefined) || s.id;
          return sId.includes(sprintPrefix);
        });

        if (sprint) {
          const taskTreeNode: TreeNode = {
            id: task.id,
            label: 'Task' as const,
            name: getNodeProp(props, 'title') || taskId,
            hasChildren: false,
            properties: task.properties,
          };
          sprint.children = sprint.children || [];
          sprint.children.push(taskTreeNode);
          break;
        }
      }
    }
  });

  // Build root tree
  const root: TreeNode = {
    id: 'project-root',
    label: 'Project' as const,
    name: 'Project',
    hasChildren: true,
    isExpanded: true,
    children: [
      {
        id: 'epics-folder',
        label: 'Project' as const,
        name: 'Epics',
        hasChildren: epicNodes.length > 0,
        isExpanded: true,
        children: epicNodes,
      },
      {
        id: 'adrs-folder',
        label: 'Project' as const,
        name: 'ADRs',
        hasChildren: adrs.length > 0,
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
      },
      {
        id: 'patterns-folder',
        label: 'Project' as const,
        name: 'Patterns',
        hasChildren: patterns.length > 0,
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
      },
      {
        id: 'gotchas-folder',
        label: 'Project' as const,
        name: 'Gotchas',
        hasChildren: gotchas.length > 0,
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
  searchNodes,
  getAdjacencies,
  getGraphStatus,
  buildTreeHierarchy,
  setDefaultGraphId,
  getDefaultGraphId,
};
