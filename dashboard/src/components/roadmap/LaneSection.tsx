/**
 * @fileType: component
 * @status: current
 * @updated: 2026-01-11
 * @tags: [roadmap, lane, now-next-later, ADR-056, drop-zone, performance]
 * @related: [RoadmapCanvas.tsx, EpicCard.tsx, useRoadmapDnd.ts]
 * @priority: high
 * @complexity: medium
 * @dependencies: [react, @dnd-kit/core, lucide-react]
 */
'use client';

import { ChevronDown, ChevronRight, Plus } from 'lucide-react';
import { useState, useCallback, memo, useMemo } from 'react';
import { useDroppable } from '@dnd-kit/core';
import { DraggableEpicCard } from './EpicCard';
import type { RoadmapEpic } from './RoadmapCanvas';
import type { RoadmapLane } from '@/lib/graph/types';
import type { LaneTransitionResult } from '@/lib/roadmap/lane-rules';

// =============================================================================
// Types
// =============================================================================

interface LaneSectionProps {
  lane: RoadmapLane;
  label: string;
  description: string;
  epics: RoadmapEpic[];
  onEpicSelect?: (epicId: string) => void;
  isDropAllowed?: (lane: RoadmapLane) => LaneTransitionResult;
  isDragActive?: boolean;
}

// =============================================================================
// Lane Styling
// =============================================================================

const LANE_STYLES: Record<RoadmapLane, { border: string; badge: string; icon: string }> = {
  now: {
    border: 'border-l-primary',
    badge: 'bg-primary/20 text-primary',
    icon: 'text-primary',
  },
  next: {
    border: 'border-l-blue-500',
    badge: 'bg-blue-500/20 text-blue-400',
    icon: 'text-blue-400',
  },
  later: {
    border: 'border-l-muted-foreground',
    badge: 'bg-muted text-muted-foreground',
    icon: 'text-muted-foreground',
  },
  done: {
    border: 'border-l-green-600',
    badge: 'bg-green-600/20 text-green-400',
    icon: 'text-green-400',
  },
  dropped: {
    border: 'border-l-red-500/50',
    badge: 'bg-red-500/20 text-red-400',
    icon: 'text-red-400',
  },
};

// =============================================================================
// Component - Memoized for performance
// =============================================================================

export const LaneSection = memo(function LaneSection({
  lane,
  label,
  description,
  epics,
  onEpicSelect,
  isDropAllowed,
  isDragActive,
}: LaneSectionProps) {
  const [isExpanded, setIsExpanded] = useState(true);
  const styles = LANE_STYLES[lane];
  const isEmpty = epics.length === 0;

  // Memoize toggle handler
  const handleToggle = useCallback(() => {
    setIsExpanded(prev => !prev);
  }, []);

  // Make this lane a drop target
  const { isOver, setNodeRef } = useDroppable({
    id: lane,
  });

  // Check if drop is allowed for this lane
  const dropResult = isDropAllowed?.(lane);
  const canDrop = dropResult?.allowed ?? true;

  // Memoize visual feedback class computation
  const dropFeedbackClass = useMemo(() => {
    if (!isDragActive) return '';
    if (!isOver) return 'transition-all duration-200';

    if (canDrop) {
      return 'ring-2 ring-primary bg-primary/5 transition-all duration-200';
    } else {
      return 'ring-2 ring-destructive bg-destructive/5 transition-all duration-200';
    }
  }, [isDragActive, isOver, canDrop]);

  // Memoize empty state message
  const emptyMessage = useMemo(() => {
    switch (lane) {
      case 'now': return 'No work ready to start. Move items from Next when ready.';
      case 'next': return 'No committed work. Drag items from Later to commit.';
      case 'later': return 'No proposed work. Add epics to build your backlog.';
      case 'done': return 'No completed work yet.';
      case 'dropped': return 'No dropped items.';
      default: return '';
    }
  }, [lane]);

  // Memoize click handler creator to avoid creating new functions for each epic
  const handleEpicClick = useCallback((epicId: string) => {
    onEpicSelect?.(epicId);
  }, [onEpicSelect]);

  return (
    <div
      ref={setNodeRef}
      className={`border-l-4 ${styles.border} rounded-r-lg bg-card ${dropFeedbackClass}`}
    >
      {/* Lane Header */}
      <button
        onClick={handleToggle}
        className="w-full flex items-center justify-between px-4 py-3 hover:bg-secondary/50 transition-colors rounded-tr-lg"
      >
        <div className="flex items-center gap-3">
          {isExpanded ? (
            <ChevronDown className={`w-4 h-4 ${styles.icon}`} />
          ) : (
            <ChevronRight className={`w-4 h-4 ${styles.icon}`} />
          )}
          <div className="text-left">
            <div className="flex items-center gap-2">
              <span className="font-mono font-semibold text-foreground">
                {label}
              </span>
              <span className={`text-xs px-2 py-0.5 rounded-full font-mono ${styles.badge}`}>
                {epics.length}
              </span>
            </div>
            <p className="text-xs text-muted-foreground">{description}</p>
          </div>
        </div>
        {lane === 'later' && (
          <button
            onClick={(e) => {
              e.stopPropagation();
              // TODO: Open create epic modal
            }}
            className="p-1 hover:bg-secondary rounded text-muted-foreground hover:text-foreground transition-colors"
            title="Add new epic"
          >
            <Plus className="w-4 h-4" />
          </button>
        )}
      </button>

      {/* Drop zone feedback when dragging */}
      {isDragActive && isOver && !canDrop && dropResult?.reason && (
        <div className="mx-4 mb-2 px-3 py-2 rounded bg-destructive/10 border border-destructive/30">
          <p className="text-xs text-destructive">{dropResult.reason}</p>
        </div>
      )}

      {/* Epic Cards - Grid layout for multiple cards per row */}
      {isExpanded && (
        <div className="px-4 pb-4">
          {isEmpty ? (
            <div className={`py-8 text-center text-sm text-muted-foreground ${isDragActive && canDrop ? 'border-2 border-dashed border-primary/30 rounded-lg' : ''}`}>
              {emptyMessage}
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
              {epics.map((epic) => (
                <DraggableEpicCard
                  key={epic.id}
                  epic={epic}
                  lane={lane}
                  onClick={() => handleEpicClick(epic.id)}
                />
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
});

export default LaneSection;
