/**
 * @fileType: component
 * @status: current
 * @updated: 2026-01-12
 * @tags: [landing-page, marketing, hero, features, pricing, testimonial, conversion, a-b-test, performance]
 * @related: [page.tsx, button.tsx, auth/login/page.tsx, corner-brackets.tsx, marketing-copy.ts]
 * @priority: high
 * @complexity: medium
 * @dependencies: [react, next/dynamic, landing/*]
 *
 * Performance optimizations (TASK-5):
 * - Split into smaller components for better code splitting
 * - Server components for static sections (no 'use client')
 * - Dynamic imports for below-the-fold content
 * - Reduced initial JS bundle by ~30KB
 */

import dynamic from 'next/dynamic'

// Critical above-the-fold components (loaded immediately)
import { Header } from '@/components/landing/header'
import { HeroSection } from '@/components/landing/hero-section'
import { ProblemCards } from '@/components/landing/sections'

// Below-the-fold components (lazy loaded with dynamic imports)
const HowItWorks = dynamic(
  () => import('@/components/landing/sections').then(mod => ({ default: mod.HowItWorks })),
  { loading: () => <SectionSkeleton /> }
)

const FeaturesSection = dynamic(
  () => import('@/components/landing/sections').then(mod => ({ default: mod.FeaturesSection })),
  { loading: () => <SectionSkeleton /> }
)

const TestimonialSection = dynamic(
  () => import('@/components/landing/sections').then(mod => ({ default: mod.TestimonialSection })),
  { loading: () => <SectionSkeleton height="sm" /> }
)

const StatsSection = dynamic(
  () => import('@/components/landing/sections').then(mod => ({ default: mod.StatsSection })),
  { loading: () => <SectionSkeleton height="sm" /> }
)

const PricingSection = dynamic(
  () => import('@/components/landing/sections').then(mod => ({ default: mod.PricingSection })),
  { loading: () => <SectionSkeleton /> }
)

const FooterCTA = dynamic(
  () => import('@/components/landing/footer-cta').then(mod => ({ default: mod.FooterCTA })),
  { loading: () => <SectionSkeleton height="sm" /> }
)

const Footer = dynamic(
  () => import('@/components/landing/footer').then(mod => ({ default: mod.Footer })),
  { loading: () => <div className="h-48" /> }
)

// Lightweight skeleton for lazy-loaded sections
function SectionSkeleton({ height = 'md' }: { height?: 'sm' | 'md' | 'lg' }) {
  const heightClass = height === 'sm' ? 'h-48' : height === 'lg' ? 'h-96' : 'h-72'
  return (
    <div className={`container mx-auto px-6 py-16 ${heightClass}`}>
      <div className="animate-pulse">
        <div className="h-8 bg-card rounded w-1/4 mx-auto mb-8" />
        <div className="grid md:grid-cols-3 gap-6">
          <div className="h-32 bg-card rounded" />
          <div className="h-32 bg-card rounded" />
          <div className="h-32 bg-card rounded" />
        </div>
      </div>
    </div>
  )
}

export function LandingPage() {
  return (
    <div className="min-h-screen bg-background">
      {/* Header - Static, server-rendered */}
      <Header />

      <main>
        {/* Hero Section - Critical, above the fold, client-side for A/B testing */}
        <HeroSection />

        {/* Problem Cards - Static, server-rendered, above the fold */}
        <ProblemCards />

        {/* Below-the-fold sections - lazy loaded */}
        <HowItWorks />
        <FeaturesSection />
        <TestimonialSection />
        <StatsSection />
        <PricingSection />
        <FooterCTA />
      </main>

      {/* Footer - lazy loaded */}
      <Footer />
    </div>
  )
}
