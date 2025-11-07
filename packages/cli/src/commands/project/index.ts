/**
 * @fileType: command
 * @status: current
 * @updated: 2025-11-07
 * @tags: [project, cli, task-023]
 * @related: [teams/index.ts, knowledge/index.ts]
 * @priority: high
 * @complexity: medium
 * @dependencies: [commander, chalk]
 */

/**
 * Project Commands (TASK-023)
 *
 * CLI commands for project management that integrate with the Project Management API
 */

import { Command } from 'commander';
import chalk from 'chalk';
import { createProjectCommand } from './create.js';
import { listProjectsCommand } from './list.js';
import { infoProjectCommand } from './info.js';
import { updateProjectCommand } from './update.js';
import { deleteProjectCommand } from './delete.js';
import { addMemberCommand, removeMemberCommand, listMembersCommand } from './members.js';

/**
 * Main project command with subcommands
 */
export function projectCommand() {
  const project = new Command('project')
    .description('Manage projects in your knowledge graph')
    .showHelpAfterError('(use --help for additional information)')
    .addHelpText(
      'after',
      `
${chalk.gray('Quick Start:')}
  ${chalk.green('ginko login')}                                     ${chalk.gray('# Authenticate first')}
  ${chalk.green('ginko project create')} my-app                     ${chalk.gray('# Create project')}
  ${chalk.green('ginko project list')}                              ${chalk.gray('# List projects')}

${chalk.gray('Usage Examples:')}
  ${chalk.green('ginko project create')} my-app --repo=github.com/user/my-app
  ${chalk.green('ginko project list')} --visibility=public
  ${chalk.green('ginko project info')} my-app
  ${chalk.green('ginko project update')} my-app --public --discoverable
  ${chalk.green('ginko project add-member')} my-app alice --role=owner
  ${chalk.green('ginko project list-members')} my-app

${chalk.gray('Features:')}
  ${chalk.cyan('🚀 Project Management')}  - Create and organize knowledge graphs
  ${chalk.cyan('👥 Team Collaboration')}  - Add members and teams to projects
  ${chalk.cyan('🔒 Access Control')}      - Public/private visibility
  ${chalk.cyan('🔍 Discoverability')}     - Opt-in to public catalog
  ${chalk.cyan('📊 GitHub Integration')}  - Link repositories

${chalk.gray('Learn More:')}
  ${chalk.dim('https://docs.ginko.ai/projects')}
`
    )
    .action(() => {
      // When called without subcommand, show help
      project.help({ error: false });
    });

  // Create command
  project
    .command('create <name>')
    .description('Create a new project')
    .option('--repo <url>', 'GitHub repository URL')
    .option('--public', 'Make project public (default: private)')
    .option('--discoverable', 'Allow in public catalog (default: false)')
    .option('--description <text>', 'Project description')
    .action(async (name, options) => {
      await createProjectCommand(name, options);
    });

  // List command
  project
    .command('list')
    .description('List your projects')
    .option('--visibility <type>', 'Filter by visibility (public|private)')
    .option('--limit <number>', 'Maximum results to return', '50')
    .action(async (options) => {
      const limit = parseInt(options.limit, 10);
      await listProjectsCommand({ ...options, limit });
    });

  // Info command
  project
    .command('info <name-or-id>')
    .description('Show project details, members, and teams')
    .action(async (nameOrId) => {
      await infoProjectCommand(nameOrId);
    });

  // Update command
  project
    .command('update <name-or-id>')
    .description('Update project settings')
    .option('--name <new-name>', 'New project name')
    .option('--description <text>', 'Project description')
    .option('--public', 'Make project public')
    .option('--private', 'Make project private')
    .option('--discoverable', 'Allow in public catalog')
    .option('--no-discoverable', 'Remove from public catalog')
    .action(async (nameOrId, options) => {
      await updateProjectCommand(nameOrId, options);
    });

  // Delete command
  project
    .command('delete <name-or-id>')
    .description('Delete a project (requires confirmation)')
    .option('--force', 'Skip confirmation prompt')
    .action(async (nameOrId, options) => {
      await deleteProjectCommand(nameOrId, options);
    });

  // Add member command
  project
    .command('add-member <project> <github-username>')
    .description('Add a member to a project')
    .option('--role <role>', 'Member role (owner|member)', 'member')
    .action(async (projectNameOrId, githubUsername, options) => {
      await addMemberCommand(projectNameOrId, githubUsername, options);
    });

  // Remove member command
  project
    .command('remove-member <project> <github-username>')
    .description('Remove a member from a project')
    .action(async (projectNameOrId, githubUsername) => {
      await removeMemberCommand(projectNameOrId, githubUsername);
    });

  // List members command
  project
    .command('list-members <project>')
    .description('List project members')
    .action(async (projectNameOrId) => {
      await listMembersCommand(projectNameOrId);
    });

  return project;
}

// Export for use in main CLI
export default projectCommand;
