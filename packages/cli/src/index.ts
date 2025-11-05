#!/usr/bin/env node

/**
 * @fileType: cli
 * @status: current
 * @updated: 2025-11-05
 * @tags: [cli, privacy, git-native, entry-point]
 * @priority: critical
 * @complexity: medium
 */

// Load environment variables from .env file
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, resolve } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Load .env from project root (3 levels up from dist/index.js)
dotenv.config({ path: resolve(__dirname, '../../../.env') });

import { Command } from 'commander';
import chalk from 'chalk';
import { initCommand } from './commands/init.js';
import { startCommand } from './commands/start/index.js';
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
import { graphCommand } from './commands/graph/index.js';
import { magicSimpleCommand } from './commands/magic-simple.js';
import { logCommand, logExamples } from './commands/log.js';
import { teamCommand } from './commands/team.js';
import { loginCommand } from './commands/login.js';
import { logoutCommand } from './commands/logout.js';
import { whoamiCommand } from './commands/whoami.js';
import { handoffCommand } from './commands/handoff.js';

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
  .version('1.3.0')
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
  .description('Start or resume a session with event-based context loading (ADR-043)')
  .option('-v, --verbose', 'Show full context and session details')
  .option('-m, --minimal', 'Minimal output for quick start')
  .option('--noai', 'Disable AI enhancement and use procedural templates')
  .option('--legacy', 'Use original implementation without reflection (deprecated)')
  .option('--strategic', 'Use strategic context loading instead of event-based (fallback mode)')
  .option('--team', 'Include team events in context loading')
  .action((sessionId, options) => startCommand({ sessionId, ...options }));

program
  .command('status')
  .description('Show current session status')
  .option('--all', 'Show all session cursors')
  .action(statusCommand);

program
  .command('handoff')
  .description('Pause current session and update cursor (ADR-043)')
  .option('-v, --verbose', 'Show detailed cursor and sync information')
  .action(handoffCommand);

program
  .command('log [description]')
  .description('Log an event to the current session (ADR-033 defensive logging)')
  .option('-c, --category <category>', 'Event category: fix, feature, decision, insight, git, achievement', 'feature')
  .option('-i, --impact <impact>', 'Impact level: high, medium, low', 'medium')
  .option('-f, --files <files>', 'Comma-separated list of files affected')
  .option('-s, --show', 'Show current session log with quality score')
  .option('--validate', 'Check session log quality and get suggestions')
  .option('--quick', 'Skip interactive prompts for faster logging')
  .option('--why', 'Force WHY prompt (useful for features)')
  .option('--shared', 'Mark event for team visibility (synced to graph)')
  .option('--examples', 'Show logging examples with quality tips')
  .action((description, options) => {
    if (options.examples) {
      logExamples();
      return;
    }
    // --show and --validate don't require description
    if (options.show || options.validate) {
      return logCommand('', options);
    }
    // Regular logging requires description
    if (!description) {
      console.error(chalk.red('❌ Description is required when logging events'));
      console.error(chalk.dim('   Use `ginko log --show` to view current log with quality score'));
      console.error(chalk.dim('   Use `ginko log --validate` to check log quality'));
      console.error(chalk.dim('   Use `ginko log --examples` for usage examples'));
      process.exit(1);
    }
    return logCommand(description, options);
  });

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

// Authentication commands
program
  .command('login')
  .description('Authenticate CLI with GitHub via Supabase OAuth')
  .option('--force', 'Force re-authentication even if already logged in')
  .action((options) => loginCommand(options));

program
  .command('logout')
  .description('Clear local authentication session')
  .action(logoutCommand);

program
  .command('whoami')
  .description('Display current authentication status and user information')
  .action(whoamiCommand);

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
  .option('--no-clean', 'Skip cleanup of temp files')
  .option('--docs', 'Update CHANGELOG.md and check sprint tasks before shipping')
  .option('--store', 'Execute ship with AI content (internal use)')
  .option('--id <id>', 'Ship ID for AI content')
  .option('--content <content>', 'AI-generated ship content')
  .option('--no-ai', 'Disable AI enhancement')
  .option('--quick', 'Quick ship without AI')
  .option('--legacy', 'Use standalone implementation (deprecated)')
  .option('-v, --verbose', 'Show detailed output')
  .action(async (message, options) => {
    // Use legacy standalone if explicitly requested
    if (options.legacy) {
      const useAiVersion = options.store || options.id || options.content ||
                           (options.ai !== false && !options.quick);
      if (useAiVersion) {
        return shipAiCommand(message, options);
      } else {
        return shipCommand(message, options);
      }
    }
    // Default: Use Universal Reflection Pattern via shortcut
    const { executeShortcut } = await import('./core/command-shortcuts.js');
    return executeShortcut('ship', [message, options]);
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
  .option('--noai', 'Disable AI enhancement (use reflection templates)')
  .option('--legacy', 'Use standalone implementation (deprecated)')
  .option('-e, --edit', 'Open in editor after creation')
  .action(async (description, options) => {
    // Use legacy standalone if explicitly requested
    if (options.legacy) {
      return captureCommand(description, options);
    }
    // Default: Use Universal Reflection Pattern via shortcut
    const { executeShortcut } = await import('./core/command-shortcuts.js');
    return executeShortcut('capture', [description, options]);
  });

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
  .option('--noai', 'Disable AI enhancement (use reflection templates)')
  .option('--legacy', 'Use standalone implementation (deprecated)')
  .action(async (topic, options) => {
    // Use legacy standalone if explicitly requested
    if (options.legacy) {
      return exploreCommand(topic, options);
    }
    // Default: Use Universal Reflection Pattern via shortcut
    const { executeShortcut } = await import('./core/command-shortcuts.js');
    return executeShortcut('explore', [topic, options]);
  });

program
  .command('architecture [decision]')
  .description('Design mode for crafting Architecture Decision Records (ADRs) with AI enhancement by default')
  .option('--store', 'Store generated ADR (internal use)')
  .option('--id <id>', 'Architecture ID')
  .option('--content <content>', 'ADR content to store')
  .option('--number <number>', 'ADR number')
  .option('--noai', 'Disable AI enhancement and use basic templates')
  .option('--basic', 'Use basic pipeline (deprecated, use --noai)')
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
  .option('--noai', 'Disable AI enhancement (use reflection templates)')
  .option('--legacy', 'Use standalone implementation (deprecated)')
  .action(async (feature, options) => {
    // Use legacy standalone if explicitly requested
    if (options.legacy) {
      return planCommand(feature, options);
    }
    // Default: Use Universal Reflection Pattern via shortcut
    const { executeShortcut } = await import('./core/command-shortcuts.js');
    return executeShortcut('plan', [feature, options]);
  });

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

// Team collaboration command
program
  .command('team [user]')
  .description('View team activity from user-namespaced session logs')
  .option('--timeline', 'Show chronological team events')
  .option('--files', 'Show file activity across team')
  .option('--conflicts', 'Show files modified by multiple users')
  .option('--window <hours>', 'Time window in hours (default: 24)', '24')
  .action((user, options) => teamCommand(user, options));

// Backlog management command
program.addCommand(backlogCommand());

// Knowledge graph command
program.addCommand(graphCommand());

// Universal Reflection Pattern command
program
  .command('reflect <intent>')
  .description('Universal reflection pattern for AI-enhanced content generation by default')
  .option('-d, --domain <domain>', 'Specify domain: start, capture, explore, architecture, plan, ship, backlog, prd, documentation, bug, changelog, git, testing')
  .option('-r, --raw', 'Output raw reflection prompt without formatting')
  .option('-v, --verbose', 'Show detailed processing information')
  .option('-s, --save', 'Save generated artifact to proper location')
  .option('--noai', 'Disable AI enhancement and use procedural templates')
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