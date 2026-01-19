/**
 * @fileType: component
 * @status: current
 * @updated: 2026-01-16
 * @tags: [graph, children-section, navigation, hierarchy, accessibility, a11y]
 * @related: [NodeView.tsx, ChildCard.tsx]
 * @priority: medium
 * @complexity: low
 * @dependencies: [lucide-react]
 */

'use client';

import { useState } from 'react';
import { ChevronDown, ChevronUp, ChevronRight, Loader2 } from 'lucide-react';
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
  defaultExpanded?: boolean;
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
  defaultExpanded = true,
}: ChildrenSectionProps) {
  const [isExpanded, setIsExpanded] = useState(defaultExpanded);
  const [showAll, setShowAll] = useState(false);
  const sectionLabel = childTypeLabels[childType] || 'Children';
  const sectionId = `children-section-${childType.toLowerCase()}`;

  // Loading state
  if (isLoading) {
    return (
      <section className={cn('', className)} aria-label={sectionLabel}>
        <div className="flex items-center gap-2 text-sm text-muted-foreground" role="status" aria-label={`Loading ${sectionLabel.toLowerCase()}`}>
          <Loader2 className="w-4 h-4 animate-spin" aria-hidden="true" />
          <span>Loading {sectionLabel.toLowerCase()}...</span>
        </div>
      </section>
    );
  }

  // Empty state
  if (children.length === 0) {
    return null; // Don't show section if no children
  }

  const visibleChildren = showAll ? children : children.slice(0, MAX_VISIBLE);
  const hasMore = children.length > MAX_VISIBLE;
  const hiddenCount = children.length - MAX_VISIBLE;

  return (
    <section className={cn('', className)} aria-label={sectionLabel}>
      {/* Collapsible Header */}
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className={cn(
          'flex items-center gap-2 text-sm font-mono font-medium text-muted-foreground uppercase tracking-wider mb-3',
          'hover:text-foreground transition-colors',
          'focus:outline-none focus:ring-2 focus:ring-ginko-500 rounded'
        )}
        aria-expanded={isExpanded}
        aria-controls={sectionId}
      >
        {isExpanded ? (
          <ChevronDown className="w-4 h-4" aria-hidden="true" />
        ) : (
          <ChevronRight className="w-4 h-4" aria-hidden="true" />
        )}
        <h2 className="text-sm font-mono font-medium uppercase tracking-wider">
          {sectionLabel} ({children.length})
        </h2>
      </button>

      {/* Collapsible Content */}
      {isExpanded && (
        <div id={sectionId}>
          {/* Grid of cards */}
          <div
            className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3"
            role="list"
            aria-label={`List of ${sectionLabel.toLowerCase()}`}
          >
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
                'hover:text-foreground transition-colors',
                'focus:outline-none focus:ring-2 focus:ring-ginko-500 rounded px-2 py-1 -ml-2'
              )}
              aria-expanded={showAll}
              aria-label={showAll
                ? `Show fewer ${sectionLabel.toLowerCase()}`
                : `Show all ${children.length} ${sectionLabel.toLowerCase()} (${hiddenCount} more hidden)`
              }
            >
              {showAll ? (
                <>
                  <ChevronUp className="w-4 h-4" aria-hidden="true" />
                  Show less
                </>
              ) : (
                <>
                  <ChevronDown className="w-4 h-4" aria-hidden="true" />
                  Show all {children.length} {sectionLabel.toLowerCase()}
                </>
              )}
            </button>
          )}
        </div>
      )}
    </section>
  );
}

export default ChildrenSection;
