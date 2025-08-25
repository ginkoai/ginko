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
import { PlanTier } from './auth-manager.js';
import { UsageTracker } from './usage-tracker.js';
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
}
export interface PlanPricing {
    planTier: PlanTier;
    name: string;
    description: string;
    priceId: string;
    amount: number;
    currency: string;
    interval: 'month' | 'year';
    trialPeriodDays?: number;
    features: string[];
}
export declare class BillingError extends Error {
    code: string;
    stripeError?: any | undefined;
    constructor(message: string, code?: string, stripeError?: any | undefined);
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
export declare class BillingManager {
    private stripe;
    private db;
    private usageTracker;
    readonly PLAN_PRICING: Record<PlanTier, PlanPricing[]>;
    constructor(db: DatabaseManager, usageTracker: UsageTracker);
    /**
     * Create or get Stripe customer for organization
     */
    createCustomer(organizationId: string, billingEmail: string, name: string, address?: Stripe.AddressParam): Promise<BillingCustomer>;
    /**
     * Get existing customer information
     */
    getCustomer(organizationId: string): Promise<BillingCustomer>;
    /**
     * Create subscription for a plan
     */
    createSubscription(organizationId: string, planTier: PlanTier, interval?: 'month' | 'year', paymentMethodId?: string): Promise<BillingSubscription>;
    /**
     * Update subscription (upgrade/downgrade)
     */
    updateSubscription(organizationId: string, newPlanTier: PlanTier, interval?: 'month' | 'year'): Promise<BillingSubscription>;
    /**
     * Cancel subscription
     */
    cancelSubscription(organizationId: string, cancelAtPeriodEnd?: boolean): Promise<BillingSubscription>;
    /**
     * Handle Stripe webhooks
     */
    handleWebhook(rawBody: string | Buffer, signature: string): Promise<void>;
    /**
     * Handle subscription created/updated webhook
     */
    private handleSubscriptionUpdate;
    /**
     * Handle subscription deleted webhook
     */
    private handleSubscriptionDeleted;
    /**
     * Handle trial will end webhook
     */
    private handleTrialWillEnd;
    /**
     * Handle successful payment webhook
     */
    private handlePaymentSucceeded;
    /**
     * Handle failed payment webhook
     */
    private handlePaymentFailed;
    /**
     * Create Stripe customer portal session for self-service billing
     */
    createPortalSession(organizationId: string, returnUrl: string): Promise<{
        url: string;
    }>;
    /**
     * Format Stripe subscription for API response
     */
    private formatSubscription;
    /**
     * Map Stripe subscription status to internal plan status
     */
    private mapStripeStatusToPlanStatus;
    /**
     * Setup Stripe products and prices (run once during deployment)
     */
    setupStripeProducts(): Promise<void>;
    /**
     * Create Stripe product and prices for a plan
     */
    private createProductAndPrices;
}
export default BillingManager;
//# sourceMappingURL=billing-manager.d.ts.map