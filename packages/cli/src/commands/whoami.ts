/**
 * @fileType: command
 * @status: current
 * @updated: 2025-10-28
 * @tags: [cli, auth, user, status]
 * @related: [login.ts, logout.ts, auth-storage.ts]
 * @priority: medium
 * @complexity: low
 * @dependencies: [chalk]
 */

import chalk from 'chalk';
import {
  isAuthenticated,
  getCurrentUser,
  loadAuthSession
} from '../utils/auth-storage.js';

/**
 * Whoami command - Display current authentication status
 */
export async function whoamiCommand(): Promise<void> {
  if (!await isAuthenticated()) {
    console.log(chalk.yellow('⚠ Not authenticated'));
    console.log(chalk.dim('  Use `ginko login` to authenticate'));
    return;
  }

  const user = await getCurrentUser();
  const session = await loadAuthSession();

  console.log(chalk.cyan('🔐 Authentication Status\n'));

  console.log(chalk.bold('User Information:'));
  console.log(chalk.dim(`  Email:          ${user?.email || 'N/A'}`));
  console.log(chalk.dim(`  GitHub:         @${user?.github_username || 'N/A'}`));
  console.log(chalk.dim(`  GitHub ID:      ${user?.github_id || 'N/A'}`));
  console.log(chalk.dim(`  Name:           ${user?.full_name || 'N/A'}`));
  console.log(chalk.dim(`  User ID:        ${user?.id || 'N/A'}`));

  console.log(chalk.bold('\nAPI Key:'));

  if (session) {
    console.log(chalk.green(`  Status:         Active`));
    console.log(chalk.dim(`  Key prefix:     ${session.api_key.substring(0, 20)}...`));
  }

  console.log(chalk.dim('\n  Use `ginko logout` to clear authentication'));
}
