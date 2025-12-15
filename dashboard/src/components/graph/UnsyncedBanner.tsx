/**
 * @fileType: component
 * @status: current
 * @updated: 2025-12-15
 * @tags: [sync, banner, notification, knowledge-editing, cli-integration]
 * @related: [NodeEditor.tsx, node-card.tsx, tree-explorer.tsx]
 * @priority: high
 * @complexity: medium
 * @dependencies: [react, @heroicons/react]
 */
'use client';

import { useState, useEffect } from 'react';
import { Alert } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { ExclamationTriangleIcon, XMarkIcon } from '@heroicons/react/24/outline';

interface UnsyncedBannerProps {
  graphId: string;
}

interface UnsyncedResponse {
  nodes: any[];
  count: number;
  graphId: string;
}

const DISMISSAL_KEY = 'ginko_unsynced_banner_dismissed';
const DISMISSAL_EXPIRY_MS = 24 * 60 * 60 * 1000; // 24 hours

export function UnsyncedBanner({ graphId }: UnsyncedBannerProps) {
  const [unsyncedCount, setUnsyncedCount] = useState<number>(0);
  const [loading, setLoading] = useState(true);
  const [dismissed, setDismissed] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    // Check if banner was previously dismissed
    const dismissalData = localStorage.getItem(DISMISSAL_KEY);
    if (dismissalData) {
      try {
        const { timestamp, graphId: dismissedGraphId } = JSON.parse(dismissalData);
        const now = Date.now();

        // Only keep dismissal if it's for the same graph and not expired
        if (dismissedGraphId === graphId && now - timestamp < DISMISSAL_EXPIRY_MS) {
          setDismissed(true);
          setLoading(false);
          return;
        } else {
          // Clear expired or mismatched dismissal
          localStorage.removeItem(DISMISSAL_KEY);
        }
      } catch {
        // Invalid dismissal data, clear it
        localStorage.removeItem(DISMISSAL_KEY);
      }
    }

    fetchUnsyncedCount();
  }, [graphId]);

  const fetchUnsyncedCount = async () => {
    setLoading(true);
    setError(null);

    try {
      const token = await getAuthToken();
      const response = await fetch(`/api/v1/graph/nodes/unsynced?graphId=${graphId}`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (!response.ok) {
        // If auth error or not found, fail silently
        if (response.status === 401 || response.status === 404) {
          setUnsyncedCount(0);
          return;
        }
        throw new Error('Failed to fetch unsynced nodes');
      }

      const data: UnsyncedResponse = await response.json();
      setUnsyncedCount(data.count);
    } catch (err) {
      // Fail silently in production - don't disrupt user experience
      console.error('[UnsyncedBanner] Error fetching unsynced count:', err);
      setError(err instanceof Error ? err.message : 'Failed to load sync status');
      setUnsyncedCount(0);
    } finally {
      setLoading(false);
    }
  };

  const getAuthToken = async (): Promise<string> => {
    if (typeof window !== 'undefined') {
      const { createClient } = await import('@/lib/supabase/client');
      const supabase = createClient();
      const {
        data: { session },
      } = await supabase.auth.getSession();
      return session?.access_token || '';
    }
    return '';
  };

  const handleDismiss = () => {
    // Store dismissal in localStorage with timestamp
    const dismissalData = {
      timestamp: Date.now(),
      graphId,
    };
    localStorage.setItem(DISMISSAL_KEY, JSON.stringify(dismissalData));
    setDismissed(true);
  };

  // Don't show banner if loading, dismissed, no unsynced nodes, or error
  if (loading || dismissed || unsyncedCount === 0 || error) {
    return null;
  }

  return (
    <Alert variant="warning" className="mb-6">
      <div className="flex items-start justify-between w-full">
        <div className="flex items-start flex-1">
          <ExclamationTriangleIcon className="h-5 w-5 mr-3 flex-shrink-0 mt-0.5" />
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-1">
              <p className="font-semibold text-sm">Unsynced Knowledge Nodes</p>
              <Badge variant="warning" className="text-xs">
                {unsyncedCount} {unsyncedCount === 1 ? 'node' : 'nodes'}
              </Badge>
            </div>
            <p className="text-sm text-yellow-700">
              {unsyncedCount} knowledge {unsyncedCount === 1 ? 'node has been' : 'nodes have been'} edited in the dashboard.
              Run <code className="bg-yellow-100 px-1.5 py-0.5 rounded font-mono text-xs">ginko sync</code> to pull changes to git.
            </p>
          </div>
        </div>
        <button
          onClick={handleDismiss}
          className="ml-3 text-yellow-700 hover:text-yellow-900 transition-colors flex-shrink-0"
          aria-label="Dismiss notification"
        >
          <XMarkIcon className="h-5 w-5" />
        </button>
      </div>
    </Alert>
  );
}
