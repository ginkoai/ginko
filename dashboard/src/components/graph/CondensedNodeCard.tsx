/**
 * @fileType: component
 * @status: current
 * @updated: 2025-12-17
 * @tags: [graph, card, condensed, c4-navigation]
 * @related: [CategoryView.tsx, node-card.tsx, SummaryCard.tsx]
 * @priority: high
 * @complexity: low
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
  Lightbulb,
  ExternalLink,
  Pencil,
  type LucideIcon,
} from 'lucide-react';
import type { GraphNode, NodeLabel } from '@/lib/graph/types';
import { cn } from '@/lib/utils';

// =============================================================================
// Types
// =============================================================================

export interface CondensedNodeCardProps {
  node: GraphNode;
  isSelected?: boolean;
  onSelect?: (nodeId: string) => void;
  onViewDetails?: (nodeId: string) => void;
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

// Status badge colors
const statusColors: Record<string, string> = {
  // Task statuses
  complete: 'bg-emerald-500/20 text-emerald-400',
  in_progress: 'bg-ginko-500/20 text-ginko-400',
  paused: 'bg-amber-500/20 text-amber-400',
  todo: 'bg-slate-500/20 text-slate-400',
  // ADR statuses
  accepted: 'bg-emerald-500/20 text-emerald-400',
  proposed: 'bg-blue-500/20 text-blue-400',
  deprecated: 'bg-red-500/20 text-red-400',
  superseded: 'bg-orange-500/20 text-orange-400',
  // Sprint/Epic statuses
  active: 'bg-ginko-500/20 text-ginko-400',
  planning: 'bg-blue-500/20 text-blue-400',
  'on-hold': 'bg-amber-500/20 text-amber-400',
  // Severity/confidence
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

function getNodeStatus(node: GraphNode): string | undefined {
  const props = node.properties as Record<string, unknown>;
  return getNodeProp(props, 'status') || getNodeProp(props, 'severity') || getNodeProp(props, 'confidence');
}

function getNodeMetadata(node: GraphNode): string | undefined {
  const props = node.properties as Record<string, unknown>;

  // Priority for tasks
  const priority = getNodeProp(props, 'priority');
  if (priority) return `Priority: ${priority}`;

  // Progress for sprints
  const progress = props.progress;
  if (typeof progress === 'number') return `${progress}% complete`;

  // Confidence for patterns
  const confidence = getNodeProp(props, 'confidence');
  if (node.label === 'Pattern' && confidence) return `Confidence: ${confidence}`;

  // Severity for gotchas
  const severity = getNodeProp(props, 'severity');
  if (node.label === 'Gotcha' && severity) return `Severity: ${severity}`;

  return undefined;
}

// =============================================================================
// Component
// =============================================================================

function CondensedNodeCardComponent({
  node,
  isSelected = false,
  onSelect,
  onViewDetails,
  onEdit,
  className,
}: CondensedNodeCardProps) {
  const Icon = nodeIcons[node.label] || FileText;
  const colors = nodeColors[node.label] || nodeColors.Event;

  const title = getNodeTitle(node);
  const nodeId = getNodeId(node);
  const status = getNodeStatus(node);
  const metadata = getNodeMetadata(node);

  const handleClick = () => {
    onSelect?.(node.id);
  };

  const handleViewDetails = (e: React.MouseEvent) => {
    e.stopPropagation();
    onViewDetails?.(node.id);
  };

  const handleEdit = (e: React.MouseEvent) => {
    e.stopPropagation();
    onEdit?.(node.id);
  };

  return (
    <motion.div
      whileHover={{ scale: 1.01 }}
      whileTap={{ scale: 0.99 }}
      onClick={handleClick}
      className={cn(
        'group p-3 rounded-lg cursor-pointer transition-all',
        'bg-card border',
        isSelected
          ? 'border-ginko-500 ring-1 ring-ginko-500/30'
          : 'border-border hover:border-ginko-500/50',
        className
      )}
    >
      <div className="flex items-start gap-3">
        {/* Icon */}
        <div className={cn('p-2 rounded-lg shrink-0', colors.bg)}>
          <Icon className={cn('w-4 h-4', colors.text)} />
        </div>

        {/* Content */}
        <div className="flex-1 min-w-0">
          {/* ID + Status Row */}
          <div className="flex items-center gap-2 mb-0.5">
            {nodeId && (
              <span className={cn('text-[10px] font-mono', colors.text)}>
                {nodeId}
              </span>
            )}
            {status && (
              <span className={cn(
                'text-[10px] px-1.5 py-0.5 rounded font-mono',
                statusColors[status] || 'bg-slate-500/20 text-slate-400'
              )}>
                {status.replace('_', ' ')}
              </span>
            )}
          </div>

          {/* Title */}
          <h4 className="text-sm font-medium text-foreground line-clamp-2">
            {title}
          </h4>

          {/* Metadata */}
          {metadata && (
            <p className="text-xs text-muted-foreground mt-0.5 truncate">
              {metadata}
            </p>
          )}
        </div>

        {/* Actions (visible on hover) */}
        <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
          {onEdit && (
            <button
              onClick={handleEdit}
              className="p-1.5 hover:bg-white/5 rounded transition-colors"
              aria-label="Edit node"
            >
              <Pencil className="w-3.5 h-3.5 text-muted-foreground" />
            </button>
          )}
          {onViewDetails && (
            <button
              onClick={handleViewDetails}
              className="p-1.5 hover:bg-white/5 rounded transition-colors"
              aria-label="View details"
            >
              <ExternalLink className="w-3.5 h-3.5 text-muted-foreground" />
            </button>
          )}
        </div>
      </div>
    </motion.div>
  );
}

// =============================================================================
// Export
// =============================================================================

export const CondensedNodeCard = memo(CondensedNodeCardComponent);
export default CondensedNodeCard;
