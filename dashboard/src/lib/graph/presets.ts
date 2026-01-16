/**
 * @fileType: utility
 * @status: current
 * @updated: 2026-01-16
 * @tags: [graph, presets, localStorage, filters, views]
 * @related: [types.ts, tree-explorer.tsx, ViewPresets.tsx]
 * @priority: high
 * @complexity: medium
 * @dependencies: []
 */

import type { NodeFilters, ViewPreset } from './types';

// =============================================================================
// Constants
// =============================================================================

const PRESETS_STORAGE_KEY = 'ginko:view-presets';
const LAST_USED_PRESET_KEY = 'ginko:last-used-preset';

// =============================================================================
// Built-in Presets
// =============================================================================

export const BUILTIN_PRESETS: ViewPreset[] = [
  {
    id: 'all',
    name: 'All',
    description: 'Show all nodes without filtering',
    filters: {},
    isBuiltIn: true,
  },
  {
    id: 'active-sprint',
    name: 'Active Sprint',
    description: 'Show active sprints and their tasks',
    filters: {
      labels: ['Sprint'],
    },
    isBuiltIn: true,
  },
  {
    id: 'my-tasks',
    name: 'My Tasks',
    description: 'Show all tasks',
    filters: {
      labels: ['Task'],
    },
    isBuiltIn: true,
  },
  {
    id: 'architecture',
    name: 'Architecture',
    description: 'ADRs, Patterns, and Gotchas',
    filters: {
      labels: ['ADR', 'Pattern', 'Gotcha'],
    },
    isBuiltIn: true,
  },
  {
    id: 'recent',
    name: 'Recent Changes',
    description: 'Most recently updated nodes',
    filters: {
      sortBy: 'updated_at',
      sortOrder: 'desc',
    },
    isBuiltIn: true,
  },
];

// =============================================================================
// Storage Functions
// =============================================================================

/**
 * Get custom presets from localStorage
 */
export function getCustomPresets(): ViewPreset[] {
  if (typeof window === 'undefined') return [];

  try {
    const stored = localStorage.getItem(PRESETS_STORAGE_KEY);
    if (!stored) return [];

    const presets = JSON.parse(stored);
    // Ensure all custom presets have isBuiltIn: false
    return presets.map((preset: ViewPreset) => ({
      ...preset,
      isBuiltIn: false,
    }));
  } catch (error) {
    console.warn('Failed to load custom presets:', error);
    return [];
  }
}

/**
 * Save custom presets to localStorage
 */
export function saveCustomPresets(presets: ViewPreset[]): void {
  if (typeof window === 'undefined') return;

  try {
    // Only save non-builtin presets
    const customPresets = presets.filter((p) => !p.isBuiltIn);
    localStorage.setItem(PRESETS_STORAGE_KEY, JSON.stringify(customPresets));
  } catch (error) {
    console.warn('Failed to save custom presets:', error);
  }
}

/**
 * Get all presets (builtin + custom)
 */
export function getAllPresets(): ViewPreset[] {
  return [...BUILTIN_PRESETS, ...getCustomPresets()];
}

/**
 * Get last used preset ID from localStorage
 */
export function getLastUsedPresetId(): string | null {
  if (typeof window === 'undefined') return null;

  try {
    return localStorage.getItem(LAST_USED_PRESET_KEY);
  } catch {
    return null;
  }
}

/**
 * Save last used preset ID to localStorage
 */
export function saveLastUsedPresetId(presetId: string): void {
  if (typeof window === 'undefined') return;

  try {
    localStorage.setItem(LAST_USED_PRESET_KEY, presetId);
  } catch (error) {
    console.warn('Failed to save last used preset:', error);
  }
}

/**
 * Get a preset by ID (searches both builtin and custom)
 */
export function getPresetById(presetId: string): ViewPreset | null {
  const allPresets = getAllPresets();
  return allPresets.find((p) => p.id === presetId) || null;
}

// =============================================================================
// CRUD Operations for Custom Presets
// =============================================================================

/**
 * Create a new custom preset
 */
export function createCustomPreset(
  name: string,
  filters: NodeFilters,
  description?: string
): ViewPreset {
  const preset: ViewPreset = {
    id: `custom-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
    name,
    description,
    filters,
    isBuiltIn: false,
    createdAt: new Date().toISOString(),
  };

  const existingPresets = getCustomPresets();
  saveCustomPresets([...existingPresets, preset]);

  return preset;
}

/**
 * Update an existing custom preset
 */
export function updateCustomPreset(
  presetId: string,
  updates: Partial<Pick<ViewPreset, 'name' | 'description' | 'filters'>>
): ViewPreset | null {
  const presets = getCustomPresets();
  const index = presets.findIndex((p) => p.id === presetId);

  if (index === -1) {
    console.warn(`Preset not found: ${presetId}`);
    return null;
  }

  const updated = {
    ...presets[index],
    ...updates,
  };

  presets[index] = updated;
  saveCustomPresets(presets);

  return updated;
}

/**
 * Delete a custom preset
 */
export function deleteCustomPreset(presetId: string): boolean {
  const presets = getCustomPresets();
  const index = presets.findIndex((p) => p.id === presetId);

  if (index === -1) {
    console.warn(`Preset not found: ${presetId}`);
    return false;
  }

  presets.splice(index, 1);
  saveCustomPresets(presets);

  // If this was the last used preset, clear it
  if (getLastUsedPresetId() === presetId) {
    localStorage.removeItem(LAST_USED_PRESET_KEY);
  }

  return true;
}

// =============================================================================
// Utility Functions
// =============================================================================

/**
 * Check if two filter objects are equal
 */
export function areFiltersEqual(a: NodeFilters, b: NodeFilters): boolean {
  // Simple deep comparison for our filter structure
  const aLabels = a.labels?.sort().join(',') || '';
  const bLabels = b.labels?.sort().join(',') || '';

  return (
    aLabels === bLabels &&
    (a.search || '') === (b.search || '') &&
    (a.sortBy || 'created_at') === (b.sortBy || 'created_at') &&
    (a.sortOrder || 'asc') === (b.sortOrder || 'asc')
  );
}

/**
 * Find a preset that matches the current filters
 */
export function findMatchingPreset(filters: NodeFilters): ViewPreset | null {
  const allPresets = getAllPresets();
  return allPresets.find((preset) => areFiltersEqual(preset.filters, filters)) || null;
}

/**
 * Check if current filters differ from the active preset
 */
export function hasUnsavedChanges(
  currentFilters: NodeFilters,
  activePresetId: string | null
): boolean {
  if (!activePresetId) return Object.keys(currentFilters).length > 0;

  const preset = getPresetById(activePresetId);
  if (!preset) return true;

  return !areFiltersEqual(currentFilters, preset.filters);
}

// =============================================================================
// Debug Helpers (development only)
// =============================================================================

if (typeof window !== 'undefined' && process.env.NODE_ENV === 'development') {
  (window as unknown as { ginkoPresets: unknown }).ginkoPresets = {
    getAllPresets,
    getCustomPresets,
    getLastUsedPresetId,
    createCustomPreset,
    deleteCustomPreset,
    clearAll: () => {
      localStorage.removeItem(PRESETS_STORAGE_KEY);
      localStorage.removeItem(LAST_USED_PRESET_KEY);
    },
  };
}
