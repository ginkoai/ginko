/**
 * @fileType: hook
 * @status: current
 * @updated: 2026-01-11
 * @tags: [roadmap, drag-drop, dnd-kit, ADR-056]
 * @related: [RoadmapCanvas.tsx, lane-rules.ts]
 * @priority: high
 * @complexity: medium
 * @dependencies: [@dnd-kit/core]
 */

import { useState, useCallback } from 'react';
import type { DragStartEvent, DragEndEvent, DragOverEvent } from '@dnd-kit/core';
import type { RoadmapLane } from '@/lib/graph/types';
import type { RoadmapEpic } from '@/components/roadmap/RoadmapCanvas';
import { canMoveTo, type LaneTransitionResult } from '@/lib/roadmap/lane-rules';

// =============================================================================
// Types
// =============================================================================

export interface DragState {
  activeId: string | null;
  activeEpic: RoadmapEpic | null;
  overId: string | null;
  overLane: RoadmapLane | null;
  canDrop: boolean;
  dropMessage: string | null;
}

export interface UseRoadmapDndOptions {
  epics: RoadmapEpic[];
  onMove: (epicId: string, targetLane: RoadmapLane) => void;
  onPromptForFactors?: (epic: RoadmapEpic, targetLane: RoadmapLane) => void;
}

export interface UseRoadmapDndResult {
  dragState: DragState;
  handleDragStart: (event: DragStartEvent) => void;
  handleDragOver: (event: DragOverEvent) => void;
  handleDragEnd: (event: DragEndEvent) => void;
  handleDragCancel: () => void;
  isDropAllowed: (laneId: RoadmapLane) => LaneTransitionResult;
}

// =============================================================================
// Initial State
// =============================================================================

const initialDragState: DragState = {
  activeId: null,
  activeEpic: null,
  overId: null,
  overLane: null,
  canDrop: false,
  dropMessage: null,
};

// =============================================================================
// Hook
// =============================================================================

export function useRoadmapDnd({
  epics,
  onMove,
  onPromptForFactors,
}: UseRoadmapDndOptions): UseRoadmapDndResult {
  const [dragState, setDragState] = useState<DragState>(initialDragState);

  // Find epic by ID
  const findEpic = useCallback(
    (id: string): RoadmapEpic | undefined => {
      return epics.find((e) => e.id === id);
    },
    [epics]
  );

  // Check if drop is allowed for a specific lane
  const isDropAllowed = useCallback(
    (targetLane: RoadmapLane): LaneTransitionResult => {
      if (!dragState.activeEpic) {
        return { allowed: false, reason: 'No active drag' };
      }
      return canMoveTo(
        dragState.activeEpic,
        dragState.activeEpic.roadmap_lane,
        targetLane
      );
    },
    [dragState.activeEpic]
  );

  // Handle drag start
  const handleDragStart = useCallback(
    (event: DragStartEvent) => {
      const { active } = event;
      const epicId = active.id as string;
      const epic = findEpic(epicId);

      if (epic) {
        setDragState({
          activeId: epicId,
          activeEpic: epic,
          overId: null,
          overLane: null,
          canDrop: false,
          dropMessage: null,
        });
      }
    },
    [findEpic]
  );

  // Handle drag over (for visual feedback)
  const handleDragOver = useCallback(
    (event: DragOverEvent) => {
      const { over } = event;

      if (!over || !dragState.activeEpic) {
        setDragState((prev) => ({
          ...prev,
          overId: null,
          overLane: null,
          canDrop: false,
          dropMessage: null,
        }));
        return;
      }

      // The over.id could be a lane ID or an epic ID
      // Lanes have IDs like 'now', 'next', 'later'
      // Epics have IDs like 'e001', 'e002', etc.
      const overId = over.id as string;
      const isLane = ['now', 'next', 'later', 'done', 'dropped'].includes(overId);

      let targetLane: RoadmapLane;
      if (isLane) {
        targetLane = overId as RoadmapLane;
      } else {
        // Find the epic being hovered and get its lane
        const overEpic = findEpic(overId);
        targetLane = overEpic?.roadmap_lane || dragState.activeEpic.roadmap_lane;
      }

      const result = canMoveTo(
        dragState.activeEpic,
        dragState.activeEpic.roadmap_lane,
        targetLane
      );

      setDragState((prev) => ({
        ...prev,
        overId,
        overLane: targetLane,
        canDrop: result.allowed,
        dropMessage: result.reason || null,
      }));
    },
    [dragState.activeEpic, findEpic]
  );

  // Handle drag end
  const handleDragEnd = useCallback(
    (event: DragEndEvent) => {
      const { active, over } = event;

      if (!over || !dragState.activeEpic) {
        setDragState(initialDragState);
        return;
      }

      const epicId = active.id as string;
      const overId = over.id as string;
      const isLane = ['now', 'next', 'later', 'done', 'dropped'].includes(overId);

      let targetLane: RoadmapLane;
      if (isLane) {
        targetLane = overId as RoadmapLane;
      } else {
        const overEpic = findEpic(overId);
        targetLane = overEpic?.roadmap_lane || dragState.activeEpic.roadmap_lane;
      }

      const result = canMoveTo(
        dragState.activeEpic,
        dragState.activeEpic.roadmap_lane,
        targetLane
      );

      if (result.allowed) {
        // Check if we need to prompt for decision factors
        if (result.promptForFactors && onPromptForFactors) {
          onPromptForFactors(dragState.activeEpic, targetLane);
        } else {
          onMove(epicId, targetLane);
        }
      }

      setDragState(initialDragState);
    },
    [dragState.activeEpic, findEpic, onMove, onPromptForFactors]
  );

  // Handle drag cancel
  const handleDragCancel = useCallback(() => {
    setDragState(initialDragState);
  }, []);

  return {
    dragState,
    handleDragStart,
    handleDragOver,
    handleDragEnd,
    handleDragCancel,
    isDropAllowed,
  };
}

export default useRoadmapDnd;
