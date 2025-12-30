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

// ============================================================================
// Dashboard Types (JSON-serialized versions for API responses)
// ============================================================================

/**
 * Trend score for a specific time period.
 */
export interface TrendScore {
  score: number;
  previousScore?: number;
  trend?: 'up' | 'down' | 'stable';
  periodDays: number;
  lastUpdated?: string;
}

/**
 * Dashboard-friendly coaching report with string dates (from JSON).
 */
export interface DashboardCoachingReport {
  userId: string;
  projectId: string;
  runAt: string;
  period: {
    start: string;
    end: string;
    days: number;
  };
  overallScore: number;
  previousScore?: number;
  scoreTrend?: 'up' | 'down' | 'stable';
  categoryScores: CategoryScore[];
  insights: RawInsight[];
  summary: string;
  // Trend scores for different time periods
  trendScores?: {
    day1?: TrendScore;
    day7?: TrendScore;
    day30?: TrendScore;
  };
}

// ============================================================================
// Display Constants (for dashboard components)
// ============================================================================

export const CATEGORY_DISPLAY_NAMES: Record<InsightCategory, string> = {
  'efficiency': 'Session Efficiency',
  'patterns': 'Pattern Adoption',
  'quality': 'Collaboration Quality',
  'anti-patterns': 'Anti-Patterns'
};

export const SEVERITY_ICONS: Record<InsightSeverity, string> = {
  'info': '○',
  'suggestion': '◐',
  'warning': '⚠️',
  'critical': '🚨'
};

export const SEVERITY_COLORS: Record<InsightSeverity, { bg: string; text: string; border: string }> = {
  'info': { bg: 'bg-slate-500/10', text: 'text-slate-400', border: 'border-slate-500/30' },
  'suggestion': { bg: 'bg-blue-500/10', text: 'text-blue-400', border: 'border-blue-500/30' },
  'warning': { bg: 'bg-yellow-500/10', text: 'text-yellow-400', border: 'border-yellow-500/30' },
  'critical': { bg: 'bg-red-500/10', text: 'text-red-400', border: 'border-red-500/30' }
};

export const CATEGORY_COLORS: Record<InsightCategory, { bg: string; text: string; border: string }> = {
  'efficiency': { bg: 'bg-cyan-500/10', text: 'text-cyan-400', border: 'border-cyan-500/30' },
  'patterns': { bg: 'bg-purple-500/10', text: 'text-purple-400', border: 'border-purple-500/30' },
  'quality': { bg: 'bg-green-500/10', text: 'text-green-400', border: 'border-green-500/30' },
  'anti-patterns': { bg: 'bg-orange-500/10', text: 'text-orange-400', border: 'border-orange-500/30' }
};

// ============================================================================
// Utility Functions
// ============================================================================

export function getScoreRating(score: number): { label: string; color: string } {
  if (score >= 90) return { label: 'Excellent', color: 'text-green-400' };
  if (score >= 75) return { label: 'Good', color: 'text-cyan-400' };
  if (score >= 60) return { label: 'Fair', color: 'text-yellow-400' };
  if (score >= 40) return { label: 'Needs Improvement', color: 'text-orange-400' };
  return { label: 'Critical', color: 'text-red-400' };
}

export function getScoreBarColor(score: number): string {
  if (score >= 90) return 'bg-green-500';
  if (score >= 75) return 'bg-cyan-500';
  if (score >= 60) return 'bg-yellow-500';
  if (score >= 40) return 'bg-orange-500';
  return 'bg-red-500';
}

export function getTrendIcon(trend?: 'up' | 'down' | 'stable'): string {
  switch (trend) {
    case 'up': return '↑';
    case 'down': return '↓';
    case 'stable': return '→';
    default: return '';
  }
}

export function getTrendColor(trend?: 'up' | 'down' | 'stable'): string {
  switch (trend) {
    case 'up': return 'text-green-400';
    case 'down': return 'text-red-400';
    case 'stable': return 'text-slate-400';
    default: return 'text-slate-400';
  }
}
