#!/usr/bin/env ts-node

/**
 * Seed TaskFlow Example Project to Ginko Knowledge Graph
 *
 * This script uploads all example knowledge nodes (ADRs, PRDs, modules) to Ginko.
 *
 * Usage:
 *   ts-node seed-example.ts
 *
 * Prerequisites:
 *   - Ginko CLI installed: npm install -g @ginko/cli
 *   - Authenticated: ginko login
 *   - Project created: ginko project create taskflow --visibility public
 */

import fs from 'fs/promises';
import path from 'path';
import axios from 'axios';

const API_BASE = process.env.GINKO_API_URL || 'https://app.ginkoai.com';
const API_KEY = process.env.GINKO_API_KEY;
const GRAPH_ID = process.env.GINKO_GRAPH_ID || 'graph_taskflow';

if (!API_KEY) {
  console.error('❌ Error: GINKO_API_KEY environment variable not set');
  console.error('   Run: export GINKO_API_KEY=your_api_key');
  console.error('   Or: ginko login');
  process.exit(1);
}

const client = axios.create({
  baseURL: API_BASE,
  headers: {
    'Authorization': `Bearer ${API_KEY}`,
    'Content-Type': 'application/json',
  },
});

interface KnowledgeFile {
  path: string;
  type: 'ADR' | 'PRD' | 'ContextModule';
}

interface NodeMetadata {
  title: string;
  status: string;
  tags: string[];
  created: string;
  updated: string;
}

/**
 * Parse frontmatter from markdown file
 */
function parseFrontmatter(content: string): { metadata: NodeMetadata; content: string } {
  const frontmatterRegex = /^---\n([\s\S]*?)\n---\n([\s\S]*)$/;
  const match = content.match(frontmatterRegex);

  if (!match) {
    throw new Error('No frontmatter found');
  }

  const [, frontmatterStr, bodyContent] = match;

  // Parse frontmatter YAML (simple parsing)
  const metadata: Partial<NodeMetadata> = {};
  frontmatterStr.split('\n').forEach(line => {
    const [key, ...valueParts] = line.split(':');
    const value = valueParts.join(':').trim();

    if (key === 'title') metadata.title = value;
    if (key === 'status') metadata.status = value;
    if (key === 'tags') {
      // Parse [tag1, tag2] format
      const tagsMatch = value.match(/\[(.*?)\]/);
      if (tagsMatch) {
        metadata.tags = tagsMatch[1].split(',').map(t => t.trim());
      }
    }
    if (key === 'created') metadata.created = value;
    if (key === 'updated') metadata.updated = value;
  });

  return {
    metadata: metadata as NodeMetadata,
    content: bodyContent.trim(),
  };
}

/**
 * Create a knowledge node
 */
async function createNode(
  type: string,
  title: string,
  content: string,
  tags: string[],
  status: string
): Promise<{ id: string; title: string }> {
  try {
    const response = await client.post('/api/v1/knowledge/nodes', {
      type,
      graphId: GRAPH_ID,
      data: {
        title,
        content,
        status,
        tags,
      },
    });

    const node = response.data.node;
    console.log(`  ✅ Created: ${node.id} - ${node.title}`);
    return { id: node.id, title: node.title };
  } catch (error: any) {
    if (error.response?.data) {
      console.error(`  ❌ Error: ${error.response.data.error}`);
    } else {
      console.error(`  ❌ Error: ${error.message}`);
    }
    throw error;
  }
}

/**
 * Seed all knowledge files
 */
async function seedKnowledge() {
  console.log('🌱 Seeding TaskFlow Example Project\n');

  const files: KnowledgeFile[] = [
    // ADRs
    { path: 'docs/adr/ADR-001-postgresql-database.md', type: 'ADR' },
    { path: 'docs/adr/ADR-002-graphql-api-architecture.md', type: 'ADR' },

    // PRDs
    { path: 'docs/prd/PRD-001-user-authentication.md', type: 'PRD' },

    // Modules
    { path: 'docs/modules/MODULE-001-graphql-n1-prevention.md', type: 'ContextModule' },
  ];

  const createdNodes: Array<{ id: string; title: string; type: string }> = [];

  for (const file of files) {
    try {
      console.log(`\n📄 Processing: ${file.path}`);

      // Read file
      const filePath = path.join(__dirname, file.path);
      const content = await fs.readFile(filePath, 'utf-8');

      // Parse frontmatter
      const { metadata, content: bodyContent } = parseFrontmatter(content);

      // Create node
      const node = await createNode(
        file.type,
        metadata.title,
        bodyContent,
        metadata.tags,
        metadata.status
      );

      createdNodes.push({ ...node, type: file.type });

      // Wait to avoid rate limiting
      await new Promise(resolve => setTimeout(resolve, 500));
    } catch (error: any) {
      console.error(`❌ Failed to process ${file.path}:`, error.message);
    }
  }

  console.log('\n📊 Summary\n');
  console.log(`Total files processed: ${files.length}`);
  console.log(`Successfully created: ${createdNodes.length}`);
  console.log(`Failed: ${files.length - createdNodes.length}`);

  console.log('\n📚 Created Nodes:\n');
  createdNodes.forEach(node => {
    console.log(`  ${node.type}: ${node.title}`);
    console.log(`    ID: ${node.id}`);
  });

  console.log('\n✨ Seeding complete!\n');
  console.log('Next steps:');
  console.log('  1. Search: ginko knowledge search "database"');
  console.log('  2. Visualize: ginko knowledge graph <node-id>');
  console.log('  3. Explore: https://app.ginkoai.com/explore');
}

/**
 * Main
 */
async function main() {
  try {
    await seedKnowledge();
  } catch (error: any) {
    console.error('\n❌ Seeding failed:', error.message);
    process.exit(1);
  }
}

main();
