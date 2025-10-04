/**
 * @fileType: utility
 * @status: current
 * @updated: 2025-10-03
 * @tags: [session-logging, defensive-logging, handoff, continuous-logging]
 * @related: [handoff/handoff-reflection-pipeline.ts, start/index.ts]
 * @priority: high
 * @complexity: high
 * @dependencies: [fs, path, yaml]
 */

/**
 * Session Log Manager
 *
 * Manages continuous session logging to capture insights throughout development sessions.
 * Enables high-quality handoffs through event-based defensive logging.
 *
 * Based on ADR-033: Context Pressure Mitigation Strategy (Event-Based Amendment)
 */

import * as fs from 'fs/promises';
import * as path from 'path';

export type LogCategory = 'fix' | 'feature' | 'decision' | 'insight' | 'git' | 'achievement';
export type LogImpact = 'high' | 'medium' | 'low';

export interface LogEntry {
  timestamp: string;
  category: LogCategory;
  description: string; // 1-2 sentences
  files?: string[];
  impact: LogImpact;
}

export interface SessionLogMetadata {
  session_id: string;
  started: string;
  user: string;
  branch: string;
}

export interface SessionLog {
  metadata: SessionLogMetadata;
  timeline: LogEntry[];
  keyDecisions: LogEntry[];
  filesAffected: Set<string>;
  insights: LogEntry[];
  gitOperations: LogEntry[];
}

export class SessionLogManager {
  private static SESSION_LOG_FILENAME = 'current-session-log.md';
  private static ARCHIVE_DIR = 'archive';

  /**
   * Get the session log path for a user
   */
  private static getSessionLogPath(userDir: string): string {
    return path.join(userDir, this.SESSION_LOG_FILENAME);
  }

  /**
   * Get archive directory path
   */
  private static getArchiveDir(userDir: string): string {
    return path.join(userDir, this.ARCHIVE_DIR);
  }

  /**
   * Create a new session log
   */
  static async createSessionLog(
    userDir: string,
    user: string,
    branch: string
  ): Promise<void> {
    const sessionId = `session-${new Date().toISOString().replace(/[:.]/g, '-')}`;

    const logContent = `---
session_id: ${sessionId}
started: ${new Date().toISOString()}
user: ${user}
branch: ${branch}
---

# Session Log: ${sessionId}

## Timeline
<!-- Chronological log of all session events -->

## Key Decisions
<!-- Important decisions made during session -->

## Files Affected
<!-- Files modified during session -->

## Insights
<!-- Patterns, gotchas, learnings discovered -->

## Git Operations
<!-- Commits, merges, branch changes -->

## Achievements
<!-- Features completed, tests passing -->
`;

    const logPath = this.getSessionLogPath(userDir);
    await fs.writeFile(logPath, logContent, 'utf-8');
  }

  /**
   * Append an entry to the session log
   * Atomic operation to prevent corruption
   */
  static async appendEntry(
    userDir: string,
    entry: LogEntry
  ): Promise<void> {
    const logPath = this.getSessionLogPath(userDir);

    // Check if log exists
    try {
      await fs.access(logPath);
    } catch {
      throw new Error('Session log does not exist. Run "ginko start" first.');
    }

    // Format entry
    const timestamp = new Date(entry.timestamp).toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit',
      hour12: false
    });

    const filesStr = entry.files && entry.files.length > 0
      ? `\nFiles: ${entry.files.join(', ')}`
      : '';

    const entryText = `
### ${timestamp} - [${entry.category}]
${entry.description}${filesStr}
Impact: ${entry.impact}
`;

    // Determine which section to append to
    let sectionMarker: string;
    switch (entry.category) {
      case 'decision':
        sectionMarker = '## Key Decisions';
        break;
      case 'insight':
        sectionMarker = '## Insights';
        break;
      case 'git':
        sectionMarker = '## Git Operations';
        break;
      case 'achievement':
        sectionMarker = '## Achievements';
        break;
      default:
        sectionMarker = '## Timeline';
    }

    // Read current log
    const content = await fs.readFile(logPath, 'utf-8');

    // Find section and append
    const sectionIndex = content.indexOf(sectionMarker);
    if (sectionIndex === -1) {
      throw new Error(`Section ${sectionMarker} not found in log`);
    }

    // Find the end of the section (next ## or end of file)
    const nextSectionIndex = content.indexOf('\n## ', sectionIndex + sectionMarker.length);
    const insertPoint = nextSectionIndex === -1 ? content.length : nextSectionIndex;

    const newContent =
      content.slice(0, insertPoint) +
      entryText +
      (nextSectionIndex === -1 ? '' : '\n' + content.slice(insertPoint));

    // Also append to Timeline
    if (entry.category !== 'decision' && entry.category !== 'insight') {
      const timelineIndex = newContent.indexOf('## Timeline');
      const timelineNextSection = newContent.indexOf('\n## ', timelineIndex + 11);
      const timelineInsert = timelineNextSection === -1 ? newContent.length : timelineNextSection;

      const finalContent =
        newContent.slice(0, timelineInsert) +
        entryText +
        (timelineNextSection === -1 ? '' : '\n' + newContent.slice(timelineInsert));

      await fs.writeFile(logPath, finalContent, 'utf-8');
    } else {
      await fs.writeFile(logPath, newContent, 'utf-8');
    }
  }

  /**
   * Load the current session log
   */
  static async loadSessionLog(userDir: string): Promise<string> {
    const logPath = this.getSessionLogPath(userDir);

    try {
      return await fs.readFile(logPath, 'utf-8');
    } catch {
      return '';
    }
  }

  /**
   * Archive the session log with timestamp
   */
  static async archiveLog(userDir: string, handoffSummary?: string): Promise<string> {
    const logPath = this.getSessionLogPath(userDir);
    const archiveDir = this.getArchiveDir(userDir);

    // Ensure archive directory exists
    await fs.mkdir(archiveDir, { recursive: true });

    // Generate archive filename with timestamp
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const archiveFilename = `session-log-${timestamp}.md`;
    const archivePath = path.join(archiveDir, archiveFilename);

    try {
      // Read current log
      let logContent = await fs.readFile(logPath, 'utf-8');

      // Append handoff summary if provided
      if (handoffSummary) {
        logContent += `\n\n## Handoff Summary\n${handoffSummary}\n`;
      }

      // Write to archive
      await fs.writeFile(archivePath, logContent, 'utf-8');

      // Delete current log
      await fs.unlink(logPath);

      return archivePath;
    } catch (error) {
      throw new Error(`Failed to archive session log: ${error}`);
    }
  }

  /**
   * Check if a session log exists
   */
  static async hasSessionLog(userDir: string): Promise<boolean> {
    const logPath = this.getSessionLogPath(userDir);
    try {
      await fs.access(logPath);
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Parse session log metadata from frontmatter
   */
  static parseMetadata(logContent: string): SessionLogMetadata | null {
    const frontmatterMatch = logContent.match(/^---\n([\s\S]*?)\n---/);
    if (!frontmatterMatch) return null;

    const frontmatter = frontmatterMatch[1];
    const lines = frontmatter.split('\n');

    const metadata: any = {};
    for (const line of lines) {
      const [key, ...valueParts] = line.split(':');
      if (key && valueParts.length > 0) {
        metadata[key.trim()] = valueParts.join(':').trim();
      }
    }

    return {
      session_id: metadata.session_id || '',
      started: metadata.started || '',
      user: metadata.user || '',
      branch: metadata.branch || ''
    };
  }

  /**
   * Extract entries from a section
   */
  static extractEntries(logContent: string, section: string): LogEntry[] {
    const sectionMatch = logContent.match(
      new RegExp(`## ${section}\\n([\\s\\S]*?)(?=\\n## |$)`)
    );

    if (!sectionMatch) return [];

    const sectionContent = sectionMatch[1];
    const entries: LogEntry[] = [];

    // Match entry pattern: ### HH:MM - [category]
    const entryRegex = /### (\d{2}:\d{2}) - \[(\w+)\]\n([\s\S]*?)(?=\n### |\n## |$)/g;
    let match;

    while ((match = entryRegex.exec(sectionContent)) !== null) {
      const [, time, category, content] = match;

      // Parse description, files, impact, pressure
      const lines = content.trim().split('\n');
      const description = lines[0] || '';

      let files: string[] = [];
      let impact: LogImpact = 'medium';
      let pressure = 0;

      for (const line of lines.slice(1)) {
        if (line.startsWith('Files:')) {
          files = line.replace('Files:', '').trim().split(',').map(f => f.trim());
        } else if (line.startsWith('Impact:')) {
          const impactMatch = line.match(/Impact: (\w+)/);
          if (impactMatch) impact = impactMatch[1] as LogImpact;

          const pressureMatch = line.match(/Pressure: (\d+)%/);
          if (pressureMatch) pressure = parseInt(pressureMatch[1]) / 100;
        }
      }

      entries.push({
        timestamp: time,
        category: category as LogCategory,
        description,
        files: files.length > 0 ? files : undefined,
        impact
      });
    }

    return entries;
  }

  /**
   * Get summary statistics from session log
   */
  static getSummary(logContent: string): {
    totalEntries: number;
    byCategory: Record<string, number>;
    filesAffected: number;
  } {
    const timeline = this.extractEntries(logContent, 'Timeline');
    const decisions = this.extractEntries(logContent, 'Key Decisions');
    const insights = this.extractEntries(logContent, 'Insights');
    const git = this.extractEntries(logContent, 'Git Operations');
    const achievements = this.extractEntries(logContent, 'Achievements');

    const allEntries = [...timeline, ...decisions, ...insights, ...git, ...achievements];

    const byCategory: Record<string, number> = {};
    const filesSet = new Set<string>();

    for (const entry of allEntries) {
      byCategory[entry.category] = (byCategory[entry.category] || 0) + 1;

      if (entry.files) {
        entry.files.forEach(f => filesSet.add(f));
      }
    }

    return {
      totalEntries: allEntries.length,
      byCategory,
      filesAffected: filesSet.size
    };
  }
}
