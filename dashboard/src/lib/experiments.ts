/**
 * @fileType: utility
 * @status: current
 * @updated: 2026-01-11
 * @tags: [a-b-test, experiments, analytics, conversion, feature-flags]
 * @related: [marketing-copy.ts, useExperiment.ts, landing-page.tsx]
 * @priority: high
 * @complexity: medium
 * @dependencies: []
 */

/**
 * A/B Testing Framework
 *
 * Lightweight experiment system that:
 * - Assigns users to variants consistently (localStorage)
 * - Tracks exposure and conversion events
 * - Supports multiple simultaneous experiments
 * - Is PostHog-ready (easy to swap tracking backend)
 *
 * Usage:
 * ```typescript
 * const { variant, trackConversion } = useExperiment('hero-headline')
 * ```
 */

export interface ExperimentVariant {
  id: string
  name: string
  weight: number // 0-100, relative weight for assignment
}

export interface Experiment {
  id: string
  name: string
  description: string
  variants: ExperimentVariant[]
  conversionGoal: string
  status: 'draft' | 'running' | 'paused' | 'completed'
}

export interface ExperimentAssignment {
  experimentId: string
  variantId: string
  assignedAt: string
  exposed: boolean
}

/**
 * Active experiments configuration
 */
export const experiments: Record<string, Experiment> = {
  'hero-headline': {
    id: 'hero-headline',
    name: 'Hero Headline Test',
    description: 'Test different pain-point headlines for conversion',
    variants: [
      { id: 'A', name: 'Problem-first', weight: 20 },
      { id: 'B', name: 'Outcome-first', weight: 20 },
      { id: 'C', name: 'Contrast', weight: 20 },
      { id: 'D', name: 'Quantified-pain', weight: 20 },
      { id: 'E', name: 'Identity', weight: 20 },
    ],
    conversionGoal: 'cta_click',
    status: 'running',
  },
  'cta-text': {
    id: 'cta-text',
    name: 'CTA Button Text Test',
    description: 'Test different CTA button text for clicks',
    variants: [
      { id: 'technical', name: 'Install CLI', weight: 34 },
      { id: 'benefit', name: 'Get Started Free', weight: 33 },
      { id: 'action', name: 'Try Ginko Now', weight: 33 },
    ],
    conversionGoal: 'cta_click',
    status: 'running',
  },
  'social-proof-position': {
    id: 'social-proof-position',
    name: 'Social Proof Position Test',
    description: 'Test trust signals above vs below CTA',
    variants: [
      { id: 'below', name: 'Below CTA', weight: 50 },
      { id: 'above', name: 'Above CTA', weight: 50 },
    ],
    conversionGoal: 'cta_click',
    status: 'draft',
  },
}

const STORAGE_KEY = 'ginko_experiments'
const EVENTS_KEY = 'ginko_experiment_events'

/**
 * Get all experiment assignments from localStorage
 */
export function getAssignments(): Record<string, ExperimentAssignment> {
  if (typeof window === 'undefined') return {}

  try {
    const stored = localStorage.getItem(STORAGE_KEY)
    return stored ? JSON.parse(stored) : {}
  } catch {
    return {}
  }
}

/**
 * Save experiment assignments to localStorage
 */
function saveAssignments(assignments: Record<string, ExperimentAssignment>): void {
  if (typeof window === 'undefined') return

  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(assignments))
  } catch (e) {
    console.warn('Failed to save experiment assignments:', e)
  }
}

/**
 * Weighted random selection of variant
 */
function selectVariant(variants: ExperimentVariant[]): string {
  const totalWeight = variants.reduce((sum, v) => sum + v.weight, 0)
  let random = Math.random() * totalWeight

  for (const variant of variants) {
    random -= variant.weight
    if (random <= 0) {
      return variant.id
    }
  }

  return variants[0].id
}

/**
 * Get or assign variant for an experiment
 */
export function getVariant(experimentId: string): string | null {
  const experiment = experiments[experimentId]
  if (!experiment || experiment.status !== 'running') {
    return null
  }

  // Check URL override first (for testing)
  if (typeof window !== 'undefined') {
    const urlParams = new URLSearchParams(window.location.search)
    const override = urlParams.get(`exp_${experimentId}`)
    if (override && experiment.variants.some(v => v.id === override)) {
      return override
    }
  }

  const assignments = getAssignments()

  // Return existing assignment
  if (assignments[experimentId]) {
    return assignments[experimentId].variantId
  }

  // Assign new variant
  const variantId = selectVariant(experiment.variants)
  assignments[experimentId] = {
    experimentId,
    variantId,
    assignedAt: new Date().toISOString(),
    exposed: false,
  }
  saveAssignments(assignments)

  // Track assignment event
  trackEvent('experiment_assigned', {
    experiment_id: experimentId,
    experiment_name: experiment.name,
    variant_id: variantId,
    variant_name: experiment.variants.find(v => v.id === variantId)?.name,
  })

  return variantId
}

/**
 * Mark user as exposed to experiment (saw the variant)
 */
export function markExposed(experimentId: string): void {
  const assignments = getAssignments()

  if (assignments[experimentId] && !assignments[experimentId].exposed) {
    assignments[experimentId].exposed = true
    saveAssignments(assignments)

    const experiment = experiments[experimentId]
    trackEvent('experiment_exposed', {
      experiment_id: experimentId,
      experiment_name: experiment?.name,
      variant_id: assignments[experimentId].variantId,
    })
  }
}

/**
 * Track conversion for an experiment
 */
export function trackConversion(experimentId: string, metadata?: Record<string, unknown>): void {
  const assignments = getAssignments()
  const assignment = assignments[experimentId]

  if (!assignment) {
    console.warn(`No assignment found for experiment: ${experimentId}`)
    return
  }

  const experiment = experiments[experimentId]

  trackEvent('experiment_conversion', {
    experiment_id: experimentId,
    experiment_name: experiment?.name,
    variant_id: assignment.variantId,
    variant_name: experiment?.variants.find(v => v.id === assignment.variantId)?.name,
    conversion_goal: experiment?.conversionGoal,
    ...metadata,
  })
}

/**
 * Track experiment event (internal)
 * This is where PostHog integration would go
 */
function trackEvent(eventName: string, properties: Record<string, unknown>): void {
  const event = {
    event: eventName,
    properties,
    timestamp: new Date().toISOString(),
  }

  // Log to console in development
  if (process.env.NODE_ENV === 'development') {
    console.log('[Experiment Event]', event)
  }

  // Store events locally for debugging/export
  storeEvent(event)

  // TODO: Send to PostHog when integrated
  // posthog.capture(eventName, properties)

  // Send to GA4 if available
  if (typeof window !== 'undefined' && (window as unknown as { gtag?: (...args: unknown[]) => void }).gtag) {
    (window as unknown as { gtag: (...args: unknown[]) => void }).gtag('event', eventName, properties)
  }
}

/**
 * Store event locally (for debugging/export)
 */
function storeEvent(event: { event: string; properties: Record<string, unknown>; timestamp: string }): void {
  if (typeof window === 'undefined') return

  try {
    const stored = localStorage.getItem(EVENTS_KEY)
    const events = stored ? JSON.parse(stored) : []
    events.push(event)

    // Keep last 100 events
    if (events.length > 100) {
      events.shift()
    }

    localStorage.setItem(EVENTS_KEY, JSON.stringify(events))
  } catch (e) {
    console.warn('Failed to store experiment event:', e)
  }
}

/**
 * Get stored experiment events (for debugging)
 */
export function getStoredEvents(): Array<{ event: string; properties: Record<string, unknown>; timestamp: string }> {
  if (typeof window === 'undefined') return []

  try {
    const stored = localStorage.getItem(EVENTS_KEY)
    return stored ? JSON.parse(stored) : []
  } catch {
    return []
  }
}

/**
 * Clear all experiment data (for testing)
 */
export function clearExperimentData(): void {
  if (typeof window === 'undefined') return

  localStorage.removeItem(STORAGE_KEY)
  localStorage.removeItem(EVENTS_KEY)
}

/**
 * Get experiment statistics (for debugging)
 */
export function getExperimentStats(): Record<string, { variant: string; exposed: boolean; assignedAt: string }> {
  const assignments = getAssignments()
  const stats: Record<string, { variant: string; exposed: boolean; assignedAt: string }> = {}

  for (const [expId, assignment] of Object.entries(assignments)) {
    stats[expId] = {
      variant: assignment.variantId,
      exposed: assignment.exposed,
      assignedAt: assignment.assignedAt,
    }
  }

  return stats
}

// Expose debugging tools on window in development
if (typeof window !== 'undefined' && process.env.NODE_ENV === 'development') {
  (window as unknown as { ginkoExperiments: unknown }).ginkoExperiments = {
    experiments,
    getAssignments,
    getVariant,
    trackConversion,
    getStoredEvents,
    clearExperimentData,
    getExperimentStats,
  }
}
