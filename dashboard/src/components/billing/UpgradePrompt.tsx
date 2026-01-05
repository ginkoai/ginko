/**
 * @fileType: component
 * @status: current
 * @updated: 2026-01-05
 * @tags: [billing, upgrade, prompt, subscription, limits, epic-008]
 * @related: [SeatUsageCard.tsx, BillingStatusCard.tsx, ManageSeats.tsx]
 * @priority: high
 * @complexity: medium
 * @dependencies: [react, heroicons, clsx]
 *
 * Upgrade prompt component for displaying subscription limit warnings
 * Shows when users hit limits (seats, trial ending, etc.)
 * Supports 'warning' (dismissible) and 'blocking' (must upgrade) variants
 */

'use client';

import { forwardRef } from 'react';
import {
  ExclamationTriangleIcon,
  XMarkIcon,
  ArrowUpCircleIcon,
  LockClosedIcon,
} from '@heroicons/react/24/outline';
import { clsx } from 'clsx';
import { Card, CardHeader, CardTitle, CardContent, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';

export interface UpgradePromptProps {
  /** Why upgrade is needed (e.g., "You've reached your seat limit") */
  reason: string;
  /** Current usage value */
  currentValue: number;
  /** The limit being hit */
  limitValue: number;
  /** What resource is limited (e.g., "team members", "projects") */
  resourceName: string;
  /** Prompt variant: 'warning' for soft prompt, 'blocking' for must-upgrade */
  variant: 'warning' | 'blocking';
  /** Callback when upgrade button is clicked */
  onUpgrade: () => void;
  /** Optional dismiss handler (only for warning variant) */
  onDismiss?: () => void;
}

export const UpgradePrompt = forwardRef<HTMLDivElement, UpgradePromptProps>(
  (
    {
      reason,
      currentValue,
      limitValue,
      resourceName,
      variant,
      onUpgrade,
      onDismiss,
    },
    ref
  ) => {
    const isBlocking = variant === 'blocking';
    const usagePercent = limitValue > 0 ? Math.round((currentValue / limitValue) * 100) : 100;
    const isAtLimit = currentValue >= limitValue;
    const isOverLimit = currentValue > limitValue;

    // Variant-specific styles
    const variantStyles = {
      warning: {
        border: 'border-amber-500/30',
        background: 'bg-amber-500/5',
        icon: 'text-amber-500',
        badge: 'warning' as const,
        badgeText: 'Limit Reached',
      },
      blocking: {
        border: 'border-red-500/30',
        background: 'bg-red-500/5',
        icon: 'text-red-500',
        badge: 'destructive' as const,
        badgeText: 'Upgrade Required',
      },
    };

    const styles = variantStyles[variant];

    return (
      <Card
        ref={ref}
        className={clsx(
          'relative overflow-hidden',
          styles.border,
          styles.background
        )}
      >
        {/* Dismiss button for warning variant */}
        {!isBlocking && onDismiss && (
          <button
            onClick={onDismiss}
            className="absolute top-4 right-4 p-1 rounded-full text-muted-foreground hover:text-foreground hover:bg-secondary transition-colors"
            aria-label="Dismiss"
          >
            <XMarkIcon className="h-5 w-5" />
          </button>
        )}

        <CardHeader className="pb-2">
          <div className="flex items-start gap-3">
            {isBlocking ? (
              <LockClosedIcon className={clsx('h-6 w-6 flex-shrink-0', styles.icon)} />
            ) : (
              <ExclamationTriangleIcon className={clsx('h-6 w-6 flex-shrink-0', styles.icon)} />
            )}
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <CardTitle className="text-foreground">{reason}</CardTitle>
                <Badge variant={styles.badge}>{styles.badgeText}</Badge>
              </div>
            </div>
          </div>
        </CardHeader>

        <CardContent className="space-y-4">
          {/* Usage comparison */}
          <div className="flex items-center gap-6">
            <div className="flex-1">
              <p className="text-sm text-muted-foreground mb-1">Current usage</p>
              <div className="flex items-baseline gap-2">
                <span className={clsx(
                  'text-2xl font-bold',
                  isOverLimit ? 'text-red-500' : isAtLimit ? 'text-amber-500' : 'text-foreground'
                )}>
                  {currentValue}
                </span>
                <span className="text-muted-foreground">/ {limitValue}</span>
                <span className="text-sm text-muted-foreground">{resourceName}</span>
              </div>
            </div>
            <div className="text-right">
              <p className="text-sm text-muted-foreground mb-1">Usage</p>
              <span className={clsx(
                'text-2xl font-bold',
                usagePercent >= 100 ? 'text-red-500' : usagePercent >= 90 ? 'text-amber-500' : 'text-foreground'
              )}>
                {usagePercent}%
              </span>
            </div>
          </div>

          {/* Progress bar */}
          <div className="h-2 bg-secondary rounded-full overflow-hidden">
            <div
              className={clsx(
                'h-full transition-all duration-300',
                isOverLimit ? 'bg-red-500' : isAtLimit ? 'bg-amber-500' : 'bg-primary'
              )}
              style={{ width: `${Math.min(usagePercent, 100)}%` }}
            />
          </div>

          {/* Contextual message */}
          <p className="text-sm text-muted-foreground">
            {isBlocking ? (
              <>
                You must upgrade your plan to continue using this feature.
                {isOverLimit && (
                  <span className="block mt-1 text-red-500">
                    You are {currentValue - limitValue} {resourceName} over your limit.
                  </span>
                )}
              </>
            ) : (
              <>
                {isAtLimit
                  ? `You've reached your ${resourceName} limit. Upgrade to add more.`
                  : `You're approaching your ${resourceName} limit. Consider upgrading soon.`}
              </>
            )}
          </p>
        </CardContent>

        <CardFooter className="flex items-center gap-3 pt-4">
          <Button onClick={onUpgrade} size="default">
            <ArrowUpCircleIcon className="h-4 w-4 mr-2" />
            Upgrade Plan
          </Button>
          {!isBlocking && onDismiss && (
            <Button variant="ghost" onClick={onDismiss} size="default">
              Maybe Later
            </Button>
          )}
        </CardFooter>
      </Card>
    );
  }
);

UpgradePrompt.displayName = 'UpgradePrompt';
