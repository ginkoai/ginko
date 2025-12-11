/**
 * @fileType: component
 * @status: current
 * @updated: 2025-12-11
 * @tags: [graph, detail, panel, adjacencies]
 * @related: [node-card.tsx, adjacency-list.tsx]
 * @priority: high
 * @complexity: high
 * @dependencies: [lucide-react, framer-motion, @tanstack/react-query]
 */

'use client';

import { useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  X,
  ChevronRight,
  FileText,
  Target,
  Zap,
  AlertTriangle,
  CheckSquare,
  Calendar,
  GitBranch,
  ExternalLink,
  ArrowUpRight,
  type LucideIcon,
} from 'lucide-react';
import { useNodeAdjacencies, useGraphNodes } from '@/lib/graph/hooks';
import type { GraphNode, NodeLabel, AdjacentNode } from '@/lib/graph/types';
import { AdjacencyList } from './adjacency-list';
import { cn } from '@/lib/utils';

// =============================================================================
// Types
// =============================================================================

export interface NodeDetailPanelProps {
  graphId: string;
  node: GraphNode | null;
  isOpen: boolean;
  onClose: () => void;
  onNavigate: (nodeId: string) => void;
  breadcrumbs?: { id: string; name: string }[];
  onBreadcrumbClick?: (nodeId: string) => void;
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
  Event: 'text-slate-400',
  Session: 'text-slate-400',
  Commit: 'text-slate-400',
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
    node.id
  );
}

// =============================================================================
// Component
// =============================================================================

export function NodeDetailPanel({
  graphId,
  node,
  isOpen,
  onClose,
  onNavigate,
  breadcrumbs = [],
  onBreadcrumbClick,
}: NodeDetailPanelProps) {
  // Fetch adjacencies when a node is selected
  const { data: adjacencies, isLoading: loadingAdjacencies } = useNodeAdjacencies(
    isOpen && node ? node.id : null,
    { graphId }
  );

  // Get icon and color
  const Icon = node ? nodeIcons[node.label] || FileText : FileText;
  const iconColor = node ? nodeColors[node.label] || 'text-slate-400' : 'text-slate-400';

  // Node properties
  const nodeProps = useMemo(() => {
    if (!node) return {};
    return node.properties as Record<string, unknown>;
  }, [node]);

  return (
    <AnimatePresence>
      {isOpen && node && (
        <motion.div
          initial={{ x: '100%', opacity: 0 }}
          animate={{ x: 0, opacity: 1 }}
          exit={{ x: '100%', opacity: 0 }}
          transition={{ type: 'spring', damping: 25, stiffness: 200 }}
          className="absolute inset-y-0 right-0 w-full max-w-md bg-card border-l border-border shadow-xl z-10 flex flex-col"
        >
          {/* Header */}
          <div className="p-4 border-b border-border">
            {/* Breadcrumbs */}
            {breadcrumbs.length > 0 && (
              <div className="flex items-center gap-1 text-xs text-muted-foreground mb-3">
                {breadcrumbs.map((crumb, index) => (
                  <span key={crumb.id} className="flex items-center gap-1">
                    {index > 0 && <ChevronRight className="w-3 h-3" />}
                    <button
                      onClick={() => onBreadcrumbClick?.(crumb.id)}
                      className="hover:text-foreground transition-colors"
                    >
                      {crumb.name}
                    </button>
                  </span>
                ))}
              </div>
            )}

            {/* Title Row */}
            <div className="flex items-start gap-3">
              {/* Icon */}
              <div className={cn('p-2 rounded bg-white/5', iconColor)}>
                <Icon className="w-5 h-5" />
              </div>

              {/* Title & Label */}
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <span className={cn('text-xs font-mono uppercase', iconColor)}>
                    {node.label}
                  </span>
                  {getNodeProp(nodeProps, 'status') && (
                    <StatusBadge status={getNodeProp(nodeProps, 'status')} />
                  )}
                </div>
                <h2 className="text-lg font-mono font-medium text-foreground truncate">
                  {getNodeTitle(node)}
                </h2>
              </div>

              {/* Close Button */}
              <button
                onClick={onClose}
                className="p-2 hover:bg-white/5 rounded transition-colors"
                aria-label="Close panel"
              >
                <X className="w-5 h-5 text-muted-foreground" />
              </button>
            </div>
          </div>

          {/* Content */}
          <div className="flex-1 overflow-auto p-4 space-y-6">
            {/* Description / Summary */}
            <NodeContentSection node={node} nodeProps={nodeProps} />

            {/* Properties */}
            <NodePropertiesSection node={node} nodeProps={nodeProps} />

            {/* Adjacencies */}
            <div>
              <h3 className="text-sm font-mono font-medium text-foreground mb-3">
                Related Nodes
              </h3>
              <AdjacencyList
                adjacencies={adjacencies?.adjacencies || []}
                isLoading={loadingAdjacencies}
                onNavigate={onNavigate}
              />
            </div>
          </div>

          {/* Footer */}
          <div className="p-4 border-t border-border">
            <div className="flex items-center justify-between text-xs text-muted-foreground">
              <span className="font-mono">ID: {node.id}</span>
              {nodeProps.created_at && (
                <span>Created: {formatDate(nodeProps.created_at as string)}</span>
              )}
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

// =============================================================================
// Content Section
// =============================================================================

function NodeContentSection({
  node,
  nodeProps,
}: {
  node: GraphNode;
  nodeProps: Record<string, unknown>;
}) {
  const description = getNodeProp(nodeProps, 'description');
  const summary = getNodeProp(nodeProps, 'summary');
  const decision = getNodeProp(nodeProps, 'decision');
  const consequences = getNodeProp(nodeProps, 'consequences');
  const goal = getNodeProp(nodeProps, 'goal');
  const mitigation = getNodeProp(nodeProps, 'mitigation');
  const contentProp = getNodeProp(nodeProps, 'content');
  const context = getNodeProp(nodeProps, 'context');
  const purpose = getNodeProp(nodeProps, 'purpose');

  // Extract meaningful content, handling cases where summary is just markdown headers
  const extractContent = (): string | undefined => {
    // Direct description if valid
    if (description && !description.startsWith('#')) return description;

    // Summary if valid (not just a header)
    if (summary && !summary.startsWith('#') && summary.length > 20) return summary;

    // Other semantic fields
    if (decision) return decision;
    if (goal) return goal;
    if (purpose) return purpose;

    // Extract from full content
    if (contentProp) {
      const lines = contentProp.split('\n');
      let inFrontmatter = false;
      let foundHeader = false;

      for (const line of lines) {
        const trimmed = line.trim();
        if (trimmed === '---') { inFrontmatter = !inFrontmatter; continue; }
        if (inFrontmatter) continue;
        if (!trimmed) continue;
        if (trimmed.startsWith('#')) { foundHeader = true; continue; }
        if (trimmed.startsWith('-') && trimmed.includes(':')) continue;
        if (foundHeader && trimmed.length > 20) {
          return trimmed.length > 300 ? trimmed.slice(0, 297) + '...' : trimmed;
        }
      }
    }

    if (context && !context.startsWith('#')) return context;
    return undefined;
  };

  const content = extractContent();

  if (!content && !consequences && !mitigation) {
    return null;
  }

  return (
    <div className="space-y-3">
      {content && (
        <div>
          <h3 className="text-sm font-mono font-medium text-foreground mb-2">
            {decision ? 'Decision' : goal ? 'Goal' : 'Description'}
          </h3>
          <p className="text-sm text-muted-foreground whitespace-pre-wrap">{content}</p>
        </div>
      )}

      {consequences && (
        <div>
          <h3 className="text-sm font-mono font-medium text-foreground mb-2">Consequences</h3>
          <p className="text-sm text-muted-foreground whitespace-pre-wrap">{consequences}</p>
        </div>
      )}

      {mitigation && (
        <div>
          <h3 className="text-sm font-mono font-medium text-foreground mb-2">Mitigation</h3>
          <p className="text-sm text-muted-foreground whitespace-pre-wrap">{mitigation}</p>
        </div>
      )}
    </div>
  );
}

// =============================================================================
// Properties Section
// =============================================================================

function NodePropertiesSection({
  node,
  nodeProps,
}: {
  node: GraphNode;
  nodeProps: Record<string, unknown>;
}) {
  // Define which properties to show based on node type
  const propertyKeys = useMemo(() => {
    const commonKeys = ['created_at', 'updated_at'];
    const excludeKeys = ['id', 'graph_id', 'graphId', 'title', 'name', 'description', 'summary', 'decision', 'consequences', 'goal', 'mitigation'];

    const typeSpecific: Record<NodeLabel, string[]> = {
      Project: [],
      Charter: ['purpose', 'goals', 'success_criteria'],
      Epic: ['epic_id', 'status'],
      Sprint: ['sprint_id', 'status', 'progress', 'start_date', 'end_date'],
      Task: ['task_id', 'status', 'priority', 'assignee'],
      ADR: ['adr_id', 'status'],
      PRD: ['prd_id', 'status'],
      Pattern: ['pattern_id', 'confidence', 'usage_count'],
      Gotcha: ['gotcha_id', 'severity'],
      Event: ['event_id', 'category', 'impact', 'user_id', 'files'],
      Session: ['session_id', 'user_id'],
      Commit: ['commit_id', 'author', 'message'],
    };

    const typeKeys = typeSpecific[node.label] || [];
    const allKeys = [...typeKeys, ...commonKeys];

    return allKeys.filter((key) => !excludeKeys.includes(key) && nodeProps[key] !== undefined);
  }, [node.label, nodeProps]);

  if (propertyKeys.length === 0) {
    return null;
  }

  return (
    <div>
      <h3 className="text-sm font-mono font-medium text-foreground mb-3">Properties</h3>
      <div className="space-y-2">
        {propertyKeys.map((key) => (
          <PropertyRow key={key} name={key} value={nodeProps[key]} />
        ))}
      </div>
    </div>
  );
}

function PropertyRow({ name, value }: { name: string; value: unknown }) {
  const displayValue = useMemo(() => {
    if (Array.isArray(value)) {
      return value.join(', ');
    }
    if (typeof value === 'object' && value !== null) {
      return JSON.stringify(value, null, 2);
    }
    if (typeof value === 'string' && (name.includes('date') || name === 'created_at' || name === 'updated_at')) {
      return formatDate(value);
    }
    return String(value);
  }, [name, value]);

  return (
    <div className="flex items-start justify-between gap-2 py-1 text-sm">
      <span className="text-muted-foreground font-mono">{formatPropertyName(name)}</span>
      <span className="text-foreground font-mono text-right truncate max-w-[60%]">{displayValue}</span>
    </div>
  );
}

// =============================================================================
// Status Badge
// =============================================================================

function StatusBadge({ status }: { status: string | undefined }) {
  if (!status) return null;

  const statusConfig: Record<string, string> = {
    todo: 'bg-slate-500/20 text-slate-400',
    in_progress: 'bg-ginko-500/20 text-ginko-400',
    paused: 'bg-amber-500/20 text-amber-400',
    complete: 'bg-emerald-500/20 text-emerald-400',
    proposed: 'bg-blue-500/20 text-blue-400',
    accepted: 'bg-emerald-500/20 text-emerald-400',
    deprecated: 'bg-red-500/20 text-red-400',
    superseded: 'bg-orange-500/20 text-orange-400',
    planning: 'bg-blue-500/20 text-blue-400',
    active: 'bg-ginko-500/20 text-ginko-400',
    'on-hold': 'bg-amber-500/20 text-amber-400',
    low: 'bg-slate-500/20 text-slate-400',
    medium: 'bg-amber-500/20 text-amber-400',
    high: 'bg-orange-500/20 text-orange-400',
    critical: 'bg-red-500/20 text-red-400',
  };

  const colorClass = statusConfig[status] || 'bg-slate-500/20 text-slate-400';

  return (
    <span className={cn('text-[10px] px-1.5 py-0.5 rounded font-mono', colorClass)}>
      {status.replace('_', ' ')}
    </span>
  );
}

// =============================================================================
// Helpers
// =============================================================================

function formatPropertyName(name: string): string {
  return name
    .replace(/_/g, ' ')
    .replace(/([a-z])([A-Z])/g, '$1 $2')
    .replace(/^./, (s) => s.toUpperCase());
}

function formatDate(dateStr: string): string {
  try {
    const date = new Date(dateStr);
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  } catch {
    return dateStr;
  }
}

// =============================================================================
// Export
// =============================================================================

export default NodeDetailPanel;
