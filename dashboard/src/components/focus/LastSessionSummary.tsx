/**
 * @fileType: component
 * @status: current
 * @updated: 2025-12-15
 * @tags: [focus, session, summary, dashboard]
 * @related: [RecentCompletions.tsx, sessions-with-scores.tsx, use-sessions-data.ts]
 * @priority: medium
 * @complexity: low
 * @dependencies: [react, date-fns, heroicons]
 */

'use client';

import { Card } from '@/components/ui/card';
import { LoadingSpinner } from '@/components/ui/loading-spinner';
import { useSessionsData } from '@/hooks/use-sessions-data';
import { formatDistanceToNow } from 'date-fns';
import { ClockIcon, SparklesIcon } from '@heroicons/react/24/outline';

interface LastSessionSummaryProps {
  userId?: string;
  graphId?: string;
}

export function LastSessionSummary({ userId, graphId }: LastSessionSummaryProps) {
  const { data, loading, error } = useSessionsData({
    userId,
    graphId,
    limit: 1,
    days: 14,
  });

  if (loading) {
    return (
      <Card className="p-4">
        <div className="flex items-center justify-center h-16">
          <LoadingSpinner size="sm" />
        </div>
      </Card>
    );
  }

  if (error || !data || data.sessions.length === 0) {
    return null;
  }

  const lastSession = data.sessions[0];

  // Extract key accomplishments (high-impact achievements, features, fixes)
  const keyAccomplishments = lastSession.events
    .filter((e) =>
      (e.category === 'achievement' || e.category === 'feature' || e.category === 'fix') &&
      e.impact === 'high'
    )
    .slice(0, 3);

  // Fall back to top 3 events if no high-impact items
  const displayEvents = keyAccomplishments.length > 0
    ? keyAccomplishments
    : lastSession.events.slice(0, 3);

  return (
    <Card className="p-4 bg-card/50 border-border/50">
      <div className="space-y-2">
        {/* Header */}
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <ClockIcon className="h-4 w-4" />
          <span className="font-mono">
            Last session: {formatDistanceToNow(new Date(lastSession.startTime), { addSuffix: true })}
          </span>
        </div>

        {/* Key accomplishments */}
        {displayEvents.length > 0 && (
          <div className="space-y-1.5 pl-6">
            {displayEvents.map((event, idx) => (
              <div key={event.id || idx} className="flex items-start gap-2 text-sm">
                <SparklesIcon className="h-4 w-4 text-primary mt-0.5 flex-shrink-0" />
                <span className="text-foreground line-clamp-1">
                  {event.description}
                </span>
              </div>
            ))}
          </div>
        )}

        {/* Activity count */}
        <div className="text-xs text-muted-foreground font-mono pl-6">
          {lastSession.eventCount} {lastSession.eventCount === 1 ? 'event' : 'events'} logged
        </div>
      </div>
    </Card>
  );
}
