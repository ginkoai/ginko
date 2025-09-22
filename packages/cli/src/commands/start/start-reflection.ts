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
import { getUserEmail, getGinkoDir, detectWorkMode } from '../../utils/helpers.js';
import { ActiveContextManager, WorkMode, ContextLevel } from '../../services/active-context-manager.js';

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

      // 2. Load template
      const template = await this.loadTemplate();

      // 3. Gather context (including handoff)
      const context = await this.gatherContext(parsedIntent);

      // 4. Determine work mode from context and update context manager
      const workMode = this.determineWorkMode(context, options);
      this.contextManager = new ActiveContextManager(workMode);

      spinner.text = 'Loading context modules...';

      // 5. Load initial context using ActiveContextManager
      const sessionData = {
        userSlug: context.userSlug || 'unknown',
        branch: context.currentBranch,
        filesChanged: context.uncommittedWork?.files || [],
        tags: this.extractTagsFromHandoff(context.lastHandoff)
      };

      const contextLevel = await this.contextManager.loadInitialContext(sessionData);

      // 6. Display session information with loaded context
      await this.displaySessionInfo(context, contextLevel);

      spinner.succeed('Session initialized with progressive context loading!');

    } catch (error) {
      spinner.fail('Session initialization failed');
      console.error(chalk.red(`Start failed: ${error}`));
      throw error;
    }
  }

  /**
   * Display session information based on context
   */
  private async displaySessionInfo(context: any, contextLevel?: ContextLevel): Promise<void> {
    console.log('');

    // Display work mode
    const workMode = context.workMode || 'Think & Build';
    console.log(chalk.cyan(`📋 Work Mode: ${workMode}`));
    console.log('');

    // Display session header
    console.log(chalk.green('✨ Session Ready!'));
    console.log('');

    // Show handoff goal if available
    if (context.lastHandoff) {
      const goalMatch = context.lastHandoff.match(/\*\*Next Session Goal\*\*: (.+)/);
      if (goalMatch) {
        console.log(chalk.yellow(`🎯 Goal: ${goalMatch[1]}`));
        console.log('');
      }
    }

    // Show workstream if detected
    if (context.workstream?.focus && context.workstream.focus !== 'Continuing previous work') {
      console.log(chalk.magenta(`📁 Workstream: ${context.workstream.focus}`));

      if (context.workstream.prds?.length > 0) {
        console.log(chalk.dim('   PRDs:'));
        context.workstream.prds.forEach((prd: any) => {
          console.log(chalk.dim(`   - ${prd.number}: ${prd.title}`));
        });
      }

      if (context.workstream.adrs?.length > 0) {
        console.log(chalk.dim('   ADRs:'));
        context.workstream.adrs.forEach((adr: any) => {
          console.log(chalk.dim(`   - ${adr.number}: ${adr.title}`));
        });
      }

      if (context.workstream.tasks?.length > 0) {
        console.log(chalk.dim('   Tasks:'));
        context.workstream.tasks.forEach((task: any) => {
          console.log(chalk.dim(`   - ${task.number}: ${task.title}`));
        });
      }
      console.log('');
    }

    // Show loaded context modules from ActiveContextManager
    if (contextLevel) {
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

    // Instant action
    console.log(chalk.green('⚡ Next Steps:'));

    if (context.lastHandoff?.includes('Testing the fixed handoff')) {
      console.log(chalk.white('   1. Test the complete handoff → start cycle'));
      console.log(chalk.white('   2. Commit the handoff implementation fix'));
      console.log(chalk.white('   3. Begin Overview domain implementation'));
    } else {
      console.log(chalk.white('   1. Review uncommitted changes'));
      console.log(chalk.white('   2. Continue where you left off'));
      console.log(chalk.white('   3. Run tests to verify everything works'));
    }

    console.log('');
    console.log(chalk.dim('💡 Tip: Run `ginko handoff` before stopping to preserve context'));
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
}

// Export for CLI use
export default StartReflectionCommand;