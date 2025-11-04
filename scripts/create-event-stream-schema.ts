/**
 * @fileType: utility
 * @status: current
 * @updated: 2025-11-04
 * @tags: [neo4j, event-stream, schema, adr-043]
 * @related: [api/v1/graph/_cloud-graph-client.ts, docs/adr/ADR-043-event-stream-session-model.md]
 * @priority: critical
 * @complexity: medium
 * @dependencies: [neo4j-driver, dotenv]
 */

import { getDriver, runQuery, closeDriver } from '../api/v1/graph/_neo4j.js';
import dotenv from 'dotenv';

dotenv.config();

/**
 * Create Event Stream Schema for ADR-043
 *
 * Creates Neo4j constraints, indexes, and relationships for:
 * - Event nodes (session logging)
 * - SessionCursor nodes (read pointers)
 *
 * Multi-tenant scoping via organization_id + project_id
 */
async function createEventStreamSchema() {
  console.log('============================================');
  console.log('  Create Event Stream Schema (ADR-043)');
  console.log('  Multi-Tenant Event Logging');
  console.log('============================================\n');

  console.log('Target: Hetzner Neo4j');
  console.log(`URI: ${process.env.NEO4J_URI}`);
  console.log();

  try {
    console.log('Step 1: Connecting to Neo4j...');
    const driver = getDriver();
    await driver.verifyConnectivity();
    console.log('✓ Connected\n');

    console.log('Step 2: Creating constraints...');

    // Event node unique constraint
    try {
      await runQuery(`
        CREATE CONSTRAINT event_id_unique IF NOT EXISTS
        FOR (e:Event) REQUIRE e.id IS UNIQUE
      `);
      console.log('  ✓ Created constraint: event_id_unique');
    } catch (error: any) {
      if (error.message.includes('already exists')) {
        console.log('  ✓ Constraint exists: event_id_unique');
      } else {
        throw error;
      }
    }

    // SessionCursor node unique constraint
    try {
      await runQuery(`
        CREATE CONSTRAINT cursor_id_unique IF NOT EXISTS
        FOR (c:SessionCursor) REQUIRE c.id IS UNIQUE
      `);
      console.log('  ✓ Created constraint: cursor_id_unique');
    } catch (error: any) {
      if (error.message.includes('already exists')) {
        console.log('  ✓ Constraint exists: cursor_id_unique');
      } else {
        throw error;
      }
    }

    console.log();
    console.log('Step 3: Creating indexes...');

    const indexes = [
      {
        name: 'event_timestamp',
        cypher: 'CREATE INDEX event_timestamp IF NOT EXISTS FOR (e:Event) ON (e.timestamp)',
        description: 'Event timestamp for temporal queries'
      },
      {
        name: 'event_user_project',
        cypher: 'CREATE INDEX event_user_project IF NOT EXISTS FOR (e:Event) ON (e.user_id, e.project_id)',
        description: 'Multi-tenant event scoping'
      },
      {
        name: 'event_org_project',
        cypher: 'CREATE INDEX event_org_project IF NOT EXISTS FOR (e:Event) ON (e.organization_id, e.project_id)',
        description: 'Organization-level event queries'
      },
      {
        name: 'event_category',
        cypher: 'CREATE INDEX event_category IF NOT EXISTS FOR (e:Event) ON (e.category)',
        description: 'Filter events by category (fix, feature, etc.)'
      },
      {
        name: 'cursor_user',
        cypher: 'CREATE INDEX cursor_user IF NOT EXISTS FOR (c:SessionCursor) ON (c.user_id)',
        description: 'User cursor lookup'
      },
      {
        name: 'cursor_status',
        cypher: 'CREATE INDEX cursor_status IF NOT EXISTS FOR (c:SessionCursor) ON (c.status)',
        description: 'Active/paused cursor filtering'
      },
      {
        name: 'cursor_user_project_branch',
        cypher: 'CREATE INDEX cursor_user_project_branch IF NOT EXISTS FOR (c:SessionCursor) ON (c.user_id, c.project_id, c.branch)',
        description: 'Cursor lookup by user, project, and branch'
      }
    ];

    for (const { name, cypher, description } of indexes) {
      try {
        await runQuery(cypher);
        console.log(`  ✓ Created index: ${name} (${description})`);
      } catch (error: any) {
        if (error.message.includes('already exists')) {
          console.log(`  ✓ Index exists: ${name}`);
        } else {
          console.error(`  ✗ Failed to create ${name}: ${error.message}`);
        }
      }
    }

    console.log();
    console.log('Step 4: Verifying schema...');

    // Verify constraints
    const constraints = await runQuery(`
      SHOW CONSTRAINTS
      YIELD name, type, entityType, labelsOrTypes
      WHERE name IN ['event_id_unique', 'cursor_id_unique']
      RETURN name, type, labelsOrTypes
    `);

    console.log(`✓ Constraints (${constraints.length}):`);
    constraints.forEach((c: any) => {
      console.log(`  - ${c.name}: ${c.labelsOrTypes.join(', ')}`);
    });

    // Verify indexes
    const indexResults = await runQuery(`
      SHOW INDEXES
      YIELD name, type, labelsOrTypes
      WHERE name STARTS WITH 'event_' OR name STARTS WITH 'cursor_'
      RETURN name, type, labelsOrTypes
    `);

    console.log(`✓ Indexes (${indexResults.length}):`);
    indexResults.forEach((idx: any) => {
      console.log(`  - ${idx.name}: ${idx.labelsOrTypes.join(', ')}`);
    });

    console.log('\n============================================');
    console.log('✅ Event Stream schema ready!');
    console.log('============================================\n');

    console.log('Next steps:');
    console.log('  1. Test event creation: npx tsx scripts/test-event-stream.ts');
    console.log('  2. Verify multi-tenant isolation');
    console.log('  3. Test cursor navigation');
    console.log();

  } catch (error: any) {
    console.error('\n❌ Error:', error.message);
    console.error('Stack:', error.stack);
    process.exit(1);
  } finally {
    await closeDriver();
  }
}

if (import.meta.url === `file://${process.argv[1]}`) {
  createEventStreamSchema()
    .then(() => process.exit(0))
    .catch(error => {
      console.error(error);
      process.exit(1);
    });
}

export { createEventStreamSchema };
