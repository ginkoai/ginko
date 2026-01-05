/**
 * @fileType: page
 * @status: current
 * @updated: 2026-01-05
 * @tags: [dashboard, billing, seats, stripe, epic-008]
 * @related: [settings/page.tsx, components/billing]
 * @priority: high
 * @complexity: medium
 * @dependencies: [react, supabase, heroicons]
 *
 * Billing overview page (EPIC-008 Sprint 4 Task 4)
 * Displays seat usage, billing status, and Stripe portal access
 */

'use client';

import { useEffect, useState, useCallback } from 'react';
import { createClient } from '@/lib/supabase/client';
import { SeatUsageCard, BillingStatusCard } from '@/components/billing';
import {
  CreditCardIcon,
  ArrowLeftIcon,
  BuildingOfficeIcon,
} from '@heroicons/react/24/outline';
import Link from 'next/link';
import toast from 'react-hot-toast';

interface BillingOverview {
  seats: {
    current: number;
    allocated: number;
    max: number;
    needsSync: boolean;
  };
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
  organization: {
    id: string;
    name: string;
    stripeCustomerId: string | null;
  };
  portalAvailable: boolean;
}

export default function BillingPage() {
  const [loading, setLoading] = useState(true);
  const [overview, setOverview] = useState<BillingOverview | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [syncing, setSyncing] = useState(false);
  const [portalLoading, setPortalLoading] = useState(false);
  const [teamId, setTeamId] = useState<string | null>(null);
  const [userRole, setUserRole] = useState<string>('member');

  const supabase = createClient();

  const fetchBillingOverview = useCallback(async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.access_token) {
        setError('Not authenticated');
        return;
      }

      const res = await fetch('/api/v1/billing/overview', {
        headers: { Authorization: `Bearer ${session.access_token}` },
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error || 'Failed to load billing information');
        return;
      }

      setOverview(data.overview);
      setTeamId(data.teamId);
      setUserRole(data.userRole || 'member');
    } catch (err: any) {
      console.error('Error fetching billing overview:', err);
      setError('Failed to load billing information');
    } finally {
      setLoading(false);
    }
  }, [supabase]);

  useEffect(() => {
    fetchBillingOverview();
  }, [fetchBillingOverview]);

  const handleSyncSeats = async () => {
    if (!teamId) return;

    setSyncing(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.access_token) return;

      const res = await fetch('/api/v1/billing/seats/sync', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${session.access_token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ teamId, prorate: true }),
      });

      const data = await res.json();

      if (!res.ok) {
        toast.error(data.error || 'Failed to sync seats');
        return;
      }

      if (data.skipped) {
        toast.success('Seats already in sync');
      } else {
        toast.success(`Seats synced: ${data.previousSeats} → ${data.newSeats}`);
      }

      // Refresh overview
      await fetchBillingOverview();
    } catch (err: any) {
      console.error('Error syncing seats:', err);
      toast.error('Failed to sync seats');
    } finally {
      setSyncing(false);
    }
  };

  const handleOpenPortal = async () => {
    setPortalLoading(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.access_token) return;

      const res = await fetch('/api/v1/billing/portal', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${session.access_token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          teamId,
          returnUrl: window.location.href,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        toast.error(data.error || 'Failed to open billing portal');
        return;
      }

      // Redirect to Stripe portal
      window.location.href = data.url;
    } catch (err: any) {
      console.error('Error opening portal:', err);
      toast.error('Failed to open billing portal');
      setPortalLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="space-y-8 animate-fade-in">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Billing</h1>
          <p className="text-muted-foreground mt-2">Loading billing information...</p>
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="h-64 bg-card rounded-lg border border-border animate-pulse" />
          <div className="h-64 bg-card rounded-lg border border-border animate-pulse" />
        </div>
      </div>
    );
  }

  if (error || !overview) {
    return (
      <div className="space-y-8 animate-fade-in">
        <div>
          <Link
            href="/dashboard/settings"
            className="inline-flex items-center text-sm text-muted-foreground hover:text-foreground mb-4"
          >
            <ArrowLeftIcon className="h-4 w-4 mr-1" />
            Back to Settings
          </Link>
          <h1 className="text-3xl font-bold text-foreground">Billing</h1>
        </div>
        <div className="bg-card rounded-lg border border-border p-8 text-center">
          <CreditCardIcon className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
          <h3 className="text-lg font-medium text-foreground mb-2">
            {error || 'No billing information available'}
          </h3>
          <p className="text-muted-foreground">
            {overview?.subscription.status === 'none'
              ? 'Your team is on the free plan. Upgrade to access billing features.'
              : 'Please contact support if you need assistance.'}
          </p>
        </div>
      </div>
    );
  }

  const isOwner = userRole === 'owner';

  return (
    <div className="space-y-8 animate-fade-in">
      {/* Header */}
      <div>
        <Link
          href="/dashboard/settings"
          className="inline-flex items-center text-sm text-muted-foreground hover:text-foreground mb-4"
        >
          <ArrowLeftIcon className="h-4 w-4 mr-1" />
          Back to Settings
        </Link>
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-foreground flex items-center gap-3">
              <CreditCardIcon className="h-8 w-8 text-primary" />
              Billing
            </h1>
            <p className="text-muted-foreground mt-2">
              Manage your team&apos;s subscription and seat allocation
            </p>
          </div>
          {overview.organization.name && (
            <div className="text-right">
              <div className="flex items-center gap-2 text-muted-foreground">
                <BuildingOfficeIcon className="h-4 w-4" />
                <span className="text-sm">Organization</span>
              </div>
              <p className="font-medium text-foreground">{overview.organization.name}</p>
            </div>
          )}
        </div>
      </div>

      {/* Non-owner notice */}
      {!isOwner && (
        <div className="bg-blue-500/10 border border-blue-500/30 rounded-lg p-4">
          <p className="text-sm text-blue-400">
            You&apos;re viewing billing information as a team member. Contact a team owner to make
            changes to your subscription.
          </p>
        </div>
      )}

      {/* Billing Cards */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <SeatUsageCard
          current={overview.seats.current}
          allocated={overview.seats.allocated}
          max={overview.seats.max}
          needsSync={overview.seats.needsSync}
          onSync={isOwner ? handleSyncSeats : undefined}
          syncing={syncing}
        />
        <BillingStatusCard
          subscription={overview.subscription}
          billing={overview.billing}
          portalAvailable={overview.portalAvailable && isOwner}
          onOpenPortal={isOwner ? handleOpenPortal : undefined}
          portalLoading={portalLoading}
        />
      </div>

      {/* Pricing info */}
      <div className="bg-card rounded-lg border border-border p-6">
        <h3 className="text-lg font-semibold text-foreground mb-4">Team Pricing</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="p-4 bg-secondary/50 rounded-lg">
            <p className="text-2xl font-bold text-foreground">$15</p>
            <p className="text-sm text-muted-foreground">per seat / month</p>
            <p className="text-xs text-muted-foreground mt-2">Billed monthly</p>
          </div>
          <div className="p-4 bg-primary/10 border border-primary/30 rounded-lg">
            <div className="flex items-baseline gap-2">
              <p className="text-2xl font-bold text-foreground">$150</p>
              <span className="text-xs text-primary font-medium">Save 17%</span>
            </div>
            <p className="text-sm text-muted-foreground">per seat / year</p>
            <p className="text-xs text-muted-foreground mt-2">Billed annually</p>
          </div>
        </div>
        <p className="text-sm text-muted-foreground mt-4">
          Seats are automatically adjusted when team members are added or removed.
          Additions are prorated immediately; removals take effect at the end of the billing period.
        </p>
      </div>
    </div>
  );
}
