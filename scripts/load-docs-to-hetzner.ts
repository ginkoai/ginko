/**
 * @fileType: utility
 * @status: current
 * @updated: 2025-11-03
 * @tags: [graph, data-loading, hetzner, migration]
 * @related: [batch-embed-nodes.ts, api/v1/graph/_cloud-graph-client.ts]
 * @priority: high
 * @complexity: medium
 * @dependencies: [dotenv, fs, glob]
 */

import { CloudGraphClient } from '../api/v1/graph/_cloud-graph-client.js';
import fs from 'fs/promises';
import path from 'path';
import { glob } from 'glob';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

interface Document {
  id: string;
  type: string;
  title: string;
  content: string;
  summary: string;
  tags: string[];
  metadata: Record<string, any>;
  filePath: string;
}

/**
 * Extract title from markdown
 */
function extractTitle(content: string): string {
  const headingMatch = content.match(/^#\s+(.+)$/m);
  return headingMatch ? headingMatch[1].trim() : 'Untitled';
}

/**
 * Generate summary from content
 */
function generateSummary(content: string): string {
  const paragraphs = content.split('\n\n');
  for (const para of paragraphs) {
    const cleaned = para.trim().replace(/^#+\s+/, '').replace(/\n/g, ' ');
    if (cleaned && !cleaned.startsWith('```') && cleaned.length > 20) {
      return cleaned.substring(0, 200);
    }
  }
  return '';
}

/**
 * Extract tags from content
 */
function extractTags(content: string, additionalKeywords: string[] = []): string[] {
  const tags: string[] = [];
  const lowerContent = content.toLowerCase();
  const keywords = [
    'auth', 'database', 'api', 'graph', 'neo4j', 'cloud', 'oauth',
    'typescript', 'testing', 'performance', 'security', 'architecture',
    'context', 'session', 'cli', 'web', 'platform', 'knowledge',
    'ai', 'monetization', 'infrastructure', 'migration', 'graphql',
    ...additionalKeywords
  ];

  keywords.forEach(keyword => {
    if (lowerContent.includes(keyword)) {
      tags.push(keyword);
    }
  });

  return [...new Set(tags)];
}

/**
 * Parse ADR file
 */
async function parseADR(filePath: string): Promise<Document | null> {
  try {
    const content = await fs.readFile(filePath, 'utf-8');
    const fileName = path.basename(filePath, '.md');

    // Extract ID from filename (e.g., "ADR-039-..." -> "ADR-039")
    const idMatch = fileName.match(/^ADR-(\d+)/);
    if (!idMatch) {
      console.warn(`Skipping ADR with invalid name: ${fileName}`);
      return null;
    }
    const id = `ADR-${idMatch[1].padStart(3, '0')}`;

    const title = extractTitle(content);
    const summary = generateSummary(content);

    // Extract status
    const statusMatch = content.match(/[*-]\s*\*\*Status\*\*:\s*(.+)/i);
    const status = statusMatch ? statusMatch[1].trim().toLowerCase() : 'accepted';

    return {
      id,
      type: 'ADR',
      title,
      content,
      summary: summary || title,
      tags: extractTags(content),
      metadata: { status, number: parseInt(idMatch[1]) },
      filePath
    };
  } catch (error) {
    console.error(`Error parsing ADR ${filePath}:`, error);
    return null;
  }
}

/**
 * Parse PRD file
 */
async function parsePRD(filePath: string): Promise<Document | null> {
  try {
    const content = await fs.readFile(filePath, 'utf-8');
    const fileName = path.basename(filePath, '.md');

    const idMatch = fileName.match(/^PRD-(\d+)/);
    if (!idMatch) {
      console.warn(`Skipping PRD with invalid name: ${fileName}`);
      return null;
    }
    const id = `PRD-${idMatch[1].padStart(3, '0')}`;

    return {
      id,
      type: 'PRD',
      title: extractTitle(content),
      content,
      summary: generateSummary(content) || extractTitle(content),
      tags: extractTags(content),
      metadata: { number: parseInt(idMatch[1]) },
      filePath
    };
  } catch (error) {
    console.error(`Error parsing PRD ${filePath}:`, error);
    return null;
  }
}

/**
 * Parse Pattern file
 */
async function parsePattern(filePath: string): Promise<Document | null> {
  try {
    const content = await fs.readFile(filePath, 'utf-8');
    const fileName = path.basename(filePath, '.md');

    const id = `pattern_${fileName.replace(/[^a-zA-Z0-9-]/g, '_')}`;

    return {
      id,
      type: 'Pattern',
      title: extractTitle(content),
      content,
      summary: generateSummary(content) || extractTitle(content),
      tags: extractTags(content, ['pattern']),
      metadata: {},
      filePath
    };
  } catch (error) {
    console.error(`Error parsing Pattern ${filePath}:`, error);
    return null;
  }
}

/**
 * Scan and parse documents
 */
async function scanDocuments(): Promise<Document[]> {
  const documents: Document[] = [];

  // Scan ADRs
  console.log('📁 Scanning for ADRs...');
  const adrFiles = glob.sync('docs/adr/ADR-*.md', { ignore: ['**/node_modules/**'] });
  console.log(`  Found ${adrFiles.length} ADR files`);

  for (const file of adrFiles) {
    const doc = await parseADR(file);
    if (doc) documents.push(doc);
  }

  // Scan PRDs
  console.log('📁 Scanning for PRDs...');
  const prdFiles = glob.sync('docs/PRD/PRD-*.md', { ignore: ['**/node_modules/**'] });
  console.log(`  Found ${prdFiles.length} PRD files`);

  for (const file of prdFiles) {
    const doc = await parsePRD(file);
    if (doc) documents.push(doc);
  }

  // Scan Patterns
  console.log('📁 Scanning for Patterns...');
  const patternFiles = glob.sync('.ginko/context/modules/*pattern*.md', { ignore: ['**/node_modules/**'] });
  console.log(`  Found ${patternFiles.length} Pattern files`);

  for (const file of patternFiles) {
    const doc = await parsePattern(file);
    if (doc) documents.push(doc);
  }

  return documents;
}

/**
 * Main loader function
 */
async function loadDocsToHetzner() {
  console.log('============================================');
  console.log('  Load Documents to Hetzner Neo4j');
  console.log('  Target: Graph-based multi-tenant structure');
  console.log('============================================\n');

  // Validate environment
  const bearerToken = process.env.GINKO_GRAPH_TOKEN || 'test_token_12345';
  const graphId = process.env.GINKO_GRAPH_ID || process.env.GRAPH_ID;

  if (!graphId) {
    console.error('❌ Error: GINKO_GRAPH_ID or GRAPH_ID environment variable required');
    console.error('   Set it to your graph ID (e.g., "gin_xyz")');
    process.exit(1);
  }

  console.log('Configuration:');
  console.log(`  Graph ID: ${graphId}`);
  console.log(`  Token: ${bearerToken.substring(0, 10)}...`);
  console.log();

  try {
    // Step 1: Connect to graph
    console.log('Step 1: Connecting to Cloud Graph API...');
    const client = await CloudGraphClient.fromBearerToken(bearerToken, graphId);
    console.log('✓ Connected to graph\n');

    // Step 2: Scan documents
    console.log('Step 2: Scanning repository for documents...');
    const documents = await scanDocuments();

    if (documents.length === 0) {
      console.log('⚠️  No documents found to load');
      return;
    }

    console.log(`\n✓ Found ${documents.length} documents to load`);

    // Group by type
    const byType = documents.reduce((acc, doc) => {
      acc[doc.type] = (acc[doc.type] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    console.log('  Breakdown:');
    Object.entries(byType).forEach(([type, count]) => {
      console.log(`    - ${type}: ${count}`);
    });
    console.log();

    // Step 3: Load documents
    console.log('Step 3: Creating nodes in graph...');
    let loaded = 0;
    let failed = 0;

    for (const doc of documents) {
      try {
        const nodeData: any = {
          id: doc.id,
          title: doc.title,
          content: doc.content,
          summary: doc.summary,
          tags: doc.tags,
          file_path: doc.filePath,
          ...doc.metadata
        };

        await client.createNode(doc.type, nodeData);
        loaded++;

        // Progress every 10 documents
        if (loaded % 10 === 0) {
          console.log(`  ✓ Loaded ${loaded}/${documents.length} documents`);
        }
      } catch (error: any) {
        console.error(`  ✗ Failed to load ${doc.id}: ${error.message}`);
        failed++;
      }
    }

    console.log(`\n✓ Load complete: ${loaded} successful, ${failed} failed\n`);

    // Step 4: Verify
    console.log('Step 4: Verifying graph state...');
    const stats = await client.getGraphStats();
    console.log(`✓ Total nodes: ${stats.nodes.total}`);
    console.log('  Nodes by type:');
    Object.entries(stats.nodes.byType).forEach(([type, count]) => {
      console.log(`    - ${type}: ${count}`);
    });
    console.log();

    console.log('============================================');
    console.log('✅ Documents loaded to Hetzner!');
    console.log('============================================\n');

    console.log('Next step:');
    console.log('  Run batch embeddings: npm run graph:batch-embed');
    console.log();

  } catch (error: any) {
    console.error('\n❌ Error:', error.message);
    console.error('Stack:', error.stack);
    process.exit(1);
  }
}

// Run if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
  loadDocsToHetzner()
    .then(() => process.exit(0))
    .catch(error => {
      console.error(error);
      process.exit(1);
    });
}

export { loadDocsToHetzner };
