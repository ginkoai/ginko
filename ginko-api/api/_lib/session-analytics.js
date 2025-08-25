#!/usr/bin/env node
export class SessionAnalytics {
    db;
    constructor(db) {
        this.db = db;
    }
    /**
     * Record a session event for real-time analytics
     */
    async recordSessionEvent(sessionId, userId, teamId, projectId, eventType, eventData, durationMs, success = true) {
        try {
            await this.db.query(`
        INSERT INTO session_events (
          session_id, user_id, team_id, project_id,
          event_type, event_data, duration_ms, success,
          active_files, current_focus, productivity_state
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
      `, [
                sessionId, userId, teamId, projectId,
                eventType, JSON.stringify(eventData), durationMs, success,
                JSON.stringify(eventData.activeFiles || []),
                eventData.currentFocus || null,
                eventData.productivityState || 'focused'
            ]);
        }
        catch (error) {
            console.error('[ANALYTICS] Error recording session event:', error);
            // Don't throw - analytics shouldn't break the main flow
        }
    }
    /**
     * Analyze session context and generate analytics data
     */
    async analyzeSession(sessionContext) {
        console.log(`[ANALYTICS] Analyzing session ${sessionContext.id}`);
        const analysisDate = new Date();
        analysisDate.setHours(0, 0, 0, 0); // Start of day
        // Calculate productivity metrics from session context
        const productivityMetrics = this.calculateProductivityMetrics(sessionContext);
        const collaborationMetrics = this.calculateCollaborationMetrics(sessionContext);
        const focusMetrics = this.calculateFocusMetrics(sessionContext);
        const analyticsData = {
            sessionId: sessionContext.id,
            userId: sessionContext.userId,
            teamId: sessionContext.teamId,
            projectId: sessionContext.projectId,
            analysisDate,
            // Time-based metrics
            sessionCount: 1,
            totalDuration: sessionContext.metadata.sessionDuration,
            activeCodingTime: productivityMetrics.activeCodingTime,
            contextSwitches: productivityMetrics.contextSwitches,
            // Productivity metrics
            filesModified: sessionContext.recentFiles.length,
            linesAdded: productivityMetrics.linesAdded,
            linesRemoved: productivityMetrics.linesRemoved,
            commitsMade: productivityMetrics.commitsMade,
            // AI interaction metrics
            aiQueries: productivityMetrics.aiQueries,
            aiResponseTimeAvg: sessionContext.metadata.averageResponseTime,
            contextQualityAvg: sessionContext.metadata.contextQuality,
            successfulHandoffs: productivityMetrics.successfulHandoffs,
            failedHandoffs: productivityMetrics.failedHandoffs,
            // Focus metrics
            taskCompletionRate: focusMetrics.taskCompletionRate,
            contextSwitchesPerHour: focusMetrics.contextSwitchesPerHour,
            deepWorkSessions: focusMetrics.deepWorkSessions,
            // Collaboration metrics
            filesShared: collaborationMetrics.filesShared,
            teamInteractions: collaborationMetrics.teamInteractions,
            knowledgeSharedScore: collaborationMetrics.knowledgeSharedScore
        };
        return analyticsData;
    }
    /**
     * Store session analytics data
     */
    async storeSessionAnalytics(data) {
        try {
            await this.db.query(`
        INSERT INTO session_analytics (
          session_id, user_id, team_id, project_id, analysis_date,
          session_count, total_duration, active_coding_time, context_switches,
          files_modified, lines_added, lines_removed, commits_made,
          ai_queries, ai_response_time_avg, context_quality_avg,
          successful_handoffs, failed_handoffs,
          task_completion_rate, context_switches_per_hour, deep_work_sessions,
          files_shared, team_interactions, knowledge_shared_score
        ) VALUES (
          $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13,
          $14, $15, $16, $17, $18, $19, $20, $21, $22, $23, $24
        ) ON CONFLICT (session_id, analysis_date) 
        DO UPDATE SET
          session_count = session_analytics.session_count + 1,
          total_duration = session_analytics.total_duration + EXCLUDED.total_duration,
          active_coding_time = session_analytics.active_coding_time + EXCLUDED.active_coding_time,
          updated_at = NOW()
      `, [
                data.sessionId, data.userId, data.teamId, data.projectId, data.analysisDate,
                data.sessionCount, data.totalDuration, data.activeCodingTime, data.contextSwitches,
                data.filesModified, data.linesAdded, data.linesRemoved, data.commitsMade,
                data.aiQueries, data.aiResponseTimeAvg, data.contextQualityAvg,
                data.successfulHandoffs, data.failedHandoffs,
                data.taskCompletionRate, data.contextSwitchesPerHour, data.deepWorkSessions,
                data.filesShared, data.teamInteractions, data.knowledgeSharedScore
            ]);
        }
        catch (error) {
            console.error('[ANALYTICS] Error storing session analytics:', error);
            // Don't throw - analytics shouldn't break the main flow
        }
    }
    /**
     * Get dashboard metrics for a user
     */
    async getDashboardMetrics(userId, teamId, projectId, days = 7) {
        try {
            // Get aggregated metrics for the past N days
            const result = await this.db.query(`
        SELECT 
          SUM(total_duration) / 3600.0 as hours_worked,
          SUM(active_coding_time) / 3600.0 as productive_hours,
          AVG(CASE WHEN total_duration > 0 THEN (active_coding_time::FLOAT / total_duration) * 100 ELSE 0 END) as productivity_percentage,
          SUM(deep_work_sessions) as deep_work_sessions,
          SUM(files_modified) as files_modified,
          SUM(commits_made) as commits_made,
          SUM(lines_added + lines_removed) as lines_changed,
          SUM(team_interactions) as team_interactions,
          AVG(knowledge_shared_score) as knowledge_shared,
          SUM(ai_queries) as queries_total,
          AVG(ai_response_time_avg) as avg_response_time,
          AVG(context_quality_avg) as context_quality,
          AVG(CASE WHEN (successful_handoffs + failed_handoffs) > 0 
               THEN successful_handoffs::FLOAT / (successful_handoffs + failed_handoffs) 
               ELSE 1.0 END) as handoff_success_rate,
          AVG(task_completion_rate) as task_completion_rate,
          AVG(context_switches_per_hour) as context_switches_per_hour,
          AVG(CASE WHEN session_count > 0 THEN total_duration::FLOAT / session_count ELSE 0 END) as avg_session_length
        FROM session_analytics 
        WHERE user_id = $1 AND team_id = $2 AND project_id = $3 
          AND analysis_date >= CURRENT_DATE - INTERVAL '$4 days'
      `, [userId, teamId, projectId, days]);
            const row = result.rows[0];
            return {
                productivity: {
                    hoursWorked: parseFloat(row.hours_worked) || 0,
                    productiveHours: parseFloat(row.productive_hours) || 0,
                    productivityPercentage: parseFloat(row.productivity_percentage) || 0,
                    deepWorkSessions: parseInt(row.deep_work_sessions) || 0
                },
                codeHealth: {
                    filesModified: parseInt(row.files_modified) || 0,
                    commitsMade: parseInt(row.commits_made) || 0,
                    linesChanged: parseInt(row.lines_changed) || 0,
                    buildSuccessRate: 0.95 // Would be calculated from CI/CD data
                },
                collaboration: {
                    teamInteractions: parseInt(row.team_interactions) || 0,
                    knowledgeShared: parseFloat(row.knowledge_shared) || 0,
                    codeReviewParticipation: 0.8, // Would be calculated from git events
                    pairProgrammingSessions: 0 // Would be tracked separately
                },
                aiAssistance: {
                    queriesTotal: parseInt(row.queries_total) || 0,
                    avgResponseTime: parseInt(row.avg_response_time) || 0,
                    contextQuality: parseFloat(row.context_quality) || 0,
                    handoffSuccessRate: parseFloat(row.handoff_success_rate) || 1.0
                },
                focus: {
                    taskCompletionRate: parseFloat(row.task_completion_rate) || 0,
                    contextSwitchesPerHour: parseFloat(row.context_switches_per_hour) || 0,
                    averageSessionLength: parseFloat(row.avg_session_length) || 0,
                    interruptionFrequency: 0.2 // Would be calculated from session events
                }
            };
        }
        catch (error) {
            console.error('[ANALYTICS] Error getting dashboard metrics:', error);
            // Return empty metrics if query fails
            return {
                productivity: { hoursWorked: 0, productiveHours: 0, productivityPercentage: 0, deepWorkSessions: 0 },
                codeHealth: { filesModified: 0, commitsMade: 0, linesChanged: 0, buildSuccessRate: 0.95 },
                collaboration: { teamInteractions: 0, knowledgeShared: 0, codeReviewParticipation: 0.8, pairProgrammingSessions: 0 },
                aiAssistance: { queriesTotal: 0, avgResponseTime: 0, contextQuality: 0, handoffSuccessRate: 1.0 },
                focus: { taskCompletionRate: 0, contextSwitchesPerHour: 0, averageSessionLength: 0, interruptionFrequency: 0.2 }
            };
        }
    }
    /**
     * Get file hotspots for a project
     */
    async getFileHotspots(projectId, days = 7) {
        try {
            const result = await this.db.query(`
        SELECT 
          file_path,
          modification_count,
          unique_contributors,
          total_session_time / 3600.0 as hours_spent,
          complexity_score,
          bug_frequency,
          CASE 
            WHEN modification_count > 20 AND bug_frequency > 0.1 THEN 'high_risk'
            WHEN modification_count > 10 THEN 'moderate_risk'
            ELSE 'low_risk'
          END as risk_level
        FROM file_activity_analytics
        WHERE project_id = $1 
          AND analysis_date >= CURRENT_DATE - INTERVAL '$2 days'
        ORDER BY modification_count DESC, total_session_time DESC
        LIMIT 20
      `, [projectId, days]);
            return result.rows.map((row) => ({
                filePath: row.file_path,
                modificationCount: parseInt(row.modification_count),
                uniqueContributors: parseInt(row.unique_contributors),
                hoursSpent: parseFloat(row.hours_spent),
                complexityScore: parseFloat(row.complexity_score),
                bugFrequency: parseFloat(row.bug_frequency),
                riskLevel: row.risk_level
            }));
        }
        catch (error) {
            console.error('[ANALYTICS] Error getting file hotspots:', error);
            return [];
        }
    }
    /**
     * Get team analytics summary
     */
    async getTeamAnalytics(teamId, projectId, periodType = 'weekly') {
        try {
            const result = await this.db.query(`
        SELECT * FROM team_analytics 
        WHERE team_id = $1 AND project_id = $2 AND period_type = $3
        ORDER BY period_start DESC
        LIMIT 1
      `, [teamId, projectId, periodType]);
            if (result.rows.length === 0)
                return null;
            const row = result.rows[0];
            return {
                teamId: row.team_id,
                projectId: row.project_id,
                periodType: row.period_type,
                periodStart: new Date(row.period_start),
                periodEnd: new Date(row.period_end),
                totalDevelopers: row.total_developers,
                activeSessions: row.active_sessions,
                totalSessionTime: row.total_session_time,
                averageSessionLength: row.average_session_length,
                totalCommits: row.total_commits,
                totalFilesModified: row.total_files_modified,
                buildSuccessRate: parseFloat(row.build_success_rate),
                contextQueriesTotal: row.context_queries_total,
                avgContextQuality: parseFloat(row.avg_context_quality),
                handoffSuccessRate: parseFloat(row.handoff_success_rate),
                aiEffectivenessScore: parseFloat(row.ai_effectiveness_score),
                primaryFocusAreas: row.primary_focus_areas || [],
                technologyUsage: row.technology_usage || {}
            };
        }
        catch (error) {
            console.error('[ANALYTICS] Error getting team analytics:', error);
            return null;
        }
    }
    // Private helper methods for calculating metrics
    calculateProductivityMetrics(sessionContext) {
        // Extract productivity signals from session context
        const commandCount = sessionContext.recentCommands.length;
        const successfulCommands = sessionContext.recentCommands.filter(cmd => cmd.success).length;
        return {
            activeCodingTime: Math.floor(sessionContext.metadata.sessionDuration * 0.7), // Estimate
            contextSwitches: sessionContext.focusAreas.length,
            linesAdded: Math.floor(Math.random() * 200) + 50, // Mock - would come from git
            linesRemoved: Math.floor(Math.random() * 100) + 10, // Mock - would come from git  
            commitsMade: sessionContext.recentCommands.filter(cmd => cmd.command.includes('git commit')).length,
            aiQueries: Math.floor(commandCount * 0.3), // Estimate based on commands
            successfulHandoffs: sessionContext.metadata.contextQuality > 0.8 ? 1 : 0,
            failedHandoffs: sessionContext.metadata.contextQuality <= 0.8 ? 1 : 0
        };
    }
    calculateCollaborationMetrics(sessionContext) {
        return {
            filesShared: sessionContext.recentFiles.filter(f => f.modifications.length > 1).length,
            teamInteractions: sessionContext.discoveries.length, // Proxy for knowledge sharing
            knowledgeSharedScore: Math.min(sessionContext.discoveries.length * 0.1, 1.0)
        };
    }
    calculateFocusMetrics(sessionContext) {
        const completedTasks = sessionContext.openTasks.filter(task => task.status === 'complete').length;
        const totalTasks = sessionContext.openTasks.length;
        return {
            taskCompletionRate: totalTasks > 0 ? completedTasks / totalTasks : 0,
            contextSwitchesPerHour: sessionContext.metadata.sessionDuration > 0
                ? (sessionContext.focusAreas.length / (sessionContext.metadata.sessionDuration / 3600))
                : 0,
            deepWorkSessions: sessionContext.metadata.sessionDuration > 1800 ? 1 : 0 // >30min = deep work
        };
    }
    /**
     * Process session for analytics when it ends
     */
    async processSessionCompletion(sessionContext) {
        console.log(`[ANALYTICS] Processing session completion: ${sessionContext.id}`);
        try {
            // Analyze the session
            const analyticsData = await this.analyzeSession(sessionContext);
            // Store analytics data
            await this.storeSessionAnalytics(analyticsData);
            // Record session completion event
            await this.recordSessionEvent(sessionContext.id, sessionContext.userId, sessionContext.teamId, sessionContext.projectId, 'session_complete', {
                duration: sessionContext.metadata.sessionDuration,
                contextQuality: sessionContext.metadata.contextQuality,
                tasksCompleted: sessionContext.openTasks.filter(t => t.status === 'complete').length,
                filesModified: sessionContext.recentFiles.length
            }, sessionContext.metadata.sessionDuration * 1000);
            console.log(`[ANALYTICS] ✅ Session analytics processed for ${sessionContext.id}`);
        }
        catch (error) {
            console.error(`[ANALYTICS] ❌ Error processing session analytics:`, error);
            throw error;
        }
    }
}
export default SessionAnalytics;
//# sourceMappingURL=session-analytics.js.map