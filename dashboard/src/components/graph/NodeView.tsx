/**
 * @fileType: component
 * @status: current
 * @updated: 2026-01-16
 * @tags: [graph, node-view, detail, c4-navigation, accessibility, a11y]
 * @related: [RelatedNodesSummary.tsx, node-detail-panel.tsx, CategoryView.tsx]
 * @priority: high
 * @complexity: high
 * @dependencies: [lucide-react, @tanstack/react-query]
 */

'use client';

import { useMemo, useState } from 'react';
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
  ChevronDown,
  ChevronRight,
  type LucideIcon,
} from 'lucide-react';
import { useNodeAdjacencies, useParentNode, useChildNodes, useReferencedNodes } from '@/lib/graph/hooks';
import { getChildInfo } from '@/lib/graph/api-client';
import type { GraphNode, NodeLabel } from '@/lib/graph/types';
import { RelatedNodesSummary } from './RelatedNodesSummary';
import { ChildrenSection } from './ChildrenSection';
import { ReferencesSection } from './ReferencesSection';
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
 * Format a date as relative time (e.g., "2 hours ago")
 * Handles both string dates and Neo4j DateTime objects
 */
function formatRelativeTime(dateValue: unknown): string {
  try {
    let date: Date;

    // Handle Neo4j DateTime objects
    if (isNeo4jTemporal(dateValue)) {
      const neo4jDate = dateValue as Record<string, { low: number }>;
      date = new Date(
        neo4jDate.year?.low || 0,
        (neo4jDate.month?.low || 1) - 1,
        neo4jDate.day?.low || 1,
        neo4jDate.hour?.low || 0,
        neo4jDate.minute?.low || 0,
        neo4jDate.second?.low || 0
      );
    } else if (typeof dateValue === 'string') {
      date = new Date(dateValue);
    } else {
      return '';
    }

    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMinutes = Math.floor(diffMs / 60000);

    if (diffMinutes < 1) {
      return 'just now';
    } else if (diffMinutes < 60) {
      return `${diffMinutes}m ago`;
    } else if (diffMinutes < 1440) {
      const hours = Math.floor(diffMinutes / 60);
      return `${hours}h ago`;
    } else {
      const days = Math.floor(diffMinutes / 1440);
      return `${days}d ago`;
    }
  } catch {
    return '';
  }
}

/**
 * Format editedBy field for display
 */
function formatEditedBy(editedBy: string): string {
  // Handle user_xxx format (legacy)
  if (editedBy.startsWith('user_')) {
    return editedBy.substring(5, 13);
  }
  // Return as-is (email or other identifier)
  return editedBy;
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
    <header className={cn('p-6 rounded-xl border', colors.bg, colors.border)}>
      <div className="flex items-start gap-4">
        {/* Icon (decorative) */}
        <div className={cn('p-3 rounded-lg', colors.bg)} aria-hidden="true">
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
              <span
                className={cn(
                  'text-xs px-2 py-0.5 rounded-full font-mono',
                  statusColors[status] || 'bg-slate-500/20 text-slate-400'
                )}
                role="status"
                aria-label={`Status: ${status.replace('_', ' ')}`}
              >
                {status.replace('_', ' ')}
              </span>
            )}
          </div>

          {/* Title - h1 for the main page heading */}
          <h1 className="text-xl font-semibold text-foreground">
            {title}
          </h1>

          {/* Metadata row */}
          <div className="flex items-center gap-4 mt-3 text-xs text-muted-foreground" aria-label="Node metadata">
            {props.assignee && (
              <span className="flex items-center gap-1">
                <User className="w-3.5 h-3.5" aria-hidden="true" />
                <span className="sr-only">Assigned to: </span>
                {props.assignee as string}
              </span>
            )}
            {props.created_at && (
              <span className="flex items-center gap-1">
                <Clock className="w-3.5 h-3.5" aria-hidden="true" />
                <span className="sr-only">Created: </span>
                {formatDate(props.created_at as string)}
              </span>
            )}
            {props.editedAt && (
              <span className="flex items-center gap-1">
                <Pencil className="w-3.5 h-3.5" aria-hidden="true" />
                <span className="sr-only">Last edited: </span>
                Edited {formatRelativeTime(props.editedAt)}
                {props.editedBy && ` by ${formatEditedBy(props.editedBy as string)}`}
              </span>
            )}
          </div>
        </div>

        {/* Edit button */}
        {onEdit && (
          <button
            onClick={() => onEdit(node.id)}
            className="p-2 hover:bg-white/10 rounded-lg transition-colors focus:outline-none focus:ring-2 focus:ring-ginko-500"
            aria-label={`Edit ${node.label}: ${title}`}
            data-onboarding="edit-button"
          >
            <Pencil className="w-4 h-4 text-muted-foreground" aria-hidden="true" />
          </button>
        )}
      </div>
    </header>
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
  const approach = getNodeProp(props, 'approach'); // Task approach (e014_s02_t04)
  const overview = getNodeProp(props, 'overview'); // PRD field
  const requirements = getNodeProp(props, 'requirements'); // PRD field
  const successCriteria = getNodeProp(props, 'success_criteria'); // PRD field

  // Task-specific: acceptance_criteria is an array (e014_s02_t05)
  const acceptanceCriteria = props.acceptance_criteria as string[] | undefined;

  const sections: { label: string; content: string }[] = [];

  // Full content first if available (for ADRs/PRDs with complete markdown)
  if (content) sections.push({ label: 'Content', content: content });
  if (description) sections.push({ label: 'Description', content: description });
  if (summary) sections.push({ label: 'Summary', content: summary });
  if (overview) sections.push({ label: 'Overview', content: overview });
  if (purpose) sections.push({ label: 'Purpose', content: purpose });
  if (goal) sections.push({ label: 'Goal', content: goal });
  if (approach) sections.push({ label: 'Approach', content: approach }); // e014_s02_t04
  if (context) sections.push({ label: 'Context', content: context });
  if (decision) sections.push({ label: 'Decision', content: decision });
  if (consequences) sections.push({ label: 'Consequences', content: consequences });
  if (requirements) sections.push({ label: 'Requirements', content: requirements });
  if (successCriteria) sections.push({ label: 'Success Criteria', content: successCriteria });
  if (theory) sections.push({ label: 'Theory', content: theory });
  if (mitigation) sections.push({ label: 'Mitigation', content: mitigation });

  // Check if we have any content (sections or acceptance criteria)
  const hasContent = sections.length > 0 || (acceptanceCriteria && acceptanceCriteria.length > 0);

  if (!hasContent) {
    return null;
  }

  return (
    <section className="space-y-6" aria-label="Node content">
      {sections.map((section) => (
        <article key={section.label}>
          <h2 className="text-sm font-mono font-medium text-muted-foreground uppercase tracking-wider mb-2">
            {section.label}
          </h2>
          <MarkdownRenderer content={section.content} />
        </article>
      ))}

      {/* Acceptance Criteria - Task-specific (e014_s02_t05) */}
      {acceptanceCriteria && acceptanceCriteria.length > 0 && (
        <article>
          <h2 className="text-sm font-mono font-medium text-muted-foreground uppercase tracking-wider mb-2">
            Acceptance Criteria
          </h2>
          <ul className="space-y-2" role="list">
            {acceptanceCriteria.map((criterion, idx) => (
              <li key={idx} className="flex items-start gap-2 text-sm text-foreground">
                <span className="text-muted-foreground select-none" aria-hidden="true">☐</span>
                <span>{criterion}</span>
              </li>
            ))}
          </ul>
        </article>
      )}
    </section>
  );
}

function NodeProperties({ node }: { node: GraphNode }) {
  const [isExpanded, setIsExpanded] = useState(false);
  const props = node.properties as Record<string, unknown>;

  // Filter out content fields and internal fields
  const skipFields = new Set([
    'id', 'graph_id', 'created_at', 'updated_at',
    'title', 'name', 'description', 'summary', 'content',
    'context', 'decision', 'consequences', 'purpose', 'theory',
    'mitigation', 'goal', 'approach', 'status', 'severity', 'confidence',
    'adr_id', 'epic_id', 'sprint_id', 'task_id', 'pattern_id',
    'gotcha_id', 'principle_id', 'prd_id', 'assignee',
    'overview', 'requirements', 'success_criteria', // PRD fields
    'acceptance_criteria', // Task field (e014_s02_t05)
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
    <section aria-label="Node properties">
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="flex items-center gap-2 text-sm font-mono font-medium text-muted-foreground uppercase tracking-wider mb-3 hover:text-foreground transition-colors focus:outline-none focus:ring-2 focus:ring-ginko-500 rounded"
        aria-expanded={isExpanded}
        aria-controls="node-properties-content"
      >
        {isExpanded ? (
          <ChevronDown className="w-4 h-4" aria-hidden="true" />
        ) : (
          <ChevronRight className="w-4 h-4" aria-hidden="true" />
        )}
        <h2 className="text-sm font-mono font-medium uppercase tracking-wider">
          Properties ({formattedProps.length})
        </h2>
      </button>
      {isExpanded && (
        <div id="node-properties-content" className="grid grid-cols-2 gap-3" role="list" aria-label="Property list">
          {formattedProps.map(({ key, formatted }) => (
            <div key={key} className="p-3 bg-card border border-border rounded-lg" role="listitem">
              <p className="text-xs text-muted-foreground mb-1">
                {key.replace(/_/g, ' ')}
              </p>
              <p className="text-sm text-foreground font-mono truncate" title={formatted}>
                {formatted}
              </p>
            </div>
          ))}
        </div>
      )}
    </section>
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
    <nav aria-label="Parent navigation" className="mb-4">
      <button
        onClick={() => onNavigate(parentNode.id)}
        className={cn(
          'flex items-center gap-2 px-3 py-2 rounded-lg',
          'text-sm font-medium transition-colors',
          'hover:bg-white/10 border',
          'focus:outline-none focus:ring-2 focus:ring-ginko-500',
          colors.border,
          colors.text
        )}
        aria-label={`Navigate to parent: ${parentTitle}`}
      >
        <ArrowLeft className="w-4 h-4" aria-hidden="true" />
        <Icon className="w-4 h-4" aria-hidden="true" />
        <span>Parent:</span>
        <span className="font-mono">{parentTypeId || parentNode.label}</span>
        {parentTitle && parentTitle !== parentTypeId && (
          <span className="text-muted-foreground truncate max-w-[200px]">
            - {parentTitle}
          </span>
        )}
      </button>
    </nav>
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

  // Fetch child nodes (for Epics and Sprints)
  const { data: childNodes, isLoading: loadingChildren } = useChildNodes(
    node,
    { graphId }
  );

  // Fetch referenced nodes (ADRs, Patterns, Gotchas)
  const { data: references, isLoading: loadingReferences } = useReferencedNodes(
    node.id,
    { graphId }
  );

  // Determine child type for display
  const childInfo = getChildInfo(node);

  const Icon = nodeIcons[node.label] || FileText;
  const colors = nodeColors[node.label] || nodeColors.Event;

  return (
    <article
      className={cn('p-6 space-y-6 max-w-4xl mx-auto', className)}
      id="main-content"
      aria-labelledby="node-title"
    >
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

      {/* Children Section (for Epics and Sprints) - collapsible, below metadata */}
      {childInfo && (
        <ChildrenSection
          children={childNodes || []}
          childType={childInfo.type}
          isLoading={loadingChildren}
          onNavigate={onNavigate}
          defaultExpanded={true}
        />
      )}

      {/* Content */}
      <NodeContent node={node} />

      {/* References Section (ADRs, Patterns, Gotchas) */}
      <ReferencesSection
        adjacencies={references?.adjacencies || []}
        isLoading={loadingReferences}
        onNavigate={onNavigate}
      />

      {/* Properties (collapsible) */}
      <NodeProperties node={node} />

      {/* Related Nodes */}
      <section aria-label="Related nodes">
        <h2 className="text-sm font-mono font-medium text-muted-foreground uppercase tracking-wider mb-3">
          Related Nodes
        </h2>
        <RelatedNodesSummary
          adjacencies={adjacencies?.adjacencies || []}
          onNavigate={onNavigate}
          isLoading={loadingAdjacencies}
        />
      </section>

      {/* Footer */}
      <footer className="pt-4 border-t border-border">
        <p className="text-xs text-muted-foreground font-mono">
          Node ID: {node.id}
        </p>
      </footer>
    </article>
  );
}

// =============================================================================
// Export
// =============================================================================

export default NodeView;
