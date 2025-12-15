/**
 * @fileType: component
 * @status: current
 * @updated: 2025-12-15
 * @tags: [focus, tasks, user-tasks, dashboard, list]
 * @related: [graph/node-card.tsx, dashboard/focus-page.tsx]
 * @priority: high
 * @complexity: medium
 * @dependencies: [react, graph-api, lucide-react]
 */

'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { CheckSquare, Circle, Pause, AlertCircle } from 'lucide-react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { LoadingSpinner } from '@/components/ui/loading-spinner';
import { Alert } from '@/components/ui/alert';
import { listNodes } from '@/lib/graph/api-client';
import type { TaskNode } from '@/lib/graph/types';
import { cn } from '@/lib/utils';

// =============================================================================
// Types
// =============================================================================

interface MyTasksListProps {
  userId: string;
  graphId?: string;
  className?: string;
}

interface TaskGroup {
  status: 'in_progress' | 'todo' | 'paused';
  tasks: TaskNode[];
}

// =============================================================================
// Helper Functions
// =============================================================================

const priorityConfig = {
  critical: { variant: 'destructive' as const, color: 'text-red-600' },
  high: { variant: 'warning' as const, color: 'text-orange-600' },
  medium: { variant: 'default' as const, color: 'text-yellow-600' },
  low: { variant: 'secondary' as const, color: 'text-gray-600' },
};

const statusIcons = {
  in_progress: CheckSquare,
  todo: Circle,
  paused: Pause,
};

const statusLabels = {
  in_progress: 'In Progress',
  todo: 'To Do',
  paused: 'Paused',
};

function groupTasksByStatus(tasks: TaskNode[]): TaskGroup[] {
  const groups: Record<string, TaskNode[]> = {
    in_progress: [],
    todo: [],
    paused: [],
  };

  tasks.forEach((task) => {
    if (task.status in groups) {
      groups[task.status].push(task);
    }
  });

  // Return in priority order: in_progress, todo, paused
  return [
    { status: 'in_progress' as const, tasks: groups.in_progress },
    { status: 'todo' as const, tasks: groups.todo },
    { status: 'paused' as const, tasks: groups.paused },
  ].filter((group) => group.tasks.length > 0);
}

// =============================================================================
// Component
// =============================================================================

// Default graph ID fallback
const DEFAULT_GRAPH_ID = process.env.NEXT_PUBLIC_GRAPH_ID || 'gin_1762125961056_dg4bsd';

export function MyTasksList({ userId, graphId, className }: MyTasksListProps) {
  const [tasks, setTasks] = useState<TaskNode[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchTasks() {
      try {
        setLoading(true);
        setError(null);

        // Get effective graphId
        const effectiveGraphId = graphId || DEFAULT_GRAPH_ID;

        // Fetch all Task nodes
        const response = await listNodes({
          labels: ['Task'],
          limit: 100, // Adjust as needed
          graphId: effectiveGraphId,
        });

        // Filter tasks by assignee matching userId
        const userTasks = response.nodes
          .map((node) => node.properties as TaskNode)
          .filter((task) => task.assignee === userId)
          // Exclude completed tasks
          .filter((task) => task.status !== 'complete');

        setTasks(userTasks);
      } catch (err) {
        console.error('Failed to fetch tasks:', err);
        setError(err instanceof Error ? err.message : 'Failed to load tasks');
      } finally {
        setLoading(false);
      }
    }

    fetchTasks();
  }, [userId]);

  // Loading state
  if (loading) {
    return (
      <Card className={className}>
        <CardHeader>
          <CardTitle>My Tasks</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center py-8">
            <LoadingSpinner size="default" />
            <span className="ml-2 text-sm text-muted-foreground">Loading tasks...</span>
          </div>
        </CardContent>
      </Card>
    );
  }

  // Error state
  if (error) {
    return (
      <Card className={className}>
        <CardHeader>
          <CardTitle>My Tasks</CardTitle>
        </CardHeader>
        <CardContent>
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <span className="ml-2">{error}</span>
          </Alert>
        </CardContent>
      </Card>
    );
  }

  // Empty state
  if (tasks.length === 0) {
    return (
      <Card className={className}>
        <CardHeader>
          <CardTitle>My Tasks</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8 text-muted-foreground">
            <Circle className="h-12 w-12 mx-auto mb-2 opacity-50" />
            <p className="text-sm">No tasks assigned to you</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  // Group tasks by status
  const taskGroups = groupTasksByStatus(tasks);
  const inProgressCount = tasks.filter((t) => t.status === 'in_progress').length;
  const todoCount = tasks.filter((t) => t.status === 'todo').length;

  return (
    <Card className={className}>
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <span>My Tasks</span>
          <span className="text-sm font-normal text-muted-foreground">
            {inProgressCount} in progress, {todoCount} to do
          </span>
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-6">
          {taskGroups.map((group) => {
            const StatusIcon = statusIcons[group.status];
            const statusLabel = statusLabels[group.status];
            const isInProgress = group.status === 'in_progress';

            return (
              <div key={group.status}>
                {/* Group Header */}
                <div className="flex items-center gap-2 mb-3">
                  <StatusIcon
                    className={cn(
                      'h-4 w-4',
                      isInProgress ? 'text-ginko-400' : 'text-muted-foreground'
                    )}
                  />
                  <h4
                    className={cn(
                      'text-sm font-medium',
                      isInProgress ? 'text-ginko-400' : 'text-muted-foreground'
                    )}
                  >
                    {statusLabel}
                  </h4>
                  <span className="text-xs text-muted-foreground">({group.tasks.length})</span>
                </div>

                {/* Task List */}
                <div className="space-y-2">
                  {group.tasks.map((task) => (
                    <Link
                      key={task.task_id}
                      href={`/dashboard/graph?node=${task.task_id}`}
                      className={cn(
                        'block rounded-md border p-3 transition-all hover:shadow-md',
                        isInProgress
                          ? 'border-ginko-500/30 bg-ginko-500/5 hover:border-ginko-500/50'
                          : 'border-border bg-card hover:border-border/80'
                      )}
                    >
                      <div className="flex items-start justify-between gap-3">
                        {/* Task Info */}
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1">
                            <span className="font-mono text-xs text-muted-foreground">
                              {task.task_id}
                            </span>
                            {task.priority && (
                              <Badge
                                variant={priorityConfig[task.priority].variant}
                                className="text-xs"
                              >
                                {task.priority}
                              </Badge>
                            )}
                          </div>
                          <h5 className="text-sm font-medium truncate">{task.title}</h5>
                          {task.description && (
                            <p className="text-xs text-muted-foreground mt-1 line-clamp-2">
                              {task.description}
                            </p>
                          )}
                        </div>

                        {/* Link Icon */}
                        <div className="flex-shrink-0">
                          <div className="h-4 w-4 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity">
                            →
                          </div>
                        </div>
                      </div>
                    </Link>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}
