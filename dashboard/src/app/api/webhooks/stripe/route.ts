/**
 * @fileType: api-route
 * @status: current
 * @updated: 2026-01-05
 * @tags: [webhooks, stripe, billing, subscriptions, epic-008]
 * @related: [billing/seats/route.ts, seat-sync.ts]
 * @priority: high
 * @complexity: high
 * @dependencies: [stripe]
 *
 * Stripe webhook handler for billing events (EPIC-008 Sprint 4 Task 6)
 *
 * Handles:
 * - customer.subscription.updated: Seat count changes, plan changes
 * - customer.subscription.deleted: Subscription canceled
 * - invoice.payment_failed: Payment issues
 * - invoice.payment_succeeded: Successful payments
 * - checkout.session.completed: New subscriptions
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import Stripe from 'stripe';

// Lazy initialization to avoid build-time errors when env vars aren't available
let stripe: Stripe | null = null;
function getStripe(): Stripe {
  if (!stripe) {
    stripe = new Stripe(process.env.STRIPE_SECRET_KEY!);
  }
  return stripe;
}

let _supabaseAdmin: ReturnType<typeof createClient> | null = null;
function getSupabaseAdmin() {
  if (!_supabaseAdmin) {
    _supabaseAdmin = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );
  }
  return _supabaseAdmin;
}

function getWebhookSecret(): string {
  return process.env.STRIPE_WEBHOOK_SECRET!;
}

/**
 * POST /api/webhooks/stripe
 * Handle Stripe webhook events
 */
export async function POST(request: NextRequest) {
  const body = await request.text();
  const signature = request.headers.get('stripe-signature');

  if (!signature) {
    console.error('[WEBHOOK] Missing stripe-signature header');
    return NextResponse.json({ error: 'Missing signature' }, { status: 400 });
  }

  let event: Stripe.Event;

  try {
    event = getStripe().webhooks.constructEvent(body, signature, getWebhookSecret());
  } catch (err: any) {
    console.error('[WEBHOOK] Signature verification failed:', err.message);
    return NextResponse.json({ error: 'Invalid signature' }, { status: 400 });
  }

  console.log(`[WEBHOOK] Received event: ${event.type} (${event.id})`);

  try {
    switch (event.type) {
      case 'customer.subscription.updated':
        await handleSubscriptionUpdated(event.data.object as Stripe.Subscription);
        break;

      case 'customer.subscription.deleted':
        await handleSubscriptionDeleted(event.data.object as Stripe.Subscription);
        break;

      case 'invoice.payment_failed':
        await handlePaymentFailed(event.data.object as Stripe.Invoice);
        break;

      case 'invoice.payment_succeeded':
        await handlePaymentSucceeded(event.data.object as Stripe.Invoice);
        break;

      case 'checkout.session.completed':
        await handleCheckoutCompleted(event.data.object as Stripe.Checkout.Session);
        break;

      default:
        console.log(`[WEBHOOK] Unhandled event type: ${event.type}`);
    }

    return NextResponse.json({ received: true });
  } catch (error: any) {
    console.error(`[WEBHOOK] Error handling ${event.type}:`, error);
    return NextResponse.json(
      { error: 'Webhook handler failed' },
      { status: 500 }
    );
  }
}

/**
 * Handle subscription updates (seat changes, plan changes, status changes)
 */
async function handleSubscriptionUpdated(subscription: Stripe.Subscription) {
  const customerId = subscription.customer as string;
  const subscriptionId = subscription.id;
  const status = subscription.status;
  const seatCount = subscription.items.data[0]?.quantity || 1;

  console.log(`[WEBHOOK] Subscription updated: ${subscriptionId}`);
  console.log(`  Status: ${status}, Seats: ${seatCount}`);

  // Find organization by Stripe customer ID
  const { data: org, error: orgError } = await getSupabaseAdmin()
    .from('organizations')
    .select('id, name')
    .eq('stripe_customer_id', customerId)
    .single();

  if (orgError || !org) {
    console.warn(`[WEBHOOK] Organization not found for customer: ${customerId}`);
    return;
  }

  // Update organization subscription info
  const { error: updateError } = await getSupabaseAdmin()
    .from('organizations')
    .update({
      stripe_subscription_id: subscriptionId,
      subscription_status: status,
      seat_count: seatCount,
      updated_at: new Date().toISOString(),
    })
    .eq('id', org.id);

  if (updateError) {
    console.error('[WEBHOOK] Failed to update organization:', updateError);
    return;
  }

  // Log billing event
  await logBillingEvent(org.id, 'subscription_updated', {
    subscriptionId,
    status,
    seatCount,
    previousStatus: subscription.metadata?.previousStatus,
  });

  // Handle status-specific actions
  if (status === 'past_due') {
    await handlePastDue(org.id, subscription);
  } else if (status === 'canceled') {
    await handleCancellation(org.id, subscription);
  }

  console.log(`[WEBHOOK] Updated org ${org.id}: status=${status}, seats=${seatCount}`);
}

/**
 * Handle subscription deletion (cancellation completed)
 */
async function handleSubscriptionDeleted(subscription: Stripe.Subscription) {
  const customerId = subscription.customer as string;
  const subscriptionId = subscription.id;

  console.log(`[WEBHOOK] Subscription deleted: ${subscriptionId}`);

  // Find organization
  const { data: org, error: orgError } = await getSupabaseAdmin()
    .from('organizations')
    .select('id, name')
    .eq('stripe_customer_id', customerId)
    .single();

  if (orgError || !org) {
    console.warn(`[WEBHOOK] Organization not found for customer: ${customerId}`);
    return;
  }

  // Downgrade to free tier
  const { error: updateError } = await getSupabaseAdmin()
    .from('organizations')
    .update({
      stripe_subscription_id: null,
      subscription_status: 'canceled',
      plan_tier: 'free',
      seat_count: 2, // Free tier limit
      updated_at: new Date().toISOString(),
    })
    .eq('id', org.id);

  if (updateError) {
    console.error('[WEBHOOK] Failed to downgrade organization:', updateError);
    return;
  }

  // Log billing event
  await logBillingEvent(org.id, 'subscription_canceled', {
    subscriptionId,
    reason: subscription.cancellation_details?.reason || 'unknown',
  });

  console.log(`[WEBHOOK] Downgraded org ${org.id} to free tier`);
}

/**
 * Handle failed payment
 */
async function handlePaymentFailed(invoice: Stripe.Invoice) {
  const customerId = invoice.customer as string;
  const subscriptionId = invoice.subscription as string;
  const attemptCount = invoice.attempt_count || 1;

  console.log(`[WEBHOOK] Payment failed for invoice ${invoice.id}`);
  console.log(`  Customer: ${customerId}, Attempt: ${attemptCount}`);

  // Find organization
  const { data: org, error: orgError } = await getSupabaseAdmin()
    .from('organizations')
    .select('id, name')
    .eq('stripe_customer_id', customerId)
    .single();

  if (orgError || !org) {
    console.warn(`[WEBHOOK] Organization not found for customer: ${customerId}`);
    return;
  }

  // Log billing event
  await logBillingEvent(org.id, 'payment_failed', {
    invoiceId: invoice.id,
    subscriptionId,
    attemptCount,
    amountDue: invoice.amount_due,
    currency: invoice.currency,
  });

  // Update organization payment status
  const { error: updateError } = await getSupabaseAdmin()
    .from('organizations')
    .update({
      payment_status: 'failed',
      payment_failed_at: new Date().toISOString(),
      payment_attempt_count: attemptCount,
      updated_at: new Date().toISOString(),
    })
    .eq('id', org.id);

  if (updateError) {
    console.error('[WEBHOOK] Failed to update payment status:', updateError);
  }

  // TODO: Send notification email to team owner
  // await sendPaymentFailedEmail(org.id, attemptCount);

  console.log(`[WEBHOOK] Recorded payment failure for org ${org.id} (attempt ${attemptCount})`);
}

/**
 * Handle successful payment
 */
async function handlePaymentSucceeded(invoice: Stripe.Invoice) {
  const customerId = invoice.customer as string;
  const subscriptionId = invoice.subscription as string;

  console.log(`[WEBHOOK] Payment succeeded for invoice ${invoice.id}`);

  // Find organization
  const { data: org, error: orgError } = await getSupabaseAdmin()
    .from('organizations')
    .select('id, name')
    .eq('stripe_customer_id', customerId)
    .single();

  if (orgError || !org) {
    console.warn(`[WEBHOOK] Organization not found for customer: ${customerId}`);
    return;
  }

  // Clear any payment failure status
  const { error: updateError } = await getSupabaseAdmin()
    .from('organizations')
    .update({
      payment_status: 'succeeded',
      payment_failed_at: null,
      payment_attempt_count: 0,
      last_payment_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    })
    .eq('id', org.id);

  if (updateError) {
    console.error('[WEBHOOK] Failed to update payment status:', updateError);
  }

  // Log billing event
  await logBillingEvent(org.id, 'payment_succeeded', {
    invoiceId: invoice.id,
    subscriptionId,
    amountPaid: invoice.amount_paid,
    currency: invoice.currency,
  });

  console.log(`[WEBHOOK] Recorded successful payment for org ${org.id}`);
}

/**
 * Handle checkout session completed (new subscription)
 */
async function handleCheckoutCompleted(session: Stripe.Checkout.Session) {
  const customerId = session.customer as string;
  const subscriptionId = session.subscription as string;

  console.log(`[WEBHOOK] Checkout completed: ${session.id}`);

  if (!subscriptionId) {
    console.log('[WEBHOOK] No subscription in checkout session');
    return;
  }

  // Get subscription details
  const subscription = await getStripe().subscriptions.retrieve(subscriptionId);
  const seatCount = subscription.items.data[0]?.quantity || 1;

  // Find organization by Stripe customer ID
  const { data: org, error: orgError } = await getSupabaseAdmin()
    .from('organizations')
    .select('id, name')
    .eq('stripe_customer_id', customerId)
    .single();

  if (orgError || !org) {
    // Try to find by metadata
    const orgId = session.metadata?.organizationId;
    if (orgId) {
      await getSupabaseAdmin()
        .from('organizations')
        .update({
          stripe_customer_id: customerId,
          stripe_subscription_id: subscriptionId,
          subscription_status: subscription.status,
          plan_tier: 'team',
          seat_count: seatCount,
          updated_at: new Date().toISOString(),
        })
        .eq('id', orgId);

      console.log(`[WEBHOOK] Linked subscription to org ${orgId}`);
    } else {
      console.warn(`[WEBHOOK] Could not find organization for customer: ${customerId}`);
    }
    return;
  }

  // Update organization
  const { error: updateError } = await getSupabaseAdmin()
    .from('organizations')
    .update({
      stripe_subscription_id: subscriptionId,
      subscription_status: subscription.status,
      plan_tier: 'team',
      seat_count: seatCount,
      updated_at: new Date().toISOString(),
    })
    .eq('id', org.id);

  if (updateError) {
    console.error('[WEBHOOK] Failed to update organization:', updateError);
    return;
  }

  // Log billing event
  await logBillingEvent(org.id, 'subscription_created', {
    subscriptionId,
    seatCount,
    plan: 'team',
  });

  console.log(`[WEBHOOK] Created subscription for org ${org.id}`);
}

/**
 * Handle past due subscription
 */
async function handlePastDue(orgId: string, subscription: Stripe.Subscription) {
  console.log(`[WEBHOOK] Subscription past due for org ${orgId}`);

  // Update organization status
  await getSupabaseAdmin()
    .from('organizations')
    .update({
      subscription_status: 'past_due',
      updated_at: new Date().toISOString(),
    })
    .eq('id', orgId);

  // TODO: Send notification email
  // await sendPastDueEmail(orgId);

  // Log event
  await logBillingEvent(orgId, 'subscription_past_due', {
    subscriptionId: subscription.id,
    daysOverdue: Math.floor(
      (Date.now() / 1000 - subscription.current_period_end) / 86400
    ),
  });
}

/**
 * Handle subscription cancellation
 */
async function handleCancellation(orgId: string, subscription: Stripe.Subscription) {
  console.log(`[WEBHOOK] Subscription canceled for org ${orgId}`);

  // Log event
  await logBillingEvent(orgId, 'subscription_will_cancel', {
    subscriptionId: subscription.id,
    cancelAt: subscription.cancel_at,
    reason: subscription.cancellation_details?.reason,
  });

  // TODO: Send cancellation confirmation email
  // await sendCancellationEmail(orgId, subscription.cancel_at);
}

/**
 * Log a billing event for audit trail
 */
async function logBillingEvent(
  orgId: string,
  eventType: string,
  metadata: Record<string, any>
) {
  try {
    await getSupabaseAdmin().from('billing_events').insert({
      organization_id: orgId,
      event_type: eventType,
      metadata,
      created_at: new Date().toISOString(),
    });
  } catch (error) {
    // Don't fail the webhook if logging fails
    console.error('[WEBHOOK] Failed to log billing event:', error);
  }
}
