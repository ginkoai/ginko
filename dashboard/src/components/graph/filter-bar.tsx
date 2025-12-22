/**
 * @fileType: component
 * @status: current
 * @updated: 2025-12-11
 * @tags: [graph, filter, search, toolbar]
 * @related: [card-grid.tsx, types.ts]
 * @priority: high
 * @complexity: medium
 * @dependencies: [lucide-react]
 */

'use client';

import { useState, useCallback, useEffect, memo } from 'react';
import {
  Search,
  LayoutGrid,
  List,
  SortAsc,
  SortDesc,
  X,
  Filter,
} from 'lucide-react';
import type { NodeLabel, NodeFilters } from '@/lib/graph/types';
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

  // Debounce search
  useEffect(() => {
    const timer = setTimeout(() => {
      if (searchInput !== filters.search) {
        onFiltersChange({ ...filters, search: searchInput || undefined });
      }
    }, 300);
    return () => clearTimeout(timer);
  }, [searchInput, filters, onFiltersChange]);

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
    onFiltersChange({});
  }, [onFiltersChange]);

  const hasActiveFilters = !!filters.labels?.length || !!filters.search;

  return (
    <div className="border-b border-border bg-card/50">
      {/* Main Bar */}
      <div className="flex items-center gap-3 p-3">
        {/* Search */}
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <input
            type="text"
            placeholder="Search nodes..."
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            className={cn(
              'w-full pl-9 pr-8 py-2 text-sm font-mono',
              'bg-background border border-border rounded-lg',
              'placeholder:text-muted-foreground',
              'focus:outline-none focus:ring-1 focus:ring-ginko-500/50'
            )}
          />
          {searchInput && (
            <button
              onClick={() => setSearchInput('')}
              className="absolute right-3 top-1/2 -translate-y-1/2 p-0.5 hover:bg-white/5 rounded"
            >
              <X className="w-3 h-3 text-muted-foreground" />
            </button>
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
          {hasActiveFilters && (
            <span className="px-1.5 py-0.5 text-[10px] bg-ginko-500/20 rounded">
              {(filters.labels?.length || 0) + (filters.search ? 1 : 0)}
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
        <div className="px-3 pb-3 flex items-center gap-2 flex-wrap">
          <span className="text-xs text-muted-foreground mr-1">Type:</span>
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
          {hasActiveFilters && (
            <button
              onClick={handleClearFilters}
              className="ml-2 px-2 py-1 text-xs font-mono text-red-400 hover:text-red-300"
            >
              Clear all
            </button>
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
