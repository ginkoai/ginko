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
import { handoffAiCommand } from './commands/handoff-ai.js';
import { statusCommand } from './commands/status.js';
import { contextCommand } from './commands/context.js';
import { configCommand } from './commands/config.js';
import { vibecheckCommand } from './commands/vibecheck.js';
import { compactCommand } from './commands/compact.js';
import { shipCommand } from './commands/ship.js';
import { captureCommand } from './commands/capture.js';
import { exploreCommand } from './commands/explore.js';
import { architectureCommand } from './commands/architecture.js';
import { planCommand } from './commands/plan.js';

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
  .description('Create a session handoff with optional AI enhancement')
  .option('--store', 'Store AI-enriched content (internal use)')
  .option('--id <id>', 'Handoff ID for storing enriched content')
  .option('--content <content>', 'Enriched content to store')
  .option('--no-ai', 'Disable AI enhancement')
  .option('--quick', 'Quick handoff without AI')
  .option('-r, --review', 'Review template before AI processing')
  .option('-v, --verbose', 'Show detailed output')
  .action((message, options) => {
    // Use AI-enhanced version if any AI-related options are present
    const useAiVersion = options.store || options.id || options.content || 
                         options.ai !== false || options.quick || options.review;
    
    if (useAiVersion) {
      return handoffAiCommand({ message, ...options });
    } else {
      return handoffCommand(message);
    }
  });

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

program
  .command('vibecheck [concern]')
  .description('Quick recalibration when feeling lost or stuck')
  .action(vibecheckCommand);

program
  .command('compact')
  .description('Reduce context size by removing stale information')
  .option('-p, --preserve <files...>', 'Files to preserve during compaction')
  .option('-a, --aggressive', 'Aggressive compaction mode')
  .action(compactCommand);

program
  .command('ship [message]')
  .description('Create and push PR-ready branch with changes')
  .option('-b, --branch <name>', 'Specify branch name')
  .option('--no-push', 'Skip pushing to remote')
  .option('--no-tests', 'Skip running tests')
  .action(shipCommand);

// Hero command: capture - for effortless context capture
program
  .command('capture [description]')
  .description('Capture a learning, discovery, or important context')
  .option('--store', 'Store AI-enriched content (internal use)')
  .option('--id <id>', 'Capture ID for storing enriched content')
  .option('--content <content>', 'Enriched content to store')
  .option('-r, --review', 'Review before saving')
  .option('-v, --verbose', 'Show detailed output')
  .option('-q, --quiet', 'Suppress all output')
  .option('--quick', 'Quick capture without AI enhancement')
  .option('-e, --edit', 'Open in editor after creation')
  .action(captureCommand);

// Development workflow commands: explore -> architecture -> plan -> build
program
  .command('explore [topic]')
  .description('Collaborative thinking mode for exploring problems and solutions')
  .option('--store', 'Store generated PRD or backlog item (internal use)')
  .option('--id <id>', 'Exploration ID')
  .option('--content <content>', 'Content to store')
  .option('--type <type>', 'Output type: prd or backlog', 'backlog')
  .option('-r, --review', 'Review before saving')
  .option('-v, --verbose', 'Show detailed output')
  .action(exploreCommand);

program
  .command('architecture [decision]')
  .description('Design mode for crafting Architecture Decision Records (ADRs)')
  .option('--store', 'Store generated ADR (internal use)')
  .option('--id <id>', 'Architecture ID')
  .option('--content <content>', 'ADR content to store')
  .option('--number <number>', 'ADR number')
  .option('-r, --review', 'Review before saving')
  .option('-v, --verbose', 'Show detailed output')
  .action(architectureCommand);

program
  .command('plan [feature]')
  .description('Create phased implementation plan with acceptance criteria')
  .option('--store', 'Store sprint plan (internal use)')
  .option('--id <id>', 'Plan ID')
  .option('--content <content>', 'Sprint plan content')
  .option('-d, --days <number>', 'Sprint duration in days', '5')
  .option('-r, --review', 'Review before saving')
  .option('-v, --verbose', 'Show detailed output')
  .action(planCommand);

// Privacy notice only for help command
program.hook('preAction', (thisCommand) => {
  // Only show privacy notice for help or when no command is given
  if (process.argv.length === 2 || process.argv.includes('--help') || process.argv.includes('-h')) {
    if (!process.env.GINKO_HIDE_PRIVACY && thisCommand.name() === 'ginko') {
      console.log(chalk.dim('🔐 Privacy: No code leaves your machine. Analytics disabled by default.\n'));
    }
  }
});

program.parse();