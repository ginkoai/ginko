/**
 * @fileType: component
 * @status: current
 * @updated: 2025-12-11
 * @tags: [graph, adjacency, relationships, navigation]
 * @related: [node-detail-panel.tsx, types.ts]
 * @priority: high
 * @complexity: low
 * @dependencies: [lucide-react]
 */

'use client';

import { useMemo } from 'react';
import {
  ArrowRight,
  ArrowLeft,
  FileText,
  Target,
  Zap,
  AlertTriangle,
  CheckSquare,
  Calendar,
  GitBranch,
  Loader2,
  type LucideIcon,
} from 'lucide-react';
import type { AdjacentNode, NodeLabel, RelationshipType } from '@/lib/graph/types';
import { cn } from '@/lib/utils';

// =============================================================================
// Types
// =============================================================================

export interface AdjacencyListProps {
  adjacencies: AdjacentNode[];
  isLoading?: boolean;
  onNavigate: (nodeId: string) => void;
  className?: string;
}

// =============================================================================
// Icon Mapping
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
  Event: GitBranch,
  Session: GitBranch,
  Commit: GitBranch,
};

const nodeColors: Record<NodeLabel, string> = {
  Project: 'text-ginko-400 bg-ginko-500/10',
  Charter: 'text-blue-400 bg-blue-500/10',
  Epic: 'text-purple-400 bg-purple-500/10',
  Sprint: 'text-cyan-400 bg-cyan-500/10',
  Task: 'text-ginko-400 bg-ginko-500/10',
  ADR: 'text-amber-400 bg-amber-500/10',
  PRD: 'text-orange-400 bg-orange-500/10',
  Pattern: 'text-emerald-400 bg-emerald-500/10',
  Gotcha: 'text-red-400 bg-red-500/10',
  Event: 'text-slate-400 bg-slate-500/10',
  Session: 'text-slate-400 bg-slate-500/10',
  Commit: 'text-slate-400 bg-slate-500/10',
};

const relationshipLabels: Record<RelationshipType, string> = {
  BELONGS_TO: 'Belongs to',
  CONTAINS: 'Contains',
  IMPLEMENTS: 'Implements',
  REFERENCES: 'References',
  NEXT: 'Next',
  MENTIONS: 'Mentions',
  RELATED_TO: 'Related to',
  PARENT_OF: 'Parent of',
  CHILD_OF: 'Child of',
};

// =============================================================================
// Helper Functions
// =============================================================================

function getNodeProp(properties: Record<string, unknown>, key: string): string | undefined {
  const value = properties[key];
  return typeof value === 'string' ? value : undefined;
}

function getNodeTitle(node: AdjacentNode['node']): string {
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
    node.id
  );
}

// =============================================================================
// Component
// =============================================================================

export function AdjacencyList({
  adjacencies,
  isLoading = false,
  onNavigate,
  className,
}: AdjacencyListProps) {
  // Group by relationship type
  const groupedAdjacencies = useMemo(() => {
    const groups: Record<string, AdjacentNode[]> = {};

    adjacencies.forEach((adj) => {
      const key = `${adj.relationship.type}-${adj.relationship.direction}`;
      if (!groups[key]) {
        groups[key] = [];
      }
      groups[key].push(adj);
    });

    return groups;
  }, [adjacencies]);

  if (isLoading) {
    return (
      <div className={cn('flex items-center justify-center py-6', className)}>
        <Loader2 className="w-5 h-5 text-muted-foreground animate-spin" />
      </div>
    );
  }

  if (adjacencies.length === 0) {
    return (
      <div className={cn('text-sm text-muted-foreground text-center py-4', className)}>
        No related nodes found
      </div>
    );
  }

  return (
    <div className={cn('space-y-4', className)}>
      {Object.entries(groupedAdjacencies).map(([key, nodes]) => {
        const [type, direction] = key.split('-') as [RelationshipType, 'incoming' | 'outgoing'];
        const label = relationshipLabels[type] || type;

        return (
          <div key={key}>
            {/* Group Header */}
            <div className="flex items-center gap-2 text-xs text-muted-foreground mb-2">
              {direction === 'incoming' ? (
                <ArrowLeft className="w-3 h-3" />
              ) : (
                <ArrowRight className="w-3 h-3" />
              )}
              <span className="font-mono">
                {direction === 'incoming' ? `${label} (from)` : label}
              </span>
              <span className="text-[10px]">({nodes.length})</span>
            </div>

            {/* Nodes */}
            <div className="space-y-1">
              {nodes.map((adj) => (
                <AdjacencyItem
                  key={adj.node.id}
                  adjacency={adj}
                  onNavigate={onNavigate}
                />
              ))}
            </div>
          </div>
        );
      })}
    </div>
  );
}

// =============================================================================
// Adjacency Item
// =============================================================================

function AdjacencyItem({
  adjacency,
  onNavigate,
}: {
  adjacency: AdjacentNode;
  onNavigate: (nodeId: string) => void;
}) {
  const { node } = adjacency;
  const Icon = nodeIcons[node.label] || FileText;
  const colorClasses = nodeColors[node.label] || 'text-slate-400 bg-slate-500/10';
  const [textColor, bgColor] = colorClasses.split(' ');

  return (
    <button
      onClick={() => onNavigate(node.id)}
      className={cn(
        'w-full flex items-center gap-2 p-2 rounded',
        'hover:bg-white/5 transition-colors text-left'
      )}
    >
      {/* Icon */}
      <div className={cn('p-1.5 rounded', bgColor)}>
        <Icon className={cn('w-3 h-3', textColor)} />
      </div>

      {/* Content */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <span className={cn('text-[10px] font-mono uppercase', textColor)}>
            {node.label}
          </span>
        </div>
        <p className="text-sm font-mono text-foreground truncate">
          {getNodeTitle(node)}
        </p>
      </div>

      {/* Arrow */}
      <ArrowRight className="w-4 h-4 text-muted-foreground" />
    </button>
  );
}

// =============================================================================
// Export
// =============================================================================

export default AdjacencyList;
