'use client'

import { forwardRef } from 'react'
import { clsx } from 'clsx'
import { ChevronDownIcon } from '@heroicons/react/24/outline'

interface SelectOption {
  value: string
  label: string
}

interface SelectProps extends Omit<React.SelectHTMLAttributes<HTMLSelectElement>, 'onChange'> {
  options: SelectOption[]
  onValueChange?: (value: string) => void
  placeholder?: string
  /** Optional size variant */
  size?: 'sm' | 'default'
}

export const Select = forwardRef<HTMLSelectElement, SelectProps>(
  ({ className, options, onValueChange, placeholder, size = 'default', ...props }, ref) => {
    const sizeClasses = size === 'sm' ? 'h-8 text-sm pr-7' : 'h-10 text-sm pr-8'
    const iconSize = size === 'sm' ? 'h-3.5 w-3.5' : 'h-4 w-4'

    return (
      <div className="relative inline-block">
        <select
          ref={ref}
          className={clsx(
            // Base styles with comprehensive appearance reset
            'block w-full rounded-md border border-border bg-background text-foreground',
            'px-3 py-1.5',
            // Remove ALL native select styling (cross-browser)
            'appearance-none',
            '[&::-ms-expand]:hidden', // IE/Edge
            'bg-none', // Extra safety for background arrow
            // Text handling
            'truncate',
            'placeholder:text-muted-foreground',
            // Focus states
            'focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary',
            // Disabled state
            'disabled:cursor-not-allowed disabled:opacity-50',
            // Size variant
            sizeClasses,
            className
          )}
          onChange={(e) => onValueChange?.(e.target.value)}
          {...props}
        >
          {placeholder && (
            <option value="" disabled hidden>
              {placeholder}
            </option>
          )}
          {options.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
        <ChevronDownIcon
          className={clsx(
            'absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none',
            iconSize
          )}
        />
      </div>
    )
  }
)

Select.displayName = 'Select'