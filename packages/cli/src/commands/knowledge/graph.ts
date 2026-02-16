/**
 * @fileType: command
 * @status: current
 * @updated: 2025-11-07
 * @tags: [knowledge, graph, visualization, graphql, task-025]
 * @related: [index.ts, api-client.ts]
 * @priority: critical
 * @complexity: medium
 * @dependencies: [chalk, axios]
 */

/**
 * Graph Command (TASK-025)
 *
 * Visualize node relationships via GraphQL API
 */

import chalk from 'chalk';
import axios from 'axios';
import { getConfig, getApiToken } from '../graph/config.js';
import { requireCloud } from '../../utils/cloud-guard.js';

interface GraphOptions {
  depth: number;
  types?: string;
  format: string;
}

interface Relationship {
  type: string;
  fromId: string;
  toId: string;
}

interface KnowledgeNode {
  id: string;
  title?: string;
  type: string;
  tags?: string[];
}

interface NodeGraph {
  centerNode: KnowledgeNode;
  connectedNodes: KnowledgeNode[];
  relationships: Relationship[];
  depth: number;
}

/**
 * Visualize node and its relationship graph
 */
export async function graphCommand(nodeId: string, options: GraphOptions): Promise<void> {
  await requireCloud('knowledge graph');
  try {
    console.log(chalk.dim(`📊 Fetching graph for node: ${nodeId}\n`));

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

    // Parse relationship types filter
    const relationshipTypes = options.types
      ? options.types.split(',').map(t => t.trim())
      : null;

    // GraphQL query
    const graphqlQuery = `
      query NodeGraph($nodeId: ID!, $graphId: String!, $depth: Int, $relationshipTypes: [RelationshipType!]) {
        nodeGraph(
          nodeId: $nodeId
          graphId: $graphId
          depth: $depth
          relationshipTypes: $relationshipTypes
        ) {
          centerNode {
            id
            title
            type
            tags
          }
          connectedNodes {
            id
            title
            type
            tags
          }
          relationships {
            type
            fromId
            toId
          }
          depth
        }
      }
    `;

    const variables = {
      nodeId,
      graphId: config.graphId,
      depth: options.depth,
      relationshipTypes,
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

    const graph: NodeGraph = response.data.data.nodeGraph;

    if (!graph) {
      console.error(chalk.yellow('⚠️  Node not found or no relationships'));
      process.exit(0);
    }

    // Display based on format
    switch (options.format) {
      case 'json':
        console.log(JSON.stringify(graph, null, 2));
        break;

      case 'mermaid':
        renderMermaid(graph);
        break;

      case 'tree':
      default:
        renderTree(graph);
        break;
    }

  } catch (error: any) {
    console.error(chalk.red('❌ Graph fetch failed:'));

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

/**
 * Render graph as a tree structure
 */
function renderTree(graph: NodeGraph): void {
  console.log(chalk.bold.green('Center Node:'));
  console.log(chalk.cyan(`  📄 ${graph.centerNode.title || graph.centerNode.id}`));
  console.log(chalk.dim(`     Type: ${graph.centerNode.type} | ID: ${graph.centerNode.id}`));
  if (graph.centerNode.tags && graph.centerNode.tags.length > 0) {
    console.log(chalk.dim(`     Tags: ${graph.centerNode.tags.join(', ')}`));
  }
  console.log('');

  if (graph.connectedNodes.length === 0) {
    console.log(chalk.yellow('  No connected nodes found'));
    return;
  }

  console.log(chalk.bold.green(`Connected Nodes (${graph.connectedNodes.length}):`));

  // Group relationships by type
  const relsByType = new Map<string, Relationship[]>();
  graph.relationships.forEach(rel => {
    if (!relsByType.has(rel.type)) {
      relsByType.set(rel.type, []);
    }
    relsByType.get(rel.type)!.push(rel);
  });

  // Display grouped by relationship type
  relsByType.forEach((rels, type) => {
    console.log(chalk.yellow(`\n  ${type.replace(/_/g, ' ')} (${rels.length}):`));

    rels.forEach((rel, index) => {
      const isLast = index === rels.length - 1;
      const prefix = isLast ? '  └─' : '  ├─';

      // Find the target node
      const targetId = rel.fromId === graph.centerNode.id ? rel.toId : rel.fromId;
      const targetNode = graph.connectedNodes.find(n => n.id === targetId);

      if (targetNode) {
        const direction = rel.fromId === graph.centerNode.id ? '→' : '←';
        console.log(chalk.dim(`${prefix} ${direction} ${targetNode.title || targetNode.id}`));
        console.log(chalk.dim(`     ${targetNode.type} | ${targetNode.id}`));
      }
    });
  });

  console.log('');
  console.log(chalk.dim(`\n📊 Total: ${graph.connectedNodes.length} nodes, ${graph.relationships.length} relationships`));
}

/**
 * Render graph as Mermaid diagram
 */
function renderMermaid(graph: NodeGraph): void {
  console.log('```mermaid');
  console.log('graph TD');
  console.log(`  center["${graph.centerNode.title || graph.centerNode.id}"]`);
  console.log('');

  graph.connectedNodes.forEach((node, index) => {
    const nodeId = `node${index}`;
    console.log(`  ${nodeId}["${node.title || node.id}"]`);
  });

  console.log('');

  graph.relationships.forEach((rel, index) => {
    const fromNode = rel.fromId === graph.centerNode.id ? 'center' : `node${graph.connectedNodes.findIndex(n => n.id === rel.fromId)}`;
    const toNode = rel.toId === graph.centerNode.id ? 'center' : `node${graph.connectedNodes.findIndex(n => n.id === rel.toId)}`;
    console.log(`  ${fromNode} -->|${rel.type}| ${toNode}`);
  });

  console.log('```');
  console.log('');
  console.log(chalk.dim('💡 Copy the Mermaid diagram above to visualize in:'));
  console.log(chalk.dim('   - GitHub/GitLab markdown'));
  console.log(chalk.dim('   - https://mermaid.live'));
}
