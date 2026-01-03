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
import { Users, AlertCircle, Clock, Mail, Copy, Check } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import toast from 'react-hot-toast';

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

interface PendingInvitation {
  code: string;
  email: string;
  role: 'owner' | 'admin' | 'member';
  status: string;
  expires_at: string;
  created_at: string;
  inviter?: {
    email: string;
    github_username?: string;
  };
}

interface InvitationsResponse {
  invitations: PendingInvitation[];
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
  const [pendingInvites, setPendingInvites] = useState<PendingInvitation[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [copiedCode, setCopiedCode] = useState<string | null>(null);

  const handleCopyCode = async (code: string) => {
    try {
      const copyText = `Run these commands in your terminal:\n1. npm install -g @ginkoai/cli\n2. ginko login\n3. ginko join ${code}`;
      await navigator.clipboard.writeText(copyText);
      setCopiedCode(code);
      toast.success('Invite instructions copied!');
      setTimeout(() => setCopiedCode(null), 2000);
    } catch {
      toast.error('Failed to copy');
    }
  };

  const fetchMembers = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const supabase = createClient();
      const { data: { session } } = await supabase.auth.getSession();
      const token = session?.access_token;
      const headers = token ? { Authorization: `Bearer ${token}` } : {};

      // Fetch members and pending invitations in parallel
      const [membersRes, invitesRes] = await Promise.all([
        fetch(`/api/v1/teams/${teamId}/members`, {
          credentials: 'include',
          headers,
        }),
        fetch(`/api/v1/team/invite?team_id=${teamId}`, {
          credentials: 'include',
          headers,
        }),
      ]);

      if (!membersRes.ok) {
        const errorData = await membersRes.json();
        throw new Error(errorData.error || 'Failed to fetch members');
      }

      const membersData: MembersResponse = await membersRes.json();
      setMembers(membersData.members);

      // Invitations might fail for non-admins, that's ok
      if (invitesRes.ok) {
        const invitesData: InvitationsResponse = await invitesRes.json();
        setPendingInvites(invitesData.invitations || []);
      } else {
        setPendingInvites([]);
      }
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
      <CardContent className="space-y-6">
        {/* Active Members */}
        {sortedMembers.length === 0 && pendingInvites.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            <Users className="h-12 w-12 mx-auto mb-3 opacity-20" />
            <p>No team members yet</p>
            <p className="text-sm">Invite collaborators to get started</p>
          </div>
        ) : (
          <>
            {sortedMembers.length > 0 && (
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

            {/* Pending Invitations */}
            {pendingInvites.length > 0 && (
              <div className="space-y-3">
                <h4 className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                  <Clock className="h-4 w-4" />
                  Pending Invitations ({pendingInvites.length})
                </h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {pendingInvites.map((invite) => (
                    <div
                      key={invite.code}
                      className="flex items-center gap-3 p-3 rounded-lg border border-dashed border-border bg-muted/30"
                    >
                      <div className="h-9 w-9 rounded-full bg-muted flex items-center justify-center">
                        <Mail className="h-4 w-4 text-muted-foreground" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium truncate">{invite.email}</p>
                        <p className="text-xs text-muted-foreground">
                          {invite.role} · expires {new Date(invite.expires_at).toLocaleDateString()}
                        </p>
                      </div>
                      <button
                        onClick={() => handleCopyCode(invite.code)}
                        className="flex items-center gap-1.5 text-xs bg-muted hover:bg-muted/80 px-2 py-1.5 rounded transition-colors"
                        title="Copy invite command"
                      >
                        <span className="text-muted-foreground">Code:</span>
                        <code className="font-mono">{invite.code}</code>
                        {copiedCode === invite.code ? (
                          <Check className="h-3 w-3 text-green-600" />
                        ) : (
                          <Copy className="h-3 w-3 text-muted-foreground" />
                        )}
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </>
        )}
      </CardContent>
    </Card>
  );
}

export default TeamMemberList;
