#!/usr/bin/env node
/**
 * @fileType: service
 * @status: current
 * @updated: 2025-01-31
 * @tags: [mcp, database, postgresql, persistence, cache, abstraction]
 * @related: [serverless-api, session-handoff.ts, best-practices.ts, git-integration.ts]
 * @priority: critical
 * @complexity: high
 * @dependencies: [pg]
 */
import { QueryResult, QueryResultRow } from 'pg';
import { GitEvent } from './git-integration.js';
import { BestPractice } from './best-practices.js';
import { SessionContext } from './session-handoff.js';
export interface DatabaseConfig {
    host: string;
    port: number;
    database: string;
    username: string;
    password: string;
    ssl?: boolean;
}
export interface Team {
    id: string;
    organizationId: string;
    name: string;
    slug: string;
    settings: Record<string, any>;
    createdAt: Date;
    updatedAt: Date;
}
export interface Project {
    id: string;
    teamId: string;
    name: string;
    slug: string;
    repositoryUrl?: string;
    repositoryProvider?: string;
    webhookSecret?: string;
    settings: Record<string, any>;
    isActive: boolean;
    createdAt: Date;
    updatedAt: Date;
}
export interface ProjectContext {
    id: string;
    projectId: string;
    contextType: string;
    contextKey: string;
    contextData: any;
    metadata: Record<string, any>;
    createdAt: Date;
    updatedAt: Date;
    expiresAt?: Date;
}
export interface TeamActivity {
    id: string;
    teamId: string;
    projectId: string;
    userId?: string;
    activityType: string;
    activityData: any;
    durationMs?: number;
    createdAt: Date;
}
export declare class DatabaseManager {
    private pool;
    private isConnected;
    private static readonly DEFAULT_TEAM_UUID;
    constructor(config: DatabaseConfig);
    /**
     * Initialize database connection and test connectivity
     */
    connect(): Promise<void>;
    /**
     * Close all database connections
     */
    disconnect(): Promise<void>;
    /**
     * Execute a query with error handling
     */
    query<T extends QueryResultRow = any>(text: string, params?: any[]): Promise<QueryResult<T>>;
    /**
     * Convert team ID to proper UUID format
     * Handles "default-team" and other string IDs by converting to UUID
     */
    private normalizeTeamId;
    /**
     * Convert project ID to proper UUID format
     * Handles "default-project" and other string IDs by converting to UUID
     */
    private normalizeProjectId;
    /**
     * Generic UUID normalization function
     * Converts string IDs to proper UUID format for PostgreSQL compatibility
     */
    private normalizeToUUID;
    getTeamBySlug(organizationSlug: string, teamSlug: string): Promise<Team | null>;
    createTeam(organizationId: string, name: string, slug: string, settings?: Record<string, any>): Promise<Team>;
    getProjectBySlug(teamId: string, projectSlug: string): Promise<Project | null>;
    createProject(teamId: string, name: string, slug: string, repositoryUrl?: string, repositoryProvider?: string, settings?: Record<string, any>): Promise<Project>;
    getProjectContext(projectId: string, contextType: string, contextKey: string): Promise<ProjectContext | null>;
    saveProjectContext(projectId: string, contextType: string, contextKey: string, contextData: any, metadata?: Record<string, any>, expiresAt?: Date): Promise<ProjectContext>;
    deleteExpiredContexts(): Promise<number>;
    saveGitEvent(projectId: string, gitEvent: GitEvent, webhookPayload?: any): Promise<void>;
    getRecentGitEvents(projectId: string, days?: number): Promise<GitEvent[]>;
    trackActivity(teamId: string, projectId: string, userId: string | undefined, activityType: string, activityData: any, durationMs?: number): Promise<void>;
    getTeamActivity(teamId: string, projectId: string, hours?: number): Promise<TeamActivity[]>;
    getProjectStats(projectId: string): Promise<{
        totalQueries: number;
        activeUsers: number;
        avgResponseTime: number;
        recentCommits: number;
    }>;
    getTeamBestPractices(teamId: string): Promise<BestPractice[]>;
    saveTeamBestPractice(teamId: string, practice: BestPractice, isCustom?: boolean): Promise<void>;
    initializeTeamBestPractices(teamId: string, defaultPractices: BestPractice[]): Promise<void>;
    disableTeamBestPractice(teamId: string, practiceId: string): Promise<void>;
    enableTeamBestPractice(teamId: string, practiceId: string): Promise<void>;
    saveSession(sessionContext: SessionContext): Promise<void>;
    loadSession(sessionId: string): Promise<SessionContext | null>;
    getUserSessions(userId: string, teamId: string, limit?: number): Promise<Array<{
        id: string;
        projectId: string;
        currentTask: string;
        createdAt: Date;
        focusAreas: string[];
        isExpired: boolean;
        contextQuality: number;
        content: any;
        title: string;
        description: string;
        metadata: any;
        updated_at: Date;
    }>>;
    createSessionSnapshot(sessionId: string, contextData: any, snapshotType: string, createdBy?: string): Promise<void>;
    recordSessionHandoff(fromSessionId: string | null, toSessionId: string, userId: string, teamId: string, projectId: string, handoffType: string, metrics: {
        contextPreservationScore?: number;
        resumptionTime?: number;
        originalContextSize?: number;
        compressedContextSize?: number;
        itemsPreserved?: number;
        itemsLost?: number;
    }): Promise<void>;
    cleanupExpiredSessions(): Promise<number>;
    getSessionHandoffMetrics(projectId: string, days?: number): Promise<{
        totalHandoffs: number;
        averageResumptionTime: number;
        averageContextPreservation: number;
        successRate: number;
    }>;
    getHealthCheck(): Promise<{
        status: string;
        timestamp: Date;
        stats: any;
    }>;
    storeHandoffAssessment(assessment: {
        sessionId: string;
        userId: string;
        teamId: string;
        timestamp: Date;
        scores: {
            contextCompleteness: number;
            taskClarity: number;
            emotionalContinuity: number;
            actionability: number;
            overall: number;
        };
        feedback: string;
        missingItems: string[];
        assessmentType: 'immediate' | 'retrospective';
        retrospectiveData?: {
            completedTasksReview: string;
            unexpectedChallenges: string[];
            wouldHaveBeenHelpful: string[];
            hiddenDecisions: string[];
        };
    }): Promise<void>;
    getHandoffAssessments(sessionId?: string, teamId?: string, limit?: number): Promise<any[]>;
    storeSessionScorecard(scorecard: {
        session_id: string;
        user_id: string;
        team_id: string;
        project_id?: string;
        session_start: Date;
        session_end: Date;
        scores: Record<string, any>;
        work_metrics?: Record<string, any>;
        context_usage?: Record<string, any>;
        mood?: Record<string, any>;
        handoff_assessment?: Record<string, any>;
        coaching?: Record<string, any>;
        patterns?: Record<string, any>;
        metadata?: Record<string, any>;
    }): Promise<void>;
    storeCoachingInsights(coaching: {
        session_id: string;
        user_id: string;
        team_id: string;
        insights: any[];
        recommendations: string[];
        collaboration_context: string;
        challenges_summary: string;
        success_patterns: string;
        generated_at: Date;
    }): Promise<void>;
}
export default DatabaseManager;
//# sourceMappingURL=database.d.ts.map