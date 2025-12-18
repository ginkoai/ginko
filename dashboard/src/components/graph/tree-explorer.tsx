/**
 * @fileType: component
 * @status: current
 * @updated: 2025-12-11
 * @tags: [graph, tree, explorer, visualization, navigation]
 * @related: [tree-node.tsx, types.ts, hooks.ts]
 * @priority: high
 * @complexity: high
 * @dependencies: [lucide-react, framer-motion, @tanstack/react-query]
 */

'use client';

import { useState, useCallback, useMemo, useEffect, useRef } from 'react';
import { Loader2, RefreshCw, Search, ChevronLeft, ChevronRight, GripVertical } from 'lucide-react';
import { useGraphTree, useInvalidateGraph } from '@/lib/graph/hooks';
import type { TreeNode as TreeNodeType } from '@/lib/graph/types';
import { TreeNode } from './tree-node';
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
}: TreeExplorerProps) {
  // Fetch tree data
  const { data: tree, isLoading, error, refetch } = useGraphTree(graphId);
  const invalidateGraph = useInvalidateGraph();

  // Local state for expanded nodes
  const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set(['project-root', 'epics-folder']));

  // Search state
  const [searchQuery, setSearchQuery] = useState('');

  // Resizable panel state
  const [width, setWidth] = useState(280);
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

  // Filter tree by search query
  const filteredTree = useMemo(() => {
    if (!treeWithExpansion || !searchQuery.trim()) return treeWithExpansion;

    const query = searchQuery.toLowerCase();

    const filterNode = (node: TreeNodeType): TreeNodeType | null => {
      const nameMatches = node.name.toLowerCase().includes(query);

      // If children exist, filter them
      const filteredChildren = node.children
        ?.map(filterNode)
        .filter((child): child is TreeNodeType => child !== null);

      // Keep node if it matches or has matching children
      if (nameMatches || (filteredChildren && filteredChildren.length > 0)) {
        return {
          ...node,
          isExpanded: true, // Expand all when searching
          children: filteredChildren,
        };
      }

      return null;
    };

    return filterNode(treeWithExpansion);
  }, [treeWithExpansion, searchQuery]);

  // Keyboard navigation
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'f' && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        document.getElementById('tree-search')?.focus();
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, []);

  // Handle resize
  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (!isResizing) return;

      const newWidth = e.clientX;
      // Constrain width between 200px and 400px
      if (newWidth >= 200 && newWidth <= 400) {
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

  // Collapsed state
  if (isCollapsed) {
    return (
      <div className={cn('w-10 border-r border-border bg-card flex flex-col rounded-xl ml-2 my-2', className)}>
        <button
          onClick={onToggleCollapse}
          className="p-2 hover:bg-white/5 transition-colors"
          aria-label="Expand tree explorer"
        >
          <ChevronRight className="w-5 h-5 text-muted-foreground" />
        </button>
      </div>
    );
  }

  return (
    <div
      ref={resizeRef}
      className={cn('border-r border-border bg-card flex flex-col relative rounded-xl overflow-hidden ml-2 my-2', className)}
      style={{ width: `${width}px` }}
    >
      {/* Header */}
      <div className="p-3 border-b border-border flex items-center justify-between">
        <h2 className="text-sm font-mono font-medium text-foreground">Explorer</h2>
        <div className="flex items-center gap-1">
          <button
            onClick={async () => {
              // Invalidate all graph queries to force fresh data
              // Then trigger explicit refetch to ensure UI updates
              await invalidateGraph();
              await refetch();
            }}
            className="p-1 hover:bg-white/5 rounded transition-colors"
            aria-label="Refresh tree"
            disabled={isLoading}
          >
            <RefreshCw className={cn('w-4 h-4 text-muted-foreground', isLoading && 'animate-spin')} />
          </button>
          {onToggleCollapse && (
            <button
              onClick={onToggleCollapse}
              className="p-1 hover:bg-white/5 rounded transition-colors"
              aria-label="Collapse tree explorer"
            >
              <ChevronLeft className="w-4 h-4 text-muted-foreground" />
            </button>
          )}
        </div>
      </div>

      {/* Search */}
      <div className="p-2 border-b border-border">
        <div className="relative">
          <Search className="absolute left-2 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <input
            id="tree-search"
            type="text"
            placeholder="Search... (⌘F)"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className={cn(
              'w-full pl-8 pr-3 py-1.5 text-sm font-mono',
              'bg-background border border-border rounded',
              'placeholder:text-muted-foreground',
              'focus:outline-none focus:ring-1 focus:ring-ginko-500/50'
            )}
          />
        </div>
      </div>

      {/* Tree Content */}
      <div className="flex-1 overflow-auto p-2" role="tree" aria-label="Project tree">
        {isLoading && (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="w-5 h-5 text-muted-foreground animate-spin" />
          </div>
        )}

        {error && (
          <div className="p-4 text-sm text-red-400 text-center">
            <p>Failed to load tree</p>
            <button
              onClick={() => refetch()}
              className="mt-2 text-ginko-400 hover:text-ginko-300 underline"
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

        {!isLoading && !error && filteredTree && (
          <TreeNode
            node={filteredTree}
            depth={0}
            isSelected={selectedNodeId === filteredTree.id}
            onSelect={onSelectNode}
            onToggle={handleToggle}
          />
        )}
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
      >
        <div className="absolute top-1/2 -translate-y-1/2 right-0 translate-x-1/2 opacity-0 group-hover:opacity-100 transition-opacity">
          <GripVertical className="w-4 h-4 text-muted-foreground" />
        </div>
      </div>
    </div>
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
