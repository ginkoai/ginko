/**
 * @fileType: component
 * @status: current
 * @updated: 2026-01-11
 * @tags: [roadmap, decision-factors, ADR-056, form, multi-select]
 * @related: [EpicEditModal.tsx, DecisionFactorChips.tsx]
 * @priority: high
 * @complexity: low
 * @dependencies: [react, lucide-react]
 */
'use client';

import { AlertTriangle, Check } from 'lucide-react';
import type { DecisionFactor } from '@/lib/graph/types';

// =============================================================================
// Types
// =============================================================================

interface DecisionFactorSelectorProps {
  selected: DecisionFactor[];
  onChange: (factors: DecisionFactor[]) => void;
  disabled?: boolean;
}

// =============================================================================
// Decision Factor Configuration
// =============================================================================

const DECISION_FACTORS: { value: DecisionFactor; label: string; description: string }[] = [
  { value: 'planning', label: 'Planning', description: 'Needs scope definition or breakdown' },
  { value: 'value', label: 'Value', description: 'Business value not yet validated' },
  { value: 'feasibility', label: 'Feasibility', description: 'Technical feasibility uncertain' },
  { value: 'advisability', label: 'Advisability', description: 'Strategic fit needs review' },
  { value: 'architecture', label: 'Architecture', description: 'Requires architectural decisions' },
  { value: 'design', label: 'Design', description: 'UX/UI design work needed' },
  { value: 'risks', label: 'Risks', description: 'Risk assessment pending' },
  { value: 'market-fit', label: 'Market Fit', description: 'Market validation needed' },
  { value: 'dependencies', label: 'Dependencies', description: 'Blocked by other work' },
];

// =============================================================================
// Component
// =============================================================================

export function DecisionFactorSelector({
  selected,
  onChange,
  disabled = false,
}: DecisionFactorSelectorProps) {
  const handleToggle = (factor: DecisionFactor) => {
    if (disabled) return;

    if (selected.includes(factor)) {
      onChange(selected.filter((f) => f !== factor));
    } else {
      onChange([...selected, factor]);
    }
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2 text-sm text-muted-foreground">
        <AlertTriangle className="w-4 h-4 text-amber-500" />
        <span>What&apos;s blocking this work from being committed?</span>
      </div>

      <div className="grid grid-cols-3 gap-2">
        {DECISION_FACTORS.map(({ value, label, description }) => {
          const isSelected = selected.includes(value);
          return (
            <button
              key={value}
              type="button"
              onClick={() => handleToggle(value)}
              disabled={disabled}
              className={`
                relative flex items-start gap-2 p-3 rounded-lg border text-left
                transition-all duration-150
                ${isSelected
                  ? 'border-amber-500/50 bg-amber-500/10 text-foreground'
                  : 'border-border bg-card hover:border-muted-foreground/30'
                }
                ${disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}
              `}
              title={description}
            >
              <div
                className={`
                  flex-shrink-0 w-4 h-4 rounded border mt-0.5
                  ${isSelected
                    ? 'bg-amber-500 border-amber-500'
                    : 'border-muted-foreground/30'
                  }
                `}
              >
                {isSelected && <Check className="w-4 h-4 text-white" />}
              </div>
              <div className="min-w-0">
                <div className="text-sm font-medium truncate">{label}</div>
                <div className="text-xs text-muted-foreground line-clamp-1">
                  {description}
                </div>
              </div>
            </button>
          );
        })}
      </div>

      {selected.length > 0 && (
        <div className="text-xs text-muted-foreground">
          {selected.length} factor{selected.length !== 1 ? 's' : ''} selected
        </div>
      )}
    </div>
  );
}

export default DecisionFactorSelector;
