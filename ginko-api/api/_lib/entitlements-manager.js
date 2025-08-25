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
export var FeatureFlag;
(function (FeatureFlag) {
    // Core Features
    FeatureFlag["BASIC_CONTEXT"] = "basic_context";
    FeatureFlag["LOCAL_SESSIONS"] = "local_sessions";
    // Collaboration Features  
    FeatureFlag["TEAM_COLLABORATION"] = "team_collaboration";
    FeatureFlag["REAL_TIME_SYNC"] = "real_time_sync";
    FeatureFlag["SESSION_HANDOFF"] = "session_handoff";
    // Integration Features
    FeatureFlag["GIT_INTEGRATION"] = "git_integration";
    FeatureFlag["WEBHOOK_PROCESSING"] = "webhook_processing";
    FeatureFlag["BEST_PRACTICES_MGMT"] = "best_practices_mgmt";
    // Analytics Features
    FeatureFlag["USAGE_ANALYTICS"] = "usage_analytics";
    FeatureFlag["TEAM_INSIGHTS"] = "team_insights";
    FeatureFlag["PERFORMANCE_METRICS"] = "performance_metrics";
    // Enterprise Features
    FeatureFlag["SSO_INTEGRATION"] = "sso_integration";
    FeatureFlag["CUSTOM_INTEGRATIONS"] = "custom_integrations";
    FeatureFlag["PRIORITY_SUPPORT"] = "priority_support";
    FeatureFlag["WHITE_LABEL"] = "white_label";
})(FeatureFlag || (FeatureFlag = {}));
export class EntitlementError extends Error {
    code;
    feature;
    limit;
    current;
    constructor(message, code = 'ENTITLEMENT_ERROR', feature, limit, current) {
        super(message);
        this.code = code;
        this.feature = feature;
        this.limit = limit;
        this.current = current;
        this.name = 'EntitlementError';
    }
}
export class UsageLimitExceededError extends EntitlementError {
    constructor(resource, current, limit) {
        super(`Usage limit exceeded for ${resource}: ${current}/${limit}`, 'USAGE_LIMIT_EXCEEDED', resource, limit, current);
    }
}
export class FeatureNotAvailableError extends EntitlementError {
    constructor(feature, planTier) {
        super(`Feature '${feature}' not available on ${planTier} plan`, 'FEATURE_NOT_AVAILABLE', feature);
    }
}
export class RateLimitExceededError extends EntitlementError {
    constructor(action, limit) {
        super(`Rate limit exceeded for ${action}: ${limit} requests per minute`, 'RATE_LIMIT_EXCEEDED', action, limit);
    }
}
/**
 * Plan configurations with limits and features
 */
export const PLAN_CONFIGURATIONS = {
    free: {
        maxProjects: 1,
        maxTeamMembers: 1,
        maxSessionsPerMonth: 50,
        maxContextCacheSize: 100,
        maxBestPractices: 10,
        features: new Set([
            FeatureFlag.BASIC_CONTEXT,
            FeatureFlag.LOCAL_SESSIONS,
            FeatureFlag.SESSION_HANDOFF // Core MCP functionality - included in free tier
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
    db;
    redis; // Redis client for rate limiting (optional)
    constructor(db, redis) {
        this.db = db;
        this.redis = redis;
    }
    /**
     * Check if user has access to a specific feature
     */
    async checkFeatureAccess(user, feature) {
        const limits = PLAN_CONFIGURATIONS[user.planTier];
        if (!limits.features.has(feature)) {
            throw new FeatureNotAvailableError(feature, user.planTier);
        }
        // Additional check for plan status
        if (user.planStatus !== 'active' && user.planStatus !== 'trialing') {
            throw new EntitlementError(`Plan status '${user.planStatus}' does not allow feature access`, 'PLAN_STATUS_INACTIVE');
        }
        return true;
    }
    /**
     * Check usage limits for a specific resource
     */
    async checkUsageLimit(user, resource, action = 'check') {
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
    async checkRateLimit(user, action) {
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
    async getCurrentUsage(organizationId) {
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
        }
        catch (error) {
            // Handle missing usage_events table gracefully
            if (error?.code === '42P01') {
                console.log(`[ENTITLEMENTS] Usage tracking disabled - usage_events table not found`);
                result = { rows: [] };
            }
            else {
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
        const planTier = orgResult.rows[0]?.plan_tier || 'free';
        const limits = PLAN_CONFIGURATIONS[planTier];
        // Build usage metrics
        const usage = {
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
    async trackUsage(user, eventType, resourceId, quantity = 1, metadata) {
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
    async updateUsageSummary(organizationId, eventType, quantity) {
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
    requireFeature(feature) {
        return async (req, res, next) => {
            try {
                if (!req.user) {
                    return res.status(401).json({
                        error: 'Authentication required',
                        code: 'NOT_AUTHENTICATED'
                    });
                }
                await this.checkFeatureAccess(req.user, feature);
                next();
            }
            catch (error) {
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
    rateLimit(action) {
        return async (req, res, next) => {
            try {
                if (!req.user) {
                    return res.status(401).json({
                        error: 'Authentication required',
                        code: 'NOT_AUTHENTICATED'
                    });
                }
                await this.checkRateLimit(req.user, action);
                next();
            }
            catch (error) {
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
    getUpgradeUrl(currentTier) {
        const baseUrl = process.env.FRONTEND_URL || 'https://contextmcp.com';
        return `${baseUrl}/billing/upgrade?from=${currentTier}`;
    }
    /**
     * Get current month for usage tracking
     */
    getCurrentMonth() {
        const now = new Date();
        return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-01`;
    }
    /**
     * Get current minute for rate limiting
     */
    getCurrentMinute() {
        const now = new Date();
        return `${now.getFullYear()}-${now.getMonth()}-${now.getDate()}-${now.getHours()}-${now.getMinutes()}`;
    }
    /**
     * Check if organization can add more team members
     */
    async canAddTeamMember(organizationId) {
        const orgResult = await this.db.query(`
      SELECT plan_tier FROM organizations WHERE id = $1
    `, [organizationId]);
        const planTier = orgResult.rows[0]?.plan_tier || 'free';
        const limits = PLAN_CONFIGURATIONS[planTier];
        if (limits.maxTeamMembers === -1)
            return true;
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
    static getFeatureAvailability(planTier) {
        const limits = PLAN_CONFIGURATIONS[planTier];
        const availability = {};
        for (const feature of Object.values(FeatureFlag)) {
            availability[feature] = limits.features.has(feature);
        }
        return availability;
    }
}
export default EntitlementsManager;
//# sourceMappingURL=entitlements-manager.js.map