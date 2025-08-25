#!/usr/bin/env node
/**
 * @fileType: server
 * @status: current
 * @updated: 2025-08-01
 * @tags: [mcp, server, context, sessions, http, collaboration, auth, billing]
 * @related: [context-manager.ts, session-handoff.ts, database.ts, git-integration.ts, auth-manager.ts, billing-manager.ts]
 * @priority: critical
 * @complexity: high
 * @dependencies: [express, @modelcontextprotocol/sdk, pg, cors, stripe, bcrypt, dotenv]
 */
import { ContextManager } from './context-manager.js';
import { DatabaseManager, DatabaseConfig } from './database.js';
declare class CollaborativeContextManager extends ContextManager {
    private teamId;
    private projectId;
    private db;
    private contextValidator;
    constructor(teamId: string, projectId: string, db: DatabaseManager);
    getProjectOverview(projectPath?: string): Promise<any>;
    findRelevantCode(query: string, fileTypes?: string[]): Promise<any>;
    private getTeamInsights;
    private trackTeamQuery;
    private isContextFresh;
    /**
     * Get team best practices formatted for context inclusion
     */
    private getTeamBestPracticesContext;
    private broadcastActivity;
    /**
     * Refresh the entire project context (for structural changes)
     */
    refreshProjectContext(): Promise<void>;
    /**
     * Update context for specific changed files (for incremental changes)
     */
    updateFilesContext(files: string[]): Promise<void>;
}
declare class RemoteMCPServer {
    private app;
    private server;
    private contextManagers;
    private db;
    private analytics;
    private authManager;
    private entitlementsManager;
    private billingManager;
    private usageTracker;
    constructor(dbConfig?: DatabaseConfig);
    private setupMiddleware;
    /**
     * Setup environment-based authentication for MCP endpoints
     */
    private setupMCPAuthentication;
    private setupRoutes;
    private getTeamActivity;
    /**
     * Get team best practices with optional filtering
     */
    private getBestPractices;
    /**
     * Suggest contextual best practices for a scenario
     */
    private suggestBestPractice;
    /**
     * Capture current session state for handoff
     */
    private captureSession;
    /**
     * Resume work from a previously captured session
     */
    private resumeSession;
    /**
     * List available sessions for resumption
     */
    private listSessions;
    /**
     * Get dashboard metrics for analytics
     */
    private getDashboardMetrics;
    /**
     * Get file hotspots analytics
     */
    private getFileHotspots;
    /**
     * Get team analytics summary
     */
    private getTeamAnalytics;
    /**
     * Verify webhook signature for security
     */
    private verifyWebhookSignature;
    /**
     * Process git events and update context accordingly
     */
    private processGitEvent;
    start(port?: number): Promise<void>;
    /**
     * Initialize session with all context for seamless startup
     */
    private initializeSession;
    /**
     * Migrate local sessions to database
     */
    private migrateLocalSessions;
    /**
     * Check if user has access to a specific MCP tool
     */
    private checkToolAccess;
    /**
     * Setup billing and authentication routes
     */
    private setupBillingRoutes;
}
export { RemoteMCPServer, CollaborativeContextManager };
//# sourceMappingURL=remote-server.d.ts.map