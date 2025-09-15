/**
 * @fileType: command
 * @status: current
 * @updated: 2025-09-15
 * @tags: [handoff, reflection, pipeline, builder, session]
 * @related: [../../core/simple-pipeline-base.ts, ./handoff-reflection.ts]
 * @priority: critical
 * @complexity: medium
 * @dependencies: [simple-pipeline-base, handoff-quality, simple-git, fs-extra]
 */

import { SimplePipelineBase, PipelineContext } from '../../core/simple-pipeline-base.js';
import simpleGit from 'simple-git';
import fs from 'fs-extra';
import * as path from 'path';
import chalk from 'chalk';
import { getUserEmail, getGinkoDir } from '../../utils/helpers.js';
import {
  HandoffQualityScorer,
  HandoffContextAggregator,
  HandoffEnhancer,
  HandoffContext,
  QualityReport
} from '../../core/handoff-quality.js';

/**
 * Handoff pipeline using Simple Builder Pattern
 * Refactored from HandoffReflectionCommand to use SimplePipelineBase
 * Implements ADR-013 for consistent pipeline architecture
 */
export class HandoffPipeline extends SimplePipelineBase {
  private git: any;
  private ginkoDir: string = '';
  private userEmail: string = '';
  private userSlug: string = '';
  private sessionDir: string = '';

  constructor(intent: string = 'Generate comprehensive handoff for session') {
    super(intent);
    this.withDomain('handoff');
  }

  /**
   * Initialize pipeline dependencies
   */
  async initialize(): Promise<this> {
    this.git = simpleGit();
    this.ginkoDir = await getGinkoDir();
    this.userEmail = await getUserEmail();
    this.userSlug = this.userEmail.replace('@', '-at-').replace(/\./g, '-');
    this.sessionDir = path.join(this.ginkoDir, 'sessions', this.userSlug);
    console.log(chalk.cyan('📋 Initializing handoff pipeline...'));
    return this;
  }

  /**
   * Load handoff-specific template
   */
  loadTemplate(): this {
    const template = {
      requiredSections: [
        'session_summary',
        'active_workstream',
        'critical_context_modules',
        'key_achievements',
        'architectural_decisions',
        'in_progress_work',
        'next_session_instructions',
        'mental_model',
        'known_issues'
      ],
      contextToConsider: [
        'git_changes',
        'active_prds_adrs_tasks',
        'critical_modules',
        'test_results',
        'session_duration',
        'workstream_focus',
        'recent_commits',
        'uncommitted_changes'
      ],
      rulesAndConstraints: [
        'Reference ALL active PRDs/ADRs/Tasks by number and title',
        'List ESSENTIAL context modules with explicit filenames',
        'Provide SPECIFIC next actions with exact commands',
        'Preserve architectural rationale and decisions',
        'Enable <30 second flow state achievement',
        'Include command sequences for instant resumption',
        'Capture current mental model and understanding',
        'Note any blockers or issues that need resolution'
      ]
    };

    this.withTemplate(template);
    console.log(chalk.gray('  ✓ Template loaded'));
    return this;
  }

  /**
   * Gather comprehensive context including workstream detection
   */
  async gatherContext(): Promise<this> {
    console.log(chalk.cyan('🔍 Gathering context...'));

    // Detect workstream from recent activity
    const workstream = await this.detectWorkstream();
    const criticalModules = await this.identifyCriticalModules(workstream);

    // Get git state
    const status = await this.git.status();
    const branch = await this.git.branchLocal();
    const recentCommits = await this.git.log({ maxCount: 20 });

    // Get previous handoff for continuity
    const previousHandoff = await this.getPreviousHandoff();

    // Calculate session metrics
    const sessionDuration = await this.calculateSessionDuration(previousHandoff);

    // Get uncommitted work details
    const uncommittedWork = {
      modified: status.modified,
      created: status.created,
      deleted: status.deleted,
      ahead: status.ahead
    };

    const context = {
      gitStatus: status,
      currentBranch: branch.current,
      activePRDs: workstream.prds,
      activeADRs: workstream.adrs,
      activeTasks: workstream.tasks,
      criticalModules: criticalModules,
      recentCommits: recentCommits.all,
      previousHandoff: previousHandoff,
      sessionDuration: sessionDuration,
      uncommittedFiles: [...status.modified, ...status.created, ...status.deleted],
      workstreamFocus: workstream.focus,
      workstream: workstream,
      uncommittedWork: uncommittedWork
    };

    this.withContext(context);
    console.log(chalk.gray('  ✓ Context gathered'));
    return this;
  }

  /**
   * Detect workstream from git and file patterns
   */
  async detectWorkstream(): Promise<any> {
    const recentCommits = await this.git.log({ maxCount: 30 });
    const commitMessages = recentCommits.all.map((c: any) => c.message).join(' ');

    // Pattern matching for PRDs, ADRs, Tasks
    const prdPattern = /PRD-(\d+)[:\s-]*([\w\s-]+)/gi;
    const adrPattern = /ADR-(\d+)[:\s-]*([\w\s-]+)/gi;
    const taskPattern = /TASK-(\d+)[:\s-]*([\w\s-]+)/gi;

    const prds = [];
    const adrs = [];
    const tasks = [];

    let match;
    while ((match = prdPattern.exec(commitMessages)) !== null) {
      prds.push({ number: `PRD-${match[1]}`, title: match[2].trim() });
    }
    while ((match = adrPattern.exec(commitMessages)) !== null) {
      adrs.push({ number: `ADR-${match[1]}`, title: match[2].trim() });
    }
    while ((match = taskPattern.exec(commitMessages)) !== null) {
      tasks.push({ number: `TASK-${match[1]}`, title: match[2].trim(), priority: 'MEDIUM' });
    }

    // Determine focus from patterns
    let focus = 'General development';
    if (prds.length > 0 || adrs.length > 0) {
      if (commitMessages.includes('reflection') || commitMessages.includes('pipeline')) {
        focus = 'Simple Builder Pattern Implementation';
      } else if (commitMessages.includes('handoff') || commitMessages.includes('quality')) {
        focus = 'Handoff Quality Enhancement';
      }
    }

    return {
      prds: [...new Set(prds.map(p => JSON.stringify(p)))].map(p => JSON.parse(p)),
      adrs: [...new Set(adrs.map(a => JSON.stringify(a)))].map(a => JSON.parse(a)),
      tasks: [...new Set(tasks.map(t => JSON.stringify(t)))].map(t => JSON.parse(t)),
      focus
    };
  }

  /**
   * Identify critical context modules based on workstream
   */
  async identifyCriticalModules(workstream: any): Promise<string[]> {
    const modules: string[] = [];

    // Always critical for reflection work
    if (workstream.focus.includes('Pattern') || workstream.focus.includes('Builder')) {
      modules.push('simple-builder-pattern');
      modules.push('pattern-reflection-pattern-as-dsl');
      modules.push('universal-reflection-pattern');
    }

    // Add modules based on active ADRs
    if (workstream.adrs.some((a: any) => a.number === 'ADR-013')) {
      modules.push('simple-builder-pattern');
    }
    if (workstream.adrs.some((a: any) => a.number === 'ADR-014')) {
      modules.push('handoff-quality-standards');
    }

    // Check for existing modules in context directory
    const contextDir = path.join(this.ginkoDir, 'context', 'modules');
    if (await fs.pathExists(contextDir)) {
      const files = await fs.readdir(contextDir);

      // Add any pattern-related modules
      files.filter(f => f.includes('pattern') && f.endsWith('.md'))
        .forEach(f => {
          const moduleName = f.replace('.md', '');
          if (!modules.includes(moduleName)) {
            modules.push(moduleName);
          }
        });
    }

    return modules.slice(0, 5); // Limit to top 5 most critical
  }

  /**
   * Generate handoff content
   */
  generateContent(): this {
    console.log(chalk.cyan('📝 Generating handoff content...'));
    this.ctx.content = this.buildHandoffContent();
    this.adjustConfidence(0.9); // High confidence after successful generation
    console.log(chalk.gray('  ✓ Content generated'));
    return this;
  }

  /**
   * Build the actual handoff content
   */
  private buildHandoffContent(): string {
    const context = this.ctx.context;
    const date = new Date().toISOString().split('T')[0];
    const sessionId = `session-${Date.now()}`;

    // Build handoff content following the template structure
    const sections: string[] = [];

    // Header
    sections.push(`# Session Handoff: ${context.workstreamFocus || 'Development Session'}\n`);
    sections.push(`**Date**: ${date}`);
    sections.push(`**Session ID**: ${sessionId}`);
    sections.push(`**Next Session Goal**: ${this.ctx.intent || 'Continue development'}\n`);

    // Active Workstream
    if (context.workstream) {
      sections.push(`## 🎯 Active Workstream\n`);
      sections.push(`### Current Focus: ${context.workstream.focus}`);

      if (context.workstream.prds?.length > 0) {
        sections.push(`- **Primary PRDs**:`);
        context.workstream.prds.forEach((prd: any) => {
          sections.push(`  - ${prd.number}: ${prd.title}`);
        });
      }

      if (context.workstream.adrs?.length > 0) {
        sections.push(`- **Key ADRs**:`);
        context.workstream.adrs.forEach((adr: any) => {
          sections.push(`  - ${adr.number}: ${adr.title}`);
        });
      }

      if (context.workstream.tasks?.length > 0) {
        sections.push(`- **Active Tasks**:`);
        context.workstream.tasks.forEach((task: any) => {
          sections.push(`  - ${task.number}: ${task.title} (${task.priority || 'MEDIUM'})`);
        });
      }
      sections.push('');
    }

    // Critical Context Modules
    if (context.criticalModules?.length > 0) {
      sections.push(`## 📚 Critical Context Modules to Load\n`);
      sections.push(`**ESSENTIAL - Load these immediately for continuity:**`);
      sections.push('```bash');
      context.criticalModules.forEach((module: string) => {
        sections.push(`ginko context ${module}`);
      });
      sections.push('```\n');
    }

    // Current State
    sections.push(`## 🔄 Current State\n`);

    // Git changes
    if (context.uncommittedWork) {
      const work = context.uncommittedWork;
      if (work.modified?.length > 0 || work.created?.length > 0) {
        sections.push(`### Uncommitted Changes`);
        if (work.modified?.length > 0) {
          sections.push(`- Modified: ${work.modified.length} files`);
          work.modified.slice(0, 5).forEach((file: string) => {
            sections.push(`  - ${file}`);
          });
          if (work.modified.length > 5) {
            sections.push(`  - ... and ${work.modified.length - 5} more`);
          }
        }
        if (work.created?.length > 0) {
          sections.push(`- Created: ${work.created.length} files`);
          work.created.slice(0, 5).forEach((file: string) => {
            sections.push(`  - ${file}`);
          });
          if (work.created.length > 5) {
            sections.push(`  - ... and ${work.created.length - 5} more`);
          }
        }
        sections.push('');
      }
    }

    // Branch info
    if (context.currentBranch) {
      sections.push(`### Git Status`);
      sections.push(`- **Branch**: ${context.currentBranch}`);
      if (context.uncommittedWork?.ahead > 0) {
        sections.push(`- **Commits ahead**: ${context.uncommittedWork.ahead}`);
      }
      sections.push('');
    }

    // Session Achievements (placeholder - would be enhanced by AI)
    sections.push(`## 🎯 Session Achievements\n`);
    sections.push(`- Implemented Simple Builder Pattern refactoring`);
    sections.push(`- Enhanced handoff quality system`);
    sections.push(`- Updated pipeline architecture`);
    sections.push('');

    // Next Steps
    sections.push(`## ⚡ Next Session: Quick Start\n`);
    sections.push(`### Immediate Actions`);
    sections.push('```bash');
    sections.push('ginko start                  # Resume from this handoff');
    sections.push('cd packages/cli              # Navigate to work area');
    sections.push('npm run build                # Verify build');
    sections.push('npm test                     # Run tests');
    sections.push('```\n');

    // Mental Model (placeholder)
    sections.push(`## 🧠 Mental Model\n`);
    sections.push(`The Simple Builder Pattern provides a clean, chainable interface for pipeline operations.`);
    sections.push(`Each reflector extends SimplePipelineBase and implements domain-specific logic.`);
    sections.push(`Quality scoring ensures handoffs maintain high standards for instant resumption.\n`);

    // Footer
    sections.push('---');
    sections.push(`**Handoff Quality**: Generated via Simple Builder Pipeline`);
    sections.push(`**Generated**: ${date}`);
    sections.push(`**Session Duration**: ${context.sessionDuration || 0} minutes`);
    sections.push(`**Confidence**: ${(this.ctx.confidence * 100).toFixed(0)}%`);

    return sections.join('\n');
  }

  /**
   * Score the quality of generated content
   */
  scoreQuality(): this {
    if (!this.ctx.content) {
      this.addError('No content to score');
      this.adjustConfidence(0.5);
      return this;
    }

    console.log(chalk.cyan('📊 Scoring handoff quality...'));
    const qualityReport = HandoffQualityScorer.score(this.ctx.content);
    this.withMetadata({ qualityReport });

    if (qualityReport.percentage < HandoffQualityScorer.TARGET_SCORE) {
      console.log(chalk.yellow(`  Quality: ${qualityReport.percentage}% (Enhancement needed)`));
      this.ctx.metadata!.needsEnhancement = true;
    } else {
      console.log(chalk.green(`  ✨ Quality: ${qualityReport.percentage}% (Excellent!)`));
    }

    HandoffQualityScorer.displayReport(qualityReport);
    return this;
  }

  /**
   * Enhance content if quality is below target
   */
  async enhanceIfNeeded(): Promise<this> {
    if (!this.ctx.metadata?.needsEnhancement) {
      return this;
    }

    console.log(chalk.cyan('✨ Enhancing handoff quality...'));
    const aggregator = new HandoffContextAggregator(process.cwd());
    const enrichedContext = await aggregator.gatherContext();

    const fullContext: HandoffContext = {
      ...enrichedContext,
      ...this.ctx.context,
      focus: this.ctx.context.workstreamFocus || enrichedContext.focus
    };

    this.ctx.content = await HandoffEnhancer.enhance(this.ctx.content!, fullContext);

    // Re-score after enhancement
    const enhancedReport = HandoffQualityScorer.score(this.ctx.content);
    HandoffQualityScorer.displayReport(enhancedReport);
    this.withMetadata({ qualityReport: enhancedReport });

    console.log(chalk.green('  ✓ Enhancement complete'));
    return this;
  }

  /**
   * Save handoff to filesystem
   */
  async save(): Promise<this> {
    if (!this.ctx.content) {
      this.addError('No content to save');
      this.adjustConfidence(0.3);
      return this;
    }

    console.log(chalk.cyan('💾 Saving handoff...'));

    // Ensure directory exists
    await fs.ensureDir(this.sessionDir);

    // Archive existing handoff if present
    await this.archiveExistingHandoff();

    // Save new handoff
    const handoffPath = path.join(this.sessionDir, 'current.md');
    await fs.writeFile(handoffPath, this.ctx.content, 'utf-8');

    console.log(chalk.green(`  ✅ Saved to: ${path.relative(process.cwd(), handoffPath)}`));
    console.log(chalk.cyan('  📋 Next session will load this automatically with ginko start'));

    this.withMetadata({ savedPath: handoffPath });
    return this;
  }

  /**
   * Get previous handoff for context
   */
  private async getPreviousHandoff(): Promise<string | null> {
    const currentPath = path.join(this.sessionDir, 'current.md');
    if (await fs.pathExists(currentPath)) {
      return fs.readFile(currentPath, 'utf-8');
    }
    return null;
  }

  /**
   * Calculate session duration from previous handoff
   */
  private async calculateSessionDuration(previousHandoff: string | null): Promise<number> {
    if (!previousHandoff) return 0;

    const timestampMatch = previousHandoff.match(/Session ID.*?(\d+)/);
    if (timestampMatch) {
      const previousTime = parseInt(timestampMatch[1], 10);
      const currentTime = Date.now();
      return Math.round((currentTime - previousTime) / 60000); // Convert to minutes
    }

    return 0;
  }

  /**
   * Archive existing handoff
   */
  private async archiveExistingHandoff(): Promise<void> {
    const currentPath = path.join(this.sessionDir, 'current.md');
    if (await fs.pathExists(currentPath)) {
      const archiveDir = path.join(this.sessionDir, 'archive');
      await fs.ensureDir(archiveDir);

      const date = new Date().toISOString().split('T')[0];
      const time = new Date().toTimeString().split(' ')[0].replace(/:/g, '-');
      const archivePath = path.join(archiveDir, `${date}-${time}-handoff.md`);

      await fs.move(currentPath, archivePath);
      console.log(chalk.gray(`  ✓ Previous handoff archived`));
    }
  }

  /**
   * Custom validation for handoff pipeline
   */
  protected customValidate(): void {
    if (!this.ctx.template) {
      this.addError('Template required for handoff');
      this.adjustConfidence(0.7);
    }

    if (!this.ctx.context?.workstream) {
      console.log(chalk.yellow('  ⚠ No workstream detected (will use defaults)'));
      this.adjustConfidence(0.9); // Minor reduction, not critical
    }
  }

  /**
   * Custom recovery logic
   */
  protected customRecover(): void {
    // If no workstream, create a basic one
    if (!this.ctx.context?.workstream) {
      this.ctx.context = this.ctx.context || {};
      this.ctx.context.workstream = {
        focus: 'General development',
        prds: [],
        adrs: [],
        tasks: []
      };
      this.removeError('No workstream detected');
      this.adjustConfidence(1.1); // Slight boost after recovery
    }
  }

  /**
   * Custom execution logic
   */
  protected async customExecute(): Promise<void> {
    // Ensure we have content
    if (!this.ctx.content) {
      this.generateContent();
    }

    // Ensure quality scoring happened
    if (!this.ctx.metadata?.qualityReport) {
      this.scoreQuality();
    }
  }

  /**
   * Main build method using fluent interface
   */
  async build(): Promise<string> {
    try {
      console.log(chalk.bold.cyan('\n🚀 Building handoff with Simple Pipeline Pattern\n'));

      await this
        .initialize()
        .then(p => p.loadTemplate())
        .then(p => p.gatherContext())
        .then(p => {
          p.generateContent();
          p.scoreQuality();
          return p;
        })
        .then(p => p.validate())
        .then(p => {
          p.recover();
          return p;
        })
        .then(p => p.enhanceIfNeeded())
        .then(p => p.save())
        .then(p => p.execute());

      console.log(chalk.bold.green('\n✨ Handoff pipeline completed successfully!\n'));
      return this.ctx.content || '';
    } catch (error) {
      console.error(chalk.red(`\n❌ Pipeline failed: ${error}`));
      throw error;
    }
  }
}

/**
 * Adapter for CLI command usage
 * Maintains backward compatibility with existing command structure
 */
export class HandoffReflectionCommand {
  private pipeline: HandoffPipeline;

  constructor() {
    this.pipeline = new HandoffPipeline();
  }

  /**
   * Execute the handoff command
   */
  async execute(intent: string, options: any = {}): Promise<void> {
    try {
      // Update pipeline intent if provided
      if (intent && intent.trim() !== '') {
        this.pipeline = new HandoffPipeline(intent);
      }

      // Build and execute the pipeline
      await this.pipeline.build();

    } catch (error) {
      console.error(chalk.red(`Handoff failed: ${error}`));
      throw error;
    }
  }
}

// Export for CLI use
export default HandoffReflectionCommand;