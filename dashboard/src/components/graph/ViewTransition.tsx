/**
 * @fileType: component
 * @status: current
 * @updated: 2025-12-17
 * @tags: [animation, transition, framer-motion, c4-navigation]
 * @related: [page.tsx, ProjectView.tsx, CategoryView.tsx, NodeView.tsx]
 * @priority: medium
 * @complexity: medium
 * @dependencies: [framer-motion]
 */

'use client';

import { ReactNode } from 'react';
import { AnimatePresence, motion, Variants } from 'framer-motion';

// =============================================================================
// Types
// =============================================================================

export type TransitionDirection = 'forward' | 'back';
export type ViewKey = 'project' | 'category' | 'detail';

interface ViewTransitionProps {
  /** Unique key for the current view (triggers animation on change) */
  viewKey: ViewKey;
  /** Direction of navigation for slide direction */
  direction: TransitionDirection;
  /** Content to animate */
  children: ReactNode;
  /** Optional className for the motion container */
  className?: string;
}

// =============================================================================
// Animation Variants
// =============================================================================

const slideVariants: Variants = {
  enter: (direction: TransitionDirection) => ({
    x: direction === 'forward' ? 30 : -30,
    opacity: 0,
  }),
  center: {
    x: 0,
    opacity: 1,
  },
  exit: (direction: TransitionDirection) => ({
    x: direction === 'forward' ? -30 : 30,
    opacity: 0,
  }),
};

const transition = {
  x: { type: 'spring', stiffness: 400, damping: 35 },
  opacity: { duration: 0.2 },
};

// =============================================================================
// Component
// =============================================================================

/**
 * ViewTransition - Wraps view content with animated transitions
 *
 * Provides smooth fade + slide animations when navigating between views.
 * Direction-aware: forward navigation slides left-to-right, back slides right-to-left.
 *
 * @example
 * ```tsx
 * <ViewTransition viewKey={viewMode} direction={navDirection}>
 *   {viewMode === 'project' && <ProjectView />}
 *   {viewMode === 'category' && <CategoryView />}
 * </ViewTransition>
 * ```
 */
export function ViewTransition({
  viewKey,
  direction,
  children,
  className,
}: ViewTransitionProps) {
  return (
    <AnimatePresence mode="wait" initial={false} custom={direction}>
      <motion.div
        key={viewKey}
        custom={direction}
        variants={slideVariants}
        initial="enter"
        animate="center"
        exit="exit"
        transition={transition}
        className={className}
      >
        {children}
      </motion.div>
    </AnimatePresence>
  );
}

// =============================================================================
// Utility Hook for Direction Tracking
// =============================================================================

const VIEW_ORDER: Record<ViewKey, number> = {
  project: 0,
  category: 1,
  detail: 2,
};

/**
 * Determines transition direction based on view navigation
 */
export function getTransitionDirection(
  fromView: ViewKey,
  toView: ViewKey
): TransitionDirection {
  return VIEW_ORDER[toView] > VIEW_ORDER[fromView] ? 'forward' : 'back';
}

export default ViewTransition;
