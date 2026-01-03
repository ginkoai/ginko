/**
 * @fileType: command
 * @status: current
 * @updated: 2026-01-03
 * @tags: [invite, team, collaboration, epic-008]
 * @related: [../join/index.ts, ../team/index.ts]
 * @priority: high
 * @complexity: medium
 * @dependencies: [commander, chalk, ora]
 */

/**
 * Invite Command (EPIC-008 Sprint 1)
 *
 * CLI command for team owners/admins to invite members via email
 */

import { Command } from 'commander';
import chalk from 'chalk';
import ora from 'ora';
import Table from 'cli-table3';
import { api } from '../../utils/api-client.js';

interface Invitation {
  code: string;
  email: string;
  role: string;
  status: string;
  expires_at: string;
  team_name?: string;
  inviter?: {
    email: string;
    github_username?: string;
  };
}

interface CreateInviteResponse {
  success: boolean;
  invitation: Invitation & { team_name: string };
}

interface ListInvitesResponse {
  invitations: Invitation[];
  count: number;
}

/**
 * Send invitation to join a team
 */
async function sendInvite(
  email: string,
  options: { team?: string; role?: string }
): Promise<void> {
  const spinner = ora('Sending invitation...').start();

  try {
    // Get team ID - if not provided, use current project's default team
    let teamId = options.team;

    if (!teamId) {
      // Try to get team from current project context
      const teamsResponse = await api.get<{ teams: Array<{ id: string; name: string }> }>(
        '/api/v1/teams?limit=1'
      );

      if (teamsResponse.error || !teamsResponse.data?.teams?.length) {
        spinner.fail(chalk.red('No team specified and no default team found'));
        console.log('');
        console.log(chalk.dim('Usage: ginko invite <email> --team <team-id>'));
        console.log(chalk.dim('       ginko teams list   # to see available teams'));
        process.exit(1);
      }

      teamId = teamsResponse.data.teams[0].id;
    }

    const response = await api.post<CreateInviteResponse>('/api/v1/team/invite', {
      team_id: teamId,
      email: email.toLowerCase(),
      role: options.role || 'member',
    });

    if (response.error) {
      spinner.fail(chalk.red('Failed to send invitation'));
      console.error(chalk.red(`  ${response.error}`));
      process.exit(1);
    }

    const invitation = response.data!.invitation;
    spinner.succeed(chalk.green('Invitation sent'));
    console.log('');
    console.log(chalk.bold(`  Invited: ${invitation.email}`));
    console.log(chalk.dim(`  Team: ${invitation.team_name}`));
    console.log(chalk.dim(`  Role: ${invitation.role}`));
    console.log(chalk.dim(`  Expires: ${new Date(invitation.expires_at).toLocaleDateString()}`));
    console.log('');
    console.log(chalk.cyan(`  Invite code: ${invitation.code}`));
    console.log('');
    console.log(chalk.dim('Share this code with the invitee to join:'));
    console.log(chalk.green(`  ginko join ${invitation.code}`));

  } catch (error: any) {
    spinner.fail(chalk.red('Failed to send invitation'));
    console.error(chalk.red(`  ${error.message}`));
    process.exit(1);
  }
}

/**
 * List pending invitations for a team
 */
async function listInvites(options: { team?: string }): Promise<void> {
  const spinner = ora('Loading invitations...').start();

  try {
    let teamId = options.team;

    if (!teamId) {
      // Get first team
      const teamsResponse = await api.get<{ teams: Array<{ id: string }> }>(
        '/api/v1/teams?limit=1'
      );

      if (teamsResponse.error || !teamsResponse.data?.teams?.length) {
        spinner.fail(chalk.red('No team specified and no default team found'));
        process.exit(1);
      }

      teamId = teamsResponse.data.teams[0].id;
    }

    const response = await api.get<ListInvitesResponse>(
      `/api/v1/team/invite?team_id=${teamId}`
    );

    if (response.error) {
      spinner.fail(chalk.red('Failed to load invitations'));
      console.error(chalk.red(`  ${response.error}`));
      process.exit(1);
    }

    const invitations = response.data!.invitations;

    if (invitations.length === 0) {
      spinner.succeed(chalk.yellow('No pending invitations'));
      return;
    }

    spinner.succeed(chalk.green(`Found ${invitations.length} pending invitation(s)`));
    console.log('');

    const table = new Table({
      head: [
        chalk.cyan('Email'),
        chalk.cyan('Role'),
        chalk.cyan('Code'),
        chalk.cyan('Expires'),
      ],
      colWidths: [30, 10, 15, 15],
      wordWrap: true,
    });

    invitations.forEach((inv) => {
      table.push([
        inv.email,
        inv.role,
        inv.code,
        new Date(inv.expires_at).toLocaleDateString(),
      ]);
    });

    console.log(table.toString());

  } catch (error: any) {
    spinner.fail(chalk.red('Failed to load invitations'));
    console.error(chalk.red(`  ${error.message}`));
    process.exit(1);
  }
}

/**
 * Revoke a pending invitation
 */
async function revokeInvite(code: string): Promise<void> {
  const spinner = ora('Revoking invitation...').start();

  try {
    const response = await api.delete<{ success: boolean; message: string }>(
      '/api/v1/team/invite',
      { code }
    );

    if (response.error) {
      spinner.fail(chalk.red('Failed to revoke invitation'));
      console.error(chalk.red(`  ${response.error}`));
      process.exit(1);
    }

    spinner.succeed(chalk.green('Invitation revoked'));

  } catch (error: any) {
    spinner.fail(chalk.red('Failed to revoke invitation'));
    console.error(chalk.red(`  ${error.message}`));
    process.exit(1);
  }
}

/**
 * Main invite command with subcommands
 */
export function inviteCommand() {
  const invite = new Command('invite')
    .description('Invite collaborators to join your team')
    .showHelpAfterError('(use --help for additional information)')
    .addHelpText(
      'after',
      `
${chalk.gray('Quick Start:')}
  ${chalk.green('ginko invite')} user@example.com              ${chalk.gray('# Invite as member')}
  ${chalk.green('ginko invite')} user@example.com --role owner ${chalk.gray('# Invite as owner')}

${chalk.gray('Management:')}
  ${chalk.green('ginko invite --list')}                        ${chalk.gray('# List pending invitations')}
  ${chalk.green('ginko invite --revoke')} <code>               ${chalk.gray('# Cancel invitation')}

${chalk.gray('Options:')}
  --team <id>     ${chalk.dim('Team to invite to (defaults to your first team)')}
  --role <role>   ${chalk.dim('Role to assign: owner, admin, member (default: member)')}

${chalk.gray('Workflow:')}
  1. ${chalk.green('ginko invite')} collaborator@example.com
  2. Share the invite code with them
  3. They run: ${chalk.green('ginko join')} <code>
`
    )
    .argument('[email]', 'Email address to invite')
    .option('-t, --team <id>', 'Team ID to invite to')
    .option('-r, --role <role>', 'Role to assign (owner|admin|member)', 'member')
    .option('-l, --list', 'List pending invitations')
    .option('--revoke <code>', 'Revoke an invitation by code')
    .action(async (email, options) => {
      if (options.list) {
        await listInvites({ team: options.team });
      } else if (options.revoke) {
        await revokeInvite(options.revoke);
      } else if (email) {
        await sendInvite(email, { team: options.team, role: options.role });
      } else {
        invite.help({ error: false });
      }
    });

  return invite;
}

export default inviteCommand;
