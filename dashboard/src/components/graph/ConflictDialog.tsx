/**
 * @fileType: component
 * @status: current
 * @updated: 2026-01-16
 * @tags: [conflict, dialog, merge, resolution, epic-011]
 * @related: [NodeEditorModal.tsx, merge-resolver.ts]
 * @priority: high
 * @complexity: medium
 * @dependencies: [react, @radix-ui/react-dialog]
 */
'use client';

import { useState, useCallback } from 'react';
import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogDescription,
  AlertDialogFooter,
} from '@/components/ui/alert-dialog';
import { Button } from '@/components/ui/button';
import { AlertTriangle, GitMerge, XCircle, Check } from 'lucide-react';

// =============================================================================
// Types
// =============================================================================

export interface ConflictInfo {
  type: 'content-modified-externally';
  currentHash: string;
  incomingHash: string;
  baselineHash: string;
  lastModifiedBy: string;
  lastModifiedAt: string;
}

export type ConflictResolution = 'force' | 'skip' | 'cancel';

interface ConflictDialogProps {
  /** Whether the dialog is open */
  open: boolean;
  /** Callback when dialog should close */
  onOpenChange: (open: boolean) => void;
  /** Conflict information from the API */
  conflict: ConflictInfo | null;
  /** Node title for display */
  nodeTitle: string;
  /** Callback when user chooses a resolution */
  onResolve: (resolution: ConflictResolution) => void;
}

// =============================================================================
// Helper Functions
// =============================================================================

function formatRelativeTime(dateStr: string): string {
  try {
    const date = new Date(dateStr);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMinutes = Math.floor(diffMs / 60000);

    if (diffMinutes < 1) {
      return 'just now';
    } else if (diffMinutes < 60) {
      return `${diffMinutes} minute${diffMinutes === 1 ? '' : 's'} ago`;
    } else if (diffMinutes < 1440) {
      const hours = Math.floor(diffMinutes / 60);
      return `${hours} hour${hours === 1 ? '' : 's'} ago`;
    } else {
      const days = Math.floor(diffMinutes / 1440);
      return `${days} day${days === 1 ? '' : 's'} ago`;
    }
  } catch {
    return dateStr;
  }
}

function formatEditedBy(editedBy: string): string {
  if (editedBy.includes('@')) {
    return editedBy.split('@')[0];
  }
  if (editedBy.startsWith('user_')) {
    return editedBy.substring(5, 13);
  }
  return editedBy;
}

// =============================================================================
// Component
// =============================================================================

export function ConflictDialog({
  open,
  onOpenChange,
  conflict,
  nodeTitle,
  onResolve,
}: ConflictDialogProps) {
  const [isResolving, setIsResolving] = useState(false);

  const handleResolve = useCallback(async (resolution: ConflictResolution) => {
    setIsResolving(true);
    try {
      onResolve(resolution);
    } finally {
      setIsResolving(false);
    }
  }, [onResolve]);

  if (!conflict) {
    return null;
  }

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent className="max-w-lg">
        <AlertDialogHeader>
          <div className="flex items-center gap-3 mb-2">
            <div className="p-2 rounded-lg bg-amber-500/10">
              <AlertTriangle className="w-5 h-5 text-amber-500" />
            </div>
            <AlertDialogTitle>Edit Conflict Detected</AlertDialogTitle>
          </div>
          <AlertDialogDescription asChild>
            <div className="space-y-4">
              <p className="text-sm text-muted-foreground">
                This node was modified by another user while you were editing.
              </p>

              {/* Conflict Details */}
              <div className="p-3 rounded-lg bg-amber-500/10 border border-amber-500/20">
                <p className="text-sm font-medium text-foreground mb-2">
                  {nodeTitle}
                </p>
                <p className="text-xs text-muted-foreground">
                  Modified by <span className="font-medium">{formatEditedBy(conflict.lastModifiedBy)}</span>
                  {' '}{formatRelativeTime(conflict.lastModifiedAt)}
                </p>
              </div>

              {/* Resolution Options */}
              <div className="space-y-2">
                <p className="text-sm font-medium text-foreground">How would you like to proceed?</p>
              </div>
            </div>
          </AlertDialogDescription>
        </AlertDialogHeader>

        <AlertDialogFooter className="flex-col sm:flex-row gap-2">
          <Button
            variant="outline"
            onClick={() => handleResolve('cancel')}
            disabled={isResolving}
            className="w-full sm:w-auto"
          >
            <XCircle className="w-4 h-4 mr-2" />
            Cancel
          </Button>
          <Button
            variant="outline"
            onClick={() => handleResolve('skip')}
            disabled={isResolving}
            className="w-full sm:w-auto"
          >
            <GitMerge className="w-4 h-4 mr-2" />
            Keep Their Version
          </Button>
          <Button
            variant="default"
            onClick={() => handleResolve('force')}
            disabled={isResolving}
            className="w-full sm:w-auto bg-amber-600 hover:bg-amber-700"
          >
            <Check className="w-4 h-4 mr-2" />
            Overwrite with Mine
          </Button>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}

export default ConflictDialog;
