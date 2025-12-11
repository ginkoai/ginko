/**
 * @fileType: component
 * @status: current
 * @updated: 2025-12-11
 * @tags: [graph, card, node, visualization]
 * @related: [tree-explorer.tsx, card-grid.tsx]
 * @priority: high
 * @complexity: medium
 * @dependencies: [lucide-react, framer-motion]
 */

'use client';

import { memo } from 'react';
import { motion } from 'framer-motion';
import {
  FileText,
  Target,
  Zap,
  AlertTriangle,
  CheckSquare,
  Calendar,
  GitBranch,
  ExternalLink,
  type LucideIcon,
} from 'lucide-react';
import type { GraphNode, NodeLabel } from '@/lib/graph/types';
import { CornerBrackets } from '@/components/ui/corner-brackets';
import { cn } from '@/lib/utils';

// =============================================================================
// Types
// =============================================================================

export interface NodeCardProps {
  node: GraphNode;
  isSelected?: boolean;
  onSelect?: (nodeId: string) => void;
  onViewDetails?: (nodeId: string) => void;
  className?: string;
  showCornerBrackets?: boolean;
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
  Event: { bg: 'bg-slate-500/10', text: 'text-slate-400', border: 'border-slate-500/30' },
  Session: { bg: 'bg-slate-500/10', text: 'text-slate-400', border: 'border-slate-500/30' },
  Commit: { bg: 'bg-slate-500/10', text: 'text-slate-400', border: 'border-slate-500/30' },
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

/**
 * Extract a clean description from node properties.
 * Handles cases where summary might just be a markdown header.
 */
function getNodeDescription(node: GraphNode): string | undefined {
  const props = node.properties as Record<string, unknown>;

  // Try direct description fields first
  const description = getNodeProp(props, 'description');
  if (description && !description.startsWith('#')) {
    return description;
  }

  // Check if summary is useful (not just a markdown header)
  const summary = getNodeProp(props, 'summary');
  if (summary && !summary.startsWith('#') && summary.length > 20) {
    return summary;
  }

  // Try other semantic fields
  const decision = getNodeProp(props, 'decision');
  if (decision) return decision;

  const goal = getNodeProp(props, 'goal');
  if (goal) return goal;

  const purpose = getNodeProp(props, 'purpose');
  if (purpose) return purpose;

  // For ADRs/docs with full content, extract first meaningful paragraph
  const content = getNodeProp(props, 'content');
  if (content) {
    return extractFirstParagraph(content);
  }

  const context = getNodeProp(props, 'context');
  if (context && !context.startsWith('#')) {
    return context;
  }

  return undefined;
}

/**
 * Extract the first meaningful paragraph from markdown content.
 * Skips frontmatter, headers, and empty lines.
 */
function extractFirstParagraph(content: string): string | undefined {
  const lines = content.split('\n');
  let inFrontmatter = false;
  let foundHeader = false;

  for (const line of lines) {
    const trimmed = line.trim();

    // Handle frontmatter
    if (trimmed === '---') {
      inFrontmatter = !inFrontmatter;
      continue;
    }
    if (inFrontmatter) continue;

    // Skip empty lines and headers
    if (!trimmed) continue;
    if (trimmed.startsWith('#')) {
      foundHeader = true;
      continue;
    }

    // Skip lines that look like metadata
    if (trimmed.startsWith('-') && trimmed.includes(':')) continue;
    if (trimmed.startsWith('*') && trimmed.includes(':')) continue;

    // Found a content paragraph after a header
    if (foundHeader && trimmed.length > 20) {
      // Truncate if too long
      return trimmed.length > 200 ? trimmed.slice(0, 197) + '...' : trimmed;
    }
  }

  return undefined;
}

function getNodeStatus(node: GraphNode): string | undefined {
  const props = node.properties as Record<string, unknown>;
  return getNodeProp(props, 'status');
}

// =============================================================================
// Status Badge
// =============================================================================

function StatusBadge({ status, label }: { status: string | undefined; label: NodeLabel }) {
  if (!status) return null;

  const statusConfig: Record<string, { color: string }> = {
    // Task statuses
    todo: { color: 'bg-slate-500/20 text-slate-400' },
    in_progress: { color: 'bg-ginko-500/20 text-ginko-400' },
    paused: { color: 'bg-amber-500/20 text-amber-400' },
    complete: { color: 'bg-emerald-500/20 text-emerald-400' },
    // ADR statuses
    proposed: { color: 'bg-blue-500/20 text-blue-400' },
    accepted: { color: 'bg-emerald-500/20 text-emerald-400' },
    deprecated: { color: 'bg-red-500/20 text-red-400' },
    superseded: { color: 'bg-orange-500/20 text-orange-400' },
    // Sprint/Epic statuses
    planning: { color: 'bg-blue-500/20 text-blue-400' },
    active: { color: 'bg-ginko-500/20 text-ginko-400' },
    'on-hold': { color: 'bg-amber-500/20 text-amber-400' },
    // Gotcha severity
    low: { color: 'bg-slate-500/20 text-slate-400' },
    medium: { color: 'bg-amber-500/20 text-amber-400' },
    high: { color: 'bg-orange-500/20 text-orange-400' },
    critical: { color: 'bg-red-500/20 text-red-400' },
    // Pattern confidence
    // low, medium, high already defined
  };

  const config = statusConfig[status] || { color: 'bg-slate-500/20 text-slate-400' };

  return (
    <span className={cn('text-[10px] px-1.5 py-0.5 rounded font-mono', config.color)}>
      {status.replace('_', ' ')}
    </span>
  );
}

// =============================================================================
// Component
// =============================================================================

function NodeCardComponent({
  node,
  isSelected = false,
  onSelect,
  onViewDetails,
  className,
  showCornerBrackets = false,
}: NodeCardProps) {
  const Icon = nodeIcons[node.label] || FileText;
  const colors = nodeColors[node.label] || nodeColors.Event;

  const title = getNodeTitle(node);
  const description = getNodeDescription(node);
  const status = getNodeStatus(node);

  const handleClick = () => {
    onSelect?.(node.id);
  };

  const handleViewDetails = (e: React.MouseEvent) => {
    e.stopPropagation();
    onViewDetails?.(node.id);
  };

  const cardContent = (
    <motion.div
      whileHover={{ scale: 1.01 }}
      whileTap={{ scale: 0.99 }}
      className={cn(
        'p-4 rounded-lg cursor-pointer transition-all',
        'bg-card border',
        isSelected ? 'border-ginko-500 ring-1 ring-ginko-500/30' : 'border-border hover:border-ginko-500/50',
        className
      )}
      onClick={handleClick}
    >
      {/* Header */}
      <div className="flex items-start gap-3">
        {/* Icon */}
        <div className={cn('p-2 rounded', colors.bg)}>
          <Icon className={cn('w-4 h-4', colors.text)} />
        </div>

        {/* Content */}
        <div className="flex-1 min-w-0">
          {/* Label Badge */}
          <div className="flex items-center gap-2 mb-1">
            <span className={cn('text-[10px] font-mono uppercase', colors.text)}>
              {node.label}
            </span>
            <StatusBadge status={status} label={node.label} />
          </div>

          {/* Title */}
          <h3 className="text-sm font-mono font-medium text-foreground truncate">
            {title}
          </h3>

          {/* Description */}
          {description && (
            <p className="mt-1 text-xs text-muted-foreground line-clamp-2">
              {description}
            </p>
          )}
        </div>

        {/* Actions */}
        {onViewDetails && (
          <button
            onClick={handleViewDetails}
            className="p-1 hover:bg-white/5 rounded transition-colors"
            aria-label="View details"
          >
            <ExternalLink className="w-4 h-4 text-muted-foreground" />
          </button>
        )}
      </div>

      {/* Footer - Type-specific info */}
      <NodeCardFooter node={node} colors={colors} />
    </motion.div>
  );

  if (showCornerBrackets) {
    return <CornerBrackets corners="all" size="sm">{cardContent}</CornerBrackets>;
  }

  return cardContent;
}

// =============================================================================
// Type-Specific Footer
// =============================================================================

function NodeCardFooter({
  node,
  colors,
}: {
  node: GraphNode;
  colors: { bg: string; text: string; border: string };
}) {
  const props = node.properties as Record<string, unknown>;

  // Sprint progress
  if (node.label === 'Sprint') {
    const progress = typeof props.progress === 'number' ? props.progress : undefined;
    if (progress !== undefined) {
      return (
        <div className="mt-3 pt-3 border-t border-border">
          <div className="flex items-center justify-between text-xs text-muted-foreground mb-1">
            <span>Progress</span>
            <span className="font-mono">{progress}%</span>
          </div>
          <div className="h-1.5 bg-muted rounded-full overflow-hidden">
            <div
              className={cn('h-full rounded-full', colors.bg.replace('/10', '/50'))}
              style={{ width: `${progress}%` }}
            />
          </div>
        </div>
      );
    }
  }

  // Pattern confidence
  if (node.label === 'Pattern') {
    const confidence = getNodeProp(props, 'confidence');
    const usageCount = typeof props.usage_count === 'number' ? props.usage_count : undefined;
    if (confidence || usageCount !== undefined) {
      return (
        <div className="mt-3 pt-3 border-t border-border flex items-center gap-3 text-xs text-muted-foreground">
          {confidence && (
            <span>
              Confidence: <span className="font-mono text-foreground">{confidence}</span>
            </span>
          )}
          {usageCount !== undefined && (
            <span>
              Uses: <span className="font-mono text-foreground">{usageCount}</span>
            </span>
          )}
        </div>
      );
    }
  }

  // Gotcha severity
  if (node.label === 'Gotcha') {
    const severity = getNodeProp(props, 'severity');
    const mitigation = getNodeProp(props, 'mitigation');
    if (severity || mitigation) {
      return (
        <div className="mt-3 pt-3 border-t border-border text-xs">
          {mitigation && (
            <p className="text-muted-foreground line-clamp-1">
              <span className="text-foreground">Mitigation:</span> {mitigation}
            </p>
          )}
        </div>
      );
    }
  }

  // Task assignee
  if (node.label === 'Task') {
    const assignee = getNodeProp(props, 'assignee');
    const priority = getNodeProp(props, 'priority');
    if (assignee || priority) {
      return (
        <div className="mt-3 pt-3 border-t border-border flex items-center gap-3 text-xs text-muted-foreground">
          {priority && (
            <span className={cn(
              'px-1.5 py-0.5 rounded font-mono',
              priority === 'critical' && 'bg-red-500/20 text-red-400',
              priority === 'high' && 'bg-orange-500/20 text-orange-400',
              priority === 'medium' && 'bg-amber-500/20 text-amber-400',
              priority === 'low' && 'bg-slate-500/20 text-slate-400',
            )}>
              {priority}
            </span>
          )}
          {assignee && <span className="truncate">@{assignee}</span>}
        </div>
      );
    }
  }

  return null;
}

// =============================================================================
// Export
// =============================================================================

export const NodeCard = memo(NodeCardComponent);
export default NodeCard;
