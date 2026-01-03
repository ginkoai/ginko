/**
 * @fileType: component
 * @status: current
 * @updated: 2026-01-03
 * @tags: [team, invite, button, epic-008]
 * @related: [TeamMemberList.tsx, MemberCard.tsx]
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
  DialogTrigger,
} from '@/components/ui/dialog';
import { Select } from '@/components/ui/select';
import { UserPlus, Copy, Check, Loader2 } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';

// =============================================================================
// Types
// =============================================================================

interface InviteButtonProps {
  teamId: string;
  onInviteSent?: () => void;
}

interface InviteResponse {
  success: boolean;
  invitation: {
    code: string;
    email: string;
    role: string;
    expires_at: string;
    team_name: string;
  };
}

// =============================================================================
// Component
// =============================================================================

export function InviteButton({ teamId, onInviteSent }: InviteButtonProps) {
  const [open, setOpen] = useState(false);
  const [email, setEmail] = useState('');
  const [role, setRole] = useState<'member' | 'owner'>('member');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [inviteCode, setInviteCode] = useState<string | null>(null);
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
      console.log('[InviteButton] API response:', { ok: response.ok, status: response.status, data });

      if (!response.ok) {
        // Handle case where invitation already exists
        if (response.status === 409 && data.existing_code) {
          setInviteCode(data.existing_code);
          onInviteSent?.();
          return;
        }
        throw new Error(data.error || 'Failed to send invitation');
      }

      const result: InviteResponse = data;
      console.log('[InviteButton] Setting invite code:', result.invitation?.code);
      setInviteCode(result.invitation.code);
      onInviteSent?.();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to send invitation');
    } finally {
      setLoading(false);
    }
  };

  const handleCopyCode = async () => {
    if (!inviteCode) return;

    try {
      await navigator.clipboard.writeText(`ginko join ${inviteCode}`);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Fallback for older browsers
      const textArea = document.createElement('textarea');
      textArea.value = `ginko join ${inviteCode}`;
      document.body.appendChild(textArea);
      textArea.select();
      document.execCommand('copy');
      document.body.removeChild(textArea);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const handleClose = () => {
    setOpen(false);
    // Reset state after dialog closes
    setTimeout(() => {
      setEmail('');
      setRole('member');
      setError(null);
      setInviteCode(null);
      setCopied(false);
    }, 150);
  };

  return (
    <Dialog open={open} onOpenChange={(isOpen) => isOpen ? setOpen(true) : handleClose()}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm" className="gap-2">
          <UserPlus className="h-4 w-4" />
          Invite
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Invite Team Member</DialogTitle>
          <DialogDescription>
            Send an invitation to collaborate on this project
          </DialogDescription>
        </DialogHeader>

        {inviteCode ? (
          // Success state - show invite code
          <div className="space-y-4 py-4">
            <div className="rounded-lg bg-green-50 dark:bg-green-950 p-4 text-center">
              <p className="text-sm text-green-600 dark:text-green-400 mb-2">
                Invitation sent to {email}
              </p>
              <p className="text-xs text-muted-foreground">
                Share this command with them:
              </p>
            </div>

            <div className="flex items-center gap-2">
              <Input
                value={`ginko join ${inviteCode}`}
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

            <p className="text-xs text-muted-foreground text-center">
              Code expires in 7 days
            </p>
          </div>
        ) : (
          // Input state
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <label htmlFor="email" className="text-sm font-medium">
                Email address
              </label>
              <Input
                id="email"
                type="email"
                placeholder="collaborator@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                disabled={loading}
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
              <p className="text-sm text-red-600">{error}</p>
            )}
          </div>
        )}

        <DialogFooter>
          {inviteCode ? (
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

export default InviteButton;
