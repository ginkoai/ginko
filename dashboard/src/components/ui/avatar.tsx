'use client'

import { forwardRef } from 'react'
import { clsx } from 'clsx'

interface AvatarProps extends React.HTMLAttributes<HTMLDivElement> {
  src?: string
  alt?: string
  fallback?: string
  size?: 'sm' | 'default' | 'lg'
}

export const Avatar = forwardRef<HTMLDivElement, AvatarProps>(
  ({ className, src, alt, fallback, size = 'default', ...props }, ref) => {
    const sizes = {
      sm: 'h-6 w-6 text-xs',
      default: 'h-8 w-8 text-sm',
      lg: 'h-12 w-12 text-base'
    }
    
    return (
      <div
        ref={ref}
        className={clsx(
          'relative flex shrink-0 overflow-hidden rounded-full bg-gray-100',
          sizes[size],
          className
        )}
        {...props}
      >
        {src ? (
          <img
            className="aspect-square h-full w-full object-cover"
            src={src}
            alt={alt}
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center bg-gray-200 text-gray-600 font-medium">
            {fallback || '?'}
          </div>
        )}
      </div>
    )
  }
)