/**
 * @fileType: utility
 * @status: current
 * @updated: 2025-12-15
 * @tags: [insights, data-collection, events, tasks, commits]
 * @related: [types.ts, ../event-logger.ts, ../sprint-parser.ts]
 * @priority: high
 * @complexity: high
 * @dependencies: [fs, path, child_process]
 */

import * as fs from 'fs';
import * as path from 'path';
import { execSync } from 'child_process';
import {
  InsightData,
  EventData,
  TaskData,
  TaskInfo,
  CommitData,
  SessionData,
  PatternData,
  GotchaData,
} from './types.js';
import { findGinkoRoot } from '../../utils/ginko-root.js';

// ============================================================================
// Configuration
// ============================================================================

const DEFAULT_DAYS = 30;
const ADR_PATTERN = /ADR-(\d{3})/gi;
const TASK_PATTERN = /TASK-(\d+)/gi;
const PATTERN_PATTERN = /pattern[:\s]+([a-z-]+)/gi;

// ============================================================================
// Main Data Collector
// ============================================================================

export interface CollectorOptions {
  days?: number;
  projectRoot?: string;
  userId?: string;
  graphId?: string;
}

/**
 * Collects and aggregates data from all sources for insight analysis.
 * Uses findGinkoRoot to locate .ginko at monorepo root (like git finds .git).
 */
export async function collectInsightData(
  options: CollectorOptions = {}
): Promise<InsightData> {
  const days = options.days ?? DEFAULT_DAYS;

  // Find ginko root (traverses up to monorepo root like git)
  const ginkoRoot = await findGinkoRoot(options.projectRoot);
  const projectRoot = ginkoRoot ?? options.projectRoot ?? process.cwd();

  const now = new Date();
  const start = new Date(now.getTime() - days * 24 * 60 * 60 * 1000);

  // Determine user and project IDs
  const userId = options.userId ?? detectUserId(projectRoot);
  const projectId = detectProjectId(projectRoot);

  // Collect data from all sources in parallel
  const [events, tasks, commits, sessions, patterns, gotchas] = await Promise.all([
    collectEvents(projectRoot, userId, start, now),
    collectTasks(projectRoot, start, now),
    collectCommits(projectRoot, start, now),
    collectSessions(projectRoot, userId, start, now),
    collectPatterns(projectRoot),
    collectGotchas(projectRoot),
  ]);

  return {
    userId,
    projectId,
    graphId: options.graphId,
    period: { start, end: now, days },
    events,
    tasks,
    commits,
    sessions,
    patterns,
    gotchas,
  };
}

// ============================================================================
// Event Collection
// ============================================================================

/**
 * Collect events from local JSONL files.
 */
async function collectEvents(
  projectRoot: string,
  userId: string,
  start: Date,
  end: Date
): Promise<EventData[]> {
  const events: EventData[] = [];
  const userSlug = userId.replace('@', '-at-').replace(/\./g, '-');
  const eventsFile = path.join(
    projectRoot,
    '.ginko',
    'sessions',
    userSlug,
    'current-events.jsonl'
  );

  if (!fs.existsSync(eventsFile)) {
    return events;
  }

  try {
    const content = fs.readFileSync(eventsFile, 'utf-8');
    const lines = content.trim().split('\n').filter(Boolean);

    for (const line of lines) {
      try {
        const event = JSON.parse(line);
        const timestamp = new Date(event.timestamp);

        // Filter by date range
        if (timestamp < start || timestamp > end) {
          continue;
        }

        events.push({
          id: event.id,
          category: event.category,
          description: event.description,
          timestamp,
          impact: event.impact,
          files: event.files,
          branch: event.branch,
          adrRefs: extractADRRefs(event.description),
          taskRefs: extractTaskRefs(event.description),
          patternRefs: extractPatternRefs(event.description),
        });
      } catch {
        // Skip malformed lines
      }
    }
  } catch {
    // File read error
  }

  return events.sort((a, b) => a.timestamp.getTime() - b.timestamp.getTime());
}

// ============================================================================
// Task Collection
// ============================================================================

/**
 * Collect task data from sprint files.
 */
async function collectTasks(
  projectRoot: string,
  start: Date,
  end: Date
): Promise<TaskData> {
  const tasks: TaskData = {
    completed: [],
    inProgress: [],
    abandoned: [],
    paused: [],
    total: 0,
    completionRate: 0,
  };

  const sprintFile = path.join(projectRoot, 'docs', 'sprints', 'CURRENT-SPRINT.md');

  if (!fs.existsSync(sprintFile)) {
    return tasks;
  }

  try {
    const content = fs.readFileSync(sprintFile, 'utf-8');
    const taskBlocks = content.split(/### TASK-\d+:/);

    for (let i = 1; i < taskBlocks.length; i++) {
      const block = taskBlocks[i];
      const task = parseTaskBlock(block, i);

      if (task) {
        tasks.total++;

        switch (task.status) {
          case 'complete':
            tasks.completed.push(task);
            break;
          case 'in_progress':
            // Check if abandoned (in progress > 5 days with no recent events)
            if (task.daysInProgress > 5) {
              tasks.abandoned.push(task);
            } else {
              tasks.inProgress.push(task);
            }
            break;
          case 'paused':
            tasks.paused.push(task);
            break;
          default:
            // todo - not started
            break;
        }
      }
    }

    tasks.completionRate =
      tasks.total > 0 ? (tasks.completed.length / tasks.total) * 100 : 0;
  } catch {
    // File read error
  }

  return tasks;
}

/**
 * Parse a task block from sprint markdown.
 */
function parseTaskBlock(block: string, index: number): TaskInfo | null {
  const lines = block.split('\n');
  const titleMatch = lines[0]?.match(/^([^(]+)/);
  const title = titleMatch ? titleMatch[1].trim() : `Task ${index}`;

  // Parse status
  let status: TaskInfo['status'] = 'todo';
  const statusMatch = block.match(/\*\*Status:\*\*\s*\[([ xX@Z])\]/i);
  if (statusMatch) {
    const marker = statusMatch[1].toLowerCase();
    if (marker === 'x') status = 'complete';
    else if (marker === '@') status = 'in_progress';
    else if (marker === 'z') status = 'paused';
  }

  // Parse priority
  const priorityMatch = block.match(/\*\*Priority:\*\*\s*(HIGH|MEDIUM|LOW)/i);
  const priority = priorityMatch ? priorityMatch[1].toUpperCase() : undefined;

  // Parse effort
  const effortMatch = lines[0]?.match(/\((\d+h?)\)/);
  const effort = effortMatch ? effortMatch[1] : undefined;

  // Parse ID
  const idMatch = block.match(/\*\*ID:\*\*\s*(e\d+_s\d+_t\d+)/);
  const id = idMatch ? idMatch[1] : `task-${index}`;

  return {
    id,
    title,
    status,
    daysInProgress: status === 'in_progress' ? estimateDaysInProgress(block) : 0,
    eventCount: 0, // Will be enriched later
    effort,
    priority,
  };
}

/**
 * Estimate days in progress based on sprint start.
 */
function estimateDaysInProgress(block: string): number {
  // For now, return a default. Could be enhanced with git history.
  return 3;
}

// ============================================================================
// Commit Collection
// ============================================================================

/**
 * Collect commit data from git log.
 */
async function collectCommits(
  projectRoot: string,
  start: Date,
  end: Date
): Promise<CommitData[]> {
  const commits: CommitData[] = [];

  try {
    const since = start.toISOString().split('T')[0];
    const until = end.toISOString().split('T')[0];

    // Get commit log with stats
    const output = execSync(
      `git log --since="${since}" --until="${until}" --format="%H|%s|%aI|%an" --shortstat`,
      { cwd: projectRoot, encoding: 'utf-8', maxBuffer: 10 * 1024 * 1024 }
    );

    const lines = output.trim().split('\n');
    let currentCommit: Partial<CommitData> | null = null;

    for (const line of lines) {
      if (line.includes('|')) {
        // New commit line
        if (currentCommit?.hash) {
          commits.push(currentCommit as CommitData);
        }

        const [hash, message, timestamp, author] = line.split('|');
        currentCommit = {
          hash: hash.substring(0, 7),
          message,
          timestamp: new Date(timestamp),
          author,
          filesChanged: 0,
          linesAdded: 0,
          linesRemoved: 0,
          adrRefs: extractADRRefs(message),
          taskRefs: extractTaskRefs(message),
        };
      } else if (line.includes('file') && currentCommit) {
        // Stats line
        const filesMatch = line.match(/(\d+) files? changed/);
        const addMatch = line.match(/(\d+) insertions?/);
        const delMatch = line.match(/(\d+) deletions?/);

        currentCommit.filesChanged = filesMatch ? parseInt(filesMatch[1]) : 0;
        currentCommit.linesAdded = addMatch ? parseInt(addMatch[1]) : 0;
        currentCommit.linesRemoved = delMatch ? parseInt(delMatch[1]) : 0;
      }
    }

    // Push last commit
    if (currentCommit?.hash) {
      commits.push(currentCommit as CommitData);
    }
  } catch {
    // Git command failed
  }

  return commits;
}

// ============================================================================
// Session Collection
// ============================================================================

/**
 * Collect session data from archive files.
 */
async function collectSessions(
  projectRoot: string,
  userId: string,
  start: Date,
  end: Date
): Promise<SessionData[]> {
  const sessions: SessionData[] = [];
  const userSlug = userId.replace('@', '-at-').replace(/\./g, '-');
  const archiveDir = path.join(
    projectRoot,
    '.ginko',
    'sessions',
    userSlug,
    'archive'
  );

  if (!fs.existsSync(archiveDir)) {
    return sessions;
  }

  try {
    const files = fs.readdirSync(archiveDir).filter((f) => f.endsWith('.md'));

    for (const file of files) {
      // Parse timestamp from filename: session-log-2025-12-15T15-22-55-104Z.md
      const match = file.match(/session-log-(\d{4}-\d{2}-\d{2}T[\d-]+Z)\.md/);
      if (!match) continue;

      const timestamp = new Date(match[1].replace(/-/g, ':').replace('T', 'T').slice(0, -4).replace(/:(\d{2}):(\d{2}):(\d{3})/, ':$1:$2.$3'));

      // Filter by date range
      if (timestamp < start || timestamp > end) {
        continue;
      }

      const filePath = path.join(archiveDir, file);
      const content = fs.readFileSync(filePath, 'utf-8');

      sessions.push(parseSessionLog(content, file, timestamp));
    }
  } catch {
    // Archive read error
  }

  // Also check current session
  const currentLogFile = path.join(
    projectRoot,
    '.ginko',
    'sessions',
    userSlug,
    'current-session-log.md'
  );

  if (fs.existsSync(currentLogFile)) {
    try {
      const content = fs.readFileSync(currentLogFile, 'utf-8');
      const stats = fs.statSync(currentLogFile);
      sessions.push(parseSessionLog(content, 'current-session-log.md', stats.mtime));
    } catch {
      // Current session read error
    }
  }

  return sessions.sort((a, b) => a.startedAt.getTime() - b.startedAt.getTime());
}

/**
 * Parse session log for metrics.
 */
function parseSessionLog(content: string, filename: string, timestamp: Date): SessionData {
  // Count events (lines starting with timestamps)
  const eventLines = content.match(/^\d{4}-\d{2}-\d{2}/gm) || [];

  // Check for handoff
  const hasHandoff = content.toLowerCase().includes('handoff') ||
                     content.toLowerCase().includes('session summary');

  // Estimate flow state from content
  let flowState: SessionData['flowState'] = 'cold';
  if (content.includes('Hot (10/10)') || content.includes('Hot (9/10)')) {
    flowState = 'hot';
  } else if (content.includes('Warm') || content.includes('(7/10)') || content.includes('(8/10)')) {
    flowState = 'warm';
  }

  // Estimate duration (rough: count of events * avg time between)
  const durationMinutes = Math.max(15, eventLines.length * 10);

  return {
    id: filename.replace('.md', ''),
    startedAt: timestamp,
    durationMinutes,
    flowState,
    eventCount: eventLines.length,
    hasHandoff,
    archiveFile: filename,
  };
}

// ============================================================================
// Pattern Collection
// ============================================================================

/**
 * Collect pattern data from local docs.
 */
async function collectPatterns(projectRoot: string): Promise<PatternData[]> {
  const patterns: PatternData[] = [];
  const patternsDir = path.join(projectRoot, 'docs', 'patterns');

  if (!fs.existsSync(patternsDir)) {
    return patterns;
  }

  try {
    const files = fs.readdirSync(patternsDir).filter((f) => f.endsWith('.md'));

    for (const file of files) {
      const filePath = path.join(patternsDir, file);
      const content = fs.readFileSync(filePath, 'utf-8');

      // Parse pattern metadata
      const nameMatch = content.match(/^#\s*(.+)/m);
      const name = nameMatch ? nameMatch[1].trim() : file.replace('.md', '');

      const confidenceMatch = content.match(/confidence:\s*(high|medium|low)/i);
      const confidence = (confidenceMatch ? confidenceMatch[1].toLowerCase() : 'low') as PatternData['confidence'];

      patterns.push({
        id: file.replace('.md', ''),
        name,
        confidence,
        usageCount: 0, // Would need graph API to get actual count
      });
    }
  } catch {
    // Patterns directory read error
  }

  return patterns;
}

// ============================================================================
// Gotcha Collection
// ============================================================================

/**
 * Collect gotcha data from local docs.
 */
async function collectGotchas(projectRoot: string): Promise<GotchaData[]> {
  const gotchas: GotchaData[] = [];
  const gotchasDir = path.join(projectRoot, 'docs', 'gotchas');

  if (!fs.existsSync(gotchasDir)) {
    return gotchas;
  }

  try {
    const files = fs.readdirSync(gotchasDir).filter((f) => f.endsWith('.md'));

    for (const file of files) {
      const filePath = path.join(gotchasDir, file);
      const content = fs.readFileSync(filePath, 'utf-8');

      // Parse gotcha metadata
      const titleMatch = content.match(/^#\s*(.+)/m);
      const title = titleMatch ? titleMatch[1].trim() : file.replace('.md', '');

      const severityMatch = content.match(/severity:\s*(critical|high|medium|low)/i);
      const severity = (severityMatch ? severityMatch[1].toLowerCase() : 'medium') as GotchaData['severity'];

      gotchas.push({
        id: file.replace('.md', ''),
        title,
        severity,
        encounters: 0, // Would need graph API to get actual count
        resolutions: 0,
      });
    }
  } catch {
    // Gotchas directory read error
  }

  return gotchas;
}

// ============================================================================
// Helper Functions
// ============================================================================

/**
 * Detect user ID from git config or session files.
 */
function detectUserId(projectRoot: string): string {
  try {
    const email = execSync('git config user.email', {
      cwd: projectRoot,
      encoding: 'utf-8',
    }).trim();
    return email;
  } catch {
    return 'unknown@local';
  }
}

/**
 * Detect project ID from directory name or package.json.
 */
function detectProjectId(projectRoot: string): string {
  try {
    const pkgPath = path.join(projectRoot, 'package.json');
    if (fs.existsSync(pkgPath)) {
      const pkg = JSON.parse(fs.readFileSync(pkgPath, 'utf-8'));
      return pkg.name || path.basename(projectRoot);
    }
  } catch {
    // Fall through
  }
  return path.basename(projectRoot);
}

/**
 * Extract ADR references from text.
 */
function extractADRRefs(text: string): string[] {
  const matches = text.match(ADR_PATTERN) || [];
  return [...new Set(matches.map((m) => m.toUpperCase()))];
}

/**
 * Extract TASK references from text.
 */
function extractTaskRefs(text: string): string[] {
  const matches = text.match(TASK_PATTERN) || [];
  return [...new Set(matches.map((m) => m.toUpperCase()))];
}

/**
 * Extract pattern references from text.
 */
function extractPatternRefs(text: string): string[] {
  const matches = text.match(PATTERN_PATTERN) || [];
  return [...new Set(matches.map((m) => m.toLowerCase().replace('pattern:', '').trim()))];
}

// ============================================================================
// Exports
// ============================================================================

export {
  collectEvents,
  collectTasks,
  collectCommits,
  collectSessions,
  collectPatterns,
  collectGotchas,
  detectUserId,
  detectProjectId,
  extractADRRefs,
  extractTaskRefs,
  extractPatternRefs,
};
