/**
 * @fileType: component
 * @status: current
 * @updated: 2026-01-12
 * @tags: [landing-page, footer, cta, conversion]
 * @related: [landing-page.tsx, hero-section.tsx]
 * @priority: high
 * @complexity: low
 * @dependencies: [react, next/link, heroicons, ui/button, ui/corner-brackets]
 */
'use client'

import { useState } from 'react'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { CornerBrackets } from '@/components/ui/corner-brackets'
import { ArrowRightIcon, CheckIcon } from '@heroicons/react/24/outline'
import { trackConversion } from '@/lib/experiments'

export function FooterCTA() {
  const [copied, setCopied] = useState(false)

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  const handleCTAClick = (ctaType: 'primary' | 'secondary') => {
    trackConversion('hero-headline', {
      cta_type: ctaType,
      cta_location: 'footer',
    })
  }

  return (
    <section className="container mx-auto px-6 py-16 md:py-24">
      <div className="max-w-2xl mx-auto">
        <CornerBrackets corners="all" className="bg-card border border-border rounded-lg p-8 md:p-12 text-center">
          <h2 className="text-2xl md:text-3xl font-mono font-bold text-foreground mb-6">
            Ready to eliminate context rot?
          </h2>

          {/* Terminal Install Command */}
          <div className="inline-flex items-center gap-3 bg-background border border-border rounded-lg px-4 py-3 mb-8 font-mono text-sm">
            <span className="text-primary">$</span>
            <code className="text-foreground">npm install -g @ginkoai/cli</code>
            <button
              className="text-muted-foreground hover:text-primary transition-colors"
              onClick={() => copyToClipboard('npm install -g @ginkoai/cli')}
              aria-label="Copy to clipboard"
            >
              {copied ? (
                <CheckIcon className="h-4 w-4 text-primary" />
              ) : (
                <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                </svg>
              )}
            </button>
          </div>

          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link href="/auth/signup" onClick={() => handleCTAClick('primary')}>
              <Button size="lg" className="w-full sm:w-auto">
                Get Started Free
                <ArrowRightIcon className="ml-2 h-4 w-4" />
              </Button>
            </Link>
            <Link href="https://docs.ginko.ai" target="_blank" onClick={() => handleCTAClick('secondary')}>
              <Button variant="outline" size="lg" className="w-full sm:w-auto">
                Read the Docs
              </Button>
            </Link>
          </div>
        </CornerBrackets>
      </div>
    </section>
  )
}
