/**
 * @fileType: component
 * @status: current
 * @updated: 2026-01-11
 * @tags: [roadmap, public, read-only, now-next-later, ADR-056]
 * @related: [RoadmapCanvas.tsx, LaneSection.tsx, EpicCard.tsx]
 * @priority: high
 * @complexity: medium
 * @dependencies: [react, @tanstack/react-query, lucide-react]
 */
'use client';

import { useQuery } from '@tanstack/react-query';
import { Circle, CircleDot, CheckCircle2, Loader2, MapPin } from 'lucide-react';
import { Card } from '@/components/ui/card';
import type { RoadmapLane, DecisionFactor } from '@/lib/graph/types';

// =============================================================================
// Types
// =============================================================================

export interface PublicRoadmapViewProps {
  projectId: string;
  projectName?: string;
}

interface PublicEpic {
  id: string;
  title: string;
  description?: string;
  roadmap_lane: RoadmapLane;
  roadmap_status: 'not_started' | 'in_progress' | 'completed' | 'cancelled';
  roadmap_visible?: boolean;
  decision_factors?: DecisionFactor[];
  tags?: string[];
}

interface PublicRoadmapResponse {
  epics: PublicEpic[];
  lanes: { lane: RoadmapLane; label: string; epics: PublicEpic[] }[];
  summary: {
    total: number;
    byLane: Record<RoadmapLane, number>;
    byStatus: Record<string, number>;
  };
}

// =============================================================================
// Lane Configuration (Public view - excludes Done/Dropped)
// =============================================================================

const PUBLIC_LANES: { lane: RoadmapLane; label: string; description: string }[] = [
  {
    lane: 'now',
    label: 'Now',
    description: 'Currently in progress',
  },
  {
    lane: 'next',
    label: 'Next',
    description: 'Coming up soon',
  },
  {
    lane: 'later',
    label: 'Later',
    description: 'On our radar',
  },
];

const LANE_STYLES: Record<RoadmapLane, { border: string; badge: string; header: string }> = {
  now: {
    border: 'border-l-emerald-500',
    badge: 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400',
    header: 'text-emerald-600 dark:text-emerald-400',
  },
  next: {
    border: 'border-l-blue-500',
    badge: 'bg-blue-500/10 text-blue-600 dark:text-blue-400',
    header: 'text-blue-600 dark:text-blue-400',
  },
  later: {
    border: 'border-l-slate-400',
    badge: 'bg-slate-500/10 text-slate-600 dark:text-slate-400',
    header: 'text-slate-600 dark:text-slate-400',
  },
  done: {
    border: 'border-l-green-600',
    badge: 'bg-green-600/20 text-green-600',
    header: 'text-green-600',
  },
  dropped: {
    border: 'border-l-red-500/50',
    badge: 'bg-red-500/20 text-red-500',
    header: 'text-red-500',
  },
};

// =============================================================================
// Status Icons
// =============================================================================

const STATUS_CONFIG: Record<string, { icon: typeof Circle; className: string; label: string }> = {
  not_started: { icon: Circle, className: 'text-slate-400', label: 'Planned' },
  in_progress: { icon: CircleDot, className: 'text-emerald-500', label: 'In Progress' },
  completed: { icon: CheckCircle2, className: 'text-green-500', label: 'Completed' },
  cancelled: { icon: Circle, className: 'text-slate-300', label: 'Cancelled' },
};

// =============================================================================
// Data Fetching
// =============================================================================

async function fetchPublicRoadmap(projectId: string): Promise<PublicRoadmapResponse> {
  // Fetch only visible items (visible=true is default, but we explicitly include 'later' lane)
  const params = new URLSearchParams({
    graphId: projectId,
    all: 'true', // Need to include 'later' lane
    visible: 'true',
  });

  const response = await fetch(`/api/v1/graph/roadmap?${params}`);
  if (!response.ok) {
    throw new Error('Failed to fetch roadmap');
  }
  return response.json();
}

// =============================================================================
// Sub-Components
// =============================================================================

function PublicEpicCard({ epic, lane }: { epic: PublicEpic; lane: RoadmapLane }) {
  const statusConfig = STATUS_CONFIG[epic.roadmap_status] || STATUS_CONFIG.not_started;
  const StatusIcon = statusConfig.icon;

  // Extract display ID
  const displayId = epic.id.toUpperCase().replace(/^E(\d+)/, 'EPIC-$1');

  return (
    <Card className="p-4 hover:shadow-sm transition-shadow">
      <div className="flex items-start gap-3">
        {/* Status Icon */}
        <div className={`mt-0.5 ${statusConfig.className}`}>
          <StatusIcon className="w-5 h-5" />
        </div>

        {/* Content */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <span className="text-xs font-mono text-muted-foreground">
              {displayId}
            </span>
            {epic.roadmap_status === 'in_progress' && (
              <span className="text-xs px-1.5 py-0.5 rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
                Active
              </span>
            )}
          </div>
          <h3 className="font-medium text-foreground leading-tight">
            {epic.title}
          </h3>

          {/* Description (if available, truncated) */}
          {epic.description && (
            <p className="text-sm text-muted-foreground mt-1 line-clamp-2">
              {epic.description}
            </p>
          )}

          {/* Tags */}
          {epic.tags && epic.tags.length > 0 && (
            <div className="flex flex-wrap gap-1 mt-2">
              {epic.tags.slice(0, 4).map((tag) => (
                <span
                  key={tag}
                  className="text-xs px-2 py-0.5 rounded-full bg-secondary text-muted-foreground"
                >
                  {tag}
                </span>
              ))}
              {epic.tags.length > 4 && (
                <span className="text-xs text-muted-foreground">
                  +{epic.tags.length - 4}
                </span>
              )}
            </div>
          )}
        </div>
      </div>
    </Card>
  );
}

function PublicLaneSection({
  lane,
  label,
  description,
  epics,
}: {
  lane: RoadmapLane;
  label: string;
  description: string;
  epics: PublicEpic[];
}) {
  const styles = LANE_STYLES[lane];
  const isEmpty = epics.length === 0;

  return (
    <div className={`border-l-4 ${styles.border} rounded-r-lg bg-card`}>
      {/* Lane Header */}
      <div className="px-4 py-3 border-b border-border/50">
        <div className="flex items-center gap-2">
          <span className={`font-semibold ${styles.header}`}>
            {label}
          </span>
          <span className={`text-xs px-2 py-0.5 rounded-full font-mono ${styles.badge}`}>
            {epics.length}
          </span>
        </div>
        <p className="text-xs text-muted-foreground mt-0.5">{description}</p>
      </div>

      {/* Epic Cards */}
      <div className="p-4 space-y-3">
        {isEmpty ? (
          <div className="py-6 text-center text-sm text-muted-foreground">
            {lane === 'now' && 'No work currently in progress'}
            {lane === 'next' && 'Nothing scheduled yet'}
            {lane === 'later' && 'No items on the horizon'}
          </div>
        ) : (
          epics.map((epic) => (
            <PublicEpicCard key={epic.id} epic={epic} lane={lane} />
          ))
        )}
      </div>
    </div>
  );
}

// =============================================================================
// Main Component
// =============================================================================

export function PublicRoadmapView({ projectId, projectName }: PublicRoadmapViewProps) {
  const { data, isLoading, error } = useQuery({
    queryKey: ['public-roadmap', projectId],
    queryFn: () => fetchPublicRoadmap(projectId),
    staleTime: 60_000, // 1 minute cache for public view
  });

  // Loading state
  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh]">
        <Loader2 className="w-8 h-8 animate-spin text-muted-foreground mb-4" />
        <p className="text-muted-foreground">Loading roadmap...</p>
      </div>
    );
  }

  // Error state
  if (error) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh]">
        <div className="text-center">
          <h2 className="text-lg font-semibold text-foreground mb-2">
            Unable to load roadmap
          </h2>
          <p className="text-muted-foreground">
            Please check the project ID and try again.
          </p>
        </div>
      </div>
    );
  }

  // Filter to only public lanes (now, next, later) and only visible epics
  const publicLanes = PUBLIC_LANES.map((laneConfig) => {
    const laneData = data?.lanes.find((l) => l.lane === laneConfig.lane);
    const visibleEpics = (laneData?.epics || []).filter((e) => e.roadmap_visible !== false);
    return {
      ...laneConfig,
      epics: visibleEpics,
    };
  });

  // Calculate counts for header
  const totalVisible = publicLanes.reduce((acc, lane) => acc + lane.epics.length, 0);
  const inProgressCount = publicLanes
    .flatMap((l) => l.epics)
    .filter((e) => e.roadmap_status === 'in_progress').length;

  return (
    <div className="flex flex-col min-h-screen">
      {/* Header */}
      <header className="border-b border-border bg-card/50 backdrop-blur-sm sticky top-0 z-10">
        <div className="max-w-3xl mx-auto px-4 py-6">
          <div className="flex items-center gap-3 mb-2">
            <div className="p-2 rounded-lg bg-primary/10">
              <MapPin className="w-5 h-5 text-primary" />
            </div>
            <h1 className="text-2xl font-bold text-foreground">
              {projectName || 'Product Roadmap'}
            </h1>
          </div>
          <p className="text-muted-foreground">
            {totalVisible} planned items
            {inProgressCount > 0 && ` · ${inProgressCount} in progress`}
          </p>
        </div>
      </header>

      {/* Roadmap Content */}
      <main className="flex-1">
        <div className="max-w-3xl mx-auto px-4 py-8 space-y-6">
          {publicLanes.map((lane) => (
            <PublicLaneSection
              key={lane.lane}
              lane={lane.lane}
              label={lane.label}
              description={lane.description}
              epics={lane.epics}
            />
          ))}
        </div>
      </main>

      {/* Footer */}
      <footer className="border-t border-border bg-card/30">
        <div className="max-w-3xl mx-auto px-4 py-4 text-center">
          <p className="text-xs text-muted-foreground">
            Powered by{' '}
            <a
              href="https://ginkoai.com"
              target="_blank"
              rel="noopener noreferrer"
              className="text-primary hover:underline"
            >
              Ginko
            </a>
          </p>
        </div>
      </footer>
    </div>
  );
}

export default PublicRoadmapView;
