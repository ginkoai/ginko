/**
 * @fileType: component
 * @status: current
 * @updated: 2026-01-05
 * @tags: [billing, seats, usage, dashboard, epic-008]
 * @related: [BillingStatusCard.tsx, billing/page.tsx]
 * @priority: high
 * @complexity: low
 * @dependencies: [react, heroicons]
 *
 * Seat usage display card (EPIC-008 Sprint 4 Task 4)
 * Shows current vs allocated seats with visual progress bar
 */

'use client';

import { UsersIcon, ExclamationTriangleIcon } from '@heroicons/react/24/outline';

interface SeatUsageCardProps {
  current: number;
  allocated: number;
  max: number;
  needsSync: boolean;
  onSync?: () => void;
  syncing?: boolean;
}

export function SeatUsageCard({
  current,
  allocated,
  max,
  needsSync,
  onSync,
  syncing = false,
}: SeatUsageCardProps) {
  const usagePercent = max > 0 ? Math.min((current / max) * 100, 100) : 0;
  const allocatedPercent = max > 0 ? Math.min((allocated / max) * 100, 100) : 0;

  // Color based on usage
  const getUsageColor = () => {
    if (usagePercent >= 90) return 'bg-red-500';
    if (usagePercent >= 75) return 'bg-amber-500';
    return 'bg-primary';
  };

  return (
    <div className="bg-card rounded-lg border border-border shadow-sm">
      <div className="p-6 border-b border-border">
        <h3 className="text-lg font-semibold text-foreground flex items-center gap-2">
          <UsersIcon className="h-5 w-5 text-primary" />
          Seat Usage
        </h3>
      </div>
      <div className="p-6 space-y-6">
        {/* Main numbers */}
        <div className="flex items-baseline gap-2">
          <span className="text-4xl font-bold text-foreground">{current}</span>
          <span className="text-muted-foreground">/ {max} seats</span>
        </div>

        {/* Progress bar */}
        <div className="space-y-2">
          <div className="h-3 bg-secondary rounded-full overflow-hidden">
            <div
              className={`h-full ${getUsageColor()} transition-all duration-300`}
              style={{ width: `${usagePercent}%` }}
            />
          </div>
          <div className="flex justify-between text-sm text-muted-foreground">
            <span>{current} active members</span>
            <span>{max - current} available</span>
          </div>
        </div>

        {/* Sync warning */}
        {needsSync && (
          <div className="flex items-start gap-3 p-4 bg-amber-500/10 border border-amber-500/30 rounded-lg">
            <ExclamationTriangleIcon className="h-5 w-5 text-amber-500 flex-shrink-0 mt-0.5" />
            <div className="flex-1">
              <p className="text-sm font-medium text-amber-500">Seat count out of sync</p>
              <p className="text-sm text-muted-foreground mt-1">
                Current members ({current}) differs from billing seats ({allocated}).
                {onSync && ' Click sync to update.'}
              </p>
              {onSync && (
                <button
                  onClick={onSync}
                  disabled={syncing}
                  className="mt-3 px-3 py-1.5 text-sm font-medium bg-amber-500 text-white rounded-md hover:bg-amber-600 disabled:opacity-50 transition-colors"
                >
                  {syncing ? 'Syncing...' : 'Sync Seats'}
                </button>
              )}
            </div>
          </div>
        )}

        {/* Usage breakdown */}
        <div className="grid grid-cols-2 gap-4 pt-4 border-t border-border">
          <div>
            <p className="text-sm text-muted-foreground">Active Members</p>
            <p className="text-xl font-semibold text-foreground">{current}</p>
          </div>
          <div>
            <p className="text-sm text-muted-foreground">Billed Seats</p>
            <p className="text-xl font-semibold text-foreground">{allocated}</p>
          </div>
        </div>
      </div>
    </div>
  );
}
