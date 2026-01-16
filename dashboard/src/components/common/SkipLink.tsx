/**
 * @fileType: component
 * @status: current
 * @updated: 2026-01-16
 * @tags: [accessibility, skip-link, navigation, a11y, wcag]
 * @related: [tree-explorer.tsx, page.tsx]
 * @priority: high
 * @complexity: low
 * @dependencies: [react]
 */

'use client';

import { cn } from '@/lib/utils';

// =============================================================================
// Types
// =============================================================================

export interface SkipLinkProps {
  /** Target element ID to skip to (without #) */
  targetId: string;
  /** Link text (default: "Skip to main content") */
  children?: React.ReactNode;
  /** Additional className */
  className?: string;
}

export interface SkipLinksProps {
  /** Array of skip link configurations */
  links: Array<{
    targetId: string;
    label: string;
  }>;
  /** Additional className for the container */
  className?: string;
}

// =============================================================================
// Components
// =============================================================================

/**
 * Single skip link component.
 *
 * Visually hidden by default, becomes visible on focus.
 * Allows keyboard users to bypass navigation and jump to main content.
 *
 * @see https://www.w3.org/WAI/WCAG21/Techniques/general/G1
 */
export function SkipLink({
  targetId,
  children = 'Skip to main content',
  className,
}: SkipLinkProps) {
  const handleClick = (event: React.MouseEvent<HTMLAnchorElement>) => {
    event.preventDefault();
    const target = document.getElementById(targetId);
    if (target) {
      // Set tabindex to make the target focusable if it isn't already
      if (!target.hasAttribute('tabindex')) {
        target.setAttribute('tabindex', '-1');
      }
      target.focus();
      // Scroll to the element
      target.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  };

  return (
    <a
      href={`#${targetId}`}
      onClick={handleClick}
      className={cn(
        // Visually hidden by default
        'sr-only',
        // Show on focus
        'focus:not-sr-only',
        // Positioning (top-left corner)
        'focus:fixed focus:top-4 focus:left-4 focus:z-[100]',
        // Styling
        'focus:px-4 focus:py-2',
        'focus:bg-ginko-500 focus:text-black',
        'focus:font-mono focus:font-medium focus:text-sm',
        'focus:rounded-md focus:shadow-lg',
        // Focus ring
        'focus:outline-none focus:ring-2 focus:ring-ginko-400 focus:ring-offset-2 focus:ring-offset-background',
        // Transition
        'transition-all duration-200',
        className
      )}
    >
      {children}
    </a>
  );
}

/**
 * Multiple skip links container.
 *
 * Renders multiple skip links for different target sections.
 * Each link appears on focus in sequence.
 */
export function SkipLinks({ links, className }: SkipLinksProps) {
  return (
    <nav
      aria-label="Skip links"
      className={cn('fixed top-0 left-0 z-[100]', className)}
    >
      {links.map((link, index) => (
        <SkipLink
          key={link.targetId}
          targetId={link.targetId}
          className={cn(
            // Stack links vertically on focus
            index > 0 && 'focus:top-14'
          )}
        >
          {link.label}
        </SkipLink>
      ))}
    </nav>
  );
}

// =============================================================================
// Preset Skip Links for Graph Explorer
// =============================================================================

/**
 * Pre-configured skip links for the Graph Explorer page.
 */
export function GraphExplorerSkipLinks() {
  return (
    <SkipLinks
      links={[
        { targetId: 'main-content', label: 'Skip to main content' },
        { targetId: 'tree-search', label: 'Skip to search' },
      ]}
    />
  );
}

export default SkipLink;
