/**
 * @fileType: component
 * @status: current
 * @updated: 2026-01-16
 * @tags: [onboarding, tour, overlay, first-time-user, guided-tour]
 * @related: [OnboardingStep.tsx, useOnboarding.ts, page.tsx]
 * @priority: high
 * @complexity: medium
 * @dependencies: [react, useOnboarding]
 */

'use client';

import { useEffect, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { OnboardingStep } from './OnboardingStep';
import { useOnboarding } from '@/hooks/useOnboarding';

// =============================================================================
// Types
// =============================================================================

export interface OnboardingOverlayProps {
  /** Whether to force show onboarding (for "Take a Tour" feature) */
  forceShow?: boolean;
  /** Callback when onboarding is completed or skipped */
  onComplete?: () => void;
}

// =============================================================================
// Component
// =============================================================================

export function OnboardingOverlay({ forceShow, onComplete }: OnboardingOverlayProps) {
  const {
    isOnboarding,
    currentStep,
    currentStepIndex,
    totalSteps,
    nextStep,
    prevStep,
    skipOnboarding,
    restartOnboarding,
  } = useOnboarding();

  // Handle force show (for "Take a Tour")
  useEffect(() => {
    if (forceShow) {
      restartOnboarding();
    }
  }, [forceShow, restartOnboarding]);

  // Handle completion callback
  const handleSkip = useCallback(() => {
    skipOnboarding();
    onComplete?.();
  }, [skipOnboarding, onComplete]);

  const handleNext = useCallback(() => {
    if (currentStepIndex === totalSteps - 1) {
      // Last step - completing
      nextStep();
      onComplete?.();
    } else {
      nextStep();
    }
  }, [nextStep, currentStepIndex, totalSteps, onComplete]);

  // Handle keyboard navigation
  useEffect(() => {
    if (!isOnboarding) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      switch (e.key) {
        case 'Escape':
          handleSkip();
          break;
        case 'ArrowRight':
        case 'Enter':
          handleNext();
          break;
        case 'ArrowLeft':
          prevStep();
          break;
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [isOnboarding, handleNext, prevStep, handleSkip]);

  // Prevent body scroll when onboarding is active
  useEffect(() => {
    if (isOnboarding) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }

    return () => {
      document.body.style.overflow = '';
    };
  }, [isOnboarding]);

  // Don't render if not onboarding
  if (!isOnboarding || !currentStep) {
    return null;
  }

  // Use portal to render at document root for proper z-index stacking
  return createPortal(
    <div
      className="onboarding-overlay"
      role="dialog"
      aria-modal="true"
      aria-label="Onboarding tour"
    >
      <OnboardingStep
        step={currentStep}
        stepIndex={currentStepIndex}
        totalSteps={totalSteps}
        onNext={handleNext}
        onPrev={prevStep}
        onSkip={handleSkip}
      />
    </div>,
    document.body
  );
}

// =============================================================================
// Context Provider for Tour Restart
// =============================================================================

import { createContext, useContext, useState, ReactNode } from 'react';

interface OnboardingContextValue {
  /** Start the onboarding tour */
  startTour: () => void;
  /** Whether onboarding has been completed */
  hasCompletedOnboarding: boolean;
}

const OnboardingContext = createContext<OnboardingContextValue | null>(null);

export function OnboardingProvider({ children }: { children: ReactNode }) {
  const [forceShowTour, setForceShowTour] = useState(false);
  const { hasCompletedOnboarding } = useOnboarding();

  const startTour = useCallback(() => {
    setForceShowTour(true);
  }, []);

  const handleComplete = useCallback(() => {
    setForceShowTour(false);
  }, []);

  return (
    <OnboardingContext.Provider value={{ startTour, hasCompletedOnboarding }}>
      {children}
      <OnboardingOverlay forceShow={forceShowTour} onComplete={handleComplete} />
    </OnboardingContext.Provider>
  );
}

export function useOnboardingContext() {
  const context = useContext(OnboardingContext);
  if (!context) {
    throw new Error('useOnboardingContext must be used within OnboardingProvider');
  }
  return context;
}

// =============================================================================
// Export
// =============================================================================

export default OnboardingOverlay;
