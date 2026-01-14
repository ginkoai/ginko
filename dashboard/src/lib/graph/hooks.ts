/**
 * @fileType: hook
 * @status: current
 * @updated: 2025-12-11
 * @tags: [graph, hooks, react-query, data-fetching]
 * @related: [api-client.ts, types.ts]
 * @priority: high
 * @complexity: medium
 * @dependencies: [@tanstack/react-query]
 */

'use client';

import { useQuery, useQueryClient, UseQueryOptions } from '@tanstack/react-query';
import {
  listNodes,
  searchNodes,
  getAdjacencies,
  getGraphStatus,
  buildTreeHierarchy,
  getNodesByLabel,
  getParentNode,
  getParentInfo,
  type ListNodesOptions,
  type SearchOptions,
  type GetAdjacenciesOptions,
} from './api-client';
import type {
  NodeLabel,
  GraphNode,
  ListNodesResponse,
  QueryResponse,
  GraphStatusResponse,
  AdjacenciesResponse,
  TreeNode,
} from './types';

// =============================================================================
// Query Keys
// =============================================================================

export const graphQueryKeys = {
  all: ['graph'] as const,
  nodes: (options?: ListNodesOptions) => ['graph', 'nodes', options] as const,
  // Include all options in the key to prevent cache collisions between different fetches
  nodesByLabel: (label: NodeLabel, options?: Omit<ListNodesOptions, 'labels'>) =>
    ['graph', 'nodes', label, options?.graphId, options?.limit, options?.offset] as const,
  search: (query: string, graphId?: string) => ['graph', 'search', query, graphId] as const,
  adjacencies: (nodeId: string, graphId?: string) => ['graph', 'adjacencies', nodeId, graphId] as const,
  parent: (nodeId: string, graphId?: string) => ['graph', 'parent', nodeId, graphId] as const,
  status: (graphId?: string) => ['graph', 'status', graphId] as const,
  tree: (graphId?: string) => ['graph', 'tree', graphId] as const,
};

// =============================================================================
// Node Hooks
// =============================================================================

/**
 * Fetch nodes with filtering and pagination
 */
export function useGraphNodes(
  options: ListNodesOptions = {},
  queryOptions?: Omit<UseQueryOptions<ListNodesResponse>, 'queryKey' | 'queryFn'>
) {
  return useQuery({
    queryKey: graphQueryKeys.nodes(options),
    queryFn: ({ signal }) => listNodes({ ...options, signal }),
    staleTime: 30_000, // 30 seconds
    ...queryOptions,
  });
}

/**
 * Fetch nodes by specific label
 */
export function useNodesByLabel(
  label: NodeLabel,
  options: Omit<ListNodesOptions, 'labels'> = {},
  queryOptions?: Omit<UseQueryOptions<GraphNode[]>, 'queryKey' | 'queryFn'>
) {
  return useQuery({
    queryKey: graphQueryKeys.nodesByLabel(label, options),
    queryFn: ({ signal }) => getNodesByLabel(label, { ...options, signal }),
    staleTime: 30_000,
    ...queryOptions,
  });
}

// =============================================================================
// Search Hook
// =============================================================================

/**
 * Semantic search across nodes
 */
export function useGraphSearch(
  query: string,
  options: Omit<SearchOptions, 'query'> = {},
  queryOptions?: Omit<UseQueryOptions<QueryResponse>, 'queryKey' | 'queryFn'>
) {
  return useQuery({
    queryKey: graphQueryKeys.search(query, options.graphId),
    queryFn: ({ signal }) => searchNodes({ ...options, query, signal }),
    enabled: query.length >= 2, // Only search with 2+ characters
    staleTime: 60_000, // Cache search results for 1 minute
    ...queryOptions,
  });
}

// =============================================================================
// Adjacency Hook
// =============================================================================

/**
 * Fetch adjacent nodes for a given node
 */
export function useNodeAdjacencies(
  nodeId: string | null,
  options: Omit<GetAdjacenciesOptions, 'nodeId'> = {},
  queryOptions?: Omit<UseQueryOptions<AdjacenciesResponse>, 'queryKey' | 'queryFn'>
) {
  return useQuery({
    queryKey: graphQueryKeys.adjacencies(nodeId || '', options.graphId),
    queryFn: ({ signal }) => getAdjacencies({ ...options, nodeId: nodeId!, signal }),
    enabled: !!nodeId, // Only fetch when nodeId is provided
    staleTime: 30_000,
    ...queryOptions,
  });
}

// =============================================================================
// Parent Node Hook
// =============================================================================

/**
 * Fetch the parent node for a given node (Task → Sprint, Sprint → Epic)
 */
export function useParentNode(
  node: GraphNode | null,
  options: { graphId?: string } = {},
  queryOptions?: Omit<UseQueryOptions<GraphNode | null>, 'queryKey' | 'queryFn'>
) {
  // Check if node has a parent before querying
  const hasParent = node ? !!getParentInfo(node) : false;

  return useQuery({
    queryKey: graphQueryKeys.parent(node?.id || '', options.graphId),
    queryFn: () => (node ? getParentNode(node, options) : null),
    enabled: !!node && hasParent, // Only fetch when node exists and has a parent
    staleTime: 60_000, // Parent relationships don't change often
    ...queryOptions,
  });
}

// =============================================================================
// Status Hook
// =============================================================================

/**
 * Fetch graph status and statistics
 */
export function useGraphStatus(
  graphId?: string,
  queryOptions?: Omit<UseQueryOptions<GraphStatusResponse>, 'queryKey' | 'queryFn'>
) {
  return useQuery({
    queryKey: graphQueryKeys.status(graphId),
    queryFn: ({ signal }) => getGraphStatus({ graphId, signal }),
    staleTime: 60_000, // Status is less volatile
    ...queryOptions,
  });
}

// =============================================================================
// Tree Hook
// =============================================================================

/**
 * Build and fetch tree hierarchy for explorer view
 */
export function useGraphTree(
  graphId?: string,
  queryOptions?: Omit<UseQueryOptions<TreeNode | null>, 'queryKey' | 'queryFn'>
) {
  return useQuery({
    queryKey: graphQueryKeys.tree(graphId),
    queryFn: ({ signal }) => buildTreeHierarchy({ graphId, signal }),
    staleTime: 60_000, // Tree changes less frequently
    ...queryOptions,
  });
}

// =============================================================================
// Prefetch Helpers
// =============================================================================

/**
 * Prefetch node adjacencies (for hover states)
 */
export function usePrefetchAdjacencies() {
  const queryClient = useQueryClient();

  return (nodeId: string, graphId?: string) => {
    queryClient.prefetchQuery({
      queryKey: graphQueryKeys.adjacencies(nodeId, graphId),
      queryFn: () => getAdjacencies({ nodeId, graphId }),
      staleTime: 30_000,
    });
  };
}

/**
 * Prefetch nodes by label (for navigation)
 */
export function usePrefetchNodesByLabel() {
  const queryClient = useQueryClient();

  return (label: NodeLabel, options?: Omit<ListNodesOptions, 'labels'>) => {
    queryClient.prefetchQuery({
      queryKey: graphQueryKeys.nodesByLabel(label, options),
      queryFn: () => getNodesByLabel(label, options || {}),
      staleTime: 30_000,
    });
  };
}

// =============================================================================
// Invalidation Helpers
// =============================================================================

/**
 * Invalidate all graph queries (after mutations)
 */
export function useInvalidateGraph() {
  const queryClient = useQueryClient();

  return async () => {
    await queryClient.invalidateQueries({ queryKey: graphQueryKeys.all });
  };
}

/**
 * Invalidate specific node's data
 */
export function useInvalidateNode() {
  const queryClient = useQueryClient();

  return (nodeId: string) => {
    queryClient.invalidateQueries({
      queryKey: graphQueryKeys.adjacencies(nodeId),
    });
    // Also invalidate node lists that might contain this node
    queryClient.invalidateQueries({
      queryKey: ['graph', 'nodes'],
    });
  };
}
