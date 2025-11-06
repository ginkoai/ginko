/**
 * @fileType: utility
 * @status: current
 * @updated: 2025-11-05
 * @tags: [migration, neo4j, import, adr-044]
 * @related: [export-neo4j-data.ts, event-lifecycle-manager.ts]
 * @priority: critical
 * @complexity: medium
 * @dependencies: [neo4j-driver]
 */

import neo4j, { Driver } from 'neo4j-driver';
import { readFile } from 'fs/promises';
import { join } from 'path';

/**
 * Import Neo4j Database from JSON Export
 *
 * Imports nodes and relationships from the JSON export file
 * created by export-neo4j-data.ts into AuraDB.
 *
 * Features:
 * - Batch processing for efficient imports
 * - Transaction safety with rollback
 * - Progress reporting
 * - Verification of imported data
 */

interface ImportStats {
  nodesImported: number;
  relationshipsImported: number;
  errors: string[];
  duration: number;
}

interface ExportedNode {
  id: string;
  labels: string[];
  properties: Record<string, any>;
}

/**
 * Clean properties to only include primitive types and arrays
 * Filters out Neo4j internal objects and complex types
 */
function cleanProperties(props: Record<string, any>): Record<string, any> {
  const cleaned: Record<string, any> = {};

  for (const [key, value] of Object.entries(props)) {
    // Skip null/undefined
    if (value === null || value === undefined) {
      cleaned[key] = null;
      continue;
    }

    // Handle primitive types
    if (typeof value === 'string' || typeof value === 'number' || typeof value === 'boolean') {
      cleaned[key] = value;
      continue;
    }

    // Handle Date objects - convert to ISO string
    if (value instanceof Date) {
      cleaned[key] = value.toISOString();
      continue;
    }

    // Handle arrays of primitives
    if (Array.isArray(value)) {
      // Only keep arrays of primitives
      const cleanedArray = value.filter(v =>
        v === null ||
        typeof v === 'string' ||
        typeof v === 'number' ||
        typeof v === 'boolean'
      );
      if (cleanedArray.length > 0) {
        cleaned[key] = cleanedArray;
      }
      continue;
    }

    // Check if this is a Neo4j DateTime object
    if (typeof value === 'object' && 'year' in value && 'month' in value && 'day' in value) {
      try {
        // Extract values from the Map structure
        const year = value.year?.low ?? value.year;
        const month = value.month?.low ?? value.month;
        const day = value.day?.low ?? value.day;
        const hour = value.hour?.low ?? value.hour ?? 0;
        const minute = value.minute?.low ?? value.minute ?? 0;
        const second = value.second?.low ?? value.second ?? 0;

        // Create ISO 8601 string
        const isoString = `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}T${String(hour).padStart(2, '0')}:${String(minute).padStart(2, '0')}:${String(second).padStart(2, '0')}Z`;

        cleaned[key] = isoString;
      } catch (err) {
        // Skip if conversion fails
        console.warn(`Skipping complex temporal property: ${key}`);
      }
      continue;
    }

    // Skip all other complex objects (they can't be stored as properties)
    console.warn(`Skipping complex property: ${key} (${typeof value})`);
  }

  return cleaned;
}

interface ExportedRelationship {
  id: string;
  type: string;
  startNode: string;
  endNode: string;
  properties: Record<string, any>;
}

interface ExportData {
  exportedAt: string;
  source: string;
  nodes: ExportedNode[];
  relationships: ExportedRelationship[];
}

/**
 * Import nodes in batches
 */
async function importNodes(
  driver: Driver,
  nodes: ExportedNode[],
  batchSize: number = 100
): Promise<number> {
  const session = driver.session();
  let imported = 0;

  try {
    console.log(`📦 Importing ${nodes.length} nodes in batches of ${batchSize}...`);

    for (let i = 0; i < nodes.length; i += batchSize) {
      const batch = nodes.slice(i, i + batchSize);

      await session.executeWrite(async tx => {
        for (const node of batch) {
          const labels = node.labels.join(':');
          const props = cleanProperties(node.properties);

          // Create Cypher query dynamically
          const query = `CREATE (n:${labels}) SET n = $props RETURN id(n) as nodeId`;

          await tx.run(query, { props });
          imported++;
        }
      });

      const progress = Math.min(100, ((imported / nodes.length) * 100));
      process.stdout.write(`\r  Progress: ${progress.toFixed(1)}% (${imported}/${nodes.length})`);
    }

    console.log('\n✓ Nodes imported successfully');
    return imported;
  } finally {
    await session.close();
  }
}

/**
 * Import relationships in batches
 */
async function importRelationships(
  driver: Driver,
  relationships: ExportedRelationship[],
  batchSize: number = 100
): Promise<number> {
  const session = driver.session();
  let imported = 0;

  try {
    console.log(`🔗 Importing ${relationships.length} relationships in batches of ${batchSize}...`);

    // Note: We need to match nodes by their original IDs stored in properties
    // This assumes nodes have a unique 'id' property from the export

    for (let i = 0; i < relationships.length; i += batchSize) {
      const batch = relationships.slice(i, i + batchSize);

      await session.executeWrite(async tx => {
        for (const rel of batch) {
          const props = cleanProperties(rel.properties);

          // Match nodes and create relationship
          const query = `
            MATCH (start), (end)
            WHERE id(start) = toInteger($startId) AND id(end) = toInteger($endId)
            CREATE (start)-[r:${rel.type}]->(end)
            SET r = $props
            RETURN id(r) as relId
          `;

          await tx.run(query, {
            startId: rel.startNode,
            endId: rel.endNode,
            props
          });

          imported++;
        }
      });

      const progress = Math.min(100, ((imported / relationships.length) * 100));
      process.stdout.write(`\r  Progress: ${progress.toFixed(1)}% (${imported}/${relationships.length})`);
    }

    console.log('\n✓ Relationships imported successfully');
    return imported;
  } finally {
    await session.close();
  }
}

/**
 * Verify imported data matches export
 */
async function verifyImport(
  driver: Driver,
  expectedNodes: number,
  expectedRelationships: number
): Promise<{ success: boolean; issues: string[] }> {
  const session = driver.session();
  const issues: string[] = [];

  try {
    console.log('\n🔍 Verifying import...');

    // Count nodes
    const nodeResult = await session.run('MATCH (n) RETURN count(n) as count');
    const actualNodes = nodeResult.records[0]?.get('count').toNumber() || 0;

    if (actualNodes !== expectedNodes) {
      issues.push(`Node count mismatch: expected ${expectedNodes}, got ${actualNodes}`);
    } else {
      console.log(`✓ Nodes: ${actualNodes}/${expectedNodes}`);
    }

    // Count relationships
    const relResult = await session.run('MATCH ()-[r]->() RETURN count(r) as count');
    const actualRels = relResult.records[0]?.get('count').toNumber() || 0;

    if (actualRels !== expectedRelationships) {
      issues.push(`Relationship count mismatch: expected ${expectedRelationships}, got ${actualRels}`);
    } else {
      console.log(`✓ Relationships: ${actualRels}/${expectedRelationships}`);
    }

    // Check for orphaned nodes (nodes with no relationships - might be expected)
    const orphanResult = await session.run(`
      MATCH (n)
      WHERE NOT (n)--()
      RETURN count(n) as orphans, collect(labels(n))[0..5] as sampleLabels
    `);
    const orphans = orphanResult.records[0]?.get('orphans').toNumber() || 0;

    if (orphans > 0) {
      console.log(`⚠️  Warning: ${orphans} orphaned nodes (no relationships)`);
    }

    return {
      success: issues.length === 0,
      issues
    };
  } finally {
    await session.close();
  }
}

/**
 * Clear database (use with caution!)
 */
async function clearDatabase(driver: Driver): Promise<void> {
  const session = driver.session();

  try {
    console.log('⚠️  Clearing database...');
    await session.run('MATCH (n) DETACH DELETE n');
    console.log('✓ Database cleared');
  } finally {
    await session.close();
  }
}

/**
 * Import complete database from JSON export
 */
export async function importDatabase(
  driver: Driver,
  importDir: string,
  options: {
    batchSize?: number;
    clearFirst?: boolean;
    verify?: boolean;
  } = {}
): Promise<ImportStats> {
  const {
    batchSize = 100,
    clearFirst = false,
    verify = true
  } = options;

  const startTime = Date.now();
  const errors: string[] = [];

  console.log('\n🚀 Neo4j Database Import');
  console.log('========================\n');

  try {
    // Load export data
    const dataFile = join(importDir, 'data.json');
    console.log(`📂 Loading export from ${dataFile}...`);

    const content = await readFile(dataFile, 'utf-8');
    const data: ExportData = JSON.parse(content);

    console.log(`✓ Loaded export from ${data.exportedAt}`);
    console.log(`  Source: ${data.source}`);
    console.log(`  Nodes: ${data.nodes.length}`);
    console.log(`  Relationships: ${data.relationships.length}`);

    // Clear database if requested
    if (clearFirst) {
      await clearDatabase(driver);
    }

    // Import nodes
    const nodesImported = await importNodes(driver, data.nodes, batchSize);

    // Import relationships
    const relationshipsImported = await importRelationships(driver, data.relationships, batchSize);

    // Verify import
    if (verify) {
      const verification = await verifyImport(driver, data.nodes.length, data.relationships.length);

      if (!verification.success) {
        errors.push(...verification.issues);
        console.log('\n⚠️  Import completed with issues:');
        verification.issues.forEach(issue => console.log(`  - ${issue}`));
      } else {
        console.log('\n✅ Import verified successfully!');
      }
    }

    const duration = Date.now() - startTime;

    console.log('\n📊 Import Summary');
    console.log('=================');
    console.log(`Nodes: ${nodesImported}`);
    console.log(`Relationships: ${relationshipsImported}`);
    console.log(`Duration: ${(duration / 1000).toFixed(2)}s`);
    console.log(`Errors: ${errors.length}`);

    return {
      nodesImported,
      relationshipsImported,
      errors,
      duration
    };
  } catch (err) {
    errors.push(err instanceof Error ? err.message : String(err));
    throw err;
  }
}

// CLI execution
if (require.main === module) {
  const driver = neo4j.driver(
    process.env.NEO4J_URI || 'neo4j+s://xxxxx.databases.neo4j.io',
    neo4j.auth.basic(
      process.env.NEO4J_USER || 'neo4j',
      process.env.NEO4J_PASSWORD || ''
    )
  );

  const importDir = process.env.IMPORT_DIR || './export';
  const clearFirst = process.argv.includes('--clear');
  const batchSize = parseInt(process.env.BATCH_SIZE || '100');

  if (!process.env.NEO4J_URI || !process.env.NEO4J_PASSWORD) {
    console.error('❌ Error: NEO4J_URI and NEO4J_PASSWORD environment variables required');
    console.error('\nUsage:');
    console.error('  NEO4J_URI=neo4j+s://xxxxx.databases.neo4j.io \\');
    console.error('  NEO4J_PASSWORD=your_password \\');
    console.error('  node scripts/import-neo4j-data.ts [--clear]');
    process.exit(1);
  }

  importDatabase(driver, importDir, { clearFirst, batchSize })
    .then(stats => {
      console.log('\n✅ Import complete!');
      if (stats.errors.length > 0) {
        console.error('\n⚠️  Errors:', stats.errors);
        process.exit(1);
      }
      return driver.close();
    })
    .catch(err => {
      console.error('\n❌ Import failed:', err);
      driver.close();
      process.exit(1);
    });
}
