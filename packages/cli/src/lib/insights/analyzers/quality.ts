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
} from '../types';

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
  // Handoff completeness (word count proxy)
  handoffCompleteness: {
    excellent: 300,   // > 300 words is excellent
    good: 150,        // > 150 words is good
    warning: 50,      // < 50 words is warning
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
      description: c.message.substring(0, 60),
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
      description: `${c.linesAdded + c.linesRemoved} lines: ${c.message.substring(0, 40)}`,
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
  // Handoff Quality Analysis
  // ===========================================================================

  private analyzeHandoffQuality(data: InsightData): RawInsight[] {
    const insights: RawInsight[] = [];

    const sessionsWithHandoff = data.sessions.filter(s => s.hasHandoff);
    const handoffRate = Math.round(
      (sessionsWithHandoff.length / data.sessions.length) * 100
    );

    const evidence: InsightEvidence[] = sessionsWithHandoff.slice(0, 3).map(s => ({
      type: 'session' as const,
      id: s.id,
      description: 'Session with handoff',
      timestamp: s.startedAt,
    }));

    if (handoffRate >= 80) {
      insights.push({
        category: this.category,
        severity: 'info',
        title: 'Consistent handoffs',
        description: `${handoffRate}% of sessions include handoffs. Context is being preserved.`,
        metricName: 'handoff_rate',
        metricValue: handoffRate,
        metricTarget: 80,
        metricUnit: '%',
        scoreImpact: 10,
        evidence,
        recommendations: [],
      });
    } else if (handoffRate < 50) {
      insights.push({
        category: this.category,
        severity: 'warning',
        title: 'Missing handoffs',
        description: `Only ${handoffRate}% of sessions have handoffs. Context is being lost.`,
        metricName: 'handoff_rate',
        metricValue: handoffRate,
        metricTarget: 70,
        metricUnit: '%',
        scoreImpact: -15,
        evidence: data.sessions.filter(s => !s.hasHandoff).slice(0, 3).map(s => ({
          type: 'session' as const,
          id: s.id,
          description: 'Session ended without handoff',
          timestamp: s.startedAt,
        })),
        recommendations: [
          'Always run `ginko handoff` before ending a session',
          'Set a reminder or hook to prompt for handoff',
          'Make handoff part of your end-of-session routine',
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
