/**
 * @fileType: command
 * @status: current
 * @updated: 2025-11-07
 * @tags: [team, list, cli, task-023]
 * @related: [index.ts, teams-client.ts]
 * @priority: high
 * @complexity: low
 * @dependencies: [commander, chalk, cli-table3, ora]
 */

/**
 * List Teams Command (TASK-023)
 *
 * List all teams the user belongs to
 */

import chalk from 'chalk';
import ora from 'ora';
import Table from 'cli-table3';
import { TeamsClient } from '../../lib/api/teams-client.js';

/**
 * List user's teams
 */
export async function listTeamsCommand(): Promise<void> {
  const spinner = ora('Loading teams...').start();

  try {
    const response = await TeamsClient.list();

    if (response.error) {
      spinner.fail(chalk.red('Failed to load teams'));
      console.error(chalk.red(`  ${response.error}`));
      process.exit(1);
    }

    const teams = response.data!.teams;

    spinner.succeed(chalk.green(`Found ${teams.length} team${teams.length !== 1 ? 's' : ''}`));
    console.log('');

    if (teams.length === 0) {
      console.log(chalk.yellow('No teams found'));
      console.log(chalk.dim('💡 Create your first team:'));
      console.log(chalk.dim('  ginko team create <name>'));
      return;
    }

    // Display table
    const table = new Table({
      head: [chalk.cyan('Name'), chalk.cyan('Members'), chalk.cyan('Projects'), chalk.cyan('Created')],
      colWidths: [30, 10, 10, 15],
      wordWrap: true,
    });

    teams.forEach((team) => {
      table.push([
        team.name.length > 27 ? team.name.substring(0, 24) + '...' : team.name,
        team.member_count?.toString() || '0',
        team.project_count?.toString() || '0',
        new Date(team.created_at).toLocaleDateString(),
      ]);
    });

    console.log(table.toString());
    console.log('');
    console.log(chalk.dim('💡 Manage teams:'));
    console.log(chalk.dim('  ginko team add-member <team-name> <github-username>'));
    console.log(chalk.dim('  ginko team add-to-project <team-name> <project-name>'));
  } catch (error: any) {
    spinner.fail(chalk.red('Failed to load teams'));
    console.error(chalk.red(`  ${error.message}`));
    process.exit(1);
  }
}
