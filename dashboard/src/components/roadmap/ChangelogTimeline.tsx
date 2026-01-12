/**
 * @fileType: component
 * @status: current
 * @updated: 2026-01-11
 * @tags: [roadmap, changelog, timeline, history, ADR-056]
 * @related: [EpicEditModal.tsx, RoadmapCanvas.tsx]
 * @priority: medium
 * @complexity: low
 * @dependencies: [react, lucide-react]
 */
'use client';

import { useState } from 'react';
import { Calendar, ArrowRight, ChevronDown, ChevronUp, Clock, FileEdit } from 'lucide-react';
import { Button } from '@/components/ui/button';

// =============================================================================
// Types
// =============================================================================

export interface ChangelogEntry {
  timestamp: string;
  field: string;
  from: string | null;
  to: string;
  reason?: string;
}

interface ChangelogTimelineProps {
  changelog: ChangelogEntry[];
  maxEntries?: number;
}

// =============================================================================
// Helpers
// =============================================================================

/** Format timestamp to readable date */
function formatDate(timestamp: string): string {
  const date = new Date(timestamp);
  return date.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}

/** Format timestamp to readable time */
function formatTime(timestamp: string): string {
  const date = new Date(timestamp);
  return date.toLocaleTimeString('en-US', {
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
  });
}

/** Get color class for field type */
function getFieldColor(field: string): string {
  switch (field.toLowerCase()) {
    case 'status':
    case 'roadmap_status':
      return 'text-blue-500';
    case 'lane':
    case 'roadmap_lane':
      return 'text-green-500';
    case 'decision_factors':
    case 'factors':
      return 'text-amber-500';
    case 'visible':
    case 'roadmap_visible':
      return 'text-purple-500';
    case 'created':
      return 'text-emerald-500';
    default:
      return 'text-muted-foreground';
  }
}

/** Get dot color class for field type */
function getDotColor(field: string): string {
  switch (field.toLowerCase()) {
    case 'status':
    case 'roadmap_status':
      return 'bg-blue-500';
    case 'lane':
    case 'roadmap_lane':
      return 'bg-green-500';
    case 'decision_factors':
    case 'factors':
      return 'bg-amber-500';
    case 'visible':
    case 'roadmap_visible':
      return 'bg-purple-500';
    case 'created':
      return 'bg-emerald-500';
    default:
      return 'bg-muted-foreground';
  }
}

/** Format field name for display */
function formatFieldName(field: string): string {
  return field
    .replace('roadmap_', '')
    .replace(/_/g, ' ')
    .replace(/\b\w/g, (l) => l.toUpperCase());
}

/** Format value for display */
function formatValue(value: string | null): string {
  if (value === null) return 'None';
  if (value === 'true') return 'Yes';
  if (value === 'false') return 'No';
  return value
    .replace(/_/g, ' ')
    .replace(/\b\w/g, (l) => l.toUpperCase());
}

// =============================================================================
// Component
// =============================================================================

export function ChangelogTimeline({
  changelog,
  maxEntries = 10,
}: ChangelogTimelineProps) {
  const [isExpanded, setIsExpanded] = useState(false);

  // Sort by timestamp descending (most recent first)
  const sortedChangelog = [...changelog].sort(
    (a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
  );

  // Determine visible entries
  const hasMore = sortedChangelog.length > maxEntries;
  const visibleEntries = isExpanded
    ? sortedChangelog
    : sortedChangelog.slice(0, maxEntries);

  // Empty state
  if (changelog.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-12 text-center">
        <FileEdit className="w-12 h-12 text-muted-foreground/50 mb-4" />
        <h3 className="text-lg font-medium text-muted-foreground">No History Yet</h3>
        <p className="text-sm text-muted-foreground/70 mt-1 max-w-[250px]">
          Changes to this epic will be recorded here.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-0">
      {/* Header */}
      <div className="flex items-center gap-2 mb-4">
        <Clock className="w-4 h-4 text-muted-foreground" />
        <h3 className="text-sm font-medium">Epic History</h3>
        <span className="text-xs text-muted-foreground">
          ({changelog.length} {changelog.length === 1 ? 'change' : 'changes'})
        </span>
      </div>

      {/* Timeline */}
      <div className="relative">
        {/* Vertical line */}
        <div className="absolute left-[7px] top-3 bottom-3 w-[2px] bg-border" />

        {/* Entries */}
        <div className="space-y-4">
          {visibleEntries.map((entry, index) => (
            <div key={`${entry.timestamp}-${entry.field}-${index}`} className="relative pl-6">
              {/* Dot */}
              <div
                className={`absolute left-0 top-1.5 w-4 h-4 rounded-full border-2 border-background ${getDotColor(entry.field)}`}
              />

              {/* Content */}
              <div className="space-y-1">
                {/* Date and time */}
                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                  <Calendar className="w-3 h-3" />
                  <span>{formatDate(entry.timestamp)}</span>
                  <span className="opacity-50">at</span>
                  <span>{formatTime(entry.timestamp)}</span>
                </div>

                {/* Change description */}
                <div className="flex items-center gap-2 text-sm">
                  <span className={`font-medium ${getFieldColor(entry.field)}`}>
                    {formatFieldName(entry.field)}:
                  </span>
                  {entry.from !== null ? (
                    <>
                      <span className="text-muted-foreground line-through">
                        {formatValue(entry.from)}
                      </span>
                      <ArrowRight className="w-3 h-3 text-muted-foreground" />
                      <span className="text-foreground font-medium">
                        {formatValue(entry.to)}
                      </span>
                    </>
                  ) : (
                    <span className="text-foreground font-medium">
                      {formatValue(entry.to)}
                    </span>
                  )}
                </div>

                {/* Reason (if provided) */}
                {entry.reason && (
                  <p className="text-sm text-muted-foreground italic pl-0.5">
                    &ldquo;{entry.reason}&rdquo;
                  </p>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Show more/less button */}
      {hasMore && (
        <div className="pt-4 pl-6">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setIsExpanded(!isExpanded)}
            className="text-xs"
          >
            {isExpanded ? (
              <>
                <ChevronUp className="w-3 h-3 mr-1" />
                Show less
              </>
            ) : (
              <>
                <ChevronDown className="w-3 h-3 mr-1" />
                Show {sortedChangelog.length - maxEntries} more
              </>
            )}
          </Button>
        </div>
      )}
    </div>
  );
}

export default ChangelogTimeline;
