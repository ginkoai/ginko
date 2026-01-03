/**
 * @fileType: component
 * @status: current
 * @updated: 2026-01-03
 * @tags: [team, member, detail, slide-over, epic-008]
 * @related: [MemberCard.tsx, TeamMemberList.tsx, InviteModal.tsx]
 * @priority: high
 * @complexity: medium
 * @dependencies: [react, lucide-react, @radix-ui/react-dialog]
 */

'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Avatar } from '@/components/ui/avatar';
import { Select } from '@/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
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
import { TeamMember } from './MemberCard';
import { cn } from '@/lib/utils';
import {
  Crown,
  User,
  Calendar,
  Mail,
  Github,
  Loader2,
  UserMinus,
  Shield,
  AlertTriangle,
} from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import toast from 'react-hot-toast';

// =============================================================================
// Types
// =============================================================================

interface MemberDetailViewProps {
  teamId: string;
  member: TeamMember;
  currentUserIsOwner: boolean;
  isCurrentUser?: boolean;
  onRoleChange?: (newRole: 'owner' | 'member') => void;
  onRemove?: () => void;
  onClose: () => void;
}

// =============================================================================
// Helpers
// =============================================================================

const roleConfig: Record<string, { label: string; icon: typeof Crown; className: string }> = {
  owner: {
    label: 'Owner',
    icon: Crown,
    className: 'bg-amber-100 text-amber-800 dark:bg-amber-900 dark:text-amber-200',
  },
  member: {
    label: 'Member',
    icon: User,
    className: 'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-200',
  },
};

const defaultRoleConfig = {
  label: 'Member',
  icon: User,
  className: 'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-200',
};

function formatDate(dateString: string): string {
  const date = new Date(dateString);
  return date.toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });
}

function getTimeSince(dateString: string): string {
  const date = new Date(dateString);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const days = Math.floor(diffMs / (1000 * 60 * 60 * 24));

  if (days === 0) return 'Today';
  if (days === 1) return 'Yesterday';
  if (days < 7) return `${days} days ago`;
  if (days < 30) return `${Math.floor(days / 7)} weeks ago`;
  if (days < 365) return `${Math.floor(days / 30)} months ago`;
  return `${Math.floor(days / 365)} years ago`;
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

export function MemberDetailView({
  teamId,
  member,
  currentUserIsOwner,
  isCurrentUser = false,
  onRoleChange,
  onRemove,
  onClose,
}: MemberDetailViewProps) {
  const [showRemoveDialog, setShowRemoveDialog] = useState(false);
  const [removing, setRemoving] = useState(false);
  const [changingRole, setChangingRole] = useState(false);
  const [selectedRole, setSelectedRole] = useState<'owner' | 'member'>(member.role);

  const config = roleConfig[member.role] || defaultRoleConfig;
  const RoleIcon = config.icon;
  const displayName = member.user?.full_name || member.user?.github_username || member.user?.email || 'Unknown';
  const email = member.user?.email || '';
  const avatarUrl = member.user?.avatar_url;
  const githubUsername = member.user?.github_username;

  const canModify = currentUserIsOwner && !isCurrentUser;
  const canChangeRole = canModify && selectedRole !== member.role;

  const handleRemove = async () => {
    setRemoving(true);
    try {
      const supabase = createClient();
      const { data: { session } } = await supabase.auth.getSession();
      const token = session?.access_token;

      const response = await fetch(`/api/v1/teams/${teamId}/members/${member.user_id}`, {
        method: 'DELETE',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to remove member');
      }

      toast.success(`${displayName} has been removed from the team`);
      onRemove?.();
      onClose();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to remove member');
    } finally {
      setRemoving(false);
      setShowRemoveDialog(false);
    }
  };

  const handleRoleChange = async () => {
    if (!canChangeRole) return;

    setChangingRole(true);
    try {
      const supabase = createClient();
      const { data: { session } } = await supabase.auth.getSession();
      const token = session?.access_token;

      // Note: This requires a PATCH endpoint to be implemented
      // For now, we'll show a message that this feature is coming soon
      const response = await fetch(`/api/v1/teams/${teamId}/members/${member.user_id}`, {
        method: 'PATCH',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({ role: selectedRole }),
      });

      if (!response.ok) {
        const data = await response.json();
        // If endpoint doesn't exist yet, show helpful message
        if (response.status === 405) {
          throw new Error('Role change feature coming soon');
        }
        throw new Error(data.error || 'Failed to change role');
      }

      toast.success(`${displayName}'s role changed to ${selectedRole}`);
      onRoleChange?.(selectedRole);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to change role');
      setSelectedRole(member.role); // Reset to original
    } finally {
      setChangingRole(false);
    }
  };

  return (
    <>
      <Dialog open={true} onOpenChange={(open) => !open && onClose()}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Member Details</DialogTitle>
            <DialogDescription>
              View and manage team member information
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-6 py-4">
            {/* Member Profile Section */}
            <div className="flex items-start gap-4">
              <Avatar
                size="lg"
                src={avatarUrl}
                alt={displayName}
                fallback={getInitials(member.user?.full_name, member.user?.email)}
                className="h-16 w-16 bg-ginko-100 text-ginko-700"
              />
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <h3 className="font-semibold text-lg truncate">{displayName}</h3>
                  {isCurrentUser && (
                    <Badge variant="secondary" className="text-xs">You</Badge>
                  )}
                </div>
                <Badge className={cn('mt-1 flex items-center gap-1 w-fit', config.className)}>
                  <RoleIcon className="h-3 w-3" />
                  <span>{config.label}</span>
                </Badge>
              </div>
            </div>

            {/* Contact Info */}
            <div className="space-y-3 border-t pt-4">
              {email && (
                <div className="flex items-center gap-3 text-sm">
                  <Mail className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                  <span className="truncate">{email}</span>
                </div>
              )}
              {githubUsername && (
                <div className="flex items-center gap-3 text-sm">
                  <Github className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                  <a
                    href={`https://github.com/${githubUsername}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-primary hover:underline"
                  >
                    @{githubUsername}
                  </a>
                </div>
              )}
              <div className="flex items-center gap-3 text-sm">
                <Calendar className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                <span>
                  Joined {formatDate(member.joined_at)}
                  <span className="text-muted-foreground ml-1">
                    ({getTimeSince(member.joined_at)})
                  </span>
                </span>
              </div>
            </div>

            {/* Role Management (owners only, not for self) */}
            {canModify && (
              <div className="space-y-3 border-t pt-4">
                <h4 className="text-sm font-medium flex items-center gap-2">
                  <Shield className="h-4 w-4" />
                  Role Management
                </h4>
                <div className="flex items-center gap-3">
                  <Select
                    value={selectedRole}
                    onValueChange={(value) => setSelectedRole(value as 'owner' | 'member')}
                    disabled={changingRole}
                    options={[
                      { value: 'member', label: 'Member' },
                      { value: 'owner', label: 'Owner' },
                    ]}
                    className="flex-1"
                  />
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleRoleChange}
                    disabled={!canChangeRole || changingRole}
                  >
                    {changingRole ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      'Update'
                    )}
                  </Button>
                </div>
                <p className="text-xs text-muted-foreground">
                  Owners can manage team members and invitations
                </p>
              </div>
            )}

            {/* Activity Section (placeholder for future) */}
            <div className="space-y-3 border-t pt-4">
              <h4 className="text-sm font-medium">Recent Activity</h4>
              <div className="rounded-lg bg-muted/50 p-4 text-center text-sm text-muted-foreground">
                Activity history coming soon
              </div>
            </div>
          </div>

          <DialogFooter className="flex-col sm:flex-row gap-2">
            {canModify && (
              <Button
                variant="destructive"
                onClick={() => setShowRemoveDialog(true)}
                className="w-full sm:w-auto"
              >
                <UserMinus className="h-4 w-4 mr-2" />
                Remove from Team
              </Button>
            )}
            <Button variant="outline" onClick={onClose} className="w-full sm:w-auto">
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Remove Confirmation Dialog */}
      <AlertDialog open={showRemoveDialog} onOpenChange={setShowRemoveDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-destructive" />
              Remove Team Member
            </AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to remove <strong>{displayName}</strong> from the team?
              {member.role === 'owner' && (
                <span className="block mt-2 text-amber-600 dark:text-amber-400">
                  Warning: This member is an owner. Make sure the team has at least one owner.
                </span>
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={removing}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleRemove}
              disabled={removing}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {removing ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Removing...
                </>
              ) : (
                'Remove Member'
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}

export default MemberDetailView;
