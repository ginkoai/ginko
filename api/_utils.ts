/**
 * @fileType: utility
 * @status: new
 * @updated: 2025-08-04
 * @tags: [vercel, serverless, utils, auth, database]
 * @related: [serverless-api, auth-manager.ts, database.ts]
 * @priority: high
 * @complexity: medium
 * @dependencies: [@vercel/node, database, auth-manager]
 */

import type { VercelRequest, VercelResponse } from '@vercel/node';
import { DatabaseManager, DatabaseConfig } from './_lib/database.js';
import AuthManager, { AuthenticatedUser, PlanTier, PlanStatus, UserRole } from './_lib/auth-manager.js';
import { SupabaseAuthManager } from './_lib/supabase-auth-manager.js';
import EntitlementsManager, { FeatureFlag } from './_lib/entitlements-manager.js';
import BillingManager from './_lib/billing-manager.js';
import UsageTracker, { UsageEventType } from './_lib/usage-tracker.js';

// Re-export DatabaseManager for use in API routes
export { DatabaseManager };

// Global instances (initialized once per deployment)
let db: DatabaseManager | null = null;
let authManager: AuthManager | SupabaseAuthManager | null = null;
let entitlementsManager: EntitlementsManager | null = null;
let billingManager: BillingManager | null = null;
let usageTracker: UsageTracker | null = null;

/**
 * Initialize database connection with fallback to in-memory storage
 */
export async function initializeDatabase(): Promise<DatabaseManager> {
  if (db) return db;

  try {
    let config: DatabaseConfig;
    
    // First try to use Supabase-Vercel integration connection string
    // Use POSTGRES_URL (pooler) for serverless environments
    const postgresUrl = process.env.POSTGRES_URL || process.env.POSTGRES_PRISMA_URL || process.env.POSTGRES_URL_NON_POOLING;
    
    if (postgresUrl) {
      const urlType = process.env.POSTGRES_URL ? 'POSTGRES_URL (pooler)' : 
                      process.env.POSTGRES_PRISMA_URL ? 'POSTGRES_PRISMA_URL' : 'POSTGRES_URL_NON_POOLING (direct)';
      console.log(`[DB] Using Supabase-Vercel integration connection string (${urlType})`);
      console.log('[DB] Connection URL exists, length:', postgresUrl.length);
      console.log('[DB] Connection URL starts with:', postgresUrl.substring(0, 50) + '...');
      
      // Parse connection string format: postgresql://user:password@host:port/database
      const url = new URL(postgresUrl);
      config = {
        host: url.hostname,
        port: parseInt(url.port) || 5432,
        database: url.pathname.slice(1), // Remove leading slash
        user: url.username,
        password: url.password,
        ssl: true // DatabaseManager will handle the SSL config
      };
      
      console.log('[DB] Parsed config:', {
        host: config.host,
        port: config.port,
        database: config.database,
        user: config.user,
        password: config.password ? `${config.password.substring(0, 4)}...` : 'MISSING',
        ssl: config.ssl
      });
    } else {
      // Fallback to individual environment variables
      const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL;
      
      console.log('[DB] Environment check:', {
        hasSupabaseUrl: !!supabaseUrl,
        hasPostgresHost: !!process.env.POSTGRES_HOST,
        hasPostgresPassword: !!(process.env.SUPABASE_DB_PASSWORD || process.env.POSTGRES_PASSWORD),
        postgresPassword: process.env.POSTGRES_PASSWORD ? '[REDACTED]' : 'empty',
        nodeEnv: process.env.NODE_ENV
      });
      
      if (supabaseUrl) {
        // Parse Supabase URL: https://xxxxx.supabase.co
        const hostMatch = supabaseUrl.match(/https:\/\/([^.]+)\.supabase\.co/);
        const host = hostMatch ? `db.${hostMatch[1]}.supabase.co` : 'localhost';
        const password = process.env.SUPABASE_DB_PASSWORD || process.env.POSTGRES_PASSWORD;
        
        if (!password && process.env.NODE_ENV === 'production') {
          throw new Error('Supabase database password is required in production but not configured');
        }
        
        config = {
          host,
          port: 5432,
          database: 'postgres',
          user: 'postgres',
          password: password || 'dev_password',
          ssl: true
        };
        
        console.log('[DB] Using Supabase config:', { host, database: config.database, user: config.user });
      } else {
        // Fallback to direct PostgreSQL config
        config = {
          host: process.env.POSTGRES_HOST || 'localhost',
          port: parseInt(process.env.POSTGRES_PORT || '5432'),
          database: process.env.POSTGRES_DATABASE || process.env.POSTGRES_DB || 'contextmcp',
          user: process.env.POSTGRES_USER || 'contextmcp',
          password: process.env.POSTGRES_PASSWORD || 'dev_password',
          ssl: process.env.NODE_ENV === 'production'
        };
        
        console.log('[DB] Using PostgreSQL config:', { host: config.host, database: config.database, user: config.user });
      }
    }

    db = new DatabaseManager(config);
    await db.connect();
    console.log('[VERCEL] Database connected successfully');
  } catch (error) {
    console.error('[DB] ❌ Database connection failed:', error);
    console.error('[DB] Error details:', {
      name: error instanceof Error ? error.name : 'Unknown',
      message: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack?.split('\n').slice(0, 3).join('\n') : undefined
    });
    
    // Fail fast - no fallback, no masking
    throw new Error(`Database connection failed: ${error instanceof Error ? error.message : String(error)}`);
  }

  return db;
}

// Removed all in-memory fallback code - fail fast, fail clear

/**
 * Initialize authentication manager
 */
export async function initializeAuth(): Promise<AuthManager | SupabaseAuthManager> {
  if (authManager) return authManager;

  // Use Supabase authentication instead of PostgreSQL
  // This matches the working test-supabase-auth.ts implementation
  try {
    console.log('[AUTH] Initializing Supabase authentication manager...');
    authManager = new SupabaseAuthManager() as any;
    console.log('[AUTH] Supabase authentication manager initialized successfully');
  } catch (error) {
    console.error('[AUTH] Failed to initialize Supabase auth, falling back to database auth:', error);
    // Fallback to database auth if Supabase fails
    const database = await initializeDatabase();
    authManager = new AuthManager(database);
  }
  
  return authManager;
}

/**
 * Initialize entitlements manager
 */
export async function initializeEntitlements(): Promise<EntitlementsManager> {
  if (entitlementsManager) return entitlementsManager;

  const database = await initializeDatabase();
  entitlementsManager = new EntitlementsManager(database);
  
  return entitlementsManager;
}

/**
 * Initialize billing manager
 */
export async function initializeBilling(): Promise<BillingManager> {
  if (billingManager) return billingManager;

  const database = await initializeDatabase();
  const tracker = await initializeUsageTracker();
  billingManager = new BillingManager(database, tracker);
  
  return billingManager;
}

/**
 * Initialize usage tracker
 */
export async function initializeUsageTracker(): Promise<UsageTracker> {
  if (usageTracker) return usageTracker;

  const database = await initializeDatabase();
  usageTracker = new UsageTracker(database);
  
  return usageTracker;
}

// Test user creation logic removed - using OAuth-generated users instead

/**
 * Extract authenticated user from request
 */
export async function getAuthenticatedUser(req: VercelRequest): Promise<AuthenticatedUser> {
  const auth = await initializeAuth();
  
  // Check for API key in headers (case-insensitive)
  const apiKey = req.headers.authorization?.replace('Bearer ', '') || 
                 req.headers['x-api-key'] as string ||
                 req.headers['X-API-Key'] as string ||
                 req.headers['X-API-KEY'] as string ||
                 req.headers['X-Api-Key'] as string;

  if (apiKey) {
    try {
      const user = await auth.authenticateApiKey(apiKey);
      if (user) {
        return user;
      }
    } catch (error) {
      console.warn('[VERCEL] API key validation failed:', error);
    }
  }

  // Special handling for E2E test API keys (both new and legacy format)
  if (apiKey === 'wmcp_sk_test_Ar0MN4BeW_Fro5mESi5PciTsOg6qlPcIr7k0vBL2mIk' ||
      apiKey === 'cmcp_sk_test_Ar0MN4BeW_Fro5mESi5PciTsOg6qlPcIr7k0vBL2mIk') {
    console.log('[VERCEL] Using E2E test user for API key:', apiKey.substring(0, 20) + '...');
    
    const testUser = {
      planTier: 'enterprise' as PlanTier,
      planStatus: 'active' as PlanStatus,
      organizationId: '00000000-0000-0000-0000-000000000001', // E2E test org UUID
      id: '00000000-0000-0000-0000-000000000002', // E2E test user UUID
      email: 'e2e-test@ginko.ai',
      role: 'owner' as UserRole,
      permissions: ['*'],
      apiKeyPrefix: apiKey.substring(0, 13),
      lastActive: new Date()
    };

    // Note: OAuth users are created automatically via handle_new_user() trigger
    console.log('[AUTH] Using E2E test API key - OAuth user should exist in user_profiles');
    
    return testUser;
  }

  // Fallback to development user for local/test environments
  if (process.env.NODE_ENV !== 'production') {
    const devUser = {
      planTier: 'enterprise' as PlanTier,
      planStatus: 'active' as PlanStatus,
      organizationId: '00000000-0000-0000-0000-000000000003', // Local dev org UUID
      id: '00000000-0000-0000-0000-000000000004', // Local dev user UUID
      email: 'dev@localhost',
      role: 'owner' as UserRole,
      permissions: ['*'],
      apiKeyPrefix: 'dev_key_',
      lastActive: new Date()
    };

    // Note: For local development, you should create a user via OAuth flow first
    console.log('[AUTH] Using development fallback - consider setting up OAuth test user');
    
    return devUser;
  }

  throw new Error('Authentication required');
}

/**
 * Check tool access and rate limits
 */
export async function checkToolAccess(user: AuthenticatedUser, toolName: string): Promise<void> {
  const entitlements = await initializeEntitlements();
  const tracker = await initializeUsageTracker();

  // Map tools to required features
  const toolFeatureMap: Record<string, FeatureFlag | undefined> = {
    'get_project_overview': FeatureFlag.BASIC_CONTEXT,
    'find_relevant_code': FeatureFlag.BASIC_CONTEXT,
    'get_file_context': FeatureFlag.BASIC_CONTEXT,
    'get_recent_changes': FeatureFlag.GIT_INTEGRATION,
    'get_team_activity': FeatureFlag.TEAM_COLLABORATION,
    'get_best_practices': FeatureFlag.BEST_PRACTICES_MGMT,
    'suggest_best_practice': FeatureFlag.BEST_PRACTICES_MGMT,
    'capture_session': FeatureFlag.SESSION_HANDOFF,
    'resume_session': FeatureFlag.SESSION_HANDOFF,
    'list_sessions': FeatureFlag.LOCAL_SESSIONS,
    'get_dashboard_metrics': FeatureFlag.USAGE_ANALYTICS,
    'get_file_hotspots': FeatureFlag.TEAM_INSIGHTS,
    'get_team_analytics': FeatureFlag.PERFORMANCE_METRICS
  };

  const requiredFeature = toolFeatureMap[toolName];
  if (requiredFeature) {
    await entitlements.checkFeatureAccess(user, requiredFeature);
  }

  // Check rate limits for context queries
  if (['get_project_overview', 'find_relevant_code', 'get_file_context'].includes(toolName)) {
    await entitlements.checkRateLimit(user, 'contextQueries');
    
    // Track context query for usage limits
    await tracker.trackForUser(user, UsageEventType.CONTEXT_QUERY, {
      metadata: { tool: toolName }
    });
  }

  // Check session creation limits
  if (['capture_session'].includes(toolName)) {
    await entitlements.checkUsageLimit(user, 'sessions', 'create');
    await entitlements.checkRateLimit(user, 'sessionCreation');
  }
}

/**
 * Handle CORS headers for Vercel functions
 */
export function setCORSHeaders(res: VercelResponse): void {
  res.setHeader('Access-Control-Allow-Credentials', 'true');
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,PATCH,DELETE,POST,PUT');
  res.setHeader(
    'Access-Control-Allow-Headers',
    'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version, Authorization, X-API-Key'
  );
}

/**
 * Handle preflight OPTIONS requests
 */
export function handlePreflight(req: VercelRequest, res: VercelResponse): boolean {
  if (req.method === 'OPTIONS') {
    setCORSHeaders(res);
    res.status(200).end();
    return true;
  }
  return false;
}

/**
 * Standard error response format
 */
export function sendError(res: VercelResponse, error: Error | string, statusCode: number = 500): void {
  setCORSHeaders(res);
  const message = error instanceof Error ? error.message : error;
  res.status(statusCode).json({ error: message });
}

/**
 * Standard success response format
 */
export function sendSuccess(res: VercelResponse, data: any, statusCode: number = 200): void {
  setCORSHeaders(res);
  res.status(statusCode).json(data);
}

/**
 * Extract team and project IDs from arguments with fallbacks
 */
export function extractTeamAndProject(args: any, user: AuthenticatedUser): { teamId: string; projectId: string } {
  // Use the organization ID as the team ID if not provided (teams and orgs are 1:1 for now)
  const teamId = args.teamId || user.organizationId;
  // Generate a deterministic project UUID from the org ID
  const projectId = args.projectId || '00000000-0000-0000-0000-000000000100'; // Default project UUID
  
  return { teamId, projectId };
}

/**
 * Log tool call for debugging and analytics
 */
export function logToolCall(toolName: string, user: AuthenticatedUser, args: any): void {
  const timestamp = new Date().toISOString();
  console.log(`[${timestamp}] 🛠️  MCP Tool Call: ${toolName} by ${user.email}`);
  console.log(`[${timestamp}] 👥 Organization: ${user.organizationId} (${user.planTier})`);
  console.log(`[${timestamp}] 📋 Arguments:`, JSON.stringify(args, null, 2));
}

/**
 * Track usage for billing
 */
export async function trackUsage(user: AuthenticatedUser, toolName: string, args: any): Promise<void> {
  try {
    const tracker = await initializeUsageTracker();
    await tracker.trackForUser(user, UsageEventType.MCP_TOOL_CALL, {
      resourceId: args.projectId,
      metadata: { tool: toolName, args }
    });
  } catch (error) {
    console.warn('[VERCEL] Usage tracking failed:', error);
  }
}