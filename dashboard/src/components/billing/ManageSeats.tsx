/**
 * @fileType: component
 * @status: current
 * @updated: 2026-01-05
 * @tags: [billing, seats, upgrade, downgrade, stripe, epic-008]
 * @related: [SeatUsageCard.tsx, billing/page.tsx, api/v1/billing/seats/route.ts]
 * @priority: high
 * @complexity: medium
 * @dependencies: [react, heroicons]
 *
 * Seat management component with upgrade/downgrade flows (EPIC-008 Sprint 4 Task 5)
 *
 * Features:
 * - Add/remove seats with confirmation
 * - Shows billing impact before confirming
 * - Add seats: immediate prorated charge
 * - Remove seats: effective at period end
 */

'use client';

import { useState, useEffect } from 'react';
import {
  PlusIcon,
  MinusIcon,
  ExclamationTriangleIcon,
  CheckCircleIcon,
  XMarkIcon,
  UserPlusIcon,
  UserMinusIcon,
} from '@heroicons/react/24/outline';

interface ManageSeatsProps {
  teamId: string;
  currentMembers: number;
  allocatedSeats: number;
  maxSeats: number;
  pricePerSeat: number;
  interval: 'month' | 'year';
  canModify: boolean;
  onUpdate?: (newSeats: number) => void;
  accessToken: string;
}

interface UpdateResult {
  success: boolean;
  previousSeats: number;
  newSeats: number;
  prorated: boolean;
  effectiveAt: 'immediately' | 'period_end';
  billing: {
    message: string;
    monthlyImpact: number;
  };
}

type ModalState = 'closed' | 'add' | 'remove' | 'confirming' | 'success' | 'error';

export function ManageSeats({
  teamId,
  currentMembers,
  allocatedSeats,
  maxSeats,
  pricePerSeat,
  interval,
  canModify,
  onUpdate,
  accessToken,
}: ManageSeatsProps) {
  const [modalState, setModalState] = useState<ModalState>('closed');
  const [seatChange, setSeatChange] = useState(1);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<UpdateResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Reset seat change when modal opens
  useEffect(() => {
    if (modalState === 'add' || modalState === 'remove') {
      setSeatChange(1);
      setError(null);
    }
  }, [modalState]);

  const newSeatCount = modalState === 'add'
    ? allocatedSeats + seatChange
    : allocatedSeats - seatChange;

  const canAdd = allocatedSeats < maxSeats;
  const canRemove = allocatedSeats > currentMembers;

  const handleConfirm = async () => {
    setLoading(true);
    setError(null);

    try {
      const res = await fetch('/api/v1/billing/seats', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          teamId,
          newSeatCount,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error || 'Failed to update seats');
        setModalState('error');
        return;
      }

      setResult(data);
      setModalState('success');
      onUpdate?.(data.newSeats);
    } catch (err: any) {
      setError(err.message || 'Failed to update seats');
      setModalState('error');
    } finally {
      setLoading(false);
    }
  };

  const closeModal = () => {
    setModalState('closed');
    setResult(null);
    setError(null);
  };

  if (!canModify) {
    return null;
  }

  return (
    <>
      {/* Action buttons */}
      <div className="flex gap-3">
        <button
          onClick={() => setModalState('add')}
          disabled={!canAdd}
          className="flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          <UserPlusIcon className="h-4 w-4" />
          Add Seats
        </button>
        <button
          onClick={() => setModalState('remove')}
          disabled={!canRemove}
          className="flex items-center gap-2 px-4 py-2 bg-secondary text-secondary-foreground rounded-lg hover:bg-secondary/80 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          <UserMinusIcon className="h-4 w-4" />
          Remove Seats
        </button>
      </div>

      {/* Modal */}
      {modalState !== 'closed' && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-card border border-border rounded-xl shadow-xl max-w-md w-full">
            {/* Header */}
            <div className="flex items-center justify-between p-6 border-b border-border">
              <h2 className="text-lg font-semibold text-foreground">
                {modalState === 'add' && 'Add Seats'}
                {modalState === 'remove' && 'Remove Seats'}
                {modalState === 'confirming' && 'Confirm Changes'}
                {modalState === 'success' && 'Success'}
                {modalState === 'error' && 'Error'}
              </h2>
              <button
                onClick={closeModal}
                className="text-muted-foreground hover:text-foreground"
              >
                <XMarkIcon className="h-5 w-5" />
              </button>
            </div>

            {/* Content */}
            <div className="p-6">
              {/* Add seats form */}
              {modalState === 'add' && (
                <div className="space-y-6">
                  <div className="flex items-center justify-center gap-4">
                    <button
                      onClick={() => setSeatChange(Math.max(1, seatChange - 1))}
                      disabled={seatChange <= 1}
                      className="p-2 bg-secondary rounded-lg hover:bg-secondary/80 disabled:opacity-50"
                    >
                      <MinusIcon className="h-5 w-5" />
                    </button>
                    <div className="text-center">
                      <span className="text-4xl font-bold text-foreground">{seatChange}</span>
                      <p className="text-sm text-muted-foreground">seat{seatChange > 1 ? 's' : ''}</p>
                    </div>
                    <button
                      onClick={() => setSeatChange(Math.min(maxSeats - allocatedSeats, seatChange + 1))}
                      disabled={allocatedSeats + seatChange >= maxSeats}
                      className="p-2 bg-secondary rounded-lg hover:bg-secondary/80 disabled:opacity-50"
                    >
                      <PlusIcon className="h-5 w-5" />
                    </button>
                  </div>

                  <div className="bg-secondary/50 rounded-lg p-4 space-y-2">
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">Current seats</span>
                      <span className="text-foreground">{allocatedSeats}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">Adding</span>
                      <span className="text-primary">+{seatChange}</span>
                    </div>
                    <div className="border-t border-border pt-2 flex justify-between font-medium">
                      <span className="text-foreground">New total</span>
                      <span className="text-foreground">{newSeatCount} seats</span>
                    </div>
                  </div>

                  <div className="bg-blue-500/10 border border-blue-500/30 rounded-lg p-4">
                    <p className="text-sm text-blue-400">
                      <strong>Immediate charge:</strong> ${(seatChange * pricePerSeat).toFixed(2)}/{interval} (prorated for current period)
                    </p>
                  </div>

                  <button
                    onClick={handleConfirm}
                    disabled={loading}
                    className="w-full py-3 bg-primary text-primary-foreground rounded-lg font-medium hover:bg-primary/90 disabled:opacity-50 transition-colors"
                  >
                    {loading ? 'Processing...' : `Add ${seatChange} Seat${seatChange > 1 ? 's' : ''}`}
                  </button>
                </div>
              )}

              {/* Remove seats form */}
              {modalState === 'remove' && (
                <div className="space-y-6">
                  <div className="flex items-center justify-center gap-4">
                    <button
                      onClick={() => setSeatChange(Math.max(1, seatChange - 1))}
                      disabled={seatChange <= 1}
                      className="p-2 bg-secondary rounded-lg hover:bg-secondary/80 disabled:opacity-50"
                    >
                      <MinusIcon className="h-5 w-5" />
                    </button>
                    <div className="text-center">
                      <span className="text-4xl font-bold text-foreground">{seatChange}</span>
                      <p className="text-sm text-muted-foreground">seat{seatChange > 1 ? 's' : ''}</p>
                    </div>
                    <button
                      onClick={() => setSeatChange(Math.min(allocatedSeats - currentMembers, seatChange + 1))}
                      disabled={allocatedSeats - seatChange <= currentMembers}
                      className="p-2 bg-secondary rounded-lg hover:bg-secondary/80 disabled:opacity-50"
                    >
                      <PlusIcon className="h-5 w-5" />
                    </button>
                  </div>

                  <div className="bg-secondary/50 rounded-lg p-4 space-y-2">
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">Current seats</span>
                      <span className="text-foreground">{allocatedSeats}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">Removing</span>
                      <span className="text-red-400">-{seatChange}</span>
                    </div>
                    <div className="border-t border-border pt-2 flex justify-between font-medium">
                      <span className="text-foreground">New total</span>
                      <span className="text-foreground">{newSeatCount} seats</span>
                    </div>
                  </div>

                  {newSeatCount < currentMembers && (
                    <div className="bg-red-500/10 border border-red-500/30 rounded-lg p-4 flex items-start gap-3">
                      <ExclamationTriangleIcon className="h-5 w-5 text-red-500 flex-shrink-0 mt-0.5" />
                      <p className="text-sm text-red-400">
                        Cannot reduce below current member count ({currentMembers}). Remove team members first.
                      </p>
                    </div>
                  )}

                  {newSeatCount >= currentMembers && (
                    <div className="bg-amber-500/10 border border-amber-500/30 rounded-lg p-4">
                      <p className="text-sm text-amber-400">
                        <strong>Effective at period end:</strong> Seat reduction takes effect at the end of your current billing period. No immediate refund.
                      </p>
                    </div>
                  )}

                  <button
                    onClick={handleConfirm}
                    disabled={loading || newSeatCount < currentMembers}
                    className="w-full py-3 bg-red-600 text-white rounded-lg font-medium hover:bg-red-700 disabled:opacity-50 transition-colors"
                  >
                    {loading ? 'Processing...' : `Remove ${seatChange} Seat${seatChange > 1 ? 's' : ''}`}
                  </button>
                </div>
              )}

              {/* Success state */}
              {modalState === 'success' && result && (
                <div className="space-y-6 text-center">
                  <CheckCircleIcon className="h-16 w-16 text-green-500 mx-auto" />
                  <div>
                    <h3 className="text-lg font-medium text-foreground mb-2">Seats Updated</h3>
                    <p className="text-muted-foreground">
                      {result.previousSeats} → {result.newSeats} seats
                    </p>
                  </div>
                  <div className="bg-secondary/50 rounded-lg p-4 text-left">
                    <p className="text-sm text-foreground">{result.billing.message}</p>
                    {result.prorated && result.billing.monthlyImpact > 0 && (
                      <p className="text-sm text-muted-foreground mt-2">
                        Additional charge: ${result.billing.monthlyImpact.toFixed(2)} (prorated)
                      </p>
                    )}
                  </div>
                  <button
                    onClick={closeModal}
                    className="w-full py-3 bg-primary text-primary-foreground rounded-lg font-medium hover:bg-primary/90 transition-colors"
                  >
                    Done
                  </button>
                </div>
              )}

              {/* Error state */}
              {modalState === 'error' && (
                <div className="space-y-6 text-center">
                  <ExclamationTriangleIcon className="h-16 w-16 text-red-500 mx-auto" />
                  <div>
                    <h3 className="text-lg font-medium text-foreground mb-2">Update Failed</h3>
                    <p className="text-muted-foreground">{error}</p>
                  </div>
                  <button
                    onClick={closeModal}
                    className="w-full py-3 bg-secondary text-secondary-foreground rounded-lg font-medium hover:bg-secondary/80 transition-colors"
                  >
                    Close
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
}
