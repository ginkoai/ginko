/**
 * @fileType: barrel
 * @status: current
 * @updated: 2026-01-12
 * @tags: [landing-page, exports, barrel]
 * @related: [landing-page.tsx]
 * @priority: medium
 * @complexity: low
 * @dependencies: []
 */

// Client components (interactive)
export { HeroSection } from './hero-section'
export { FooterCTA } from './footer-cta'
export { MobileNav } from './mobile-nav'

// Server components (static)
export { Header } from './header'
export { Footer } from './footer'
export {
  ProblemCards,
  HowItWorks,
  FeaturesSection,
  TestimonialSection,
  StatsSection,
  PricingSection,
} from './sections'
