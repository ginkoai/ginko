/**
 * @fileType: command
 * @status: current
 * @updated: 2025-12-07
 * @tags: [escalation, resolve, cli, epic-004, human-intervention]
 * @related: [index.ts, escalation-client.ts]
 * @priority: high
 * @complexity: medium
 * @dependencies: [commander, chalk, ora]
 */

/**
 * Resolve Escalation Command (EPIC-004 Sprint 5 TASK-7)
 *
 * Resolve an escalation with human decision/guidance
 */

import chalk from 'chalk';
import ora from 'ora';
import { execSync } from 'child_process';
import { EscalationClient } from './escalation-client.js';

interface ResolveOptions {
  resolution: string;
  resolvedBy?: string;
}

/**
 * Get git user email
 */
function getGitUserEmail(): string | null {
  try {
    const email = execSync('git config user.email', { encoding: 'utf-8' }).trim();
    return email || null;
  } catch (error) {
    return null;
  }
}

/**
 * Resolve an escalation
 */
export async function resolveEscalationCommand(
  escalationId: string,
  options: ResolveOptions
): Promise<void> {
  const spinner = ora('Resolving escalation...').start();

  try {
    // Validate escalation ID
    if (!escalationId || escalationId.trim().length === 0) {
      spinner.fail(chalk.red('Failed to resolve escalation'));
      console.error(chalk.red('  Escalation ID is required'));
      process.exit(1);
    }

    // Get resolvedBy (default to git user.email)
    let resolvedBy: string | undefined = options.resolvedBy;
    if (!resolvedBy) {
      const gitEmail = getGitUserEmail();
      if (!gitEmail) {
        spinner.fail(chalk.red('Failed to resolve escalation'));
        console.error(chalk.red('  Could not determine git user.email'));
        console.error(chalk.red('  Either:'));
        console.error(chalk.red('    - Set git config user.email'));
        console.error(chalk.red('    - Use --resolved-by <email> to specify'));
        process.exit(1);
      }
      resolvedBy = gitEmail;
    }

    // Resolve escalation via API
    const response = await EscalationClient.resolve(
      escalationId,
      resolvedBy,
      options.resolution
    );

    if (!response.escalationId) {
      spinner.fail(chalk.red('Failed to resolve escalation'));
      console.error(chalk.red('  No escalation ID returned from API'));
      process.exit(1);
    }

    spinner.succeed(chalk.green('Escalation resolved successfully'));
    console.log('');
    console.log(chalk.bold('  Resolution recorded'));
    console.log(chalk.dim(`  ID: ${response.escalationId}`));
    console.log(chalk.dim(`  Status: ${response.status}`));
    console.log(chalk.dim(`  Resolved by: ${response.resolvedBy}`));
    console.log(chalk.dim(`  Resolved at: ${new Date(response.resolvedAt).toLocaleString()}`));
    console.log('');
    console.log(chalk.bold('  Resolution:'));
    console.log(chalk.dim(`  ${response.resolution}`));
    console.log('');

    // Show next steps
    console.log(chalk.dim('💡 Task is now unblocked and can resume'));
    console.log(chalk.dim('  ginko escalation list --status open    # View remaining escalations'));
  } catch (error: any) {
    spinner.fail(chalk.red('Failed to resolve escalation'));

    // Handle specific error codes
    if (error.message.includes('Not authenticated')) {
      console.error(chalk.red('  Not authenticated. Run `ginko login` first.'));
    } else if (error.message.includes('ESCALATION_NOT_FOUND')) {
      console.error(chalk.red('  Escalation not found or already resolved'));
      console.error(chalk.red('  Use "ginko escalation list" to see available escalations'));
    } else if (error.message.includes('MISSING_RESOLVED_BY')) {
      console.error(chalk.red('  resolvedBy is required'));
    } else if (error.message.includes('MISSING_RESOLUTION')) {
      console.error(chalk.red('  Resolution details are required'));
    } else {
      console.error(chalk.red(`  ${error.message}`));
    }

    process.exit(1);
  }
}
