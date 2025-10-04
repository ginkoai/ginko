/**
 * @fileType: model
 * @status: current
 * @updated: 2025-10-03
 * @tags: [types, session-log, adr-033]
 * @related: [../core/session-log-manager.ts]
 * @priority: critical
 * @complexity: low
 * @dependencies: []
 */

/**
 * Complete session log structure with YAML frontmatter and categorized entries
 * Implements ADR-033 Phase 1: Session Log Infrastructure
 */
export interface SessionLog {
  metadata: SessionMetadata;
  timeline: LogEntry[];
  decisions: LogEntry[];
  filesAffected: string[];
  insights: LogEntry[];
  gitOperations: LogEntry[];
}

/**
 * YAML frontmatter metadata for session logs
 * Captures initial session state
 */
export interface SessionMetadata {
  session_id: string;
  started: string; // ISO datetime
  user: string;
  branch: string;
}

/**
 * Individual log entry with timestamp and category
 * Enables defensive session logging
 */
export interface LogEntry {
  timestamp: string; // ISO datetime
  category: 'fix' | 'feature' | 'decision' | 'insight' | 'git' | 'achievement';
  description: string;
  files?: string[];
  impact: 'high' | 'medium' | 'low';
}

/**
 * Parsed session log with separated frontmatter and content
 * Internal representation for processing
 */
export interface ParsedSessionLog {
  frontmatter: SessionMetadata;
  content: string;
  sections: {
    timeline: LogEntry[];
    decisions: LogEntry[];
    filesAffected: string[];
    insights: LogEntry[];
    gitOperations: LogEntry[];
  };
}

/**
 * Options for creating a new session log
 */
export interface CreateSessionLogOptions {
  userId: string;
  branch: string;
}

/**
 * Options for appending log entries
 */
export interface AppendLogEntryOptions {
  sessionDir: string;
  entry: LogEntry;
  atomic?: boolean; // Default true
}

/**
 * Result of log archive operation
 */
export interface ArchiveLogResult {
  success: boolean;
  archivePath: string;
  timestamp: string;
  error?: string;
}
