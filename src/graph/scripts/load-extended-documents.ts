/**
 * @fileType: utility
 * @status: current
 * @updated: 2025-10-31
 * @tags: [neo4j, data-loading, patterns, gotchas, sessions, context-modules]
 * @related: [load-all-documents.ts, neo4j-client.ts]
 * @priority: high
 * @complexity: medium
 * @dependencies: [fs/promises]
 */

import { neo4jClient } from '../neo4j-client';
import fs from 'fs/promises';
import path from 'path';

interface BaseDocument {
  id: string;
  title: string;
  content: string;
  summary: string;
  tags: string[];
  filePath: string;
}

interface PatternDocument extends BaseDocument {
  category: string;
  complexity?: string;
}

interface GotchaDocument extends BaseDocument {
  severity: string;
  mitigation?: string;
}

interface SessionDocument extends BaseDocument {
  date: string;
  author?: string;
}

interface ContextModuleDocument extends BaseDocument {
  category: string;
}

/**
 * Parse a pattern file from .ginko/context/modules/
 */
async function parsePatternFile(filePath: string): Promise<PatternDocument | null> {
  try {
    const content = await fs.readFile(filePath, 'utf-8');
    const fileName = path.basename(filePath, '.md');

    // Generate ID from filename
    const id = `PATTERN-${fileName.replace(/[^a-zA-Z0-9-]/g, '-').substring(0, 50)}`;

    // Extract title
    const titleMatch = content.match(/^#\s+(.+)$/m);
    const title = titleMatch ? titleMatch[1].trim() : fileName.replace(/-/g, ' ');

    // Generate summary
    const paragraphs = content.split('\n\n');
    let summary = '';
    for (const para of paragraphs) {
      const cleaned = para.trim().replace(/^#+\s+/, '').replace(/\n/g, ' ');
      if (cleaned && !cleaned.startsWith('```') && cleaned.length > 20) {
        summary = cleaned.substring(0, 200);
        break;
      }
    }

    // Extract category from filename
    const category = fileName.includes('architecture') ? 'architecture'
      : fileName.includes('ai-') ? 'ai-development'
      : fileName.includes('collaboration') ? 'collaboration'
      : 'general';

    // Extract tags
    const tags: string[] = [];
    const lowerContent = content.toLowerCase();
    const keywords = ['pattern', 'architecture', 'ai', 'context', 'reflection',
                      'collaboration', 'development', 'learning', 'orchestration'];
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
      tags: [...new Set(tags)],
      filePath,
      category,
      complexity: content.includes('complex') ? 'high' : content.includes('simple') ? 'low' : 'medium'
    };
  } catch (error) {
    console.error(`Error parsing pattern ${filePath}:`, error);
    return null;
  }
}

/**
 * Parse a gotcha file from .ginko/context/modules/
 */
async function parseGotchaFile(filePath: string): Promise<GotchaDocument | null> {
  try {
    const content = await fs.readFile(filePath, 'utf-8');
    const fileName = path.basename(filePath, '.md');

    // Generate ID from filename
    const id = `GOTCHA-${fileName.replace('gotcha-', '').replace(/[^a-zA-Z0-9-]/g, '-').substring(0, 50)}`;

    // Extract title
    const titleMatch = content.match(/^#\s+(.+)$/m);
    const title = titleMatch ? titleMatch[1].trim() : fileName.replace(/gotcha-|[_-]/g, ' ');

    // Generate summary
    const paragraphs = content.split('\n\n');
    let summary = '';
    for (const para of paragraphs) {
      const cleaned = para.trim().replace(/^#+\s+/, '').replace(/\n/g, ' ');
      if (cleaned && !cleaned.startsWith('```') && cleaned.length > 20) {
        summary = cleaned.substring(0, 200);
        break;
      }
    }

    // Determine severity
    const severity = content.toLowerCase().includes('critical') || content.toLowerCase().includes('blocking')
      ? 'high'
      : content.toLowerCase().includes('warning')
      ? 'medium'
      : 'low';

    // Extract tags
    const tags: string[] = [];
    const lowerContent = content.toLowerCase();
    const keywords = ['gotcha', 'bug', 'pitfall', 'error', 'warning', 'react',
                      'database', 'vercel', 'hooks', 'architecture'];
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
      tags: [...new Set(tags)],
      filePath,
      severity
    };
  } catch (error) {
    console.error(`Error parsing gotcha ${filePath}:`, error);
    return null;
  }
}

/**
 * Parse a session log from .ginko/sessions/
 */
async function parseSessionFile(filePath: string): Promise<SessionDocument | null> {
  try {
    const content = await fs.readFile(filePath, 'utf-8');
    const fileName = path.basename(filePath, '.md');

    // Extract date from filename
    const dateMatch = fileName.match(/(\d{4}-\d{2}-\d{2})/);
    const date = dateMatch ? dateMatch[1] : new Date().toISOString().split('T')[0];

    // Generate ID
    const id = `SESSION-${date}-${fileName.substring(0, 20).replace(/[^a-zA-Z0-9-]/g, '-')}`;

    // Extract title
    const titleMatch = content.match(/^#\s+(.+)$/m);
    const title = titleMatch ? titleMatch[1].trim() : `Session ${date}`;

    // Generate summary from first section
    const summaryMatch = content.match(/##\s+Summary[\s\S]*?\n\n([\s\S]*?)(?=\n##|\n---|\z)/i);
    const summary = summaryMatch
      ? summaryMatch[1].trim().substring(0, 200)
      : content.substring(0, 200).replace(/^#+\s+/gm, '');

    // Extract tags
    const tags: string[] = ['session'];
    const lowerContent = content.toLowerCase();
    const keywords = ['feature', 'fix', 'refactor', 'test', 'deploy',
                      'architecture', 'database', 'api', 'ui'];
    keywords.forEach(keyword => {
      if (lowerContent.includes(keyword)) {
        tags.push(keyword);
      }
    });

    return {
      id,
      title,
      content,
      summary,
      tags: [...new Set(tags)],
      filePath,
      date
    };
  } catch (error) {
    console.error(`Error parsing session ${filePath}:`, error);
    return null;
  }
}

/**
 * Parse a context module from .ginko/context/modules/
 */
async function parseContextModuleFile(filePath: string): Promise<ContextModuleDocument | null> {
  try {
    const content = await fs.readFile(filePath, 'utf-8');
    const fileName = path.basename(filePath, '.md');

    // Generate ID from filename
    const id = `MODULE-${fileName.replace('module-', '').replace(/[^a-zA-Z0-9-]/g, '-').substring(0, 50)}`;

    // Extract title
    const titleMatch = content.match(/^#\s+(.+)$/m);
    const title = titleMatch ? titleMatch[1].trim() : fileName.replace(/module-|[_-]/g, ' ');

    // Generate summary
    const paragraphs = content.split('\n\n');
    let summary = '';
    for (const para of paragraphs) {
      const cleaned = para.trim().replace(/^#+\s+/, '').replace(/\n/g, ' ');
      if (cleaned && !cleaned.startsWith('```') && cleaned.length > 20) {
        summary = cleaned.substring(0, 200);
        break;
      }
    }

    // Extract category
    const category = fileName.includes('test') ? 'testing'
      : fileName.includes('insight') ? 'insights'
      : 'conventions';

    // Extract tags
    const tags: string[] = ['module', 'context'];
    const lowerContent = content.toLowerCase();
    const keywords = ['convention', 'standard', 'practice', 'pattern', 'rule'];
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
      tags: [...new Set(tags)],
      filePath,
      category
    };
  } catch (error) {
    console.error(`Error parsing context module ${filePath}:`, error);
    return null;
  }
}

/**
 * Load documents into Neo4j
 */
async function loadPatterns(patterns: PatternDocument[]): Promise<number> {
  let loaded = 0;
  for (const pattern of patterns) {
    try {
      await neo4jClient.query(`
        MERGE (n:Pattern {id: $id})
        SET n.title = $title,
            n.content = $content,
            n.summary = $summary,
            n.category = $category,
            n.complexity = $complexity,
            n.tags = $tags,
            n.file_path = $filePath,
            n.project_id = $projectId,
            n.updated_at = datetime(),
            n.created_at = COALESCE(n.created_at, datetime())
      `, {
        id: pattern.id,
        title: pattern.title,
        content: pattern.content,
        summary: pattern.summary,
        category: pattern.category,
        complexity: pattern.complexity || 'medium',
        tags: pattern.tags,
        filePath: pattern.filePath,
        projectId: 'ginko-local'
      });
      loaded++;
    } catch (error) {
      console.error(`Failed to load pattern ${pattern.id}:`, error);
    }
  }
  return loaded;
}

async function loadGotchas(gotchas: GotchaDocument[]): Promise<number> {
  let loaded = 0;
  for (const gotcha of gotchas) {
    try {
      await neo4jClient.query(`
        MERGE (n:Gotcha {id: $id})
        SET n.title = $title,
            n.content = $content,
            n.summary = $summary,
            n.severity = $severity,
            n.tags = $tags,
            n.file_path = $filePath,
            n.project_id = $projectId,
            n.updated_at = datetime(),
            n.created_at = COALESCE(n.created_at, datetime())
      `, {
        id: gotcha.id,
        title: gotcha.title,
        content: gotcha.content,
        summary: gotcha.summary,
        severity: gotcha.severity,
        tags: gotcha.tags,
        filePath: gotcha.filePath,
        projectId: 'ginko-local'
      });
      loaded++;
    } catch (error) {
      console.error(`Failed to load gotcha ${gotcha.id}:`, error);
    }
  }
  return loaded;
}

async function loadSessions(sessions: SessionDocument[]): Promise<number> {
  let loaded = 0;
  for (const session of sessions) {
    try {
      await neo4jClient.query(`
        MERGE (n:Session {id: $id})
        SET n.title = $title,
            n.content = $content,
            n.summary = $summary,
            n.date = $date,
            n.tags = $tags,
            n.file_path = $filePath,
            n.project_id = $projectId,
            n.updated_at = datetime(),
            n.created_at = COALESCE(n.created_at, datetime())
      `, {
        id: session.id,
        title: session.title,
        content: session.content,
        summary: session.summary,
        date: session.date,
        tags: session.tags,
        filePath: session.filePath,
        projectId: 'ginko-local'
      });
      loaded++;
    } catch (error) {
      console.error(`Failed to load session ${session.id}:`, error);
    }
  }
  return loaded;
}

async function loadContextModules(modules: ContextModuleDocument[]): Promise<number> {
  let loaded = 0;
  for (const module of modules) {
    try {
      await neo4jClient.query(`
        MERGE (n:ContextModule {id: $id})
        SET n.title = $title,
            n.content = $content,
            n.summary = $summary,
            n.category = $category,
            n.tags = $tags,
            n.file_path = $filePath,
            n.project_id = $projectId,
            n.updated_at = datetime(),
            n.created_at = COALESCE(n.created_at, datetime())
      `, {
        id: module.id,
        title: module.title,
        content: module.content,
        summary: module.summary,
        category: module.category,
        tags: module.tags,
        filePath: module.filePath,
        projectId: 'ginko-local'
      });
      loaded++;
    } catch (error) {
      console.error(`Failed to load context module ${module.id}:`, error);
    }
  }
  return loaded;
}

/**
 * Main loader function
 */
async function loadExtendedDocuments() {
  try {
    console.log('🚀 Loading Patterns, Gotchas, Sessions, and Context Modules...\n');

    await neo4jClient.connect();

    const rootDir = process.cwd();
    const modulesDir = path.join(rootDir, '.ginko', 'context', 'modules');
    const sessionsDir = path.join(rootDir, '.ginko', 'sessions');

    // Scan context modules directory
    console.log('📁 Scanning .ginko/context/modules/...');
    const moduleFiles = await fs.readdir(modulesDir);

    // Categorize files
    const patternFiles = moduleFiles
      .filter(f => f.endsWith('.md') && !f.startsWith('gotcha-') && !f.startsWith('module-'))
      .map(f => path.join(modulesDir, f));

    const gotchaFiles = moduleFiles
      .filter(f => f.endsWith('.md') && f.startsWith('gotcha-'))
      .map(f => path.join(modulesDir, f));

    const contextModuleFiles = moduleFiles
      .filter(f => f.endsWith('.md') && f.startsWith('module-'))
      .map(f => path.join(modulesDir, f));

    console.log(`  Found ${patternFiles.length} pattern files`);
    console.log(`  Found ${gotchaFiles.length} gotcha files`);
    console.log(`  Found ${contextModuleFiles.length} context module files\n`);

    // Scan session archives
    console.log('📁 Scanning .ginko/sessions/ archives...');
    const userDirs = await fs.readdir(sessionsDir);
    const sessionFiles: string[] = [];

    for (const userDir of userDirs) {
      const archiveDir = path.join(sessionsDir, userDir, 'archive');
      try {
        const archiveFiles = await fs.readdir(archiveDir);
        const mdFiles = archiveFiles
          .filter(f => f.endsWith('.md'))
          .map(f => path.join(archiveDir, f));
        sessionFiles.push(...mdFiles);
      } catch (error) {
        // Skip if archive directory doesn't exist
      }
    }
    console.log(`  Found ${sessionFiles.length} session files\n`);

    // Parse files
    console.log('📥 Parsing documents...');
    const patterns = (await Promise.all(patternFiles.map(parsePatternFile))).filter((p): p is PatternDocument => p !== null);
    const gotchas = (await Promise.all(gotchaFiles.map(parseGotchaFile))).filter((g): g is GotchaDocument => g !== null);
    const sessions = (await Promise.all(sessionFiles.map(parseSessionFile))).filter((s): s is SessionDocument => s !== null);
    const contextModules = (await Promise.all(contextModuleFiles.map(parseContextModuleFile))).filter((m): m is ContextModuleDocument => m !== null);

    console.log(`  ✓ Parsed ${patterns.length} patterns`);
    console.log(`  ✓ Parsed ${gotchas.length} gotchas`);
    console.log(`  ✓ Parsed ${sessions.length} sessions`);
    console.log(`  ✓ Parsed ${contextModules.length} context modules\n`);

    // Load into Neo4j
    console.log('💾 Loading into Neo4j...');
    const patternsLoaded = await loadPatterns(patterns);
    const gotchasLoaded = await loadGotchas(gotchas);
    const sessionsLoaded = await loadSessions(sessions);
    const modulesLoaded = await loadContextModules(contextModules);

    console.log(`  ✓ Loaded ${patternsLoaded} patterns`);
    console.log(`  ✓ Loaded ${gotchasLoaded} gotchas`);
    console.log(`  ✓ Loaded ${sessionsLoaded} sessions`);
    console.log(`  ✓ Loaded ${modulesLoaded} context modules\n`);

    // Show updated stats
    console.log('📊 Updated database statistics:');
    const stats = await neo4jClient.getStats();
    stats.forEach((s: any) => {
      if (s.labels.length === 1) {
        console.log(`  ${s.labels[0]}: ${s.count} nodes`);
      }
    });

    console.log('\n✅ Extended document loading complete!');
    console.log('\nNext steps:');
    console.log('  1. Generate embeddings: npm run graph:embed');
    console.log('  2. Extract relationships: npm run graph:extract-relationships');
    console.log('  3. View in Neo4j Browser: http://localhost:7474');

  } catch (error) {
    console.error('\n❌ Error:', error);
    throw error;
  } finally {
    await neo4jClient.close();
  }
}

// Run if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
  loadExtendedDocuments()
    .then(() => process.exit(0))
    .catch(error => {
      console.error(error);
      process.exit(1);
    });
}

export { loadExtendedDocuments };
