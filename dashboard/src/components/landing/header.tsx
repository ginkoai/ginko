/**
 * @fileType: component
 * @status: current
 * @updated: 2026-01-12
 * @tags: [landing-page, header, navigation, marketing, responsive]
 * @related: [landing-page.tsx, footer.tsx, mobile-nav.tsx]
 * @priority: high
 * @complexity: low
 * @dependencies: [react, next/link, ui/button]
 */

import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { MobileNav } from './mobile-nav'

export function Header() {
  return (
    <header className="sticky top-0 z-50 bg-background/80 backdrop-blur-md border-b border-border">
      <div className="container mx-auto px-4 sm:px-6 py-4">
        <nav className="flex items-center justify-between">
          {/* Logo */}
          <Link href="/" className="font-mono text-xl sm:text-2xl font-bold text-foreground hover:text-primary transition-colors">
            <span className="text-primary">g</span>inko
          </Link>

          {/* Desktop Navigation */}
          <div className="hidden md:flex items-center space-x-6">
            <a href="#features" className="text-sm text-muted-foreground hover:text-foreground transition-colors">Features</a>
            <a href="#how-it-works" className="text-sm text-muted-foreground hover:text-foreground transition-colors">How It Works</a>
            <a href="#pricing" className="text-sm text-muted-foreground hover:text-foreground transition-colors">Pricing</a>
            <Link href="https://docs.ginko.ai" className="text-sm text-muted-foreground hover:text-foreground transition-colors">Docs</Link>
          </div>

          {/* Desktop Auth Buttons */}
          <div className="hidden md:flex items-center space-x-3">
            <Link href="/auth/login">
              <Button variant="ghost" size="sm">Sign In</Button>
            </Link>
            <Link href="/auth/signup">
              <Button size="sm">Get Started</Button>
            </Link>
          </div>

          {/* Mobile Navigation */}
          <MobileNav />
        </nav>
      </div>
    </header>
  )
}
