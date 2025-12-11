/**
 * @fileType: component
 * @status: current
 * @updated: 2025-12-11
 * @tags: [ui, button, design-system, interactive, ginko-branding]
 * @related: [card.tsx, loading-spinner.tsx, tailwind.config.js]
 * @priority: high
 * @complexity: low
 * @dependencies: [react, clsx, tailwind]
 */
'use client'

import { forwardRef } from 'react'
import { clsx } from 'clsx'

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'default' | 'outline' | 'ghost' | 'destructive'
  size?: 'sm' | 'default' | 'lg'
  loading?: boolean
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant = 'default', size = 'default', loading, children, disabled, ...props }, ref) => {
    // Ginko brand: pill shape, JetBrains Mono, green accent
    const baseClasses = 'inline-flex items-center justify-center rounded-full font-mono font-semibold transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background disabled:pointer-events-none disabled:opacity-50'

    const variants = {
      // Primary: Ginko green with black text
      default: 'bg-primary text-primary-foreground hover:opacity-90',
      // Outline: Dark surface with green border
      outline: 'border border-primary bg-transparent text-primary hover:bg-primary/10',
      // Ghost: Subtle hover state
      ghost: 'text-foreground hover:bg-secondary hover:text-foreground',
      // Destructive: Keep red for danger actions
      destructive: 'bg-destructive text-destructive-foreground hover:bg-destructive/90'
    }

    const sizes = {
      sm: 'h-8 px-4 text-sm',
      default: 'h-10 px-6 text-sm',
      lg: 'h-12 px-8 text-base'
    }

    return (
      <button
        ref={ref}
        className={clsx(
          baseClasses,
          variants[variant],
          sizes[size],
          className
        )}
        disabled={disabled || loading}
        {...props}
      >
        {loading && (
          <svg className="animate-spin -ml-1 mr-2 h-4 w-4" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
          </svg>
        )}
        {children}
      </button>
    )
  }
)