/**
 * @fileType: types
 * @status: current
 * @updated: 2025-12-15
 * @tags: [insights, coaching, types, cli]
 * @related: [data-collector.ts, analyzers/]
 * @priority: high
 * @complexity: low
 * @dependencies: []
 */

// ============================================================================
// Core Types
// ============================================================================

export type InsightCategory = 'efficiency' | 'patterns' | 'quality' | 'anti-patterns';
export type InsightSeverity = 'info' | 'suggestion' | 'warning' | 'critical';

// ============================================================================
// Data Collection Types
// ============================================================================

/**
 * Aggregated data for insight analysis.
 */
export interface InsightData {
  userId: string;
  projectId: string;
  graphId?: string;
  period: {
    start: Date;
    end: Date;
    days: number;
  };
  events: EventData[];
  tasks: TaskData;
  commits: CommitData[];
  sessions: SessionData[];
  patterns: PatternData[];
  gotchas: GotchaData[];
}

/**
 * Event data from local JSONL or graph.
 */
export interface EventData {
  id: string;
  category: string;
  description: string;
  timestamp: Date;
  impact?: 'high' | 'medium' | 'low';
  files?: string[];
  branch?: string;
  adrRefs: string[];
  taskRefs: string[];
  patternRefs: string[];
}

/**
 * Task data from sprint files.
 */
export interface TaskData {
  completed: TaskInfo[];
  inProgress: TaskInfo[];
  abandoned: TaskInfo[];
  paused: TaskInfo[];
  total: number;
  completionRate: number;
}

export interface TaskInfo {
  id: string;
  title: string;
  status: 'complete' | 'in_progress' | 'todo' | 'paused';
  sprintId?: string;
  startedAt?: Date;
  completedAt?: Date;
  daysInProgress: number;
  eventCount: number;
  effort?: string;
  priority?: string;
}

/**
 * Commit data from git log.
 */
export interface CommitData {
  hash: string;
  message: string;
  timestamp: Date;
  author: string;
  filesChanged: number;
  linesAdded: number;
  linesRemoved: number;
  adrRefs: string[];
  taskRefs: string[];
}

/**
 * Session data from session logs.
 */
export interface SessionData {
  id: string;
  startedAt: Date;
  endedAt?: Date;
  durationMinutes: number;
  flowState: 'cold' | 'warm' | 'hot';
  eventCount: number;
  hasHandoff: boolean;
  contextLoadTimeMs?: number;
  archiveFile?: string;
}

/**
 * Pattern data from graph.
 */
export interface PatternData {
  id: string;
  name: string;
  description?: string;
  usageCount: number;
  confidence: 'high' | 'medium' | 'low';
  createdAt?: Date;
  lastUsedAt?: Date;
}

/**
 * Gotcha data from graph.
 */
export interface GotchaData {
  id: string;
  title: string;
  description?: string;
  severity: 'critical' | 'high' | 'medium' | 'low';
  encounters: number;
  resolutions: number;
  lastEncounteredAt?: Date;
}

// ============================================================================
// Analysis Output Types
// ============================================================================

/**
 * Evidence supporting an insight.
 */
export interface InsightEvidence {
  type: 'event' | 'task' | 'commit' | 'session' | 'pattern' | 'gotcha';
  id: string;
  description: string;
  timestamp?: Date;
}

/**
 * Raw insight from an analyzer.
 */
export interface RawInsight {
  category: InsightCategory;
  severity: InsightSeverity;
  title: string;
  description: string;
  metricName?: string;
  metricValue?: number;
  metricTarget?: number;
  metricUnit?: string;
  scoreImpact: number;
  evidence: InsightEvidence[];
  recommendations: string[];
}

/**
 * Category score breakdown.
 */
export interface CategoryScore {
  category: InsightCategory;
  score: number;
  baseScore: number;
  adjustments: number;
  insightCount: number;
  criticalCount: number;
  warningCount: number;
}

/**
 * Complete coaching report.
 */
export interface CoachingReport {
  userId: string;
  projectId: string;
  runAt: Date;
  period: {
    start: Date;
    end: Date;
    days: number;
  };
  overallScore: number;
  previousScore?: number;
  scoreTrend?: 'up' | 'down' | 'stable';
  categoryScores: CategoryScore[];
  insights: RawInsight[];
  summary: string;
}

// ============================================================================
// Analyzer Interface
// ============================================================================

/**
 * Interface for all insight analyzers.
 */
export interface InsightAnalyzer {
  category: InsightCategory;
  analyze(data: InsightData): Promise<RawInsight[]>;
}

// ============================================================================
// CLI Output Types
// ============================================================================

export interface InsightIcon {
  info: '○';
  suggestion: '◐';
  warning: '⚠️';
  critical: '🚨';
}

export interface FormattedInsight {
  icon: string;
  title: string;
  description: string;
  category: InsightCategory;
  severity: InsightSeverity;
}

export interface CLIOutput {
  header: {
    userId: string;
    projectId: string;
    analysisWindow: string;
  };
  categories: {
    name: InsightCategory;
    displayName: string;
    score: number;
    insights: FormattedInsight[];
  }[];
  overall: {
    score: number;
    trend?: string;
    trendDirection?: 'up' | 'down' | 'stable';
  };
}
