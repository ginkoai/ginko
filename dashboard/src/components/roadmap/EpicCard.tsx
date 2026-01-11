/**
 * @fileType: component
 * @status: current
 * @updated: 2026-01-11
 * @tags: [roadmap, epic-card, decision-factors, ADR-056]
 * @related: [LaneSection.tsx, RoadmapCanvas.tsx, DecisionFactorChips.tsx]
 * @priority: high
 * @complexity: low
 * @dependencies: [react, lucide-react]
 */
'use client';

import { AlertTriangle, Circle, CircleDot, CheckCircle2, XCircle, GripVertical } from 'lucide-react';
import { Card } from '@/components/ui/card';
import type { RoadmapEpic } from './RoadmapCanvas';
import type { RoadmapLane, DecisionFactor } from '@/lib/graph/types';

// =============================================================================
// Types
// =============================================================================

interface EpicCardProps {
  epic: RoadmapEpic;
  lane: RoadmapLane;
  isDragging?: boolean;
  onClick?: () => void;
}

// =============================================================================
// Status Icons
// =============================================================================

const STATUS_ICONS: Record<string, { icon: typeof Circle; className: string }> = {
  not_started: { icon: Circle, className: 'text-muted-foreground' },
  in_progress: { icon: CircleDot, className: 'text-primary' },
  completed: { icon: CheckCircle2, className: 'text-green-500' },
  cancelled: { icon: XCircle, className: 'text-red-400' },
};

// =============================================================================
// Decision Factor Labels
// =============================================================================

const DECISION_FACTOR_LABELS: Record<DecisionFactor, string> = {
  planning: 'planning',
  value: 'value',
  feasibility: 'feasibility',
  advisability: 'advisability',
  architecture: 'architecture',
  design: 'design',
  risks: 'risks',
  'market-fit': 'market-fit',
  dependencies: 'dependencies',
};

// =============================================================================
// Component
// =============================================================================

export function EpicCard({ epic, lane, isDragging, onClick }: EpicCardProps) {
  const statusConfig = STATUS_ICONS[epic.roadmap_status] || STATUS_ICONS.not_started;
  const StatusIcon = statusConfig.icon;
  const hasDecisionFactors = epic.decision_factors && epic.decision_factors.length > 0;

  // Extract epic ID for display (e.g., "EPIC-009" from "e009" or full ID)
  const displayId = epic.id.toUpperCase().replace(/^E(\d+)/, 'EPIC-$1');

  return (
    <Card
      onClick={onClick}
      className={`
        group relative cursor-pointer transition-all duration-200
        hover:border-primary/50 hover:shadow-md
        ${isDragging ? 'opacity-50 shadow-lg scale-[1.02]' : ''}
        ${epic.roadmap_status === 'in_progress' ? 'border-l-2 border-l-primary' : ''}
        ${epic.roadmap_status === 'completed' ? 'opacity-70' : ''}
      `}
    >
      <div className="flex items-start gap-3 p-4">
        {/* Drag Handle (placeholder for drag-and-drop) */}
        <div className="opacity-0 group-hover:opacity-100 transition-opacity cursor-grab active:cursor-grabbing text-muted-foreground">
          <GripVertical className="w-4 h-4" />
        </div>

        {/* Main Content */}
        <div className="flex-1 min-w-0">
          {/* Title Row */}
          <div className="flex items-center gap-2">
            <span className="text-xs font-mono text-muted-foreground">
              {displayId}
            </span>
            <span className="font-medium text-foreground truncate">
              {epic.title}
            </span>
          </div>

          {/* Decision Factors (only in Later lane) */}
          {lane === 'later' && hasDecisionFactors && (
            <div className="flex items-center gap-1.5 mt-2">
              <AlertTriangle className="w-3 h-3 text-amber-500 flex-shrink-0" />
              <div className="flex flex-wrap gap-1">
                {epic.decision_factors!.map((factor) => (
                  <span
                    key={factor}
                    className="text-xs px-1.5 py-0.5 rounded bg-amber-500/10 text-amber-400 font-mono"
                  >
                    {DECISION_FACTOR_LABELS[factor] || factor}
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* Tags (if any, limited to 3) */}
          {epic.tags && epic.tags.length > 0 && (
            <div className="flex flex-wrap gap-1 mt-2">
              {epic.tags.slice(0, 3).map((tag) => (
                <span
                  key={tag}
                  className="text-xs px-1.5 py-0.5 rounded bg-secondary text-muted-foreground"
                >
                  {tag}
                </span>
              ))}
              {epic.tags.length > 3 && (
                <span className="text-xs text-muted-foreground">
                  +{epic.tags.length - 3}
                </span>
              )}
            </div>
          )}
        </div>

        {/* Status Icon */}
        <div className={statusConfig.className}>
          <StatusIcon className="w-5 h-5" />
        </div>
      </div>
    </Card>
  );
}

export default EpicCard;
