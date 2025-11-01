/**
 * @fileType: command
 * @status: current
 * @updated: 2025-10-31
 * @tags: [graph, cli, knowledge-graph, cloud]
 * @related: [init.ts, load.ts, status.ts, query.ts, explore.ts]
 * @priority: critical
 * @complexity: medium
 * @dependencies: [commander, chalk]
 */

import { Command } from 'commander';
import chalk from 'chalk';
import { initCommand } from './init.js';
import { loadCommand } from './load.js';
import { statusCommand } from './status.js';
import { queryCommand } from './query.js';
import { exploreCommand } from './explore.js';

/**
 * Main graph command with subcommands for knowledge graph operations
 */
export function graphCommand() {
  const graph = new Command('graph')
    .description('Manage cloud-based knowledge graph for project documentation')
    .showHelpAfterError('(use --help for additional information)')
    .addHelpText('after', `
${chalk.gray('Quick Start:')}
  ${chalk.green('ginko login')}                                   ${chalk.gray('# Authenticate with Ginko Cloud')}
  ${chalk.green('ginko graph init')}                              ${chalk.gray('# Initialize graph for your project')}
  ${chalk.green('ginko graph status')}                            ${chalk.gray('# View graph statistics')}

${chalk.gray('Usage Examples:')}
  ${chalk.green('ginko graph query')} "authentication patterns"    ${chalk.gray('# Semantic search')}
  ${chalk.green('ginko graph explore')} ADR-039                    ${chalk.gray('# Explore document connections')}
  ${chalk.green('ginko graph load')} --docs-only                   ${chalk.gray('# Reload ADRs and PRDs only')}

${chalk.gray('Features:')}
  ${chalk.cyan('☁️  Cloud-First')}      - No Neo4j setup required
  ${chalk.cyan('🚀 Instant Processing')} - Cloud GPUs handle embeddings
  ${chalk.cyan('👥 Team Sharing')}      - Share graphs across organization
  ${chalk.cyan('🔒 Private by Default')} - Your data stays in your namespace
  ${chalk.cyan('💾 Auto-Synced')}       - Changes sync automatically

${chalk.gray('Learn More:')}
  ${chalk.dim('https://docs.ginko.ai/graph')}
`)
    .action(() => {
      // When called without subcommand, show help
      graph.help({ error: false });
    });

  // Initialize graph
  graph
    .command('init')
    .description('Initialize knowledge graph for your project')
    .option('--quick', 'Quick initialization without prompts')
    .option('--skip-load', 'Initialize config only, don\'t load documents yet')
    .option('--visibility <level>', 'Graph visibility: private, organization, public', 'private')
    .action(async (options) => {
      await initCommand(options);
    });

  // Load documents
  graph
    .command('load')
    .description('Upload documents to knowledge graph')
    .option('--docs-only', 'Load ADRs and PRDs only (skip patterns, sessions)')
    .option('--extended-only', 'Load patterns, gotchas, sessions only (skip docs)')
    .option('--force', 'Reload all documents even if unchanged')
    .action(async (options) => {
      await loadCommand(options);
    });

  // Show status
  graph
    .command('status')
    .description('Show graph statistics and health')
    .action(async () => {
      await statusCommand();
    });

  // Semantic query
  graph
    .command('query <text>')
    .description('Search documents using semantic similarity')
    .option('-l, --limit <number>', 'Maximum results to return', '10')
    .option('-t, --threshold <number>', 'Minimum similarity score (0-1)', '0.70')
    .option('--types <types>', 'Filter by document types (comma-separated)', '')
    .action(async (text, options) => {
      const limit = parseInt(options.limit, 10);
      const threshold = parseFloat(options.threshold);
      await queryCommand(text, { ...options, limit, threshold });
    });

  // Explore document
  graph
    .command('explore <documentId>')
    .description('Explore document and its connections')
    .option('-d, --depth <number>', 'Relationship depth to traverse (1-3)', '1')
    .action(async (documentId, options) => {
      const depth = parseInt(options.depth, 10);
      await exploreCommand(documentId, { depth });
    });

  return graph;
}

// Export for use in main CLI
export default graphCommand;
