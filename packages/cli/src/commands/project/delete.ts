/**
 * @fileType: command
 * @status: current
 * @updated: 2025-11-07
 * @tags: [project, delete, cli, task-023]
 * @related: [index.ts, projects-client.ts]
 * @priority: high
 * @complexity: medium
 * @dependencies: [commander, chalk, ora, prompts]
 */

/**
 * Delete Project Command (TASK-023)
 *
 * Delete a project (with confirmation)
 */

import chalk from 'chalk';
import ora from 'ora';
import prompts from 'prompts';
import { ProjectsClient } from '../../lib/api/projects-client.js';

interface DeleteOptions {
  force?: boolean;
}

/**
 * Delete a project
 */
export async function deleteProjectCommand(
  projectIdOrName: string,
  options: DeleteOptions
): Promise<void> {
  try {
    // Fetch project details first
    const projectResponse = await ProjectsClient.get(projectIdOrName);

    if (projectResponse.error) {
      console.error(chalk.red('❌ Failed to load project'));
      console.error(chalk.red(`  ${projectResponse.error}`));
      process.exit(1);
    }

    const project = projectResponse.data!;

    // Confirmation prompt (unless --force)
    if (!options.force) {
      console.log(chalk.yellow('⚠️  You are about to delete a project:'));
      console.log('');
      console.log(chalk.bold(`  ${project.name}`));
      console.log(chalk.dim(`  ID: ${project.id}`));
      console.log(chalk.dim(`  Nodes: ${project.node_count || 0}`));
      console.log(chalk.dim(`  Members: ${project.member_count || 0}`));
      console.log('');
      console.log(chalk.red('⚠️  This action cannot be undone!'));
      console.log('');

      const response = await prompts({
        type: 'confirm',
        name: 'confirmed',
        message: `Type "${project.name}" to confirm deletion:`,
        initial: false,
      });

      if (!response.confirmed) {
        console.log(chalk.dim('Deletion cancelled'));
        process.exit(0);
      }
    }

    const spinner = ora('Deleting project...').start();

    // Delete project
    const deleteResponse = await ProjectsClient.delete(projectIdOrName);

    if (deleteResponse.error) {
      spinner.fail(chalk.red('Failed to delete project'));
      console.error(chalk.red(`  ${deleteResponse.error}`));
      process.exit(1);
    }

    spinner.succeed(chalk.green('Project deleted'));
    console.log('');
    console.log(chalk.dim(`  ${project.name} has been permanently deleted`));
  } catch (error: any) {
    console.error(chalk.red('❌ Failed to delete project'));
    console.error(chalk.red(`  ${error.message}`));
    process.exit(1);
  }
}
