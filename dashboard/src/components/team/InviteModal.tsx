/**
 * @fileType: component
 * @status: current
 * @updated: 2026-01-03
 * @tags: [team, invite, modal, epic-008]
 * @related: [InviteButton.tsx, TeamMemberList.tsx, PendingInvitations.tsx]
 * @priority: high
 * @complexity: medium
 * @dependencies: [react, lucide-react, @radix-ui/react-dialog]
 */

'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Select } from '@/components/ui/select';
import { Copy, Check, Loader2, Mail, UserPlus } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';

// =============================================================================
// Types
// =============================================================================

export interface Invitation {
  code: string;
  email: string;
  role: 'owner' | 'member';
  expires_at: string;
  team_name?: string;
  created_at?: string;
}

interface InviteModalProps {
  teamId: string;
  isOpen: boolean;
  onClose: () => void;
  onInviteSent?: (invitation: Invitation) => void;
}

interface InviteResponse {
  success: boolean;
  invitation: {
    code: string;
    email: string;
    role: 'owner' | 'member';
    expires_at: string;
    team_name: string;
    created_at: string;
  };
}

// =============================================================================
// Component
// =============================================================================

export function InviteModal({ teamId, isOpen, onClose, onInviteSent }: InviteModalProps) {
  const [email, setEmail] = useState('');
  const [role, setRole] = useState<'member' | 'owner'>('member');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [inviteResult, setInviteResult] = useState<Invitation | null>(null);
  const [copied, setCopied] = useState(false);

  const handleInvite = async () => {
    if (!email || !email.includes('@')) {
      setError('Please enter a valid email address');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const supabase = createClient();
      const { data: { session } } = await supabase.auth.getSession();
      const token = session?.access_token;

      const response = await fetch('/api/v1/team/invite', {
        method: 'POST',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({
          team_id: teamId,
          email: email.toLowerCase(),
          role,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        // Handle case where invitation already exists
        if (response.status === 409 && data.existing_code) {
          const existingInvite: Invitation = {
            code: data.existing_code,
            email: email.toLowerCase(),
            role,
            expires_at: data.expires_at || '',
          };
          setInviteResult(existingInvite);
          onInviteSent?.(existingInvite);
          return;
        }
        throw new Error(data.error || 'Failed to send invitation');
      }

      const result: InviteResponse = data;
      const invitation: Invitation = {
        code: result.invitation.code,
        email: result.invitation.email,
        role: result.invitation.role,
        expires_at: result.invitation.expires_at,
        team_name: result.invitation.team_name,
        created_at: result.invitation.created_at,
      };
      setInviteResult(invitation);
      onInviteSent?.(invitation);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to send invitation');
    } finally {
      setLoading(false);
    }
  };

  const handleCopyCode = async () => {
    if (!inviteResult?.code) return;

    const copyText = `Run these commands in your terminal:\n1. npm install -g @ginkoai/cli\n2. ginko login\n3. ginko join ${inviteResult.code}`;

    try {
      await navigator.clipboard.writeText(copyText);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Fallback for older browsers
      const textArea = document.createElement('textarea');
      textArea.value = copyText;
      document.body.appendChild(textArea);
      textArea.select();
      document.execCommand('copy');
      document.body.removeChild(textArea);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const handleClose = () => {
    onClose();
    // Reset state after dialog closes
    setTimeout(() => {
      setEmail('');
      setRole('member');
      setError(null);
      setInviteResult(null);
      setCopied(false);
    }, 150);
  };

  const handleOpenChange = (open: boolean) => {
    if (!open) {
      handleClose();
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <UserPlus className="h-5 w-5" />
            Invite Team Member
          </DialogTitle>
          <DialogDescription>
            Send an invitation to collaborate on this project
          </DialogDescription>
        </DialogHeader>

        {inviteResult ? (
          // Success state - show invite code
          <div className="space-y-4 py-4">
            <div className="rounded-lg bg-green-50 dark:bg-green-950 p-4 text-center">
              <div className="mx-auto mb-2 h-10 w-10 rounded-full bg-green-100 dark:bg-green-900 flex items-center justify-center">
                <Mail className="h-5 w-5 text-green-600 dark:text-green-400" />
              </div>
              <p className="text-sm font-medium text-green-600 dark:text-green-400">
                Invitation created!
              </p>
              <p className="text-xs text-muted-foreground mt-1">
                Share this with {email}
              </p>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">Invite Command</label>
              <div className="flex items-center gap-2">
                <Input
                  value={`ginko join ${inviteResult.code}`}
                  readOnly
                  className="font-mono text-sm"
                />
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleCopyCode}
                  className="shrink-0 px-3"
                >
                  {copied ? (
                    <Check className="h-4 w-4 text-green-600" />
                  ) : (
                    <Copy className="h-4 w-4" />
                  )}
                </Button>
              </div>
              <p className="text-xs text-muted-foreground">
                Code expires in 7 days
              </p>
            </div>

            <div className="rounded-lg bg-muted/50 p-3 text-xs text-muted-foreground">
              <p className="font-medium mb-1">Instructions to share:</p>
              <ol className="list-decimal list-inside space-y-1">
                <li>Install CLI: <code className="bg-muted px-1 rounded">npm install -g @ginkoai/cli</code></li>
                <li>Login: <code className="bg-muted px-1 rounded">ginko login</code></li>
                <li>Join team: <code className="bg-muted px-1 rounded">ginko join {inviteResult.code}</code></li>
              </ol>
            </div>
          </div>
        ) : (
          // Input state
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <label htmlFor="invite-email" className="text-sm font-medium">
                Email address
              </label>
              <Input
                id="invite-email"
                type="email"
                placeholder="collaborator@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                disabled={loading}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    handleInvite();
                  }
                }}
              />
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">Role</label>
              <Select
                value={role}
                onValueChange={(value) => setRole(value as 'member' | 'owner')}
                disabled={loading}
                options={[
                  { value: 'member', label: 'Member - Can collaborate and sync' },
                  { value: 'owner', label: 'Owner - Full control (can manage members)' },
                ]}
              />
            </div>

            {error && (
              <div className="rounded-lg bg-red-50 dark:bg-red-950 p-3 text-sm text-red-600 dark:text-red-400">
                {error}
              </div>
            )}
          </div>
        )}

        <DialogFooter>
          {inviteResult ? (
            <Button onClick={handleClose}>Done</Button>
          ) : (
            <>
              <Button variant="outline" onClick={handleClose} disabled={loading}>
                Cancel
              </Button>
              <Button onClick={handleInvite} disabled={loading}>
                {loading ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Sending...
                  </>
                ) : (
                  'Send Invitation'
                )}
              </Button>
            </>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export default InviteModal;
