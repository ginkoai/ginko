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
export declare enum FeatureFlag {
    BASIC_CONTEXT = "basic_context",
    LOCAL_SESSIONS = "local_sessions",
    TEAM_COLLABORATION = "team_collaboration",
    REAL_TIME_SYNC = "real_time_sync",
    SESSION_HANDOFF = "session_handoff",
    GIT_INTEGRATION = "git_integration",
    WEBHOOK_PROCESSING = "webhook_processing",
    BEST_PRACTICES_MGMT = "best_practices_mgmt",
    USAGE_ANALYTICS = "usage_analytics",
    TEAM_INSIGHTS = "team_insights",
    PERFORMANCE_METRICS = "performance_metrics",
    SSO_INTEGRATION = "sso_integration",
    CUSTOM_INTEGRATIONS = "custom_integrations",
    PRIORITY_SUPPORT = "priority_support",
    WHITE_LABEL = "white_label"
}
export interface PlanLimits {
    maxProjects: number;
    maxTeamMembers: number;
    maxSessionsPerMonth: number;
    maxContextCacheSize: number;
    maxBestPractices: number;
    features: Set<FeatureFlag>;
    rateLimit: {
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
        storageUsed: number;
    };
    limits: PlanLimits;
}
export declare class EntitlementError extends Error {
    code: string;
    feature?: string | undefined;
    limit?: number | undefined;
    current?: number | undefined;
    constructor(message: string, code?: string, feature?: string | undefined, limit?: number | undefined, current?: number | undefined);
}
export declare class UsageLimitExceededError extends EntitlementError {
    constructor(resource: string, current: number, limit: number);
}
export declare class FeatureNotAvailableError extends EntitlementError {
    constructor(feature: string, planTier: string);
}
export declare class RateLimitExceededError extends EntitlementError {
    constructor(action: string, limit: number);
}
/**
 * Plan configurations with limits and features
 */
export declare const PLAN_CONFIGURATIONS: Record<PlanTier, PlanLimits>;
/**
 * Manages feature entitlements, usage limits, and rate limiting
 */
export declare class EntitlementsManager {
    private db;
    private redis?;
    constructor(db: DatabaseManager, redis?: any);
    /**
     * Check if user has access to a specific feature
     */
    checkFeatureAccess(user: AuthenticatedUser, feature: FeatureFlag): Promise<boolean>;
    /**
     * Check usage limits for a specific resource
     */
    checkUsageLimit(user: AuthenticatedUser, resource: string, action?: 'create' | 'check'): Promise<boolean>;
    /**
     * Check rate limits for real-time operations
     */
    checkRateLimit(user: AuthenticatedUser, action: keyof PlanLimits['rateLimit']): Promise<boolean>;
    /**
     * Get current usage metrics for an organization
     */
    getCurrentUsage(organizationId: string): Promise<UsageMetrics>;
    /**
     * Track usage event for billing
     */
    trackUsage(user: AuthenticatedUser, eventType: string, resourceId?: string, quantity?: number, metadata?: any): Promise<void>;
    /**
     * Update usage summary table for billing efficiency
     */
    private updateUsageSummary;
    /**
     * Create Express middleware for feature checking
     */
    requireFeature(feature: FeatureFlag): (req: any, res: any, next: any) => Promise<any>;
    /**
     * Create Express middleware for rate limiting
     */
    rateLimit(action: keyof PlanLimits['rateLimit']): (req: any, res: any, next: any) => Promise<any>;
    /**
     * Get upgrade URL for a plan tier
     */
    private getUpgradeUrl;
    /**
     * Get current month for usage tracking
     */
    private getCurrentMonth;
    /**
     * Get current minute for rate limiting
     */
    private getCurrentMinute;
    /**
     * Check if organization can add more team members
     */
    canAddTeamMember(organizationId: string): Promise<boolean>;
    /**
     * Get feature availability for a plan tier
     */
    static getFeatureAvailability(planTier: PlanTier): Record<string, boolean>;
}
export default EntitlementsManager;
//# sourceMappingURL=entitlements-manager.d.ts.map