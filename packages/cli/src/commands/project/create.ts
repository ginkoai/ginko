/**
 * @fileType: command
 * @status: current
 * @updated: 2025-11-07
 * @tags: [project, create, cli, task-023]
 * @related: [index.ts, projects-client.ts]
 * @priority: high
 * @complexity: medium
 * @dependencies: [commander, chalk, ora]
 */

/**
 * Create Project Command (TASK-023)
 *
 * Create a new project in the knowledge graph
 */

import chalk from 'chalk';
import ora from 'ora';
import { ProjectsClient, CreateProjectRequest } from '../../lib/api/projects-client.js';

interface CreateOptions {
  repo?: string;
  public?: boolean;
  discoverable?: boolean;
  description?: string;
}

/**
 * Create a new project
 */
export async function createProjectCommand(name: string, options: CreateOptions): Promise<void> {
  const spinner = ora('Creating project...').start();

  try {
    // Build request
    const request: CreateProjectRequest = {
      name,
      visibility: options.public ? 'public' : 'private',
      discoverable: options.discoverable ?? false,
    };

    if (options.description) {
      request.description = options.description;
    }

    if (options.repo) {
      request.github_repo_url = options.repo;
    }

    // Create project
    const response = await ProjectsClient.create(request);

    if (response.error) {
      spinner.fail(chalk.red('Failed to create project'));
      console.error(chalk.red(`  ${response.error}`));
      process.exit(1);
    }

    const project = response.data!;

    spinner.succeed(chalk.green('Created project'));
    console.log('');
    console.log(chalk.bold(`  ${project.name}`));
    console.log(chalk.dim(`  ID: ${project.id}`));
    console.log(chalk.dim(`  Visibility: ${project.visibility}`));
    console.log(chalk.dim(`  Discoverable: ${project.discoverable ? 'Yes' : 'No'}`));
    console.log(chalk.dim(`  Role: owner`));

    if (project.github_repo_url) {
      console.log(chalk.dim(`  Repository: ${project.github_repo_url}`));
    }

    if (project.description) {
      console.log(chalk.dim(`  Description: ${project.description}`));
    }

    console.log('');
    console.log(chalk.dim('💡 Next steps:'));
    console.log(chalk.dim(`  ginko project add-member ${project.name} <github-username>`));
    console.log(chalk.dim(`  ginko knowledge sync --project ${project.id}`));
  } catch (error: any) {
    spinner.fail(chalk.red('Failed to create project'));
    console.error(chalk.red(`  ${error.message}`));
    process.exit(1);
  }
}
