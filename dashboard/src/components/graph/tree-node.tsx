/**
 * @fileType: component
 * @status: current
 * @updated: 2026-01-16
 * @tags: [graph, tree, node, visualization, accessibility, a11y]
 * @related: [tree-explorer.tsx, types.ts, useRovingTabindex.ts]
 * @priority: high
 * @complexity: medium
 * @dependencies: [lucide-react, framer-motion]
 */

'use client';

import { memo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  ChevronRight,
  ChevronDown,
  Folder,
  FolderOpen,
  FileText,
  Target,
  Zap,
  AlertTriangle,
  CheckSquare,
  Calendar,
  GitBranch,
  Lightbulb,
  type LucideIcon,
} from 'lucide-react';
import type { TreeNode as TreeNodeType, NodeLabel } from '@/lib/graph/types';
import { cn } from '@/lib/utils';

// =============================================================================
// Types
// =============================================================================

export interface TreeNodeProps {
  node: TreeNodeType;
  depth: number;
  isSelected: boolean;
  onSelect: (nodeId: string, node?: TreeNodeType) => void;
  onToggle: (nodeId: string) => void;
  /** TabIndex for roving tabindex pattern (0 for focused, -1 for others) */
  tabIndex?: 0 | -1;
  /** Callback when this node receives focus */
  onFocus?: (nodeId: string) => void;
  /** Unique index for this node in the flattened tree */
  nodeIndex?: number;
}

// =============================================================================
// Icon Mapping
// =============================================================================

const nodeIcons: Record<NodeLabel, LucideIcon> = {
  Project: Folder,
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

const nodeColors: Record<NodeLabel, string> = {
  Project: 'text-ginko-400',
  Charter: 'text-blue-400',
  Epic: 'text-purple-400',
  Sprint: 'text-cyan-400',
  Task: 'text-ginko-400',
  ADR: 'text-amber-400',
  PRD: 'text-orange-400',
  Pattern: 'text-emerald-400',
  Gotcha: 'text-red-400',
  Principle: 'text-indigo-400',
  Event: 'text-slate-400',
  Session: 'text-slate-400',
  Commit: 'text-slate-400',
};

// =============================================================================
// Component
// =============================================================================

function TreeNodeComponent({
  node,
  depth,
  isSelected,
  onSelect,
  onToggle,
  tabIndex = 0,
  onFocus,
  nodeIndex,
}: TreeNodeProps) {
  const hasChildren = node.hasChildren || (node.children && node.children.length > 0);
  const isExpanded = node.isExpanded ?? false;

  // Get icon based on node type
  const Icon = nodeIcons[node.label] || FileText;
  const iconColor = nodeColors[node.label] || 'text-slate-400';

  // Special handling for folder nodes
  const isFolder = node.id.endsWith('-folder') || node.label === 'Project';
  const FolderIcon = isExpanded ? FolderOpen : Folder;

  const handleClick = () => {
    onSelect(node.id, node);
  };

  const handleToggle = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (hasChildren) {
      onToggle(node.id);
    }
  };

  const handleFocus = () => {
    onFocus?.(node.id);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    // Enter or Space: select node
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      handleClick();
      return;
    }
    // ArrowRight: expand if collapsed, or do nothing (let parent handle navigation)
    if (e.key === 'ArrowRight') {
      if (hasChildren && !isExpanded) {
        e.preventDefault();
        e.stopPropagation();
        onToggle(node.id);
      }
      // If already expanded, allow the event to bubble for navigation
      return;
    }
    // ArrowLeft: collapse if expanded, or do nothing (let parent handle navigation)
    if (e.key === 'ArrowLeft') {
      if (isExpanded) {
        e.preventDefault();
        e.stopPropagation();
        onToggle(node.id);
      }
      // If already collapsed, allow the event to bubble for navigation
      return;
    }
    // ArrowUp/ArrowDown: let parent handle tree navigation
    // Home/End: let parent handle tree navigation
  };

  return (
    <div className="select-none">
      {/* Node Row */}
      <div
        role="treeitem"
        aria-expanded={hasChildren ? isExpanded : undefined}
        aria-selected={isSelected}
        aria-label={`${node.label}: ${node.name}${hasChildren ? (isExpanded ? ', expanded' : ', collapsed') : ''}`}
        tabIndex={tabIndex}
        data-tree-item
        data-node-id={node.id}
        data-node-index={nodeIndex}
        className={cn(
          'flex items-center gap-1 py-1 rounded cursor-pointer',
          'hover:bg-white/5 transition-colors',
          // Enhanced focus ring for WCAG compliance
          'focus:outline-none focus:ring-2 focus:ring-ginko-500 focus:ring-offset-1 focus:ring-offset-background',
          isSelected && 'bg-ginko-500/10 text-ginko-400'
        )}
        style={{ paddingLeft: `${depth * 16}px` }}
        onClick={handleClick}
        onKeyDown={handleKeyDown}
        onFocus={handleFocus}
      >
        {/* Expand/Collapse Toggle */}
        <button
          className={cn(
            'w-4 h-4 flex items-center justify-center flex-shrink-0',
            'text-muted-foreground hover:text-foreground transition-colors',
            !hasChildren && 'invisible'
          )}
          onClick={handleToggle}
          tabIndex={-1}
          aria-label={hasChildren ? (isExpanded ? `Collapse ${node.name}` : `Expand ${node.name}`) : undefined}
          aria-hidden={!hasChildren}
        >
          {hasChildren && (
            <motion.div
              initial={false}
              animate={{ rotate: isExpanded ? 90 : 0 }}
              transition={{ duration: 0.15 }}
            >
              <ChevronRight className="w-3 h-3" aria-hidden="true" />
            </motion.div>
          )}
        </button>

        {/* Icon (decorative - node type is announced via aria-label) */}
        <span className={cn('w-4 h-4 flex-shrink-0', iconColor)} aria-hidden="true">
          {isFolder ? (
            <FolderIcon className="w-4 h-4" />
          ) : (
            <Icon className="w-4 h-4" />
          )}
        </span>

        {/* Name */}
        <span
          className={cn(
            'text-sm truncate font-mono',
            isSelected ? 'text-ginko-400' : 'text-foreground'
          )}
        >
          {node.name}
        </span>

        {/* Status badge for tasks, sprints, and epics */}
        {(node.label === 'Task' || node.label === 'Sprint' || node.label === 'Epic') && node.properties && (
          <StatusBadge status={(node.properties as Record<string, unknown>).status as string} />
        )}
      </div>

      {/* Children */}
      <AnimatePresence initial={false}>
        {hasChildren && isExpanded && node.children && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="overflow-hidden"
            role="group"
            aria-label={`Children of ${node.name}`}
          >
            {node.children.map((child) => (
              <TreeNodeComponent
                key={child.id}
                node={child}
                depth={depth + 1}
                isSelected={isSelected && child.id === node.id}
                onSelect={onSelect}
                onToggle={onToggle}
                tabIndex={-1}
                onFocus={onFocus}
              />
            ))}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

// =============================================================================
// Status Badge (Tasks, Sprints, Epics)
// =============================================================================

function StatusBadge({ status }: { status: string | undefined }) {
  if (!status) return null;

  const statusConfig: Record<string, { color: string; label: string }> = {
    // Task statuses
    todo: { color: 'bg-slate-500/20 text-slate-400', label: 'Todo' },
    not_started: { color: 'bg-slate-500/20 text-slate-400', label: 'Todo' },
    in_progress: { color: 'bg-ginko-500/20 text-ginko-400', label: 'In Progress' },
    paused: { color: 'bg-amber-500/20 text-amber-400', label: 'Paused' },
    complete: { color: 'bg-emerald-500/20 text-emerald-400', label: 'Done' },
    // Sprint/Epic statuses
    planning: { color: 'bg-blue-500/20 text-blue-400', label: 'Planning' },
    active: { color: 'bg-blue-600 text-white', label: 'Active' },
    'on-hold': { color: 'bg-amber-500/20 text-amber-400', label: 'On Hold' },
  };

  const config = statusConfig[status] || statusConfig.todo;

  return (
    <span
      className={cn(
        'ml-auto text-[10px] px-1.5 py-0.5 rounded font-mono',
        config.color
      )}
    >
      {config.label}
    </span>
  );
}

// =============================================================================
// Export
// =============================================================================

export const TreeNode = memo(TreeNodeComponent);
