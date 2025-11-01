/**
 * @fileType: command
 * @status: current
 * @updated: 2025-10-31
 * @tags: [graph, query, search, cli]
 * @related: [api-client.ts, config.ts]
 * @priority: high
 * @complexity: medium
 * @dependencies: [chalk, api-client, config]
 */

import chalk from 'chalk';
import { GraphApiClient } from './api-client.js';
import { loadGraphConfig, isGraphInitialized } from './config.js';

interface QueryOptions {
  limit?: number;
  threshold?: number;
  types?: string;
}

/**
 * Perform semantic search on knowledge graph
 */
export async function queryCommand(searchText: string, options: QueryOptions): Promise<void> {
  try {
    // Validate query
    if (!searchText || searchText.length < 3) {
      console.log(chalk.yellow('⚠️  Query must be at least 3 characters'));
      return;
    }

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

    console.log(chalk.green('\n🔍 Semantic Search Results'));
    console.log(chalk.gray('─'.repeat(50)));
    console.log(chalk.dim(`Query: "${searchText}"\n`));

    // Prepare query options
    const types = options.types ? options.types.split(',').map(t => t.trim()) : undefined;
    const limit = options.limit || 10;
    const threshold = options.threshold || 0.70;

    // Perform query
    const client = new GraphApiClient(config.apiEndpoint);
    const results = await client.query({
      graphId: config.graphId,
      query: searchText,
      limit,
      threshold,
      types,
    });

    if (results.results.length === 0) {
      console.log(chalk.yellow('No results found'));
      console.log(chalk.dim(`Try lowering the threshold (currently ${threshold}) or broadening your query`));
      return;
    }

    // Display results
    results.results.forEach((result, index) => {
      const emoji =
        result.document.type === 'ADR' ? '📄' :
        result.document.type === 'PRD' ? '📋' :
        result.document.type === 'Pattern' ? '🎨' :
        result.document.type === 'Gotcha' ? '⚠️' :
        result.document.type === 'Session' ? '📝' : '📁';

      console.log(`${index + 1}. ${emoji} ${chalk.bold(`[${result.document.type}] ${result.document.title}`)} ${chalk.dim(`(similarity: ${(result.similarity * 100).toFixed(0)}%)`)}`);
      console.log(`   ${chalk.dim(result.document.summary)}`);

      if (result.matchContext) {
        console.log(`   ${chalk.italic(chalk.gray('"' + result.matchContext.substring(0, 100) + '..."'))}`);
      }

      console.log(`   ${chalk.dim(`→ View: ginko graph explore ${result.document.id}`)}`);

      if (result.connections > 0) {
        console.log(`   ${chalk.dim(`↔ ${result.connections} connections`)}`);
      }

      console.log(); // blank line between results
    });

    console.log(chalk.gray('─'.repeat(50)));
    console.log(chalk.dim(`Found ${results.totalResults} results (showing ${results.results.length})`));
    console.log(chalk.dim(`Query time: ${results.queryTime}ms`));
    console.log(chalk.dim(`Model: ${results.embedding.model} (${results.embedding.dimensions}d)`));

    if (results.totalResults > results.results.length) {
      console.log(chalk.dim(`\nUse --limit ${results.totalResults} to see all results`));
    }

  } catch (error) {
    if (error instanceof Error) {
      console.error(chalk.red(`\n✗ Error: ${error.message}`));

      if (error.message.includes('Not authenticated')) {
        console.log(chalk.dim('\nRun "ginko login" to authenticate with Ginko Cloud'));
      }
    } else {
      console.error(chalk.red('\n✗ An unexpected error occurred'));
    }
    process.exit(1);
  }
}
