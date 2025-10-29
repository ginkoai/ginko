/**
 * @fileType: command
 * @status: current
 * @updated: 2025-10-28
 * @tags: [cli, auth, logout, session]
 * @related: [login.ts, auth-storage.ts]
 * @priority: high
 * @complexity: low
 * @dependencies: [chalk]
 */

import chalk from 'chalk';
import {
  clearAuthSession,
  isAuthenticated,
  getCurrentUser,
  getAuthFilePath
} from '../utils/auth-storage.js';

/**
 * Logout command - Clear local authentication session
 */
export async function logoutCommand(): Promise<void> {
  // Check if authenticated
  if (!await isAuthenticated()) {
    console.log(chalk.yellow('⚠ Not currently authenticated'));
    console.log(chalk.dim('  Use `ginko login` to authenticate'));
    return;
  }

  const user = await getCurrentUser();

  // Clear session
  await clearAuthSession();

  console.log(chalk.green('✓ Successfully logged out'));
  console.log(chalk.dim(`  User: ${user?.email || user?.github_username || 'Unknown'}`));
  console.log(chalk.dim(`  Auth file removed: ${getAuthFilePath()}`));
  console.log(chalk.dim('\n  Use `ginko login` to authenticate again'));
}
