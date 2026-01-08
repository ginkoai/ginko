#!/usr/bin/env node

/**
 * @fileType: service
 * @status: new
 * @updated: 2025-08-01
 * @tags: [billing, stripe, subscriptions, payments, webhooks]
 * @related: [auth-manager.ts, usage-tracker.ts, database.ts]
 * @priority: critical
 * @complexity: high
 * @dependencies: [stripe]
 */

import Stripe from 'stripe';
import { DatabaseManager } from './database.js';
import { AuthenticatedUser, PlanTier, PlanStatus } from './auth-manager.js';
import { UsageTracker, UsageEventType } from './usage-tracker.js';

export interface BillingCustomer {
  id: string;
  organizationId: string;
  stripeCustomerId: string;
  billingEmail: string;
  name: string;
  address?: Stripe.Address;
  paymentMethods: Stripe.PaymentMethod[];
}

export interface BillingSubscription {
  id: string;
  customerId: string;
  stripeSubscriptionId: string;
  planTier: PlanTier;
  status: Stripe.Subscription.Status;
  currentPeriodStart: Date;
  currentPeriodEnd: Date;
  trialEnd?: Date;
  cancelAtPeriodEnd: boolean;
  metadata: Record<string, string>;
  // Seat-based billing fields (EPIC-008 Sprint 4)
  seatCount?: number;        // Current number of seats
  seatLimit?: number;        // Max seats for plan (null = unlimited)
  pricePerSeat?: number;     // Price per seat in cents
}

export interface PlanPricing {
  planTier: PlanTier;
  name: string;
  description: string;
  priceId: string;
  amount: number; // cents
  currency: string;
  interval: 'month' | 'year';
  trialPeriodDays?: number;
  gracePeriodDays?: number;   // Days after trial ends before full downgrade (EPIC-008 Sprint 4 Task 7)
  features: string[];
  // Seat-based pricing (EPIC-008 Sprint 4)
  perSeat?: boolean;          // If true, amount is per seat
  includedSeats?: number;     // Base seats included in plan
  maxSeats?: number;          // Max seats allowed (null = unlimited)
}

/**
 * Team seat allocation tracking (EPIC-008 Sprint 4)
 * Tracks how many seats a team has allocated vs. their limit
 */
export interface TeamSeatAllocation {
  teamId: string;
  organizationId: string;
  currentSeats: number;       // Active members
  allocatedSeats: number;     // Paid seats in subscription
  maxSeats: number | null;    // Plan limit (null = unlimited)
  lastSyncedAt: Date;         // Last sync with Stripe
}

export class BillingError extends Error {
  constructor(
    message: string,
    public code: string = 'BILLING_ERROR',
    public stripeError?: any
  ) {
    super(message);
    this.name = 'BillingError';
  }
}

/**
 * Manages Stripe billing integration including customers, subscriptions, and webhooks
 * 
 * STRIPE SETUP INSTRUCTIONS:
 * 
 * 1. Create Stripe Account:
 *    - Go to https://dashboard.stripe.com/register
 *    - Complete account setup and verification
 * 
 * 2. Get API Keys:
 *    - Navigate to Developers > API Keys
 *    - Copy Publishable Key and Secret Key
 *    - Set environment variables:
 *      STRIPE_SECRET_KEY=sk_test_...
 *      STRIPE_PUBLISHABLE_KEY=pk_test_...
 *      STRIPE_WEBHOOK_SECRET=whsec_... (after step 4)
 * 
 * 3. Create Products and Prices:
 *    Run the setupStripeProducts() method or create manually:
 *    
 *    FREE PLAN (manual signup, no payment):
 *    - No Stripe product needed
 *    
 *    PRO PLAN:
 *    - Product: "Ginko Pro"
 *    - Price: $29/month or $290/year (save 17%)
 *    - Price ID: price_pro_monthly, price_pro_yearly
 *    
 *    ENTERPRISE PLAN:
 *    - Product: "Ginko Enterprise"  
 *    - Price: $99/month or $990/year (save 17%)
 *    - Price ID: price_enterprise_monthly, price_enterprise_yearly
 * 
 * 4. Setup Webhooks:
 *    - Go to Developers > Webhooks
 *    - Add endpoint: https://your-domain.com/api/webhooks/stripe
 *    - Select events:
 *      - customer.subscription.created
 *      - customer.subscription.updated  
 *      - customer.subscription.deleted
 *      - customer.subscription.trial_will_end
 *      - invoice.payment_succeeded
 *      - invoice.payment_failed
 *      - customer.created
 *      - customer.updated
 *    - Copy webhook signing secret to STRIPE_WEBHOOK_SECRET
 * 
 * 5. Test Mode:
 *    - Use test credit cards: 4242424242424242 (Visa)
 *    - CVV: Any 3 digits, Exp: Any future date
 *    - Use test mode until ready for production
 */
export class BillingManager {
  private stripe: Stripe;
  private db: DatabaseManager;
  private usageTracker: UsageTracker;
  
  // Plan configuration - should match PLAN_CONFIGURATIONS in entitlements-manager.ts
  public readonly PLAN_PRICING: Record<PlanTier, PlanPricing[]> = {
    free: [], // Free plan has no Stripe pricing
    pro: [
      {
        planTier: 'pro',
        name: 'Ginko Pro Monthly',
        description: '10 projects, 1000 sessions/month, team collaboration',
        priceId: process.env.STRIPE_PRO_MONTHLY_PRICE_ID || 'price_pro_monthly',
        amount: 900, // $9.00
        currency: 'usd',
        interval: 'month',
        trialPeriodDays: 14,
        features: [
          '10 projects',
          '1,000 sessions per month', 
          'Team collaboration',
          'Git integration',
          'Usage analytics',
          'Best practices management'
        ]
      },
      {
        planTier: 'pro',
        name: 'Ginko Pro Yearly',
        description: '10 projects, 1000 sessions/month, team collaboration (save 17%)',
        priceId: process.env.STRIPE_PRO_YEARLY_PRICE_ID || 'price_pro_yearly',
        amount: 9000, // $90.00 (save 17%)
        currency: 'usd',
        interval: 'year',
        trialPeriodDays: 14,
        features: [
          '10 projects',
          '1,000 sessions per month',
          'Team collaboration', 
          'Git integration',
          'Usage analytics',
          'Best practices management',
          '17% savings vs monthly'
        ]
      }
    ],
    // Team tier - per-seat pricing (EPIC-008 Sprint 4)
    team: [
      {
        planTier: 'team',
        name: 'Ginko Team Monthly',
        description: 'Team collaboration with per-seat billing',
        priceId: process.env.STRIPE_TEAM_MONTHLY_PRICE_ID || 'price_team_monthly',
        amount: 1500, // $15.00 per seat
        currency: 'usd',
        interval: 'month',
        trialPeriodDays: 14,
        gracePeriodDays: 3,  // 3-day grace period after trial (EPIC-008 Sprint 4 Task 7)
        perSeat: true,
        includedSeats: 1,    // First seat included in base price
        maxSeats: 50,        // Max 50 seats per team
        features: [
          'Per-seat pricing ($15/seat/month)',
          'Team collaboration',
          'Shared knowledge graph',
          'Role-based permissions',
          'Team analytics',
          'Priority support'
        ]
      },
      {
        planTier: 'team',
        name: 'Ginko Team Yearly',
        description: 'Team collaboration with per-seat billing (save 17%)',
        priceId: process.env.STRIPE_TEAM_YEARLY_PRICE_ID || 'price_team_yearly',
        amount: 15000, // $150.00 per seat/year (save 17%)
        currency: 'usd',
        interval: 'year',
        trialPeriodDays: 14,
        gracePeriodDays: 3,  // 3-day grace period after trial (EPIC-008 Sprint 4 Task 7)
        perSeat: true,
        includedSeats: 1,
        maxSeats: 50,
        features: [
          'Per-seat pricing ($150/seat/year)',
          'Team collaboration',
          'Shared knowledge graph',
          'Role-based permissions',
          'Team analytics',
          'Priority support',
          '17% savings vs monthly'
        ]
      }
    ],
    enterprise: [
      {
        planTier: 'enterprise',
        name: 'Ginko Enterprise Monthly',
        description: 'Unlimited usage, SSO, priority support',
        priceId: process.env.STRIPE_ENTERPRISE_MONTHLY_PRICE_ID || 'price_enterprise_monthly',
        amount: 2900, // $29.00
        currency: 'usd',
        interval: 'month',
        perSeat: true,
        includedSeats: 5,    // 5 seats included in base
        maxSeats: undefined, // Unlimited
        features: [
          'Unlimited projects and sessions',
          'Advanced team collaboration',
          'SSO integration',
          'Custom integrations',
          'Priority support',
          'White label options'
        ]
      },
      {
        planTier: 'enterprise',
        name: 'Ginko Enterprise Yearly',
        description: 'Unlimited usage, SSO, priority support (save 17%)',
        priceId: process.env.STRIPE_ENTERPRISE_YEARLY_PRICE_ID || 'price_enterprise_yearly',
        amount: 29000, // $290.00 (save 17%)
        currency: 'usd',
        interval: 'year',
        perSeat: true,
        includedSeats: 5,
        maxSeats: undefined, // Unlimited
        features: [
          'Unlimited projects and sessions',
          'Advanced team collaboration',
          'SSO integration',
          'Custom integrations',
          'Priority support',
          'White label options',
          '17% savings vs monthly'
        ]
      }
    ]
  };

  constructor(db: DatabaseManager, usageTracker: UsageTracker) {
    const secretKey = process.env.STRIPE_SECRET_KEY;
    if (!secretKey) {
      throw new Error('STRIPE_SECRET_KEY environment variable is required');
    }

    // Handle test/fake keys gracefully
    if (secretKey.startsWith('sk_test_fake') || secretKey === 'sk_test_fake_key_for_testing') {
      console.warn('[BILLING] Using fake Stripe key - billing features will be mocked');
      // Create a mock Stripe instance for testing
      this.stripe = {
        customers: { create: async () => ({ id: 'cus_fake' }) },
        subscriptions: { create: async () => ({ id: 'sub_fake', status: 'active' }) },
        webhooks: { constructEvent: () => ({ type: 'test', data: {} }) }
      } as any;
    } else {
      this.stripe = new Stripe(secretKey, {
        apiVersion: '2025-12-15.clover', // Use latest API version
        typescript: true
      });
    }

    this.db = db;
    this.usageTracker = usageTracker;
  }

  /**
   * Create or get Stripe customer for organization
   */
  async createCustomer(
    organizationId: string,
    billingEmail: string,
    name: string,
    address?: Stripe.AddressParam
  ): Promise<BillingCustomer> {
    try {
      // Check if customer already exists
      const existing = await this.db.query(`
        SELECT stripe_customer_id FROM organizations WHERE id = $1
      `, [organizationId]);

      if (existing.rows[0]?.stripe_customer_id) {
        return await this.getCustomer(organizationId);
      }

      // Create new Stripe customer
      const customer = await this.stripe.customers.create({
        email: billingEmail,
        name,
        address,
        metadata: {
          organizationId,
          source: 'contextmcp'
        }
      });

      // Update organization with Stripe customer ID
      await this.db.query(`
        UPDATE organizations 
        SET stripe_customer_id = $1, billing_email = $2, updated_at = NOW()
        WHERE id = $3
      `, [customer.id, billingEmail, organizationId]);

      // Track billing event
      await this.usageTracker.track(organizationId, UsageEventType.API_REQUEST, {
        metadata: { action: 'customer_created', stripe_customer_id: customer.id }
      });

      console.log(`[BILLING] Created Stripe customer ${customer.id} for organization ${organizationId}`);

      return {
        id: customer.id,
        organizationId,
        stripeCustomerId: customer.id,
        billingEmail,
        name,
        address: customer.address || undefined,
        paymentMethods: []
      };
    } catch (error) {
      if (error instanceof Stripe.errors.StripeError) {
        throw new BillingError(
          `Failed to create customer: ${error.message}`,
          'CUSTOMER_CREATION_FAILED',
          error
        );
      }
      throw error;
    }
  }

  /**
   * Get existing customer information
   */
  async getCustomer(organizationId: string): Promise<BillingCustomer> {
    const result = await this.db.query(`
      SELECT stripe_customer_id, billing_email, name 
      FROM organizations 
      WHERE id = $1
    `, [organizationId]);

    if (!result.rows[0]?.stripe_customer_id) {
      throw new BillingError('No Stripe customer found for organization', 'CUSTOMER_NOT_FOUND');
    }

    const customer = await this.stripe.customers.retrieve(result.rows[0].stripe_customer_id) as Stripe.Customer;
    
    // Get payment methods
    const paymentMethods = await this.stripe.paymentMethods.list({
      customer: customer.id,
      type: 'card'
    });

    return {
      id: customer.id,
      organizationId,
      stripeCustomerId: customer.id,
      billingEmail: result.rows[0].billing_email,
      name: result.rows[0].name,
      address: customer.address || undefined,
      paymentMethods: paymentMethods.data
    };
  }

  /**
   * Create subscription for a plan
   */
  async createSubscription(
    organizationId: string,
    planTier: PlanTier,
    interval: 'month' | 'year' = 'month',
    paymentMethodId?: string
  ): Promise<BillingSubscription> {
    try {
      // Get customer
      const customer = await this.getCustomer(organizationId);
      
      // Get price ID for plan
      const pricing = this.PLAN_PRICING[planTier].find(p => p.interval === interval);
      if (!pricing) {
        throw new BillingError(`No pricing found for ${planTier} ${interval}`, 'PRICE_NOT_FOUND');
      }

      // Create subscription
      const subscriptionData: Stripe.SubscriptionCreateParams = {
        customer: customer.stripeCustomerId,
        items: [{ price: pricing.priceId }],
        metadata: {
          organizationId,
          planTier,
          interval
        },
        expand: ['latest_invoice.payment_intent']
      };

      // Add trial period if configured
      if (pricing.trialPeriodDays) {
        subscriptionData.trial_period_days = pricing.trialPeriodDays;
      }

      // Add payment method if provided
      if (paymentMethodId) {
        subscriptionData.default_payment_method = paymentMethodId;
      }

      const subscription = await this.stripe.subscriptions.create(subscriptionData);

      // Update organization with subscription info
      await this.db.query(`
        UPDATE organizations 
        SET 
          plan_tier = $1,
          plan_status = $2,
          stripe_subscription_id = $3,
          trial_ends_at = $4,
          updated_at = NOW()
        WHERE id = $5
      `, [
        planTier,
        subscription.status,
        subscription.id,
        subscription.trial_end ? new Date(subscription.trial_end * 1000) : null,
        organizationId
      ]);

      // Track subscription event
      await this.usageTracker.track(organizationId, UsageEventType.API_REQUEST, {
        metadata: { 
          action: 'subscription_created', 
          plan_tier: planTier,
          stripe_subscription_id: subscription.id 
        }
      });

      console.log(`[BILLING] Created ${planTier} subscription ${subscription.id} for organization ${organizationId}`);

      return this.formatSubscription(subscription, organizationId);
    } catch (error) {
      if (error instanceof Stripe.errors.StripeError) {
        throw new BillingError(
          `Failed to create subscription: ${error.message}`,
          'SUBSCRIPTION_CREATION_FAILED',
          error
        );
      }
      throw error;
    }
  }

  /**
   * Update subscription (upgrade/downgrade)
   */
  async updateSubscription(
    organizationId: string,
    newPlanTier: PlanTier,
    interval: 'month' | 'year' = 'month'
  ): Promise<BillingSubscription> {
    try {
      // Get current subscription
      const org = await this.db.query(`
        SELECT stripe_subscription_id, plan_tier FROM organizations WHERE id = $1
      `, [organizationId]);

      if (!org.rows[0]?.stripe_subscription_id) {
        throw new BillingError('No active subscription found', 'SUBSCRIPTION_NOT_FOUND');
      }

      const currentSubscription = await this.stripe.subscriptions.retrieve(org.rows[0].stripe_subscription_id);
      
      // Get new price
      const newPricing = this.PLAN_PRICING[newPlanTier].find(p => p.interval === interval);
      if (!newPricing) {
        throw new BillingError(`No pricing found for ${newPlanTier} ${interval}`, 'PRICE_NOT_FOUND');
      }

      // Update subscription
      const updatedSubscription = await this.stripe.subscriptions.update(currentSubscription.id, {
        items: [{
          id: currentSubscription.items.data[0].id,
          price: newPricing.priceId
        }],
        proration_behavior: 'create_prorations', // Pro-rate the charges
        metadata: {
          ...currentSubscription.metadata,
          planTier: newPlanTier,
          interval,
          upgraded_from: org.rows[0].plan_tier
        }
      });

      // Update database
      await this.db.query(`
        UPDATE organizations 
        SET plan_tier = $1, updated_at = NOW()
        WHERE id = $2
      `, [newPlanTier, organizationId]);

      // Track upgrade/downgrade
      await this.usageTracker.track(organizationId, UsageEventType.API_REQUEST, {
        metadata: { 
          action: 'subscription_updated',
          from_plan: org.rows[0].plan_tier,
          to_plan: newPlanTier 
        }
      });

      console.log(`[BILLING] Updated subscription for organization ${organizationId}: ${org.rows[0].plan_tier} → ${newPlanTier}`);

      return this.formatSubscription(updatedSubscription, organizationId);
    } catch (error) {
      if (error instanceof Stripe.errors.StripeError) {
        throw new BillingError(
          `Failed to update subscription: ${error.message}`,
          'SUBSCRIPTION_UPDATE_FAILED',
          error
        );
      }
      throw error;
    }
  }

  /**
   * Cancel subscription
   */
  async cancelSubscription(
    organizationId: string,
    cancelAtPeriodEnd: boolean = true
  ): Promise<BillingSubscription> {
    try {
      const org = await this.db.query(`
        SELECT stripe_subscription_id FROM organizations WHERE id = $1
      `, [organizationId]);

      if (!org.rows[0]?.stripe_subscription_id) {
        throw new BillingError('No active subscription found', 'SUBSCRIPTION_NOT_FOUND');
      }

      const subscription = await this.stripe.subscriptions.update(org.rows[0].stripe_subscription_id, {
        cancel_at_period_end: cancelAtPeriodEnd,
        metadata: {
          cancellation_requested: new Date().toISOString()
        }
      });

      // Update organization if canceling immediately
      if (!cancelAtPeriodEnd) {
        await this.db.query(`
          UPDATE organizations 
          SET plan_tier = 'free', plan_status = 'canceled', updated_at = NOW()
          WHERE id = $1
        `, [organizationId]);
      }

      // Track cancellation
      await this.usageTracker.track(organizationId, UsageEventType.API_REQUEST, {
        metadata: { 
          action: 'subscription_canceled',
          cancel_at_period_end: cancelAtPeriodEnd 
        }
      });

      console.log(`[BILLING] Canceled subscription for organization ${organizationId} (at period end: ${cancelAtPeriodEnd})`);

      return this.formatSubscription(subscription, organizationId);
    } catch (error) {
      if (error instanceof Stripe.errors.StripeError) {
        throw new BillingError(
          `Failed to cancel subscription: ${error.message}`,
          'SUBSCRIPTION_CANCELLATION_FAILED',
          error
        );
      }
      throw error;
    }
  }

  /**
   * Handle Stripe webhooks
   */
  async handleWebhook(
    rawBody: string | Buffer,
    signature: string
  ): Promise<void> {
    const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;
    if (!webhookSecret) {
      throw new BillingError('STRIPE_WEBHOOK_SECRET not configured', 'WEBHOOK_SECRET_MISSING');
    }

    let event: Stripe.Event;

    try {
      event = this.stripe.webhooks.constructEvent(rawBody, signature, webhookSecret);
    } catch (error) {
      throw new BillingError(
        `Webhook signature verification failed: ${error instanceof Error ? error.message : String(error)}`,
        'WEBHOOK_SIGNATURE_INVALID'
      );
    }

    console.log(`[BILLING] Processing webhook: ${event.type}`);

    try {
      switch (event.type) {
        case 'customer.subscription.created':
        case 'customer.subscription.updated':
          await this.handleSubscriptionUpdate(event.data.object as Stripe.Subscription);
          break;

        case 'customer.subscription.deleted':
          await this.handleSubscriptionDeleted(event.data.object as Stripe.Subscription);
          break;

        case 'customer.subscription.trial_will_end':
          await this.handleTrialWillEnd(event.data.object as Stripe.Subscription);
          break;

        case 'invoice.payment_succeeded':
          await this.handlePaymentSucceeded(event.data.object as Stripe.Invoice);
          break;

        case 'invoice.payment_failed':
          await this.handlePaymentFailed(event.data.object as Stripe.Invoice);
          break;

        default:
          console.log(`[BILLING] Unhandled webhook event: ${event.type}`);
      }
    } catch (error) {
      console.error(`[BILLING] Error processing webhook ${event.type}:`, error);
      throw error;
    }
  }

  /**
   * Handle subscription created/updated webhook
   */
  private async handleSubscriptionUpdate(subscription: Stripe.Subscription): Promise<void> {
    const organizationId = subscription.metadata.organizationId;
    if (!organizationId) {
      console.warn('[BILLING] Subscription webhook missing organizationId metadata');
      return;
    }

    const planTier = subscription.metadata.planTier as PlanTier || 'free';
    const planStatus = this.mapStripeStatusToPlanStatus(subscription.status);

    await this.db.query(`
      UPDATE organizations 
      SET 
        plan_tier = $1,
        plan_status = $2,
        stripe_subscription_id = $3,
        trial_ends_at = $4,
        updated_at = NOW()
      WHERE id = $5
    `, [
      planTier,
      planStatus,
      subscription.id,
      subscription.trial_end ? new Date(subscription.trial_end * 1000) : null,
      organizationId
    ]);

    console.log(`[BILLING] Updated organization ${organizationId}: ${planTier} (${planStatus})`);
  }

  /**
   * Handle subscription deleted webhook
   */
  private async handleSubscriptionDeleted(subscription: Stripe.Subscription): Promise<void> {
    const organizationId = subscription.metadata.organizationId;
    if (!organizationId) {
      console.warn('[BILLING] Subscription deletion webhook missing organizationId metadata');
      return;
    }

    await this.db.query(`
      UPDATE organizations 
      SET 
        plan_tier = 'free',
        plan_status = 'canceled',
        stripe_subscription_id = NULL,
        trial_ends_at = NULL,
        updated_at = NOW()
      WHERE id = $1
    `, [organizationId]);

    console.log(`[BILLING] Downgraded organization ${organizationId} to free plan (subscription deleted)`);
  }

  /**
   * Handle trial will end webhook
   */
  private async handleTrialWillEnd(subscription: Stripe.Subscription): Promise<void> {
    const organizationId = subscription.metadata.organizationId;
    if (!organizationId) return;

    // TODO: Send trial ending email notification
    console.log(`[BILLING] Trial ending soon for organization ${organizationId}`);
  }

  /**
   * Handle successful payment webhook
   */
  private async handlePaymentSucceeded(invoice: Stripe.Invoice): Promise<void> {
    const customerId = typeof invoice.customer === 'string' ? invoice.customer : invoice.customer?.id;
    if (!customerId) return;

    // Find organization by customer ID
    const org = await this.db.query(`
      SELECT id FROM organizations WHERE stripe_customer_id = $1
    `, [customerId]);

    if (org.rows[0]) {
      await this.usageTracker.track(org.rows[0].id, UsageEventType.API_REQUEST, {
        metadata: { 
          action: 'payment_succeeded',
          amount: invoice.amount_paid,
          invoice_id: invoice.id
        }
      });

      console.log(`[BILLING] Payment succeeded for organization ${org.rows[0].id}: $${(invoice.amount_paid / 100).toFixed(2)}`);
    }
  }

  /**
   * Handle failed payment webhook  
   */
  private async handlePaymentFailed(invoice: Stripe.Invoice): Promise<void> {
    const customerId = typeof invoice.customer === 'string' ? invoice.customer : invoice.customer?.id;
    if (!customerId) return;

    // Find organization and update status
    const org = await this.db.query(`
      SELECT id FROM organizations WHERE stripe_customer_id = $1
    `, [customerId]);

    if (org.rows[0]) {
      await this.db.query(`
        UPDATE organizations 
        SET plan_status = 'past_due', updated_at = NOW()
        WHERE id = $1
      `, [org.rows[0].id]);

      // TODO: Send payment failed email notification
      console.log(`[BILLING] Payment failed for organization ${org.rows[0].id}`);
    }
  }

  /**
   * Create Stripe customer portal session for self-service billing
   */
  async createPortalSession(
    organizationId: string,
    returnUrl: string
  ): Promise<{ url: string }> {
    const customer = await this.getCustomer(organizationId);
    
    const session = await this.stripe.billingPortal.sessions.create({
      customer: customer.stripeCustomerId,
      return_url: returnUrl
    });

    return { url: session.url };
  }

  /**
   * Format Stripe subscription for API response
   */
  private formatSubscription(subscription: Stripe.Subscription, organizationId: string): BillingSubscription {
    const planTier = subscription.metadata.planTier as PlanTier || 'free';
    const pricing = this.PLAN_PRICING[planTier]?.[0];
    const firstItem = subscription.items.data[0];
    const seatCount = firstItem?.quantity || 1;

    return {
      id: subscription.id,
      customerId: typeof subscription.customer === 'string' ? subscription.customer : subscription.customer.id,
      stripeSubscriptionId: subscription.id,
      planTier,
      status: subscription.status,
      currentPeriodStart: new Date(firstItem.current_period_start * 1000),
      currentPeriodEnd: new Date(firstItem.current_period_end * 1000),
      trialEnd: subscription.trial_end ? new Date(subscription.trial_end * 1000) : undefined,
      cancelAtPeriodEnd: subscription.cancel_at_period_end,
      metadata: subscription.metadata,
      // Seat info (EPIC-008 Sprint 4)
      seatCount,
      seatLimit: pricing?.maxSeats ?? undefined,
      pricePerSeat: pricing?.perSeat ? pricing.amount : undefined
    };
  }

  /**
   * Map Stripe subscription status to internal plan status
   */
  private mapStripeStatusToPlanStatus(stripeStatus: Stripe.Subscription.Status): PlanStatus {
    switch (stripeStatus) {
      case 'active':
        return 'active';
      case 'trialing':
        return 'trialing';
      case 'past_due':
        return 'past_due';
      case 'canceled':
      case 'unpaid':
        return 'canceled';
      default:
        return 'canceled';
    }
  }

  /**
   * Setup Stripe products and prices (run once during deployment)
   */
  async setupStripeProducts(): Promise<void> {
    console.log('[BILLING] Setting up Stripe products and prices...');

    // Create Pro plan products and prices
    await this.createProductAndPrices('pro', 'Ginko Pro', 'Professional AI coding context management with team collaboration');

    // Create Team plan products and prices (EPIC-008 Sprint 4 - per-seat billing)
    await this.createProductAndPrices('team', 'Ginko Team', 'Team collaboration with per-seat billing');

    // Create Enterprise plan products and prices
    await this.createProductAndPrices('enterprise', 'Ginko Enterprise', 'Enterprise AI coding context management with unlimited usage and priority support');

    console.log('[BILLING] Stripe products and prices setup complete');
  }

  /**
   * Create Stripe product and prices for a plan
   */
  private async createProductAndPrices(planTier: PlanTier, name: string, description: string): Promise<void> {
    if (planTier === 'free') return; // Free plan doesn't need Stripe products

    // Create product
    const product = await this.stripe.products.create({
      name,
      description,
      metadata: { planTier }
    });

    // Create prices for this product
    const pricingConfigs = this.PLAN_PRICING[planTier];
    for (const config of pricingConfigs) {
      const price = await this.stripe.prices.create({
        product: product.id,
        unit_amount: config.amount,
        currency: config.currency,
        recurring: { interval: config.interval },
        metadata: {
          planTier,
          interval: config.interval
        }
      });

      console.log(`[BILLING] Created price ${price.id} for ${planTier} ${config.interval}: $${(config.amount / 100).toFixed(2)}/${config.interval}`);
    }
  }

  // ============================================================================
  // Trial & Grace Period Methods (EPIC-008 Sprint 4 Task 7)
  // ============================================================================

  /**
   * Check if organization is currently in trial period
   */
  async isTrialActive(organizationId: string): Promise<{ active: boolean; daysRemaining?: number; endsAt?: Date }> {
    const org = await this.db.query(`
      SELECT trial_ends_at, plan_status FROM organizations WHERE id = $1
    `, [organizationId]);

    if (!org.rows[0]?.trial_ends_at) {
      return { active: false };
    }

    const trialEnd = new Date(org.rows[0].trial_ends_at);
    const now = new Date();

    if (trialEnd > now && org.rows[0].plan_status === 'trialing') {
      const daysRemaining = Math.ceil((trialEnd.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
      return { active: true, daysRemaining, endsAt: trialEnd };
    }

    return { active: false, endsAt: trialEnd };
  }

  /**
   * Check if organization is in grace period after trial ended
   * Grace period allows limited access for 3 days after trial to convert
   */
  async isInGracePeriod(organizationId: string): Promise<{ inGrace: boolean; daysRemaining?: number; endsAt?: Date }> {
    const org = await this.db.query(`
      SELECT trial_ends_at, plan_status, plan_tier FROM organizations WHERE id = $1
    `, [organizationId]);

    if (!org.rows[0]?.trial_ends_at) {
      return { inGrace: false };
    }

    const trialEnd = new Date(org.rows[0].trial_ends_at);
    const now = new Date();
    const planTier = org.rows[0].plan_tier as PlanTier;

    // Get grace period days from pricing config (default 3)
    const pricing = this.PLAN_PRICING[planTier]?.[0];
    const gracePeriodDays = pricing?.gracePeriodDays || 3;

    const graceEnd = new Date(trialEnd);
    graceEnd.setDate(graceEnd.getDate() + gracePeriodDays);

    // In grace period if trial ended but grace hasn't
    if (trialEnd <= now && graceEnd > now && org.rows[0].plan_status !== 'active') {
      const daysRemaining = Math.ceil((graceEnd.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
      return { inGrace: true, daysRemaining, endsAt: graceEnd };
    }

    return { inGrace: false };
  }

  /**
   * Get complete trial/subscription status for an organization
   * Used by dashboard to show appropriate upgrade prompts
   */
  async getSubscriptionStatus(organizationId: string): Promise<{
    tier: PlanTier;
    status: string;
    trialActive: boolean;
    trialDaysRemaining?: number;
    trialEndsAt?: Date;
    inGracePeriod: boolean;
    graceDaysRemaining?: number;
    graceEndsAt?: Date;
    shouldShowUpgradePrompt: boolean;
    upgradeUrgency: 'none' | 'low' | 'medium' | 'high' | 'critical';
  }> {
    const org = await this.db.query(`
      SELECT plan_tier, plan_status, trial_ends_at FROM organizations WHERE id = $1
    `, [organizationId]);

    if (!org.rows[0]) {
      throw new BillingError('Organization not found', 'ORG_NOT_FOUND');
    }

    const tier = org.rows[0].plan_tier as PlanTier;
    const status = org.rows[0].plan_status;

    const trial = await this.isTrialActive(organizationId);
    const grace = await this.isInGracePeriod(organizationId);

    // Determine upgrade urgency
    let shouldShowUpgradePrompt = false;
    let upgradeUrgency: 'none' | 'low' | 'medium' | 'high' | 'critical' = 'none';

    if (tier === 'free') {
      // Free tier always shows low-priority upgrade prompt
      shouldShowUpgradePrompt = true;
      upgradeUrgency = 'low';
    } else if (trial.active) {
      shouldShowUpgradePrompt = true;
      if (trial.daysRemaining && trial.daysRemaining <= 3) {
        upgradeUrgency = 'high';
      } else if (trial.daysRemaining && trial.daysRemaining <= 7) {
        upgradeUrgency = 'medium';
      } else {
        upgradeUrgency = 'low';
      }
    } else if (grace.inGrace) {
      shouldShowUpgradePrompt = true;
      upgradeUrgency = 'critical';
    }

    return {
      tier,
      status,
      trialActive: trial.active,
      trialDaysRemaining: trial.daysRemaining,
      trialEndsAt: trial.endsAt,
      inGracePeriod: grace.inGrace,
      graceDaysRemaining: grace.daysRemaining,
      graceEndsAt: grace.endsAt,
      shouldShowUpgradePrompt,
      upgradeUrgency
    };
  }

  // ============================================================================
  // Seat Management Methods (EPIC-008 Sprint 4)
  // ============================================================================

  /**
   * Get seat allocation for a team
   * Returns current seat usage and limits
   */
  async getSeatAllocation(teamId: string): Promise<TeamSeatAllocation | null> {
    try {
      // Get team's organization and subscription info
      const result = await this.db.query(`
        SELECT
          t.id as team_id,
          o.id as organization_id,
          o.stripe_subscription_id,
          o.plan_tier,
          COUNT(m.id) as current_seats
        FROM teams t
        JOIN organizations o ON t.organization_id = o.id
        LEFT JOIN team_members m ON m.team_id = t.id AND m.status = 'active'
        WHERE t.id = $1
        GROUP BY t.id, o.id, o.stripe_subscription_id, o.plan_tier
      `, [teamId]);

      if (!result.rows[0]) {
        return null;
      }

      const row = result.rows[0];
      const planTier = row.plan_tier as PlanTier;
      const pricing = this.PLAN_PRICING[planTier]?.[0];

      // Get allocated seats from Stripe subscription
      let allocatedSeats = 1; // Default for free tier
      if (row.stripe_subscription_id) {
        try {
          const subscription = await this.stripe.subscriptions.retrieve(row.stripe_subscription_id);
          allocatedSeats = subscription.items.data[0]?.quantity || 1;
        } catch (e) {
          console.warn(`[BILLING] Could not retrieve subscription for seat count: ${e}`);
        }
      }

      return {
        teamId: row.team_id,
        organizationId: row.organization_id,
        currentSeats: parseInt(row.current_seats) || 0,
        allocatedSeats,
        maxSeats: pricing?.maxSeats ?? null,
        lastSyncedAt: new Date()
      };
    } catch (error) {
      console.error('[BILLING] Error getting seat allocation:', error);
      throw new BillingError(
        `Failed to get seat allocation: ${error instanceof Error ? error.message : String(error)}`,
        'SEAT_ALLOCATION_ERROR'
      );
    }
  }

  /**
   * Check if team can add more seats
   * Returns true if within limits, false otherwise
   */
  async canAddSeats(teamId: string, additionalSeats: number = 1): Promise<{ allowed: boolean; reason?: string }> {
    const allocation = await this.getSeatAllocation(teamId);

    if (!allocation) {
      return { allowed: false, reason: 'Team not found' };
    }

    // Check if within allocated seats
    if (allocation.currentSeats + additionalSeats <= allocation.allocatedSeats) {
      return { allowed: true };
    }

    // Check if can expand allocation (within plan max)
    if (allocation.maxSeats !== null) {
      if (allocation.currentSeats + additionalSeats > allocation.maxSeats) {
        return {
          allowed: false,
          reason: `Exceeds plan limit of ${allocation.maxSeats} seats. Upgrade to Enterprise for unlimited seats.`
        };
      }
    }

    // Need to expand subscription - check if org has payment method
    const org = await this.db.query(`
      SELECT stripe_customer_id FROM organizations WHERE id = $1
    `, [allocation.organizationId]);

    if (!org.rows[0]?.stripe_customer_id) {
      return {
        allowed: false,
        reason: 'Billing not configured. Add payment method to expand seats.'
      };
    }

    return { allowed: true };
  }

  /**
   * Update seat count for a subscription
   * Automatically adjusts Stripe subscription quantity
   */
  async updateSeatCount(
    organizationId: string,
    newSeatCount: number,
    options: { prorate?: boolean } = { prorate: true }
  ): Promise<BillingSubscription> {
    try {
      // Get current subscription
      const org = await this.db.query(`
        SELECT stripe_subscription_id, plan_tier FROM organizations WHERE id = $1
      `, [organizationId]);

      if (!org.rows[0]?.stripe_subscription_id) {
        throw new BillingError('No active subscription found', 'SUBSCRIPTION_NOT_FOUND');
      }

      const planTier = org.rows[0].plan_tier as PlanTier;
      const pricing = this.PLAN_PRICING[planTier]?.[0];

      // Validate seat count against plan limits
      if (pricing?.maxSeats && newSeatCount > pricing.maxSeats) {
        throw new BillingError(
          `Seat count ${newSeatCount} exceeds plan limit of ${pricing.maxSeats}`,
          'SEAT_LIMIT_EXCEEDED'
        );
      }

      if (newSeatCount < 1) {
        throw new BillingError('Seat count must be at least 1', 'INVALID_SEAT_COUNT');
      }

      // Update Stripe subscription quantity
      const subscription = await this.stripe.subscriptions.retrieve(org.rows[0].stripe_subscription_id);
      const updatedSubscription = await this.stripe.subscriptions.update(subscription.id, {
        items: [{
          id: subscription.items.data[0].id,
          quantity: newSeatCount
        }],
        proration_behavior: options.prorate ? 'create_prorations' : 'none',
        metadata: {
          ...subscription.metadata,
          seatCount: String(newSeatCount),
          lastSeatUpdate: new Date().toISOString()
        }
      });

      // Track seat update
      await this.usageTracker.track(organizationId, UsageEventType.API_REQUEST, {
        metadata: {
          action: 'seat_count_updated',
          previous_seats: subscription.items.data[0]?.quantity || 1,
          new_seats: newSeatCount,
          prorated: options.prorate
        }
      });

      console.log(`[BILLING] Updated seat count for org ${organizationId}: ${subscription.items.data[0]?.quantity || 1} → ${newSeatCount}`);

      return this.formatSubscription(updatedSubscription, organizationId);
    } catch (error) {
      if (error instanceof BillingError) throw error;
      if (error instanceof Stripe.errors.StripeError) {
        throw new BillingError(
          `Failed to update seat count: ${error.message}`,
          'SEAT_UPDATE_FAILED',
          error
        );
      }
      throw error;
    }
  }

  /**
   * Sync seat count with actual team member count
   * Call this when members are added/removed to ensure billing accuracy
   */
  async syncSeatCount(teamId: string): Promise<{ synced: boolean; adjustment?: number }> {
    const allocation = await this.getSeatAllocation(teamId);

    if (!allocation) {
      return { synced: false };
    }

    // If current seats exceed allocated, need to expand
    if (allocation.currentSeats > allocation.allocatedSeats) {
      const adjustment = allocation.currentSeats - allocation.allocatedSeats;

      // Check if expansion is allowed
      const canAdd = await this.canAddSeats(teamId, adjustment);
      if (!canAdd.allowed) {
        console.warn(`[BILLING] Cannot sync seats for team ${teamId}: ${canAdd.reason}`);
        return { synced: false };
      }

      await this.updateSeatCount(allocation.organizationId, allocation.currentSeats);
      console.log(`[BILLING] Synced seat count for team ${teamId}: expanded by ${adjustment} seats`);
      return { synced: true, adjustment };
    }

    return { synced: true, adjustment: 0 };
  }

  /**
   * Get seat usage summary for billing display
   */
  async getSeatUsageSummary(organizationId: string): Promise<{
    used: number;
    allocated: number;
    limit: number | null;
    pricePerSeat: number;
    nextBillingAmount: number;
  }> {
    const org = await this.db.query(`
      SELECT plan_tier, stripe_subscription_id FROM organizations WHERE id = $1
    `, [organizationId]);

    if (!org.rows[0]) {
      throw new BillingError('Organization not found', 'ORG_NOT_FOUND');
    }

    const planTier = org.rows[0].plan_tier as PlanTier;
    const pricing = this.PLAN_PRICING[planTier]?.[0];

    // Count active members across all teams in org
    const members = await this.db.query(`
      SELECT COUNT(*) as count
      FROM team_members m
      JOIN teams t ON m.team_id = t.id
      WHERE t.organization_id = $1 AND m.status = 'active'
    `, [organizationId]);

    const used = parseInt(members.rows[0]?.count) || 1;
    let allocated = 1;

    // Get allocated from Stripe
    if (org.rows[0].stripe_subscription_id) {
      try {
        const subscription = await this.stripe.subscriptions.retrieve(org.rows[0].stripe_subscription_id);
        allocated = subscription.items.data[0]?.quantity || 1;
      } catch (e) {
        console.warn('[BILLING] Could not retrieve subscription for usage summary');
      }
    }

    const pricePerSeat = pricing?.amount || 0;
    const nextBillingAmount = allocated * pricePerSeat;

    return {
      used,
      allocated,
      limit: pricing?.maxSeats ?? null,
      pricePerSeat,
      nextBillingAmount
    };
  }
}

export default BillingManager;