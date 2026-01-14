/**
 * @fileType: component
 * @status: current
 * @updated: 2026-01-14
 * @tags: [graph, child-card, navigation, hierarchy]
 * @related: [NodeView.tsx, ChildrenSection.tsx]
 * @priority: medium
 * @complexity: low
 * @dependencies: [lucide-react]
 */

'use client';

import {
  Calendar,
  CheckSquare,
  CheckCircle2,
  Circle,
  Clock,
  Loader2,
  PauseCircle,
  type LucideIcon,
} from 'lucide-react';
import type { GraphNode, NodeLabel } from '@/lib/graph/types';
import { cn } from '@/lib/utils';

// =============================================================================
// Types
// =============================================================================

export interface ChildCardProps {
  node: GraphNode;
  onClick: (nodeId: string) => void;
  className?: string;
}

// =============================================================================
// Helper Functions
// =============================================================================

function getNodeProp(properties: Record<string, unknown>, key: string): string | undefined {
  const value = properties[key];
  return typeof value === 'string' ? value : undefined;
}

function getNodeTitle(node: GraphNode): string {
  const props = node.properties as unknown as Record<string, unknown>;
  return (
    getNodeProp(props, 'title') ||
    getNodeProp(props, 'name') ||
    getNodeProp(props, 'task_id') ||
    getNodeProp(props, 'sprint_id') ||
    node.id
  );
}

function getNodeId(node: GraphNode): string | undefined {
  const props = node.properties as unknown as Record<string, unknown>;
  return (
    getNodeProp(props, 'task_id') ||
    getNodeProp(props, 'sprint_id') ||
    getNodeProp(props, 'epic_id')
  );
}

// =============================================================================
// Status Icons
// =============================================================================

interface StatusConfig {
  icon: LucideIcon;
  color: string;
  bg: string;
}

const statusIcons: Record<string, StatusConfig> = {
  complete: { icon: CheckCircle2, color: 'text-emerald-400', bg: 'bg-emerald-500/20' },
  in_progress: { icon: Loader2, color: 'text-ginko-400', bg: 'bg-ginko-500/20' },
  paused: { icon: PauseCircle, color: 'text-amber-400', bg: 'bg-amber-500/20' },
  todo: { icon: Circle, color: 'text-slate-400', bg: 'bg-slate-500/20' },
  planning: { icon: Clock, color: 'text-blue-400', bg: 'bg-blue-500/20' },
  active: { icon: Loader2, color: 'text-ginko-400', bg: 'bg-ginko-500/20' },
};

const nodeTypeConfig: Record<NodeLabel, { icon: LucideIcon; color: string; border: string }> = {
  Sprint: { icon: Calendar, color: 'text-cyan-400', border: 'border-cyan-500/30' },
  Task: { icon: CheckSquare, color: 'text-ginko-400', border: 'border-ginko-500/30' },
  // Fallbacks for other types (not typically shown as children)
  Project: { icon: Calendar, color: 'text-slate-400', border: 'border-slate-500/30' },
  Charter: { icon: Calendar, color: 'text-slate-400', border: 'border-slate-500/30' },
  Epic: { icon: Calendar, color: 'text-purple-400', border: 'border-purple-500/30' },
  ADR: { icon: Calendar, color: 'text-amber-400', border: 'border-amber-500/30' },
  PRD: { icon: Calendar, color: 'text-orange-400', border: 'border-orange-500/30' },
  Pattern: { icon: Calendar, color: 'text-emerald-400', border: 'border-emerald-500/30' },
  Gotcha: { icon: Calendar, color: 'text-red-400', border: 'border-red-500/30' },
  Principle: { icon: Calendar, color: 'text-indigo-400', border: 'border-indigo-500/30' },
  Event: { icon: Calendar, color: 'text-slate-400', border: 'border-slate-500/30' },
  Session: { icon: Calendar, color: 'text-slate-400', border: 'border-slate-500/30' },
  Commit: { icon: Calendar, color: 'text-slate-400', border: 'border-slate-500/30' },
  Team: { icon: Calendar, color: 'text-slate-400', border: 'border-slate-500/30' },
  Membership: { icon: Calendar, color: 'text-slate-400', border: 'border-slate-500/30' },
  Invitation: { icon: Calendar, color: 'text-slate-400', border: 'border-slate-500/30' },
};

// =============================================================================
// Component
// =============================================================================

export function ChildCard({ node, onClick, className }: ChildCardProps) {
  const props = node.properties as unknown as Record<string, unknown>;
  const title = getNodeTitle(node);
  const nodeId = getNodeId(node);
  const status = getNodeProp(props, 'status') || 'todo';

  const typeConfig = nodeTypeConfig[node.label] || nodeTypeConfig.Task;
  const statusConfig = statusIcons[status] || statusIcons.todo;
  const TypeIcon = typeConfig.icon;
  const StatusIcon = statusConfig.icon;

  return (
    <button
      onClick={() => onClick(node.id)}
      className={cn(
        'flex flex-col p-3 rounded-lg border transition-all',
        'hover:bg-white/5 hover:border-white/20',
        'text-left w-full',
        typeConfig.border,
        className
      )}
    >
      {/* Header: Type Icon + ID + Status */}
      <div className="flex items-center gap-2 mb-1">
        <TypeIcon className={cn('w-3.5 h-3.5 flex-shrink-0', typeConfig.color)} />
        <span className="text-xs font-mono text-muted-foreground truncate">
          {nodeId || node.label}
        </span>
        <div className={cn('ml-auto p-1 rounded', statusConfig.bg)}>
          <StatusIcon className={cn('w-3 h-3', statusConfig.color, status === 'in_progress' || status === 'active' ? 'animate-spin' : '')} />
        </div>
      </div>

      {/* Title */}
      <p className="text-sm text-foreground line-clamp-2 leading-tight">
        {title}
      </p>
    </button>
  );
}

export default ChildCard;
