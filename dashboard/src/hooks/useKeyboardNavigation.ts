/**
 * @fileType: hook
 * @status: current
 * @updated: 2026-01-16
 * @tags: [accessibility, keyboard, shortcuts, navigation, a11y]
 * @related: [useRovingTabindex.ts, tree-explorer.tsx, ShortcutsHelp.tsx]
 * @priority: high
 * @complexity: medium
 * @dependencies: [react]
 */

'use client';

import { useEffect, useCallback, useRef, useState } from 'react';

// =============================================================================
// Types
// =============================================================================

export interface KeyboardShortcut {
  /** Key or key combination (e.g., 'Escape', 'Slash', 'Meta+k') */
  key: string;
  /** Human-readable description for help modal */
  description: string;
  /** Callback when shortcut is triggered */
  action: () => void;
  /** Whether shortcut requires modifier (Ctrl/Cmd) */
  withModifier?: boolean;
  /** Whether shortcut should work when input is focused */
  allowInInput?: boolean;
  /** Category for grouping in help modal */
  category?: 'navigation' | 'actions' | 'general';
}

export interface UseKeyboardNavigationOptions {
  /** List of keyboard shortcuts to register */
  shortcuts: KeyboardShortcut[];
  /** Whether shortcuts are enabled */
  enabled?: boolean;
  /** Callback when shortcuts help is requested */
  onShowHelp?: () => void;
}

export interface UseKeyboardNavigationReturn {
  /** List of registered shortcuts (for help modal) */
  shortcuts: KeyboardShortcut[];
  /** Programmatically trigger a shortcut by key */
  triggerShortcut: (key: string) => void;
  /** Whether shortcuts are currently enabled */
  isEnabled: boolean;
}

// =============================================================================
// Constants
// =============================================================================

const INPUT_ELEMENTS = ['INPUT', 'TEXTAREA', 'SELECT'];

const MODIFIER_KEYS = {
  Meta: 'metaKey',
  Ctrl: 'ctrlKey',
  Alt: 'altKey',
  Shift: 'shiftKey',
} as const;

// Key name normalization map
const KEY_ALIASES: Record<string, string> = {
  '/': 'Slash',
  '?': 'Slash', // With shift
  ',': 'Comma',
  '.': 'Period',
  ';': 'Semicolon',
  "'": 'Quote',
  '[': 'BracketLeft',
  ']': 'BracketRight',
  '\\': 'Backslash',
  '`': 'Backquote',
  '-': 'Minus',
  '=': 'Equal',
};

// =============================================================================
// Hook
// =============================================================================

/**
 * Global keyboard shortcuts hook for the Graph Explorer.
 *
 * Registers shortcuts at the document level and handles:
 * - Modifier key combinations (Cmd/Ctrl+K)
 * - Input element exclusion (unless allowInInput is true)
 * - Shortcut help display
 */
export function useKeyboardNavigation({
  shortcuts,
  enabled = true,
  onShowHelp,
}: UseKeyboardNavigationOptions): UseKeyboardNavigationReturn {
  const shortcutsRef = useRef(shortcuts);
  const enabledRef = useRef(enabled);

  // Keep refs updated
  useEffect(() => {
    shortcutsRef.current = shortcuts;
    enabledRef.current = enabled;
  }, [shortcuts, enabled]);

  // Parse a key string into its components
  const parseKey = useCallback((keyString: string): { key: string; modifiers: string[] } => {
    const parts = keyString.split('+');
    const key = parts.pop() || '';
    const modifiers = parts;
    return { key, modifiers };
  }, []);

  // Check if a keyboard event matches a shortcut
  const matchesShortcut = useCallback((event: KeyboardEvent, shortcut: KeyboardShortcut): boolean => {
    const { key, modifiers } = parseKey(shortcut.key);

    // Normalize event key
    let eventKey = event.key;
    if (KEY_ALIASES[eventKey]) {
      eventKey = KEY_ALIASES[eventKey];
    }

    // Check key match (case-insensitive for letters)
    const keyMatches =
      eventKey.toLowerCase() === key.toLowerCase() ||
      event.code === `Key${key.toUpperCase()}` ||
      event.code === key;

    if (!keyMatches) return false;

    // Check modifier keys
    for (const [modName, modProp] of Object.entries(MODIFIER_KEYS)) {
      const shouldHaveMod = modifiers.includes(modName);
      const hasMod = event[modProp as keyof KeyboardEvent];
      if (shouldHaveMod !== hasMod) return false;
    }

    return true;
  }, [parseKey]);

  // Handle keydown events
  useEffect(() => {
    if (!enabled) return;

    const handleKeyDown = (event: KeyboardEvent) => {
      // Check if we're in an input element
      const target = event.target as HTMLElement;
      const isInInput = INPUT_ELEMENTS.includes(target.tagName) ||
        target.isContentEditable;

      // Find matching shortcut
      for (const shortcut of shortcutsRef.current) {
        // Skip if in input and shortcut doesn't allow it
        if (isInInput && !shortcut.allowInInput) continue;

        if (matchesShortcut(event, shortcut)) {
          event.preventDefault();
          event.stopPropagation();
          shortcut.action();
          return;
        }
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [enabled, matchesShortcut]);

  // Programmatically trigger a shortcut
  const triggerShortcut = useCallback((key: string) => {
    const shortcut = shortcutsRef.current.find((s) => s.key === key);
    if (shortcut) {
      shortcut.action();
    }
  }, []);

  return {
    shortcuts,
    triggerShortcut,
    isEnabled: enabled,
  };
}

// =============================================================================
// Helper: Create standard Graph Explorer shortcuts
// =============================================================================

export interface GraphExplorerShortcutOptions {
  onFocusSearch: () => void;
  onShowHelp: () => void;
  onEscape: () => void;
  onEdit?: () => void;
  onGoBack?: () => void;
  onNavigateUp?: () => void;
  onNavigateDown?: () => void;
  onExpand?: () => void;
  onCollapse?: () => void;
}

/**
 * Create the standard set of keyboard shortcuts for the Graph Explorer.
 */
export function createGraphExplorerShortcuts(
  options: GraphExplorerShortcutOptions
): KeyboardShortcut[] {
  const shortcuts: KeyboardShortcut[] = [
    // Navigation
    {
      key: 'Slash',
      description: 'Focus search',
      action: options.onFocusSearch,
      category: 'navigation',
    },
    {
      key: 'Meta+k',
      description: 'Focus search (macOS)',
      action: options.onFocusSearch,
      withModifier: true,
      category: 'navigation',
    },
    {
      key: 'Ctrl+k',
      description: 'Focus search (Windows/Linux)',
      action: options.onFocusSearch,
      withModifier: true,
      category: 'navigation',
    },
    // General
    {
      key: 'Escape',
      description: 'Close modal or deselect',
      action: options.onEscape,
      category: 'general',
    },
    {
      key: 'Shift+Slash',
      description: 'Show keyboard shortcuts',
      action: options.onShowHelp,
      category: 'general',
    },
  ];

  // Optional shortcuts
  if (options.onEdit) {
    shortcuts.push({
      key: 'e',
      description: 'Edit selected node',
      action: options.onEdit,
      category: 'actions',
    });
  }

  if (options.onGoBack) {
    shortcuts.push({
      key: 'b',
      description: 'Go back (breadcrumb)',
      action: options.onGoBack,
      category: 'navigation',
    });
  }

  if (options.onNavigateUp) {
    shortcuts.push({
      key: 'ArrowUp',
      description: 'Navigate to previous item',
      action: options.onNavigateUp,
      category: 'navigation',
      allowInInput: false,
    });
  }

  if (options.onNavigateDown) {
    shortcuts.push({
      key: 'ArrowDown',
      description: 'Navigate to next item',
      action: options.onNavigateDown,
      category: 'navigation',
      allowInInput: false,
    });
  }

  if (options.onExpand) {
    shortcuts.push({
      key: 'ArrowRight',
      description: 'Expand node',
      action: options.onExpand,
      category: 'navigation',
      allowInInput: false,
    });
  }

  if (options.onCollapse) {
    shortcuts.push({
      key: 'ArrowLeft',
      description: 'Collapse node',
      action: options.onCollapse,
      category: 'navigation',
      allowInInput: false,
    });
  }

  return shortcuts;
}

export default useKeyboardNavigation;
