/**
 * @fileType: command
 * @status: current
 * @updated: 2025-11-03
 * @tags: [graph, query, search, cli, semantic-search]
 * @related: [api-client.ts, config.ts]
 * @priority: high
 * @complexity: medium
 * @dependencies: [chalk, api-client, config, cli-table3]
 */

import chalk from 'chalk';
import Table from 'cli-table3';
import { GraphApiClient, QueryResult } from './api-client.js';
import { loadGraphConfig, isGraphInitialized } from './config.js';
import { requireCloud } from '../../utils/cloud-guard.js';

interface QueryOptions {
  limit?: number;
  threshold?: number;
  types?: string;
  table?: boolean;
  semantic?: boolean; // Alias for consistency
}

/**
 * Perform semantic search on knowledge graph
 */
export async function queryCommand(searchText: string, options: QueryOptions): Promise<void> {
  await requireCloud('graph query');
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
    if (options.table) {
      displayTable(results.results);
    } else {
      displayList(results.results);
    }

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

/**
 * Display results in list format (default)
 */
function displayList(results: QueryResult[]): void {
  results.forEach((result, index) => {
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
}

/**
 * Display results in table format
 */
function displayTable(results: QueryResult[]): void {
  const table = new Table({
    head: ['Type', 'Title', 'Score', 'Tags', 'Connections'],
    style: {
      head: ['cyan'],
      border: ['gray']
    },
    colWidths: [10, 45, 8, 30, 12],
    wordWrap: true
  });

  results.forEach((result) => {
    // Color-code similarity scores
    const similarity = result.similarity * 100;
    const scoreColor =
      similarity >= 80 ? chalk.green :
      similarity >= 70 ? chalk.yellow :
      chalk.gray;

    const scoreText = scoreColor(`${similarity.toFixed(0)}%`);

    // Format tags (limit to 3 for readability)
    const tagsText = result.document.tags.slice(0, 3).join(', ');

    // Type emoji
    const typeEmoji =
      result.document.type === 'ADR' ? '📄' :
      result.document.type === 'PRD' ? '📋' :
      result.document.type === 'Pattern' ? '🎨' :
      result.document.type === 'Gotcha' ? '⚠️' :
      result.document.type === 'Session' ? '📝' : '📁';

    table.push([
      `${typeEmoji} ${result.document.type}`,
      result.document.title,
      scoreText,
      chalk.dim(tagsText),
      result.connections > 0 ? chalk.cyan(`${result.connections}`) : chalk.gray('0')
    ]);
  });

  console.log(table.toString());
}
