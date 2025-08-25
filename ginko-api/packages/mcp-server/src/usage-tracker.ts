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

export enum UsageEventType {
  // Core events for billing
  SESSION_CREATE = 'session_create',
  SESSION_RESUME = 'session_resume',
  CONTEXT_QUERY = 'context_query',
  PROJECT_CREATE = 'project_create',
  TEAM_MEMBER_ADD = 'team_member_add',
  
  // Integration events
  GIT_WEBHOOK = 'git_webhook',
  GIT_COMMIT_PROCESSED = 'git_commit_processed',
  
  // Storage events
  CONTEXT_CACHE_STORE = 'context_cache_store',
  CONTEXT_CACHE_RETRIEVE = 'context_cache_retrieve',
  
  // Analytics events
  BEST_PRACTICE_QUERY = 'best_practice_query',
  TEAM_INSIGHTS_GENERATE = 'team_insights_generate',
  
  // Premium feature events
  SESSION_HANDOFF = 'session_handoff',
  REAL_TIME_SYNC = 'real_time_sync',
  CUSTOM_INTEGRATION = 'custom_integration',
  
  // API usage
  API_REQUEST = 'api_request',
  MCP_TOOL_CALL = 'mcp_tool_call'
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
  storageUsed: number; // MB
  bandwidth: number;   // MB
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
export class UsageTracker {
  private db: DatabaseManager;
  private redis?: any;
  private batchSize: number = 100;
  private flushInterval: number = 30000; // 30 seconds
  private eventQueue: UsageEvent[] = [];
  private flushTimer?: NodeJS.Timeout;

  constructor(db: DatabaseManager, redis?: any) {
    this.db = db;
    this.redis = redis;
    
    // Start batch processing
    this.startBatchProcessor();
  }

  /**
   * Track a usage event - high performance with batching
   */
  async track(
    organizationId: string,
    eventType: UsageEventType,
    options: {
      userId?: string;
      resourceId?: string;
      quantity?: number;
      metadata?: Record<string, any>;
    } = {}
  ): Promise<void> {
    const event: UsageEvent = {
      organizationId,
      userId: options.userId,
      eventType,
      resourceId: options.resourceId,
      quantity: options.quantity || 1,
      metadata: options.metadata,
      timestamp: new Date()
    };

    // Add to batch queue
    this.eventQueue.push(event);

    // Update Redis counters immediately for rate limiting
    if (this.redis) {
      await this.updateRedisCounters(event);
    }

    // Force flush if batch is full
    if (this.eventQueue.length >= this.batchSize) {
      await this.flushEvents();
    }
  }

  /**
   * Track usage for authenticated user (convenience method)
   */
  async trackForUser(
    user: AuthenticatedUser,
    eventType: UsageEventType,
    options: {
      resourceId?: string;
      quantity?: number;
      metadata?: Record<string, any>;
    } = {}
  ): Promise<void> {
    await this.track(user.organizationId, eventType, {
      ...options,
      userId: user.id
    });
  }

  /**
   * Get current usage for an organization
   */
  async getUsage(
    organizationId: string,
    period: 'hour' | 'day' | 'month' = 'month',
    eventType?: UsageEventType
  ): Promise<number> {
    if (this.redis) {
      return await this.getUsageFromRedis(organizationId, period, eventType);
    }
    
    return await this.getUsageFromDatabase(organizationId, period, eventType);
  }

  /**
   * Get detailed usage summary
   */
  async getUsageSummary(
    organizationId: string,
    periodType: 'day' | 'month' | 'year' = 'month',
    startDate?: Date
  ): Promise<UsageSummary> {
    const period = this.calculatePeriod(periodType, startDate);
    
    // Get event counts from database
    const eventResult = await this.db.query(`
      SELECT event_type, SUM(quantity) as total
      FROM usage_events
      WHERE organization_id = $1 
        AND created_at >= $2 
        AND created_at < $3
      GROUP BY event_type
    `, [organizationId, period.start, period.end]);

    // Get storage usage
    const storageResult = await this.db.query(`
      SELECT COALESCE(SUM(octet_length(context_data::text)), 0) / (1024 * 1024) as storage_mb
      FROM project_contexts pc
      JOIN projects p ON pc.project_id = p.id
      JOIN teams t ON p.team_id = t.id
      WHERE t.organization_id = $1
    `, [organizationId]);

    // Build summary
    const events: Record<UsageEventType, number> = {} as any;
    let totalEvents = 0;

    for (const eventType of Object.values(UsageEventType)) {
      events[eventType] = 0;
    }

    for (const row of eventResult.rows) {
      const eventType = row.event_type as UsageEventType;
      const count = parseInt(row.total);
      events[eventType] = count;
      totalEvents += count;
    }

    return {
      organizationId,
      period: {
        start: period.start,
        end: period.end,
        type: periodType
      },
      events,
      totalEvents,
      storageUsed: parseFloat(storageResult.rows[0]?.storage_mb || '0'),
      bandwidth: 0 // TODO: Implement bandwidth tracking
    };
  }

  /**
   * Get usage quotas for rate limiting
   */
  async getQuotas(
    organizationId: string,
    eventTypes: UsageEventType[]
  ): Promise<UsageQuota[]> {
    const quotas: UsageQuota[] = [];
    
    for (const eventType of eventTypes) {
      const minuteUsage = await this.getUsage(organizationId, 'hour', eventType);
      const dayUsage = await this.getUsage(organizationId, 'day', eventType);
      const monthUsage = await this.getUsage(organizationId, 'month', eventType);
      
      // Add minute quota (primary for rate limiting)
      quotas.push({
        eventType,
        limit: this.getRateLimit(eventType, 'minute'),
        period: 'minute',
        current: minuteUsage,
        resetTime: this.getNextReset('minute')
      });
      
      // Add daily quota
      quotas.push({
        eventType,
        limit: this.getRateLimit(eventType, 'day'),
        period: 'day',
        current: dayUsage,
        resetTime: this.getNextReset('day')
      });
      
      // Add monthly quota
      quotas.push({
        eventType,
        limit: this.getRateLimit(eventType, 'month'),
        period: 'month',
        current: monthUsage,
        resetTime: this.getNextReset('month')
      });
    }
    
    return quotas;
  }

  /**
   * Check if usage is within limits
   */
  async checkLimit(
    organizationId: string,
    eventType: UsageEventType,
    period: 'minute' | 'hour' | 'day' | 'month',
    quantity: number = 1
  ): Promise<boolean> {
    // For minute-level checks, use hour instead since getUsage doesn't support minutes
    const usagePeriod = period === 'minute' ? 'hour' as const : period as 'hour' | 'day' | 'month';
    const current = await this.getUsage(organizationId, usagePeriod, eventType);
    const limit = this.getRateLimit(eventType, period);
    
    return (current + quantity) <= limit;
  }

  /**
   * Update Redis counters for real-time tracking
   */
  private async updateRedisCounters(event: UsageEvent): Promise<void> {
    if (!this.redis) return;

    const now = new Date();
    const keys = [
      `usage:${event.organizationId}:${event.eventType}:minute:${this.getMinuteKey(now)}`,
      `usage:${event.organizationId}:${event.eventType}:hour:${this.getHourKey(now)}`,
      `usage:${event.organizationId}:${event.eventType}:day:${this.getDayKey(now)}`,
      `usage:${event.organizationId}:${event.eventType}:month:${this.getMonthKey(now)}`
    ];

    const pipeline = this.redis.pipeline();
    for (const key of keys) {
      pipeline.incrby(key, event.quantity);
      pipeline.expire(key, this.getKeyTTL(key));
    }
    
    await pipeline.exec();
  }

  /**
   * Get usage from Redis (fast)
   */
  private async getUsageFromRedis(
    organizationId: string,
    period: 'hour' | 'day' | 'month',
    eventType?: UsageEventType
  ): Promise<number> {
    if (!this.redis) return 0;

    const now = new Date();
    let pattern: string;

    switch (period) {
      case 'hour':
        pattern = `usage:${organizationId}:${eventType || '*'}:hour:${this.getHourKey(now)}`;
        break;
      case 'day':
        pattern = `usage:${organizationId}:${eventType || '*'}:day:${this.getDayKey(now)}`;
        break;
      case 'month':
        pattern = `usage:${organizationId}:${eventType || '*'}:month:${this.getMonthKey(now)}`;
        break;
    }

    if (eventType) {
      // Single event type
      const value = await this.redis.get(pattern);
      return parseInt(value || '0');
    } else {
      // All event types
      const keys = await this.redis.keys(pattern);
      if (keys.length === 0) return 0;
      
      const values = await this.redis.mget(keys);
      return values.reduce((sum: number, val: string) => sum + parseInt(val || '0'), 0);
    }
  }

  /**
   * Get usage from database (slower, more accurate)
   */
  private async getUsageFromDatabase(
    organizationId: string,
    period: 'hour' | 'day' | 'month',
    eventType?: UsageEventType
  ): Promise<number> {
    const now = new Date();
    let startTime: Date;

    switch (period) {
      case 'hour':
        startTime = new Date(now.getFullYear(), now.getMonth(), now.getDate(), now.getHours());
        break;
      case 'day':
        startTime = new Date(now.getFullYear(), now.getMonth(), now.getDate());
        break;
      case 'month':
        startTime = new Date(now.getFullYear(), now.getMonth(), 1);
        break;
    }

    let query = `
      SELECT COALESCE(SUM(quantity), 0) as total
      FROM usage_events
      WHERE organization_id = $1 AND created_at >= $2
    `;
    const params: any[] = [organizationId, startTime];

    if (eventType) {
      query += ` AND event_type = $3`;
      params.push(eventType);
    }

    const result = await this.db.query(query, params);
    return parseInt(result.rows[0]?.total || '0');
  }

  /**
   * Flush events to database in batch
   */
  private async flushEvents(): Promise<void> {
    if (this.eventQueue.length === 0) return;

    const events = this.eventQueue.splice(0, this.batchSize);
    
    try {
      // Batch insert to database
      const values = events.map((event, index) => {
        const baseIndex = index * 6;
        return `($${baseIndex + 1}, $${baseIndex + 2}, $${baseIndex + 3}, $${baseIndex + 4}, $${baseIndex + 5}, $${baseIndex + 6})`;
      }).join(', ');

      const params = events.flatMap(event => [
        event.organizationId,
        event.userId,
        event.eventType,
        event.resourceId,
        event.quantity,
        event.metadata ? JSON.stringify(event.metadata) : null
      ]);

      await this.db.query(`
        INSERT INTO usage_events (organization_id, user_id, event_type, resource_id, quantity, metadata)
        VALUES ${values}
      `, params);

      console.log(`[USAGE] Flushed ${events.length} usage events to database`);
    } catch (error) {
      // Gracefully handle database unavailability (expected in development)
      const errorMsg = error instanceof Error ? error.message : String(error);
      const errorCode = (error as any)?.code;
      
      if (errorMsg?.includes('relation "usage_events" does not exist') || 
          errorMsg?.includes('database') || 
          errorCode === '42P01') {
        // Database table missing or connection failed - silently drop events in dev mode
        console.log(`[USAGE] Database unavailable - usage tracking disabled (${events.length} events dropped)`);
      } else {
        console.error('[USAGE] Failed to flush events:', error);
        // Re-queue events on unexpected failures
        this.eventQueue.unshift(...events);
      }
    }
  }

  /**
   * Start batch processor
   */
  private startBatchProcessor(): void {
    this.flushTimer = setInterval(async () => {
      await this.flushEvents();
    }, this.flushInterval);
  }

  /**
   * Stop batch processor and flush remaining events
   */
  async stop(): Promise<void> {
    if (this.flushTimer) {
      clearInterval(this.flushTimer);
    }
    
    // Flush any remaining events
    while (this.eventQueue.length > 0) {
      await this.flushEvents();
    }
  }

  // Helper methods for Redis key generation
  private getMinuteKey(date: Date): string {
    return `${date.getFullYear()}-${date.getMonth()}-${date.getDate()}-${date.getHours()}-${date.getMinutes()}`;
  }

  private getHourKey(date: Date): string {
    return `${date.getFullYear()}-${date.getMonth()}-${date.getDate()}-${date.getHours()}`;
  }

  private getDayKey(date: Date): string {
    return `${date.getFullYear()}-${date.getMonth()}-${date.getDate()}`;
  }

  private getMonthKey(date: Date): string {
    return `${date.getFullYear()}-${date.getMonth()}`;
  }

  private getKeyTTL(key: string): number {
    if (key.includes(':minute:')) return 3600;    // 1 hour
    if (key.includes(':hour:')) return 86400;     // 1 day  
    if (key.includes(':day:')) return 2592000;    // 30 days
    if (key.includes(':month:')) return 7776000;  // 90 days
    return 3600;
  }

  private getRateLimit(eventType: UsageEventType, period: string): number {
    // Default rate limits - should be configurable per plan
    const limits: Record<string, Record<string, number>> = {
      [UsageEventType.CONTEXT_QUERY]: { minute: 30, hour: 500, day: 2000, month: 10000 },
      [UsageEventType.SESSION_CREATE]: { minute: 5, hour: 50, day: 200, month: 1000 },
      [UsageEventType.GIT_WEBHOOK]: { minute: 10, hour: 100, day: 1000, month: 5000 },
      [UsageEventType.API_REQUEST]: { minute: 100, hour: 1000, day: 10000, month: 100000 }
    };

    return limits[eventType]?.[period] || 1000;
  }

  private calculatePeriod(type: 'day' | 'month' | 'year', startDate?: Date) {
    const now = startDate || new Date();
    let start: Date, end: Date;

    switch (type) {
      case 'day':
        start = new Date(now.getFullYear(), now.getMonth(), now.getDate());
        end = new Date(start.getTime() + 24 * 60 * 60 * 1000);
        break;
      case 'month':
        start = new Date(now.getFullYear(), now.getMonth(), 1);
        end = new Date(now.getFullYear(), now.getMonth() + 1, 1);
        break;
      case 'year':
        start = new Date(now.getFullYear(), 0, 1);
        end = new Date(now.getFullYear() + 1, 0, 1);
        break;
    }

    return { start, end };
  }

  private getNextReset(period: 'minute' | 'day' | 'month'): Date {
    const now = new Date();
    
    switch (period) {
      case 'minute':
        return new Date(now.getFullYear(), now.getMonth(), now.getDate(), now.getHours(), now.getMinutes() + 1);
      case 'day':
        return new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1);
      case 'month':
        return new Date(now.getFullYear(), now.getMonth() + 1, 1);
    }
  }
}

export default UsageTracker;