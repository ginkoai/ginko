/**
 * @fileType: component
 * @status: current
 * @updated: 2026-01-14
 * @tags: [graph, children-section, navigation, hierarchy]
 * @related: [NodeView.tsx, ChildCard.tsx]
 * @priority: medium
 * @complexity: low
 * @dependencies: [lucide-react]
 */

'use client';

import { useState } from 'react';
import { ChevronDown, ChevronUp, Loader2 } from 'lucide-react';
import type { GraphNode, NodeLabel } from '@/lib/graph/types';
import { ChildCard } from './ChildCard';
import { cn } from '@/lib/utils';

// =============================================================================
// Types
// =============================================================================

export interface ChildrenSectionProps {
  children: GraphNode[];
  childType: NodeLabel;
  isLoading: boolean;
  onNavigate: (nodeId: string) => void;
  className?: string;
}

// =============================================================================
// Constants
// =============================================================================

const MAX_VISIBLE = 9;

const childTypeLabels: Partial<Record<NodeLabel, string>> = {
  Sprint: 'Sprints',
  Task: 'Tasks',
};

// =============================================================================
// Component
// =============================================================================

export function ChildrenSection({
  children,
  childType,
  isLoading,
  onNavigate,
  className,
}: ChildrenSectionProps) {
  const [showAll, setShowAll] = useState(false);

  // Loading state
  if (isLoading) {
    return (
      <div className={cn('', className)}>
        <h3 className="text-sm font-mono font-medium text-muted-foreground uppercase tracking-wider mb-3">
          {childTypeLabels[childType] || 'Children'}
        </h3>
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Loader2 className="w-4 h-4 animate-spin" />
          <span>Loading {childTypeLabels[childType]?.toLowerCase() || 'children'}...</span>
        </div>
      </div>
    );
  }

  // Empty state
  if (children.length === 0) {
    return null; // Don't show section if no children
  }

  const visibleChildren = showAll ? children : children.slice(0, MAX_VISIBLE);
  const hasMore = children.length > MAX_VISIBLE;

  return (
    <div className={cn('', className)}>
      {/* Header */}
      <h3 className="text-sm font-mono font-medium text-muted-foreground uppercase tracking-wider mb-3">
        {childTypeLabels[childType] || 'Children'} ({children.length})
      </h3>

      {/* Grid of cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
        {visibleChildren.map((child) => (
          <ChildCard
            key={child.id}
            node={child}
            onClick={onNavigate}
          />
        ))}
      </div>

      {/* Show all / Show less toggle */}
      {hasMore && (
        <button
          onClick={() => setShowAll(!showAll)}
          className={cn(
            'mt-3 flex items-center gap-1 text-sm text-muted-foreground',
            'hover:text-foreground transition-colors'
          )}
        >
          {showAll ? (
            <>
              <ChevronUp className="w-4 h-4" />
              Show less
            </>
          ) : (
            <>
              <ChevronDown className="w-4 h-4" />
              Show all {children.length} {childTypeLabels[childType]?.toLowerCase() || 'items'}
            </>
          )}
        </button>
      )}
    </div>
  );
}

export default ChildrenSection;
