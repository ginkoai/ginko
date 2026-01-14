/**
 * @fileType: component
 * @status: current
 * @updated: 2025-12-17
 * @tags: [graph, node-view, detail, c4-navigation]
 * @related: [RelatedNodesSummary.tsx, node-detail-panel.tsx, CategoryView.tsx]
 * @priority: high
 * @complexity: high
 * @dependencies: [lucide-react, @tanstack/react-query]
 */

'use client';

import { useMemo } from 'react';
import {
  FileText,
  Target,
  Zap,
  AlertTriangle,
  CheckSquare,
  Calendar,
  GitBranch,
  Lightbulb,
  Pencil,
  Loader2,
  Clock,
  User,
  ArrowLeft,
  type LucideIcon,
} from 'lucide-react';
import { useNodeAdjacencies, useParentNode } from '@/lib/graph/hooks';
import type { GraphNode, NodeLabel } from '@/lib/graph/types';
import { RelatedNodesSummary } from './RelatedNodesSummary';
import { MarkdownRenderer } from './MarkdownRenderer';
import { cn } from '@/lib/utils';

// =============================================================================
// Types
// =============================================================================

export interface NodeViewProps {
  graphId: string;
  node: GraphNode;
  onNavigate: (nodeId: string) => void;
  onEdit?: (nodeId: string) => void;
  className?: string;
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

const nodeColors: Record<NodeLabel, { bg: string; text: string; border: string }> = {
  Project: { bg: 'bg-ginko-500/10', text: 'text-ginko-400', border: 'border-ginko-500/30' },
  Charter: { bg: 'bg-blue-500/10', text: 'text-blue-400', border: 'border-blue-500/30' },
  Epic: { bg: 'bg-purple-500/10', text: 'text-purple-400', border: 'border-purple-500/30' },
  Sprint: { bg: 'bg-cyan-500/10', text: 'text-cyan-400', border: 'border-cyan-500/30' },
  Task: { bg: 'bg-ginko-500/10', text: 'text-ginko-400', border: 'border-ginko-500/30' },
  ADR: { bg: 'bg-amber-500/10', text: 'text-amber-400', border: 'border-amber-500/30' },
  PRD: { bg: 'bg-orange-500/10', text: 'text-orange-400', border: 'border-orange-500/30' },
  Pattern: { bg: 'bg-emerald-500/10', text: 'text-emerald-400', border: 'border-emerald-500/30' },
  Gotcha: { bg: 'bg-red-500/10', text: 'text-red-400', border: 'border-red-500/30' },
  Principle: { bg: 'bg-indigo-500/10', text: 'text-indigo-400', border: 'border-indigo-500/30' },
  Event: { bg: 'bg-slate-500/10', text: 'text-slate-400', border: 'border-slate-500/30' },
  Session: { bg: 'bg-slate-500/10', text: 'text-slate-400', border: 'border-slate-500/30' },
  Commit: { bg: 'bg-slate-500/10', text: 'text-slate-400', border: 'border-slate-500/30' },
};

const statusColors: Record<string, string> = {
  complete: 'bg-emerald-500/20 text-emerald-400',
  in_progress: 'bg-ginko-500/20 text-ginko-400',
  paused: 'bg-amber-500/20 text-amber-400',
  todo: 'bg-slate-500/20 text-slate-400',
  accepted: 'bg-emerald-500/20 text-emerald-400',
  proposed: 'bg-blue-500/20 text-blue-400',
  deprecated: 'bg-red-500/20 text-red-400',
  superseded: 'bg-orange-500/20 text-orange-400',
  active: 'bg-ginko-500/20 text-ginko-400',
  planning: 'bg-blue-500/20 text-blue-400',
  high: 'bg-emerald-500/20 text-emerald-400',
  medium: 'bg-amber-500/20 text-amber-400',
  low: 'bg-slate-500/20 text-slate-400',
  critical: 'bg-red-500/20 text-red-400',
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

function getNodeId(node: GraphNode): string | undefined {
  const props = node.properties as Record<string, unknown>;
  return (
    getNodeProp(props, 'adr_id') ||
    getNodeProp(props, 'epic_id') ||
    getNodeProp(props, 'sprint_id') ||
    getNodeProp(props, 'task_id') ||
    getNodeProp(props, 'pattern_id') ||
    getNodeProp(props, 'gotcha_id') ||
    getNodeProp(props, 'principle_id')
  );
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

/**
 * Check if value is a Neo4j temporal type (date/datetime)
 * Neo4j returns dates as: { year: { low: 2025, high: 0 }, month: { low: 12, high: 0 }, day: { low: 17, high: 0 }, ... }
 */
function isNeo4jTemporal(value: unknown): boolean {
  if (typeof value !== 'object' || value === null) return false;
  const obj = value as Record<string, unknown>;
  // Check for Neo4j Integer format in year field
  if (obj.year && typeof obj.year === 'object') {
    const year = obj.year as Record<string, unknown>;
    return 'low' in year && 'high' in year;
  }
  return false;
}

/**
 * Format Neo4j temporal type to readable date string
 */
function formatNeo4jTemporal(value: unknown): string {
  try {
    const obj = value as Record<string, Record<string, number>>;
    const year = obj.year?.low || 0;
    const month = obj.month?.low || 1;
    const day = obj.day?.low || 1;
    const hour = obj.hour?.low || 0;
    const minute = obj.minute?.low || 0;

    const date = new Date(year, month - 1, day, hour, minute);

    // If time components exist, show datetime
    if (obj.hour) {
      return date.toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
        hour: 'numeric',
        minute: '2-digit',
      });
    }

    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  } catch {
    return String(value);
  }
}

/**
 * Format a property value for display, handling special types
 */
function formatPropertyValue(value: unknown): string {
  if (value === null || value === undefined) return '';

  // Handle Neo4j temporal types
  if (isNeo4jTemporal(value)) {
    return formatNeo4jTemporal(value);
  }

  // Handle arrays
  if (Array.isArray(value)) {
    return value.join(', ');
  }

  // Handle other objects
  if (typeof value === 'object') {
    // Check if it's a Neo4j Integer (has low/high)
    const obj = value as Record<string, unknown>;
    if ('low' in obj && 'high' in obj) {
      return String(obj.low);
    }
    return JSON.stringify(value);
  }

  return String(value);
}

// =============================================================================
// Content Sections
// =============================================================================

function NodeHeader({
  node,
  colors,
  Icon,
  onEdit,
}: {
  node: GraphNode;
  colors: { bg: string; text: string; border: string };
  Icon: LucideIcon;
  onEdit?: (nodeId: string) => void;
}) {
  const props = node.properties as Record<string, unknown>;
  const title = getNodeTitle(node);
  const nodeId = getNodeId(node);
  const status = getNodeProp(props, 'status') || getNodeProp(props, 'severity') || getNodeProp(props, 'confidence');

  return (
    <div className={cn('p-6 rounded-xl border', colors.bg, colors.border)}>
      <div className="flex items-start gap-4">
        {/* Icon */}
        <div className={cn('p-3 rounded-lg', colors.bg)}>
          <Icon className={cn('w-6 h-6', colors.text)} />
        </div>

        {/* Content */}
        <div className="flex-1 min-w-0">
          {/* Label + ID + Status */}
          <div className="flex items-center gap-2 mb-1">
            <span className={cn('text-xs font-mono uppercase', colors.text)}>
              {node.label}
            </span>
            {nodeId && (
              <span className="text-xs font-mono text-muted-foreground">
                {nodeId}
              </span>
            )}
            {status && (
              <span className={cn(
                'text-xs px-2 py-0.5 rounded-full font-mono',
                statusColors[status] || 'bg-slate-500/20 text-slate-400'
              )}>
                {status.replace('_', ' ')}
              </span>
            )}
          </div>

          {/* Title */}
          <h1 className="text-xl font-semibold text-foreground">
            {title}
          </h1>

          {/* Metadata row */}
          <div className="flex items-center gap-4 mt-3 text-xs text-muted-foreground">
            {props.assignee && (
              <span className="flex items-center gap-1">
                <User className="w-3.5 h-3.5" />
                {props.assignee as string}
              </span>
            )}
            {props.created_at && (
              <span className="flex items-center gap-1">
                <Clock className="w-3.5 h-3.5" />
                {formatDate(props.created_at as string)}
              </span>
            )}
          </div>
        </div>

        {/* Edit button */}
        {onEdit && (
          <button
            onClick={() => onEdit(node.id)}
            className="p-2 hover:bg-white/10 rounded-lg transition-colors"
            aria-label="Edit node"
          >
            <Pencil className="w-4 h-4 text-muted-foreground" />
          </button>
        )}
      </div>
    </div>
  );
}

function NodeContent({ node }: { node: GraphNode }) {
  const props = node.properties as Record<string, unknown>;

  // Get content fields based on node type
  const content = getNodeProp(props, 'content'); // Full document content
  const description = getNodeProp(props, 'description');
  const summary = getNodeProp(props, 'summary');
  const context = getNodeProp(props, 'context');
  const decision = getNodeProp(props, 'decision');
  const consequences = getNodeProp(props, 'consequences');
  const purpose = getNodeProp(props, 'purpose');
  const theory = getNodeProp(props, 'theory');
  const mitigation = getNodeProp(props, 'mitigation');
  const goal = getNodeProp(props, 'goal');
  const overview = getNodeProp(props, 'overview'); // PRD field
  const requirements = getNodeProp(props, 'requirements'); // PRD field
  const successCriteria = getNodeProp(props, 'success_criteria'); // PRD field

  const sections: { label: string; content: string }[] = [];

  // Full content first if available (for ADRs/PRDs with complete markdown)
  if (content) sections.push({ label: 'Content', content: content });
  if (description) sections.push({ label: 'Description', content: description });
  if (summary) sections.push({ label: 'Summary', content: summary });
  if (overview) sections.push({ label: 'Overview', content: overview });
  if (purpose) sections.push({ label: 'Purpose', content: purpose });
  if (goal) sections.push({ label: 'Goal', content: goal });
  if (context) sections.push({ label: 'Context', content: context });
  if (decision) sections.push({ label: 'Decision', content: decision });
  if (consequences) sections.push({ label: 'Consequences', content: consequences });
  if (requirements) sections.push({ label: 'Requirements', content: requirements });
  if (successCriteria) sections.push({ label: 'Success Criteria', content: successCriteria });
  if (theory) sections.push({ label: 'Theory', content: theory });
  if (mitigation) sections.push({ label: 'Mitigation', content: mitigation });

  if (sections.length === 0) {
    return null;
  }

  return (
    <div className="space-y-6">
      {sections.map((section) => (
        <div key={section.label}>
          <h3 className="text-sm font-mono font-medium text-muted-foreground uppercase tracking-wider mb-2">
            {section.label}
          </h3>
          <MarkdownRenderer content={section.content} />
        </div>
      ))}
    </div>
  );
}

function NodeProperties({ node }: { node: GraphNode }) {
  const props = node.properties as Record<string, unknown>;

  // Filter out content fields and internal fields
  const skipFields = new Set([
    'id', 'graph_id', 'created_at', 'updated_at',
    'title', 'name', 'description', 'summary', 'content',
    'context', 'decision', 'consequences', 'purpose', 'theory',
    'mitigation', 'goal', 'status', 'severity', 'confidence',
    'adr_id', 'epic_id', 'sprint_id', 'task_id', 'pattern_id',
    'gotcha_id', 'principle_id', 'prd_id', 'assignee',
    'overview', 'requirements', 'success_criteria', // PRD fields
  ]);

  const displayProps = Object.entries(props).filter(
    ([key, value]) => !skipFields.has(key) && value !== null && value !== undefined
  );

  // Filter out empty formatted values
  const formattedProps = displayProps
    .map(([key, value]) => ({ key, value, formatted: formatPropertyValue(value) }))
    .filter(({ formatted }) => formatted && formatted !== '');

  if (formattedProps.length === 0) {
    return null;
  }

  return (
    <div>
      <h3 className="text-sm font-mono font-medium text-muted-foreground uppercase tracking-wider mb-3">
        Properties
      </h3>
      <div className="grid grid-cols-2 gap-3">
        {formattedProps.map(({ key, formatted }) => (
          <div key={key} className="p-3 bg-card border border-border rounded-lg">
            <p className="text-xs text-muted-foreground mb-1">
              {key.replace(/_/g, ' ')}
            </p>
            <p className="text-sm text-foreground font-mono truncate" title={formatted}>
              {formatted}
            </p>
          </div>
        ))}
      </div>
    </div>
  );
}

// =============================================================================
// Parent Link Component
// =============================================================================

function ParentLink({
  parentNode,
  isLoading,
  onNavigate,
}: {
  parentNode: GraphNode | null | undefined;
  isLoading: boolean;
  onNavigate: (nodeId: string) => void;
}) {
  if (isLoading) {
    return (
      <div className="flex items-center gap-2 text-sm text-muted-foreground mb-4">
        <Loader2 className="w-4 h-4 animate-spin" />
        <span>Loading parent...</span>
      </div>
    );
  }

  if (!parentNode) {
    return null;
  }

  const props = parentNode.properties as Record<string, unknown>;
  const parentTitle = getNodeTitle(parentNode);
  const parentTypeId = getNodeId(parentNode);
  const colors = nodeColors[parentNode.label] || nodeColors.Event;
  const Icon = nodeIcons[parentNode.label] || FileText;

  return (
    <button
      onClick={() => onNavigate(parentNode.id)}
      className={cn(
        'flex items-center gap-2 px-3 py-2 rounded-lg mb-4',
        'text-sm font-medium transition-colors',
        'hover:bg-white/10 border',
        colors.border,
        colors.text
      )}
    >
      <ArrowLeft className="w-4 h-4" />
      <Icon className="w-4 h-4" />
      <span>Parent:</span>
      <span className="font-mono">{parentTypeId || parentNode.label}</span>
      {parentTitle && parentTitle !== parentTypeId && (
        <span className="text-muted-foreground truncate max-w-[200px]">
          — {parentTitle}
        </span>
      )}
    </button>
  );
}

// =============================================================================
// Component
// =============================================================================

export function NodeView({
  graphId,
  node,
  onNavigate,
  onEdit,
  className,
}: NodeViewProps) {
  // Fetch adjacencies
  const { data: adjacencies, isLoading: loadingAdjacencies } = useNodeAdjacencies(
    node.id,
    { graphId }
  );

  // Fetch parent node (for Tasks and Sprints)
  const { data: parentNode, isLoading: loadingParent } = useParentNode(
    node,
    { graphId }
  );

  const Icon = nodeIcons[node.label] || FileText;
  const colors = nodeColors[node.label] || nodeColors.Event;

  return (
    <div className={cn('p-6 space-y-6 max-w-4xl mx-auto', className)}>
      {/* Parent Link (for Tasks and Sprints) */}
      <ParentLink
        parentNode={parentNode}
        isLoading={loadingParent}
        onNavigate={onNavigate}
      />

      {/* Header Card */}
      <NodeHeader
        node={node}
        colors={colors}
        Icon={Icon}
        onEdit={onEdit}
      />

      {/* Content */}
      <NodeContent node={node} />

      {/* Properties */}
      <NodeProperties node={node} />

      {/* Related Nodes */}
      <div>
        <h3 className="text-sm font-mono font-medium text-muted-foreground uppercase tracking-wider mb-3">
          Related Nodes
        </h3>
        <RelatedNodesSummary
          adjacencies={adjacencies?.adjacencies || []}
          onNavigate={onNavigate}
          isLoading={loadingAdjacencies}
        />
      </div>

      {/* Footer */}
      <div className="pt-4 border-t border-border">
        <p className="text-xs text-muted-foreground font-mono">
          Node ID: {node.id}
        </p>
      </div>
    </div>
  );
}

// =============================================================================
// Export
// =============================================================================

export default NodeView;
