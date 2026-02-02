/**
 * @fileType: utility
 * @status: current
 * @updated: 2026-02-02
 * @tags: [identity, auth, attribution, BUG-021]
 * @related: [auth-storage.ts, config-loader.ts, config.ts]
 * @priority: critical
 * @complexity: low
 * @dependencies: [fs-extra, chalk]
 */

/**
 * Identity Utilities (BUG-021)
 *
 * Ginko identity is tied to GitHub auth. Within a project, the git identity
 * and ginko identity must agree to preserve traceability. The ginko
 * authenticated account is authoritative.
 *
 * - ~/.ginko/auth.json  → authentication + authoritative identity
 * - .ginko/local.json   → project-local attribution (must match auth)
 *
 * A user may use a different account for another project, but within any
 * single project the identities must agree.
 */

import fs from 'fs-extra';
import path from 'path';
import chalk from 'chalk';
import { loadAuthSession, type AuthSession } from './auth-storage.js';

/**
 * Confirm the user is authenticated and display who they're logged in as.
 * Used by commands that create or join projects (init, create, join).
 *
 * @returns The authenticated session, or exits the process if not authenticated.
 */
export async function confirmAuthIdentity(commandName: string): Promise<AuthSession> {
  const session = await loadAuthSession();

  if (!session?.user?.email) {
    console.log(chalk.red('\n✗ Authentication required'));
    console.log(chalk.dim(`  You must be logged in to run \`ginko ${commandName}\``));
    console.log(chalk.dim('  Run `ginko login` to authenticate with GitHub\n'));
    process.exit(1);
  }

  const displayName = session.user.full_name || session.user.github_username || session.user.email;
  console.log(chalk.dim(`  Authenticated as: ${displayName} (${session.user.email})`));

  return session;
}

/**
 * Get the authenticated identity if available, without exiting.
 * Returns the auth session if authenticated, null otherwise.
 *
 * Used by commands like `ginko init` that prefer auth identity
 * but can fall back to git config with a warning.
 */
export async function getAuthIdentity(): Promise<AuthSession | null> {
  const session = await loadAuthSession();

  if (!session?.user?.email) {
    return null;
  }

  return session;
}

/**
 * Sync .ginko/local.json identity to match the authenticated account.
 *
 * Called on `ginko start` (auto-fix) and `ginko login` (proactive sync).
 * If local.json doesn't exist or the project isn't initialized, this is a no-op.
 *
 * @returns true if local.json was updated, false if already in sync or no local.json
 */
export async function syncLocalIdentity(ginkoDir: string): Promise<{ updated: boolean; oldEmail?: string; newEmail?: string }> {
  const localFile = path.join(ginkoDir, 'local.json');

  if (!await fs.pathExists(localFile)) {
    return { updated: false };
  }

  const session = await loadAuthSession();
  if (!session?.user?.email) {
    return { updated: false };
  }

  const localConfig = await fs.readJson(localFile);
  const localEmail = localConfig.userEmail;
  const authEmail = session.user.email;

  if (localEmail && localEmail.toLowerCase() === authEmail.toLowerCase()) {
    return { updated: false };
  }

  const oldEmail = localEmail;
  const newSlug = authEmail.replace('@', '-at-').replace(/\./g, '-');

  localConfig.userEmail = authEmail;
  localConfig.userSlug = newSlug;

  // Clean up the suppress flag — it's no longer relevant
  delete localConfig.suppressIdentityWarning;

  await fs.writeJson(localFile, localConfig, { spaces: 2 });

  return { updated: true, oldEmail, newEmail: authEmail };
}
