#!/usr/bin/env node
/**
 * @fileType: service
 * @status: current
 * @updated: 2025-01-31
 * @tags: [mcp, sessions, handoff, context, persistence, analytics]
 * @related: [serverless-api, database.ts, session-analytics.ts]
 * @priority: critical
 * @complexity: high
 * @dependencies: [crypto, database, fs]
 */
import { DatabaseManager } from './database.js';
export type SessionMode = 'planning' | 'debugging' | 'building' | 'learning' | 'shipping';
export interface RapportContext {
    personalizedGreeting: string;
    sharedHistory: string;
    motivationalClose: string;
    emotionalTone: 'excited' | 'focused' | 'determined' | 'curious' | 'celebratory';
    contextualMood?: {
        situation: 'challenging' | 'progressing_well' | 'steady_work';
        mode: SessionMode;
        urgency: 'high' | 'medium' | 'normal';
        tone: 'excited' | 'focused' | 'determined' | 'curious' | 'celebratory';
    };
}
export interface EmbeddedContext {
    instantStart: {
        workingDirectory: string;
        currentBranch: string;
        uncommittedFiles?: string[];
        firstCommand: string;
        expectedOutput?: string;
    };
    contextYouNeed: {
        problem?: string;
        reproduce?: string;
        lastWorkingState?: string;
        hypothesis?: string;
    };
    progressSnapshot: {
        completed: Array<{
            task: string;
            result: string;
        }>;
        inProgress: Array<{
            task: string;
            status: string;
        }>;
        blocked?: Array<{
            task: string;
            blocker: string;
        }>;
        timeEstimate: string;
    };
    lastTerminalState?: Array<{
        command: string;
        output: string;
        exitCode: number;
    }>;
    watchouts?: string[];
}
export interface SessionContext {
    id: string;
    userId: string;
    teamId: string;
    projectId: string;
    createdAt: Date;
    updatedAt: Date;
    expiresAt?: Date;
    currentMode: SessionMode;
    nextMode?: SessionMode;
    modeRationale?: string;
    rapportContext?: RapportContext;
    embeddedContext?: EmbeddedContext;
    workingDirectory: string;
    currentTask: string;
    focusAreas: string[];
    conversationSummary: string;
    keyDecisions: Array<{
        decision: string;
        rationale: string;
        timestamp: Date;
        files: string[];
    }>;
    recentFiles: Array<{
        path: string;
        lastAccessed: Date;
        purpose: string;
        modifications: string[];
    }>;
    openTasks: Array<{
        description: string;
        priority: 'high' | 'medium' | 'low';
        files: string[];
        progress: string;
        nextSteps: string[];
    }>;
    activeFeatures: Array<{
        name: string;
        description: string;
        files: string[];
        status: 'planning' | 'in_progress' | 'testing' | 'complete';
        implementation_notes: string;
    }>;
    currentChallenges: Array<{
        problem: string;
        attempts: string[];
        currentApproach: string;
        blockers: string[];
    }>;
    discoveries: Array<{
        insight: string;
        source: string;
        relevance: string;
        files: string[];
    }>;
    recentCommands: Array<{
        command: string;
        output: string;
        timestamp: Date;
        success: boolean;
    }>;
    metadata: {
        sessionDuration: number;
        totalTokensUsed: number;
        averageResponseTime: number;
        productivityScore: number;
        contextQuality: number;
    };
}
export interface SessionHandoffOptions {
    preserveConversationHistory: boolean;
    includeDevelopmentState: boolean;
    includeToolHistory: boolean;
    maxContextAge: number;
    compressionLevel: 'minimal' | 'standard' | 'comprehensive';
    mode?: SessionMode;
    rapportContext?: RapportContext;
    embeddedContext?: EmbeddedContext;
}
export declare class SessionHandoffManager {
    private db;
    private contextValidator;
    private templateCache;
    constructor(db: DatabaseManager);
    /**
     * Load template from file with caching
     */
    private loadTemplate;
    /**
     * Process template with variable substitution
     */
    private processTemplate;
    /**
     * Format handoff content for human review (clean markdown) vs server consumption
     */
    formatForHumanReview(content: string): string;
    /**
     * Format handoff content for server processing (with embedded instructions)
     */
    formatForServerUpload(content: string, sessionId: string): string;
    /**
     * Generate handoff creation prompt for current Claude using file template
     */
    generateHandoffCreationPrompt(userId: string, teamId: string, projectId: string, currentTask: string): Promise<string>;
    /**
     * Store handoff content created by Claude
     */
    storeHandoffContent(userId: string, teamId: string, projectId: string, handoffContent: string): Promise<string>;
    /**
     * Load handoff for resumption (simple retrieval)
     */
    loadHandoffForResumption(sessionId: string): Promise<string | null>;
    loadMostRecentHandoff(userId: string, teamId: string, projectId: string): Promise<string | null>;
    captureSession(userId: string, teamId: string, projectId: string, options?: Partial<SessionHandoffOptions>): Promise<SessionContext>;
    /**
     * Resume session from stored context
     */
    resumeSession(sessionId: string): Promise<{
        context: SessionContext;
        resumptionPrompt: string;
        setupCommands: string[];
    }>;
    /**
     * List available sessions for a user
     */
    listUserSessions(userId: string, teamId: string): Promise<Array<{
        id: string;
        projectId: string;
        currentTask: string;
        createdAt: Date;
        focusAreas: string[];
        isExpired: boolean;
    }>>;
    /**
     * Clean up expired sessions
     */
    cleanupExpiredSessions(): Promise<number>;
    private generateSessionId;
    private analyzeWorkingContext;
    private extractConversationContext;
    private captureDevelopmentState;
    private extractProblemSolvingContext;
    private captureRecentCommands;
    private storeSessionContext;
    private loadSessionContext;
    private generateResumptionPrompt;
    private generateSetupCommands;
    private detectCurrentMode;
    private predictNextMode;
    private generateModeRationale;
    /**
     * Extract a display name from userId - handles email addresses and display names
     */
    private extractUserName;
    private generateRapportContext;
    private generateEmbeddedContext;
    private estimateTimeRemaining;
}
export default SessionHandoffManager;
//# sourceMappingURL=session-handoff.d.ts.map