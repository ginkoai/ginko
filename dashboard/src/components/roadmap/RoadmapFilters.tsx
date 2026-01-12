/**
 * @fileType: component
 * @status: current
 * @updated: 2026-01-11
 * @tags: [roadmap, filters, lane, status, decision-factors, ADR-056]
 * @related: [RoadmapCanvas.tsx, useRoadmapFilters.ts]
 * @priority: medium
 * @complexity: medium
 * @dependencies: [react, lucide-react]
 */
'use client';

import { X, Eye, EyeOff, Filter } from 'lucide-react';
import { Button } from '@/components/ui/button';
import type { RoadmapLane, DecisionFactor } from '@/lib/graph/types';

// =============================================================================
// Types
// =============================================================================

export interface RoadmapFiltersState {
  lanes: RoadmapLane[];
  statuses: string[];
  decisionFactors: DecisionFactor[];
  showInternal: boolean;
  tags: string[];
}

interface RoadmapFiltersProps {
  filters: RoadmapFiltersState;
  onChange: (filters: RoadmapFiltersState) => void;
  availableTags?: string[];
}

// =============================================================================
// Configuration
// =============================================================================

const LANE_OPTIONS: { value: RoadmapLane; label: string }[] = [
  { value: 'now', label: 'Now' },
  { value: 'next', label: 'Next' },
  { value: 'later', label: 'Later' },
  { value: 'done', label: 'Done' },
  { value: 'dropped', label: 'Dropped' },
];

const STATUS_OPTIONS: { value: string; label: string }[] = [
  { value: 'not_started', label: 'Not Started' },
  { value: 'in_progress', label: 'In Progress' },
  { value: 'completed', label: 'Completed' },
  { value: 'cancelled', label: 'Cancelled' },
];

const DECISION_FACTOR_OPTIONS: { value: DecisionFactor; label: string }[] = [
  { value: 'planning', label: 'Planning' },
  { value: 'value', label: 'Value' },
  { value: 'feasibility', label: 'Feasibility' },
  { value: 'advisability', label: 'Advisability' },
  { value: 'architecture', label: 'Architecture' },
  { value: 'design', label: 'Design' },
  { value: 'risks', label: 'Risks' },
  { value: 'market-fit', label: 'Market Fit' },
  { value: 'dependencies', label: 'Dependencies' },
];

// =============================================================================
// Default Filters
// =============================================================================

export const DEFAULT_FILTERS: RoadmapFiltersState = {
  lanes: ['now', 'next', 'later'],
  statuses: [],
  decisionFactors: [],
  showInternal: true,
  tags: [],
};

// =============================================================================
// Component
// =============================================================================

export function RoadmapFilters({ filters, onChange, availableTags = [] }: RoadmapFiltersProps) {
  // Toggle helpers
  const toggleLane = (lane: RoadmapLane) => {
    const newLanes = filters.lanes.includes(lane)
      ? filters.lanes.filter((l) => l !== lane)
      : [...filters.lanes, lane];
    // Ensure at least one lane is selected
    if (newLanes.length > 0) {
      onChange({ ...filters, lanes: newLanes });
    }
  };

  const toggleStatus = (status: string) => {
    const newStatuses = filters.statuses.includes(status)
      ? filters.statuses.filter((s) => s !== status)
      : [...filters.statuses, status];
    onChange({ ...filters, statuses: newStatuses });
  };

  const toggleDecisionFactor = (factor: DecisionFactor) => {
    const newFactors = filters.decisionFactors.includes(factor)
      ? filters.decisionFactors.filter((f) => f !== factor)
      : [...filters.decisionFactors, factor];
    onChange({ ...filters, decisionFactors: newFactors });
  };

  const toggleTag = (tag: string) => {
    const newTags = filters.tags.includes(tag)
      ? filters.tags.filter((t) => t !== tag)
      : [...filters.tags, tag];
    onChange({ ...filters, tags: newTags });
  };

  const clearFilters = () => {
    onChange(DEFAULT_FILTERS);
  };

  // Check if any filters are active (default is 3 lanes: now, next, later)
  const hasActiveFilters =
    filters.lanes.length !== 3 ||
    filters.lanes.includes('done') ||
    filters.lanes.includes('dropped') ||
    filters.statuses.length > 0 ||
    filters.decisionFactors.length > 0 ||
    !filters.showInternal ||
    filters.tags.length > 0;

  return (
    <div className="space-y-4">
      {/* Lane Filters */}
      <div className="space-y-2">
        <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
          Lanes
        </label>
        <div className="flex flex-wrap gap-2">
          {LANE_OPTIONS.map(({ value, label }) => {
            const isActive = filters.lanes.includes(value);
            return (
              <button
                key={value}
                onClick={() => toggleLane(value)}
                className={`
                  px-3 py-1.5 text-sm font-medium rounded-full transition-colors
                  ${isActive
                    ? 'bg-primary text-primary-foreground'
                    : 'bg-secondary text-muted-foreground hover:text-foreground'
                  }
                `}
              >
                {label}
              </button>
            );
          })}
        </div>
      </div>

      {/* Status Filters */}
      <div className="space-y-2">
        <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
          Status
        </label>
        <div className="flex flex-wrap gap-2">
          {STATUS_OPTIONS.map(({ value, label }) => {
            const isActive = filters.statuses.includes(value);
            return (
              <button
                key={value}
                onClick={() => toggleStatus(value)}
                className={`
                  px-3 py-1.5 text-sm font-medium rounded-full transition-colors
                  ${isActive
                    ? 'bg-blue-500 text-white'
                    : 'bg-secondary text-muted-foreground hover:text-foreground'
                  }
                `}
              >
                {label}
              </button>
            );
          })}
        </div>
      </div>

      {/* Decision Factor Filters */}
      <div className="space-y-2">
        <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
          Decision Factors
        </label>
        <div className="flex flex-wrap gap-2">
          {DECISION_FACTOR_OPTIONS.map(({ value, label }) => {
            const isActive = filters.decisionFactors.includes(value);
            return (
              <button
                key={value}
                onClick={() => toggleDecisionFactor(value)}
                className={`
                  px-3 py-1.5 text-sm font-medium rounded-full transition-colors
                  ${isActive
                    ? 'bg-amber-500 text-white'
                    : 'bg-secondary text-muted-foreground hover:text-foreground'
                  }
                `}
              >
                {label}
              </button>
            );
          })}
        </div>
      </div>

      {/* Tags Filter (if tags available) */}
      {availableTags.length > 0 && (
        <div className="space-y-2">
          <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
            Tags
          </label>
          <div className="flex flex-wrap gap-2">
            {availableTags.slice(0, 12).map((tag) => {
              const isActive = filters.tags.includes(tag);
              return (
                <button
                  key={tag}
                  onClick={() => toggleTag(tag)}
                  className={`
                    px-3 py-1.5 text-sm font-medium rounded-full transition-colors
                    ${isActive
                      ? 'bg-purple-500 text-white'
                      : 'bg-secondary text-muted-foreground hover:text-foreground'
                    }
                  `}
                >
                  {tag}
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* Visibility Toggle + Clear */}
      <div className="flex items-center justify-between pt-2 border-t border-border">
        <button
          onClick={() => onChange({ ...filters, showInternal: !filters.showInternal })}
          className={`
            flex items-center gap-2 px-3 py-1.5 text-sm rounded-lg transition-colors
            ${filters.showInternal
              ? 'text-foreground'
              : 'text-muted-foreground bg-secondary'
            }
          `}
        >
          {filters.showInternal ? (
            <Eye className="w-4 h-4" />
          ) : (
            <EyeOff className="w-4 h-4" />
          )}
          {filters.showInternal ? 'Showing internal' : 'Hiding internal'}
        </button>

        {hasActiveFilters && (
          <Button
            variant="ghost"
            size="sm"
            onClick={clearFilters}
            className="text-muted-foreground"
          >
            <X className="w-4 h-4 mr-1" />
            Clear filters
          </Button>
        )}
      </div>

      {/* Active Filter Summary */}
      {hasActiveFilters && (
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <Filter className="w-3 h-3" />
          <span>
            {filters.lanes.length} lane{filters.lanes.length !== 1 ? 's' : ''}
            {filters.statuses.length > 0 && ` · ${filters.statuses.length} status`}
            {filters.decisionFactors.length > 0 && ` · ${filters.decisionFactors.length} factor`}
            {filters.tags.length > 0 && ` · ${filters.tags.length} tag`}
          </span>
        </div>
      )}
    </div>
  );
}

export default RoadmapFilters;
