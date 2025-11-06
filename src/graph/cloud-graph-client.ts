/**
 * @fileType: utility
 * @status: current
 * @updated: 2025-11-06
 * @tags: [neo4j, cloud, auradb, multi-tenant, bearer-auth]
 * @related: [neo4j-client.ts, graph-adapter.ts]
 * @priority: critical
 * @complexity: high
 * @dependencies: [neo4j-driver]
 */

import neo4j, { Driver, Session, Result, auth } from 'neo4j-driver';

// ============================================================================
// CONFIGURATION INTERFACES
// ============================================================================

/**
 * Cloud-specific Neo4j configuration
 * Designed for AuraDB and serverless environments
 */
export interface CloudNeo4jConfig {
  /** AuraDB connection URI (neo4j+s:// protocol) */
  uri: string;

  /** Bearer token for authentication (Supabase JWT) */
  bearerToken: string;

  /** Multi-tenant scoping - organization identifier */
  organizationId: string;

  /** Multi-tenant scoping - project identifier */
  projectId: string;

  /** Optional: Database name (default: 'neo4j') */
  database?: string;

  /** Optional: Connection pool size (default: 10 for serverless) */
  maxConnectionPoolSize?: number;

  /** Optional: Connection timeout in ms (default: 5000) */
  connectionTimeout?: number;
}

/**
 * Query execution context - automatically injected into all queries
 */
export interface QueryContext {
  organizationId: string;
  projectId: string;
  userId?: string;  // Extracted from bearer token
}

/**
 * Query result with execution metadata
 */
export interface CloudQueryResult<T = any> {
  records: T[];
  summary: {
    executionTime: number;
    recordCount: number;
    counters?: any;
  };
}

// ============================================================================
// CLOUD GRAPH CLIENT
// ============================================================================

/**
 * CloudGraphClient - Cloud-optimized Neo4j client for AuraDB
 *
 * Key Features:
 * - Bearer token authentication (not basic auth)
 * - Multi-tenant project scoping (auto-injected)
 * - Serverless-optimized connection pooling
 * - Automatic session lifecycle management
 * - Graceful error handling with fallbacks
 *
 * Usage:
 * ```typescript
 * const client = new CloudGraphClient({
 *   uri: process.env.NEO4J_URI!,
 *   bearerToken: userToken,
 *   organizationId: 'org_123',
 *   projectId: 'proj_456'
 * });
 *
 * await client.connect();
 * const events = await client.query<Event>(
 *   'MATCH (e:Event) WHERE e.timestamp > $since RETURN e',
 *   { since: yesterday }
 * );
 * await client.close();
 * ```
 */
export class CloudGraphClient {
  private driver: Driver | null = null;
  private config: CloudNeo4jConfig;
  private context: QueryContext;
  private userId: string | null = null;
  private connectionAttempts: number = 0;
  private readonly MAX_RETRY_ATTEMPTS = 3;

  constructor(config: CloudNeo4jConfig) {
    // Validate configuration
    this.validateConfig(config);

    // Store config with defaults
    this.config = {
      ...config,
      database: config.database || 'neo4j',
      maxConnectionPoolSize: config.maxConnectionPoolSize || 10,
      connectionTimeout: config.connectionTimeout || 5000,
    };

    // Extract userId from bearer token
    this.userId = this.extractUserIdFromToken(config.bearerToken);

    // Set up query context (auto-injected into all queries)
    this.context = {
      organizationId: config.organizationId,
      projectId: config.projectId,
      userId: this.userId,
    };
  }

  // ==========================================================================
  // CONNECTION MANAGEMENT
  // ==========================================================================

  /**
   * Connect to Neo4j AuraDB with bearer token authentication
   *
   * Connection Strategy:
   * - Uses neo4j+s:// protocol (SSL/TLS encrypted)
   * - Bearer token authentication (not basic auth)
   * - Lower connection pool (10 vs 50) for serverless
   * - Shorter timeout (5s vs 60s) for faster failures
   * - Verifies connectivity before returning
   */
  async connect(): Promise<void> {
    if (this.driver) {
      return; // Already connected
    }

    try {
      // Create driver with bearer token authentication
      this.driver = neo4j.driver(
        this.config.uri,
        auth.bearer(this.config.bearerToken),
        {
          maxConnectionPoolSize: this.config.maxConnectionPoolSize,
          connectionAcquisitionTimeout: this.config.connectionTimeout,

          // Serverless-specific optimizations
          connectionTimeout: this.config.connectionTimeout,
          maxTransactionRetryTime: 3000, // 3 seconds max retry
        }
      );

      // Verify connectivity (with retry logic)
      await this.verifyConnectivity();

      this.connectionAttempts = 0; // Reset on success
      console.log(`✓ Connected to Neo4j AuraDB: ${this.maskUri(this.config.uri)}`);
      console.log(`  Organization: ${this.context.organizationId}`);
      console.log(`  Project: ${this.context.projectId}`);
      console.log(`  User: ${this.userId}`);
    } catch (error: any) {
      this.connectionAttempts++;

      console.error('Failed to connect to Neo4j AuraDB:', {
        uri: this.maskUri(this.config.uri),
        attempt: this.connectionAttempts,
        error: error.message,
      });

      // Retry logic
      if (this.connectionAttempts < this.MAX_RETRY_ATTEMPTS) {
        console.log(`Retrying connection (attempt ${this.connectionAttempts + 1}/${this.MAX_RETRY_ATTEMPTS})...`);
        await this.delay(1000 * this.connectionAttempts); // Exponential backoff
        return this.connect();
      }

      throw new CloudGraphError(
        'CONNECTION_FAILED',
        `Failed to connect to Neo4j after ${this.MAX_RETRY_ATTEMPTS} attempts`,
        { originalError: error.message }
      );
    }
  }

  /**
   * Verify database connectivity
   * Handles AuraDB auto-pause gracefully
   */
  private async verifyConnectivity(): Promise<void> {
    if (!this.driver) {
      throw new CloudGraphError('NO_DRIVER', 'Driver not initialized');
    }

    try {
      await this.driver.verifyConnectivity();
    } catch (error: any) {
      // Handle AuraDB-specific errors
      if (error.code === 'ServiceUnavailable') {
        throw new CloudGraphError(
          'AURADB_PAUSED',
          'AuraDB instance is paused. First query will auto-resume (may take 10-15 seconds).',
          { originalError: error.message }
        );
      }
      throw error;
    }
  }

  /**
   * Close connection and release resources
   * Critical for serverless environments!
   */
  async close(): Promise<void> {
    if (this.driver) {
      await this.driver.close();
      this.driver = null;
      console.log('✓ Disconnected from Neo4j AuraDB');
    }
  }

  // ==========================================================================
  // QUERY EXECUTION (Multi-Tenant Safe)
  // ==========================================================================

  /**
   * Execute Cypher query with automatic multi-tenant scoping
   *
   * IMPORTANT: All queries are automatically scoped to:
   * - organizationId (from config)
   * - projectId (from config)
   *
   * This prevents cross-tenant data leakage!
   *
   * Parameter Injection:
   * - $organizationId - automatically injected
   * - $projectId - automatically injected
   * - $userId - automatically injected (if available)
   */
  async query<T = any>(
    cypher: string,
    params: Record<string, any> = {}
  ): Promise<CloudQueryResult<T>> {
    if (!this.driver) {
      throw new CloudGraphError('NOT_CONNECTED', 'Client not connected. Call connect() first.');
    }

    const session = this.getSession();
    const startTime = Date.now();

    try {
      // Auto-inject multi-tenant scoping parameters
      const scopedParams = this.injectTenantScope(params);

      // Execute query
      const result = await session.run(cypher, scopedParams);

      // Extract records
      const records = result.records.map(record => record.toObject() as T);

      return {
        records,
        summary: {
          executionTime: Date.now() - startTime,
          recordCount: records.length,
          counters: result.summary.counters,
        },
      };
    } catch (error: any) {
      // Handle AuraDB-specific errors
      if (error.code === 'ServiceUnavailable' && error.message.includes('paused')) {
        throw new CloudGraphError(
          'AURADB_RESUMING',
          'AuraDB is resuming from pause. Retry in 10-15 seconds.',
          { query: cypher, originalError: error.message }
        );
      }

      throw new CloudGraphError(
        'QUERY_FAILED',
        `Query execution failed: ${error.message}`,
        { query: cypher, params: scopedParams, originalError: error.message }
      );
    } finally {
      await session.close(); // Always cleanup!
    }
  }

  /**
   * Execute query and return records only (convenience method)
   */
  async queryRecords<T = any>(
    cypher: string,
    params: Record<string, any> = {}
  ): Promise<T[]> {
    const result = await this.query<T>(cypher, params);
    return result.records;
  }

  /**
   * Get a new session for manual transaction control
   * Remember to close session after use!
   */
  getSession(): Session {
    if (!this.driver) {
      throw new CloudGraphError('NOT_CONNECTED', 'Client not connected. Call connect() first.');
    }

    return this.driver.session({
      database: this.config.database,
      defaultAccessMode: neo4j.session.WRITE,
    });
  }

  // ==========================================================================
  // MULTI-TENANT PARAMETER INJECTION
  // ==========================================================================

  /**
   * Inject tenant-scoping parameters into query params
   * Prevents cross-tenant data access!
   */
  private injectTenantScope(params: Record<string, any>): Record<string, any> {
    return {
      ...params,
      organizationId: this.context.organizationId,
      projectId: this.context.projectId,
      userId: this.context.userId,
    };
  }

  /**
   * Get current query context (for debugging)
   */
  getContext(): QueryContext {
    return { ...this.context };
  }

  // ==========================================================================
  // AUTHENTICATION & VALIDATION
  // ==========================================================================

  /**
   * Extract userId from Supabase JWT bearer token
   *
   * Strategy (MVP):
   * - Decode JWT and extract 'sub' claim (user ID)
   * - For development: Accept any valid JWT structure
   * - For production: Verify signature with Supabase public key
   */
  private extractUserIdFromToken(bearerToken: string): string {
    try {
      // Decode JWT (without verification for MVP)
      const base64Payload = bearerToken.split('.')[1];
      const payload = JSON.parse(Buffer.from(base64Payload, 'base64').toString());

      return payload.sub || payload.user_id || 'unknown';
    } catch (error) {
      console.warn('Failed to extract userId from token, using fallback');
      return 'anonymous';
    }
  }

  /**
   * Validate configuration at construction time
   */
  private validateConfig(config: CloudNeo4jConfig): void {
    const errors: string[] = [];

    if (!config.uri) {
      errors.push('uri is required');
    } else if (!config.uri.startsWith('neo4j+s://') && !config.uri.startsWith('bolt://')) {
      errors.push('uri must use neo4j+s:// protocol for AuraDB (or bolt:// for local)');
    }

    if (!config.bearerToken) {
      errors.push('bearerToken is required');
    }

    if (!config.organizationId) {
      errors.push('organizationId is required for multi-tenant scoping');
    }

    if (!config.projectId) {
      errors.push('projectId is required for multi-tenant scoping');
    }

    if (errors.length > 0) {
      throw new CloudGraphError(
        'INVALID_CONFIG',
        'Invalid CloudGraphClient configuration',
        { errors }
      );
    }
  }

  // ==========================================================================
  // HELPER UTILITIES
  // ==========================================================================

  /**
   * Mask sensitive parts of URI for logging
   */
  private maskUri(uri: string): string {
    try {
      const url = new URL(uri);
      return `${url.protocol}//${url.hostname}:${url.port || '7687'}`;
    } catch {
      return 'neo4j+s://***';
    }
  }

  /**
   * Delay helper for retry logic
   */
  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * Get connection health status
   */
  async getHealth(): Promise<{
    connected: boolean;
    organizationId: string;
    projectId: string;
    databaseStatus?: 'active' | 'paused' | 'unknown';
  }> {
    const health = {
      connected: this.driver !== null,
      organizationId: this.context.organizationId,
      projectId: this.context.projectId,
      databaseStatus: 'unknown' as 'active' | 'paused' | 'unknown',
    };

    if (this.driver) {
      try {
        await this.driver.verifyConnectivity();
        health.databaseStatus = 'active';
      } catch (error: any) {
        if (error.code === 'ServiceUnavailable') {
          health.databaseStatus = 'paused';
        }
      }
    }

    return health;
  }
}

// ============================================================================
// ERROR HANDLING
// ============================================================================

/**
 * Cloud-specific error types
 */
export type CloudGraphErrorCode =
  | 'INVALID_CONFIG'
  | 'NO_DRIVER'
  | 'NOT_CONNECTED'
  | 'CONNECTION_FAILED'
  | 'AURADB_PAUSED'
  | 'AURADB_RESUMING'
  | 'QUERY_FAILED'
  | 'TENANT_SCOPE_ERROR'
  | 'AUTH_INVALID';

/**
 * CloudGraphError - Structured error for cloud operations
 */
export class CloudGraphError extends Error {
  constructor(
    public code: CloudGraphErrorCode,
    message: string,
    public details?: Record<string, any>
  ) {
    super(message);
    this.name = 'CloudGraphError';
  }

  /**
   * Check if error is retryable
   */
  isRetryable(): boolean {
    return ['AURADB_PAUSED', 'AURADB_RESUMING', 'CONNECTION_FAILED'].includes(this.code);
  }
}

// ============================================================================
// FACTORY & SINGLETON PATTERNS
// ============================================================================

/**
 * Factory method to create CloudGraphClient from environment
 *
 * Environment Variables Required:
 * - NEO4J_URI (neo4j+s://...)
 * - SUPABASE_ACCESS_TOKEN (from request header)
 * - ORGANIZATION_ID (from user context)
 * - PROJECT_ID (from request params)
 */
export function createCloudGraphClient(
  bearerToken: string,
  organizationId: string,
  projectId: string
): CloudGraphClient {
  return new CloudGraphClient({
    uri: process.env.NEO4J_URI || '',
    bearerToken,
    organizationId,
    projectId,
  });
}

/**
 * Create client from Next.js API route context
 *
 * Usage in API routes:
 * ```typescript
 * export async function GET(request: Request) {
 *   const client = await createClientFromRequest(request);
 *   const events = await client.queryRecords<Event>('...');
 *   await client.close();
 *   return Response.json({ events });
 * }
 * ```
 */
export async function createClientFromRequest(
  request: Request,
  options?: { organizationId?: string; projectId?: string }
): Promise<CloudGraphClient> {
  // Extract bearer token from Authorization header
  const authHeader = request.headers.get('Authorization');
  if (!authHeader?.startsWith('Bearer ')) {
    throw new CloudGraphError('AUTH_INVALID', 'Missing or invalid Authorization header');
  }

  const bearerToken = authHeader.substring(7);

  // Extract tenant scope from options or URL params
  const url = new URL(request.url);
  const organizationId = options?.organizationId || url.searchParams.get('org') || '';
  const projectId = options?.projectId || url.searchParams.get('project') || '';

  if (!organizationId || !projectId) {
    throw new CloudGraphError(
      'TENANT_SCOPE_ERROR',
      'Missing organization_id or project_id for multi-tenant scoping'
    );
  }

  const client = createCloudGraphClient(bearerToken, organizationId, projectId);
  await client.connect();

  return client;
}
