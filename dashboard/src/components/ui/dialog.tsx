/**
 * @fileType: component
 * @status: current
 * @updated: 2025-12-16
 * @tags: [ui, dialog, modal, radix, design-system]
 * @related: [card.tsx, button.tsx, PrinciplePreviewModal.tsx]
 * @priority: high
 * @complexity: medium
 * @dependencies: [react, @radix-ui/react-dialog, clsx, tailwind]
 */
'use client'

import { forwardRef } from 'react'
import * as DialogPrimitive from '@radix-ui/react-dialog'
import { XMarkIcon } from '@heroicons/react/24/outline'
import { clsx } from 'clsx'

// Root Dialog component
export const Dialog = DialogPrimitive.Root

// Dialog trigger - wraps clickable element that opens dialog
export const DialogTrigger = DialogPrimitive.Trigger

// Dialog portal - renders dialog outside DOM hierarchy
export const DialogPortal = DialogPrimitive.Portal

// Dialog close button
export const DialogClose = DialogPrimitive.Close

// Overlay - darkens background behind dialog
export const DialogOverlay = forwardRef<
  React.ElementRef<typeof DialogPrimitive.Overlay>,
  React.ComponentPropsWithoutRef<typeof DialogPrimitive.Overlay>
>(({ className, ...props }, ref) => (
  <DialogPrimitive.Overlay
    ref={ref}
    className={clsx(
      'fixed inset-0 z-50 bg-black/60 backdrop-blur-sm',
      'data-[state=open]:animate-in data-[state=closed]:animate-out',
      'data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0',
      className
    )}
    {...props}
  />
))
DialogOverlay.displayName = DialogPrimitive.Overlay.displayName

// Content - main dialog container
interface DialogContentProps
  extends React.ComponentPropsWithoutRef<typeof DialogPrimitive.Content> {
  size?: 'sm' | 'default' | 'lg' | 'xl'
  showCloseButton?: boolean
}

const sizeClasses = {
  sm: 'max-w-sm',
  default: 'max-w-lg',
  lg: 'max-w-2xl',
  xl: 'max-w-4xl'
}

export const DialogContent = forwardRef<
  React.ElementRef<typeof DialogPrimitive.Content>,
  DialogContentProps
>(({ className, size = 'default', showCloseButton = true, children, ...props }, ref) => (
  <DialogPortal>
    <DialogOverlay />
    <DialogPrimitive.Content
      ref={ref}
      className={clsx(
        // Mobile: full-width sheet from bottom; Desktop: centered modal
        'fixed z-50 w-full bg-card border border-border shadow-xl',
        // Mobile positioning (bottom sheet style)
        'bottom-0 left-0 right-0 rounded-t-xl max-h-[90vh]',
        // Desktop positioning (centered modal)
        'sm:bottom-auto sm:left-[50%] sm:top-[50%] sm:translate-x-[-50%] sm:translate-y-[-50%] sm:rounded-lg sm:max-h-[85vh]',
        // Safe area padding for iOS
        'pb-[env(safe-area-inset-bottom)]',
        'duration-200',
        'data-[state=open]:animate-in data-[state=closed]:animate-out',
        'data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0',
        // Mobile: slide up from bottom; Desktop: zoom
        'data-[state=closed]:slide-out-to-bottom data-[state=open]:slide-in-from-bottom',
        'sm:data-[state=closed]:slide-out-to-bottom-0 sm:data-[state=open]:slide-in-from-bottom-0',
        'sm:data-[state=closed]:zoom-out-95 sm:data-[state=open]:zoom-in-95',
        'sm:data-[state=closed]:slide-out-to-left-1/2 sm:data-[state=closed]:slide-out-to-top-[48%]',
        'sm:data-[state=open]:slide-in-from-left-1/2 sm:data-[state=open]:slide-in-from-top-[48%]',
        sizeClasses[size],
        className
      )}
      {...props}
    >
      {children}
      {showCloseButton && (
        <DialogPrimitive.Close
          className={clsx(
            'absolute right-4 top-4 rounded-sm opacity-70 ring-offset-background',
            'transition-opacity hover:opacity-100',
            'focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2',
            'disabled:pointer-events-none',
            'text-muted-foreground hover:text-foreground'
          )}
        >
          <XMarkIcon className="h-5 w-5" />
          <span className="sr-only">Close</span>
        </DialogPrimitive.Close>
      )}
    </DialogPrimitive.Content>
  </DialogPortal>
))
DialogContent.displayName = DialogPrimitive.Content.displayName

// Header - container for title and description
export const DialogHeader = forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => (
  <div
    ref={ref}
    className={clsx('flex flex-col space-y-1.5 p-6 pb-4', className)}
    {...props}
  />
))
DialogHeader.displayName = 'DialogHeader'

// Footer - container for action buttons
export const DialogFooter = forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => (
  <div
    ref={ref}
    className={clsx(
      'flex flex-col-reverse gap-2 sm:flex-row sm:justify-end sm:space-x-2',
      'px-6 py-4 border-t border-border',
      // Extra bottom padding on mobile for safe area
      'pb-6 sm:pb-4',
      className
    )}
    {...props}
  />
))
DialogFooter.displayName = 'DialogFooter'

// Title - main heading for dialog
export const DialogTitle = forwardRef<
  React.ElementRef<typeof DialogPrimitive.Title>,
  React.ComponentPropsWithoutRef<typeof DialogPrimitive.Title>
>(({ className, ...props }, ref) => (
  <DialogPrimitive.Title
    ref={ref}
    className={clsx('font-mono text-lg font-semibold text-foreground', className)}
    {...props}
  />
))
DialogTitle.displayName = DialogPrimitive.Title.displayName

// Description - secondary text explaining dialog purpose
export const DialogDescription = forwardRef<
  React.ElementRef<typeof DialogPrimitive.Description>,
  React.ComponentPropsWithoutRef<typeof DialogPrimitive.Description>
>(({ className, ...props }, ref) => (
  <DialogPrimitive.Description
    ref={ref}
    className={clsx('text-sm text-muted-foreground', className)}
    {...props}
  />
))
DialogDescription.displayName = DialogPrimitive.Description.displayName

// Body - main content area with scroll support
export const DialogBody = forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => (
  <div
    ref={ref}
    className={clsx('px-6 py-2 max-h-[50vh] sm:max-h-[60vh] overflow-y-auto', className)}
    {...props}
  />
))
DialogBody.displayName = 'DialogBody'
