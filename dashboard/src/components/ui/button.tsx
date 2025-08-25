/**
 * @fileType: component
 * @status: current
 * @updated: 2025-08-14
 * @tags: [ui, button, design-system, interactive, shadcn]
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
    const baseClasses = 'inline-flex items-center justify-center rounded-md font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50'
    
    const variants = {
      default: 'bg-blue-600 text-white hover:bg-blue-700 focus-visible:ring-blue-500',
      outline: 'border border-gray-300 bg-white text-gray-700 hover:bg-gray-50 focus-visible:ring-blue-500',
      ghost: 'text-gray-700 hover:bg-gray-100 focus-visible:ring-blue-500',
      destructive: 'bg-red-600 text-white hover:bg-red-700 focus-visible:ring-red-500'
    }
    
    const sizes = {
      sm: 'h-8 px-3 text-sm',
      default: 'h-10 px-4 text-sm',
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