/**
 * @fileType: analyzer
 * @status: current
 * @updated: 2025-12-15
 * @tags: [insights, analyzer, efficiency, sessions]
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
  SessionData,
} from '../types';

// ============================================================================
// Configuration
// ============================================================================

const THRESHOLDS = {
  // Time-to-flow (seconds from session start to first event)
  timeToFlow: {
    excellent: 60,    // < 60s is excellent
    good: 120,        // < 120s is good
    warning: 300,     // > 300s is warning
  },
  // Context load time (milliseconds)
  contextLoadTime: {
    excellent: 3000,  // < 3s is excellent
    good: 5000,       // < 5s is good
    warning: 10000,   // > 10s is warning
  },
  // Session duration (minutes)
  sessionDuration: {
    optimal: { min: 60, max: 240 },  // 1-4 hours is optimal
    warning: { max: 360 },           // > 6 hours is warning
  },
  // Cold start ratio (percentage)
  coldStartRatio: {
    good: 30,         // < 30% cold starts is good
    warning: 60,      // > 60% cold starts is warning
  },
};

// ============================================================================
// Efficiency Analyzer
// ============================================================================

export class EfficiencyAnalyzer implements InsightAnalyzer {
  category = 'efficiency' as const;

  async analyze(data: InsightData): Promise<RawInsight[]> {
    const insights: RawInsight[] = [];

    // Skip if no sessions
    if (data.sessions.length === 0) {
      insights.push({
        category: this.category,
        severity: 'info',
        title: 'No session data available',
        description: 'Start using `ginko start` to track your sessions and get efficiency insights.',
        scoreImpact: 0,
        evidence: [],
        recommendations: ['Run `ginko start` at the beginning of each work session'],
      });
      return insights;
    }

    // Analyze each metric
    insights.push(...this.analyzeTimeToFlow(data));
    insights.push(...this.analyzeContextLoadTime(data));
    insights.push(...this.analyzeSessionDuration(data));
    insights.push(...this.analyzeColdStartRatio(data));

    return insights;
  }

  // ===========================================================================
  // Time-to-Flow Analysis
  // ===========================================================================

  private analyzeTimeToFlow(data: InsightData): RawInsight[] {
    const insights: RawInsight[] = [];

    // Calculate average time-to-flow from session start to first event
    const sessionsWithEvents = data.sessions.filter(s => s.eventCount > 0);
    if (sessionsWithEvents.length === 0) return insights;

    // Estimate time-to-flow based on session data
    // In reality, this would use actual timestamps from events
    const avgTimeToFlow = this.estimateAverageTimeToFlow(sessionsWithEvents);

    const evidence: InsightEvidence[] = sessionsWithEvents.slice(0, 3).map(s => ({
      type: 'session' as const,
      id: s.id,
      description: `Session with ${s.eventCount} events, ${s.flowState} start`,
      timestamp: s.startedAt,
    }));

    if (avgTimeToFlow < THRESHOLDS.timeToFlow.excellent) {
      insights.push({
        category: this.category,
        severity: 'info',
        title: 'Excellent time-to-flow',
        description: `Average ${avgTimeToFlow}s to first productive action. You're getting into flow quickly.`,
        metricName: 'time_to_flow',
        metricValue: avgTimeToFlow,
        metricTarget: THRESHOLDS.timeToFlow.excellent,
        metricUnit: 'seconds',
        scoreImpact: 15,
        evidence,
        recommendations: [],
      });
    } else if (avgTimeToFlow < THRESHOLDS.timeToFlow.good) {
      insights.push({
        category: this.category,
        severity: 'info',
        title: 'Good time-to-flow',
        description: `Average ${avgTimeToFlow}s to first productive action.`,
        metricName: 'time_to_flow',
        metricValue: avgTimeToFlow,
        metricTarget: THRESHOLDS.timeToFlow.good,
        metricUnit: 'seconds',
        scoreImpact: 5,
        evidence,
        recommendations: ['Use `ginko handoff` to reduce context rebuild time'],
      });
    } else {
      insights.push({
        category: this.category,
        severity: 'suggestion',
        title: 'Slow time-to-flow',
        description: `Average ${avgTimeToFlow}s to first productive action. Consider improving session handoffs.`,
        metricName: 'time_to_flow',
        metricValue: avgTimeToFlow,
        metricTarget: THRESHOLDS.timeToFlow.good,
        metricUnit: 'seconds',
        scoreImpact: -10,
        evidence,
        recommendations: [
          'Use `ginko handoff` before ending sessions',
          'Review your CLAUDE.md for faster context loading',
          'Archive old events with `ginko archive`',
        ],
      });
    }

    return insights;
  }

  // ===========================================================================
  // Context Load Time Analysis
  // ===========================================================================

  private analyzeContextLoadTime(data: InsightData): RawInsight[] {
    const insights: RawInsight[] = [];

    const sessionsWithLoadTime = data.sessions.filter(s => s.contextLoadTimeMs);
    if (sessionsWithLoadTime.length === 0) return insights;

    const avgLoadTime = Math.round(
      sessionsWithLoadTime.reduce((sum, s) => sum + (s.contextLoadTimeMs || 0), 0) /
      sessionsWithLoadTime.length
    );

    const evidence: InsightEvidence[] = sessionsWithLoadTime.slice(0, 3).map(s => ({
      type: 'session' as const,
      id: s.id,
      description: `Context loaded in ${s.contextLoadTimeMs}ms`,
      timestamp: s.startedAt,
    }));

    if (avgLoadTime < THRESHOLDS.contextLoadTime.excellent) {
      insights.push({
        category: this.category,
        severity: 'info',
        title: 'Fast context loading',
        description: `Average ${avgLoadTime}ms context load time. Event-based loading is working well.`,
        metricName: 'context_load_time',
        metricValue: avgLoadTime,
        metricTarget: THRESHOLDS.contextLoadTime.excellent,
        metricUnit: 'ms',
        scoreImpact: 10,
        evidence,
        recommendations: [],
      });
    } else if (avgLoadTime > THRESHOLDS.contextLoadTime.warning) {
      insights.push({
        category: this.category,
        severity: 'warning',
        title: 'Slow context loading',
        description: `Average ${avgLoadTime}ms context load time. Consider archiving old events.`,
        metricName: 'context_load_time',
        metricValue: avgLoadTime,
        metricTarget: THRESHOLDS.contextLoadTime.good,
        metricUnit: 'ms',
        scoreImpact: -15,
        evidence,
        recommendations: [
          'Run `ginko archive` to move old events',
          'Check network connectivity to graph API',
          'Review event stream size',
        ],
      });
    }

    return insights;
  }

  // ===========================================================================
  // Session Duration Analysis
  // ===========================================================================

  private analyzeSessionDuration(data: InsightData): RawInsight[] {
    const insights: RawInsight[] = [];

    const durations = data.sessions.map(s => s.durationMinutes);
    const avgDuration = Math.round(durations.reduce((a, b) => a + b, 0) / durations.length);

    const longSessions = data.sessions.filter(
      s => s.durationMinutes > THRESHOLDS.sessionDuration.warning.max
    );

    const evidence: InsightEvidence[] = longSessions.slice(0, 3).map(s => ({
      type: 'session' as const,
      id: s.id,
      description: `${Math.round(s.durationMinutes / 60)}h session`,
      timestamp: s.startedAt,
    }));

    if (longSessions.length > 0) {
      insights.push({
        category: this.category,
        severity: 'suggestion',
        title: 'Long sessions detected',
        description: `${longSessions.length} sessions exceeded 6 hours. Long sessions may reduce productivity.`,
        metricName: 'avg_session_duration',
        metricValue: avgDuration,
        metricTarget: THRESHOLDS.sessionDuration.optimal.max,
        metricUnit: 'minutes',
        scoreImpact: -5,
        evidence,
        recommendations: [
          'Consider taking breaks every 2-3 hours',
          'Use `ginko handoff` to save progress and start fresh',
          'Break large tasks into smaller chunks',
        ],
      });
    } else if (
      avgDuration >= THRESHOLDS.sessionDuration.optimal.min &&
      avgDuration <= THRESHOLDS.sessionDuration.optimal.max
    ) {
      insights.push({
        category: this.category,
        severity: 'info',
        title: 'Healthy session duration',
        description: `Average ${Math.round(avgDuration / 60)}h sessions. This is in the optimal range for focused work.`,
        metricName: 'avg_session_duration',
        metricValue: avgDuration,
        metricUnit: 'minutes',
        scoreImpact: 5,
        evidence: [],
        recommendations: [],
      });
    }

    return insights;
  }

  // ===========================================================================
  // Cold Start Analysis
  // ===========================================================================

  private analyzeColdStartRatio(data: InsightData): RawInsight[] {
    const insights: RawInsight[] = [];

    const coldStarts = data.sessions.filter(s => s.flowState === 'cold').length;
    const totalSessions = data.sessions.length;
    const coldRatio = Math.round((coldStarts / totalSessions) * 100);

    const evidence: InsightEvidence[] = data.sessions
      .filter(s => s.flowState === 'cold')
      .slice(0, 3)
      .map(s => ({
        type: 'session' as const,
        id: s.id,
        description: 'Cold start session',
        timestamp: s.startedAt,
      }));

    if (coldRatio < THRESHOLDS.coldStartRatio.good) {
      insights.push({
        category: this.category,
        severity: 'info',
        title: 'Good session continuity',
        description: `Only ${coldRatio}% cold starts. Your handoffs are preserving context effectively.`,
        metricName: 'cold_start_ratio',
        metricValue: coldRatio,
        metricTarget: THRESHOLDS.coldStartRatio.good,
        metricUnit: '%',
        scoreImpact: 10,
        evidence: [],
        recommendations: [],
      });
    } else if (coldRatio > THRESHOLDS.coldStartRatio.warning) {
      insights.push({
        category: this.category,
        severity: 'warning',
        title: 'High cold start ratio',
        description: `${coldRatio}% of sessions are cold starts. Context is being lost between sessions.`,
        metricName: 'cold_start_ratio',
        metricValue: coldRatio,
        metricTarget: THRESHOLDS.coldStartRatio.good,
        metricUnit: '%',
        scoreImpact: -15,
        evidence,
        recommendations: [
          'Always run `ginko handoff` before ending a session',
          'Review session logs for completeness',
          'Consider shorter, more focused sessions',
        ],
      });
    }

    return insights;
  }

  // ===========================================================================
  // Helper Methods
  // ===========================================================================

  private estimateAverageTimeToFlow(sessions: SessionData[]): number {
    // Estimate based on flow state
    // Hot/warm starts are faster than cold starts
    let totalSeconds = 0;
    for (const session of sessions) {
      if (session.flowState === 'hot') {
        totalSeconds += 30;
      } else if (session.flowState === 'warm') {
        totalSeconds += 60;
      } else {
        totalSeconds += 120;
      }
    }
    return Math.round(totalSeconds / sessions.length);
  }
}

export default EfficiencyAnalyzer;
