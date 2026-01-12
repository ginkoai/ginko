/**
 * @fileType: hook
 * @status: current
 * @updated: 2026-01-11
 * @tags: [roadmap, filters, url-state, ADR-056, performance, debounce]
 * @related: [RoadmapFilters.tsx, RoadmapCanvas.tsx]
 * @priority: medium
 * @complexity: medium
 * @dependencies: [react, next/navigation]
 */
'use client';

import { useState, useCallback, useMemo, useRef, useEffect } from 'react';
import { useSearchParams, useRouter, usePathname } from 'next/navigation';
import type { RoadmapLane, DecisionFactor } from '@/lib/graph/types';
import type { RoadmapFiltersState } from '@/components/roadmap/RoadmapFilters';
import type { RoadmapEpic } from '@/components/roadmap/RoadmapCanvas';

// =============================================================================
// Debounce Helper
// =============================================================================

const DEBOUNCE_MS = 300;

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function useDebouncedCallback<T extends (...args: any[]) => void>(
  callback: T,
  delay: number
): (...args: Parameters<T>) => void {
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);
  const callbackRef = useRef<T>(callback);

  // Keep callback ref up to date
  useEffect(() => {
    callbackRef.current = callback;
  }, [callback]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, []);

  // Return a stable debounced function
  const debouncedFn = useCallback(
    (...args: Parameters<T>) => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
      timeoutRef.current = setTimeout(() => {
        callbackRef.current(...args);
      }, delay);
    },
    [delay]
  );

  return debouncedFn;
}

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

  // Parse filters from URL (initial state)
  const urlFilters = useMemo<RoadmapFiltersState>(() => {
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

  // Local state for immediate UI updates (prevents lag during rapid changes)
  const [localFilters, setLocalFilters] = useState<RoadmapFiltersState>(urlFilters);

  // Sync local state when URL changes (e.g., browser back/forward)
  useEffect(() => {
    setLocalFilters(urlFilters);
  }, [urlFilters]);

  // Debounced URL update function
  const updateUrl = useCallback(
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

  // Debounced URL update (300ms delay)
  const debouncedUpdateUrl = useDebouncedCallback(updateUrl, DEBOUNCE_MS);

  // Update filters: immediate local state + debounced URL
  const setFilters = useCallback(
    (newFilters: RoadmapFiltersState) => {
      // Update local state immediately for responsive UI
      setLocalFilters(newFilters);
      // Debounce URL updates to prevent excessive re-renders
      debouncedUpdateUrl(newFilters);
    },
    [debouncedUpdateUrl]
  );

  // Use local filters for display (immediate updates)
  const filters = localFilters;

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
