/**
 * @fileType: command
 * @status: current
 * @updated: 2025-11-07
 * @tags: [team, create, cli, task-023]
 * @related: [index.ts, teams-client.ts]
 * @priority: high
 * @complexity: low
 * @dependencies: [commander, chalk, ora]
 */

/**
 * Create Team Command (TASK-023)
 *
 * Create a new team
 */

import chalk from 'chalk';
import ora from 'ora';
import { TeamsClient } from '../../lib/api/teams-client.js';

/**
 * Create a new team
 */
export async function createTeamCommand(name: string): Promise<void> {
  const spinner = ora('Creating team...').start();

  try {
    const response = await TeamsClient.create({ name });

    if (response.error) {
      spinner.fail(chalk.red('Failed to create team'));
      console.error(chalk.red(`  ${response.error}`));
      process.exit(1);
    }

    const team = response.data!;

    spinner.succeed(chalk.green('Team created'));
    console.log('');
    console.log(chalk.bold(`  ${team.name}`));
    console.log(chalk.dim(`  ID: ${team.id}`));
    console.log(chalk.dim(`  Role: owner`));
    console.log('');
    console.log(chalk.dim('💡 Next steps:'));
    console.log(chalk.dim(`  ginko team add-member ${team.name} <github-username>`));
    console.log(chalk.dim(`  ginko team add-to-project ${team.name} <project-name>`));
  } catch (error: any) {
    spinner.fail(chalk.red('Failed to create team'));
    console.error(chalk.red(`  ${error.message}`));
    process.exit(1);
  }
}
