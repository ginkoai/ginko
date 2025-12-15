/**
 * @fileType: component
 * @status: current
 * @updated: 2025-12-15
 * @tags: [sessions, events, timeline, dashboard]
 * @related: [sessions-with-scores.tsx, use-sessions-data.ts]
 * @priority: high
 * @complexity: low
 * @dependencies: [react, heroicons]
 */

'use client';

import { SessionEvent } from '@/hooks/use-sessions-data';
import { formatDistanceToNow } from 'date-fns';
import {
  WrenchScrewdriverIcon,
  SparklesIcon,
  LightBulbIcon,
  DocumentTextIcon,
  CodeBracketIcon,
  TrophyIcon,
} from '@heroicons/react/24/outline';

interface SessionTimelineProps {
  events: SessionEvent[];
  maxEvents?: number;
}

const categoryConfig: Record<
  string,
  { icon: React.ComponentType<{ className?: string }>; color: string; label: string }
> = {
  fix: {
    icon: WrenchScrewdriverIcon,
    color: 'text-orange-600 bg-orange-50',
    label: 'Fix',
  },
  feature: {
    icon: SparklesIcon,
    color: 'text-blue-600 bg-blue-50',
    label: 'Feature',
  },
  decision: {
    icon: DocumentTextIcon,
    color: 'text-purple-600 bg-purple-50',
    label: 'Decision',
  },
  insight: {
    icon: LightBulbIcon,
    color: 'text-yellow-600 bg-yellow-50',
    label: 'Insight',
  },
  git: {
    icon: CodeBracketIcon,
    color: 'text-gray-600 bg-gray-50',
    label: 'Git',
  },
  achievement: {
    icon: TrophyIcon,
    color: 'text-green-600 bg-green-50',
    label: 'Achievement',
  },
};

const impactColors: Record<string, string> = {
  high: 'border-l-red-500',
  medium: 'border-l-yellow-500',
  low: 'border-l-gray-300',
};

export function SessionTimeline({ events, maxEvents = 5 }: SessionTimelineProps) {
  const displayEvents = events.slice(0, maxEvents);
  const remainingCount = events.length - maxEvents;

  if (events.length === 0) {
    return (
      <div className="text-sm text-muted-foreground italic">
        No events in this session
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {displayEvents.map((event, index) => {
        const config = categoryConfig[event.category] || categoryConfig.insight;
        const Icon = config.icon;
        const impactBorder = impactColors[event.impact] || impactColors.low;

        return (
          <div
            key={event.id}
            className={`flex items-start space-x-3 border-l-2 pl-3 ${impactBorder}`}
          >
            {/* Category Icon */}
            <div className={`p-1.5 rounded-lg ${config.color} flex-shrink-0`}>
              <Icon className="h-4 w-4" />
            </div>

            {/* Event Content */}
            <div className="flex-1 min-w-0">
              <div className="flex items-center justify-between">
                <span className="text-xs font-medium text-muted-foreground uppercase">
                  {config.label}
                </span>
                <span className="text-xs text-muted-foreground">
                  {formatDistanceToNow(new Date(event.timestamp), { addSuffix: true })}
                </span>
              </div>
              <p className="text-sm text-foreground mt-0.5 line-clamp-2">
                {event.description}
              </p>
              {event.files && event.files.length > 0 && (
                <div className="mt-1 flex flex-wrap gap-1">
                  {event.files.slice(0, 2).map((file, i) => (
                    <span
                      key={i}
                      className="text-xs px-1.5 py-0.5 bg-muted rounded font-mono"
                    >
                      {file.split('/').pop()}
                    </span>
                  ))}
                  {event.files.length > 2 && (
                    <span className="text-xs text-muted-foreground">
                      +{event.files.length - 2} more
                    </span>
                  )}
                </div>
              )}
            </div>
          </div>
        );
      })}

      {remainingCount > 0 && (
        <div className="text-sm text-muted-foreground pl-3 border-l-2 border-transparent">
          + {remainingCount} more event{remainingCount > 1 ? 's' : ''}
        </div>
      )}
    </div>
  );
}
