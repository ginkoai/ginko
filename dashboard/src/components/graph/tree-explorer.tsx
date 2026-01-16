/**
 * @fileType: component
 * @status: current
 * @updated: 2026-01-16
 * @tags: [graph, tree, explorer, visualization, navigation, accessibility, a11y]
 * @related: [tree-node.tsx, types.ts, hooks.ts, useRovingTabindex.ts, useKeyboardNavigation.ts]
 * @priority: high
 * @complexity: high
 * @dependencies: [lucide-react, framer-motion, @tanstack/react-query]
 */

'use client';

import { useState, useCallback, useMemo, useEffect, useRef } from 'react';
import { Loader2, RefreshCw, Search, ChevronLeft, ChevronRight, GripVertical, X, Keyboard } from 'lucide-react';
import { useGraphTree, useInvalidateGraph } from '@/lib/graph/hooks';
import type { TreeNode as TreeNodeType, NodeFilters, NodeLabel } from '@/lib/graph/types';
import { TreeNode } from './tree-node';
import { ViewPresets } from './ViewPresets';
import { ShortcutsHelp } from './ShortcutsHelp';
import { cn } from '@/lib/utils';

// =============================================================================
// Types
// =============================================================================

export interface TreeExplorerProps {
  graphId: string;
  selectedNodeId: string | null;
  onSelectNode: (nodeId: string, treeNode?: TreeNodeType) => void;
  className?: string;
  isCollapsed?: boolean;
  onToggleCollapse?: () => void;
  /** Mobile overlay mode - renders as slide-out panel */
  isMobileOverlay?: boolean;
  /** Whether the mobile overlay is open */
  isMobileOpen?: boolean;
  /** Callback to close mobile overlay */
  onMobileClose?: () => void;
}

// =============================================================================
// Helper: Flatten tree for keyboard navigation
// =============================================================================

interface FlatTreeItem {
  node: TreeNodeType;
  depth: number;
  index: number;
}

function flattenTree(
  node: TreeNodeType,
  depth: number = 0,
  result: FlatTreeItem[] = []
): FlatTreeItem[] {
  result.push({ node, depth, index: result.length });

  if (node.isExpanded && node.children) {
    for (const child of node.children) {
      flattenTree(child, depth + 1, result);
    }
  }

  return result;
}

// =============================================================================
// Component
// =============================================================================

export function TreeExplorer({
  graphId,
  selectedNodeId,
  onSelectNode,
  className,
  isCollapsed = false,
  onToggleCollapse,
  isMobileOverlay = false,
  isMobileOpen = false,
  onMobileClose,
}: TreeExplorerProps) {
  // Refs for keyboard navigation
  const treeContainerRef = useRef<HTMLDivElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);

  // Fetch tree data
  const { data: tree, isLoading, error, refetch } = useGraphTree(graphId);
  const invalidateGraph = useInvalidateGraph();

  // Local state for expanded nodes - default expand root and knowledge folder
  const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set(['project-root']));

  // Search state
  const [searchQuery, setSearchQuery] = useState('');

  // Filter state for presets
  const [presetFilters, setPresetFilters] = useState<NodeFilters>({});

  // Keyboard navigation state
  const [focusedNodeId, setFocusedNodeId] = useState<string | null>(null);

  // Shortcuts help modal state
  const [showShortcutsHelp, setShowShortcutsHelp] = useState(false);

  // Filter results count for aria-live announcements
  const [filterResultCount, setFilterResultCount] = useState<number | null>(null);

  // Handle preset filter changes
  const handlePresetChange = useCallback((filters: NodeFilters) => {
    setPresetFilters(filters);
    // If preset has a search term, apply it
    if (filters.search) {
      setSearchQuery(filters.search);
    }
  }, []);

  // Resizable panel state
  const [width, setWidth] = useState(420);
  const [isResizing, setIsResizing] = useState(false);
  const resizeRef = useRef<HTMLDivElement>(null);

  // Toggle node expansion
  const handleToggle = useCallback((nodeId: string) => {
    setExpandedIds((prev) => {
      const next = new Set(prev);
      if (next.has(nodeId)) {
        next.delete(nodeId);
      } else {
        next.add(nodeId);
      }
      return next;
    });
  }, []);

  // Apply expansion state to tree
  const treeWithExpansion = useMemo(() => {
    if (!tree) return null;

    const applyExpansion = (node: TreeNodeType): TreeNodeType => ({
      ...node,
      isExpanded: expandedIds.has(node.id),
      children: node.children?.map(applyExpansion),
    });

    return applyExpansion(tree);
  }, [tree, expandedIds]);

  // Filter tree by search query and preset filters
  const filteredTree = useMemo(() => {
    if (!treeWithExpansion) return null;

    const query = searchQuery.toLowerCase().trim();
    const labelFilters = presetFilters.labels;
    const hasFilters = query || (labelFilters && labelFilters.length > 0);

    // If no filters, return tree as-is
    if (!hasFilters) return treeWithExpansion;

    const filterNode = (node: TreeNodeType): TreeNodeType | null => {
      const nameMatches = !query || node.name.toLowerCase().includes(query);
      const labelMatches = !labelFilters || labelFilters.length === 0 || labelFilters.includes(node.label as NodeLabel);

      // If children exist, filter them
      const filteredChildren = node.children
        ?.map(filterNode)
        .filter((child): child is TreeNodeType => child !== null);

      // Keep node if it matches both criteria or has matching children
      const nodeMatches = nameMatches && labelMatches;
      if (nodeMatches || (filteredChildren && filteredChildren.length > 0)) {
        return {
          ...node,
          isExpanded: true, // Expand all when filtering
          children: filteredChildren,
        };
      }

      return null;
    };

    return filterNode(treeWithExpansion);
  }, [treeWithExpansion, searchQuery, presetFilters.labels]);

  // Flatten the visible tree for keyboard navigation
  const flattenedTree = useMemo(() => {
    if (!filteredTree) return [];
    return flattenTree(filteredTree);
  }, [filteredTree]);

  // Update filter result count for screen reader announcements
  useEffect(() => {
    if (searchQuery || (presetFilters.labels && presetFilters.labels.length > 0)) {
      setFilterResultCount(flattenedTree.length);
    } else {
      setFilterResultCount(null);
    }
  }, [flattenedTree.length, searchQuery, presetFilters.labels]);

  // Handle node focus from tree item
  const handleNodeFocus = useCallback((nodeId: string) => {
    setFocusedNodeId(nodeId);
  }, []);

  // Focus a tree item by index
  const focusTreeItem = useCallback((index: number) => {
    if (flattenedTree.length === 0) return;

    const clampedIndex = Math.max(0, Math.min(index, flattenedTree.length - 1));
    const item = flattenedTree[clampedIndex];
    if (!item) return;

    setFocusedNodeId(item.node.id);

    // Find and focus the DOM element
    const element = treeContainerRef.current?.querySelector(
      `[data-node-id="${item.node.id}"]`
    ) as HTMLElement;
    if (element) {
      element.focus();
    }
  }, [flattenedTree]);

  // Get current focused item index
  const getFocusedIndex = useCallback(() => {
    if (!focusedNodeId) return 0;
    const index = flattenedTree.findIndex((item) => item.node.id === focusedNodeId);
    return index >= 0 ? index : 0;
  }, [focusedNodeId, flattenedTree]);

  // Focus search input
  const focusSearch = useCallback(() => {
    if (isMobileOverlay) {
      // For mobile, find the input in the mobile overlay
      const input = document.querySelector('.mobile-nav-sidebar input[type="text"]') as HTMLInputElement;
      input?.focus();
    } else {
      searchInputRef.current?.focus();
    }
  }, [isMobileOverlay]);

  // Keyboard navigation for the tree container
  const handleTreeKeyDown = useCallback((event: React.KeyboardEvent) => {
    const currentIndex = getFocusedIndex();

    switch (event.key) {
      case 'ArrowDown':
        event.preventDefault();
        focusTreeItem(currentIndex + 1);
        break;
      case 'ArrowUp':
        event.preventDefault();
        focusTreeItem(currentIndex - 1);
        break;
      case 'Home':
        event.preventDefault();
        focusTreeItem(0);
        break;
      case 'End':
        event.preventDefault();
        focusTreeItem(flattenedTree.length - 1);
        break;
      // ArrowLeft/ArrowRight are handled by tree-node for expand/collapse
    }
  }, [getFocusedIndex, focusTreeItem, flattenedTree.length]);

  // Global keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Don't trigger shortcuts when typing in inputs (except Escape)
      const target = e.target as HTMLElement;
      const isInInput = target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable;

      // Escape always works
      if (e.key === 'Escape') {
        if (showShortcutsHelp) {
          setShowShortcutsHelp(false);
          e.preventDefault();
          return;
        }
        if (isMobileOverlay && isMobileOpen && onMobileClose) {
          onMobileClose();
          e.preventDefault();
          return;
        }
      }

      // Skip other shortcuts when in input
      if (isInInput) return;

      // Cmd/Ctrl + F or Cmd/Ctrl + K: Focus search
      if ((e.key === 'f' || e.key === 'k') && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        focusSearch();
        return;
      }

      // / (slash): Focus search
      if (e.key === '/' && !e.metaKey && !e.ctrlKey) {
        e.preventDefault();
        focusSearch();
        return;
      }

      // ? (shift + /): Show shortcuts help
      if (e.key === '?' || (e.key === '/' && e.shiftKey)) {
        e.preventDefault();
        setShowShortcutsHelp(true);
        return;
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [focusSearch, showShortcutsHelp, isMobileOverlay, isMobileOpen, onMobileClose]);

  // Handle resize
  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (!isResizing) return;

      const newWidth = e.clientX;
      // Constrain width between 280px and 560px
      if (newWidth >= 280 && newWidth <= 560) {
        setWidth(newWidth);
      }
    };

    const handleMouseUp = () => {
      setIsResizing(false);
    };

    if (isResizing) {
      document.addEventListener('mousemove', handleMouseMove);
      document.addEventListener('mouseup', handleMouseUp);
      // Prevent text selection while resizing
      document.body.style.cursor = 'col-resize';
      document.body.style.userSelect = 'none';
    } else {
      document.body.style.cursor = '';
      document.body.style.userSelect = '';
    }

    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
      document.body.style.cursor = '';
      document.body.style.userSelect = '';
    };
  }, [isResizing]);

  // Handle node selection in mobile mode - close overlay after selection
  const handleMobileNodeSelect = useCallback((nodeId: string, treeNode?: TreeNodeType) => {
    onSelectNode(nodeId, treeNode);
    // Close mobile overlay after selection
    if (isMobileOverlay && onMobileClose) {
      onMobileClose();
    }
  }, [onSelectNode, isMobileOverlay, onMobileClose]);

  // Get tabIndex for a tree item (roving tabindex pattern)
  const getItemTabIndex = useCallback((nodeId: string, index: number): 0 | -1 => {
    // If we have a focused node, only that one gets tabIndex=0
    if (focusedNodeId) {
      return nodeId === focusedNodeId ? 0 : -1;
    }
    // Otherwise, first item gets tabIndex=0
    return index === 0 ? 0 : -1;
  }, [focusedNodeId]);

  // Render tree with roving tabindex
  const renderTree = useCallback((
    selectHandler: (nodeId: string, treeNode?: TreeNodeType) => void
  ) => {
    if (!filteredTree) return null;

    // We need to render the tree recursively but with proper tabindex
    // The flattenedTree gives us the order, but we render via TreeNode component
    const rootIndex = flattenedTree.findIndex((item) => item.node.id === filteredTree.id);

    return (
      <TreeNode
        node={filteredTree}
        depth={0}
        isSelected={selectedNodeId === filteredTree.id}
        onSelect={selectHandler}
        onToggle={handleToggle}
        tabIndex={getItemTabIndex(filteredTree.id, rootIndex >= 0 ? rootIndex : 0)}
        onFocus={handleNodeFocus}
        nodeIndex={rootIndex >= 0 ? rootIndex : 0}
      />
    );
  }, [filteredTree, selectedNodeId, handleToggle, getItemTabIndex, handleNodeFocus, flattenedTree]);

  // Mobile overlay render
  if (isMobileOverlay) {
    return (
      <>
        <div
          id="mobile-nav-overlay"
          className={cn(
            'mobile-nav-overlay',
            isMobileOpen && 'is-open'
          )}
          aria-hidden={!isMobileOpen}
        >
          {/* Backdrop */}
          <div
            className="mobile-nav-backdrop"
            onClick={onMobileClose}
            aria-hidden="true"
          />

          {/* Sidebar content */}
          <nav
            className="mobile-nav-sidebar"
            role="navigation"
            aria-label="Project navigation"
          >
            {/* Mobile header with close button */}
            <div className="mobile-nav-header">
              <h2 className="text-sm font-mono font-medium text-foreground">Explorer</h2>
              <div className="flex items-center gap-1">
                <button
                  onClick={async () => {
                    await invalidateGraph();
                    await refetch();
                  }}
                  className={cn(
                    'flex items-center justify-center',
                    'w-11 h-11 min-w-[44px] min-h-[44px]',
                    'hover:bg-white/5 rounded-lg transition-colors',
                    'focus:outline-none focus:ring-2 focus:ring-ginko-500'
                  )}
                  aria-label="Refresh tree"
                  disabled={isLoading}
                >
                  <RefreshCw className={cn('w-5 h-5 text-muted-foreground', isLoading && 'animate-spin')} aria-hidden="true" />
                </button>
                <button
                  onClick={onMobileClose}
                  className={cn(
                    'flex items-center justify-center',
                    'w-11 h-11 min-w-[44px] min-h-[44px]',
                    'hover:bg-white/5 rounded-lg transition-colors',
                    'focus:outline-none focus:ring-2 focus:ring-ginko-500'
                  )}
                  aria-label="Close navigation"
                >
                  <X className="w-5 h-5 text-muted-foreground" aria-hidden="true" />
                </button>
              </div>
            </div>

            {/* View Presets and Search with touch-friendly sizing */}
            <div className="p-3 border-b border-border space-y-3">
              {/* Preset Selector */}
              <div className="flex items-center gap-2">
                <span className="text-[10px] text-muted-foreground font-mono uppercase tracking-wider">View:</span>
                <ViewPresets
                  currentFilters={{ ...presetFilters, search: searchQuery }}
                  onPresetSelect={handlePresetChange}
                  className="flex-1"
                />
              </div>

              {/* Search */}
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" aria-hidden="true" />
                <input
                  type="text"
                  placeholder="Search..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  aria-label="Search tree"
                  className={cn(
                    'w-full pl-10 pr-3 py-3 text-sm font-mono',
                    'min-h-[44px]',
                    'bg-background border border-border rounded-lg',
                    'placeholder:text-muted-foreground',
                    'focus:outline-none focus:ring-2 focus:ring-ginko-500'
                  )}
                />
              </div>
            </div>

            {/* Tree Content with larger touch targets */}
            <div
              ref={treeContainerRef}
              className="flex-1 overflow-auto p-3"
              role="tree"
              aria-label="Project tree"
              onKeyDown={handleTreeKeyDown}
            >
              {isLoading && (
                <div className="flex items-center justify-center py-8" role="status" aria-label="Loading tree">
                  <Loader2 className="w-5 h-5 text-muted-foreground animate-spin" aria-hidden="true" />
                </div>
              )}

              {error && (
                <div className="p-4 text-sm text-red-400 text-center" role="alert">
                  <p>Failed to load tree</p>
                  <button
                    onClick={() => refetch()}
                    className="mt-2 text-ginko-400 hover:text-ginko-300 underline min-h-[44px] px-4 focus:outline-none focus:ring-2 focus:ring-ginko-500"
                  >
                    Retry
                  </button>
                </div>
              )}

              {!isLoading && !error && !filteredTree && (
                <div className="p-4 text-sm text-muted-foreground text-center">
                  No nodes found
                </div>
              )}

              {!isLoading && !error && filteredTree && renderTree(handleMobileNodeSelect)}
            </div>

            {/* Footer Stats */}
            {!isLoading && tree && (
              <div className="p-3 border-t border-border text-[10px] text-muted-foreground font-mono">
                {countNodes(tree)} nodes
              </div>
            )}
          </nav>
        </div>

        {/* Shortcuts Help Modal */}
        <ShortcutsHelp
          open={showShortcutsHelp}
          onOpenChange={setShowShortcutsHelp}
        />
      </>
    );
  }

  // Collapsed state
  if (isCollapsed) {
    return (
      <div className={cn('w-10 border-r border-border bg-card flex flex-col', className)}>
        <button
          onClick={onToggleCollapse}
          className="p-2 hover:bg-white/5 transition-colors focus:outline-none focus:ring-2 focus:ring-ginko-500 focus:ring-inset"
          aria-label="Expand tree explorer"
        >
          <ChevronRight className="w-5 h-5 text-muted-foreground" aria-hidden="true" />
        </button>
      </div>
    );
  }

  return (
    <>
      <nav
        ref={resizeRef}
        className={cn('border-r border-border bg-card flex flex-col relative overflow-hidden', className)}
        style={{ width: `${width}px` }}
        data-onboarding="nav-tree"
        role="navigation"
        aria-label="Project navigation"
      >
        {/* Header */}
        <div className="p-3 border-b border-border flex items-center justify-between">
          <h2 className="text-sm font-mono font-medium text-foreground">Explorer</h2>
          <div className="flex items-center gap-1">
            <button
              onClick={() => setShowShortcutsHelp(true)}
              className="p-1 hover:bg-white/5 rounded transition-colors focus:outline-none focus:ring-2 focus:ring-ginko-500"
              aria-label="Keyboard shortcuts (press ? for help)"
              title="Keyboard shortcuts"
            >
              <Keyboard className="w-4 h-4 text-muted-foreground" aria-hidden="true" />
            </button>
            <button
              onClick={async () => {
                // Invalidate all graph queries to force fresh data
                // Then trigger explicit refetch to ensure UI updates
                await invalidateGraph();
                await refetch();
              }}
              className="p-1 hover:bg-white/5 rounded transition-colors focus:outline-none focus:ring-2 focus:ring-ginko-500"
              aria-label="Refresh tree"
              disabled={isLoading}
            >
              <RefreshCw className={cn('w-4 h-4 text-muted-foreground', isLoading && 'animate-spin')} aria-hidden="true" />
            </button>
            {onToggleCollapse && (
              <button
                onClick={onToggleCollapse}
                className="p-1 hover:bg-white/5 rounded transition-colors focus:outline-none focus:ring-2 focus:ring-ginko-500"
                aria-label="Collapse tree explorer"
              >
                <ChevronLeft className="w-4 h-4 text-muted-foreground" aria-hidden="true" />
              </button>
            )}
          </div>
        </div>

        {/* View Presets and Search */}
        <div className="p-2 border-b border-border space-y-2">
          {/* Preset Selector */}
          <div className="flex items-center gap-2">
            <span className="text-[10px] text-muted-foreground font-mono uppercase tracking-wider">View:</span>
            <ViewPresets
              currentFilters={{ ...presetFilters, search: searchQuery }}
              onPresetSelect={handlePresetChange}
              className="flex-1"
            />
          </div>

          {/* Search */}
          <div className="relative">
            <Search className="absolute left-2 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" aria-hidden="true" />
            <input
              ref={searchInputRef}
              id="tree-search"
              type="text"
              placeholder="Search... (/ or Cmd+K)"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              data-onboarding="search"
              aria-label="Search tree nodes"
              aria-describedby="search-hint"
              className={cn(
                'w-full pl-8 pr-3 py-1.5 text-sm font-mono',
                'bg-background border border-border rounded',
                'placeholder:text-muted-foreground',
                'focus:outline-none focus:ring-2 focus:ring-ginko-500'
              )}
            />
            <span id="search-hint" className="sr-only">
              Press slash or Cmd+K to focus search. Type to filter tree nodes.
            </span>
          </div>
        </div>

        {/* Aria-live region for filter result announcements */}
        <div
          role="status"
          aria-live="polite"
          aria-atomic="true"
          className="sr-only"
        >
          {filterResultCount !== null && (
            `${filterResultCount} ${filterResultCount === 1 ? 'node' : 'nodes'} found`
          )}
        </div>

        {/* Tree Content */}
        <div
          ref={treeContainerRef}
          className="flex-1 overflow-auto p-2"
          role="tree"
          aria-label="Project tree"
          onKeyDown={handleTreeKeyDown}
        >
          {isLoading && (
            <div className="flex items-center justify-center py-8" role="status" aria-label="Loading tree">
              <Loader2 className="w-5 h-5 text-muted-foreground animate-spin" aria-hidden="true" />
            </div>
          )}

          {error && (
            <div className="p-4 text-sm text-red-400 text-center" role="alert">
              <p>Failed to load tree</p>
              <button
                onClick={() => refetch()}
                className="mt-2 text-ginko-400 hover:text-ginko-300 underline focus:outline-none focus:ring-2 focus:ring-ginko-500"
              >
                Retry
              </button>
            </div>
          )}

          {!isLoading && !error && !filteredTree && (
            <div className="p-4 text-sm text-muted-foreground text-center">
              No nodes found
            </div>
          )}

          {!isLoading && !error && filteredTree && renderTree(onSelectNode)}
        </div>

        {/* Footer Stats */}
        {!isLoading && tree && (
          <div className="p-2 border-t border-border text-[10px] text-muted-foreground font-mono">
            {countNodes(tree)} nodes
          </div>
        )}

        {/* Resize Handle */}
        <div
          className={cn(
            'absolute top-0 right-0 w-1 h-full cursor-col-resize',
            'hover:bg-ginko-500/30 transition-colors',
            'group',
            isResizing && 'bg-ginko-500/50'
          )}
          onMouseDown={(e) => {
            e.preventDefault();
            setIsResizing(true);
          }}
          role="separator"
          aria-orientation="vertical"
          aria-label="Resize tree explorer"
          aria-valuenow={width}
          aria-valuemin={280}
          aria-valuemax={560}
          tabIndex={0}
          onKeyDown={(e) => {
            if (e.key === 'ArrowLeft') {
              e.preventDefault();
              setWidth((w) => Math.max(280, w - 20));
            } else if (e.key === 'ArrowRight') {
              e.preventDefault();
              setWidth((w) => Math.min(560, w + 20));
            }
          }}
        >
          <div className="absolute top-1/2 -translate-y-1/2 right-0 translate-x-1/2 opacity-0 group-hover:opacity-100 transition-opacity">
            <GripVertical className="w-4 h-4 text-muted-foreground" aria-hidden="true" />
          </div>
        </div>
      </nav>

      {/* Shortcuts Help Modal */}
      <ShortcutsHelp
        open={showShortcutsHelp}
        onOpenChange={setShowShortcutsHelp}
      />
    </>
  );
}

// =============================================================================
// Helpers
// =============================================================================

function countNodes(node: TreeNodeType): number {
  let count = 1;
  if (node.children) {
    for (const child of node.children) {
      count += countNodes(child);
    }
  }
  return count;
}

// =============================================================================
// Export
// =============================================================================

export default TreeExplorer;
