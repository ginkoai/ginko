/**
 * @fileType: analyzer
 * @status: current
 * @updated: 2025-12-15
 * @tags: [insights, analyzer, quality, tasks, commits]
 * @related: [../types.ts, ../data-collector.ts]
 * @priority: high
 * @complexity: medium
 * @dependencies: []
 */

import {
  InsightAnalyzer,
  InsightData,
  RawInsight,
  InsightEvidence,
} from '../types.js';

// ============================================================================
// Configuration
// ============================================================================

const THRESHOLDS = {
  // Task completion rate (percentage)
  taskCompletion: {
    excellent: 90,    // > 90% is excellent
    good: 70,         // > 70% is good
    warning: 50,      // < 50% is warning
  },
  // Commits per session
  commitsPerSession: {
    excellent: 5,     // > 5 is excellent
    good: 2,          // > 2 is good
    warning: 0,       // 0 is warning
  },
  // Average commit size (lines changed)
  commitSize: {
    optimal: { min: 20, max: 150 },  // 20-150 lines is optimal
    warning: { max: 500 },            // > 500 lines is warning
  },
  // Event logging rate (events per session)
  // Replaces handoff metric per PATTERN-001: Ephemeral Sessions
  // Context is preserved via defensive logging, not handoffs
  eventLoggingRate: {
    excellent: 5,     // > 5 events per session is excellent
    good: 2,          // > 2 is good
    warning: 1,       // < 1 is warning (silent sessions)
  },
};

// ============================================================================
// Collaboration Quality Analyzer
// ============================================================================

export class QualityAnalyzer implements InsightAnalyzer {
  category = 'quality' as const;

  async analyze(data: InsightData): Promise<RawInsight[]> {
    const insights: RawInsight[] = [];

    // Analyze each metric
    insights.push(...this.analyzeTaskCompletion(data));
    insights.push(...this.analyzeCommitFrequency(data));
    insights.push(...this.analyzeCommitSize(data));
    insights.push(...this.analyzeHandoffQuality(data));
    insights.push(...this.analyzeSprintVelocity(data));

    return insights;
  }

  // ===========================================================================
  // Task Completion Analysis
  // ===========================================================================

  private analyzeTaskCompletion(data: InsightData): RawInsight[] {
    const insights: RawInsight[] = [];

    if (data.tasks.total === 0) {
      insights.push({
        category: this.category,
        severity: 'info',
        title: 'No tasks tracked',
        description: 'Use sprint files to track task progress and get completion insights.',
        scoreImpact: 0,
        evidence: [],
        recommendations: ['Create docs/sprints/CURRENT-SPRINT.md with tasks'],
      });
      return insights;
    }

    const completionRate = data.tasks.completionRate;

    const evidence: InsightEvidence[] = data.tasks.completed.slice(0, 3).map(t => ({
      type: 'task' as const,
      id: t.id,
      description: `Completed: ${t.title}`,
    }));

    if (completionRate >= THRESHOLDS.taskCompletion.excellent) {
      insights.push({
        category: this.category,
        severity: 'info',
        title: 'Excellent task completion',
        description: `${Math.round(completionRate)}% task completion rate. You're executing consistently.`,
        metricName: 'task_completion_rate',
        metricValue: completionRate,
        metricTarget: THRESHOLDS.taskCompletion.excellent,
        metricUnit: '%',
        scoreImpact: 15,
        evidence,
        recommendations: [],
      });
    } else if (completionRate >= THRESHOLDS.taskCompletion.good) {
      insights.push({
        category: this.category,
        severity: 'info',
        title: 'Good task completion',
        description: `${Math.round(completionRate)}% task completion rate. Room for improvement.`,
        metricName: 'task_completion_rate',
        metricValue: completionRate,
        metricTarget: THRESHOLDS.taskCompletion.good,
        metricUnit: '%',
        scoreImpact: 5,
        evidence,
        recommendations: ['Break large tasks into smaller, completable chunks'],
      });
    } else if (completionRate < THRESHOLDS.taskCompletion.warning) {
      const inProgressCount = data.tasks.inProgress.length + data.tasks.abandoned.length;
      insights.push({
        category: this.category,
        severity: 'warning',
        title: 'Low task completion',
        description: `Only ${Math.round(completionRate)}% completion with ${inProgressCount} tasks stuck in progress.`,
        metricName: 'task_completion_rate',
        metricValue: completionRate,
        metricTarget: THRESHOLDS.taskCompletion.good,
        metricUnit: '%',
        scoreImpact: -20,
        evidence: data.tasks.inProgress.slice(0, 3).map(t => ({
          type: 'task' as const,
          id: t.id,
          description: `In progress ${t.daysInProgress} days: ${t.title}`,
        })),
        recommendations: [
          'Review in-progress tasks and identify blockers',
          'Break large tasks into smaller deliverables',
          'Consider pausing or descoping stuck tasks',
        ],
      });
    }

    return insights;
  }

  // ===========================================================================
  // Commit Frequency Analysis
  // ===========================================================================

  private analyzeCommitFrequency(data: InsightData): RawInsight[] {
    const insights: RawInsight[] = [];

    if (data.sessions.length === 0) return insights;

    const commitsPerSession = data.commits.length / data.sessions.length;

    const evidence: InsightEvidence[] = data.commits.slice(0, 3).map(c => ({
      type: 'commit' as const,
      id: c.hash,
      description: c.message.substring(0, 80),
      timestamp: c.timestamp,
    }));

    if (commitsPerSession >= THRESHOLDS.commitsPerSession.excellent) {
      insights.push({
        category: this.category,
        severity: 'info',
        title: 'Strong commit frequency',
        description: `${commitsPerSession.toFixed(1)} commits per session. Frequent commits improve traceability.`,
        metricName: 'commits_per_session',
        metricValue: commitsPerSession,
        metricTarget: THRESHOLDS.commitsPerSession.excellent,
        scoreImpact: 10,
        evidence,
        recommendations: [],
      });
    } else if (commitsPerSession >= THRESHOLDS.commitsPerSession.good) {
      insights.push({
        category: this.category,
        severity: 'info',
        title: 'Good commit frequency',
        description: `${commitsPerSession.toFixed(1)} commits per session.`,
        metricName: 'commits_per_session',
        metricValue: commitsPerSession,
        scoreImpact: 5,
        evidence,
        recommendations: ['Consider committing more frequently'],
      });
    } else if (commitsPerSession <= THRESHOLDS.commitsPerSession.warning) {
      insights.push({
        category: this.category,
        severity: 'suggestion',
        title: 'Low commit frequency',
        description: `${commitsPerSession.toFixed(1)} commits per session. More frequent commits improve recovery and review.`,
        metricName: 'commits_per_session',
        metricValue: commitsPerSession,
        metricTarget: THRESHOLDS.commitsPerSession.good,
        scoreImpact: -10,
        evidence: [],
        recommendations: [
          'Commit after completing each logical change',
          'Use atomic commits for better git history',
          'Commit before major refactors or experiments',
        ],
      });
    }

    return insights;
  }

  // ===========================================================================
  // Commit Size Analysis
  // ===========================================================================

  private analyzeCommitSize(data: InsightData): RawInsight[] {
    const insights: RawInsight[] = [];

    if (data.commits.length === 0) return insights;

    const avgSize = Math.round(
      data.commits.reduce((sum, c) => sum + c.linesAdded + c.linesRemoved, 0) /
      data.commits.length
    );

    const largeCommits = data.commits.filter(
      c => c.linesAdded + c.linesRemoved > THRESHOLDS.commitSize.warning.max
    );

    const evidence: InsightEvidence[] = largeCommits.slice(0, 3).map(c => ({
      type: 'commit' as const,
      id: c.hash,
      description: `${c.linesAdded + c.linesRemoved} lines changed: ${c.message.substring(0, 80)}${c.message.length > 80 ? '...' : ''}`,
      timestamp: c.timestamp,
    }));

    if (
      avgSize >= THRESHOLDS.commitSize.optimal.min &&
      avgSize <= THRESHOLDS.commitSize.optimal.max
    ) {
      insights.push({
        category: this.category,
        severity: 'info',
        title: 'Optimal commit size',
        description: `Average ${avgSize} lines per commit. This size is easy to review and revert.`,
        metricName: 'avg_commit_size',
        metricValue: avgSize,
        metricUnit: 'lines',
        scoreImpact: 10,
        evidence: [],
        recommendations: [],
      });
    } else if (largeCommits.length > 0) {
      insights.push({
        category: this.category,
        severity: 'suggestion',
        title: 'Large commits detected',
        description: `${largeCommits.length} commits exceed 500 lines. Smaller commits are easier to review.`,
        metricName: 'large_commit_count',
        metricValue: largeCommits.length,
        scoreImpact: -5,
        evidence,
        recommendations: [
          'Break large changes into logical commits',
          'Commit refactors separately from features',
          'Use git add -p for partial staging',
        ],
      });
    }

    return insights;
  }

  // ===========================================================================
  // Event Logging Quality Analysis (PATTERN-001: Ephemeral Sessions)
  // ===========================================================================

  /**
   * Analyzes event logging rate instead of handoff rate.
   *
   * Per PATTERN-001: Sessions are ephemeral with 2-3 day validity.
   * Context is preserved via defensive logging (events), not handoffs.
   * Handoffs are optional - what matters is continuous event capture.
   */
  private analyzeHandoffQuality(data: InsightData): RawInsight[] {
    const insights: RawInsight[] = [];

    if (data.sessions.length === 0) return insights;

    // Calculate events per session (defensive logging metric)
    const eventsPerSession = data.events.length / data.sessions.length;

    // Find sessions with good logging
    const wellLoggedSessions = data.sessions.filter(s => s.eventCount >= 2);
    const loggingRate = Math.round(
      (wellLoggedSessions.length / data.sessions.length) * 100
    );

    const evidence: InsightEvidence[] = wellLoggedSessions.slice(0, 3).map(s => ({
      type: 'session' as const,
      id: s.id,
      description: `${s.eventCount} events logged (${s.hasHandoff ? 'with' : 'no'} handoff)`,
      timestamp: s.startedAt,
    }));

    if (eventsPerSession >= THRESHOLDS.eventLoggingRate.excellent) {
      insights.push({
        category: this.category,
        severity: 'info',
        title: 'Strong defensive logging',
        description: `${eventsPerSession.toFixed(1)} events per session. Context is well-captured.`,
        metricName: 'events_per_session',
        metricValue: eventsPerSession,
        metricTarget: THRESHOLDS.eventLoggingRate.excellent,
        scoreImpact: 10,
        evidence,
        recommendations: [],
      });
    } else if (eventsPerSession >= THRESHOLDS.eventLoggingRate.good) {
      insights.push({
        category: this.category,
        severity: 'info',
        title: 'Good event logging',
        description: `${eventsPerSession.toFixed(1)} events per session. Consider logging more insights.`,
        metricName: 'events_per_session',
        metricValue: eventsPerSession,
        metricTarget: THRESHOLDS.eventLoggingRate.good,
        scoreImpact: 5,
        evidence,
        recommendations: ['Log decisions and gotchas, not just completions'],
      });
    } else if (eventsPerSession < THRESHOLDS.eventLoggingRate.warning) {
      // Note: This differs from "Silent sessions detected" in anti-patterns:
      // - Silent sessions = count of sessions with ZERO events (total context loss)
      // - Low event logging = overall events/session ratio (insufficient logging)
      const lowEventSessions = data.sessions.filter(s => s.eventCount < 2);
      insights.push({
        category: this.category,
        severity: 'suggestion',
        title: 'Low event logging',
        description: `${eventsPerSession.toFixed(1)} events per session on average. This differs from silent sessions (zero events) - here sessions have some events but not enough for good context preservation.`,
        metricName: 'events_per_session',
        metricValue: eventsPerSession,
        metricTarget: THRESHOLDS.eventLoggingRate.good,
        scoreImpact: -10,
        evidence: lowEventSessions.slice(0, 3).map(s => ({
          type: 'session' as const,
          id: s.id,
          description: `Session with ${s.eventCount} event${s.eventCount === 1 ? '' : 's'} (target: 2+)`,
          timestamp: s.startedAt,
        })),
        recommendations: [
          'Use `ginko log` after fixes, features, and decisions',
          'Log insights while context is fresh (low pressure)',
          'Aim for 3-5 events per session for good continuity',
        ],
      });
    }

    return insights;
  }

  // ===========================================================================
  // Sprint Velocity Analysis
  // ===========================================================================

  private analyzeSprintVelocity(data: InsightData): RawInsight[] {
    const insights: RawInsight[] = [];

    // Calculate events per day as a velocity proxy
    const eventsPerDay = data.events.length / data.period.days;

    if (eventsPerDay >= 5) {
      insights.push({
        category: this.category,
        severity: 'info',
        title: 'High activity level',
        description: `${eventsPerDay.toFixed(1)} logged events per day. Strong engagement with the project.`,
        metricName: 'events_per_day',
        metricValue: eventsPerDay,
        scoreImpact: 5,
        evidence: [],
        recommendations: [],
      });
    } else if (eventsPerDay < 1) {
      insights.push({
        category: this.category,
        severity: 'suggestion',
        title: 'Low activity logged',
        description: `${eventsPerDay.toFixed(1)} events per day. Consider logging more insights.`,
        metricName: 'events_per_day',
        metricValue: eventsPerDay,
        scoreImpact: -5,
        evidence: [],
        recommendations: [
          'Use `ginko log` after completing features or fixes',
          'Log decisions and insights, not just code changes',
          'Capture gotchas and patterns as you discover them',
        ],
      });
    }

    return insights;
  }
}

export default QualityAnalyzer;
