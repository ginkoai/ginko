/**
 * @fileType: component
 * @status: current
 * @updated: 2026-02-04
 * @tags: [team, project, delete, modal, destructive, confirmation]
 * @related: [InviteModal.tsx, TeamMemberList.tsx, dialog.tsx, button.tsx]
 * @priority: critical
 * @complexity: medium
 * @dependencies: [react, clsx, @heroicons/react, @radix-ui/react-dialog, supabase]
 */

'use client'

import { useState } from 'react'
import { ExclamationTriangleIcon } from '@heroicons/react/24/outline'
import { clsx } from 'clsx'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogBody,
  DialogFooter,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { createClient } from '@/lib/supabase/client'

// =============================================================================
// Types
// =============================================================================

interface DeleteProjectModalProps {
  isOpen: boolean
  onClose: () => void
  onDeleted: () => void
  projectName: string
  graphId: string
}

// =============================================================================
// Component
// =============================================================================

export function DeleteProjectModal({
  isOpen,
  onClose,
  onDeleted,
  projectName,
  graphId,
}: DeleteProjectModalProps) {
  const [confirmationText, setConfirmationText] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const isConfirmed = confirmationText === projectName

  const handleDelete = async () => {
    if (!isConfirmed) return

    setLoading(true)
    setError(null)

    try {
      const supabase = createClient()
      const { data: { session } } = await supabase.auth.getSession()
      const token = session?.access_token

      if (!token) {
        throw new Error('Authentication required. Please sign in again.')
      }

      const response = await fetch(
        `/api/v1/graph/cleanup?graphId=${encodeURIComponent(graphId)}&action=delete-project&dryRun=false&confirm=CLEANUP_CONFIRMED`,
        {
          method: 'DELETE',
          credentials: 'include',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
          },
        }
      )

      if (!response.ok) {
        const data = await response.json().catch(() => ({}))
        throw new Error(
          data.error || `Failed to delete project (${response.status})`
        )
      }

      onDeleted()
    } catch (err) {
      setError(
        err instanceof Error ? err.message : 'An unexpected error occurred'
      )
    } finally {
      setLoading(false)
    }
  }

  const handleClose = () => {
    if (loading) return
    onClose()
    // Reset state after dialog animation completes
    setTimeout(() => {
      setConfirmationText('')
      setError(null)
    }, 150)
  }

  const handleOpenChange = (open: boolean) => {
    if (!open) {
      handleClose()
    }
  }

  return (
    <Dialog open={isOpen} onOpenChange={handleOpenChange}>
      <DialogContent size="default" className="sm:max-w-md">
        <DialogHeader>
          <div className="flex items-center gap-3">
            <div className="rounded-lg bg-red-500/10 p-2">
              <ExclamationTriangleIcon className="h-6 w-6 text-red-500" />
            </div>
            <div>
              <DialogTitle className="text-red-500">
                Delete Project
              </DialogTitle>
              <DialogDescription className="mt-1">
                This action is permanent and cannot be undone.
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <DialogBody>
          <div className="space-y-4">
            {/* Stern warning banner */}
            <div className="rounded-lg border border-red-500/30 bg-red-500/5 p-4">
              <p className="text-sm font-semibold text-red-500">
                You are about to permanently delete this project.
              </p>
              <p className="mt-2 text-sm text-muted-foreground">
                All associated resources will be irreversibly destroyed. This
                action cannot be rolled back.
              </p>
            </div>

            {/* What gets deleted */}
            <div>
              <h4 className="text-xs font-mono font-semibold text-muted-foreground uppercase tracking-wider mb-2">
                The following will be permanently deleted
              </h4>
              <ul className="space-y-2 text-sm text-foreground">
                <li className="flex items-start gap-2">
                  <span className="mt-0.5 block h-1.5 w-1.5 shrink-0 rounded-full bg-red-500" />
                  <span>All graph data, nodes, and relationships</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="mt-0.5 block h-1.5 w-1.5 shrink-0 rounded-full bg-red-500" />
                  <span>Team members and their access</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="mt-0.5 block h-1.5 w-1.5 shrink-0 rounded-full bg-red-500" />
                  <span>Coaching insights and session history</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="mt-0.5 block h-1.5 w-1.5 shrink-0 rounded-full bg-red-500" />
                  <span>All project data and configuration</span>
                </li>
              </ul>
            </div>

            {/* Confirmation input */}
            <div className="space-y-2">
              <label
                htmlFor="delete-confirmation"
                className="text-sm font-medium text-foreground"
              >
                Type{' '}
                <span className="font-mono font-bold text-red-500">
                  {projectName}
                </span>{' '}
                to confirm
              </label>
              <Input
                id="delete-confirmation"
                type="text"
                placeholder={projectName}
                value={confirmationText}
                onChange={(e) => setConfirmationText(e.target.value)}
                disabled={loading}
                error={confirmationText.length > 0 && !isConfirmed}
                className={clsx(
                  'font-mono',
                  isConfirmed && 'border-red-500 focus:ring-red-500/30'
                )}
                autoComplete="off"
                spellCheck={false}
              />
            </div>

            {/* Error display */}
            {error && (
              <div className="rounded-lg border border-red-500/30 bg-red-950 p-3 text-sm text-red-400">
                {error}
              </div>
            )}
          </div>
        </DialogBody>

        <DialogFooter>
          <Button
            variant="outline"
            onClick={handleClose}
            disabled={loading}
          >
            Cancel
          </Button>
          <Button
            variant="destructive"
            onClick={handleDelete}
            disabled={!isConfirmed || loading}
            loading={loading}
          >
            {loading ? 'Deleting project...' : 'Permanently delete project'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

export default DeleteProjectModal
