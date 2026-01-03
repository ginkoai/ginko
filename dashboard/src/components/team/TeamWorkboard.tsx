/**
 * @fileType: component
 * @status: current
 * @updated: 2026-01-03
 * @tags: [team, workboard, activity, dashboard, epic-008, sprint-2]
 * @related: [MemberActivity.tsx, TeamMemberList.tsx, MemberCard.tsx]
 * @priority: high
 * @complexity: medium
 * @dependencies: [react, lucide-react]
 */

'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Skeleton, SkeletonCircle } from '@/components/ui/skeleton';
import { MemberActivity, MemberStatus } from './MemberActivity';
import { cn } from '@/lib/utils';
import { Users, AlertCircle, RefreshCw } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';

// =============================================================================
// Types
// =============================================================================

export interface TeamWorkboardProps {
  teamId: string;
  graphId: string;
  refreshInterval?: number; // default 15000ms (15s)
  className?: string;
}

interface TeamMember {
  user_id: string;
  role: 'owner' | 'member';
  joined_at: string;
  user: {
    id: string;
    email: string;
    github_username?: string;
    full_name?: string;
    avatar_url?: string;
  } | null;
}

interface ActivityItem {
  id: string;
  member: {
    user_id: string;
    email: string;
    avatar_url?: string;
  };
  action: 'synced' | 'edited' | 'created' | 'logged';
  target_type: 'ADR' | 'Pattern' | 'Sprint' | 'Event';
  target_id: string;
  target_title?: string;
  timestamp: string;
  description?: string;
}

interface ActivityResponse {
  activities: ActivityItem[];
  count: number;
  hasMore: boolean;
}

interface MembersResponse {
  members: TeamMember[];
  count: number;
}

// =============================================================================
// Helpers
// =============================================================================

/**
 * Calculate member status based on last activity timestamp
 * - active: <5 minutes ago
 * - idle: <1 hour ago
 * - offline: >1 hour ago
 */
function calculateStatus(lastActivity?: string): 'active' | 'idle' | 'offline' {
  if (!lastActivity) return 'offline';

  const activityTime = new Date(lastActivity).getTime();
  const now = Date.now();
  const diffMs = now - activityTime;

  const fiveMinutes = 5 * 60 * 1000;
  const oneHour = 60 * 60 * 1000;

  if (diffMs < fiveMinutes) return 'active';
  if (diffMs < oneHour) return 'idle';
  return 'offline';
}

/**
 * Format action description from activity item
 */
function formatActionDescription(activity: ActivityItem): string {
  const actionVerb = {
    synced: 'Synced',
    edited: 'Edited',
    created: 'Created',
    logged: 'Logged',
  }[activity.action];

  const target = activity.target_title || activity.target_id;
  const description = activity.description
    ? `: ${activity.description.slice(0, 60)}${activity.description.length > 60 ? '...' : ''}`
    : '';

  return `${actionVerb} ${activity.target_type.toLowerCase()}${target ? ` (${target})` : ''}${description}`;
}

/**
 * Detect current task from recent activities
 */
function detectCurrentTask(
  activities: ActivityItem[]
): { id: string; title: string; type: string } | undefined {
  if (activities.length === 0) return undefined;

  // Look for recent sprint/task activity
  const recentActivity = activities[0];
  const now = Date.now();
  const activityTime = new Date(recentActivity.timestamp).getTime();

  // Only consider activity in last 30 minutes as "current"
  if (now - activityTime > 30 * 60 * 1000) return undefined;

  // Return most recent activity as current task
  return {
    id: recentActivity.target_id,
    title: recentActivity.description || recentActivity.target_title || recentActivity.target_id,
    type: recentActivity.target_type,
  };
}

// =============================================================================
// Loading Skeleton
// =============================================================================

function WorkboardSkeleton() {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
      {[1, 2, 3, 4, 5, 6].map((i) => (
        <Card key={i} className="p-4">
          <div className="flex items-start gap-3">
            <SkeletonCircle className="h-12 w-12" />
            <div className="flex-1 space-y-2">
              <Skeleton className="h-4 w-32" />
              <Skeleton className="h-3 w-48" />
              <Skeleton className="h-3 w-24" />
            </div>
          </div>
        </Card>
      ))}
    </div>
  );
}

// =============================================================================
// Component
// =============================================================================

export function TeamWorkboard({
  teamId,
  graphId,
  refreshInterval = 15000,
  className,
}: TeamWorkboardProps) {
  const [memberStatuses, setMemberStatuses] = useState<MemberStatus[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [expandedMember, setExpandedMember] = useState<string | null>(null);
  const [lastRefresh, setLastRefresh] = useState<Date>(new Date());
  const [isRefreshing, setIsRefreshing] = useState(false);
  const refreshTimerRef = useRef<NodeJS.Timeout | null>(null);

  /**
   * Fetch members and activity, then merge into MemberStatus objects
   */
  const fetchWorkboard = useCallback(async (isBackgroundRefresh = false) => {
    if (!isBackgroundRefresh) {
      setLoading(true);
    } else {
      setIsRefreshing(true);
    }
    setError(null);

    try {
      const supabase = createClient();
      const { data: { session } } = await supabase.auth.getSession();
      const token = session?.access_token;
      const headers: HeadersInit = token ? { Authorization: `Bearer ${token}` } : {};

      // Fetch members and activity in parallel
      const [membersRes, activityRes] = await Promise.all([
        fetch(`/api/v1/teams/${teamId}/members`, {
          credentials: 'include',
          headers,
        }),
        fetch(`/api/v1/team/activity?team_id=${teamId}&limit=100`, {
          credentials: 'include',
          headers,
        }),
      ]);

      if (!membersRes.ok) {
        const errorData = await membersRes.json();
        throw new Error(errorData.error || 'Failed to fetch team members');
      }

      const membersData: MembersResponse = await membersRes.json();

      // Activity might fail if no graph_id yet - that's ok
      let activities: ActivityItem[] = [];
      if (activityRes.ok) {
        const activityData: ActivityResponse = await activityRes.json();
        activities = activityData.activities;
      }

      // Group activities by member
      const activityByMember = new Map<string, ActivityItem[]>();
      activities.forEach((activity) => {
        const memberId = activity.member.user_id;
        if (!activityByMember.has(memberId)) {
          activityByMember.set(memberId, []);
        }
        activityByMember.get(memberId)!.push(activity);
      });

      // Build MemberStatus for each member
      const statuses: MemberStatus[] = membersData.members.map((member) => {
        const memberActivities = activityByMember.get(member.user_id) || [];
        const latestActivity = memberActivities[0];

        return {
          member: {
            user_id: member.user_id,
            email: member.user?.email || '',
            github_username: member.user?.github_username,
            avatar_url: member.user?.avatar_url,
            full_name: member.user?.full_name,
            role: member.role,
          },
          status: calculateStatus(latestActivity?.timestamp),
          currentTask: detectCurrentTask(memberActivities),
          lastActivity: latestActivity?.timestamp,
          recentActions: memberActivities.slice(0, 3).map(formatActionDescription),
        };
      });

      // Sort: active first, then idle, then offline; within each group, by last activity
      statuses.sort((a, b) => {
        const statusOrder = { active: 0, idle: 1, offline: 2 };
        const orderDiff = statusOrder[a.status] - statusOrder[b.status];
        if (orderDiff !== 0) return orderDiff;

        // Within same status, sort by last activity (most recent first)
        const aTime = a.lastActivity ? new Date(a.lastActivity).getTime() : 0;
        const bTime = b.lastActivity ? new Date(b.lastActivity).getTime() : 0;
        return bTime - aTime;
      });

      setMemberStatuses(statuses);
      setLastRefresh(new Date());
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load workboard');
    } finally {
      setLoading(false);
      setIsRefreshing(false);
    }
  }, [teamId]);

  // Initial fetch
  useEffect(() => {
    fetchWorkboard();
  }, [fetchWorkboard]);

  // Set up auto-refresh interval
  useEffect(() => {
    if (refreshInterval > 0) {
      refreshTimerRef.current = setInterval(() => {
        fetchWorkboard(true); // background refresh
      }, refreshInterval);
    }

    return () => {
      if (refreshTimerRef.current) {
        clearInterval(refreshTimerRef.current);
      }
    };
  }, [fetchWorkboard, refreshInterval]);

  const handleMemberClick = (memberId: string) => {
    setExpandedMember((prev) => (prev === memberId ? null : memberId));
  };

  const handleManualRefresh = () => {
    fetchWorkboard(true);
  };

  // Loading state
  if (loading) {
    return (
      <Card className={className}>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <Users className="h-5 w-5" />
            Team Workboard
          </CardTitle>
        </CardHeader>
        <CardContent>
          <WorkboardSkeleton />
        </CardContent>
      </Card>
    );
  }

  // Error state
  if (error) {
    return (
      <Card className={className}>
        <CardContent className="flex items-center justify-center py-12 text-red-600">
          <AlertCircle className="h-5 w-5 mr-2" />
          <span>{error}</span>
        </CardContent>
      </Card>
    );
  }

  // Count by status
  const activeCount = memberStatuses.filter((m) => m.status === 'active').length;
  const idleCount = memberStatuses.filter((m) => m.status === 'idle').length;
  const offlineCount = memberStatuses.filter((m) => m.status === 'offline').length;

  return (
    <Card className={className}>
      <CardHeader className="flex flex-row items-center justify-between">
        <div className="flex items-center gap-4">
          <CardTitle className="flex items-center gap-2">
            <Users className="h-5 w-5" />
            Team Workboard
          </CardTitle>
          {/* Status Summary */}
          <div className="flex items-center gap-3 text-xs text-muted-foreground">
            {activeCount > 0 && (
              <span className="flex items-center gap-1">
                <span className="h-2 w-2 rounded-full bg-green-500" />
                {activeCount} active
              </span>
            )}
            {idleCount > 0 && (
              <span className="flex items-center gap-1">
                <span className="h-2 w-2 rounded-full bg-yellow-500" />
                {idleCount} idle
              </span>
            )}
            {offlineCount > 0 && (
              <span className="flex items-center gap-1">
                <span className="h-2 w-2 rounded-full bg-gray-400" />
                {offlineCount} offline
              </span>
            )}
          </div>
        </div>

        {/* Refresh Button */}
        <button
          onClick={handleManualRefresh}
          disabled={isRefreshing}
          className={cn(
            'p-2 rounded-md hover:bg-muted transition-colors text-muted-foreground',
            isRefreshing && 'animate-spin'
          )}
          title={`Last updated: ${lastRefresh.toLocaleTimeString()}`}
        >
          <RefreshCw className="h-4 w-4" />
        </button>
      </CardHeader>

      <CardContent>
        {memberStatuses.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            <Users className="h-12 w-12 mx-auto mb-3 opacity-20" />
            <p>No team members yet</p>
            <p className="text-sm">Invite collaborators to get started</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {memberStatuses.map((memberStatus) => (
              <MemberActivity
                key={memberStatus.member.user_id}
                memberStatus={memberStatus}
                onClick={handleMemberClick}
                expanded={expandedMember === memberStatus.member.user_id}
              />
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

export default TeamWorkboard;
