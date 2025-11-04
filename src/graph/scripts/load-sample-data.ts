/**
 * @fileType: utility
 * @status: current
 * @updated: 2025-10-27
 * @tags: [neo4j, data-loading, migration, cli]
 * @related: [neo4j-client.ts]
 * @priority: high
 * @complexity: medium
 * @dependencies: [fs/promises]
 */

import { neo4jClient } from '../neo4j-client';
import fs from 'fs/promises';
import path from 'path';

interface Document {
  id: string;
  title: string;
  content: string;
  summary: string;
  status: string;
  tags: string[];
  filePath: string;
}

/**
 * Parse markdown file to extract metadata and content
 */
async function parseMarkdownFile(filePath: string): Promise<Document | null> {
  try {
    const content = await fs.readFile(filePath, 'utf-8');
    const fileName = path.basename(filePath, '.md');

    // Extract ID from filename (e.g., "ADR-039-..." -> "ADR-039")
    const idMatch = fileName.match(/^(ADR|PRD|TASK)-(\d+)/);
    if (!idMatch) {
      console.warn(`Skipping file with invalid name format: ${fileName}`);
      return null;
    }
    const id = `${idMatch[1]}-${idMatch[2].padStart(3, '0')}`;

    // Extract title (first # heading)
    const titleMatch = content.match(/^#\s+(.+)$/m);
    const title = titleMatch ? titleMatch[1].trim() : fileName;

    // Extract status (look for "Status:" or assume "accepted")
    const statusMatch = content.match(/[*-]\s*\*\*Status\*\*:\s*(.+)/i);
    const status = statusMatch ? statusMatch[1].trim().toLowerCase() : 'accepted';

    // Generate simple summary (first paragraph or first 200 chars)
    const paragraphs = content.split('\n\n');
    let summary = '';
    for (const para of paragraphs) {
      const cleaned = para.trim().replace(/^#+\s+/, '').replace(/\n/g, ' ');
      if (cleaned && !cleaned.startsWith('```') && cleaned.length > 20) {
        summary = cleaned.substring(0, 200);
        break;
      }
    }

    // Extract tags (look for common keywords in title and content)
    const tags: string[] = [];
    const lowerContent = content.toLowerCase();
    const keywords = ['auth', 'database', 'api', 'graph', 'neo4j', 'cloud', 'oauth', 'typescript', 'testing', 'performance', 'security'];
    keywords.forEach(keyword => {
      if (lowerContent.includes(keyword)) {
        tags.push(keyword);
      }
    });

    return {
      id,
      title,
      content,
      summary: summary || title,
      status,
      tags: [...new Set(tags)], // Deduplicate
      filePath
    };
  } catch (error) {
    console.error(`Error parsing ${filePath}:`, error);
    return null;
  }
}

/**
 * Load a document into Neo4j as ADR or PRD node
 */
async function loadDocument(doc: Document, type: 'ADR' | 'PRD'): Promise<void> {
  const cypher = `
    MERGE (n:${type} {id: $id})
    SET n.title = $title,
        n.content = $content,
        n.summary = $summary,
        n.status = $status,
        n.tags = $tags,
        n.file_path = $filePath,
        n.project_id = $projectId,
        n.updated_at = datetime(),
        n.created_at = COALESCE(n.created_at, datetime())
    RETURN n
  `;

  await neo4jClient.query(cypher, {
    id: doc.id,
    title: doc.title,
    content: doc.content,
    summary: doc.summary,
    status: doc.status,
    tags: doc.tags,
    filePath: doc.filePath,
    projectId: 'ginko-local' // Default project ID for local dev
  });

  console.log(`✓ Loaded ${type} ${doc.id}: ${doc.title}`);
}

/**
 * Load sample ADRs and PRDs from docs directory
 */
async function loadSampleData() {
  try {
    console.log('🚀 Loading sample data into Neo4j...\n');

    // Connect to Neo4j
    await neo4jClient.connect();

    // Define sample files to load
    const sampleADRs = [
      'docs/adr/ADR-002-ai-readable-code-frontmatter.md',
      'docs/adr/ADR-039-graph-based-context-discovery.md',
      'docs/adr/ADR-033-context-pressure-mitigation-strategy.md',
    ];

    const samplePRDs = [
      'docs/PRD/PRD-010-cloud-knowledge-graph.md',
    ];

    // Load ADRs
    console.log('Loading ADRs...');
    for (const filePath of sampleADRs) {
      const fullPath = path.join(process.cwd(), filePath);
      try {
        await fs.access(fullPath); // Check file exists
        const doc = await parseMarkdownFile(fullPath);
        if (doc) {
          await loadDocument(doc, 'ADR');
        }
      } catch (error: any) {
        if (error.code === 'ENOENT') {
          console.warn(`⚠ File not found: ${filePath}`);
        } else {
          throw error;
        }
      }
    }

    // Load PRDs
    console.log('\nLoading PRDs...');
    for (const filePath of samplePRDs) {
      const fullPath = path.join(process.cwd(), filePath);
      try {
        await fs.access(fullPath);
        const doc = await parseMarkdownFile(fullPath);
        if (doc) {
          await loadDocument(doc, 'PRD');
        }
      } catch (error: any) {
        if (error.code === 'ENOENT') {
          console.warn(`⚠ File not found: ${filePath}`);
        } else {
          throw error;
        }
      }
    }

    // Show database stats
    console.log('\n📊 Database statistics:');
    const stats = await neo4jClient.getStats();
    stats.forEach((s: any) => {
      console.log(`  ${s.labels.join(':')}: ${s.count} nodes`);
    });

    console.log('\n✅ Sample data loaded successfully!');
    console.log('\nNext step:');
    console.log('  Test context query: npm run graph:test-query');

  } catch (error) {
    console.error('\n❌ Failed to load sample data:', error);
    process.exit(1);
  } finally {
    await neo4jClient.close();
  }
}

// Run if called directly
if (require.main === module) {
  loadSampleData();
}

export { loadSampleData };
