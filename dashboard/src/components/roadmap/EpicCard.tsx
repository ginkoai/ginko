/**
 * @fileType: component
 * @status: current
 * @updated: 2026-01-11
 * @tags: [roadmap, epic-card, decision-factors, ADR-056, draggable]
 * @related: [LaneSection.tsx, RoadmapCanvas.tsx, DecisionFactorChips.tsx]
 * @priority: high
 * @complexity: low
 * @dependencies: [react, @dnd-kit/core, lucide-react]
 */
'use client';

import { Circle, CircleDot, CheckCircle2, XCircle, GripVertical } from 'lucide-react';
import { useDraggable } from '@dnd-kit/core';
import { CSS } from '@dnd-kit/utilities';
import { Card } from '@/components/ui/card';
import { DecisionFactorChips } from './DecisionFactorChips';
import type { RoadmapEpic } from './RoadmapCanvas';
import type { RoadmapLane } from '@/lib/graph/types';

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
// Base EpicCard Component (non-draggable)
// =============================================================================

export function EpicCard({ epic, lane, isDragging, onClick }: EpicCardProps) {
  const statusConfig = STATUS_ICONS[epic.roadmap_status] || STATUS_ICONS.not_started;
  const StatusIcon = statusConfig.icon;
  const hasDecisionFactors = epic.decision_factors && epic.decision_factors.length > 0;
  const isCompleted = epic.roadmap_status === 'completed';
  const hasSprints = epic.totalSprints && epic.totalSprints > 0;

  // Extract epic ID for display (e.g., "EPIC-009" from "e009" or full ID)
  const displayId = epic.id.toUpperCase().replace(/^E(\d+)/, 'EPIC-$1');

  return (
    <Card
      onClick={onClick}
      className={`
        group relative cursor-pointer transition-all duration-200
        hover:border-primary/50 hover:shadow-md
        ${isDragging ? 'opacity-50 shadow-lg scale-[1.02] ring-2 ring-primary' : ''}
        ${epic.roadmap_status === 'in_progress' ? 'border-l-2 border-l-primary' : ''}
        ${isCompleted ? 'opacity-70' : ''}
      `}
    >
      {/* Completed Overlay */}
      {isCompleted && (
        <div className="absolute top-2 right-2 z-10">
          <CheckCircle2 className="w-5 h-5 text-green-500" />
        </div>
      )}

      <div className="flex items-start gap-3 p-4">
        {/* Drag Handle */}
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
            <span className={`font-medium truncate ${isCompleted ? 'text-muted-foreground line-through' : 'text-foreground'}`}>
              {epic.title}
            </span>
          </div>

          {/* Sprint Progress (if available) */}
          {hasSprints && (
            <div className="flex items-center gap-1 mt-1">
              <span className="text-xs text-muted-foreground">
                Sprint {epic.currentSprint || 1} of {epic.totalSprints}
              </span>
            </div>
          )}

          {/* Decision Factors (only in Later lane) */}
          {lane === 'later' && hasDecisionFactors && (
            <div className="mt-2">
              <DecisionFactorChips factors={epic.decision_factors!} />
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

        {/* Status Icon (hidden when completed - overlay shows instead) */}
        {!isCompleted && (
          <div className={statusConfig.className}>
            <StatusIcon className="w-5 h-5" />
          </div>
        )}
      </div>
    </Card>
  );
}

// =============================================================================
// Draggable EpicCard Wrapper
// =============================================================================

interface DraggableEpicCardProps {
  epic: RoadmapEpic;
  lane: RoadmapLane;
  onClick?: () => void;
}

export function DraggableEpicCard({ epic, lane, onClick }: DraggableEpicCardProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    isDragging,
  } = useDraggable({
    id: epic.id,
  });

  const style = transform ? {
    transform: CSS.Translate.toString(transform),
    zIndex: isDragging ? 50 : undefined,
  } : undefined;

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...listeners}
      {...attributes}
    >
      <EpicCard
        epic={epic}
        lane={lane}
        isDragging={isDragging}
        onClick={onClick}
      />
    </div>
  );
}

export default EpicCard;
