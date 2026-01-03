/**
 * @fileType: component
 * @status: current
 * @updated: 2026-01-03
 * @tags: [team, staleness, warning, sync, EPIC-008]
 * @related: [TeamMemberList.tsx, ../ui/alert.tsx]
 * @priority: high
 * @complexity: medium
 * @dependencies: [react, lucide-react, react-hot-toast]
 */

'use client';

import { useState, useEffect, useCallback } from 'react';
import { AlertTriangle, Clock, RefreshCw, X, FileCode, Lightbulb, Calendar } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { createClient } from '@/lib/supabase/client';
import toast from 'react-hot-toast';

// =============================================================================
// Types
// =============================================================================

interface StalenessConfig {
  warningThresholdDays: number;
  criticalThresholdDays: number;
}

interface ChangedSinceSync {
  adrs: number;
  patterns: number;
  sprints: number;
  total: number;
}

interface StalenessResult {
  isStale: boolean;
  severity: 'none' | 'warning' | 'critical';
  daysSinceSync: number;
  lastSyncAt: string | null;
  changedSinceSync: ChangedSinceSync;
  message: string;
}

interface StalenessWarningProps {
  graphId: string;
  config?: Partial<StalenessConfig>;
  onDismiss?: () => void;
  onSync?: () => void;
  className?: string;
  /** Auto-hide after successful sync (default: true) */
  autoHideOnSync?: boolean;
}

// =============================================================================
// Constants
// =============================================================================

const DEFAULT_CONFIG: StalenessConfig = {
  warningThresholdDays: 1,
  criticalThresholdDays: 7,
};

// =============================================================================
// Component
// =============================================================================

export function StalenessWarning({
  graphId,
  config,
  onDismiss,
  onSync,
  className,
  autoHideOnSync = true,
}: StalenessWarningProps) {
  const [staleness, setStaleness] = useState<StalenessResult | null>(null);
  const [loading, setLoading] = useState(true);
  const [dismissed, setDismissed] = useState(false);
  const [syncing, setSyncing] = useState(false);

  const mergedConfig: StalenessConfig = {
    ...DEFAULT_CONFIG,
    ...config,
  };

  const checkStaleness = useCallback(async () => {
    setLoading(true);
    try {
      const supabase = createClient();
      const { data: { session } } = await supabase.auth.getSession();
      const token = session?.access_token;

      if (!token) {
        setStaleness(null);
        return;
      }

      // Fetch membership status
      const membershipRes = await fetch(
        `/api/v1/graph/membership?graphId=${encodeURIComponent(graphId)}`,
        {
          headers: { Authorization: `Bearer ${token}` },
        }
      );

      if (membershipRes.status === 404 || !membershipRes.ok) {
        setStaleness(null);
        return;
      }

      const membershipData = await membershipRes.json();
      const lastSyncAt = membershipData.membership?.last_sync_at || null;

      // Calculate days since sync
      const daysSinceSync = lastSyncAt
        ? Math.floor((Date.now() - new Date(lastSyncAt).getTime()) / (1000 * 60 * 60 * 24))
        : Infinity;

      // Determine severity
      let severity: 'none' | 'warning' | 'critical' = 'none';
      if (daysSinceSync >= mergedConfig.criticalThresholdDays) {
        severity = 'critical';
      } else if (daysSinceSync >= mergedConfig.warningThresholdDays) {
        severity = 'warning';
      }

      const isStale = severity !== 'none';

      // Only fetch changes if stale
      let changedSinceSync: ChangedSinceSync = { adrs: 0, patterns: 0, sprints: 0, total: 0 };
      if (isStale) {
        try {
          const changesUrl = new URL('/api/v1/graph/changes', window.location.origin);
          changesUrl.searchParams.set('graphId', graphId);
          if (lastSyncAt) {
            changesUrl.searchParams.set('since', lastSyncAt);
          }

          const changesRes = await fetch(changesUrl.toString(), {
            headers: { Authorization: `Bearer ${token}` },
          });

          if (changesRes.ok) {
            const changesData = await changesRes.json();
            changedSinceSync = {
              adrs: changesData.changes?.ADR || 0,
              patterns: changesData.changes?.Pattern || 0,
              sprints: changesData.changes?.Sprint || 0,
              total: changesData.total || 0,
            };
          }
        } catch {
          // Ignore changes fetch failure
        }
      }

      // Format message
      const message = formatMessage(severity, daysSinceSync, lastSyncAt, changedSinceSync);

      setStaleness({
        isStale,
        severity,
        daysSinceSync,
        lastSyncAt,
        changedSinceSync,
        message,
      });
    } catch {
      setStaleness(null);
    } finally {
      setLoading(false);
    }
  }, [graphId, mergedConfig.criticalThresholdDays, mergedConfig.warningThresholdDays]);

  useEffect(() => {
    checkStaleness();
  }, [checkStaleness]);

  const handleDismiss = () => {
    setDismissed(true);
    onDismiss?.();
  };

  const handleSync = async () => {
    setSyncing(true);
    try {
      // Call parent sync handler if provided
      onSync?.();

      // Show toast with CLI instructions
      toast.success(
        <div className="space-y-1">
          <p className="font-medium">Sync team context</p>
          <p className="text-sm text-muted-foreground">
            Run <code className="bg-muted px-1 rounded">ginko sync</code> in your terminal
          </p>
        </div>,
        { duration: 5000 }
      );

      if (autoHideOnSync) {
        setDismissed(true);
      }
    } finally {
      setSyncing(false);
    }
  };

  // Don't render if loading, dismissed, or not stale
  if (loading || dismissed || !staleness?.isStale) {
    return null;
  }

  const isCritical = staleness.severity === 'critical';
  const { changedSinceSync } = staleness;

  return (
    <div
      className={cn(
        'relative rounded-lg border p-4',
        isCritical
          ? 'bg-red-50 dark:bg-red-950/30 border-red-200 dark:border-red-900'
          : 'bg-yellow-50 dark:bg-yellow-950/30 border-yellow-200 dark:border-yellow-900',
        className
      )}
      role="alert"
    >
      {/* Dismiss button */}
      <button
        onClick={handleDismiss}
        className={cn(
          'absolute top-2 right-2 p-1 rounded-full transition-colors',
          isCritical
            ? 'hover:bg-red-100 dark:hover:bg-red-900/50 text-red-600 dark:text-red-400'
            : 'hover:bg-yellow-100 dark:hover:bg-yellow-900/50 text-yellow-600 dark:text-yellow-400'
        )}
        aria-label="Dismiss warning"
      >
        <X className="h-4 w-4" />
      </button>

      <div className="flex items-start gap-3">
        {/* Icon */}
        <div
          className={cn(
            'flex-shrink-0 rounded-full p-2',
            isCritical
              ? 'bg-red-100 dark:bg-red-900/50 text-red-600 dark:text-red-400'
              : 'bg-yellow-100 dark:bg-yellow-900/50 text-yellow-600 dark:text-yellow-400'
          )}
        >
          {isCritical ? (
            <AlertTriangle className="h-5 w-5" />
          ) : (
            <Clock className="h-5 w-5" />
          )}
        </div>

        {/* Content */}
        <div className="flex-1 min-w-0">
          {/* Header */}
          <div className="flex items-center gap-2 mb-1">
            <h4
              className={cn(
                'font-semibold',
                isCritical
                  ? 'text-red-800 dark:text-red-200'
                  : 'text-yellow-800 dark:text-yellow-200'
              )}
            >
              {isCritical ? 'Team context critically stale' : 'Team context may be stale'}
            </h4>
            <Badge variant={isCritical ? 'destructive' : 'warning'}>
              {staleness.daysSinceSync === Infinity
                ? 'Never synced'
                : `${staleness.daysSinceSync}d ago`}
            </Badge>
          </div>

          {/* Message */}
          <p
            className={cn(
              'text-sm mb-3',
              isCritical
                ? 'text-red-700 dark:text-red-300'
                : 'text-yellow-700 dark:text-yellow-300'
            )}
          >
            {staleness.message}
          </p>

          {/* Changes breakdown */}
          {changedSinceSync.total > 0 && (
            <div className="flex flex-wrap gap-2 mb-3">
              {changedSinceSync.adrs > 0 && (
                <div
                  className={cn(
                    'flex items-center gap-1.5 text-xs px-2 py-1 rounded-full',
                    isCritical
                      ? 'bg-red-100 dark:bg-red-900/40 text-red-700 dark:text-red-300'
                      : 'bg-yellow-100 dark:bg-yellow-900/40 text-yellow-700 dark:text-yellow-300'
                  )}
                >
                  <FileCode className="h-3 w-3" />
                  {changedSinceSync.adrs} ADR{changedSinceSync.adrs !== 1 && 's'}
                </div>
              )}
              {changedSinceSync.patterns > 0 && (
                <div
                  className={cn(
                    'flex items-center gap-1.5 text-xs px-2 py-1 rounded-full',
                    isCritical
                      ? 'bg-red-100 dark:bg-red-900/40 text-red-700 dark:text-red-300'
                      : 'bg-yellow-100 dark:bg-yellow-900/40 text-yellow-700 dark:text-yellow-300'
                  )}
                >
                  <Lightbulb className="h-3 w-3" />
                  {changedSinceSync.patterns} Pattern{changedSinceSync.patterns !== 1 && 's'}
                </div>
              )}
              {changedSinceSync.sprints > 0 && (
                <div
                  className={cn(
                    'flex items-center gap-1.5 text-xs px-2 py-1 rounded-full',
                    isCritical
                      ? 'bg-red-100 dark:bg-red-900/40 text-red-700 dark:text-red-300'
                      : 'bg-yellow-100 dark:bg-yellow-900/40 text-yellow-700 dark:text-yellow-300'
                  )}
                >
                  <Calendar className="h-3 w-3" />
                  {changedSinceSync.sprints} Sprint{changedSinceSync.sprints !== 1 && 's'}
                </div>
              )}
            </div>
          )}

          {/* Action button */}
          <Button
            size="sm"
            variant={isCritical ? 'destructive' : 'outline'}
            onClick={handleSync}
            disabled={syncing}
            className="gap-2"
          >
            <RefreshCw className={cn('h-4 w-4', syncing && 'animate-spin')} />
            {syncing ? 'Syncing...' : 'Sync Now'}
          </Button>
        </div>
      </div>
    </div>
  );
}

// =============================================================================
// Helper Functions
// =============================================================================

function formatMessage(
  severity: 'none' | 'warning' | 'critical',
  daysSinceSync: number,
  lastSyncAt: string | null,
  changes: ChangedSinceSync
): string {
  if (severity === 'none') {
    if (!lastSyncAt) {
      return 'No sync history';
    }
    return `Last synced ${formatRelativeTime(lastSyncAt)}`;
  }

  if (!lastSyncAt || daysSinceSync === Infinity) {
    return 'Never synced - team patterns, ADRs, and sprints may be missing from your local context.';
  }

  const changeInfo = changes.total > 0
    ? ` (${changes.total} change${changes.total === 1 ? '' : 's'})`
    : '';

  if (severity === 'critical') {
    return `${daysSinceSync} days since last sync${changeInfo}. Team patterns and ADRs may be outdated.`;
  }

  return `${daysSinceSync} day${daysSinceSync === 1 ? '' : 's'} since last sync${changeInfo}. Consider syncing to stay current.`;
}

function formatRelativeTime(dateStr: string): string {
  const date = new Date(dateStr);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / (1000 * 60));
  const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

  if (diffMins < 1) return 'just now';
  if (diffMins < 60) return `${diffMins} minute${diffMins === 1 ? '' : 's'} ago`;
  if (diffHours < 24) return `${diffHours} hour${diffHours === 1 ? '' : 's'} ago`;
  if (diffDays < 7) return `${diffDays} day${diffDays === 1 ? '' : 's'} ago`;
  return date.toLocaleDateString();
}

export default StalenessWarning;
