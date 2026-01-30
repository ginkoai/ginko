/**
 * @fileType: adapter
 * @status: deprecated
 * @deprecated: true
 * @updated: 2025-11-02
 * @tags: [write-adapter, local, filesystem, markdown, dual-write, adr-041]
 * @related: [../write-dispatcher.ts, graph-adapter.ts, ../../packages/cli/src/core/session-log-manager.ts]
 * @priority: high
 * @complexity: low
 * @dependencies: [fs-extra]
 */

import fs from 'fs-extra';
import * as path from 'path';
import type {
  WriteAdapter,
  KnowledgeDocument,
  WriteResult,
} from '../write-dispatcher.js';

/**
 * LocalAdapter Configuration
 */
export interface LocalAdapterConfig {
  ginkoDir: string;
  archiveDir?: string;
}

/**
 * LocalAdapter
 *
 * Writes knowledge documents to local filesystem as Markdown files.
 * Used during dual-write migration period for safety and rollback capability.
 *
 * Environment Variables:
 * - GINKO_DUAL_WRITE: 'true' to enable local writes alongside graph writes
 *
 * File Structure:
 * - ADR: .ginko/archive/ADR/ADR-{number}-{slug}.md
 * - PRD: .ginko/archive/PRD/PRD-{number}-{slug}.md
 * - Pattern: .ginko/archive/patterns/{slug}.md
 * - Gotcha: .ginko/archive/gotchas/{slug}.md
 * - LogEntry: .ginko/sessions/{user}/current-session-log.md (append)
 *
 * Usage:
 * ```typescript
 * const adapter = new LocalAdapter({
 *   ginkoDir: '/path/to/.ginko'
 * });
 *
 * dispatcher.registerAdapter(adapter);
 * ```
 */
export class LocalAdapter implements WriteAdapter {
  name = 'local';
  private config: LocalAdapterConfig;

  constructor(config: LocalAdapterConfig) {
    this.config = {
      ginkoDir: config.ginkoDir,
      archiveDir: config.archiveDir || path.join(config.ginkoDir, 'archive'),
    };
  }

  /**
   * Check if adapter is enabled via environment variable
   */
  enabled(): boolean {
    return process.env.GINKO_DUAL_WRITE === 'true';
  }

  /**
   * Write knowledge document to local filesystem
   */
  async write(document: KnowledgeDocument): Promise<WriteResult> {
    if (!this.enabled()) {
      throw new Error('LocalAdapter is not enabled. Check GINKO_DUAL_WRITE environment variable.');
    }

    try {
      const filePath = await this.writeDocument(document);

      return {
        source: 'local',
        path: filePath,
        timestamp: new Date().toISOString(),
      };
    } catch (error) {
      throw new Error(
        `LocalAdapter write failed: ${error instanceof Error ? error.message : String(error)}`
      );
    }
  }

  /**
   * Write document to appropriate location
   */
  private async writeDocument(document: KnowledgeDocument): Promise<string> {
    switch (document.type) {
      case 'ADR':
        return this.writeADR(document);
      case 'PRD':
        return this.writePRD(document);
      case 'Pattern':
        return this.writePattern(document);
      case 'Gotcha':
        return this.writeGotcha(document);
      case 'ContextModule':
        return this.writeContextModule(document);
      case 'LogEntry':
        return this.appendLogEntry(document);
      case 'Session':
        return this.writeSession(document);
      case 'CodeFile':
        return this.writeCodeFile(document);
      default:
        throw new Error(`Unsupported document type: ${document.type}`);
    }
  }

  /**
   * Write ADR to docs/adr/
   */
  private async writeADR(document: KnowledgeDocument): Promise<string> {
    const adrDir = path.join(process.cwd(), 'docs', 'adr');
    await fs.ensureDir(adrDir);

    const slug = this.slugify(document.title);
    const number = document.data.number || this.extractNumber(document.id);
    const filename = `ADR-${number.toString().padStart(3, '0')}-${slug}.md`;
    const filePath = path.join(adrDir, filename);

    const content = this.formatADR(document);
    await fs.writeFile(filePath, content, 'utf-8');

    return filePath;
  }

  /**
   * Write PRD to docs/PRD/
   */
  private async writePRD(document: KnowledgeDocument): Promise<string> {
    const prdDir = path.join(process.cwd(), 'docs', 'PRD');
    await fs.ensureDir(prdDir);

    const slug = this.slugify(document.title);
    const number = document.data.number || this.extractNumber(document.id);
    const filename = `PRD-${number.toString().padStart(3, '0')}-${slug}.md`;
    const filePath = path.join(prdDir, filename);

    const content = this.formatPRD(document);
    await fs.writeFile(filePath, content, 'utf-8');

    return filePath;
  }

  /**
   * Write Pattern to archive/patterns/
   */
  private async writePattern(document: KnowledgeDocument): Promise<string> {
    const patternsDir = path.join(this.config.archiveDir!, 'patterns');
    await fs.ensureDir(patternsDir);

    const slug = this.slugify(document.title);
    const filename = `${slug}.md`;
    const filePath = path.join(patternsDir, filename);

    const content = this.formatPattern(document);
    await fs.writeFile(filePath, content, 'utf-8');

    return filePath;
  }

  /**
   * Write Gotcha to archive/gotchas/
   */
  private async writeGotcha(document: KnowledgeDocument): Promise<string> {
    const gotchasDir = path.join(this.config.archiveDir!, 'gotchas');
    await fs.ensureDir(gotchasDir);

    const slug = this.slugify(document.title);
    const filename = `${slug}.md`;
    const filePath = path.join(gotchasDir, filename);

    const content = this.formatGotcha(document);
    await fs.writeFile(filePath, content, 'utf-8');

    return filePath;
  }

  /**
   * Write ContextModule to context/modules/
   */
  private async writeContextModule(document: KnowledgeDocument): Promise<string> {
    const modulesDir = path.join(this.config.ginkoDir, 'context', 'modules');
    await fs.ensureDir(modulesDir);

    const slug = this.slugify(document.title);
    const filename = `${slug}.md`;
    const filePath = path.join(modulesDir, filename);

    const content = this.formatContextModule(document);
    await fs.writeFile(filePath, content, 'utf-8');

    return filePath;
  }

  /**
   * Append LogEntry to session log
   */
  private async appendLogEntry(document: KnowledgeDocument): Promise<string> {
    const userEmail = document.metadata?.userEmail || 'unknown';
    const userSlug = userEmail.replace('@', '-at-').replace(/\./g, '-');
    const sessionDir = path.join(this.config.ginkoDir, 'sessions', userSlug);
    const logPath = path.join(sessionDir, 'current-session-log.md');

    await fs.ensureDir(sessionDir);

    const entry = this.formatLogEntry(document);

    // Use fs-extra's appendFile (ensure file exists first)
    if (!await fs.pathExists(logPath)) {
      await fs.writeFile(logPath, '', 'utf-8');
    }

    // Read current content, append, and write back (fs-extra compatible)
    const currentContent = await fs.readFile(logPath, 'utf-8');
    await fs.writeFile(logPath, currentContent + entry, 'utf-8');

    return logPath;
  }

  /**
   * Write Session to archive/
   */
  private async writeSession(document: KnowledgeDocument): Promise<string> {
    const sessionsDir = path.join(this.config.archiveDir!, 'sessions');
    await fs.ensureDir(sessionsDir);

    const timestamp = document.metadata?.timestamp || new Date().toISOString();
    const filename = `session-${timestamp.replace(/:/g, '-')}.md`;
    const filePath = path.join(sessionsDir, filename);

    await fs.writeFile(filePath, document.content, 'utf-8');

    return filePath;
  }

  /**
   * Write CodeFile to archive/code/
   */
  private async writeCodeFile(document: KnowledgeDocument): Promise<string> {
    const codeDir = path.join(this.config.archiveDir!, 'code');
    await fs.ensureDir(codeDir);

    const slug = this.slugify(document.title);
    const ext = document.metadata?.extension || '.txt';
    const filename = `${slug}${ext}`;
    const filePath = path.join(codeDir, filename);

    await fs.writeFile(filePath, document.content, 'utf-8');

    return filePath;
  }

  /**
   * Format ADR markdown with frontmatter
   */
  private formatADR(document: KnowledgeDocument): string {
    const frontmatter = this.buildFrontmatter({
      status: document.metadata?.status || 'proposed',
      date: document.metadata?.date || new Date().toISOString().split('T')[0],
      tags: document.metadata?.tags || [],
      ...document.data,
    });

    return `---\n${frontmatter}---\n\n${document.content}`;
  }

  /**
   * Format PRD markdown with frontmatter
   */
  private formatPRD(document: KnowledgeDocument): string {
    const frontmatter = this.buildFrontmatter({
      status: document.metadata?.status || 'draft',
      date: document.metadata?.date || new Date().toISOString().split('T')[0],
      tags: document.metadata?.tags || [],
      ...document.data,
    });

    return `---\n${frontmatter}---\n\n${document.content}`;
  }

  /**
   * Format Pattern markdown
   */
  private formatPattern(document: KnowledgeDocument): string {
    const frontmatter = this.buildFrontmatter({
      category: document.metadata?.category || 'pattern',
      tags: document.metadata?.tags || [],
      ...document.data,
    });

    return `---\n${frontmatter}---\n\n${document.content}`;
  }

  /**
   * Format Gotcha markdown
   */
  private formatGotcha(document: KnowledgeDocument): string {
    const frontmatter = this.buildFrontmatter({
      category: document.metadata?.category || 'gotcha',
      impact: document.metadata?.impact || 'medium',
      tags: document.metadata?.tags || [],
      ...document.data,
    });

    return `---\n${frontmatter}---\n\n${document.content}`;
  }

  /**
   * Format ContextModule markdown
   */
  private formatContextModule(document: KnowledgeDocument): string {
    const frontmatter = this.buildFrontmatter({
      type: 'context-module',
      tags: document.metadata?.tags || [],
      ...document.data,
    });

    return `---\n${frontmatter}---\n\n${document.content}`;
  }

  /**
   * Format log entry for appending
   */
  private formatLogEntry(document: KnowledgeDocument): string {
    const timestamp = document.metadata?.timestamp
      ? new Date(document.metadata.timestamp).toLocaleTimeString('en-US', { hour12: false, hour: '2-digit', minute: '2-digit' })
      : new Date().toLocaleTimeString('en-US', { hour12: false, hour: '2-digit', minute: '2-digit' });

    const category = document.metadata?.category || 'feature';
    const impact = document.metadata?.impact || 'medium';
    const files = document.metadata?.files || [];

    let entry = `\n### ${timestamp} - [${category}]\n`;
    entry += `${document.content}\n`;

    if (files.length > 0) {
      entry += `Files: ${files.join(', ')}\n`;
    }

    entry += `Impact: ${impact}\n`;

    return entry;
  }

  /**
   * Build YAML frontmatter from object
   */
  private buildFrontmatter(data: Record<string, any>): string {
    let frontmatter = '';

    for (const [key, value] of Object.entries(data)) {
      if (value === undefined || value === null) continue;

      if (Array.isArray(value)) {
        if (value.length > 0) {
          frontmatter += `${key}:\n${value.map(v => `  - ${v}`).join('\n')}\n`;
        }
      } else if (typeof value === 'object') {
        frontmatter += `${key}: ${JSON.stringify(value)}\n`;
      } else {
        frontmatter += `${key}: ${value}\n`;
      }
    }

    return frontmatter;
  }

  /**
   * Slugify a string for filename
   */
  private slugify(text: string): string {
    return text
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-|-$/g, '')
      .substring(0, 60);
  }

  /**
   * Extract number from ID (e.g., 'adr_042' -> 42)
   */
  private extractNumber(id: string): number {
    const match = id.match(/\d+/);
    return match ? parseInt(match[0], 10) : Date.now();
  }
}

/**
 * Create LocalAdapter from environment and Ginko directory
 */
export async function createLocalAdapterFromEnv(ginkoDir: string): Promise<LocalAdapter> {
  return new LocalAdapter({ ginkoDir });
}
