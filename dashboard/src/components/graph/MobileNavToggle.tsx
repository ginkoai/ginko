/**
 * @fileType: component
 * @status: current
 * @updated: 2026-01-16
 * @tags: [graph, mobile, navigation, hamburger-menu, responsive]
 * @related: [tree-explorer.tsx, page.tsx]
 * @priority: high
 * @complexity: low
 * @dependencies: [lucide-react]
 */

'use client';

import { Menu, X } from 'lucide-react';
import { cn } from '@/lib/utils';

// =============================================================================
// Types
// =============================================================================

export interface MobileNavToggleProps {
  /** Whether the mobile nav is currently open */
  isOpen: boolean;
  /** Callback when toggle is clicked */
  onToggle: () => void;
  /** Optional additional class names */
  className?: string;
}

// =============================================================================
// Component
// =============================================================================

/**
 * MobileNavToggle - Hamburger menu button for mobile navigation
 *
 * Shows on mobile (<768px) to toggle the tree explorer sidebar.
 * Uses 44px minimum touch target for accessibility.
 */
export function MobileNavToggle({
  isOpen,
  onToggle,
  className,
}: MobileNavToggleProps) {
  return (
    <button
      type="button"
      onClick={onToggle}
      className={cn(
        // Base styles - 44px minimum touch target
        'flex items-center justify-center',
        'w-11 h-11 min-w-[44px] min-h-[44px]',
        // Visual styling
        'rounded-lg',
        'bg-card border border-border',
        'text-foreground',
        // Hover/focus states
        'hover:bg-white/5 active:bg-white/10',
        'transition-colors duration-150',
        'focus:outline-none focus:ring-2 focus:ring-ginko-500/50',
        // Only show on mobile
        'md:hidden',
        className
      )}
      aria-label={isOpen ? 'Close navigation menu' : 'Open navigation menu'}
      aria-expanded={isOpen}
      aria-controls="mobile-nav-overlay"
    >
      {isOpen ? (
        <X className="w-5 h-5" aria-hidden="true" />
      ) : (
        <Menu className="w-5 h-5" aria-hidden="true" />
      )}
    </button>
  );
}

// =============================================================================
// Export
// =============================================================================

export default MobileNavToggle;
