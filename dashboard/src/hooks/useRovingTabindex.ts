/**
 * @fileType: hook
 * @status: current
 * @updated: 2026-01-16
 * @tags: [accessibility, keyboard, navigation, roving-tabindex, a11y]
 * @related: [useKeyboardNavigation.ts, tree-node.tsx, tree-explorer.tsx]
 * @priority: high
 * @complexity: medium
 * @dependencies: [react]
 */

'use client';

import { useState, useCallback, useRef, useEffect, RefObject } from 'react';

// =============================================================================
// Types
// =============================================================================

export interface RovingTabindexOptions {
  /** Container ref for the focusable items */
  containerRef: RefObject<HTMLElement | null>;
  /** Selector for focusable items within the container */
  itemSelector: string;
  /** Whether navigation should wrap around at boundaries */
  wrap?: boolean;
  /** Direction of navigation (vertical for tree, horizontal for toolbars) */
  direction?: 'vertical' | 'horizontal' | 'both';
  /** Callback when focus changes */
  onFocusChange?: (index: number, element: HTMLElement) => void;
  /** Initial focused index */
  initialIndex?: number;
}

export interface RovingTabindexReturn {
  /** Currently focused item index */
  focusedIndex: number;
  /** Set the focused index programmatically */
  setFocusedIndex: (index: number) => void;
  /** Get tabIndex for a specific item */
  getTabIndex: (index: number) => 0 | -1;
  /** Handle keydown event for navigation */
  handleKeyDown: (event: React.KeyboardEvent) => void;
  /** Move focus to next item */
  focusNext: () => void;
  /** Move focus to previous item */
  focusPrev: () => void;
  /** Move focus to first item */
  focusFirst: () => void;
  /** Move focus to last item */
  focusLast: () => void;
  /** Focus a specific item by index */
  focusItem: (index: number) => void;
  /** Get all focusable items */
  getItems: () => HTMLElement[];
}

// =============================================================================
// Hook
// =============================================================================

/**
 * Implements the roving tabindex pattern for keyboard navigation.
 *
 * Only one item in a group has tabIndex=0 (the focused item).
 * All other items have tabIndex=-1.
 * Arrow keys move focus between items without using Tab.
 *
 * @see https://www.w3.org/WAI/ARIA/apg/patterns/treeview/
 */
export function useRovingTabindex({
  containerRef,
  itemSelector,
  wrap = true,
  direction = 'vertical',
  onFocusChange,
  initialIndex = 0,
}: RovingTabindexOptions): RovingTabindexReturn {
  const [focusedIndex, setFocusedIndex] = useState(initialIndex);
  const lastFocusedRef = useRef<HTMLElement | null>(null);

  // Get all focusable items within the container
  const getItems = useCallback((): HTMLElement[] => {
    if (!containerRef.current) return [];
    return Array.from(containerRef.current.querySelectorAll<HTMLElement>(itemSelector));
  }, [containerRef, itemSelector]);

  // Focus a specific item by index
  const focusItem = useCallback((index: number) => {
    const items = getItems();
    if (items.length === 0) return;

    // Clamp index to valid range
    let newIndex = index;
    if (wrap) {
      newIndex = ((index % items.length) + items.length) % items.length;
    } else {
      newIndex = Math.max(0, Math.min(index, items.length - 1));
    }

    const element = items[newIndex];
    if (element) {
      setFocusedIndex(newIndex);
      element.focus();
      lastFocusedRef.current = element;
      onFocusChange?.(newIndex, element);
    }
  }, [getItems, wrap, onFocusChange]);

  // Navigation functions
  const focusNext = useCallback(() => {
    focusItem(focusedIndex + 1);
  }, [focusItem, focusedIndex]);

  const focusPrev = useCallback(() => {
    focusItem(focusedIndex - 1);
  }, [focusItem, focusedIndex]);

  const focusFirst = useCallback(() => {
    focusItem(0);
  }, [focusItem]);

  const focusLast = useCallback(() => {
    const items = getItems();
    focusItem(items.length - 1);
  }, [focusItem, getItems]);

  // Handle keyboard navigation
  const handleKeyDown = useCallback((event: React.KeyboardEvent) => {
    const { key } = event;

    const isVertical = direction === 'vertical' || direction === 'both';
    const isHorizontal = direction === 'horizontal' || direction === 'both';

    let handled = false;

    switch (key) {
      case 'ArrowDown':
        if (isVertical) {
          focusNext();
          handled = true;
        }
        break;
      case 'ArrowUp':
        if (isVertical) {
          focusPrev();
          handled = true;
        }
        break;
      case 'ArrowRight':
        if (isHorizontal) {
          focusNext();
          handled = true;
        }
        break;
      case 'ArrowLeft':
        if (isHorizontal) {
          focusPrev();
          handled = true;
        }
        break;
      case 'Home':
        focusFirst();
        handled = true;
        break;
      case 'End':
        focusLast();
        handled = true;
        break;
    }

    if (handled) {
      event.preventDefault();
      event.stopPropagation();
    }
  }, [direction, focusNext, focusPrev, focusFirst, focusLast]);

  // Get tabIndex for a specific item
  const getTabIndex = useCallback((index: number): 0 | -1 => {
    return index === focusedIndex ? 0 : -1;
  }, [focusedIndex]);

  // Restore focus when container is re-rendered
  useEffect(() => {
    const items = getItems();
    if (items.length === 0) return;

    // If we have a last focused element that's still in the DOM, use its index
    if (lastFocusedRef.current && items.includes(lastFocusedRef.current)) {
      const index = items.indexOf(lastFocusedRef.current);
      if (index !== focusedIndex) {
        setFocusedIndex(index);
      }
      return;
    }

    // Otherwise, clamp the focused index to valid range
    if (focusedIndex >= items.length) {
      setFocusedIndex(Math.max(0, items.length - 1));
    }
  }, [getItems, focusedIndex]);

  return {
    focusedIndex,
    setFocusedIndex,
    getTabIndex,
    handleKeyDown,
    focusNext,
    focusPrev,
    focusFirst,
    focusLast,
    focusItem,
    getItems,
  };
}

export default useRovingTabindex;
