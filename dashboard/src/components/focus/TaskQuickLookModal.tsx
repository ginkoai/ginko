/**
 * @fileType: component
 * @status: current
 * @updated: 2025-12-17
 * @tags: [focus, tasks, modal, quick-look, preview]
 * @related: [MyTasksList.tsx, dialog.tsx]
 * @priority: medium
 * @complexity: low
 * @dependencies: [react, lucide-react, @radix-ui/react-dialog]
 */

'use client';

import Link from 'next/link';
import { ExternalLink, FileText, Circle, CheckSquare, Pause, AlertTriangle } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogBody,
  DialogFooter,
} from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import type { TaskNode } from '@/lib/graph/types';
import { cn } from '@/lib/utils';

// =============================================================================
// Types
// =============================================================================

interface TaskQuickLookModalProps {
  task: TaskNode | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

// =============================================================================
// Helper Functions
// =============================================================================

const priorityConfig: Record<string, { variant: 'destructive' | 'warning' | 'default' | 'secondary'; label: string }> = {
  critical: { variant: 'destructive', label: 'Critical' },
  high: { variant: 'warning', label: 'High' },
  medium: { variant: 'default', label: 'Medium' },
  low: { variant: 'secondary', label: 'Low' },
};

const statusConfig: Record<string, { icon: typeof Circle; label: string; color: string }> = {
  todo: { icon: Circle, label: 'To Do', color: 'text-muted-foreground' },
  in_progress: { icon: CheckSquare, label: 'In Progress', color: 'text-ginko-400' },
  paused: { icon: Pause, label: 'Paused', color: 'text-yellow-500' },
  complete: { icon: CheckSquare, label: 'Complete', color: 'text-green-500' },
};

// =============================================================================
// Component
// =============================================================================

export function TaskQuickLookModal({ task, open, onOpenChange }: TaskQuickLookModalProps) {
  if (!task) return null;

  const status = statusConfig[task.status] || statusConfig.todo;
  const StatusIcon = status.icon;
  const priority = task.priority ? priorityConfig[task.priority.toLowerCase()] : null;

  // Handle both 'description' and 'goal' fields (sprint parser uses 'goal', but TaskNode defines 'description')
  const taskDescription = task.description || (task as any).goal || null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent size="default">
        <DialogHeader>
          <div className="flex items-center gap-2 mb-1">
            <span className="font-mono text-xs text-muted-foreground">{task.task_id}</span>
            {priority && (
              <Badge variant={priority.variant} className="text-xs">
                {priority.label}
              </Badge>
            )}
          </div>
          <DialogTitle className="pr-8">{task.title}</DialogTitle>
        </DialogHeader>

        <DialogBody>
          {/* Status Section */}
          <div className="mb-4">
            <h4 className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-2">
              Status
            </h4>
            <div className="flex items-center gap-2">
              <StatusIcon className={cn('h-4 w-4', status.color)} />
              <span className={cn('text-sm font-medium', status.color)}>{status.label}</span>
            </div>
          </div>

          {/* Description Section */}
          {taskDescription ? (
            <div className="mb-4">
              <h4 className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-2">
                Description
              </h4>
              <p className="text-sm text-foreground/90 leading-relaxed whitespace-pre-wrap">
                {taskDescription}
              </p>
            </div>
          ) : (
            <div className="mb-4">
              <h4 className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-2">
                Description
              </h4>
              <p className="text-sm text-muted-foreground italic">No description provided</p>
            </div>
          )}

          {/* Assignee Section */}
          {task.assignee && (
            <div className="mb-4">
              <h4 className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-2">
                Assignee
              </h4>
              <p className="text-sm text-foreground/90">{task.assignee}</p>
            </div>
          )}

          {/* Metadata Section */}
          <div className="pt-3 border-t border-border">
            <div className="flex items-center gap-4 text-xs text-muted-foreground">
              {task.created_at && (
                <span>
                  Created: {new Date(task.created_at).toLocaleDateString()}
                </span>
              )}
              {task.updated_at && (
                <span>
                  Updated: {new Date(task.updated_at).toLocaleDateString()}
                </span>
              )}
            </div>
          </div>
        </DialogBody>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Close
          </Button>
          <Button asChild>
            <Link href={`/dashboard/graph?node=${(task as any).id || task.task_id}`}>
              <ExternalLink className="h-4 w-4 mr-2" />
              View in Graph
            </Link>
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
