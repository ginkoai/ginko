/**
 * @fileType: analyzer
 * @status: current
 * @updated: 2025-12-15
 * @tags: [insights, analyzer, patterns, adr, adoption]
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
  // ADR reference rate (percentage of events mentioning ADRs)
  adrReferenceRate: {
    excellent: 15,    // > 15% is excellent
    good: 5,          // > 5% is good
    warning: 2,       // < 2% is warning
  },
  // Pattern usage count
  patternUsage: {
    excellent: 5,     // > 5 patterns is excellent
    good: 2,          // > 2 patterns is good
  },
  // Gotcha avoidance rate
  gotchaAvoidance: {
    excellent: 90,    // > 90% avoided is excellent
    good: 70,         // > 70% is good
    warning: 50,      // < 50% is warning
  },
  // New patterns discovered
  newPatterns: {
    excellent: 2,     // > 2 new patterns is excellent
    good: 1,          // > 1 is good
  },
};

// ============================================================================
// Pattern Adoption Analyzer
// ============================================================================

export class PatternAnalyzer implements InsightAnalyzer {
  category = 'patterns' as const;

  async analyze(data: InsightData): Promise<RawInsight[]> {
    const insights: RawInsight[] = [];

    // Skip if no events
    if (data.events.length === 0) {
      insights.push({
        category: this.category,
        severity: 'info',
        title: 'No event data available',
        description: 'Start logging events with `ginko log` to track pattern adoption.',
        scoreImpact: 0,
        evidence: [],
        recommendations: ['Use `ginko log` to capture decisions and insights'],
      });
      return insights;
    }

    // Analyze each metric
    insights.push(...this.analyzeADRAdoption(data));
    insights.push(...this.analyzePatternUsage(data));
    insights.push(...this.analyzeGotchaAvoidance(data));
    insights.push(...this.analyzeNewPatterns(data));

    return insights;
  }

  // ===========================================================================
  // ADR Adoption Analysis
  // ===========================================================================

  private analyzeADRAdoption(data: InsightData): RawInsight[] {
    const insights: RawInsight[] = [];

    // Count ADR references in events
    const eventsWithADR = data.events.filter(e => e.adrRefs.length > 0);
    const adrRate = Math.round((eventsWithADR.length / data.events.length) * 100);

    // Collect unique ADRs referenced
    const uniqueADRs = new Set<string>();
    for (const event of data.events) {
      for (const adr of event.adrRefs) {
        uniqueADRs.add(adr);
      }
    }

    // Also check commits
    const commitsWithADR = data.commits.filter(c => c.adrRefs.length > 0);
    for (const commit of data.commits) {
      for (const adr of commit.adrRefs) {
        uniqueADRs.add(adr);
      }
    }

    const evidence: InsightEvidence[] = eventsWithADR.slice(0, 3).map(e => ({
      type: 'event' as const,
      id: e.id,
      description: `Referenced ${e.adrRefs.join(', ')}: ${e.description.substring(0, 60)}`,
      timestamp: e.timestamp,
    }));

    if (adrRate >= THRESHOLDS.adrReferenceRate.excellent) {
      insights.push({
        category: this.category,
        severity: 'info',
        title: 'Excellent ADR adoption',
        description: `${uniqueADRs.size} ADRs referenced across ${eventsWithADR.length} events (${adrRate}%). Strong architectural alignment.`,
        metricName: 'adr_reference_rate',
        metricValue: adrRate,
        metricTarget: THRESHOLDS.adrReferenceRate.excellent,
        metricUnit: '%',
        scoreImpact: 15,
        evidence,
        recommendations: [
          'ADR references connect daily work to architectural principles',
        ],
      });
    } else if (adrRate >= THRESHOLDS.adrReferenceRate.good) {
      insights.push({
        category: this.category,
        severity: 'info',
        title: 'Good ADR awareness',
        description: `${uniqueADRs.size} ADRs referenced (${adrRate}% of events). Consider referencing ADRs more consistently.`,
        metricName: 'adr_reference_rate',
        metricValue: adrRate,
        metricTarget: THRESHOLDS.adrReferenceRate.good,
        metricUnit: '%',
        scoreImpact: 5,
        evidence,
        recommendations: [
          'Reference relevant ADR decisions in commit messages and logs',
          'Use `ginko log` with ADR references for architectural alignment',
        ],
      });
    } else if (adrRate < THRESHOLDS.adrReferenceRate.warning) {
      insights.push({
        category: this.category,
        severity: 'suggestion',
        title: 'Low ADR reference rate',
        description: `Only ${adrRate}% of events reference ADRs. Architectural decisions may be disconnected from work.`,
        metricName: 'adr_reference_rate',
        metricValue: adrRate,
        metricTarget: THRESHOLDS.adrReferenceRate.good,
        metricUnit: '%',
        scoreImpact: -10,
        evidence: [],
        recommendations: [
          'Review ADRs before starting new features',
          'Reference ADRs in `ginko log` entries',
          'Add ADR references to commit messages',
        ],
      });
    }

    return insights;
  }

  // ===========================================================================
  // Pattern Usage Analysis
  // ===========================================================================

  private analyzePatternUsage(data: InsightData): RawInsight[] {
    const insights: RawInsight[] = [];

    // Count pattern references in events
    const patternsUsed = new Set<string>();
    for (const event of data.events) {
      for (const pattern of event.patternRefs) {
        patternsUsed.add(pattern);
      }
    }

    // Add patterns from patterns list
    const highConfidencePatterns = data.patterns.filter(p => p.confidence === 'high');

    const patternCount = Math.max(patternsUsed.size, highConfidencePatterns.length);

    const evidence: InsightEvidence[] = data.patterns.slice(0, 3).map(p => ({
      type: 'pattern' as const,
      id: p.id,
      description: `${p.name} (${p.confidence} confidence)`,
    }));

    if (patternCount >= THRESHOLDS.patternUsage.excellent) {
      insights.push({
        category: this.category,
        severity: 'info',
        title: 'Strong pattern library',
        description: `${patternCount} patterns documented and used. Your codebase has well-established practices.`,
        metricName: 'patterns_used',
        metricValue: patternCount,
        metricTarget: THRESHOLDS.patternUsage.excellent,
        scoreImpact: 10,
        evidence,
        recommendations: [
          'Pattern documentation enables knowledge transfer between AI sessions',
        ],
      });
    } else if (patternCount >= THRESHOLDS.patternUsage.good) {
      insights.push({
        category: this.category,
        severity: 'info',
        title: 'Growing pattern library',
        description: `${patternCount} patterns in use. Consider documenting more recurring solutions.`,
        metricName: 'patterns_used',
        metricValue: patternCount,
        metricTarget: THRESHOLDS.patternUsage.good,
        scoreImpact: 5,
        evidence,
        recommendations: [
          'Document recurring solutions as patterns in docs/patterns/',
          'Pattern documentation enables knowledge transfer between sessions',
        ],
      });
    } else {
      insights.push({
        category: this.category,
        severity: 'suggestion',
        title: 'Few patterns documented',
        description: `Only ${patternCount} patterns found. Capturing patterns prevents reinventing solutions.`,
        metricName: 'patterns_used',
        metricValue: patternCount,
        metricTarget: THRESHOLDS.patternUsage.good,
        scoreImpact: -5,
        evidence: [],
        recommendations: [
          'When you solve a problem well, document it as a pattern',
          'Review events for recurring solutions worth documenting',
          'Add docs/patterns/*.md files for common approaches',
        ],
      });
    }

    return insights;
  }

  // ===========================================================================
  // Gotcha Avoidance Analysis
  // ===========================================================================

  private analyzeGotchaAvoidance(data: InsightData): RawInsight[] {
    const insights: RawInsight[] = [];

    // Calculate gotcha resolution rate
    const gotchasWithEncounters = data.gotchas.filter(g => g.encounters > 0);
    if (gotchasWithEncounters.length === 0) {
      // No gotchas encountered - good or no data
      if (data.gotchas.length > 0) {
        insights.push({
          category: this.category,
          severity: 'info',
          title: 'Clean gotcha record',
          description: `${data.gotchas.length} gotchas documented, none encountered this period. Great avoidance!`,
          scoreImpact: 10,
          evidence: [],
          recommendations: [],
        });
      }
      return insights;
    }

    const totalEncounters = gotchasWithEncounters.reduce((sum, g) => sum + g.encounters, 0);
    const totalResolutions = gotchasWithEncounters.reduce((sum, g) => sum + g.resolutions, 0);
    const avoidanceRate = Math.round(
      ((totalResolutions) / totalEncounters) * 100
    );

    const evidence: InsightEvidence[] = gotchasWithEncounters.slice(0, 3).map(g => ({
      type: 'gotcha' as const,
      id: g.id,
      description: `${g.title} - ${g.encounters} encounters, ${g.resolutions} resolved`,
    }));

    if (avoidanceRate >= THRESHOLDS.gotchaAvoidance.excellent) {
      insights.push({
        category: this.category,
        severity: 'info',
        title: 'Excellent gotcha handling',
        description: `${avoidanceRate}% of encountered gotchas resolved. You're learning from past issues.`,
        metricName: 'gotcha_resolution_rate',
        metricValue: avoidanceRate,
        metricTarget: THRESHOLDS.gotchaAvoidance.excellent,
        metricUnit: '%',
        scoreImpact: 10,
        evidence,
        recommendations: [],
      });
    } else if (avoidanceRate < THRESHOLDS.gotchaAvoidance.warning) {
      insights.push({
        category: this.category,
        severity: 'warning',
        title: 'Repeated gotcha encounters',
        description: `Only ${avoidanceRate}% of gotchas resolved. Same issues are recurring.`,
        metricName: 'gotcha_resolution_rate',
        metricValue: avoidanceRate,
        metricTarget: THRESHOLDS.gotchaAvoidance.good,
        metricUnit: '%',
        scoreImpact: -15,
        evidence,
        recommendations: [
          'Review gotcha documentation before starting related work',
          'Add gotcha checks to your pre-commit workflow',
          'Update gotcha docs with clearer prevention steps',
        ],
      });
    }

    return insights;
  }

  // ===========================================================================
  // New Pattern Discovery Analysis
  // ===========================================================================

  private analyzeNewPatterns(data: InsightData): RawInsight[] {
    const insights: RawInsight[] = [];

    // Check for new patterns (created in analysis period)
    const newPatterns = data.patterns.filter(p => {
      if (!p.createdAt) return false;
      return p.createdAt >= data.period.start;
    });

    const newPatternCount = newPatterns.length;

    const evidence: InsightEvidence[] = newPatterns.slice(0, 3).map(p => ({
      type: 'pattern' as const,
      id: p.id,
      description: `New pattern: ${p.name} (${p.confidence} confidence)`,
      timestamp: p.createdAt,
    }));

    if (newPatternCount >= THRESHOLDS.newPatterns.excellent) {
      insights.push({
        category: this.category,
        severity: 'info',
        title: 'Active pattern discovery',
        description: `${newPatternCount} new patterns documented this period. Knowledge capture is strong.`,
        metricName: 'new_patterns',
        metricValue: newPatternCount,
        scoreImpact: 10,
        evidence,
        recommendations: [],
      });
    } else if (newPatternCount >= THRESHOLDS.newPatterns.good) {
      insights.push({
        category: this.category,
        severity: 'info',
        title: 'Pattern documented',
        description: `${newPatternCount} new pattern documented. Keep capturing useful solutions!`,
        metricName: 'new_patterns',
        metricValue: newPatternCount,
        scoreImpact: 5,
        evidence,
        recommendations: [],
      });
    }
    // Don't penalize for no new patterns - not always applicable

    return insights;
  }
}

export default PatternAnalyzer;
