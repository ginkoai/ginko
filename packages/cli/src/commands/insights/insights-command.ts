/**
 * @fileType: command
 * @status: current
 * @updated: 2025-12-15
 * @tags: [cli, insights, coaching, analysis]
 * @related: [../../lib/insights/, ../status.ts]
 * @priority: high
 * @complexity: medium
 * @dependencies: [chalk, commander]
 */

import chalk from 'chalk';
import {
  collectInsightData,
  getAllAnalyzers,
  getAnalyzer,
  type InsightData,
  type RawInsight,
  type CoachingReport,
  type CategoryScore,
  type InsightCategory,
  type InsightSeverity,
} from '../../lib/insights/index.js';

// ============================================================================
// Types
// ============================================================================

export interface InsightsOptions {
  detailed?: boolean;
  category?: string;
  json?: boolean;
  sync?: boolean;
  days?: number;
}

// ============================================================================
// Constants
// ============================================================================

const SEVERITY_ICONS: Record<InsightSeverity, string> = {
  info: '○',
  suggestion: '◐',
  warning: '⚠️',
  critical: '🚨',
};

const CATEGORY_DISPLAY_NAMES: Record<InsightCategory, string> = {
  efficiency: 'Session Efficiency',
  patterns: 'Pattern Adoption',
  quality: 'Collaboration Quality',
  'anti-patterns': 'Anti-Patterns',
};

const SCORE_RATINGS = [
  { min: 90, label: 'Excellent', color: chalk.green },
  { min: 75, label: 'Good', color: chalk.cyan },
  { min: 60, label: 'Fair', color: chalk.yellow },
  { min: 40, label: 'Needs Improvement', color: chalk.hex('#FFA500') },
  { min: 0, label: 'Critical', color: chalk.red },
];

// ============================================================================
// Main Command
// ============================================================================

export async function insightsCommand(options: InsightsOptions = {}): Promise<void> {
  try {
    const days = options.days ?? 30;

    // Collect data
    console.log(chalk.dim(`Analyzing ${days} days of activity...`));
    const data = await collectInsightData({ days });

    // Run analysis
    const report = await generateReport(data, options.category);

    // Output based on format
    if (options.json) {
      outputJson(report);
    } else if (options.detailed) {
      outputDetailed(report);
    } else {
      outputSummary(report);
    }

    // Sync to Supabase if requested
    if (options.sync) {
      await syncToSupabase(report);
    }
  } catch (error) {
    console.error(chalk.red('Error running insights analysis:'), error instanceof Error ? error.message : String(error));
    process.exit(1);
  }
}

// ============================================================================
// Report Generation
// ============================================================================

async function generateReport(data: InsightData, categoryFilter?: string): Promise<CoachingReport> {
  const analyzers = categoryFilter
    ? [getAnalyzer(categoryFilter)].filter(Boolean)
    : getAllAnalyzers();

  if (analyzers.length === 0) {
    throw new Error(`Unknown category: ${categoryFilter}. Valid categories: efficiency, patterns, quality, anti-patterns`);
  }

  // Run all analyzers
  const allInsights: RawInsight[] = [];
  for (const analyzer of analyzers) {
    if (analyzer) {
      const insights = await analyzer.analyze(data);
      allInsights.push(...insights);
    }
  }

  // Calculate category scores
  const categoryScores = calculateCategoryScores(allInsights);

  // Calculate overall score
  const overallScore = calculateOverallScore(categoryScores);

  // Generate summary
  const summary = generateSummary(allInsights, overallScore);

  return {
    userId: data.userId,
    projectId: data.projectId,
    runAt: new Date(),
    period: data.period,
    overallScore,
    categoryScores,
    insights: allInsights,
    summary,
  };
}

function calculateCategoryScores(insights: RawInsight[]): CategoryScore[] {
  const categories: InsightCategory[] = ['efficiency', 'patterns', 'quality', 'anti-patterns'];
  const scores: CategoryScore[] = [];

  for (const category of categories) {
    const categoryInsights = insights.filter(i => i.category === category);
    const baseScore = 75; // Start with a base score

    // Calculate adjustments from insights
    const adjustments = categoryInsights.reduce((sum, insight) => sum + insight.scoreImpact, 0);

    // Clamp score between 0 and 100
    const score = Math.max(0, Math.min(100, baseScore + adjustments));

    scores.push({
      category,
      score: Math.round(score),
      baseScore,
      adjustments,
      insightCount: categoryInsights.length,
      criticalCount: categoryInsights.filter(i => i.severity === 'critical').length,
      warningCount: categoryInsights.filter(i => i.severity === 'warning').length,
    });
  }

  return scores;
}

function calculateOverallScore(categoryScores: CategoryScore[]): number {
  if (categoryScores.length === 0) return 75;

  // Weight categories (efficiency and quality slightly higher)
  const weights: Record<InsightCategory, number> = {
    efficiency: 0.3,
    patterns: 0.2,
    quality: 0.3,
    'anti-patterns': 0.2,
  };

  let weightedSum = 0;
  let totalWeight = 0;

  for (const cs of categoryScores) {
    const weight = weights[cs.category] || 0.25;
    weightedSum += cs.score * weight;
    totalWeight += weight;
  }

  return Math.round(weightedSum / totalWeight);
}

function generateSummary(insights: RawInsight[], score: number): string {
  const criticalCount = insights.filter(i => i.severity === 'critical').length;
  const warningCount = insights.filter(i => i.severity === 'warning').length;
  const positiveCount = insights.filter(i => i.scoreImpact > 0).length;

  if (criticalCount > 0) {
    return `${criticalCount} critical issues require immediate attention.`;
  } else if (warningCount > 0) {
    return `${warningCount} areas could be improved. ${positiveCount} metrics are performing well.`;
  } else if (score >= 90) {
    return `Excellent performance across all metrics. Keep up the great work!`;
  } else if (score >= 75) {
    return `Good overall performance with ${positiveCount} strong areas.`;
  } else {
    return `Several areas need attention to improve your development workflow.`;
  }
}

// ============================================================================
// Output Formatters
// ============================================================================

function outputSummary(report: CoachingReport): void {
  // Header
  console.log('');
  console.log(chalk.bold(`Coaching Insights`) + chalk.dim(` | ${report.userId} | ${report.projectId}`));
  console.log(chalk.dim(`Analysis period: ${report.period.days} days`));
  console.log('');

  // Category summaries
  for (const categoryScore of report.categoryScores) {
    const displayName = CATEGORY_DISPLAY_NAMES[categoryScore.category];
    const categoryInsights = report.insights.filter(i => i.category === categoryScore.category);

    // Skip empty categories
    if (categoryInsights.length === 0) continue;

    console.log(chalk.cyan.bold(displayName));

    // Show top 2 insights per category
    const topInsights = categoryInsights.slice(0, 2);
    for (const insight of topInsights) {
      const icon = SEVERITY_ICONS[insight.severity];
      const titleColor = insight.scoreImpact > 0 ? chalk.green : insight.severity === 'warning' ? chalk.yellow : chalk.white;
      console.log(`  ${icon} ${titleColor(insight.title)}`);
      if (insight.description && insight.description.length < 80) {
        console.log(chalk.dim(`    ${insight.description}`));
      }
    }

    if (categoryInsights.length > 2) {
      console.log(chalk.dim(`    +${categoryInsights.length - 2} more insights`));
    }

    console.log('');
  }

  // Overall score
  const rating = getScoreRating(report.overallScore);
  console.log(chalk.bold('Overall Score: ') + rating.color(`${report.overallScore}/100 (${rating.label})`));
  console.log(chalk.dim(report.summary));
  console.log('');
  console.log(chalk.dim(`Run ${chalk.cyan('ginko insights --detailed')} for full analysis`));
}

function outputDetailed(report: CoachingReport): void {
  // Header
  console.log('');
  console.log(chalk.bold.green('Coaching Insights Report'));
  console.log(chalk.dim('═'.repeat(60)));
  console.log(`User: ${report.userId}`);
  console.log(`Project: ${report.projectId}`);
  console.log(`Period: ${report.period.start.toLocaleDateString()} - ${report.period.end.toLocaleDateString()} (${report.period.days} days)`);
  console.log(`Generated: ${report.runAt.toLocaleString()}`);
  console.log(chalk.dim('═'.repeat(60)));
  console.log('');

  // Category details
  for (const categoryScore of report.categoryScores) {
    const displayName = CATEGORY_DISPLAY_NAMES[categoryScore.category];
    const categoryInsights = report.insights.filter(i => i.category === categoryScore.category);

    if (categoryInsights.length === 0) continue;

    const scoreRating = getScoreRating(categoryScore.score);
    console.log(chalk.cyan.bold(`${displayName}`) + chalk.dim(` | Score: `) + scoreRating.color(`${categoryScore.score}/100`));
    console.log(chalk.dim('─'.repeat(50)));

    for (const insight of categoryInsights) {
      const icon = SEVERITY_ICONS[insight.severity];
      const severityColor = getSeverityColor(insight.severity);

      console.log(`  ${icon} ${severityColor.bold(insight.title)}`);
      console.log(`     ${insight.description}`);

      // Show metric if available
      if (insight.metricValue !== undefined) {
        const metricStr = `${insight.metricName}: ${insight.metricValue}${insight.metricUnit || ''}`;
        const targetStr = insight.metricTarget !== undefined ? ` (target: ${insight.metricTarget}${insight.metricUnit || ''})` : '';
        console.log(chalk.dim(`     Metric: ${metricStr}${targetStr}`));
      }

      // Show evidence
      if (insight.evidence.length > 0) {
        console.log(chalk.dim(`     Evidence:`));
        for (const ev of insight.evidence.slice(0, 3)) {
          console.log(chalk.dim(`       - ${ev.description}`));
        }
        if (insight.evidence.length > 3) {
          console.log(chalk.dim(`       ... and ${insight.evidence.length - 3} more`));
        }
      }

      // Show recommendations
      if (insight.recommendations.length > 0) {
        console.log(chalk.yellow.dim(`     Recommendations:`));
        for (const rec of insight.recommendations) {
          console.log(chalk.yellow.dim(`       - ${rec}`));
        }
      }

      console.log('');
    }

    console.log('');
  }

  // Overall summary
  console.log(chalk.dim('═'.repeat(60)));
  const rating = getScoreRating(report.overallScore);
  console.log(chalk.bold('Overall Score: ') + rating.color(`${report.overallScore}/100 (${rating.label})`));
  console.log('');
  console.log(chalk.bold('Summary: ') + report.summary);
  console.log('');

  // Score breakdown
  console.log(chalk.bold('Category Breakdown:'));
  for (const cs of report.categoryScores) {
    const displayName = CATEGORY_DISPLAY_NAMES[cs.category];
    const rating = getScoreRating(cs.score);
    const bar = generateScoreBar(cs.score);
    console.log(`  ${displayName.padEnd(22)} ${bar} ${rating.color(String(cs.score).padStart(3))}`);
  }
  console.log('');
}

function outputJson(report: CoachingReport): void {
  const output = {
    ...report,
    runAt: report.runAt.toISOString(),
    period: {
      ...report.period,
      start: report.period.start.toISOString(),
      end: report.period.end.toISOString(),
    },
  };
  console.log(JSON.stringify(output, null, 2));
}

// ============================================================================
// Supabase Sync
// ============================================================================

async function syncToSupabase(report: CoachingReport): Promise<void> {
  console.log(chalk.dim('\nSyncing to dashboard...'));

  // Load auth token
  const { loadAuthSession } = await import('../../utils/auth-storage.js');
  const { loadGraphConfig } = await import('../graph/config.js');

  const session = await loadAuthSession();
  const token = session?.api_key || null;

  if (!token) {
    console.log(chalk.yellow('⚠ Not authenticated. Run `ginko login` to sync insights.'));
    console.log(chalk.dim('Results saved locally only'));
    return;
  }

  // Get API URL from graph config or environment
  const graphConfig = await loadGraphConfig();
  const apiUrl = graphConfig?.apiEndpoint || process.env.GINKO_API_URL || 'https://app.ginkoai.com';

  // Prepare request payload
  const payload = {
    userId: report.userId,
    projectId: report.projectId,
    graphId: graphConfig?.graphId,
    overallScore: report.overallScore,
    categoryScores: report.categoryScores,
    insights: report.insights,
    summary: report.summary,
    period: {
      start: report.period.start.toISOString(),
      end: report.period.end.toISOString(),
      days: report.period.days,
    },
  };

  try {
    const response = await fetch(`${apiUrl}/api/v1/insights/sync`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`,
      },
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({})) as { error?: string };
      throw new Error(errorData.error || `HTTP ${response.status}`);
    }

    const result = await response.json() as { runId: string; insightCount: number; trendCount: number };
    console.log(chalk.green('✓ Insights synced to dashboard'));
    console.log(chalk.dim(`  Run ID: ${result.runId}`));
    console.log(chalk.dim(`  Insights: ${result.insightCount} | Trends: ${result.trendCount}`));
  } catch (error) {
    console.log(chalk.yellow(`⚠ Sync failed: ${error instanceof Error ? error.message : String(error)}`));
    console.log(chalk.dim('Results saved locally only'));
  }
}

// ============================================================================
// Helper Functions
// ============================================================================

function getScoreRating(score: number): { label: string; color: chalk.Chalk } {
  for (const rating of SCORE_RATINGS) {
    if (score >= rating.min) {
      return rating;
    }
  }
  return SCORE_RATINGS[SCORE_RATINGS.length - 1];
}

function getSeverityColor(severity: InsightSeverity): chalk.Chalk {
  switch (severity) {
    case 'critical':
      return chalk.red;
    case 'warning':
      return chalk.yellow;
    case 'suggestion':
      return chalk.cyan;
    case 'info':
    default:
      return chalk.white;
  }
}

function generateScoreBar(score: number, width: number = 20): string {
  const filled = Math.round((score / 100) * width);
  const empty = width - filled;
  const rating = getScoreRating(score);
  return rating.color('█'.repeat(filled)) + chalk.dim('░'.repeat(empty));
}

export default insightsCommand;
