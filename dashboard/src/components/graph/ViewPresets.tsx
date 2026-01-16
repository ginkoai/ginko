/**
 * @fileType: component
 * @status: current
 * @updated: 2026-01-16
 * @tags: [graph, presets, filters, dropdown, views]
 * @related: [presets.ts, tree-explorer.tsx, types.ts]
 * @priority: high
 * @complexity: medium
 * @dependencies: [lucide-react]
 */

'use client';

import { useState, useCallback, useEffect, useRef, memo } from 'react';
import {
  ChevronDown,
  Check,
  Plus,
  Trash2,
  Bookmark,
  BookmarkPlus,
} from 'lucide-react';
import type { NodeFilters, ViewPreset } from '@/lib/graph/types';
import {
  getAllPresets,
  getLastUsedPresetId,
  saveLastUsedPresetId,
  getPresetById,
  createCustomPreset,
  deleteCustomPreset,
  hasUnsavedChanges,
} from '@/lib/graph/presets';
import { cn } from '@/lib/utils';

// =============================================================================
// Types
// =============================================================================

export interface ViewPresetsProps {
  /** Current filter state */
  currentFilters: NodeFilters;
  /** Callback when a preset is selected */
  onPresetSelect: (filters: NodeFilters) => void;
  /** Optional class name */
  className?: string;
}

// =============================================================================
// Component
// =============================================================================

export function ViewPresets({
  currentFilters,
  onPresetSelect,
  className,
}: ViewPresetsProps) {
  // State
  const [isOpen, setIsOpen] = useState(false);
  const [activePresetId, setActivePresetId] = useState<string | null>(null);
  const [presets, setPresets] = useState<ViewPreset[]>([]);
  const [showSaveDialog, setShowSaveDialog] = useState(false);
  const [newPresetName, setNewPresetName] = useState('');
  const [saveError, setSaveError] = useState<string | null>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Load presets and last-used preset on mount
  useEffect(() => {
    const loadedPresets = getAllPresets();
    setPresets(loadedPresets);

    const lastUsedId = getLastUsedPresetId();
    if (lastUsedId) {
      const preset = getPresetById(lastUsedId);
      if (preset) {
        setActivePresetId(lastUsedId);
        // Apply the last-used preset filters on mount
        onPresetSelect(preset.filters);
      }
    }
    // Only run on mount
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
        setShowSaveDialog(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Focus input when save dialog opens
  useEffect(() => {
    if (showSaveDialog && inputRef.current) {
      inputRef.current.focus();
    }
  }, [showSaveDialog]);

  // Handle preset selection
  const handleSelectPreset = useCallback(
    (preset: ViewPreset) => {
      setActivePresetId(preset.id);
      saveLastUsedPresetId(preset.id);
      onPresetSelect(preset.filters);
      setIsOpen(false);
    },
    [onPresetSelect]
  );

  // Handle save current view as preset
  const handleSavePreset = useCallback(() => {
    const trimmedName = newPresetName.trim();

    if (!trimmedName) {
      setSaveError('Please enter a name');
      return;
    }

    // Check for duplicate names
    if (presets.some((p) => p.name.toLowerCase() === trimmedName.toLowerCase())) {
      setSaveError('A preset with this name already exists');
      return;
    }

    const newPreset = createCustomPreset(trimmedName, currentFilters);
    setPresets(getAllPresets());
    setActivePresetId(newPreset.id);
    saveLastUsedPresetId(newPreset.id);
    setNewPresetName('');
    setSaveError(null);
    setShowSaveDialog(false);
    setIsOpen(false);
  }, [newPresetName, currentFilters, presets]);

  // Handle delete custom preset
  const handleDeletePreset = useCallback(
    (presetId: string, event: React.MouseEvent) => {
      event.stopPropagation();
      deleteCustomPreset(presetId);
      setPresets(getAllPresets());

      // If we deleted the active preset, clear the selection
      if (activePresetId === presetId) {
        setActivePresetId('all');
        const allPreset = getPresetById('all');
        if (allPreset) {
          onPresetSelect(allPreset.filters);
          saveLastUsedPresetId('all');
        }
      }
    },
    [activePresetId, onPresetSelect]
  );

  // Get current active preset for display
  const activePreset = activePresetId ? getPresetById(activePresetId) : null;
  const hasChanges = hasUnsavedChanges(currentFilters, activePresetId);

  // Separate builtin and custom presets
  const builtinPresets = presets.filter((p) => p.isBuiltIn);
  const customPresets = presets.filter((p) => !p.isBuiltIn);

  return (
    <div ref={dropdownRef} className={cn('relative', className)}>
      {/* Dropdown Trigger */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className={cn(
          'flex items-center gap-2 px-3 py-1.5 text-sm font-mono rounded border',
          'transition-colors min-w-[140px]',
          'bg-background border-border hover:bg-white/5',
          isOpen && 'ring-1 ring-ginko-500/50'
        )}
        aria-expanded={isOpen}
        aria-haspopup="listbox"
      >
        <Bookmark className="w-3.5 h-3.5 text-muted-foreground" />
        <span className="flex-1 text-left truncate">
          {activePreset?.name || 'Select view'}
          {hasChanges && (
            <span className="ml-1 text-amber-400" title="Unsaved changes">
              *
            </span>
          )}
        </span>
        <ChevronDown
          className={cn(
            'w-3.5 h-3.5 text-muted-foreground transition-transform',
            isOpen && 'rotate-180'
          )}
        />
      </button>

      {/* Dropdown Menu */}
      {isOpen && (
        <div
          className={cn(
            'absolute top-full left-0 mt-1 z-50',
            'min-w-[220px] max-w-[280px] p-1',
            'bg-card border border-border rounded-lg shadow-lg',
            'animate-in fade-in-0 zoom-in-95 duration-100'
          )}
          role="listbox"
        >
          {/* Built-in Presets */}
          <div className="px-2 py-1 text-[10px] uppercase tracking-wider text-muted-foreground font-medium">
            Built-in Views
          </div>
          {builtinPresets.map((preset) => (
            <button
              key={preset.id}
              onClick={() => handleSelectPreset(preset)}
              className={cn(
                'w-full flex items-center gap-2 px-2 py-1.5 text-sm rounded',
                'transition-colors text-left',
                activePresetId === preset.id
                  ? 'bg-ginko-500/10 text-ginko-400'
                  : 'hover:bg-white/5'
              )}
              role="option"
              aria-selected={activePresetId === preset.id}
            >
              {activePresetId === preset.id ? (
                <Check className="w-3.5 h-3.5 flex-shrink-0" />
              ) : (
                <span className="w-3.5" />
              )}
              <span className="flex-1 truncate font-mono">{preset.name}</span>
            </button>
          ))}

          {/* Custom Presets */}
          {customPresets.length > 0 && (
            <>
              <div className="border-t border-border my-1" />
              <div className="px-2 py-1 text-[10px] uppercase tracking-wider text-muted-foreground font-medium">
                Custom Views
              </div>
              {customPresets.map((preset) => (
                <button
                  key={preset.id}
                  onClick={() => handleSelectPreset(preset)}
                  className={cn(
                    'w-full flex items-center gap-2 px-2 py-1.5 text-sm rounded group',
                    'transition-colors text-left',
                    activePresetId === preset.id
                      ? 'bg-ginko-500/10 text-ginko-400'
                      : 'hover:bg-white/5'
                  )}
                  role="option"
                  aria-selected={activePresetId === preset.id}
                >
                  {activePresetId === preset.id ? (
                    <Check className="w-3.5 h-3.5 flex-shrink-0" />
                  ) : (
                    <span className="w-3.5" />
                  )}
                  <span className="flex-1 truncate font-mono">{preset.name}</span>
                  <button
                    onClick={(e) => handleDeletePreset(preset.id, e)}
                    className="opacity-0 group-hover:opacity-100 p-0.5 hover:bg-red-500/20 rounded transition-all"
                    aria-label={`Delete ${preset.name} preset`}
                  >
                    <Trash2 className="w-3 h-3 text-red-400" />
                  </button>
                </button>
              ))}
            </>
          )}

          {/* Save Current View */}
          <div className="border-t border-border my-1" />

          {!showSaveDialog ? (
            <button
              onClick={() => {
                setShowSaveDialog(true);
                setSaveError(null);
              }}
              className={cn(
                'w-full flex items-center gap-2 px-2 py-1.5 text-sm rounded',
                'transition-colors text-left hover:bg-white/5',
                'text-muted-foreground hover:text-foreground'
              )}
            >
              <BookmarkPlus className="w-3.5 h-3.5" />
              <span className="font-mono">Save current view...</span>
            </button>
          ) : (
            <div className="px-2 py-2 space-y-2">
              <div className="flex items-center gap-1">
                <Plus className="w-3.5 h-3.5 text-muted-foreground" />
                <span className="text-xs text-muted-foreground">New preset</span>
              </div>
              <input
                ref={inputRef}
                type="text"
                value={newPresetName}
                onChange={(e) => {
                  setNewPresetName(e.target.value);
                  setSaveError(null);
                }}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    handleSavePreset();
                  } else if (e.key === 'Escape') {
                    setShowSaveDialog(false);
                    setNewPresetName('');
                    setSaveError(null);
                  }
                }}
                placeholder="Preset name"
                className={cn(
                  'w-full px-2 py-1 text-sm font-mono',
                  'bg-background border rounded',
                  saveError ? 'border-red-500/50' : 'border-border',
                  'focus:outline-none focus:ring-1 focus:ring-ginko-500/50'
                )}
              />
              {saveError && (
                <p className="text-[10px] text-red-400">{saveError}</p>
              )}
              <div className="flex gap-1">
                <button
                  onClick={handleSavePreset}
                  className={cn(
                    'flex-1 px-2 py-1 text-xs font-mono rounded',
                    'bg-ginko-500/20 text-ginko-400 hover:bg-ginko-500/30',
                    'transition-colors'
                  )}
                >
                  Save
                </button>
                <button
                  onClick={() => {
                    setShowSaveDialog(false);
                    setNewPresetName('');
                    setSaveError(null);
                  }}
                  className={cn(
                    'px-2 py-1 text-xs font-mono rounded',
                    'hover:bg-white/5 transition-colors'
                  )}
                >
                  Cancel
                </button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// =============================================================================
// Export (memoized for performance)
// =============================================================================

export default memo(ViewPresets);
