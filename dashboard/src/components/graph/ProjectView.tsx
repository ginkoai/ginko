/**
 * @fileType: component
 * @status: current
 * @updated: 2025-12-17
 * @tags: [graph, project-view, c4-navigation, charter]
 * @related: [SummaryCard.tsx, MetricsRow.tsx, CategoryView.tsx]
 * @priority: high
 * @complexity: medium
 * @dependencies: [lucide-react, framer-motion, @tanstack/react-query]
 */

'use client';

import { useMemo } from 'react';
import { motion } from 'framer-motion';
import { FileText, AlertCircle, ChevronRight } from 'lucide-react';
import { useGraphStatus, useNodesByLabel } from '@/lib/graph/hooks';
import { SkeletonHero, SkeletonCard } from '@/components/ui/skeleton';
import type { NodeLabel, GraphNode, CharterNode } from '@/lib/graph/types';
import { SummaryCard } from './SummaryCard';
import { cn } from '@/lib/utils';

// =============================================================================
// Types
// =============================================================================

export interface ProjectViewProps {
  graphId: string;
  onSelectCategory: (label: NodeLabel) => void;
  onViewCharter?: (charterId: string) => void;
  className?: string;
}

// Node types to show in the summary grid (excluding low-value types)
const SUMMARY_NODE_TYPES: NodeLabel[] = [
  'Epic',
  'Sprint',
  'Task',
  'ADR',
  'Pattern',
  'Gotcha',
  'Principle',
];

// =============================================================================
// Charter Hero Card
// =============================================================================

function CharterHeroCard({
  charter,
  isLoading,
  onViewCharter,
}: {
  charter: GraphNode<CharterNode> | null;
  isLoading: boolean;
  onViewCharter?: (charterId: string) => void;
}) {
  if (isLoading) {
    return <SkeletonHero />;
  }

  if (!charter) {
    return (
      <div className="p-8 rounded-xl bg-gradient-to-br from-slate-500/10 to-slate-600/5 border border-slate-500/20">
        <div className="flex items-center gap-3">
          <div className="p-3 rounded-lg bg-slate-500/10">
            <FileText className="w-6 h-6 text-slate-400" />
          </div>
          <div>
            <h2 className="text-lg font-semibold text-foreground">No Charter Found</h2>
            <p className="text-sm text-muted-foreground mt-1">
              Create a project charter to define your project's purpose and goals.
            </p>
          </div>
        </div>
      </div>
    );
  }

  const props = charter.properties as CharterNode;
  const goals = props.goals || [];
  const successCriteria = props.success_criteria || [];

  // Extract project name from title (e.g., "Project Charter: ginko" -> "ginko")
  const projectName = props.title?.replace('Project Charter:', '').trim() || 'Project';

  // Fallback purpose for ginko project (until graph is synced with full charter data)
  const defaultPurpose = charter.id === 'charter-ginko' || props.title?.includes('ginko')
    ? 'Where humans and AI ship together. Create the category of AI-native project management—tools built from the ground up for teams that work with AI partners, not around them.'
    : undefined;

  const displayPurpose = props.purpose || defaultPurpose;

  // Category tagline for title bar
  const categoryTagline = charter.id === 'charter-ginko' || props.title?.includes('ginko')
    ? 'ginko is The AI Collaboration Platform'
    : props.title || 'Untitled Charter';

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="p-6 rounded-xl bg-gradient-to-br from-blue-500/10 to-blue-600/5 border border-blue-500/20"
    >
      {/* Header */}
      <div className="flex items-start gap-4">
        <div className="p-3 rounded-lg bg-blue-500/20">
          <FileText className="w-6 h-6 text-blue-400" />
        </div>
        <div className="flex-1 min-w-0">
          <span className="text-xs font-mono text-blue-400 uppercase tracking-wider">
            Project Charter
          </span>
          <h2 className="text-xl font-semibold text-foreground mt-1">
            {categoryTagline}
          </h2>
          {displayPurpose && (
            <p className="text-sm text-muted-foreground mt-2 line-clamp-2">
              {displayPurpose}
            </p>
          )}
        </div>
        {/* View/Edit Charter button */}
        {onViewCharter && (
          <button
            onClick={() => onViewCharter(charter.id)}
            className="p-2 hover:bg-white/10 rounded-lg transition-colors text-muted-foreground hover:text-foreground"
            aria-label="View Charter details"
          >
            <ChevronRight className="w-5 h-5" />
          </button>
        )}
      </div>

      {/* Goals & Success Criteria */}
      {(goals.length > 0 || successCriteria.length > 0) && (
        <div className="mt-4 pt-4 border-t border-blue-500/10 grid gap-4 md:grid-cols-2">
          {goals.length > 0 && (
            <div>
              <h3 className="text-xs font-mono text-muted-foreground uppercase mb-2">
                Goals ({goals.length})
              </h3>
              <ul className="space-y-1">
                {goals.slice(0, 3).map((goal, i) => (
                  <li key={i} className="text-sm text-foreground/80 flex items-start gap-2">
                    <span className="text-blue-400 mt-0.5">•</span>
                    <span className="line-clamp-1">{goal}</span>
                  </li>
                ))}
                {goals.length > 3 && (
                  <li className="text-xs text-muted-foreground">
                    +{goals.length - 3} more
                  </li>
                )}
              </ul>
            </div>
          )}
          {successCriteria.length > 0 && (
            <div>
              <h3 className="text-xs font-mono text-muted-foreground uppercase mb-2">
                Success Criteria ({successCriteria.length})
              </h3>
              <ul className="space-y-1">
                {successCriteria.slice(0, 3).map((criterion, i) => (
                  <li key={i} className="text-sm text-foreground/80 flex items-start gap-2">
                    <span className="text-emerald-400 mt-0.5">✓</span>
                    <span className="line-clamp-1">{criterion}</span>
                  </li>
                ))}
                {successCriteria.length > 3 && (
                  <li className="text-xs text-muted-foreground">
                    +{successCriteria.length - 3} more
                  </li>
                )}
              </ul>
            </div>
          )}
        </div>
      )}
    </motion.div>
  );
}

// =============================================================================
// Component
// =============================================================================

export function ProjectView({
  graphId,
  onSelectCategory,
  onViewCharter,
  className,
}: ProjectViewProps) {
  // Fetch graph status for node counts
  const {
    data: status,
    isLoading: statusLoading,
    error: statusError,
  } = useGraphStatus(graphId);

  // Fetch all charters so we can filter for the actual project charter
  const {
    data: charters,
    isLoading: charterLoading,
  } = useNodesByLabel('Charter', { graphId, limit: 10 });

  // Fetch tasks for status breakdown
  const { data: tasks } = useNodesByLabel('Task', { graphId, limit: 100 });

  // Fetch sprints for active sprint info
  const { data: sprints } = useNodesByLabel('Sprint', { graphId, limit: 10 });

  // Calculate task status breakdown
  const taskStatusBreakdown = useMemo(() => {
    if (!tasks) return {};
    const breakdown: Record<string, number> = {};
    tasks.forEach((task) => {
      const status = (task.properties as Record<string, unknown>).status as string || 'todo';
      breakdown[status] = (breakdown[status] || 0) + 1;
    });
    return breakdown;
  }, [tasks]);

  // Calculate sprint status breakdown
  const sprintStatusBreakdown = useMemo(() => {
    if (!sprints) return {};
    const breakdown: Record<string, number> = {};
    sprints.forEach((sprint) => {
      const status = (sprint.properties as Record<string, unknown>).status as string || 'planning';
      breakdown[status] = (breakdown[status] || 0) + 1;
    });
    return breakdown;
  }, [sprints]);

  // Total node count for header
  const totalNodeCount = status?.nodes?.total || 0;

  // Find the main project charter (filter out documentation charters)
  // Priority: 1. ID contains 'ginko', 2. Title starts with 'Project Charter:', 3. First non-documentation charter
  const charter = useMemo(() => {
    if (!charters || charters.length === 0) return null;

    // Look for the ginko project charter specifically
    const ginkoCharter = charters.find((c) => {
      const id = c.id.toLowerCase();
      return id === 'charter-ginko' || id.includes('project-charter-ginko');
    });
    if (ginkoCharter) return ginkoCharter as GraphNode<CharterNode>;

    // Look for any charter with title starting with "Project Charter:"
    const projectCharter = charters.find((c) => {
      const props = c.properties as CharterNode;
      return props.title?.startsWith('Project Charter:');
    });
    if (projectCharter) return projectCharter as GraphNode<CharterNode>;

    // Filter out documentation charters (design guides, etc.)
    const nonDocCharters = charters.filter((c) => {
      const props = c.properties as CharterNode;
      const title = props.title?.toLowerCase() || '';
      return !title.includes('design') && !title.includes('guide') && !title.includes('reference');
    });
    if (nonDocCharters.length > 0) return nonDocCharters[0] as GraphNode<CharterNode>;

    // Fallback to first charter
    return charters[0] as GraphNode<CharterNode>;
  }, [charters]);

  if (statusError) {
    return (
      <div className={cn('p-8', className)}>
        <div className="flex items-center gap-3 text-red-400">
          <AlertCircle className="w-5 h-5" />
          <p>Failed to load project data</p>
        </div>
      </div>
    );
  }

  return (
    <div className={cn('p-6 space-y-6', className)}>
      {/* Charter Hero */}
      <CharterHeroCard
        charter={charter || null}
        isLoading={charterLoading}
        onViewCharter={onViewCharter}
      />

      {/* Summary Cards Grid */}
      <div>
        <h3 className="text-sm font-mono text-muted-foreground uppercase tracking-wider mb-4">
          Knowledge Graph {totalNodeCount > 0 && (
            <span className="text-xs ml-2">({totalNodeCount} nodes)</span>
          )}
        </h3>

        {statusLoading ? (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
            {SUMMARY_NODE_TYPES.map((label) => (
              <SkeletonCard key={label} />
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
            {SUMMARY_NODE_TYPES.map((label) => {
              const count = status?.nodes?.byType?.[label] || 0;

              // Get status breakdown for specific types
              let statusBreakdown: Record<string, number> | undefined;
              if (label === 'Task') {
                statusBreakdown = taskStatusBreakdown;
              } else if (label === 'Sprint') {
                statusBreakdown = sprintStatusBreakdown;
              }

              return (
                <SummaryCard
                  key={label}
                  label={label}
                  count={count}
                  statusBreakdown={statusBreakdown}
                  onClick={() => onSelectCategory(label)}
                />
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}

// =============================================================================
// Export
// =============================================================================

export default ProjectView;
