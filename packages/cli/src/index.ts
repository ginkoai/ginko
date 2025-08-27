#!/usr/bin/env node

/**
 * @fileType: cli
 * @status: current
 * @updated: 2025-08-27
 * @tags: [cli, privacy, git-native, entry-point]
 * @priority: critical
 * @complexity: medium
 */

import { Command } from 'commander';
import chalk from 'chalk';
import { initCommand } from './commands/init.js';
import { startCommand } from './commands/start.js';
import { handoffCommand } from './commands/handoff.js';
import { statusCommand } from './commands/status.js';
import { contextCommand } from './commands/context.js';
import { configCommand } from './commands/config.js';

const program = new Command();

// ASCII art logo for fun
const logo = chalk.green(`
╔═══════════════════════════════════╗
║   🌿 Ginko CLI - Privacy First    ║
║   Your code never leaves home     ║
╚═══════════════════════════════════╝
`);

program
  .name('ginko')
  .description('Privacy-first CLI for AI-assisted development')
  .version('0.1.0-alpha')
  .addHelpText('before', logo);

// Core commands
program
  .command('init')
  .description('Initialize Ginko in your project')
  .action(initCommand);

program
  .command('start [sessionId]')
  .description('Start or resume a session')
  .action(startCommand);

program
  .command('handoff [message]')
  .description('Create a session handoff')
  .action(handoffCommand);

program
  .command('status')
  .description('Show current session status')
  .action(statusCommand);

program
  .command('context')
  .description('Manage session context')
  .option('-a, --add <files...>', 'Add files to context')
  .option('-r, --remove <files...>', 'Remove files from context')
  .option('-s, --show', 'Show current context')
  .action(contextCommand);

program
  .command('config')
  .description('Manage Ginko configuration')
  .argument('[key]', 'Configuration key')
  .argument('[value]', 'Configuration value')
  .option('--get', 'Get configuration value')
  .option('--set', 'Set configuration value')
  .option('--list', 'List all configuration')
  .action(configCommand);

// Privacy notice on first run
program.hook('preAction', () => {
  if (!process.env.GINKO_HIDE_PRIVACY) {
    console.log(chalk.dim('🔐 Privacy: No code leaves your machine. Analytics disabled by default.'));
  }
});

program.parse();