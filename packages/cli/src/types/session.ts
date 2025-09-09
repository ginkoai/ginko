/**
 * @fileType: model
 * @status: current
 * @updated: 2025-09-09
 * @tags: [types, session, insights, context-capture]
 * @related: [../services/insight-extractor.ts, ../services/module-generator.ts]
 * @priority: critical
 * @complexity: low
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