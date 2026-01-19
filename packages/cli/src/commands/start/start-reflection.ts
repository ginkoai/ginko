/**
 * @fileType: command
 * @status: current
 * @updated: 2026-01-05
 * @tags: [start, reflection, session, initialization, context, onboarding-optimization]
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
import { initializeQueue } from '../../lib/event-queue.js';
import { formatContextSummary as formatEventContextSummary, LoadedContext } from '../../lib/context-loader-events.js';
import {
  loadSprintChecklist,
  loadSprintContent,
  formatSprintChecklist,
  formatCurrentTaskDetails,
  detectSprintProgression,
  SprintProgressionInfo,
  SprintChecklist,
  Task,
  TaskState,
  SprintContent,
  TaskContent
} from '../../lib/sprint-loader.js';
import {
  loadStateCache,
  saveStateCache,
  checkCacheStaleness,
  CacheStalenessResult,
  ActiveSprintData
} from '../../lib/state-cache.js';
import {
  AISessionContext,
  formatHumanOutput,
  formatVerboseOutput,
  formatAIContextJSONL,
  formatTableOutput,
  formatEpicComplete,
  formatSprintProgressionPrompt
} from '../../lib/output-formatter.js';
import {
  getUserCurrentSprint,
  setUserCurrentSprint,
  createAssignmentFromFile,
  getSprintFileFromAssignment,
  UserSprintAssignment
} from '../../lib/user-sprint.js';
import {
  GraphApiClient,
  TaskPatternsResponse,
  TaskGotchasResponse,
  TaskConstraintsResponse,
  ActiveSprintResponse
} from '../graph/api-client.js';
import { isGraphInitialized, getGraphId } from '../graph/config.js';
import { isAuthenticated } from '../../utils/auth-storage.js';
import {
  checkSchedule,
  recordRun,
  getPeriodDays
} from '../../lib/insights/scheduler.js';
import { checkStaleness, displayStalenessWarning } from '../../lib/staleness-detector.js';
import { getAccessToken } from '../../utils/auth-storage.js';

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
   * Check for unsynced knowledge nodes (TASK-5)
   * Returns count of nodes edited in dashboard but not synced to git
   */
  private async checkUnsyncedNodes(): Promise<number> {
    try {
      // Only check if authenticated and graph initialized
      if (!await isAuthenticated() || !await isGraphInitialized()) {
        return 0;
      }

      const graphId = await getGraphId();
      if (!graphId) {
        return 0;
      }

      const client = new GraphApiClient();

      // Use a timeout to avoid blocking startup
      const response = await Promise.race([
        client.request<{ nodes: any[]; count: number }>(
          'GET',
          `/api/v1/graph/nodes/unsynced?graphId=${encodeURIComponent(graphId)}`
        ),
        new Promise<null>((resolve) => setTimeout(() => resolve(null), 2000))
      ]);

      if (!response) {
        // Timeout - return 0 (don't block startup)
        return 0;
      }

      return response.count || 0;
    } catch {
      // Non-blocking - if API fails, just return 0
      return 0;
    }
  }

  /**
   * Convert graph API sprint response to local SprintChecklist format
   * Enables graph-first loading with seamless fallback to local files
   * Handles both clean API responses and raw Neo4j node format
   */
  private convertGraphSprintToChecklist(graphSprint: any): any {
    // Helper to extract properties (handles Neo4j raw format vs clean format)
    const getProps = (obj: any): any => obj?.properties || obj;

    // Map graph task status to local TaskState format
    const mapStatus = (status: string): 'todo' | 'in_progress' | 'paused' | 'complete' => {
      switch (status?.toLowerCase()) {
        case 'complete':
        case 'completed':
          return 'complete';
        case 'in_progress':
        case 'in-progress':
          return 'in_progress';
        case 'paused':
        case 'sleeping':
          return 'paused';
        default:
          return 'todo';
      }
    };

    const sprintProps = getProps(graphSprint.sprint);

    // Convert tasks
    const tasks = (graphSprint.tasks || []).map((t: any) => {
      const taskProps = getProps(t);
      return {
        id: taskProps.id,
        title: taskProps.title,
        state: mapStatus(taskProps.status),
        status: taskProps.status,
        files: taskProps.files || [],
        priority: taskProps.priority || 'medium',
        relatedADRs: taskProps.relatedADRs || [],
      };
    });

    // Find current task (first in_progress or first todo)
    const inProgressTask = tasks.find((t: any) => t.state === 'in_progress');
    const todoTask = tasks.find((t: any) => t.state === 'todo');
    let currentTask = inProgressTask || todoTask;

    // Use nextTask from API if available
    if (graphSprint.nextTask) {
      const nextTaskProps = getProps(graphSprint.nextTask);
      currentTask = {
        id: nextTaskProps.id,
        title: nextTaskProps.title,
        state: mapStatus(nextTaskProps.status),
        status: nextTaskProps.status,
        files: nextTaskProps.files || [],
        priority: nextTaskProps.priority || 'medium',
        relatedADRs: nextTaskProps.relatedADRs || [],
      };
    }

    // Recent completions (last 3)
    const recentCompletions = tasks
      .filter((t: any) => t.state === 'complete')
      .slice(-3);

    return {
      name: sprintProps.name,
      file: sprintProps.id,
      progress: {
        complete: graphSprint.stats?.completedTasks || 0,
        inProgress: graphSprint.stats?.inProgressTasks || 0,
        paused: 0, // Graph API doesn't track paused separately
        todo: graphSprint.stats?.notStartedTasks || tasks.filter((t: any) => t.state === 'todo').length,
        total: graphSprint.stats?.totalTasks || tasks.length,
      },
      tasks,
      currentTask,
      recentCompletions,
      source: 'graph', // Mark source for debugging
    };
  }

  /**
   * Load sprint state from graph API with cache fallback (EPIC-015 Sprint 2 Task 3)
   *
   * Data flow:
   * 1. Try to fetch from graph API first
   * 2. On success: save to cache for offline use
   * 3. On failure: load from cache
   *
   * @param graphId - The graph namespace ID
   * @returns Sprint data and source indicator ('graph' | 'cache' | null)
   */
  private async loadSprintStateFromGraph(graphId: string): Promise<{
    data: ActiveSprintData | null;
    source: 'graph' | 'cache';
    staleness?: CacheStalenessResult;
  }> {
    const client = new GraphApiClient();

    try {
      // Try to fetch from graph API first
      const graphResponse = await client.getActiveSprint(graphId);

      // Convert API response to cache format
      const activeSprintData: ActiveSprintData = {
        sprintId: graphResponse.sprint.id,
        sprintName: graphResponse.sprint.name,
        epicId: graphResponse.sprint.id.split('_s')[0] || 'unknown', // Extract epic from e011_s01
        progress: {
          completed: graphResponse.stats.completedTasks,
          total: graphResponse.stats.totalTasks,
          percentage: graphResponse.stats.progressPercentage,
        },
        currentTask: graphResponse.nextTask ? {
          taskId: graphResponse.nextTask.id,
          taskName: graphResponse.nextTask.title,
          status: this.mapGraphStatusToTaskStatus(graphResponse.nextTask.status),
        } : undefined,
        nextTask: graphResponse.nextTask ? {
          taskId: graphResponse.nextTask.id,
          taskName: graphResponse.nextTask.title,
        } : undefined,
      };

      // Save to cache for offline use
      await saveStateCache(activeSprintData, graphId);

      return {
        data: activeSprintData,
        source: 'graph',
      };
    } catch (error) {
      // Graph unavailable - try to load from cache
      const cache = await loadStateCache();

      if (cache && cache.graph_id === graphId) {
        const staleness = checkCacheStaleness(cache);
        return {
          data: cache.active_sprint,
          source: 'cache',
          staleness,
        };
      }

      // No cache available
      return {
        data: null,
        source: 'cache',
      };
    }
  }

  /**
   * Map graph API status string to TaskStatus enum
   */
  private mapGraphStatusToTaskStatus(status: string): 'pending' | 'in_progress' | 'completed' {
    switch (status?.toLowerCase()) {
      case 'complete':
      case 'completed':
        return 'completed';
      case 'in_progress':
      case 'in-progress':
        return 'in_progress';
      default:
        return 'pending';
    }
  }

  /**
   * Map graph status to TaskState enum for SprintChecklist
   */
  private mapStatusToTaskState(status: string): TaskState {
    switch (status?.toLowerCase()) {
      case 'complete':
      case 'completed':
        return 'complete';
      case 'in_progress':
      case 'in-progress':
        return 'in_progress';
      case 'paused':
      case 'sleeping':
        return 'paused';
      case 'blocked':
        return 'in_progress'; // Treat blocked as in_progress for display
      default:
        return 'todo';
    }
  }

  /**
   * Merge graph status with local file content (EPIC-015 Sprint 2 Task 3)
   *
   * Graph API is authoritative for STATUS (progress, task states).
   * Local file provides CONTENT (descriptions, acceptance criteria, ADRs).
   *
   * @param graphData - Status data from graph API (or cache)
   * @param fileContent - Content from local sprint file
   * @returns Merged SprintChecklist with graph status + file content
   */
  private mergeGraphStatusWithContent(
    graphData: ActiveSprintData,
    fileContent: SprintContent,
    graphTasks?: Array<{ id: string; title: string; status: string; priority?: string; files?: string[] }>
  ): SprintChecklist {
    // Build task list: merge graph status with file content
    const tasks: Task[] = fileContent.tasks.map((fileTask: TaskContent) => {
      // Find matching task in graph data
      const graphTask = graphTasks?.find(gt => gt.id === fileTask.id);
      const status = graphTask?.status || 'not_started';

      return {
        id: fileTask.id,
        title: fileTask.title,
        state: this.mapStatusToTaskState(status),
        files: fileTask.files || graphTask?.files || [],
        effort: fileTask.effort,
        priority: fileTask.priority || graphTask?.priority,
        relatedADRs: fileTask.relatedADRs,
        relatedPatterns: fileTask.relatedPatterns,
        relatedGotchas: fileTask.relatedGotchas,
        acceptanceCriteria: fileTask.acceptanceCriteria,
        dependsOn: fileTask.dependsOn,
      };
    });

    // Calculate progress from graph data
    const progress = {
      complete: graphData.progress.completed,
      inProgress: tasks.filter(t => t.state === 'in_progress').length,
      paused: tasks.filter(t => t.state === 'paused').length,
      todo: graphData.progress.total - graphData.progress.completed - tasks.filter(t => t.state === 'in_progress').length,
      total: graphData.progress.total,
    };

    // Determine current task (first in_progress or first todo)
    const currentTask = tasks.find(t => t.state === 'in_progress') ||
                       tasks.find(t => t.state === 'todo');

    // Recent completions (completed tasks from the end of list)
    const recentCompletions = tasks
      .filter(t => t.state === 'complete')
      .slice(-3);

    return {
      name: graphData.sprintName,
      file: fileContent.file,
      progress,
      tasks,
      currentTask,
      recentCompletions,
      dependencyWarnings: fileContent.dependencyWarnings,
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
          maxBatchSize: 20,                 // 20 events max
          silent: true                      // Suppress logs for clean table output
        });
        // Don't print - table will be the only output
      } catch (error) {
        // Non-critical - continue without sync (silent)
      }

      // 3. Gather context (including handoff)
      const context = await this.gatherContext(parsedIntent);
      context.isNewSession = true; // Always a new session with chronological loading

      // 4. Read previous session log BEFORE archiving (ADR-033: Fresh AI synthesis at optimal pressure)
      spinner.text = 'Reading previous session log...';
      const ginkoDir = await getGinkoDir();
      const userEmail = await getUserEmail();
      const userSlug = userEmail.replace('@', '-at-').replace(/\./g, '-');
      const sessionDir = path.join(ginkoDir, 'sessions', userSlug);
      const projectRoot = await getProjectRoot();

      // Load sprint checklist for session context (EPIC-015 Sprint 2 Task 3)
      // NEW DATA FLOW: Graph API is authoritative for STATUS, file provides CONTENT
      // 1. Fetch status from graph API (with cache fallback)
      // 2. Load content from local sprint file
      // 3. Merge: graph status + file content
      let sprintChecklist: SprintChecklist | null = null;
      let sprintSource: 'graph' | 'cache' | 'local' | 'user' = 'local';
      let isOffline = false;
      let cacheAge: string | undefined;
      let cacheStaleness: CacheStalenessResult['level'] | undefined;

      // First, check if user has a specific sprint assignment
      // EPIC-012: Per-user sprint tracking enables multiple users on different sprints
      const userSprint = await getUserCurrentSprint();
      let userSprintLoaded = false;
      let sprintFilePath: string | undefined;

      if (userSprint) {
        try {
          const userSprintFile = await getSprintFileFromAssignment(userSprint);
          if (await fs.pathExists(userSprintFile)) {
            sprintFilePath = userSprintFile;
            userSprintLoaded = true;
          }
        } catch {
          // User sprint file may have been deleted - clear the assignment
          // We'll fall back to global sprint
        }
      }

      // Load sprint with graph-first status (EPIC-015 Sprint 2 Task 3)
      const graphId = await isGraphInitialized() ? await getGraphId() : null;
      const isGraphReady = await isAuthenticated() && graphId;

      if (isGraphReady && graphId) {
        // Graph-first approach: fetch status from graph API
        spinner.text = 'Fetching sprint status from graph...';

        const { data: graphData, source, staleness } = await this.loadSprintStateFromGraph(graphId);

        if (graphData) {
          // Load content from local file
          const fileContent = await loadSprintContent(projectRoot, sprintFilePath);

          if (fileContent) {
            // Get detailed task statuses from graph for merging
            const client = new GraphApiClient();
            let graphTasks: Array<{ id: string; title: string; status: string; priority?: string; files?: string[] }> = [];
            try {
              const graphResponse = await client.getActiveSprint(graphId);
              graphTasks = graphResponse.tasks || [];
            } catch {
              // Use cached/minimal task info
            }

            // Merge graph status with file content
            sprintChecklist = this.mergeGraphStatusWithContent(graphData, fileContent, graphTasks);
            sprintSource = source;

            // Set offline metadata if using cache
            if (source === 'cache') {
              isOffline = true;
              cacheAge = staleness?.ageHuman;
              cacheStaleness = staleness?.level;

              if (staleness?.showWarning) {
                spinner.text = `Using cached sprint status (${staleness.ageHuman})`;
              }
            }
          } else {
            // No local file content - use graph data with convertGraphSprintToChecklist
            const client = new GraphApiClient();
            try {
              const graphResponse = await client.getActiveSprint(graphId);
              sprintChecklist = this.convertGraphSprintToChecklist(graphResponse);
              sprintSource = source;
              if (source === 'cache') {
                isOffline = true;
                cacheAge = staleness?.ageHuman;
                cacheStaleness = staleness?.level;
              }
            } catch {
              // Fall back to content-only
            }
          }
        } else {
          // No graph data and no cache - fall back to local file content only
          spinner.text = 'Graph unavailable, using local sprint file';
          const localChecklist = await loadSprintChecklist(projectRoot, sprintFilePath);
          if (localChecklist) {
            sprintChecklist = localChecklist;
            sprintSource = 'local';
            isOffline = true; // Mark as offline since we couldn't reach graph
          }
        }
      } else {
        // Graph not initialized - use local file only
        const localChecklist = await loadSprintChecklist(projectRoot, sprintFilePath);
        if (localChecklist) {
          sprintChecklist = localChecklist;
          sprintSource = userSprintLoaded ? 'user' : 'local';
        }
      }

      // Load session log content before archiving
      const previousSessionLog = await SessionLogManager.loadSessionLog(sessionDir);
      const hasLog = previousSessionLog.length > 100; // Non-empty log

      // 5. Synthesize from previous session log (at optimal 5-15% pressure)
      spinner.text = 'Synthesizing session context...';
      const synthesizer = new SessionSynthesizer(sessionDir, projectRoot);
      const synthesis = await synthesizer.synthesize();

      // 6. Archive previous session log (ALWAYS, not conditionally)
      if (hasLog) {
        spinner.text = 'Archiving previous session...';
        await SessionLogManager.archiveLog(sessionDir);
        // Silent - table will be the only output
      }

      // 7. Determine work mode from context and update context manager
      const workMode = this.determineWorkMode(context, options);
      this.contextManager = new ActiveContextManager(workMode);

      spinner.text = 'Loading context strategically...';

      // 8. Load context strategically (TASK-011: Chronological loading)
      // ADR-043 Phase 3 + TASK-011: Simple chronological loading is now the default
      // Falls back to strategic loading if event loading fails
      let strategyContext: StrategyContext;
      let eventContext: LoadedContext | undefined;
      let eventSynthesis: SynthesisOutput | undefined;

      // Allow disabling event-based loading with env var or --strategic flag
      const useEventBasedLoading = process.env.GINKO_USE_EVENT_CONTEXT !== 'false' && !options.strategic;

      if (useEventBasedLoading) {
        spinner.text = 'Loading recent events (chronological query)...';
        try {
          // TASK-011: Use simple chronological loading (no cursor needed!)
          const projectInfo = await import('../../utils/helpers.js').then(m => m.getProjectInfo());
          eventContext = await import('../../lib/context-loader-events.js').then(m =>
            m.loadRecentEvents(userEmail, projectInfo.name, {
              eventLimit: 15,  // ~3 sessions worth of events (ADR-043 optimization)
              includeTeam: options.team || false,
              teamEventLimit: 10,
              documentDepth: 2,
              teamDays: 7,
              silent: true,    // Suppress loading messages - table will be the only output
            })
          );

          // Ensure eventContext is defined
          if (!eventContext) {
            throw new Error('Event context loading failed');
          }

          // Silent - context summary will be shown in table
          spinner.text = 'Processing events...';

          // Generate synthesis from loaded events (replaces file-based synthesis)
          eventSynthesis = await SessionSynthesizer.synthesizeFromEvents(eventContext, projectRoot);

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

      // Use event-based synthesis if available (ADR-043), otherwise fall back to session log synthesis
      const activeSynthesis = eventSynthesis || synthesis;

      // Detect first-time member (e008_s03_t03 onboarding optimization)
      // First-time = no previous session log AND no/few events from this user
      const myEventsCount = eventContext?.myEvents?.length || 0;
      const isFirstTimeMember = !hasLog && myEventsCount < 3;

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
      const flowState = activeSynthesis?.flowState?.energy?.toLowerCase() as 'hot' | 'warm' | 'cool' | 'cold' | undefined;
      await this.initializeSessionLog(context, options, flowState);

      // Session logging status shown in table if needed

      // 11. Build AI context for dual output system (TASK-11)
      // Now async due to graph API enrichment (EPIC-002 Sprint 3 completion)
      // EPIC-015 Sprint 2: Include offline status for display
      const aiContext = await this.buildAIContext(
        context,
        activeSynthesis,
        strategyContext,
        eventContext,
        sprintChecklist,
        isFirstTimeMember,
        { isOffline, cacheAge, cacheStaleness }
      );

      // Store AI context for MCP/external access
      await this.storeAIContext(aiContext, sessionDir);

      // 12. Check sprint progression and epic completion (EPIC-012 Sprint 1)
      let sprintProgression: SprintProgressionInfo | null = null;
      if (sprintChecklist) {
        sprintProgression = await detectSprintProgression(sprintChecklist, projectRoot);

        // Display epic completion message if all sprints done
        if (sprintProgression?.isEpicComplete && sprintProgression.epicName) {
          console.log(formatEpicComplete(sprintProgression.epicName, sprintProgression.currentEpicId));
        }

        // Handle sprint progression (current sprint is 100% complete)
        if (sprintProgression?.isSprintComplete && sprintProgression.nextSprintId && !sprintProgression.isEpicComplete) {
          console.log(formatSprintProgressionPrompt(
            sprintProgression.currentSprintId,
            sprintProgression.nextSprintId,
            sprintProgression.nextSprintName || 'Next Sprint'
          ));

          // Auto-progress if flag is set
          if (options.autoProgress && sprintProgression.nextSprintFile) {
            spinner.text = 'Auto-advancing to next sprint...';
            const assignment = await createAssignmentFromFile(
              sprintProgression.nextSprintFile,
              sprintProgression.nextSprintName || 'Next Sprint',
              'auto'
            );
            if (assignment) {
              await setUserCurrentSprint(assignment);
              spinner.succeed(`Advanced to sprint: ${sprintProgression.nextSprintId}`);
            }
          }
        }
      }

      // 13. Stop spinner before any output
      spinner.stop();

      // EPIC-008 Sprint 2: Check team context staleness (silent - no output)
      await this.checkTeamStaleness();

      // EPIC-004: Push real-time cursor update on session start
      try {
        const { onSessionStart } = await import('../../lib/realtime-cursor.js');
        await onSessionStart();
      } catch {
        // Cursor update is non-critical - don't block session start
      }

      // Auto-update insights at scheduled intervals (1-day, 7-day, 30-day)
      this.runScheduledInsights().catch(() => {
        // Insights update is non-critical - don't block session start
      });

      // 14. Display output LAST (after all async operations complete)
      // Table view is the FINAL output - nothing should print after it
      if (options.verbose) {
        // Verbose mode: Full session info (~80 lines)
        await this.displaySessionInfo(context, contextLevel, activeSynthesis, strategyContext, eventContext, sprintChecklist);
        console.log(formatVerboseOutput(aiContext));
        console.log('');
        console.log(chalk.dim(formatContextSummary(strategyContext)));
      } else {
        // Default mode: Compact table (use --full for task list)
        this.displayConciseOutput(aiContext, {
          compact: options.compact,
          table: options.table,
          full: options.full
        });
      }

    } catch (error) {
      spinner.fail('Session initialization failed');
      console.error(chalk.red(`Start failed: ${error}`));
      throw error;
    }
  }

  /**
   * Display session information based on synthesis (ADR-036)
   * Enhanced with strategic context metrics (TASK-011)
   * EPIC-001: Display charter, team activity, patterns
   * TASK-5: Display sprint checklist with [@] current task
   */
  private async displaySessionInfo(
    context: any,
    contextLevel?: ContextLevel,
    synthesis?: SynthesisOutput,
    strategyContext?: StrategyContext,
    eventContext?: any,
    sprintChecklist?: any
  ): Promise<void> {
    console.log('');

    // Display session information (TASK-011: Chronological loading, no cursor state)
    if (context.currentBranch) {
      console.log(chalk.cyan(`🆕 Session:`));
      console.log(chalk.dim(`   Chronological loading on ${chalk.bold(context.currentBranch)}`));
      console.log(chalk.dim(`   Loading last 50 events (no cursor state)`));
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

    // Display strategic context (EPIC-001: Charter, Team, Patterns)
    if (eventContext?.strategicContext) {
      const strategic = eventContext.strategicContext;
      const workMode = context.workMode || 'Think & Build';

      // Charter section
      if (strategic.charter) {
        console.log(chalk.cyan('📜 Project Charter'));
        console.log(chalk.dim(`   Purpose: ${strategic.charter.purpose}`));

        if (workMode !== 'Hack & Ship' && strategic.charter.goals && strategic.charter.goals.length > 0) {
          console.log('');
          console.log(chalk.dim('   🎯 Goals:'));
          const goalLimit = workMode === 'Full Planning' ? 5 : 3;
          strategic.charter.goals.slice(0, goalLimit).forEach((goal: string, i: number) => {
            console.log(chalk.dim(`   ${i + 1}. ${goal}`));
          });
          if (strategic.charter.goals.length > goalLimit) {
            console.log(chalk.dim(`   ... and ${strategic.charter.goals.length - goalLimit} more`));
          }
        }
        console.log('');
      }

      // Team activity section
      if (strategic.teamActivity && strategic.teamActivity.length > 0) {
        console.log(chalk.cyan('👥 Team Activity (7d)'));

        if (workMode === 'Hack & Ship') {
          // Just show count for Hack & Ship
          console.log(chalk.dim(`   ${strategic.teamActivity.length} team updates this week`));
        } else {
          // Group by category
          const decisions = strategic.teamActivity.filter((e: any) => e.category === 'decision');
          const achievements = strategic.teamActivity.filter((e: any) => e.category === 'achievement');

          if (decisions.length > 0) {
            console.log(chalk.yellow('   Decisions:'));
            decisions.slice(0, 3).forEach((d: any) => {
              const desc = d.description.length > 60 ? d.description.substring(0, 57) + '...' : d.description;
              console.log(chalk.dim(`   - ${d.user}: ${desc}`));
            });
          }

          if (achievements.length > 0) {
            console.log(chalk.green('   Achievements:'));
            achievements.slice(0, 3).forEach((a: any) => {
              const desc = a.description.length > 60 ? a.description.substring(0, 57) + '...' : a.description;
              console.log(chalk.dim(`   - ${a.user}: ${desc}`));
            });
          }
        }
        console.log('');
      }

      // Patterns & Gotchas section (skip in Hack & Ship mode)
      if (workMode !== 'Hack & Ship' && strategic.patterns && strategic.patterns.length > 0) {
        console.log(chalk.cyan('🧠 Relevant Patterns'));
        const limit = workMode === 'Full Planning' ? 5 : 3;
        strategic.patterns.slice(0, limit).forEach((p: any) => {
          const tags = p.tags ? ` [${p.tags.join(', ')}]` : '';
          console.log(chalk.dim(`   - ${p.title}${tags}`));
        });
        if (strategic.patterns.length > limit) {
          console.log(chalk.dim(`   ... and ${strategic.patterns.length - limit} more`));
        }
        console.log('');
      }
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

      // Display sprint checklist (TASK-5) - replaces generic "In Progress"
      if (sprintChecklist) {
        console.log(formatSprintChecklist(sprintChecklist));
        if (sprintChecklist.currentTask) {
          console.log(formatCurrentTaskDetails(sprintChecklist.currentTask));
        }
      } else if (work.inProgress.length > 0) {
        // Fallback to generic in-progress if no sprint file
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
    // Priority order for next action (TASK-P3):
    // 1. If sprint has in_progress task -> "Continue: [task title]"
    // 2. If resume event has explicit nextAction -> use it
    // 3. Default -> "What would you like to work on?"

    // Determine next action with single source of truth
    let nextAction: string;
    let resumeSummary: string;

    if (sprintChecklist?.currentTask) {
      const task = sprintChecklist.currentTask;
      const isInProgress = task.state === 'in_progress';

      // Sprint task takes priority
      resumeSummary = synthesis?.resumePoint?.summary || 'Resuming sprint work';
      nextAction = isInProgress
        ? `Continue: ${task.title}`
        : `Begin: ${task.title}`;
    } else if (synthesis?.resumePoint) {
      // Use synthesis resume point if no sprint task
      resumeSummary = synthesis.resumePoint.summary;
      nextAction = synthesis.resumePoint.nextAction;
    } else {
      // Generic fallback
      resumeSummary = 'Ready to work';
      nextAction = 'What would you like to work on?';
    }

    // Display coherent resume + next action
    console.log(chalk.green('⚡ Resume Point:'));
    console.log(chalk.white(`   ${resumeSummary}`));
    console.log('');
    console.log(chalk.yellow('📍 Next Action:'));
    console.log(chalk.white(`   ${nextAction}`));

    // Only show context files if available and no sprint task
    if (!sprintChecklist?.currentTask && synthesis?.resumePoint?.contextFiles) {
      const contextFiles = synthesis.resumePoint.contextFiles;
      if (contextFiles.length > 0) {
        console.log('');
        console.log(chalk.cyan('📄 Context Files:'));
        contextFiles.slice(0, 3).forEach(file => {
          console.log(chalk.dim(`   - ${file}`));
        });
      }
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
    console.log(chalk.bold('Ready to build! ') + chalk.dim('Start working and I\'ll help track context.'));
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
    const projectRoot = await getProjectRoot();
    const git = simpleGit(projectRoot);
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
   * Enriched task context from graph API (EPIC-002 Sprint 3 completion)
   */
  private enrichedTaskContext?: {
    patterns: AISessionContext['sprint'] extends { currentTask?: { patterns?: infer P } } ? P : never;
    gotchas: AISessionContext['sprint'] extends { currentTask?: { gotchas?: infer G } } ? G : never;
    constraints: AISessionContext['sprint'] extends { currentTask?: { constraints?: infer C } } ? C : never;
  };

  /**
   * Enrich task context with patterns, gotchas, and constraints from graph API
   * (EPIC-002 Sprint 3 completion - completes cognitive scaffolding)
   *
   * Makes parallel API calls with timeout protection and graceful fallback.
   */
  private async enrichTaskContext(
    taskId: string,
    relatedPatterns: string[],
    relatedGotchas: string[],
    relatedADRs: string[],
    workMode: string
  ): Promise<{
    patterns: NonNullable<NonNullable<AISessionContext['sprint']>['currentTask']>['patterns'];
    gotchas: NonNullable<NonNullable<AISessionContext['sprint']>['currentTask']>['gotchas'];
    constraints: NonNullable<NonNullable<AISessionContext['sprint']>['currentTask']>['constraints'];
  }> {
    // Check if graph is initialized
    if (!await isGraphInitialized()) {
      // Fallback: return ID-only data (current behavior)
      return {
        patterns: relatedPatterns.map(id => ({
          id,
          title: id,
          confidence: 'medium' as const,
          confidenceScore: 50,
          usageCount: 0,
        })),
        gotchas: relatedGotchas.map(id => ({
          id,
          title: id,
          severity: 'medium' as const,
          resolutionRate: 0,
        })),
        constraints: relatedADRs.map(id => ({
          adr: { id, title: id },
          source: 'sprint_definition',
        })),
      };
    }

    const client = new GraphApiClient();

    // Timeout wrapper for API calls
    const withTimeout = <T>(promise: Promise<T>, ms: number): Promise<T | null> => {
      return Promise.race([
        promise,
        new Promise<null>((resolve) => setTimeout(() => resolve(null), ms))
      ]);
    };

    // Parallel API calls with 2s timeout each
    const [patternsRes, gotchasRes, constraintsRes] = await Promise.all([
      withTimeout(client.getTaskPatterns(taskId).catch(() => null), 2000),
      withTimeout(client.getTaskGotchas(taskId).catch(() => null), 2000),
      withTimeout(client.getTaskConstraints(taskId).catch(() => null), 2000),
    ]);

    // Filter patterns by work mode
    const filterPatterns = (patterns: TaskPatternsResponse['patterns']): NonNullable<NonNullable<AISessionContext['sprint']>['currentTask']>['patterns'] => {
      let filtered = patterns;
      switch (workMode) {
        case 'Hack & Ship':
          filtered = patterns.filter(p => p.pattern.confidence === 'high').slice(0, 1);
          break;
        case 'Think & Build':
          filtered = patterns.filter(p => p.pattern.confidenceScore >= 50).slice(0, 3);
          break;
        // Full Planning: return all
      }
      return filtered.map(p => ({
        id: p.pattern.id,
        title: p.pattern.title,
        confidence: p.pattern.confidence,
        confidenceScore: p.pattern.confidenceScore,
        content: p.pattern.content,
        usageCount: p.pattern.usageCount,
        usages: p.usages,
      }));
    };

    // Filter gotchas by work mode
    const filterGotchas = (gotchas: TaskGotchasResponse['gotchas']): NonNullable<NonNullable<AISessionContext['sprint']>['currentTask']>['gotchas'] => {
      let filtered = gotchas;
      switch (workMode) {
        case 'Hack & Ship':
          filtered = gotchas.filter(g => g.gotcha.severity === 'critical');
          break;
        case 'Think & Build':
          filtered = gotchas.filter(g => ['critical', 'high'].includes(g.gotcha.severity));
          break;
        // Full Planning: return all
      }
      return filtered.map(g => ({
        id: g.gotcha.id,
        title: g.gotcha.title,
        severity: g.gotcha.severity,
        symptom: g.gotcha.symptom,
        cause: g.gotcha.cause,
        solution: g.gotcha.solution,
        resolutionRate: g.stats.resolutionRate,
      }));
    };

    // Process API responses with fallback to ID-only
    // Note: Check length > 0 since empty array is truthy
    const patterns = patternsRes?.patterns?.length
      ? filterPatterns(patternsRes.patterns)
      : relatedPatterns.map(id => ({
          id,
          title: id,
          confidence: 'medium' as const,
          confidenceScore: 50,
          usageCount: 0,
        }));

    const gotchas = gotchasRes?.gotchas?.length
      ? filterGotchas(gotchasRes.gotchas)
      : relatedGotchas.map(id => ({
          id,
          title: id,
          severity: 'medium' as const,
          resolutionRate: 0,
        }));

    const constraints = constraintsRes?.constraints?.length
      ? constraintsRes.constraints.map(c => ({
          adr: {
            id: c.adr.id,
            title: c.adr.title,
            summary: c.adr.summary,
          },
          source: c.relationship.source,
        }))
      : relatedADRs.map(id => ({
          adr: { id, title: id },
          source: 'sprint_definition',
        }));

    return { patterns, gotchas, constraints };
  }

  /**
   * Build AI context object for structured output (TASK-11)
   *
   * Creates a rich, structured context object that AI partners can parse.
   * This is the "AI UX" side of the dual output system.
   */
  private async buildAIContext(
    context: any,
    synthesis: SynthesisOutput | undefined,
    strategyContext: StrategyContext | undefined,
    eventContext: LoadedContext | undefined,
    sprintChecklist: any,
    isFirstTimeMember: boolean = false,
    offlineStatus?: {
      isOffline: boolean;
      cacheAge?: string;
      cacheStaleness?: 'fresh' | 'stale' | 'expired';
    }
  ): Promise<AISessionContext> {
    const workMode = context.workMode || 'Think & Build';

    // Build sprint object
    let sprint: AISessionContext['sprint'] | undefined;
    if (sprintChecklist) {
      // Calculate progress percentage from SprintChecklist.progress object
      const progressPercent = sprintChecklist.progress?.total > 0
        ? Math.round((sprintChecklist.progress.complete / sprintChecklist.progress.total) * 100)
        : 0;

      // Enrich task context from graph API (EPIC-002 Sprint 3 completion)
      let enrichedTask: Awaited<ReturnType<typeof this.enrichTaskContext>> | undefined;
      if (sprintChecklist.currentTask) {
        enrichedTask = await this.enrichTaskContext(
          sprintChecklist.currentTask.id,
          sprintChecklist.currentTask.relatedPatterns || [],
          sprintChecklist.currentTask.relatedGotchas || [],
          sprintChecklist.currentTask.relatedADRs || [],
          workMode
        );
      }

      sprint = {
        id: sprintChecklist.file || 'unknown',
        name: sprintChecklist.name || 'Active Sprint',
        goal: synthesis?.sprintContext?.goal || '',
        progress: progressPercent,
        currentTask: sprintChecklist.currentTask ? {
          id: sprintChecklist.currentTask.id,
          title: sprintChecklist.currentTask.title,
          status: sprintChecklist.currentTask.status || 'in_progress',
          files: sprintChecklist.currentTask.files || [],
          priority: sprintChecklist.currentTask.priority || 'medium',
          // Enriched from graph API (EPIC-002 Sprint 3 completion)
          constraints: enrichedTask?.constraints,
          patterns: enrichedTask?.patterns,
          gotchas: enrichedTask?.gotchas,
        } : undefined,
        tasks: (sprintChecklist.tasks || []).map((t: any) => ({
          id: t.id,
          title: t.title,
          status: t.state === 'complete' ? 'completed'
            : t.state === 'in_progress' ? 'in_progress'
            : 'pending',
        })),
      };
    }

    // Build synthesis object
    let synthObj: AISessionContext['synthesis'] | undefined;
    if (synthesis) {
      synthObj = {
        completedWork: synthesis.workPerformed?.completed || [],
        inProgressWork: synthesis.workPerformed?.inProgress || [],
        blockedItems: synthesis.workPerformed?.blocked || [],
        keyDecisions: synthesis.discoveries?.decisions?.map((d: any) => d.description) || [],
        gotchas: synthesis.discoveries?.gotchas || [],
        resumePoint: synthesis.resumePoint?.summary,
        nextAction: synthesis.resumePoint?.nextAction,
        suggestedCommand: synthesis.resumePoint?.suggestedCommand,
      };
    }

    // Build git status
    const uncommittedChanges = {
      modified: context.uncommittedWork?.modified || [],
      created: context.uncommittedWork?.created || [],
      untracked: context.uncommittedWork?.not_added || [],
    };

    const warnings: string[] = [];
    const totalChanges =
      uncommittedChanges.modified.length +
      uncommittedChanges.created.length +
      uncommittedChanges.untracked.length;
    if (totalChanges > 0) {
      warnings.push(`${totalChanges} uncommitted files`);
    }
    if (synthesis?.warnings) {
      warnings.push(...synthesis.warnings);
    }

    // TASK-5: Check for unsynced knowledge nodes from dashboard
    const unsyncedCount = await this.checkUnsyncedNodes();
    if (unsyncedCount > 0) {
      warnings.push(`${unsyncedCount} knowledge ${unsyncedCount === 1 ? 'node' : 'nodes'} edited in dashboard. Run \`ginko sync\` to pull changes.`);
    }

    return {
      session: {
        id: `session-${Date.now()}`,
        branch: context.currentBranch || 'unknown',
        startedAt: new Date().toISOString(),
        flowScore: synthesis?.flowState?.score || 5,
        flowState: synthesis?.flowState?.energy || 'neutral',
        workMode: workMode,
        isFirstTimeMember,
        // EPIC-015 Sprint 2: Offline status indicators
        isOffline: offlineStatus?.isOffline,
        cacheAge: offlineStatus?.cacheAge,
        cacheStaleness: offlineStatus?.cacheStaleness,
      },
      charter: eventContext?.strategicContext?.charter,
      teamActivity: eventContext?.strategicContext?.teamActivity ? {
        decisions: eventContext.strategicContext.teamActivity
          .filter((e: any) => e.category === 'decision')
          .map((d: any) => ({
            user: d.user,
            description: d.description,
            timestamp: d.timestamp,
            impact: d.impact,
          })),
        achievements: eventContext.strategicContext.teamActivity
          .filter((e: any) => e.category === 'achievement')
          .map((a: any) => ({
            user: a.user,
            description: a.description,
            timestamp: a.timestamp,
          })),
      } : undefined,
      patterns: eventContext?.strategicContext?.patterns,
      sprint,
      synthesis: synthObj,
      git: {
        branch: context.currentBranch || 'unknown',
        commitsAhead: context.uncommittedWork?.ahead || 0,
        uncommittedChanges,
        warnings,
      },
      metrics: {
        eventsLoaded: eventContext?.event_count || 0,
        documentsLoaded: strategyContext?.metrics?.documentsLoaded || 0,
        tokenEstimate: strategyContext?.metrics?.totalTokens || eventContext?.token_estimate || 0,
        tokenReduction: strategyContext?.metrics?.tokenReductionPercent
          ? `${strategyContext.metrics.tokenReductionPercent}%`
          : undefined,
        loadTimeMs: strategyContext?.metrics?.bootstrapTimeMs || 0,
      },
    };
  }

  /**
   * Display concise human output (TASK-11)
   *
   * Now uses table view by default (EPIC-012 Sprint 1).
   * - Default: Table view with branding
   * - --compact: Previous concise format without borders
   * - --no-table: Plain text format for piping
   */
  private displayConciseOutput(
    aiContext: AISessionContext,
    options: { compact?: boolean; table?: boolean; full?: boolean } = {}
  ): void {
    console.log('');

    // Default: Full table with task list
    // --compact: Previous concise format without borders
    // --no-table (table === false): Plain text format for piping
    if (options.compact || options.table === false) {
      console.log(formatHumanOutput(aiContext, { workMode: aiContext.session.workMode as any }));
    } else {
      // Default: full table with task list
      console.log(formatTableOutput(aiContext));
    }

    console.log('');
  }

  /**
   * Store AI context to file for MCP/external access (TASK-11)
   *
   * Writes structured context to .ginko/sessions/[user]/current-context.jsonl
   */
  private async storeAIContext(aiContext: AISessionContext, sessionDir: string): Promise<void> {
    const contextPath = path.join(sessionDir, 'current-context.jsonl');

    try {
      // Append context as JSONL entry
      const jsonlEntry = formatAIContextJSONL(aiContext) + '\n';
      await fs.appendFile(contextPath, jsonlEntry);
    } catch (error) {
      // Non-critical - log but don't fail
      console.log(chalk.dim(`⚠️  Could not store AI context: ${(error as Error).message}`));
    }
  }

  /**
   * Initialize session logging (ADR-033)
   */
  private async initializeSessionLog(context: any, options: any, flowState?: 'hot' | 'warm' | 'cool' | 'cold'): Promise<void> {
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
        context.currentBranch || 'unknown',
        flowState
      );
    }
  }

  /**
   * Check team context staleness and display warning if needed (EPIC-008 Sprint 2)
   *
   * Runs after session initialization to alert users when team context
   * may be outdated. Non-blocking on failure.
   */
  private async checkTeamStaleness(): Promise<void> {
    try {
      // Only check if authenticated and graph initialized
      if (!await isAuthenticated() || !await isGraphInitialized()) {
        return;
      }

      const graphId = await getGraphId();
      const token = await getAccessToken();

      if (!graphId || !token) {
        return;
      }

      // Check staleness with default thresholds (1 day warning, 7 day critical)
      const result = await checkStaleness(graphId, token);

      // Display warning if stale
      if (result.isStale) {
        displayStalenessWarning(result);
      }
    } catch {
      // Staleness check is non-critical - don't block session start
    }
  }

  /**
   * Run scheduled insights updates in the background.
   * Checks which periods (1-day, 7-day, 30-day) need updates and runs them.
   * Non-blocking - runs asynchronously without awaiting completion.
   */
  private async runScheduledInsights(): Promise<void> {
    try {
      // Only run if authenticated (needed for sync)
      if (!await isAuthenticated()) {
        return;
      }

      // Check which periods need updates
      const periodsToRun = await checkSchedule();

      if (periodsToRun.length === 0) {
        return; // Nothing to update
      }

      // Import insights command dynamically to avoid circular dependency
      const { insightsCommand } = await import('../insights/insights-command.js');

      // Run insights for each period that needs updating
      // Run in background without blocking (fire and forget)
      for (const period of periodsToRun) {
        const days = getPeriodDays(period);

        try {
          // Run insights with sync enabled (silent output)
          const originalLog = console.log;
          const originalError = console.error;

          // Suppress output during background run
          console.log = () => {};
          console.error = () => {};

          try {
            await insightsCommand({
              days,
              sync: true,
              json: false,  // Don't need JSON output
            });

            // Record successful run (we don't have the score here, but API will store it)
            await recordRun(period, 0); // Score will be fetched from API later
          } finally {
            // Restore console output
            console.log = originalLog;
            console.error = originalError;
          }
        } catch {
          // Individual period failure is non-critical
          continue;
        }
      }
    } catch {
      // Entire scheduler failure is non-critical
    }
  }
}

// Export for CLI use
export default StartReflectionCommand;
