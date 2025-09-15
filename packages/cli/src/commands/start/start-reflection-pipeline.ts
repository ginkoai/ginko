/**
 * @fileType: command
 * @status: current
 * @updated: 2025-09-15
 * @tags: [start, reflection, pipeline, builder, session]
 * @related: [../../core/simple-pipeline-base.ts, ./start-reflection.ts]
 * @priority: critical
 * @complexity: medium
 * @dependencies: [simple-pipeline-base, simple-git, fs-extra, ora]
 */

import { SimplePipelineBase, PipelineContext } from '../../core/simple-pipeline-base.js';
import simpleGit from 'simple-git';
import fs from 'fs-extra';
import * as path from 'path';
import chalk from 'chalk';
import ora from 'ora';
import { getUserEmail, getGinkoDir, detectWorkMode } from '../../utils/helpers.js';

/**
 * Start pipeline using Simple Builder Pattern
 * Refactored from StartReflectionCommand to use SimplePipelineBase
 * Implements ADR-013 for consistent pipeline architecture
 */
export class StartPipeline extends SimplePipelineBase {
  private git: any;
  private ginkoDir: string = '';
  private userEmail: string = '';
  private userSlug: string = '';
  private sessionDir: string = '';
  private spinner: any = null;

  constructor(intent: string = 'Initialize session with optimal context') {
    super(intent);
    this.withDomain('start');
  }

  /**
   * Initialize pipeline dependencies
   */
  async initialize(): Promise<this> {
    this.spinner = ora('Initializing session...').start();
    this.git = simpleGit();
    this.ginkoDir = await getGinkoDir();
    this.userEmail = await getUserEmail();
    this.userSlug = this.userEmail.replace('@', '-at-').replace(/\./g, '-');
    this.sessionDir = path.join(this.ginkoDir, 'sessions', this.userSlug);
    return this;
  }

  /**
   * Load start-specific template
   */
  loadTemplate(): this {
    const template = {
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

    this.withTemplate(template);
    return this;
  }

  /**
   * Read and parse handoff
   */
  async loadHandoff(): Promise<this> {
    const handoff = await this.readHandoff();
    const workstream = await this.parseWorkstreamFromHandoff(handoff);

    this.withMetadata({
      lastHandoff: handoff,
      workstream: workstream,
      hasHandoff: !!handoff
    });

    return this;
  }

  /**
   * Gather context from current state
   */
  async gatherContext(): Promise<this> {
    // Get current state
    const status = await this.git.status();
    const branch = await this.git.branchLocal();

    // Calculate time since last session
    const timeSince = this.calculateTimeSince(this.ctx.metadata?.lastHandoff);

    // Check for test status
    const testStatus = await this.getTestStatus();

    // Detect work mode
    const workMode = 'Think & Build'; // Default mode, could be enhanced with actual detection

    const context = {
      lastHandoff: this.ctx.metadata?.lastHandoff,
      workstream: this.ctx.metadata?.workstream,
      uncommittedWork: status,
      timeSinceLastSession: timeSince,
      branchState: branch,
      currentBranch: branch.current,
      testStatus: testStatus,
      hasUncommittedChanges: status.files.length > 0,
      workMode: workMode
    };

    this.withContext(context);
    return this;
  }

  /**
   * Display session information
   */
  displaySessionInfo(): this {
    const context = this.ctx.context;

    if (this.spinner) {
      this.spinner.succeed('Session initialized!');
    }

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

    // Show critical modules from handoff
    if (context.lastHandoff?.includes('Critical Context Modules')) {
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

    // Display next steps
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

    return this;
  }

  /**
   * Load context modules based on workstream
   */
  async loadContextModules(): Promise<this> {
    const workstream = this.ctx.metadata?.workstream;
    if (!workstream || !workstream.modules) {
      return this;
    }

    console.log(chalk.cyan('\n📚 Loading context modules...'));
    for (const module of workstream.modules) {
      await this.loadContextModule(module);
    }

    return this;
  }

  /**
   * Read the previous handoff file
   */
  private async readHandoff(): Promise<string | null> {
    const currentPath = path.join(this.sessionDir, 'current.md');
    if (await fs.pathExists(currentPath)) {
      return fs.readFile(currentPath, 'utf-8');
    }

    // Check archive for most recent
    const archiveDir = path.join(this.sessionDir, 'archive');
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
      const moduleCommands = moduleSection[1].match(/ginko context ([\w-]+)/g);
      if (moduleCommands) {
        moduleCommands.forEach(cmd => {
          const match = cmd.match(/ginko context ([\w-]+)/);
          if (match) {
            workstream.modules.push(match[1]);
          }
        });
      }
    }

    // Extract focus
    const focusMatch = handoff.match(/Current Focus:\s*(.+)/i) ||
                       handoff.match(/Workstream Focus:\s*(.+)/i);
    if (focusMatch) {
      workstream.focus = focusMatch[1].trim();
    }

    // De-duplicate arrays
    const uniquePrds = Array.from(new Set(workstream.prds.map((p: any) => JSON.stringify(p))));
    workstream.prds = uniquePrds.map((p: any) => JSON.parse(p as string));

    const uniqueAdrs = Array.from(new Set(workstream.adrs.map((a: any) => JSON.stringify(a))));
    workstream.adrs = uniqueAdrs.map((a: any) => JSON.parse(a as string));

    const uniqueTasks = Array.from(new Set(workstream.tasks.map((t: any) => JSON.stringify(t))));
    workstream.tasks = uniqueTasks.map((t: any) => JSON.parse(t as string));

    workstream.modules = Array.from(new Set(workstream.modules));

    return workstream;
  }

  /**
   * Calculate time since last session
   */
  private calculateTimeSince(handoff: string | null): string {
    if (!handoff) return 'Unknown';

    const sessionIdMatch = handoff.match(/Session ID.*?session-(\d+)/);
    if (sessionIdMatch) {
      const previousTime = parseInt(sessionIdMatch[1], 10);
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
    const modulePath = path.join(this.ginkoDir, 'context', 'modules', `${moduleName}.md`);

    if (await fs.pathExists(modulePath)) {
      // In a real implementation, this would load the module into context
      console.log(chalk.dim(`  ✓ Loaded: ${moduleName}`));
    } else {
      console.log(chalk.yellow(`  ⚠ Module not found: ${moduleName}`));
    }
  }

  /**
   * Custom validation for start pipeline
   */
  protected customValidate(): void {
    // Start doesn't require strict validation - it should always work
    if (!this.ctx.metadata?.hasHandoff) {
      console.log(chalk.yellow('  ⚠ No previous handoff found (fresh session)'));
      // Don't reduce confidence - this is fine
    }
  }

  /**
   * Custom recovery logic
   */
  protected customRecover(): void {
    // If no handoff, provide default workstream
    if (!this.ctx.metadata?.workstream) {
      this.ctx.metadata = this.ctx.metadata || {};
      this.ctx.metadata.workstream = {
        focus: 'Fresh session - no previous handoff',
        prds: [],
        adrs: [],
        tasks: [],
        modules: []
      };
    }
  }

  /**
   * Custom execution logic
   */
  protected async customExecute(): Promise<void> {
    // Display is the main output for start
    this.displaySessionInfo();
  }

  /**
   * Main build method using fluent interface
   */
  async build(): Promise<void> {
    try {
      await this
        .initialize()
        .then(p => p.loadTemplate())
        .then(p => p.loadHandoff())
        .then(p => p.gatherContext())
        .then(p => {
          p.validate();
          p.recover();
          return p;
        })
        .then(p => p.execute());

    } catch (error) {
      if (this.spinner) {
        this.spinner.fail('Session initialization failed');
      }
      console.error(chalk.red(`\n❌ Start pipeline failed: ${error}`));
      throw error;
    }
  }
}

/**
 * Adapter for CLI command usage
 * Maintains backward compatibility with existing command structure
 */
export class StartReflectionCommand {
  private pipeline: StartPipeline;

  constructor() {
    this.pipeline = new StartPipeline();
  }

  /**
   * Execute the start command
   */
  async execute(intent: string, options: any = {}): Promise<void> {
    try {
      // Update pipeline intent if provided
      if (intent && intent.trim() !== '') {
        this.pipeline = new StartPipeline(intent);
      }

      // Build and execute the pipeline
      await this.pipeline.build();

    } catch (error) {
      console.error(chalk.red(`Start failed: ${error}`));
      throw error;
    }
  }
}

// Export for CLI use
export default StartReflectionCommand;