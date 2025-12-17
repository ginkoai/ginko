/**
 * @fileType: component
 * @status: current
 * @updated: 2025-12-17
 * @tags: [graph, related-nodes, summary, c4-navigation]
 * @related: [NodeView.tsx, SummaryCard.tsx, adjacency-list.tsx]
 * @priority: high
 * @complexity: medium
 * @dependencies: [lucide-react]
 */

'use client';

import { memo, useMemo, useState } from 'react';
import {
  FileText,
  Target,
  Zap,
  AlertTriangle,
  CheckSquare,
  Calendar,
  GitBranch,
  Lightbulb,
  ChevronDown,
  ChevronRight,
  ExternalLink,
  type LucideIcon,
} from 'lucide-react';
import type { NodeLabel, AdjacentNode, GraphNode } from '@/lib/graph/types';
import { cn } from '@/lib/utils';

// =============================================================================
// Types
// =============================================================================

export interface RelatedNodesSummaryProps {
  adjacencies: AdjacentNode[];
  onNavigate: (nodeId: string) => void;
  isLoading?: boolean;
  className?: string;
}

interface GroupedAdjacencies {
  label: NodeLabel;
  nodes: AdjacentNode[];
}

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
// Related Group Component
// =============================================================================

function RelatedGroup({
  group,
  onNavigate,
  defaultExpanded = false,
}: {
  group: GroupedAdjacencies;
  onNavigate: (nodeId: string) => void;
  defaultExpanded?: boolean;
}) {
  const [isExpanded, setIsExpanded] = useState(defaultExpanded);

  const Icon = nodeIcons[group.label] || FileText;
  const colors = nodeColors[group.label] || nodeColors.Event;

  return (
    <div className="border border-border rounded-lg overflow-hidden">
      {/* Header - clickable to expand */}
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="w-full flex items-center gap-3 p-3 hover:bg-white/5 transition-colors"
      >
        <div className={cn('p-2 rounded-lg', colors.bg)}>
          <Icon className={cn('w-4 h-4', colors.text)} />
        </div>

        <div className="flex-1 text-left">
          <span className="text-sm font-medium text-foreground">
            {group.label}s
          </span>
          <span className="ml-2 text-xs text-muted-foreground">
            ({group.nodes.length})
          </span>
        </div>

        {isExpanded ? (
          <ChevronDown className="w-4 h-4 text-muted-foreground" />
        ) : (
          <ChevronRight className="w-4 h-4 text-muted-foreground" />
        )}
      </button>

      {/* Expanded content */}
      {isExpanded && (
        <div className="border-t border-border divide-y divide-border">
          {group.nodes.map((adj) => (
            <button
              key={adj.node.id}
              onClick={() => onNavigate(adj.node.id)}
              className="w-full flex items-center gap-3 p-3 hover:bg-white/5 transition-colors text-left"
            >
              <div className="flex-1 min-w-0">
                <p className="text-sm text-foreground truncate">
                  {getNodeTitle(adj.node)}
                </p>
                <p className="text-xs text-muted-foreground">
                  {adj.relationship.direction === 'incoming' ? '← ' : '→ '}
                  {adj.relationship.type.replace('_', ' ')}
                </p>
              </div>
              <ExternalLink className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

// =============================================================================
// Component
// =============================================================================

function RelatedNodesSummaryComponent({
  adjacencies,
  onNavigate,
  isLoading,
  className,
}: RelatedNodesSummaryProps) {
  // Group adjacencies by node label
  const groupedAdjacencies = useMemo((): GroupedAdjacencies[] => {
    const groups: Record<NodeLabel, AdjacentNode[]> = {} as Record<NodeLabel, AdjacentNode[]>;

    adjacencies.forEach((adj) => {
      const label = adj.node.label;
      if (!groups[label]) {
        groups[label] = [];
      }
      groups[label].push(adj);
    });

    // Convert to array and sort by count
    return Object.entries(groups)
      .map(([label, nodes]) => ({
        label: label as NodeLabel,
        nodes,
      }))
      .sort((a, b) => b.nodes.length - a.nodes.length);
  }, [adjacencies]);

  if (isLoading) {
    return (
      <div className={cn('space-y-3', className)}>
        {[1, 2].map((i) => (
          <div
            key={i}
            className="h-14 bg-muted/50 rounded-lg animate-pulse"
          />
        ))}
      </div>
    );
  }

  if (groupedAdjacencies.length === 0) {
    return (
      <div className={cn('text-center py-6', className)}>
        <p className="text-sm text-muted-foreground">No related nodes</p>
      </div>
    );
  }

  return (
    <div className={cn('space-y-3', className)}>
      {groupedAdjacencies.map((group, index) => (
        <RelatedGroup
          key={group.label}
          group={group}
          onNavigate={onNavigate}
          defaultExpanded={index === 0} // Expand first group by default
        />
      ))}
    </div>
  );
}

// =============================================================================
// Export
// =============================================================================

export const RelatedNodesSummary = memo(RelatedNodesSummaryComponent);
export default RelatedNodesSummary;
