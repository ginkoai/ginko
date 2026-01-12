/**
 * @fileType: component
 * @status: current
 * @updated: 2026-01-12
 * @tags: [landing-page, hero, marketing, a-b-test, conversion]
 * @related: [landing-page.tsx, marketing-copy.ts, useExperiment.ts]
 * @priority: critical
 * @complexity: medium
 * @dependencies: [react, next/link, heroicons, ui/button, config/marketing-copy]
 */
'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { CornerBrackets } from '@/components/ui/corner-brackets'
import {
  ArrowRightIcon,
  CheckIcon,
  LockOpenIcon,
  ScaleIcon
} from '@heroicons/react/24/outline'
import {
  defaultVariant,
  heroVariants,
  type HeroVariant
} from '@/config/marketing-copy'
import { useExperiment } from '@/hooks/useExperiment'

export function HeroSection() {
  const [copied, setCopied] = useState(false)
  const [heroVariant, setHeroVariant] = useState<HeroVariant>(defaultVariant)

  // A/B test experiment for hero headline
  const {
    variant: experimentVariant,
    expose: exposeHeroExperiment,
    convert: convertHeroExperiment,
  } = useExperiment('hero-headline')

  useEffect(() => {
    // Set hero variant based on experiment assignment
    if (experimentVariant && heroVariants[experimentVariant]) {
      setHeroVariant(heroVariants[experimentVariant])
    }
  }, [experimentVariant])

  useEffect(() => {
    // Mark user as exposed when hero section renders
    if (experimentVariant) {
      exposeHeroExperiment()
    }
  }, [experimentVariant, exposeHeroExperiment])

  // Track CTA click conversion
  const handleCTAClick = (ctaType: 'primary' | 'secondary', ctaLocation: string) => {
    convertHeroExperiment({
      cta_type: ctaType,
      cta_location: ctaLocation,
      cta_text: ctaType === 'primary' ? heroVariant.primaryCta : heroVariant.secondaryCta,
    })
  }

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <section className="container mx-auto px-4 sm:px-6 py-12 sm:py-20 md:py-28" data-variant={heroVariant.id}>
      <div className="text-center max-w-4xl mx-auto">
        <CornerBrackets size="lg" corners="all" className="inline-block mb-8">
          <h1
            className="text-3xl md:text-5xl lg:text-6xl font-mono font-bold text-foreground leading-tight px-4 py-2"
            data-hero-title
          >
            {heroVariant.headline}
          </h1>
        </CornerBrackets>
        <p
          className="text-lg md:text-xl text-muted-foreground mb-10 leading-relaxed max-w-2xl mx-auto"
          data-hero-subtitle
        >
          {heroVariant.subtitle}
        </p>

        {/* Terminal Install Command */}
        <div className="inline-flex items-center gap-2 sm:gap-3 bg-card border border-border rounded-lg px-3 sm:px-4 py-2 sm:py-3 mb-8 font-mono text-xs sm:text-sm max-w-full overflow-x-auto">
          <span className="text-primary flex-shrink-0">$</span>
          <code className="text-foreground whitespace-nowrap">npm install -g @ginkoai/cli</code>
          <button
            className="text-muted-foreground hover:text-primary transition-colors flex-shrink-0 min-w-[24px] min-h-[24px] flex items-center justify-center"
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

        <div className="flex flex-col sm:flex-row gap-4 justify-center mb-4">
          <Link href="/auth/signup" onClick={() => handleCTAClick('primary', 'hero')}>
            <Button size="lg" className="w-full sm:w-auto" data-hero-cta-primary>
              {heroVariant.primaryCta}
              <ArrowRightIcon className="ml-2 h-4 w-4" />
            </Button>
          </Link>
          <Link href="https://docs.ginko.ai" target="_blank" onClick={() => handleCTAClick('secondary', 'hero')}>
            <Button variant="outline" size="lg" className="w-full sm:w-auto" data-hero-cta-secondary>
              {heroVariant.secondaryCta}
            </Button>
          </Link>
        </div>

        {/* Micro-copy */}
        <p className="text-sm text-muted-foreground mb-6">
          Free forever. 2-minute setup.
        </p>

        {/* Trust Signals */}
        <div className="flex flex-wrap items-center justify-center gap-4 text-xs text-muted-foreground">
          <div className="flex items-center gap-1.5">
            <svg className="h-4 w-4" viewBox="0 0 24 24" fill="currentColor">
              <path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z"/>
            </svg>
            <span>Open Source</span>
          </div>
          <div className="flex items-center gap-1.5">
            <ScaleIcon className="h-4 w-4" />
            <span>MIT License</span>
          </div>
          <div className="flex items-center gap-1.5">
            <LockOpenIcon className="h-4 w-4" />
            <span>No Vendor Lock-in</span>
          </div>
        </div>
      </div>

      {/* Logo Marquee - Tools & Technologies */}
      <div className="mt-12 sm:mt-16 relative overflow-hidden">
        <div className="absolute inset-y-0 left-0 w-12 sm:w-24 bg-gradient-to-r from-background to-transparent z-10" />
        <div className="absolute inset-y-0 right-0 w-12 sm:w-24 bg-gradient-to-l from-background to-transparent z-10" />
        <div className="flex animate-marquee whitespace-nowrap py-4">
          {/* First set */}
          <span className="mx-4 sm:mx-8 text-sm sm:text-lg font-mono font-semibold text-muted-foreground/50 tracking-widest">ANTHROPIC</span>
          <span className="mx-4 sm:mx-8 text-sm sm:text-lg font-mono font-semibold text-muted-foreground/50 tracking-widest">CURSOR</span>
          <span className="mx-4 sm:mx-8 text-sm sm:text-lg font-mono font-semibold text-muted-foreground/50 tracking-widest">GITHUB</span>
          <span className="mx-4 sm:mx-8 text-sm sm:text-lg font-mono font-semibold text-muted-foreground/50 tracking-widest">VERCEL</span>
          <span className="mx-4 sm:mx-8 text-sm sm:text-lg font-mono font-semibold text-muted-foreground/50 tracking-widest">NEO4J</span>
          <span className="mx-4 sm:mx-8 text-sm sm:text-lg font-mono font-semibold text-muted-foreground/50 tracking-widest">TYPESCRIPT</span>
          <span className="mx-4 sm:mx-8 text-sm sm:text-lg font-mono font-semibold text-muted-foreground/50 tracking-widest">NEXT.JS</span>
          <span className="mx-4 sm:mx-8 text-sm sm:text-lg font-mono font-semibold text-muted-foreground/50 tracking-widest">SUPABASE</span>
          {/* Duplicate set for seamless loop */}
          <span className="mx-4 sm:mx-8 text-sm sm:text-lg font-mono font-semibold text-muted-foreground/50 tracking-widest">ANTHROPIC</span>
          <span className="mx-4 sm:mx-8 text-sm sm:text-lg font-mono font-semibold text-muted-foreground/50 tracking-widest">CURSOR</span>
          <span className="mx-4 sm:mx-8 text-sm sm:text-lg font-mono font-semibold text-muted-foreground/50 tracking-widest">GITHUB</span>
          <span className="mx-4 sm:mx-8 text-sm sm:text-lg font-mono font-semibold text-muted-foreground/50 tracking-widest">VERCEL</span>
          <span className="mx-4 sm:mx-8 text-sm sm:text-lg font-mono font-semibold text-muted-foreground/50 tracking-widest">NEO4J</span>
          <span className="mx-4 sm:mx-8 text-sm sm:text-lg font-mono font-semibold text-muted-foreground/50 tracking-widest">TYPESCRIPT</span>
          <span className="mx-4 sm:mx-8 text-sm sm:text-lg font-mono font-semibold text-muted-foreground/50 tracking-widest">NEXT.JS</span>
          <span className="mx-4 sm:mx-8 text-sm sm:text-lg font-mono font-semibold text-muted-foreground/50 tracking-widest">SUPABASE</span>
        </div>
      </div>
    </section>
  )
}
