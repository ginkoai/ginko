#!/usr/bin/env node

/**
 * @fileType: service
 * @status: new
 * @updated: 2025-08-01
 * @tags: [entitlements, billing, feature-flags, rate-limiting, plans]
 * @related: [auth-manager.ts, database.ts, ADR-004-identity-entitlements-billing.md]
 * @priority: critical
 * @complexity: high
 * @dependencies: [redis]
 */

import { DatabaseManager } from './database.js';
import { AuthenticatedUser, PlanTier } from './auth-manager.js';

export enum FeatureFlag {
  // Core Features
  BASIC_CONTEXT = 'basic_context',
  LOCAL_SESSIONS = 'local_sessions',
  
  // Collaboration Features  
  TEAM_COLLABORATION = 'team_collaboration',
  REAL_TIME_SYNC = 'real_time_sync',
  SESSION_HANDOFF = 'session_handoff',
  
  // Integration Features
  GIT_INTEGRATION = 'git_integration',
  WEBHOOK_PROCESSING = 'webhook_processing',
  BEST_PRACTICES_MGMT = 'best_practices_mgmt',
  
  // Analytics Features
  USAGE_ANALYTICS = 'usage_analytics',
  TEAM_INSIGHTS = 'team_insights',
  PERFORMANCE_METRICS = 'performance_metrics',
  
  // Enterprise Features
  SSO_INTEGRATION = 'sso_integration',
  CUSTOM_INTEGRATIONS = 'custom_integrations',
  PRIORITY_SUPPORT = 'priority_support',
  WHITE_LABEL = 'white_label'
}

export interface PlanLimits {
  maxProjects: number;           // -1 = unlimited
  maxTeamMembers: number;        
  maxSessionsPerMonth: number;   
  maxContextCacheSize: number;   // MB
  maxBestPractices: number;      
  features: Set<FeatureFlag>;    // Granular permissions
  rateLimit: {                   // Requests per minute
    contextQueries: number;
    sessionCreation: number;
    gitWebhooks: number;
  };
}

export interface UsageMetrics {
  organizationId: string;
  currentPeriod: {
    sessions: number;
    contextQueries: number;
    gitWebhooks: number;
    storageUsed: number; // MB
  };
  limits: PlanLimits;
}

export class EntitlementError extends Error {
  constructor(
    message: string, 
    public code: string = 'ENTITLEMENT_ERROR',
    public feature?: string,
    public limit?: number,
    public current?: number
  ) {
    super(message);
    this.name = 'EntitlementError';
  }
}

export class UsageLimitExceededError extends EntitlementError {
  constructor(resource: string, current: number, limit: number) {
    super(
      `Usage limit exceeded for ${resource}: ${current}/${limit}`,
      'USAGE_LIMIT_EXCEEDED',
      resource,
      limit,
      current
    );
  }
}

export class FeatureNotAvailableError extends EntitlementError {
  constructor(feature: string, planTier: string) {
    super(
      `Feature '${feature}' not available on ${planTier} plan`,
      'FEATURE_NOT_AVAILABLE',
      feature
    );
  }
}

export class RateLimitExceededError extends EntitlementError {
  constructor(action: string, limit: number) {
    super(
      `Rate limit exceeded for ${action}: ${limit} requests per minute`,
      'RATE_LIMIT_EXCEEDED',
      action,
      limit
    );
  }
}

/**
 * Plan configurations with limits and features
 */
export const PLAN_CONFIGURATIONS: Record<PlanTier, PlanLimits> = {
  free: {
    maxProjects: 1,
    maxTeamMembers: 1,
    maxSessionsPerMonth: 50,
    maxContextCacheSize: 100,
    maxBestPractices: 10,
    features: new Set([
      FeatureFlag.BASIC_CONTEXT,
      FeatureFlag.LOCAL_SESSIONS,
      FeatureFlag.SESSION_HANDOFF  // Core MCP functionality - included in free tier
    ]),
    rateLimit: {
      contextQueries: 30,
      sessionCreation: 10,
      gitWebhooks: 0
    }
  },
  pro: {
    maxProjects: 10,
    maxTeamMembers: 10,
    maxSessionsPerMonth: 1000,
    maxContextCacheSize: 1000,
    maxBestPractices: 50,
    features: new Set([
      FeatureFlag.BASIC_CONTEXT,
      FeatureFlag.LOCAL_SESSIONS,
      FeatureFlag.TEAM_COLLABORATION,
      FeatureFlag.REAL_TIME_SYNC,
      FeatureFlag.SESSION_HANDOFF,
      FeatureFlag.GIT_INTEGRATION,
      FeatureFlag.WEBHOOK_PROCESSING,
      FeatureFlag.BEST_PRACTICES_MGMT,
      FeatureFlag.USAGE_ANALYTICS
    ]),
    rateLimit: {
      contextQueries: 200,
      sessionCreation: 50,
      gitWebhooks: 100
    }
  },
  // Team tier - per-seat billing (EPIC-008 Sprint 4)
  team: {
    maxProjects: 25,
    maxTeamMembers: 50, // Per-seat pricing up to 50 members
    maxSessionsPerMonth: 5000,
    maxContextCacheSize: 5000,
    maxBestPractices: 100,
    features: new Set([
      FeatureFlag.BASIC_CONTEXT,
      FeatureFlag.LOCAL_SESSIONS,
      FeatureFlag.TEAM_COLLABORATION,
      FeatureFlag.REAL_TIME_SYNC,
      FeatureFlag.SESSION_HANDOFF,
      FeatureFlag.GIT_INTEGRATION,
      FeatureFlag.WEBHOOK_PROCESSING,
      FeatureFlag.BEST_PRACTICES_MGMT,
      FeatureFlag.USAGE_ANALYTICS,
      FeatureFlag.TEAM_INSIGHTS,
      FeatureFlag.PRIORITY_SUPPORT
    ]),
    rateLimit: {
      contextQueries: 500,
      sessionCreation: 100,
      gitWebhooks: 250
    }
  },
  enterprise: {
    maxProjects: -1,
    maxTeamMembers: -1,
    maxSessionsPerMonth: -1,
    maxContextCacheSize: 10000,
    maxBestPractices: -1,
    features: new Set(Object.values(FeatureFlag)),
    rateLimit: {
      contextQueries: 1000,
      sessionCreation: 200,
      gitWebhooks: 500
    }
  }
};

/**
 * Manages feature entitlements, usage limits, and rate limiting
 */
export class EntitlementsManager {
  private db: DatabaseManager;
  private redis?: any; // Redis client for rate limiting (optional)

  constructor(db: DatabaseManager, redis?: any) {
    this.db = db;
    this.redis = redis;
  }

  /**
   * Check if user has access to a specific feature
   */
  async checkFeatureAccess(
    user: AuthenticatedUser, 
    feature: FeatureFlag
  ): Promise<boolean> {
    const limits = PLAN_CONFIGURATIONS[user.planTier];
    
    if (!limits.features.has(feature)) {
      throw new FeatureNotAvailableError(feature, user.planTier);
    }
    
    // Additional check for plan status
    if (user.planStatus !== 'active' && user.planStatus !== 'trialing') {
      throw new EntitlementError(
        `Plan status '${user.planStatus}' does not allow feature access`,
        'PLAN_STATUS_INACTIVE'
      );
    }
    
    return true;
  }

  /**
   * Check usage limits for a specific resource
   */
  async checkUsageLimit(
    user: AuthenticatedUser,
    resource: string,
    action: 'create' | 'check' = 'check'
  ): Promise<boolean> {
    const limits = PLAN_CONFIGURATIONS[user.planTier];
    const usage = await this.getCurrentUsage(user.organizationId);
    
    switch (resource) {
      case 'projects':
        if (limits.maxProjects !== -1 && usage.currentPeriod.sessions >= limits.maxProjects) {
          if (action === 'create') {
            throw new UsageLimitExceededError('projects', usage.currentPeriod.sessions, limits.maxProjects);
          }
          return false;
        }
        break;
        
      case 'sessions':
        if (limits.maxSessionsPerMonth !== -1 && usage.currentPeriod.sessions >= limits.maxSessionsPerMonth) {
          if (action === 'create') {
            throw new UsageLimitExceededError('sessions', usage.currentPeriod.sessions, limits.maxSessionsPerMonth);
          }
          return false;
        }
        break;
        
      case 'storage':
        if (limits.maxContextCacheSize !== -1 && usage.currentPeriod.storageUsed >= limits.maxContextCacheSize) {
          if (action === 'create') {
            throw new UsageLimitExceededError('storage', usage.currentPeriod.storageUsed, limits.maxContextCacheSize);
          }
          return false;
        }
        break;
    }
    
    return true;
  }

  /**
   * Check rate limits for real-time operations
   */
  async checkRateLimit(
    user: AuthenticatedUser,
    action: keyof PlanLimits['rateLimit']
  ): Promise<boolean> {
    const limits = PLAN_CONFIGURATIONS[user.planTier];
    const rateLimit = limits.rateLimit[action];
    
    if (!this.redis || rateLimit === 0) {
      // No Redis or unlimited rate
      return rateLimit !== 0;
    }
    
    const key = `rate_limit:${user.organizationId}:${action}:${this.getCurrentMinute()}`;
    const current = await this.redis.incr(key);
    
    if (current === 1) {
      // Set expiration on first increment
      await this.redis.expire(key, 60); // 1 minute
    }
    
    if (current > rateLimit) {
      throw new RateLimitExceededError(action, rateLimit);
    }
    
    return true;
  }

  /**
   * Get current usage metrics for an organization
   */
  async getCurrentUsage(organizationId: string): Promise<UsageMetrics> {
    const currentMonth = this.getCurrentMonth();
    
    // Get usage from database (with graceful fallback)
    let result;
    try {
      result = await this.db.query(`
        SELECT 
          event_type,
          SUM(quantity) as total_quantity
        FROM usage_events 
        WHERE organization_id = $1 
          AND DATE_TRUNC('month', created_at) = $2
        GROUP BY event_type
      `, [organizationId, currentMonth]);
    } catch (error) {
      // Handle missing usage_events table gracefully
      if ((error as any)?.code === '42P01') {
        console.log(`[ENTITLEMENTS] Usage tracking disabled - usage_events table not found`);
        result = { rows: [] };
      } else {
        throw error;
      }
    }
    
    // Calculate storage usage from project contexts
    const storageResult = await this.db.query(`
      SELECT 
        COALESCE(SUM(octet_length(context_data::text)), 0) / (1024 * 1024) as storage_mb
      FROM project_contexts pc
      JOIN projects p ON pc.project_id = p.id
      JOIN teams t ON p.team_id = t.id
      WHERE t.organization_id = $1
    `, [organizationId]);
    
    // Get organization plan
    const orgResult = await this.db.query(`
      SELECT plan_tier FROM organizations WHERE id = $1
    `, [organizationId]);
    
    const planTier = orgResult.rows[0]?.plan_tier as PlanTier || 'free';
    const limits = PLAN_CONFIGURATIONS[planTier];
    
    // Build usage metrics
    const usage: UsageMetrics['currentPeriod'] = {
      sessions: 0,
      contextQueries: 0,
      gitWebhooks: 0,
      storageUsed: parseFloat(storageResult.rows[0]?.storage_mb || '0')
    };
    
    // Aggregate usage by event type
    for (const row of result.rows) {
      const eventType = row.event_type;
      const quantity = parseInt(row.total_quantity);
      
      switch (eventType) {
        case 'session_create':
          usage.sessions += quantity;
          break;
        case 'context_query':
          usage.contextQueries += quantity;
          break;
        case 'git_webhook':
          usage.gitWebhooks += quantity;
          break;
      }
    }
    
    return {
      organizationId,
      currentPeriod: usage,
      limits
    };
  }

  /**
   * Track usage event for billing
   */
  async trackUsage(
    user: AuthenticatedUser,
    eventType: string,
    resourceId?: string,
    quantity: number = 1,
    metadata?: any
  ): Promise<void> {
    await this.db.query(`
      INSERT INTO usage_events (organization_id, user_id, event_type, resource_id, quantity, metadata)
      VALUES ($1, $2, $3, $4, $5, $6)
    `, [
      user.organizationId,
      user.id,
      eventType,
      resourceId,
      quantity,
      metadata ? JSON.stringify(metadata) : null
    ]);
    
    // Update usage summary for efficient queries
    await this.updateUsageSummary(user.organizationId, eventType, quantity);
  }

  /**
   * Update usage summary table for billing efficiency
   */
  private async updateUsageSummary(
    organizationId: string,
    eventType: string,
    quantity: number
  ): Promise<void> {
    const currentDate = new Date();
    const periodStart = new Date(currentDate.getFullYear(), currentDate.getMonth(), 1);
    const periodEnd = new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 0);
    
    await this.db.query(`
      INSERT INTO usage_summaries (organization_id, period_start, period_end, event_type, total_quantity)
      VALUES ($1, $2, $3, $4, $5)
      ON CONFLICT (organization_id, period_start, period_end, event_type)
      DO UPDATE SET
        total_quantity = usage_summaries.total_quantity + EXCLUDED.total_quantity,
        updated_at = NOW()
    `, [organizationId, periodStart, periodEnd, eventType, quantity]);
  }

  /**
   * Create Express middleware for feature checking
   */
  requireFeature(feature: FeatureFlag) {
    return async (req: any, res: any, next: any) => {
      try {
        if (!req.user) {
          return res.status(401).json({
            error: 'Authentication required',
            code: 'NOT_AUTHENTICATED'
          });
        }

        await this.checkFeatureAccess(req.user, feature);
        next();
      } catch (error) {
        if (error instanceof FeatureNotAvailableError) {
          return res.status(403).json({
            error: error.message,
            code: error.code,
            feature: error.feature,
            upgradeUrl: this.getUpgradeUrl(req.user.planTier)
          });
        }
        
        console.error('[ENTITLEMENTS] Feature check error:', error);
        return res.status(500).json({
          error: 'Internal entitlements error',
          code: 'ENTITLEMENTS_INTERNAL_ERROR'
        });
      }
    };
  }

  /**
   * Create Express middleware for rate limiting
   */
  rateLimit(action: keyof PlanLimits['rateLimit']) {
    return async (req: any, res: any, next: any) => {
      try {
        if (!req.user) {
          return res.status(401).json({
            error: 'Authentication required',
            code: 'NOT_AUTHENTICATED'
          });
        }

        await this.checkRateLimit(req.user, action);
        next();
      } catch (error) {
        if (error instanceof RateLimitExceededError) {
          return res.status(429).json({
            error: error.message,
            code: error.code,
            retryAfter: 60, // seconds
            limit: error.limit
          });
        }
        
        console.error('[ENTITLEMENTS] Rate limit error:', error);
        return res.status(500).json({
          error: 'Internal rate limiting error',
          code: 'RATE_LIMIT_INTERNAL_ERROR'
        });
      }
    };
  }

  /**
   * Get upgrade URL for a plan tier
   */
  private getUpgradeUrl(currentTier: PlanTier): string {
    const baseUrl = process.env.FRONTEND_URL || 'https://contextmcp.com';
    return `${baseUrl}/billing/upgrade?from=${currentTier}`;
  }

  /**
   * Get current month for usage tracking
   */
  private getCurrentMonth(): string {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-01`;
  }

  /**
   * Get current minute for rate limiting
   */
  private getCurrentMinute(): string {
    const now = new Date();
    return `${now.getFullYear()}-${now.getMonth()}-${now.getDate()}-${now.getHours()}-${now.getMinutes()}`;
  }

  /**
   * Check if organization can add more team members
   */
  async canAddTeamMember(organizationId: string): Promise<boolean> {
    const orgResult = await this.db.query(`
      SELECT plan_tier FROM organizations WHERE id = $1
    `, [organizationId]);
    
    const planTier = orgResult.rows[0]?.plan_tier as PlanTier || 'free';
    const limits = PLAN_CONFIGURATIONS[planTier];
    
    if (limits.maxTeamMembers === -1) return true;
    
    const memberCount = await this.db.query(`
      SELECT COUNT(*) as count
      FROM users 
      WHERE organization_id = $1 AND is_active = true
    `, [organizationId]);
    
    const currentMembers = parseInt(memberCount.rows[0]?.count || '0');
    return currentMembers < limits.maxTeamMembers;
  }

  /**
   * Get feature availability for a plan tier
   */
  static getFeatureAvailability(planTier: PlanTier): Record<string, boolean> {
    const limits = PLAN_CONFIGURATIONS[planTier];
    const availability: Record<string, boolean> = {};
    
    for (const feature of Object.values(FeatureFlag)) {
      availability[feature] = limits.features.has(feature);
    }
    
    return availability;
  }
}

export default EntitlementsManager;