/**
 * @fileType: types
 * @status: current
 * @updated: 2025-12-15
 * @tags: [insights, coaching, types, supabase]
 * @related: [../supabase/migrations/20251215_coaching_insights.sql]
 * @priority: high
 * @complexity: low
 * @dependencies: []
 */

// ============================================================================
// Database Types (match Supabase schema)
// ============================================================================

export type InsightRunStatus = 'pending' | 'running' | 'completed' | 'failed';
export type InsightCategory = 'efficiency' | 'patterns' | 'quality' | 'anti-patterns';
export type InsightSeverity = 'info' | 'suggestion' | 'warning' | 'critical';

/**
 * An insight run represents a single analysis session.
 * Contains overall score and links to individual insights.
 */
export interface InsightRun {
  id: string;
  user_id: string;
  project_id: string;
  graph_id?: string;
  run_at: string;
  status: InsightRunStatus;
  overall_score?: number;
  summary?: string;
  data_window_start?: string;
  data_window_end?: string;
  metadata?: Record<string, unknown>;
  created_at: string;
  updated_at: string;
}

/**
 * An individual insight from an analysis run.
 * Contains a specific finding with evidence and recommendations.
 */
export interface Insight {
  id: string;
  run_id: string;
  category: InsightCategory;
  severity: InsightSeverity;
  title: string;
  description: string;
  metric_name?: string;
  metric_value?: number;
  metric_target?: number;
  metric_unit?: string;
  score_impact: number;
  evidence: InsightEvidence[];
  recommendations: string[];
  created_at: string;
}

/**
 * Evidence supporting an insight.
 * Links back to source events, tasks, or other artifacts.
 */
export interface InsightEvidence {
  type: 'event' | 'task' | 'commit' | 'session' | 'pattern' | 'gotcha';
  id: string;
  description: string;
  timestamp?: string;
  url?: string;
}

/**
 * A single metric measurement for trend tracking.
 */
export interface InsightTrend {
  id: string;
  user_id: string;
  project_id: string;
  run_id?: string;
  metric_name: string;
  metric_value: number;
  metric_unit?: string;
  measured_at: string;
}

// ============================================================================
// Analysis Types (used by CLI and analyzers)
// ============================================================================

/**
 * Input data for insight analysis.
 * Aggregated from various sources before analysis.
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
  events: EventSummary[];
  tasks: TaskSummary;
  commits: CommitSummary[];
  sessions: SessionSummary[];
  patterns: PatternSummary[];
  gotchas: GotchaSummary[];
}

export interface EventSummary {
  id: string;
  category: string;
  description: string;
  timestamp: string;
  impact?: string;
  files?: string[];
  adrRefs?: string[];
  taskRefs?: string[];
}

export interface TaskSummary {
  completed: TaskInfo[];
  inProgress: TaskInfo[];
  abandoned: TaskInfo[];
  total: number;
}

export interface TaskInfo {
  id: string;
  title: string;
  status: string;
  startedAt?: string;
  completedAt?: string;
  daysInProgress?: number;
  eventCount: number;
}

export interface CommitSummary {
  hash: string;
  message: string;
  timestamp: string;
  filesChanged: number;
  linesAdded: number;
  linesRemoved: number;
}

export interface SessionSummary {
  id: string;
  startedAt: string;
  endedAt?: string;
  durationMinutes: number;
  flowState: string;
  eventCount: number;
  hasHandoff: boolean;
  contextLoadTime?: number;
}

export interface PatternSummary {
  id: string;
  name: string;
  usageCount: number;
  confidence: string;
  lastUsedAt?: string;
}

export interface GotchaSummary {
  id: string;
  title: string;
  severity: string;
  encounters: number;
  resolutions: number;
  lastEncounteredAt?: string;
}

// ============================================================================
// Analysis Output Types
// ============================================================================

/**
 * Raw insight from an analyzer before aggregation.
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
 * Category scores with breakdown.
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
 * Complete coaching report from analysis.
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
// CLI Output Types
// ============================================================================

/**
 * Formatted insight for CLI display.
 */
export interface FormattedInsight {
  icon: string; // e.g., "★", "◐", "○", "⚠️", "💡"
  title: string;
  description: string;
  category: InsightCategory;
  severity: InsightSeverity;
}

/**
 * CLI output format.
 */
export interface InsightsOutput {
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

// ============================================================================
// API Types
// ============================================================================

/**
 * Request to create a new insight run.
 */
export interface CreateInsightRunRequest {
  userId: string;
  projectId: string;
  graphId?: string;
  days?: number; // Analysis window in days
}

/**
 * Response from insights API.
 */
export interface InsightsApiResponse {
  run: InsightRun;
  insights: Insight[];
  categoryScores: CategoryScore[];
  trends: InsightTrend[];
}
