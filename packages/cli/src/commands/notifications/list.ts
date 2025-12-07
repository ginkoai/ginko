/**
 * @fileType: command
 * @status: current
 * @updated: 2025-12-07
 * @tags: [notifications, list, cli, epic-004-sprint5, task-15]
 * @related: [index.ts, test.ts, history.ts]
 * @priority: high
 * @complexity: low
 * @dependencies: [chalk, ora]
 */

/**
 * List Notifications Command (EPIC-004 Sprint 5 TASK-15)
 *
 * Display all configured notification hooks from ginko.config.json
 */

import chalk from 'chalk';
import ora from 'ora';
import fs from 'fs/promises';
import path from 'path';
import { requireGinkoRoot } from '../../utils/ginko-root.js';
import { NotificationHook } from '../../lib/notification-hooks.js';

interface GinkoConfig {
  notifications?: {
    hooks?: NotificationHook[];
  };
}

interface ListOptions {
  verbose?: boolean;
}

/**
 * Load notification hooks from ginko.config.json
 */
async function loadNotificationHooks(): Promise<NotificationHook[]> {
  try {
    const projectRoot = await requireGinkoRoot();
    const configPath = path.join(projectRoot, 'ginko.config.json');

    const content = await fs.readFile(configPath, 'utf-8');
    const config: GinkoConfig = JSON.parse(content);

    return config.notifications?.hooks || [];
  } catch (error) {
    // Config file doesn't exist or has no notifications
    return [];
  }
}

/**
 * Display configured notification hooks
 */
export async function listNotificationsCommand(options: ListOptions): Promise<void> {
  const spinner = ora('Loading notification hooks...').start();

  try {
    const hooks = await loadNotificationHooks();

    if (hooks.length === 0) {
      spinner.info(chalk.yellow('No notification hooks configured'));
      console.log(chalk.dim('\nTo configure notification hooks, add them to ginko.config.json:'));
      console.log(chalk.dim(`
{
  "notifications": {
    "hooks": [{
      "id": "slack-escalations",
      "events": ["escalation", "blocker"],
      "destination": {
        "type": "slack",
        "config": { "webhook_url": "https://hooks.slack.com/..." }
      },
      "filter": { "severity": ["high", "critical"] }
    }]
  }
}
      `));
      console.log(chalk.dim('See https://docs.ginko.ai/notifications for more details\n'));
      return;
    }

    spinner.succeed(chalk.green(`Found ${hooks.length} notification hook${hooks.length > 1 ? 's' : ''}`));

    console.log(chalk.gray('\n' + '─'.repeat(60)));

    hooks.forEach((hook, index) => {
      console.log(chalk.bold(`\n${index + 1}. ${hook.id}`));
      console.log(chalk.gray('   ' + '─'.repeat(56)));

      // Destination
      console.log(`   ${chalk.dim('Destination:')} ${chalk.cyan(hook.destination.type)}`);

      // Events
      console.log(`   ${chalk.dim('Events:')} ${hook.events.map(e => chalk.yellow(e)).join(', ')}`);

      // Filter summary
      if (hook.filter) {
        const filterParts: string[] = [];

        if (hook.filter.severity) {
          filterParts.push(`severity: ${hook.filter.severity.join(', ')}`);
        }
        if (hook.filter.epicId) {
          filterParts.push(`epic: ${hook.filter.epicId}`);
        }
        if (hook.filter.taskPattern) {
          filterParts.push(`task pattern: ${hook.filter.taskPattern}`);
        }

        if (filterParts.length > 0) {
          console.log(`   ${chalk.dim('Filters:')} ${chalk.magenta(filterParts.join(' | '))}`);
        }
      }

      // Verbose mode: show full config
      if (options.verbose) {
        console.log(`   ${chalk.dim('Config:')}`);
        Object.entries(hook.destination.config).forEach(([key, value]) => {
          // Mask sensitive values (webhook URLs, tokens)
          const maskedValue = key.toLowerCase().includes('url') || key.toLowerCase().includes('token')
            ? maskSensitiveValue(value)
            : value;
          console.log(`     ${chalk.dim(key + ':')} ${chalk.dim(maskedValue)}`);
        });
      }

      // Test command hint
      console.log(`   ${chalk.dim('Test:')} ${chalk.cyan(`ginko notifications test ${hook.id}`)}`);
    });

    console.log(chalk.gray('\n' + '─'.repeat(60)));
    console.log(chalk.dim('\nNext steps:'));
    console.log(chalk.dim(`  • Test a hook: ${chalk.cyan('ginko notifications test <hookId>')}`));
    console.log(chalk.dim(`  • View history: ${chalk.cyan('ginko notifications history')}`));
    console.log(chalk.dim(`  • View verbose config: ${chalk.cyan('ginko notifications list --verbose')}`));
    console.log();

  } catch (error) {
    spinner.fail(chalk.red('Failed to load notification hooks'));

    if (error instanceof Error) {
      console.error(chalk.red(`\n✗ Error: ${error.message}`));
    } else {
      console.error(chalk.red('\n✗ An unexpected error occurred'));
    }

    process.exit(1);
  }
}

/**
 * Mask sensitive values for display
 */
function maskSensitiveValue(value: string): string {
  if (value.length <= 8) {
    return '***';
  }
  // Show first 4 and last 4 characters
  return `${value.substring(0, 4)}...${value.substring(value.length - 4)}`;
}
