/**
 * @fileType: command
 * @status: current
 * @updated: 2025-12-07
 * @tags: [notifications, test, cli, epic-004-sprint5, task-15]
 * @related: [index.ts, list.ts, history.ts, notification-adapters]
 * @priority: high
 * @complexity: medium
 * @dependencies: [chalk, ora]
 */

/**
 * Test Notification Command (EPIC-004 Sprint 5 TASK-15)
 *
 * Send a test message through a specific notification hook
 */

import chalk from 'chalk';
import ora from 'ora';
import fs from 'fs/promises';
import path from 'path';
import { requireGinkoRoot } from '../../utils/ginko-root.js';
import { NotificationPayload, NotificationHook, dispatchToDestination } from '../../lib/notification-hooks.js';


interface GinkoConfig {
  notifications?: {
    hooks?: NotificationHook[];
  };
}

interface TestOptions {
  event?: string;
}

/**
 * Load notification hook by ID
 */
async function loadNotificationHook(hookId: string): Promise<NotificationHook | null> {
  try {
    const projectRoot = await requireGinkoRoot();
    const configPath = path.join(projectRoot, 'ginko.config.json');

    const content = await fs.readFile(configPath, 'utf-8');
    const config: GinkoConfig = JSON.parse(content);

    const hooks = config.notifications?.hooks || [];
    return hooks.find(h => h.id === hookId) || null;
  } catch (error) {
    return null;
  }
}

/**
 * Create test payload for a given event type
 */
function createTestPayload(eventType: string): NotificationPayload {
  const timestamp = new Date().toISOString();

  switch (eventType) {
    case 'escalation':
      return {
        event: 'escalation',
        severity: 'high',
        timestamp,
        title: 'Test Escalation',
        description: 'This is a test escalation from Ginko CLI',
        taskId: 'TASK-TEST',
        agentId: 'test-agent',
        epicId: 'EPIC-TEST',
        metadata: {
          blockedTasks: ['TASK-5', 'TASK-6'],
          test: true,
        },
      };

    case 'blocker':
      return {
        event: 'blocker',
        severity: 'critical',
        timestamp,
        title: 'Test Blocker',
        description: 'Test blocker condition blocking task progress',
        taskId: 'TASK-TEST',
        agentId: 'test-agent',
        metadata: {
          blockedBy: 'Test blocker condition',
          blockingTasks: ['TASK-7'],
          test: true,
        },
      };

    case 'failure':
      return {
        event: 'failure',
        severity: 'high',
        timestamp,
        title: 'Test Failure',
        description: 'Test failure simulation',
        taskId: 'TASK-TEST',
        agentId: 'test-agent',
        metadata: { test: true },
      };

    case 'milestone':
      return {
        event: 'milestone',
        severity: 'low',
        timestamp,
        title: 'Test Milestone (50% Complete)',
        description: 'Sprint has reached 50% completion',
        epicId: 'EPIC-TEST',
        metadata: {
          sprintId: 'SPRINT-TEST',
          percentage: 50,
          tasksCompleted: 5,
          tasksTotal: 10,
          test: true,
        },
      };

    case 'completion':
      return {
        event: 'completion',
        severity: 'low',
        timestamp,
        title: 'Test Sprint Complete',
        description: 'Sprint SPRINT-TEST has been completed',
        epicId: 'EPIC-TEST',
        metadata: {
          sprintId: 'SPRINT-TEST',
          tasksCompleted: 10,
          test: true,
        },
      };

    case 'stale_agent':
      return {
        event: 'stale_agent',
        severity: 'medium',
        timestamp,
        title: 'Test Stale Agent',
        description: 'Agent test-agent has gone offline unexpectedly',
        agentId: 'test-agent',
        metadata: {
          lastHeartbeat: new Date(Date.now() - 600000).toISOString(), // 10 min ago
          releasedTasks: ['TASK-8'],
          test: true,
        },
      };

    case 'human_required':
      return {
        event: 'human_required',
        severity: 'high',
        timestamp,
        title: 'Test Human Required',
        description: 'Test human intervention request',
        taskId: 'TASK-TEST',
        agentId: 'test-agent',
        metadata: { test: true },
      };

    default:
      return {
        event: eventType as any,
        severity: 'medium',
        timestamp,
        title: `Test ${eventType}`,
        description: `Test notification for ${eventType} event`,
        metadata: { test: true },
      };
  }
}

/**
 * Send a test notification through a specific hook
 */
export async function testNotificationCommand(hookId: string, options: TestOptions): Promise<void> {
  const spinner = ora(`Testing notification hook: ${hookId}...`).start();

  try {
    // Load hook config
    const hook = await loadNotificationHook(hookId);

    if (!hook) {
      spinner.fail(chalk.red(`Hook not found: ${hookId}`));
      console.log(chalk.dim('\nAvailable hooks:'));
      console.log(chalk.dim(`  Run ${chalk.cyan('ginko notifications list')} to see configured hooks`));
      process.exit(1);
    }

    // Use specified event type or first event from hook config
    const eventType: string = options.event || hook.events[0];

    // Verify event type is supported by hook
    if (!hook.events.includes(eventType as any)) {
      spinner.warn(chalk.yellow(`Warning: Event type "${eventType}" not in hook's event list`));
      console.log(chalk.dim(`  Hook listens for: ${hook.events.join(', ')}`));
      console.log(chalk.dim('  Proceeding with test anyway...\n'));
    }

    spinner.text = `Sending test ${eventType} notification to ${hook.destination.type}...`;

    // Create test payload
    const payload = createTestPayload(eventType);

    // Send notification
    const success = await dispatchToDestination(hook.destination, payload);

    if (success) {
      spinner.succeed(chalk.green('Test notification sent successfully'));

      console.log(chalk.gray('\n' + '─'.repeat(60)));
      console.log(chalk.bold('Test Details:'));
      console.log(`  ${chalk.dim('Hook ID:')} ${chalk.cyan(hookId)}`);
      console.log(`  ${chalk.dim('Destination:')} ${chalk.cyan(hook.destination.type)}`);
      console.log(`  ${chalk.dim('Event Type:')} ${chalk.yellow(eventType)}`);
      console.log(`  ${chalk.dim('Timestamp:')} ${chalk.dim(new Date().toLocaleString())}`);

      console.log(chalk.gray('\n' + '─'.repeat(60)));
      console.log(chalk.dim('\nCheck your notification destination for the test message.'));
      console.log(chalk.dim(`View history: ${chalk.cyan('ginko notifications history')}\n`));

    } else {
      spinner.fail(chalk.red('Test notification failed'));

      console.log(chalk.gray('\n' + '─'.repeat(60)));
      console.log(chalk.bold('Failure Details:'));
      console.log(`  ${chalk.dim('Hook ID:')} ${chalk.cyan(hookId)}`);
      console.log(`  ${chalk.dim('Destination:')} ${chalk.cyan(hook.destination.type)}`);
      console.log(`  ${chalk.dim('Event Type:')} ${chalk.yellow(eventType)}`);

      console.log(chalk.gray('\n' + '─'.repeat(60)));
      console.log(chalk.dim('\nTroubleshooting:'));
      console.log(chalk.dim('  • Verify webhook URL is correct'));
      console.log(chalk.dim('  • Check network connectivity'));
      console.log(chalk.dim('  • Ensure destination service is accessible'));
      console.log(chalk.dim(`  • View detailed config: ${chalk.cyan(`ginko notifications list --verbose`)}\n`));

      process.exit(1);
    }

  } catch (error) {
    spinner.fail(chalk.red('Failed to send test notification'));

    if (error instanceof Error) {
      console.error(chalk.red(`\n✗ Error: ${error.message}`));
    } else {
      console.error(chalk.red('\n✗ An unexpected error occurred'));
    }

    process.exit(1);
  }
}
