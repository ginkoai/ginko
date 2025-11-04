/**
 * @fileType: command
 * @status: current
 * @updated: 2025-01-13
 * @tags: [start, reflection, session, initialization, context]
 * @related: [../../core/reflection-pattern.ts, ../handoff/handoff-reflection.ts]
 * @priority: critical
 * @complexity: high
 * @dependencies: [reflection-pattern, simple-git, fs-extra, ora]
 */

import { ReflectionCommand } from '../../core/reflection-pattern.js';
import simpleGit from 'simple-git';
import fs from 'fs-extra';
import * as path from 'path';
import chalk from 'chalk';
import ora from 'ora';
import { getUserEmail, getGinkoDir, detectWorkMode, getProjectRoot } from '../../utils/helpers.js';
import { ActiveContextManager, WorkMode, ContextLevel } from '../../services/active-context-manager.js';
import { SessionLogManager } from '../../core/session-log-manager.js';
import { SessionSynthesizer, SynthesisOutput } from '../../utils/synthesis.js';
import { loadContextStrategic, formatContextSummary, StrategyContext } from '../../utils/context-loader.js';
import { getOrCreateCursor, SessionCursor } from '../../lib/session-cursor.js';
import { initializeQueue } from '../../lib/event-queue.js';
import { loadContextFromCursor, formatContextSummary as formatEventContextSummary, LoadedContext } from '../../lib/context-loader-events.js';

/**
 * Start domain reflection for intelligent session initialization
 * Reads handoff and loads optimal context for instant flow state
 */
export class StartReflectionCommand extends ReflectionCommand {
  private contextManager: ActiveContextManager;

  constructor() {
    super('start');
    // Initialize with default work mode, will be updated based on session context
    this.contextManager = new ActiveContextManager('think-build');
  }

  /**
   * Parse intent for session initialization
   */
  private parseIntent(intent: string): any {
    return {
      raw: intent,
      type: 'session-start',
      context: {}
    };
  }

  /**
   * Override execute to process handoff and display session info
   */
  async execute(intent: string, options: any = {}): Promise<void> {
    const spinner = ora('Initializing session...').start();

    try {
      // 1. Parse intent
      const parsedIntent = this.parseIntent(intent);

      // 2. Initialize event queue for background sync (ADR-043)
      spinner.text = 'Starting event sync queue...';
      try {
        initializeQueue({
          syncIntervalMs: 5 * 60 * 1000,  // 5 minutes
          syncThreshold: 5,                 // 5 events
          maxBatchSize: 20                  // 20 events max
        });
        spinner.succeed(chalk.dim('Event sync queue started'));
      } catch (error) {
        // Non-critical - continue without sync
        spinner.warn(chalk.yellow('Event sync queue unavailable (offline mode)'));
      }

      // 3. Create or resume session cursor (ADR-043)
      spinner.text = 'Creating session cursor...';
      const { cursor, isNew } = await getOrCreateCursor({});

      // 4. Gather context (including handoff)
      const context = await this.gatherContext(parsedIntent);
      context.cursor = cursor;
      context.isNewSession = isNew;

      // 4. Read previous session log BEFORE archiving (ADR-033: Fresh AI synthesis at optimal pressure)
      spinner.text = 'Reading previous session log...';
      const ginkoDir = await getGinkoDir();
      const userEmail = await getUserEmail();
      const userSlug = userEmail.replace('@', '-at-').replace(/\./g, '-');
      const sessionDir = path.join(ginkoDir, 'sessions', userSlug);
      const projectRoot = await getProjectRoot();

      // Load session log content before archiving
      const previousSessionLog = await SessionLogManager.loadSessionLog(sessionDir);
      const hasLog = previousSessionLog.length > 100; // Non-empty log

      // 5. Synthesize from previous session log (at optimal 5-15% pressure)
      spinner.text = 'Synthesizing session context...';
      const synthesizer = new SessionSynthesizer(sessionDir, projectRoot);
      const synthesis = await synthesizer.synthesize();

      // 6. Archive previous session log (ALWAYS, not conditionally)
      if (hasLog) {
        spinner.text = 'Archiving previous session log...';
        const archivePath = await SessionLogManager.archiveLog(sessionDir);
        spinner.info(`Previous session archived: ${path.basename(archivePath)}`);
      }

      // 7. Determine work mode from context and update context manager
      const workMode = this.determineWorkMode(context, options);
      this.contextManager = new ActiveContextManager(workMode);

      spinner.text = 'Loading context strategically...';

      // 8. Load context strategically (TASK-011: Progressive Context Loading)
      // ADR-043 Phase 3: Event-based context loading is now the default
      // Falls back to strategic loading if event loading fails
      let strategyContext: StrategyContext;
      let eventContext: LoadedContext | undefined;

      // Allow disabling event-based loading with env var or --strategic flag
      const useEventBasedLoading = process.env.GINKO_USE_EVENT_CONTEXT !== 'false' && !options.strategic;

      if (useEventBasedLoading && cursor) {
        spinner.text = 'Loading context from event stream (ADR-043)...';
        try {
          eventContext = await loadContextFromCursor(cursor, {
            eventLimit: 50,
            includeTeam: options.team || false,
            teamEventLimit: 20,
            documentDepth: 2,
            teamDays: 7,
          });

          // Display event-based context summary
          spinner.succeed('Event stream context loaded');
          console.log(chalk.dim(formatEventContextSummary(eventContext)));

          // Convert to strategy context for compatibility
          const documentsMap = new Map<string, any>();
          const allDocs = [...eventContext.documents, ...eventContext.relatedDocs];
          allDocs.forEach(d => {
            documentsMap.set(d.id, {
              path: d.id,
              relativePath: d.id,
              content: d.content || '',
              type: d.type,
              tokens: d.content ? Math.ceil(d.content.length / 4) : 0,
              loadedAt: Date.now(),
              referencedBy: [],
            });
          });

          strategyContext = {
            documents: documentsMap,
            references: new Map(),
            loadOrder: allDocs.map(d => d.id),
            workMode: workMode,
            metrics: {
              documentsLoaded: allDocs.length,
              totalTokens: eventContext.token_estimate,
              bootstrapTimeMs: 0,
              cacheHits: 0,
              referenceDepth: 2,
              tokenReductionPercent: Math.round((1 - eventContext.token_estimate / 88000) * 100),
            },
          };
        } catch (error) {
          spinner.warn(chalk.yellow('Event-based loading failed, falling back to strategic loading'));
          console.error(chalk.dim((error as Error).message));

          // Fallback to strategic loading
          strategyContext = await loadContextStrategic({
            workMode,
            maxDepth: 3,
            followReferences: true,
            sessionDir,
            userSlug
          });
        }
      } else {
        // Use strategic loading (traditional approach)
        strategyContext = await loadContextStrategic({
          workMode,
          maxDepth: 3,
          followReferences: true,
          sessionDir,
          userSlug
        });
      }

      // 9. Load initial context using ActiveContextManager (legacy compatibility)
      const sessionData = {
        userSlug: context.userSlug || 'unknown',
        branch: context.currentBranch,
        filesChanged: context.uncommittedWork?.files || [],
        tags: this.extractTagsFromHandoff(context.lastHandoff)
      };

      const contextLevel = await this.contextManager.loadInitialContext(sessionData);

      // 10. Create fresh session log for new session (ADR-033)
      spinner.text = 'Creating fresh session log...';
      await this.initializeSessionLog(context, options);

      if (!options.noLog) {
        spinner.info('Session logging enabled (use --no-log to disable)');
      }

      // 11. Display session information with synthesis and strategy metrics
      await this.displaySessionInfo(context, contextLevel, synthesis, strategyContext);

      // Display strategic context loading summary
      if (options.verbose) {
        console.log('');
        console.log(chalk.dim(formatContextSummary(strategyContext)));
      }

      spinner.succeed('Session initialized with strategic context!');

    } catch (error) {
      spinner.fail('Session initialization failed');
      console.error(chalk.red(`Start failed: ${error}`));
      throw error;
    }
  }

  /**
   * Display session information based on synthesis (ADR-036)
   * Enhanced with strategic context metrics (TASK-011)
   */
  private async displaySessionInfo(
    context: any,
    contextLevel?: ContextLevel,
    synthesis?: SynthesisOutput,
    strategyContext?: StrategyContext
  ): Promise<void> {
    console.log('');

    // Display cursor information (ADR-043)
    if (context.cursor) {
      const cursor = context.cursor as SessionCursor;
      const statusEmoji = context.isNewSession ? '🆕' : '🔄';
      const statusText = context.isNewSession ? 'New session' : 'Resumed session';
      console.log(chalk.cyan(`${statusEmoji} Session Cursor:`));
      console.log(chalk.dim(`   ${statusText} on ${chalk.bold(cursor.branch)}`));
      console.log(chalk.dim(`   Project: ${cursor.project_id}`));
      if (!context.isNewSession) {
        console.log(chalk.dim(`   Position: ${cursor.current_event_id}`));
      }
      console.log('');
    }

    // Display quality tier
    if (synthesis) {
      const tierEmoji = {
        rich: '🌟',
        medium: '⭐',
        basic: '✨',
        minimal: '💫'
      };
      console.log(chalk.dim(`${tierEmoji[synthesis.qualityTier]} Context Quality: ${synthesis.qualityTier}`));
      console.log('');
    }

    // Display flow state (ADR-036: 1-10 scale with emotional tone)
    if (synthesis?.flowState) {
      const flow = synthesis.flowState;
      const scoreColor = flow.score >= 7 ? chalk.green : flow.score >= 4 ? chalk.yellow : chalk.red;
      console.log(chalk.cyan('🌊 Flow State:'));
      console.log(scoreColor(`   Score: ${flow.score}/10 - ${flow.energy}`));
      console.log(chalk.dim(`   ${flow.emotionalTone}`));
      console.log(chalk.dim(`   Last activity: ${flow.timeContext}`));
      console.log('');
    }

    // Display work mode
    const workMode = context.workMode || 'Think & Build';
    console.log(chalk.cyan(`📋 Work Mode: ${workMode}`));
    console.log('');

    // Display session header
    console.log(chalk.green('✨ Session Ready!'));
    console.log('');

    // Show sprint context from synthesis
    if (synthesis?.sprintContext) {
      const sprint = synthesis.sprintContext;
      console.log(chalk.yellow(`🎯 Sprint: ${sprint.goal}`));
      const progressColor = sprint.progress >= 75 ? chalk.green : sprint.progress >= 50 ? chalk.yellow : chalk.white;
      console.log(progressColor(`   Progress: ${sprint.progress}% - ${sprint.estimatedCompletion}`));
      console.log('');
    }

    // Show work performed from synthesis
    if (synthesis?.workPerformed) {
      const work = synthesis.workPerformed;

      if (work.completed.length > 0) {
        console.log(chalk.green('✅ Completed:'));
        work.completed.slice(0, 3).forEach(item => {
          console.log(chalk.dim(`   - ${item}`));
        });
        if (work.completed.length > 3) {
          console.log(chalk.dim(`   ... and ${work.completed.length - 3} more`));
        }
        console.log('');
      }

      if (work.inProgress.length > 0) {
        console.log(chalk.yellow('🚧 In Progress:'));
        work.inProgress.forEach(item => {
          console.log(chalk.dim(`   - ${item}`));
        });
        console.log('');
      }

      if (work.blocked.length > 0) {
        console.log(chalk.red('🚫 Blocked:'));
        work.blocked.forEach(item => {
          console.log(chalk.dim(`   - ${item}`));
        });
        console.log('');
      }
    }

    // Show key discoveries from synthesis
    if (synthesis?.discoveries) {
      const discoveries = synthesis.discoveries;

      if (discoveries.decisions.length > 0) {
        console.log(chalk.magenta('🧠 Key Decisions:'));
        discoveries.decisions.slice(0, 2).forEach(decision => {
          console.log(chalk.dim(`   - ${decision.description}`));
        });
        if (discoveries.decisions.length > 2) {
          console.log(chalk.dim(`   ... and ${discoveries.decisions.length - 2} more`));
        }
        console.log('');
      }

      if (discoveries.gotchas.length > 0) {
        console.log(chalk.red('⚠️  Gotchas:'));
        discoveries.gotchas.forEach(gotcha => {
          console.log(chalk.dim(`   - ${gotcha}`));
        });
        console.log('');
      }
    }

    // Show strategic context loading metrics (TASK-011)
    if (strategyContext) {
      const { metrics, loadOrder } = strategyContext;
      console.log(chalk.cyan('📚 Strategic Context Loaded:'));
      console.log(chalk.green(`   ⚡ ${metrics.documentsLoaded} documents in ${metrics.bootstrapTimeMs}ms`));
      console.log(chalk.dim(`   📊 ${metrics.totalTokens.toLocaleString()} tokens (${metrics.tokenReductionPercent}% reduction)`));

      if (loadOrder.length > 0) {
        console.log(chalk.yellow('   📄 Priority Load Order:'));
        loadOrder.slice(0, 5).forEach((item, index) => {
          console.log(chalk.dim(`      ${index + 1}. ${item}`));
        });
        if (loadOrder.length > 5) {
          console.log(chalk.dim(`      ... and ${loadOrder.length - 5} more`));
        }
      }
      console.log('');
    }

    // Show loaded context modules from ActiveContextManager (legacy)
    if (contextLevel && !strategyContext) {
      console.log(chalk.cyan('📚 Context Modules Loaded:'));

      if (contextLevel.immediate.length > 0) {
        console.log(chalk.green('   ⚡ Immediate:'));
        contextLevel.immediate.forEach(item => {
          console.log(chalk.dim(`   - ${item.title} (${item.type}, score: ${item.relevanceScore.toFixed(2)})`));
        });
      }

      if (contextLevel.deferred.length > 0) {
        console.log(chalk.yellow('   ⏳ Loading in background:'));
        contextLevel.deferred.slice(0, 3).forEach(item => {
          console.log(chalk.dim(`   - ${item.title}`));
        });
        if (contextLevel.deferred.length > 3) {
          console.log(chalk.dim(`   ... and ${contextLevel.deferred.length - 3} more`));
        }
      }

      if (contextLevel.available.length > 0) {
        console.log(chalk.dim(`   📖 Available: ${contextLevel.available.length} modules indexed`));
      }
      console.log('');
    }

    // Show critical modules from handoff (fallback)
    if (!contextLevel && context.lastHandoff?.includes('Critical Context Modules')) {
      const moduleSection = context.lastHandoff.match(/```bash\n(ginko context .+\n)+```/);
      if (moduleSection) {
        console.log(chalk.cyan('📚 Critical Context Modules:'));
        const commands = moduleSection[0].match(/ginko context .+/g);
        if (commands) {
          commands.forEach((cmd: string) => {
            console.log(chalk.dim(`   ${cmd}`));
          });
        }
        console.log('');
      }
    }

    // Show uncommitted changes
    if (context.hasUncommittedChanges) {
      const work = context.uncommittedWork;
      console.log(chalk.yellow('⚠️  Uncommitted Changes:'));

      if (work.modified?.length > 0) {
        console.log(chalk.dim(`   Modified: ${work.modified.length} files`));
        work.modified.slice(0, 3).forEach((file: string) => {
          console.log(chalk.dim(`   - ${file}`));
        });
        if (work.modified.length > 3) {
          console.log(chalk.dim(`   ... and ${work.modified.length - 3} more`));
        }
      }

      if (work.created?.length > 0) {
        console.log(chalk.dim(`   Created: ${work.created.length} files`));
      }

      if (work.not_added?.length > 0) {
        console.log(chalk.dim(`   Untracked: ${work.not_added.length} files`));
      }
      console.log('');
    }

    // Show branch status
    if (context.currentBranch) {
      console.log(chalk.blue(`🌿 Branch: ${context.currentBranch}`));
      if (context.uncommittedWork?.ahead > 0) {
        console.log(chalk.dim(`   ${context.uncommittedWork.ahead} commits ahead of origin`));
      }
      console.log('');
    }

    // Resume point from synthesis (ADR-036)
    if (synthesis?.resumePoint) {
      const resume = synthesis.resumePoint;
      console.log(chalk.green('⚡ Resume Point:'));
      console.log(chalk.white(`   ${resume.summary}`));
      console.log('');
      console.log(chalk.yellow('📍 Next Action:'));
      console.log(chalk.white(`   ${resume.nextAction}`));
      console.log(chalk.dim(`   $ ${resume.suggestedCommand}`));

      if (resume.contextFiles.length > 0) {
        console.log('');
        console.log(chalk.cyan('📄 Context Files:'));
        resume.contextFiles.slice(0, 3).forEach(file => {
          console.log(chalk.dim(`   - ${file}`));
        });
      }
    } else {
      // Fallback to generic steps
      console.log(chalk.green('⚡ Next Steps:'));
      console.log(chalk.white('   1. Review uncommitted changes'));
      console.log(chalk.white('   2. Continue where you left off'));
      console.log(chalk.white('   3. Run tests to verify everything works'));
    }

    // Show warnings from synthesis
    if (synthesis?.warnings && synthesis.warnings.length > 0) {
      console.log('');
      console.log(chalk.yellow('⚠️  Warnings:'));
      synthesis.warnings.forEach(warning => {
        console.log(chalk.dim(`   - ${warning}`));
      });
    }

    console.log('');
    console.log(chalk.dim('💡 Tip: `ginko handoff` is optional - just walk away and come back anytime'));
  }

  /**
   * Load start-specific template for session initialization
   */
  async loadTemplate(): Promise<any> {
    return {
      requiredSections: [
        'session_configuration',
        'loaded_context_modules',
        'work_mode_setting',
        'immediate_actions',
        'warnings_and_blockers',
        'workstream_summary'
      ],
      contextToConsider: [
        'previous_handoff',
        'time_since_last_session',
        'uncommitted_changes',
        'branch_state',
        'test_status',
        'active_workstream'
      ],
      rulesAndConstraints: [
        'Load ONLY relevant modules based on handoff workstream',
        'Set appropriate work mode for current state',
        'Provide immediate actionable first step with command',
        'Surface blockers and issues immediately',
        'Achieve flow state in <30 seconds',
        'Display exact commands to run',
        'Show specific file and line to continue from'
      ]
    };
  }


  /**
   * Generate prompt for intelligent initialization
   */
  async generatePrompt(intent: string, template: any, context: any): Promise<string> {
    const basePrompt = await super.generatePrompt(intent, template, context);

    const enhancedPrompt = `${basePrompt}

CRITICAL: Read the handoff and initialize session for INSTANT productivity.

HANDOFF CONTENT:
${context.lastHandoff || 'No previous handoff found - initialize fresh session'}

CURRENT STATE:
- Time since last session: ${context.timeSinceLastSession}
- Branch: ${context.currentBranch}
- Uncommitted changes: ${context.hasUncommittedChanges ? 'Yes (' + context.uncommittedWork.files.length + ' files)' : 'None'}
- Test status: ${context.testStatus}

REQUIRED ACTIONS:

1. LOAD CONTEXT MODULES - Based on handoff, determine which modules are ESSENTIAL:
   - Look for "Critical Context Modules" section in handoff
   - Match modules to current workstream focus
   - Load ONLY what's needed for immediate work

2. SET WORK MODE - Choose based on state and time:
   - Hack & Ship: Quick fixes, < 30 min sessions
   - Think & Build: Feature development, normal sessions
   - Full Planning: Architecture changes, complex work

3. PROVIDE FIRST ACTION - Be SPECIFIC:
   - Exact command to run
   - Specific file and line number to open
   - Clear next step from handoff's "Next Session Instructions"

4. SURFACE ISSUES - Warn about:
   - Uncommitted changes that might conflict
   - Failed tests from previous session
   - Missing dependencies or configuration

5. INSTANT FLOW STATE - Output should enable:
   - Developer knows EXACTLY what to do first
   - All context loaded and ready
   - No confusion about current state

Example output structure:
- Welcome back! Resuming: [workstream focus]
- Loaded modules: [specific modules from handoff]
- Work mode: [chosen mode]
- First action: "Continue implementing [feature] at [file:line]"
- Run: \`[exact command]\`
- Warning: [any blockers]`;

    return enhancedPrompt;
  }

  /**
   * Read the previous handoff file
   */
  private async readHandoff(sessionDir: string): Promise<string | null> {
    const currentPath = path.join(sessionDir, 'current.md');
    if (await fs.pathExists(currentPath)) {
      return fs.readFile(currentPath, 'utf-8');
    }

    // Check archive for most recent
    const archiveDir = path.join(sessionDir, 'archive');
    if (await fs.pathExists(archiveDir)) {
      const files = await fs.readdir(archiveDir);
      const handoffs = files
        .filter(f => f.endsWith('.md'))
        .sort()
        .reverse();

      if (handoffs.length > 0) {
        return fs.readFile(path.join(archiveDir, handoffs[0]), 'utf-8');
      }
    }

    return null;
  }

  /**
   * Parse workstream information from handoff
   */
  private async parseWorkstreamFromHandoff(handoff: string | null): Promise<any> {
    if (!handoff) {
      return {
        prds: [],
        adrs: [],
        tasks: [],
        modules: [],
        focus: 'Fresh session'
      };
    }

    const workstream: any = {
      prds: [],
      adrs: [],
      tasks: [],
      modules: [],
      focus: 'Continuing previous work'
    };

    // Extract PRDs
    const prdMatches = handoff.matchAll(/PRD-(\d+)[:\s-]*([\w\s-]+)/gi);
    for (const match of prdMatches) {
      workstream.prds.push({ number: `PRD-${match[1]}`, title: match[2].trim() });
    }

    // Extract ADRs
    const adrMatches = handoff.matchAll(/ADR-(\d+)[:\s-]*([\w\s-]+)/gi);
    for (const match of adrMatches) {
      workstream.adrs.push({ number: `ADR-${match[1]}`, title: match[2].trim() });
    }

    // Extract Tasks
    const taskMatches = handoff.matchAll(/TASK-(\d+)[:\s-]*([\w\s-]+)/gi);
    for (const match of taskMatches) {
      workstream.tasks.push({ number: `TASK-${match[1]}`, title: match[2].trim() });
    }

    // Extract critical modules
    const moduleSection = handoff.match(/Critical Context Modules.*?\n([\s\S]*?)(?=\n##|\n#|$)/i);
    if (moduleSection) {
      const moduleLines = moduleSection[1].split('\n');
      for (const line of moduleLines) {
        const moduleMatch = line.match(/[-*]\s*(.+\.md)/);
        if (moduleMatch) {
          workstream.modules.push(moduleMatch[1].trim());
        }
      }
    }

    // Extract focus
    const focusMatch = handoff.match(/Current Focus:\s*(.+)/i) ||
                       handoff.match(/Workstream Focus:\s*(.+)/i);
    if (focusMatch) {
      workstream.focus = focusMatch[1].trim();
    }

    return workstream;
  }

  /**
   * Calculate time since last session
   */
  private calculateTimeSince(handoff: string | null): string {
    if (!handoff) return 'Unknown';

    const timestampMatch = handoff.match(/timestamp:\s*(\d+)/);
    if (timestampMatch) {
      const previousTime = parseInt(timestampMatch[1], 10);
      const currentTime = Date.now();
      const minutesSince = Math.round((currentTime - previousTime) / 60000);

      if (minutesSince < 60) {
        return `${minutesSince} minutes`;
      } else if (minutesSince < 1440) {
        return `${Math.round(minutesSince / 60)} hours`;
      } else {
        return `${Math.round(minutesSince / 1440)} days`;
      }
    }

    return 'Unknown';
  }

  /**
   * Check test status
   */
  private async getTestStatus(): Promise<string> {
    // This would check actual test results
    // For now, return a placeholder
    return 'Unknown - run tests to verify';
  }

  /**
   * Load a specific context module
   */
  private async loadContextModule(moduleName: string): Promise<void> {
    const ginkoDir = await getGinkoDir();
    const modulePath = path.join(ginkoDir, 'context', 'modules', moduleName);

    if (await fs.pathExists(modulePath)) {
      // In a real implementation, this would load the module into context
      console.log(chalk.dim(`  ✓ Loaded: ${moduleName}`));
    }
  }

  /**
   * Set the work mode
   */
  private async setWorkMode(mode: string): Promise<void> {
    // In a real implementation, this would configure the session
    console.log(chalk.cyan(`📋 Work mode: ${mode}`));
  }

  /**
   * Parse recommendations from reflection output
   */
  private parseRecommendations(output: any): any {
    // This would parse the actual reflection output
    // For now, return structured recommendations
    return {
      modulesToLoad: [],
      workMode: 'Think & Build',
      firstAction: 'Continue where you left off',
      warnings: []
    };
  }

  /**
   * Display instructions for achieving flow state
   */
  private displayFlowStateInstructions(recommendations: any): void {
    console.log(chalk.green('\n✨ Session Ready!\n'));

    if (recommendations.workMode) {
      console.log(chalk.cyan(`Work Mode: ${recommendations.workMode}`));
    }

    if (recommendations.modulesToLoad && recommendations.modulesToLoad.length > 0) {
      console.log(chalk.cyan('\nContext Modules Loaded:'));
      recommendations.modulesToLoad.forEach((m: string) => {
        console.log(chalk.dim(`  • ${m}`));
      });
    }

    if (recommendations.firstAction) {
      console.log(chalk.yellow('\n🎯 First Action:'));
      console.log(chalk.white(`  ${recommendations.firstAction}`));
    }

    if (recommendations.warnings && recommendations.warnings.length > 0) {
      console.log(chalk.red('\n⚠️  Warnings:'));
      recommendations.warnings.forEach((w: string) => {
        console.log(chalk.dim(`  • ${w}`));
      });
    }

    console.log(chalk.dim('\n💡 Tip: Run `ginko handoff` before stopping to preserve context\n'));
  }

  /**
   * Determine work mode based on context and options
   */
  private determineWorkMode(context: any, options: any): WorkMode {
    // Check for explicit option
    if (options.mode) {
      switch (options.mode.toLowerCase()) {
        case 'hack':
        case 'ship':
        case 'hack-ship':
          return 'hack-ship';
        case 'plan':
        case 'planning':
        case 'full-planning':
          return 'full-planning';
        default:
          return 'think-build';
      }
    }

    // Determine from session context
    const timeSince = context.timeSinceLastSession || '';
    const hasUncommitted = context.hasUncommittedChanges;
    const branchName = context.currentBranch || '';

    // Quick hack mode if short session or hotfix branch
    if (timeSince.includes('minutes') && parseInt(timeSince) < 30) {
      return 'hack-ship';
    }

    if (branchName.includes('hotfix') || branchName.includes('fix')) {
      return 'hack-ship';
    }

    // Full planning mode for architecture branches or long breaks
    if (branchName.includes('arch') || branchName.includes('refactor')) {
      return 'full-planning';
    }

    if (timeSince.includes('days') || timeSince.includes('week')) {
      return 'full-planning';
    }

    // Default to think-build
    return 'think-build';
  }

  /**
   * Extract tags from handoff content for context loading
   */
  private extractTagsFromHandoff(handoff: string | null): string[] {
    if (!handoff) return [];

    const tags: string[] = [];

    // Extract PRD/ADR references
    const prdMatches = handoff.matchAll(/PRD-(\d+)/gi);
    for (const match of prdMatches) {
      tags.push(`PRD-${match[1]}`);
    }

    const adrMatches = handoff.matchAll(/ADR-(\d+)/gi);
    for (const match of adrMatches) {
      tags.push(`ADR-${match[1]}`);
    }

    // Extract technology keywords
    const techKeywords = ['typescript', 'react', 'node', 'api', 'database', 'auth', 'testing', 'deployment'];
    for (const keyword of techKeywords) {
      if (handoff.toLowerCase().includes(keyword)) {
        tags.push(keyword);
      }
    }

    return [...new Set(tags)]; // Remove duplicates
  }

  /**
   * Update gatherContext to include userSlug
   */
  async gatherContext(parsedIntent: any): Promise<any> {
    const git = simpleGit();
    const ginkoDir = await getGinkoDir();
    const userEmail = await getUserEmail();
    const userSlug = userEmail.replace('@', '-at-').replace(/\./g, '-');
    const sessionDir = path.join(ginkoDir, 'sessions', userSlug);

    // Read previous handoff - this is critical
    const handoff = await this.readHandoff(sessionDir);
    const workstream = await this.parseWorkstreamFromHandoff(handoff);

    // Get current state
    const status = await git.status();
    const branch = await git.branchLocal();

    // Calculate time since last session
    const timeSince = this.calculateTimeSince(handoff);

    // Check for test failures
    const testStatus = await this.getTestStatus();

    return {
      userSlug,
      lastHandoff: handoff,
      workstream: workstream,
      uncommittedWork: status,
      timeSinceLastSession: timeSince,
      branchState: branch,
      currentBranch: branch.current,
      testStatus: testStatus,
      hasUncommittedChanges: status.files.length > 0
    };
  }

  /**
   * Initialize session logging (ADR-033)
   */
  private async initializeSessionLog(context: any, options: any): Promise<void> {
    // Skip if disabled
    if (options.noLog) {
      return;
    }

    const ginkoDir = await getGinkoDir();
    const userEmail = await getUserEmail();
    const userSlug = userEmail.replace('@', '-at-').replace(/\./g, '-');
    const sessionDir = path.join(ginkoDir, 'sessions', userSlug);

    // Create session log if it doesn't exist
    const hasLog = await SessionLogManager.hasSessionLog(sessionDir);
    if (!hasLog) {
      await SessionLogManager.createSessionLog(
        sessionDir,
        userEmail,
        context.currentBranch || 'unknown'
      );
    }
  }
}

// Export for CLI use
export default StartReflectionCommand;
