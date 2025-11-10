/**
 * @fileType: utility
 * @status: current
 * @updated: 2025-11-10
 * @tags: [charter, storage, persistence, file-system, graph-storage]
 * @related: [charter-versioning.ts, charter.ts, cloud-graph-client.ts]
 * @priority: critical
 * @complexity: high
 * @dependencies: [gray-matter, fs, path]
 */

import * as fs from 'fs/promises';
import * as path from 'path';
import matter from 'gray-matter';
import type {
  Charter,
  CharterStorageResult,
  CharterStorageStatus,
  FileStorageMetadata,
  GraphStorageMetadata,
  CharterContent,
  CharterConfidence,
  WorkMode,
  DEFAULT_CHARTER_PATH,
} from '../../types/charter.js';
import {
  versionToString,
  parseVersion,
  createInitialVersion,
  formatChangelogForMarkdown,
} from './charter-versioning.js';

// ============================================================================
// Type Definitions
// ============================================================================

/**
 * Minimal CloudGraphClient interface for charter storage
 * Note: This is a minimal interface to avoid importing from outside the package
 */
interface CloudGraphClient {
  connect(): Promise<void>;
  query<T = any>(query: string, params?: Record<string, any>): Promise<{ records: T[] }>;
}

// ============================================================================
// Charter Storage Manager
// ============================================================================

/**
 * Manages charter persistence to both file system and graph database
 *
 * Storage Strategy:
 * - File is source of truth (always reliable, git-tracked)
 * - Graph enables semantic search and relationship traversal
 * - Graceful degradation if graph unavailable
 * - Atomic operations where possible
 */
export class CharterStorageManager {
  private charterPath: string;
  private graphClient: CloudGraphClient | null = null;

  constructor(
    projectRoot: string = process.cwd(),
    customPath?: string,
    graphClient?: CloudGraphClient
  ) {
    this.charterPath = customPath
      ? path.resolve(projectRoot, customPath)
      : path.resolve(projectRoot, 'docs/PROJECT-CHARTER.md');

    this.graphClient = graphClient || null;
  }

  // ==========================================================================
  // LOAD OPERATIONS
  // ==========================================================================

  /**
   * Load charter from file system
   * Returns null if charter doesn't exist
   */
  async load(): Promise<Charter | null> {
    try {
      // Check if file exists
      const exists = await this.fileExists();
      if (!exists) {
        return null;
      }

      // Read file
      const fileContent = await fs.readFile(this.charterPath, 'utf-8');

      // Parse markdown with frontmatter
      const { data: frontmatter, content } = matter(fileContent);

      // Reconstruct charter from frontmatter and content
      const charter = this.parseCharterFromMarkdown(frontmatter, content);

      return charter;
    } catch (error: any) {
      throw new Error(`Failed to load charter: ${error.message}`);
    }
  }

  /**
   * Load charter with full storage status
   */
  async loadWithStatus(): Promise<CharterStorageResult> {
    try {
      const charter = await this.load();
      const status = await this.getStorageStatus();

      return {
        success: true,
        charter: charter || undefined,
        storageStatus: status,
      };
    } catch (error: any) {
      const status = await this.getStorageStatus();
      return {
        success: false,
        error: error.message,
        storageStatus: status,
      };
    }
  }

  // ==========================================================================
  // SAVE OPERATIONS
  // ==========================================================================

  /**
   * Save charter to file system and optionally graph
   */
  async save(charter: Charter): Promise<CharterStorageResult> {
    try {
      // Save to file (primary)
      await this.saveToFile(charter);

      // Save to graph (best effort)
      let graphError: string | undefined;
      if (this.graphClient) {
        try {
          await this.saveToGraph(charter);
        } catch (error: any) {
          graphError = `Graph sync failed: ${error.message}`;
          console.warn(graphError);
        }
      }

      const status = await this.getStorageStatus();

      return {
        success: true,
        charter,
        storageStatus: status,
        error: graphError,
      };
    } catch (error: any) {
      const status = await this.getStorageStatus();
      return {
        success: false,
        error: error.message,
        storageStatus: status,
      };
    }
  }

  /**
   * Save charter to file system
   */
  private async saveToFile(charter: Charter): Promise<void> {
    // Ensure directory exists
    const dir = path.dirname(this.charterPath);
    await fs.mkdir(dir, { recursive: true });

    // Convert charter to markdown with frontmatter
    const markdown = this.charterToMarkdown(charter);

    // Write atomically (write to temp file, then rename)
    const tempPath = `${this.charterPath}.tmp`;
    await fs.writeFile(tempPath, markdown, 'utf-8');
    await fs.rename(tempPath, this.charterPath);
  }

  /**
   * Save charter to graph database
   */
  private async saveToGraph(charter: Charter): Promise<void> {
    if (!this.graphClient) {
      throw new Error('Graph client not configured');
    }

    // Connect if not already connected
    await this.graphClient.connect();

    // Create or update ProjectCharter node
    const query = `
      MERGE (c:ProjectCharter {id: $id})
      SET c.projectId = $projectId,
          c.status = $status,
          c.workMode = $workMode,
          c.version = $version,
          c.createdAt = datetime($createdAt),
          c.updatedAt = datetime($updatedAt),
          c.content = $content,
          c.confidence = $confidence,
          c.changelog = $changelog
      RETURN c
    `;

    const params = {
      id: charter.id,
      projectId: charter.projectId,
      status: charter.status,
      workMode: charter.workMode,
      version: versionToString(charter.version),
      createdAt: charter.createdAt.toISOString(),
      updatedAt: charter.updatedAt.toISOString(),
      content: JSON.stringify(charter.content),
      confidence: JSON.stringify(charter.confidence),
      changelog: JSON.stringify(charter.changelog),
    };

    await this.graphClient.query(query, params);

    // Update charter with graph node ID if it's a new charter
    if (!charter.graphNodeId) {
      const result = await this.graphClient.query<{ c: { id: string } }>(
        'MATCH (c:ProjectCharter {id: $id}) RETURN c',
        { id: charter.id }
      );
      if (result.records.length > 0) {
        charter.graphNodeId = result.records[0].c.id;
      }
    }
  }

  // ==========================================================================
  // STATUS & VALIDATION
  // ==========================================================================

  /**
   * Get current storage status for charter
   */
  async getStorageStatus(): Promise<CharterStorageStatus> {
    const file = await this.getFileStorageMetadata();
    const graph = await this.getGraphStorageMetadata();

    const inSync = file.exists && graph.synced && !graph.syncError;

    return { file, graph, inSync };
  }

  /**
   * Get file storage metadata
   */
  private async getFileStorageMetadata(): Promise<FileStorageMetadata> {
    try {
      const stats = await fs.stat(this.charterPath);
      return {
        path: this.charterPath,
        exists: true,
        lastModified: stats.mtime,
        size: stats.size,
      };
    } catch {
      return {
        path: this.charterPath,
        exists: false,
      };
    }
  }

  /**
   * Get graph storage metadata
   */
  private async getGraphStorageMetadata(): Promise<GraphStorageMetadata> {
    if (!this.graphClient) {
      return {
        synced: false,
        syncError: 'Graph client not configured',
      };
    }

    try {
      // Check if charter exists in graph
      const charter = await this.load();
      if (!charter || !charter.id) {
        return { synced: false };
      }

      await this.graphClient.connect();
      const result = await this.graphClient.query<{ c: { id: string; updatedAt: string } }>(
        'MATCH (c:ProjectCharter {id: $id}) RETURN c',
        { id: charter.id }
      );

      if (result.records.length === 0) {
        return { synced: false };
      }

      const node = result.records[0].c;
      return {
        nodeId: node.id,
        synced: true,
        lastSyncedAt: new Date(node.updatedAt),
      };
    } catch (error: any) {
      return {
        synced: false,
        syncError: error.message,
      };
    }
  }

  /**
   * Check if charter file exists
   */
  async fileExists(): Promise<boolean> {
    try {
      await fs.access(this.charterPath);
      return true;
    } catch {
      return false;
    }
  }

  // ==========================================================================
  // MARKDOWN CONVERSION
  // ==========================================================================

  /**
   * Convert charter to markdown with frontmatter
   */
  private charterToMarkdown(charter: Charter): string {
    // Prepare frontmatter
    const frontmatter = {
      id: charter.id,
      projectId: charter.projectId,
      status: charter.status,
      workMode: charter.workMode,
      version: versionToString(charter.version),
      createdAt: charter.createdAt.toISOString(),
      updatedAt: charter.updatedAt.toISOString(),
      confidence: charter.confidence.overall,
    };

    // Build markdown content
    const sections: string[] = [];

    // Header
    sections.push(`# Project Charter: ${this.extractProjectName(charter)}`);
    sections.push('');
    sections.push(`**Status**: ${this.formatStatus(charter.status)}`);
    sections.push(`**Work Mode**: ${this.formatWorkMode(charter.workMode)}`);
    sections.push(`**Version**: ${versionToString(charter.version)}`);
    sections.push(`**Confidence**: ${charter.confidence.overall}% (${this.confidenceLabel(charter.confidence.overall)})`);
    sections.push('');
    sections.push('---');
    sections.push('');

    // Purpose & Value
    sections.push('## Purpose & Value');
    sections.push('');
    sections.push(charter.content.purpose);
    sections.push('');

    // Users & Personas
    if (charter.content.users.length > 0) {
      sections.push('## Users & Personas');
      sections.push('');
      for (const user of charter.content.users) {
        sections.push(`- ${user}`);
      }
      sections.push('');
    }

    // Success Criteria
    sections.push('## Success Criteria');
    sections.push('');
    for (const criterion of charter.content.successCriteria) {
      sections.push(`- [ ] ${criterion}`);
    }
    sections.push('');

    // Scope & Boundaries
    sections.push('## Scope & Boundaries');
    sections.push('');
    sections.push('### In Scope');
    for (const item of charter.content.scope.inScope) {
      sections.push(`- ${item}`);
    }
    sections.push('');
    sections.push('### Out of Scope');
    for (const item of charter.content.scope.outOfScope) {
      sections.push(`- ${item}`);
    }
    sections.push('');
    if (charter.content.scope.tbd.length > 0) {
      sections.push('### TBD (To Be Determined)');
      for (const item of charter.content.scope.tbd) {
        sections.push(`- ${item}`);
      }
      sections.push('');
    }

    // Context & Constraints
    sections.push('## Context & Constraints');
    sections.push('');
    if (charter.content.constraints) {
      sections.push(`**Technical Constraints**: ${charter.content.constraints}`);
      sections.push('');
    }
    if (charter.content.timeline) {
      sections.push(`**Timeline**: ${charter.content.timeline}`);
      sections.push('');
    }
    if (charter.content.team && charter.content.team.length > 0) {
      sections.push(`**Team**: ${charter.content.team.join(', ')}`);
      sections.push('');
    }

    // Optional sections (Full Planning mode)
    if (charter.content.risks && charter.content.risks.length > 0) {
      sections.push('## Risks');
      sections.push('');
      for (const risk of charter.content.risks) {
        sections.push(`- ${risk}`);
      }
      sections.push('');
    }
    if (charter.content.alternatives && charter.content.alternatives.length > 0) {
      sections.push('## Alternatives Considered');
      sections.push('');
      for (const alternative of charter.content.alternatives) {
        sections.push(`- ${alternative}`);
      }
      sections.push('');
    }
    if (charter.content.governance) {
      sections.push('## Governance');
      sections.push('');
      sections.push(charter.content.governance);
      sections.push('');
    }

    // Changelog
    sections.push(formatChangelogForMarkdown(charter.changelog));
    sections.push('');

    // Footer
    sections.push('---');
    sections.push('');
    sections.push('*This charter was created through conversation and is a living document.');
    sections.push('Edit conversationally (`ginko charter --edit`) or directly in markdown.*');

    const content = sections.join('\n');

    // Combine frontmatter and content
    return matter.stringify(content, frontmatter);
  }

  /**
   * Parse charter from markdown with frontmatter
   */
  private parseCharterFromMarkdown(frontmatter: any, content: string): Charter {
    // Extract content sections using regex
    const purpose = this.extractSection(content, '## Purpose & Value') || '';
    const users = this.extractList(content, '## Users & Personas');
    const successCriteria = this.extractCheckboxes(content, '## Success Criteria');
    const scope = this.extractScope(content);
    const constraints = this.extractInline(content, '**Technical Constraints**:');
    const timeline = this.extractInline(content, '**Timeline**:');
    const team = this.extractInline(content, '**Team**:')?.split(',').map(s => s.trim()) || [];
    const risks = this.extractList(content, '## Risks');
    const alternatives = this.extractList(content, '## Alternatives Considered');
    const governance = this.extractSection(content, '## Governance');

    // Parse changelog
    const changelog = this.extractChangelog(content);

    // Reconstruct confidence object
    const confidence: CharterConfidence = {
      purpose: { score: 70, signals: [], missing: [] },
      users: { score: 70, signals: [], missing: [] },
      success: { score: 70, signals: [], missing: [] },
      scope: { score: 70, signals: [], missing: [] },
      overall: frontmatter.confidence || 70,
    };

    return {
      id: frontmatter.id,
      projectId: frontmatter.projectId,
      status: frontmatter.status,
      workMode: frontmatter.workMode,
      version: parseVersion(frontmatter.version),
      createdAt: new Date(frontmatter.createdAt),
      updatedAt: new Date(frontmatter.updatedAt),
      content: {
        purpose,
        users,
        successCriteria,
        scope,
        constraints,
        timeline,
        team,
        risks: risks.length > 0 ? risks : undefined,
        alternatives: alternatives.length > 0 ? alternatives : undefined,
        governance,
      },
      confidence,
      changelog,
    };
  }

  // ==========================================================================
  // MARKDOWN PARSING HELPERS
  // ==========================================================================

  private extractSection(content: string, heading: string): string | undefined {
    const regex = new RegExp(`${heading}\\n+([\\s\\S]*?)(?=\\n## |$)`, 'm');
    const match = content.match(regex);
    return match ? match[1].trim() : undefined;
  }

  private extractList(content: string, heading: string): string[] {
    const section = this.extractSection(content, heading);
    if (!section) return [];
    return section
      .split('\n')
      .filter(line => line.trim().startsWith('-'))
      .map(line => line.replace(/^-\s*/, '').trim());
  }

  private extractCheckboxes(content: string, heading: string): string[] {
    const section = this.extractSection(content, heading);
    if (!section) return [];
    return section
      .split('\n')
      .filter(line => line.trim().match(/^-\s*\[.\]\s*/))
      .map(line => line.replace(/^-\s*\[.\]\s*/, '').trim());
  }

  private extractScope(content: string): CharterContent['scope'] {
    const inScope = this.extractList(content, '### In Scope');
    const outOfScope = this.extractList(content, '### Out of Scope');
    const tbd = this.extractList(content, '### TBD');
    return { inScope, outOfScope, tbd };
  }

  private extractInline(content: string, label: string): string | undefined {
    const regex = new RegExp(`${label}\\s*(.+)`, 'm');
    const match = content.match(regex);
    return match ? match[1].trim() : undefined;
  }

  private extractChangelog(content: string): any[] {
    // Simplified - would need more sophisticated parsing
    return [];
  }

  // ==========================================================================
  // FORMATTING HELPERS
  // ==========================================================================

  private extractProjectName(charter: Charter): string {
    // Extract from purpose or use project ID
    const purposeMatch = charter.content.purpose.match(/^(.{0,50})/);
    return purposeMatch ? purposeMatch[1] : charter.projectId;
  }

  private formatStatus(status: string): string {
    return status.charAt(0).toUpperCase() + status.slice(1);
  }

  private formatWorkMode(mode: WorkMode): string {
    const labels: Record<WorkMode, string> = {
      'hack-ship': 'Hack & Ship',
      'think-build': 'Think & Build',
      'full-planning': 'Full Planning',
    };
    return labels[mode];
  }

  private confidenceLabel(score: number): string {
    if (score >= 90) return 'Excellent';
    if (score >= 70) return 'Good enough to start';
    if (score >= 40) return 'Workable minimum';
    return 'Needs refinement';
  }
}
