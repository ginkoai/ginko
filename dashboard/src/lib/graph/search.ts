/**
 * @fileType: utility
 * @status: current
 * @updated: 2026-01-16
 * @tags: [graph, search, fuzzy, filtering, operators]
 * @related: [types.ts, hooks.ts, SearchPanel.tsx]
 * @priority: high
 * @complexity: medium
 * @dependencies: [fuse.js]
 */

import Fuse, { type IFuseOptions } from 'fuse.js';
import type { GraphNode, NodeLabel } from './types';

// =============================================================================
// Types
// =============================================================================

/** Parsed search query with extracted operators */
export interface ParsedSearchQuery {
  /** Plain text search after removing operators */
  text: string;
  /** Extracted filter values from operators */
  filters: {
    labels?: NodeLabel[];
    status?: string[];
    author?: string;
  };
}

/** Search result with score and highlights */
export interface SearchResult {
  node: GraphNode;
  /** Relevance score (0-1, lower is better match) */
  score: number;
  /** Matched field paths */
  matches?: Array<{
    key: string;
    indices: Array<[number, number]>;
    value: string;
  }>;
}

/** Highlight segment for rendering */
export interface HighlightSegment {
  text: string;
  isMatch: boolean;
}

// =============================================================================
// Search Operator Parsing
// =============================================================================

/** Map of operator aliases to normalized filter keys */
const OPERATOR_ALIASES: Record<string, keyof ParsedSearchQuery['filters']> = {
  type: 'labels',
  label: 'labels',
  status: 'status',
  state: 'status',
  author: 'author',
  assignee: 'author',
  by: 'author',
};

/** Valid node label values (lowercase for matching) */
const VALID_LABELS: Record<string, NodeLabel> = {
  project: 'Project',
  charter: 'Charter',
  epic: 'Epic',
  sprint: 'Sprint',
  task: 'Task',
  adr: 'ADR',
  prd: 'PRD',
  pattern: 'Pattern',
  gotcha: 'Gotcha',
  principle: 'Principle',
  event: 'Event',
  session: 'Session',
  commit: 'Commit',
};

/**
 * Parse search query and extract operators.
 *
 * Supports operators:
 * - `type:ADR` or `label:ADR` - Filter by node type
 * - `status:accepted` or `state:accepted` - Filter by status
 * - `author:chris` or `assignee:chris` or `by:chris` - Filter by author
 * - `"exact phrase"` - Exact phrase match (kept in text)
 *
 * Multiple operators can be combined: `type:ADR status:proposed foo`
 *
 * @example
 * parseSearchQuery("type:ADR status:accepted auth")
 * // { text: "auth", filters: { labels: ['ADR'], status: ['accepted'] } }
 */
export function parseSearchQuery(query: string): ParsedSearchQuery {
  const result: ParsedSearchQuery = {
    text: '',
    filters: {},
  };

  if (!query?.trim()) {
    return result;
  }

  // Regular expression to match operators: key:value or key:"value with spaces"
  const operatorRegex = /(\w+):(?:"([^"]+)"|(\S+))/g;

  // Extract operators
  let processedQuery = query;
  let match: RegExpExecArray | null;

  while ((match = operatorRegex.exec(query)) !== null) {
    const [fullMatch, operator, quotedValue, unquotedValue] = match;
    const value = quotedValue || unquotedValue;
    const normalizedOp = operator.toLowerCase();

    const filterKey = OPERATOR_ALIASES[normalizedOp];
    if (filterKey && value) {
      if (filterKey === 'labels') {
        // Validate and normalize label
        const normalizedLabel = VALID_LABELS[value.toLowerCase()];
        if (normalizedLabel) {
          result.filters.labels = result.filters.labels || [];
          if (!result.filters.labels.includes(normalizedLabel)) {
            result.filters.labels.push(normalizedLabel);
          }
        }
      } else if (filterKey === 'status') {
        // Accept any status value
        result.filters.status = result.filters.status || [];
        const normalizedStatus = value.toLowerCase().replace(/-/g, '_');
        if (!result.filters.status.includes(normalizedStatus)) {
          result.filters.status.push(normalizedStatus);
        }
      } else if (filterKey === 'author') {
        result.filters.author = value.toLowerCase();
      }

      // Remove matched operator from query
      processedQuery = processedQuery.replace(fullMatch, '');
    }
  }

  // Clean up remaining text
  result.text = processedQuery.replace(/\s+/g, ' ').trim();

  return result;
}

// =============================================================================
// Fuzzy Search
// =============================================================================

/** Default fuse.js options for graph node search */
const DEFAULT_FUSE_OPTIONS: IFuseOptions<GraphNode> = {
  keys: [
    { name: 'properties.title', weight: 2 },
    { name: 'properties.name', weight: 2 },
    { name: 'properties.description', weight: 1 },
    { name: 'properties.summary', weight: 1 },
    { name: 'properties.content', weight: 0.5 },
    { name: 'properties.decision', weight: 0.8 },
    { name: 'properties.context', weight: 0.5 },
    { name: 'properties.adr_id', weight: 1.5 },
    { name: 'properties.epic_id', weight: 1.5 },
    { name: 'properties.sprint_id', weight: 1.5 },
    { name: 'properties.task_id', weight: 1.5 },
    { name: 'properties.pattern_id', weight: 1.5 },
    { name: 'properties.gotcha_id', weight: 1.5 },
    { name: 'properties.principle_id', weight: 1.5 },
  ],
  threshold: 0.4, // Lower = stricter matching
  includeScore: true,
  includeMatches: true,
  ignoreLocation: true, // Don't penalize matches at end of string
  minMatchCharLength: 2,
  shouldSort: true,
};

/**
 * Perform fuzzy search on nodes.
 *
 * @param nodes - Array of nodes to search
 * @param query - Search query string (plain text, not operators)
 * @param options - Optional fuse.js options override
 * @returns Array of search results sorted by relevance
 *
 * @example
 * const results = fuzzySearch(nodes, "authentication", ['title', 'description']);
 */
export function fuzzySearch(
  nodes: GraphNode[],
  query: string,
  options?: Partial<IFuseOptions<GraphNode>>
): SearchResult[] {
  if (!query?.trim() || !nodes?.length) {
    return nodes.map(node => ({ node, score: 1 }));
  }

  const fuse = new Fuse(nodes, { ...DEFAULT_FUSE_OPTIONS, ...options });
  const results = fuse.search(query);

  return results.map(result => ({
    node: result.item,
    score: result.score ?? 1,
    matches: result.matches?.map(match => ({
      key: match.key || '',
      indices: match.indices as Array<[number, number]>,
      value: match.value || '',
    })),
  }));
}

// =============================================================================
// Search Result Filtering
// =============================================================================

/** Get node property safely */
function getNodeProp(node: GraphNode, key: string): string | undefined {
  const props = node.properties as unknown as Record<string, unknown>;
  const value = props[key];
  return typeof value === 'string' ? value : undefined;
}

/**
 * Apply filters to nodes (status, author, labels).
 * Used after parsing search operators.
 */
export function applyFilters(
  nodes: GraphNode[],
  filters: ParsedSearchQuery['filters']
): GraphNode[] {
  return nodes.filter(node => {
    // Label filter
    if (filters.labels?.length) {
      if (!filters.labels.includes(node.label)) {
        return false;
      }
    }

    // Status filter
    if (filters.status?.length) {
      const nodeStatus = getNodeProp(node, 'status')?.toLowerCase().replace(/-/g, '_');
      if (!nodeStatus || !filters.status.includes(nodeStatus)) {
        return false;
      }
    }

    // Author filter
    if (filters.author) {
      const assignee = getNodeProp(node, 'assignee')?.toLowerCase();
      const createdBy = getNodeProp(node, 'created_by')?.toLowerCase();
      const author = filters.author.toLowerCase();

      if (!assignee?.includes(author) && !createdBy?.includes(author)) {
        return false;
      }
    }

    return true;
  });
}

/**
 * Full search pipeline: parse operators, filter, and fuzzy search.
 */
export function searchNodes(
  nodes: GraphNode[],
  query: string
): SearchResult[] {
  // Parse operators from query
  const parsed = parseSearchQuery(query);

  // Apply operator-based filters
  let filtered = applyFilters(nodes, parsed.filters);

  // If there's remaining text, perform fuzzy search
  if (parsed.text) {
    return fuzzySearch(filtered, parsed.text);
  }

  // No text search, return filtered nodes with default scores
  return filtered.map(node => ({ node, score: 0 }));
}

// =============================================================================
// Highlight Helpers
// =============================================================================

/**
 * Highlight matching text segments for rendering.
 *
 * @param text - Original text to highlight
 * @param query - Search query
 * @returns Array of segments with match flags
 *
 * @example
 * highlightMatches("Authentication flow", "auth")
 * // [{ text: "Auth", isMatch: true }, { text: "entication flow", isMatch: false }]
 */
export function highlightMatches(text: string, query: string): HighlightSegment[] {
  if (!text || !query?.trim()) {
    return [{ text: text || '', isMatch: false }];
  }

  const segments: HighlightSegment[] = [];
  const lowerText = text.toLowerCase();
  const lowerQuery = query.toLowerCase().trim();

  // Split query into words for multi-word highlighting
  const queryWords = lowerQuery.split(/\s+/).filter(w => w.length >= 2);

  if (queryWords.length === 0) {
    return [{ text, isMatch: false }];
  }

  // Find all match positions
  const matches: Array<{ start: number; end: number }> = [];

  for (const word of queryWords) {
    let pos = 0;
    while ((pos = lowerText.indexOf(word, pos)) !== -1) {
      matches.push({ start: pos, end: pos + word.length });
      pos += 1;
    }
  }

  // Sort and merge overlapping matches
  matches.sort((a, b) => a.start - b.start);
  const merged: Array<{ start: number; end: number }> = [];

  for (const match of matches) {
    if (merged.length === 0 || match.start > merged[merged.length - 1].end) {
      merged.push({ ...match });
    } else {
      merged[merged.length - 1].end = Math.max(merged[merged.length - 1].end, match.end);
    }
  }

  // Build segments
  let lastEnd = 0;
  for (const match of merged) {
    if (match.start > lastEnd) {
      segments.push({ text: text.slice(lastEnd, match.start), isMatch: false });
    }
    segments.push({ text: text.slice(match.start, match.end), isMatch: true });
    lastEnd = match.end;
  }

  if (lastEnd < text.length) {
    segments.push({ text: text.slice(lastEnd), isMatch: false });
  }

  return segments.length ? segments : [{ text, isMatch: false }];
}

/**
 * Highlight matches using fuse.js match indices.
 * More accurate than string-based highlighting for fuzzy matches.
 */
export function highlightFuseMatches(
  text: string,
  indices: Array<[number, number]>
): HighlightSegment[] {
  if (!text || !indices?.length) {
    return [{ text: text || '', isMatch: false }];
  }

  const segments: HighlightSegment[] = [];
  let lastEnd = 0;

  // Sort indices by start position
  const sorted = [...indices].sort((a, b) => a[0] - b[0]);

  for (const [start, end] of sorted) {
    if (start > lastEnd) {
      segments.push({ text: text.slice(lastEnd, start), isMatch: false });
    }
    // Fuse indices are inclusive, so add 1 to end
    segments.push({ text: text.slice(start, end + 1), isMatch: true });
    lastEnd = end + 1;
  }

  if (lastEnd < text.length) {
    segments.push({ text: text.slice(lastEnd), isMatch: false });
  }

  return segments.length ? segments : [{ text, isMatch: false }];
}

// =============================================================================
// Search Suggestions
// =============================================================================

/** Common status values for autocomplete */
export const COMMON_STATUSES = [
  // ADR statuses
  'proposed',
  'accepted',
  'deprecated',
  'superseded',
  // Task statuses
  'todo',
  'in_progress',
  'paused',
  'complete',
  // Sprint/Epic statuses
  'planning',
  'active',
  'on-hold',
] as const;

/** Search operator help text */
export const OPERATOR_HELP = [
  { operator: 'type:', example: 'type:ADR', description: 'Filter by node type' },
  { operator: 'status:', example: 'status:accepted', description: 'Filter by status' },
  { operator: 'author:', example: 'author:chris', description: 'Filter by author/assignee' },
] as const;

/**
 * Get search suggestions based on current input.
 */
export function getSearchSuggestions(
  input: string,
  nodes: GraphNode[]
): string[] {
  const suggestions: string[] = [];
  const trimmed = input.trim().toLowerCase();

  // If input ends with ':', suggest operator values
  if (trimmed.endsWith('type:') || trimmed.endsWith('label:')) {
    return Object.keys(VALID_LABELS).map(l => `${trimmed}${l}`);
  }

  if (trimmed.endsWith('status:') || trimmed.endsWith('state:')) {
    return COMMON_STATUSES.map(s => `${trimmed}${s}`);
  }

  // If typing an operator, suggest completions
  if (trimmed.includes(':')) {
    const [op, value] = trimmed.split(':');
    const normalizedOp = OPERATOR_ALIASES[op];

    if (normalizedOp === 'labels' && value) {
      const matching = Object.keys(VALID_LABELS)
        .filter(l => l.startsWith(value))
        .map(l => `${op}:${l}`);
      return matching.slice(0, 5);
    }

    if (normalizedOp === 'status' && value) {
      const matching = COMMON_STATUSES
        .filter(s => s.startsWith(value))
        .map(s => `${op}:${s}`);
      return matching.slice(0, 5);
    }
  }

  // Suggest operator prefixes
  if (!trimmed || trimmed.length < 2) {
    return ['type:', 'status:', 'author:'];
  }

  return suggestions;
}

// =============================================================================
// Exports
// =============================================================================

export {
  VALID_LABELS,
  OPERATOR_ALIASES,
};
