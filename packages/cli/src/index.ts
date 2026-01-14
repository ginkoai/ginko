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
import { createRequire } from 'module';

const require = createRequire(import.meta.url);
const packageJson = require('../package.json');

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
import { knowledgeCommand } from './commands/knowledge/index.js';
import { projectCommand } from './commands/project/index.js';
import { teamManagementCommand } from './commands/team/index.js';
import { agentCommand } from './commands/agent/index.js';
import { sprintCommand } from './commands/sprint/index.js';
import { checkpointCommand } from './commands/checkpoint/index.js';
import { magicSimpleCommand } from './commands/magic-simple.js';
import { logCommand, logExamples } from './commands/log.js';
import { teamCommand } from './commands/team.js';
import { loginCommand } from './commands/login.js';
import { logoutCommand } from './commands/logout.js';
import { whoamiCommand } from './commands/whoami.js';
import { handoffCommand } from './commands/handoff.js';
import { charterCommand, charterExamples } from './commands/charter.js';
import { epicCommand, epicExamples } from './commands/epic.js';
import { verifyCommand } from './commands/verify.js';
import { orchestrateCommand } from './commands/orchestrate.js';
import { dlqCommand } from './commands/dlq.js';
import { escalationCommand } from './commands/escalation/index.js';
import { notificationsCommand } from './commands/notifications/index.js';
import { insightsCommand } from './commands/insights/index.js';
import { createSyncCommand } from './commands/sync/index.js';
import { assignCommand } from './commands/assign.js';
import { inviteCommand } from './commands/invite/index.js';
import { joinCommand } from './commands/join/index.js';
import { roadmapCommand } from './commands/roadmap/index.js';

const program = new Command();

// ASCII art logo
const logo = chalk.green(`
╔═══════════════════════════════════════════╗
║   🌿 Ginko - AI-Native Collaboration      ║
║   AI Collaboration for Vibe Tribes        ║
╚═══════════════════════════════════════════╝
`);

program
  .name('ginko')
  .description('Git-native session management and cloud context for AI-mediated development')
  .version(packageJson.version)
  .addHelpText('before', logo)
  .addHelpText('after', `
${chalk.bold('Quick Start:')}
  ${chalk.cyan('ginko login')}              Authenticate with Ginko Cloud
  ${chalk.cyan('ginko init')}               Initialize project (local + cloud graph)
  ${chalk.cyan('ginko start')}              Start your first session

${chalk.dim('Designed for AI-mediated development - your AI partner interprets commands naturally')}
`);

// Core commands
program
  .command('init')
  .description('Initialize Ginko in your project (sets up local structure + cloud graph)')
  .option('--model <model>', 'Specify AI model (claude, gpt, generic)')
  .action((options) => initCommand(options));

program
  .command('start [sessionId]')
  .description('Start or resume a session with event-based context loading (ADR-043)')
  .option('-v, --verbose', 'Show full session details with all context (~80 lines, for detailed review)')
  .option('-m, --minimal', 'Minimal output for quick start (deprecated, concise is now default)')
  .option('--compact', 'Compact output without table borders (previous default)')
  .option('--no-table', 'Disable table formatting for piping/scripts')
  .option('--auto-progress', 'Automatically advance to next sprint when current is complete')
  .option('--noai', 'Disable AI enhancement and use procedural templates')
  .option('--legacy', 'Use original implementation without reflection (deprecated)')
  .option('--strategic', 'Use strategic context loading instead of event-based (fallback mode)')
  .option('--team', 'Include team events in context loading')
  .option('--no-realtime-cursor', 'Disable real-time cursor updates to cloud (EPIC-004)')
  .action((sessionId, options) => startCommand({ sessionId, ...options }));

program
  .command('status')
  .description('Show current session status')
  .option('--all', 'Show all session cursors')
  .action(statusCommand);

program
  .command('insights')
  .description('Run coaching insights analysis on your development workflow (EPIC-005 Sprint 3)')
  .option('--detailed', 'Show all insights with evidence and recommendations')
  .option('--category <category>', 'Filter by category: efficiency, patterns, quality, anti-patterns')
  .option('--json', 'Output results as JSON')
  .option('--sync', 'Sync results to Supabase')
  .option('--days <days>', 'Analysis period in days (default: 30)', '30')
  .addHelpText('after', `
${chalk.gray('Categories:')}
  ${chalk.dim('efficiency     - Session metrics: time-to-flow, context loading, duration')}
  ${chalk.dim('patterns       - ADR adoption, pattern usage, gotcha avoidance')}
  ${chalk.dim('quality        - Task completion, commit frequency, handoff quality')}
  ${chalk.dim('anti-patterns  - Abandoned tasks, context loss, scope creep')}

${chalk.gray('Examples:')}
  ${chalk.green('ginko insights')} ${chalk.dim('# Run full analysis, display summary')}
  ${chalk.green('ginko insights --detailed')} ${chalk.dim('# Show all insights with evidence')}
  ${chalk.green('ginko insights --category efficiency')} ${chalk.dim('# Focus on session efficiency')}
  ${chalk.green('ginko insights --json')} ${chalk.dim('# Output as JSON for processing')}
  ${chalk.green('ginko insights --days 7')} ${chalk.dim('# Analyze last 7 days only')}
`)
  .action((options) => insightsCommand({
    detailed: options.detailed,
    category: options.category,
    json: options.json,
    sync: options.sync,
    days: options.days ? parseInt(options.days, 10) : undefined,
  }));

program
  .command('handoff [message]')
  .description('Pause current session and update cursor (ADR-043). Optionally provide a handoff summary message.')
  .option('-v, --verbose', 'Show detailed cursor and sync information')
  .action((message, options) => handoffCommand({ message, ...options }));

program
  .command('charter')
  .description('Create and manage project charter (AI-assisted by default)')
  .option('--no-ai', 'Run interactive mode instead of outputting template')
  .option('--view', 'View existing charter')
  .option('--edit', 'Edit charter conversationally')
  .option('--mode <mode>', 'Specify work mode: hack-ship, think-build, full-planning')
  .option('--skip-conversation', 'Skip conversation (testing/automation, requires --no-ai)')
  .option('--output-path <path>', 'Custom charter file path')
  .option('--examples', 'Show charter command examples')
  .action((options) => {
    if (options.examples) {
      console.log(chalk.green('\n📋 Charter Command Examples:\n'));
      charterExamples.forEach(example => {
        console.log(chalk.dim(`  ${example}`));
      });
      console.log('');
      return;
    }
    return charterCommand(options);
  });

program
  .command('epic')
  .description('Create and manage epics with sprint breakdown (AI-assisted by default)')
  .option('--no-ai', 'Run interactive mode instead of outputting template')
  .option('--list', 'List existing epics')
  .option('--view', 'View epic details with sprint breakdown')
  .option('--sync', 'Sync epic to graph database')
  .option('--examples', 'Show epic command examples')
  .action((options) => {
    if (options.examples) {
      console.log(chalk.green('\n📋 Epic Command Examples:\n'));
      epicExamples.forEach(example => {
        console.log(chalk.dim(`  ${example}`));
      });
      console.log('');
      return;
    }
    return epicCommand(options);
  });

program
  .command('log [description]')
  .description('Log an event to the current session (ADR-033 defensive logging)')
  .option('-c, --category <category>', 'Event category: fix, feature, decision, insight, git, achievement, blocker (auto-detected if not provided)')
  .option('-i, --impact <impact>', 'Impact level: high, medium, low (auto-detected if not provided)')
  .option('-f, --files <files>', 'Comma-separated list of files affected')
  .option('-s, --show', 'Show current session log with quality score')
  .option('--validate', 'Check session log quality and get suggestions')
  .option('--quick', 'Skip interactive prompts for faster logging')
  .option('--why', 'Force WHY prompt (useful for features)')
  .option('--shared', 'Mark event for team visibility (synced to graph)')
  .option('--examples', 'Show logging examples with quality tips')
  // Blocker-specific options (EPIC-004 Sprint 2 TASK-4)
  .option('--blocked-by <resource>', 'What is blocking (task ID, resource, etc.)')
  .option('--blocking-tasks <tasks>', 'Comma-separated list of tasks that cannot proceed')
  .option('--severity <level>', 'Blocker severity: low, medium, high, critical')
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
  .command('verify <taskId>')
  .description('Verify task completion by running acceptance criteria checks (EPIC-004 Sprint 3)')
  .option('--json', 'Output results in JSON format')
  .action((taskId, options) => verifyCommand(taskId, options));

program
  .command('orchestrate')
  .description('Run as supervisor agent to coordinate multi-agent task execution (EPIC-004 Sprint 4)')
  .option('--epic <epic>', 'Target epic ID for orchestration')
  .option('--sprint <sprint>', 'Target sprint file path')
  .option('--dry-run', 'Show orchestration plan without executing')
  .option('--resume', 'Resume from last checkpoint (TASK-10)')
  .option('--poll-interval <seconds>', 'Task polling interval in seconds (default: 5)', '5')
  .option('--max-runtime <minutes>', 'Maximum runtime in minutes (default: 60)', '60')
  .option('-v, --verbose', 'Show detailed orchestration output')
  .addHelpText('after', `
${chalk.gray('Orchestrator Flow:')}
  ${chalk.dim('1. Register as orchestrator agent (or resume from checkpoint)')}
  ${chalk.dim('2. Load sprint tasks with dependencies')}
  ${chalk.dim('3. Compute execution waves (topological ordering)')}
  ${chalk.dim('4. Discover available worker agents')}
  ${chalk.dim('5. Assign tasks based on capabilities')}
  ${chalk.dim('6. Monitor completion events')}
  ${chalk.dim('7. Handle blockers and reassignment')}
  ${chalk.dim('8. Checkpoint on exit for seamless respawn')}

${chalk.gray('Exit Codes:')}
  ${chalk.dim('0  - All tasks completed successfully')}
  ${chalk.dim('1  - Error or stalled (no progress)')}
  ${chalk.dim('75 - Checkpoint saved, respawn needed')}

${chalk.gray('Resume:')}
  ${chalk.dim('Use --resume after exit code 75 to continue from checkpoint')}

${chalk.gray('Examples:')}
  ${chalk.green('ginko orchestrate')} ${chalk.dim('# Orchestrate current sprint')}
  ${chalk.green('ginko orchestrate --dry-run')} ${chalk.dim('# Preview plan without executing')}
  ${chalk.green('ginko orchestrate --resume')} ${chalk.dim('# Resume from last checkpoint')}
  ${chalk.green('ginko orchestrate --verbose')} ${chalk.dim('# Show detailed status')}
  ${chalk.green('ginko orchestrate --max-runtime 120')} ${chalk.dim('# Run for up to 2 hours')}
`)
  .action(async (options) => {
    await orchestrateCommand({
      epic: options.epic,
      sprint: options.sprint,
      dryRun: options.dryRun,
      resume: options.resume,
      pollInterval: parseInt(options.pollInterval, 10),
      maxRuntime: parseInt(options.maxRuntime, 10),
      verbose: options.verbose,
    });
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

// Task assignment command (EPIC-006 Sprint 2 TASK-9)
program
  .command('assign <taskIdOrEmail> [email]')
  .description('Assign tasks to team members (updates graph + sprint markdown)')
  .option('-s, --sprint <sprintId>', 'Sprint ID for bulk assignment (requires --all)')
  .option('-a, --all', 'Assign all tasks in sprint to specified email')
  .option('--no-update-markdown', 'Skip updating sprint markdown file')
  .option('-v, --verbose', 'Show detailed output')
  .addHelpText('after', `
${chalk.gray('Single task assignment:')}
  ${chalk.green('ginko assign e006_s02_t01 chris@example.com')}

${chalk.gray('Bulk assignment (all tasks in sprint):')}
  ${chalk.green('ginko assign --sprint e006_s02 --all chris@example.com')}

${chalk.gray('Skip markdown update:')}
  ${chalk.green('ginko assign e006_s02_t01 chris@example.com --no-update-markdown')}
`)
  .action((taskIdOrEmail, email, options) => assignCommand(taskIdOrEmail, email, options));

// Backlog management command
program.addCommand(backlogCommand());

// Knowledge graph command
program.addCommand(graphCommand());

// Knowledge management commands (TASK-025)
program.addCommand(knowledgeCommand());

// Project management commands (TASK-023)
program.addCommand(projectCommand());

// Team management commands (TASK-023)
program.addCommand(teamManagementCommand());

// Team collaboration commands (EPIC-008 Sprint 1)
program.addCommand(inviteCommand());
program.addCommand(joinCommand());

// Agent management commands (EPIC-004 Sprint 1 TASK-6)
program.addCommand(agentCommand());

// Sprint management commands (EPIC-004 Sprint 4)
program.addCommand(sprintCommand());

// Checkpoint management commands (EPIC-004 Sprint 5 TASK-1)
program.addCommand(checkpointCommand());

// Dead Letter Queue management commands (EPIC-004 Sprint 5 TASK-4)
program.addCommand(dlqCommand);

// Escalation management commands (EPIC-004 Sprint 5 TASK-7)
program.addCommand(escalationCommand());

// Notification management commands (EPIC-004 Sprint 5 TASK-15)
program.addCommand(notificationsCommand());

// Sync command: Pull dashboard edits to git (ADR-054, EPIC-005 Sprint 4)
program.addCommand(createSyncCommand());

// Roadmap view
program.addCommand(roadmapCommand());

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
// NOTE: Do not add global options like --dry-run here - they will shadow subcommand options
program
  .argument('[request]', 'Natural language request')
  .option('-v, --verbose', 'Show AI reasoning')
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