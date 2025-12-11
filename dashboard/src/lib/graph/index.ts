/**
 * @fileType: utility
 * @status: current
 * @updated: 2025-12-11
 * @tags: [graph, exports, barrel]
 * @related: [types.ts, api-client.ts, hooks.ts]
 * @priority: high
 * @complexity: low
 * @dependencies: []
 */

// Types
export type {
  NodeLabel,
  BaseNodeProperties,
  ProjectNode,
  CharterNode,
  EpicNode,
  SprintNode,
  TaskNode,
  ADRNode,
  PRDNode,
  PatternNode,
  GotchaNode,
  EventNode,
  NodeProperties,
  GraphNode,
  RelationshipType,
  GraphRelationship,
  ListNodesResponse,
  QueryResponse,
  GraphStatusResponse,
  AdjacentNode,
  AdjacenciesResponse,
  TreeNode,
  TreeRoot,
  NodeFilters,
  ViewMode,
  SelectionState,
} from './types';

// API Client
export {
  listNodes,
  getNodesByLabel,
  searchNodes,
  getAdjacencies,
  getGraphStatus,
  buildTreeHierarchy,
  setDefaultGraphId,
  getDefaultGraphId,
  graphApi,
} from './api-client';

export type {
  ListNodesOptions,
  SearchOptions,
  GetAdjacenciesOptions,
} from './api-client';

// Hooks
export {
  graphQueryKeys,
  useGraphNodes,
  useNodesByLabel,
  useGraphSearch,
  useNodeAdjacencies,
  useGraphStatus,
  useGraphTree,
  usePrefetchAdjacencies,
  usePrefetchNodesByLabel,
  useInvalidateGraph,
  useInvalidateNode,
} from './hooks';
