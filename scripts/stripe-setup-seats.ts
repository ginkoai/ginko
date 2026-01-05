#!/usr/bin/env npx tsx
/**
 * @fileType: script
 * @status: current
 * @updated: 2026-01-05
 * @tags: [stripe, billing, seats, team-tier, setup]
 * @related: [billing-manager.ts, entitlements-manager.ts]
 * @priority: high
 * @complexity: medium
 * @dependencies: [stripe]
 *
 * Stripe Per-Seat Product Configuration Script (EPIC-008 Sprint 4)
 *
 * This script creates Stripe products and prices for per-seat team billing.
 * Run this script once to set up the products, then add the price IDs to .env.
 *
 * Usage:
 *   npx tsx scripts/stripe-setup-seats.ts
 *   npx tsx scripts/stripe-setup-seats.ts --test  # Use test mode
 *   npx tsx scripts/stripe-setup-seats.ts --list  # List existing products
 *
 * Prerequisites:
 *   - STRIPE_SECRET_KEY environment variable set
 *   - Stripe account with API access
 */

import Stripe from 'stripe';
import dotenv from 'dotenv';
import path from 'path';

// Load environment variables
dotenv.config({ path: path.resolve(process.cwd(), '.env') });

const STRIPE_SECRET_KEY = process.env.STRIPE_SECRET_KEY;

if (!STRIPE_SECRET_KEY) {
  console.error('Error: STRIPE_SECRET_KEY environment variable is required');
  console.error('Set it in your .env file or export it:');
  console.error('  export STRIPE_SECRET_KEY=sk_test_...');
  process.exit(1);
}

const stripe = new Stripe(STRIPE_SECRET_KEY, {
  apiVersion: '2024-12-18.acacia',
});

// Team tier pricing configuration
const TEAM_PRICING = {
  productName: 'Ginko Team',
  productDescription: 'Team collaboration with per-seat billing. Includes shared knowledge graph, role-based permissions, and team analytics.',
  prices: [
    {
      nickname: 'Ginko Team Monthly',
      unitAmount: 1500, // $15.00 per seat/month
      currency: 'usd',
      interval: 'month' as const,
      trialDays: 14,
    },
    {
      nickname: 'Ginko Team Yearly',
      unitAmount: 15000, // $150.00 per seat/year (17% discount)
      currency: 'usd',
      interval: 'year' as const,
      trialDays: 14,
    },
  ],
  features: [
    'Per-seat pricing',
    'Team collaboration',
    'Shared knowledge graph',
    'Role-based permissions',
    'Team analytics',
    'Priority support',
  ],
};

async function listExistingProducts(): Promise<void> {
  console.log('\n📦 Existing Stripe Products:\n');

  const products = await stripe.products.list({ limit: 100, active: true });

  for (const product of products.data) {
    console.log(`  ${product.name} (${product.id})`);
    console.log(`    ${product.description || 'No description'}`);

    // Get prices for this product
    const prices = await stripe.prices.list({ product: product.id, active: true });
    for (const price of prices.data) {
      const amount = (price.unit_amount || 0) / 100;
      const interval = price.recurring?.interval || 'one-time';
      console.log(`    └─ ${price.id}: $${amount.toFixed(2)}/${interval}`);
    }
    console.log('');
  }
}

async function findExistingTeamProduct(): Promise<Stripe.Product | null> {
  const products = await stripe.products.list({ limit: 100, active: true });
  return products.data.find(p => p.name === TEAM_PRICING.productName) || null;
}

async function createTeamProduct(): Promise<void> {
  console.log('\n🚀 Setting up Stripe Team Tier Products\n');
  console.log('Configuration:');
  console.log(`  Product: ${TEAM_PRICING.productName}`);
  console.log(`  Monthly: $${(TEAM_PRICING.prices[0].unitAmount / 100).toFixed(2)}/seat`);
  console.log(`  Yearly:  $${(TEAM_PRICING.prices[1].unitAmount / 100).toFixed(2)}/seat (17% savings)`);
  console.log('');

  // Check if product already exists
  const existingProduct = await findExistingTeamProduct();

  if (existingProduct) {
    console.log(`⚠️  Product "${TEAM_PRICING.productName}" already exists (${existingProduct.id})`);
    console.log('   Checking for existing prices...\n');

    const existingPrices = await stripe.prices.list({
      product: existingProduct.id,
      active: true
    });

    if (existingPrices.data.length > 0) {
      console.log('   Existing prices found:');
      for (const price of existingPrices.data) {
        const amount = (price.unit_amount || 0) / 100;
        const interval = price.recurring?.interval || 'one-time';
        console.log(`   └─ ${price.id}: $${amount.toFixed(2)}/${interval}`);
      }
      console.log('\n   To recreate, first archive the existing product in Stripe Dashboard.');
      return;
    }

    // Product exists but no prices - create prices
    await createPricesForProduct(existingProduct.id);
    return;
  }

  // Create new product
  console.log('Creating product...');
  const product = await stripe.products.create({
    name: TEAM_PRICING.productName,
    description: TEAM_PRICING.productDescription,
    metadata: {
      planTier: 'team',
      perSeat: 'true',
      maxSeats: '50',
      createdBy: 'stripe-setup-seats.ts',
    },
    features: TEAM_PRICING.features.map(name => ({ name })),
  });

  console.log(`✅ Product created: ${product.id}\n`);

  // Create prices
  await createPricesForProduct(product.id);
}

async function createPricesForProduct(productId: string): Promise<void> {
  console.log('Creating prices...\n');

  const createdPrices: { interval: string; priceId: string; amount: number }[] = [];

  for (const priceConfig of TEAM_PRICING.prices) {
    const price = await stripe.prices.create({
      product: productId,
      nickname: priceConfig.nickname,
      unit_amount: priceConfig.unitAmount,
      currency: priceConfig.currency,
      recurring: {
        interval: priceConfig.interval,
        trial_period_days: priceConfig.trialDays,
      },
      metadata: {
        planTier: 'team',
        perSeat: 'true',
        interval: priceConfig.interval,
      },
    });

    createdPrices.push({
      interval: priceConfig.interval,
      priceId: price.id,
      amount: priceConfig.unitAmount,
    });

    console.log(`✅ ${priceConfig.nickname}: ${price.id}`);
  }

  // Output environment variables
  console.log('\n' + '='.repeat(60));
  console.log('📋 Add these to your .env file:\n');

  const monthlyPrice = createdPrices.find(p => p.interval === 'month');
  const yearlyPrice = createdPrices.find(p => p.interval === 'year');

  if (monthlyPrice) {
    console.log(`STRIPE_TEAM_MONTHLY_PRICE_ID=${monthlyPrice.priceId}`);
  }
  if (yearlyPrice) {
    console.log(`STRIPE_TEAM_YEARLY_PRICE_ID=${yearlyPrice.priceId}`);
  }

  console.log('\n' + '='.repeat(60));
  console.log('\n✅ Stripe Team tier setup complete!\n');

  console.log('Next steps:');
  console.log('  1. Add the price IDs to your .env file');
  console.log('  2. Deploy the billing-manager.ts changes');
  console.log('  3. Test subscription creation in Stripe test mode');
  console.log('  4. Configure webhooks for subscription events');
}

async function main(): Promise<void> {
  const args = process.argv.slice(2);

  // Check if test mode
  const isTestMode = STRIPE_SECRET_KEY.startsWith('sk_test_');
  console.log(`\n🔑 Stripe Mode: ${isTestMode ? 'TEST' : '⚠️  LIVE'}`);

  if (!isTestMode && !args.includes('--force')) {
    console.error('\n⚠️  Warning: You are using LIVE Stripe credentials!');
    console.error('   Add --force flag to proceed, or use test mode credentials.');
    process.exit(1);
  }

  if (args.includes('--list')) {
    await listExistingProducts();
    return;
  }

  if (args.includes('--help')) {
    console.log(`
Stripe Per-Seat Product Configuration

Usage:
  npx tsx scripts/stripe-setup-seats.ts          Create Team products
  npx tsx scripts/stripe-setup-seats.ts --list   List existing products
  npx tsx scripts/stripe-setup-seats.ts --force  Force live mode

Environment:
  STRIPE_SECRET_KEY  Your Stripe secret key (sk_test_... or sk_live_...)

Products Created:
  - Ginko Team Monthly: $15.00/seat/month
  - Ginko Team Yearly:  $150.00/seat/year (17% savings)
`);
    return;
  }

  await createTeamProduct();
}

main().catch((error) => {
  console.error('\n❌ Error:', error.message);
  if (error.type === 'StripeInvalidRequestError') {
    console.error('   Stripe API error - check your credentials and configuration');
  }
  process.exit(1);
});
