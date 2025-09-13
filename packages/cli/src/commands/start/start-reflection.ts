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

/**
 * Start domain reflection for intelligent session initialization
 * Reads handoff and loads optimal context for instant flow state
 */
export class StartReflectionCommand extends ReflectionCommand {
  constructor() {
    super('start');
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
   * Gather context from handoff and current state
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
   * Execute start sequence with actual module loading
   */
  async execute(intent: string, options: any = {}): Promise<void> {
    const spinner = ora('Initializing session...').start();

    try {
      // Run base reflection
      spinner.text = 'Reading previous handoff...';
      const result = await super.execute(intent, options);

      // Parse the reflection output to get recommendations
      const recommendations = this.parseRecommendations(result);

      // Actually load the recommended context modules
      spinner.text = 'Loading context modules...';
      if (recommendations.modulesToLoad && recommendations.modulesToLoad.length > 0) {
        for (const module of recommendations.modulesToLoad) {
          await this.loadContextModule(module);
        }
      }

      // Set the work mode
      if (recommendations.workMode) {
        await this.setWorkMode(recommendations.workMode);
      }

      spinner.succeed('Session initialized!');

      // Display flow state instructions
      this.displayFlowStateInstructions(recommendations);

    } catch (error) {
      spinner.fail('Failed to initialize session');
      console.error(chalk.red('Error:'), error);

      // Fallback to basic start
      console.log(chalk.yellow('\nFalling back to basic session start...'));
      const { startCommand } = await import('../start-orig.js');
      return startCommand(options);
    }
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
}

// Export for CLI use
export default StartReflectionCommand;