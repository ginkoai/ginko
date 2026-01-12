/**
 * @fileType: component
 * @status: current
 * @updated: 2026-01-11
 * @tags: [roadmap, canvas, now-next-later, ADR-056, priority, drag-drop]
 * @related: [LaneSection.tsx, EpicCard.tsx, useRoadmapDnd.ts]
 * @priority: high
 * @complexity: medium
 * @dependencies: [react, @tanstack/react-query, @dnd-kit/core, lucide-react]
 */
'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  DndContext,
  DragOverlay,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
} from '@dnd-kit/core';
import { Filter, Settings, Loader2 } from 'lucide-react';
import { LaneSection } from './LaneSection';
import { EpicCard } from './EpicCard';
import { Button } from '@/components/ui/button';
import { useRoadmapDnd } from '@/hooks/useRoadmapDnd';
import type { RoadmapLane, DecisionFactor } from '@/lib/graph/types';

// =============================================================================
// Types
// =============================================================================

export interface RoadmapEpic {
  id: string;
  title: string;
  description?: string;
  roadmap_lane: RoadmapLane;
  roadmap_status: 'not_started' | 'in_progress' | 'completed' | 'cancelled';
  priority?: number;
  decision_factors?: DecisionFactor[];
  roadmap_visible: boolean;
  tags?: string[];
  // Sprint progress (optional - if epic has sprints)
  currentSprint?: number;
  totalSprints?: number;
}

interface LaneGroup {
  lane: RoadmapLane;
  label: string;
  description: string;
  epics: RoadmapEpic[];
}

interface RoadmapResponse {
  epics: RoadmapEpic[];
  lanes: { lane: RoadmapLane; label: string; epics: RoadmapEpic[] }[];
  summary: {
    total: number;
    byLane: Record<RoadmapLane, number>;
    byStatus: Record<string, number>;
  };
}

interface RoadmapCanvasProps {
  graphId: string;
  onEpicSelect?: (epicId: string) => void;
}

// =============================================================================
// Lane Configuration
// =============================================================================

const LANE_CONFIG: Record<RoadmapLane, { label: string; description: string }> = {
  now: {
    label: 'Now',
    description: 'Ready for immediate implementation. Fully committed.',
  },
  next: {
    label: 'Next',
    description: 'Committed but may need enablers before starting.',
  },
  later: {
    label: 'Later',
    description: 'Proposed work with unresolved decision factors.',
  },
  done: {
    label: 'Done',
    description: 'Completed work.',
  },
  dropped: {
    label: 'Dropped',
    description: 'Cancelled or abandoned work.',
  },
};

// =============================================================================
// Data Fetching
// =============================================================================

async function fetchRoadmap(graphId: string): Promise<RoadmapResponse> {
  // Always fetch all lanes - visibility is controlled client-side
  const params = new URLSearchParams({ graphId, all: 'true' });

  const response = await fetch(`/api/v1/graph/roadmap?${params}`);
  if (!response.ok) {
    throw new Error('Failed to fetch roadmap');
  }
  return response.json();
}

async function updateEpicLane(
  epicId: string,
  targetLane: RoadmapLane,
  graphId: string
): Promise<void> {
  const response = await fetch(`/api/v1/graph/nodes/${epicId}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      graphId,
      properties: { roadmap_lane: targetLane },
    }),
  });

  if (!response.ok) {
    throw new Error('Failed to update epic lane');
  }
}

// =============================================================================
// Component
// =============================================================================

export function RoadmapCanvas({ graphId, onEpicSelect }: RoadmapCanvasProps) {
  const [showAll, setShowAll] = useState(false);
  const [showFilters, setShowFilters] = useState(false);
  const queryClient = useQueryClient();

  // DnD Sensors
  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: { distance: 8 },
    }),
    useSensor(KeyboardSensor)
  );

  // Fetch roadmap data (always fetches all lanes)
  const { data, isLoading, error } = useQuery({
    queryKey: ['roadmap', graphId],
    queryFn: () => fetchRoadmap(graphId),
    staleTime: 30_000,
  });

  // All epics flattened for DnD
  const allEpics = data?.epics || [];

  // Mutation for moving epics
  const moveMutation = useMutation({
    mutationFn: ({ epicId, targetLane }: { epicId: string; targetLane: RoadmapLane }) =>
      updateEpicLane(epicId, targetLane, graphId),
    onMutate: async ({ epicId, targetLane }) => {
      // Cancel outgoing refetches
      await queryClient.cancelQueries({ queryKey: ['roadmap', graphId] });

      // Snapshot previous value
      const previousData = queryClient.getQueryData<RoadmapResponse>(['roadmap', graphId]);

      // Optimistically update
      if (previousData) {
        const updatedEpics = previousData.epics.map((epic) =>
          epic.id === epicId ? { ...epic, roadmap_lane: targetLane } : epic
        );

        // Rebuild lanes
        const updatedLanes = previousData.lanes.map((lane) => ({
          ...lane,
          epics: updatedEpics.filter((e) => e.roadmap_lane === lane.lane),
        }));

        queryClient.setQueryData<RoadmapResponse>(['roadmap', graphId], {
          ...previousData,
          epics: updatedEpics,
          lanes: updatedLanes,
        });
      }

      return { previousData };
    },
    onError: (_err, _vars, context) => {
      // Rollback on error
      if (context?.previousData) {
        queryClient.setQueryData(['roadmap', graphId], context.previousData);
      }
      console.error('Failed to move epic:', _err);
    },
    onSuccess: () => {
      console.log('Epic moved successfully');
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ['roadmap', graphId] });
    },
  });

  // Handle epic move
  const handleEpicMove = (epicId: string, targetLane: RoadmapLane) => {
    moveMutation.mutate({ epicId, targetLane });
  };

  // Handle prompt for decision factors (when moving to Later without factors)
  const handlePromptForFactors = (epic: RoadmapEpic, targetLane: RoadmapLane) => {
    // For now, just move it - the edit modal (t04) will handle factor selection
    console.log('Moving to Later - consider adding decision factors');
    handleEpicMove(epic.id, targetLane);
  };

  // DnD hook
  const {
    dragState,
    handleDragStart,
    handleDragOver,
    handleDragEnd,
    handleDragCancel,
    isDropAllowed,
  } = useRoadmapDnd({
    epics: allEpics,
    onMove: handleEpicMove,
    onPromptForFactors: handlePromptForFactors,
  });

  // Build lane groups with configuration
  const laneGroups: LaneGroup[] = (showAll
    ? (['now', 'next', 'later', 'done', 'dropped'] as RoadmapLane[])
    : (['now', 'next', 'later'] as RoadmapLane[])
  ).map((lane) => {
    const laneData = data?.lanes.find((l) => l.lane === lane);
    return {
      lane,
      label: LANE_CONFIG[lane].label,
      description: LANE_CONFIG[lane].description,
      epics: laneData?.epics || [],
    };
  });

  // Loading state
  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  // Error state
  if (error) {
    return (
      <div className="flex items-center justify-center h-64 text-destructive">
        Failed to load roadmap. Please try again.
      </div>
    );
  }

  // Calculate summary stats
  const summary = data?.summary;
  const committedCount = (summary?.byLane.now || 0) + (summary?.byLane.next || 0);
  const laterCount = summary?.byLane.later || 0;

  // Find the active epic for DragOverlay
  const activeEpic = dragState.activeEpic;

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCenter}
      onDragStart={handleDragStart}
      onDragOver={handleDragOver}
      onDragEnd={handleDragEnd}
      onDragCancel={handleDragCancel}
    >
      <div className="flex flex-col h-full">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-border">
          <div>
            <h1 className="text-xl font-mono font-semibold">Roadmap</h1>
            <p className="text-sm text-muted-foreground">
              {committedCount} committed · {laterCount} proposed
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setShowFilters(!showFilters)}
              className={showFilters ? 'bg-secondary' : ''}
            >
              <Filter className="w-4 h-4 mr-2" />
              Filters
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setShowAll(!showAll)}
            >
              {showAll ? 'Hide Done/Dropped' : 'Show All'}
            </Button>
            <Button variant="ghost" size="sm">
              <Settings className="w-4 h-4" />
            </Button>
          </div>
        </div>

        {/* Filter Panel (placeholder) */}
        {showFilters && (
          <div className="px-6 py-3 border-b border-border bg-secondary/30">
            <p className="text-sm text-muted-foreground">
              Filter controls coming in Task 5...
            </p>
          </div>
        )}

        {/* Canvas - Vertical Lane Stack */}
        <div className="flex-1 overflow-y-auto">
          <div className="max-w-4xl mx-auto py-6 px-4 space-y-6">
            {laneGroups.map((group) => (
              <LaneSection
                key={group.lane}
                lane={group.lane}
                label={group.label}
                description={group.description}
                epics={group.epics}
                onEpicSelect={onEpicSelect}
                isDropAllowed={isDropAllowed}
                isDragActive={dragState.activeId !== null}
              />
            ))}
          </div>
        </div>

        {/* Footer Summary */}
        {summary && (
          <div className="px-6 py-3 border-t border-border bg-secondary/30 text-sm text-muted-foreground">
            <span className="font-mono">
              {summary.total} epics total
              {summary.byStatus.in_progress > 0 && (
                <> · {summary.byStatus.in_progress} in progress</>
              )}
              {summary.byStatus.completed > 0 && (
                <> · {summary.byStatus.completed} completed</>
              )}
            </span>
          </div>
        )}
      </div>

      {/* Drag Overlay - shows the dragged card */}
      <DragOverlay>
        {activeEpic && (
          <EpicCard
            epic={activeEpic}
            lane={activeEpic.roadmap_lane}
            isDragging
          />
        )}
      </DragOverlay>
    </DndContext>
  );
}

export default RoadmapCanvas;
