/**
 * @fileType: component
 * @status: current
 * @updated: 2026-01-03
 * @tags: [team, invitations, pending, epic-008]
 * @related: [InviteModal.tsx, TeamMemberList.tsx, InviteButton.tsx]
 * @priority: high
 * @complexity: medium
 * @dependencies: [react, lucide-react, react-hot-toast]
 */

'use client';

import { useState, useEffect, useCallback } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { LoadingSpinner } from '@/components/ui/loading-spinner';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { cn } from '@/lib/utils';
import {
  Clock,
  Mail,
  Copy,
  Check,
  X,
  AlertCircle,
  Loader2,
  Crown,
  User,
  Inbox,
} from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import toast from 'react-hot-toast';

// =============================================================================
// Types
// =============================================================================

export interface PendingInvitation {
  code: string;
  email: string;
  role: 'owner' | 'member';
  status: string;
  expires_at: string;
  created_at: string;
  inviter?: {
    email: string;
    github_username?: string;
  };
}

interface PendingInvitationsProps {
  teamId: string;
  onRevoke?: (code: string) => void;
  className?: string;
}

interface InvitationsResponse {
  invitations: PendingInvitation[];
  count: number;
}

// =============================================================================
// Helpers
// =============================================================================

function getExpiryInfo(expiresAt: string): { text: string; isUrgent: boolean; isExpired: boolean } {
  const expiry = new Date(expiresAt);
  const now = new Date();
  const diffMs = expiry.getTime() - now.getTime();

  if (diffMs <= 0) {
    return { text: 'Expired', isUrgent: false, isExpired: true };
  }

  const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
  const diffDays = Math.floor(diffHours / 24);

  if (diffDays > 1) {
    return { text: `${diffDays} days left`, isUrgent: false, isExpired: false };
  }
  if (diffDays === 1) {
    return { text: '1 day left', isUrgent: true, isExpired: false };
  }
  if (diffHours > 1) {
    return { text: `${diffHours} hours left`, isUrgent: true, isExpired: false };
  }
  return { text: 'Expires soon', isUrgent: true, isExpired: false };
}

function formatDate(dateString: string): string {
  const date = new Date(dateString);
  return date.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}

const roleIcons: Record<string, typeof Crown> = {
  owner: Crown,
  member: User,
};

// =============================================================================
// Component
// =============================================================================

export function PendingInvitations({
  teamId,
  onRevoke,
  className,
}: PendingInvitationsProps) {
  const [invitations, setInvitations] = useState<PendingInvitation[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [copiedCode, setCopiedCode] = useState<string | null>(null);
  const [revoking, setRevoking] = useState<string | null>(null);
  const [confirmRevokeCode, setConfirmRevokeCode] = useState<string | null>(null);

  const fetchInvitations = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const supabase = createClient();
      const { data: { session } } = await supabase.auth.getSession();
      const token = session?.access_token;

      const response = await fetch(`/api/v1/team/invite?team_id=${teamId}`, {
        credentials: 'include',
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });

      if (!response.ok) {
        if (response.status === 403) {
          // User is not an owner, they can't see invitations
          setInvitations([]);
          setLoading(false);
          return;
        }
        const data = await response.json();
        throw new Error(data.error || 'Failed to fetch invitations');
      }

      const data: InvitationsResponse = await response.json();
      setInvitations(data.invitations || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load invitations');
    } finally {
      setLoading(false);
    }
  }, [teamId]);

  useEffect(() => {
    fetchInvitations();
  }, [fetchInvitations]);

  const handleCopyCode = async (code: string) => {
    const copyText = `Run these commands in your terminal:\n1. npm install -g @ginkoai/cli\n2. ginko login\n3. ginko join ${code}`;

    try {
      await navigator.clipboard.writeText(copyText);
      setCopiedCode(code);
      toast.success('Invite instructions copied!');
      setTimeout(() => setCopiedCode(null), 2000);
    } catch {
      toast.error('Failed to copy');
    }
  };

  const handleRevoke = async (code: string) => {
    setRevoking(code);
    try {
      const supabase = createClient();
      const { data: { session } } = await supabase.auth.getSession();
      const token = session?.access_token;

      const response = await fetch('/api/v1/team/invite', {
        method: 'DELETE',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({ code }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to revoke invitation');
      }

      toast.success('Invitation revoked');
      setInvitations((prev) => prev.filter((inv) => inv.code !== code));
      onRevoke?.(code);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to revoke invitation');
    } finally {
      setRevoking(null);
      setConfirmRevokeCode(null);
    }
  };

  if (loading) {
    return (
      <Card className={className}>
        <CardContent className="flex items-center justify-center py-8">
          <LoadingSpinner />
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Card className={className}>
        <CardContent className="flex items-center justify-center py-8 text-red-600">
          <AlertCircle className="h-5 w-5 mr-2" />
          <span>{error}</span>
        </CardContent>
      </Card>
    );
  }

  return (
    <>
      <Card className={className}>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Clock className="h-5 w-5" />
            Pending Invitations
            {invitations.length > 0 && (
              <Badge variant="secondary" className="ml-2">
                {invitations.length}
              </Badge>
            )}
          </CardTitle>
        </CardHeader>
        <CardContent>
          {invitations.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <Inbox className="h-12 w-12 mx-auto mb-3 opacity-20" />
              <p className="font-medium">No pending invitations</p>
              <p className="text-sm mt-1">
                Invite team members to get started
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {invitations.map((invitation) => {
                const expiryInfo = getExpiryInfo(invitation.expires_at);
                const RoleIcon = roleIcons[invitation.role] || User;
                const isRevoking = revoking === invitation.code;

                return (
                  <div
                    key={invitation.code}
                    className={cn(
                      'flex items-start gap-4 p-4 rounded-lg border',
                      expiryInfo.isExpired
                        ? 'border-red-200 bg-red-50/50 dark:border-red-900 dark:bg-red-950/30'
                        : 'border-border bg-card'
                    )}
                  >
                    {/* Avatar placeholder */}
                    <div className="h-10 w-10 rounded-full bg-muted flex items-center justify-center flex-shrink-0">
                      <Mail className="h-5 w-5 text-muted-foreground" />
                    </div>

                    {/* Invitation details */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-medium truncate">{invitation.email}</span>
                        <Badge
                          className={cn(
                            'flex items-center gap-1',
                            invitation.role === 'owner'
                              ? 'bg-amber-100 text-amber-800 dark:bg-amber-900 dark:text-amber-200'
                              : ''
                          )}
                        >
                          <RoleIcon className="h-3 w-3" />
                          {invitation.role}
                        </Badge>
                      </div>
                      <div className="flex items-center gap-3 mt-1 text-xs text-muted-foreground">
                        <span>Sent {formatDate(invitation.created_at)}</span>
                        {invitation.inviter && (
                          <>
                            <span>by</span>
                            <span>
                              {invitation.inviter.github_username || invitation.inviter.email}
                            </span>
                          </>
                        )}
                      </div>
                      <div className="flex items-center gap-2 mt-2">
                        <Badge
                          variant={expiryInfo.isExpired ? 'destructive' : expiryInfo.isUrgent ? 'warning' : 'secondary'}
                          className="flex items-center gap-1"
                        >
                          <Clock className="h-3 w-3" />
                          {expiryInfo.text}
                        </Badge>
                      </div>
                    </div>

                    {/* Actions */}
                    <div className="flex items-center gap-2 flex-shrink-0">
                      <button
                        onClick={() => handleCopyCode(invitation.code)}
                        className="flex items-center gap-1.5 text-xs bg-muted hover:bg-muted/80 px-2.5 py-1.5 rounded-md transition-colors"
                        title="Copy invite command"
                      >
                        <code className="font-mono">{invitation.code}</code>
                        {copiedCode === invitation.code ? (
                          <Check className="h-3 w-3 text-green-600" />
                        ) : (
                          <Copy className="h-3 w-3 text-muted-foreground" />
                        )}
                      </button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setConfirmRevokeCode(invitation.code)}
                        disabled={isRevoking}
                        className="text-muted-foreground hover:text-destructive hover:bg-destructive/10 px-2"
                        title="Revoke invitation"
                      >
                        {isRevoking ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                          <X className="h-4 w-4" />
                        )}
                      </Button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Revoke Confirmation Dialog */}
      <AlertDialog
        open={!!confirmRevokeCode}
        onOpenChange={(open) => !open && setConfirmRevokeCode(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Revoke Invitation</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to revoke this invitation? The invite code will no longer work
              and the recipient will need a new invitation to join the team.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={!!revoking}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => confirmRevokeCode && handleRevoke(confirmRevokeCode)}
              disabled={!!revoking}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {revoking ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Revoking...
                </>
              ) : (
                'Revoke Invitation'
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}

export default PendingInvitations;
