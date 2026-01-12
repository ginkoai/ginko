/**
 * @fileType: component
 * @status: current
 * @updated: 2026-01-11
 * @tags: [roadmap, epic-card, decision-factors, ADR-056, draggable, performance]
 * @related: [LaneSection.tsx, RoadmapCanvas.tsx, DecisionFactorChips.tsx]
 * @priority: high
 * @complexity: low
 * @dependencies: [react, @dnd-kit/core, lucide-react]
 */
'use client';

import { memo } from 'react';
import { Circle, CircleDot, CheckCircle2, XCircle, GripVertical } from 'lucide-react';
import { useDraggable } from '@dnd-kit/core';
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
  isOverlay?: boolean; // True when rendered in DragOverlay (the card being dragged)
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
// Base EpicCard Component (non-draggable) - Memoized for performance
// =============================================================================

export const EpicCard = memo(function EpicCard({ epic, lane, isDragging, isOverlay, onClick }: EpicCardProps) {
  const statusConfig = STATUS_ICONS[epic.roadmap_status] || STATUS_ICONS.not_started;
  const StatusIcon = statusConfig.icon;
  const hasDecisionFactors = epic.decision_factors && epic.decision_factors.length > 0;
  const isCompleted = epic.roadmap_status === 'completed';
  const hasSprints = epic.totalSprints && epic.totalSprints > 0;

  // Extract epic ID for display (e.g., "EPIC-009" from "e009" or full ID)
  // Skip showing ID if title already starts with EPIC pattern to avoid duplication
  const rawDisplayId = epic.id.toUpperCase().replace(/^E(\d+)/, 'EPIC-$1').replace(/-/g, ' ').split(' ')[0] +
    (epic.id.match(/\d+/) ? '-' + epic.id.match(/\d+/)?.[0] : '');
  const titleStartsWithEpic = /^EPIC[-\s]?\d+/i.test(epic.title);
  const displayId = titleStartsWithEpic ? null : rawDisplayId;

  return (
    <Card
      onClick={onClick}
      className={`
        group relative cursor-pointer transition-all duration-200
        border-2 select-none
        ${isOverlay
          ? 'border-primary shadow-xl scale-105 ring-2 ring-primary z-50 rotate-2'
          : isDragging
            ? 'border-dashed border-primary/50 opacity-40 bg-primary/5'
            : 'border-border hover:border-primary/70 hover:shadow-[0_0_15px_rgba(34,197,94,0.2)]'
        }
        ${isCompleted && !isOverlay ? 'opacity-70' : ''}
      `}
    >
      {/* Completed Overlay */}
      {isCompleted && (
        <div className="absolute top-2 right-2 z-10">
          <CheckCircle2 className="w-5 h-5 text-green-500" />
        </div>
      )}

      <div className="flex items-start gap-2 p-3">
        {/* Drag Handle - always visible on touch, hover on desktop */}
        {/* Min 44px touch target per iOS HIG */}
        <div className="opacity-50 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity cursor-grab active:cursor-grabbing text-muted-foreground shrink-0 -ml-1 p-2 -m-2">
          <GripVertical className="w-5 h-5" />
        </div>

        {/* Main Content */}
        <div className="flex-1 min-w-0">
          {/* ID as header (only if title doesn't already contain it) */}
          {displayId && (
            <div className="flex items-center justify-between gap-2 mb-1">
              <span className="text-xs font-mono text-muted-foreground">
                {displayId}
              </span>
              {/* Status Icon */}
              {!isCompleted && (
                <div className={`shrink-0 ${statusConfig.className}`}>
                  <StatusIcon className="w-4 h-4" />
                </div>
              )}
            </div>
          )}

          {/* Title with status icon inline if no ID header */}
          <div className="flex items-start justify-between gap-2">
            <p className={`text-sm font-medium line-clamp-2 ${isCompleted ? 'text-muted-foreground line-through' : 'text-foreground'}`}>
              {epic.title}
            </p>
            {!displayId && !isCompleted && (
              <div className={`shrink-0 mt-0.5 ${statusConfig.className}`}>
                <StatusIcon className="w-4 h-4" />
              </div>
            )}
          </div>

          {/* Sprint Progress (if available) */}
          {hasSprints && (
            <p className="text-xs text-muted-foreground mt-1">
              Sprint {epic.currentSprint || 1}/{epic.totalSprints}
            </p>
          )}

          {/* Decision Factors (only in Later lane) */}
          {lane === 'later' && hasDecisionFactors && (
            <div className="mt-2">
              <DecisionFactorChips factors={epic.decision_factors!} size="sm" />
            </div>
          )}

          {/* Tags (if any, limited to 2 for compact view) */}
          {epic.tags && epic.tags.length > 0 && (
            <div className="flex flex-wrap gap-1 mt-2">
              {epic.tags.slice(0, 2).map((tag) => (
                <span
                  key={tag}
                  className="text-xs px-1.5 py-0.5 rounded bg-secondary text-muted-foreground"
                >
                  {tag}
                </span>
              ))}
              {epic.tags.length > 2 && (
                <span className="text-xs text-muted-foreground">
                  +{epic.tags.length - 2}
                </span>
              )}
            </div>
          )}
        </div>
      </div>
    </Card>
  );
}, (prevProps, nextProps) => {
  // Custom comparison function for better memoization
  // Only re-render if these specific props change
  return (
    prevProps.epic.id === nextProps.epic.id &&
    prevProps.epic.title === nextProps.epic.title &&
    prevProps.epic.roadmap_status === nextProps.epic.roadmap_status &&
    prevProps.epic.roadmap_lane === nextProps.epic.roadmap_lane &&
    prevProps.epic.roadmap_visible === nextProps.epic.roadmap_visible &&
    prevProps.epic.currentSprint === nextProps.epic.currentSprint &&
    prevProps.epic.totalSprints === nextProps.epic.totalSprints &&
    prevProps.lane === nextProps.lane &&
    prevProps.isDragging === nextProps.isDragging &&
    prevProps.isOverlay === nextProps.isOverlay &&
    // Compare arrays by reference first, then by content if needed
    prevProps.epic.decision_factors === nextProps.epic.decision_factors &&
    prevProps.epic.tags === nextProps.epic.tags
  );
});

// =============================================================================
// Draggable EpicCard Wrapper - Memoized for performance
// =============================================================================

interface DraggableEpicCardProps {
  epic: RoadmapEpic;
  lane: RoadmapLane;
  onClick?: () => void;
}

export const DraggableEpicCard = memo(function DraggableEpicCard({ epic, lane, onClick }: DraggableEpicCardProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    isDragging,
  } = useDraggable({
    id: epic.id,
  });

  // Don't apply transform - let DragOverlay handle the visual drag feedback
  // The original card stays in place as a placeholder (with dimmed styling)
  return (
    <div
      ref={setNodeRef}
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
}, (prevProps, nextProps) => {
  // Re-render only when epic data or lane changes
  // onClick is a callback that should be stable from parent
  return (
    prevProps.epic.id === nextProps.epic.id &&
    prevProps.epic.title === nextProps.epic.title &&
    prevProps.epic.roadmap_status === nextProps.epic.roadmap_status &&
    prevProps.epic.roadmap_lane === nextProps.epic.roadmap_lane &&
    prevProps.epic.roadmap_visible === nextProps.epic.roadmap_visible &&
    prevProps.epic.currentSprint === nextProps.epic.currentSprint &&
    prevProps.epic.totalSprints === nextProps.epic.totalSprints &&
    prevProps.lane === nextProps.lane &&
    prevProps.epic.decision_factors === nextProps.epic.decision_factors &&
    prevProps.epic.tags === nextProps.epic.tags
  );
});

export default EpicCard;
