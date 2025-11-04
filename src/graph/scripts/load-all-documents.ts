/**
 * @fileType: utility
 * @status: current
 * @updated: 2025-10-28
 * @tags: [neo4j, data-loading, migration, bulk-import]
 * @related: [neo4j-client.ts, load-sample-data.ts]
 * @priority: high
 * @complexity: medium
 * @dependencies: [fs/promises, glob]
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
    const keywords = [
      'auth', 'database', 'api', 'graph', 'neo4j', 'cloud', 'oauth',
      'typescript', 'testing', 'performance', 'security', 'architecture',
      'context', 'session', 'cli', 'web', 'platform', 'knowledge',
      'ai', 'monetization', 'infrastructure', 'migration', 'graphql'
    ];
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
}

/**
 * Load ALL ADRs and PRDs from docs directory
 */
async function loadAllDocuments() {
  try {
    console.log('🚀 Loading all ADRs and PRDs from repository...\n');

    // Connect to Neo4j
    await neo4jClient.connect();

    const rootDir = process.cwd();

    // Find all ADR files
    console.log('📁 Scanning for ADR files...');
    const adrDir = path.join(rootDir, 'docs', 'adr');
    const adrFilenames = await fs.readdir(adrDir);
    const adrFiles = adrFilenames
      .filter(f => f.startsWith('ADR-') && f.endsWith('.md'))
      .map(f => path.join('docs', 'adr', f));
    console.log(`  Found ${adrFiles.length} ADR files\n`);

    // Find all PRD files
    console.log('📁 Scanning for PRD files...');
    const prdDir = path.join(rootDir, 'docs', 'PRD');
    const prdFilenames = await fs.readdir(prdDir);
    const prdFiles = prdFilenames
      .filter(f => f.startsWith('PRD-') && f.endsWith('.md'))
      .map(f => path.join('docs', 'PRD', f));
    console.log(`  Found ${prdFiles.length} PRD files\n`);

    // Load ADRs
    console.log('📥 Loading ADRs...');
    let adrLoaded = 0;
    for (const relPath of adrFiles) {
      const fullPath = path.join(rootDir, relPath);
      const doc = await parseMarkdownFile(fullPath);
      if (doc) {
        await loadDocument(doc, 'ADR');
        adrLoaded++;
      }
    }
    console.log(`  ✓ Loaded ${adrLoaded} ADRs\n`);

    // Load PRDs
    console.log('📥 Loading PRDs...');
    let prdLoaded = 0;
    for (const relPath of prdFiles) {
      const fullPath = path.join(rootDir, relPath);
      const doc = await parseMarkdownFile(fullPath);
      if (doc) {
        await loadDocument(doc, 'PRD');
        prdLoaded++;
      }
    }
    console.log(`  ✓ Loaded ${prdLoaded} PRDs\n`);

    // Show database stats
    console.log('📊 Database statistics:');
    const stats = await neo4jClient.getStats();
    const relevantStats = stats.filter((s: any) =>
      s.labels.length === 1 && ['ADR', 'PRD'].includes(s.labels[0])
    );
    relevantStats.forEach((s: any) => {
      console.log(`  ${s.labels[0]}: ${s.count} nodes`);
    });

    // Sample some tags
    console.log('\n🏷️  Popular tags:');
    const tagStats = await neo4jClient.queryRecords(`
      MATCH (n)
      WHERE n:ADR OR n:PRD
      UNWIND n.tags as tag
      RETURN tag, count(*) as count
      ORDER BY count DESC
      LIMIT 10
    `);
    tagStats.forEach((t: any) => {
      console.log(`  ${t.tag}: ${t.count} documents`);
    });

    console.log('\n✅ All documents loaded successfully!');
    console.log('\nNext steps:');
    console.log('  1. Test context queries: npm run graph:test-query');
    console.log('  2. Test advanced queries: npx tsx src/graph/scripts/test-advanced-queries.ts');
    console.log('  3. Open Neo4j Browser: http://localhost:7474');

  } catch (error) {
    console.error('\n❌ Failed to load documents:', error);
    process.exit(1);
  } finally {
    await neo4jClient.close();
  }
}

// Run if called directly
if (require.main === module) {
  loadAllDocuments();
}

export { loadAllDocuments };
