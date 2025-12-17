/**
 * @fileType: component
 * @status: current
 * @updated: 2025-12-17
 * @tags: [graph, summary, card, c4-navigation]
 * @related: [ProjectView.tsx, CategoryView.tsx, node-card.tsx]
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
  type LucideIcon,
} from 'lucide-react';
import type { NodeLabel } from '@/lib/graph/types';
import { cn } from '@/lib/utils';

// =============================================================================
// Types
// =============================================================================

export interface SummaryCardProps {
  label: NodeLabel;
  count: number;
  /** Status breakdown for the preview bar, e.g., { complete: 3, in_progress: 1, todo: 2 } */
  statusBreakdown?: Record<string, number>;
  onClick?: () => void;
  className?: string;
}

// =============================================================================
// Icon & Color Mapping (reused from node-card.tsx)
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

// Status colors for the preview bar
const statusColors: Record<string, string> = {
  // Task/Sprint statuses
  complete: 'bg-emerald-500',
  in_progress: 'bg-ginko-500',
  paused: 'bg-amber-500',
  todo: 'bg-slate-600',
  // ADR statuses
  accepted: 'bg-emerald-500',
  proposed: 'bg-blue-500',
  deprecated: 'bg-red-500',
  superseded: 'bg-orange-500',
  // Generic
  active: 'bg-ginko-500',
  planning: 'bg-blue-500',
  // Severity/confidence for patterns/gotchas
  high: 'bg-emerald-500',
  medium: 'bg-amber-500',
  low: 'bg-slate-600',
  critical: 'bg-red-500',
};

// Display names for node types
const nodeDisplayNames: Record<NodeLabel, string> = {
  Project: 'Projects',
  Charter: 'Charters',
  Epic: 'Epics',
  Sprint: 'Sprints',
  Task: 'Tasks',
  ADR: 'ADRs',
  PRD: 'PRDs',
  Pattern: 'Patterns',
  Gotcha: 'Gotchas',
  Principle: 'Principles',
  Event: 'Events',
  Session: 'Sessions',
  Commit: 'Commits',
};

// =============================================================================
// Status Preview Bar
// =============================================================================

function StatusPreviewBar({
  breakdown,
  total,
}: {
  breakdown: Record<string, number>;
  total: number;
}) {
  if (total === 0) return null;

  // Sort statuses by a priority order for consistent display
  const statusOrder = ['complete', 'accepted', 'in_progress', 'active', 'planning', 'proposed', 'paused', 'todo', 'deprecated', 'superseded', 'high', 'medium', 'low', 'critical'];

  const sortedEntries = Object.entries(breakdown).sort(([a], [b]) => {
    const aIndex = statusOrder.indexOf(a);
    const bIndex = statusOrder.indexOf(b);
    return (aIndex === -1 ? 999 : aIndex) - (bIndex === -1 ? 999 : bIndex);
  });

  return (
    <div className="flex items-center gap-1.5 mt-2">
      <div className="flex-1 h-1.5 bg-muted rounded-full overflow-hidden flex">
        {sortedEntries.map(([status, count]) => {
          const width = (count / total) * 100;
          const color = statusColors[status] || 'bg-slate-600';
          return (
            <div
              key={status}
              className={cn('h-full first:rounded-l-full last:rounded-r-full', color)}
              style={{ width: `${width}%` }}
              title={`${status.replace('_', ' ')}: ${count}`}
            />
          );
        })}
      </div>
      <span className="text-[10px] font-mono text-muted-foreground whitespace-nowrap">
        {sortedEntries.find(([s]) => s === 'complete' || s === 'accepted')?.[1] || 0}/{total}
      </span>
    </div>
  );
}

// =============================================================================
// Component
// =============================================================================

function SummaryCardComponent({
  label,
  count,
  statusBreakdown,
  onClick,
  className,
}: SummaryCardProps) {
  const Icon = nodeIcons[label] || FileText;
  const colors = nodeColors[label] || nodeColors.Event;

  return (
    <motion.div
      whileHover={{ scale: 1.02 }}
      whileTap={{ scale: 0.98 }}
      onClick={onClick}
      className={cn(
        'p-4 rounded-lg cursor-pointer transition-all',
        'bg-card border border-border',
        'hover:border-ginko-500/50 hover:bg-card/80',
        className
      )}
    >
      {/* Header Row */}
      <div className="flex items-center gap-3">
        {/* Icon */}
        <div className={cn('p-2.5 rounded-lg', colors.bg)}>
          <Icon className={cn('w-5 h-5', colors.text)} />
        </div>

        {/* Label + Count */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium text-foreground">
              {nodeDisplayNames[label]}
            </span>
            <span className={cn(
              'text-lg font-mono font-semibold',
              count > 0 ? colors.text : 'text-muted-foreground'
            )}>
              {count}
            </span>
          </div>
        </div>
      </div>

      {/* Status Preview Bar */}
      {statusBreakdown && Object.keys(statusBreakdown).length > 0 && (
        <StatusPreviewBar breakdown={statusBreakdown} total={count} />
      )}
    </motion.div>
  );
}

// =============================================================================
// Export
// =============================================================================

export const SummaryCard = memo(SummaryCardComponent);
export default SummaryCard;
