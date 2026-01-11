/**
 * @fileType: component
 * @status: current
 * @updated: 2026-01-11
 * @tags: [roadmap, lane, now-next-later, ADR-056]
 * @related: [RoadmapCanvas.tsx, EpicCard.tsx]
 * @priority: high
 * @complexity: low
 * @dependencies: [react, lucide-react]
 */
'use client';

import { ChevronDown, ChevronRight, Plus } from 'lucide-react';
import { useState } from 'react';
import { EpicCard } from './EpicCard';
import type { RoadmapEpic } from './RoadmapCanvas';
import type { RoadmapLane } from '@/lib/graph/types';

// =============================================================================
// Types
// =============================================================================

interface LaneSectionProps {
  lane: RoadmapLane;
  label: string;
  description: string;
  epics: RoadmapEpic[];
  onEpicSelect?: (epicId: string) => void;
  onEpicMove?: (epicId: string, targetLane: RoadmapLane) => void;
}

// =============================================================================
// Lane Styling
// =============================================================================

const LANE_STYLES: Record<RoadmapLane, { border: string; badge: string; icon: string }> = {
  now: {
    border: 'border-l-primary',
    badge: 'bg-primary/20 text-primary',
    icon: 'text-primary',
  },
  next: {
    border: 'border-l-blue-500',
    badge: 'bg-blue-500/20 text-blue-400',
    icon: 'text-blue-400',
  },
  later: {
    border: 'border-l-muted-foreground',
    badge: 'bg-muted text-muted-foreground',
    icon: 'text-muted-foreground',
  },
  done: {
    border: 'border-l-green-600',
    badge: 'bg-green-600/20 text-green-400',
    icon: 'text-green-400',
  },
  dropped: {
    border: 'border-l-red-500/50',
    badge: 'bg-red-500/20 text-red-400',
    icon: 'text-red-400',
  },
};

// =============================================================================
// Component
// =============================================================================

export function LaneSection({
  lane,
  label,
  description,
  epics,
  onEpicSelect,
  onEpicMove,
}: LaneSectionProps) {
  const [isExpanded, setIsExpanded] = useState(true);
  const styles = LANE_STYLES[lane];
  const isEmpty = epics.length === 0;

  return (
    <div className={`border-l-4 ${styles.border} rounded-r-lg bg-card`}>
      {/* Lane Header */}
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="w-full flex items-center justify-between px-4 py-3 hover:bg-secondary/50 transition-colors rounded-tr-lg"
      >
        <div className="flex items-center gap-3">
          {isExpanded ? (
            <ChevronDown className={`w-4 h-4 ${styles.icon}`} />
          ) : (
            <ChevronRight className={`w-4 h-4 ${styles.icon}`} />
          )}
          <div className="text-left">
            <div className="flex items-center gap-2">
              <span className="font-mono font-semibold text-foreground">
                {label}
              </span>
              <span className={`text-xs px-2 py-0.5 rounded-full font-mono ${styles.badge}`}>
                {epics.length}
              </span>
            </div>
            <p className="text-xs text-muted-foreground">{description}</p>
          </div>
        </div>
        {lane === 'later' && (
          <button
            onClick={(e) => {
              e.stopPropagation();
              // TODO: Open create epic modal
            }}
            className="p-1 hover:bg-secondary rounded text-muted-foreground hover:text-foreground transition-colors"
            title="Add new epic"
          >
            <Plus className="w-4 h-4" />
          </button>
        )}
      </button>

      {/* Epic Cards */}
      {isExpanded && (
        <div className="px-4 pb-4 space-y-2">
          {isEmpty ? (
            <div className="py-8 text-center text-sm text-muted-foreground">
              {lane === 'now' && 'No work ready to start. Move items from Next when ready.'}
              {lane === 'next' && 'No committed work. Drag items from Later to commit.'}
              {lane === 'later' && 'No proposed work. Add epics to build your backlog.'}
              {lane === 'done' && 'No completed work yet.'}
              {lane === 'dropped' && 'No dropped items.'}
            </div>
          ) : (
            epics.map((epic) => (
              <EpicCard
                key={epic.id}
                epic={epic}
                lane={lane}
                onClick={() => onEpicSelect?.(epic.id)}
              />
            ))
          )}
        </div>
      )}
    </div>
  );
}

export default LaneSection;
