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
import { startCommand } from './commands/start-enhanced.js';
import { handoffCommand } from './commands/handoff.js';
import { handoffAiCommand } from './commands/handoff-ai.js';
import enhancedHandoffCommand from './commands/handoff-enhanced.js';
import { statusCommand } from './commands/status.js';
import { contextCommand } from './commands/context.js';
import { configCommand } from './commands/config.js';
import vibecheckCommand from './commands/vibecheck-final.js';
import { vibecheckAiCommand } from './commands/vibecheck-ai.js';
import { compactCommand } from './commands/compact.js';
import { shipCommand } from './commands/ship.js';
import { shipAiCommand } from './commands/ship-ai.js';
import { captureCommand } from './commands/capture.js';
import { exploreCommand } from './commands/explore.js';
import { architectureCommand } from './commands/architecture.js';
import { planCommand } from './commands/plan.js';
import { initCursorCommand } from './commands/init-cursor.js';
import { uninstallCursorCommand } from './commands/uninstall-cursor.js';
import { initCopilotCommand } from './commands/init-copilot.js';
import { uninstallCopilotCommand } from './commands/uninstall-copilot.js';
import { backlogCommand } from './commands/backlog/index.js';
import { magicSimpleCommand } from './commands/magic-simple.js';

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
  .description('Initialize Ginko in your project with AI-optimized setup')
  .option('--quick', 'Quick initialization without project analysis')
  .option('--analyze', 'Deep analysis mode for comprehensive setup')
  .option('--model <model>', 'Specify AI model (claude, gpt, generic)')
  .action((options) => initCommand(options));

program
  .command('start [sessionId]')
  .description('Start or resume a session (fully git-native)')
  .option('-v, --verbose', 'Show full context and handoff')
  .option('-m, --minimal', 'Minimal output for quick start')
  .action(startCommand);

program
  .command('handoff [message]')
  .description('Create a session handoff with automatic context capture')
  .option('--store', 'Store AI-enriched content (internal use)')
  .option('--id <id>', 'Handoff ID for storing enriched content')
  .option('--content <content>', 'Enriched content to store')
  .option('--no-capture', 'Disable automatic context capture')
  .option('--quick', 'Quick handoff without AI enhancement')
  .option('-r, --review', 'Review insights before saving')
  .option('-v, --verbose', 'Show detailed output')
  .option('--max-insights <number>', 'Maximum insights to capture', parseInt)
  .option('--enhanced', 'Use enhanced version with auto-capture (default)')
  .option('--legacy', 'Use legacy AI version without capture')
  .action((message, options) => {
    // Default to enhanced version unless explicitly using legacy
    if (options.legacy) {
      return handoffAiCommand({ message, ...options });
    } else {
      // Use enhanced version with automatic context capture
      return enhancedHandoffCommand({ 
        message, 
        capture: !options.noCapture,
        ...options 
      });
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
  .description('Pause moment for recalibration - conversational check-in')
  .option('-v, --verbose', 'Show additional context')
  .option('--analyze', 'Full AI analysis mode (generates detailed report)')
  .option('--store', 'Store AI analysis (internal use)')
  .option('--id <id>', 'Vibecheck ID for storing analysis')
  .option('--content <content>', 'Enriched analysis to store')
  .action((concern, options) => {
    // Only use AI version if explicitly requested or in store phase
    if (options.analyze || options.store || options.id || options.content) {
      return vibecheckAiCommand(concern, options);
    } else {
      // Default to simple conversational vibecheck
      return vibecheckCommand(concern, options);
    }
  });

program
  .command('compact')
  .description('Reduce context size by removing stale information')
  .option('-p, --preserve <files...>', 'Files to preserve during compaction')
  .option('-a, --aggressive', 'Aggressive compaction mode')
  .action(compactCommand);

program
  .command('ship [message]')
  .description('AI-enhanced shipping with smart commit messages and PR descriptions')
  .option('-b, --branch <name>', 'Specify branch name')
  .option('--no-push', 'Skip pushing to remote')
  .option('--no-tests', 'Skip running tests')
  .option('--store', 'Execute ship with AI content (internal use)')
  .option('--id <id>', 'Ship ID for AI content')
  .option('--content <content>', 'AI-generated ship content')
  .option('--no-ai', 'Disable AI enhancement')
  .option('--quick', 'Quick ship without AI')
  .option('-v, --verbose', 'Show detailed output')
  .action((message, options) => {
    // Use AI version if any AI-related options present
    const useAiVersion = options.store || options.id || options.content ||
                         (options.ai !== false && !options.quick);
    
    if (useAiVersion) {
      return shipAiCommand(message, options);
    } else {
      return shipCommand(message, options);
    }
  });

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

program
  .command('init-cursor')
  .description('Generate a Cursor setup preview or apply it to the repository')
  .option('--preview', 'Preview mode (default). Writes to .ginko/generated only', true)
  .option('--apply', 'Apply setup permanently to repository root and commit changes')
  .action((options) => initCursorCommand(options));

program
  .command('uninstall-cursor')
  .description('Remove Cursor integration and optionally revert git commit')
  .option('--force', 'Skip confirmation prompt')
  .option('--revert-commit', 'Revert the Cursor integration git commit')
  .action((options) => uninstallCursorCommand(options));

program
  .command('init-copilot')
  .description('Generate GitHub Copilot setup preview or apply to repository')
  .option('--preview', 'Preview mode (default). Writes to .ginko/generated only', true)
  .option('--apply', 'Apply setup permanently and commit changes')
  .option('--workspace', 'Apply workspace settings only')
  .action((options) => initCopilotCommand(options));

program
  .command('uninstall-copilot')
  .description('Remove GitHub Copilot integration')
  .option('--force', 'Skip confirmation prompt')
  .option('--revert-commit', 'Revert the Copilot integration git commit')
  .action((options) => uninstallCopilotCommand(options));

// Backlog management command
program.addCommand(backlogCommand());

// Universal Reflection Pattern command
program
  .command('reflect <intent>')
  .description('Universal reflection pattern for AI-enhanced content generation')
  .option('-d, --domain <domain>', 'Specify domain (backlog, documentation, testing, etc.)')
  .option('-r, --raw', 'Output raw reflection prompt without formatting')
  .option('-v, --verbose', 'Show detailed processing information')
  .action(async (intent, options) => {
    const { reflectCommand } = await import('./commands/reflect.js');
    return reflectCommand(intent, options);
  });

// Progressive shortcuts (Level 2-3 of architecture)
// Shortcut: ginko feature "description" instead of ginko backlog create feature "description"
program
  .command('feature <description>')
  .description('Quick create a feature (shortcut for backlog create feature)')
  .option('-p, --priority <priority>', 'Priority level')
  .option('-s, --size <size>', 'Size estimate')
  .action(async (description, options) => {
    const { createCommand } = await import('./commands/backlog/create.js');
    return createCommand(description, { ...options, type: 'feature' });
  });

program
  .command('story <description>')
  .description('Quick create a story (shortcut for backlog create story)')
  .option('-p, --priority <priority>', 'Priority level')
  .option('-s, --size <size>', 'Size estimate')
  .action(async (description, options) => {
    const { createCommand } = await import('./commands/backlog/create.js');
    return createCommand(description, { ...options, type: 'story' });
  });

program
  .command('task <description>')
  .description('Quick create a task (shortcut for backlog create task)')
  .option('-p, --priority <priority>', 'Priority level')
  .option('-s, --size <size>', 'Size estimate')
  .action(async (description, options) => {
    const { createCommand } = await import('./commands/backlog/create.js');
    return createCommand(description, { ...options, type: 'task' });
  });

// Magic command - catch-all for natural language (Level 4-5)
// This must be defined AFTER all other commands to work as a catch-all
program
  .argument('[request]', 'Natural language request')
  .option('-v, --verbose', 'Show AI reasoning')
  .option('--dry-run', 'Show what would be done without executing')
  .action((request, options) => {
    // If no request and no other command matched, show help
    if (!request) {
      program.help();
      return;
    }
    // Route to simple magic command
    return magicSimpleCommand(request, options);
  });

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