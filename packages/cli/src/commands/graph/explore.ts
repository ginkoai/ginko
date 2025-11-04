/**
 * @fileType: command
 * @status: current
 * @updated: 2025-10-31
 * @tags: [graph, explore, connections, cli]
 * @related: [api-client.ts, config.ts]
 * @priority: high
 * @complexity: medium
 * @dependencies: [chalk, api-client, config]
 */

import chalk from 'chalk';
import { GraphApiClient } from './api-client.js';
import { loadGraphConfig, isGraphInitialized } from './config.js';

interface ExploreOptions {
  depth?: number;
}

/**
 * Explore document and its connections
 */
export async function exploreCommand(documentId: string, options: ExploreOptions): Promise<void> {
  try {
    // Check if graph is initialized
    if (!await isGraphInitialized()) {
      console.log(chalk.yellow('⚠️  Graph not initialized'));
      console.log(chalk.dim('Run "ginko graph init" to create your knowledge graph'));
      return;
    }

    const config = await loadGraphConfig();
    if (!config) {
      console.log(chalk.red('✗ Failed to load graph configuration'));
      return;
    }

    // Explore document
    const client = new GraphApiClient(config.apiEndpoint);
    const result = await client.explore(config.graphId, documentId, options.depth);

    const emoji =
      result.document.type === 'ADR' ? '📄' :
      result.document.type === 'PRD' ? '📋' :
      result.document.type === 'Pattern' ? '🎨' :
      result.document.type === 'Gotcha' ? '⚠️' :
      result.document.type === 'Session' ? '📝' : '📁';

    console.log(chalk.green(`\n${emoji} ${result.document.type}: ${result.document.title}`));
    console.log(chalk.gray('─'.repeat(50)));

    // Summary
    console.log(`\n${chalk.bold('Summary')}:`);
    console.log(`  ${result.document.summary}`);

    // Tags
    if (result.document.tags.length > 0) {
      console.log(`\n${chalk.bold('Tags')}: ${result.document.tags.map(t => chalk.cyan(t)).join(', ')}`);
    }

    // File path
    console.log(`\n${chalk.bold('Path')}: ${chalk.dim(result.document.filePath)}`);

    // Metadata
    if (result.document.metadata && Object.keys(result.document.metadata).length > 0) {
      console.log(`\n${chalk.bold('Metadata')}:`);
      for (const [key, value] of Object.entries(result.document.metadata)) {
        console.log(`  ${key}: ${chalk.cyan(String(value))}`);
      }
    }

    // Relationships
    console.log(`\n${chalk.bold('Relationships')}:`);

    // Implements
    if (result.relationships.implements && result.relationships.implements.length > 0) {
      console.log(`\n  ${chalk.bold('Implements')}:`);
      result.relationships.implements.forEach(rel => {
        console.log(`    → ${chalk.cyan(`[${rel.type}] ${rel.title}`)} (${rel.id})`);
      });
    }

    // Referenced by
    if (result.relationships.referencedBy && result.relationships.referencedBy.length > 0) {
      console.log(`\n  ${chalk.bold('Referenced by')}:`);
      result.relationships.referencedBy.forEach(rel => {
        console.log(`    ← ${chalk.cyan(`[${rel.type}] ${rel.title}`)} (${rel.id})`);
      });
    }

    // Similar to
    if (result.relationships.similarTo && result.relationships.similarTo.length > 0) {
      console.log(`\n  ${chalk.bold('Similar to')}:`);
      result.relationships.similarTo.forEach(rel => {
        const similarity = rel.similarity ? chalk.dim(`${(rel.similarity * 100).toFixed(0)}%`) : '';
        console.log(`    ↔ ${chalk.cyan(`[${rel.type}] ${rel.title}`)} (${rel.id}) ${similarity}`);
      });
    }

    // Applied patterns
    if (result.relationships.appliedPatterns && result.relationships.appliedPatterns.length > 0) {
      console.log(`\n  ${chalk.bold('Applied patterns')}:`);
      result.relationships.appliedPatterns.forEach(rel => {
        console.log(`    ← ${chalk.cyan(`[${rel.type}] ${rel.title}`)} (${rel.id})`);
      });
    }

    // Connection summary
    console.log(`\n${chalk.bold('Connections')}: ${chalk.green(result.totalConnections)} total`);

    if (Object.keys(result.connectionsByType).length > 0) {
      console.log(chalk.dim('  Breakdown:'));
      for (const [type, count] of Object.entries(result.connectionsByType)) {
        console.log(chalk.dim(`    ${type}: ${count}`));
      }
    }

    // Timestamps
    console.log(`\n${chalk.dim('Created')}: ${new Date(result.document.createdAt).toLocaleString()}`);
    console.log(chalk.dim(`Updated: ${new Date(result.document.updatedAt).toLocaleString()}`));

    console.log(chalk.gray('\n' + '─'.repeat(50)));

  } catch (error) {
    if (error instanceof Error) {
      console.error(chalk.red(`\n✗ Error: ${error.message}`));

      if (error.message.includes('Not authenticated')) {
        console.log(chalk.dim('\nRun "ginko login" to authenticate with Ginko Cloud'));
      } else if (error.message.includes('not found')) {
        console.log(chalk.dim(`\nDocument "${documentId}" not found in graph`));
        console.log(chalk.dim('Use "ginko graph query" to search for documents'));
      }
    } else {
      console.error(chalk.red('\n✗ An unexpected error occurred'));
    }
    process.exit(1);
  }
}
