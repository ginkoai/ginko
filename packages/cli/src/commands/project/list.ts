/**
 * @fileType: command
 * @status: current
 * @updated: 2025-11-07
 * @tags: [project, list, cli, task-023]
 * @related: [index.ts, projects-client.ts]
 * @priority: high
 * @complexity: medium
 * @dependencies: [commander, chalk, cli-table3, ora]
 */

/**
 * List Projects Command (TASK-023)
 *
 * List all projects the user has access to
 */

import chalk from 'chalk';
import ora from 'ora';
import Table from 'cli-table3';
import { ProjectsClient, ListProjectsOptions } from '../../lib/api/projects-client.js';

interface ListOptions {
  visibility?: 'public' | 'private';
  limit?: number;
}

/**
 * List user's projects
 */
export async function listProjectsCommand(options: ListOptions): Promise<void> {
  const spinner = ora('Loading projects...').start();

  try {
    // Build query options
    const queryOptions: ListProjectsOptions = {};

    if (options.visibility) {
      queryOptions.visibility = options.visibility;
    }

    if (options.limit) {
      queryOptions.limit = options.limit;
    }

    // Fetch projects
    const response = await ProjectsClient.list(queryOptions);

    if (response.error) {
      spinner.fail(chalk.red('Failed to load projects'));
      console.error(chalk.red(`  ${response.error}`));
      process.exit(1);
    }

    const projects = response.data!.projects;

    spinner.succeed(chalk.green(`Found ${projects.length} project${projects.length !== 1 ? 's' : ''}`));
    console.log('');

    if (projects.length === 0) {
      console.log(chalk.yellow('No projects found'));
      console.log(chalk.dim('💡 Create your first project:'));
      console.log(chalk.dim('  ginko project create <name>'));
      return;
    }

    // Display table
    const table = new Table({
      head: [
        chalk.cyan('Name'),
        chalk.cyan('Visibility'),
        chalk.cyan('Nodes'),
        chalk.cyan('Members'),
        chalk.cyan('Teams'),
      ],
      colWidths: [30, 12, 8, 10, 8],
      wordWrap: true,
    });

    projects.forEach((project) => {
      table.push([
        project.name.length > 27 ? project.name.substring(0, 24) + '...' : project.name,
        project.visibility === 'public' ? chalk.green('public') : chalk.dim('private'),
        project.node_count?.toString() || '0',
        project.member_count?.toString() || '0',
        project.team_count?.toString() || '0',
      ]);
    });

    console.log(table.toString());
    console.log('');
    console.log(chalk.dim('💡 View project details:'));
    console.log(chalk.dim('  ginko project info <name>'));
  } catch (error: any) {
    spinner.fail(chalk.red('Failed to load projects'));
    console.error(chalk.red(`  ${error.message}`));
    process.exit(1);
  }
}
