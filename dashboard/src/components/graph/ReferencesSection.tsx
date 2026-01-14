/**
 * @fileType: component
 * @status: current
 * @updated: 2026-01-14
 * @tags: [graph, references-section, navigation, knowledge]
 * @related: [NodeView.tsx, RelatedNodesSummary.tsx]
 * @priority: medium
 * @complexity: low
 * @dependencies: [lucide-react]
 */

'use client';

import { useMemo } from 'react';
import {
  FileText,
  Zap,
  AlertTriangle,
  Lightbulb,
  Loader2,
  ExternalLink,
  type LucideIcon,
} from 'lucide-react';
import type { AdjacentNode, NodeLabel, GraphNode } from '@/lib/graph/types';
import { cn } from '@/lib/utils';

// =============================================================================
// Types
// =============================================================================

export interface ReferencesSectionProps {
  adjacencies: AdjacentNode[];
  isLoading: boolean;
  onNavigate: (nodeId: string) => void;
  className?: string;
}

interface GroupedReferences {
  label: NodeLabel;
  nodes: AdjacentNode[];
  icon: LucideIcon;
  color: { bg: string; text: string };
}

// =============================================================================
// Icon & Color Mapping (Knowledge types only)
// =============================================================================

const knowledgeConfig: Partial<Record<NodeLabel, { icon: LucideIcon; color: { bg: string; text: string } }>> = {
  ADR: { icon: FileText, color: { bg: 'bg-amber-500/10', text: 'text-amber-400' } },
  PRD: { icon: FileText, color: { bg: 'bg-orange-500/10', text: 'text-orange-400' } },
  Pattern: { icon: Zap, color: { bg: 'bg-emerald-500/10', text: 'text-emerald-400' } },
  Gotcha: { icon: AlertTriangle, color: { bg: 'bg-red-500/10', text: 'text-red-400' } },
  Principle: { icon: Lightbulb, color: { bg: 'bg-indigo-500/10', text: 'text-indigo-400' } },
};

// Types we show in the References section
const REFERENCE_TYPES: NodeLabel[] = ['ADR', 'PRD', 'Pattern', 'Gotcha', 'Principle'];

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
    getNodeProp(props, 'pattern_id') ||
    getNodeProp(props, 'gotcha_id') ||
    getNodeProp(props, 'principle_id') ||
    getNodeProp(props, 'prd_id') ||
    node.id
  );
}

function getNodeTypeId(node: GraphNode): string | undefined {
  const props = node.properties as Record<string, unknown>;
  return (
    getNodeProp(props, 'adr_id') ||
    getNodeProp(props, 'pattern_id') ||
    getNodeProp(props, 'gotcha_id') ||
    getNodeProp(props, 'principle_id') ||
    getNodeProp(props, 'prd_id')
  );
}

// =============================================================================
// Component
// =============================================================================

export function ReferencesSection({
  adjacencies,
  isLoading,
  onNavigate,
  className,
}: ReferencesSectionProps) {
  // Filter to only knowledge types and group by label
  const groupedReferences = useMemo((): GroupedReferences[] => {
    // Filter adjacencies to only include knowledge types
    const filtered = adjacencies.filter((adj) =>
      REFERENCE_TYPES.includes(adj.node.label)
    );

    // Group by label
    const groups: Partial<Record<NodeLabel, AdjacentNode[]>> = {};
    filtered.forEach((adj) => {
      const label = adj.node.label;
      if (!groups[label]) {
        groups[label] = [];
      }
      groups[label]!.push(adj);
    });

    // Convert to array with config
    return Object.entries(groups)
      .map(([label, nodes]) => {
        const config = knowledgeConfig[label as NodeLabel];
        return {
          label: label as NodeLabel,
          nodes: nodes!,
          icon: config?.icon || FileText,
          color: config?.color || { bg: 'bg-slate-500/10', text: 'text-slate-400' },
        };
      })
      .sort((a, b) => {
        // Sort by predefined order
        const orderA = REFERENCE_TYPES.indexOf(a.label);
        const orderB = REFERENCE_TYPES.indexOf(b.label);
        return orderA - orderB;
      });
  }, [adjacencies]);

  // Loading state
  if (isLoading) {
    return (
      <div className={cn('', className)}>
        <h3 className="text-sm font-mono font-medium text-muted-foreground uppercase tracking-wider mb-3">
          References
        </h3>
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Loader2 className="w-4 h-4 animate-spin" />
          <span>Loading references...</span>
        </div>
      </div>
    );
  }

  // Empty state - hide section if no references
  if (groupedReferences.length === 0) {
    return null;
  }

  const totalCount = groupedReferences.reduce((sum, g) => sum + g.nodes.length, 0);

  return (
    <div className={cn('', className)}>
      {/* Header */}
      <h3 className="text-sm font-mono font-medium text-muted-foreground uppercase tracking-wider mb-3">
        References ({totalCount})
      </h3>

      {/* List of references grouped by type */}
      <div className="space-y-2">
        {groupedReferences.map((group) => (
          <div key={group.label}>
            {group.nodes.map((adj) => {
              const Icon = group.icon;
              const title = getNodeTitle(adj.node);
              const typeId = getNodeTypeId(adj.node);

              return (
                <button
                  key={adj.node.id}
                  onClick={() => onNavigate(adj.node.id)}
                  className={cn(
                    'w-full flex items-center gap-3 p-3 rounded-lg',
                    'border border-border',
                    'hover:bg-white/5 transition-colors text-left',
                    'mb-2 last:mb-0'
                  )}
                >
                  {/* Icon */}
                  <div className={cn('p-2 rounded-lg shrink-0', group.color.bg)}>
                    <Icon className={cn('w-4 h-4', group.color.text)} />
                  </div>

                  {/* Content */}
                  <div className="flex-1 min-w-0">
                    {typeId && (
                      <p className={cn('text-xs font-mono', group.color.text)}>
                        {typeId}
                      </p>
                    )}
                    <p className="text-sm text-foreground truncate">
                      {title}
                    </p>
                  </div>

                  {/* Navigate indicator */}
                  <ExternalLink className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
                </button>
              );
            })}
          </div>
        ))}
      </div>
    </div>
  );
}

export default ReferencesSection;
