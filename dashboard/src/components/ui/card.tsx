/**
 * @fileType: component
 * @status: current
 * @updated: 2025-08-14
 * @tags: [ui, card, container, design-system, layout]
 * @related: [button.tsx, dashboard components, tailwind.config.js]
 * @priority: high
 * @complexity: low
 * @dependencies: [react, clsx, tailwind]
 */
'use client'

import { forwardRef } from 'react'
import { clsx } from 'clsx'

interface CardProps extends React.HTMLAttributes<HTMLDivElement> {}

export const Card = forwardRef<HTMLDivElement, CardProps>(
  ({ className, ...props }, ref) => {
    return (
      <div
        ref={ref}
        className={clsx(
          'rounded-lg border border-border bg-card text-card-foreground shadow-sm',
          className
        )}
        {...props}
      />
    )
  }
)