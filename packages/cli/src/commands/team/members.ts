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
 * Resolve team name or ID to team ID
 * Accepts either UUID or team name
 */
async function resolveTeamId(teamIdOrName: string): Promise<{ teamId: string; teamName: string } | null> {
  // If it looks like a UUID, return as-is
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  if (uuidRegex.test(teamIdOrName)) {
    // Verify team exists and get name
    const response = await TeamsClient.get(teamIdOrName);
    if (response.data) {
      return { teamId: teamIdOrName, teamName: response.data.name };
    }
    return null;
  }

  // Otherwise, look up by name
  const response = await TeamsClient.list();
  if (response.error || !response.data?.teams) {
    return null;
  }

  // Find team by name (case-insensitive)
  const team = response.data.teams.find(
    (t) => t.name.toLowerCase() === teamIdOrName.toLowerCase()
  );

  if (team) {
    return { teamId: team.id, teamName: team.name };
  }

  return null;
}

/**
 * Add a member to a team
 */
export async function addTeamMemberCommand(
  teamIdOrName: string,
  githubUsername: string,
  options: AddMemberOptions
): Promise<void> {
  const spinner = ora(`Adding ${githubUsername} to team...`).start();

  try {
    // Resolve team name to ID
    const resolved = await resolveTeamId(teamIdOrName);
    if (!resolved) {
      spinner.fail(chalk.red('Team not found'));
      console.error(chalk.red(`  No team found with name or ID: ${teamIdOrName}`));
      console.log('');
      console.log(chalk.dim('💡 List available teams:'));
      console.log(chalk.dim('  ginko teams list'));
      process.exit(1);
    }

    const { teamId, teamName } = resolved;
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
    console.log(chalk.dim(`  Team: ${teamName}`));
    console.log('');
    console.log(chalk.dim('💡 View all members:'));
    console.log(chalk.dim(`  ginko teams list-members ${teamName}`));
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
  teamIdOrName: string,
  githubUsernameOrUserId: string
): Promise<void> {
  const spinner = ora(`Removing ${githubUsernameOrUserId} from team...`).start();

  try {
    // Resolve team name to ID
    const resolved = await resolveTeamId(teamIdOrName);
    if (!resolved) {
      spinner.fail(chalk.red('Team not found'));
      console.error(chalk.red(`  No team found with name or ID: ${teamIdOrName}`));
      console.log('');
      console.log(chalk.dim('💡 List available teams:'));
      console.log(chalk.dim('  ginko teams list'));
      process.exit(1);
    }

    const { teamId, teamName } = resolved;

    // List members to find the user ID if username was provided
    const membersResponse = await TeamsClient.listMembers(teamId);

    if (membersResponse.error) {
      spinner.fail(chalk.red('Failed to load team members'));
      console.error(chalk.red(`  ${membersResponse.error}`));
      process.exit(1);
    }

    const members = membersResponse.data!.members;
    const member = members.find(
      (m: any) =>
        m.user_id === githubUsernameOrUserId ||
        m.user?.github_username === githubUsernameOrUserId ||
        m.github_username === githubUsernameOrUserId ||
        m.user?.email === githubUsernameOrUserId ||
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
    console.log(chalk.dim(`  ${githubUsernameOrUserId} has been removed from ${teamName}`));
  } catch (error: any) {
    spinner.fail(chalk.red('Failed to remove member'));
    console.error(chalk.red(`  ${error.message}`));
    process.exit(1);
  }
}

/**
 * List team members
 */
export async function listTeamMembersCommand(teamIdOrName: string): Promise<void> {
  const spinner = ora('Loading team members...').start();

  try {
    // Resolve team name to ID
    const resolved = await resolveTeamId(teamIdOrName);
    if (!resolved) {
      spinner.fail(chalk.red('Team not found'));
      console.error(chalk.red(`  No team found with name or ID: ${teamIdOrName}`));
      console.log('');
      console.log(chalk.dim('💡 List available teams:'));
      console.log(chalk.dim('  ginko teams list'));
      process.exit(1);
    }

    const { teamId, teamName } = resolved;
    const response = await TeamsClient.listMembers(teamId);

    if (response.error) {
      spinner.fail(chalk.red('Failed to load members'));
      console.error(chalk.red(`  ${response.error}`));
      process.exit(1);
    }

    const members = response.data!.members;

    spinner.succeed(chalk.green(`${teamName}: ${members.length} member${members.length !== 1 ? 's' : ''}`));
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

    members.forEach((member: any) => {
      // Profile data is in nested 'user' object from API
      const username = member.user?.github_username || member.github_username || '-';
      const email = member.user?.email || member.email || '-';
      const role = member.role === 'owner' ? chalk.yellow('owner') : 'member';
      const joined = new Date(member.joined_at).toLocaleDateString();

      table.push([username, email, role, joined]);
    });

    console.log(table.toString());
    console.log('');
    console.log(chalk.dim('💡 Manage members:'));
    console.log(chalk.dim(`  ginko teams add-member ${teamName} <github-username>`));
    console.log(chalk.dim(`  ginko teams remove-member ${teamName} <github-username>`));
  } catch (error: any) {
    spinner.fail(chalk.red('Failed to load members'));
    console.error(chalk.red(`  ${error.message}`));
    process.exit(1);
  }
}
