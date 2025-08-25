#!/usr/bin/env node
import { DatabaseManager } from './database';
import { SessionContext } from './session-handoff';
export interface SessionAnalyticsData {
    sessionId: string;
    userId: string;
    teamId: string;
    projectId: string;
    analysisDate: Date;
    sessionCount: number;
    totalDuration: number;
    activeCodingTime: number;
    contextSwitches: number;
    filesModified: number;
    linesAdded: number;
    linesRemoved: number;
    commitsMade: number;
    aiQueries: number;
    aiResponseTimeAvg: number;
    contextQualityAvg: number;
    successfulHandoffs: number;
    failedHandoffs: number;
    taskCompletionRate: number;
    contextSwitchesPerHour: number;
    deepWorkSessions: number;
    filesShared: number;
    teamInteractions: number;
    knowledgeSharedScore: number;
}
export interface TeamAnalyticsData {
    teamId: string;
    projectId: string;
    periodType: 'daily' | 'weekly' | 'monthly';
    periodStart: Date;
    periodEnd: Date;
    totalDevelopers: number;
    activeSessions: number;
    totalSessionTime: number;
    averageSessionLength: number;
    totalCommits: number;
    totalFilesModified: number;
    buildSuccessRate: number;
    contextQueriesTotal: number;
    avgContextQuality: number;
    handoffSuccessRate: number;
    aiEffectivenessScore: number;
    primaryFocusAreas: string[];
    technologyUsage: Record<string, number>;
}
export interface DashboardMetrics {
    productivity: {
        hoursWorked: number;
        productiveHours: number;
        productivityPercentage: number;
        deepWorkSessions: number;
    };
    codeHealth: {
        filesModified: number;
        commitsMade: number;
        linesChanged: number;
        buildSuccessRate: number;
    };
    collaboration: {
        teamInteractions: number;
        knowledgeShared: number;
        codeReviewParticipation: number;
        pairProgrammingSessions: number;
    };
    aiAssistance: {
        queriesTotal: number;
        avgResponseTime: number;
        contextQuality: number;
        handoffSuccessRate: number;
    };
    focus: {
        taskCompletionRate: number;
        contextSwitchesPerHour: number;
        averageSessionLength: number;
        interruptionFrequency: number;
    };
}
export interface FileHotspot {
    filePath: string;
    modificationCount: number;
    uniqueContributors: number;
    hoursSpent: number;
    complexityScore: number;
    bugFrequency: number;
    riskLevel: 'low_risk' | 'moderate_risk' | 'high_risk';
}
export declare class SessionAnalytics {
    private db;
    constructor(db: DatabaseManager);
    /**
     * Record a session event for real-time analytics
     */
    recordSessionEvent(sessionId: string, userId: string, teamId: string, projectId: string, eventType: string, eventData: any, durationMs?: number, success?: boolean): Promise<void>;
    /**
     * Analyze session context and generate analytics data
     */
    analyzeSession(sessionContext: SessionContext): Promise<SessionAnalyticsData>;
    /**
     * Store session analytics data
     */
    storeSessionAnalytics(data: SessionAnalyticsData): Promise<void>;
    /**
     * Get dashboard metrics for a user
     */
    getDashboardMetrics(userId: string, teamId: string, projectId: string, days?: number): Promise<DashboardMetrics>;
    /**
     * Get file hotspots for a project
     */
    getFileHotspots(projectId: string, days?: number): Promise<FileHotspot[]>;
    /**
     * Get team analytics summary
     */
    getTeamAnalytics(teamId: string, projectId: string, periodType?: 'daily' | 'weekly' | 'monthly'): Promise<TeamAnalyticsData | null>;
    private calculateProductivityMetrics;
    private calculateCollaborationMetrics;
    private calculateFocusMetrics;
    /**
     * Process session for analytics when it ends
     */
    processSessionCompletion(sessionContext: SessionContext): Promise<void>;
}
export default SessionAnalytics;
//# sourceMappingURL=session-analytics.d.ts.map