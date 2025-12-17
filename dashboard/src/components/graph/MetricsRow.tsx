/**
 * @fileType: component
 * @status: current
 * @updated: 2025-12-17
 * @tags: [graph, metrics, statistics, c4-navigation]
 * @related: [ProjectView.tsx, SummaryCard.tsx]
 * @priority: high
 * @complexity: low
 * @dependencies: [lucide-react]
 */

'use client';

import { memo } from 'react';
import {
  Activity,
  GitCommit,
  Target,
  CheckCircle2,
  Clock,
  TrendingUp,
  type LucideIcon,
} from 'lucide-react';
import { cn } from '@/lib/utils';

// =============================================================================
// Types
// =============================================================================

export interface Metric {
  label: string;
  value: string | number;
  icon?: LucideIcon;
  trend?: 'up' | 'down' | 'neutral';
  trendValue?: string;
}

export interface MetricsRowProps {
  metrics: Metric[];
  className?: string;
}

// =============================================================================
// Default Icons
// =============================================================================

const defaultIcons: Record<string, LucideIcon> = {
  'Active Sprint': Activity,
  'Sprint Progress': Target,
  'Tasks Complete': CheckCircle2,
  'Total Commits': GitCommit,
  'Last Activity': Clock,
  'Velocity': TrendingUp,
};

// =============================================================================
// Metric Item
// =============================================================================

function MetricItem({ metric }: { metric: Metric }) {
  const Icon = metric.icon || defaultIcons[metric.label] || Activity;

  return (
    <div className="flex items-center gap-3 px-4 py-3 bg-card/50 rounded-lg border border-border/50">
      {/* Icon */}
      <div className="p-2 rounded-lg bg-ginko-500/10">
        <Icon className="w-4 h-4 text-ginko-400" />
      </div>

      {/* Content */}
      <div className="flex-1 min-w-0">
        <p className="text-xs text-muted-foreground uppercase tracking-wide">
          {metric.label}
        </p>
        <div className="flex items-baseline gap-2">
          <span className="text-lg font-mono font-semibold text-foreground">
            {metric.value}
          </span>
          {metric.trend && metric.trendValue && (
            <span className={cn(
              'text-xs font-mono',
              metric.trend === 'up' && 'text-emerald-400',
              metric.trend === 'down' && 'text-red-400',
              metric.trend === 'neutral' && 'text-muted-foreground'
            )}>
              {metric.trend === 'up' && '+'}
              {metric.trendValue}
            </span>
          )}
        </div>
      </div>
    </div>
  );
}

// =============================================================================
// Component
// =============================================================================

function MetricsRowComponent({ metrics, className }: MetricsRowProps) {
  if (!metrics.length) return null;

  return (
    <div className={cn(
      'grid gap-3',
      metrics.length === 1 && 'grid-cols-1',
      metrics.length === 2 && 'grid-cols-2',
      metrics.length === 3 && 'grid-cols-3',
      metrics.length >= 4 && 'grid-cols-2 md:grid-cols-4',
      className
    )}>
      {metrics.map((metric, index) => (
        <MetricItem key={`${metric.label}-${index}`} metric={metric} />
      ))}
    </div>
  );
}

// =============================================================================
// Export
// =============================================================================

export const MetricsRow = memo(MetricsRowComponent);
export default MetricsRow;
