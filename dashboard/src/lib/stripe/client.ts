/**
 * @fileType: utility
 * @status: current
 * @updated: 2026-01-05
 * @tags: [stripe, billing, payments, seats, epic-008]
 * @related: [billing/seats/sync/route.ts, teams/members/route.ts]
 * @priority: high
 * @complexity: medium
 * @dependencies: [stripe]
 *
 * Stripe client for dashboard billing operations (EPIC-008 Sprint 4)
 */

import Stripe from 'stripe';

let stripeInstance: Stripe | null = null;

/**
 * Get or create Stripe client instance
 * Handles both real and test/mock keys
 */
export function getStripeClient(): Stripe | null {
  if (stripeInstance) {
    return stripeInstance;
  }

  const secretKey = process.env.STRIPE_SECRET_KEY;

  if (!secretKey) {
    console.warn('[STRIPE] STRIPE_SECRET_KEY not configured');
    return null;
  }

  // Handle test/fake keys gracefully
  if (secretKey.startsWith('sk_test_fake') || secretKey === 'sk_test_fake_key_for_testing') {
    console.warn('[STRIPE] Using fake Stripe key - billing features will be mocked');
    return null;
  }

  stripeInstance = new Stripe(secretKey, {
    apiVersion: '2024-12-18.acacia',
    typescript: true,
  });

  return stripeInstance;
}

/**
 * Team plan pricing configuration
 * Matches billing-manager.ts pricing
 */
export const TEAM_PRICING = {
  monthly: {
    priceId: process.env.STRIPE_TEAM_MONTHLY_PRICE_ID || 'price_team_monthly',
    amount: 1500, // $15.00 per seat
    interval: 'month' as const,
  },
  yearly: {
    priceId: process.env.STRIPE_TEAM_YEARLY_PRICE_ID || 'price_team_yearly',
    amount: 15000, // $150.00 per seat (17% savings)
    interval: 'year' as const,
  },
  maxSeats: 50,
  trialDays: 14,
};

/**
 * Seat allocation information
 */
export interface SeatAllocation {
  teamId: string;
  currentMembers: number;
  allocatedSeats: number;
  maxSeats: number | null;
  stripeSubscriptionId: string | null;
  needsSync: boolean;
}

/**
 * Seat sync result
 */
export interface SeatSyncResult {
  success: boolean;
  previousSeats: number;
  newSeats: number;
  prorated: boolean;
  error?: string;
}
