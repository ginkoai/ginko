/**
 * @fileType: component
 * @status: current
 * @updated: 2025-12-17
 * @tags: [graph, navigation, breadcrumbs, c4-navigation]
 * @related: [ProjectView.tsx, CategoryView.tsx, page.tsx]
 * @priority: high
 * @complexity: low
 * @dependencies: [lucide-react]
 */

'use client';

import { memo } from 'react';
import {
  Home,
  ChevronRight,
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

export interface BreadcrumbItem {
  type: 'project' | 'category' | 'node';
  label: string;
  nodeLabel?: NodeLabel;
  nodeId?: string;
}

export interface BreadcrumbsProps {
  items: BreadcrumbItem[];
  onNavigate: (item: BreadcrumbItem, index: number) => void;
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
  Principle: Lightbulb,
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
  Principle: 'text-indigo-400',
  Event: 'text-slate-400',
  Session: 'text-slate-400',
  Commit: 'text-slate-400',
};

// =============================================================================
// Breadcrumb Item Component
// =============================================================================

function BreadcrumbItemComponent({
  item,
  isLast,
  onClick,
}: {
  item: BreadcrumbItem;
  isLast: boolean;
  onClick: () => void;
}) {
  const Icon = item.type === 'project'
    ? Home
    : item.nodeLabel
      ? nodeIcons[item.nodeLabel] || FileText
      : FileText;

  const iconColor = item.nodeLabel
    ? nodeColors[item.nodeLabel]
    : 'text-muted-foreground';

  return (
    <button
      onClick={onClick}
      disabled={isLast}
      className={cn(
        'flex items-center gap-1.5 px-2 py-1 rounded transition-colors',
        isLast
          ? 'text-foreground cursor-default'
          : 'text-muted-foreground hover:text-foreground hover:bg-white/5'
      )}
    >
      <Icon className={cn('w-4 h-4', isLast ? iconColor : 'text-inherit')} />
      <span className="text-sm font-mono truncate max-w-[150px]">
        {item.label}
      </span>
    </button>
  );
}

// =============================================================================
// Component
// =============================================================================

function BreadcrumbsComponent({
  items,
  onNavigate,
  className,
}: BreadcrumbsProps) {
  if (items.length === 0) return null;

  return (
    <nav
      aria-label="Breadcrumb"
      className={cn(
        'flex items-center gap-1 px-4 py-2 border-b border-border bg-background/80 backdrop-blur-sm overflow-x-auto',
        className
      )}
    >
      {items.map((item, index) => (
        <div key={`${item.type}-${item.nodeId || item.label}-${index}`} className="flex items-center">
          {index > 0 && (
            <ChevronRight className="w-4 h-4 text-muted-foreground mx-1 shrink-0" />
          )}
          <BreadcrumbItemComponent
            item={item}
            isLast={index === items.length - 1}
            onClick={() => onNavigate(item, index)}
          />
        </div>
      ))}
    </nav>
  );
}

// =============================================================================
// Export
// =============================================================================

export const Breadcrumbs = memo(BreadcrumbsComponent);
export default Breadcrumbs;
