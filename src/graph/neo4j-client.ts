/**
 * @fileType: utility
 * @status: current
 * @updated: 2025-10-27
 * @tags: [neo4j, graph, database, knowledge-graph]
 * @related: [schema/001-initial-schema.cypher]
 * @priority: critical
 * @complexity: medium
 * @dependencies: [neo4j-driver]
 */

import neo4j, { Driver, Session, Result } from 'neo4j-driver';
import fs from 'fs/promises';
import path from 'path';

/**
 * Neo4j connection configuration
 */
interface Neo4jConfig {
  uri: string;
  user: string;
  password: string;
}

/**
 * Neo4j client for Ginko knowledge graph
 *
 * Features:
 * - Connection pooling
 * - Environment-based configuration
 * - Schema migration support
 * - Query helpers with error handling
 */
export class Neo4jClient {
  private driver: Driver | null = null;
  private config: Neo4jConfig;

  constructor(config?: Partial<Neo4jConfig>) {
    this.config = {
      uri: config?.uri || process.env.NEO4J_URI || 'bolt://localhost:7687',
      user: config?.user || process.env.NEO4J_USER || 'neo4j',
      password: config?.password || process.env.NEO4J_PASSWORD || 'devpassword123',
    };
  }

  /**
   * Connect to Neo4j database
   * Creates connection pool for reuse
   */
  async connect(): Promise<void> {
    if (this.driver) {
      return; // Already connected
    }

    try {
      this.driver = neo4j.driver(
        this.config.uri,
        neo4j.auth.basic(this.config.user, this.config.password),
        {
          maxConnectionPoolSize: 50,
          connectionAcquisitionTimeout: 60000, // 60 seconds
        }
      );

      // Verify connectivity
      await this.driver.verifyConnectivity();
      console.log('✓ Connected to Neo4j:', this.config.uri);
    } catch (error) {
      console.error('Failed to connect to Neo4j:', error);
      throw error;
    }
  }

  /**
   * Get a new session for running queries
   * Remember to close session after use!
   */
  getSession(): Session {
    if (!this.driver) {
      throw new Error('Not connected to Neo4j. Call connect() first.');
    }
    return this.driver.session();
  }

  /**
   * Close connection and release resources
   */
  async close(): Promise<void> {
    if (this.driver) {
      await this.driver.close();
      this.driver = null;
      console.log('✓ Disconnected from Neo4j');
    }
  }

  /**
   * Run a Cypher query with parameters
   * Automatically handles session lifecycle
   */
  async query(cypher: string, params: Record<string, any> = {}): Promise<Result> {
    const session = this.getSession();
    try {
      const result = await session.run(cypher, params);
      return result;
    } finally {
      await session.close();
    }
  }

  /**
   * Run a Cypher query and return records
   * Convenience method that extracts records from result
   */
  async queryRecords(cypher: string, params: Record<string, any> = {}): Promise<any[]> {
    const result = await this.query(cypher, params);
    return result.records.map(record => record.toObject());
  }

  /**
   * Run multiple Cypher statements (for migrations)
   * Splits by semicolon and runs each statement
   */
  async runMultipleStatements(cypher: string): Promise<void> {
    // Split by semicolon, filter out empty statements and comments
    const statements = cypher
      .split(';')
      .map(s => {
        // Remove comment lines from each statement
        const lines = s.split('\n')
          .filter(line => !line.trim().startsWith('//'))
          .join('\n');
        return lines.trim();
      })
      .filter(s => s.length > 0);

    console.log(`📝 Found ${statements.length} statements to execute\n`);

    for (const statement of statements) {
      if (statement) {
        try {
          await this.query(statement);
          console.log('✓ Executed:', statement.substring(0, 60) + '...');
        } catch (error: any) {
          // Ignore "already exists" errors for idempotency
          if (error.code === 'Neo.ClientError.Schema.ConstraintAlreadyExists' ||
              error.code === 'Neo.ClientError.Schema.IndexAlreadyExists' ||
              error.code === 'Neo.ClientError.Schema.EquivalentSchemaRuleAlreadyExists') {
            console.log('⚠ Already exists (skipped):', statement.substring(0, 60) + '...');
          } else {
            console.error('✗ Failed:', statement.substring(0, 60));
            throw error;
          }
        }
      }
    }
  }

  /**
   * Run schema migration from file
   */
  async runMigration(migrationFile: string): Promise<void> {
    console.log(`Running migration: ${migrationFile}`);

    const migrationPath = path.join(__dirname, 'schema', migrationFile);
    const cypher = await fs.readFile(migrationPath, 'utf-8');

    await this.runMultipleStatements(cypher);
    console.log(`✓ Migration complete: ${migrationFile}`);
  }

  /**
   * Verify schema is set up correctly
   */
  async verifySchema(): Promise<void> {
    console.log('\nVerifying schema...');

    // Check constraints
    const constraints = await this.queryRecords('SHOW CONSTRAINTS');
    console.log(`✓ Constraints: ${constraints.length}`);
    constraints.forEach(c => console.log(`  - ${c.name} (${c.type})`));

    // Check indexes
    const indexes = await this.queryRecords('SHOW INDEXES');
    console.log(`✓ Indexes: ${indexes.length}`);
    indexes.forEach(i => console.log(`  - ${i.name} (${i.type})`));
  }

  /**
   * Clear all data (for testing only!)
   * WARNING: Deletes everything in the database
   */
  async clearAllData(): Promise<void> {
    console.warn('⚠️  Clearing all data...');
    await this.query('MATCH (n) DETACH DELETE n');
    console.log('✓ All data deleted');
  }

  /**
   * Get database statistics
   */
  async getStats(): Promise<any> {
    const result = await this.queryRecords(`
      MATCH (n)
      RETURN labels(n) as labels, count(n) as count
      ORDER BY count DESC
    `);
    return result;
  }
}

/**
 * Create a singleton instance for use across the application
 */
export const neo4jClient = new Neo4jClient();

/**
 * Helper to ensure connection before queries
 */
export async function ensureConnected(): Promise<Neo4jClient> {
  await neo4jClient.connect();
  return neo4jClient;
}
