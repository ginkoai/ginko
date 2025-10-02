/**
 * @fileType: utility
 * @status: current
 * @updated: 2025-10-01
 * @tags: [session-log, yaml, atomic-operations, adr-033]
 * @related: [pressure-monitor.ts, ../types/session-log.ts]
 * @priority: critical
 * @complexity: high
 * @dependencies: [fs-extra, gray-matter, path]
 */

import * as fs from 'fs-extra';
import * as path from 'path';
import matter from 'gray-matter';
import {
  SessionLog,
  SessionMetadata,
  LogEntry,
  ParsedSessionLog,
  CreateSessionLogOptions,
  AppendLogEntryOptions,
  ArchiveLogResult
} from '../types/session-log.js';

const SESSION_LOG_FILENAME = 'session.log.md';

/**
 * Manages session log lifecycle: creation, appending, archiving, and loading
 * Implements ADR-033 Phase 1: Session log infrastructure with atomic operations
 *
 * Key Features:
 * - YAML frontmatter for structured metadata
 * - Atomic append operations (write to temp, then move)
 * - Categorized sections (Timeline, Decisions, Files, Insights, Git)
 * - Context pressure tracking per entry
 */
export class SessionLogManager {
  /**
   * Create a new session log with YAML frontmatter
   *
   * @param userId - User identifier
   * @param branch - Git branch name
   * @param options - Optional session configuration
   * @returns Path to created log file
   */
  async createSessionLog(
    userId: string,
    branch: string,
    options?: Partial<CreateSessionLogOptions>
  ): Promise<string> {
    const sessionId = `session-${Date.now()}`;
    const metadata: SessionMetadata = {
      session_id: sessionId,
      started: new Date().toISOString(),
      user: userId,
      branch: branch,
      context_pressure_at_start: options?.initialPressure ?? 0
    };

    const frontmatter = this.formatFrontmatter(metadata);
    const content = this.formatEmptyLog();
    const fullContent = `${frontmatter}\n${content}`;

    // Create session directory if it doesn't exist
    const sessionDir = path.join('.ginko', 'sessions', userId);
    await fs.ensureDir(sessionDir);

    const logPath = path.join(sessionDir, SESSION_LOG_FILENAME);
    await fs.writeFile(logPath, fullContent, 'utf-8');

    return logPath;
  }

  /**
   * Append an entry to the session log atomically
   *
   * Atomic Strategy:
   * 1. Read current log
   * 2. Parse and categorize entry
   * 3. Write to temporary file
   * 4. Rename temp to actual (atomic operation)
   *
   * @param sessionDir - Directory containing session.log.md
   * @param entry - Log entry to append
   * @param atomic - Use atomic write (default: true)
   */
  async appendEntry(
    sessionDir: string,
    entry: LogEntry,
    atomic: boolean = true
  ): Promise<void> {
    const logPath = path.join(sessionDir, SESSION_LOG_FILENAME);

    // Read current log
    const currentContent = await fs.readFile(logPath, 'utf-8');
    const parsed = matter(currentContent);

    // Build new content with entry added to appropriate section
    const newContent = this.addEntryToContent(parsed.content, entry);
    const fullContent = matter.stringify(newContent, parsed.data);

    if (atomic) {
      // Atomic write: temp file + rename
      const tempPath = `${logPath}.tmp`;
      await fs.writeFile(tempPath, fullContent, 'utf-8');
      await fs.rename(tempPath, logPath);
    } else {
      // Direct write (for testing non-atomic scenarios)
      await fs.writeFile(logPath, fullContent, 'utf-8');
    }
  }

  /**
   * Archive the current session log
   *
   * @param sessionDir - Directory containing session.log.md
   * @param archivePath - Destination path for archive
   * @returns Archive operation result
   */
  async archiveLog(
    sessionDir: string,
    archivePath?: string
  ): Promise<ArchiveLogResult> {
    try {
      const logPath = path.join(sessionDir, SESSION_LOG_FILENAME);

      if (!await fs.pathExists(logPath)) {
        return {
          success: false,
          archivePath: '',
          timestamp: new Date().toISOString(),
          error: 'Session log not found'
        };
      }

      // Generate archive path if not provided
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
      const finalArchivePath = archivePath || path.join(
        sessionDir,
        'archive',
        `session-${timestamp}.log.md`
      );

      // Ensure archive directory exists
      await fs.ensureDir(path.dirname(finalArchivePath));

      // Move log to archive
      await fs.move(logPath, finalArchivePath, { overwrite: false });

      return {
        success: true,
        archivePath: finalArchivePath,
        timestamp: new Date().toISOString()
      };
    } catch (error) {
      return {
        success: false,
        archivePath: archivePath || '',
        timestamp: new Date().toISOString(),
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  /**
   * Load and parse a session log
   *
   * @param sessionDir - Directory containing session.log.md
   * @returns Parsed session log with metadata and sections
   */
  async loadSessionLog(sessionDir: string): Promise<ParsedSessionLog> {
    const logPath = path.join(sessionDir, SESSION_LOG_FILENAME);

    if (!await fs.pathExists(logPath)) {
      throw new Error(`Session log not found at ${logPath}`);
    }

    const content = await fs.readFile(logPath, 'utf-8');
    const parsed = matter(content);

    // Extract sections from content
    const sections = this.parseSections(parsed.content);

    return {
      frontmatter: parsed.data as SessionMetadata,
      content: parsed.content,
      sections
    };
  }

  /**
   * Format YAML frontmatter from metadata
   * @private
   */
  private formatFrontmatter(metadata: SessionMetadata): string {
    return `---
session_id: ${metadata.session_id}
started: ${metadata.started}
user: ${metadata.user}
branch: ${metadata.branch}
context_pressure_at_start: ${metadata.context_pressure_at_start}
---`;
  }

  /**
   * Format empty log structure with section headers
   * @private
   */
  private formatEmptyLog(): string {
    return `
## Timeline

## Key Decisions

## Files Affected

## Insights

## Git Operations
`;
  }

  /**
   * Add entry to appropriate section in content
   * @private
   */
  private addEntryToContent(content: string, entry: LogEntry): string {
    const sectionMap: Record<LogEntry['category'], string> = {
      feature: 'Timeline',
      fix: 'Timeline',
      decision: 'Key Decisions',
      insight: 'Insights',
      git: 'Git Operations',
      achievement: 'Timeline'
    };

    const targetSection = sectionMap[entry.category];
    const entryText = this.formatLogEntry(entry);

    // Find the section and append the entry
    const sectionRegex = new RegExp(`(## ${targetSection}\\n)`, 'i');

    if (sectionRegex.test(content)) {
      return content.replace(
        sectionRegex,
        `$1\n${entryText}\n`
      );
    }

    // If section doesn't exist, append at end
    return `${content}\n## ${targetSection}\n\n${entryText}\n`;
  }

  /**
   * Format a single log entry as markdown
   * @private
   */
  private formatLogEntry(entry: LogEntry): string {
    const files = entry.files ? ` (${entry.files.join(', ')})` : '';
    const impact = entry.impact ? ` [${entry.impact}]` : '';
    return `- **${entry.timestamp}** (pressure: ${entry.context_pressure.toFixed(2)})${impact}: ${entry.description}${files}`;
  }

  /**
   * Parse content sections into structured data
   * @private
   */
  private parseSections(content: string): ParsedSessionLog['sections'] {
    const sections = {
      timeline: [] as LogEntry[],
      decisions: [] as LogEntry[],
      filesAffected: [] as string[],
      insights: [] as LogEntry[],
      gitOperations: [] as LogEntry[]
    };

    // Extract each section
    const timelineMatch = content.match(/## Timeline\n([\s\S]*?)(?=\n## |$)/i);
    const decisionsMatch = content.match(/## Key Decisions\n([\s\S]*?)(?=\n## |$)/i);
    const filesMatch = content.match(/## Files Affected\n([\s\S]*?)(?=\n## |$)/i);
    const insightsMatch = content.match(/## Insights\n([\s\S]*?)(?=\n## |$)/i);
    const gitMatch = content.match(/## Git Operations\n([\s\S]*?)(?=\n## |$)/i);

    if (timelineMatch) {
      sections.timeline = this.parseEntries(timelineMatch[1], 'feature');
    }
    if (decisionsMatch) {
      sections.decisions = this.parseEntries(decisionsMatch[1], 'decision');
    }
    if (filesMatch) {
      sections.filesAffected = this.parseFiles(filesMatch[1]);
    }
    if (insightsMatch) {
      sections.insights = this.parseEntries(insightsMatch[1], 'insight');
    }
    if (gitMatch) {
      sections.gitOperations = this.parseEntries(gitMatch[1], 'git');
    }

    return sections;
  }

  /**
   * Parse log entries from markdown list
   * @private
   */
  private parseEntries(text: string, category: LogEntry['category']): LogEntry[] {
    const entries: LogEntry[] = [];
    const lines = text.split('\n').filter(line => line.trim().startsWith('-'));

    for (const line of lines) {
      // Parse: - **timestamp** (pressure: 0.42) [impact]: description (files)
      const match = line.match(/\*\*([^*]+)\*\*\s+\(pressure:\s+([\d.]+)\)(?:\s+\[(\w+)\])?\s*:\s*(.+?)(?:\s+\(([^)]+)\))?$/);

      if (match) {
        const [, timestamp, pressure, impact, description, files] = match;
        entries.push({
          timestamp,
          category,
          description: description.trim(),
          files: files ? files.split(',').map(f => f.trim()) : undefined,
          impact: (impact as LogEntry['impact']) || 'medium',
          context_pressure: parseFloat(pressure)
        });
      }
    }

    return entries;
  }

  /**
   * Parse files from markdown list
   * @private
   */
  private parseFiles(text: string): string[] {
    const files: string[] = [];
    const lines = text.split('\n').filter(line => line.trim().startsWith('-'));

    for (const line of lines) {
      const file = line.replace(/^-\s*/, '').trim();
      if (file) {
        files.push(file);
      }
    }

    return files;
  }
}
