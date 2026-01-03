/**
 * @fileType: component
 * @status: current
 * @updated: 2026-01-03
 * @tags: [conflict-resolution, merge, diff-viewer, collaboration, epic-008]
 * @related: [NodeEditor.tsx, lib/merge-resolver.ts, lib/edit-lock-manager.ts]
 * @priority: high
 * @complexity: high
 * @dependencies: [react, @radix-ui/react-dialog]
 */
'use client';

import { useState, useMemo } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
  DialogBody,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Alert } from '@/components/ui/alert';
import {
  type ConflictInfo,
  type MergeResolution,
  type DiffLine,
  generateDiff,
  formatEditTime,
  createMergedContent,
  validateResolvedContent,
} from '@/lib/merge-resolver';
import {
  ExclamationTriangleIcon,
  DocumentDuplicateIcon,
  UserIcon,
  ClockIcon,
  PencilSquareIcon,
} from '@heroicons/react/24/outline';
import { clsx } from 'clsx';

interface ConflictResolverProps {
  conflict: ConflictInfo;
  onResolve: (resolution: MergeResolution) => void;
  onCancel: () => void;
  open?: boolean;
}

/**
 * ConflictResolver - Modal dialog for resolving edit conflicts
 *
 * EPIC-008 Sprint 2: Team Collaboration - Conflict Prevention
 *
 * Displays a side-by-side diff view when concurrent edits are detected,
 * allowing users to choose which version to keep or manually merge.
 *
 * Features:
 * - Side-by-side diff visualization with line highlighting
 * - Three resolution strategies: Keep Mine, Keep Theirs, Manual Edit
 * - Shows author and timestamp for each version
 * - Validates manual merge before allowing save
 */
export function ConflictResolver({
  conflict,
  onResolve,
  onCancel,
  open = true,
}: ConflictResolverProps) {
  const [mode, setMode] = useState<'view' | 'edit'>('view');
  const [manualContent, setManualContent] = useState('');
  const [validationError, setValidationError] = useState<string | null>(null);

  // Generate diff on mount/conflict change
  const diff = useMemo(
    () => generateDiff(conflict.localVersion.content, conflict.remoteVersion.content),
    [conflict.localVersion.content, conflict.remoteVersion.content]
  );

  // Initialize manual content when entering edit mode
  const handleStartManualEdit = () => {
    const merged = createMergedContent(
      conflict.localVersion.content,
      conflict.remoteVersion.content,
      conflict.localVersion.editedBy,
      conflict.remoteVersion.editedBy
    );
    setManualContent(merged);
    setValidationError(null);
    setMode('edit');
  };

  // Handle resolution selection
  const handleResolve = (strategy: 'use-local' | 'use-remote') => {
    onResolve({ strategy });
  };

  // Handle manual merge submission
  const handleSubmitManualMerge = () => {
    const validation = validateResolvedContent(manualContent);
    if (!validation.valid) {
      setValidationError(validation.error || 'Invalid content');
      return;
    }

    onResolve({
      strategy: 'manual-merge',
      resolvedContent: manualContent,
    });
  };

  // Return to diff view from edit mode
  const handleBackToView = () => {
    setMode('view');
    setValidationError(null);
  };

  return (
    <Dialog open={open} onOpenChange={(isOpen) => !isOpen && onCancel()}>
      <DialogContent size="xl" showCloseButton={false}>
        <DialogHeader>
          <div className="flex items-center gap-3">
            <div className="bg-yellow-100 rounded-full p-2">
              <ExclamationTriangleIcon className="h-5 w-5 text-yellow-700" />
            </div>
            <div>
              <DialogTitle>Edit Conflict Detected</DialogTitle>
              <DialogDescription>
                Someone else edited this {conflict.nodeType} while you were working on it.
                Choose how to resolve the conflict.
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <DialogBody className="max-h-[70vh]">
          {mode === 'view' ? (
            <>
              {/* Version info cards */}
              <div className="grid grid-cols-2 gap-4 mb-4">
                <VersionCard
                  label="Your Changes"
                  author={conflict.localVersion.editedBy}
                  editedAt={conflict.localVersion.editedAt}
                  variant="local"
                />
                <VersionCard
                  label="Their Changes"
                  author={conflict.remoteVersion.editedBy}
                  editedAt={conflict.remoteVersion.editedAt}
                  variant="remote"
                />
              </div>

              {/* Change statistics */}
              <div className="flex items-center gap-4 mb-4 text-sm">
                <Badge variant="success" className="gap-1">
                  <span>+{diff.addedCount}</span> added
                </Badge>
                <Badge variant="destructive" className="gap-1">
                  <span>-{diff.removedCount}</span> removed
                </Badge>
                <span className="text-muted-foreground">
                  {diff.lines.filter((l) => l.type === 'unchanged').length} unchanged
                </span>
              </div>

              {/* Diff view */}
              <div className="border border-border rounded-lg overflow-hidden">
                <div className="bg-secondary/50 px-4 py-2 border-b border-border">
                  <span className="text-sm font-mono text-muted-foreground">
                    Content Differences
                  </span>
                </div>
                <div className="max-h-[40vh] overflow-y-auto">
                  <DiffView lines={diff.lines} />
                </div>
              </div>
            </>
          ) : (
            <>
              {/* Manual edit mode */}
              <Alert variant="warning" className="mb-4">
                <div className="flex items-start gap-2">
                  <PencilSquareIcon className="h-4 w-4 mt-0.5 flex-shrink-0" />
                  <div>
                    <p className="font-semibold">Manual Merge Mode</p>
                    <p className="text-sm">
                      Edit the content below to combine both versions. Remove the conflict markers
                      (lines starting with {'<<<<<<<'}, {'======='}, {'>>>>>>>'}) when done.
                    </p>
                  </div>
                </div>
              </Alert>

              {validationError && (
                <Alert variant="destructive" className="mb-4">
                  <p className="text-sm">{validationError}</p>
                </Alert>
              )}

              <textarea
                value={manualContent}
                onChange={(e) => {
                  setManualContent(e.target.value);
                  setValidationError(null);
                }}
                className={clsx(
                  'w-full h-[40vh] p-4 rounded-lg border',
                  'bg-background text-foreground font-mono text-sm',
                  'focus:outline-none focus:ring-2 focus:ring-primary',
                  'resize-none',
                  validationError ? 'border-destructive' : 'border-border'
                )}
                spellCheck={false}
              />
            </>
          )}
        </DialogBody>

        <DialogFooter>
          {mode === 'view' ? (
            <>
              <Button variant="outline" onClick={onCancel}>
                Cancel
              </Button>
              <div className="flex-1" />
              <Button
                variant="outline"
                onClick={handleStartManualEdit}
                className="gap-2"
              >
                <PencilSquareIcon className="h-4 w-4" />
                Manual Edit
              </Button>
              <Button
                variant="outline"
                onClick={() => handleResolve('use-remote')}
                className="gap-2"
              >
                <DocumentDuplicateIcon className="h-4 w-4" />
                Keep Theirs
              </Button>
              <Button onClick={() => handleResolve('use-local')} className="gap-2">
                <DocumentDuplicateIcon className="h-4 w-4" />
                Keep Mine
              </Button>
            </>
          ) : (
            <>
              <Button variant="outline" onClick={handleBackToView}>
                Back to Diff
              </Button>
              <div className="flex-1" />
              <Button variant="outline" onClick={onCancel}>
                Cancel
              </Button>
              <Button onClick={handleSubmitManualMerge}>Save Merged Content</Button>
            </>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

/**
 * Version card showing author and edit time
 */
interface VersionCardProps {
  label: string;
  author: string;
  editedAt: string;
  variant: 'local' | 'remote';
}

function VersionCard({ label, author, editedAt, variant }: VersionCardProps) {
  const bgClass = variant === 'local' ? 'bg-blue-50' : 'bg-green-50';
  const borderClass = variant === 'local' ? 'border-blue-200' : 'border-green-200';
  const labelClass = variant === 'local' ? 'text-blue-700' : 'text-green-700';

  return (
    <div className={clsx('rounded-lg p-3 border', bgClass, borderClass)}>
      <p className={clsx('text-sm font-semibold mb-2', labelClass)}>{label}</p>
      <div className="flex items-center gap-2 text-sm text-muted-foreground">
        <UserIcon className="h-4 w-4" />
        <span className="truncate">{author}</span>
      </div>
      <div className="flex items-center gap-2 text-sm text-muted-foreground mt-1">
        <ClockIcon className="h-4 w-4" />
        <span>{formatEditTime(editedAt)}</span>
      </div>
    </div>
  );
}

/**
 * Diff view component showing line-by-line changes
 */
interface DiffViewProps {
  lines: DiffLine[];
}

function DiffView({ lines }: DiffViewProps) {
  if (lines.length === 0) {
    return (
      <div className="p-4 text-center text-muted-foreground">
        No content to display
      </div>
    );
  }

  return (
    <div className="font-mono text-sm">
      {lines.map((line, index) => (
        <DiffLineRow key={index} line={line} />
      ))}
    </div>
  );
}

/**
 * Single diff line with appropriate styling
 */
interface DiffLineRowProps {
  line: DiffLine;
}

function DiffLineRow({ line }: DiffLineRowProps) {
  const typeStyles = {
    unchanged: {
      bg: 'bg-background',
      text: 'text-muted-foreground',
      prefix: ' ',
      lineNumBg: 'bg-secondary/30',
    },
    added: {
      bg: 'bg-green-50',
      text: 'text-green-800',
      prefix: '+',
      lineNumBg: 'bg-green-100',
    },
    removed: {
      bg: 'bg-red-50',
      text: 'text-red-800',
      prefix: '-',
      lineNumBg: 'bg-red-100',
    },
  };

  const style = typeStyles[line.type];

  return (
    <div className={clsx('flex', style.bg)}>
      {/* Line numbers */}
      <div
        className={clsx(
          'flex-shrink-0 w-20 flex text-xs border-r border-border',
          style.lineNumBg
        )}
      >
        <span className="w-10 px-2 py-1 text-right text-muted-foreground border-r border-border/50">
          {line.lineNumber.local ?? ''}
        </span>
        <span className="w-10 px-2 py-1 text-right text-muted-foreground">
          {line.lineNumber.remote ?? ''}
        </span>
      </div>

      {/* Prefix indicator */}
      <div
        className={clsx(
          'flex-shrink-0 w-6 text-center py-1 font-bold',
          style.text
        )}
      >
        {style.prefix}
      </div>

      {/* Content */}
      <div className={clsx('flex-1 py-1 pr-4 whitespace-pre-wrap break-all', style.text)}>
        {line.content || '\u00A0'}
      </div>
    </div>
  );
}

export default ConflictResolver;
