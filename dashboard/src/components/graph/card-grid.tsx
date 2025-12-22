/**
 * @fileType: component
 * @status: current
 * @updated: 2025-12-11
 * @tags: [graph, grid, cards, visualization, filtering]
 * @related: [node-card.tsx, filter-bar.tsx]
 * @priority: high
 * @complexity: medium
 * @dependencies: [lucide-react, @tanstack/react-query]
 */

'use client';

import { useState, useMemo, useCallback, useEffect, useRef, memo } from 'react';
import { Loader2, LayoutGrid, List } from 'lucide-react';
import { useGraphNodes } from '@/lib/graph/hooks';
import type { NodeLabel, GraphNode, NodeFilters } from '@/lib/graph/types';
import { NodeCard } from './node-card';
import { FilterBar } from './filter-bar';
import { cn } from '@/lib/utils';

// =============================================================================
// Types
// =============================================================================

export interface CardGridProps {
  graphId: string;
  selectedNodeId: string | null;
  onSelectNode: (nodeId: string) => void;
  onViewDetails?: (nodeId: string) => void;
  initialFilters?: NodeFilters;
  className?: string;
}

type ViewMode = 'grid' | 'list';

// =============================================================================
// Component
// =============================================================================

export function CardGrid({
  graphId,
  selectedNodeId,
  onSelectNode,
  onViewDetails,
  initialFilters,
  className,
}: CardGridProps) {
  // View mode
  const [viewMode, setViewMode] = useState<ViewMode>('grid');

  // Filters
  const [filters, setFilters] = useState<NodeFilters>(initialFilters || {});

  // Pagination
  const [offset, setOffset] = useState(0);
  const limit = 24;

  // Ref for scrolling to selected card
  const selectedCardRef = useRef<HTMLDivElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  // Fetch nodes
  const {
    data,
    isLoading,
    error,
    refetch,
  } = useGraphNodes({
    graphId,
    labels: filters.labels,
    limit,
    offset,
  });

  // Filter by search locally (API doesn't support full-text search on properties)
  const filteredNodes = useMemo(() => {
    if (!data?.nodes) return [];
    if (!filters.search?.trim()) return data.nodes;

    const query = filters.search.toLowerCase();
    return data.nodes.filter((node) => {
      const props = node.properties as Record<string, unknown>;
      const title = (props.title || props.name || node.id) as string;
      const description = (props.description || props.summary || '') as string;
      return (
        title.toLowerCase().includes(query) ||
        description.toLowerCase().includes(query)
      );
    });
  }, [data?.nodes, filters.search]);

  // Sort nodes
  const sortedNodes = useMemo(() => {
    if (!filteredNodes.length) return filteredNodes;

    const sorted = [...filteredNodes];
    const { sortBy = 'created_at', sortOrder = 'desc' } = filters;

    sorted.sort((a, b) => {
      const aProps = a.properties as Record<string, unknown>;
      const bProps = b.properties as Record<string, unknown>;

      let aVal: string | number = '';
      let bVal: string | number = '';

      if (sortBy === 'name') {
        aVal = ((aProps.title || aProps.name || a.id) as string).toLowerCase();
        bVal = ((bProps.title || bProps.name || b.id) as string).toLowerCase();
      } else if (sortBy === 'created_at' || sortBy === 'updated_at') {
        aVal = (aProps[sortBy] || '0') as string;
        bVal = (bProps[sortBy] || '0') as string;
      }

      if (aVal < bVal) return sortOrder === 'asc' ? -1 : 1;
      if (aVal > bVal) return sortOrder === 'asc' ? 1 : -1;
      return 0;
    });

    return sorted;
  }, [filteredNodes, filters.sortBy, filters.sortOrder]);

  // Handle filter changes
  const handleFiltersChange = useCallback((newFilters: NodeFilters) => {
    setFilters(newFilters);
    setOffset(0); // Reset pagination
  }, []);

  // Pagination handlers
  const hasMore = data && data.total > offset + limit;
  const hasPrev = offset > 0;

  const handleNextPage = () => {
    setOffset((prev) => prev + limit);
  };

  const handlePrevPage = () => {
    setOffset((prev) => Math.max(0, prev - limit));
  };

  // Scroll to selected card when selection changes from tree view
  useEffect(() => {
    if (selectedNodeId && selectedCardRef.current && containerRef.current) {
      // Small delay to ensure DOM is updated
      setTimeout(() => {
        selectedCardRef.current?.scrollIntoView({
          behavior: 'smooth',
          block: 'center',
        });
      }, 100);
    }
  }, [selectedNodeId]);

  return (
    <div className={cn('flex flex-col h-full', className)}>
      {/* Filter Bar */}
      <FilterBar
        filters={filters}
        onFiltersChange={handleFiltersChange}
        viewMode={viewMode}
        onViewModeChange={setViewMode}
        totalCount={data?.total}
        filteredCount={sortedNodes.length}
      />

      {/* Content */}
      <div ref={containerRef} className="flex-1 overflow-auto p-4">
        {isLoading && (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="w-6 h-6 text-muted-foreground animate-spin" />
          </div>
        )}

        {error && (
          <div className="flex flex-col items-center justify-center py-12 text-center">
            <p className="text-sm text-red-400 mb-2">Failed to load nodes</p>
            <button
              onClick={() => refetch()}
              className="text-sm text-ginko-400 hover:text-ginko-300 underline"
            >
              Retry
            </button>
          </div>
        )}

        {!isLoading && !error && sortedNodes.length === 0 && (
          <div className="flex flex-col items-center justify-center py-12 text-center">
            <p className="text-sm text-muted-foreground">No nodes found</p>
            {filters.labels?.length || filters.search ? (
              <button
                onClick={() => handleFiltersChange({})}
                className="mt-2 text-sm text-ginko-400 hover:text-ginko-300 underline"
              >
                Clear filters
              </button>
            ) : null}
          </div>
        )}

        {!isLoading && !error && sortedNodes.length > 0 && (
          <div
            className={cn(
              viewMode === 'grid'
                ? 'grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4'
                : 'flex flex-col gap-2'
            )}
          >
            {sortedNodes.map((node) => (
              <div
                key={node.id}
                ref={node.id === selectedNodeId ? selectedCardRef : undefined}
              >
                <NodeCard
                  node={node}
                  isSelected={node.id === selectedNodeId}
                  onSelect={onSelectNode}
                  onViewDetails={onViewDetails}
                  showCornerBrackets={viewMode === 'grid'}
                />
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Pagination */}
      {data && data.total > limit && (
        <div className="flex items-center justify-between px-4 py-3 border-t border-border">
          <p className="text-xs text-muted-foreground font-mono">
            Showing {offset + 1}-{Math.min(offset + limit, data.total)} of {data.total}
          </p>
          <div className="flex items-center gap-2">
            <button
              onClick={handlePrevPage}
              disabled={!hasPrev}
              className={cn(
                'px-3 py-1 text-xs font-mono rounded border border-border',
                'hover:bg-white/5 transition-colors',
                'disabled:opacity-50 disabled:cursor-not-allowed'
              )}
            >
              Previous
            </button>
            <button
              onClick={handleNextPage}
              disabled={!hasMore}
              className={cn(
                'px-3 py-1 text-xs font-mono rounded border border-border',
                'hover:bg-white/5 transition-colors',
                'disabled:opacity-50 disabled:cursor-not-allowed'
              )}
            >
              Next
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

// =============================================================================
// Export (memoized for performance)
// =============================================================================

export default memo(CardGrid);
