/**
 * @fileType: command
 * @status: current
 * @updated: 2025-11-07
 * @tags: [project, info, cli, task-023]
 * @related: [index.ts, projects-client.ts]
 * @priority: high
 * @complexity: medium
 * @dependencies: [commander, chalk, cli-table3, ora]
 */

/**
 * Project Info Command (TASK-023)
 *
 * Display detailed project information including members and teams
 */

import chalk from 'chalk';
import ora from 'ora';
import Table from 'cli-table3';
import { ProjectsClient } from '../../lib/api/projects-client.js';

/**
 * Show detailed project information
 */
export async function infoProjectCommand(projectIdOrName: string): Promise<void> {
  const spinner = ora('Loading project details...').start();

  try {
    // Fetch project details
    const projectResponse = await ProjectsClient.get(projectIdOrName);

    if (projectResponse.error) {
      spinner.fail(chalk.red('Failed to load project'));
      console.error(chalk.red(`  ${projectResponse.error}`));
      process.exit(1);
    }

    const project = projectResponse.data!;

    // Fetch members
    const membersResponse = await ProjectsClient.listMembers(projectIdOrName);
    const members = membersResponse.data?.members || [];

    spinner.succeed(chalk.green('Project details loaded'));
    console.log('');

    // Project information
    console.log(chalk.bold.cyan('Project Information'));
    console.log('');
    console.log(chalk.bold(`  ${project.name}`));
    console.log(chalk.dim(`  ID: ${project.id}`));
    console.log(chalk.dim(`  Visibility: ${project.visibility}`));
    console.log(chalk.dim(`  Discoverable: ${project.discoverable ? 'Yes' : 'No'}`));

    if (project.github_repo_url) {
      console.log(chalk.dim(`  Repository: ${project.github_repo_url}`));
    }

    if (project.description) {
      console.log(chalk.dim(`  Description: ${project.description}`));
    }

    console.log(chalk.dim(`  Created: ${new Date(project.created_at).toLocaleDateString()}`));
    console.log(chalk.dim(`  Updated: ${new Date(project.updated_at).toLocaleDateString()}`));
    console.log('');

    // Statistics
    console.log(chalk.bold.cyan('Statistics'));
    console.log('');
    console.log(chalk.dim(`  Knowledge Nodes: ${project.node_count || 0}`));
    console.log(chalk.dim(`  Members: ${project.member_count || 0}`));
    console.log(chalk.dim(`  Teams: ${project.team_count || 0}`));
    console.log('');

    // Members table
    if (members.length > 0) {
      console.log(chalk.bold.cyan('Members'));
      console.log('');

      const table = new Table({
        head: [chalk.cyan('Username'), chalk.cyan('Role'), chalk.cyan('Joined')],
        colWidths: [30, 12, 20],
        wordWrap: true,
      });

      members.forEach((member) => {
        const username = member.github_username || member.email || member.user_id;
        const role = member.role === 'owner' ? chalk.yellow('owner') : 'member';
        const joined = new Date(member.joined_at).toLocaleDateString();

        table.push([username, role, joined]);
      });

      console.log(table.toString());
      console.log('');
    }

    // Next steps
    console.log(chalk.dim('💡 Manage project:'));
    console.log(chalk.dim(`  ginko project add-member ${project.name} <github-username>`));
    console.log(chalk.dim(`  ginko project update ${project.name} --description "..."`));
    console.log(chalk.dim(`  ginko knowledge sync --project ${project.id}`));
  } catch (error: any) {
    spinner.fail(chalk.red('Failed to load project details'));
    console.error(chalk.red(`  ${error.message}`));
    process.exit(1);
  }
}
