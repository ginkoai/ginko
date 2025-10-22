/**
 * @fileType: utility
 * @status: current
 * @updated: 2025-10-22
 * @tags: [team, collaboration, awareness, session-logs, task-012]
 * @related: [session-log-manager.ts, config-loader.ts, reference-parser.ts]
 * @priority: medium
 * @complexity: medium
 * @dependencies: [fs-extra, path, reference-parser, session-log-manager, config-loader]
 */

/**
 * Team Awareness Utility
 *
 * Enables team visibility and coordination through user-namespaced session logs.
 * Provides functions to discover active teammates, view their sessions, and track activity.
 *
 * Based on TASK-012 and PRD-009 Phase 4
 */

import fs from 'fs-extra';
import path from 'path';
import { resolveProjectPath } from './config-loader.js';
import { SessionLogManager, type LogEntry, type SessionLogMetadata } from '../core/session-log-manager.js';
import { extractReferences, type Reference } from './reference-parser.js';

/**
 * Team member with session information
 */
export interface TeamMember {
  email: string;
  slug: string;
  lastActive: Date;
  currentTask?: string;
  branch?: string;
  recentEvents: LogEntry[];
  filesModified: string[];
  sessionStarted?: Date;
}

/**
 * Team timeline event (aggregated from all members)
 */
export interface TeamTimelineEvent {
  timestamp: Date;
  user: string;
  category: string;
  description: string;
  files?: string[];
}

/**
 * File activity summary
 */
export interface FileActivity {
  filePath: string;
  users: string[];
  lastModified: Date;
}

/**
 * Get all active team members (last 24h by default)
 *
 * @param timeWindowHours - Time window in hours (default: 24)
 * @returns Array of TeamMember objects sorted by most recent activity
 *
 * @example
 * const members = await getActiveTeamMembers();
 * // → [
 * //   { email: 'alice@company.com', lastActive: Date(...), ... },
 * //   { email: 'bob@company.com', lastActive: Date(...), ... }
 * // ]
 */
export async function getActiveTeamMembers(timeWindowHours: number = 24): Promise<TeamMember[]> {
  try {
    const sessionsDir = await resolveProjectPath('sessions');

    // Check if sessions directory exists
    if (!(await fs.pathExists(sessionsDir))) {
      return [];
    }

    const userDirs = await fs.readdir(sessionsDir);
    const members: TeamMember[] = [];
    const cutoffTime = new Date(Date.now() - timeWindowHours * 60 * 60 * 1000);

    for (const userSlug of userDirs) {
      // Skip non-directory entries (like .DS_Store, vibechecks.log)
      const userDirPath = path.join(sessionsDir, userSlug);
      const stat = await fs.stat(userDirPath);

      if (!stat.isDirectory()) {
        continue;
      }

      // Try to load session log
      const hasLog = await SessionLogManager.hasSessionLog(userDirPath);

      if (!hasLog) {
        continue;
      }

      const logContent = await SessionLogManager.loadSessionLog(userDirPath);
      const metadata = SessionLogManager.parseMetadata(logContent);

      if (!metadata) {
        continue;
      }

      // Get last event time
      const lastEventTime = await getLastEventTime(userDirPath, logContent);

      // Only include members active within time window
      if (lastEventTime < cutoffTime) {
        continue;
      }

      // Extract current task from recent events
      const currentTask = await extractCurrentTask(logContent);

      // Get recent events (last 5)
      const recentEvents = await getRecentEvents(logContent, 5);

      // Get files modified
      const filesModified = await getFilesModified(logContent);

      members.push({
        email: metadata.user,
        slug: userSlug,
        lastActive: lastEventTime,
        currentTask,
        branch: metadata.branch,
        recentEvents,
        filesModified,
        sessionStarted: metadata.started ? new Date(metadata.started) : undefined
      });
    }

    // Sort by most recent activity
    return members.sort((a, b) => b.lastActive.getTime() - a.lastActive.getTime());
  } catch (error) {
    // Gracefully handle errors (e.g., config not initialized)
    return [];
  }
}

/**
 * Get detailed session information for a specific team member
 *
 * @param userIdentifier - Email or slug of team member
 * @returns TeamMember object or null if not found
 *
 * @example
 * const member = await getTeamMemberSession('alice@company.com');
 * if (member) {
 *   console.log(`Alice last active: ${member.lastActive}`);
 * }
 */
export async function getTeamMemberSession(userIdentifier: string): Promise<TeamMember | null> {
  try {
    const sessionsDir = await resolveProjectPath('sessions');

    // Convert email to slug if needed
    const slug = userIdentifier.includes('@')
      ? userIdentifier.replace('@', '-at-').replace(/\./g, '-')
      : userIdentifier;

    const userDirPath = path.join(sessionsDir, slug);

    // Check if user directory exists
    if (!(await fs.pathExists(userDirPath))) {
      return null;
    }

    // Check if session log exists
    const hasLog = await SessionLogManager.hasSessionLog(userDirPath);

    if (!hasLog) {
      return null;
    }

    const logContent = await SessionLogManager.loadSessionLog(userDirPath);
    const metadata = SessionLogManager.parseMetadata(logContent);

    if (!metadata) {
      return null;
    }

    // Get last event time
    const lastEventTime = await getLastEventTime(userDirPath, logContent);

    // Extract current task
    const currentTask = await extractCurrentTask(logContent);

    // Get all recent events (up to 20 for detail view)
    const recentEvents = await getRecentEvents(logContent, 20);

    // Get files modified
    const filesModified = await getFilesModified(logContent);

    return {
      email: metadata.user,
      slug,
      lastActive: lastEventTime,
      currentTask,
      branch: metadata.branch,
      recentEvents,
      filesModified,
      sessionStarted: metadata.started ? new Date(metadata.started) : undefined
    };
  } catch (error) {
    return null;
  }
}

/**
 * Get chronological timeline of all team events
 *
 * @param timeWindowHours - Time window in hours (default: 24)
 * @param limit - Maximum number of events to return (default: 50)
 * @returns Array of TeamTimelineEvent objects sorted by most recent
 *
 * @example
 * const timeline = await getTeamTimeline(24, 10);
 * // → [
 * //   { timestamp: Date(...), user: 'alice@...', category: 'feature', description: '...' },
 * //   { timestamp: Date(...), user: 'bob@...', category: 'fix', description: '...' }
 * // ]
 */
export async function getTeamTimeline(
  timeWindowHours: number = 24,
  limit: number = 50
): Promise<TeamTimelineEvent[]> {
  const members = await getActiveTeamMembers(timeWindowHours);
  const events: TeamTimelineEvent[] = [];

  for (const member of members) {
    // Use session start date as base
    const sessionStart = member.sessionStarted || member.lastActive;

    for (const event of member.recentEvents) {
      // Parse timestamp (format: HH:MM)
      const [hours, minutes] = event.timestamp.split(':').map(Number);
      const eventDate = new Date(sessionStart);
      eventDate.setHours(hours, minutes, 0, 0);

      // If event time is in the future relative to session start, it's from previous day
      // This can happen if session started late and continued past midnight
      if (eventDate > new Date()) {
        eventDate.setDate(eventDate.getDate() - 1);
      }

      events.push({
        timestamp: eventDate,
        user: member.email,
        category: event.category,
        description: event.description,
        files: event.files
      });
    }
  }

  // Sort by most recent
  events.sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());

  // Return limited number
  return events.slice(0, limit);
}

/**
 * Get file activity across team (who's working on what files)
 *
 * @param timeWindowHours - Time window in hours (default: 24)
 * @returns Array of FileActivity objects
 *
 * @example
 * const activity = await getTeamFileActivity();
 * // → [
 * //   { filePath: 'src/auth.ts', users: ['alice@...', 'bob@...'], lastModified: Date(...) },
 * //   { filePath: 'src/api.ts', users: ['alice@...'], lastModified: Date(...) }
 * // ]
 */
export async function getTeamFileActivity(timeWindowHours: number = 24): Promise<FileActivity[]> {
  const members = await getActiveTeamMembers(timeWindowHours);
  const fileMap = new Map<string, { users: Set<string>; lastModified: Date }>();

  for (const member of members) {
    // Use session start date as base
    const sessionStart = member.sessionStarted || member.lastActive;

    // Process each event to get per-file modification times
    for (const event of member.recentEvents) {
      if (!event.files) continue;

      // Parse event timestamp
      const [hours, minutes] = event.timestamp.split(':').map(Number);
      const eventDate = new Date(sessionStart);
      eventDate.setHours(hours, minutes, 0, 0);

      // If event time is in the future, it's from previous day
      if (eventDate > new Date()) {
        eventDate.setDate(eventDate.getDate() - 1);
      }

      // Track each file in this event
      for (const file of event.files) {
        // Clean up file path (remove line numbers)
        const cleanPath = file.split(':')[0];

        if (!fileMap.has(cleanPath)) {
          fileMap.set(cleanPath, {
            users: new Set(),
            lastModified: eventDate
          });
        }

        const activity = fileMap.get(cleanPath)!;
        activity.users.add(member.email);

        // Update last modified to most recent event for this file
        if (eventDate > activity.lastModified) {
          activity.lastModified = eventDate;
        }
      }
    }
  }

  // Convert to array and sort by most recently modified
  const activities: FileActivity[] = Array.from(fileMap.entries()).map(([filePath, data]) => ({
    filePath,
    users: Array.from(data.users),
    lastModified: data.lastModified
  }));

  activities.sort((a, b) => b.lastModified.getTime() - a.lastModified.getTime());

  return activities;
}

/**
 * Find potential file conflicts (multiple users modifying same files)
 *
 * @param timeWindowHours - Time window in hours (default: 24)
 * @returns Array of FileActivity objects with 2+ users
 *
 * @example
 * const conflicts = await getFileConflicts();
 * if (conflicts.length > 0) {
 *   console.log('Potential conflicts:');
 *   conflicts.forEach(c => console.log(`${c.filePath}: ${c.users.join(', ')}`));
 * }
 */
export async function getFileConflicts(timeWindowHours: number = 24): Promise<FileActivity[]> {
  const activity = await getTeamFileActivity(timeWindowHours);
  return activity.filter(a => a.users.length > 1);
}

/**
 * Get the current task from session log
 * Extracts task references (TASK-XXX, FEATURE-XXX) from recent events
 *
 * @param logContent - Session log content
 * @returns Task reference or undefined
 */
async function extractCurrentTask(logContent: string): Promise<string | undefined> {
  // Extract references from log
  const references = extractReferences(logContent);

  // Look for most recent TASK or FEATURE reference
  const taskRefs = references.filter(r => r.type === 'task' || r.type === 'feature');

  if (taskRefs.length > 0) {
    // Return the first one (most recent)
    return taskRefs[0].rawText;
  }

  return undefined;
}

/**
 * Get last event time from session log
 *
 * @param userDirPath - Path to user session directory
 * @param logContent - Session log content
 * @returns Date of last event or session start
 */
async function getLastEventTime(userDirPath: string, logContent: string): Promise<Date> {
  // Get metadata for session start time
  const metadata = SessionLogManager.parseMetadata(logContent);
  const sessionStart = metadata?.started ? new Date(metadata.started) : new Date();

  // Try to extract most recent event timestamp
  const timeline = SessionLogManager.extractEntries(logContent, 'Timeline');

  if (timeline.length > 0) {
    // Get last event from timeline
    const lastEvent = timeline[timeline.length - 1];

    // Parse HH:MM format and combine with session start date
    const [hours, minutes] = lastEvent.timestamp.split(':').map(Number);
    const eventDate = new Date(sessionStart);
    eventDate.setHours(hours, minutes, 0, 0);

    return eventDate;
  }

  // No events, return session start time
  return sessionStart;
}

/**
 * Get recent events from session log
 *
 * @param logContent - Session log content
 * @param limit - Maximum number of events to return
 * @returns Array of LogEntry objects
 */
async function getRecentEvents(logContent: string, limit: number = 5): Promise<LogEntry[]> {
  const timeline = SessionLogManager.extractEntries(logContent, 'Timeline');

  // Return last N events
  return timeline.slice(-limit);
}

/**
 * Get files modified from session log
 *
 * @param logContent - Session log content
 * @returns Array of file paths
 */
async function getFilesModified(logContent: string): Promise<string[]> {
  const timeline = SessionLogManager.extractEntries(logContent, 'Timeline');
  const filesSet = new Set<string>();

  for (const entry of timeline) {
    if (entry.files) {
      for (const file of entry.files) {
        // Clean up file paths (remove line numbers like :42)
        const cleanPath = file.split(':')[0];
        filesSet.add(cleanPath);
      }
    }
  }

  return Array.from(filesSet);
}

/**
 * Format relative time (e.g., "2h ago", "30m ago")
 *
 * @param date - Date to format
 * @returns Human-readable relative time string
 */
export function formatRelativeTime(date: Date): string {
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMinutes = Math.floor(diffMs / (1000 * 60));
  const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

  if (diffMinutes < 1) {
    return 'just now';
  } else if (diffMinutes < 60) {
    return `${diffMinutes}m ago`;
  } else if (diffHours < 24) {
    return `${diffHours}h ago`;
  } else {
    return `${diffDays}d ago`;
  }
}

/**
 * Format timestamp as HH:MM
 *
 * @param date - Date to format
 * @returns Formatted time string
 */
export function formatTime(date: Date): string {
  return date.toLocaleTimeString('en-US', {
    hour: '2-digit',
    minute: '2-digit',
    hour12: false
  });
}
