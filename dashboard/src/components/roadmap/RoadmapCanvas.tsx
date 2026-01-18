/**
 * @fileType: component
 * @status: current
 * @updated: 2026-01-11
 * @tags: [roadmap, canvas, now-next-later, ADR-056, priority, drag-drop, performance]
 * @related: [LaneSection.tsx, EpicCard.tsx, useRoadmapDnd.ts]
 * @priority: high
 * @complexity: medium
 * @dependencies: [react, @tanstack/react-query, @dnd-kit/core, lucide-react]
 */
'use client';

import { useState, useMemo, useCallback } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  DndContext,
  DragOverlay,
  closestCenter,
  KeyboardSensor,
  MouseSensor,
  TouchSensor,
  useSensor,
  useSensors,
  type DropAnimation,
} from '@dnd-kit/core';
import { Filter, Loader2 } from 'lucide-react';
import { LaneSection } from './LaneSection';
import { EpicCard } from './EpicCard';
import { EpicEditModal, type EpicRoadmapUpdate } from './EpicEditModal';
import { RoadmapFilters } from './RoadmapFilters';
import { Button } from '@/components/ui/button';
import { useRoadmapDnd } from '@/hooks/useRoadmapDnd';
import { useRoadmapFilters } from '@/hooks/useRoadmapFilters';
import { createClient } from '@/lib/supabase/client';
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

// Supabase client for auth
const supabase = createClient();

// Helper to get auth headers
async function getAuthHeaders(): Promise<Record<string, string>> {
  const { data: { session } } = await supabase.auth.getSession();
  return {
    'Content-Type': 'application/json',
    ...(session?.access_token && { 'Authorization': `Bearer ${session.access_token}` }),
  };
}

async function fetchRoadmap(graphId: string): Promise<RoadmapResponse> {
  // Always fetch all lanes - visibility is controlled client-side
  const params = new URLSearchParams({ graphId, all: 'true' });

  const headers = await getAuthHeaders();
  const response = await fetch(`/api/v1/graph/roadmap?${params}`, { headers });
  if (!response.ok) {
    const error = await response.json().catch(() => ({ error: { message: 'Failed to fetch roadmap' } }));
    throw new Error(error.error?.message || 'Failed to fetch roadmap');
  }
  return response.json();
}

async function updateEpicLane(
  epicId: string,
  targetLane: RoadmapLane,
  graphId: string
): Promise<void> {
  const headers = await getAuthHeaders();
  const response = await fetch(`/api/v1/graph/nodes/${epicId}?graphId=${graphId}`, {
    method: 'PATCH',
    headers,
    body: JSON.stringify({
      graphId,
      properties: { roadmap_lane: targetLane },
    }),
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({ error: { message: 'Failed to update epic lane' } }));
    throw new Error(error.error?.message || 'Failed to update epic lane');
  }
}

async function updateEpicProperties(
  epicId: string,
  updates: EpicRoadmapUpdate,
  graphId: string
): Promise<void> {
  const properties: Record<string, unknown> = {};

  if (updates.roadmap_lane !== undefined) properties.roadmap_lane = updates.roadmap_lane;
  if (updates.roadmap_status !== undefined) properties.roadmap_status = updates.roadmap_status;
  if (updates.decision_factors !== undefined) properties.decision_factors = updates.decision_factors;
  if (updates.roadmap_visible !== undefined) properties.roadmap_visible = updates.roadmap_visible;

  // Add changelog entry if reason provided
  if (updates.changelog_reason) {
    properties.changelog_entry = {
      timestamp: new Date().toISOString(),
      reason: updates.changelog_reason,
      changes: Object.keys(updates).filter(k => k !== 'changelog_reason'),
    };
  }

  const headers = await getAuthHeaders();
  const response = await fetch(`/api/v1/graph/nodes/${epicId}?graphId=${graphId}`, {
    method: 'PATCH',
    headers,
    body: JSON.stringify({ graphId, properties }),
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({ error: { message: 'Failed to update epic' } }));
    throw new Error(error.error?.message || 'Failed to update epic');
  }
}

// =============================================================================
// Component
// =============================================================================

export function RoadmapCanvas({ graphId, onEpicSelect }: RoadmapCanvasProps) {
  const [showFilters, setShowFilters] = useState(false);
  const [editingEpic, setEditingEpic] = useState<RoadmapEpic | null>(null);
  const queryClient = useQueryClient();

  // Filters hook
  const { filters, setFilters, filterEpics, extractTags, isFiltered } = useRoadmapFilters();

  // DnD Sensors - configured for both desktop and mobile
  // - MouseSensor: Desktop mouse only (not touch) with 8px distance threshold
  // - TouchSensor: Mobile touch with 250ms delay (long-press to drag, prevents scroll conflicts)
  // - KeyboardSensor: Accessibility support
  const sensors = useSensors(
    useSensor(MouseSensor, {
      activationConstraint: { distance: 8 },
    }),
    useSensor(TouchSensor, {
      activationConstraint: { delay: 250, tolerance: 8 },
    }),
    useSensor(KeyboardSensor)
  );

  // Fetch roadmap data (always fetches all lanes)
  const { data, isLoading, error } = useQuery({
    queryKey: ['roadmap', graphId],
    queryFn: () => fetchRoadmap(graphId),
    staleTime: 30_000,
  });

  // All epics flattened for DnD (unfiltered, needed for drag operations)
  // Memoized to prevent unnecessary recalculations
  const allEpics = useMemo(() => data?.epics || [], [data?.epics]);

  // Filtered epics for display - memoized for performance with 50+ epics
  const filteredEpics = useMemo(
    () => filterEpics(allEpics),
    [filterEpics, allEpics]
  );

  // Extract available tags for filter component - memoized
  const availableTags = useMemo(
    () => extractTags(allEpics),
    [extractTags, allEpics]
  );

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

  // Mutation for updating epic properties (from edit modal)
  const updateMutation = useMutation({
    mutationFn: ({ epicId, updates }: { epicId: string; updates: EpicRoadmapUpdate }) =>
      updateEpicProperties(epicId, updates, graphId),
    onMutate: async ({ epicId, updates }) => {
      await queryClient.cancelQueries({ queryKey: ['roadmap', graphId] });
      const previousData = queryClient.getQueryData<RoadmapResponse>(['roadmap', graphId]);

      if (previousData) {
        const updatedEpics = previousData.epics.map((epic) =>
          epic.id === epicId
            ? {
                ...epic,
                ...(updates.roadmap_lane && { roadmap_lane: updates.roadmap_lane }),
                ...(updates.roadmap_status && { roadmap_status: updates.roadmap_status }),
                ...(updates.decision_factors !== undefined && { decision_factors: updates.decision_factors }),
                ...(updates.roadmap_visible !== undefined && { roadmap_visible: updates.roadmap_visible }),
              }
            : epic
        );

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
      if (context?.previousData) {
        queryClient.setQueryData(['roadmap', graphId], context.previousData);
      }
      console.error('Failed to update epic:', _err);
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ['roadmap', graphId] });
    },
  });

  // Handle epic move - memoized callback for performance
  const handleEpicMove = useCallback((epicId: string, targetLane: RoadmapLane) => {
    moveMutation.mutate({ epicId, targetLane });
  }, [moveMutation]);

  // Handle prompt for decision factors (when moving to Later without factors)
  const handlePromptForFactors = useCallback((epic: RoadmapEpic, targetLane: RoadmapLane) => {
    // Open edit modal for the epic so user can add decision factors
    setEditingEpic({ ...epic, roadmap_lane: targetLane });
  }, []);

  // Handle epic click to open edit modal - memoized for stable reference
  const handleEpicClick = useCallback((epicId: string) => {
    const epic = allEpics.find((e) => e.id === epicId);
    if (epic) {
      setEditingEpic(epic);
    }
    // Note: Don't call onEpicSelect here - that's for external navigation
    // The edit modal is the primary action on click
  }, [allEpics]);

  // Handle save from edit modal - memoized callback
  const handleEpicSave = useCallback(async (updates: EpicRoadmapUpdate) => {
    if (!editingEpic) return;
    await updateMutation.mutateAsync({ epicId: editingEpic.id, updates });
  }, [editingEpic, updateMutation]);

  // Handle close modal - memoized to prevent creating new function on each render
  const handleCloseModal = useCallback(() => {
    setEditingEpic(null);
  }, []);

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

  // Calculate summary stats - memoized (must be before early returns)
  const { summary, committedCount, laterCount } = useMemo(() => {
    const sum = data?.summary;
    return {
      summary: sum,
      committedCount: (sum?.byLane.now || 0) + (sum?.byLane.next || 0),
      laterCount: sum?.byLane.later || 0,
    };
  }, [data?.summary]);

  // Build lane groups with filtered epics - memoized for performance
  // This computation runs O(lanes * epics) so memoization helps with 50+ epics
  // Lane visibility is controlled by filters.lanes (includes done/dropped when selected)
  const laneGroups = useMemo<LaneGroup[]>(() => {
    // Order lanes consistently: now, next, later, done, dropped
    const allLanes: RoadmapLane[] = ['now', 'next', 'later', 'done', 'dropped'];

    return allLanes
      .filter((lane) => filters.lanes.includes(lane))
      .map((lane) => {
        // Use filtered epics instead of raw lane data
        const laneEpics = filteredEpics.filter((e) => e.roadmap_lane === lane);
        return {
          lane,
          label: LANE_CONFIG[lane].label,
          description: LANE_CONFIG[lane].description,
          epics: laneEpics,
        };
      });
  }, [filters.lanes, filteredEpics]);

  // Find the active epic for DragOverlay (must be before early returns)
  const activeEpic = dragState.activeEpic;

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
        {/* Header - compact */}
        <div className="border-b border-border">
          <div className="flex items-center justify-between px-4 sm:px-6 py-2">
            <h1 className="text-lg font-mono font-semibold">Roadmap</h1>
            <Button
              variant={showFilters ? 'default' : 'ghost'}
              size="sm"
              onClick={() => setShowFilters(!showFilters)}
              className={!showFilters && isFiltered ? 'bg-secondary' : ''}
            >
              {showFilters ? (
                'Apply'
              ) : (
                <>
                  <Filter className="w-4 h-4" />
                  {isFiltered && (
                    <span className="ml-1 w-2 h-2 rounded-full bg-primary" />
                  )}
                </>
              )}
            </Button>
          </div>
          {/* Stats row */}
          {summary && (
            <div className="px-4 sm:px-6 pb-2 text-xs text-muted-foreground font-mono">
              {isFiltered ? (
                <span>{filteredEpics.length} of {summary.total} epics shown</span>
              ) : (
                <span>
                  {summary.total} epics
                  {summary.byStatus.in_progress > 0 && (
                    <> · {summary.byStatus.in_progress} in progress</>
                  )}
                  {summary.byStatus.completed > 0 && (
                    <> · {summary.byStatus.completed} done</>
                  )}
                </span>
              )}
            </div>
          )}
        </div>

        {/* Filter Panel */}
        {showFilters && (
          <div className="px-6 py-4 border-b border-border bg-secondary/30">
            <RoadmapFilters
              filters={filters}
              onChange={setFilters}
              availableTags={availableTags}
            />
          </div>
        )}

        {/* Canvas - Vertical Lane Stack */}
        <div className="flex-1 overflow-y-auto">
          <div className="max-w-7xl mx-auto py-6 px-4 lg:px-8 space-y-6">
            {laneGroups.map((group) => (
              <LaneSection
                key={group.lane}
                lane={group.lane}
                label={group.label}
                description={group.description}
                epics={group.epics}
                onEpicSelect={handleEpicClick}
                isDropAllowed={isDropAllowed}
                isDragActive={dragState.activeId !== null}
              />
            ))}
          </div>
        </div>

      </div>

      {/* Drag Overlay - shows the dragged card (lifted, rotated) */}
      <DragOverlay dropAnimation={null}>
        {activeEpic && (
          <EpicCard
            epic={activeEpic}
            lane={activeEpic.roadmap_lane}
            isDragging
            isOverlay
            isInvalidDrop={dragState.overLane !== null && !dragState.canDrop}
          />
        )}
      </DragOverlay>

      {/* Edit Modal */}
      <EpicEditModal
        epic={editingEpic}
        isOpen={editingEpic !== null}
        onClose={handleCloseModal}
        onSave={handleEpicSave}
      />
    </DndContext>
  );
}

export default RoadmapCanvas;
