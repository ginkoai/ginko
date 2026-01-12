/**
 * @fileType: component
 * @status: current
 * @updated: 2026-01-12
 * @tags: [landing-page, footer, navigation, marketing]
 * @related: [landing-page.tsx, header.tsx]
 * @priority: medium
 * @complexity: low
 * @dependencies: [react, next/link]
 */

import Link from 'next/link'

export function Footer() {
  return (
    <footer className="border-t border-border py-12">
      <div className="container mx-auto px-6">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-8 mb-8">
          <div>
            <Link href="/" className="font-mono text-xl font-bold text-foreground hover:text-primary transition-colors">
              <span className="text-primary">g</span>inko
            </Link>
            <p className="text-muted-foreground text-sm mt-2">
              Context that flows with you
            </p>
          </div>

          <div>
            <h4 className="font-mono font-semibold text-foreground text-sm mb-3">Product</h4>
            <ul className="space-y-2 text-sm text-muted-foreground">
              <li><a href="#features" className="hover:text-primary transition-colors">Features</a></li>
              <li><a href="#pricing" className="hover:text-primary transition-colors">Pricing</a></li>
              <li><Link href="https://docs.ginko.ai" className="hover:text-primary transition-colors">Documentation</Link></li>
              <li><Link href="https://github.com/ginkoai" className="hover:text-primary transition-colors">GitHub</Link></li>
            </ul>
          </div>

          <div>
            <h4 className="font-mono font-semibold text-foreground text-sm mb-3">Company</h4>
            <ul className="space-y-2 text-sm text-muted-foreground">
              <li><a href="mailto:chris@watchhill.ai" className="hover:text-primary transition-colors">Contact</a></li>
              <li><a href="#" className="hover:text-primary transition-colors">Privacy</a></li>
              <li><a href="#" className="hover:text-primary transition-colors">Terms</a></li>
            </ul>
          </div>

          <div>
            <h4 className="font-mono font-semibold text-foreground text-sm mb-3">Resources</h4>
            <ul className="space-y-2 text-sm text-muted-foreground">
              <li><Link href="https://docs.ginko.ai/quickstart" className="hover:text-primary transition-colors">Getting Started</Link></li>
              <li><Link href="https://docs.ginko.ai/api" className="hover:text-primary transition-colors">API Reference</Link></li>
              <li><a href="mailto:chris@watchhill.ai" className="hover:text-primary transition-colors">Support</a></li>
            </ul>
          </div>
        </div>

        <div className="border-t border-border pt-8 flex flex-col md:flex-row justify-between items-center gap-4">
          <p className="text-muted-foreground text-sm">
            © 2025 ginko. All rights reserved.
          </p>
          <div className="flex items-center gap-6 text-sm text-muted-foreground">
            <a href="#" className="hover:text-primary transition-colors">Privacy Policy</a>
            <a href="#" className="hover:text-primary transition-colors">Terms of Service</a>
            <a href="#" className="hover:text-primary transition-colors">Security</a>
          </div>
        </div>
      </div>
    </footer>
  )
}
