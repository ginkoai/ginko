/**
 * @fileType: component
 * @status: current
 * @updated: 2025-12-15
 * @tags: [focus, completions, timeline, dashboard, tasks]
 * @related: [LastSessionSummary.tsx, sessions-with-scores.tsx, use-sessions-data.ts]
 * @priority: medium
 * @complexity: medium
 * @dependencies: [react, date-fns, heroicons, clsx]
 */

'use client';

import { useEffect, useState } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { LoadingSpinner } from '@/components/ui/loading-spinner';
import { Badge } from '@/components/ui/badge';
import { listNodes } from '@/lib/graph/api-client';
import { useSessionsData } from '@/hooks/use-sessions-data';
import type { GraphNode, TaskNode, EventNode } from '@/lib/graph/types';
import { formatDistanceToNow } from 'date-fns';
import { clsx } from 'clsx';
import {
  CheckCircleIcon,
  SparklesIcon,
  WrenchScrewdriverIcon,
  LightBulbIcon,
  FireIcon,
  UserIcon,
} from '@heroicons/react/24/outline';

// Default graph ID fallback
const DEFAULT_GRAPH_ID = (process.env.NEXT_PUBLIC_GRAPH_ID || 'gin_1762125961056_dg4bsd').trim();

interface RecentCompletionsProps {
  userId?: string;
  graphId?: string;
}

interface CompletionItem {
  id: string;
  type: 'task' | 'event';
  title: string;
  userId?: string;
  timestamp: string;
  category?: 'fix' | 'feature' | 'achievement' | 'insight';
  impact?: 'low' | 'medium' | 'high';
}

const categoryIcons = {
  fix: WrenchScrewdriverIcon,
  feature: SparklesIcon,
  achievement: FireIcon,
  insight: LightBulbIcon,
};

export function RecentCompletions({ userId, graphId }: RecentCompletionsProps) {
  const [completions, setCompletions] = useState<CompletionItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Fetch events from last 7 days
  const { data: sessionsData, loading: sessionsLoading } = useSessionsData({
    userId: undefined, // Get all users for team activity
    graphId,
    limit: 50,
    days: 7,
  });

  useEffect(() => {
    const fetchCompletions = async () => {
      try {
        setLoading(true);
        setError(null);

        const effectiveGraphId = graphId || DEFAULT_GRAPH_ID;

        // Fetch completed tasks from last 7 days
        const sevenDaysAgo = new Date();
        sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

        const tasksResponse = await listNodes({
          graphId: effectiveGraphId,
          labels: ['Task'],
          limit: 50,
        });

        // Filter for completed tasks updated in last 7 days
        const completedTasks = tasksResponse.nodes
          .filter((node) => {
            const props = node.properties as TaskNode;
            return (
              props.status === 'complete' &&
              props.updated_at &&
              new Date(props.updated_at) >= sevenDaysAgo
            );
          })
          .map((node): CompletionItem => {
            const props = node.properties as TaskNode;
            return {
              id: node.id,
              type: 'task',
              title: props.title,
              userId: props.assignee,
              timestamp: props.updated_at!,
            };
          });

        // Extract achievement/feature/fix events from sessions
        const eventCompletions: CompletionItem[] = [];
        if (sessionsData?.sessions) {
          for (const session of sessionsData.sessions) {
            for (const event of session.events) {
              if (
                ['achievement', 'feature', 'fix'].includes(event.category) &&
                event.impact === 'high'
              ) {
                eventCompletions.push({
                  id: event.id,
                  type: 'event',
                  title: event.description,
                  userId: event.user_id,
                  timestamp: event.timestamp,
                  category: event.category as 'fix' | 'feature' | 'achievement',
                  impact: event.impact as 'high',
                });
              }
            }
          }
        }

        // Combine and sort by timestamp (most recent first)
        const allCompletions = [...completedTasks, ...eventCompletions]
          .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
          .slice(0, 7); // Limit to 7 items

        setCompletions(allCompletions);
      } catch (err) {
        console.error('Error fetching completions:', err);
        setError(err instanceof Error ? err.message : 'Failed to fetch completions');
      } finally {
        setLoading(false);
      }
    };

    if (!sessionsLoading) {
      fetchCompletions();
    }
  }, [graphId, sessionsData, sessionsLoading]);

  if (loading || sessionsLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-base font-mono">Recent Completions</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center h-32">
            <LoadingSpinner size="default" />
          </div>
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-base font-mono">Recent Completions</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground text-center py-4">
            Unable to load completions
          </p>
        </CardContent>
      </Card>
    );
  }

  if (completions.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-base font-mono">Recent Completions</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8">
            <CheckCircleIcon className="h-12 w-12 text-muted-foreground mx-auto mb-3" />
            <p className="text-sm text-muted-foreground">
              No recent completions in the last 7 days
            </p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base font-mono flex items-center gap-2">
          <CheckCircleIcon className="h-5 w-5 text-primary" />
          Recent Completions
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          {completions.map((completion) => {
            const isCurrentUser = completion.userId === userId;
            const Icon =
              completion.type === 'event' && completion.category
                ? categoryIcons[completion.category]
                : CheckCircleIcon;

            return (
              <div
                key={completion.id}
                className={clsx(
                  'flex items-start gap-3 p-3 rounded-md border border-border/50 transition-colors',
                  isCurrentUser && 'bg-primary/5 border-primary/20'
                )}
              >
                {/* Icon */}
                <Icon
                  className={clsx(
                    'h-5 w-5 mt-0.5 flex-shrink-0',
                    isCurrentUser ? 'text-primary' : 'text-muted-foreground'
                  )}
                />

                {/* Content */}
                <div className="flex-1 min-w-0">
                  <p className="text-sm text-foreground font-medium line-clamp-2 mb-1">
                    {completion.title}
                  </p>

                  {/* Meta info */}
                  <div className="flex items-center gap-2 text-xs text-muted-foreground">
                    {completion.userId && (
                      <span
                        className={clsx(
                          'flex items-center gap-1',
                          isCurrentUser && 'text-primary font-medium'
                        )}
                      >
                        <UserIcon className="h-3 w-3" />
                        {isCurrentUser ? 'You' : completion.userId.split('@')[0]}
                      </span>
                    )}
                    <span>•</span>
                    <span className="font-mono">
                      {formatDistanceToNow(new Date(completion.timestamp), { addSuffix: true })}
                    </span>
                  </div>
                </div>

                {/* Type badge */}
                <Badge
                  variant={completion.type === 'task' ? 'default' : 'secondary'}
                  className="text-xs"
                >
                  {completion.type}
                </Badge>
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}
