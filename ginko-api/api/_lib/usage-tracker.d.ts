#!/usr/bin/env node
/**
 * @fileType: service
 * @status: new
 * @updated: 2025-08-01
 * @tags: [usage-tracking, billing, analytics, metrics, redis]
 * @related: [entitlements-manager.ts, database.ts, auth-manager.ts]
 * @priority: critical
 * @complexity: medium
 * @dependencies: [redis]
 */
import { DatabaseManager } from './database.js';
import { AuthenticatedUser } from './auth-manager.js';
export interface UsageEvent {
    id?: string;
    organizationId: string;
    userId?: string;
    eventType: UsageEventType;
    resourceId?: string;
    quantity: number;
    metadata?: Record<string, any>;
    timestamp: Date;
}
export declare enum UsageEventType {
    SESSION_CREATE = "session_create",
    SESSION_RESUME = "session_resume",
    CONTEXT_QUERY = "context_query",
    PROJECT_CREATE = "project_create",
    TEAM_MEMBER_ADD = "team_member_add",
    GIT_WEBHOOK = "git_webhook",
    GIT_COMMIT_PROCESSED = "git_commit_processed",
    CONTEXT_CACHE_STORE = "context_cache_store",
    CONTEXT_CACHE_RETRIEVE = "context_cache_retrieve",
    BEST_PRACTICE_QUERY = "best_practice_query",
    TEAM_INSIGHTS_GENERATE = "team_insights_generate",
    SESSION_HANDOFF = "session_handoff",
    REAL_TIME_SYNC = "real_time_sync",
    CUSTOM_INTEGRATION = "custom_integration",
    API_REQUEST = "api_request",
    MCP_TOOL_CALL = "mcp_tool_call"
}
export interface UsageSummary {
    organizationId: string;
    period: {
        start: Date;
        end: Date;
        type: 'day' | 'month' | 'year';
    };
    events: Record<UsageEventType, number>;
    totalEvents: number;
    storageUsed: number;
    bandwidth: number;
}
export interface UsageQuota {
    eventType: UsageEventType;
    limit: number;
    period: 'minute' | 'hour' | 'day' | 'month';
    current: number;
    resetTime: Date;
}
/**
 * Tracks usage events for billing, analytics, and rate limiting
 * Provides high-performance event recording with Redis caching
 */
export declare class UsageTracker {
    private db;
    private redis?;
    private batchSize;
    private flushInterval;
    private eventQueue;
    private flushTimer?;
    constructor(db: DatabaseManager, redis?: any);
    /**
     * Track a usage event - high performance with batching
     */
    track(organizationId: string, eventType: UsageEventType, options?: {
        userId?: string;
        resourceId?: string;
        quantity?: number;
        metadata?: Record<string, any>;
    }): Promise<void>;
    /**
     * Track usage for authenticated user (convenience method)
     */
    trackForUser(user: AuthenticatedUser, eventType: UsageEventType, options?: {
        resourceId?: string;
        quantity?: number;
        metadata?: Record<string, any>;
    }): Promise<void>;
    /**
     * Get current usage for an organization
     */
    getUsage(organizationId: string, period?: 'hour' | 'day' | 'month', eventType?: UsageEventType): Promise<number>;
    /**
     * Get detailed usage summary
     */
    getUsageSummary(organizationId: string, periodType?: 'day' | 'month' | 'year', startDate?: Date): Promise<UsageSummary>;
    /**
     * Get usage quotas for rate limiting
     */
    getQuotas(organizationId: string, eventTypes: UsageEventType[]): Promise<UsageQuota[]>;
    /**
     * Check if usage is within limits
     */
    checkLimit(organizationId: string, eventType: UsageEventType, period: 'minute' | 'hour' | 'day' | 'month', quantity?: number): Promise<boolean>;
    /**
     * Update Redis counters for real-time tracking
     */
    private updateRedisCounters;
    /**
     * Get usage from Redis (fast)
     */
    private getUsageFromRedis;
    /**
     * Get usage from database (slower, more accurate)
     */
    private getUsageFromDatabase;
    /**
     * Flush events to database in batch
     */
    private flushEvents;
    /**
     * Start batch processor
     */
    private startBatchProcessor;
    /**
     * Stop batch processor and flush remaining events
     */
    stop(): Promise<void>;
    private getMinuteKey;
    private getHourKey;
    private getDayKey;
    private getMonthKey;
    private getKeyTTL;
    private getRateLimit;
    private calculatePeriod;
    private getNextReset;
}
export default UsageTracker;
//# sourceMappingURL=usage-tracker.d.ts.map