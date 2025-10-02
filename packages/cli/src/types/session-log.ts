/**
 * @fileType: model
 * @status: current
 * @updated: 2025-10-01
 * @tags: [types, session-log, context-pressure, adr-033]
 * @related: [../core/session-log-manager.ts, ../core/pressure-monitor.ts]
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
 * Captures initial session state and context pressure
 */
export interface SessionMetadata {
  session_id: string;
  started: string; // ISO datetime
  user: string;
  branch: string;
  context_pressure_at_start: number; // 0-1 float
}

/**
 * Individual log entry with timestamp, category, and context pressure
 * Enables pressure-aware handoff synthesis
 */
export interface LogEntry {
  timestamp: string; // ISO datetime
  category: 'fix' | 'feature' | 'decision' | 'insight' | 'git' | 'achievement';
  description: string;
  files?: string[];
  impact: 'high' | 'medium' | 'low';
  context_pressure: number; // 0-1 float at time of log
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
  initialPressure?: number;
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
