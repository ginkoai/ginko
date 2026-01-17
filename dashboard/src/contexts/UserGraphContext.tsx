/**
 * @fileType: provider
 * @status: current
 * @updated: 2026-01-17
 * @tags: [context, graph, user, access-control, adhoc_260117_s01]
 * @related: [../app/api/v1/user/graph/route.ts, ../lib/graph/access.ts]
 * @priority: critical
 * @complexity: medium
 * @dependencies: [react, @supabase/auth-helpers-react]
 */

'use client';

import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { createClient } from '@/lib/supabase/client';

interface UserGraph {
  graphId: string;
  projectName: string;
  source: 'owner' | 'team_member';
  teamId?: string;
  teamName?: string;
}

interface UserGraphContextValue {
  graphId: string | null;
  isLoading: boolean;
  error: string | null;
  projects: UserGraph[];
  source: 'owner' | 'team_member' | 'none';
  switchProject: (graphId: string) => void;
  refresh: () => Promise<void>;
}

const UserGraphContext = createContext<UserGraphContextValue | undefined>(undefined);

// Fallback for development/testing - will be removed when user has projects
const FALLBACK_GRAPH_ID = process.env.NEXT_PUBLIC_GRAPH_ID || null;

export function UserGraphProvider({ children }: { children: React.ReactNode }) {
  const [graphId, setGraphId] = useState<string | null>(null);
  const [projects, setProjects] = useState<UserGraph[]>([]);
  const [source, setSource] = useState<'owner' | 'team_member' | 'none'>('none');
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const supabase = createClient();

  const fetchUserGraph = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    try {
      // Get current session for auth token
      const { data: { session } } = await supabase.auth.getSession();

      if (!session?.access_token) {
        console.log('[UserGraphContext] No session, using fallback');
        setGraphId(FALLBACK_GRAPH_ID);
        setSource('none');
        setIsLoading(false);
        return;
      }

      // Fetch user's graphs from API
      const response = await fetch('/api/v1/user/graph', {
        headers: {
          'Authorization': `Bearer ${session.access_token}`,
        },
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error?.message || 'Failed to fetch user graph');
      }

      const data = await response.json();

      setProjects(data.projects || []);
      setSource(data.source || 'none');

      if (data.defaultGraphId) {
        setGraphId(data.defaultGraphId);
        console.log(`[UserGraphContext] User's graphId: ${data.defaultGraphId} (${data.source})`);
      } else if (FALLBACK_GRAPH_ID) {
        // User has no projects, use fallback only in development
        console.warn('[UserGraphContext] User has no projects, using fallback');
        setGraphId(FALLBACK_GRAPH_ID);
        setSource('none');
      } else {
        console.log('[UserGraphContext] User has no projects');
        setGraphId(null);
      }

    } catch (err) {
      console.error('[UserGraphContext] Error fetching user graph:', err);
      setError(err instanceof Error ? err.message : 'Unknown error');
      // Use fallback on error for graceful degradation
      if (FALLBACK_GRAPH_ID) {
        setGraphId(FALLBACK_GRAPH_ID);
      }
    } finally {
      setIsLoading(false);
    }
  }, [supabase]);

  // Fetch on mount and when auth state changes
  useEffect(() => {
    fetchUserGraph();

    // Re-fetch when auth state changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event) => {
      if (event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED') {
        fetchUserGraph();
      } else if (event === 'SIGNED_OUT') {
        setGraphId(FALLBACK_GRAPH_ID);
        setProjects([]);
        setSource('none');
      }
    });

    return () => {
      subscription.unsubscribe();
    };
  }, [fetchUserGraph, supabase.auth]);

  const switchProject = useCallback((newGraphId: string) => {
    const project = projects.find(p => p.graphId === newGraphId);
    if (project) {
      setGraphId(newGraphId);
      setSource(project.source);
      console.log(`[UserGraphContext] Switched to project: ${project.projectName} (${newGraphId})`);
    }
  }, [projects]);

  const value: UserGraphContextValue = {
    graphId,
    isLoading,
    error,
    projects,
    source,
    switchProject,
    refresh: fetchUserGraph,
  };

  return (
    <UserGraphContext.Provider value={value}>
      {children}
    </UserGraphContext.Provider>
  );
}

export function useUserGraph(): UserGraphContextValue {
  const context = useContext(UserGraphContext);
  if (context === undefined) {
    throw new Error('useUserGraph must be used within a UserGraphProvider');
  }
  return context;
}

/**
 * Hook that returns the graphId or throws if not available
 * Use this in components that require a graphId to function
 */
export function useRequiredGraphId(): string {
  const { graphId, isLoading, error } = useUserGraph();

  if (isLoading) {
    throw new Promise(() => {}); // Suspend for Suspense boundary
  }

  if (!graphId) {
    throw new Error(error || 'No graph available. Please create a project first.');
  }

  return graphId;
}
