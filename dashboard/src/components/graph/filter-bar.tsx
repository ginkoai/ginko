/**
 * @fileType: component
 * @status: current
 * @updated: 2026-01-16
 * @tags: [graph, filter, search, toolbar, status, author]
 * @related: [card-grid.tsx, types.ts, search.ts, SearchPanel.tsx]
 * @priority: high
 * @complexity: medium
 * @dependencies: [lucide-react]
 */

'use client';

import { useState, useCallback, useEffect, useRef, memo } from 'react';
import {
  Search,
  LayoutGrid,
  List,
  SortAsc,
  SortDesc,
  X,
  Filter,
  HelpCircle,
  ChevronDown,
  User,
} from 'lucide-react';
import type { NodeLabel, NodeFilters } from '@/lib/graph/types';
import { OPERATOR_HELP, COMMON_STATUSES, parseSearchQuery } from '@/lib/graph/search';
import { cn } from '@/lib/utils';

// =============================================================================
// Types
// =============================================================================

export interface FilterBarProps {
  filters: NodeFilters;
  onFiltersChange: (filters: NodeFilters) => void;
  viewMode: 'grid' | 'list';
  onViewModeChange: (mode: 'grid' | 'list') => void;
  totalCount?: number;
  filteredCount?: number;
}

// =============================================================================
// Constants
// =============================================================================

const NODE_LABELS: { label: NodeLabel; name: string; color: string }[] = [
  { label: 'Epic', name: 'Epics', color: 'bg-purple-500/20 text-purple-400 border-purple-500/30' },
  { label: 'Sprint', name: 'Sprints', color: 'bg-cyan-500/20 text-cyan-400 border-cyan-500/30' },
  { label: 'Task', name: 'Tasks', color: 'bg-ginko-500/20 text-ginko-400 border-ginko-500/30' },
  { label: 'ADR', name: 'ADRs', color: 'bg-amber-500/20 text-amber-400 border-amber-500/30' },
  { label: 'Pattern', name: 'Patterns', color: 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30' },
  { label: 'Gotcha', name: 'Gotchas', color: 'bg-red-500/20 text-red-400 border-red-500/30' },
  { label: 'Event', name: 'Events', color: 'bg-slate-500/20 text-slate-400 border-slate-500/30' },
];

const SORT_OPTIONS = [
  { value: 'created_at', label: 'Date created' },
  { value: 'updated_at', label: 'Date updated' },
  { value: 'name', label: 'Name' },
] as const;

/** Status filter options with colors */
const STATUS_OPTIONS: { value: string; label: string; color: string }[] = [
  // ADR statuses
  { value: 'proposed', label: 'Proposed', color: 'bg-blue-500/20 text-blue-400 border-blue-500/30' },
  { value: 'accepted', label: 'Accepted', color: 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30' },
  { value: 'deprecated', label: 'Deprecated', color: 'bg-red-500/20 text-red-400 border-red-500/30' },
  { value: 'superseded', label: 'Superseded', color: 'bg-orange-500/20 text-orange-400 border-orange-500/30' },
  // Task statuses
  { value: 'todo', label: 'Todo', color: 'bg-slate-500/20 text-slate-400 border-slate-500/30' },
  { value: 'in_progress', label: 'In Progress', color: 'bg-ginko-500/20 text-ginko-400 border-ginko-500/30' },
  { value: 'paused', label: 'Paused', color: 'bg-amber-500/20 text-amber-400 border-amber-500/30' },
  { value: 'complete', label: 'Complete', color: 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30' },
  // Sprint/Epic statuses
  { value: 'planning', label: 'Planning', color: 'bg-blue-500/20 text-blue-400 border-blue-500/30' },
  { value: 'active', label: 'Active', color: 'bg-ginko-500/20 text-ginko-400 border-ginko-500/30' },
  { value: 'on_hold', label: 'On Hold', color: 'bg-amber-500/20 text-amber-400 border-amber-500/30' },
];

// =============================================================================
// Component
// =============================================================================

export function FilterBar({
  filters,
  onFiltersChange,
  viewMode,
  onViewModeChange,
  totalCount,
  filteredCount,
}: FilterBarProps) {
  // Local search state for debouncing
  const [searchInput, setSearchInput] = useState(filters.search || '');
  const [showFilters, setShowFilters] = useState(false);
  const [showHelp, setShowHelp] = useState(false);
  const [showStatusDropdown, setShowStatusDropdown] = useState(false);
  const [authorInput, setAuthorInput] = useState(filters.author || '');
  const statusDropdownRef = useRef<HTMLDivElement>(null);
  const helpRef = useRef<HTMLDivElement>(null);

  // Close dropdowns when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (statusDropdownRef.current && !statusDropdownRef.current.contains(event.target as Node)) {
        setShowStatusDropdown(false);
      }
      if (helpRef.current && !helpRef.current.contains(event.target as Node)) {
        setShowHelp(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Show help when typing colon
  useEffect(() => {
    if (searchInput.endsWith(':') && !showHelp) {
      setShowHelp(true);
    }
  }, [searchInput, showHelp]);

  // Debounce search and parse operators
  useEffect(() => {
    const timer = setTimeout(() => {
      if (searchInput !== filters.search) {
        // Parse search operators from input
        const parsed = parseSearchQuery(searchInput);

        // Merge parsed operators with existing filters
        const newFilters: NodeFilters = {
          ...filters,
          search: searchInput || undefined,
        };

        // Apply type operator if found
        if (parsed.filters.labels?.length) {
          newFilters.labels = [...new Set([...(filters.labels || []), ...parsed.filters.labels])];
        }

        // Apply status operator if found
        if (parsed.filters.status?.length) {
          newFilters.status = parsed.filters.status;
        }

        // Apply author operator if found
        if (parsed.filters.author) {
          newFilters.author = parsed.filters.author;
          setAuthorInput(parsed.filters.author);
        }

        onFiltersChange(newFilters);
      }
    }, 300);
    return () => clearTimeout(timer);
  }, [searchInput, filters, onFiltersChange]);

  // Debounce author input
  useEffect(() => {
    const timer = setTimeout(() => {
      if (authorInput !== filters.author) {
        onFiltersChange({ ...filters, author: authorInput || undefined });
      }
    }, 300);
    return () => clearTimeout(timer);
  }, [authorInput, filters, onFiltersChange]);

  // Toggle label filter
  const handleLabelToggle = useCallback(
    (label: NodeLabel) => {
      const currentLabels = filters.labels || [];
      const newLabels = currentLabels.includes(label)
        ? currentLabels.filter((l) => l !== label)
        : [...currentLabels, label];
      onFiltersChange({
        ...filters,
        labels: newLabels.length > 0 ? newLabels : undefined,
      });
    },
    [filters, onFiltersChange]
  );

  // Toggle status filter
  const handleStatusToggle = useCallback(
    (status: string) => {
      const currentStatuses = filters.status || [];
      const newStatuses = currentStatuses.includes(status)
        ? currentStatuses.filter((s) => s !== status)
        : [...currentStatuses, status];
      onFiltersChange({
        ...filters,
        status: newStatuses.length > 0 ? newStatuses : undefined,
      });
    },
    [filters, onFiltersChange]
  );

  // Handle sort change
  const handleSortChange = useCallback(
    (sortBy: NodeFilters['sortBy']) => {
      onFiltersChange({
        ...filters,
        sortBy,
      });
    },
    [filters, onFiltersChange]
  );

  // Toggle sort order
  const handleSortOrderToggle = useCallback(() => {
    onFiltersChange({
      ...filters,
      sortOrder: filters.sortOrder === 'asc' ? 'desc' : 'asc',
    });
  }, [filters, onFiltersChange]);

  // Clear all filters
  const handleClearFilters = useCallback(() => {
    setSearchInput('');
    setAuthorInput('');
    onFiltersChange({});
  }, [onFiltersChange]);

  // Count active filters
  const activeFilterCount =
    (filters.labels?.length || 0) +
    (filters.status?.length || 0) +
    (filters.author ? 1 : 0) +
    (filters.search ? 1 : 0);

  const hasActiveFilters = activeFilterCount > 0;

  return (
    <div className="border-b border-border bg-card/50">
      {/* Main Bar */}
      <div className="flex items-center gap-3 p-3">
        {/* Search */}
        <div className="relative flex-1 max-w-md" ref={helpRef}>
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <input
            type="text"
            placeholder="Search nodes... (type: status: author:)"
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            className={cn(
              'w-full pl-9 pr-16 py-2 text-sm font-mono',
              'bg-background border border-border rounded-lg',
              'placeholder:text-muted-foreground',
              'focus:outline-none focus:ring-1 focus:ring-ginko-500/50'
            )}
          />
          <div className="absolute right-2 top-1/2 -translate-y-1/2 flex items-center gap-1">
            {/* Help Button */}
            <button
              onClick={() => setShowHelp(!showHelp)}
              className={cn(
                'p-1 rounded hover:bg-white/5 transition-colors',
                showHelp && 'text-ginko-400'
              )}
              aria-label="Show search operators help"
            >
              <HelpCircle className="w-3.5 h-3.5 text-muted-foreground" />
            </button>
            {/* Clear Button */}
            {searchInput && (
              <button
                onClick={() => setSearchInput('')}
                className="p-0.5 hover:bg-white/5 rounded"
              >
                <X className="w-3 h-3 text-muted-foreground" />
              </button>
            )}
          </div>

          {/* Operator Help Tooltip */}
          {showHelp && (
            <div className="absolute top-full left-0 right-0 mt-1 z-50 bg-card border border-border rounded-lg shadow-lg p-3">
              <div className="flex items-center justify-between mb-2">
                <h3 className="text-xs font-mono font-medium text-foreground">
                  Search Operators
                </h3>
                <button
                  onClick={() => setShowHelp(false)}
                  className="p-1 hover:bg-white/5 rounded"
                >
                  <X className="w-3 h-3 text-muted-foreground" />
                </button>
              </div>
              <div className="space-y-1.5">
                {OPERATOR_HELP.map(({ operator, example, description }) => (
                  <div key={operator} className="flex items-start gap-2 text-xs">
                    <code className="px-1.5 py-0.5 bg-ginko-500/10 text-ginko-400 rounded font-mono whitespace-nowrap">
                      {example}
                    </code>
                    <span className="text-muted-foreground">{description}</span>
                  </div>
                ))}
              </div>
              <div className="mt-2 pt-2 border-t border-border">
                <p className="text-[10px] text-muted-foreground">
                  Combine: <code className="text-ginko-400">type:ADR status:accepted auth</code>
                </p>
              </div>
            </div>
          )}
        </div>

        {/* Filter Toggle */}
        <button
          onClick={() => setShowFilters(!showFilters)}
          className={cn(
            'flex items-center gap-2 px-3 py-2 text-sm font-mono rounded-lg border',
            'transition-colors',
            showFilters || hasActiveFilters
              ? 'bg-ginko-500/10 border-ginko-500/30 text-ginko-400'
              : 'border-border hover:bg-white/5'
          )}
        >
          <Filter className="w-4 h-4" />
          <span>Filters</span>
          {activeFilterCount > 0 && (
            <span className="px-1.5 py-0.5 text-[10px] bg-ginko-500/20 rounded">
              {activeFilterCount}
            </span>
          )}
        </button>

        {/* Sort */}
        <div className="flex items-center gap-1">
          <select
            value={filters.sortBy || 'created_at'}
            onChange={(e) => handleSortChange(e.target.value as NodeFilters['sortBy'])}
            className={cn(
              'px-3 py-2 text-sm font-mono',
              'bg-background border border-border rounded-lg',
              'focus:outline-none focus:ring-1 focus:ring-ginko-500/50'
            )}
          >
            {SORT_OPTIONS.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
          <button
            onClick={handleSortOrderToggle}
            className="p-2 border border-border rounded-lg hover:bg-white/5 transition-colors"
            aria-label={`Sort ${filters.sortOrder === 'asc' ? 'descending' : 'ascending'}`}
          >
            {filters.sortOrder === 'asc' ? (
              <SortAsc className="w-4 h-4 text-muted-foreground" />
            ) : (
              <SortDesc className="w-4 h-4 text-muted-foreground" />
            )}
          </button>
        </div>

        {/* View Mode */}
        <div className="flex items-center border border-border rounded-lg overflow-hidden">
          <button
            onClick={() => onViewModeChange('grid')}
            className={cn(
              'p-2 transition-colors',
              viewMode === 'grid' ? 'bg-ginko-500/10 text-ginko-400' : 'hover:bg-white/5'
            )}
            aria-label="Grid view"
          >
            <LayoutGrid className="w-4 h-4" />
          </button>
          <button
            onClick={() => onViewModeChange('list')}
            className={cn(
              'p-2 transition-colors',
              viewMode === 'list' ? 'bg-ginko-500/10 text-ginko-400' : 'hover:bg-white/5'
            )}
            aria-label="List view"
          >
            <List className="w-4 h-4" />
          </button>
        </div>

        {/* Count */}
        {totalCount !== undefined && (
          <span className="text-xs text-muted-foreground font-mono">
            {filteredCount !== undefined && filteredCount !== totalCount
              ? `${filteredCount} of ${totalCount}`
              : totalCount}{' '}
            nodes
          </span>
        )}
      </div>

      {/* Expanded Filters */}
      {showFilters && (
        <div className="px-3 pb-3 space-y-2">
          {/* Type Filters Row */}
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-xs text-muted-foreground mr-1 w-12">Type:</span>
            {NODE_LABELS.map(({ label, name, color }) => {
              const isActive = filters.labels?.includes(label);
              return (
                <button
                  key={label}
                  onClick={() => handleLabelToggle(label)}
                  className={cn(
                    'px-2 py-1 text-xs font-mono rounded border transition-colors',
                    isActive ? color : 'border-border hover:bg-white/5'
                  )}
                >
                  {name}
                </button>
              );
            })}
          </div>

          {/* Status Filters Row */}
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-xs text-muted-foreground mr-1 w-12">Status:</span>
            <div className="relative" ref={statusDropdownRef}>
              <button
                onClick={() => setShowStatusDropdown(!showStatusDropdown)}
                className={cn(
                  'flex items-center gap-1.5 px-2 py-1 text-xs font-mono rounded border transition-colors',
                  filters.status?.length
                    ? 'bg-ginko-500/10 border-ginko-500/30 text-ginko-400'
                    : 'border-border hover:bg-white/5'
                )}
              >
                <span>{filters.status?.length ? `${filters.status.length} selected` : 'Any status'}</span>
                <ChevronDown className="w-3 h-3" />
              </button>

              {/* Status Dropdown */}
              {showStatusDropdown && (
                <div className="absolute top-full left-0 mt-1 z-50 bg-card border border-border rounded-lg shadow-lg p-2 min-w-[180px]">
                  <div className="max-h-64 overflow-y-auto space-y-0.5">
                    {STATUS_OPTIONS.map(({ value, label, color }) => {
                      const isActive = filters.status?.includes(value);
                      return (
                        <button
                          key={value}
                          onClick={() => handleStatusToggle(value)}
                          className={cn(
                            'w-full px-2 py-1.5 text-xs font-mono rounded text-left transition-colors',
                            isActive ? color : 'hover:bg-white/5'
                          )}
                        >
                          {label}
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>

            {/* Active Status Chips */}
            {filters.status?.map((status) => {
              const option = STATUS_OPTIONS.find((o) => o.value === status);
              return (
                <button
                  key={status}
                  onClick={() => handleStatusToggle(status)}
                  className={cn(
                    'flex items-center gap-1 px-2 py-1 text-xs font-mono rounded border transition-colors',
                    option?.color || 'bg-slate-500/20 text-slate-400 border-slate-500/30'
                  )}
                >
                  <span>{option?.label || status}</span>
                  <X className="w-3 h-3" />
                </button>
              );
            })}
          </div>

          {/* Author Filter Row */}
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-xs text-muted-foreground mr-1 w-12">Author:</span>
            <div className="relative flex-1 max-w-[200px]">
              <User className="absolute left-2 top-1/2 -translate-y-1/2 w-3 h-3 text-muted-foreground" />
              <input
                type="text"
                placeholder="Filter by author..."
                value={authorInput}
                onChange={(e) => setAuthorInput(e.target.value)}
                className={cn(
                  'w-full pl-7 pr-6 py-1 text-xs font-mono',
                  'bg-background border border-border rounded',
                  'placeholder:text-muted-foreground',
                  'focus:outline-none focus:ring-1 focus:ring-ginko-500/50'
                )}
              />
              {authorInput && (
                <button
                  onClick={() => {
                    setAuthorInput('');
                    onFiltersChange({ ...filters, author: undefined });
                  }}
                  className="absolute right-2 top-1/2 -translate-y-1/2 p-0.5 hover:bg-white/5 rounded"
                >
                  <X className="w-3 h-3 text-muted-foreground" />
                </button>
              )}
            </div>

            {/* Active Author Chip */}
            {filters.author && (
              <button
                onClick={() => {
                  setAuthorInput('');
                  onFiltersChange({ ...filters, author: undefined });
                }}
                className="flex items-center gap-1 px-2 py-1 text-xs font-mono rounded border bg-purple-500/20 text-purple-400 border-purple-500/30 transition-colors"
              >
                <span>@{filters.author}</span>
                <X className="w-3 h-3" />
              </button>
            )}
          </div>

          {/* Clear All */}
          {hasActiveFilters && (
            <div className="flex items-center pt-1">
              <button
                onClick={handleClearFilters}
                className="px-2 py-1 text-xs font-mono text-red-400 hover:text-red-300"
              >
                Clear all filters
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// =============================================================================
// Export (memoized for performance)
// =============================================================================

export default memo(FilterBar);
