/**
 * @fileType: utility
 * @status: current
 * @updated: 2026-01-05
 * @tags: [billing, subscription, limits, trial, free-tier, epic-008]
 * @related: [stripe/client.ts, billing/seat-sync.ts]
 * @priority: high
 * @complexity: medium
 * @dependencies: []
 *
 * Subscription limit checking and trial logic for Ginko dashboard.
 * Handles tier-based limits, trial periods, and grace period logic.
 */

// ============================================================================
// Types
// ============================================================================

export type PlanTier = 'free' | 'pro' | 'team' | 'enterprise';

export interface SubscriptionLimits {
  maxSeats: number;
  maxProjects: number;
  maxSessionsPerMonth: number;
  hasAdvancedFeatures: boolean;
  hasPrioritySupport: boolean;
  hasCustomIntegrations: boolean;
}

// ============================================================================
// Constants
// ============================================================================

/** Trial period duration in days */
export const TRIAL_PERIOD_DAYS = 14;

/** Grace period after trial ends before downgrade (in days) */
export const GRACE_PERIOD_DAYS = 3;

/** Milliseconds per day for date calculations */
const MS_PER_DAY = 24 * 60 * 60 * 1000;

/** Tier limit configurations */
const TIER_LIMITS: Record<PlanTier, SubscriptionLimits> = {
  free: {
    maxSeats: 2,
    maxProjects: 1,
    maxSessionsPerMonth: 50,
    hasAdvancedFeatures: false,
    hasPrioritySupport: false,
    hasCustomIntegrations: false,
  },
  pro: {
    maxSeats: 5,
    maxProjects: 10,
    maxSessionsPerMonth: 500,
    hasAdvancedFeatures: true,
    hasPrioritySupport: false,
    hasCustomIntegrations: false,
  },
  team: {
    maxSeats: 50,
    maxProjects: 100,
    maxSessionsPerMonth: 5000,
    hasAdvancedFeatures: true,
    hasPrioritySupport: true,
    hasCustomIntegrations: false,
  },
  enterprise: {
    maxSeats: Infinity,
    maxProjects: Infinity,
    maxSessionsPerMonth: Infinity,
    hasAdvancedFeatures: true,
    hasPrioritySupport: true,
    hasCustomIntegrations: true,
  },
};

// ============================================================================
// Helper Functions
// ============================================================================

/**
 * Get subscription limits for a given tier.
 */
export function getSubscriptionLimits(tier: PlanTier): SubscriptionLimits {
  return TIER_LIMITS[tier];
}

/**
 * Check if a trial period is currently active.
 */
export function isTrialActive(trialEndDate: Date | null): boolean {
  if (!trialEndDate) {
    return false;
  }
  const now = new Date();
  return trialEndDate.getTime() > now.getTime();
}

/**
 * Check if the subscription is in the grace period after trial ends.
 * Grace period allows users to continue using features briefly after
 * trial ends before being downgraded to free tier.
 */
export function isInGracePeriod(trialEndDate: Date | null): boolean {
  if (!trialEndDate) {
    return false;
  }

  const now = new Date();
  const trialEndTime = trialEndDate.getTime();

  // Trial hasn't ended yet - not in grace period
  if (trialEndTime > now.getTime()) {
    return false;
  }

  // Calculate grace period end
  const gracePeriodEnd = trialEndTime + GRACE_PERIOD_DAYS * MS_PER_DAY;

  // In grace period if current time is between trial end and grace period end
  return now.getTime() <= gracePeriodEnd;
}

/**
 * Get the effective tier considering trial status.
 * During trial or grace period, users get team-level features.
 */
export function getEffectiveTier(
  tier: PlanTier,
  trialEndDate: Date | null
): PlanTier {
  if (isTrialActive(trialEndDate) || isInGracePeriod(trialEndDate)) {
    // During trial/grace, free tier users get team features
    return tier === 'free' ? 'team' : tier;
  }
  return tier;
}

/**
 * Check if a team member can be added based on subscription limits.
 */
export function canAddTeamMember(
  currentCount: number,
  tier: PlanTier,
  trialEndDate: Date | null
): boolean {
  const effectiveTier = getEffectiveTier(tier, trialEndDate);
  const limits = getSubscriptionLimits(effectiveTier);
  return currentCount < limits.maxSeats;
}

/**
 * Check if a project can be added based on subscription limits.
 */
export function canAddProject(
  currentCount: number,
  tier: PlanTier,
  trialEndDate: Date | null
): boolean {
  const effectiveTier = getEffectiveTier(tier, trialEndDate);
  const limits = getSubscriptionLimits(effectiveTier);
  return currentCount < limits.maxProjects;
}

/**
 * Get a human-readable reason for why an upgrade is needed.
 * Returns null if no upgrade is needed.
 */
export function getUpgradeReason(
  currentCount: number,
  tier: PlanTier,
  trialEndDate: Date | null
): string | null {
  const limits = getSubscriptionLimits(tier);

  // Check if trial is ending soon (within 3 days)
  if (isTrialActive(trialEndDate) && trialEndDate) {
    const now = new Date();
    const daysRemaining = Math.ceil(
      (trialEndDate.getTime() - now.getTime()) / MS_PER_DAY
    );

    if (daysRemaining <= 3 && tier === 'free') {
      return `Your trial ends in ${daysRemaining} day${daysRemaining === 1 ? '' : 's'}. Upgrade to keep your team features.`;
    }
  }

  // Check if in grace period
  if (isInGracePeriod(trialEndDate) && tier === 'free') {
    return 'Your trial has ended. Upgrade now to keep your team features before they expire.';
  }

  // Check if at or over seat limit
  if (currentCount >= limits.maxSeats) {
    if (tier === 'free') {
      return `You've reached the free tier limit of ${limits.maxSeats} team members. Upgrade to Pro or Team for more seats.`;
    }
    if (tier === 'pro') {
      return `You've reached the Pro tier limit of ${limits.maxSeats} team members. Upgrade to Team for up to 50 seats.`;
    }
    if (tier === 'team') {
      return `You've reached the Team tier limit of ${limits.maxSeats} team members. Contact us for Enterprise pricing.`;
    }
  }

  return null;
}

/**
 * Calculate remaining days in trial period.
 */
export function getTrialDaysRemaining(trialEndDate: Date | null): number {
  if (!trialEndDate || !isTrialActive(trialEndDate)) {
    return 0;
  }

  const now = new Date();
  const daysRemaining = Math.ceil(
    (trialEndDate.getTime() - now.getTime()) / MS_PER_DAY
  );

  return Math.max(0, daysRemaining);
}

/**
 * Calculate remaining days in grace period.
 */
export function getGraceDaysRemaining(trialEndDate: Date | null): number {
  if (!trialEndDate || !isInGracePeriod(trialEndDate)) {
    return 0;
  }

  const now = new Date();
  const gracePeriodEnd =
    trialEndDate.getTime() + GRACE_PERIOD_DAYS * MS_PER_DAY;
  const daysRemaining = Math.ceil((gracePeriodEnd - now.getTime()) / MS_PER_DAY);

  return Math.max(0, daysRemaining);
}

/**
 * Check if a session can be started based on monthly session limits.
 */
export function canStartSession(
  currentSessionCount: number,
  tier: PlanTier,
  trialEndDate: Date | null
): boolean {
  const effectiveTier = getEffectiveTier(tier, trialEndDate);
  const limits = getSubscriptionLimits(effectiveTier);
  return currentSessionCount < limits.maxSessionsPerMonth;
}

/**
 * Get session usage as a percentage of the limit.
 */
export function getSessionUsagePercentage(
  currentSessionCount: number,
  tier: PlanTier,
  trialEndDate: Date | null
): number {
  const effectiveTier = getEffectiveTier(tier, trialEndDate);
  const limits = getSubscriptionLimits(effectiveTier);

  if (limits.maxSessionsPerMonth === Infinity) {
    return 0;
  }

  const percentage = (currentSessionCount / limits.maxSessionsPerMonth) * 100;
  return Math.min(100, Math.round(percentage));
}
