/**
 * @fileType: component
 * @status: current
 * @updated: 2025-12-11
 * @tags: [ui, corner-brackets, design-system, ginko-branding, brass-hands]
 * @related: [card.tsx, globals.css]
 * @priority: medium
 * @complexity: low
 * @dependencies: [react, clsx, tailwind]
 */
'use client'

import { forwardRef } from 'react'
import { clsx } from 'clsx'

interface CornerBracketsProps extends React.HTMLAttributes<HTMLDivElement> {
  /** Size of the bracket corners */
  size?: 'sm' | 'default' | 'lg'
  /** Color variant */
  variant?: 'primary' | 'muted' | 'accent'
  /** Whether to show all 4 corners or just top-left/bottom-right */
  corners?: 'all' | 'diagonal'
}

/**
 * CornerBrackets - Brass Hands signature design element
 *
 * Wraps content with industrial-style corner brackets
 * matching the ginko marketing site aesthetic.
 *
 * @example
 * ```tsx
 * <CornerBrackets>
 *   <h2>Feature Title</h2>
 *   <p>Description text</p>
 * </CornerBrackets>
 * ```
 */
export const CornerBrackets = forwardRef<HTMLDivElement, CornerBracketsProps>(
  ({ className, size = 'default', variant = 'primary', corners = 'diagonal', children, ...props }, ref) => {
    const sizes = {
      sm: { bracket: '8px', thickness: '1px', padding: 'p-1' },
      default: { bracket: '12px', thickness: '2px', padding: 'p-2' },
      lg: { bracket: '16px', thickness: '2px', padding: 'p-4' }
    }

    const colors = {
      primary: 'border-primary',
      muted: 'border-muted-foreground',
      accent: 'border-accent'
    }

    const { bracket, thickness, padding } = sizes[size]
    const colorClass = colors[variant]

    return (
      <div
        ref={ref}
        className={clsx('relative', padding, className)}
        style={{
          '--bracket-size': bracket,
          '--bracket-thickness': thickness,
        } as React.CSSProperties}
        {...props}
      >
        {/* Top-left bracket */}
        <span
          className={clsx(
            'absolute top-0 left-0 pointer-events-none',
            colorClass
          )}
          style={{
            width: bracket,
            height: bracket,
            borderTopWidth: thickness,
            borderLeftWidth: thickness,
            borderTopStyle: 'solid',
            borderLeftStyle: 'solid',
          }}
        />

        {/* Top-right bracket (when corners='all') */}
        {corners === 'all' && (
          <span
            className={clsx(
              'absolute top-0 right-0 pointer-events-none',
              colorClass
            )}
            style={{
              width: bracket,
              height: bracket,
              borderTopWidth: thickness,
              borderRightWidth: thickness,
              borderTopStyle: 'solid',
              borderRightStyle: 'solid',
            }}
          />
        )}

        {/* Bottom-left bracket (when corners='all') */}
        {corners === 'all' && (
          <span
            className={clsx(
              'absolute bottom-0 left-0 pointer-events-none',
              colorClass
            )}
            style={{
              width: bracket,
              height: bracket,
              borderBottomWidth: thickness,
              borderLeftWidth: thickness,
              borderBottomStyle: 'solid',
              borderLeftStyle: 'solid',
            }}
          />
        )}

        {/* Bottom-right bracket */}
        <span
          className={clsx(
            'absolute bottom-0 right-0 pointer-events-none',
            colorClass
          )}
          style={{
            width: bracket,
            height: bracket,
            borderBottomWidth: thickness,
            borderRightWidth: thickness,
            borderBottomStyle: 'solid',
            borderRightStyle: 'solid',
          }}
        />

        {children}
      </div>
    )
  }
)

CornerBrackets.displayName = 'CornerBrackets'
