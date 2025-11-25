/**
 * @fileType: utility
 * @status: current
 * @updated: 2025-10-22
 * @tags: [session-logging, defensive-logging, handoff, continuous-logging, references, task-010]
 * @related: [handoff/handoff-reflection-pipeline.ts, start/index.ts, ../utils/reference-parser.ts]
 * @priority: high
 * @complexity: high
 * @dependencies: [fs, path, yaml, reference-parser]
 */

/**
 * Session Log Manager
 *
 * Manages continuous session logging to capture insights throughout development sessions.
 * Enables high-quality handoffs through event-based defensive logging.
 * Supports reference linking between session logs, sprints, PRDs, and ADRs (TASK-010)
 *
 * Based on ADR-033: Context Pressure Mitigation Strategy (Event-Based Amendment)
 */

import * as fs from 'fs/promises';
import * as path from 'path';
import { extractReferences, type Reference } from '../utils/reference-parser.js';

export type LogCategory = 'fix' | 'feature' | 'decision' | 'insight' | 'git' | 'achievement' | 'gotcha';
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
<!-- Complete chronological log of all session events -->
<!-- Includes: fixes, features, achievements, and categorized entries (decisions/insights/git also appear in their sections) -->
<!-- GOOD: "Fixed auth timeout. Root cause: bcrypt rounds set to 15 (too slow). Reduced to 11." -->
<!-- BAD: "Fixed timeout" (too terse, missing root cause) -->

## Key Decisions
<!-- Important decisions made during session with alternatives considered -->
<!-- These entries also appear in Timeline for narrative coherence -->
<!-- GOOD: "Chose JWT over sessions. Alternatives: server sessions (harder to scale), OAuth (vendor lock-in). JWT selected for stateless mobile support." -->
<!-- BAD: "Chose JWT for auth" (missing alternatives and rationale) -->

## Insights
<!-- Patterns, gotchas, learnings discovered -->
<!-- These entries also appear in Timeline for narrative coherence -->
<!-- GOOD: "Discovered bcrypt rounds 10-11 optimal. Testing showed rounds 15 caused 800ms delays; rounds 11 achieved 200ms with acceptable entropy." -->
<!-- BAD: "Bcrypt should be 11" (missing context and discovery process) -->

## Git Operations
<!-- Commits, merges, branch changes -->
<!-- These entries also appear in Timeline for narrative coherence -->
<!-- Log significant commits with: ginko log "Committed feature X" --category=git -->

## Gotchas
<!-- Pitfalls, traps, and "lessons learned the hard way" -->
<!-- EPIC-002 Sprint 2: These become AVOID_GOTCHA relationships in the graph -->
<!-- GOOD: "EventQueue setInterval keeps process alive. Solution: timer.unref() allows clean exit." -->
<!-- BAD: "Timer bug fixed" (missing symptom, cause, and solution) -->
`;

    // Ensure user directory exists
    await fs.mkdir(userDir, { recursive: true });

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

    // Read current log
    const content = await fs.readFile(logPath, 'utf-8');

    // Determine sections to append to
    // Logic: Categorized entries (decision/insight/git/gotcha) use dual-routing for categorical access:
    //        - Written to their categorical section (Decisions/Insights/Git Operations/Gotchas)
    //        - Also written to Timeline for narrative coherence
    //        fix/feature/achievement go to Timeline only
    const shouldAppendToTimeline = ['decision', 'insight', 'git', 'gotcha'].includes(entry.category);

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
      case 'gotcha':
        sectionMarker = '## Gotchas';  // EPIC-002 Sprint 2: Pitfalls and traps
        break;
      case 'achievement':
        sectionMarker = '## Timeline';  // Achievements section removed per ADR-033 Addendum 2
        break;
      default:
        // fix, feature default to Timeline
        sectionMarker = '## Timeline';
    }

    // Append to primary section
    const sectionIndex = content.indexOf(sectionMarker);
    if (sectionIndex === -1) {
      throw new Error(`Section ${sectionMarker} not found in log`);
    }

    const nextSectionIndex = content.indexOf('\n## ', sectionIndex + sectionMarker.length);
    const insertPoint = nextSectionIndex === -1 ? content.length : nextSectionIndex;

    let finalContent =
      content.slice(0, insertPoint) +
      entryText +
      (nextSectionIndex === -1 ? '' : '\n' + content.slice(insertPoint));

    // Also append to Timeline for categorized entries (decision/insight/git) to preserve narrative coherence
    if (shouldAppendToTimeline) {
      const timelineIndex = finalContent.indexOf('## Timeline');
      const timelineNextSection = finalContent.indexOf('\n## ', timelineIndex + 11);
      const timelineInsert = timelineNextSection === -1 ? finalContent.length : timelineNextSection;

      finalContent =
        finalContent.slice(0, timelineInsert) +
        entryText +
        (timelineNextSection === -1 ? '' : '\n' + finalContent.slice(timelineInsert));
    }

    await fs.writeFile(logPath, finalContent, 'utf-8');
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

  /**
   * Check if session log should be auto-archived
   * Based on ADR-036: age (>48h)
   * Note: Size restriction removed - no technical reason to limit entry count
   */
  static async shouldAutoArchive(userDir: string): Promise<boolean> {
    const hasLog = await this.hasSessionLog(userDir);
    if (!hasLog) {
      return false;
    }

    const logContent = await this.loadSessionLog(userDir);
    const metadata = this.parseMetadata(logContent);

    if (!metadata) {
      return false;
    }

    // Check age: >48 hours
    const started = new Date(metadata.started);
    const now = new Date();
    const hoursOld = (now.getTime() - started.getTime()) / (1000 * 60 * 60);

    if (hoursOld > 48) {
      return true;
    }

    return false;
  }

  /**
   * Auto-archive if conditions met, return true if archived
   * Used by ginko start to clean up stale sessions (>48h old)
   */
  static async autoArchiveIfStale(userDir: string): Promise<boolean> {
    const shouldArchive = await this.shouldAutoArchive(userDir);

    if (shouldArchive) {
      await this.archiveLog(userDir, 'Auto-archived due to age (>48h)');
      return true;
    }

    return false;
  }

  /**
   * Extract all references from session log (TASK-010)
   * Returns unique references found in the log
   *
   * @param userDir - User session directory
   * @returns Array of Reference objects
   */
  static async extractReferences(userDir: string): Promise<Reference[]> {
    const logContent = await this.loadSessionLog(userDir);

    if (!logContent) {
      return [];
    }

    return extractReferences(logContent);
  }

  /**
   * Get reference summary for session
   * Groups references by type and provides counts
   *
   * @param userDir - User session directory
   * @returns Summary of references by type
   */
  static async getReferenceSummary(userDir: string): Promise<{
    total: number;
    byType: Record<string, number>;
    references: Reference[];
  }> {
    const references = await this.extractReferences(userDir);

    const byType: Record<string, number> = {};
    for (const ref of references) {
      byType[ref.type] = (byType[ref.type] || 0) + 1;
    }

    return {
      total: references.length,
      byType,
      references
    };
  }

  /**
   * Get all referenced documents from session
   * Useful for understanding what documents are linked to this session
   *
   * @param userDir - User session directory
   * @returns Array of unique reference strings
   */
  static async getReferencedDocuments(userDir: string): Promise<string[]> {
    const references = await this.extractReferences(userDir);

    // Deduplicate by rawText
    const seen = new Set<string>();
    const unique: string[] = [];

    for (const ref of references) {
      if (!seen.has(ref.rawText)) {
        seen.add(ref.rawText);
        unique.push(ref.rawText);
      }
    }

    return unique;
  }
}
