/**
 * @fileType: component
 * @status: current
 * @updated: 2026-01-03
 * @tags: [team, activity, item, epic-008]
 * @related: [TeamActivityFeed.tsx, MemberCard.tsx]
 * @priority: high
 * @complexity: low
 * @dependencies: [react, lucide-react]
 */

'use client';

import { Avatar } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { GitMerge, Edit3, Plus, MessageSquare } from 'lucide-react';

// =============================================================================
// Types
// =============================================================================

export interface ActivityItemData {
  id: string;
  member: {
    user_id: string;
    email: string;
    avatar_url?: string;
    full_name?: string;
  };
  action: 'synced' | 'edited' | 'created' | 'logged';
  target_type: 'ADR' | 'Pattern' | 'Sprint' | 'Event';
  target_id: string;
  target_title?: string;
  timestamp: string;
  description?: string;
}

export interface ActivityItemProps {
  activity: ActivityItemData;
  showMemberName?: boolean;
  onClick?: () => void;
}

// =============================================================================
// Helpers
// =============================================================================

const actionConfig: Record<
  ActivityItemData['action'],
  {
    label: string;
    icon: typeof GitMerge;
    variant: 'default' | 'secondary' | 'success' | 'warning';
    className: string;
  }
> = {
  synced: {
    label: 'Synced',
    icon: GitMerge,
    variant: 'default',
    className: 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200',
  },
  edited: {
    label: 'Edited',
    icon: Edit3,
    variant: 'warning',
    className: 'bg-amber-100 text-amber-800 dark:bg-amber-900 dark:text-amber-200',
  },
  created: {
    label: 'Created',
    icon: Plus,
    variant: 'success',
    className: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200',
  },
  logged: {
    label: 'Logged',
    icon: MessageSquare,
    variant: 'secondary',
    className: 'bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200',
  },
};

const targetTypeColors: Record<ActivityItemData['target_type'], string> = {
  ADR: 'text-purple-600 dark:text-purple-400',
  Pattern: 'text-blue-600 dark:text-blue-400',
  Sprint: 'text-green-600 dark:text-green-400',
  Event: 'text-gray-600 dark:text-gray-400',
};

function getRelativeTime(dateString: string): string {
  const date = new Date(dateString);
  const now = new Date();
  const seconds = Math.floor((now.getTime() - date.getTime()) / 1000);

  if (seconds < 60) return 'just now';
  if (seconds < 3600) {
    const mins = Math.floor(seconds / 60);
    return `${mins} minute${mins > 1 ? 's' : ''} ago`;
  }
  if (seconds < 86400) {
    const hours = Math.floor(seconds / 3600);
    return `${hours} hour${hours > 1 ? 's' : ''} ago`;
  }
  if (seconds < 172800) return 'yesterday';
  if (seconds < 604800) {
    const days = Math.floor(seconds / 86400);
    return `${days} day${days > 1 ? 's' : ''} ago`;
  }
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

export function ActivityItem({
  activity,
  showMemberName = true,
  onClick,
}: ActivityItemProps) {
  const config = actionConfig[activity.action];
  const ActionIcon = config.icon;

  const displayName =
    activity.member.full_name ||
    activity.member.email?.split('@')[0] ||
    'Unknown';

  return (
    <div
      className={cn(
        'flex items-start gap-3 p-3 rounded-lg transition-colors',
        onClick && 'cursor-pointer hover:bg-muted/50'
      )}
      onClick={onClick}
      role={onClick ? 'button' : undefined}
      tabIndex={onClick ? 0 : undefined}
      onKeyDown={
        onClick
          ? (e) => {
              if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                onClick();
              }
            }
          : undefined
      }
    >
      {/* Avatar */}
      <Avatar
        size="default"
        src={activity.member.avatar_url}
        alt={displayName}
        fallback={getInitials(activity.member.full_name, activity.member.email)}
        className="bg-ginko-100 text-ginko-700 flex-shrink-0"
      />

      {/* Content */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 flex-wrap">
          {showMemberName && (
            <span className="font-medium text-sm truncate">{displayName}</span>
          )}
          <Badge className={cn('flex items-center gap-1', config.className)}>
            <ActionIcon className="h-3 w-3" />
            <span>{config.label}</span>
          </Badge>
          <span className={cn('text-sm font-medium', targetTypeColors[activity.target_type])}>
            {activity.target_type}
          </span>
        </div>

        {/* Target title */}
        {activity.target_title && (
          <p className="text-sm text-foreground mt-0.5 truncate">
            {activity.target_title}
          </p>
        )}

        {/* Description */}
        {activity.description && (
          <p className="text-xs text-muted-foreground mt-1 line-clamp-2">
            {activity.description}
          </p>
        )}

        {/* Timestamp */}
        <p className="text-xs text-muted-foreground mt-1">
          {getRelativeTime(activity.timestamp)}
        </p>
      </div>
    </div>
  );
}

export default ActivityItem;
