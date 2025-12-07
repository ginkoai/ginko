/**
 * @fileType: command
 * @status: current
 * @updated: 2025-12-07
 * @tags: [escalation, list, cli, epic-004, human-intervention]
 * @related: [index.ts, escalation-client.ts]
 * @priority: high
 * @complexity: medium
 * @dependencies: [commander, chalk, ora]
 */

/**
 * List Escalations Command (EPIC-004 Sprint 5 TASK-7)
 *
 * List escalations with optional filtering and severity-based ordering
 */

import chalk from 'chalk';
import ora from 'ora';
import { EscalationClient } from './escalation-client.js';

interface ListOptions {
  status?: string;
  severity?: string;
  task?: string;
  agent?: string;
  limit?: string;
  offset?: string;
}

/**
 * Get severity color
 */
function getSeverityColor(severity: string): string {
  switch (severity) {
    case 'critical':
      return chalk.red(severity.toUpperCase());
    case 'high':
      return chalk.yellow(severity.toUpperCase());
    case 'medium':
      return chalk.blue(severity);
    case 'low':
      return chalk.gray(severity);
    default:
      return severity;
  }
}

/**
 * Get status indicator
 */
function getStatusIndicator(status: string): string {
  switch (status) {
    case 'open':
      return chalk.red('●');
    case 'acknowledged':
      return chalk.yellow('●');
    case 'resolved':
      return chalk.green('●');
    default:
      return '●';
  }
}

/**
 * Format date for display
 */
function formatDate(dateString: string): string {
  const date = new Date(dateString);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
  const diffDays = Math.floor(diffHours / 24);

  if (diffHours < 1) {
    return chalk.red('< 1 hour ago');
  } else if (diffHours < 24) {
    return chalk.yellow(`${diffHours}h ago`);
  } else if (diffDays < 7) {
    return chalk.dim(`${diffDays}d ago`);
  } else {
    return chalk.dim(date.toLocaleDateString());
  }
}

/**
 * List escalations
 */
export async function listEscalationsCommand(options: ListOptions): Promise<void> {
  const spinner = ora('Loading escalations...').start();

  try {
    const limit = options.limit ? parseInt(options.limit, 10) : 20;
    const offset = options.offset ? parseInt(options.offset, 10) : 0;

    // Fetch escalations via API
    const response = await EscalationClient.list({
      status: options.status,
      severity: options.severity,
      taskId: options.task,
      agentId: options.agent,
      limit,
      offset,
    });

    spinner.stop();

    if (response.escalations.length === 0) {
      console.log(chalk.dim('No escalations found'));

      if (options.status || options.severity || options.task || options.agent) {
        console.log('');
        console.log(chalk.dim('💡 Try removing filters to see all escalations'));
      }

      return;
    }

    // Display results
    console.log('');
    console.log(chalk.bold(`Escalations (${response.total} total, showing ${response.escalations.length})`));
    console.log('');

    for (const escalation of response.escalations) {
      const status = getStatusIndicator(escalation.status);
      const severity = getSeverityColor(escalation.severity);
      const age = formatDate(escalation.createdAt);

      console.log(`${status} ${severity} ${chalk.bold(escalation.taskId)} - ${escalation.reason}`);
      console.log(chalk.dim(`   ID: ${escalation.id}`));
      console.log(chalk.dim(`   Agent: ${escalation.agentId}`));
      console.log(chalk.dim(`   Created: ${age}`));

      if (escalation.status === 'acknowledged' && escalation.acknowledgedBy) {
        console.log(chalk.dim(`   Acknowledged by: ${escalation.acknowledgedBy}`));
      }

      if (escalation.status === 'resolved' && escalation.resolvedBy && escalation.resolution) {
        console.log(chalk.dim(`   Resolved by: ${escalation.resolvedBy}`));
        console.log(chalk.dim(`   Resolution: ${escalation.resolution}`));
      }

      console.log('');
    }

    // Show pagination info
    if (response.total > limit) {
      const hasMore = offset + limit < response.total;
      if (hasMore) {
        console.log(chalk.dim(`💡 Use --offset ${offset + limit} to see more results`));
      }
    }

    // Show summary by severity for open escalations
    if (!options.status || options.status === 'open') {
      const openEscalations = response.escalations.filter(e => e.status === 'open');
      if (openEscalations.length > 0) {
        const critical = openEscalations.filter(e => e.severity === 'critical').length;
        const high = openEscalations.filter(e => e.severity === 'high').length;
        const medium = openEscalations.filter(e => e.severity === 'medium').length;
        const low = openEscalations.filter(e => e.severity === 'low').length;

        console.log(chalk.bold('Open Escalations Summary:'));
        if (critical > 0) console.log(chalk.red(`  ${critical} critical`));
        if (high > 0) console.log(chalk.yellow(`  ${high} high`));
        if (medium > 0) console.log(chalk.blue(`  ${medium} medium`));
        if (low > 0) console.log(chalk.gray(`  ${low} low`));
        console.log('');
      }
    }

    // Show next steps
    console.log(chalk.dim('💡 Next steps:'));
    console.log(chalk.dim('  ginko escalation resolve <id> --resolution "..."  # Resolve escalation'));
    console.log(chalk.dim('  ginko escalation list --status resolved           # View resolved'));
  } catch (error: any) {
    spinner.fail(chalk.red('Failed to list escalations'));

    // Handle specific error codes
    if (error.message.includes('Not authenticated')) {
      console.error(chalk.red('  Not authenticated. Run `ginko login` first.'));
    } else if (error.message.includes('INVALID_STATUS')) {
      console.error(chalk.red('  Invalid status. Must be: open, acknowledged, resolved'));
    } else if (error.message.includes('INVALID_SEVERITY')) {
      console.error(chalk.red('  Invalid severity. Must be: low, medium, high, critical'));
    } else {
      console.error(chalk.red(`  ${error.message}`));
    }

    process.exit(1);
  }
}
