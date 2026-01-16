/**
 * @fileType: component
 * @status: current
 * @updated: 2026-01-16
 * @tags: [graph, search, fuzzy, filtering, panel]
 * @related: [filter-bar.tsx, card-grid.tsx, search.ts]
 * @priority: high
 * @complexity: medium
 * @dependencies: [lucide-react, fuse.js]
 */

'use client';

import { useState, useCallback, useEffect, useMemo, useRef, memo } from 'react';
import {
  Search,
  X,
  HelpCircle,
  Clock,
  FileText,
  Target,
  Zap,
  AlertTriangle,
  CheckSquare,
  Calendar,
  Lightbulb,
  type LucideIcon,
} from 'lucide-react';
import type { GraphNode, NodeLabel, NodeFilters } from '@/lib/graph/types';
import {
  parseSearchQuery,
  searchNodes,
  highlightMatches,
  OPERATOR_HELP,
  VALID_LABELS,
  COMMON_STATUSES,
  type SearchResult,
  type HighlightSegment,
} from '@/lib/graph/search';
import { cn } from '@/lib/utils';

// =============================================================================
// Types
// =============================================================================

export interface SearchPanelProps {
  nodes: GraphNode[];
  filters: NodeFilters;
  onFiltersChange: (filters: NodeFilters) => void;
  onSelectNode?: (nodeId: string) => void;
  onViewDetails?: (nodeId: string) => void;
  className?: string;
  /** Whether to show the expanded results panel */
  showResults?: boolean;
  /** Max results to show in dropdown */
  maxResults?: number;
  /** Placeholder text */
  placeholder?: string;
}

// =============================================================================
// Constants
// =============================================================================

const DEBOUNCE_MS = 300;
const MAX_RECENT_SEARCHES = 5;
const RECENT_SEARCHES_KEY = 'ginko-graph-recent-searches';

const nodeIcons: Partial<Record<NodeLabel, LucideIcon>> = {
  Epic: Target,
  Sprint: Calendar,
  Task: CheckSquare,
  ADR: FileText,
  Pattern: Zap,
  Gotcha: AlertTriangle,
  Principle: Lightbulb,
};

const nodeColors: Partial<Record<NodeLabel, string>> = {
  Epic: 'text-purple-400',
  Sprint: 'text-cyan-400',
  Task: 'text-ginko-400',
  ADR: 'text-amber-400',
  Pattern: 'text-emerald-400',
  Gotcha: 'text-red-400',
  Principle: 'text-indigo-400',
};

// =============================================================================
// Helpers
// =============================================================================

function getNodeProp(node: GraphNode, key: string): string | undefined {
  const props = node.properties as Record<string, unknown>;
  const value = props[key];
  return typeof value === 'string' ? value : undefined;
}

function getNodeTitle(node: GraphNode): string {
  return (
    getNodeProp(node, 'title') ||
    getNodeProp(node, 'name') ||
    getNodeProp(node, 'adr_id') ||
    getNodeProp(node, 'epic_id') ||
    getNodeProp(node, 'sprint_id') ||
    getNodeProp(node, 'task_id') ||
    getNodeProp(node, 'pattern_id') ||
    getNodeProp(node, 'gotcha_id') ||
    node.id
  );
}

function getNodeDescription(node: GraphNode): string | undefined {
  return (
    getNodeProp(node, 'description') ||
    getNodeProp(node, 'summary') ||
    getNodeProp(node, 'decision')
  );
}

// =============================================================================
// Highlighted Text Component
// =============================================================================

function HighlightedText({
  segments,
  className,
}: {
  segments: HighlightSegment[];
  className?: string;
}) {
  return (
    <span className={className}>
      {segments.map((segment, i) =>
        segment.isMatch ? (
          <mark
            key={i}
            className="bg-ginko-500/30 text-ginko-300 rounded px-0.5"
          >
            {segment.text}
          </mark>
        ) : (
          <span key={i}>{segment.text}</span>
        )
      )}
    </span>
  );
}

// =============================================================================
// Search Result Item
// =============================================================================

interface SearchResultItemProps {
  result: SearchResult;
  query: string;
  isSelected: boolean;
  onSelect: (nodeId: string) => void;
  onViewDetails?: (nodeId: string) => void;
}

function SearchResultItem({
  result,
  query,
  isSelected,
  onSelect,
  onViewDetails,
}: SearchResultItemProps) {
  const { node, score } = result;
  const Icon = nodeIcons[node.label] || FileText;
  const color = nodeColors[node.label] || 'text-muted-foreground';

  const title = getNodeTitle(node);
  const description = getNodeDescription(node);
  const status = getNodeProp(node, 'status');

  // Parse query to get plain text for highlighting
  const { text: searchText } = parseSearchQuery(query);
  const titleSegments = highlightMatches(title, searchText);
  const descSegments = description ? highlightMatches(description, searchText) : [];

  // Score indicator (1 = 100% match, 0 = no match)
  const relevance = Math.round((1 - score) * 100);

  const handleClick = () => {
    onSelect(node.id);
  };

  const handleDoubleClick = () => {
    onViewDetails?.(node.id);
  };

  return (
    <div
      role="option"
      aria-selected={isSelected}
      onClick={handleClick}
      onDoubleClick={handleDoubleClick}
      className={cn(
        'flex items-start gap-3 px-3 py-2 cursor-pointer transition-colors',
        isSelected
          ? 'bg-ginko-500/10 border-l-2 border-ginko-500'
          : 'hover:bg-white/5 border-l-2 border-transparent'
      )}
    >
      {/* Icon */}
      <div className="p-1.5 rounded bg-card">
        <Icon className={cn('w-4 h-4', color)} />
      </div>

      {/* Content */}
      <div className="flex-1 min-w-0">
        {/* Label and Status */}
        <div className="flex items-center gap-2 mb-0.5">
          <span className={cn('text-[10px] font-mono uppercase', color)}>
            {node.label}
          </span>
          {status && (
            <span className="text-[10px] px-1.5 py-0.5 rounded bg-slate-500/20 text-slate-400 font-mono">
              {status.replace('_', ' ')}
            </span>
          )}
        </div>

        {/* Title */}
        <h4 className="text-sm font-mono font-medium text-foreground truncate">
          <HighlightedText segments={titleSegments} />
        </h4>

        {/* Description */}
        {descSegments.length > 0 && (
          <p className="text-xs text-muted-foreground line-clamp-1 mt-0.5">
            <HighlightedText segments={descSegments} />
          </p>
        )}
      </div>

      {/* Relevance Score */}
      <div className="flex items-center gap-1 text-[10px] text-muted-foreground font-mono">
        <span>{relevance}%</span>
      </div>
    </div>
  );
}

// =============================================================================
// Operator Help Panel
// =============================================================================

function OperatorHelpPanel({ onClose }: { onClose: () => void }) {
  return (
    <div className="absolute top-full left-0 right-0 mt-1 z-50 bg-card border border-border rounded-lg shadow-lg p-3">
      <div className="flex items-center justify-between mb-2">
        <h3 className="text-sm font-mono font-medium text-foreground">
          Search Operators
        </h3>
        <button
          onClick={onClose}
          className="p-1 hover:bg-white/5 rounded"
          aria-label="Close help"
        >
          <X className="w-3 h-3 text-muted-foreground" />
        </button>
      </div>

      <div className="space-y-2">
        {OPERATOR_HELP.map(({ operator, example, description }) => (
          <div key={operator} className="flex items-start gap-2 text-xs">
            <code className="px-1.5 py-0.5 bg-ginko-500/10 text-ginko-400 rounded font-mono">
              {example}
            </code>
            <span className="text-muted-foreground">{description}</span>
          </div>
        ))}
      </div>

      <div className="mt-3 pt-2 border-t border-border">
        <p className="text-[10px] text-muted-foreground">
          Combine operators: <code className="text-ginko-400">type:ADR status:accepted auth</code>
        </p>
      </div>
    </div>
  );
}

// =============================================================================
// Recent Searches
// =============================================================================

function useRecentSearches() {
  const [searches, setSearches] = useState<string[]>([]);

  // Load from localStorage on mount
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const stored = localStorage.getItem(RECENT_SEARCHES_KEY);
      if (stored) {
        try {
          setSearches(JSON.parse(stored));
        } catch {
          // Ignore parse errors
        }
      }
    }
  }, []);

  const addSearch = useCallback((query: string) => {
    if (!query?.trim()) return;

    setSearches((prev) => {
      const filtered = prev.filter((s) => s !== query);
      const updated = [query, ...filtered].slice(0, MAX_RECENT_SEARCHES);

      if (typeof window !== 'undefined') {
        localStorage.setItem(RECENT_SEARCHES_KEY, JSON.stringify(updated));
      }

      return updated;
    });
  }, []);

  const clearSearches = useCallback(() => {
    setSearches([]);
    if (typeof window !== 'undefined') {
      localStorage.removeItem(RECENT_SEARCHES_KEY);
    }
  }, []);

  return { searches, addSearch, clearSearches };
}

// =============================================================================
// Main Component
// =============================================================================

function SearchPanelComponent({
  nodes,
  filters,
  onFiltersChange,
  onSelectNode,
  onViewDetails,
  className,
  showResults = true,
  maxResults = 10,
  placeholder = 'Search nodes... (type: status: author:)',
}: SearchPanelProps) {
  const [inputValue, setInputValue] = useState(filters.search || '');
  const [isFocused, setIsFocused] = useState(false);
  const [showHelp, setShowHelp] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState(-1);
  const inputRef = useRef<HTMLInputElement>(null);
  const resultsRef = useRef<HTMLDivElement>(null);

  const { searches, addSearch, clearSearches } = useRecentSearches();

  // Debounced search
  useEffect(() => {
    const timer = setTimeout(() => {
      if (inputValue !== filters.search) {
        // Parse operators and update filters
        const parsed = parseSearchQuery(inputValue);
        onFiltersChange({
          ...filters,
          search: inputValue || undefined,
          labels: parsed.filters.labels?.length
            ? [...(filters.labels || []), ...parsed.filters.labels.filter(
                (l) => !filters.labels?.includes(l)
              )]
            : filters.labels,
          status: parsed.filters.status?.length
            ? parsed.filters.status
            : filters.status,
          author: parsed.filters.author || filters.author,
        });
      }
    }, DEBOUNCE_MS);

    return () => clearTimeout(timer);
  }, [inputValue, filters, onFiltersChange]);

  // Search results
  const results = useMemo(() => {
    if (!inputValue?.trim() || !showResults) return [];
    return searchNodes(nodes, inputValue).slice(0, maxResults);
  }, [nodes, inputValue, showResults, maxResults]);

  // Show results panel
  const showResultsPanel = isFocused && inputValue.trim().length > 0 && showResults;
  const showRecentSearches = isFocused && inputValue.trim().length === 0 && searches.length > 0;

  // Detect colon for help
  useEffect(() => {
    if (inputValue.endsWith(':') && !showHelp) {
      setShowHelp(true);
    }
  }, [inputValue, showHelp]);

  // Handle input change
  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setInputValue(e.target.value);
    setSelectedIndex(-1);
  };

  // Handle clear
  const handleClear = () => {
    setInputValue('');
    onFiltersChange({ ...filters, search: undefined, status: undefined, author: undefined });
    inputRef.current?.focus();
  };

  // Handle submit
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (inputValue.trim()) {
      addSearch(inputValue.trim());
    }
    if (selectedIndex >= 0 && results[selectedIndex]) {
      onSelectNode?.(results[selectedIndex].node.id);
    }
  };

  // Handle recent search click
  const handleRecentClick = (search: string) => {
    setInputValue(search);
  };

  // Keyboard navigation
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (!showResultsPanel) return;

    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault();
        setSelectedIndex((prev) => Math.min(prev + 1, results.length - 1));
        break;
      case 'ArrowUp':
        e.preventDefault();
        setSelectedIndex((prev) => Math.max(prev - 1, -1));
        break;
      case 'Enter':
        if (selectedIndex >= 0 && results[selectedIndex]) {
          e.preventDefault();
          onSelectNode?.(results[selectedIndex].node.id);
          addSearch(inputValue.trim());
        }
        break;
      case 'Escape':
        inputRef.current?.blur();
        setShowHelp(false);
        break;
    }
  };

  // Scroll selected into view
  useEffect(() => {
    if (selectedIndex >= 0 && resultsRef.current) {
      const selected = resultsRef.current.querySelector('[aria-selected="true"]');
      selected?.scrollIntoView({ block: 'nearest' });
    }
  }, [selectedIndex]);

  return (
    <div className={cn('relative', className)}>
      {/* Search Input */}
      <form onSubmit={handleSubmit}>
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <input
            ref={inputRef}
            type="text"
            value={inputValue}
            onChange={handleChange}
            onFocus={() => setIsFocused(true)}
            onBlur={() => setTimeout(() => setIsFocused(false), 200)}
            onKeyDown={handleKeyDown}
            placeholder={placeholder}
            className={cn(
              'w-full pl-9 pr-16 py-2 text-sm font-mono',
              'bg-background border border-border rounded-lg',
              'placeholder:text-muted-foreground',
              'focus:outline-none focus:ring-1 focus:ring-ginko-500/50'
            )}
            aria-label="Search nodes"
            aria-expanded={showResultsPanel}
            aria-controls={showResultsPanel ? 'search-results' : undefined}
            aria-activedescendant={
              selectedIndex >= 0 ? `search-result-${selectedIndex}` : undefined
            }
            role="combobox"
            autoComplete="off"
          />

          {/* Action Buttons */}
          <div className="absolute right-2 top-1/2 -translate-y-1/2 flex items-center gap-1">
            {/* Help Button */}
            <button
              type="button"
              onClick={() => setShowHelp(!showHelp)}
              className={cn(
                'p-1 rounded hover:bg-white/5 transition-colors',
                showHelp && 'text-ginko-400'
              )}
              aria-label="Show search operators help"
            >
              <HelpCircle className="w-4 h-4 text-muted-foreground" />
            </button>

            {/* Clear Button */}
            {inputValue && (
              <button
                type="button"
                onClick={handleClear}
                className="p-1 rounded hover:bg-white/5 transition-colors"
                aria-label="Clear search"
              >
                <X className="w-4 h-4 text-muted-foreground" />
              </button>
            )}
          </div>
        </div>
      </form>

      {/* Help Panel */}
      {showHelp && (
        <OperatorHelpPanel onClose={() => setShowHelp(false)} />
      )}

      {/* Recent Searches */}
      {showRecentSearches && !showHelp && (
        <div className="absolute top-full left-0 right-0 mt-1 z-50 bg-card border border-border rounded-lg shadow-lg overflow-hidden">
          <div className="flex items-center justify-between px-3 py-2 border-b border-border">
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <Clock className="w-3 h-3" />
              <span>Recent searches</span>
            </div>
            <button
              onClick={clearSearches}
              className="text-[10px] text-muted-foreground hover:text-foreground"
            >
              Clear
            </button>
          </div>
          <div className="py-1">
            {searches.map((search, i) => (
              <button
                key={i}
                onClick={() => handleRecentClick(search)}
                className="w-full px-3 py-1.5 text-left text-sm font-mono text-foreground hover:bg-white/5"
              >
                {search}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Results Panel */}
      {showResultsPanel && !showHelp && (
        <div
          id="search-results"
          ref={resultsRef}
          role="listbox"
          className="absolute top-full left-0 right-0 mt-1 z-50 bg-card border border-border rounded-lg shadow-lg overflow-hidden"
        >
          {results.length > 0 ? (
            <>
              <div className="max-h-80 overflow-y-auto">
                {results.map((result, index) => (
                  <div key={result.node.id} id={`search-result-${index}`}>
                    <SearchResultItem
                      result={result}
                      query={inputValue}
                      isSelected={index === selectedIndex}
                      onSelect={(id) => {
                        onSelectNode?.(id);
                        addSearch(inputValue.trim());
                      }}
                      onViewDetails={onViewDetails}
                    />
                  </div>
                ))}
              </div>
              <div className="px-3 py-1.5 border-t border-border bg-card/50">
                <p className="text-[10px] text-muted-foreground">
                  {results.length} result{results.length !== 1 ? 's' : ''} found
                  {results.length >= maxResults && ' (showing first ' + maxResults + ')'}
                </p>
              </div>
            </>
          ) : (
            <div className="px-4 py-8 text-center">
              <Search className="w-8 h-8 text-muted-foreground/50 mx-auto mb-2" />
              <p className="text-sm text-muted-foreground">No results found</p>
              <p className="text-xs text-muted-foreground/70 mt-1">
                Try different keywords or use operators like <code className="text-ginko-400">type:ADR</code>
              </p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// =============================================================================
// Export
// =============================================================================

export const SearchPanel = memo(SearchPanelComponent);
export default SearchPanel;
