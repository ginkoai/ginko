/**
 * @fileType: config
 * @status: current
 * @updated: 2026-01-11
 * @tags: [marketing, copy, a-b-test, hero, cta, conversion]
 * @related: [landing-page.tsx, hero-ab-test.js]
 * @priority: high
 * @complexity: low
 * @dependencies: []
 */

/**
 * Marketing copy variants for A/B testing
 *
 * Usage:
 * - Import variants in landing page
 * - Use variant selector (localStorage, PostHog, or URL param) to pick variant
 * - Track conversions per variant in analytics
 *
 * Naming convention follows website's hero-ab-test.js for consistency
 */

export interface HeroVariant {
  id: string
  name: string
  headline: string
  subtitle: string
  primaryCta: string
  secondaryCta: string
}

/**
 * Hero variants for A/B testing
 * Based on VOICE-GUIDE.md tone standards and pain-point messaging
 */
export const heroVariants: Record<string, HeroVariant> = {
  A: {
    id: 'A',
    name: 'Problem-first',
    headline: 'Stop re-explaining your codebase to AI.',
    subtitle: 'ginko keeps context in the collaboration graph. Resume in 30 seconds with your project, decisions, and patterns intact.',
    primaryCta: 'Install CLI',
    secondaryCta: 'View Docs',
  },
  B: {
    id: 'B',
    name: 'Outcome-first',
    headline: 'Resume any AI session in 30 seconds.',
    subtitle: 'Your context, decisions, and patterns are stored in git. Pick up exactly where you left off.',
    primaryCta: 'Get Started Free',
    secondaryCta: 'View Docs',
  },
  C: {
    id: 'C',
    name: 'Contrast',
    headline: 'AI forgets. Ginko doesn\'t.',
    subtitle: 'Graph-based context management that persists across sessions, tools, and team members.',
    primaryCta: 'Try Ginko Now',
    secondaryCta: 'See How It Works',
  },
  D: {
    id: 'D',
    name: 'Quantified-pain',
    headline: 'You\'ve spent 10 minutes re-explaining. Again.',
    subtitle: 'ginko eliminates context rot. Your AI assistant starts every session with full project context.',
    primaryCta: 'Install CLI',
    secondaryCta: 'View Docs',
  },
  E: {
    id: 'E',
    name: 'Identity',
    headline: 'Stop being your AI\'s context janitor.',
    subtitle: 'Session logs, sprint progress, patterns, and gotchas—versioned with git, loaded automatically.',
    primaryCta: 'Get Started Free',
    secondaryCta: 'Read the Docs',
  },
}

/**
 * Default variant (control)
 */
export const defaultVariant = heroVariants.A

/**
 * CTA button text variants for micro-testing
 */
export const ctaVariants = {
  technical: {
    primary: 'Install CLI',
    secondary: 'View Docs',
  },
  benefit: {
    primary: 'Get Started Free',
    secondary: 'See Demo',
  },
  action: {
    primary: 'Try Ginko Now',
    secondary: 'Learn More',
  },
}

/**
 * Micro-copy options for under CTA
 * Reinforces low friction and trust
 */
export const microCopy = {
  default: 'Free forever. 2-minute setup.',
  technical: 'npm install -g @ginkoai/cli',
  social: 'Join 500+ developers shipping with AI.',
  trust: 'Open source. MIT License.',
}

/**
 * Trust signals to display near CTA
 */
export const trustSignals = {
  openSource: {
    label: 'Open Source',
    icon: 'github',
  },
  license: {
    label: 'MIT License',
    icon: 'scale',
  },
  gitNative: {
    label: '100% Git-Native',
    icon: 'git-branch',
  },
  noLockIn: {
    label: 'No Vendor Lock-in',
    icon: 'unlock',
  },
}

/**
 * Get variant from localStorage or URL param
 * Matches website's hero-ab-test.js behavior
 */
export function getHeroVariant(): HeroVariant {
  if (typeof window === 'undefined') {
    return defaultVariant
  }

  // Check URL param first (for testing)
  const urlParams = new URLSearchParams(window.location.search)
  const urlVariant = urlParams.get('hero_variant')
  if (urlVariant && heroVariants[urlVariant]) {
    return heroVariants[urlVariant]
  }

  // Check localStorage
  const storedVariant = localStorage.getItem('ginko_hero_variant')
  if (storedVariant && heroVariants[storedVariant]) {
    return heroVariants[storedVariant]
  }

  // Assign random variant and store
  const variantKeys = Object.keys(heroVariants)
  const randomKey = variantKeys[Math.floor(Math.random() * variantKeys.length)]
  localStorage.setItem('ginko_hero_variant', randomKey)

  return heroVariants[randomKey]
}

/**
 * Force a specific variant (for testing)
 */
export function forceHeroVariant(variantId: string): HeroVariant | null {
  if (typeof window === 'undefined') {
    return null
  }

  if (heroVariants[variantId]) {
    localStorage.setItem('ginko_hero_variant', variantId)
    return heroVariants[variantId]
  }

  return null
}

/**
 * Clear variant assignment (reset for new test)
 */
export function clearHeroVariant(): void {
  if (typeof window !== 'undefined') {
    localStorage.removeItem('ginko_hero_variant')
  }
}
