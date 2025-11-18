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
import { Session } from 'neo4j-driver';
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
    userId?: string;
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
export declare class CloudGraphClient {
    private driver;
    private config;
    private context;
    private userId;
    private connectionAttempts;
    private readonly MAX_RETRY_ATTEMPTS;
    constructor(config: CloudNeo4jConfig);
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
    connect(): Promise<void>;
    /**
     * Verify database connectivity
     * Handles AuraDB auto-pause gracefully
     */
    private verifyConnectivity;
    /**
     * Close connection and release resources
     * Critical for serverless environments!
     */
    close(): Promise<void>;
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
    query<T = any>(cypher: string, params?: Record<string, any>): Promise<CloudQueryResult<T>>;
    /**
     * Execute query and return records only (convenience method)
     */
    queryRecords<T = any>(cypher: string, params?: Record<string, any>): Promise<T[]>;
    /**
     * Get a new session for manual transaction control
     * Remember to close session after use!
     */
    getSession(): Session;
    /**
     * Inject tenant-scoping parameters into query params
     * Prevents cross-tenant data access!
     */
    private injectTenantScope;
    /**
     * Get current query context (for debugging)
     */
    getContext(): QueryContext;
    /**
     * Extract userId from Supabase JWT bearer token
     *
     * Strategy (MVP):
     * - Decode JWT and extract 'sub' claim (user ID)
     * - For development: Accept any valid JWT structure
     * - For production: Verify signature with Supabase public key
     */
    private extractUserIdFromToken;
    /**
     * Validate configuration at construction time
     */
    private validateConfig;
    /**
     * Mask sensitive parts of URI for logging
     */
    private maskUri;
    /**
     * Delay helper for retry logic
     */
    private delay;
    /**
     * Get connection health status
     */
    getHealth(): Promise<{
        connected: boolean;
        organizationId: string;
        projectId: string;
        databaseStatus?: 'active' | 'paused' | 'unknown';
    }>;
}
/**
 * Cloud-specific error types
 */
export type CloudGraphErrorCode = 'INVALID_CONFIG' | 'NO_DRIVER' | 'NOT_CONNECTED' | 'CONNECTION_FAILED' | 'AURADB_PAUSED' | 'AURADB_RESUMING' | 'QUERY_FAILED' | 'TENANT_SCOPE_ERROR' | 'AUTH_INVALID';
/**
 * CloudGraphError - Structured error for cloud operations
 */
export declare class CloudGraphError extends Error {
    code: CloudGraphErrorCode;
    details?: Record<string, any> | undefined;
    constructor(code: CloudGraphErrorCode, message: string, details?: Record<string, any> | undefined);
    /**
     * Check if error is retryable
     */
    isRetryable(): boolean;
}
/**
 * Factory method to create CloudGraphClient from environment
 *
 * Environment Variables Required:
 * - NEO4J_URI (neo4j+s://...)
 * - SUPABASE_ACCESS_TOKEN (from request header)
 * - ORGANIZATION_ID (from user context)
 * - PROJECT_ID (from request params)
 */
export declare function createCloudGraphClient(bearerToken: string, organizationId: string, projectId: string): CloudGraphClient;
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
export declare function createClientFromRequest(request: Request, options?: {
    organizationId?: string;
    projectId?: string;
}): Promise<CloudGraphClient>;
//# sourceMappingURL=cloud-graph-client.d.ts.map