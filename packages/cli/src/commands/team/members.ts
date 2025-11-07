/**
 * @fileType: command
 * @status: current
 * @updated: 2025-11-07
 * @tags: [team, members, cli, task-023]
 * @related: [index.ts, teams-client.ts]
 * @priority: high
 * @complexity: medium
 * @dependencies: [commander, chalk, cli-table3, ora]
 */

/**
 * Team Members Commands (TASK-023)
 *
 * Add, remove, and list team members
 */

import chalk from 'chalk';
import ora from 'ora';
import Table from 'cli-table3';
import { TeamsClient } from '../../lib/api/teams-client.js';

interface AddMemberOptions {
  role?: 'owner' | 'member';
}

/**
 * Add a member to a team
 */
export async function addTeamMemberCommand(
  teamId: string,
  githubUsername: string,
  options: AddMemberOptions
): Promise<void> {
  const spinner = ora(`Adding ${githubUsername} to team...`).start();

  try {
    const response = await TeamsClient.addMember(teamId, {
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
    console.log(chalk.dim(`  ginko team list-members ${teamId}`));
  } catch (error: any) {
    spinner.fail(chalk.red('Failed to add member'));
    console.error(chalk.red(`  ${error.message}`));
    process.exit(1);
  }
}

/**
 * Remove a member from a team
 */
export async function removeTeamMemberCommand(
  teamId: string,
  githubUsernameOrUserId: string
): Promise<void> {
  const spinner = ora(`Removing ${githubUsernameOrUserId} from team...`).start();

  try {
    // First, list members to find the user ID if username was provided
    const membersResponse = await TeamsClient.listMembers(teamId);

    if (membersResponse.error) {
      spinner.fail(chalk.red('Failed to load team members'));
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
    const response = await TeamsClient.removeMember(teamId, member.user_id);

    if (response.error) {
      spinner.fail(chalk.red('Failed to remove member'));
      console.error(chalk.red(`  ${response.error}`));
      process.exit(1);
    }

    spinner.succeed(chalk.green('Member removed'));
    console.log('');
    console.log(chalk.dim(`  ${githubUsernameOrUserId} has been removed from the team`));
  } catch (error: any) {
    spinner.fail(chalk.red('Failed to remove member'));
    console.error(chalk.red(`  ${error.message}`));
    process.exit(1);
  }
}

/**
 * List team members
 */
export async function listTeamMembersCommand(teamId: string): Promise<void> {
  const spinner = ora('Loading team members...').start();

  try {
    const response = await TeamsClient.listMembers(teamId);

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
      head: [chalk.cyan('Username'), chalk.cyan('Email'), chalk.cyan('Role'), chalk.cyan('Joined')],
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
    console.log(chalk.dim(`  ginko team add-member ${teamId} <github-username>`));
    console.log(chalk.dim(`  ginko team remove-member ${teamId} <github-username>`));
  } catch (error: any) {
    spinner.fail(chalk.red('Failed to load members'));
    console.error(chalk.red(`  ${error.message}`));
    process.exit(1);
  }
}
