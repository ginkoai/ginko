/**
 * @fileType: utility
 * @status: current
 * @updated: 2025-11-05
 * @tags: [neo4j, graph, api, serverless, auradb, adr-044]
 * @related: [init.ts, documents.ts, query.ts, status.ts]
 * @priority: critical
 * @complexity: medium
 * @dependencies: [neo4j-driver]
 */

import neo4j, { Driver, Session } from 'neo4j-driver';

let driver: Driver | null = null;

/**
 * Get Neo4j driver instance (singleton for serverless)
 *
 * Migrated to Neo4j AuraDB Free Tier (ADR-044)
 * Connection: neo4j+s://7ae3e759.databases.neo4j.io
 */
export function getDriver(): Driver {
  if (!driver) {
    const uri = process.env.NEO4J_URI || 'bolt://localhost:7687';
    const user = process.env.NEO4J_USER || 'neo4j';
    const password = process.env.NEO4J_PASSWORD || 'neo4j';

    // DEBUG: Log connection attempt
    console.log('[Neo4j] Connecting to:', uri);
    console.log('[Neo4j] User:', user);
    console.log('[Neo4j] Password length:', password?.length || 0);

    driver = neo4j.driver(
      uri,
      neo4j.auth.basic(user, password),
      {
        maxConnectionPoolSize: 10, // Lower for serverless
        connectionAcquisitionTimeout: 5000, // 5 seconds
      }
    );
  }

  return driver;
}

/**
 * Get a new Neo4j session
 * Remember to close the session after use!
 */
export function getSession(): Session {
  return getDriver().session();
}

/**
 * Run a query and automatically handle session lifecycle
 */
export async function runQuery<T = any>(
  cypher: string,
  params: Record<string, any> = {}
): Promise<T[]> {
  const session = getSession();
  try {
    const result = await session.run(cypher, params);
    return result.records.map(record => record.toObject() as T);
  } finally {
    await session.close();
  }
}

/**
 * Verify Neo4j connectivity
 */
export async function verifyConnection(): Promise<boolean> {
  try {
    const driver = getDriver();
    await driver.verifyConnectivity();
    return true;
  } catch (error) {
    console.error('[Neo4j] Connection failed:', error);
    return false;
  }
}

/**
 * Close driver (for cleanup)
 */
export async function closeDriver(): Promise<void> {
  if (driver) {
    await driver.close();
    driver = null;
  }
}
