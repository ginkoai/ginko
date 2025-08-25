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
import dotenv from 'dotenv';
dotenv.config();
import express from 'express';
import { createServer } from 'http';
import cors from 'cors';
import crypto from 'crypto';
import fs from 'fs/promises';
import { join } from 'path';
import { ContextManager } from './context-manager.js';
import { GitIntegration } from './git-integration.js';
import { DatabaseManager } from './database.js';
import BestPracticesManager from './best-practices.js';
import SessionHandoffManager from './session-handoff.js';
import SessionAnalytics from './session-analytics.js';
import AuthManager from './auth-manager.js';
import EntitlementsManager, { FeatureFlag } from './entitlements-manager.js';
import BillingManager from './billing-manager.js';
import UsageTracker, { UsageEventType } from './usage-tracker.js';
import ContextValidator from './context-validation.js';
// Enhanced context manager for team collaboration
class CollaborativeContextManager extends ContextManager {
    teamId;
    projectId;
    db;
    contextValidator;
    constructor(teamId, projectId, db) {
        super();
        this.teamId = teamId;
        this.projectId = projectId;
        this.db = db;
        this.contextValidator = new ContextValidator();
    }
    // Override base methods to add team collaboration features
    async getProjectOverview(projectPath) {
        const startTime = Date.now();
        // Try to get cached context from database first
        const cachedContext = await this.db.getProjectContext(this.projectId, 'overview', projectPath || 'root');
        if (cachedContext) {
            const freshCheck = await this.isContextFresh(cachedContext);
            if (freshCheck.isFresh) {
                console.log(`[DB] Using cached project overview for ${this.projectId}`);
                // Track activity in database
                await this.db.trackActivity(this.teamId, this.projectId, undefined, 'project_overview', {
                    projectPath,
                    source: 'cache',
                    executionTime: Date.now() - startTime,
                    contextWarning: freshCheck.warning
                });
                await this.broadcastActivity('project_overview', { projectPath, fromCache: true });
                // Include staleness warning in result if present
                let result = cachedContext.contextData;
                if (freshCheck.warning) {
                    result = {
                        ...result,
                        content: [
                            {
                                type: 'text',
                                text: `⚠️ Context Freshness Note: ${freshCheck.warning}`
                            },
                            ...result.content
                        ]
                    };
                }
                return result;
            }
            else if (freshCheck.warning) {
                console.log(`[CONTEXT] Cached context is stale: ${freshCheck.warning}`);
            }
        }
        // Generate new context
        const result = await super.getProjectOverview(projectPath);
        // Add team context from database
        const teamInsights = await this.getTeamInsights();
        const bestPractices = await this.getTeamBestPracticesContext();
        const enhancedResult = {
            ...result,
            content: [
                ...result.content,
                {
                    type: 'text',
                    text: `\n## Team Context\n${teamInsights}`,
                },
                {
                    type: 'text',
                    text: `\n${bestPractices}`,
                }
            ]
        };
        // Generate context metadata with staleness detection info
        const contextMetadata = await this.contextValidator.generateContextMetadata(projectPath);
        // Cache the result in database with validation metadata
        await this.db.saveProjectContext(this.projectId, 'overview', projectPath || 'root', enhancedResult, {
            generatedAt: new Date(),
            teamId: this.teamId,
            contextValidation: contextMetadata // Add staleness detection metadata
        }, new Date(Date.now() + 1000 * 60 * 30) // Cache for 30 minutes
        );
        // Track activity in database
        await this.db.trackActivity(this.teamId, this.projectId, undefined, 'project_overview', {
            projectPath,
            source: 'generated',
            executionTime: Date.now() - startTime
        });
        // Broadcast activity to team
        await this.broadcastActivity('project_overview', { projectPath, fromCache: false });
        return enhancedResult;
    }
    async findRelevantCode(query, fileTypes) {
        const startTime = Date.now();
        // Generate query key for caching
        const queryKey = `${query}:${fileTypes?.join(',') || 'all'}`;
        // Try to get cached results from database
        const cachedResults = await this.db.getProjectContext(this.projectId, 'code_search', queryKey);
        if (cachedResults) {
            const freshCheck = await this.isContextFresh(cachedResults);
            if (freshCheck.isFresh) {
                console.log(`[DB] Using cached code search results for query: "${query}"`);
                // Track activity in database
                await this.db.trackActivity(this.teamId, this.projectId, undefined, 'code_search', {
                    query,
                    fileTypes,
                    source: 'cache',
                    executionTime: Date.now() - startTime,
                    contextWarning: freshCheck.warning
                });
                await this.broadcastActivity('code_search', { query, fileTypes, fromCache: true });
                // Include staleness warning if present
                let result = cachedResults.contextData;
                if (freshCheck.warning) {
                    result = {
                        ...result,
                        content: [
                            {
                                type: 'text',
                                text: `⚠️ Context Freshness Note: ${freshCheck.warning}`
                            },
                            ...result.content
                        ]
                    };
                }
                return result;
            }
            else if (freshCheck.warning) {
                console.log(`[CONTEXT] Cached search results are stale: ${freshCheck.warning}`);
            }
        }
        // Generate new search results
        const result = await super.findRelevantCode(query, fileTypes);
        // Cache the results in database (cache for 15 minutes since code searches can change frequently)
        await this.db.saveProjectContext(this.projectId, 'code_search', queryKey, result, { query, fileTypes, generatedAt: new Date(), teamId: this.teamId }, new Date(Date.now() + 1000 * 60 * 15) // Cache for 15 minutes
        );
        // Track query for team learning in database
        await this.trackTeamQuery(query, fileTypes, Date.now() - startTime);
        // Track activity in database
        await this.db.trackActivity(this.teamId, this.projectId, undefined, 'code_search', {
            query,
            fileTypes,
            source: 'generated',
            executionTime: Date.now() - startTime
        });
        // Broadcast activity
        await this.broadcastActivity('code_search', { query, fileTypes, fromCache: false });
        return result;
    }
    async getTeamInsights() {
        try {
            // Get real team activity from database
            const activities = await this.db.getTeamActivity(this.teamId, this.projectId, 24);
            const gitEvents = await this.db.getRecentGitEvents(this.projectId, 7);
            const insights = [];
            // Active areas based on recent git events
            if (gitEvents.length > 0) {
                const authors = [...new Set(gitEvents.map(e => e.author))];
                insights.push(`**Active Contributors**: ${authors.slice(0, 3).join(', ')} (${gitEvents.length} commits this week)`);
            }
            // Recent activity
            if (activities.length > 0) {
                const recentActivity = activities[0];
                if (recentActivity.createdAt) {
                    const timeAgo = Math.round((Date.now() - recentActivity.createdAt.getTime()) / 1000 / 60);
                    insights.push(`**Recent Activity**: ${recentActivity.activityType} (${timeAgo} minutes ago)`);
                }
                else {
                    insights.push(`**Recent Activity**: ${recentActivity.activityType} (recently)`);
                }
            }
            // Common queries from database
            const commonQueries = activities
                .filter(a => a.activityType === 'code_search')
                .slice(0, 3)
                .map(a => {
                try {
                    const data = typeof a.activityData === 'string'
                        ? JSON.parse(a.activityData)
                        : a.activityData;
                    return `"${data?.query || 'unknown'}"`;
                }
                catch (error) {
                    return '"unknown"';
                }
            })
                .join(', ');
            if (commonQueries) {
                insights.push(`**Common Queries**: ${commonQueries}`);
            }
            return insights.length > 0 ? insights.join('\n') : 'No recent team activity';
        }
        catch (error) {
            console.error('[DB] Error getting team insights:', error);
            return 'Team insights temporarily unavailable';
        }
    }
    async trackTeamQuery(query, fileTypes, executionTime) {
        try {
            await this.db.query(`
        INSERT INTO context_queries (project_id, query_type, query_params, execution_time_ms)
        VALUES ($1, $2, $3, $4)
      `, [
                this.projectId,
                'find_relevant_code',
                JSON.stringify({ query, fileTypes }),
                executionTime
            ]);
            console.log(`[DB] Query tracked for team learning: "${query}"`);
        }
        catch (error) {
            console.error('[DB] Error tracking team query:', error);
        }
    }
    async isContextFresh(context) {
        // Legacy TTL check for backward compatibility
        if (context.expiresAt && new Date(context.expiresAt) <= new Date()) {
            return { isFresh: false };
        }
        // If no context metadata, assume legacy context and apply conservative freshness
        if (!context.metadata || !context.metadata.contextValidation) {
            const age = Date.now() - new Date(context.createdAt).getTime();
            const hoursOld = age / (1000 * 60 * 60);
            return {
                isFresh: hoursOld < 2, // Conservative 2-hour limit for legacy contexts
                warning: hoursOld >= 1 ? `Context is ${Math.round(hoursOld)} hours old (legacy format)` : undefined
            };
        }
        // New intelligent staleness detection
        try {
            const metadata = context.metadata.contextValidation;
            const stalenessResult = await this.contextValidator.validateContextStaleness(metadata);
            const warning = stalenessResult.isStale ?
                this.contextValidator.createValidationWarning(stalenessResult)?.message :
                undefined;
            return {
                isFresh: !stalenessResult.isStale,
                warning
            };
        }
        catch (error) {
            console.warn('[CONTEXT-VALIDATION] Failed to validate context staleness:', error);
            // Fallback to conservative approach
            return { isFresh: false };
        }
    }
    /**
     * Get team best practices formatted for context inclusion
     */
    async getTeamBestPracticesContext() {
        try {
            // Get team practices from database
            let teamPractices = await this.db.getTeamBestPractices(this.teamId);
            // If no practices found, initialize with defaults
            if (teamPractices.length === 0) {
                const defaultPractices = BestPracticesManager.getDefaultPractices();
                await this.db.initializeTeamBestPractices(this.teamId, defaultPractices);
                teamPractices = defaultPractices;
            }
            // Format practices for context
            return BestPracticesManager.formatPracticesForContext(teamPractices);
        }
        catch (error) {
            console.error('[DB] Error getting team best practices:', error);
            // Fallback to default practices
            const defaultPractices = BestPracticesManager.getDefaultPractices();
            return BestPracticesManager.formatPracticesForContext(defaultPractices);
        }
    }
    async broadcastActivity(activityType, data) {
        // Track activity in database for team collaboration
        try {
            await this.db.trackActivity(this.teamId, this.projectId, undefined, activityType, {
                ...data,
                timestamp: new Date().toISOString(),
                projectId: this.projectId
            });
        }
        catch (error) {
            console.error(`[DB] Failed to track activity ${activityType}:`, error);
        }
    }
    /**
     * Refresh the entire project context (for structural changes)
     */
    async refreshProjectContext() {
        console.log(`[CONTEXT] Refreshing full project context for ${this.teamId}:${this.projectId}`);
        try {
            // Clear all cached contexts for this project
            await this.db.query(`
        DELETE FROM project_contexts 
        WHERE project_id = $1
      `, [this.projectId]);
            console.log(`[DB] Cleared cached contexts for project ${this.projectId}`);
            // Re-generate fresh project overview
            await this.getProjectOverview();
            await this.broadcastActivity('context_refresh', {
                type: 'full_refresh',
                projectId: this.projectId,
                timestamp: new Date()
            });
            console.log(`[CONTEXT] Full refresh completed for ${this.teamId}:${this.projectId}`);
        }
        catch (error) {
            console.error('[CONTEXT] Error during full refresh:', error);
            throw error;
        }
    }
    /**
     * Update context for specific changed files (for incremental changes)
     */
    async updateFilesContext(files) {
        console.log(`[CONTEXT] Updating context for ${files.length} files in ${this.teamId}:${this.projectId}`);
        try {
            // Invalidate related cached contexts
            for (const file of files) {
                // Remove file-specific contexts
                await this.db.query(`
          DELETE FROM project_contexts 
          WHERE project_id = $1 AND context_key LIKE $2
        `, [this.projectId, `%${file}%`]);
                // Remove search contexts that might be affected by this file
                await this.db.query(`
          DELETE FROM project_contexts 
          WHERE project_id = $1 AND context_type = 'code_search'
        `, [this.projectId]);
            }
            console.log(`[DB] Invalidated contexts for ${files.length} changed files`);
            await this.broadcastActivity('context_update', {
                type: 'incremental_update',
                files,
                projectId: this.projectId,
                timestamp: new Date()
            });
            console.log(`[CONTEXT] Incremental update completed for ${files.length} files`);
        }
        catch (error) {
            console.error('[CONTEXT] Error during incremental update:', error);
            // Don't throw - incremental updates should be resilient
        }
    }
}
class RemoteMCPServer {
    app;
    server;
    contextManagers = new Map();
    db;
    analytics;
    authManager;
    entitlementsManager;
    billingManager;
    usageTracker;
    constructor(dbConfig) {
        this.app = express();
        this.server = createServer(this.app);
        // Initialize database if config provided
        if (dbConfig) {
            this.db = new DatabaseManager(dbConfig);
        }
        else {
            // Use default/mock database config for development
            this.db = new DatabaseManager({
                host: process.env.DB_HOST || 'localhost',
                port: parseInt(process.env.DB_PORT || '5432'),
                database: process.env.DB_NAME || 'contextmcp',
                username: process.env.DB_USER || 'postgres',
                password: process.env.DB_PASSWORD || 'password',
                ssl: process.env.NODE_ENV === 'production'
            });
        }
        // Initialize analytics
        this.analytics = new SessionAnalytics(this.db);
        // Initialize authentication and billing systems
        this.authManager = new AuthManager(this.db);
        this.usageTracker = new UsageTracker(this.db);
        this.entitlementsManager = new EntitlementsManager(this.db);
        this.billingManager = new BillingManager(this.db, this.usageTracker);
        this.setupMiddleware();
        this.setupRoutes();
    }
    setupMiddleware() {
        this.app.use(cors());
        this.app.use(express.json());
        // Serve static files from public directory
        this.app.use('/dashboard', express.static('public'));
        // Environment-based authentication for MCP API routes
        this.setupMCPAuthentication();
        // Enhanced logging middleware
        this.app.use((req, res, next) => {
            const timestamp = new Date().toISOString();
            const clientIP = req.ip || req.socket.remoteAddress || 'unknown';
            console.log(`[${timestamp}] 🌐 ${req.method} ${req.path} from ${clientIP}`);
            if (req.body && Object.keys(req.body).length > 0) {
                console.log(`[${timestamp}] 📨 Request body:`, JSON.stringify(req.body, null, 2));
            }
            // Log response
            const originalSend = res.send;
            res.send = function (data) {
                console.log(`[${timestamp}] 📤 Response: ${res.statusCode} ${res.statusMessage}`);
                if (data) {
                    const responseData = typeof data === 'string' ? data : JSON.stringify(data);
                    console.log(`[${timestamp}] 📄 Response data: ${responseData.substring(0, 500)}${responseData.length > 500 ? '...' : ''}`);
                }
                return originalSend.call(this, data);
            };
            next();
        });
    }
    /**
     * Setup environment-based authentication for MCP endpoints
     */
    setupMCPAuthentication() {
        if (process.env.NODE_ENV === 'production' || process.env.REQUIRE_AUTH === 'true') {
            // Require full authentication in production
            console.log('[AUTH] MCP endpoints require authentication (production mode)');
            this.app.use('/api/mcp', this.authManager.createAuthMiddleware());
        }
        else {
            // Optional authentication in development
            console.log('[AUTH] MCP endpoints using optional authentication (development mode)');
            this.app.use('/api/mcp', this.authManager.createOptionalAuthMiddleware());
        }
    }
    setupRoutes() {
        // Health check
        this.app.get('/health', (req, res) => {
            res.json({ status: 'healthy', timestamp: new Date().toISOString() });
        });
        // Authentication and Billing routes
        this.setupBillingRoutes();
        // MCP Protocol endpoints
        this.app.post('/api/mcp/tools/list', async (req, res) => {
            const user = req.user || {
                planTier: 'enterprise',
                planStatus: 'active',
                organizationId: 'local-dev',
                id: 'local-user',
                email: 'dev@localhost'
            };
            const tools = [
                {
                    name: 'get_project_overview',
                    description: 'Get a collaborative overview of the project with team insights',
                    inputSchema: {
                        type: 'object',
                        properties: {
                            path: { type: 'string', description: 'Project root path' }
                        }
                    }
                },
                {
                    name: 'find_relevant_code',
                    description: 'Find code with team collaboration insights',
                    inputSchema: {
                        type: 'object',
                        properties: {
                            query: { type: 'string', description: 'Search query' },
                            fileTypes: { type: 'array', items: { type: 'string' } }
                        },
                        required: ['query']
                    }
                },
                {
                    name: 'get_file_context',
                    description: 'Get file context with team usage patterns',
                    inputSchema: {
                        type: 'object',
                        properties: {
                            filePath: { type: 'string', description: 'File path' },
                            includeDependencies: { type: 'boolean', default: true }
                        },
                        required: ['filePath']
                    }
                },
                {
                    name: 'get_recent_changes',
                    description: 'Get recent changes with team activity context',
                    inputSchema: {
                        type: 'object',
                        properties: {
                            since: { type: 'string', default: '1 day' }
                        }
                    }
                },
                {
                    name: 'get_team_activity',
                    description: 'Get current team activity and focus areas',
                    inputSchema: {
                        type: 'object',
                        properties: {}
                    }
                },
                {
                    name: 'get_best_practices',
                    description: 'Get team development best practices and coding standards',
                    inputSchema: {
                        type: 'object',
                        properties: {
                            category: {
                                type: 'string',
                                description: 'Filter by category (e.g., "Code Quality", "Security")'
                            },
                            priority: {
                                type: 'string',
                                description: 'Filter by priority (critical, high, medium, low)'
                            }
                        }
                    }
                },
                {
                    name: 'suggest_best_practice',
                    description: 'Get contextual best practice suggestions for a specific scenario',
                    inputSchema: {
                        type: 'object',
                        properties: {
                            scenario: {
                                type: 'string',
                                description: 'The development scenario or problem context'
                            },
                            codeContext: {
                                type: 'string',
                                description: 'Optional code snippet or file context'
                            }
                        },
                        required: ['scenario']
                    }
                },
                {
                    name: 'capture_session',
                    description: 'Capture current session state for handoff to prevent context rot',
                    inputSchema: {
                        type: 'object',
                        properties: {
                            currentTask: {
                                type: 'string',
                                description: 'Brief description of what you are currently working on'
                            },
                            preserveConversation: {
                                type: 'boolean',
                                description: 'Whether to preserve conversation history',
                                default: true
                            },
                            compressionLevel: {
                                type: 'string',
                                enum: ['minimal', 'standard', 'comprehensive'],
                                description: 'How much context to preserve',
                                default: 'standard'
                            }
                        },
                        required: ['currentTask']
                    }
                },
                {
                    name: 'resume_session',
                    description: 'Resume work from a previously captured session',
                    inputSchema: {
                        type: 'object',
                        properties: {
                            sessionId: {
                                type: 'string',
                                description: 'Session ID to resume from'
                            }
                        },
                        required: ['sessionId']
                    }
                },
                {
                    name: 'list_sessions',
                    description: 'List available sessions that can be resumed',
                    inputSchema: {
                        type: 'object',
                        properties: {
                            limit: {
                                type: 'number',
                                description: 'Maximum number of sessions to return',
                                default: 20
                            }
                        }
                    }
                },
                {
                    name: 'get_dashboard_metrics',
                    description: 'Get session analytics dashboard metrics for productivity insights',
                    inputSchema: {
                        type: 'object',
                        properties: {
                            days: {
                                type: 'number',
                                description: 'Number of days to analyze (default: 7)',
                                default: 7
                            },
                            userId: {
                                type: 'string',
                                description: 'User ID to analyze (optional, defaults to current user)'
                            }
                        }
                    }
                },
                {
                    name: 'get_file_hotspots',
                    description: 'Get file activity hotspots showing which files need attention',
                    inputSchema: {
                        type: 'object',
                        properties: {
                            days: {
                                type: 'number',
                                description: 'Number of days to analyze (default: 7)',
                                default: 7
                            }
                        }
                    }
                },
                {
                    name: 'get_team_analytics',
                    description: 'Get team productivity and collaboration analytics',
                    inputSchema: {
                        type: 'object',
                        properties: {
                            periodType: {
                                type: 'string',
                                enum: ['daily', 'weekly', 'monthly'],
                                description: 'Analysis period type',
                                default: 'weekly'
                            }
                        }
                    }
                },
                {
                    name: 'context',
                    description: 'Load all project context and development practices',
                    inputSchema: {
                        type: 'object',
                        properties: {
                            autoResume: {
                                type: 'boolean',
                                description: 'Automatically resume most recent session if available',
                                default: true
                            }
                        }
                    }
                },
                {
                    name: 'ctx',
                    description: 'Shortcut for context - Load all project context and development practices',
                    inputSchema: {
                        type: 'object',
                        properties: {
                            autoResume: {
                                type: 'boolean',
                                description: 'Automatically resume most recent session if available',
                                default: true
                            }
                        }
                    }
                },
                {
                    name: 'sessions',
                    description: 'Shortcut for list_sessions - List available sessions that can be resumed',
                    inputSchema: {
                        type: 'object',
                        properties: {
                            limit: {
                                type: 'number',
                                description: 'Maximum number of sessions to return',
                                default: 20
                            }
                        }
                    }
                },
                {
                    name: '__startup',
                    description: '[AUTO-EXECUTE] Automatically loads all context when Claude connects to MCP',
                    inputSchema: {
                        type: 'object',
                        properties: {}
                    }
                }
            ];
            // Filter tools based on user's plan features
            const availableFeatures = EntitlementsManager.getFeatureAvailability(user.planTier);
            const toolFeatureMap = {
                'get_project_overview': FeatureFlag.BASIC_CONTEXT,
                'find_relevant_code': FeatureFlag.BASIC_CONTEXT,
                'get_file_context': FeatureFlag.BASIC_CONTEXT,
                'get_recent_changes': FeatureFlag.GIT_INTEGRATION,
                'get_team_activity': FeatureFlag.TEAM_COLLABORATION,
                'get_best_practices': FeatureFlag.BEST_PRACTICES_MGMT,
                'suggest_best_practice': FeatureFlag.BEST_PRACTICES_MGMT,
                'capture_session': FeatureFlag.SESSION_HANDOFF,
                'resume_session': FeatureFlag.SESSION_HANDOFF,
                'list_sessions': FeatureFlag.LOCAL_SESSIONS,
                'get_dashboard_metrics': FeatureFlag.USAGE_ANALYTICS,
                'get_file_hotspots': FeatureFlag.TEAM_INSIGHTS,
                'get_team_analytics': FeatureFlag.PERFORMANCE_METRICS
            };
            // Filter tools based on available features
            const filteredTools = tools.filter(tool => {
                const requiredFeature = toolFeatureMap[tool.name];
                return !requiredFeature || availableFeatures[requiredFeature];
            });
            res.json({
                tools: filteredTools,
                planTier: user.planTier,
                planStatus: user.planStatus,
                availableFeatures: Object.keys(availableFeatures).filter(f => availableFeatures[f])
            });
        });
        this.app.post('/api/mcp/tools/call', async (req, res) => {
            const { name, arguments: args } = req.body;
            const user = req.user || {
                planTier: 'enterprise',
                planStatus: 'active',
                organizationId: 'local-dev',
                id: 'local-user',
                email: 'dev@localhost'
            };
            const startTime = Date.now();
            const timestamp = new Date().toISOString();
            console.log(`[${timestamp}] 🛠️  MCP Tool Call: ${name} by ${user.email}`);
            console.log(`[${timestamp}] 👥 Organization: ${user.organizationId} (${user.planTier})`);
            console.log(`[${timestamp}] 📋 Arguments:`, JSON.stringify(args, null, 2));
            try {
                // Check feature access and rate limits based on tool
                await this.checkToolAccess(user, name);
                // Track usage for billing
                await this.usageTracker.trackForUser(user, UsageEventType.MCP_TOOL_CALL, {
                    resourceId: args.projectId,
                    metadata: { tool: name, args }
                });
                // Use organization-specific team/project or defaults
                const teamId = args.teamId || `${user.organizationId}-default-team`;
                const projectId = args.projectId || `${user.organizationId}-default-project`;
                // Get or create context manager for this team/project
                const contextKey = `${teamId}:${projectId}`;
                let contextManager = this.contextManagers.get(contextKey);
                if (!contextManager) {
                    console.log(`[${timestamp}] 🆕 Creating new context manager for ${contextKey}`);
                    contextManager = new CollaborativeContextManager(teamId, projectId, this.db);
                    this.contextManagers.set(contextKey, contextManager);
                }
                else {
                    console.log(`[${timestamp}] ♻️  Using existing context manager for ${contextKey}`);
                }
                let result;
                console.log(`[${timestamp}] ⚡ Executing tool: ${name}`);
                switch (name) {
                    case 'get_project_overview':
                        console.log(`[${timestamp}] 📊 Getting project overview for path: ${args.path || 'current directory'}`);
                        result = await contextManager.getProjectOverview(args.path);
                        break;
                    case 'find_relevant_code':
                        console.log(`[${timestamp}] 🔍 Searching for: "${args.query}" in ${args.fileTypes?.length || 'all'} file types`);
                        result = await contextManager.findRelevantCode(args.query, args.fileTypes);
                        break;
                    case 'get_file_context':
                        console.log(`[${timestamp}] 📄 Getting context for file: ${args.filePath}`);
                        result = await contextManager.getFileContext(args.filePath, args.includeDependencies);
                        break;
                    case 'get_recent_changes':
                        console.log(`[${timestamp}] 🕐 Getting changes since: ${args.since || '1 day'}`);
                        result = await contextManager.getRecentChanges(args.since);
                        break;
                    case 'get_team_activity':
                        console.log(`[${timestamp}] 👥 Getting team activity for ${teamId}/${projectId}`);
                        result = await this.getTeamActivity(teamId, projectId);
                        break;
                    case 'get_best_practices':
                        console.log(`[${timestamp}] 📋 Getting best practices for ${teamId} (category: ${args.category || 'all'}, priority: ${args.priority || 'all'})`);
                        result = await this.getBestPractices(teamId, args.category, args.priority);
                        break;
                    case 'suggest_best_practice':
                        console.log(`[${timestamp}] 💡 Getting best practice suggestions for scenario: "${args.scenario}"`);
                        result = await this.suggestBestPractice(teamId, args.scenario, args.codeContext);
                        break;
                    case 'capture_session':
                        console.log(`[${timestamp}] 📸 Capturing session state for task: "${args.currentTask}"`);
                        result = await this.captureSession(teamId, projectId, args.currentTask, args);
                        break;
                    case 'resume_session':
                        console.log(`[${timestamp}] ▶️  Resuming session: ${args.sessionId}`);
                        result = await this.resumeSession(args.sessionId);
                        break;
                    case 'list_sessions':
                        console.log(`[${timestamp}] 📋 Listing available sessions for ${teamId}`);
                        const sessionLimit = args.limit || 20; // Increase default from 10 to 20
                        console.log(`[${timestamp}] 📋 Using limit: ${sessionLimit}, userId: ${args.userId || 'current-user'}`);
                        result = await this.listSessions(teamId, args.userId || 'current-user', sessionLimit);
                        break;
                    case 'get_dashboard_metrics':
                        console.log(`[${timestamp}] 📊 Getting dashboard metrics for ${teamId}/${projectId}`);
                        result = await this.getDashboardMetrics(teamId, projectId, args.userId, args.days);
                        break;
                    case 'get_file_hotspots':
                        console.log(`[${timestamp}] 🔥 Getting file hotspots for ${projectId}`);
                        result = await this.getFileHotspots(projectId, args.days);
                        break;
                    case 'get_team_analytics':
                        console.log(`[${timestamp}] 📈 Getting team analytics for ${teamId}/${projectId}`);
                        result = await this.getTeamAnalytics(teamId, projectId, args.periodType);
                        break;
                    case 'context':
                        console.log(`[${timestamp}] 🚀 Loading context for ${teamId}/${projectId}`);
                        result = await this.initializeSession(teamId, projectId, args.userId || 'current-user', args.autoResume);
                        break;
                    case 'ctx':
                        console.log(`[${timestamp}] 🚀 Loading context (shortcut) for ${teamId}/${projectId}`);
                        result = await this.initializeSession(teamId, projectId, args.userId || 'current-user', args.autoResume);
                        break;
                    case 'sessions':
                        console.log(`[${timestamp}] 📋 Listing sessions (shortcut) for ${teamId}`);
                        const sessionLimit2 = args.limit || 20;
                        console.log(`[${timestamp}] 📋 Using limit: ${sessionLimit2}, userId: ${args.userId || 'current-user'}`);
                        result = await this.listSessions(teamId, args.userId || 'current-user', sessionLimit2);
                        break;
                    case '__startup':
                        console.log(`[${timestamp}] 🎯 AUTO-STARTUP: Loading context for ${teamId}/${projectId}`);
                        result = await this.initializeSession(teamId, projectId, 'current-user', true);
                        break;
                    default:
                        throw new Error(`Unknown tool: ${name}`);
                }
                const duration = Date.now() - startTime;
                console.log(`[${timestamp}] ✅ Tool ${name} completed successfully in ${duration}ms`);
                res.json({ result });
            }
            catch (error) {
                const duration = Date.now() - startTime;
                const errorMessage = error instanceof Error ? error.message : String(error);
                console.log(`[${timestamp}] ❌ Tool ${name} failed after ${duration}ms: ${errorMessage}`);
                res.status(500).json({
                    error: errorMessage
                });
            }
        });
        // Migration endpoint for importing local sessions
        this.app.post('/admin/migrate-sessions', async (req, res) => {
            const timestamp = new Date().toISOString();
            console.log(`[${timestamp}] 🔄 Migration request received`);
            try {
                const result = await this.migrateLocalSessions();
                res.json(result);
            }
            catch (error) {
                console.error(`[${timestamp}] ❌ Migration failed:`, error);
                res.status(500).json({ error: error instanceof Error ? error.message : String(error) });
            }
        });
        // Debug endpoint to check database contents
        this.app.get('/admin/debug-sessions', async (req, res) => {
            const timestamp = new Date().toISOString();
            console.log(`[${timestamp}] 🔍 Debug sessions request received`);
            try {
                const result = await this.db.query(`
          SELECT session_key, user_id, team_id, project_id, current_task, 
                 created_at, is_active, context_quality
          FROM user_sessions 
          ORDER BY created_at DESC
        `);
                const summary = {
                    total: result.rows.length,
                    active: result.rows.filter(r => r.is_active).length,
                    byTeam: {},
                    byUser: {}
                };
                result.rows.forEach(row => {
                    summary.byTeam[row.team_id] = (summary.byTeam[row.team_id] || 0) + 1;
                    summary.byUser[row.user_id] = (summary.byUser[row.user_id] || 0) + 1;
                });
                res.json({
                    summary,
                    sessions: result.rows.map(row => ({
                        id: row.session_key,
                        userId: row.user_id,
                        teamId: row.team_id,
                        projectId: row.project_id,
                        task: row.current_task.substring(0, 60) + '...',
                        created: row.created_at,
                        active: row.is_active,
                        quality: row.context_quality
                    }))
                });
            }
            catch (error) {
                console.error(`[${timestamp}] ❌ Debug failed:`, error);
                res.status(500).json({ error: error instanceof Error ? error.message : String(error) });
            }
        });
        // Git webhook endpoints
        console.log('[ROUTES] Registering webhook endpoint: /webhooks/git/:projectId');
        this.app.post('/webhooks/git/:projectId', async (req, res) => {
            const { projectId } = req.params;
            const timestamp = new Date().toISOString();
            console.log(`[${timestamp}] 🔗 Git webhook received for project: ${projectId}`);
            try {
                // Verify webhook signature if secret is configured
                const webhookSecret = process.env.WEBHOOK_SECRET;
                if (webhookSecret) {
                    const signature = req.headers['x-hub-signature-256'];
                    if (!this.verifyWebhookSignature(JSON.stringify(req.body), signature, webhookSecret)) {
                        console.log(`[${timestamp}] ❌ Invalid webhook signature`);
                        return res.status(401).json({ error: 'Invalid signature' });
                    }
                }
                // Parse webhook payload (GitHub or GitLab)
                let gitEvent = null;
                if (req.headers['x-github-event']) {
                    gitEvent = GitIntegration.parseGitHubWebhook(req.body);
                }
                else if (req.headers['x-gitlab-event']) {
                    gitEvent = GitIntegration.parseGitLabWebhook(req.body);
                }
                if (!gitEvent) {
                    console.log(`[${timestamp}] ⚠️  Could not parse webhook payload`);
                    return res.status(400).json({ error: 'Invalid webhook payload' });
                }
                console.log(`[${timestamp}] 📝 Processing ${gitEvent.files.length} file changes by ${gitEvent.author}`);
                console.log(`[${timestamp}] 💬 Commit: "${gitEvent.message}"`);
                // Save git event to database
                await this.db.saveGitEvent(projectId, gitEvent, req.body);
                // Process the git event
                await this.processGitEvent(projectId, gitEvent);
                res.json({
                    status: 'success',
                    processed: gitEvent.files.length,
                    message: 'Context updated successfully'
                });
            }
            catch (error) {
                const errorMessage = error instanceof Error ? error.message : String(error);
                console.log(`[${timestamp}] ❌ Webhook processing failed: ${errorMessage}`);
                res.status(500).json({ error: errorMessage });
            }
        });
        // Manual context refresh endpoint
        this.app.post('/projects/:projectId/refresh', async (req, res) => {
            const { projectId } = req.params;
            const { teamId } = req.body;
            const timestamp = new Date().toISOString();
            console.log(`[${timestamp}] 🔄 Manual refresh requested for project: ${projectId}`);
            try {
                // Get context manager for this team/project
                const contextKey = `${teamId || 'default-team'}:${projectId}`;
                let contextManager = this.contextManagers.get(contextKey);
                if (!contextManager) {
                    contextManager = new CollaborativeContextManager(teamId || 'default-team', projectId, this.db);
                    this.contextManagers.set(contextKey, contextManager);
                }
                // Force refresh project context
                await contextManager.refreshProjectContext();
                // Track refresh activity in database
                try {
                    await this.db.trackActivity(teamId, projectId, undefined, 'context_refreshed', {
                        projectId,
                        timestamp: new Date(),
                        trigger: 'manual'
                    });
                }
                catch (error) {
                    console.error('[DB] Failed to track context refresh activity:', error);
                }
                console.log(`[${timestamp}] ✅ Manual refresh completed for ${projectId}`);
                res.json({ status: 'success', message: 'Context refreshed successfully' });
            }
            catch (error) {
                const errorMessage = error instanceof Error ? error.message : String(error);
                console.log(`[${timestamp}] ❌ Manual refresh failed: ${errorMessage}`);
                res.status(500).json({ error: errorMessage });
            }
        });
        // Team management endpoints
        this.app.get('/teams/:teamId/projects', (req, res) => {
            // Mock response - implement with real database
            res.json({
                projects: [
                    { id: 'proj1', name: 'contextMCP', active: true },
                    { id: 'proj2', name: 'team-dashboard', active: false }
                ]
            });
        });
    }
    async getTeamActivity(teamId, projectId) {
        try {
            const activities = await this.db.getTeamActivity(teamId, projectId, 24);
            const gitEvents = await this.db.getRecentGitEvents(projectId, 1);
            const sections = [];
            sections.push('# Team Activity', '');
            // Currently active members
            if (activities.length > 0) {
                sections.push('## Recent Activity');
                activities.slice(0, 5).forEach(activity => {
                    const timeAgo = Math.round((Date.now() - activity.createdAt.getTime()) / 1000 / 60);
                    // Handle activityData that might be already parsed or need parsing
                    let activityData;
                    try {
                        activityData = typeof activity.activityData === 'string'
                            ? JSON.parse(activity.activityData)
                            : activity.activityData;
                    }
                    catch (error) {
                        console.warn('Failed to parse activity data:', activity.activityData);
                        activityData = {};
                    }
                    sections.push(`- ${activity.activityType}: ${activityData?.query || activityData?.projectPath || 'system'} (${timeAgo} minutes ago)`);
                });
                sections.push('');
            }
            // Recent git activity
            if (gitEvents.length > 0) {
                sections.push('## Recent Commits');
                gitEvents.slice(0, 3).forEach(event => {
                    const timeAgo = Math.round((Date.now() - event.timestamp.getTime()) / 1000 / 60 / 60);
                    sections.push(`- **${event.author}**: "${event.message}" (${timeAgo} hours ago, ${event.files.length} files)`);
                });
                sections.push('');
            }
            // Project stats
            const stats = await this.db.getProjectStats(projectId);
            sections.push('## Project Stats');
            sections.push(`- **Total Queries**: ${stats.totalQueries} (last 7 days)`);
            sections.push(`- **Active Users**: ${stats.activeUsers}`);
            sections.push(`- **Recent Commits**: ${stats.recentCommits}`);
            if (stats.avgResponseTime > 0) {
                sections.push(`- **Avg Response Time**: ${Math.round(stats.avgResponseTime)}ms`);
            }
            return {
                content: [{
                        type: 'text',
                        text: sections.join('\n')
                    }]
            };
        }
        catch (error) {
            console.error('[DB] Error getting team activity:', error);
            return {
                content: [{
                        type: 'text',
                        text: 'Team activity temporarily unavailable'
                    }]
            };
        }
    }
    /**
     * Get team best practices with optional filtering
     */
    async getBestPractices(teamId, category, priority) {
        try {
            let practices = await this.db.getTeamBestPractices(teamId);
            // Initialize defaults if none found
            if (practices.length === 0) {
                const defaultPractices = BestPracticesManager.getDefaultPractices();
                await this.db.initializeTeamBestPractices(teamId, defaultPractices);
                practices = defaultPractices;
            }
            // Apply filters
            if (category) {
                practices = practices.filter(p => p.category.toLowerCase().includes(category.toLowerCase()));
            }
            if (priority) {
                practices = practices.filter(p => p.priority === priority);
            }
            const formattedPractices = BestPracticesManager.formatPracticesForContext(practices);
            return {
                content: [{
                        type: 'text',
                        text: formattedPractices
                    }]
            };
        }
        catch (error) {
            console.error('[DB] Error getting best practices:', error);
            const defaultPractices = BestPracticesManager.getDefaultPractices();
            const formattedPractices = BestPracticesManager.formatPracticesForContext(defaultPractices);
            return {
                content: [{
                        type: 'text',
                        text: formattedPractices
                    }]
            };
        }
    }
    /**
     * Suggest contextual best practices for a scenario
     */
    async suggestBestPractice(teamId, scenario, codeContext) {
        let practices;
        try {
            practices = await this.db.getTeamBestPractices(teamId);
            // Initialize defaults if none found
            if (practices.length === 0) {
                const defaultPractices = BestPracticesManager.getDefaultPractices();
                await this.db.initializeTeamBestPractices(teamId, defaultPractices);
                practices = defaultPractices;
            }
        }
        catch (error) {
            console.error('[DB] Error getting team best practices for suggestions:', error);
            // Fallback to default practices when database is unavailable
            practices = BestPracticesManager.getDefaultPractices();
        }
        try {
            // Simple keyword-based matching for relevant practices
            const scenarioLower = scenario.toLowerCase();
            const relevantPractices = practices.filter(practice => {
                const searchText = `${practice.title} ${practice.description} ${practice.category} ${practice.tags.join(' ')}`.toLowerCase();
                // Match common scenarios
                if (scenarioLower.includes('error') || scenarioLower.includes('exception')) {
                    return searchText.includes('error') || searchText.includes('handle');
                }
                if (scenarioLower.includes('test') || scenarioLower.includes('testing')) {
                    return searchText.includes('test') || practice.category === 'Testing';
                }
                if (scenarioLower.includes('security') || scenarioLower.includes('auth')) {
                    return practice.category === 'Security' || searchText.includes('security');
                }
                if (scenarioLower.includes('performance') || scenarioLower.includes('slow')) {
                    return practice.category === 'Performance' || searchText.includes('performance');
                }
                if (scenarioLower.includes('code review') || scenarioLower.includes('refactor')) {
                    return searchText.includes('quality') || searchText.includes('pattern');
                }
                if (scenarioLower.includes('database') || scenarioLower.includes('sql')) {
                    return searchText.includes('database') || searchText.includes('sql') || searchText.includes('query');
                }
                // General keyword matching
                return scenario.split(' ').some(word => word.length > 3 && searchText.includes(word.toLowerCase()));
            });
            // Sort by priority and take top 5
            const suggestedPractices = relevantPractices
                .sort((a, b) => {
                const priorityOrder = { critical: 0, high: 1, medium: 2, low: 3 };
                return priorityOrder[a.priority] - priorityOrder[b.priority];
            })
                .slice(0, 5);
            if (suggestedPractices.length === 0) {
                return {
                    content: [{
                            type: 'text',
                            text: `# Best Practice Suggestions\n\nNo specific practices found for "${scenario}". Consider reviewing all team best practices with the \`get_best_practices\` tool.`
                        }]
                };
            }
            const sections = [
                `# Best Practice Suggestions for: "${scenario}"`,
                '',
                `Found ${suggestedPractices.length} relevant practice(s):`,
                ''
            ];
            suggestedPractices.forEach((practice, index) => {
                sections.push(`## ${index + 1}. ${practice.title} (${practice.priority} priority)`);
                sections.push(practice.description);
                sections.push(`**Why:** ${practice.rationale}`);
                if (practice.examples?.good?.length) {
                    sections.push('**Good practices:**');
                    practice.examples.good.forEach(example => sections.push(`- ${example}`));
                }
                sections.push('');
            });
            if (codeContext) {
                sections.push('## Code Context Analysis');
                sections.push('Based on the provided code context, pay special attention to:');
                // Simple code analysis for common patterns
                const codeContextLower = codeContext.toLowerCase();
                if (codeContextLower.includes('try') && codeContextLower.includes('catch')) {
                    sections.push('- Error handling patterns and meaningful error messages');
                }
                if (codeContextLower.includes('function') || codeContextLower.includes('=>')) {
                    sections.push('- Function naming and single responsibility principle');
                }
                if (codeContextLower.includes('const') || codeContextLower.includes('let')) {
                    sections.push('- Variable naming conventions and immutability');
                }
                if (codeContextLower.includes('async') || codeContextLower.includes('await')) {
                    sections.push('- Async/await error handling and performance considerations');
                }
                sections.push('');
            }
            return {
                content: [{
                        type: 'text',
                        text: sections.join('\n')
                    }]
            };
        }
        catch (error) {
            console.error('[SUGGESTIONS] Error processing best practice suggestions:', error);
            return {
                content: [{
                        type: 'text',
                        text: `# Best Practice Suggestions\n\nError processing suggestions: ${error instanceof Error ? error.message : String(error)}\n\nPlease try again or use the \`get_best_practices\` tool for general practices.`
                    }]
            };
        }
    }
    /**
     * Capture current session state for handoff
     */
    async captureSession(teamId, projectId, currentTask, options) {
        try {
            // Determine user ID (would come from authentication in production)
            const userId = options.userId || 'current-user';
            const sessionManager = new SessionHandoffManager(this.db);
            const sessionContext = await sessionManager.captureSession(userId, teamId, projectId, {
                preserveConversationHistory: options.preserveConversation !== false,
                includeDevelopmentState: true,
                includeToolHistory: true,
                compressionLevel: options.compressionLevel || 'standard',
                maxContextAge: 24
            });
            // Override the current task with user-provided description
            sessionContext.currentTask = currentTask;
            // Save to database if available
            try {
                await this.db.saveSession(sessionContext);
                await this.db.createSessionSnapshot(sessionContext.id, sessionContext, 'handoff', userId);
            }
            catch (dbError) {
                console.warn('[SESSION] Database save failed, session stored locally:', dbError);
            }
            // Record handoff metrics
            try {
                await this.db.recordSessionHandoff(null, // No previous session
                sessionContext.id, userId, teamId, projectId, 'manual', {
                    contextPreservationScore: sessionContext.metadata.contextQuality,
                    originalContextSize: JSON.stringify(sessionContext).length,
                    compressedContextSize: JSON.stringify(sessionContext).length, // Would compress in production
                    itemsPreserved: (sessionContext.recentFiles?.length || 0) + (sessionContext.openTasks?.length || 0),
                    itemsLost: 0
                });
            }
            catch (error) {
                console.warn('[SESSION] Could not record handoff metrics:', error);
            }
            // Track session capture activity in database
            try {
                await this.db.trackActivity(teamId, projectId, userId, 'session_captured', {
                    sessionId: sessionContext.id,
                    userId,
                    currentTask,
                    timestamp: new Date()
                });
            }
            catch (error) {
                console.error('[DB] Failed to track session capture activity:', error);
            }
            return {
                content: [{
                        type: 'text',
                        text: [
                            `# Session Captured Successfully 📸`,
                            '',
                            `**Session ID**: \`${sessionContext.id}\``,
                            `**Current Task**: ${currentTask}`,
                            `**Focus Areas**: ${sessionContext.focusAreas.join(', ')}`,
                            `**Context Quality**: ${(sessionContext.metadata.contextQuality * 100).toFixed(0)}%`,
                            '',
                            `## What Was Preserved`,
                            `- Recent files: ${sessionContext.recentFiles?.length || 0}`,
                            `- Open tasks: ${sessionContext.openTasks?.length || 0}`,
                            `- Active features: ${sessionContext.activeFeatures?.length || 0}`,
                            `- Conversation summary: ${sessionContext.conversationSummary ? 'Yes' : 'No'}`,
                            `- Key decisions: ${sessionContext.keyDecisions?.length || 0}`,
                            `- Current challenges: ${sessionContext.currentChallenges?.length || 0}`,
                            '',
                            `## Next Steps`,
                            `1. Start a fresh Claude Code session to avoid context rot`,
                            `2. Use \`resume_session\` with session ID: \`${sessionContext.id}\``,
                            `3. Continue your work with preserved context`,
                            '',
                            `*Session expires: ${sessionContext.expiresAt?.toLocaleString() || 'Never'}*`
                        ].join('\n')
                    }]
            };
        }
        catch (error) {
            console.error('[SESSION] Error capturing session:', error);
            return {
                content: [{
                        type: 'text',
                        text: `# Session Capture Failed ❌\n\nError: ${error instanceof Error ? error.message : String(error)}\n\nPlease try again or contact support if the issue persists.`
                    }]
            };
        }
    }
    /**
     * Resume work from a previously captured session
     */
    async resumeSession(sessionId) {
        try {
            const startTime = Date.now();
            // Try to load from database first
            let sessionContext = null;
            try {
                sessionContext = await this.db.loadSession(sessionId);
            }
            catch (dbError) {
                console.warn('[SESSION] Database load failed, trying local storage:', dbError);
            }
            // Fallback to local session manager
            if (!sessionContext) {
                const sessionManager = new SessionHandoffManager(this.db);
                const resumptionData = await sessionManager.resumeSession(sessionId);
                sessionContext = resumptionData.context;
            }
            if (!sessionContext) {
                return {
                    content: [{
                            type: 'text',
                            text: `# Session Not Found ❌\n\nSession \`${sessionId}\` was not found or has expired.\n\nUse \`list_sessions\` to see available sessions.`
                        }]
                };
            }
            const resumptionTime = Date.now() - startTime;
            // Record successful resumption
            try {
                await this.db.recordSessionHandoff(sessionId, `${sessionId}_resumed_${Date.now()}`, sessionContext.userId, sessionContext.teamId, sessionContext.projectId, 'resumption', {
                    contextPreservationScore: sessionContext.metadata.contextQuality,
                    resumptionTime: resumptionTime,
                    itemsPreserved: (sessionContext.recentFiles?.length || 0) + (sessionContext.openTasks?.length || 0)
                });
            }
            catch (error) {
                console.warn('[SESSION] Could not record resumption metrics:', error);
            }
            // Generate resumption prompt
            const sessionManager = new SessionHandoffManager(this.db);
            const resumptionPrompt = await sessionManager['generateResumptionPrompt'](sessionContext);
            // Track session resumption activity in database
            try {
                await this.db.trackActivity(sessionContext.teamId, sessionContext.projectId, sessionContext.userId, 'session_resumed', {
                    sessionId,
                    userId: sessionContext.userId,
                    currentTask: sessionContext.currentTask,
                    resumptionTime,
                    timestamp: new Date()
                });
            }
            catch (error) {
                console.error('[DB] Failed to track session resumption activity:', error);
            }
            return {
                content: [{
                        type: 'text',
                        text: resumptionPrompt
                    }]
            };
        }
        catch (error) {
            console.error('[SESSION] Error resuming session:', error);
            return {
                content: [{
                        type: 'text',
                        text: `# Session Resumption Failed ❌\n\nError: ${error instanceof Error ? error.message : String(error)}\n\nThe session may have expired or been corrupted.`
                    }]
            };
        }
    }
    /**
     * List available sessions for resumption
     */
    async listSessions(teamId, userId = 'current-user', limit = 10) {
        try {
            let sessions = [];
            // Try database first
            try {
                sessions = await this.db.getUserSessions(userId, teamId, limit);
                console.log(`[SESSION] Database returned ${sessions.length} sessions for user ${userId}, team ${teamId}, limit ${limit}`);
            }
            catch (dbError) {
                console.warn('[SESSION] Database query failed, trying local storage:', dbError);
                // Fallback to local session manager
                const sessionManager = new SessionHandoffManager(this.db);
                const localSessions = await sessionManager.listUserSessions(userId, teamId);
                sessions = localSessions.slice(0, limit);
                console.log(`[SESSION] Local storage returned ${sessions.length} sessions`);
            }
            if (sessions.length === 0) {
                return {
                    content: [{
                            type: 'text',
                            text: [
                                '# No Sessions Available 📭',
                                '',
                                'You don\'t have any captured sessions yet.',
                                '',
                                '## Getting Started',
                                '1. Use `capture_session` to save your current work state',
                                '2. Start a fresh session to avoid context rot',
                                '3. Use `resume_session` to continue where you left off',
                                '',
                                'Session handoff prevents context rot by preserving your development state between AI sessions.'
                            ].join('\n')
                        }]
                };
            }
            // Clean menu format like a restaurant menu
            const sections = [
                '# Session Menu 📋',
                '',
                `${sessions.length} available sessions:`
            ];
            sessions.forEach((session, index) => {
                const timeAgo = Math.round((Date.now() - session.createdAt.getTime()) / 1000 / 60 / 60);
                const quality = Math.min(100, Math.round((session.contextQuality || 0) * 100));
                const status = session.isExpired ? '⚠️' : '✅';
                // Truncate task description to keep it concise
                const task = session.currentTask.length > 60
                    ? session.currentTask.substring(0, 60) + '...'
                    : session.currentTask;
                sections.push(`**${index + 1}.** ${task}`);
                sections.push(`    ${status} ${timeAgo}h ago • ${quality}% quality • \`resume_session sessionId="${session.id}"\``);
            });
            sections.push('');
            sections.push('💡 **Tip**: To resume a session, just type the session number (e.g., "1") or use the full resume command');
            return {
                content: [{
                        type: 'text',
                        text: sections.join('\n')
                    }]
            };
        }
        catch (error) {
            console.error('[SESSION] Error listing sessions:', error);
            return {
                content: [{
                        type: 'text',
                        text: `# Error Listing Sessions ❌\n\nError: ${error instanceof Error ? error.message : String(error)}`
                    }]
            };
        }
    }
    /**
     * Get dashboard metrics for analytics
     */
    async getDashboardMetrics(teamId, projectId, userId, days = 7) {
        try {
            const targetUserId = userId || 'current-user';
            const metrics = await this.analytics.getDashboardMetrics(targetUserId, teamId, projectId, days);
            const sections = [
                '# Session Analytics Dashboard 📊',
                '',
                `**Analysis Period**: Last ${days} days`,
                `**User**: ${targetUserId}`,
                `**Team**: ${teamId}`,
                `**Project**: ${projectId}`,
                '',
                '## 💪 Productivity Metrics',
                `- **Hours Worked**: ${metrics.productivity.hoursWorked.toFixed(1)}h`,
                `- **Productive Hours**: ${metrics.productivity.productiveHours.toFixed(1)}h`,
                `- **Productivity Rate**: ${metrics.productivity.productivityPercentage.toFixed(1)}%`,
                `- **Deep Work Sessions**: ${metrics.productivity.deepWorkSessions}`,
                '',
                '## 🔧 Code Health',
                `- **Files Modified**: ${metrics.codeHealth.filesModified}`,
                `- **Commits Made**: ${metrics.codeHealth.commitsMade}`,
                `- **Lines Changed**: ${metrics.codeHealth.linesChanged}`,
                `- **Build Success Rate**: ${(metrics.codeHealth.buildSuccessRate * 100).toFixed(1)}%`,
                '',
                '## 🤝 Collaboration',
                `- **Team Interactions**: ${metrics.collaboration.teamInteractions}`,
                `- **Knowledge Shared**: ${(metrics.collaboration.knowledgeShared * 100).toFixed(1)}%`,
                `- **Code Review Participation**: ${(metrics.collaboration.codeReviewParticipation * 100).toFixed(1)}%`,
                `- **Pair Programming Sessions**: ${metrics.collaboration.pairProgrammingSessions}`,
                '',
                '## 🤖 AI Assistance',
                `- **Total Queries**: ${metrics.aiAssistance.queriesTotal}`,
                `- **Avg Response Time**: ${metrics.aiAssistance.avgResponseTime}ms`,
                `- **Context Quality**: ${(metrics.aiAssistance.contextQuality * 100).toFixed(1)}%`,
                `- **Handoff Success Rate**: ${(metrics.aiAssistance.handoffSuccessRate * 100).toFixed(1)}%`,
                '',
                '## 🎯 Focus & Attention',
                `- **Task Completion Rate**: ${(metrics.focus.taskCompletionRate * 100).toFixed(1)}%`,
                `- **Context Switches/Hour**: ${metrics.focus.contextSwitchesPerHour.toFixed(1)}`,
                `- **Avg Session Length**: ${(metrics.focus.averageSessionLength / 60).toFixed(1)} minutes`,
                `- **Interruption Frequency**: ${(metrics.focus.interruptionFrequency * 100).toFixed(1)}%`,
            ];
            return {
                content: [{
                        type: 'text',
                        text: sections.join('\n')
                    }]
            };
        }
        catch (error) {
            console.error('[ANALYTICS] Error getting dashboard metrics:', error);
            return {
                content: [{
                        type: 'text',
                        text: `# Dashboard Metrics Error ❌\n\nError: ${error instanceof Error ? error.message : String(error)}\n\nAnalytics data may not be available yet.`
                    }]
            };
        }
    }
    /**
     * Get file hotspots analytics
     */
    async getFileHotspots(projectId, days = 7) {
        try {
            const hotspots = await this.analytics.getFileHotspots(projectId, days);
            if (hotspots.length === 0) {
                return {
                    content: [{
                            type: 'text',
                            text: [
                                '# File Hotspots 🔥',
                                '',
                                'No file activity data available for the specified period.',
                                '',
                                '## Getting Started',
                                'File hotspots will appear as your team works on the project.',
                                'Analytics track modification frequency, contributors, and risk levels.'
                            ].join('\n')
                        }]
                };
            }
            const sections = [
                '# File Hotspots 🔥',
                '',
                `**Analysis Period**: Last ${days} days`,
                `**Project**: ${projectId}`,
                '',
                'Files that need attention based on activity patterns:',
                ''
            ];
            // Group by risk level
            const highRisk = hotspots.filter(f => f.riskLevel === 'high_risk');
            const moderateRisk = hotspots.filter(f => f.riskLevel === 'moderate_risk');
            const lowRisk = hotspots.filter(f => f.riskLevel === 'low_risk');
            if (highRisk.length > 0) {
                sections.push('## 🚨 High Risk Files');
                sections.push('');
                highRisk.forEach(file => {
                    sections.push(`### ${file.filePath}`);
                    sections.push(`- **Modifications**: ${file.modificationCount}`);
                    sections.push(`- **Contributors**: ${file.uniqueContributors}`);
                    sections.push(`- **Time Spent**: ${file.hoursSpent.toFixed(1)}h`);
                    sections.push(`- **Complexity**: ${file.complexityScore.toFixed(2)}`);
                    sections.push(`- **Bug Frequency**: ${(file.bugFrequency * 100).toFixed(1)}%`);
                    sections.push('');
                });
            }
            if (moderateRisk.length > 0) {
                sections.push('## ⚠️ Moderate Risk Files');
                sections.push('');
                moderateRisk.slice(0, 5).forEach(file => {
                    sections.push(`### ${file.filePath}`);
                    sections.push(`- **Modifications**: ${file.modificationCount} | **Contributors**: ${file.uniqueContributors} | **Time**: ${file.hoursSpent.toFixed(1)}h`);
                    sections.push(`- **Complexity**: ${file.complexityScore.toFixed(2)} | **Bug Rate**: ${(file.bugFrequency * 100).toFixed(1)}%`);
                    sections.push('');
                });
            }
            if (lowRisk.length > 0) {
                sections.push('## ✅ Low Risk Files (Most Active)');
                sections.push('');
                lowRisk.slice(0, 3).forEach(file => {
                    sections.push(`- **${file.filePath}**: ${file.modificationCount} modifications, ${file.hoursSpent.toFixed(1)}h`);
                });
            }
            return {
                content: [{
                        type: 'text',
                        text: sections.join('\n')
                    }]
            };
        }
        catch (error) {
            console.error('[ANALYTICS] Error getting file hotspots:', error);
            return {
                content: [{
                        type: 'text',
                        text: `# File Hotspots Error ❌\n\nError: ${error instanceof Error ? error.message : String(error)}\n\nFile activity data may not be available yet.`
                    }]
            };
        }
    }
    /**
     * Get team analytics summary
     */
    async getTeamAnalytics(teamId, projectId, periodType = 'weekly') {
        try {
            const analytics = await this.analytics.getTeamAnalytics(teamId, projectId, periodType);
            if (!analytics) {
                return {
                    content: [{
                            type: 'text',
                            text: [
                                '# Team Analytics 📈',
                                '',
                                `No ${periodType} analytics data available yet.`,
                                '',
                                '## Getting Started',
                                'Team analytics will be generated as your team collaborates on the project.',
                                'Data includes productivity trends, collaboration patterns, and code health metrics.'
                            ].join('\n')
                        }]
                };
            }
            const periodLabel = `${periodType.charAt(0).toUpperCase() + periodType.slice(1)} Report`;
            const startDate = analytics.periodStart.toLocaleDateString();
            const endDate = analytics.periodEnd.toLocaleDateString();
            const sections = [
                `# Team Analytics 📈 - ${periodLabel}`,
                '',
                `**Period**: ${startDate} to ${endDate}`,
                `**Team**: ${teamId}`,
                `**Project**: ${projectId}`,
                '',
                '## 👥 Team Activity',
                `- **Active Developers**: ${analytics.totalDevelopers}`,
                `- **Active Sessions**: ${analytics.activeSessions}`,
                `- **Total Session Time**: ${(analytics.totalSessionTime / 3600).toFixed(1)}h`,
                `- **Average Session Length**: ${(analytics.averageSessionLength / 60).toFixed(1)} minutes`,
                '',
                '## 🔧 Code Health',
                `- **Total Commits**: ${analytics.totalCommits}`,
                `- **Files Modified**: ${analytics.totalFilesModified}`,
                `- **Build Success Rate**: ${(analytics.buildSuccessRate * 100).toFixed(1)}%`,
                '',
                '## 🤖 AI & Context',
                `- **Context Queries**: ${analytics.contextQueriesTotal}`,
                `- **Average Context Quality**: ${(analytics.avgContextQuality * 100).toFixed(1)}%`,
                `- **Handoff Success Rate**: ${(analytics.handoffSuccessRate * 100).toFixed(1)}%`,
                `- **AI Effectiveness**: ${(analytics.aiEffectivenessScore * 100).toFixed(1)}%`,
            ];
            if (analytics.primaryFocusAreas.length > 0) {
                sections.push('', '## 🎯 Primary Focus Areas');
                analytics.primaryFocusAreas.forEach(area => {
                    sections.push(`- ${area}`);
                });
            }
            if (Object.keys(analytics.technologyUsage).length > 0) {
                sections.push('', '## 💻 Technology Usage');
                Object.entries(analytics.technologyUsage)
                    .sort(([, a], [, b]) => b - a)
                    .slice(0, 5)
                    .forEach(([tech, percentage]) => {
                    sections.push(`- **${tech}**: ${(percentage * 100).toFixed(1)}%`);
                });
            }
            return {
                content: [{
                        type: 'text',
                        text: sections.join('\n')
                    }]
            };
        }
        catch (error) {
            console.error('[ANALYTICS] Error getting team analytics:', error);
            return {
                content: [{
                        type: 'text',
                        text: `# Team Analytics Error ❌\n\nError: ${error instanceof Error ? error.message : String(error)}\n\nTeam analytics data may not be available yet.`
                    }]
            };
        }
    }
    /**
     * Verify webhook signature for security
     */
    verifyWebhookSignature(payload, signature, secret) {
        try {
            const hmac = crypto.createHmac('sha256', secret);
            hmac.update(payload);
            const computedSignature = `sha256=${hmac.digest('hex')}`;
            return crypto.timingSafeEqual(Buffer.from(signature), Buffer.from(computedSignature));
        }
        catch (error) {
            console.error('[WEBHOOK] Signature verification failed:', error);
            return false;
        }
    }
    /**
     * Process git events and update context accordingly
     */
    async processGitEvent(projectId, gitEvent) {
        const timestamp = new Date().toISOString();
        try {
            // Determine which teams/contexts need updating
            const affectedContexts = Array.from(this.contextManagers.entries())
                .filter(([key]) => key.includes(projectId));
            if (affectedContexts.length === 0) {
                console.log(`[${timestamp}] ℹ️  No active contexts found for project ${projectId}`);
                return;
            }
            // Analyze the scope of changes
            const updateScope = GitIntegration.getContextUpdateScope(gitEvent.files);
            console.log(`[${timestamp}] 🔍 Update scope: ${updateScope.updateType} (${updateScope.affectedFiles.length} files)`);
            // Update each affected context
            for (const [contextKey, contextManager] of affectedContexts) {
                const [teamId] = contextKey.split(':');
                console.log(`[${timestamp}] 🔄 Updating context for team: ${teamId}`);
                if (updateScope.needsFullScan) {
                    // Full context refresh for structural changes
                    await contextManager.refreshProjectContext();
                    console.log(`[${timestamp}] 🔄 Full context refresh completed for ${teamId}`);
                }
                else {
                    // Incremental updates for file changes
                    await contextManager.updateFilesContext(updateScope.affectedFiles);
                    console.log(`[${timestamp}] ⚡ Incremental update completed for ${teamId}`);
                }
                // Track git event activity in database
                try {
                    await this.db.trackActivity(teamId, projectId, undefined, 'git_event', {
                        type: gitEvent.type,
                        author: gitEvent.author,
                        message: gitEvent.message,
                        files: gitEvent.files,
                        timestamp: gitEvent.timestamp,
                        branch: gitEvent.branch,
                        updateScope: updateScope.updateType,
                    });
                }
                catch (error) {
                    console.error('[DB] Failed to track git event activity:', error);
                }
                // Track context update activity in database
                try {
                    await this.db.trackActivity(teamId, projectId, undefined, 'context_updated', {
                        projectId,
                        trigger: 'git_webhook',
                        author: gitEvent.author,
                        changes: gitEvent.files.length,
                        updateType: updateScope.updateType,
                        timestamp: new Date(),
                    });
                }
                catch (error) {
                    console.error('[DB] Failed to track context update activity:', error);
                }
            }
            console.log(`[${timestamp}] ✅ Git event processing completed for ${affectedContexts.length} team(s)`);
        }
        catch (error) {
            console.error(`[${timestamp}] ❌ Error processing git event:`, error);
            throw error;
        }
    }
    async start(port = 3031) {
        try {
            // Initialize database connection
            console.log('[DB] Connecting to database...');
            await this.db.connect();
            console.log('[DB] ✅ Database connected successfully');
            // Clean up expired contexts on startup
            const expiredCount = await this.db.deleteExpiredContexts();
            if (expiredCount > 0) {
                console.log(`[DB] Cleaned up ${expiredCount} expired contexts`);
            }
            this.server.listen(port, () => {
                const timestamp = new Date().toISOString();
                console.log(`[${timestamp}] 🌐 Remote Ginko Server running on port ${port}`);
                console.log(`[${timestamp}] 🗄️  Database persistence: ENABLED`);
                console.log(`[${timestamp}] 🔗 HTTP API: http://localhost:${port}`);
                console.log(`[${timestamp}] 📋 Health check: http://localhost:${port}/health`);
                console.log(`[${timestamp}] 🎯 Ready for MCP client connections!`);
                console.log(`[${timestamp}] 👀 Watching for team collaboration activity...`);
            });
        }
        catch (error) {
            console.error('[DB] ❌ Failed to connect to database:', error);
            console.log('[SERVER] Starting without database persistence (using in-memory storage)');
            this.server.listen(port, () => {
                const timestamp = new Date().toISOString();
                console.log(`[${timestamp}] 🌐 Remote Ginko Server running on port ${port}`);
                console.log(`[${timestamp}] ⚠️  Database persistence: DISABLED (using in-memory storage)`);
                console.log(`[${timestamp}] 🔗 HTTP API: http://localhost:${port}`);
                console.log(`[${timestamp}] 📋 Health check: http://localhost:${port}/health`);
                console.log(`[${timestamp}] 🎯 Ready for MCP client connections!`);
            });
        }
    }
    /**
     * Initialize session with all context for seamless startup
     */
    async initializeSession(teamId, projectId, userId, autoResume = true) {
        try {
            const sections = [];
            sections.push('# 🚀 Ginko Session Initialized\n');
            // 1. Load critical best practices
            const contextManager = new CollaborativeContextManager(teamId, projectId, this.db);
            // Get best practices using the BestPracticesManager
            const teamPractices = await this.db.getTeamBestPractices(teamId);
            const criticalPractices = teamPractices.filter(p => p.priority === 'critical');
            const formattedPractices = BestPracticesManager.formatPracticesForContext(criticalPractices);
            sections.push('## 📋 Critical Development Practices\n');
            sections.push(`*Loaded ${criticalPractices.length} critical practices:*`);
            sections.push(formattedPractices);
            sections.push('');
            // 2. Get project overview
            try {
                const overview = await contextManager.getProjectOverview();
                sections.push('\n## 🏗️ Project Overview\n');
                if (overview?.content?.[0]?.text) {
                    const overviewText = overview.content[0].text;
                    const fileCount = overviewText.match(/\*\*Total Files\*\*: (\d+)/)?.[1] || 'Unknown';
                    const keyFileCount = overviewText.match(/\*\*Key Files Identified\*\*: (\d+)/)?.[1] || 'Unknown';
                    sections.push(`*Analyzed ${fileCount} files, identified ${keyFileCount} key files:*`);
                    sections.push(overviewText);
                }
                else {
                    sections.push('*Project overview temporarily unavailable*');
                }
                sections.push('');
            }
            catch (error) {
                console.error('[INIT] Error getting project overview:', error);
                sections.push('\n## 🏗️ Project Overview\n');
                sections.push('*Project overview failed to load*');
                sections.push('');
            }
            // 3. Check for recent sessions to resume
            if (autoResume) {
                const sessions = await this.db.getUserSessions(userId, teamId, 1);
                if (sessions.length > 0) {
                    const recentSession = sessions[0];
                    const hoursSinceLastActive = Math.round((Date.now() - new Date(recentSession.createdAt).getTime()) / 1000 / 60 / 60);
                    if (hoursSinceLastActive < 24) {
                        sections.push('\n## 🔄 Recent Session Available\n');
                        sections.push(`*Found resumable session from ${hoursSinceLastActive} hours ago:*`);
                        sections.push(`**Last Active**: ${hoursSinceLastActive} hours ago`);
                        sections.push(`**Task**: ${recentSession.currentTask}`);
                        sections.push(`**Context Quality**: ${Math.round(recentSession.contextQuality * 100)}%`);
                        sections.push(`**Session ID**: \`${recentSession.id}\``);
                        sections.push(`\nTo resume: \`resume_session sessionId="${recentSession.id}"\``);
                        sections.push('');
                    }
                    else {
                        sections.push('\n## 📝 Session Status\n');
                        sections.push(`*No recent sessions found (last session was ${hoursSinceLastActive} hours ago)*`);
                        sections.push('');
                    }
                }
            }
            // 4. Add team activity
            try {
                const teamActivity = await this.getTeamActivity(teamId, projectId);
                sections.push('\n## 👥 Team Activity\n');
                if (teamActivity?.content?.[0]?.text) {
                    sections.push(teamActivity.content[0].text);
                }
                else {
                    sections.push('*Team activity temporarily unavailable*');
                }
                sections.push('');
            }
            catch (error) {
                console.error('[INIT] Error getting team activity:', error);
                sections.push('\n## 👥 Team Activity\n');
                sections.push('*Team activity failed to load*');
                sections.push('');
            }
            // 5. Add context verification details
            sections.push('\n## 🔍 Context Verification\n');
            sections.push(`**Project**: Ginko (${teamId.substring(0, 8)}...)`);
            sections.push(`**Working Directory**: ${process.cwd()}`);
            sections.push(`**Database**: Connected (${this.db ? '✅' : '❌'})`);
            sections.push(`**Team Practices**: ${criticalPractices.length} critical practices loaded`);
            // Extract file count from sections if available
            const overviewSection = sections.find(s => s.includes('Total Files'));
            const fileCount = overviewSection?.match(/(\d+) files/)?.[1] || 'Unknown';
            sections.push(`**Files Analyzed**: ${fileCount} files`);
            sections.push(`**Status**: ✅ Context loaded successfully`);
            // 6. Add quick start guide
            sections.push('\n## 🎯 Quick Start\n');
            sections.push('1. **Continue existing work**: Use `resume_session` with a session ID above');
            sections.push('2. **Start new task**: Just describe what you want to work on');
            sections.push('3. **Capture progress**: Use `capture_session` before switching contexts');
            sections.push('');
            sections.push('**Status**: ✅ All context loaded successfully. Ready to work!');
            return {
                content: [{
                        type: 'text',
                        text: sections.join('\n')
                    }]
            };
        }
        catch (error) {
            console.error('[INIT] Error initializing session:', error);
            // Return partial context even if some parts fail
            return {
                content: [{
                        type: 'text',
                        text: '# Ginko Session Started\n\nSession initialized. Some context loading failed but core tools are available.\n\nUse `get_best_practices`, `get_project_overview`, or `list_sessions` to load specific context.'
                    }]
            };
        }
    }
    /**
     * Migrate local sessions to database
     */
    async migrateLocalSessions() {
        const sessionManager = new SessionHandoffManager(this.db);
        const sessionsDir = '.contextmcp/sessions';
        try {
            // Check if legacy sessions directory exists
            try {
                await fs.access(sessionsDir);
            }
            catch (error) {
                // Directory doesn't exist - migration not needed (expected for database-first setup)
                console.log('[MIGRATION] No legacy sessions directory found - migration not needed');
                return { migratedCount: 0, message: 'No legacy sessions to migrate' };
            }
            const files = await fs.readdir(sessionsDir);
            const sessionFiles = files.filter(f => f.endsWith('.json'));
            let migratedCount = 0;
            let skippedCount = 0;
            let errorCount = 0;
            const results = [];
            for (const file of sessionFiles) {
                try {
                    const content = await fs.readFile(join(sessionsDir, file), 'utf-8');
                    const session = JSON.parse(content);
                    // Check if session already exists in database
                    const existing = await this.db.query('SELECT session_key FROM user_sessions WHERE session_key = $1', [session.id]);
                    if (existing.rows.length > 0) {
                        results.push(`⚠️ Skipped ${session.id} (already exists)`);
                        skippedCount++;
                        continue;
                    }
                    // Insert session into database
                    await this.db.query(`
            INSERT INTO user_sessions (
              session_key, user_id, team_id, project_id, 
              current_task, focus_areas, conversation_summary,
              key_decisions, created_at, last_accessed, 
              expires_at, context_quality, is_active
            ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, true)
          `, [
                        session.id,
                        session.userId,
                        session.teamId,
                        session.projectId,
                        session.currentTask,
                        JSON.stringify(session.focusAreas || []),
                        session.conversationSummary || '',
                        JSON.stringify(session.keyDecisions || []),
                        session.createdAt,
                        session.updatedAt || session.createdAt,
                        session.expiresAt,
                        session.contextQuality || 0.85
                    ]);
                    // Insert session data
                    await this.db.query(`
            INSERT INTO session_data (
              session_key, context_data, created_at
            ) VALUES ($1, $2, $3)
          `, [
                        session.id,
                        JSON.stringify(session),
                        session.createdAt
                    ]);
                    results.push(`✅ Migrated ${session.id}: ${session.currentTask.substring(0, 50)}...`);
                    migratedCount++;
                }
                catch (error) {
                    results.push(`❌ Error processing ${file}: ${error instanceof Error ? error.message : String(error)}`);
                    errorCount++;
                }
            }
            return {
                success: true,
                summary: {
                    migrated: migratedCount,
                    skipped: skippedCount,
                    errors: errorCount,
                    total: sessionFiles.length
                },
                details: results
            };
        }
        catch (error) {
            return {
                success: false,
                error: error instanceof Error ? error.message : String(error)
            };
        }
    }
    /**
     * Check if user has access to a specific MCP tool
     */
    async checkToolAccess(user, toolName) {
        // Map tools to required features
        const toolFeatureMap = {
            'get_project_overview': FeatureFlag.BASIC_CONTEXT,
            'find_relevant_code': FeatureFlag.BASIC_CONTEXT,
            'get_file_context': FeatureFlag.BASIC_CONTEXT,
            'get_recent_changes': FeatureFlag.GIT_INTEGRATION,
            'get_team_activity': FeatureFlag.TEAM_COLLABORATION,
            'get_best_practices': FeatureFlag.BEST_PRACTICES_MGMT,
            'suggest_best_practice': FeatureFlag.BEST_PRACTICES_MGMT,
            'capture_session': FeatureFlag.SESSION_HANDOFF,
            'resume_session': FeatureFlag.SESSION_HANDOFF,
            'list_sessions': FeatureFlag.LOCAL_SESSIONS,
            'get_dashboard_metrics': FeatureFlag.USAGE_ANALYTICS,
            'get_file_hotspots': FeatureFlag.TEAM_INSIGHTS,
            'get_team_analytics': FeatureFlag.PERFORMANCE_METRICS
        };
        const requiredFeature = toolFeatureMap[toolName];
        if (requiredFeature) {
            await this.entitlementsManager.checkFeatureAccess(user, requiredFeature);
        }
        // Check rate limits for context queries
        if (['get_project_overview', 'find_relevant_code', 'get_file_context'].includes(toolName)) {
            await this.entitlementsManager.checkRateLimit(user, 'contextQueries');
            // Track context query for usage limits
            await this.usageTracker.trackForUser(user, UsageEventType.CONTEXT_QUERY, {
                metadata: { tool: toolName }
            });
        }
        // Check session creation limits
        if (['capture_session'].includes(toolName)) {
            await this.entitlementsManager.checkUsageLimit(user, 'sessions', 'create');
            await this.entitlementsManager.checkRateLimit(user, 'sessionCreation');
        }
    }
    /**
     * Setup billing and authentication routes
     */
    setupBillingRoutes() {
        // Stripe webhook endpoint (no auth required, verified by signature)
        this.app.post('/webhooks/stripe', express.raw({ type: 'application/json' }), async (req, res) => {
            try {
                const signature = req.headers['stripe-signature'];
                await this.billingManager.handleWebhook(req.body, signature);
                res.status(200).send('OK');
            }
            catch (error) {
                console.error('[BILLING] Stripe webhook error:', error);
                res.status(400).send('Webhook Error');
            }
        });
        // API key generation (requires admin authentication)
        this.app.post('/api/auth/generate-key', this.authManager.createAuthMiddleware(), this.authManager.requirePermission('organization:manage'), async (req, res) => {
            try {
                const user = req.user;
                const { description, expiresAt } = req.body;
                const apiKey = await this.authManager.generateApiKey({
                    userId: user.id,
                    description,
                    expiresAt: expiresAt ? new Date(expiresAt) : undefined
                });
                // Track API key generation
                await this.usageTracker.trackForUser(user, UsageEventType.API_REQUEST, {
                    metadata: { action: 'api_key_generated' }
                });
                res.json({
                    key: apiKey.key,
                    prefix: apiKey.prefix,
                    expiresAt: apiKey.expiresAt
                });
            }
            catch (error) {
                console.error('[AUTH] API key generation error:', error);
                res.status(500).json({ error: 'Failed to generate API key' });
            }
        });
        // Billing customer creation
        this.app.post('/api/billing/customer', this.authManager.createAuthMiddleware(), this.authManager.requirePermission('billing:manage'), async (req, res) => {
            try {
                const user = req.user;
                const { billingEmail, name, address } = req.body;
                const customer = await this.billingManager.createCustomer(user.organizationId, billingEmail || user.email, name, address);
                res.json(customer);
            }
            catch (error) {
                console.error('[BILLING] Customer creation error:', error);
                res.status(500).json({ error: 'Failed to create customer' });
            }
        });
        // Subscription creation
        this.app.post('/api/billing/subscription', this.authManager.createAuthMiddleware(), this.authManager.requirePermission('billing:manage'), async (req, res) => {
            try {
                const user = req.user;
                const { planTier, interval = 'month', paymentMethodId } = req.body;
                const subscription = await this.billingManager.createSubscription(user.organizationId, planTier, interval, paymentMethodId);
                res.json(subscription);
            }
            catch (error) {
                console.error('[BILLING] Subscription creation error:', error);
                res.status(500).json({ error: 'Failed to create subscription' });
            }
        });
        // Subscription update (upgrade/downgrade)
        this.app.put('/api/billing/subscription', this.authManager.createAuthMiddleware(), this.authManager.requirePermission('billing:manage'), async (req, res) => {
            try {
                const user = req.user;
                const { planTier, interval = 'month' } = req.body;
                const subscription = await this.billingManager.updateSubscription(user.organizationId, planTier, interval);
                res.json(subscription);
            }
            catch (error) {
                console.error('[BILLING] Subscription update error:', error);
                res.status(500).json({ error: 'Failed to update subscription' });
            }
        });
        // Cancel subscription
        this.app.delete('/api/billing/subscription', this.authManager.createAuthMiddleware(), this.authManager.requirePermission('billing:manage'), async (req, res) => {
            try {
                const user = req.user;
                const { cancelAtPeriodEnd = true } = req.body;
                const subscription = await this.billingManager.cancelSubscription(user.organizationId, cancelAtPeriodEnd);
                res.json(subscription);
            }
            catch (error) {
                console.error('[BILLING] Subscription cancellation error:', error);
                res.status(500).json({ error: 'Failed to cancel subscription' });
            }
        });
        // Customer portal session
        this.app.post('/api/billing/portal', this.authManager.createAuthMiddleware(), async (req, res) => {
            try {
                const user = req.user;
                const { returnUrl } = req.body;
                const session = await this.billingManager.createPortalSession(user.organizationId, returnUrl);
                res.json(session);
            }
            catch (error) {
                console.error('[BILLING] Portal session error:', error);
                res.status(500).json({ error: 'Failed to create portal session' });
            }
        });
        // Usage analytics
        this.app.get('/api/usage', this.authManager.createAuthMiddleware(), async (req, res) => {
            try {
                const user = req.user;
                const { period = 'month', eventType } = req.query;
                const usage = await this.usageTracker.getUsageSummary(user.organizationId, period, new Date());
                res.json(usage);
            }
            catch (error) {
                console.error('[USAGE] Usage query error:', error);
                res.status(500).json({ error: 'Failed to get usage data' });
            }
        });
        // Team activity polling endpoint (replaces WebSocket broadcasts)
        this.app.get('/api/mcp/activity/:teamId', async (req, res) => {
            try {
                const user = req.user || {
                    planTier: 'enterprise',
                    planStatus: 'active',
                    organizationId: 'local-dev',
                    id: 'local-user',
                    email: 'dev@localhost'
                };
                const { teamId } = req.params;
                const { since, projectId } = req.query;
                // Get team activities since timestamp
                const activities = await this.db.getTeamActivity(teamId, projectId, since ? 24 : 1);
                res.json({
                    activities: activities || [],
                    timestamp: new Date().toISOString()
                });
            }
            catch (error) {
                console.error('[API] Activity polling error:', error);
                res.status(500).json({ error: 'Failed to fetch team activity' });
            }
        });
        // Plan information
        this.app.get('/api/plans', (req, res) => {
            res.json({
                plans: this.billingManager.PLAN_PRICING,
                features: EntitlementsManager.getFeatureAvailability('free')
            });
        });
    }
}
// Start server if run directly
if (import.meta.url === `file://${process.argv[1]}`) {
    const server = new RemoteMCPServer();
    const port = parseInt(process.env.PORT || '3031');
    server.start(port);
}
export { RemoteMCPServer, CollaborativeContextManager };
//# sourceMappingURL=remote-server.js.map