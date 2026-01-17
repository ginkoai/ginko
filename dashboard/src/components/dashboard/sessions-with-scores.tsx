/**
 * @fileType: component
 * @status: current
 * @updated: 2026-01-17
 * @tags: [sessions, events, dashboard, TASK-6, filtering, search]
 * @related: [session-timeline.tsx, use-sessions-data.ts, CategoryView.tsx]
 * @priority: high
 * @complexity: medium
 * @dependencies: [react, date-fns, heroicons]
 */

'use client';

import { useState, useMemo } from 'react';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { LoadingSpinner } from '@/components/ui/loading-spinner';
import { useSessionsData, Session } from '@/hooks/use-sessions-data';
import { SessionTimeline } from './session-timeline';
import { formatDistanceToNow, format } from 'date-fns';
import {
  ChevronDownIcon,
  ChevronRightIcon,
  ClockIcon,
  CalendarIcon,
  FireIcon,
  SparklesIcon,
  WrenchScrewdriverIcon,
  LightBulbIcon,
  MagnifyingGlassIcon,
  AdjustmentsHorizontalIcon,
} from '@heroicons/react/24/outline';

interface SessionsWithScoresProps {
  userId?: string;
  graphId?: string;
}

const categoryIcons: Record<string, React.ComponentType<{ className?: string }>> = {
  fix: WrenchScrewdriverIcon,
  feature: SparklesIcon,
  insight: LightBulbIcon,
  achievement: FireIcon,
};

// =============================================================================
// Filter & Sort Types
// =============================================================================

type ImpactFilter = 'all' | 'high' | 'medium' | 'low';
type CategoryFilter = 'all' | 'fix' | 'feature' | 'decision' | 'insight' | 'git' | 'achievement';
type SortOption = 'newest' | 'oldest' | 'most_events';

const impactFilterOptions: { value: ImpactFilter; label: string }[] = [
  { value: 'all', label: 'All Impacts' },
  { value: 'high', label: 'High Impact' },
  { value: 'medium', label: 'Medium Impact' },
  { value: 'low', label: 'Low Impact' },
];

const categoryFilterOptions: { value: CategoryFilter; label: string }[] = [
  { value: 'all', label: 'All Categories' },
  { value: 'fix', label: 'Fixes' },
  { value: 'feature', label: 'Features' },
  { value: 'decision', label: 'Decisions' },
  { value: 'insight', label: 'Insights' },
  { value: 'git', label: 'Git' },
  { value: 'achievement', label: 'Achievements' },
];

const sortOptions: { value: SortOption; label: string }[] = [
  { value: 'newest', label: 'Newest First' },
  { value: 'oldest', label: 'Oldest First' },
  { value: 'most_events', label: 'Most Events' },
];

// =============================================================================
// Component
// =============================================================================

export function SessionsWithScores({ userId, graphId }: SessionsWithScoresProps) {
  const { data, loading, error } = useSessionsData({
    userId,
    graphId,
    limit: 50, // Fetch more sessions to allow for filtering
    days: 30,
  });
  const [expandedSessions, setExpandedSessions] = useState<Set<string>>(new Set());

  // Filter & Sort state
  const [searchQuery, setSearchQuery] = useState('');
  const [impactFilter, setImpactFilter] = useState<ImpactFilter>('all');
  const [categoryFilter, setCategoryFilter] = useState<CategoryFilter>('all');
  const [sortOption, setSortOption] = useState<SortOption>('newest');

  const toggleExpanded = (sessionId: string) => {
    const newExpanded = new Set(expandedSessions);
    if (newExpanded.has(sessionId)) {
      newExpanded.delete(sessionId);
    } else {
      newExpanded.add(sessionId);
    }
    setExpandedSessions(newExpanded);
  };

  // Filter and sort sessions
  const filteredSessions = useMemo(() => {
    let sessions = data?.sessions || [];

    // Apply search filter
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      sessions = sessions.filter((session) => {
        // Search in session title and description
        const titleMatch = session.title.toLowerCase().includes(query);
        const descMatch = session.description.toLowerCase().includes(query);
        // Search in event descriptions
        const eventMatch = session.events.some((event) =>
          event.description.toLowerCase().includes(query)
        );
        return titleMatch || descMatch || eventMatch;
      });
    }

    // Apply impact filter
    if (impactFilter !== 'all') {
      sessions = sessions.filter((session) => {
        // Check if session has events with the selected impact level
        return session.events.some((event) => event.impact === impactFilter);
      });
    }

    // Apply category filter
    if (categoryFilter !== 'all') {
      sessions = sessions.filter((session) => {
        // Check if session has events with the selected category
        return session.events.some((event) => event.category === categoryFilter);
      });
    }

    // Apply sorting
    sessions = [...sessions].sort((a, b) => {
      switch (sortOption) {
        case 'newest':
          return new Date(b.startTime).getTime() - new Date(a.startTime).getTime();
        case 'oldest':
          return new Date(a.startTime).getTime() - new Date(b.startTime).getTime();
        case 'most_events':
          return b.eventCount - a.eventCount;
        default:
          return 0;
      }
    });

    return sessions;
  }, [data?.sessions, searchQuery, impactFilter, categoryFilter, sortOption]);

  // Check if any filters are active
  const isFiltered = searchQuery.trim() || impactFilter !== 'all' || categoryFilter !== 'all';

  // Clear all filters
  const clearFilters = () => {
    setSearchQuery('');
    setImpactFilter('all');
    setCategoryFilter('all');
    setSortOption('newest');
  };

  if (loading) {
    return (
      <Card className="p-6">
        <div className="flex items-center justify-center h-32">
          <LoadingSpinner size="lg" />
        </div>
      </Card>
    );
  }

  if (error) {
    return (
      <Card className="p-6 text-center">
        <p className="text-red-600">Error loading sessions: {error}</p>
      </Card>
    );
  }

  const totalSessions = data?.sessions?.length || 0;

  if (totalSessions === 0) {
    return (
      <Card className="p-6 text-center">
        <div className="text-center py-8">
          <ClockIcon className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
          <h3 className="text-lg font-medium text-foreground mb-2">No Sessions Yet</h3>
          <p className="text-muted-foreground">
            Use <code className="px-1 py-0.5 bg-muted rounded text-sm">ginko log</code> to
            record session events and see your collaboration history.
          </p>
        </div>
      </Card>
    );
  }

  return (
    <Card className="p-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-xl font-semibold text-foreground">Recent Sessions</h2>
        <Badge variant="secondary">
          {isFiltered
            ? `${filteredSessions.length} of ${totalSessions} sessions`
            : `${totalSessions} sessions`}
        </Badge>
      </div>

      {/* Filter Controls */}
      <div className="flex flex-wrap items-center gap-3 mb-6 pb-4 border-b border-border">
        {/* Search Input */}
        <div className="relative flex-1 min-w-[200px] max-w-[320px]">
          <MagnifyingGlassIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <input
            type="text"
            placeholder="Search sessions..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-3 py-2 text-sm bg-background border border-border rounded-lg focus:outline-none focus:ring-1 focus:ring-primary focus:border-primary"
          />
        </div>

        {/* Impact Filter */}
        <select
          value={impactFilter}
          onChange={(e) => setImpactFilter(e.target.value as ImpactFilter)}
          className="px-3 py-2 text-sm bg-background border border-border rounded-lg focus:outline-none focus:ring-1 focus:ring-primary"
        >
          {impactFilterOptions.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>

        {/* Category Filter */}
        <select
          value={categoryFilter}
          onChange={(e) => setCategoryFilter(e.target.value as CategoryFilter)}
          className="px-3 py-2 text-sm bg-background border border-border rounded-lg focus:outline-none focus:ring-1 focus:ring-primary"
        >
          {categoryFilterOptions.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>

        {/* Sort Dropdown */}
        <select
          value={sortOption}
          onChange={(e) => setSortOption(e.target.value as SortOption)}
          className="px-3 py-2 text-sm bg-background border border-border rounded-lg focus:outline-none focus:ring-1 focus:ring-primary"
        >
          {sortOptions.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>

        {/* Clear Filters Button */}
        {isFiltered && (
          <button
            onClick={clearFilters}
            className="px-3 py-2 text-sm text-muted-foreground hover:text-foreground hover:bg-muted rounded-lg transition-colors"
          >
            Clear filters
          </button>
        )}
      </div>

      {/* Empty State for Filtered Results */}
      {filteredSessions.length === 0 && isFiltered && (
        <div className="flex flex-col items-center justify-center py-12 text-center">
          <AdjustmentsHorizontalIcon className="h-10 w-10 text-muted-foreground mb-3" />
          <h3 className="text-lg font-medium text-foreground mb-1">No matching sessions</h3>
          <p className="text-sm text-muted-foreground mb-4 max-w-sm">
            No sessions match your current filters. Try adjusting your search criteria.
          </p>
          <button
            onClick={clearFilters}
            className="px-4 py-2 text-sm font-medium text-primary hover:bg-primary/10 rounded-lg transition-colors"
          >
            Clear filters
          </button>
        </div>
      )}

      {/* Sessions List */}
      <div className="space-y-4">
        {filteredSessions.map((session) => {
          const isExpanded = expandedSessions.has(session.id);

          return (
            <div key={session.id} className="border border-border rounded-lg">
              {/* Session Header */}
              <div
                className="p-4 cursor-pointer hover:bg-muted/50 transition-colors"
                onClick={() => toggleExpanded(session.id)}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    {isExpanded ? (
                      <ChevronDownIcon className="h-5 w-5 text-muted-foreground" />
                    ) : (
                      <ChevronRightIcon className="h-5 w-5 text-muted-foreground" />
                    )}
                    <div>
                      <h3 className="font-medium text-foreground">{session.title}</h3>
                      <p className="text-sm text-muted-foreground">{session.description}</p>
                    </div>
                  </div>

                  <div className="flex items-center space-x-4">
                    {/* Event Count */}
                    <div className="text-right">
                      <div className="text-lg font-semibold text-foreground">
                        {session.eventCount}
                      </div>
                      <div className="text-xs text-muted-foreground">events</div>
                    </div>

                    {/* Impact Summary */}
                    <ImpactIndicator impactSummary={session.impactSummary} />

                    {/* Time */}
                    <div className="text-right text-sm text-muted-foreground">
                      <div className="flex items-center">
                        <CalendarIcon className="h-4 w-4 mr-1" />
                        {formatDistanceToNow(new Date(session.startTime), { addSuffix: true })}
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Expanded Content */}
              {isExpanded && (
                <div className="border-t border-border p-4 bg-muted/30">
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    {/* Event Timeline */}
                    <div>
                      <h4 className="font-medium text-foreground mb-3 flex items-center">
                        <ClockIcon className="h-5 w-5 text-blue-500 mr-2" />
                        Event Timeline
                      </h4>
                      <SessionTimeline events={session.events} maxEvents={5} />
                    </div>

                    {/* Session Stats */}
                    <div>
                      <h4 className="font-medium text-foreground mb-3 flex items-center">
                        <SparklesIcon className="h-5 w-5 text-purple-500 mr-2" />
                        Session Summary
                      </h4>
                      <SessionStats session={session} />
                    </div>
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </Card>
  );
}

/**
 * Impact indicator showing high/medium/low event counts
 */
function ImpactIndicator({
  impactSummary,
}: {
  impactSummary: { high: number; medium: number; low: number };
}) {
  const total = impactSummary.high + impactSummary.medium + impactSummary.low;
  if (total === 0) return null;

  return (
    <div className="flex items-center space-x-1">
      {impactSummary.high > 0 && (
        <Badge variant="destructive" className="text-xs px-1.5">
          {impactSummary.high} high
        </Badge>
      )}
      {impactSummary.medium > 0 && (
        <Badge variant="secondary" className="text-xs px-1.5 bg-yellow-100 text-yellow-800">
          {impactSummary.medium} med
        </Badge>
      )}
    </div>
  );
}

/**
 * Session statistics panel
 */
function SessionStats({ session }: { session: Session }) {
  const duration = calculateDuration(session.startTime, session.endTime);

  return (
    <div className="space-y-4">
      {/* Duration */}
      <div className="flex items-center justify-between">
        <span className="text-sm text-muted-foreground">Duration</span>
        <span className="text-sm font-medium text-foreground">{duration}</span>
      </div>

      {/* Time Range */}
      <div className="flex items-center justify-between">
        <span className="text-sm text-muted-foreground">Time Range</span>
        <span className="text-sm font-medium text-foreground">
          {format(new Date(session.startTime), 'h:mm a')} -{' '}
          {format(new Date(session.endTime), 'h:mm a')}
        </span>
      </div>

      {/* Category Breakdown */}
      <div>
        <span className="text-sm text-muted-foreground block mb-2">Activity Breakdown</span>
        <div className="flex flex-wrap gap-2">
          {Object.entries(session.categories).map(([category, count]) => {
            const Icon = categoryIcons[category];
            return (
              <div
                key={category}
                className="flex items-center space-x-1 px-2 py-1 bg-muted rounded-md"
              >
                {Icon && <Icon className="h-3.5 w-3.5 text-muted-foreground" />}
                <span className="text-xs text-foreground capitalize">{category}</span>
                <span className="text-xs text-muted-foreground">({count})</span>
              </div>
            );
          })}
        </div>
      </div>

      {/* Impact Summary Bar */}
      <div>
        <span className="text-sm text-muted-foreground block mb-2">Impact Distribution</span>
        <div className="flex h-2 rounded-full overflow-hidden bg-muted">
          {session.impactSummary.high > 0 && (
            <div
              className="bg-red-500"
              style={{
                width: `${(session.impactSummary.high / session.eventCount) * 100}%`,
              }}
            />
          )}
          {session.impactSummary.medium > 0 && (
            <div
              className="bg-yellow-500"
              style={{
                width: `${(session.impactSummary.medium / session.eventCount) * 100}%`,
              }}
            />
          )}
          {session.impactSummary.low > 0 && (
            <div
              className="bg-gray-300"
              style={{
                width: `${(session.impactSummary.low / session.eventCount) * 100}%`,
              }}
            />
          )}
        </div>
        <div className="flex justify-between text-xs text-muted-foreground mt-1">
          <span>High: {session.impactSummary.high}</span>
          <span>Medium: {session.impactSummary.medium}</span>
          <span>Low: {session.impactSummary.low}</span>
        </div>
      </div>
    </div>
  );
}

/**
 * Calculate human-readable duration between two timestamps
 */
function calculateDuration(start: string, end: string): string {
  const startDate = new Date(start);
  const endDate = new Date(end);
  const diffMs = endDate.getTime() - startDate.getTime();

  const hours = Math.floor(diffMs / (1000 * 60 * 60));
  const minutes = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60));

  if (hours > 0) {
    return `${hours}h ${minutes}m`;
  }
  return `${minutes}m`;
}
