'use client';

/**
 * @fileType: component
 * @status: current
 * @updated: 2026-01-26
 * @tags: [insights, coaching, settings, epic-016-s05]
 * @related: [InsightsOverview.tsx, page-client.tsx]
 * @priority: medium
 * @complexity: low
 * @dependencies: []
 */

/**
 * CoachingSettings (EPIC-016 Sprint 5 Task 4)
 *
 * Displays the current coaching level in the dashboard.
 * Links to CLI command for manual override.
 */

import { DashboardCoachingReport } from '@/lib/insights/types';
import { getScoreRating } from '@/lib/insights/types';

interface CoachingSettingsProps {
  report: DashboardCoachingReport | null;
  loading?: boolean;
}

type CoachingLevel = 'minimal' | 'standard' | 'supportive';

interface CoachingLevelInfo {
  emoji: string;
  label: string;
  description: string;
}

const LEVEL_INFO: Record<CoachingLevel, CoachingLevelInfo> = {
  minimal: {
    emoji: '🚀',
    label: 'Minimal',
    description: 'Brief prompts, assume competence',
  },
  standard: {
    emoji: '📋',
    label: 'Standard',
    description: 'Balanced guidance with context',
  },
  supportive: {
    emoji: '🤝',
    label: 'Supportive',
    description: 'Detailed prompts with examples',
  },
};

function calculateCoachingLevel(score: number): CoachingLevel {
  if (score >= 75) return 'minimal';
  if (score >= 60) return 'standard';
  return 'supportive';
}

export default function CoachingSettings({ report, loading }: CoachingSettingsProps) {
  if (loading) {
    return (
      <div className="bg-card rounded-lg border border-border shadow-sm p-6">
        <div className="animate-pulse space-y-3">
          <div className="h-5 w-32 bg-muted rounded" />
          <div className="h-4 w-48 bg-muted rounded" />
          <div className="h-4 w-40 bg-muted rounded" />
        </div>
      </div>
    );
  }

  if (!report) {
    return (
      <div className="bg-card rounded-lg border border-border shadow-sm p-6">
        <h3 className="text-lg font-semibold text-foreground flex items-center gap-2">
          <span className="text-primary">🎯</span>
          Coaching Settings
        </h3>
        <p className="text-muted-foreground mt-2 text-sm">
          No insights data available. Run <code className="px-1 py-0.5 bg-muted rounded font-mono text-xs">ginko insights</code> to generate coaching data.
        </p>
      </div>
    );
  }

  const score = report.overallScore;
  const level = calculateCoachingLevel(score);
  const info = LEVEL_INFO[level];
  const rating = getScoreRating(score);

  return (
    <div className="bg-card rounded-lg border border-border shadow-sm">
      <div className="p-4 border-b border-border">
        <h3 className="text-lg font-semibold text-foreground flex items-center gap-2">
          <span className="text-primary">🎯</span>
          Coaching Settings
        </h3>
      </div>

      <div className="p-4 space-y-4">
        {/* Current Level */}
        <div className="flex items-start justify-between">
          <div>
            <span className="text-sm text-muted-foreground">Current Level</span>
            <div className="flex items-center gap-2 mt-1">
              <span className="text-lg">{info.emoji}</span>
              <span className="font-semibold text-foreground">{info.label}</span>
              <span className="text-xs px-2 py-0.5 bg-primary/10 text-primary rounded-full">
                auto
              </span>
            </div>
          </div>
        </div>

        {/* Score Basis */}
        <div>
          <span className="text-sm text-muted-foreground">Based on</span>
          <div className="flex items-center gap-2 mt-1">
            <span className={`font-mono font-semibold ${rating.color}`}>
              {score}
            </span>
            <span className="text-sm text-muted-foreground">
              / 100 (7-day score)
            </span>
          </div>
        </div>

        {/* Level Description */}
        <div className="text-sm text-muted-foreground">
          {info.description}
        </div>

        {/* Divider */}
        <div className="border-t border-border pt-4">
          <p className="text-xs text-muted-foreground">
            Adjust coaching level in CLI:
          </p>
          <code className="mt-1 block px-3 py-2 bg-muted rounded font-mono text-xs text-foreground">
            ginko nudging [minimal|standard|supportive|auto]
          </code>
        </div>
      </div>
    </div>
  );
}
