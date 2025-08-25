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
import * as fs from 'fs';
import * as path from 'path';
import ContextValidator from './context-validation.js';
import { randomUUID } from 'crypto';
export class SessionHandoffManager {
    db;
    contextValidator;
    templateCache = new Map();
    constructor(db) {
        this.db = db;
        this.contextValidator = new ContextValidator();
    }
    /**
     * Load template from file with caching
     */
    loadTemplate(templateName) {
        if (this.templateCache.has(templateName)) {
            return this.templateCache.get(templateName);
        }
        const templatePath = path.join(process.cwd(), 'templates', `${templateName}.md`);
        try {
            const template = fs.readFileSync(templatePath, 'utf8');
            this.templateCache.set(templateName, template);
            return template;
        }
        catch (error) {
            console.warn(`[SESSION] Could not load template ${templateName}: ${error}`);
            // Return a fallback minimal template
            return `# Session Handoff Creation\n\nCreate a handoff for the next session based on your current context.\n\nReturn a markdown summary of:\n- Current progress\n- What should happen next\n- Any important context to preserve`;
        }
    }
    /**
     * Process template with variable substitution
     */
    processTemplate(template, variables) {
        let processed = template;
        // Replace {{variable}} placeholders
        for (const [key, value] of Object.entries(variables)) {
            const placeholder = `{{${key}}}`;
            processed = processed.replace(new RegExp(placeholder, 'g'), value);
        }
        return processed;
    }
    /**
     * Format handoff content for human review (clean markdown) vs server consumption
     */
    formatForHumanReview(content) {
        // Clean up formatting for human readability
        return content
            // Remove server-specific instructions and meta-comments
            .replace(/\*\*CLAUDE: [^*]+\*\*/g, '')
            .replace(/\[CLAUDE: [^\]]+\]/g, '[Fill this section]')
            // Clean up excessive spacing
            .replace(/\n{3,}/g, '\n\n')
            // Add human-friendly review header
            .replace(/^# /, '# 📋 Handoff Template for Review\n\n> **Please review this template and fill in the missing details before submission**\n\n# ');
    }
    /**
     * Format handoff content for server processing (with embedded instructions)
     */
    formatForServerUpload(content, sessionId) {
        // Add server processing instructions and quality assessment prompts
        return `${content}

---

## 🤖 AUTOMATIC PROCESSING INSTRUCTIONS

**Session ID**: ${sessionId}
**Next AI**: This handoff was created by your predecessor. After reading completely, use the \`assess_handoff_quality\` tool to score this handoff on:
- Context Completeness (1-10)
- Task Clarity (1-10) 
- Emotional Continuity (1-10)
- Actionability (1-10)

Include specific feedback on what could be improved.`;
    }
    /**
     * Generate handoff creation prompt for current Claude using file template
     */
    async generateHandoffCreationPrompt(userId, teamId, projectId, currentTask) {
        const sessionId = this.generateSessionId();
        const timestamp = new Date();
        console.log(`[SESSION] Generating handoff creation prompt for ${userId} in ${projectId}`);
        // Load the template
        const template = this.loadTemplate('handoff-creation-template');
        // Process template with variables
        const prompt = this.processTemplate(template, {
            currentTask,
            timestamp: timestamp.toLocaleString(),
            projectId,
            sessionId,
            userId,
            teamId
        });
        return prompt;
    }
    /**
     * Store handoff content created by Claude
     */
    async storeHandoffContent(userId, teamId, projectId, handoffContent) {
        const sessionId = this.generateSessionId();
        const timestamp = new Date();
        // Create minimal session context for storage
        const sessionContext = {
            id: sessionId,
            userId,
            teamId,
            projectId,
            createdAt: timestamp,
            updatedAt: timestamp,
            expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
            handoffContent, // The actual handoff Claude created
            workingDirectory: process.cwd(),
            currentTask: 'Session handoff',
            focusAreas: [],
            conversationSummary: '',
            keyDecisions: [],
            recentFiles: [],
            openTasks: [],
            activeFeatures: [],
            currentChallenges: [],
            discoveries: [],
            recentCommands: [],
            metadata: {
                sessionDuration: 0,
                totalTokensUsed: 0,
                averageResponseTime: 0,
                productivityScore: 0,
                contextQuality: 1.0 // Claude created with full context
            }
        };
        await this.storeSessionContext(sessionContext);
        console.log(`[SESSION] ✅ Handoff ${sessionId} stored successfully`);
        return sessionId;
    }
    /**
     * Load handoff for resumption (simple retrieval)
     */
    async loadHandoffForResumption(sessionId) {
        console.log(`[SESSION] Loading handoff ${sessionId} for resumption`);
        const session = await this.loadSessionContext(sessionId);
        if (!session) {
            return null;
        }
        // Return the handoff content Claude created
        return session.handoffContent || null;
    }
    async loadMostRecentHandoff(userId, teamId, projectId) {
        console.log(`[SESSION] Loading most recent handoff for ${userId} in ${projectId}`);
        try {
            // First try to load from database
            if (this.db) {
                try {
                    const sessions = await this.db.getUserSessions(userId, teamId, 1);
                    if (sessions && sessions.length > 0) {
                        const session = sessions[0];
                        // Database returns JSONB content, extract handoffContent
                        if (session.content && session.content.handoffContent) {
                            return session.content.handoffContent;
                        }
                    }
                }
                catch (dbError) {
                    console.warn('[SESSION] Database load failed, trying local storage:', dbError);
                }
            }
            // Fallback to local storage - find most recent for this project
            const userSessions = await this.listUserSessions(userId, teamId);
            const projectSessions = userSessions.filter(s => s.id.includes(projectId));
            if (projectSessions.length > 0) {
                // Sort by createdAt descending to get most recent
                projectSessions.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
                const mostRecent = projectSessions[0];
                const sessionContext = await this.loadSessionContext(mostRecent.id);
                if (sessionContext && sessionContext.handoffContent) {
                    return sessionContext.handoffContent;
                }
            }
            return null;
        }
        catch (error) {
            console.error('[SESSION] Failed to load most recent handoff:', error);
            return null;
        }
    }
    async captureSession(userId, teamId, projectId, options = {}) {
        const sessionId = this.generateSessionId();
        const timestamp = new Date();
        console.log(`[SESSION] Capturing session state for ${userId} in ${projectId}`);
        // Analyze current working context
        const workingContext = await this.analyzeWorkingContext();
        const conversationContext = await this.extractConversationContext(options);
        const developmentState = await this.captureDevelopmentState();
        const problemSolvingContext = await this.extractProblemSolvingContext();
        // Determine mode and generate rapport (NEW!)
        const currentMode = options.mode || await this.detectCurrentMode(developmentState, problemSolvingContext);
        const nextMode = await this.predictNextMode(currentMode, developmentState, problemSolvingContext);
        const modeRationale = await this.generateModeRationale(currentMode, nextMode, developmentState);
        // Generate rapport context if not provided
        const rapportContext = options.rapportContext || await this.generateRapportContext(currentMode, nextMode, workingContext.currentTask, developmentState, userId);
        // Generate embedded context if not provided
        const embeddedContext = options.embeddedContext || await this.generateEmbeddedContext(nextMode, developmentState, problemSolvingContext, await this.captureRecentCommands());
        const sessionContext = {
            id: sessionId,
            userId,
            teamId,
            projectId,
            createdAt: timestamp,
            updatedAt: timestamp,
            expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000), // 24 hours
            // Mode-aware context
            currentMode,
            nextMode,
            modeRationale,
            rapportContext,
            embeddedContext,
            workingDirectory: process.cwd(),
            currentTask: workingContext.currentTask,
            focusAreas: workingContext.focusAreas,
            conversationSummary: conversationContext.summary,
            keyDecisions: conversationContext.decisions,
            recentFiles: developmentState.recentFiles,
            openTasks: developmentState.openTasks,
            activeFeatures: developmentState.activeFeatures,
            currentChallenges: problemSolvingContext.challenges,
            discoveries: problemSolvingContext.discoveries,
            recentCommands: await this.captureRecentCommands(),
            metadata: {
                sessionDuration: 0, // Would be calculated from session start
                totalTokensUsed: 0, // Would be tracked during session
                averageResponseTime: 0,
                productivityScore: 0,
                contextQuality: 0.85 // Estimated based on context completeness
            }
        };
        // Store session context
        await this.storeSessionContext(sessionContext);
        console.log(`[SESSION] ✅ Session ${sessionId} captured successfully`);
        console.log(`[SESSION] Mode transition: ${currentMode} → ${nextMode}`);
        return sessionContext;
    }
    /**
     * Resume session from stored context
     */
    async resumeSession(sessionId) {
        console.log(`[SESSION] Resuming session ${sessionId}`);
        const context = await this.loadSessionContext(sessionId);
        if (!context) {
            throw new Error(`Session ${sessionId} not found or expired`);
        }
        // Generate resumption prompt
        const resumptionPrompt = await this.generateResumptionPrompt(context);
        // Generate setup commands
        const setupCommands = await this.generateSetupCommands(context);
        console.log(`[SESSION] ✅ Session ${sessionId} ready for resumption`);
        return {
            context,
            resumptionPrompt,
            setupCommands
        };
    }
    /**
     * List available sessions for a user
     */
    async listUserSessions(userId, teamId) {
        // Use the existing database method for listing user sessions
        const sessions = await this.db.getUserSessions(userId, teamId);
        return sessions.map(session => ({
            id: session.id,
            projectId: session.projectId,
            currentTask: session.currentTask,
            createdAt: session.createdAt,
            focusAreas: session.focusAreas,
            isExpired: session.isExpired
        }));
    }
    /**
     * Clean up expired sessions
     */
    async cleanupExpiredSessions() {
        // Use the existing database method for cleanup
        return await this.db.cleanupExpiredSessions();
    }
    // Private helper methods
    generateSessionId() {
        return randomUUID();
    }
    async analyzeWorkingContext() {
        // In a real implementation, this would analyze:
        // - Recent git commits
        // - Modified files
        // - Open editor tabs
        // - Terminal history
        return {
            currentTask: "Implementing session handoff feature for ContextMCP",
            focusAreas: ["session-management", "context-persistence", "developer-experience"]
        };
    }
    async extractConversationContext(options) {
        // Mock implementation - would integrate with AI assistant APIs
        return {
            summary: "Working on session handoff system to solve context rot problem. Designed comprehensive session capture and resumption system with focus on preserving development state and AI conversation context.",
            decisions: [
                {
                    decision: "Store session context as structured JSON with comprehensive state",
                    rationale: "Enables precise resumption and reduces information loss",
                    timestamp: new Date(),
                    files: ["src/session-handoff.ts"]
                }
            ]
        };
    }
    async captureDevelopmentState() {
        // Mock implementation - would analyze file system and git state
        return {
            recentFiles: [
                {
                    path: "src/session-handoff.ts",
                    lastAccessed: new Date(),
                    purpose: "Implementing session capture and resumption logic",
                    modifications: ["Added SessionContext interface", "Implemented captureSession method"]
                }
            ],
            openTasks: [
                {
                    description: "Complete session handoff implementation",
                    priority: 'high',
                    files: ["src/session-handoff.ts"],
                    progress: "Interface design complete, implementing core methods",
                    nextSteps: ["Add database integration", "Test resumption flow", "Add MCP tool endpoints"]
                }
            ],
            activeFeatures: [
                {
                    name: "session-handoff",
                    description: "Session capture and resumption system to prevent context rot",
                    files: ["src/session-handoff.ts"],
                    status: 'in_progress',
                    implementation_notes: "Using comprehensive context capture with structured JSON storage"
                }
            ]
        };
    }
    async extractProblemSolvingContext() {
        return {
            challenges: [
                {
                    problem: "Determining optimal context compression level",
                    attempts: ["Store everything", "Minimal context only"],
                    currentApproach: "Configurable compression levels based on use case",
                    blockers: []
                }
            ],
            discoveries: [
                {
                    insight: "Session handoff is critical for AI-assisted development productivity",
                    source: "User research and personal experience",
                    relevance: "Core feature for ContextMCP value proposition",
                    files: ["src/session-handoff.ts"]
                }
            ]
        };
    }
    async captureRecentCommands() {
        // Mock implementation - would integrate with shell history
        return [
            {
                command: "npm run build",
                output: "Build completed successfully",
                timestamp: new Date(Date.now() - 1000 * 60 * 5),
                success: true
            }
        ];
    }
    async storeSessionContext(context) {
        // Use the existing database method for session storage
        await this.db.saveSession(context);
    }
    async loadSessionContext(sessionId) {
        // Use the existing database method for session loading
        return await this.db.loadSession(sessionId);
    }
    async generateResumptionPrompt(context) {
        const sections = [];
        // Greeting and basic context
        if (context.rapportContext) {
            sections.push(context.rapportContext.personalizedGreeting);
            sections.push(context.rapportContext.sharedHistory);
        }
        // MODE AWARENESS - Critical for setting AI mindset
        if (context.nextMode) {
            sections.push(``);
            const modeDescriptions = {
                planning: '**PLANNING MODE** - Wide focus. Explore options. Consider architecture.',
                debugging: '**DEBUGGING MODE** - Narrow focus. Isolate the problem. Test hypotheses.',
                building: '**BUILDING MODE** - Step-by-step execution. Follow the plan. Complete tasks.',
                learning: '**LEARNING MODE** - Deep exploration. Understand patterns. Document insights.',
                shipping: '**SHIPPING MODE** - Final checks. Test everything. Prepare deployment.'
            };
            sections.push(modeDescriptions[context.nextMode]);
            // Mode transition context
            if (context.currentMode && context.currentMode !== context.nextMode) {
                sections.push(`*Transitioning from ${context.currentMode} → ${context.nextMode}*`);
                if (context.modeRationale) {
                    sections.push(`*Reason: ${context.modeRationale}*`);
                }
            }
            else if (context.currentMode === context.nextMode) {
                sections.push(`*Continuing in ${context.currentMode} mode*`);
            }
        }
        sections.push(``);
        // Use new embedded context structure
        if (context.embeddedContext) {
            const ec = context.embeddedContext;
            // Progress Snapshot
            sections.push(`## 📊 Progress Snapshot`);
            if (ec.progressSnapshot.completed.length > 0) {
                ec.progressSnapshot.completed.forEach(item => {
                    sections.push(`[x] ${item.task}`);
                });
            }
            if (ec.progressSnapshot.inProgress.length > 0) {
                ec.progressSnapshot.inProgress.forEach(item => {
                    sections.push(`[ ] ${item.task}`);
                });
            }
            if (ec.progressSnapshot.blocked && ec.progressSnapshot.blocked.length > 0) {
                ec.progressSnapshot.blocked.forEach(item => {
                    sections.push(`[!] ${item.task} - BLOCKED: ${item.blocker}`);
                });
            }
            sections.push(``);
            // Instant Start - Mode-specific instructions
            const startEmoji = {
                planning: '📋',
                debugging: '🔍',
                building: '🎯',
                learning: '📚',
                shipping: '🚀'
            };
            sections.push(`## ${startEmoji[context.nextMode || 'building']} Instant Start`);
            sections.push('```bash');
            sections.push(`cd ${ec.instantStart.workingDirectory}`);
            sections.push(`git status  # Branch: ${ec.instantStart.currentBranch}`);
            if (ec.instantStart.uncommittedFiles) {
                sections.push(`# Uncommitted: ${ec.instantStart.uncommittedFiles.join(', ')}`);
            }
            sections.push(`${ec.instantStart.firstCommand}`);
            if (ec.instantStart.expectedOutput) {
                sections.push(`# Expected: ${ec.instantStart.expectedOutput}`);
            }
            sections.push('```');
            sections.push(``);
            // Context You Need
            if (ec.contextYouNeed) {
                sections.push(`## 🔍 Context You Need`);
                if (ec.contextYouNeed.problem) {
                    sections.push(`- **Problem**: ${ec.contextYouNeed.problem}`);
                }
                if (ec.contextYouNeed.hypothesis) {
                    sections.push(`- **Hypothesis**: ${ec.contextYouNeed.hypothesis}`);
                }
                if (ec.contextYouNeed.lastWorkingState) {
                    sections.push(`- **Last Success**: ${ec.contextYouNeed.lastWorkingState}`);
                }
                if (ec.contextYouNeed.reproduce) {
                    sections.push(`- **Reproduce**: \`${ec.contextYouNeed.reproduce}\``);
                }
                sections.push(``);
            }
            // Watchouts
            if (ec.watchouts && ec.watchouts.length > 0) {
                sections.push(`## ⚠️ Watchouts`);
                ec.watchouts.forEach(warning => {
                    sections.push(`- ${warning}`);
                });
                sections.push(``);
            }
            // Last Terminal State
            if (ec.lastTerminalState && ec.lastTerminalState.length > 0) {
                sections.push(`## 📟 Last Terminal State`);
                ec.lastTerminalState.forEach(cmd => {
                    sections.push(`\$ ${cmd.command}`);
                    sections.push(cmd.output);
                    sections.push(``);
                });
            }
            // Dynamic motivational language based on context and mood
            if (context.rapportContext?.contextualMood) {
                const mood = context.rapportContext.contextualMood;
                sections.push(``);
                sections.push(`**Context for AI**: Generate an appropriate motivational statement that matches the user's communication style and current situation:`);
                sections.push(`- **Situation**: ${mood.situation} (${mood.mode} mode)`);
                sections.push(`- **Emotional Tone**: ${mood.tone}`);
                sections.push(`- **Urgency Level**: ${mood.urgency}`);
                sections.push(`- **Task**: Create a contextually appropriate statement that feels natural for this user's collaboration style and current work context`);
            }
            else if (context.rapportContext?.motivationalClose) {
                // Fallback to static if no contextual mood available
                sections.push(context.rapportContext.motivationalClose);
            }
            sections.push(``);
        }
        else {
            // Fallback to original format if no rapport context
            sections.push(`# Session Resumption Context`);
            sections.push(``);
            sections.push(`**Previous Session**: ${context.id}`);
            sections.push(`**Project**: ${context.projectId}`);
            sections.push(`**Last Active**: ${new Date(context.updatedAt).toLocaleString()}`);
            sections.push(``);
            sections.push(`## What You Were Working On`);
            sections.push(`**Current Task**: ${context.currentTask}`);
            sections.push(`**Focus Areas**: ${context.focusAreas.join(', ')}`);
            sections.push(``);
            if (context.conversationSummary) {
                sections.push(`## Previous Conversation Summary`);
                sections.push(context.conversationSummary);
                sections.push(``);
            }
        }
        if (context.keyDecisions.length > 0) {
            sections.push(`## Key Decisions Made`);
            context.keyDecisions.forEach((decision, i) => {
                if (typeof decision === 'string') {
                    // Handle simple string format
                    sections.push(`${i + 1}. ${decision}`);
                }
                else {
                    // Handle object format
                    sections.push(`${i + 1}. **${decision.decision}**`);
                    sections.push(`   - Rationale: ${decision.rationale}`);
                    sections.push(`   - Files: ${decision.files?.join(', ') || 'N/A'}`);
                }
            });
            sections.push(``);
        }
        if (context.openTasks.length > 0) {
            sections.push(`## Open Tasks`);
            context.openTasks.forEach((task, i) => {
                if (typeof task === 'string') {
                    sections.push(`${i + 1}. ${task}`);
                }
                else {
                    sections.push(`### ${i + 1}. ${task.description} (${task.priority || 'medium'} priority)`);
                    if (task.progress) {
                        sections.push(`**Progress**: ${task.progress}`);
                    }
                    if (task.status) {
                        sections.push(`**Status**: ${task.status}`);
                    }
                    if (task.nextSteps) {
                        sections.push(`**Next Steps**:`);
                        task.nextSteps.forEach(step => sections.push(`- ${step}`));
                    }
                }
                sections.push(``);
            });
        }
        if (context.currentChallenges.length > 0) {
            sections.push(`## Current Challenges`);
            context.currentChallenges.forEach((challenge, i) => {
                if (typeof challenge === 'string') {
                    sections.push(`${i + 1}. ${challenge}`);
                }
                else {
                    sections.push(`### ${i + 1}. ${challenge.problem}`);
                    sections.push(`**Current Approach**: ${challenge.currentApproach}`);
                    if (challenge.blockers && challenge.blockers.length > 0) {
                        sections.push(`**Blockers**: ${challenge.blockers.join(', ')}`);
                    }
                }
                sections.push(``);
            });
        }
        if (context.recentFiles.length > 0) {
            sections.push(`## Recent Files`);
            context.recentFiles.forEach(file => {
                if (typeof file === 'string') {
                    sections.push(`- ${file}`);
                }
                else {
                    sections.push(`- **${file.path}**: ${file.purpose || file.description || file.type}`);
                    if (file.modifications && file.modifications.length > 0) {
                        sections.push(`  - Recent changes: ${file.modifications.join(', ')}`);
                    }
                    if (file.lastModified) {
                        sections.push(`  - Last modified: ${new Date(file.lastModified).toLocaleString()}`);
                    }
                }
            });
            sections.push(``);
        }
        sections.push(`## Session Quality`);
        sections.push(`- Context Quality: ${(context.metadata.contextQuality * 100).toFixed(0)}%`);
        sections.push(`- Ready to continue with minimal context rebuilding`);
        // Automatic handoff quality assessment instructions
        sections.push(``);
        sections.push(`## IMPORTANT: Immediate Handoff Quality Assessment`);
        sections.push(`After reading this handoff, immediately call the handoff quality assessment tool:`);
        sections.push(``);
        sections.push(`**Your Task**: Use the \`assess_handoff_quality\` tool to score this handoff on:`);
        sections.push(`- **Context Completeness** (1-10): Do you have all necessary files, decisions, and background?`);
        sections.push(`- **Task Clarity** (1-10): Is it crystal clear what you need to do first?`);
        sections.push(`- **Emotional Continuity** (1-10): Does this feel like continuing a conversation vs starting over?`);
        sections.push(`- **Actionability** (1-10): Can you start working immediately without additional questions?`);
        sections.push(``);
        sections.push(`Include specific feedback on what's missing or unclear.`);
        sections.push(`Session ID for assessment: \`${context.id}\``);
        return sections.join('\n');
    }
    async generateSetupCommands(context) {
        const commands = [];
        // Change to working directory
        if (context.workingDirectory !== process.cwd()) {
            commands.push(`cd "${context.workingDirectory}"`);
        }
        // Suggest opening recent files
        if (context.recentFiles.length > 0) {
            const recentFilePaths = context.recentFiles
                .slice(0, 3) // Top 3 most recent
                .map(f => f.path)
                .join(' ');
            commands.push(`# Consider opening: ${recentFilePaths}`);
        }
        // Suggest checking git status
        commands.push('git status');
        return commands;
    }
    // Mode detection and rapport generation methods (NEW!)
    async detectCurrentMode(developmentState, problemSolvingContext) {
        // Analyze current state to determine mode
        if (problemSolvingContext.challenges.length > 0 &&
            problemSolvingContext.challenges[0].blockers?.length > 0) {
            return 'debugging';
        }
        if (developmentState.activeFeatures.some((f) => f.status === 'planning')) {
            return 'planning';
        }
        if (developmentState.activeFeatures.some((f) => f.status === 'testing')) {
            return 'shipping';
        }
        if (problemSolvingContext.discoveries.length > 0) {
            return 'learning';
        }
        return 'building'; // Default mode
    }
    async predictNextMode(currentMode, developmentState, problemSolvingContext) {
        // AI-like prediction based on current progress
        const hasOpenTasks = developmentState.openTasks.length > 0;
        const hasBlockers = problemSolvingContext.challenges.some((c) => c.blockers?.length > 0);
        const hasPlannedFeatures = developmentState.activeFeatures.some((f) => f.status === 'planning');
        // Mode transition logic
        if (currentMode === 'planning' && !hasPlannedFeatures) {
            return 'building'; // Planning complete, start building
        }
        if (currentMode === 'building' && hasBlockers) {
            return 'debugging'; // Hit issues, need debugging
        }
        if (currentMode === 'debugging' && !hasBlockers) {
            return 'building'; // Issues resolved, continue building
        }
        if (currentMode === 'building' && !hasOpenTasks) {
            return 'shipping'; // Features complete, ready to ship
        }
        if (currentMode === 'shipping') {
            return 'planning'; // After shipping, plan next iteration
        }
        return currentMode; // Continue in same mode
    }
    async generateModeRationale(currentMode, nextMode, developmentState) {
        if (currentMode === nextMode) {
            return `Continuing in ${currentMode} mode - ${developmentState.openTasks.length} tasks remaining`;
        }
        const transitions = {
            'planning->building': 'All architectural decisions made, ready to implement',
            'building->debugging': 'Encountered blockers that need investigation',
            'debugging->building': 'Issues resolved, continuing implementation',
            'building->shipping': 'Features complete, ready for deployment',
            'shipping->planning': 'Deployment complete, planning next iteration'
        };
        return transitions[`${currentMode}->${nextMode}`] || `Transitioning from ${currentMode} to ${nextMode}`;
    }
    /**
     * Extract a display name from userId - handles email addresses and display names
     */
    extractUserName(userId) {
        // Handle email addresses
        if (userId.includes('@')) {
            const namePart = userId.split('@')[0];
            // Convert common patterns like 'first.last' or 'first_last' to 'First'
            const firstName = namePart.split(/[._-]/)[0];
            return firstName.charAt(0).toUpperCase() + firstName.slice(1).toLowerCase();
        }
        // Handle display names or usernames
        if (userId.includes(' ')) {
            // Use first word if space-separated
            const firstName = userId.split(' ')[0];
            return firstName.charAt(0).toUpperCase() + firstName.slice(1).toLowerCase();
        }
        // Single word username - capitalize first letter
        return userId.charAt(0).toUpperCase() + userId.slice(1).toLowerCase();
    }
    async generateRapportContext(currentMode, nextMode, currentTask, developmentState, userId) {
        // Determine greeting based on time of day (would use actual time in production)
        const hour = new Date().getHours();
        const timeGreeting = hour < 12 ? 'Good morning' :
            hour < 17 ? 'Good afternoon' :
                'Good evening';
        // Check session success/failure context
        const hasBlockers = developmentState.openTasks.some((t) => t.blockers?.length > 0 || t.status === 'blocked');
        const completedCount = developmentState.openTasks.filter((t) => t.progress?.includes('complete') || t.progress?.includes('done')).length;
        const hasFailures = developmentState.recentCommands?.some((c) => !c.success);
        // Extract user's first name or use generic greeting
        const userName = userId ? this.extractUserName(userId) : '';
        // Simple, contextual greetings - user-agnostic
        let greeting = userName ? `${timeGreeting}, ${userName}.` : `${timeGreeting}.`;
        let emotionalTone = 'focused';
        // Adjust based on context
        if (hasBlockers || hasFailures) {
            // Reserved and determined when things aren't going well
            emotionalTone = 'determined';
        }
        else if (completedCount >= 3) {
            // Celebratory when making good progress
            greeting = userName ? `${timeGreeting}, ${userName}! 🚀` : `${timeGreeting}! 🚀`;
            emotionalTone = 'excited';
        }
        else if (nextMode === 'debugging') {
            emotionalTone = 'determined';
        }
        else if (nextMode === 'shipping') {
            emotionalTone = 'celebratory';
        }
        // Generate contextual shared history with accomplishment awareness
        let sharedHistory;
        if (completedCount >= 3) {
            sharedHistory = `We've made solid progress together - ${completedCount} tasks wrapped up.`;
        }
        else if (completedCount > 0) {
            sharedHistory = `We've got ${completedCount} task${completedCount > 1 ? 's' : ''} done.`;
        }
        else if (hasBlockers) {
            sharedHistory = `We hit some challenges with ${currentTask}.`;
        }
        else {
            sharedHistory = `We're working on ${currentTask}.`;
        }
        // Generate contextual motivational language based on situation, not canned responses
        // This provides context for the AI to generate appropriate language dynamically
        const contextualMood = {
            situation: hasBlockers ? 'challenging' : completedCount >= 3 ? 'progressing_well' : 'steady_work',
            mode: nextMode,
            urgency: nextMode === 'shipping' ? 'high' : hasBlockers ? 'medium' : 'normal',
            tone: emotionalTone
        };
        return {
            personalizedGreeting: greeting,
            sharedHistory: sharedHistory,
            motivationalClose: '', // Will be generated dynamically by AI using contextualMood
            emotionalTone: emotionalTone,
            contextualMood: contextualMood
        };
    }
    async generateEmbeddedContext(nextMode, developmentState, problemSolvingContext, recentCommands) {
        // Get current git state (would be actual git commands in production)
        const workingDirectory = process.cwd();
        const currentBranch = 'fix/mvp-schema-alignment'; // Would use git branch --show-current
        const uncommittedFiles = developmentState.recentFiles
            ?.filter((f) => f.modifications?.length > 0)
            ?.map((f) => f.path)
            ?.slice(0, 5);
        // Determine first action based on mode and state
        const firstTask = developmentState.openTasks.find((t) => !t.progress?.includes('complete') && !t.blockers?.length);
        let firstCommand = 'git status';
        let expectedOutput = undefined;
        if (nextMode === 'debugging' && problemSolvingContext.challenges[0]) {
            const challenge = problemSolvingContext.challenges[0];
            if (challenge.attempts?.length > 0) {
                firstCommand = challenge.attempts[challenge.attempts.length - 1] || 'npm test';
            }
        }
        else if (nextMode === 'building') {
            firstCommand = 'npm run build';
            expectedOutput = 'Build successful';
        }
        else if (nextMode === 'shipping') {
            firstCommand = 'npm test';
            expectedOutput = 'All tests passing';
        }
        // Build context you need section
        const contextYouNeed = {};
        if (problemSolvingContext.challenges[0]) {
            const challenge = problemSolvingContext.challenges[0];
            contextYouNeed.problem = challenge.problem;
            contextYouNeed.hypothesis = challenge.currentApproach;
            // Find last working command
            const reversedCommands = [...recentCommands].reverse();
            const lastSuccess = reversedCommands.find((c) => c.success);
            if (lastSuccess) {
                contextYouNeed.lastWorkingState = `${lastSuccess.command} worked at ${new Date(lastSuccess.timestamp).toLocaleTimeString()}`;
            }
        }
        // Progress snapshot
        const completed = developmentState.openTasks
            .filter((t) => t.progress?.includes('complete'))
            .map((t) => ({
            task: t.description,
            result: t.progress || 'completed'
        }));
        const inProgress = developmentState.openTasks
            .filter((t) => !t.progress?.includes('complete') && !t.blockers?.length)
            .map((t) => ({
            task: t.description,
            status: t.progress || 'in progress'
        }));
        const blocked = developmentState.openTasks
            .filter((t) => t.blockers?.length > 0)
            .map((t) => ({
            task: t.description,
            blocker: t.blockers[0] || 'unknown blocker'
        }));
        // Last terminal state - get last 3 commands with output
        const lastTerminalState = recentCommands
            .slice(-3)
            .map((cmd) => ({
            command: cmd.command,
            output: cmd.output ?
                (cmd.output.length > 200 ? cmd.output.substring(0, 200) + '...' : cmd.output) :
                cmd.success ? '✅ Success' : '❌ Failed',
            exitCode: cmd.success ? 0 : 1
        }));
        // Critical watchouts based on mode
        const watchouts = [];
        if (nextMode === 'debugging') {
            watchouts.push("Don't modify working code while debugging");
        }
        if (nextMode === 'shipping') {
            watchouts.push("Run all tests before deployment");
            watchouts.push("Check for uncommitted changes");
        }
        if (uncommittedFiles?.length > 3) {
            watchouts.push(`${uncommittedFiles.length} uncommitted files - consider committing`);
        }
        return {
            instantStart: {
                workingDirectory,
                currentBranch,
                uncommittedFiles: uncommittedFiles?.length > 0 ? uncommittedFiles : undefined,
                firstCommand,
                expectedOutput
            },
            contextYouNeed: Object.keys(contextYouNeed).length > 0 ? contextYouNeed : { problem: undefined, hypothesis: undefined, lastWorkingState: undefined, reproduce: undefined },
            progressSnapshot: {
                completed,
                inProgress,
                blocked: blocked.length > 0 ? blocked : undefined,
                timeEstimate: this.estimateTimeRemaining([...inProgress, ...blocked])
            },
            lastTerminalState: lastTerminalState.length > 0 ? lastTerminalState : undefined,
            watchouts: watchouts.length > 0 ? watchouts.slice(0, 3) : undefined
        };
    }
    estimateTimeRemaining(tasks) {
        const hours = Math.ceil(tasks.length * 0.5); // Rough estimate: 30min per task
        if (hours <= 1)
            return '1 hour';
        if (hours <= 4)
            return `${hours} hours`;
        return `${Math.ceil(hours / 8)} days`;
    }
}
export default SessionHandoffManager;
//# sourceMappingURL=session-handoff.js.map