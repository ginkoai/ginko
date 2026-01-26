/**
 * @fileType: component
 * @status: current
 * @updated: 2026-01-26
 * @tags: [team, status, grid, epic-016, sprint-3]
 * @related: [MemberStatusCard.tsx, UnassignedWorkSection.tsx]
 * @priority: high
 * @complexity: medium
 * @dependencies: [react, lucide-react]
 */

'use client';

import { useState, useEffect, useCallback } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Skeleton, SkeletonCircle } from '@/components/ui/skeleton';
import { MemberStatusCard, MemberStatusData } from './MemberStatusCard';
import { UnassignedWorkSection, UnassignedWork } from './UnassignedWorkSection';
import { cn } from '@/lib/utils';
import { Users, AlertCircle, RefreshCw } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';

// =============================================================================
// Types
// =============================================================================

interface TeamStatusGridProps {
  graphId: string;
  refreshInterval?: number;
  className?: string;
}

interface TeamStatusResponse {
  members: MemberStatusData[];
  unassigned: UnassignedWork[];
  summary: {
    totalMembers: number;
    activeMembers: number;
    totalUnassigned: number;
  };
}

// =============================================================================
// Loading Skeleton
// =============================================================================

function StatusGridSkeleton() {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
      {[1, 2, 3, 4, 5, 6].map((i) => (
        <Card key={i} className="p-4">
          <div className="flex items-start gap-3">
            <SkeletonCircle className="h-12 w-12" />
            <div className="flex-1 space-y-2">
              <Skeleton className="h-4 w-32" />
              <Skeleton className="h-3 w-48" />
              <Skeleton className="h-2 w-full" />
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

export function TeamStatusGrid({
  graphId,
  refreshInterval = 30000,
  className,
}: TeamStatusGridProps) {
  const [data, setData] = useState<TeamStatusResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [lastRefresh, setLastRefresh] = useState<Date>(new Date());

  const fetchStatus = useCallback(async (isBackgroundRefresh = false) => {
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

      const headers: HeadersInit = token
        ? { Authorization: `Bearer ${token}` }
        : {};

      const response = await fetch(
        `/api/v1/team/status?graphId=${encodeURIComponent(graphId)}`,
        {
          credentials: 'include',
          headers,
        }
      );

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error?.message || errorData.error || 'Failed to fetch team status');
      }

      const statusData: TeamStatusResponse = await response.json();
      setData(statusData);
      setLastRefresh(new Date());
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load team status');
    } finally {
      setLoading(false);
      setIsRefreshing(false);
    }
  }, [graphId]);

  // Initial fetch
  useEffect(() => {
    fetchStatus();
  }, [fetchStatus]);

  // Auto-refresh
  useEffect(() => {
    if (refreshInterval > 0) {
      const interval = setInterval(() => fetchStatus(true), refreshInterval);
      return () => clearInterval(interval);
    }
  }, [fetchStatus, refreshInterval]);

  const handleManualRefresh = () => {
    fetchStatus(true);
  };

  const handleClaim = async (sprintId: string) => {
    // TODO: Implement claim functionality
    console.log('Claim sprint:', sprintId);
  };

  // Loading state
  if (loading) {
    return (
      <div className={cn('space-y-6', className)}>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <Users className="h-5 w-5" />
              Team Status
            </CardTitle>
          </CardHeader>
          <CardContent>
            <StatusGridSkeleton />
          </CardContent>
        </Card>
      </div>
    );
  }

  // Error state
  if (error) {
    return (
      <Card className={className}>
        <CardContent className="flex flex-col items-center justify-center py-12 text-red-600">
          <AlertCircle className="h-8 w-8 mb-3" />
          <p className="font-medium">Error loading team status</p>
          <p className="text-sm text-muted-foreground mt-1">{error}</p>
          <button
            onClick={() => fetchStatus()}
            className="mt-4 text-sm text-red-700 underline hover:no-underline"
          >
            Retry
          </button>
        </CardContent>
      </Card>
    );
  }

  if (!data) {
    return null;
  }

  // Sort members: active first, then by activity
  const sortedMembers = [...data.members].sort((a, b) => {
    const getActivityScore = (member: MemberStatusData) => {
      if (!member.lastActivity) return 0;
      const hours = (Date.now() - new Date(member.lastActivity).getTime()) / (1000 * 60 * 60);
      if (hours < 1) return 3;  // active
      if (hours < 24) return 2; // idle
      return 1; // offline
    };

    const scoreDiff = getActivityScore(b) - getActivityScore(a);
    if (scoreDiff !== 0) return scoreDiff;

    // Within same status, sort by last activity
    const aTime = a.lastActivity ? new Date(a.lastActivity).getTime() : 0;
    const bTime = b.lastActivity ? new Date(b.lastActivity).getTime() : 0;
    return bTime - aTime;
  });

  return (
    <div className={cn('space-y-6', className)}>
      {/* Members Grid */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <div className="flex items-center gap-4">
            <CardTitle className="flex items-center gap-2">
              <Users className="h-5 w-5" />
              Team Status
            </CardTitle>
            {/* Summary Stats */}
            <div className="flex items-center gap-3 text-xs text-muted-foreground">
              <span>{data.summary.totalMembers} members</span>
              <span className="flex items-center gap-1">
                <span className="h-2 w-2 rounded-full bg-green-500" />
                {data.summary.activeMembers} active today
              </span>
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
          {sortedMembers.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <Users className="h-12 w-12 mx-auto mb-3 opacity-20" />
              <p>No team members with assigned work</p>
              <p className="text-sm">Assign tasks to team members to see their progress here</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {sortedMembers.map((member) => (
                <MemberStatusCard
                  key={member.email}
                  member={member}
                />
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Unassigned Work Section */}
      <UnassignedWorkSection
        unassigned={data.unassigned}
        onClaim={handleClaim}
      />
    </div>
  );
}

export default TeamStatusGrid;
