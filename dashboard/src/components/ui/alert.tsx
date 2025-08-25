'use client'

import { forwardRef } from 'react'
import { clsx } from 'clsx'
import { ExclamationTriangleIcon, CheckCircleIcon, InformationCircleIcon } from '@heroicons/react/24/outline'

interface AlertProps extends React.HTMLAttributes<HTMLDivElement> {
  variant?: 'default' | 'destructive' | 'success' | 'warning'
}

export const Alert = forwardRef<HTMLDivElement, AlertProps>(
  ({ className, variant = 'default', children, ...props }, ref) => {
    const variants = {
      default: 'bg-blue-50 border-blue-200 text-blue-700',
      destructive: 'bg-red-50 border-red-200 text-red-700',
      success: 'bg-green-50 border-green-200 text-green-700',
      warning: 'bg-yellow-50 border-yellow-200 text-yellow-700'
    }
    
    const icons = {
      default: InformationCircleIcon,
      destructive: ExclamationTriangleIcon,
      success: CheckCircleIcon,
      warning: ExclamationTriangleIcon
    }
    
    const Icon = icons[variant]
    
    return (
      <div
        ref={ref}
        className={clsx(
          'rounded-md border p-4',
          variants[variant],
          className
        )}
        {...props}
      >
        <div className="flex">
          <Icon className="h-5 w-5 mr-2 flex-shrink-0" />
          <div className="text-sm">{children}</div>
        </div>
      </div>
    )
  }
)