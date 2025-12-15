/**
 * @fileType: component
 * @status: current
 * @updated: 2025-12-15
 * @tags: [focus, sprint, progress, dashboard, ginko-branding]
 * @related: [../ui/card.tsx, use-sprint-data.ts, /api/v1/sprint/active/route.ts]
 * @priority: high
 * @complexity: medium
 * @dependencies: [react, date-fns, heroicons, clsx]
 */

'use client';

import { useEffect, useState, useCallback } from 'react';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { LoadingSpinner } from '@/components/ui/loading-spinner';
import { createClient } from '@/lib/supabase/client';
import { getDefaultGraphId } from '@/lib/graph/api-client';
import { differenceInDays, format, parseISO } from 'date-fns';
import { ClockIcon, CalendarIcon, CheckCircleIcon } from '@heroicons/react/24/outline';
import { clsx } from 'clsx';

interface SprintProgressCardProps {
  graphId?: string;
}

interface SprintData {
  id: string;
  name: string;
  goal: string;
  startDate: string;
  endDate: string;
  progress: number;
}

interface SprintStats {
  totalTasks: number;
  completedTasks: number;
  inProgressTasks: number;
  notStartedTasks: number;
  progressPercentage: number;
}

interface ActiveSprintResponse {
  sprint: SprintData;
  stats: SprintStats;
  meta: {
    executionTime: number;
    timestamp: string;
  };
}

// Default graph ID fallback
const DEFAULT_GRAPH_ID = process.env.NEXT_PUBLIC_GRAPH_ID || 'gin_1762125961056_dg4bsd';

export function SprintProgressCard({ graphId }: SprintProgressCardProps) {
  const [data, setData] = useState<ActiveSprintResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchActiveSprint = useCallback(async () => {
    // Get graphId from props, global default, or fallback
    const effectiveGraphId = graphId || getDefaultGraphId() || DEFAULT_GRAPH_ID;

    try {
      setLoading(true);
      setError(null);

      // Get auth token from Supabase
      const supabase = createClient();
      const { data: { session } } = await supabase.auth.getSession();
      const token = session?.access_token;

      if (!token) {
        throw new Error('No authentication token available');
      }

      const params = new URLSearchParams({
        graphId: effectiveGraphId,
      });

      const response = await fetch(`/api/v1/sprint/active?${params}`, {
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || `Failed to fetch active sprint: ${response.statusText}`);
      }

      const sprintData: ActiveSprintResponse = await response.json();
      setData(sprintData);
    } catch (err) {
      console.error('Error fetching active sprint:', err);
      setError(err instanceof Error ? err.message : 'Failed to fetch active sprint');
    } finally {
      setLoading(false);
    }
  }, [graphId]);

  useEffect(() => {
    fetchActiveSprint();
  }, [fetchActiveSprint]);

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Active Sprint</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center h-32">
            <LoadingSpinner size="lg" />
          </div>
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Active Sprint</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8">
            <p className="text-red-600 mb-2">Error loading sprint</p>
            <p className="text-sm text-muted-foreground">{error}</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!data || !data.sprint) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Active Sprint</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8">
            <CalendarIcon className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <h3 className="text-lg font-medium text-foreground mb-2">No Active Sprint</h3>
            <p className="text-sm text-muted-foreground">
              Create a sprint with <code className="px-1 py-0.5 bg-muted rounded text-sm">ginko epic</code>
            </p>
          </div>
        </CardContent>
      </Card>
    );
  }

  const { sprint, stats } = data;
  const scheduleStatus = calculateScheduleStatus(sprint, stats.progressPercentage);

  return (
    <Card>
      <CardHeader>
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <CardTitle className="text-xl mb-1">{sprint.name}</CardTitle>
            {sprint.goal && (
              <CardDescription className="text-sm">{sprint.goal}</CardDescription>
            )}
          </div>
          <ScheduleBadge status={scheduleStatus} />
        </div>
      </CardHeader>

      <CardContent className="space-y-6">
        {/* Progress Bar */}
        <div>
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium text-muted-foreground">Sprint Progress</span>
            <span className="text-lg font-bold text-foreground font-mono">
              {stats.progressPercentage}%
            </span>
          </div>
          <div className="w-full bg-muted rounded-full h-3">
            <div
              className={clsx(
                'h-3 rounded-full transition-all duration-300',
                stats.progressPercentage >= 100
                  ? 'bg-green-600'
                  : stats.progressPercentage >= 75
                  ? 'bg-blue-600'
                  : stats.progressPercentage >= 50
                  ? 'bg-yellow-500'
                  : 'bg-amber-500'
              )}
              style={{ width: `${Math.min(stats.progressPercentage, 100)}%` }}
            />
          </div>
          <div className="flex items-center justify-between mt-2 text-xs text-muted-foreground">
            <span>{stats.completedTasks} of {stats.totalTasks} tasks complete</span>
            {stats.inProgressTasks > 0 && (
              <span>{stats.inProgressTasks} in progress</span>
            )}
          </div>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-3 gap-4">
          {/* Completed */}
          <div className="text-center p-3 bg-green-50 dark:bg-green-950/30 rounded-lg border border-green-200 dark:border-green-900">
            <div className="flex items-center justify-center mb-1">
              <CheckCircleIcon className="h-4 w-4 text-green-600 dark:text-green-400 mr-1" />
              <div className="text-2xl font-bold text-green-600 dark:text-green-400 font-mono">
                {stats.completedTasks}
              </div>
            </div>
            <div className="text-xs text-green-700 dark:text-green-300">Complete</div>
          </div>

          {/* In Progress */}
          <div className="text-center p-3 bg-blue-50 dark:bg-blue-950/30 rounded-lg border border-blue-200 dark:border-blue-900">
            <div className="flex items-center justify-center mb-1">
              <ClockIcon className="h-4 w-4 text-blue-600 dark:text-blue-400 mr-1" />
              <div className="text-2xl font-bold text-blue-600 dark:text-blue-400 font-mono">
                {stats.inProgressTasks}
              </div>
            </div>
            <div className="text-xs text-blue-700 dark:text-blue-300">Active</div>
          </div>

          {/* Not Started */}
          <div className="text-center p-3 bg-gray-50 dark:bg-gray-900/30 rounded-lg border border-gray-200 dark:border-gray-800">
            <div className="flex items-center justify-center mb-1">
              <div className="text-2xl font-bold text-gray-600 dark:text-gray-400 font-mono">
                {stats.notStartedTasks}
              </div>
            </div>
            <div className="text-xs text-gray-700 dark:text-gray-300">Pending</div>
          </div>
        </div>

        {/* End Date */}
        <div className="flex items-center justify-between pt-4 border-t border-border">
          <div className="flex items-center text-sm text-muted-foreground">
            <CalendarIcon className="h-4 w-4 mr-2" />
            <span>Sprint ends</span>
          </div>
          <div className="text-sm font-medium text-foreground">
            {format(parseISO(sprint.endDate), 'MMM d, yyyy')}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

/**
 * Calculate schedule status based on time elapsed vs progress
 */
interface ScheduleStatus {
  daysOffset: number; // Positive = ahead, negative = behind
  label: string;
  variant: 'success' | 'warning' | 'destructive' | 'secondary';
}

function calculateScheduleStatus(sprint: SprintData, actualProgress: number): ScheduleStatus {
  const startDate = parseISO(sprint.startDate);
  const endDate = parseISO(sprint.endDate);
  const now = new Date();

  // Calculate total duration and elapsed days
  const totalDays = differenceInDays(endDate, startDate);
  const elapsedDays = differenceInDays(now, startDate);

  // Clamp elapsed days to valid range
  const clampedElapsedDays = Math.max(0, Math.min(elapsedDays, totalDays));

  // Calculate expected progress (linear)
  const expectedProgress = totalDays > 0 ? (clampedElapsedDays / totalDays) * 100 : 0;

  // Calculate progress delta
  const progressDelta = actualProgress - expectedProgress;

  // Convert progress delta to approximate days
  const daysPerPercent = totalDays / 100;
  const daysOffset = Math.round(progressDelta * daysPerPercent);

  // Determine status
  if (daysOffset >= 2) {
    return {
      daysOffset,
      label: `${daysOffset} days ahead`,
      variant: 'success',
    };
  } else if (daysOffset >= 1) {
    return {
      daysOffset,
      label: '1 day ahead',
      variant: 'success',
    };
  } else if (daysOffset <= -3) {
    return {
      daysOffset,
      label: `${Math.abs(daysOffset)} days behind`,
      variant: 'destructive',
    };
  } else if (daysOffset <= -1) {
    return {
      daysOffset,
      label: `${Math.abs(daysOffset)} ${Math.abs(daysOffset) === 1 ? 'day' : 'days'} behind`,
      variant: 'warning',
    };
  } else {
    return {
      daysOffset: 0,
      label: 'On track',
      variant: 'secondary',
    };
  }
}

/**
 * Badge showing schedule status
 */
function ScheduleBadge({ status }: { status: ScheduleStatus }) {
  return (
    <Badge variant={status.variant} className="font-mono text-xs">
      {status.label}
    </Badge>
  );
}
