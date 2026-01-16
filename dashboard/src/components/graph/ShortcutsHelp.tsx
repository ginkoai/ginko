/**
 * @fileType: component
 * @status: current
 * @updated: 2026-01-16
 * @tags: [accessibility, keyboard, shortcuts, modal, help, a11y]
 * @related: [useKeyboardNavigation.ts, tree-explorer.tsx, dialog.tsx]
 * @priority: high
 * @complexity: low
 * @dependencies: [react, lucide-react, @radix-ui/react-dialog]
 */

'use client';

import { useMemo } from 'react';
import { Keyboard, Command, ArrowUp, ArrowDown, ArrowLeft, ArrowRight } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogBody,
} from '@/components/ui/dialog';
import { cn } from '@/lib/utils';

// =============================================================================
// Types
// =============================================================================

export interface ShortcutItem {
  key: string;
  description: string;
  category?: 'navigation' | 'actions' | 'general';
}

export interface ShortcutsHelpProps {
  /** Whether the modal is open */
  open: boolean;
  /** Callback to close the modal */
  onOpenChange: (open: boolean) => void;
  /** List of shortcuts to display */
  shortcuts?: ShortcutItem[];
  /** Additional className */
  className?: string;
}

// =============================================================================
// Default Shortcuts
// =============================================================================

const DEFAULT_SHORTCUTS: ShortcutItem[] = [
  // Navigation
  { key: '/', description: 'Focus search', category: 'navigation' },
  { key: 'Cmd/Ctrl + K', description: 'Focus search (alternative)', category: 'navigation' },
  { key: '\u2191', description: 'Navigate to previous item', category: 'navigation' },
  { key: '\u2193', description: 'Navigate to next item', category: 'navigation' },
  { key: '\u2190', description: 'Collapse node', category: 'navigation' },
  { key: '\u2192', description: 'Expand node', category: 'navigation' },
  { key: 'Enter', description: 'Select / open node', category: 'navigation' },
  { key: 'Home', description: 'Jump to first item', category: 'navigation' },
  { key: 'End', description: 'Jump to last item', category: 'navigation' },
  { key: 'B', description: 'Go back (breadcrumb)', category: 'navigation' },
  // Actions
  { key: 'E', description: 'Edit selected node', category: 'actions' },
  // General
  { key: '?', description: 'Show this help', category: 'general' },
  { key: 'Esc', description: 'Close modal / panel', category: 'general' },
];

// =============================================================================
// KeyBadge Component
// =============================================================================

interface KeyBadgeProps {
  keyName: string;
  className?: string;
}

function KeyBadge({ keyName, className }: KeyBadgeProps) {
  // Handle special characters
  const displayKey = useMemo(() => {
    if (keyName === '\u2191') return <ArrowUp className="w-3 h-3" />;
    if (keyName === '\u2193') return <ArrowDown className="w-3 h-3" />;
    if (keyName === '\u2190') return <ArrowLeft className="w-3 h-3" />;
    if (keyName === '\u2192') return <ArrowRight className="w-3 h-3" />;
    if (keyName === 'Cmd/Ctrl + K') {
      return (
        <span className="flex items-center gap-1">
          <Command className="w-3 h-3" />
          <span>K</span>
        </span>
      );
    }
    return keyName;
  }, [keyName]);

  return (
    <kbd
      className={cn(
        'inline-flex items-center justify-center min-w-[24px] h-6 px-2',
        'bg-background border border-border rounded',
        'font-mono text-xs text-muted-foreground',
        'shadow-sm',
        className
      )}
    >
      {displayKey}
    </kbd>
  );
}

// =============================================================================
// ShortcutRow Component
// =============================================================================

interface ShortcutRowProps {
  shortcut: ShortcutItem;
}

function ShortcutRow({ shortcut }: ShortcutRowProps) {
  // Split keys if there are multiple (e.g., "Cmd/Ctrl + K")
  const keys = shortcut.key.includes(' + ')
    ? [shortcut.key] // Keep compound keys together
    : shortcut.key.split(' / '); // Split alternatives

  return (
    <div className="flex items-center justify-between py-2">
      <span className="text-sm text-foreground">{shortcut.description}</span>
      <div className="flex items-center gap-1">
        {keys.map((key, index) => (
          <span key={key} className="flex items-center gap-1">
            {index > 0 && <span className="text-xs text-muted-foreground mx-1">or</span>}
            <KeyBadge keyName={key} />
          </span>
        ))}
      </div>
    </div>
  );
}

// =============================================================================
// ShortcutsSection Component
// =============================================================================

interface ShortcutsSectionProps {
  title: string;
  shortcuts: ShortcutItem[];
}

function ShortcutsSection({ title, shortcuts }: ShortcutsSectionProps) {
  if (shortcuts.length === 0) return null;

  return (
    <div className="mb-6 last:mb-0">
      <h3 className="text-xs font-mono font-medium text-muted-foreground uppercase tracking-wider mb-3">
        {title}
      </h3>
      <div className="divide-y divide-border">
        {shortcuts.map((shortcut) => (
          <ShortcutRow key={shortcut.key} shortcut={shortcut} />
        ))}
      </div>
    </div>
  );
}

// =============================================================================
// Main Component
// =============================================================================

/**
 * Modal displaying available keyboard shortcuts.
 *
 * Opens with the ? key and shows navigation, action, and general shortcuts
 * organized by category.
 */
export function ShortcutsHelp({
  open,
  onOpenChange,
  shortcuts = DEFAULT_SHORTCUTS,
  className,
}: ShortcutsHelpProps) {
  // Group shortcuts by category
  const groupedShortcuts = useMemo(() => {
    const navigation = shortcuts.filter((s) => s.category === 'navigation');
    const actions = shortcuts.filter((s) => s.category === 'actions');
    const general = shortcuts.filter((s) => s.category === 'general');
    return { navigation, actions, general };
  }, [shortcuts]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        size="default"
        className={cn('max-w-md', className)}
        aria-describedby="shortcuts-description"
      >
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Keyboard className="w-5 h-5 text-ginko-400" />
            Keyboard Shortcuts
          </DialogTitle>
          <DialogDescription id="shortcuts-description">
            Use these shortcuts to navigate and interact with the Graph Explorer.
          </DialogDescription>
        </DialogHeader>

        <DialogBody className="max-h-[60vh] overflow-y-auto">
          <ShortcutsSection
            title="Navigation"
            shortcuts={groupedShortcuts.navigation}
          />
          <ShortcutsSection
            title="Actions"
            shortcuts={groupedShortcuts.actions}
          />
          <ShortcutsSection
            title="General"
            shortcuts={groupedShortcuts.general}
          />
        </DialogBody>

        <div className="px-6 py-4 border-t border-border text-center">
          <p className="text-xs text-muted-foreground">
            Press <KeyBadge keyName="?" className="mx-1" /> anytime to show this help
          </p>
        </div>
      </DialogContent>
    </Dialog>
  );
}

export default ShortcutsHelp;
