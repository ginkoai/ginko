/**
 * @fileType: command
 * @status: current
 * @updated: 2025-11-07
 * @tags: [project, update, cli, task-023]
 * @related: [index.ts, projects-client.ts]
 * @priority: high
 * @complexity: medium
 * @dependencies: [commander, chalk, ora]
 */

/**
 * Update Project Command (TASK-023)
 *
 * Update project settings
 */

import chalk from 'chalk';
import ora from 'ora';
import { ProjectsClient, UpdateProjectRequest } from '../../lib/api/projects-client.js';

interface UpdateOptions {
  name?: string;
  description?: string;
  public?: boolean;
  private?: boolean;
  discoverable?: boolean;
  noDiscoverable?: boolean;
}

/**
 * Update project settings
 */
export async function updateProjectCommand(
  projectIdOrName: string,
  options: UpdateOptions
): Promise<void> {
  // Validate that at least one option is provided
  if (
    !options.name &&
    !options.description &&
    !options.public &&
    !options.private &&
    !options.discoverable &&
    !options.noDiscoverable
  ) {
    console.error(chalk.red('❌ No update options provided'));
    console.error(chalk.dim('   Use at least one of: --name, --description, --public, --private, --discoverable, --no-discoverable'));
    process.exit(1);
  }

  const spinner = ora('Updating project...').start();

  try {
    // Build update request
    const request: UpdateProjectRequest = {};

    if (options.name) {
      request.name = options.name;
    }

    if (options.description) {
      request.description = options.description;
    }

    if (options.public) {
      request.visibility = 'public';
    } else if (options.private) {
      request.visibility = 'private';
    }

    if (options.discoverable) {
      request.discoverable = true;
    } else if (options.noDiscoverable) {
      request.discoverable = false;
    }

    // Update project
    const response = await ProjectsClient.update(projectIdOrName, request);

    if (response.error) {
      spinner.fail(chalk.red('Failed to update project'));
      console.error(chalk.red(`  ${response.error}`));
      process.exit(1);
    }

    const project = response.data!;

    spinner.succeed(chalk.green('Project updated'));
    console.log('');
    console.log(chalk.bold(`  ${project.name}`));
    console.log(chalk.dim(`  ID: ${project.id}`));
    console.log(chalk.dim(`  Visibility: ${project.visibility}`));
    console.log(chalk.dim(`  Discoverable: ${project.discoverable ? 'Yes' : 'No'}`));

    if (project.description) {
      console.log(chalk.dim(`  Description: ${project.description}`));
    }

    console.log('');
    console.log(chalk.dim('💡 View details:'));
    console.log(chalk.dim(`  ginko project info ${project.name}`));
  } catch (error: any) {
    spinner.fail(chalk.red('Failed to update project'));
    console.error(chalk.red(`  ${error.message}`));
    process.exit(1);
  }
}
