/**
 * @fileType: utility
 * @status: current
 * @updated: 2026-02-15
 * @tags: [cloud, auth, guard, local-first, ADR-078]
 * @related: [auth-storage.ts, identity.ts]
 * @priority: critical
 * @complexity: low
 * @dependencies: [chalk]
 */

/**
 * Cloud Guard Utility (ADR-078: Local-First CLI Architecture)
 *
 * Provides three tiers of cloud availability checks:
 *
 *   LOCAL commands:          Use withOptionalCloud() — works with zero auth
 *   CLOUD-ENHANCED commands: Use withOptionalCloud() — works locally, richer with cloud
 *   CLOUD-ONLY commands:     Use requireCloud() — shows upgrade message and exits
 *
 * Replaces hard requireAuth() gates that blocked open-source CLI usage.
 */

import chalk from 'chalk';
import { isAuthenticated, loadAuthSession, type AuthSession } from './auth-storage.js';

// =============================================================================
// Types
// =============================================================================

export interface CloudStatus {
  /** Whether the user is authenticated with Ginko Cloud */
  available: boolean;
  /** The auth session if available, null otherwise */
  session: AuthSession | null;
}

// Track whether we've shown the upgrade hint this session
let upgradeHintShown = false;

// =============================================================================
// Non-blocking check — for LOCAL + CLOUD-ENHANCED commands
// =============================================================================

/**
 * Non-blocking cloud availability check.
 *
 * Returns cloud status without blocking command execution.
 * Use this for LOCAL and CLOUD-ENHANCED commands that should
 * work without authentication but can do more with it.
 *
 * @param _commandName - The command name (for future telemetry)
 * @returns CloudStatus indicating whether cloud features are available
 */
export async function withOptionalCloud(_commandName: string): Promise<CloudStatus> {
  try {
    const session = await loadAuthSession();
    return {
      available: session !== null,
      session,
    };
  } catch {
    return {
      available: false,
      session: null,
    };
  }
}

// =============================================================================
// Blocking gate — for CLOUD-ONLY commands
// =============================================================================

/**
 * Blocking cloud requirement check.
 *
 * Shows a value-proposition upgrade message and exits cleanly
 * if the user is not authenticated. Use this for commands that
 * fundamentally require Ginko Cloud (push, pull, graph, team, etc.).
 *
 * @param commandName - The command name for the error message
 */
export async function requireCloud(commandName: string): Promise<void> {
  const authenticated = await isAuthenticated();

  if (!authenticated) {
    console.log('');
    console.log(chalk.cyan(`  ginko ${commandName}`) + chalk.dim(' requires Ginko Cloud.'));
    console.log('');
    console.log(chalk.white('  Ginko Cloud adds:'));
    console.log(chalk.dim('    - Knowledge graph search across your codebase'));
    console.log(chalk.dim('    - Team collaboration and visibility'));
    console.log(chalk.dim('    - AI-powered coaching insights'));
    console.log('');
    console.log(chalk.white('  Get started: ') + chalk.cyan('ginko login'));
    console.log(chalk.dim('  Learn more:  https://ginkoai.com/cloud'));
    console.log('');
    console.log(chalk.dim('  Everything you\'ve built locally will sync when you connect.'));
    console.log('');

    process.exit(0);
  }
}

// =============================================================================
// End-of-session nudge — shown once per session
// =============================================================================

/**
 * Show a one-time upgrade hint after successful local command usage.
 *
 * Only shown once per CLI process to avoid nagging.
 * Call this at the end of LOCAL commands to gently surface cloud features.
 *
 * @param feature - The cloud feature that would enhance this command
 */
export async function showCloudUpgradeHint(feature: string): Promise<void> {
  if (upgradeHintShown) return;

  const authenticated = await isAuthenticated();
  if (authenticated) return;

  upgradeHintShown = true;

  console.log('');
  console.log(chalk.dim(`  Tip: ${feature}`));
  console.log(chalk.dim('  Connect with: ginko login'));
}
