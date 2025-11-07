/**
 * @fileType: command
 * @status: current
 * @updated: 2025-11-07
 * @tags: [team, cli, task-023]
 * @related: [project/index.ts, knowledge/index.ts]
 * @priority: high
 * @complexity: medium
 * @dependencies: [commander, chalk]
 */

/**
 * Team Commands (TASK-023)
 *
 * CLI commands for team management that integrate with the Team Management API
 */

import { Command } from 'commander';
import chalk from 'chalk';
import { createTeamCommand } from './create.js';
import { listTeamsCommand } from './list.js';
import { addTeamMemberCommand, removeTeamMemberCommand, listTeamMembersCommand } from './members.js';
import { addTeamToProjectCommand, removeTeamFromProjectCommand } from './projects.js';

/**
 * Main team command with subcommands
 */
export function teamManagementCommand() {
  const team = new Command('teams')
    .description('Manage teams for collaborative knowledge graphs')
    .showHelpAfterError('(use --help for additional information)')
    .addHelpText(
      'after',
      `
${chalk.gray('Quick Start:')}
  ${chalk.green('ginko login')}                                     ${chalk.gray('# Authenticate first')}
  ${chalk.green('ginko teams create')} engineering                  ${chalk.gray('# Create team')}
  ${chalk.green('ginko teams list')}                                ${chalk.gray('# List teams')}

${chalk.gray('Usage Examples:')}
  ${chalk.green('ginko teams create')} engineering
  ${chalk.green('ginko teams add-member')} engineering alice --role=owner
  ${chalk.green('ginko teams add-to-project')} engineering my-app
  ${chalk.green('ginko teams list-members')} engineering
  ${chalk.green('ginko teams remove-from-project')} engineering my-app

${chalk.gray('Features:')}
  ${chalk.cyan('👥 Team Management')}    - Create and organize teams
  ${chalk.cyan('🔐 Access Control')}     - Grant team access to projects
  ${chalk.cyan('🚀 Collaboration')}      - Share knowledge across teams
  ${chalk.cyan('⚡ Bulk Permissions')}   - Add/remove team members at once

${chalk.gray('Learn More:')}
  ${chalk.dim('https://docs.ginko.ai/teams')}
`
    )
    .action(() => {
      // When called without subcommand, show help
      team.help({ error: false });
    });

  // Create command
  team
    .command('create <name>')
    .description('Create a new team')
    .action(async (name) => {
      await createTeamCommand(name);
    });

  // List command
  team
    .command('list')
    .description('List your teams')
    .action(async () => {
      await listTeamsCommand();
    });

  // Add member command
  team
    .command('add-member <team> <github-username>')
    .description('Add a member to a team')
    .option('--role <role>', 'Member role (owner|member)', 'member')
    .action(async (teamId, githubUsername, options) => {
      await addTeamMemberCommand(teamId, githubUsername, options);
    });

  // Remove member command
  team
    .command('remove-member <team> <github-username>')
    .description('Remove a member from a team')
    .action(async (teamId, githubUsername) => {
      await removeTeamMemberCommand(teamId, githubUsername);
    });

  // List members command
  team
    .command('list-members <team>')
    .description('List team members')
    .action(async (teamId) => {
      await listTeamMembersCommand(teamId);
    });

  // Add to project command
  team
    .command('add-to-project <team> <project>')
    .description('Grant a team access to a project')
    .action(async (teamIdOrName, projectIdOrName) => {
      await addTeamToProjectCommand(teamIdOrName, projectIdOrName);
    });

  // Remove from project command
  team
    .command('remove-from-project <team> <project>')
    .description('Revoke team access from a project')
    .action(async (teamIdOrName, projectIdOrName) => {
      await removeTeamFromProjectCommand(teamIdOrName, projectIdOrName);
    });

  return team;
}

// Export for use in main CLI
export default teamManagementCommand;
