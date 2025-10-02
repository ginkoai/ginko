/**
 * @fileType: utility
 * @status: current
 * @updated: 2025-10-01
 * @tags: [session, logging, ai-protocol, context-pressure]
 * @related: [../types/session.ts, session-collector.ts]
 * @priority: high
 * @complexity: medium
 * @dependencies: [fs-extra, chalk]
 */

import fs from 'fs-extra';
import path from 'path';
import chalk from 'chalk';
import { getGinkoDir, getUserEmail } from './helpers.js';

/**
 * Event categories for session logging
 */
export type EventCategory = 'fix' | 'feature' | 'decision' | 'insight' | 'git' | 'achievement';

/**
 * Impact level for logged events
 */
export type ImpactLevel = 'high' | 'medium' | 'low';

/**
 * Session log event metadata
 */
export interface LogEvent {
  timestamp: string;
  category: EventCategory;
  description: string;
  files?: string[];
  impact: ImpactLevel;
  contextPressure?: number;
}

/**
 * Session log structure
 */
export interface SessionLog {
  metadata: {
    session_id: string;
    started: string;
    user: string;
    branch: string;
    initial_pressure: number;
  };
  timeline: LogEvent[];
  decisions: LogEvent[];
  filesAffected: Set<string>;
  insights: LogEvent[];
  gitOperations: LogEvent[];
  achievements: LogEvent[];
}

/**
 * Session logger for continuous logging during development
 */
export class SessionLogger {
  private logPath: string | null = null;
  private sessionLog: SessionLog | null = null;
  private verbose: boolean;

  constructor(verbose = false) {
    this.verbose = verbose;
  }

  /**
   * Initialize session log
   */
  async initialize(sessionId: string, branch: string, initialPressure = 0.15): Promise<void> {
    const ginkoDir = await getGinkoDir();
    const userEmail = await getUserEmail();
    const userName = userEmail.split('@')[0].replace(/[^a-z0-9-]/gi, '-');

    const sessionsDir = path.join(ginkoDir, 'sessions', userName);
    await fs.ensureDir(sessionsDir);

    this.logPath = path.join(sessionsDir, 'current-session-log.md');

    this.sessionLog = {
      metadata: {
        session_id: sessionId,
        started: new Date().toISOString(),
        user: userName,
        branch,
        initial_pressure: initialPressure
      },
      timeline: [],
      decisions: [],
      filesAffected: new Set(),
      insights: [],
      gitOperations: [],
      achievements: []
    };

    await this.writeLogFile();

    if (this.verbose) {
      console.log(chalk.green(`✓ Session log initialized: ${this.logPath}`));
    }
  }

  /**
   * Load existing session log
   */
  async load(): Promise<SessionLog | null> {
    const ginkoDir = await getGinkoDir();
    const userEmail = await getUserEmail();
    const userName = userEmail.split('@')[0].replace(/[^a-z0-9-]/gi, '-');

    const logPath = path.join(ginkoDir, 'sessions', userName, 'current-session-log.md');

    if (!(await fs.pathExists(logPath))) {
      return null;
    }

    this.logPath = logPath;

    // Parse the Markdown log file
    const content = await fs.readFile(logPath, 'utf8');
    this.sessionLog = this.parseLogFile(content);

    return this.sessionLog;
  }

  /**
   * Log an event to the session
   */
  async logEvent(
    category: EventCategory,
    description: string,
    metadata: {
      files?: string[];
      impact?: ImpactLevel;
      contextPressure?: number;
    } = {}
  ): Promise<void> {
    if (!this.sessionLog || !this.logPath) {
      throw new Error('Session log not initialized. Call initialize() first.');
    }

    // Auto-capture context pressure if not provided
    const pressure = metadata.contextPressure ?? (await this.estimateContextPressure());

    const event: LogEvent = {
      timestamp: this.formatTime(new Date()),
      category,
      description: this.validateDescription(description),
      files: metadata.files,
      impact: metadata.impact ?? 'medium',
      contextPressure: pressure
    };

    // Validate event format
    this.validateEvent(event);

    // Add to appropriate section
    this.sessionLog.timeline.push(event);

    switch (category) {
      case 'decision':
        this.sessionLog.decisions.push(event);
        break;
      case 'insight':
        this.sessionLog.insights.push(event);
        break;
      case 'git':
        this.sessionLog.gitOperations.push(event);
        break;
      case 'achievement':
        this.sessionLog.achievements.push(event);
        break;
    }

    // Track affected files
    if (event.files) {
      event.files.forEach(file => this.sessionLog!.filesAffected.add(file));
    }

    // Append to log file
    await this.appendEventToFile(event);

    if (this.verbose) {
      console.log(chalk.blue(`[${event.timestamp}] ${category}: ${description}`));
    }
  }

  /**
   * Get current session log
   */
  getLog(): SessionLog | null {
    return this.sessionLog;
  }

  /**
   * Archive current session log
   */
  async archive(handoffMessage?: string): Promise<string> {
    if (!this.sessionLog || !this.logPath) {
      throw new Error('No active session log to archive');
    }

    const ginkoDir = await getGinkoDir();
    const userEmail = await getUserEmail();
    const userName = userEmail.split('@')[0].replace(/[^a-z0-9-]/gi, '-');

    const archiveDir = path.join(ginkoDir, 'sessions', userName, 'archive');
    await fs.ensureDir(archiveDir);

    const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, -5);
    const archivePath = path.join(archiveDir, `${timestamp}-session-log.md`);

    // Add handoff message if provided
    let content = await fs.readFile(this.logPath, 'utf8');
    if (handoffMessage) {
      content += `\n\n## Handoff Summary\n\n${handoffMessage}\n`;
    }

    await fs.writeFile(archivePath, content);

    // Clear current log
    await fs.remove(this.logPath);
    this.sessionLog = null;
    this.logPath = null;

    if (this.verbose) {
      console.log(chalk.green(`✓ Session log archived: ${archivePath}`));
    }

    return archivePath;
  }

  /**
   * Write the full log file
   */
  private async writeLogFile(): Promise<void> {
    if (!this.sessionLog || !this.logPath) return;

    const content = this.generateMarkdown(this.sessionLog);
    await fs.writeFile(this.logPath, content, 'utf8');
  }

  /**
   * Append a single event to the log file
   */
  private async appendEventToFile(event: LogEvent): Promise<void> {
    if (!this.logPath) return;

    const eventMarkdown = this.formatEventMarkdown(event);

    // Read current content
    let content = await fs.readFile(this.logPath, 'utf8');

    // Find the appropriate section to append to
    const sectionMap: Record<EventCategory, string> = {
      fix: '## Timeline',
      feature: '## Timeline',
      decision: '## Key Decisions',
      insight: '## Insights',
      git: '## Git Operations',
      achievement: '## Achievements'
    };

    const section = sectionMap[event.category];
    const sectionIndex = content.indexOf(section);

    if (sectionIndex !== -1) {
      // Find the next section or end of file
      const nextSectionIndex = content.indexOf('\n## ', sectionIndex + section.length);
      const insertPosition = nextSectionIndex === -1 ? content.length : nextSectionIndex;

      // Insert the event
      content = content.slice(0, insertPosition) +
                '\n' + eventMarkdown + '\n' +
                content.slice(insertPosition);
    } else {
      // Section doesn't exist, append at end
      content += `\n${section}\n\n${eventMarkdown}\n`;
    }

    await fs.writeFile(this.logPath, content, 'utf8');
  }

  /**
   * Generate Markdown content for session log
   */
  private generateMarkdown(log: SessionLog): string {
    const { metadata } = log;

    let markdown = `---
session_id: ${metadata.session_id}
started: ${metadata.started}
user: ${metadata.user}
branch: ${metadata.branch}
context_pressure_at_start: ${metadata.initial_pressure}
---

# Session Log: ${metadata.session_id}

## Timeline

## Key Decisions

## Files Affected

## Insights

## Git Operations

## Achievements
`;

    return markdown;
  }

  /**
   * Format event as Markdown
   */
  private formatEventMarkdown(event: LogEvent): string {
    let markdown = `### ${event.timestamp} - [${event.category}]\n`;
    markdown += `${event.description}\n`;

    if (event.files && event.files.length > 0) {
      markdown += `Files: ${event.files.join(', ')}\n`;
    }

    markdown += `Impact: ${event.impact}`;

    if (event.contextPressure !== undefined) {
      markdown += ` | Pressure: ${(event.contextPressure * 100).toFixed(0)}%`;
    }

    return markdown;
  }

  /**
   * Parse log file content into SessionLog structure
   */
  private parseLogFile(content: string): SessionLog {
    // Extract frontmatter
    const frontmatterMatch = content.match(/^---\n([\s\S]*?)\n---/);
    const frontmatter: Record<string, any> = {};

    if (frontmatterMatch) {
      const lines = frontmatterMatch[1].split('\n');
      lines.forEach(line => {
        const [key, ...valueParts] = line.split(':');
        if (key && valueParts.length > 0) {
          frontmatter[key.trim()] = valueParts.join(':').trim();
        }
      });
    }

    // Parse events from sections
    const timeline: LogEvent[] = [];
    const decisions: LogEvent[] = [];
    const insights: LogEvent[] = [];
    const gitOperations: LogEvent[] = [];
    const achievements: LogEvent[] = [];
    const filesAffected = new Set<string>();

    // Extract events (simplified parsing)
    const eventRegex = /### (\d{2}:\d{2}) - \[(.*?)\]\n(.*?)(?:\nFiles: (.*?))?\nImpact: (high|medium|low)/g;
    let match;

    while ((match = eventRegex.exec(content)) !== null) {
      const event: LogEvent = {
        timestamp: match[1],
        category: match[2] as EventCategory,
        description: match[3],
        files: match[4]?.split(', ').filter(Boolean),
        impact: match[5] as ImpactLevel
      };

      timeline.push(event);

      if (event.files) {
        event.files.forEach(file => filesAffected.add(file));
      }

      switch (event.category) {
        case 'decision':
          decisions.push(event);
          break;
        case 'insight':
          insights.push(event);
          break;
        case 'git':
          gitOperations.push(event);
          break;
        case 'achievement':
          achievements.push(event);
          break;
      }
    }

    return {
      metadata: {
        session_id: frontmatter.session_id || 'unknown',
        started: frontmatter.started || new Date().toISOString(),
        user: frontmatter.user || 'unknown',
        branch: frontmatter.branch || 'main',
        initial_pressure: parseFloat(frontmatter.context_pressure_at_start) || 0.15
      },
      timeline,
      decisions,
      filesAffected,
      insights,
      gitOperations,
      achievements
    };
  }

  /**
   * Format time as HH:MM
   */
  private formatTime(date: Date): string {
    return date.toTimeString().slice(0, 5);
  }

  /**
   * Validate description is concise (1-2 sentences)
   */
  private validateDescription(description: string): string {
    const trimmed = description.trim();
    const sentences = trimmed.split(/[.!?]+/).filter(s => s.trim().length > 0);

    if (sentences.length > 2) {
      console.warn(chalk.yellow('⚠ Description should be 1-2 sentences. Consider being more concise.'));
    }

    return trimmed;
  }

  /**
   * Validate event format
   */
  private validateEvent(event: LogEvent): void {
    if (!event.timestamp || !/^\d{2}:\d{2}$/.test(event.timestamp)) {
      throw new Error('Invalid timestamp format. Expected HH:MM');
    }

    if (!event.category) {
      throw new Error('Event category is required');
    }

    if (!event.description || event.description.length === 0) {
      throw new Error('Event description is required');
    }

    if (!['high', 'medium', 'low'].includes(event.impact)) {
      throw new Error('Invalid impact level. Expected high, medium, or low');
    }
  }

  /**
   * Estimate context pressure (simplified - in real implementation,
   * this would integrate with a proper pressure monitor)
   */
  private async estimateContextPressure(): Promise<number> {
    // This is a placeholder. In a real implementation, this would:
    // 1. Track conversation token count
    // 2. Compare against max context window
    // 3. Return pressure percentage (0.0 - 1.0)

    // For now, return a reasonable default
    if (!this.sessionLog) return 0.15;

    // Estimate based on number of events (rough heuristic)
    const eventCount = this.sessionLog.timeline.length;
    const estimatedPressure = Math.min(0.95, 0.15 + (eventCount * 0.05));

    return estimatedPressure;
  }
}

/**
 * Convenience function to log an event
 */
export async function logEvent(
  category: EventCategory,
  description: string,
  metadata?: {
    files?: string[];
    impact?: ImpactLevel;
    contextPressure?: number;
  }
): Promise<void> {
  const logger = new SessionLogger();
  await logger.load();
  await logger.logEvent(category, description, metadata);
}

/**
 * Create a new session log
 */
export async function createSessionLog(
  sessionId: string,
  branch: string,
  initialPressure = 0.15
): Promise<SessionLogger> {
  const logger = new SessionLogger();
  await logger.initialize(sessionId, branch, initialPressure);
  return logger;
}

/**
 * Load existing session log
 */
export async function loadSessionLog(): Promise<SessionLogger | null> {
  const logger = new SessionLogger();
  const log = await logger.load();
  return log ? logger : null;
}
