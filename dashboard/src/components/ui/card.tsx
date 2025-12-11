/**
 * @fileType: component
 * @status: current
 * @updated: 2025-12-11
 * @tags: [ui, card, container, design-system, layout, ginko-branding]
 * @related: [button.tsx, dashboard components, tailwind.config.js, corner-brackets.tsx]
 * @priority: high
 * @complexity: low
 * @dependencies: [react, clsx, tailwind]
 */
'use client'

import { forwardRef } from 'react'
import { clsx } from 'clsx'

interface CardProps extends React.HTMLAttributes<HTMLDivElement> {
  variant?: 'default' | 'surface' | 'elevated'
  withBrackets?: boolean
}

export const Card = forwardRef<HTMLDivElement, CardProps>(
  ({ className, variant = 'default', withBrackets = false, ...props }, ref) => {
    const variants = {
      // Default: Standard card with subtle border
      default: 'bg-card border border-border',
      // Surface: Slightly elevated surface
      surface: 'bg-secondary border border-border',
      // Elevated: More prominent with stronger shadow
      elevated: 'bg-card border border-border shadow-lg'
    }

    return (
      <div
        ref={ref}
        className={clsx(
          'rounded-lg text-card-foreground transition-colors',
          variants[variant],
          withBrackets && 'corner-brackets',
          className
        )}
        {...props}
      />
    )
  }
)

// Additional card sub-components for consistent styling
export const CardHeader = forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(
  ({ className, ...props }, ref) => (
    <div
      ref={ref}
      className={clsx('flex flex-col space-y-1.5 p-6', className)}
      {...props}
    />
  )
)

export const CardTitle = forwardRef<HTMLParagraphElement, React.HTMLAttributes<HTMLHeadingElement>>(
  ({ className, ...props }, ref) => (
    <h3
      ref={ref}
      className={clsx('font-mono font-semibold leading-none tracking-tight', className)}
      {...props}
    />
  )
)

export const CardDescription = forwardRef<HTMLParagraphElement, React.HTMLAttributes<HTMLParagraphElement>>(
  ({ className, ...props }, ref) => (
    <p
      ref={ref}
      className={clsx('text-sm text-muted-foreground', className)}
      {...props}
    />
  )
)

export const CardContent = forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(
  ({ className, ...props }, ref) => (
    <div ref={ref} className={clsx('p-6 pt-0', className)} {...props} />
  )
)

export const CardFooter = forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(
  ({ className, ...props }, ref) => (
    <div
      ref={ref}
      className={clsx('flex items-center p-6 pt-0', className)}
      {...props}
    />
  )
)