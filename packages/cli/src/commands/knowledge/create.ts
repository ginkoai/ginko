/**
 * @fileType: command
 * @status: current
 * @updated: 2025-11-07
 * @tags: [knowledge, create, graphql, task-025]
 * @related: [index.ts, api-client.ts]
 * @priority: critical
 * @complexity: medium
 * @dependencies: [chalk, axios, prompts]
 */

/**
 * Create Command (TASK-025)
 *
 * Create new knowledge nodes via GraphQL API
 */

import chalk from 'chalk';
import axios from 'axios';
import prompts from 'prompts';
import fs from 'fs/promises';
import { getConfig, getApiToken } from '../graph/config.js';
import { requireCloud } from '../../utils/cloud-guard.js';

interface CreateOptions {
  type: string;
  title?: string;
  content?: string;
  tags?: string;
  file?: string;
  interactive: boolean;
}

const VALID_TYPES = ['ADR', 'PRD', 'ContextModule', 'Session', 'CodeFile'];

/**
 * Create a new knowledge node
 */
export async function createCommand(options: CreateOptions): Promise<void> {
  await requireCloud('knowledge create');
  try {
    console.log(chalk.dim('📝 Creating new knowledge node\n'));

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

    // Gather input
    let type = options.type;
    let title = options.title;
    let content = options.content;
    let tags: string[] = [];

    // Validate type
    if (!VALID_TYPES.includes(type)) {
      console.error(chalk.red(`❌ Invalid node type: ${type}`));
      console.error(chalk.dim(`   Valid types: ${VALID_TYPES.join(', ')}`));
      process.exit(1);
    }

    // Interactive mode
    if (options.interactive && (!title || !content)) {
      const responses = await prompts([
        {
          type: 'text',
          name: 'title',
          message: 'Node title:',
          initial: title || '',
          validate: (value) => value.length > 0 ? true : 'Title is required',
        },
        {
          type: 'text',
          name: 'content',
          message: 'Content (or press Enter to open editor):',
          initial: content || '',
        },
        {
          type: 'text',
          name: 'tags',
          message: 'Tags (comma-separated):',
          initial: options.tags || '',
        },
      ]);

      if (!responses.title || !responses.content) {
        console.log(chalk.yellow('⚠️  Creation cancelled'));
        process.exit(0);
      }

      title = responses.title;
      content = responses.content;
      if (responses.tags) {
        tags = responses.tags.split(',').map((t: string) => t.trim());
      }
    }

    // Read from file if specified
    if (options.file) {
      try {
        content = await fs.readFile(options.file, 'utf-8');
        console.log(chalk.dim(`📄 Read content from: ${options.file}`));
      } catch (error) {
        console.error(chalk.red(`❌ Failed to read file: ${options.file}`));
        process.exit(1);
      }
    }

    // Parse tags if provided as string
    if (options.tags && tags.length === 0) {
      tags = options.tags.split(',').map(t => t.trim());
    }

    // Validate required fields
    if (!title || !content) {
      console.error(chalk.red('❌ Title and content are required'));
      console.error(chalk.dim('   Use --title and --content options or run in interactive mode'));
      process.exit(1);
    }

    // GraphQL mutation
    const graphqlMutation = `
      mutation CreateNode($graphId: String!, $type: NodeType!, $title: String, $content: String!, $tags: [String!], $status: NodeStatus) {
        createNode(
          graphId: $graphId
          type: $type
          title: $title
          content: $content
          tags: $tags
          status: $status
        ) {
          id
          title
          type
          status
          tags
          createdAt
        }
      }
    `;

    const variables = {
      graphId: config.graphId,
      type,
      title,
      content,
      tags: tags.length > 0 ? tags : null,
      status: 'ACTIVE',
    };

    // Call GraphQL API
    const apiUrl = config.apiUrl || process.env.GINKO_API_URL || 'https://app.ginkoai.com';
    const response = await axios.post(
      `${apiUrl}/api/graphql`,
      {
        query: graphqlMutation,
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

    const node = response.data.data.createNode;

    console.log(chalk.green('✅ Node created successfully!\n'));
    console.log(chalk.bold(`   Type: ${node.type}`));
    console.log(chalk.bold(`   ID: ${node.id}`));
    console.log(chalk.bold(`   Title: ${node.title}`));
    if (node.tags && node.tags.length > 0) {
      console.log(chalk.dim(`   Tags: ${node.tags.join(', ')}`));
    }
    console.log('');

    console.log(chalk.dim(`💡 Tip: View with "ginko knowledge graph ${node.id}"`));

  } catch (error: any) {
    console.error(chalk.red('❌ Create failed:'));

    if (error.response) {
      console.error(chalk.red(`   API Error: ${error.response.status} ${error.response.statusText}`));
      if (error.response.data?.message) {
        console.error(chalk.red(`   ${error.response.data.message}`));
      }
    } else if (error.request) {
      console.error(chalk.red('   Network error: Could not reach API server'));
    } else {
      console.error(chalk.red(`   ${error.message}`));
    }

    process.exit(1);
  }
}
