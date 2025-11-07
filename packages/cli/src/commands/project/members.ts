/**
 * @fileType: command
 * @status: current
 * @updated: 2025-11-07
 * @tags: [project, members, cli, task-023]
 * @related: [index.ts, projects-client.ts]
 * @priority: high
 * @complexity: medium
 * @dependencies: [commander, chalk, cli-table3, ora]
 */

/**
 * Project Members Commands (TASK-023)
 *
 * Add, remove, and list project members
 */

import chalk from 'chalk';
import ora from 'ora';
import Table from 'cli-table3';
import { ProjectsClient } from '../../lib/api/projects-client.js';

interface AddMemberOptions {
  role?: 'owner' | 'member';
}

/**
 * Add a member to a project
 */
export async function addMemberCommand(
  projectIdOrName: string,
  githubUsername: string,
  options: AddMemberOptions
): Promise<void> {
  const spinner = ora(`Adding ${githubUsername} to project...`).start();

  try {
    const response = await ProjectsClient.addMember(projectIdOrName, {
      github_username: githubUsername,
      role: options.role || 'member',
    });

    if (response.error) {
      spinner.fail(chalk.red('Failed to add member'));
      console.error(chalk.red(`  ${response.error}`));
      process.exit(1);
    }

    const member = response.data!;
    const role = member.role === 'owner' ? chalk.yellow('owner') : 'member';

    spinner.succeed(chalk.green('Member added'));
    console.log('');
    console.log(chalk.bold(`  ${githubUsername}`));
    console.log(chalk.dim(`  Role: ${role}`));
    console.log(chalk.dim(`  User ID: ${member.user_id}`));
    console.log('');
    console.log(chalk.dim('💡 View all members:'));
    console.log(chalk.dim(`  ginko project list-members ${projectIdOrName}`));
  } catch (error: any) {
    spinner.fail(chalk.red('Failed to add member'));
    console.error(chalk.red(`  ${error.message}`));
    process.exit(1);
  }
}

/**
 * Remove a member from a project
 */
export async function removeMemberCommand(
  projectIdOrName: string,
  githubUsernameOrUserId: string
): Promise<void> {
  const spinner = ora(`Removing ${githubUsernameOrUserId} from project...`).start();

  try {
    // First, list members to find the user ID if username was provided
    const membersResponse = await ProjectsClient.listMembers(projectIdOrName);

    if (membersResponse.error) {
      spinner.fail(chalk.red('Failed to load project members'));
      console.error(chalk.red(`  ${membersResponse.error}`));
      process.exit(1);
    }

    const members = membersResponse.data!.members;
    const member = members.find(
      (m) =>
        m.user_id === githubUsernameOrUserId ||
        m.github_username === githubUsernameOrUserId ||
        m.email === githubUsernameOrUserId
    );

    if (!member) {
      spinner.fail(chalk.red('Member not found'));
      console.error(chalk.red(`  No member found with identifier: ${githubUsernameOrUserId}`));
      process.exit(1);
    }

    // Remove member
    const response = await ProjectsClient.removeMember(projectIdOrName, member.user_id);

    if (response.error) {
      spinner.fail(chalk.red('Failed to remove member'));
      console.error(chalk.red(`  ${response.error}`));
      process.exit(1);
    }

    spinner.succeed(chalk.green('Member removed'));
    console.log('');
    console.log(chalk.dim(`  ${githubUsernameOrUserId} has been removed from the project`));
  } catch (error: any) {
    spinner.fail(chalk.red('Failed to remove member'));
    console.error(chalk.red(`  ${error.message}`));
    process.exit(1);
  }
}

/**
 * List project members
 */
export async function listMembersCommand(projectIdOrName: string): Promise<void> {
  const spinner = ora('Loading project members...').start();

  try {
    const response = await ProjectsClient.listMembers(projectIdOrName);

    if (response.error) {
      spinner.fail(chalk.red('Failed to load members'));
      console.error(chalk.red(`  ${response.error}`));
      process.exit(1);
    }

    const members = response.data!.members;

    spinner.succeed(chalk.green(`Found ${members.length} member${members.length !== 1 ? 's' : ''}`));
    console.log('');

    if (members.length === 0) {
      console.log(chalk.yellow('No members found'));
      return;
    }

    // Display table
    const table = new Table({
      head: [
        chalk.cyan('Username'),
        chalk.cyan('Email'),
        chalk.cyan('Role'),
        chalk.cyan('Joined'),
      ],
      colWidths: [25, 30, 10, 15],
      wordWrap: true,
    });

    members.forEach((member) => {
      const username = member.github_username || '-';
      const email = member.email || '-';
      const role = member.role === 'owner' ? chalk.yellow('owner') : 'member';
      const joined = new Date(member.joined_at).toLocaleDateString();

      table.push([username, email, role, joined]);
    });

    console.log(table.toString());
    console.log('');
    console.log(chalk.dim('💡 Manage members:'));
    console.log(chalk.dim(`  ginko project add-member ${projectIdOrName} <github-username>`));
    console.log(chalk.dim(`  ginko project remove-member ${projectIdOrName} <github-username>`));
  } catch (error: any) {
    spinner.fail(chalk.red('Failed to load members'));
    console.error(chalk.red(`  ${error.message}`));
    process.exit(1);
  }
}
