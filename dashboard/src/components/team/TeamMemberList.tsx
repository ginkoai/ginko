/**
 * @fileType: component
 * @status: current
 * @updated: 2026-01-03
 * @tags: [team, members, list, epic-008]
 * @related: [MemberCard.tsx, InviteButton.tsx]
 * @priority: high
 * @complexity: medium
 * @dependencies: [react, lucide-react]
 */

'use client';

import { useState, useEffect, useCallback } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { LoadingSpinner } from '@/components/ui/loading-spinner';
import { MemberCard, TeamMember } from './MemberCard';
import { InviteButton } from './InviteButton';
import { cn } from '@/lib/utils';
import { Users, AlertCircle } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';

// =============================================================================
// Types
// =============================================================================

interface TeamMemberListProps {
  teamId: string;
  currentUserId?: string;
  showInviteButton?: boolean;
  className?: string;
}

interface MembersResponse {
  members: TeamMember[];
  count: number;
}

// =============================================================================
// Component
// =============================================================================

export function TeamMemberList({
  teamId,
  currentUserId,
  showInviteButton = true,
  className,
}: TeamMemberListProps) {
  const [members, setMembers] = useState<TeamMember[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchMembers = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const supabase = createClient();
      const { data: { session } } = await supabase.auth.getSession();
      const token = session?.access_token;

      const response = await fetch(`/api/v1/teams/${teamId}/members`, {
        credentials: 'include',
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to fetch members');
      }

      const data: MembersResponse = await response.json();
      setMembers(data.members);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load members');
    } finally {
      setLoading(false);
    }
  }, [teamId]);

  useEffect(() => {
    fetchMembers();
  }, [fetchMembers]);

  // Sort members: owners first, then admins, then members, then by join date
  const sortedMembers = [...members].sort((a, b) => {
    const roleOrder = { owner: 0, admin: 1, member: 2 };
    const aOrder = roleOrder[a.role] ?? 3;
    const bOrder = roleOrder[b.role] ?? 3;
    if (aOrder !== bOrder) return aOrder - bOrder;
    return new Date(a.joined_at).getTime() - new Date(b.joined_at).getTime();
  });

  if (loading) {
    return (
      <Card className={className}>
        <CardContent className="flex items-center justify-center py-12">
          <LoadingSpinner />
        </CardContent>
      </Card>
    );
  }

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

  return (
    <Card className={className}>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle className="flex items-center gap-2">
          <Users className="h-5 w-5" />
          Team Members
          <span className="text-sm font-normal text-muted-foreground">
            ({members.length})
          </span>
        </CardTitle>
        {showInviteButton && (
          <InviteButton teamId={teamId} onInviteSent={fetchMembers} />
        )}
      </CardHeader>
      <CardContent>
        {sortedMembers.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            <Users className="h-12 w-12 mx-auto mb-3 opacity-20" />
            <p>No team members yet</p>
            <p className="text-sm">Invite collaborators to get started</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {sortedMembers.map((member) => (
              <MemberCard
                key={member.user_id}
                member={member}
                isCurrentUser={member.user_id === currentUserId}
              />
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

export default TeamMemberList;
