/**
 * @fileType: component
 * @status: current
 * @updated: 2025-12-17
 * @tags: [graph, category-view, c4-navigation, filtering]
 * @related: [CondensedNodeCard.tsx, ProjectView.tsx, SummaryCard.tsx]
 * @priority: high
 * @complexity: medium
 * @dependencies: [lucide-react, @tanstack/react-query]
 */

'use client';

import { useState, useMemo, useCallback, useEffect } from 'react';
import {
  FileText,
  Target,
  Zap,
  AlertTriangle,
  CheckSquare,
  Calendar,
  GitBranch,
  Lightbulb,
  Search,
  SortAsc,
  SortDesc,
  AlertCircle,
  FolderOpen,
  type LucideIcon,
} from 'lucide-react';
import { useGraphNodes } from '@/lib/graph/hooks';
import { SkeletonNodeCard } from '@/components/ui/skeleton';
import type { NodeLabel, GraphNode, ListNodesResponse } from '@/lib/graph/types';
import { CondensedNodeCard } from './CondensedNodeCard';
import { cn } from '@/lib/utils';

// =============================================================================
// Types
// =============================================================================

export interface CategoryViewProps {
  graphId: string;
  label: NodeLabel;
  selectedNodeId: string | null;
  onSelectNode: (nodeId: string) => void;
  onViewDetails: (nodeId: string) => void;
  onEdit?: (nodeId: string, node?: GraphNode) => void;
  className?: string;
}

type SortField = 'name' | 'created_at' | 'status';
type SortOrder = 'asc' | 'desc';

// =============================================================================
// Icon & Color Mapping
// =============================================================================

const nodeIcons: Record<NodeLabel, LucideIcon> = {
  Project: Target,
  Charter: FileText,
  Epic: Target,
  Sprint: Calendar,
  Task: CheckSquare,
  ADR: FileText,
  PRD: FileText,
  Pattern: Zap,
  Gotcha: AlertTriangle,
  Principle: Lightbulb,
  Event: GitBranch,
  Session: GitBranch,
  Commit: GitBranch,
};

const nodeColors: Record<NodeLabel, { bg: string; text: string }> = {
  Project: { bg: 'bg-ginko-500/10', text: 'text-ginko-400' },
  Charter: { bg: 'bg-blue-500/10', text: 'text-blue-400' },
  Epic: { bg: 'bg-purple-500/10', text: 'text-purple-400' },
  Sprint: { bg: 'bg-cyan-500/10', text: 'text-cyan-400' },
  Task: { bg: 'bg-ginko-500/10', text: 'text-ginko-400' },
  ADR: { bg: 'bg-amber-500/10', text: 'text-amber-400' },
  PRD: { bg: 'bg-orange-500/10', text: 'text-orange-400' },
  Pattern: { bg: 'bg-emerald-500/10', text: 'text-emerald-400' },
  Gotcha: { bg: 'bg-red-500/10', text: 'text-red-400' },
  Principle: { bg: 'bg-indigo-500/10', text: 'text-indigo-400' },
  Event: { bg: 'bg-slate-500/10', text: 'text-slate-400' },
  Session: { bg: 'bg-slate-500/10', text: 'text-slate-400' },
  Commit: { bg: 'bg-slate-500/10', text: 'text-slate-400' },
};

const nodeDisplayNames: Record<NodeLabel, { singular: string; plural: string }> = {
  Project: { singular: 'Project', plural: 'Projects' },
  Charter: { singular: 'Charter', plural: 'Charters' },
  Epic: { singular: 'Epic', plural: 'Epics' },
  Sprint: { singular: 'Sprint', plural: 'Sprints' },
  Task: { singular: 'Task', plural: 'Tasks' },
  ADR: { singular: 'ADR', plural: 'ADRs' },
  PRD: { singular: 'PRD', plural: 'PRDs' },
  Pattern: { singular: 'Pattern', plural: 'Patterns' },
  Gotcha: { singular: 'Gotcha', plural: 'Gotchas' },
  Principle: { singular: 'Principle', plural: 'Principles' },
  Event: { singular: 'Event', plural: 'Events' },
  Session: { singular: 'Session', plural: 'Sessions' },
  Commit: { singular: 'Commit', plural: 'Commits' },
};

// =============================================================================
// Helper Functions
// =============================================================================

function getNodeProp(properties: Record<string, unknown>, key: string): string | undefined {
  const value = properties[key];
  return typeof value === 'string' ? value : undefined;
}

function getNodeTitle(node: GraphNode): string {
  const props = node.properties as Record<string, unknown>;
  return (
    getNodeProp(props, 'title') ||
    getNodeProp(props, 'name') ||
    getNodeProp(props, 'adr_id') ||
    getNodeProp(props, 'epic_id') ||
    getNodeProp(props, 'sprint_id') ||
    getNodeProp(props, 'task_id') ||
    getNodeProp(props, 'pattern_id') ||
    getNodeProp(props, 'gotcha_id') ||
    getNodeProp(props, 'principle_id') ||
    node.id
  );
}

// =============================================================================
// Status Filter Options by Node Type
// =============================================================================

const statusFilterOptions: Record<string, { value: string; label: string }[]> = {
  Task: [
    { value: 'all', label: 'All' },
    { value: 'todo', label: 'Todo' },
    { value: 'in_progress', label: 'In Progress' },
    { value: 'paused', label: 'Paused' },
    { value: 'complete', label: 'Complete' },
  ],
  Sprint: [
    { value: 'all', label: 'All' },
    { value: 'planning', label: 'Planning' },
    { value: 'active', label: 'Active' },
    { value: 'complete', label: 'Complete' },
  ],
  ADR: [
    { value: 'all', label: 'All' },
    { value: 'proposed', label: 'Proposed' },
    { value: 'accepted', label: 'Accepted' },
    { value: 'deprecated', label: 'Deprecated' },
    { value: 'superseded', label: 'Superseded' },
  ],
  Epic: [
    { value: 'all', label: 'All' },
    { value: 'planning', label: 'Planning' },
    { value: 'active', label: 'Active' },
    { value: 'complete', label: 'Complete' },
    { value: 'on-hold', label: 'On Hold' },
  ],
  Gotcha: [
    { value: 'all', label: 'All' },
    { value: 'low', label: 'Low' },
    { value: 'medium', label: 'Medium' },
    { value: 'high', label: 'High' },
    { value: 'critical', label: 'Critical' },
  ],
  Pattern: [
    { value: 'all', label: 'All' },
    { value: 'low', label: 'Low Confidence' },
    { value: 'medium', label: 'Medium Confidence' },
    { value: 'high', label: 'High Confidence' },
  ],
};

// =============================================================================
// Component
// =============================================================================

export function CategoryView({
  graphId,
  label,
  selectedNodeId,
  onSelectNode,
  onViewDetails,
  onEdit,
  className,
}: CategoryViewProps) {
  // Filter/sort state
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [sortField, setSortField] = useState<SortField>('name');
  const [sortOrder, setSortOrder] = useState<SortOrder>('asc');

  // Pagination state - API-level pagination for scalability
  const [page, setPage] = useState(0);
  const pageSize = 24;
  const offset = page * pageSize;

  // Fetch nodes with API-level pagination
  // Returns ListNodesResponse with total count for accurate pagination
  const {
    data: response,
    isLoading,
    error,
    refetch,
  } = useGraphNodes({
    graphId,
    labels: [label],
    limit: pageSize,
    offset,
  });

  // Extract nodes from response
  const nodes = response?.nodes;

  // Get display info
  const Icon = nodeIcons[label] || FileText;
  const colors = nodeColors[label] || nodeColors.Event;
  const displayNames = nodeDisplayNames[label] || { singular: label, plural: `${label}s` };
  const statusOptions = statusFilterOptions[label];

  // Filter and sort nodes
  const filteredNodes = useMemo(() => {
    if (!nodes) return [];

    // Deduplicate nodes by id (database may have duplicates)
    const seenIds = new Set<string>();
    let result = nodes.filter((node) => {
      if (seenIds.has(node.id)) {
        return false;
      }
      seenIds.add(node.id);
      return true;
    });

    // Apply search filter
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      result = result.filter((node) => {
        const title = getNodeTitle(node).toLowerCase();
        const props = node.properties as Record<string, unknown>;
        const description = (getNodeProp(props, 'description') || '').toLowerCase();
        return title.includes(query) || description.includes(query);
      });
    }

    // Apply status filter
    if (statusFilter !== 'all') {
      result = result.filter((node) => {
        const props = node.properties as Record<string, unknown>;
        const status = getNodeProp(props, 'status') ||
                      getNodeProp(props, 'severity') ||
                      getNodeProp(props, 'confidence');

        if (!status) return false;

        // Normalize status for comparison (handle 'complete' vs 'completed')
        const normalizedStatus = status.toLowerCase();
        const normalizedFilter = statusFilter.toLowerCase();

        // Check exact match or handle complete/completed variations
        if (normalizedStatus === normalizedFilter) return true;
        if (normalizedFilter === 'complete' && normalizedStatus === 'completed') return true;
        if (normalizedFilter === 'completed' && normalizedStatus === 'complete') return true;

        return false;
      });
    }

    // Apply sorting
    result.sort((a, b) => {
      const aProps = a.properties as Record<string, unknown>;
      const bProps = b.properties as Record<string, unknown>;

      let aVal: string | number = '';
      let bVal: string | number = '';

      if (sortField === 'name') {
        aVal = getNodeTitle(a).toLowerCase();
        bVal = getNodeTitle(b).toLowerCase();
      } else if (sortField === 'created_at') {
        aVal = (aProps.created_at || '0') as string;
        bVal = (bProps.created_at || '0') as string;
      } else if (sortField === 'status') {
        aVal = (getNodeProp(aProps, 'status') || getNodeProp(aProps, 'severity') || 'z') as string;
        bVal = (getNodeProp(bProps, 'status') || getNodeProp(bProps, 'severity') || 'z') as string;
      }

      if (aVal < bVal) return sortOrder === 'asc' ? -1 : 1;
      if (aVal > bVal) return sortOrder === 'asc' ? 1 : -1;
      return 0;
    });

    return result;
  }, [nodes, searchQuery, statusFilter, sortField, sortOrder]);

  // With API-level pagination, filteredNodes are already the current page
  // No additional slicing needed - but we still apply client-side filtering
  const paginatedNodes = filteredNodes;

  // Pagination info - use API total for accurate pagination
  // Note: When filtering is applied, we show filtered count; otherwise API total
  const isFiltered = searchQuery.trim() || statusFilter !== 'all';
  const displayTotal = isFiltered ? filteredNodes.length : (response?.total || 0);
  const totalPages = Math.ceil((response?.total || 0) / pageSize);
  const hasNextPage = offset + pageSize < (response?.total || 0);
  const hasPrevPage = page > 0;

  // Reset page when filters change
  useEffect(() => {
    setPage(0);
  }, [searchQuery, statusFilter, sortField, sortOrder]);

  // Toggle sort order
  const handleToggleSort = useCallback(() => {
    setSortOrder((prev) => (prev === 'asc' ? 'desc' : 'asc'));
  }, []);

  if (error) {
    return (
      <div className={cn('p-8', className)}>
        <div className="flex flex-col items-center justify-center py-12 text-center">
          <AlertCircle className="w-8 h-8 text-red-400 mb-3" />
          <p className="text-sm text-red-400 mb-2">Failed to load {displayNames.plural.toLowerCase()}</p>
          <button
            onClick={() => refetch()}
            className="text-sm text-ginko-400 hover:text-ginko-300 underline"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className={cn('flex flex-col h-full', className)}>
      {/* Header */}
      <div className="px-6 py-4 border-b border-border">
        <div className="flex items-center gap-3 mb-4">
          <div className={cn('p-2.5 rounded-lg', colors.bg)}>
            <Icon className={cn('w-5 h-5', colors.text)} />
          </div>
          <div>
            <h2 className="text-lg font-semibold text-foreground">
              {displayNames.plural}
            </h2>
            <p className="text-sm text-muted-foreground">
              {isLoading ? 'Loading...' : `${displayTotal} ${displayTotal === 1 ? displayNames.singular.toLowerCase() : displayNames.plural.toLowerCase()}`}
              {isFiltered && !isLoading && displayTotal !== (response?.total || 0) && ` (of ${response?.total})`}
            </p>
          </div>
        </div>

        {/* Filter/Sort Controls */}
        <div className="flex flex-wrap items-center gap-3">
          {/* Search */}
          <div className="relative flex-1 min-w-[200px] max-w-[300px]">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <input
              type="text"
              placeholder={`Search ${displayNames.plural.toLowerCase()}...`}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-3 py-2 text-sm bg-card border border-border rounded-lg focus:outline-none focus:ring-1 focus:ring-ginko-500 focus:border-ginko-500"
            />
          </div>

          {/* Status Filter */}
          {statusOptions && (
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="px-3 py-2 text-sm bg-background border border-border rounded-lg focus:outline-none focus:ring-1 focus:ring-ginko-500"
            >
              {statusOptions.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          )}

          {/* Sort Field */}
          <select
            value={sortField}
            onChange={(e) => setSortField(e.target.value as SortField)}
            className="px-3 py-2 text-sm bg-background border border-border rounded-lg focus:outline-none focus:ring-1 focus:ring-ginko-500"
          >
            <option value="name">Sort by Name</option>
            <option value="created_at">Sort by Date</option>
            <option value="status">Sort by Status</option>
          </select>

          {/* Sort Order Toggle */}
          <button
            onClick={handleToggleSort}
            className="p-2 text-muted-foreground hover:text-foreground hover:bg-white/5 rounded-lg transition-colors"
            aria-label={`Sort ${sortOrder === 'asc' ? 'descending' : 'ascending'}`}
          >
            {sortOrder === 'asc' ? (
              <SortAsc className="w-4 h-4" />
            ) : (
              <SortDesc className="w-4 h-4" />
            )}
          </button>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-auto p-4">
        {isLoading && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
            {Array.from({ length: 6 }).map((_, i) => (
              <SkeletonNodeCard key={i} />
            ))}
          </div>
        )}

        {!isLoading && filteredNodes.length === 0 && (
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <div className="p-4 rounded-full bg-muted/30 mb-4">
              <FolderOpen className="w-8 h-8 text-muted-foreground" />
            </div>
            <h3 className="text-lg font-medium text-foreground mb-1">
              No {displayNames.plural.toLowerCase()} found
            </h3>
            <p className="text-sm text-muted-foreground mb-4 max-w-sm">
              {searchQuery || statusFilter !== 'all'
                ? `No ${displayNames.plural.toLowerCase()} match your current filters.`
                : `There are no ${displayNames.plural.toLowerCase()} in this graph yet.`}
            </p>
            {(searchQuery || statusFilter !== 'all') && (
              <button
                onClick={() => {
                  setSearchQuery('');
                  setStatusFilter('all');
                }}
                className="px-4 py-2 text-sm font-medium text-ginko-400 hover:text-ginko-300 hover:bg-ginko-500/10 rounded-lg transition-colors"
              >
                Clear filters
              </button>
            )}
          </div>
        )}

        {!isLoading && filteredNodes.length > 0 && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
            {paginatedNodes.map((node) => (
              <CondensedNodeCard
                key={node.id}
                node={node}
                isSelected={node.id === selectedNodeId}
                onSelect={onSelectNode}
                onViewDetails={onViewDetails}
                onEdit={onEdit ? (nodeId) => onEdit(nodeId, node) : undefined}
              />
            ))}
          </div>
        )}
      </div>

      {/* Pagination */}
      {(response?.total || 0) > pageSize && (
        <div className="flex items-center justify-between px-6 py-3 border-t border-border">
          <p className="text-xs text-muted-foreground font-mono">
            Showing {offset + 1}-{Math.min(offset + pageSize, response?.total || 0)} of {response?.total || 0}
            {isFiltered && ` (${filteredNodes.length} matching filters)`}
          </p>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setPage((p) => Math.max(0, p - 1))}
              disabled={!hasPrevPage}
              className={cn(
                'px-3 py-1.5 text-xs font-mono rounded border border-border',
                'hover:bg-white/5 transition-colors',
                'disabled:opacity-50 disabled:cursor-not-allowed'
              )}
            >
              Previous
            </button>
            <span className="text-xs text-muted-foreground font-mono">
              Page {page + 1} of {totalPages}
            </span>
            <button
              onClick={() => setPage((p) => p + 1)}
              disabled={!hasNextPage}
              className={cn(
                'px-3 py-1.5 text-xs font-mono rounded border border-border',
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
// Export
// =============================================================================

export default CategoryView;
