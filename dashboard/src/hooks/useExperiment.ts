/**
 * @fileType: hook
 * @status: current
 * @updated: 2026-01-11
 * @tags: [a-b-test, experiments, react-hook, conversion-tracking]
 * @related: [experiments.ts, marketing-copy.ts, landing-page.tsx]
 * @priority: high
 * @complexity: low
 * @dependencies: [react, lib/experiments]
 */

'use client'

import { useState, useEffect, useCallback } from 'react'
import {
  experiments,
  getVariant,
  markExposed,
  trackConversion,
  type Experiment,
} from '@/lib/experiments'

interface UseExperimentResult {
  /** The assigned variant ID, or null if experiment not running */
  variant: string | null
  /** The full experiment config */
  experiment: Experiment | null
  /** Whether the experiment is actively running */
  isRunning: boolean
  /** Whether the user has been marked as exposed */
  isExposed: boolean
  /** Mark the user as exposed (call when variant is rendered) */
  expose: () => void
  /** Track a conversion event */
  convert: (metadata?: Record<string, unknown>) => void
}

/**
 * React hook for A/B testing experiments
 *
 * @example
 * ```tsx
 * function HeroSection() {
 *   const { variant, expose, convert } = useExperiment('hero-headline')
 *
 *   useEffect(() => {
 *     expose() // Mark as exposed when component mounts
 *   }, [expose])
 *
 *   const handleCTAClick = () => {
 *     convert({ cta_location: 'hero' })
 *   }
 *
 *   return <h1>{getHeadlineForVariant(variant)}</h1>
 * }
 * ```
 */
export function useExperiment(experimentId: string): UseExperimentResult {
  const [variant, setVariant] = useState<string | null>(null)
  const [isExposed, setIsExposed] = useState(false)

  const experiment = experiments[experimentId] || null
  const isRunning = experiment?.status === 'running'

  useEffect(() => {
    // Get or assign variant on client side
    const assignedVariant = getVariant(experimentId)
    setVariant(assignedVariant)
  }, [experimentId])

  const expose = useCallback(() => {
    if (!isExposed && variant) {
      markExposed(experimentId)
      setIsExposed(true)
    }
  }, [experimentId, variant, isExposed])

  const convert = useCallback(
    (metadata?: Record<string, unknown>) => {
      trackConversion(experimentId, metadata)
    },
    [experimentId]
  )

  return {
    variant,
    experiment,
    isRunning,
    isExposed,
    expose,
    convert,
  }
}

/**
 * Hook for using multiple experiments at once
 *
 * @example
 * ```tsx
 * const experiments = useExperiments(['hero-headline', 'cta-text'])
 * const headlineVariant = experiments['hero-headline'].variant
 * const ctaVariant = experiments['cta-text'].variant
 * ```
 */
export function useExperiments(
  experimentIds: string[]
): Record<string, UseExperimentResult> {
  const results: Record<string, UseExperimentResult> = {}

  for (const id of experimentIds) {
    // eslint-disable-next-line react-hooks/rules-of-hooks
    results[id] = useExperiment(id)
  }

  return results
}

/**
 * Simple hook to just get a variant (no tracking)
 * Useful for SSR-safe variant access
 */
export function useVariant(experimentId: string): string | null {
  const [variant, setVariant] = useState<string | null>(null)

  useEffect(() => {
    setVariant(getVariant(experimentId))
  }, [experimentId])

  return variant
}
