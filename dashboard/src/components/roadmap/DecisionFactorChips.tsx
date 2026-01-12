/**
 * @fileType: component
 * @status: current
 * @updated: 2026-01-11
 * @tags: [roadmap, decision-factors, ADR-056]
 * @related: [EpicCard.tsx, EpicEditModal.tsx]
 * @priority: high
 * @complexity: low
 * @dependencies: [react, lucide-react]
 */
'use client';

import { AlertTriangle } from 'lucide-react';
import type { DecisionFactor } from '@/lib/graph/types';

// =============================================================================
// Types
// =============================================================================

interface DecisionFactorChipsProps {
  factors: DecisionFactor[];
  showIcon?: boolean;
  size?: 'sm' | 'md';
}

// =============================================================================
// Decision Factor Labels
// =============================================================================

const DECISION_FACTOR_LABELS: Record<DecisionFactor, string> = {
  planning: 'planning',
  value: 'value',
  feasibility: 'feasibility',
  advisability: 'advisability',
  architecture: 'architecture',
  design: 'design',
  risks: 'risks',
  'market-fit': 'market-fit',
  dependencies: 'dependencies',
};

// =============================================================================
// Component
// =============================================================================

export function DecisionFactorChips({
  factors,
  showIcon = true,
  size = 'sm',
}: DecisionFactorChipsProps) {
  if (!factors || factors.length === 0) {
    return null;
  }

  const sizeClasses = size === 'sm'
    ? 'text-xs px-1.5 py-0.5'
    : 'text-sm px-2 py-1';

  const iconSize = size === 'sm' ? 'w-3 h-3' : 'w-4 h-4';

  return (
    <div className="flex items-center gap-1.5">
      {showIcon && (
        <AlertTriangle className={`${iconSize} text-amber-500 flex-shrink-0`} />
      )}
      <div className="flex flex-wrap gap-1">
        {factors.map((factor) => (
          <span
            key={factor}
            className={`${sizeClasses} rounded bg-amber-500/10 text-amber-400 font-mono`}
          >
            {DECISION_FACTOR_LABELS[factor] || factor}
          </span>
        ))}
      </div>
    </div>
  );
}

export default DecisionFactorChips;
