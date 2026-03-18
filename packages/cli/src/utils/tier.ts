/**
 * @fileType: utility
 * @status: current
 * @updated: 2026-03-17
 * @tags: [tier, subscription, billing, cli, epic-026]
 * @related: [api-client.ts, commands/start.ts, commands/status.ts]
 * @priority: high
 * @complexity: low
 * @dependencies: [chalk]
 *
 * CLI tier resolution and caching (EPIC-026)
 * Fetches user tier from dashboard API, caches locally with TTL.
 */

import chalk from 'chalk';
import { api } from './api-client.js';
import { isAuthenticated } from './auth-storage.js';
import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';

export interface TierInfo {
  tier: 'free' | 'pro' | 'suspended';
  isPro: boolean;
  isTrial: boolean;
  trialDaysLeft: number | null;
  isSuspended: boolean;
  subscriptionEndsAt: string | null;
}

interface CachedTier {
  data: TierInfo;
  fetchedAt: string;
}

const CACHE_TTL_MS = 24 * 60 * 60 * 1000; // 24 hours
const CACHE_FILE = path.join(os.homedir(), '.ginko', 'tier-cache.json');

/**
 * Get the user's subscription tier.
 * Fetches from API, falls back to cache if offline.
 */
export async function getTier(): Promise<TierInfo | null> {
  if (!await isAuthenticated()) {
    return null;
  }

  // Try cache first if fresh
  const cached = readCache();
  if (cached) {
    const age = Date.now() - new Date(cached.fetchedAt).getTime();
    if (age < CACHE_TTL_MS) {
      return cached.data;
    }
  }

  // Fetch from API
  try {
    const response = await api.get<TierInfo>('/api/v1/user/tier');
    if (response.data) {
      const tierInfo: TierInfo = {
        tier: response.data.tier,
        isPro: response.data.isPro,
        isTrial: response.data.isTrial,
        trialDaysLeft: response.data.trialDaysLeft,
        isSuspended: response.data.isSuspended,
        subscriptionEndsAt: response.data.subscriptionEndsAt,
      };
      writeCache(tierInfo);
      return tierInfo;
    }
  } catch {
    // API unreachable — fall back to cache (even if stale)
    if (cached) {
      return cached.data;
    }
  }

  // No cache, no API — default to free
  return {
    tier: 'free',
    isPro: false,
    isTrial: false,
    trialDaysLeft: null,
    isSuspended: false,
    subscriptionEndsAt: null,
  };
}

/**
 * Format tier for display in CLI output.
 */
export function formatTierDisplay(tier: TierInfo): string {
  if (tier.isTrial) {
    return chalk.cyan(`Pro Trial (${tier.trialDaysLeft} day${tier.trialDaysLeft === 1 ? '' : 's'} left)`);
  }
  if (tier.isPro) {
    return chalk.green('Pro');
  }
  if (tier.isSuspended) {
    return chalk.yellow('Suspended');
  }
  return chalk.dim('Free');
}

/**
 * Show trial expiry warning if trial ends within 3 days.
 * Call this during `ginko start` to surface urgency.
 */
export function showTrialWarning(tier: TierInfo): void {
  if (!tier.isTrial || tier.trialDaysLeft === null) return;

  if (tier.trialDaysLeft <= 0) {
    console.log(chalk.yellow('\n  ⏰ Your Pro trial has ended. Upgrade to keep Pro features.'));
    console.log(chalk.dim('     Upgrade: https://app.ginkoai.com/pricing'));
  } else if (tier.trialDaysLeft <= 3) {
    console.log(chalk.yellow(`\n  ⏰ Pro trial ends in ${tier.trialDaysLeft} day${tier.trialDaysLeft === 1 ? '' : 's'}`));
    console.log(chalk.dim('     Upgrade: https://app.ginkoai.com/pricing'));
  }
}

/**
 * Show upgrade prompt for free/suspended users.
 */
export async function showUpgradePrompt(): Promise<void> {
  try {
    const response = await api.get('/api/v1/stripe/promo-status', false);
    if (response.data?.isPromoActive && response.data.currentTier) {
      const t = response.data.currentTier;
      const price = `$${t.annualPrice / 100}/yr ($${t.monthlyEquivalent / 100}/mo)`;
      const seats = `${t.seatsDisplayed} of ${t.seatLimit} ${t.label.toLowerCase()} seats claimed`;
      console.log(chalk.yellow(`\n  ⭐ ${t.label} adopter pricing: ${price} — ${seats}`));
      console.log(chalk.dim('     Upgrade: https://app.ginkoai.com/pricing'));
    }
  } catch {
    // Silently fail — promo display is non-critical
  }
}

function readCache(): CachedTier | null {
  try {
    if (fs.existsSync(CACHE_FILE)) {
      const data = fs.readFileSync(CACHE_FILE, 'utf-8');
      return JSON.parse(data);
    }
  } catch {
    // Corrupted cache
  }
  return null;
}

function writeCache(data: TierInfo): void {
  try {
    const dir = path.dirname(CACHE_FILE);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    fs.writeFileSync(CACHE_FILE, JSON.stringify({
      data,
      fetchedAt: new Date().toISOString(),
    }), 'utf-8');
  } catch {
    // Non-critical
  }
}
