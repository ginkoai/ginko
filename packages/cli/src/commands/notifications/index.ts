/**
 * @fileType: command
 * @status: current
 * @updated: 2025-12-07
 * @tags: [notifications, cli, epic-004-sprint5, task-15, human-observability]
 * @related: [list.ts, test.ts, history.ts, notification-hooks.ts]
 * @priority: high
 * @complexity: medium
 * @dependencies: [commander, chalk]
 */

/**
 * Notification Commands (EPIC-004 Sprint 5 TASK-15)
 *
 * CLI commands for managing notification hooks and testing delivery
 */

import { Command } from 'commander';
import chalk from 'chalk';
import { listNotificationsCommand } from './list.js';
import { testNotificationCommand } from './test.js';
import { historyNotificationCommand } from './history.js';

/**
 * Main notifications command with subcommands
 */
export function notificationsCommand() {
  const notifications = new Command('notifications')
    .description('Manage notification hooks for human observability (EPIC-004)')
    .showHelpAfterError('(use --help for additional information)')
    .addHelpText(
      'after',
      `
${chalk.gray('Quick Start:')}
  ${chalk.green('ginko notifications list')}                    ${chalk.gray('# Show configured hooks')}
  ${chalk.green('ginko notifications test')} slack-escalations  ${chalk.gray('# Send test message')}
  ${chalk.green('ginko notifications history')}                 ${chalk.gray('# Recent delivery log')}

${chalk.gray('Usage Examples:')}
  ${chalk.green('ginko notifications list')}  ${chalk.dim('# List all configured hooks')}
  ${chalk.green('ginko notifications test slack-escalations')}  ${chalk.dim('# Test specific hook')}
  ${chalk.green('ginko notifications history')}  ${chalk.dim('# View last 20 notifications')}
  ${chalk.green('ginko notifications history --limit 50')}  ${chalk.dim('# View last 50 notifications')}

${chalk.gray('Features:')}
  ${chalk.cyan('📋 Hook Discovery')}     - List all configured notification hooks
  ${chalk.cyan('🧪 Test Delivery')}      - Send test messages to verify setup
  ${chalk.cyan('📊 Delivery History')}   - View recent notifications and status
  ${chalk.cyan('🔍 Filter by Status')}   - Filter history by sent/failed status

${chalk.gray('Configuration:')}
  ${chalk.dim('Notification hooks are configured in ginko.config.json')}
  ${chalk.dim('See https://docs.ginko.ai/notifications for examples')}

${chalk.gray('Learn More:')}
  ${chalk.dim('https://docs.ginko.ai/notifications')}
`
    )
    .action(() => {
      // When called without subcommand, show help
      notifications.help({ error: false });
    });

  // List command
  notifications
    .command('list')
    .description('List all configured notification hooks')
    .option('--verbose', 'Show detailed hook configuration')
    .action(async (options) => {
      await listNotificationsCommand(options);
    });

  // Test command
  notifications
    .command('test <hookId>')
    .description('Send a test message to a specific notification hook')
    .option('--event <event>', 'Event type to test (default: escalation)', 'escalation')
    .action(async (hookId, options) => {
      await testNotificationCommand(hookId, options);
    });

  // History command
  notifications
    .command('history')
    .description('Show recent notification delivery history')
    .option('--limit <limit>', 'Number of notifications to show (default 20)', '20')
    .option('--status <status>', 'Filter by status (sent|failed)')
    .option('--hook <hookId>', 'Filter by hook ID')
    .action(async (options) => {
      await historyNotificationCommand(options);
    });

  return notifications;
}

// Export for use in main CLI
export default notificationsCommand;
