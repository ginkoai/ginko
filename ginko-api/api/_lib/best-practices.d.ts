#!/usr/bin/env node
/**
 * @fileType: service
 * @status: current
 * @updated: 2025-08-01
 * @tags: [best-practices, context-server, team-standards, mcp, collaboration]
 * @related: [context-manager.ts, serverless-api, session-handoff.ts]
 * @priority: critical
 * @complexity: medium
 * @dependencies: [none]
 */
export interface BestPractice {
    id: string;
    category: string;
    title: string;
    description: string;
    rationale: string;
    examples?: {
        good?: string[];
        bad?: string[];
    };
    priority: 'critical' | 'high' | 'medium' | 'low';
    tags: string[];
}
export interface TeamBestPractices {
    teamId: string;
    practices: BestPractice[];
    customPractices?: BestPractice[];
    disabledPracticeIds?: string[];
    createdAt: Date;
    updatedAt: Date;
}
export declare class BestPracticesManager {
    private static defaultPractices;
    /**
     * Get default best practices, optionally filtered by category or tags
     */
    static getDefaultPractices(filters?: {
        categories?: string[];
        tags?: string[];
        priority?: string[];
    }): BestPractice[];
    /**
     * Get all unique categories from default practices
     */
    static getCategories(): string[];
    /**
     * Get all unique tags from default practices
     */
    static getTags(): string[];
    /**
     * Format practices for context inclusion
     */
    static formatPracticesForContext(practices: BestPractice[]): string;
    /**
     * Merge team custom practices with defaults
     */
    static mergeWithDefaults(customPractices?: BestPractice[], disabledIds?: string[]): BestPractice[];
}
export default BestPracticesManager;
//# sourceMappingURL=best-practices.d.ts.map