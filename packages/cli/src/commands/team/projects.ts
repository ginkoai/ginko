/**
 * @fileType: command
 * @status: current
 * @updated: 2025-11-07
 * @tags: [team, projects, cli, task-023]
 * @related: [index.ts, projects-client.ts]
 * @priority: high
 * @complexity: medium
 * @dependencies: [commander, chalk, ora]
 */

/**
 * Team Project Commands (TASK-023)
 *
 * Add and remove teams from projects
 */

import chalk from 'chalk';
import ora from 'ora';
import { ProjectsClient } from '../../lib/api/projects-client.js';
import { TeamsClient } from '../../lib/api/teams-client.js';
import { requireCloud } from '../../utils/cloud-guard.js';

/**
 * Add a team to a project
 */
export async function addTeamToProjectCommand(
  teamIdOrName: string,
  projectIdOrName: string
): Promise<void> {
  await requireCloud('team projects');
  const spinner = ora('Adding team to project...').start();

  try {
    // Resolve team ID if name was provided
    let teamId = teamIdOrName;

    // Check if it's a UUID (team ID) or a name
    if (!teamIdOrName.match(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i)) {
      // It's likely a name, fetch teams to find ID
      const teamsResponse = await TeamsClient.list();

      if (teamsResponse.error) {
        spinner.fail(chalk.red('Failed to resolve team'));
        console.error(chalk.red(`  ${teamsResponse.error}`));
        process.exit(1);
      }

      const team = teamsResponse.data!.teams.find((t) => t.name === teamIdOrName);

      if (!team) {
        spinner.fail(chalk.red('Team not found'));
        console.error(chalk.red(`  No team found with name: ${teamIdOrName}`));
        process.exit(1);
      }

      teamId = team.id;
    }

    // Add team to project
    const response = await ProjectsClient.addTeam(projectIdOrName, teamId);

    if (response.error) {
      spinner.fail(chalk.red('Failed to add team to project'));
      console.error(chalk.red(`  ${response.error}`));
      process.exit(1);
    }

    spinner.succeed(chalk.green('Team added to project'));
    console.log('');
    console.log(chalk.dim(`  Team "${teamIdOrName}" now has access to project "${projectIdOrName}"`));
    console.log('');
    console.log(chalk.dim('💡 View project details:'));
    console.log(chalk.dim(`  ginko project info ${projectIdOrName}`));
  } catch (error: any) {
    spinner.fail(chalk.red('Failed to add team to project'));
    console.error(chalk.red(`  ${error.message}`));
    process.exit(1);
  }
}

/**
 * Remove a team from a project
 */
export async function removeTeamFromProjectCommand(
  teamIdOrName: string,
  projectIdOrName: string
): Promise<void> {
  await requireCloud('team projects');
  const spinner = ora('Removing team from project...').start();

  try {
    // Resolve team ID if name was provided
    let teamId = teamIdOrName;

    // Check if it's a UUID (team ID) or a name
    if (!teamIdOrName.match(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i)) {
      // It's likely a name, fetch teams to find ID
      const teamsResponse = await TeamsClient.list();

      if (teamsResponse.error) {
        spinner.fail(chalk.red('Failed to resolve team'));
        console.error(chalk.red(`  ${teamsResponse.error}`));
        process.exit(1);
      }

      const team = teamsResponse.data!.teams.find((t) => t.name === teamIdOrName);

      if (!team) {
        spinner.fail(chalk.red('Team not found'));
        console.error(chalk.red(`  No team found with name: ${teamIdOrName}`));
        process.exit(1);
      }

      teamId = team.id;
    }

    // Remove team from project
    const response = await ProjectsClient.removeTeam(projectIdOrName, teamId);

    if (response.error) {
      spinner.fail(chalk.red('Failed to remove team from project'));
      console.error(chalk.red(`  ${response.error}`));
      process.exit(1);
    }

    spinner.succeed(chalk.green('Team removed from project'));
    console.log('');
    console.log(chalk.dim(`  Team "${teamIdOrName}" no longer has access to project "${projectIdOrName}"`));
  } catch (error: any) {
    spinner.fail(chalk.red('Failed to remove team from project'));
    console.error(chalk.red(`  ${error.message}`));
    process.exit(1);
  }
}
