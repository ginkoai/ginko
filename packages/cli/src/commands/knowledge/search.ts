/**
 * @fileType: command
 * @status: current
 * @updated: 2025-11-07
 * @tags: [knowledge, search, semantic, graphql, task-025]
 * @related: [index.ts, api-client.ts]
 * @priority: critical
 * @complexity: medium
 * @dependencies: [chalk, axios]
 */

/**
 * Search Command (TASK-025)
 *
 * Semantic search across knowledge nodes using GraphQL API
 */

import chalk from 'chalk';
import axios from 'axios';
import { getConfig, getApiToken, getGraphId } from '../graph/config.js';
import Table from 'cli-table3';

interface SearchOptions {
  limit: number;
  threshold: number;
  type?: string;
  status: string;
  table?: boolean;
}

interface SearchResult {
  node: {
    id: string;
    title?: string;
    type: string;
    content: string;
    tags?: string[];
    createdAt: string;
  };
  score: number;
  relationshipType: string;
}

/**
 * Search knowledge nodes using semantic similarity
 */
export async function searchCommand(query: string, options: SearchOptions): Promise<void> {
  try {
    console.log(chalk.dim(`🔍 Searching for: "${query}"\n`));

    // Get config and auth
    const config = await getConfig();
    if (!config.graphId) {
      console.error(chalk.red('❌ No graph initialized.'));
      console.error(chalk.dim('   Run `ginko graph init` first to create a graph.'));
      process.exit(1);
    }

    const token = await getApiToken();
    if (!token) {
      console.error(chalk.red('❌ Not authenticated.'));
      console.error(chalk.dim('   Run `ginko login` to authenticate.'));
      process.exit(1);
    }

    // GraphQL query
    const graphqlQuery = `
      query SearchKnowledge($query: String!, $graphId: String!, $limit: Int, $minScore: Float, $type: NodeType, $status: NodeStatus) {
        search(
          query: $query
          graphId: $graphId
          limit: $limit
          minScore: $minScore
          type: $type
          status: $status
        ) {
          node {
            id
            title
            type
            content
            tags
            createdAt
          }
          score
          relationshipType
        }
      }
    `;

    const variables = {
      query,
      graphId: config.graphId,
      limit: options.limit,
      minScore: options.threshold,
      type: options.type || null,
      status: options.status.toUpperCase(),
    };

    // Call GraphQL API
    const apiUrl = config.apiUrl || process.env.GINKO_API_URL || 'https://app.ginkoai.com';
    const response = await axios.post(
      `${apiUrl}/api/graphql`,
      {
        query: graphqlQuery,
        variables,
      },
      {
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
      }
    );

    if (response.data.errors) {
      console.error(chalk.red('❌ GraphQL Error:'));
      response.data.errors.forEach((error: any) => {
        console.error(chalk.red(`   ${error.message}`));
      });
      process.exit(1);
    }

    const results: SearchResult[] = response.data.data.search;

    if (results.length === 0) {
      console.log(chalk.yellow('⚠️  No results found.'));
      console.log(chalk.dim('   Try:'));
      console.log(chalk.dim('   - Lowering the threshold: --threshold 0.5'));
      console.log(chalk.dim('   - Removing type filter'));
      console.log(chalk.dim('   - Using different keywords'));
      return;
    }

    console.log(chalk.green(`✅ Found ${results.length} results:\n`));

    if (options.table) {
      // Table format
      const table = new Table({
        head: [chalk.cyan('Type'), chalk.cyan('Title/ID'), chalk.cyan('Score'), chalk.cyan('Relevance')],
        colWidths: [15, 40, 10, 20],
        wordWrap: true,
      });

      results.forEach((result) => {
        const title = result.node.title || result.node.id;
        const scoreColor = result.score >= 0.9 ? chalk.green : result.score >= 0.75 ? chalk.yellow : chalk.dim;

        table.push([
          result.node.type,
          title.length > 35 ? title.substring(0, 32) + '...' : title,
          scoreColor(result.score.toFixed(3)),
          result.relationshipType.replace(/_/g, ' '),
        ]);
      });

      console.log(table.toString());
    } else {
      // List format
      results.forEach((result, index) => {
        const scoreColor = result.score >= 0.9 ? chalk.green : result.score >= 0.75 ? chalk.yellow : chalk.dim;
        const title = result.node.title || result.node.id;

        console.log(chalk.bold(`${index + 1}. ${title}`));
        console.log(chalk.dim(`   Type: ${result.node.type} | Score: ${scoreColor(result.score.toFixed(3))} | ${result.relationshipType.replace(/_/g, ' ')}`));
        console.log(chalk.dim(`   ID: ${result.node.id}`));

        // Show tags if available
        if (result.node.tags && result.node.tags.length > 0) {
          console.log(chalk.dim(`   Tags: ${result.node.tags.join(', ')}`));
        }

        // Show content preview (first 100 chars)
        const contentPreview = result.node.content.substring(0, 100);
        console.log(chalk.gray(`   ${contentPreview}${result.node.content.length > 100 ? '...' : ''}`));
        console.log('');
      });
    }

    // Summary
    console.log(chalk.dim(`\n💡 Tip: Use "ginko knowledge graph <id>" to explore connections`));

  } catch (error: any) {
    console.error(chalk.red('❌ Search failed:'));

    if (error.response) {
      console.error(chalk.red(`   API Error: ${error.response.status} ${error.response.statusText}`));
      if (error.response.data?.message) {
        console.error(chalk.red(`   ${error.response.data.message}`));
      }
    } else if (error.request) {
      console.error(chalk.red('   Network error: Could not reach API server'));
      console.error(chalk.dim(`   Check your connection and API URL: ${process.env.GINKO_API_URL || 'https://app.ginkoai.com'}`));
    } else {
      console.error(chalk.red(`   ${error.message}`));
    }

    process.exit(1);
  }
}
