/**
 * @fileType: utility
 * @status: current
 * @updated: 2025-11-05
 * @tags: [pruning, events, maintenance, adr-043]
 * @related: [api/v1/graph/events.ts]
 * @priority: medium
 * @complexity: medium
 * @dependencies: [neo4j-driver]
 */

import neo4j, { Driver } from 'neo4j-driver';

/**
 * Intelligent Event Pruning Strategy
 *
 * Purpose: Extend Aura Free Tier capacity by removing obsolete session events
 *
 * Event Value Lifecycle:
 * - 0-30 days: High value (active context) → KEEP ALL
 * - 30-90 days: Medium value (recent history) → KEEP SIGNIFICANT ONLY
 * - 90+ days: Low value (obsolete) → PRUNE AGGRESSIVELY
 *
 * Preservation Rules:
 * 1. ALWAYS keep high-impact events (milestones, major decisions)
 * 2. ALWAYS keep events linked to ADRs, Patterns, or Context Modules
 * 3. ALWAYS keep the latest event per user/project (cursor anchor)
 * 4. Keep achievement & decision events longer than routine fixes
 * 5. Preserve temporal chain integrity (don't break NEXT relationships)
 */

interface PruningStats {
  totalEvents: number;
  pruned: number;
  kept: number;
  reasonsKept: Record<string, number>;
  reasonsPruned: Record<string, number>;
}

const RETENTION_POLICIES = {
  // Age thresholds (days)
  ALWAYS_KEEP_AGE: 30,        // Keep all events < 30 days
  SELECTIVE_PRUNE_AGE: 90,    // Selective pruning 30-90 days
  AGGRESSIVE_PRUNE_AGE: 180,  // Aggressive pruning 90-180 days
  ABSOLUTE_DELETE_AGE: 365,   // Delete all routine events > 1 year

  // Impact-based retention
  HIGH_IMPACT_RETENTION: 180,  // Keep high-impact events for 6 months
  MEDIUM_IMPACT_RETENTION: 90, // Keep medium-impact events for 3 months

  // Category-based retention
  CATEGORY_RETENTION: {
    achievement: 180,  // Milestones - keep longer
    decision: 180,     // Important decisions - keep longer
    feature: 90,       // Feature additions - moderate retention
    fix: 60,           // Bug fixes - shorter retention (ephemeral)
    git: 60,           // Git ops - shorter retention
    insight: 120,      // Learnings - keep moderately long
  } as Record<string, number>,
};

export async function analyzeEventPruning(driver: Driver): Promise<PruningStats> {
  const session = driver.session();

  try {
    const result = await session.run(`
      MATCH (e:Event)
      WITH e, duration.between(e.timestamp, datetime()).days as age_days

      // Determine if event should be kept
      WITH e, age_days,
        CASE
          // Rule 1: Always keep recent events
          WHEN age_days < $alwaysKeepAge THEN 'recent'

          // Rule 2: Keep high-impact events longer
          WHEN e.impact = 'high' AND age_days < $highImpactRetention THEN 'high_impact'

          // Rule 3: Keep events linked to permanent context
          WHEN EXISTS((e)-[:IMPLEMENTS|REFERENCES]->()) THEN 'linked_to_context'

          // Rule 4: Keep achievements and decisions longer
          WHEN e.category IN ['achievement', 'decision'] AND age_days < $categoryRetention THEN 'important_category'

          // Rule 5: Keep shared/team events longer
          WHEN e.shared = true AND age_days < 180 THEN 'shared_event'

          // Default: prune if older than category-specific threshold
          ELSE 'prune_candidate'
        END as retention_decision

      RETURN
        retention_decision,
        count(e) as count,
        avg(age_days) as avg_age_days,
        collect(e.category)[0..5] as sample_categories
      ORDER BY retention_decision
    `, {
      alwaysKeepAge: RETENTION_POLICIES.ALWAYS_KEEP_AGE,
      highImpactRetention: RETENTION_POLICIES.HIGH_IMPACT_RETENTION,
      categoryRetention: RETENTION_POLICIES.CATEGORY_RETENTION.achievement,
    });

    const stats: PruningStats = {
      totalEvents: 0,
      pruned: 0,
      kept: 0,
      reasonsKept: {},
      reasonsPruned: {},
    };

    result.records.forEach(record => {
      const decision = record.get('retention_decision');
      const count = record.get('count').toNumber();

      stats.totalEvents += count;

      if (decision === 'prune_candidate') {
        stats.pruned += count;
        stats.reasonsPruned[decision] = count;
      } else {
        stats.kept += count;
        stats.reasonsKept[decision] = count;
      }
    });

    return stats;
  } finally {
    await session.close();
  }
}

export async function pruneObsoleteEvents(
  driver: Driver,
  dryRun: boolean = true
): Promise<PruningStats> {
  const session = driver.session();

  try {
    console.log(`\n${dryRun ? '[DRY RUN]' : '[EXECUTING]'} Event Pruning...`);

    // First, analyze what would be pruned
    const stats = await analyzeEventPruning(driver);

    console.log('\nPruning Analysis:');
    console.log('================');
    console.log(`Total Events: ${stats.totalEvents}`);
    console.log(`Would Keep: ${stats.kept} (${((stats.kept / stats.totalEvents) * 100).toFixed(1)}%)`);
    console.log(`Would Prune: ${stats.pruned} (${((stats.pruned / stats.totalEvents) * 100).toFixed(1)}%)`);

    console.log('\nReasons for Keeping:');
    Object.entries(stats.reasonsKept).forEach(([reason, count]) => {
      console.log(`  ${reason}: ${count} events`);
    });

    if (!dryRun) {
      // Execute pruning with temporal chain preservation
      const pruneResult = await session.run(`
        MATCH (e:Event)
        WITH e, duration.between(e.timestamp, datetime()).days as age_days

        WHERE age_days >= $absoluteDeleteAge
          AND e.impact <> 'high'
          AND e.category NOT IN ['achievement', 'decision']
          AND e.shared = false
          AND NOT EXISTS((e)-[:IMPLEMENTS|REFERENCES]->())

        // Preserve temporal chain by connecting previous to next
        OPTIONAL MATCH (prev)-[:NEXT]->(e)-[:NEXT]->(next)
        FOREACH (p IN CASE WHEN prev IS NOT NULL AND next IS NOT NULL THEN [1] ELSE [] END |
          CREATE (prev)-[:NEXT]->(next)
        )

        // Delete the event and its relationships
        DETACH DELETE e

        RETURN count(*) as deleted
      `, {
        absoluteDeleteAge: RETENTION_POLICIES.ABSOLUTE_DELETE_AGE,
      });

      const deleted = pruneResult.records[0]?.get('deleted').toNumber() || 0;
      console.log(`\n✓ Deleted ${deleted} obsolete events`);

      stats.pruned = deleted;
      stats.kept = stats.totalEvents - deleted;
    }

    return stats;
  } finally {
    await session.close();
  }
}

/**
 * Estimate future capacity with pruning enabled
 */
export function estimateCapacityWithPruning(
  eventsPerDay: number,
  avgRetentionDays: number
): {
  steadyStateEvents: number;
  percentOfLimit: number;
  yearsUntilLimit: number;
} {
  // With pruning, events reach steady state
  const steadyStateEvents = eventsPerDay * avgRetentionDays;
  const percentOfLimit = (steadyStateEvents / 200000) * 100;

  // Time to hit limit with steady state (accounting for other node types)
  const otherNodes = 100; // ADRs, Patterns, etc.
  const effectiveLimit = 200000 - otherNodes;
  const yearsUntilLimit = steadyStateEvents >= effectiveLimit
    ? Infinity
    : ((effectiveLimit - steadyStateEvents) / (eventsPerDay * 365));

  return {
    steadyStateEvents,
    percentOfLimit,
    yearsUntilLimit,
  };
}

// CLI execution
if (require.main === module) {
  const driver = neo4j.driver(
    process.env.NEO4J_URI || 'bolt://localhost:7687',
    neo4j.auth.basic(
      process.env.NEO4J_USER || 'neo4j',
      process.env.NEO4J_PASSWORD || 'neo4j'
    )
  );

  const dryRun = process.argv.includes('--dry-run') || !process.argv.includes('--execute');

  pruneObsoleteEvents(driver, dryRun)
    .then(stats => {
      console.log('\nCapacity Estimates:');
      console.log('==================');

      // Different scenarios
      const scenarios = [
        { name: 'Light Use (5 events/day)', eventsPerDay: 5, retentionDays: 90 },
        { name: 'Normal Use (15 events/day)', eventsPerDay: 15, retentionDays: 90 },
        { name: 'Heavy Use (30 events/day)', eventsPerDay: 30, retentionDays: 90 },
      ];

      scenarios.forEach(scenario => {
        const estimate = estimateCapacityWithPruning(
          scenario.eventsPerDay,
          scenario.retentionDays
        );
        console.log(`\n${scenario.name}:`);
        console.log(`  Steady State: ${estimate.steadyStateEvents.toLocaleString()} events`);
        console.log(`  Capacity Used: ${estimate.percentOfLimit.toFixed(2)}%`);
        console.log(`  Years Until Limit: ${estimate.yearsUntilLimit === Infinity ? '∞ (never)' : estimate.yearsUntilLimit.toFixed(1)}`);
      });

      return driver.close();
    })
    .catch(err => {
      console.error('Error:', err);
      driver.close();
      process.exit(1);
    });
}
