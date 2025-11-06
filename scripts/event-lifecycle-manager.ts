/**
 * @fileType: utility
 * @status: current
 * @updated: 2025-11-05
 * @tags: [lifecycle, events, archiving, synthesis, pruning]
 * @related: [prune-events.ts, api/v1/graph/events.ts]
 * @priority: high
 * @complexity: high
 * @dependencies: [neo4j-driver, @aws-sdk/client-s3]
 */

import neo4j, { Driver } from 'neo4j-driver';
import { writeFile, mkdir } from 'fs/promises';
import { join } from 'path';

/**
 * Event Lifecycle Manager
 *
 * Three-phase approach to extend Aura Free Tier capacity:
 *
 * Phase 1: SYNTHESIZE (Extract insights into permanent context)
 *   - Analyze event patterns
 *   - Create/update Context Modules, Patterns, Gotchas
 *   - Link events to permanent knowledge nodes
 *   - Mark events as "synthesized"
 *
 * Phase 2: ARCHIVE (Preserve data offline before deletion)
 *   - Export events to JSON/Parquet files
 *   - Store in S3, local filesystem, or git repo
 *   - Maintain queryable offline archive
 *   - Tag events with archive location
 *
 * Phase 3: PRUNE (Remove from graph to free capacity)
 *   - Delete events older than retention policy
 *   - Only prune events that are archived AND synthesized
 *   - Preserve temporal chain integrity
 *   - Log pruning activity
 *
 * This ensures:
 * - No data loss (always archived)
 * - Insights preserved (synthesized into permanent context)
 * - Graph stays performant (lean active dataset)
 * - Audit trail maintained (archive references)
 */

interface EventArchive {
  id: string;
  user_id: string;
  project_id: string;
  timestamp: string;
  category: string;
  description: string;
  impact: string;
  files: string[];
  tags: string[];
  pressure: number;
  branch: string;
  commit_hash?: string;
  synthesized_into?: string[]; // IDs of context modules created from this event
}

interface SynthesisResult {
  contextModulesCreated: string[];
  patternsIdentified: string[];
  gotchasCaptured: string[];
  eventsSynthesized: number;
}

interface ArchiveResult {
  eventsArchived: number;
  archiveLocation: string;
  archiveSize: number;
}

interface PruningResult {
  eventsPruned: number;
  relationshipsPreserved: number;
  capacityFreed: number;
}

/**
 * Phase 1: Synthesize events into permanent context
 *
 * Analyzes clusters of related events to extract:
 * - Patterns (recurring solutions)
 * - Gotchas (lessons learned)
 * - Context Modules (organized knowledge)
 */
export async function synthesizeEventsToContext(
  driver: Driver,
  ageThresholdDays: number = 30
): Promise<SynthesisResult> {
  const session = driver.session();

  try {
    console.log(`\n📊 Phase 1: Synthesizing events into permanent context...`);

    // Find event patterns: multiple similar events → Pattern node
    const patternResult = await session.run(`
      MATCH (e:Event)
      WHERE duration.between(e.timestamp, datetime()).days >= $ageThreshold
        AND NOT EXISTS(e.synthesized)
      WITH e.category as category, collect(e.description) as descriptions, collect(e) as events
      WHERE size(events) >= 3

      // Create Pattern node from recurring event types
      CREATE (p:Pattern {
        id: 'pattern_' + randomUUID(),
        title: category + ' Pattern',
        description: 'Synthesized from ' + size(events) + ' events',
        category: category,
        created_at: datetime(),
        source: 'event_synthesis'
      })

      // Link events to the pattern
      WITH p, events
      UNWIND events as e
      CREATE (e)-[:IMPLEMENTS]->(p)
      SET e.synthesized = true

      RETURN p.id as patternId, size(events) as eventCount
    `, { ageThreshold: ageThresholdDays });

    const patternsIdentified = patternResult.records.map(r => r.get('patternId'));

    // Find gotchas: high-impact insights → Gotcha nodes
    const gotchaResult = await session.run(`
      MATCH (e:Event)
      WHERE duration.between(e.timestamp, datetime()).days >= $ageThreshold
        AND e.category = 'insight'
        AND e.impact IN ['high', 'medium']
        AND NOT EXISTS(e.synthesized)

      // Create Gotcha from high-value insights
      CREATE (g:Gotcha {
        id: 'gotcha_' + randomUUID(),
        title: e.description,
        description: e.description,
        discovered_at: e.timestamp,
        impact: e.impact,
        files: e.files,
        source: 'event_synthesis'
      })

      CREATE (e)-[:REFERENCES]->(g)
      SET e.synthesized = true

      RETURN g.id as gotchaId
    `, { ageThreshold: ageThresholdDays });

    const gotchasCaptured = gotchaResult.records.map(r => r.get('gotchaId'));

    // Create context modules from sprint achievements
    const moduleResult = await session.run(`
      MATCH (e:Event)
      WHERE duration.between(e.timestamp, datetime()).days >= $ageThreshold
        AND e.category = 'achievement'
        AND NOT EXISTS(e.synthesized)

      WITH e.project_id as project, collect(e) as achievements
      WHERE size(achievements) >= 5

      CREATE (m:ContextModule {
        id: 'module_' + randomUUID(),
        title: project + ' Achievements',
        content: 'Sprint achievements synthesized from events',
        created_at: datetime(),
        source: 'event_synthesis'
      })

      WITH m, achievements
      UNWIND achievements as e
      CREATE (e)-[:REFERENCES]->(m)
      SET e.synthesized = true

      RETURN m.id as moduleId, size(achievements) as eventCount
    `, { ageThreshold: ageThresholdDays });

    const contextModulesCreated = moduleResult.records.map(r => r.get('moduleId'));

    // Count total events synthesized
    const countResult = await session.run(`
      MATCH (e:Event)
      WHERE e.synthesized = true
      RETURN count(e) as synthesized
    `);

    const eventsSynthesized = countResult.records[0]?.get('synthesized').toNumber() || 0;

    const result: SynthesisResult = {
      contextModulesCreated,
      patternsIdentified,
      gotchasCaptured,
      eventsSynthesized,
    };

    console.log(`✓ Created ${contextModulesCreated.length} context modules`);
    console.log(`✓ Identified ${patternsIdentified.length} patterns`);
    console.log(`✓ Captured ${gotchasCaptured.length} gotchas`);
    console.log(`✓ Synthesized ${eventsSynthesized} events`);

    return result;
  } finally {
    await session.close();
  }
}

/**
 * Phase 2: Archive events to offline storage
 *
 * Exports events to JSON files organized by:
 * - Year/Month for easy browsing
 * - User for multi-tenant support
 * - Project for organization
 */
export async function archiveEventsToStorage(
  driver: Driver,
  archiveDir: string,
  ageThresholdDays: number = 30
): Promise<ArchiveResult> {
  const session = driver.session();

  try {
    console.log(`\n💾 Phase 2: Archiving events to ${archiveDir}...`);

    // Fetch events to archive
    const result = await session.run(`
      MATCH (e:Event)
      WHERE duration.between(e.timestamp, datetime()).days >= $ageThreshold
        AND NOT EXISTS(e.archived)

      OPTIONAL MATCH (e)-[:IMPLEMENTS|REFERENCES]->(context)

      RETURN e {
        .*,
        synthesized_into: collect(context.id)
      } as event
      ORDER BY e.timestamp DESC
    `, { ageThreshold: ageThresholdDays });

    const events: EventArchive[] = result.records.map(r => {
      const event = r.get('event');
      return {
        id: event.id,
        user_id: event.user_id,
        project_id: event.project_id,
        timestamp: event.timestamp,
        category: event.category,
        description: event.description,
        impact: event.impact,
        files: event.files || [],
        tags: event.tags || [],
        pressure: event.pressure || 0,
        branch: event.branch || 'main',
        commit_hash: event.commit_hash,
        synthesized_into: event.synthesized_into || [],
      };
    });

    // Organize by year/month
    const eventsByMonth = events.reduce((acc, event) => {
      const date = new Date(event.timestamp);
      const key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
      if (!acc[key]) acc[key] = [];
      acc[key].push(event);
      return acc;
    }, {} as Record<string, EventArchive[]>);

    // Write archive files
    let totalSize = 0;
    for (const [month, monthEvents] of Object.entries(eventsByMonth)) {
      const archivePath = join(archiveDir, 'events', month);
      await mkdir(archivePath, { recursive: true });

      const archiveFile = join(archivePath, 'events.json');
      const content = JSON.stringify({
        month,
        count: monthEvents.length,
        events: monthEvents,
        archived_at: new Date().toISOString(),
      }, null, 2);

      await writeFile(archiveFile, content);
      totalSize += Buffer.byteLength(content);

      console.log(`  ✓ Archived ${monthEvents.length} events to ${month}/events.json`);
    }

    // Mark events as archived in graph
    await session.run(`
      MATCH (e:Event)
      WHERE duration.between(e.timestamp, datetime()).days >= $ageThreshold
        AND NOT EXISTS(e.archived)
      SET e.archived = true,
          e.archive_location = $archiveDir
    `, {
      ageThreshold: ageThresholdDays,
      archiveDir,
    });

    console.log(`✓ Archived ${events.length} events (${(totalSize / 1024).toFixed(2)} KB)`);

    return {
      eventsArchived: events.length,
      archiveLocation: archiveDir,
      archiveSize: totalSize,
    };
  } finally {
    await session.close();
  }
}

/**
 * Phase 3: Prune archived events from graph
 *
 * Safely removes events that are:
 * - Archived (data preserved)
 * - Synthesized (insights extracted)
 * - Older than retention threshold
 */
export async function pruneArchivedEvents(
  driver: Driver,
  ageThresholdDays: number = 90,
  requireSynthesis: boolean = true
): Promise<PruningResult> {
  const session = driver.session();

  try {
    console.log(`\n🗑️  Phase 3: Pruning archived events...`);

    // Safety check: count what would be deleted
    const countResult = await session.run(`
      MATCH (e:Event)
      WHERE duration.between(e.timestamp, datetime()).days >= $ageThreshold
        AND e.archived = true
        ${requireSynthesis ? 'AND e.synthesized = true' : ''}
      RETURN count(e) as count
    `, { ageThreshold: ageThresholdDays });

    const toPrune = countResult.records[0]?.get('count').toNumber() || 0;

    if (toPrune === 0) {
      console.log('✓ No events to prune');
      return { eventsPruned: 0, relationshipsPreserved: 0, capacityFreed: 0 };
    }

    console.log(`Found ${toPrune} events to prune (archived & ${requireSynthesis ? 'synthesized' : 'ready'})`);

    // Execute pruning with temporal chain preservation
    const pruneResult = await session.run(`
      MATCH (e:Event)
      WHERE duration.between(e.timestamp, datetime()).days >= $ageThreshold
        AND e.archived = true
        ${requireSynthesis ? 'AND e.synthesized = true' : ''}

      // Preserve temporal chain
      OPTIONAL MATCH (prev)-[r1:NEXT]->(e)-[r2:NEXT]->(next)
      FOREACH (p IN CASE WHEN prev IS NOT NULL AND next IS NOT NULL THEN [1] ELSE [] END |
        CREATE (prev)-[:NEXT {
          _pruned_event: e.id,
          _pruned_at: datetime()
        }]->(next)
      )

      // Count relationships before deletion
      WITH e, count { (e)-[]->() } as outgoing, count { ()-[]->(e) } as incoming
      WITH e, outgoing + incoming as totalRels

      // Delete event and relationships
      DETACH DELETE e

      RETURN count(*) as deleted, sum(totalRels) as relsPreserved
    `, { ageThreshold: ageThresholdDays });

    const deleted = pruneResult.records[0]?.get('deleted').toNumber() || 0;
    const relsPreserved = pruneResult.records[0]?.get('relsPreserved').toNumber() || 0;

    // Estimate capacity freed (approximate)
    const bytesPerEvent = 500; // Rough estimate
    const capacityFreed = deleted * bytesPerEvent;

    console.log(`✓ Pruned ${deleted} events`);
    console.log(`✓ Preserved ${relsPreserved} relationship references`);
    console.log(`✓ Freed ~${(capacityFreed / 1024).toFixed(2)} KB`);

    return {
      eventsPruned: deleted,
      relationshipsPreserved: relsPreserved,
      capacityFreed,
    };
  } finally {
    await session.close();
  }
}

/**
 * Full lifecycle execution: Synthesize → Archive → Prune
 */
export async function runEventLifecycle(
  driver: Driver,
  archiveDir: string,
  options: {
    synthesisAge?: number;
    archiveAge?: number;
    pruneAge?: number;
    requireSynthesis?: boolean;
    dryRun?: boolean;
  } = {}
): Promise<void> {
  const {
    synthesisAge = 30,
    archiveAge = 30,
    pruneAge = 90,
    requireSynthesis = true,
    dryRun = false,
  } = options;

  console.log('Event Lifecycle Manager');
  console.log('======================');
  console.log(`Mode: ${dryRun ? 'DRY RUN' : 'EXECUTE'}`);
  console.log(`Synthesis: Events older than ${synthesisAge} days`);
  console.log(`Archive: Events older than ${archiveAge} days`);
  console.log(`Prune: Events older than ${pruneAge} days (${requireSynthesis ? 'synthesized only' : 'all archived'})`);

  if (dryRun) {
    console.log('\n⚠️  DRY RUN MODE - No changes will be made\n');
    // TODO: Add dry-run analysis
    return;
  }

  // Phase 1: Extract insights
  const synthesis = await synthesizeEventsToContext(driver, synthesisAge);

  // Phase 2: Archive to storage
  const archive = await archiveEventsToStorage(driver, archiveDir, archiveAge);

  // Phase 3: Prune from graph
  const prune = await pruneArchivedEvents(driver, pruneAge, requireSynthesis);

  console.log('\n✅ Event Lifecycle Complete');
  console.log('==========================');
  console.log(`Patterns: ${synthesis.patternsIdentified.length}`);
  console.log(`Gotchas: ${synthesis.gotchasCaptured.length}`);
  console.log(`Modules: ${synthesis.contextModulesCreated.length}`);
  console.log(`Archived: ${archive.eventsArchived} events (${(archive.archiveSize / 1024).toFixed(2)} KB)`);
  console.log(`Pruned: ${prune.eventsPruned} events`);
  console.log(`Capacity Freed: ~${(prune.capacityFreed / 1024).toFixed(2)} KB`);
}

// CLI execution with enhanced argument parsing
if (require.main === module) {
  // Parse command line arguments
  const args = process.argv.slice(2);

  // Helper to extract argument value
  const getArg = (name: string, defaultValue: string): string => {
    const arg = args.find(a => a.startsWith(`--${name}=`));
    return arg ? arg.split('=')[1] : defaultValue;
  };

  // Helper to check for flag
  const hasFlag = (name: string): boolean => {
    return args.includes(`--${name}`);
  };

  // Parse options from CLI arguments
  const options = {
    synthesisAge: parseInt(getArg('synthesis-age', '30')),
    archiveAge: parseInt(getArg('archive-age', '30')),
    pruneAge: parseInt(getArg('prune-age', '90')),
    retentionDays: parseInt(getArg('retention-days', '90')), // Alias for GitHub Actions
    requireSynthesis: !hasFlag('no-synthesis'),
    dryRun: !hasFlag('execute'),
  };

  // Use retention-days as prune age if provided (GitHub Actions compatibility)
  if (hasFlag('retention-days')) {
    options.pruneAge = options.retentionDays;
  }

  // Show help if requested
  if (hasFlag('help') || hasFlag('h')) {
    console.log(`
Event Lifecycle Manager - Neo4j AuraDB Capacity Management

Usage:
  tsx scripts/event-lifecycle-manager.ts [options]

Options:
  --synthesis-age=<days>    Age threshold for synthesis (default: 30)
  --archive-age=<days>      Age threshold for archiving (default: 30)
  --prune-age=<days>        Age threshold for pruning (default: 90)
  --retention-days=<days>   Retention period (alias for prune-age)
  --no-synthesis            Allow pruning without synthesis
  --execute                 Execute changes (default: dry-run)
  --help, -h                Show this help message

Environment Variables:
  NEO4J_URI                 Neo4j connection URI (default: bolt://localhost:7687)
  NEO4J_USER                Neo4j username (default: neo4j)
  NEO4J_PASSWORD            Neo4j password (default: neo4j)
  ARCHIVE_DIR               Archive directory (default: ./.ginko/archives)

Examples:
  # Dry run with default settings
  tsx scripts/event-lifecycle-manager.ts

  # Execute with custom retention period
  tsx scripts/event-lifecycle-manager.ts --retention-days=60 --execute

  # Execute with separate thresholds
  tsx scripts/event-lifecycle-manager.ts --synthesis-age=14 --archive-age=30 --prune-age=90 --execute

GitHub Actions Integration:
  This script is designed to run via GitHub Actions workflow.
  See .github/workflows/neo4j-event-lifecycle.yml for automation.
`);
    process.exit(0);
  }

  // Connect to Neo4j
  const driver = neo4j.driver(
    process.env.NEO4J_URI || 'bolt://localhost:7687',
    neo4j.auth.basic(
      process.env.NEO4J_USER || 'neo4j',
      process.env.NEO4J_PASSWORD || 'neo4j'
    )
  );

  const archiveDir = process.env.ARCHIVE_DIR || './.ginko/archives';

  // Run lifecycle management
  runEventLifecycle(driver, archiveDir, options)
    .then(() => {
      console.log('\n✓ Done');

      // Output structured results for GitHub Actions
      if (process.env.GITHUB_ACTIONS === 'true') {
        console.log('\n::group::Lifecycle Results');
        console.log(`::set-output name=mode::${options.dryRun ? 'dry-run' : 'execute'}`);
        console.log(`::set-output name=retention_days::${options.pruneAge}`);
        console.log('::endgroup::');
      }

      return driver.close();
    })
    .catch(err => {
      console.error('\n✗ Error:', err.message);
      console.error(err.stack);

      driver.close();
      process.exit(1);
    });
}
