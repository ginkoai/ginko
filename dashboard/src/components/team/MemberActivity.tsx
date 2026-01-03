/**
 * @fileType: component
 * @status: current
 * @updated: 2026-01-03
 * @tags: [team, member, activity, status, epic-008, sprint-2]
 * @related: [TeamWorkboard.tsx, MemberCard.tsx, agent-card.tsx]
 * @priority: high
 * @complexity: medium
 * @dependencies: [react, lucide-react]
 */

'use client';

import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Avatar } from '@/components/ui/avatar';
import { cn } from '@/lib/utils';
import { Crown, User, ChevronDown, ChevronUp, Activity } from 'lucide-react';

// =============================================================================
// Types
// =============================================================================

export interface MemberStatus {
  member: {
    user_id: string;
    email: string;
    github_username?: string;
    avatar_url?: string;
    full_name?: string;
    role: 'owner' | 'member';
  };
  status: 'active' | 'idle' | 'offline'; // <5min, <1h, >1h
  currentTask?: {
    id: string;
    title: string;
    type: string;
  };
  lastActivity?: string; // ISO timestamp
  recentActions?: string[]; // last 3 action descriptions
}

export interface MemberActivityProps {
  memberStatus: MemberStatus;
  onClick?: (memberId: string) => void;
  expanded?: boolean;
  className?: string;
}

// =============================================================================
// Helpers
// =============================================================================

const statusConfig = {
  active: {
    label: 'Active',
    dotClass: 'bg-green-500',
    badgeVariant: 'success' as const,
    description: 'Active now',
  },
  idle: {
    label: 'Idle',
    dotClass: 'bg-yellow-500',
    badgeVariant: 'warning' as const,
    description: 'Away',
  },
  offline: {
    label: 'Offline',
    dotClass: 'bg-gray-400',
    badgeVariant: 'secondary' as const,
    description: 'Offline',
  },
};

const roleConfig: Record<string, { label: string; icon: typeof Crown; className: string }> = {
  owner: {
    label: 'Owner',
    icon: Crown,
    className: 'bg-amber-100 text-amber-800 dark:bg-amber-900 dark:text-amber-200',
  },
  member: {
    label: 'Member',
    icon: User,
    className: '',
  },
};

function getTimeSince(dateString: string): string {
  const date = new Date(dateString);
  const now = new Date();
  const seconds = Math.floor((now.getTime() - date.getTime()) / 1000);

  if (seconds < 60) return 'just now';
  if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`;
  if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`;
  if (seconds < 2592000) return `${Math.floor(seconds / 86400)}d ago`;
  return date.toLocaleDateString();
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

// =============================================================================
// Component
// =============================================================================

export function MemberActivity({
  memberStatus,
  onClick,
  expanded = false,
  className,
}: MemberActivityProps) {
  const { member, status, currentTask, lastActivity, recentActions } = memberStatus;
  const statusCfg = statusConfig[status];
  const roleCfg = roleConfig[member.role] || roleConfig.member;
  const RoleIcon = roleCfg.icon;

  const displayName =
    member.full_name || member.github_username || member.email || 'Unknown';
  const avatarUrl =
    member.avatar_url ||
    (member.github_username
      ? `https://github.com/${member.github_username}.png`
      : undefined);

  const handleClick = () => {
    if (onClick) {
      onClick(member.user_id);
    }
  };

  return (
    <Card
      className={cn(
        'p-4 hover:shadow-md transition-all cursor-pointer relative overflow-hidden',
        expanded && 'ring-2 ring-ginko-500/30',
        className
      )}
      onClick={handleClick}
    >
      {/* Status Indicator Dot - Absolute positioned in corner */}
      <div
        className={cn(
          'absolute top-3 right-3 h-3 w-3 rounded-full',
          statusCfg.dotClass,
          status === 'active' && 'animate-pulse'
        )}
        title={statusCfg.description}
      />

      {/* Main Content */}
      <div className="flex items-start gap-3">
        {/* Avatar with status overlay */}
        <div className="relative">
          <Avatar
            size="lg"
            src={avatarUrl}
            alt={displayName}
            fallback={getInitials(member.full_name, member.email)}
            className="bg-ginko-100 text-ginko-700"
          />
        </div>

        {/* Member Info */}
        <div className="flex-1 min-w-0 pr-4">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="font-medium text-sm truncate">{displayName}</span>
            <Badge className={cn('flex items-center gap-1 text-xs', roleCfg.className)}>
              <RoleIcon className="h-3 w-3" />
              <span>{roleCfg.label}</span>
            </Badge>
          </div>
          <div className="text-xs text-muted-foreground truncate mt-0.5">
            {member.email}
          </div>

          {/* Status and Last Activity */}
          <div className="flex items-center gap-2 mt-2 text-xs text-muted-foreground">
            <span className={cn('font-medium', status === 'active' && 'text-green-600')}>
              {statusCfg.description}
            </span>
            {lastActivity && (
              <>
                <span className="text-muted-foreground/50">·</span>
                <span>{getTimeSince(lastActivity)}</span>
              </>
            )}
          </div>
        </div>

        {/* Expand Indicator */}
        {(currentTask || (recentActions && recentActions.length > 0)) && (
          <div className="text-muted-foreground">
            {expanded ? (
              <ChevronUp className="h-4 w-4" />
            ) : (
              <ChevronDown className="h-4 w-4" />
            )}
          </div>
        )}
      </div>

      {/* Current Task */}
      {currentTask && (
        <div className="mt-3 p-2 bg-ginko-50 dark:bg-ginko-900/20 rounded-md border border-ginko-200/50 dark:border-ginko-700/30">
          <div className="flex items-center gap-2">
            <Activity className="h-3 w-3 text-ginko-600" />
            <p className="text-xs font-medium text-ginko-700 dark:text-ginko-300">
              Working on
            </p>
          </div>
          <p className="text-sm text-ginko-900 dark:text-ginko-100 mt-1 truncate">
            {currentTask.title}
          </p>
        </div>
      )}

      {/* Expanded: Recent Actions */}
      {expanded && recentActions && recentActions.length > 0 && (
        <div className="mt-3 pt-3 border-t border-border">
          <p className="text-xs font-medium text-muted-foreground mb-2">
            Recent Activity
          </p>
          <ul className="space-y-1.5">
            {recentActions.map((action, index) => (
              <li key={index} className="text-xs text-muted-foreground flex items-start gap-2">
                <span className="text-muted-foreground/50 mt-0.5">·</span>
                <span className="line-clamp-2">{action}</span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </Card>
  );
}

export default MemberActivity;
