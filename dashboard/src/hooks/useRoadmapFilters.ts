/**
 * @fileType: hook
 * @status: current
 * @updated: 2026-01-11
 * @tags: [roadmap, filters, url-state, ADR-056]
 * @related: [RoadmapFilters.tsx, RoadmapCanvas.tsx]
 * @priority: medium
 * @complexity: medium
 * @dependencies: [react, next/navigation]
 */
'use client';

import { useState, useCallback, useMemo } from 'react';
import { useSearchParams, useRouter, usePathname } from 'next/navigation';
import type { RoadmapLane, DecisionFactor } from '@/lib/graph/types';
import type { RoadmapFiltersState } from '@/components/roadmap/RoadmapFilters';
import type { RoadmapEpic } from '@/components/roadmap/RoadmapCanvas';

// =============================================================================
// Default Filters
// =============================================================================

const DEFAULT_FILTERS: RoadmapFiltersState = {
  lanes: ['now', 'next', 'later'],
  statuses: [],
  decisionFactors: [],
  showInternal: true,
  tags: [],
};

// =============================================================================
// URL Parsing Helpers
// =============================================================================

function parseArrayParam(param: string | null): string[] {
  if (!param) return [];
  return param.split(',').filter(Boolean);
}

function serializeArrayParam(arr: string[]): string | null {
  if (arr.length === 0) return null;
  return arr.join(',');
}

// =============================================================================
// Hook
// =============================================================================

export function useRoadmapFilters() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();

  // Parse filters from URL
  const filters = useMemo<RoadmapFiltersState>(() => {
    const lanesParam = searchParams.get('lanes');
    const statusesParam = searchParams.get('statuses');
    const factorsParam = searchParams.get('factors');
    const tagsParam = searchParams.get('tags');
    const showInternalParam = searchParams.get('internal');

    return {
      lanes: lanesParam
        ? (parseArrayParam(lanesParam) as RoadmapLane[])
        : DEFAULT_FILTERS.lanes,
      statuses: parseArrayParam(statusesParam),
      decisionFactors: parseArrayParam(factorsParam) as DecisionFactor[],
      tags: parseArrayParam(tagsParam),
      showInternal: showInternalParam !== 'false',
    };
  }, [searchParams]);

  // Update filters and URL
  const setFilters = useCallback(
    (newFilters: RoadmapFiltersState) => {
      const params = new URLSearchParams(searchParams.toString());

      // Update lanes (only if not default)
      const lanesValue = serializeArrayParam(newFilters.lanes);
      if (lanesValue && newFilters.lanes.length !== 3) {
        params.set('lanes', lanesValue);
      } else {
        params.delete('lanes');
      }

      // Update statuses
      const statusesValue = serializeArrayParam(newFilters.statuses);
      if (statusesValue) {
        params.set('statuses', statusesValue);
      } else {
        params.delete('statuses');
      }

      // Update decision factors
      const factorsValue = serializeArrayParam(newFilters.decisionFactors);
      if (factorsValue) {
        params.set('factors', factorsValue);
      } else {
        params.delete('factors');
      }

      // Update tags
      const tagsValue = serializeArrayParam(newFilters.tags);
      if (tagsValue) {
        params.set('tags', tagsValue);
      } else {
        params.delete('tags');
      }

      // Update showInternal (only persist if false)
      if (!newFilters.showInternal) {
        params.set('internal', 'false');
      } else {
        params.delete('internal');
      }

      // Update URL
      const newUrl = params.toString()
        ? `${pathname}?${params.toString()}`
        : pathname;
      router.replace(newUrl, { scroll: false });
    },
    [searchParams, pathname, router]
  );

  // Filter epics based on current filters
  const filterEpics = useCallback(
    (epics: RoadmapEpic[]): RoadmapEpic[] => {
      return epics.filter((epic) => {
        // Lane filter
        if (!filters.lanes.includes(epic.roadmap_lane)) {
          return false;
        }

        // Status filter (if any selected)
        if (filters.statuses.length > 0 && !filters.statuses.includes(epic.roadmap_status)) {
          return false;
        }

        // Decision factor filter (if any selected, show epics that have ANY of the selected factors)
        if (filters.decisionFactors.length > 0) {
          const epicFactors = epic.decision_factors || [];
          const hasMatchingFactor = filters.decisionFactors.some((f) =>
            epicFactors.includes(f)
          );
          if (!hasMatchingFactor) {
            return false;
          }
        }

        // Visibility filter
        if (!filters.showInternal && !epic.roadmap_visible) {
          return false;
        }

        // Tag filter (if any selected, show epics that have ANY of the selected tags)
        if (filters.tags.length > 0) {
          const epicTags = epic.tags || [];
          const hasMatchingTag = filters.tags.some((t) => epicTags.includes(t));
          if (!hasMatchingTag) {
            return false;
          }
        }

        return true;
      });
    },
    [filters]
  );

  // Extract unique tags from epics
  const extractTags = useCallback((epics: RoadmapEpic[]): string[] => {
    const tagSet = new Set<string>();
    epics.forEach((epic) => {
      epic.tags?.forEach((tag) => tagSet.add(tag));
    });
    return Array.from(tagSet).sort();
  }, []);

  return {
    filters,
    setFilters,
    filterEpics,
    extractTags,
    isFiltered:
      filters.lanes.length !== 3 ||
      filters.statuses.length > 0 ||
      filters.decisionFactors.length > 0 ||
      !filters.showInternal ||
      filters.tags.length > 0,
  };
}

export default useRoadmapFilters;
