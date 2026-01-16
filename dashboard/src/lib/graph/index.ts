/**
 * @fileType: utility
 * @status: current
 * @updated: 2026-01-16
 * @tags: [graph, exports, barrel]
 * @related: [types.ts, api-client.ts, hooks.ts, search.ts]
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
  ViewPreset,
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

// Presets
export {
  BUILTIN_PRESETS,
  getAllPresets,
  getCustomPresets,
  saveCustomPresets,
  getLastUsedPresetId,
  saveLastUsedPresetId,
  getPresetById,
  createCustomPreset,
  updateCustomPreset,
  deleteCustomPreset,
  areFiltersEqual,
  findMatchingPreset,
  hasUnsavedChanges,
} from './presets';

// Search Utilities
export {
  parseSearchQuery,
  fuzzySearch,
  applyFilters,
  searchNodes as localSearchNodes,
  highlightMatches,
  highlightFuseMatches,
  getSearchSuggestions,
  VALID_LABELS,
  OPERATOR_ALIASES,
  OPERATOR_HELP,
  COMMON_STATUSES,
} from './search';

export type {
  ParsedSearchQuery,
  SearchResult,
  HighlightSegment,
} from './search';
