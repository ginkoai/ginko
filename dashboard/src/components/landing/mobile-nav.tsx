/**
 * @fileType: component
 * @status: current
 * @updated: 2026-01-12
 * @tags: [landing-page, mobile-nav, navigation, responsive]
 * @related: [header.tsx]
 * @priority: high
 * @complexity: medium
 * @dependencies: [react, next/link, heroicons, ui/button]
 */
'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Bars3Icon, XMarkIcon } from '@heroicons/react/24/outline'

export function MobileNav() {
  const [isOpen, setIsOpen] = useState(false)

  // Close menu when route changes or escape key pressed
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setIsOpen(false)
    }

    if (isOpen) {
      document.addEventListener('keydown', handleEscape)
      // Prevent body scroll when menu is open
      document.body.style.overflow = 'hidden'
    }

    return () => {
      document.removeEventListener('keydown', handleEscape)
      document.body.style.overflow = ''
    }
  }, [isOpen])

  const closeMenu = () => setIsOpen(false)

  return (
    <div className="md:hidden">
      {/* Hamburger button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="p-2 -mr-2 text-muted-foreground hover:text-foreground transition-colors"
        aria-label={isOpen ? 'Close menu' : 'Open menu'}
        aria-expanded={isOpen}
      >
        {isOpen ? (
          <XMarkIcon className="h-6 w-6" />
        ) : (
          <Bars3Icon className="h-6 w-6" />
        )}
      </button>

      {/* Mobile menu overlay */}
      {isOpen && (
        <>
          {/* Backdrop */}
          <div
            className="fixed inset-0 bg-background/80 backdrop-blur-sm z-40"
            onClick={closeMenu}
            aria-hidden="true"
          />

          {/* Menu panel */}
          <div className="fixed top-[65px] left-0 right-0 bottom-0 z-50 bg-background border-t border-border overflow-y-auto">
            <nav className="container mx-auto px-6 py-6">
              {/* Navigation links */}
              <div className="space-y-1 mb-6">
                <a
                  href="#features"
                  onClick={closeMenu}
                  className="block py-3 px-4 text-lg text-foreground hover:bg-muted rounded-lg transition-colors"
                >
                  Features
                </a>
                <a
                  href="#how-it-works"
                  onClick={closeMenu}
                  className="block py-3 px-4 text-lg text-foreground hover:bg-muted rounded-lg transition-colors"
                >
                  How It Works
                </a>
                <a
                  href="#pricing"
                  onClick={closeMenu}
                  className="block py-3 px-4 text-lg text-foreground hover:bg-muted rounded-lg transition-colors"
                >
                  Pricing
                </a>
                <Link
                  href="https://docs.ginko.ai"
                  onClick={closeMenu}
                  className="block py-3 px-4 text-lg text-foreground hover:bg-muted rounded-lg transition-colors"
                >
                  Docs
                </Link>
              </div>

              {/* Divider */}
              <div className="border-t border-border mb-6" />

              {/* Auth buttons */}
              <div className="space-y-3">
                <Link href="/auth/login" onClick={closeMenu} className="block">
                  <Button variant="outline" className="w-full h-12 text-base">
                    Sign In
                  </Button>
                </Link>
                <Link href="/auth/signup" onClick={closeMenu} className="block">
                  <Button className="w-full h-12 text-base">
                    Get Started
                  </Button>
                </Link>
              </div>

              {/* Trust signals */}
              <div className="mt-8 pt-6 border-t border-border">
                <div className="flex items-center justify-center gap-6 text-xs text-muted-foreground">
                  <div className="flex items-center gap-1.5">
                    <svg className="h-4 w-4" viewBox="0 0 24 24" fill="currentColor">
                      <path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z"/>
                    </svg>
                    <span>Open Source</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <span>MIT License</span>
                  </div>
                </div>
              </div>
            </nav>
          </div>
        </>
      )}
    </div>
  )
}
