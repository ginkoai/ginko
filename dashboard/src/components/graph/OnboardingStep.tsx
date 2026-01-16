/**
 * @fileType: component
 * @status: current
 * @updated: 2026-01-16
 * @tags: [onboarding, tooltip, tour-step, first-time-user]
 * @related: [OnboardingOverlay.tsx, useOnboarding.ts]
 * @priority: high
 * @complexity: medium
 * @dependencies: [react, lucide-react]
 */

'use client';

import { useEffect, useState, useRef } from 'react';
import { ChevronRight, ChevronLeft, X } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { OnboardingStep as OnboardingStepType } from '@/hooks/useOnboarding';

// =============================================================================
// Types
// =============================================================================

export interface OnboardingStepProps {
  step: OnboardingStepType;
  stepIndex: number;
  totalSteps: number;
  onNext: () => void;
  onPrev: () => void;
  onSkip: () => void;
}

interface TargetRect {
  top: number;
  left: number;
  width: number;
  height: number;
}

// =============================================================================
// Component
// =============================================================================

export function OnboardingStep({
  step,
  stepIndex,
  totalSteps,
  onNext,
  onPrev,
  onSkip,
}: OnboardingStepProps) {
  const [targetRect, setTargetRect] = useState<TargetRect | null>(null);
  const tooltipRef = useRef<HTMLDivElement>(null);
  const [tooltipPosition, setTooltipPosition] = useState<{ top: number; left: number }>({ top: 0, left: 0 });

  const isFirstStep = stepIndex === 0;
  const isLastStep = stepIndex === totalSteps - 1;
  const isFullScreen = step.target === null;

  // Find and track target element position
  useEffect(() => {
    if (!step.target) {
      setTargetRect(null);
      return;
    }

    const updateTargetRect = () => {
      const targetElement = document.querySelector(step.target!);
      if (targetElement) {
        const rect = targetElement.getBoundingClientRect();
        setTargetRect({
          top: rect.top,
          left: rect.left,
          width: rect.width,
          height: rect.height,
        });
      } else {
        // Target not found, treat as full-screen
        setTargetRect(null);
      }
    };

    updateTargetRect();

    // Update on resize/scroll
    window.addEventListener('resize', updateTargetRect);
    window.addEventListener('scroll', updateTargetRect, true);

    return () => {
      window.removeEventListener('resize', updateTargetRect);
      window.removeEventListener('scroll', updateTargetRect, true);
    };
  }, [step.target]);

  // Calculate tooltip position based on target and desired position
  useEffect(() => {
    if (isFullScreen || !targetRect || !tooltipRef.current) {
      // Center tooltip for full-screen steps
      setTooltipPosition({
        top: window.innerHeight / 2,
        left: window.innerWidth / 2,
      });
      return;
    }

    const tooltipRect = tooltipRef.current.getBoundingClientRect();
    const padding = 16;
    const arrowOffset = 12;

    let top = 0;
    let left = 0;

    switch (step.position) {
      case 'top':
        top = targetRect.top - tooltipRect.height - arrowOffset;
        left = targetRect.left + targetRect.width / 2;
        break;
      case 'bottom':
        top = targetRect.top + targetRect.height + arrowOffset;
        left = targetRect.left + targetRect.width / 2;
        break;
      case 'left':
        top = targetRect.top + targetRect.height / 2;
        left = targetRect.left - tooltipRect.width - arrowOffset;
        break;
      case 'right':
      default:
        top = targetRect.top + targetRect.height / 2;
        left = targetRect.left + targetRect.width + arrowOffset;
        break;
    }

    // Ensure tooltip stays within viewport
    const maxLeft = window.innerWidth - tooltipRect.width - padding;
    const maxTop = window.innerHeight - tooltipRect.height - padding;

    left = Math.max(padding, Math.min(left, maxLeft));
    top = Math.max(padding, Math.min(top, maxTop));

    setTooltipPosition({ top, left });
  }, [targetRect, isFullScreen, step.position]);

  return (
    <>
      {/* Spotlight mask (SVG-based for cutout effect) */}
      {targetRect && !isFullScreen && (
        <svg
          className="fixed inset-0 z-[9998] pointer-events-none"
          width="100%"
          height="100%"
        >
          <defs>
            <mask id="spotlight-mask">
              {/* White = visible, Black = hidden */}
              <rect x="0" y="0" width="100%" height="100%" fill="white" />
              <rect
                x={targetRect.left - 8}
                y={targetRect.top - 8}
                width={targetRect.width + 16}
                height={targetRect.height + 16}
                rx="8"
                fill="black"
              />
            </mask>
          </defs>
          <rect
            x="0"
            y="0"
            width="100%"
            height="100%"
            fill="rgba(0, 0, 0, 0.75)"
            mask="url(#spotlight-mask)"
          />
        </svg>
      )}

      {/* Full-screen backdrop for welcome/done steps */}
      {isFullScreen && (
        <div className="fixed inset-0 z-[9998] bg-black/75 pointer-events-none" />
      )}

      {/* Spotlight highlight ring */}
      {targetRect && !isFullScreen && (
        <div
          className="fixed z-[9999] pointer-events-none rounded-lg ring-2 ring-ginko-400 ring-offset-2 ring-offset-transparent"
          style={{
            top: targetRect.top - 8,
            left: targetRect.left - 8,
            width: targetRect.width + 16,
            height: targetRect.height + 16,
          }}
        />
      )}

      {/* Tooltip */}
      <div
        ref={tooltipRef}
        className={cn(
          'fixed z-[10000] bg-card border border-border rounded-xl shadow-2xl p-5 w-80',
          isFullScreen && '-translate-x-1/2 -translate-y-1/2'
        )}
        style={{
          top: tooltipPosition.top,
          left: tooltipPosition.left,
          transform: isFullScreen ? 'translate(-50%, -50%)' : undefined,
        }}
      >
        {/* Skip button */}
        <button
          onClick={onSkip}
          className="absolute top-3 right-3 p-1 hover:bg-white/10 rounded-md transition-colors"
          aria-label="Skip onboarding"
        >
          <X className="w-4 h-4 text-muted-foreground" />
        </button>

        {/* Content */}
        <div className="mb-5">
          <h3 className="text-lg font-semibold text-foreground mb-2">
            {step.title}
          </h3>
          <p className="text-sm text-muted-foreground leading-relaxed">
            {step.description}
          </p>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between">
          {/* Progress dots */}
          <div className="flex items-center gap-1.5">
            {Array.from({ length: totalSteps }).map((_, i) => (
              <div
                key={i}
                className={cn(
                  'w-2 h-2 rounded-full transition-colors',
                  i === stepIndex ? 'bg-ginko-400' : 'bg-border'
                )}
              />
            ))}
          </div>

          {/* Navigation buttons */}
          <div className="flex items-center gap-2">
            {!isFirstStep && (
              <button
                onClick={onPrev}
                className="flex items-center gap-1 px-3 py-1.5 text-sm font-medium text-muted-foreground hover:text-foreground transition-colors"
              >
                <ChevronLeft className="w-4 h-4" />
                Back
              </button>
            )}
            {isFirstStep && (
              <button
                onClick={onSkip}
                className="px-3 py-1.5 text-sm font-medium text-muted-foreground hover:text-foreground transition-colors"
              >
                Skip
              </button>
            )}
            <button
              onClick={onNext}
              className={cn(
                'flex items-center gap-1 px-4 py-1.5 rounded-full text-sm font-medium transition-colors',
                'bg-ginko-500 text-black hover:bg-ginko-400'
              )}
            >
              {isLastStep ? 'Get Started' : 'Next'}
              {!isLastStep && <ChevronRight className="w-4 h-4" />}
            </button>
          </div>
        </div>

        {/* Arrow pointer (for targeted steps) */}
        {targetRect && !isFullScreen && step.position && (
          <div
            className={cn(
              'absolute w-3 h-3 bg-card border transform rotate-45',
              step.position === 'top' && 'bottom-[-7px] left-1/2 -translate-x-1/2 border-b border-r border-t-0 border-l-0',
              step.position === 'bottom' && 'top-[-7px] left-1/2 -translate-x-1/2 border-t border-l border-b-0 border-r-0',
              step.position === 'left' && 'right-[-7px] top-1/2 -translate-y-1/2 border-r border-t border-l-0 border-b-0',
              step.position === 'right' && 'left-[-7px] top-1/2 -translate-y-1/2 border-l border-b border-r-0 border-t-0'
            )}
          />
        )}
      </div>
    </>
  );
}

export default OnboardingStep;
