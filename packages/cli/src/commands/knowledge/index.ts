/**
 * @fileType: command
 * @status: current
 * @updated: 2025-11-07
 * @tags: [knowledge, cli, graphql, api, task-025]
 * @related: [search.ts, create.ts, graph.ts, api-client.ts]
 * @priority: critical
 * @complexity: medium
 * @dependencies: [commander, chalk]
 */

/**
 * Knowledge Commands (TASK-025)
 *
 * CLI commands for interacting with knowledge graph via GraphQL API:
 * - ginko knowledge search: Semantic search across knowledge nodes
 * - ginko knowledge create: Create new knowledge nodes
 * - ginko knowledge graph: Visualize node relationships
 */

import { Command } from 'commander';
import chalk from 'chalk';
import { searchCommand } from './search.js';
import { createCommand } from './create.js';
import { graphCommand } from './graph.js';
import { syncCommand, rollbackCommand } from './sync.js';

/**
 * Main knowledge command with subcommands
 */
export function knowledgeCommand() {
  const knowledge = new Command('knowledge')
    .description('Interact with knowledge graph - search, create, and explore nodes')
    .showHelpAfterError('(use --help for additional information)')
    .addHelpText('after', `
${chalk.gray('Quick Start:')}
  ${chalk.green('ginko login')}                                     ${chalk.gray('# Authenticate first')}
  ${chalk.green('ginko knowledge search')} "auth patterns"           ${chalk.gray('# Search knowledge')}
  ${chalk.green('ginko knowledge create')}                           ${chalk.gray('# Create new node')}

${chalk.gray('Usage Examples:')}
  ${chalk.green('ginko knowledge search')} "authentication" -l 5     ${chalk.gray('# Search with limit')}
  ${chalk.green('ginko knowledge create')} --type ADR --title "..."  ${chalk.gray('# Create ADR')}
  ${chalk.green('ginko knowledge graph')} adr_123 --depth 2          ${chalk.gray('# Visualize connections')}
  ${chalk.green('ginko knowledge sync')} --dry-run                   ${chalk.gray('# Preview local→cloud sync')}

${chalk.gray('Features:')}
  ${chalk.cyan('🔍 Semantic Search')}  - Find relevant docs by meaning
  ${chalk.cyan('🎯 Smart Create')}     - AI-assisted node creation
  ${chalk.cyan('📊 Graph Viz')}        - Explore relationships visually
  ${chalk.cyan('🏷️  Tag-Based')}        - Find nodes by tags
  ${chalk.cyan('⚡ Fast & Cached')}    - GraphQL API with optimization

${chalk.gray('Learn More:')}
  ${chalk.dim('https://docs.ginko.ai/knowledge')}
`)
    .action(() => {
      // When called without subcommand, show help
      knowledge.help({ error: false });
    });

  // Search command
  knowledge
    .command('search <query>')
    .description('Semantic search across knowledge nodes')
    .option('-l, --limit <number>', 'Maximum results to return', '10')
    .option('-t, --threshold <number>', 'Minimum similarity score (0-1)', '0.75')
    .option('--type <type>', 'Filter by node type (ADR, PRD, ContextModule, Session, CodeFile)')
    .option('--status <status>', 'Filter by status (active, archived, draft)', 'active')
    .option('--table', 'Display results in table format')
    .action(async (query, options) => {
      const limit = parseInt(options.limit, 10);
      const threshold = parseFloat(options.threshold);
      await searchCommand(query, { ...options, limit, threshold });
    });

  // Create command
  knowledge
    .command('create')
    .description('Create a new knowledge node')
    .option('--type <type>', 'Node type (ADR, PRD, ContextModule, Session, CodeFile)', 'ContextModule')
    .option('--title <title>', 'Node title')
    .option('--content <content>', 'Node content')
    .option('--tags <tags>', 'Comma-separated tags')
    .option('--file <file>', 'Read content from file')
    .option('--interactive', 'Interactive mode with prompts', true)
    .action(async (options) => {
      await createCommand(options);
    });

  // Graph command
  knowledge
    .command('graph <nodeId>')
    .description('Visualize node and its relationship graph')
    .option('-d, --depth <number>', 'Relationship depth to traverse (1-2)', '1')
    .option('--types <types>', 'Filter relationships by type (comma-separated)')
    .option('--format <format>', 'Output format (tree, json, mermaid)', 'tree')
    .action(async (nodeId, options) => {
      const depth = parseInt(options.depth, 10);
      await graphCommand(nodeId, { ...options, depth });
    });

  // Sync command
  knowledge
    .command('sync')
    .description('Sync local knowledge files (ADRs, PRDs) to cloud graph')
    .option('--dry-run', 'Preview changes without executing')
    .option('--force', 'Overwrite existing nodes (destructive)')
    .option('--skip', 'Skip existing nodes (safe, default)', true)
    .option('--path <path>', 'Base path to scan (default: current directory)')
    .option('--project <id>', 'Target project/graph ID')
    .option('--interactive', 'Interactive conflict resolution')
    .option('--local-only', 'Skip cloud checks (for testing scanner)')
    .action(async (options) => {
      await syncCommand(options);
    });

  // Rollback command
  knowledge
    .command('sync:rollback <syncId>')
    .description('Rollback a previous sync operation')
    .action(async (syncId) => {
      await rollbackCommand(syncId);
    });

  return knowledge;
}

// Export for use in main CLI
export default knowledgeCommand;
