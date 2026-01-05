/**
 * @fileType: command
 * @status: current
 * @updated: 2026-01-05
 * @tags: [join, team, collaboration, epic-008, onboarding-optimization]
 * @related: [../invite/index.ts, ../team/index.ts, ../sync/sync-command.ts]
 * @priority: high
 * @complexity: medium
 * @dependencies: [commander, chalk, ora, prompts]
 */

/**
 * Join Command (EPIC-008 Sprint 1)
 *
 * CLI command for users to join a team via invitation code.
 * Automatically syncs team context after successful join (e008_s03_t03).
 */

import { Command } from 'commander';
import chalk from 'chalk';
import ora from 'ora';
import prompts from 'prompts';
import { api } from '../../utils/api-client.js';
import { syncCommand } from '../sync/sync-command.js';

interface InvitationPreview {
  valid: boolean;
  invitation: {
    code: string;
    email: string;
    role: string;
    expires_at: string;
    is_for_current_user: boolean;
  };
  team: {
    id: string;
    name: string;
    created_at: string;
  };
  already_member: boolean;
  current_role?: string;
}

interface JoinResponse {
  success: boolean;
  message: string;
  membership: {
    team_id: string;
    team_name: string;
    role: string;
    joined_at: string;
  };
  email_matched: boolean;
}

/**
 * Validate and preview invitation
 */
async function previewInvitation(code: string): Promise<InvitationPreview | null> {
  const spinner = ora('Validating invitation code...').start();

  try {
    const response = await api.get<InvitationPreview>(
      `/api/v1/team/join?code=${code}`
    );

    if (response.error) {
      spinner.fail(chalk.red('Invalid invitation code'));
      console.error(chalk.red(`  ${response.error}`));
      return null;
    }

    spinner.succeed(chalk.green('Invitation valid'));
    return response.data!;

  } catch (error: any) {
    spinner.fail(chalk.red('Failed to validate invitation'));
    console.error(chalk.red(`  ${error.message}`));
    return null;
  }
}

/**
 * Accept invitation and join team
 */
async function acceptInvitation(code: string): Promise<void> {
  const spinner = ora('Joining team...').start();

  try {
    const response = await api.post<JoinResponse>('/api/v1/team/join', { code });

    if (response.error) {
      spinner.fail(chalk.red('Failed to join team'));
      console.error(chalk.red(`  ${response.error}`));
      process.exit(1);
    }

    const result = response.data!;
    spinner.succeed(chalk.green(result.message));
    console.log('');
    console.log(chalk.bold(`  Team: ${result.membership.team_name}`));
    console.log(chalk.dim(`  Role: ${result.membership.role}`));
    console.log(chalk.dim(`  Joined: ${new Date(result.membership.joined_at).toLocaleString()}`));

    if (!result.email_matched) {
      console.log('');
      console.log(chalk.yellow('  Note: Invitation was sent to a different email.'));
    }

    // Step 3: Auto-sync team context with elapsed-time indicator (e008_s03_t03)
    console.log(chalk.dim('\nStep 3/3: Syncing team context...'));
    const syncSpinner = ora('Syncing team context... (this may take 10-30s)').start();
    const startTime = Date.now();

    // Update spinner with elapsed time every second
    const updateInterval = setInterval(() => {
      const elapsed = Math.floor((Date.now() - startTime) / 1000);
      syncSpinner.text = `Syncing team context... (${elapsed}s elapsed)`;
    }, 1000);

    try {
      await syncCommand({
        skipMembershipCheck: true, // We just joined, skip membership check
        force: false,
        dryRun: false,
      });
      clearInterval(updateInterval);
      syncSpinner.succeed('Team context synced');
    } catch (syncError: any) {
      clearInterval(updateInterval);
      syncSpinner.warn('Could not auto-sync team context');
      console.log(chalk.dim(`  ${syncError.message || 'Unknown error'}`));
      console.log(chalk.dim('  You can sync manually with: ginko sync'));
    }

    console.log('');
    console.log(chalk.dim('Next steps:'));
    console.log(chalk.green(`  ginko start                ${chalk.dim('# Begin development session')}`));
    console.log(chalk.green(`  ginko teams list-members   ${chalk.dim('# See your teammates')}`));

  } catch (error: any) {
    spinner.fail(chalk.red('Failed to join team'));
    console.error(chalk.red(`  ${error.message}`));
    process.exit(1);
  }
}

/**
 * Interactive join flow (prompts for code)
 */
async function interactiveJoin(): Promise<void> {
  console.log('');
  console.log(chalk.cyan('Join a Team'));
  console.log(chalk.dim('Enter the invitation code you received'));
  console.log('');

  const response = await prompts({
    type: 'text',
    name: 'code',
    message: 'Invitation code:',
    validate: (value: string) => value.length >= 8 || 'Code should be at least 8 characters',
  });

  if (!response.code) {
    console.log(chalk.yellow('Cancelled'));
    return;
  }

  await joinTeam(response.code);
}

/**
 * Main join flow with step indicators (e008_s03_t03)
 */
async function joinTeam(code: string): Promise<void> {
  // Step 1: Validate invitation
  console.log(chalk.dim('\nStep 1/3: Validating invitation...'));
  const preview = await previewInvitation(code);
  if (!preview) {
    process.exit(1);
  }

  // Check if already a member
  if (preview.already_member) {
    console.log('');
    console.log(chalk.yellow(`You are already a member of "${preview.team.name}"`));
    console.log(chalk.dim(`  Current role: ${preview.current_role}`));
    process.exit(0);
  }

  // Show preview
  console.log('');
  console.log(chalk.bold('Invitation Details:'));
  console.log(`  Team: ${chalk.cyan(preview.team.name)}`);
  console.log(`  Role: ${chalk.cyan(preview.invitation.role)}`);
  console.log(`  Expires: ${new Date(preview.invitation.expires_at).toLocaleDateString()}`);

  if (!preview.invitation.is_for_current_user) {
    console.log('');
    console.log(chalk.yellow(`  Note: This invitation was sent to ${preview.invitation.email}`));
    console.log(chalk.dim('  You can still accept it with your current account.'));
  }

  console.log('');

  // Confirm
  const confirm = await prompts({
    type: 'confirm',
    name: 'accept',
    message: `Join team "${preview.team.name}" as ${preview.invitation.role}?`,
    initial: true,
  });

  if (!confirm.accept) {
    console.log(chalk.yellow('Cancelled'));
    return;
  }

  // Step 2: Join team
  console.log(chalk.dim('\nStep 2/3: Joining team...'));
  await acceptInvitation(code);
  // Note: Step 3 (syncing) is handled inside acceptInvitation
}

/**
 * Main join command
 */
export function joinCommand() {
  const join = new Command('join')
    .description('Join a team using an invitation code')
    .showHelpAfterError('(use --help for additional information)')
    .addHelpText(
      'after',
      `
${chalk.gray('Usage:')}
  ${chalk.green('ginko join')} <invite-code>    ${chalk.gray('# Join via invitation code')}
  ${chalk.green('ginko join')}                  ${chalk.gray('# Interactive: prompts for code')}

${chalk.gray('Workflow:')}
  1. Receive invitation code from a team owner
  2. Run: ${chalk.green('ginko join')} <code>
  3. Confirm to accept invitation
  4. Run: ${chalk.green('ginko sync')} to pull team context

${chalk.gray('Example:')}
  ${chalk.green('ginko join')} a1b2c3d4e5f6
`
    )
    .argument('[code]', 'Invitation code')
    .option('-y, --yes', 'Skip confirmation prompt')
    .action(async (code, options) => {
      if (code) {
        if (options.yes) {
          // Skip preview confirmation
          await acceptInvitation(code);
        } else {
          await joinTeam(code);
        }
      } else {
        await interactiveJoin();
      }
    });

  return join;
}

export default joinCommand;
