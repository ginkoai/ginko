/**
 * @fileType: hook
 * @status: current
 * @updated: 2025-12-15
 * @tags: [sessions, events, react-hook, dashboard]
 * @related: [use-collaboration-data.ts, ../app/api/v1/sessions/route.ts]
 * @priority: high
 * @complexity: low
 * @dependencies: [react]
 */

'use client';

import { useEffect, useState, useCallback } from 'react';
import { getDefaultGraphId } from '@/lib/graph/api-client';
import { createClient } from '@/lib/supabase/client';

export interface SessionEvent {
  id: string;
  user_id: string;
  project_id: string;
  timestamp: string;
  category: 'fix' | 'feature' | 'decision' | 'insight' | 'git' | 'achievement';
  description: string;
  files: string[];
  impact: 'high' | 'medium' | 'low';
  branch?: string;
  tags?: string[];
}

export interface Session {
  id: string;
  startTime: string;
  endTime: string;
  events: SessionEvent[];
  eventCount: number;
  categories: Record<string, number>;
  impactSummary: {
    high: number;
    medium: number;
    low: number;
  };
  title: string;
  description: string;
}

export interface SessionsData {
  sessions: Session[];
  totalCount: number;
}

interface UseSessionsDataOptions {
  graphId?: string;
  userId?: string;
  limit?: number;
  days?: number;
}

// Default graph ID fallback
const DEFAULT_GRAPH_ID = process.env.NEXT_PUBLIC_GRAPH_ID || 'gin_1762125961056_dg4bsd';

export function useSessionsData(options: UseSessionsDataOptions = {}) {
  const [data, setData] = useState<SessionsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchSessions = useCallback(async () => {
    // Get graphId from options, global default, or fallback
    const graphId = options.graphId || getDefaultGraphId() || DEFAULT_GRAPH_ID;

    try {
      setLoading(true);
      setError(null);

      // Get auth token from Supabase
      const supabase = createClient();
      const { data: { session } } = await supabase.auth.getSession();
      const token = session?.access_token;

      const params = new URLSearchParams({
        graphId,
        ...(options.userId && { userId: options.userId }),
        ...(options.limit && { limit: options.limit.toString() }),
        ...(options.days && { days: options.days.toString() }),
      });

      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
      };

      if (token) {
        headers['Authorization'] = `Bearer ${token}`;
      }

      const response = await fetch(`/api/v1/sessions?${params}`, {
        credentials: 'include',
        headers,
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || `Failed to fetch sessions: ${response.statusText}`);
      }

      const sessionsData: SessionsData = await response.json();
      setData(sessionsData);
    } catch (err) {
      console.error('Error fetching sessions data:', err);
      setError(err instanceof Error ? err.message : 'Failed to fetch sessions');
    } finally {
      setLoading(false);
    }
  }, [options.graphId, options.userId, options.limit, options.days]);

  useEffect(() => {
    fetchSessions();
  }, [fetchSessions]);

  return {
    data,
    loading,
    error,
    refetch: fetchSessions,
  };
}
