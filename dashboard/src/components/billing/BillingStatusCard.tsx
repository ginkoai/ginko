/**
 * @fileType: component
 * @status: current
 * @updated: 2026-01-05
 * @tags: [billing, status, subscription, stripe, epic-008]
 * @related: [SeatUsageCard.tsx, billing/page.tsx]
 * @priority: high
 * @complexity: low
 * @dependencies: [react, heroicons]
 *
 * Billing status and subscription display card (EPIC-008 Sprint 4 Task 4)
 * Shows subscription status, next billing date, and payment info
 */

'use client';

import {
  CreditCardIcon,
  CalendarIcon,
  CheckCircleIcon,
  ClockIcon,
  ExclamationCircleIcon,
  ArrowTopRightOnSquareIcon,
} from '@heroicons/react/24/outline';

interface BillingStatusCardProps {
  subscription: {
    status: 'active' | 'trialing' | 'past_due' | 'canceled' | 'incomplete' | 'none';
    planTier: string;
    interval: 'month' | 'year' | null;
    trialEndsAt: string | null;
  };
  billing: {
    nextBillingDate: string | null;
    nextAmount: number | null;
    currency: string;
    lastPaymentDate: string | null;
    lastPaymentAmount: number | null;
  };
  portalAvailable: boolean;
  onOpenPortal?: () => void;
  portalLoading?: boolean;
}

export function BillingStatusCard({
  subscription,
  billing,
  portalAvailable,
  onOpenPortal,
  portalLoading = false,
}: BillingStatusCardProps) {
  const formatCurrency = (amount: number | null, currency: string) => {
    if (amount === null) return '—';
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: currency.toUpperCase(),
    }).format(amount / 100);
  };

  const formatDate = (dateString: string | null) => {
    if (!dateString) return '—';
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  };

  const getStatusBadge = () => {
    const statusConfig = {
      active: { label: 'Active', color: 'bg-green-500/20 text-green-400', icon: CheckCircleIcon },
      trialing: { label: 'Trial', color: 'bg-blue-500/20 text-blue-400', icon: ClockIcon },
      past_due: { label: 'Past Due', color: 'bg-red-500/20 text-red-400', icon: ExclamationCircleIcon },
      canceled: { label: 'Canceled', color: 'bg-gray-500/20 text-gray-400', icon: ExclamationCircleIcon },
      incomplete: { label: 'Incomplete', color: 'bg-amber-500/20 text-amber-400', icon: ExclamationCircleIcon },
      none: { label: 'No Plan', color: 'bg-gray-500/20 text-gray-400', icon: ExclamationCircleIcon },
    };

    const config = statusConfig[subscription.status] || statusConfig.none;
    const Icon = config.icon;

    return (
      <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-sm font-medium ${config.color}`}>
        <Icon className="h-4 w-4" />
        {config.label}
      </span>
    );
  };

  const getPlanLabel = () => {
    const tier = subscription.planTier.charAt(0).toUpperCase() + subscription.planTier.slice(1);
    const interval = subscription.interval === 'year' ? 'Annual' : 'Monthly';
    return subscription.interval ? `${tier} (${interval})` : tier;
  };

  return (
    <div className="bg-card rounded-lg border border-border shadow-sm">
      <div className="p-6 border-b border-border flex items-center justify-between">
        <h3 className="text-lg font-semibold text-foreground flex items-center gap-2">
          <CreditCardIcon className="h-5 w-5 text-primary" />
          Billing Status
        </h3>
        {getStatusBadge()}
      </div>
      <div className="p-6 space-y-6">
        {/* Plan info */}
        <div>
          <p className="text-sm text-muted-foreground">Current Plan</p>
          <p className="text-2xl font-bold text-foreground mt-1">{getPlanLabel()}</p>
        </div>

        {/* Trial notice */}
        {subscription.status === 'trialing' && subscription.trialEndsAt && (
          <div className="flex items-start gap-3 p-4 bg-blue-500/10 border border-blue-500/30 rounded-lg">
            <ClockIcon className="h-5 w-5 text-blue-400 flex-shrink-0 mt-0.5" />
            <div>
              <p className="text-sm font-medium text-blue-400">Trial Period</p>
              <p className="text-sm text-muted-foreground mt-1">
                Your trial ends on {formatDate(subscription.trialEndsAt)}
              </p>
            </div>
          </div>
        )}

        {/* Past due warning */}
        {subscription.status === 'past_due' && (
          <div className="flex items-start gap-3 p-4 bg-red-500/10 border border-red-500/30 rounded-lg">
            <ExclamationCircleIcon className="h-5 w-5 text-red-400 flex-shrink-0 mt-0.5" />
            <div>
              <p className="text-sm font-medium text-red-400">Payment Past Due</p>
              <p className="text-sm text-muted-foreground mt-1">
                Please update your payment method to avoid service interruption.
              </p>
            </div>
          </div>
        )}

        {/* Billing details */}
        <div className="grid grid-cols-2 gap-6 pt-4 border-t border-border">
          <div>
            <div className="flex items-center gap-2 text-sm text-muted-foreground mb-1">
              <CalendarIcon className="h-4 w-4" />
              Next Billing
            </div>
            <p className="text-lg font-semibold text-foreground">
              {formatDate(billing.nextBillingDate)}
            </p>
            <p className="text-sm text-muted-foreground">
              {formatCurrency(billing.nextAmount, billing.currency)}
            </p>
          </div>
          <div>
            <div className="flex items-center gap-2 text-sm text-muted-foreground mb-1">
              <CreditCardIcon className="h-4 w-4" />
              Last Payment
            </div>
            <p className="text-lg font-semibold text-foreground">
              {formatCurrency(billing.lastPaymentAmount, billing.currency)}
            </p>
            <p className="text-sm text-muted-foreground">
              {formatDate(billing.lastPaymentDate)}
            </p>
          </div>
        </div>

        {/* Stripe portal link */}
        {portalAvailable && onOpenPortal && (
          <div className="pt-4 border-t border-border">
            <button
              onClick={onOpenPortal}
              disabled={portalLoading}
              className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-secondary text-foreground rounded-lg hover:bg-secondary/80 transition-colors disabled:opacity-50"
            >
              {portalLoading ? (
                'Opening Portal...'
              ) : (
                <>
                  Manage Billing in Stripe
                  <ArrowTopRightOnSquareIcon className="h-4 w-4" />
                </>
              )}
            </button>
            <p className="text-xs text-muted-foreground text-center mt-2">
              Update payment methods, view invoices, and manage subscription
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
