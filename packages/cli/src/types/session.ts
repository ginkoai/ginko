/**
 * @fileType: model
 * @status: current
 * @updated: 2025-10-01
 * @tags: [types, session, insights, context-capture, session-log, adr-033]
 * @related: [../services/insight-extractor.ts, ../services/module-generator.ts]
 * @priority: critical
 * @complexity: medium
 * @dependencies: []
 */

/**
 * Comprehensive session data collected during development
 */
export interface SessionData {
  // Git information
  branch: string;
  commits: GitCommit[];
  diff: string;
  stagedDiff: string;
  filesChanged: FileChange[];
  
  // Development activity
  testResults?: TestResult[];
  errorLogs?: ErrorLog[];
  buildOutput?: string;
  terminalOutput?: string[];
  
  // Time information
  sessionStart: Date;
  sessionEnd: Date;
  duration: number; // minutes
  
  // Context
  workMode: WorkMode;
  previousHandoff?: string;
  userEmail: string;
}

/**
 * Work modes detected from git status and activity
 */
export type WorkMode = 'exploring' | 'developing' | 'testing' | 'debugging' | 'refactoring';

/**
 * Git commit information
 */
export interface GitCommit {
  hash: string;
  message: string;
  author: string;
  date: Date;
  filesChanged: number;
  insertions: number;
  deletions: number;
}

/**
 * File change details
 */
export interface FileChange {
  path: string;
  status: 'added' | 'modified' | 'deleted' | 'renamed';
  insertions: number;
  deletions: number;
  language?: string;
}

/**
 * Test execution results
 */
export interface TestResult {
  framework: 'jest' | 'vitest' | 'mocha' | 'pytest' | 'other';
  passed: number;
  failed: number;
  skipped: number;
  duration: number; // seconds
  failures?: TestFailure[];
}

/**
 * Individual test failure
 */
export interface TestFailure {
  name: string;
  file: string;
  error: string;
  stack?: string;
}

/**
 * Error log entry
 */
export interface ErrorLog {
  timestamp: Date;
  level: 'error' | 'warning' | 'info';
  message: string;
  file?: string;
  line?: number;
  stack?: string;
}

/**
 * Extracted insight from session analysis
 */
export interface SessionInsight {
  id: string;
  type: InsightType;
  title: string;
  problem: string;
  solution: string;
  impact: string;
  
  // Scoring metrics
  reusabilityScore: number; // 0-1
  timeSavingPotential: number; // minutes
  relevanceScore: number; // 0-1
  
  // Optional details
  codeExample?: CodeExample;
  preventedError?: string;
  relatedFiles?: string[];
  dependencies?: string[];
  tags?: string[];
  
  // Metadata
  sessionId: string;
  timestamp: Date;
}

/**
 * Types of insights that can be captured
 */
export type InsightType = 
  | 'gotcha'        // Surprising behavior or trap
  | 'pattern'       // Reusable code pattern
  | 'decision'      // Architectural or design decision
  | 'discovery'     // Tool, library, or API discovery
  | 'optimization'  // Performance or efficiency improvement
  | 'workaround'    // Temporary fix for known issue
  | 'configuration' // Important config setting;

/**
 * Code example for an insight
 */
export interface CodeExample {
  language: string;
  before?: string;
  after: string;
  explanation?: string;
}

/**
 * Context module generated from insight
 */
export interface ContextModule {
  filename: string;
  content: string;
  metadata: ModuleMetadata;
}

/**
 * Context module metadata
 */
export interface ModuleMetadata {
  type: InsightType;
  tags: string[];
  relevance: 'critical' | 'high' | 'medium' | 'low';
  created: string;
  updated: string;
  dependencies: string[];
  sessionId: string;
  insightId: string;
}

/**
 * Options for insight extraction
 */
export interface ExtractionOptions {
  maxInsights?: number;
  minReusabilityScore?: number;
  minTimeSaving?: number;
  includeCodeExamples?: boolean;
  aiModel?: string;
  verbose?: boolean;
}

/**
 * Result of insight extraction process
 */
export interface ExtractionResult {
  insights: SessionInsight[];
  modules: ContextModule[];
  summary: string;
  processingTime: number;
  errors?: string[];
}

/**
 * Configuration for automatic capture
 */
export interface CaptureConfig {
  enabled: boolean;
  autoCapture: boolean;
  captureThreshold: number;
  maxInsightsPerSession: number;
  aiModel: string;
  reviewBeforeSave: boolean;
  deduplicateModules: boolean;
  excludePatterns?: string[];
  includeTestFailures: boolean;
  includeBuildErrors: boolean;
}
/**
 * Session log entry for continuous logging (ADR-033 Phase 2)
 * Captured for defensive logging and handoff synthesis
 */
export interface SessionLogEntry {
  timestamp: Date;
  type: 'timeline' | 'decision' | 'file' | 'insight' | 'git' | 'achievement';
  content: string;
  metadata?: Record<string, any>;
}

/**
 * Complete session log structure (ADR-033 Phase 2)
 * Parsed from current-session-log.md
 */
export interface SessionLog {
  // Metadata from frontmatter
  sessionId: string;
  started: Date;
  lastUpdated: Date;
  
  // Main content sections
  timeline: TimelineEntry[];
  decisions: DecisionEntry[];
  filesAffected: FileAffectedEntry[];
  insights: InsightEntry[];
  gitOperations: GitOperationEntry[];
  achievements: string[];
  
  // Raw entries for debugging
  rawEntries?: SessionLogEntry[];
}

/**
 * Timeline entry showing chronological progress
 */
export interface TimelineEntry {
  timestamp: Date;
  event: string;
  duration?: string;
  outcome?: string;
}

/**
 * Decision entry capturing architectural and implementation choices
 */
export interface DecisionEntry {
  timestamp: Date;
  title: string;
  context: string;
  decision: string;
  rationale: string;
  alternatives?: string[];
  impact?: string;
}

/**
 * File affected entry with context
 */
export interface FileAffectedEntry {
  path: string;
  action: 'created' | 'modified' | 'deleted' | 'renamed';
  purpose: string;
  keyChanges?: string[];
  relatedTo?: string[];
}

/**
 * Insight entry for learnings and discoveries
 */
export interface InsightEntry {
  timestamp: Date;
  type: InsightType;
  title: string;
  description: string;
  impact?: string;
  codeExample?: CodeExample;
}

/**
 * Git operation entry
 */
export interface GitOperationEntry {
  timestamp: Date;
  operation: 'commit' | 'branch' | 'merge' | 'rebase' | 'stash';
  command: string;
  message?: string;
  files?: string[];
}
