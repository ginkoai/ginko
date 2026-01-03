/**
 * @fileType: component
 * @status: current
 * @updated: 2026-01-03
 * @tags: [team, member, card, epic-008]
 * @related: [TeamMemberList.tsx, InviteButton.tsx]
 * @priority: high
 * @complexity: low
 * @dependencies: [react, lucide-react]
 */

'use client';

import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Avatar } from '@/components/ui/avatar';
import { cn } from '@/lib/utils';
import { Crown, Shield, User } from 'lucide-react';

// =============================================================================
// Types
// =============================================================================

export interface TeamMember {
  user_id: string;
  role: 'owner' | 'admin' | 'member';
  joined_at: string;
  invited_by?: string;
  user: {
    id: string;
    email: string;
    github_username?: string;
    full_name?: string;
    avatar_url?: string;
  } | null;
}

interface MemberCardProps {
  member: TeamMember;
  isCurrentUser?: boolean;
  className?: string;
}

// =============================================================================
// Helpers
// =============================================================================

const roleConfig = {
  owner: {
    label: 'Owner',
    icon: Crown,
    variant: 'default' as const,
    className: 'bg-amber-100 text-amber-800 dark:bg-amber-900 dark:text-amber-200',
  },
  admin: {
    label: 'Admin',
    icon: Shield,
    variant: 'secondary' as const,
    className: 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200',
  },
  member: {
    label: 'Member',
    icon: User,
    variant: 'outline' as const,
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

export function MemberCard({ member, isCurrentUser, className }: MemberCardProps) {
  const config = roleConfig[member.role];
  const RoleIcon = config.icon;

  const displayName = member.user?.full_name || member.user?.github_username || member.user?.email || 'Unknown';
  const email = member.user?.email || '';
  const avatarUrl = member.user?.avatar_url;

  return (
    <Card
      className={cn(
        'p-4 hover:shadow-md transition-shadow',
        isCurrentUser && 'ring-2 ring-ginko-500/30',
        className
      )}
    >
      <div className="flex items-center gap-4">
        {/* Avatar */}
        <Avatar
          size="lg"
          src={avatarUrl}
          alt={displayName}
          fallback={getInitials(member.user?.full_name, member.user?.email)}
          className="bg-ginko-100 text-ginko-700"
        />

        {/* Info */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <span className="font-medium text-sm truncate">{displayName}</span>
            {isCurrentUser && (
              <span className="text-xs text-muted-foreground">(you)</span>
            )}
          </div>
          <div className="text-xs text-muted-foreground truncate">{email}</div>
        </div>

        {/* Role Badge */}
        <Badge className={cn('flex items-center gap-1', config.className)}>
          <RoleIcon className="h-3 w-3" />
          <span>{config.label}</span>
        </Badge>
      </div>

      {/* Join info */}
      <div className="mt-3 pt-3 border-t text-xs text-muted-foreground">
        Joined {getTimeSince(member.joined_at)}
      </div>
    </Card>
  );
}

export default MemberCard;
