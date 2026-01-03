/**
 * @fileType: component
 * @status: current
 * @updated: 2026-01-03
 * @tags: [team, activity, feed, polling, epic-008]
 * @related: [ActivityItem.tsx, TeamMemberList.tsx]
 * @priority: high
 * @complexity: medium
 * @dependencies: [react, lucide-react]
 */

'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { LoadingSpinner } from '@/components/ui/loading-spinner';
import { Select } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ActivityItem, ActivityItemData } from './ActivityItem';
import { cn } from '@/lib/utils';
import { Activity, AlertCircle, RefreshCw, Filter } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';

// =============================================================================
// Types
// =============================================================================

export interface TeamActivityFeedProps {
  teamId: string;
  graphId: string;
  refreshInterval?: number;
  maxItems?: number;
  showFilters?: boolean;
  className?: string;
}

interface ActivityResponse {
  activities: ActivityItemData[];
  count: number;
}

type ActionFilter = 'all' | 'synced' | 'edited' | 'created' | 'logged';

interface TimeGroup {
  label: string;
  activities: ActivityItemData[];
}

// =============================================================================
// Helpers
// =============================================================================

function groupActivitiesByTime(activities: ActivityItemData[]): TimeGroup[] {
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const yesterday = new Date(today.getTime() - 86400000);
  const weekAgo = new Date(today.getTime() - 604800000);

  const groups: Record<string, ActivityItemData[]> = {
    Today: [],
    Yesterday: [],
    'This Week': [],
    Earlier: [],
  };

  for (const activity of activities) {
    const activityDate = new Date(activity.timestamp);
    if (activityDate >= today) {
      groups['Today'].push(activity);
    } else if (activityDate >= yesterday) {
      groups['Yesterday'].push(activity);
    } else if (activityDate >= weekAgo) {
      groups['This Week'].push(activity);
    } else {
      groups['Earlier'].push(activity);
    }
  }

  return Object.entries(groups)
    .filter(([, items]) => items.length > 0)
    .map(([label, items]) => ({ label, activities: items }));
}

const actionFilterConfig: Record<
  ActionFilter,
  { label: string; className: string }
> = {
  all: { label: 'All', className: '' },
  synced: {
    label: 'Synced',
    className: 'bg-blue-100 text-blue-800 hover:bg-blue-200',
  },
  edited: {
    label: 'Edited',
    className: 'bg-amber-100 text-amber-800 hover:bg-amber-200',
  },
  created: {
    label: 'Created',
    className: 'bg-green-100 text-green-800 hover:bg-green-200',
  },
  logged: {
    label: 'Logged',
    className: 'bg-gray-100 text-gray-800 hover:bg-gray-200',
  },
};

// =============================================================================
// Component
// =============================================================================

export function TeamActivityFeed({
  teamId,
  graphId,
  refreshInterval = 30000,
  maxItems = 20,
  showFilters = true,
  className,
}: TeamActivityFeedProps) {
  const [activities, setActivities] = useState<ActivityItemData[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Filter state
  const [memberFilter, setMemberFilter] = useState<string>('all');
  const [actionFilter, setActionFilter] = useState<ActionFilter>('all');

  // Extract unique members from activities for the filter dropdown
  const memberOptions = useMemo(() => {
    const members = new Map<string, string>();
    for (const activity of activities) {
      const name =
        activity.member.full_name ||
        activity.member.email?.split('@')[0] ||
        activity.member.user_id;
      members.set(activity.member.user_id, name);
    }
    return [
      { value: 'all', label: 'All Members' },
      ...Array.from(members.entries()).map(([id, name]) => ({
        value: id,
        label: name,
      })),
    ];
  }, [activities]);

  const fetchActivities = useCallback(
    async (isRefresh = false) => {
      if (isRefresh) {
        setRefreshing(true);
      } else {
        setLoading(true);
      }
      setError(null);

      try {
        const supabase = createClient();
        const {
          data: { session },
        } = await supabase.auth.getSession();
        const token = session?.access_token;
        const headers: Record<string, string> = {
          'Content-Type': 'application/json',
        };
        if (token) {
          headers['Authorization'] = `Bearer ${token}`;
        }

        const url = new URL('/api/v1/team/activity', window.location.origin);
        url.searchParams.set('team_id', teamId);
        url.searchParams.set('limit', String(maxItems * 2)); // Fetch extra for filtering

        const response = await fetch(url.toString(), {
          credentials: 'include',
          headers,
        });

        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.error || 'Failed to fetch activities');
        }

        const data: ActivityResponse = await response.json();
        setActivities(data.activities || []);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load activities');
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [teamId, maxItems]
  );

  // Initial fetch and polling
  useEffect(() => {
    fetchActivities();

    const interval = setInterval(() => {
      fetchActivities(true);
    }, refreshInterval);

    return () => clearInterval(interval);
  }, [fetchActivities, refreshInterval]);

  // Apply filters and group by time
  const filteredActivities = useMemo(() => {
    let filtered = activities;

    if (memberFilter !== 'all') {
      filtered = filtered.filter((a) => a.member.user_id === memberFilter);
    }

    if (actionFilter !== 'all') {
      filtered = filtered.filter((a) => a.action === actionFilter);
    }

    return filtered.slice(0, maxItems);
  }, [activities, memberFilter, actionFilter, maxItems]);

  const groupedActivities = useMemo(
    () => groupActivitiesByTime(filteredActivities),
    [filteredActivities]
  );

  const handleManualRefresh = () => {
    fetchActivities(true);
  };

  // Loading state
  if (loading) {
    return (
      <Card className={className}>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Activity className="h-5 w-5" />
            Team Activity
          </CardTitle>
        </CardHeader>
        <CardContent className="flex items-center justify-center py-12">
          <LoadingSpinner />
        </CardContent>
      </Card>
    );
  }

  // Error state
  if (error) {
    return (
      <Card className={className}>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Activity className="h-5 w-5" />
            Team Activity
          </CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col items-center justify-center py-12 text-red-600">
          <AlertCircle className="h-8 w-8 mb-2" />
          <span>{error}</span>
          <Button
            variant="outline"
            size="sm"
            className="mt-4"
            onClick={handleManualRefresh}
          >
            <RefreshCw className="h-4 w-4 mr-2" />
            Retry
          </Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className={className}>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
        <CardTitle className="flex items-center gap-2">
          <Activity className="h-5 w-5" />
          Team Activity
          <span className="text-sm font-normal text-muted-foreground">
            ({filteredActivities.length})
          </span>
        </CardTitle>
        <Button
          variant="ghost"
          size="sm"
          onClick={handleManualRefresh}
          disabled={refreshing}
          className="h-8 w-8 p-0"
          title="Refresh"
        >
          <RefreshCw
            className={cn('h-4 w-4', refreshing && 'animate-spin')}
          />
        </Button>
      </CardHeader>

      <CardContent className="space-y-4">
        {/* Filters */}
        {showFilters && (
          <div className="flex flex-col sm:flex-row gap-3">
            {/* Member filter */}
            <div className="flex-1 max-w-xs">
              <Select
                options={memberOptions}
                value={memberFilter}
                onValueChange={setMemberFilter}
                className="w-full"
              />
            </div>

            {/* Action type chips */}
            <div className="flex flex-wrap gap-2">
              {(Object.keys(actionFilterConfig) as ActionFilter[]).map(
                (action) => {
                  const config = actionFilterConfig[action];
                  const isActive = actionFilter === action;
                  return (
                    <Button
                      key={action}
                      variant={isActive ? 'default' : 'outline'}
                      size="sm"
                      onClick={() => setActionFilter(action)}
                      className={cn(
                        'text-xs h-7',
                        isActive && action !== 'all' && config.className
                      )}
                    >
                      {config.label}
                    </Button>
                  );
                }
              )}
            </div>
          </div>
        )}

        {/* Activity list */}
        {filteredActivities.length === 0 ? (
          <div className="text-center py-12 text-muted-foreground">
            <Activity className="h-12 w-12 mx-auto mb-3 opacity-20" />
            <p>No activity yet</p>
            <p className="text-sm">
              Team activity will appear here as members work
            </p>
          </div>
        ) : (
          <div className="space-y-6">
            {groupedActivities.map((group) => (
              <div key={group.label}>
                <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">
                  {group.label}
                </h4>
                <div className="space-y-1 divide-y divide-border/50">
                  {group.activities.map((activity) => (
                    <ActivityItem
                      key={activity.id}
                      activity={activity}
                      showMemberName={true}
                    />
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

export default TeamActivityFeed;
