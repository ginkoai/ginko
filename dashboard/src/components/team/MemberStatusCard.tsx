/**
 * @fileType: component
 * @status: current
 * @updated: 2026-01-26
 * @tags: [team, member, status, progress, epic-016, sprint-3]
 * @related: [TeamStatusGrid.tsx, UnassignedWorkSection.tsx]
 * @priority: high
 * @complexity: low
 * @dependencies: [react, lucide-react]
 */

'use client';

import { Card } from '@/components/ui/card';
import { Avatar } from '@/components/ui/avatar';
import { cn } from '@/lib/utils';

// =============================================================================
// Types
// =============================================================================

export interface MemberProgress {
  complete: number;
  total: number;
  inProgress: number;
}

export interface ActiveSprint {
  id: string;
  title: string;
  epic: {
    id: string;
    title: string;
  };
}

export interface MemberStatusData {
  email: string;
  name?: string;
  activeSprint: ActiveSprint | null;
  progress: MemberProgress;
  lastActivity: string | null;
}

interface MemberStatusCardProps {
  member: MemberStatusData;
  className?: string;
  onClick?: () => void;
}

// =============================================================================
// Helpers
// =============================================================================

function getTimeSince(dateString: string | null): string {
  if (!dateString) return 'never';

  const date = new Date(dateString);
  const now = new Date();
  const seconds = Math.floor((now.getTime() - date.getTime()) / 1000);

  if (seconds < 60) return 'just now';
  if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`;
  if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`;
  if (seconds < 604800) return `${Math.floor(seconds / 86400)}d ago`;
  return `${Math.floor(seconds / 604800)}w ago`;
}

function getActivityStatus(lastActivity: string | null): 'active' | 'idle' | 'offline' {
  if (!lastActivity) return 'offline';

  const date = new Date(lastActivity);
  const now = new Date();
  const hours = (now.getTime() - date.getTime()) / (1000 * 60 * 60);

  if (hours < 1) return 'active';
  if (hours < 24) return 'idle';
  return 'offline';
}

function getInitials(name?: string, email?: string): string {
  if (name) {
    return name
      .split(' ')
      .map((n) => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
  }
  if (email) {
    return email.slice(0, 2).toUpperCase();
  }
  return '??';
}

function formatSprintName(sprint: ActiveSprint): string {
  // Try to extract epic number from ID (e.g., e016_s01 -> EPIC-016 Sprint 1)
  const match = sprint.id.match(/e(\d+)_s(\d+)/);
  if (match) {
    const epicNum = parseInt(match[1], 10);
    const sprintNum = parseInt(match[2], 10);
    return `EPIC-${epicNum.toString().padStart(3, '0')} Sprint ${sprintNum}`;
  }
  return `${sprint.epic.title} ${sprint.title}`.slice(0, 30);
}

// =============================================================================
// ProgressBar Component
// =============================================================================

function ProgressBar({ complete, total, inProgress }: MemberProgress) {
  if (total === 0) {
    return <span className="text-xs text-muted-foreground">no tasks</span>;
  }

  const completePercent = (complete / total) * 100;
  const inProgressPercent = (inProgress / total) * 100;

  return (
    <div className="flex items-center gap-2">
      <span className="text-xs text-muted-foreground w-12">
        {complete}/{total}
      </span>
      <div className="flex-1 h-2 bg-gray-200 rounded-full overflow-hidden">
        <div className="h-full flex">
          <div
            className="bg-green-500 transition-all duration-300"
            style={{ width: `${completePercent}%` }}
          />
          <div
            className="bg-blue-400 transition-all duration-300"
            style={{ width: `${inProgressPercent}%` }}
          />
        </div>
      </div>
      <span className="text-xs text-muted-foreground w-10 text-right">
        {Math.round(completePercent)}%
      </span>
    </div>
  );
}

// =============================================================================
// StatusIndicator Component
// =============================================================================

function StatusIndicator({ status }: { status: 'active' | 'idle' | 'offline' }) {
  const colors = {
    active: 'bg-green-500',
    idle: 'bg-yellow-500',
    offline: 'bg-gray-400',
  };

  return (
    <span
      className={cn(
        'h-2.5 w-2.5 rounded-full',
        colors[status],
        status === 'active' && 'animate-pulse'
      )}
      title={status}
    />
  );
}

// =============================================================================
// Component
// =============================================================================

export function MemberStatusCard({ member, className, onClick }: MemberStatusCardProps) {
  const displayName = member.name || member.email.split('@')[0];
  const activityStatus = getActivityStatus(member.lastActivity);
  const timeAgo = getTimeSince(member.lastActivity);

  return (
    <Card
      className={cn(
        'p-4 hover:shadow-md transition-shadow cursor-pointer',
        className
      )}
      onClick={onClick}
    >
      <div className="flex items-start gap-3">
        {/* Avatar with status indicator */}
        <div className="relative">
          <Avatar
            size="lg"
            alt={displayName}
            fallback={getInitials(member.name, member.email)}
            className="bg-ginko-100 text-ginko-700"
          />
          <div className="absolute -bottom-0.5 -right-0.5 p-0.5 bg-white rounded-full">
            <StatusIndicator status={activityStatus} />
          </div>
        </div>

        {/* Info */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between gap-2">
            <span className="font-medium text-sm truncate">{displayName}</span>
            <span className="text-xs text-muted-foreground whitespace-nowrap">
              {timeAgo}
            </span>
          </div>
          <div className="text-xs text-muted-foreground truncate mb-2">
            {member.email}
          </div>

          {/* Sprint and Progress */}
          {member.activeSprint ? (
            <div className="space-y-1">
              <div className="text-xs font-medium text-gray-700 truncate">
                {formatSprintName(member.activeSprint)}
              </div>
              <ProgressBar {...member.progress} />
            </div>
          ) : (
            <div className="text-xs text-muted-foreground italic">
              No active work assigned
            </div>
          )}
        </div>
      </div>
    </Card>
  );
}

export default MemberStatusCard;
