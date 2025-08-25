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
import { Pool } from 'pg';
import { createHash, randomUUID } from 'crypto';
export class DatabaseManager {
    pool;
    isConnected = false;
    // Default team UUID for when no team is specified
    static DEFAULT_TEAM_UUID = '00000000-0000-0000-0000-000000000001';
    constructor(config) {
        this.pool = new Pool({
            host: config.host,
            port: config.port,
            database: config.database,
            user: config.username,
            password: config.password,
            ssl: config.ssl ? {
                rejectUnauthorized: false,
                // Fix for Supabase SASL authentication issue
                checkServerIdentity: () => undefined
            } : false,
            max: 20, // Maximum number of connections
            idleTimeoutMillis: 30000,
            connectionTimeoutMillis: 10000,
        });
        this.pool.on('error', (err) => {
            console.error('[DB] Unexpected database error:', err);
        });
    }
    /**
     * Initialize database connection and test connectivity
     */
    async connect() {
        try {
            const client = await this.pool.connect();
            const result = await client.query('SELECT NOW() as timestamp');
            client.release();
            this.isConnected = true;
            console.log(`[DB] Connected successfully at ${result.rows[0].timestamp}`);
        }
        catch (error) {
            console.error('[DB] Connection failed:', error);
            throw new Error(`Database connection failed: ${error instanceof Error ? error.message : String(error)}`);
        }
    }
    /**
     * Close all database connections
     */
    async disconnect() {
        await this.pool.end();
        this.isConnected = false;
        console.log('[DB] Disconnected');
    }
    /**
     * Execute a query with error handling
     */
    async query(text, params) {
        if (!this.isConnected) {
            throw new Error('Database not connected');
        }
        try {
            const start = Date.now();
            const result = await this.pool.query(text, params);
            const duration = Date.now() - start;
            if (duration > 1000) {
                console.warn(`[DB] Slow query (${duration}ms): ${text.substring(0, 100)}...`);
            }
            return result;
        }
        catch (error) {
            console.error('[DB] Query error:', { query: text, params, error });
            throw error;
        }
    }
    /**
     * Convert team ID to proper UUID format
     * Handles "default-team" and other string IDs by converting to UUID
     */
    normalizeTeamId(teamId) {
        return this.normalizeToUUID(teamId, 'team');
    }
    /**
     * Convert project ID to proper UUID format
     * Handles "default-project" and other string IDs by converting to UUID
     */
    normalizeProjectId(projectId) {
        return this.normalizeToUUID(projectId, 'project');
    }
    /**
     * Generic UUID normalization function
     * Converts string IDs to proper UUID format for PostgreSQL compatibility
     */
    normalizeToUUID(id, type) {
        // If it's already a valid UUID format, return as-is
        const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
        if (uuidRegex.test(id)) {
            return id;
        }
        // Handle common default IDs
        if (type === 'team' && (id === 'default-team' || id === 'default')) {
            return DatabaseManager.DEFAULT_TEAM_UUID;
        }
        if (type === 'project' && (id === 'default-project' || id === 'default')) {
            return '00000000-0000-0000-0000-000000000002'; // Different UUID for default project
        }
        // For other string IDs, generate a consistent UUID based on the string
        // This ensures the same string always maps to the same UUID
        const hash = createHash('sha256').update(`${type}:${id}`).digest('hex');
        return `${hash.slice(0, 8)}-${hash.slice(8, 12)}-${hash.slice(12, 16)}-${hash.slice(16, 20)}-${hash.slice(20, 32)}`;
    }
    // ===================
    // TEAM MANAGEMENT
    // ===================
    async getTeamBySlug(organizationSlug, teamSlug) {
        const result = await this.query(`
      SELECT t.*, o.slug as org_slug
      FROM teams t
      JOIN organizations o ON t.organization_id = o.id
      WHERE o.slug = $1 AND t.slug = $2
    `, [organizationSlug, teamSlug]);
        return result.rows[0] || null;
    }
    async createTeam(organizationId, name, slug, settings = {}) {
        const result = await this.query(`
      INSERT INTO teams (organization_id, name, slug, settings)
      VALUES ($1, $2, $3, $4)
      RETURNING *
    `, [organizationId, name, slug, JSON.stringify(settings)]);
        return result.rows[0];
    }
    // ===================
    // PROJECT MANAGEMENT
    // ===================
    async getProjectBySlug(teamId, projectSlug) {
        const result = await this.query(`
      SELECT * FROM projects
      WHERE team_id = $1 AND slug = $2 AND is_active = true
    `, [teamId, projectSlug]);
        return result.rows[0] || null;
    }
    async createProject(teamId, name, slug, repositoryUrl, repositoryProvider, settings = {}) {
        const result = await this.query(`
      INSERT INTO projects (team_id, name, slug, repository_url, repository_provider, settings)
      VALUES ($1, $2, $3, $4, $5, $6)
      RETURNING *
    `, [teamId, name, slug, repositoryUrl, repositoryProvider, JSON.stringify(settings)]);
        return result.rows[0];
    }
    // ===================
    // CONTEXT MANAGEMENT
    // ===================
    async getProjectContext(projectId, contextType, contextKey) {
        const result = await this.query(`
      SELECT * FROM project_contexts
      WHERE project_id = $1 AND context_type = $2 AND context_key = $3
      AND (expires_at IS NULL OR expires_at > NOW())
    `, [projectId, contextType, contextKey]);
        return result.rows[0] || null;
    }
    async saveProjectContext(projectId, contextType, contextKey, contextData, metadata = {}, expiresAt) {
        const result = await this.query(`
      INSERT INTO project_contexts (project_id, context_type, context_key, context_data, metadata, expires_at)
      VALUES ($1, $2, $3, $4, $5, $6)
      ON CONFLICT (project_id, context_type, context_key)
      DO UPDATE SET
        context_data = EXCLUDED.context_data,
        metadata = EXCLUDED.metadata,
        expires_at = EXCLUDED.expires_at,
        updated_at = NOW()
      RETURNING *
    `, [projectId, contextType, contextKey, JSON.stringify(contextData), JSON.stringify(metadata), expiresAt]);
        return result.rows[0];
    }
    async deleteExpiredContexts() {
        const result = await this.query(`
      DELETE FROM project_contexts
      WHERE expires_at IS NOT NULL AND expires_at <= NOW()
    `);
        return result.rowCount || 0;
    }
    // ===================
    // GIT EVENT TRACKING
    // ===================
    async saveGitEvent(projectId, gitEvent, webhookPayload) {
        await this.query(`
      INSERT INTO git_events (
        project_id, event_type, commit_hash, branch, author_name, author_email,
        message, files_changed, webhook_payload, timestamp
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
    `, [
            projectId,
            gitEvent.type,
            gitEvent.hash,
            gitEvent.branch,
            gitEvent.author,
            null, // author_email - would extract from webhook
            gitEvent.message,
            JSON.stringify(gitEvent.files.map(file => ({ type: 'modified', path: file }))),
            webhookPayload ? JSON.stringify(webhookPayload) : null,
            gitEvent.timestamp
        ]);
        console.log(`[DB] Saved git event: ${gitEvent.type} by ${gitEvent.author} (${gitEvent.files.length} files)`);
    }
    async getRecentGitEvents(projectId, days = 7) {
        const result = await this.query(`
      SELECT * FROM git_events
      WHERE project_id = $1 AND timestamp >= NOW() - INTERVAL '${days} days'
      ORDER BY timestamp DESC
      LIMIT 100
    `, [projectId]);
        return result.rows.map(row => ({
            type: row.event_type,
            author: row.author_name,
            message: row.message,
            files: JSON.parse(row.files_changed).map((f) => f.path),
            timestamp: new Date(row.timestamp),
            hash: row.commit_hash,
            branch: row.branch,
        }));
    }
    // ===================
    // TEAM ACTIVITY TRACKING
    // ===================
    async trackActivity(teamId, projectId, userId, activityType, activityData, durationMs) {
        await this.query(`
      INSERT INTO team_activities (team_id, project_id, user_id, activity_type, activity_data, duration_ms)
      VALUES ($1, $2, $3, $4, $5, $6)
    `, [teamId, projectId, userId, activityType, JSON.stringify(activityData), durationMs]);
    }
    async getTeamActivity(teamId, projectId, hours = 24) {
        const result = await this.query(`
      SELECT 
        id,
        team_id as "teamId",
        project_id as "projectId", 
        user_id as "userId",
        activity_type as "activityType",
        activity_data as "activityData",
        duration_ms as "durationMs",
        created_at as "createdAt"
      FROM team_activities
      WHERE team_id = $1 AND project_id = $2
      AND created_at >= NOW() - INTERVAL '${hours} hours'
      ORDER BY created_at DESC
      LIMIT 100
    `, [teamId, projectId]);
        return result.rows;
    }
    // ===================
    // ANALYTICS AND INSIGHTS
    // ===================
    async getProjectStats(projectId) {
        const [queries, users, responseTime, commits] = await Promise.all([
            this.query('SELECT COUNT(*) as count FROM context_queries WHERE project_id = $1 AND created_at >= NOW() - INTERVAL \'7 days\'', [projectId]),
            this.query('SELECT COUNT(DISTINCT user_id) as count FROM team_activities WHERE project_id = $1 AND created_at >= NOW() - INTERVAL \'7 days\'', [projectId]),
            this.query('SELECT AVG(execution_time_ms) as avg FROM context_queries WHERE project_id = $1 AND created_at >= NOW() - INTERVAL \'7 days\'', [projectId]),
            this.query('SELECT COUNT(*) as count FROM git_events WHERE project_id = $1 AND timestamp >= NOW() - INTERVAL \'7 days\'', [projectId])
        ]);
        return {
            totalQueries: parseInt(queries.rows[0]?.count || '0'),
            activeUsers: parseInt(users.rows[0]?.count || '0'),
            avgResponseTime: parseFloat(responseTime.rows[0]?.avg || '0'),
            recentCommits: parseInt(commits.rows[0]?.count || '0'),
        };
    }
    // ===================
    // BEST PRACTICES MANAGEMENT
    // ===================
    async getTeamBestPractices(teamId) {
        const normalizedTeamId = this.normalizeTeamId(teamId);
        const result = await this.query(`
      SELECT * FROM team_best_practices
      WHERE team_id = $1 AND is_enabled = true
      ORDER BY 
        CASE priority 
          WHEN 'critical' THEN 1 
          WHEN 'high' THEN 2 
          WHEN 'medium' THEN 3 
          WHEN 'low' THEN 4 
        END,
        category, title
    `, [normalizedTeamId]);
        return result.rows.map(row => ({
            id: row.practice_id,
            category: row.category,
            title: row.title,
            description: row.description,
            rationale: row.rationale,
            examples: row.examples,
            priority: row.priority,
            tags: row.tags || []
        }));
    }
    async saveTeamBestPractice(teamId, practice, isCustom = false) {
        await this.query(`
      INSERT INTO team_best_practices (
        team_id, practice_id, category, title, description, rationale, 
        examples, priority, tags, is_custom, is_enabled
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
      ON CONFLICT (team_id, practice_id)
      DO UPDATE SET
        category = EXCLUDED.category,
        title = EXCLUDED.title,
        description = EXCLUDED.description,
        rationale = EXCLUDED.rationale,
        examples = EXCLUDED.examples,
        priority = EXCLUDED.priority,
        tags = EXCLUDED.tags,
        is_custom = EXCLUDED.is_custom,
        is_enabled = EXCLUDED.is_enabled,
        updated_at = NOW()
    `, [
            teamId,
            practice.id,
            practice.category,
            practice.title,
            practice.description,
            practice.rationale,
            JSON.stringify(practice.examples || {}),
            practice.priority,
            JSON.stringify(practice.tags),
            isCustom,
            true
        ]);
    }
    async initializeTeamBestPractices(teamId, defaultPractices) {
        for (const practice of defaultPractices) {
            await this.saveTeamBestPractice(teamId, practice, false);
        }
        console.log(`[DB] Initialized ${defaultPractices.length} best practices for team ${teamId}`);
    }
    async disableTeamBestPractice(teamId, practiceId) {
        await this.query(`
      UPDATE team_best_practices 
      SET is_enabled = false, updated_at = NOW()
      WHERE team_id = $1 AND practice_id = $2
    `, [teamId, practiceId]);
    }
    async enableTeamBestPractice(teamId, practiceId) {
        await this.query(`
      UPDATE team_best_practices 
      SET is_enabled = true, updated_at = NOW()
      WHERE team_id = $1 AND practice_id = $2
    `, [teamId, practiceId]);
    }
    // ===================
    // SESSION HANDOFF MANAGEMENT
    // ===================
    async saveSession(sessionContext) {
        // Prepare content JSONB with all session data
        const content = {
            workingDirectory: sessionContext.workingDirectory,
            focusAreas: sessionContext.focusAreas,
            conversationSummary: sessionContext.conversationSummary,
            keyDecisions: sessionContext.keyDecisions,
            recentFiles: sessionContext.recentFiles,
            openTasks: sessionContext.openTasks,
            activeFeatures: sessionContext.activeFeatures,
            currentChallenges: sessionContext.currentChallenges,
            discoveries: sessionContext.discoveries,
            recentCommands: sessionContext.recentCommands,
            // Include handoffContent in the content JSONB if it exists
            handoffContent: sessionContext.handoffContent
        };
        // Prepare metadata JSONB  
        const metadata = {
            ...sessionContext.metadata,
            teamId: sessionContext.teamId, // Store team/project info in metadata for MVP
            projectId: sessionContext.projectId,
            expiresAt: sessionContext.expiresAt?.toISOString()
        };
        try {
            await this.query(`
        INSERT INTO sessions (
          id, user_id, title, description, content, metadata
        )
        VALUES ($1, $2, $3, $4, $5, $6)
        ON CONFLICT (id)
        DO UPDATE SET
          title = EXCLUDED.title,
          description = EXCLUDED.description,
          content = EXCLUDED.content,
          metadata = EXCLUDED.metadata,
          updated_at = NOW()
      `, [
                sessionContext.id,
                sessionContext.userId,
                sessionContext.currentTask,
                `Session captured at ${new Date().toLocaleString()}`,
                JSON.stringify(content),
                JSON.stringify(metadata)
            ]);
            console.log(`[DB] Session ${sessionContext.id} saved to MVP sessions table successfully`);
        }
        catch (error) {
            // Handle foreign key constraint error for user_id
            if (error.code === '23503' && error.constraint === 'sessions_user_id_fkey') {
                console.error(`[DB] User ${sessionContext.userId} does not exist in auth.users table. Session storage failed.`);
                throw new Error(`User does not exist in authentication system. Please re-authenticate.`);
            }
            // Re-throw other errors
            throw error;
        }
    }
    async loadSession(sessionId) {
        const result = await this.query(`
      SELECT * FROM sessions
      WHERE id = $1 AND is_archived = false
    `, [sessionId]);
        if (result.rows.length === 0)
            return null;
        const row = result.rows[0];
        const content = row.content || {};
        const metadata = row.metadata || {};
        // Check if session is expired (if expiresAt in metadata)
        if (metadata.expiresAt && new Date(metadata.expiresAt) < new Date()) {
            return null;
        }
        return {
            id: row.id,
            userId: row.user_id,
            teamId: metadata.teamId || row.user_id, // MVP: fallback to user_id
            projectId: metadata.projectId || 'default-project',
            createdAt: new Date(row.created_at),
            updatedAt: new Date(row.updated_at),
            expiresAt: metadata.expiresAt ? new Date(metadata.expiresAt) : undefined,
            // Mode-aware context (NEW!)
            currentMode: content.currentMode || 'building',
            nextMode: content.nextMode,
            modeRationale: content.modeRationale,
            rapportContext: content.rapportContext,
            embeddedContext: content.embeddedContext,
            workingDirectory: content.workingDirectory || process.cwd(),
            currentTask: row.title,
            focusAreas: content.focusAreas || [],
            conversationSummary: content.conversationSummary || '',
            keyDecisions: content.keyDecisions || [],
            recentFiles: content.recentFiles || [],
            openTasks: content.openTasks || [],
            activeFeatures: content.activeFeatures || [],
            currentChallenges: content.currentChallenges || [],
            discoveries: content.discoveries || [],
            recentCommands: content.recentCommands || [],
            metadata: {
                sessionDuration: metadata.sessionDuration || 0,
                totalTokensUsed: metadata.totalTokensUsed || 0,
                averageResponseTime: metadata.averageResponseTime || 0,
                productivityScore: parseFloat(metadata.productivityScore || '0'),
                contextQuality: parseFloat(metadata.contextQuality || '0')
            }
        };
    }
    async getUserSessions(userId, teamId, limit = 10) {
        const result = await this.query(`
      SELECT id, title, description, content, metadata, created_at, updated_at
      FROM sessions
      WHERE user_id = $1 AND is_archived = false
      ORDER BY updated_at DESC
      LIMIT $2
    `, [userId, limit]);
        return result.rows.map(row => {
            const content = row.content || {};
            const metadata = row.metadata || {};
            const isExpired = metadata.expiresAt ? new Date(metadata.expiresAt) < new Date() : false;
            return {
                id: row.id,
                projectId: metadata.projectId || 'default-project',
                currentTask: row.title || 'No task specified',
                createdAt: new Date(row.created_at),
                focusAreas: content.focusAreas || [],
                isExpired,
                contextQuality: parseFloat(metadata.contextQuality || '0'),
                content: row.content,
                title: row.title,
                description: row.description,
                metadata: row.metadata,
                updated_at: new Date(row.updated_at)
            };
        });
    }
    async createSessionSnapshot(sessionId, contextData, snapshotType, createdBy) {
        const contextJson = JSON.stringify(contextData);
        const contextHash = createHash('sha256').update(contextJson).digest('hex');
        await this.query(`
      INSERT INTO session_snapshots (
        session_id, snapshot_type, context_data, context_hash,
        created_by, file_count, total_size
      )
      VALUES (
        (SELECT id FROM user_sessions WHERE session_key = $1),
        $2, $3, $4, $5, $6, $7
      )
    `, [
            sessionId,
            snapshotType,
            contextData,
            contextHash,
            createdBy,
            contextData.recentFiles?.length || 0,
            contextJson.length
        ]);
        console.log(`[DB] Session snapshot created for ${sessionId}`);
    }
    async recordSessionHandoff(fromSessionId, toSessionId, userId, teamId, projectId, handoffType, metrics) {
        // Normalize IDs to proper UUID format
        const normalizedTeamId = this.normalizeTeamId(teamId);
        const normalizedProjectId = this.normalizeProjectId(projectId);
        await this.query(`
      INSERT INTO session_handoffs (
        from_session_id, to_session_id, user_id, team_id, project_id,
        handoff_type, context_preservation_score, resumption_time,
        original_context_size, compressed_context_size,
        context_items_preserved, context_items_lost
      )
      VALUES (
        (SELECT id FROM user_sessions WHERE session_key = $1),
        (SELECT id FROM user_sessions WHERE session_key = $2),
        $3, $4, $5, $6, $7, $8, $9, $10, $11, $12
      )
    `, [
            fromSessionId,
            toSessionId,
            userId,
            normalizedTeamId,
            normalizedProjectId,
            handoffType,
            metrics.contextPreservationScore,
            metrics.resumptionTime,
            metrics.originalContextSize,
            metrics.compressedContextSize,
            metrics.itemsPreserved,
            metrics.itemsLost
        ]);
        console.log(`[DB] Session handoff recorded: ${fromSessionId} → ${toSessionId}`);
    }
    async cleanupExpiredSessions() {
        const result = await this.query(`
      UPDATE user_sessions 
      SET is_active = false, updated_at = NOW()
      WHERE expires_at IS NOT NULL 
      AND expires_at <= NOW() 
      AND is_active = true
    `);
        const cleanedCount = result.rowCount || 0;
        if (cleanedCount > 0) {
            console.log(`[DB] Deactivated ${cleanedCount} expired sessions`);
        }
        return cleanedCount;
    }
    async getSessionHandoffMetrics(projectId, days = 30) {
        const result = await this.query(`
      SELECT 
        COUNT(*) as total_handoffs,
        AVG(resumption_time) as avg_resumption_time,
        AVG(context_preservation_score) as avg_context_preservation,
        AVG(CASE WHEN resumption_success THEN 1.0 ELSE 0.0 END) as success_rate
      FROM session_handoffs
      WHERE project_id = $1 
      AND created_at >= NOW() - INTERVAL '${days} days'
    `, [projectId]);
        const row = result.rows[0];
        return {
            totalHandoffs: parseInt(row.total_handoffs || '0'),
            averageResumptionTime: parseFloat(row.avg_resumption_time || '0'),
            averageContextPreservation: parseFloat(row.avg_context_preservation || '0'),
            successRate: parseFloat(row.success_rate || '0')
        };
    }
    // ===================
    // HEALTH AND MAINTENANCE
    // ===================
    async getHealthCheck() {
        const result = await this.query('SELECT NOW() as timestamp');
        const poolStats = {
            totalConnections: this.pool.totalCount,
            idleConnections: this.pool.idleCount,
            waitingClients: this.pool.waitingCount
        };
        return {
            status: 'healthy',
            timestamp: result.rows[0].timestamp,
            stats: poolStats
        };
    }
    // HANDOFF QUALITY ASSESSMENT
    // =========================
    async storeHandoffAssessment(assessment) {
        try {
            await this.query(`
        INSERT INTO handoff_assessments (
          id, session_id, user_id, team_id, timestamp,
          context_completeness, task_clarity, emotional_continuity, actionability, overall_score,
          feedback, missing_items, assessment_type, retrospective_data
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14)
        ON CONFLICT (session_id, assessment_type) 
        DO UPDATE SET
          context_completeness = EXCLUDED.context_completeness,
          task_clarity = EXCLUDED.task_clarity,
          emotional_continuity = EXCLUDED.emotional_continuity,
          actionability = EXCLUDED.actionability,
          overall_score = EXCLUDED.overall_score,
          feedback = EXCLUDED.feedback,
          missing_items = EXCLUDED.missing_items,
          retrospective_data = EXCLUDED.retrospective_data,
          updated_at = NOW()
      `, [
                randomUUID(),
                assessment.sessionId,
                assessment.userId,
                assessment.teamId,
                assessment.timestamp,
                assessment.scores.contextCompleteness,
                assessment.scores.taskClarity,
                assessment.scores.emotionalContinuity,
                assessment.scores.actionability,
                assessment.scores.overall,
                assessment.feedback,
                JSON.stringify(assessment.missingItems),
                assessment.assessmentType,
                assessment.retrospectiveData ? JSON.stringify(assessment.retrospectiveData) : null
            ]);
            console.log(`[DB] Stored handoff assessment for session ${assessment.sessionId} (${assessment.assessmentType})`);
        }
        catch (error) {
            // Graceful fallback if table doesn't exist yet
            console.warn(`[DB] Could not store handoff assessment: ${error}`);
            console.log(`[DB] Assessment data would be: ${JSON.stringify(assessment, null, 2)}`);
        }
    }
    async getHandoffAssessments(sessionId, teamId, limit = 50) {
        try {
            let query = `
        SELECT * FROM handoff_assessments 
        WHERE 1=1
      `;
            const params = [];
            if (sessionId) {
                query += ` AND session_id = $${params.length + 1}`;
                params.push(sessionId);
            }
            if (teamId) {
                query += ` AND team_id = $${params.length + 1}`;
                params.push(teamId);
            }
            query += ` ORDER BY timestamp DESC LIMIT $${params.length + 1}`;
            params.push(limit);
            const result = await this.query(query, params);
            return result.rows;
        }
        catch (error) {
            console.warn(`[DB] Could not fetch handoff assessments: ${error}`);
            return [];
        }
    }
    // =========================
    // SESSION SCORECARD STORAGE
    // =========================
    async storeSessionScorecard(scorecard) {
        try {
            await this.query(`
        INSERT INTO session_scorecards (
          session_id, user_id, team_id, project_id,
          session_start, session_end,
          scores, work_metrics, context_usage, mood,
          handoff_assessment, coaching, patterns, metadata
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14)
        ON CONFLICT (session_id) 
        DO UPDATE SET
          scores = EXCLUDED.scores,
          work_metrics = EXCLUDED.work_metrics,
          context_usage = EXCLUDED.context_usage,
          mood = EXCLUDED.mood,
          handoff_assessment = EXCLUDED.handoff_assessment,
          coaching = EXCLUDED.coaching,
          patterns = EXCLUDED.patterns,
          metadata = EXCLUDED.metadata,
          session_end = EXCLUDED.session_end,
          updated_at = NOW()
      `, [
                scorecard.session_id,
                scorecard.user_id,
                this.normalizeTeamId(scorecard.team_id),
                scorecard.project_id ? this.normalizeProjectId(scorecard.project_id) : null,
                scorecard.session_start,
                scorecard.session_end,
                JSON.stringify(scorecard.scores || {}),
                JSON.stringify(scorecard.work_metrics || {}),
                JSON.stringify(scorecard.context_usage || {}),
                JSON.stringify(scorecard.mood || {}),
                JSON.stringify(scorecard.handoff_assessment || {}),
                JSON.stringify(scorecard.coaching || {}),
                JSON.stringify(scorecard.patterns || {}),
                JSON.stringify(scorecard.metadata || {})
            ]);
            console.log(`[DB] Stored session scorecard for ${scorecard.session_id}`);
        }
        catch (error) {
            console.warn(`[DB] Could not store session scorecard: ${error}`);
            console.log(`[DB] Scorecard data would be: ${JSON.stringify(scorecard, null, 2)}`);
        }
    }
    async storeCoachingInsights(coaching) {
        try {
            // For now, we'll store this as part of the session scorecard
            // In the future, this could be its own table if needed
            await this.query(`
        UPDATE session_scorecards
        SET coaching = $2, updated_at = NOW()
        WHERE session_id = $1
      `, [
                coaching.session_id,
                JSON.stringify({
                    insights: coaching.insights,
                    recommendations: coaching.recommendations,
                    collaboration_context: coaching.collaboration_context,
                    challenges_summary: coaching.challenges_summary,
                    success_patterns: coaching.success_patterns,
                    generated_at: coaching.generated_at
                })
            ]);
            console.log(`[DB] Stored coaching insights for ${coaching.session_id}`);
        }
        catch (error) {
            console.warn(`[DB] Could not store coaching insights: ${error}`);
            console.log(`[DB] Coaching data would be: ${JSON.stringify(coaching, null, 2)}`);
        }
    }
}
export default DatabaseManager;
//# sourceMappingURL=database.js.map