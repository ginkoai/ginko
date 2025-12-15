/**
 * @fileType: analyzer
 * @status: current
 * @updated: 2025-12-15
 * @tags: [insights, analyzer, anti-patterns, detection]
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
  TaskInfo,
  SessionData,
} from '../types';

// ============================================================================
// Configuration
// ============================================================================

const THRESHOLDS = {
  // Abandoned task detection (days in progress)
  abandonedTask: {
    warning: 5,       // > 5 days without completion
    critical: 10,     // > 10 days
  },
  // Context loss detection (sessions without handoff)
  contextLoss: {
    warning: 2,       // > 2 sessions without handoff
    critical: 5,      // > 5 sessions
  },
  // Long silent session (hours without events)
  silentSession: {
    warning: 2,       // > 2 hours
    critical: 4,      // > 4 hours
  },
  // Repeated gotcha encounters
  repeatedGotcha: {
    warning: 2,       // > 2 encounters of same gotcha
    critical: 4,      // > 4 encounters
  },
};

// ============================================================================
// Anti-Pattern Detector
// ============================================================================

export class AntiPatternDetector implements InsightAnalyzer {
  category = 'anti-patterns' as const;

  async analyze(data: InsightData): Promise<RawInsight[]> {
    const insights: RawInsight[] = [];

    // Detect each anti-pattern
    insights.push(...this.detectAbandonedTasks(data));
    insights.push(...this.detectContextLoss(data));
    insights.push(...this.detectLongSilentSessions(data));
    insights.push(...this.detectRepeatedGotchas(data));
    insights.push(...this.detectScopeCreep(data));

    // If no anti-patterns found, add positive insight
    if (insights.length === 0) {
      insights.push({
        category: this.category,
        severity: 'info',
        title: 'No anti-patterns detected',
        description: 'Your workflow is clean. No concerning patterns found.',
        scoreImpact: 10,
        evidence: [],
        recommendations: [],
      });
    }

    return insights;
  }

  // ===========================================================================
  // Abandoned Tasks Detection
  // ===========================================================================

  private detectAbandonedTasks(data: InsightData): RawInsight[] {
    const insights: RawInsight[] = [];

    const abandonedTasks = data.tasks.abandoned;
    const stuckTasks = data.tasks.inProgress.filter(
      t => t.daysInProgress > THRESHOLDS.abandonedTask.warning
    );

    const allProblematicTasks = [...abandonedTasks, ...stuckTasks];

    if (allProblematicTasks.length === 0) return insights;

    const criticalTasks = allProblematicTasks.filter(
      t => t.daysInProgress >= THRESHOLDS.abandonedTask.critical
    );

    const evidence: InsightEvidence[] = allProblematicTasks.slice(0, 5).map(t => ({
      type: 'task' as const,
      id: t.id,
      description: `${t.title} - ${t.daysInProgress} days in progress`,
    }));

    if (criticalTasks.length > 0) {
      insights.push({
        category: this.category,
        severity: 'critical',
        title: 'Critical: Stuck tasks',
        description: `${criticalTasks.length} tasks stuck for 10+ days. These may need to be descoped or unblocked.`,
        metricName: 'stuck_task_count',
        metricValue: criticalTasks.length,
        scoreImpact: -25,
        evidence: evidence.slice(0, 3),
        recommendations: [
          'Review blockers for each stuck task',
          'Consider breaking into smaller tasks',
          'Descope if task is no longer relevant',
          'Mark as paused if blocked externally',
        ],
      });
    } else if (allProblematicTasks.length > 0) {
      insights.push({
        category: this.category,
        severity: 'warning',
        title: 'Tasks in progress too long',
        description: `${allProblematicTasks.length} tasks have been in progress for 5+ days.`,
        metricName: 'stuck_task_count',
        metricValue: allProblematicTasks.length,
        scoreImpact: -15,
        evidence,
        recommendations: [
          'Review task scope and break down if too large',
          'Check for blockers or missing information',
          'Update status if task is actually paused',
        ],
      });
    }

    return insights;
  }

  // ===========================================================================
  // Context Loss Detection
  // ===========================================================================

  private detectContextLoss(data: InsightData): RawInsight[] {
    const insights: RawInsight[] = [];

    const sessionsWithoutHandoff = data.sessions.filter(s => !s.hasHandoff);
    const count = sessionsWithoutHandoff.length;

    if (count === 0) return insights;

    const evidence: InsightEvidence[] = sessionsWithoutHandoff.slice(0, 5).map(s => ({
      type: 'session' as const,
      id: s.id,
      description: `Session ended without handoff (${s.eventCount} events)`,
      timestamp: s.startedAt,
    }));

    if (count >= THRESHOLDS.contextLoss.critical) {
      insights.push({
        category: this.category,
        severity: 'warning',
        title: 'Frequent context loss',
        description: `${count} sessions ended without handoff. Significant context may be lost.`,
        metricName: 'sessions_without_handoff',
        metricValue: count,
        scoreImpact: -20,
        evidence,
        recommendations: [
          'Make `ginko handoff` a habit before ending sessions',
          'Review your end-of-session routine',
          'Consider shorter sessions with regular handoffs',
        ],
      });
    } else if (count >= THRESHOLDS.contextLoss.warning) {
      insights.push({
        category: this.category,
        severity: 'suggestion',
        title: 'Missing handoffs',
        description: `${count} sessions ended without handoff. Some context may be lost.`,
        metricName: 'sessions_without_handoff',
        metricValue: count,
        scoreImpact: -10,
        evidence,
        recommendations: [
          'Run `ginko handoff` before ending sessions',
          'Set a reminder for end-of-day handoffs',
        ],
      });
    }

    return insights;
  }

  // ===========================================================================
  // Long Silent Sessions Detection
  // ===========================================================================

  private detectLongSilentSessions(data: InsightData): RawInsight[] {
    const insights: RawInsight[] = [];

    // Sessions with long duration but few events
    const silentSessions = data.sessions.filter(s => {
      const eventsPerHour = s.eventCount / (s.durationMinutes / 60);
      return s.durationMinutes > 120 && eventsPerHour < 1;
    });

    if (silentSessions.length === 0) return insights;

    const evidence: InsightEvidence[] = silentSessions.slice(0, 3).map(s => ({
      type: 'session' as const,
      id: s.id,
      description: `${Math.round(s.durationMinutes / 60)}h session with ${s.eventCount} events`,
      timestamp: s.startedAt,
    }));

    insights.push({
      category: this.category,
      severity: 'suggestion',
      title: 'Long sessions without logging',
      description: `${silentSessions.length} sessions over 2 hours with minimal logging. Insights may be lost.`,
      metricName: 'silent_session_count',
      metricValue: silentSessions.length,
      scoreImpact: -5,
      evidence,
      recommendations: [
        'Use `ginko log` periodically during long sessions',
        'Log decisions and insights as you work',
        'Break into multiple focused sessions',
      ],
    });

    return insights;
  }

  // ===========================================================================
  // Repeated Gotchas Detection
  // ===========================================================================

  private detectRepeatedGotchas(data: InsightData): RawInsight[] {
    const insights: RawInsight[] = [];

    const repeatedGotchas = data.gotchas.filter(
      g => g.encounters >= THRESHOLDS.repeatedGotcha.warning
    );

    if (repeatedGotchas.length === 0) return insights;

    const criticalRepeats = repeatedGotchas.filter(
      g => g.encounters >= THRESHOLDS.repeatedGotcha.critical
    );

    const evidence: InsightEvidence[] = repeatedGotchas.map(g => ({
      type: 'gotcha' as const,
      id: g.id,
      description: `${g.title} - encountered ${g.encounters} times`,
    }));

    if (criticalRepeats.length > 0) {
      insights.push({
        category: this.category,
        severity: 'critical',
        title: 'Critical: Gotchas not being avoided',
        description: `${criticalRepeats.length} gotchas encountered 4+ times. Prevention isn't working.`,
        metricName: 'critical_repeat_gotchas',
        metricValue: criticalRepeats.length,
        scoreImpact: -25,
        evidence: evidence.slice(0, 3),
        recommendations: [
          'Review gotcha documentation for clearer prevention steps',
          'Add automated checks or linting rules',
          'Consider refactoring to eliminate the gotcha source',
        ],
      });
    } else {
      insights.push({
        category: this.category,
        severity: 'warning',
        title: 'Repeated gotcha encounters',
        description: `${repeatedGotchas.length} gotchas encountered multiple times.`,
        metricName: 'repeat_gotcha_count',
        metricValue: repeatedGotchas.length,
        scoreImpact: -10,
        evidence,
        recommendations: [
          'Review gotcha docs before starting related work',
          'Update gotcha descriptions with better prevention',
          'Consider adding pre-commit checks',
        ],
      });
    }

    return insights;
  }

  // ===========================================================================
  // Scope Creep Detection
  // ===========================================================================

  private detectScopeCreep(data: InsightData): RawInsight[] {
    const insights: RawInsight[] = [];

    // Detect tasks added mid-sprint (tasks without IDs following naming convention)
    // This is a heuristic - actual detection would need more context
    const adhocTasks = data.tasks.inProgress.filter(
      t => t.id.includes('adhoc') || !t.id.match(/e\d+_s\d+_t\d+/)
    );

    if (adhocTasks.length === 0) return insights;

    // Only flag if significant
    const adhocRatio = adhocTasks.length / data.tasks.total;
    if (adhocRatio < 0.2) return insights;

    const evidence: InsightEvidence[] = adhocTasks.slice(0, 3).map(t => ({
      type: 'task' as const,
      id: t.id,
      description: `Ad-hoc: ${t.title}`,
    }));

    insights.push({
      category: this.category,
      severity: 'suggestion',
      title: 'Scope creep detected',
      description: `${adhocTasks.length} ad-hoc tasks added (${Math.round(adhocRatio * 100)}% of total). Sprint scope may be growing.`,
      metricName: 'adhoc_task_ratio',
      metricValue: Math.round(adhocRatio * 100),
      metricUnit: '%',
      scoreImpact: -5,
      evidence,
      recommendations: [
        'Review if ad-hoc work should be in sprint scope',
        'Consider deferring non-critical items',
        'Track ad-hoc work separately for visibility',
      ],
    });

    return insights;
  }
}

export default AntiPatternDetector;
