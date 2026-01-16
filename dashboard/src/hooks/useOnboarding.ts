/**
 * @fileType: hook
 * @status: current
 * @updated: 2026-01-16
 * @tags: [onboarding, tour, first-time-user, localStorage]
 * @related: [OnboardingOverlay.tsx, OnboardingStep.tsx]
 * @priority: high
 * @complexity: low
 * @dependencies: [react]
 */

'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';

// =============================================================================
// Types
// =============================================================================

export interface OnboardingStep {
  id: string;
  title: string;
  description: string;
  target: string | null; // CSS selector for target element, null for full-screen
  position?: 'top' | 'bottom' | 'left' | 'right';
}

export interface UseOnboardingResult {
  /** Whether onboarding is currently active */
  isOnboarding: boolean;
  /** Current step index (0-based) */
  currentStepIndex: number;
  /** Current step data */
  currentStep: OnboardingStep | null;
  /** All onboarding steps */
  steps: OnboardingStep[];
  /** Total number of steps */
  totalSteps: number;
  /** Go to the next step */
  nextStep: () => void;
  /** Go to the previous step */
  prevStep: () => void;
  /** Skip/end onboarding */
  skipOnboarding: () => void;
  /** Restart onboarding from the beginning */
  restartOnboarding: () => void;
  /** Whether onboarding has been completed before */
  hasCompletedOnboarding: boolean;
}

// =============================================================================
// Constants
// =============================================================================

const STORAGE_KEY = 'ginko:onboarding-completed';

export const ONBOARDING_STEPS: OnboardingStep[] = [
  {
    id: 'welcome',
    title: 'Welcome to Graph Explorer',
    description: "Navigate your project's epics, sprints, and knowledge base.",
    target: null, // Full-screen overlay
  },
  {
    id: 'nav-tree',
    title: 'Navigation Tree',
    description: 'Click any item to view its details. Use arrows to expand/collapse.',
    target: '[data-onboarding="nav-tree"]',
    position: 'right',
  },
  {
    id: 'search',
    title: 'Quick Search',
    description: 'Press / to search. Use type:ADR to filter by type.',
    target: '[data-onboarding="search"]',
    position: 'bottom',
  },
  {
    id: 'edit',
    title: 'Edit Content',
    description: 'Click Edit to modify ADRs, Patterns, and more.',
    target: '[data-onboarding="edit-button"]',
    position: 'left',
  },
  {
    id: 'done',
    title: "You're Ready!",
    description: 'Press ? anytime to see keyboard shortcuts.',
    target: null,
  },
];

// =============================================================================
// Hook
// =============================================================================

export function useOnboarding(): UseOnboardingResult {
  const [isOnboarding, setIsOnboarding] = useState(false);
  const [currentStepIndex, setCurrentStepIndex] = useState(0);
  const [hasCompletedOnboarding, setHasCompletedOnboarding] = useState(true); // Default true to prevent flash

  // Check localStorage on mount
  useEffect(() => {
    const completed = localStorage.getItem(STORAGE_KEY);
    const hasCompleted = completed === 'true';
    setHasCompletedOnboarding(hasCompleted);

    // Auto-start onboarding for first-time users
    if (!hasCompleted) {
      setIsOnboarding(true);
      setCurrentStepIndex(0);
    }
  }, []);

  const currentStep = useMemo(() => {
    if (!isOnboarding || currentStepIndex < 0 || currentStepIndex >= ONBOARDING_STEPS.length) {
      return null;
    }
    return ONBOARDING_STEPS[currentStepIndex];
  }, [isOnboarding, currentStepIndex]);

  const completeOnboarding = useCallback(() => {
    setIsOnboarding(false);
    setHasCompletedOnboarding(true);
    localStorage.setItem(STORAGE_KEY, 'true');
  }, []);

  const nextStep = useCallback(() => {
    if (currentStepIndex < ONBOARDING_STEPS.length - 1) {
      setCurrentStepIndex((prev) => prev + 1);
    } else {
      // Last step, complete onboarding
      completeOnboarding();
    }
  }, [currentStepIndex, completeOnboarding]);

  const prevStep = useCallback(() => {
    if (currentStepIndex > 0) {
      setCurrentStepIndex((prev) => prev - 1);
    }
  }, [currentStepIndex]);

  const skipOnboarding = useCallback(() => {
    completeOnboarding();
  }, [completeOnboarding]);

  const restartOnboarding = useCallback(() => {
    setCurrentStepIndex(0);
    setIsOnboarding(true);
  }, []);

  return {
    isOnboarding,
    currentStepIndex,
    currentStep,
    steps: ONBOARDING_STEPS,
    totalSteps: ONBOARDING_STEPS.length,
    nextStep,
    prevStep,
    skipOnboarding,
    restartOnboarding,
    hasCompletedOnboarding,
  };
}

export default useOnboarding;
