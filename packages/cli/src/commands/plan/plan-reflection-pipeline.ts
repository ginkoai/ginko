/**
 * @fileType: command
 * @status: current
 * @updated: 2025-10-01
 * @tags: [plan, reflection, pipeline, builder, sprint]
 * @related: [../../core/simple-pipeline-base.ts, ../handoff/handoff-reflection-pipeline.ts]
 * @priority: high
 * @complexity: medium
 * @dependencies: [simple-pipeline-base, simple-git, fs-extra]
 */

import { SimplePipelineBase, PipelineContext } from '../../core/simple-pipeline-base.js';
import simpleGit from 'simple-git';
import fs from 'fs-extra';
import path from 'path';
import chalk from 'chalk';
import { getGinkoDir } from '../../utils/helpers.js';

/**
 * Plan Quality Definition
 */
export interface PlanQualityTemplate {
  requiredSections: string[];
  contextToConsider: string[];
  rulesAndConstraints: string[];
}

/**
 * Plan Context
 */
export interface PlanContext {
  feature: string;
  sprintDays: number;
  adrReference?: string;
  planId: string;
  timestamp: string;
  phases: Array<{ name: string; duration: string }>;
  recentCommits?: any[];
  currentBranch?: string;
  adrContent?: string;
}

/**
 * Plan pipeline using Simple Builder Pattern
 * Refactored from plan.ts standalone command to use SimplePipelineBase
 * Implements ADR-013 for consistent pipeline architecture
 */
export class PlanReflectionPipeline extends SimplePipelineBase {
  private git: any;
  private ginkoDir: string = '';
  private projectRoot: string = '';
  private feature: string = '';
  private options: any = {};

  constructor(feature: string, options: any = {}) {
    super(`Generate sprint plan for: ${feature}`);
    this.feature = feature;
    this.options = options;
    this.withDomain('plan');
  }

  /**
   * Initialize pipeline dependencies
   */
  async initialize(): Promise<this> {
    this.git = simpleGit();
    this.ginkoDir = await getGinkoDir();
    this.projectRoot = path.dirname(this.ginkoDir);

    if (this.options.verbose) {
      console.log(chalk.cyan('📋 Initializing plan pipeline...'));
    }
    return this;
  }

  /**
   * Load plan-specific quality template
   */
  loadTemplate(): this {
    const template: PlanQualityTemplate = {
      requiredSections: [
        'overview',
        'success_criteria',
        'implementation_phases',
        'dependencies',
        'testing_strategy',
        'rollback_plan',
        'daily_standup_topics'
      ],
      contextToConsider: [
        'feature_description',
        'adr_reference',
        'sprint_duration',
        'git_history',
        'existing_architecture',
        'team_velocity',
        'technical_constraints'
      ],
      rulesAndConstraints: [
        'Break work into clear, measurable phases',
        'Each task should be 0.5-4 hours (larger = break down further)',
        'Include specific acceptance criteria',
        'Consider team capacity and dependencies',
        'Build in time for code review and testing (~20% overhead)',
        'Front-load risky or blocking work',
        'Back-load polish and nice-to-haves',
        'Reference ADRs for architectural alignment',
        'Include daily checkpoints for progress assessment'
      ]
    };

    this.withTemplate(template);
    if (this.options.verbose) {
      console.log(chalk.gray('  ✓ Template loaded'));
    }
    return this;
  }

  /**
   * Gather comprehensive context for planning
   */
  async gatherContext(): Promise<this> {
    if (this.options.verbose) {
      console.log(chalk.cyan('🔍 Gathering context...'));
    }

    const planId = `plan-${Date.now()}`;
    const sprintDays = this.options.days || 5;

    // Try to detect if this references an ADR
    const adrReference = await this.findADRReference(this.feature);

    // Get ADR content if reference found
    let adrContent: string | undefined;
    if (adrReference) {
      adrContent = await this.getADRContent(adrReference);
    }

    // Get git state for context
    const recentCommits = await this.git.log({ maxCount: 10 }).catch(() => ({ all: [] }));
    const branch = await this.git.branchLocal().catch(() => ({ current: 'main' }));

    // Generate phases based on sprint duration
    const phases = this.generatePhases(sprintDays);

    const context: PlanContext = {
      feature: this.feature,
      sprintDays,
      adrReference,
      planId,
      timestamp: new Date().toISOString(),
      phases,
      recentCommits: recentCommits.all,
      currentBranch: branch.current,
      adrContent
    };

    // Store temp context for phase 2
    const tempPath = path.join(this.ginkoDir, '.temp', `${planId}.json`);
    await fs.ensureDir(path.dirname(tempPath));
    await fs.writeJson(tempPath, {
      feature: this.feature,
      sprintDays,
      adrReference,
      planId,
      timestamp: new Date().toISOString()
    });

    this.withContext(context);
    if (this.options.verbose) {
      console.log(chalk.gray('  ✓ Context gathered'));
    }
    return this;
  }

  /**
   * Generate the planning prompt for AI
   */
  generatePrompt(): this {
    if (this.options.verbose) {
      console.log(chalk.cyan('📝 Generating planning prompt...'));
    }

    const context = this.ctx.context as PlanContext;
    const date = new Date().toISOString().split('T')[0];

    // Build the plan framework
    const framework = this.buildPlanFramework(context, date);

    // Build the instructions for AI
    const instructions = this.buildPlanInstructions(context);

    this.ctx.content = framework + '\n' + instructions;
    this.adjustConfidence(0.9); // High confidence after successful generation

    if (this.options.verbose) {
      console.log(chalk.gray('  ✓ Prompt generated'));
    }
    return this;
  }

  /**
   * Build the plan framework content
   */
  private buildPlanFramework(context: PlanContext, date: string): string {
    const sections: string[] = [];

    sections.push(`# Sprint Plan: ${context.feature}`);
    sections.push('');
    sections.push(`## Overview`);
    sections.push(`**Start Date**: ${date}`);
    sections.push(`**Duration**: ${context.sprintDays} days`);
    sections.push(`**ADR Reference**: ${context.adrReference || chalk.yellow('[AI: Link to relevant ADR if applicable]')}`);

    if (context.adrContent) {
      sections.push('');
      sections.push(`### ADR Context`);
      sections.push(chalk.dim('```'));
      sections.push(chalk.dim(context.adrContent.substring(0, 500) + '...'));
      sections.push(chalk.dim('```'));
    }

    sections.push('');
    sections.push(`## Success Criteria`);
    sections.push(chalk.yellow('[AI: What specific, measurable outcomes define success?]'));
    sections.push(`- [ ] ${chalk.yellow('[AI: Acceptance criterion 1]')}`);
    sections.push(`- [ ] ${chalk.yellow('[AI: Acceptance criterion 2]')}`);
    sections.push(`- [ ] ${chalk.yellow('[AI: Acceptance criterion 3]')}`);

    sections.push('');
    sections.push(`## Implementation Phases`);
    sections.push('');

    context.phases.forEach((phase, i) => {
      sections.push(`### ${phase.name}`);
      sections.push(`**Duration**: ${phase.duration}`);
      sections.push(`**Goal**: ${chalk.yellow(`[AI: What will be accomplished in ${phase.name}?]`)}`);
      sections.push('');
      sections.push(`**Tasks**:`);
      sections.push(chalk.yellow('[AI: List specific, actionable tasks]'));
      sections.push(`- [ ] ${chalk.yellow('[AI: Task with ~time estimate]')}`);
      sections.push(`- [ ] ${chalk.yellow('[AI: Task with ~time estimate]')}`);
      sections.push(`- [ ] ${chalk.yellow('[AI: Task with ~time estimate]')}`);
      sections.push('');
      sections.push(`**Deliverables**:`);
      sections.push(chalk.yellow('[AI: What tangible outputs will exist after this phase?]'));
      sections.push('');
      sections.push(`**Risk Factors**:`);
      sections.push(chalk.yellow('[AI: What could block or delay this phase?]'));
      sections.push('');
    });

    sections.push(`## Dependencies`);
    sections.push(chalk.yellow('[AI: What needs to be in place before starting?]'));
    sections.push(`- ${chalk.yellow('[AI: External dependencies]')}`);
    sections.push(`- ${chalk.yellow('[AI: Team dependencies]')}`);
    sections.push(`- ${chalk.yellow('[AI: Technical prerequisites]')}`);

    sections.push('');
    sections.push(`## Testing Strategy`);
    sections.push(chalk.yellow('[AI: How will we verify each phase?]'));
    sections.push(`- **Unit Tests**: ${chalk.yellow('[AI: What will be unit tested?]')}`);
    sections.push(`- **Integration Tests**: ${chalk.yellow('[AI: What integration points need testing?]')}`);
    sections.push(`- **Manual Testing**: ${chalk.yellow('[AI: What requires manual verification?]')}`);

    sections.push('');
    sections.push(`## Rollback Plan`);
    sections.push(chalk.yellow('[AI: If something goes wrong, how do we revert?]'));

    sections.push('');
    sections.push(`## Daily Standup Topics`);
    Array.from({ length: context.sprintDays }, (_, i) => {
      sections.push('');
      sections.push(`**Day ${i + 1}**:`);
      sections.push(`- Focus: ${chalk.yellow(`[AI: Main focus for day ${i + 1}]`)}`);
      sections.push(`- Check: ${chalk.yellow(`[AI: What should be done by end of day ${i + 1}?]`)}`);
      sections.push(`- Risk: ${chalk.yellow(`[AI: What could block day ${i + 2}?]`)}`);
    });

    return sections.join('\n');
  }

  /**
   * Build the planning instructions for AI
   */
  private buildPlanInstructions(context: PlanContext): string {
    return chalk.magenta(`
Sprint Planning Instructions:

This is PLANNING MODE - we're creating a concrete implementation roadmap.
Be realistic about velocity and include buffer time.

1. Break down the work into clear, measurable phases
2. Each task should be 0.5-4 hours (larger = break down further)
3. Include specific acceptance criteria
4. Consider team capacity and dependencies
5. Build in time for code review and testing
6. Account for meetings and context switching (~20% overhead)

Guidelines:
- ${context.sprintDays} days = ~${context.sprintDays * 6} hours of focused coding time
- Include daily checkpoints for progress assessment
- Front-load risky or blocking work
- Back-load polish and nice-to-haves

After planning is complete, store the sprint plan:

ginko plan --store --id=${context.planId} --content="[complete sprint plan]"

The plan will be stored in: docs/SPRINTS/SPRINT-${new Date().toISOString().split('T')[0]}-[feature].md

This plan will guide daily standups and progress tracking.`);
  }

  /**
   * Validate the generated output
   */
  validateOutput(): this {
    if (!this.ctx.content) {
      this.addError('No plan content generated');
      this.adjustConfidence(0.5);
      return this;
    }

    const content = this.ctx.content;
    const context = this.ctx.context as PlanContext;

    // Check for required sections
    const requiredPatterns = [
      { name: 'Overview', pattern: /## Overview/i },
      { name: 'Success Criteria', pattern: /## Success Criteria/i },
      { name: 'Implementation Phases', pattern: /## Implementation Phases/i },
      { name: 'Dependencies', pattern: /## Dependencies/i },
      { name: 'Testing Strategy', pattern: /## Testing Strategy/i },
      { name: 'Rollback Plan', pattern: /## Rollback Plan/i },
      { name: 'Daily Standup Topics', pattern: /## Daily Standup Topics/i }
    ];

    const missing: string[] = [];
    for (const section of requiredPatterns) {
      if (!section.pattern.test(content)) {
        missing.push(section.name);
      }
    }

    if (missing.length > 0) {
      this.addError(`Missing required sections: ${missing.join(', ')}`);
      this.adjustConfidence(0.7);
    }

    // Check for phases
    const phaseCount = (content.match(/### Phase \d+:/g) || []).length;
    if (phaseCount === 0) {
      this.addError('No implementation phases found');
      this.adjustConfidence(0.6);
    }

    if (this.options.verbose) {
      console.log(chalk.gray('  ✓ Output validated'));
    }

    return this;
  }

  /**
   * Display the plan output
   */
  async display(): Promise<this> {
    if (!this.ctx.content) {
      this.addError('No content to display');
      return this;
    }

    const context = this.ctx.context as PlanContext;

    // Output plan framework (to stdout to avoid stderr)
    process.stdout.write(chalk.magenta('\n📋 Sprint Planning Mode') + '\n');
    process.stdout.write(chalk.dim('─'.repeat(60)) + '\n');
    process.stdout.write(this.ctx.content + '\n');
    process.stdout.write(chalk.dim('─'.repeat(60)) + '\n');

    // Ensure stdout is flushed before continuing
    await new Promise(resolve => process.stdout.write('', resolve));

    return this;
  }

  /**
   * Custom validation for plan pipeline
   */
  protected customValidate(): void {
    if (!this.ctx.template) {
      this.addError('Template required for plan');
      this.adjustConfidence(0.7);
    }

    if (!this.feature || this.feature.trim() === '') {
      this.addError('Feature description is required');
      this.adjustConfidence(0.5);
    }

    const context = this.ctx.context as PlanContext;
    if (!context?.sprintDays || context.sprintDays < 1) {
      this.addError('Invalid sprint duration');
      this.adjustConfidence(0.6);
    }
  }

  /**
   * Custom recovery logic
   */
  protected customRecover(): void {
    // If no context, create a basic one
    if (!this.ctx.context) {
      const planId = `plan-${Date.now()}`;
      const sprintDays = this.options.days || 5;

      this.ctx.context = {
        feature: this.feature,
        sprintDays,
        planId,
        timestamp: new Date().toISOString(),
        phases: this.generatePhases(sprintDays)
      };
      this.removeError('No context available');
      this.adjustConfidence(1.1); // Slight boost after recovery
    }
  }

  /**
   * Custom execution logic
   */
  protected async customExecute(): Promise<void> {
    // Ensure we have content
    if (!this.ctx.content) {
      this.generatePrompt();
    }
  }

  /**
   * Generate phases based on sprint duration
   */
  private generatePhases(days: number): Array<{ name: string; duration: string }> {
    if (days <= 2) {
      return [
        { name: 'Phase 1: Implementation', duration: '1 day' },
        { name: 'Phase 2: Testing & Polish', duration: '1 day' }
      ];
    } else if (days <= 5) {
      return [
        { name: 'Phase 1: Foundation', duration: `${Math.floor(days * 0.3)} day(s)` },
        { name: 'Phase 2: Core Implementation', duration: `${Math.floor(days * 0.4)} day(s)` },
        { name: 'Phase 3: Testing & Refinement', duration: `${Math.ceil(days * 0.3)} day(s)` }
      ];
    } else {
      return [
        { name: 'Phase 1: Architecture & Setup', duration: `${Math.floor(days * 0.2)} day(s)` },
        { name: 'Phase 2: Core Features', duration: `${Math.floor(days * 0.3)} day(s)` },
        { name: 'Phase 3: Integration', duration: `${Math.floor(days * 0.2)} day(s)` },
        { name: 'Phase 4: Testing & Documentation', duration: `${Math.floor(days * 0.2)} day(s)` },
        { name: 'Phase 5: Polish & Deploy', duration: `${Math.ceil(days * 0.1)} day(s)` }
      ];
    }
  }

  /**
   * Find ADR reference from feature description
   */
  private async findADRReference(feature: string): Promise<string | undefined> {
    // Check if feature mentions an ADR
    const adrMatch = feature.match(/ADR-(\d+)/i);
    if (adrMatch) {
      return adrMatch[0].toUpperCase();
    }

    // Check if feature matches recent ADR titles
    const adrDir = path.join(this.projectRoot, 'docs', 'reference', 'architecture');
    if (await fs.pathExists(adrDir)) {
      const files = await fs.readdir(adrDir);
      const recentADRs = files
        .filter(f => f.startsWith('ADR-'))
        .sort()
        .reverse()
        .slice(0, 5); // Check last 5 ADRs

      for (const adrFile of recentADRs) {
        const content = await fs.readFile(path.join(adrDir, adrFile), 'utf8');
        const titleMatch = content.match(/^#\s+ADR-\d+:\s+(.+)$/m);
        if (titleMatch) {
          const title = titleMatch[1].toLowerCase();
          if (feature.toLowerCase().includes(title) || title.includes(feature.toLowerCase())) {
            return adrFile.match(/ADR-\d+/)![0];
          }
        }
      }
    }

    return undefined;
  }

  /**
   * Get ADR content for context
   */
  private async getADRContent(adrReference: string): Promise<string | undefined> {
    const adrDir = path.join(this.projectRoot, 'docs', 'reference', 'architecture');
    const adrFiles = await fs.readdir(adrDir).catch(() => []);

    const adrFile = adrFiles.find(f => f.includes(adrReference));
    if (adrFile) {
      const content = await fs.readFile(path.join(adrDir, adrFile), 'utf8');
      return content;
    }

    return undefined;
  }

  /**
   * Main build method using fluent interface
   */
  async build(): Promise<string> {
    try {
      if (this.options.verbose) {
        console.log(chalk.bold.cyan('\n🚀 Building plan with Simple Pipeline Pattern\n'));
      }

      await this
        .initialize()
        .then(p => p.loadTemplate())
        .then(p => p.gatherContext())
        .then(p => {
          p.generatePrompt();
          p.validateOutput();
          return p;
        })
        .then(p => p.validate())
        .then(p => {
          p.recover();
          return p;
        })
        .then(p => p.display())
        .then(p => p.execute());

      if (this.options.verbose) {
        console.log(chalk.bold.green('\n✨ Plan pipeline completed successfully!\n'));
      }

      return this.ctx.content || '';
    } catch (error) {
      console.error(chalk.red(`\n❌ Pipeline failed: ${error}`));
      throw error;
    }
  }
}

/**
 * Store sprint plan to filesystem
 */
export async function storeSprintPlan(planId: string, content: string, verbose: boolean = false): Promise<void> {
  const ginkoDir = await getGinkoDir();
  const projectRoot = path.dirname(ginkoDir);

  // Extract title from content
  const titleMatch = content.match(/^#\s+Sprint Plan:\s+(.+)$/m);
  const title = titleMatch ? titleMatch[1] : 'Untitled Sprint';
  const date = new Date().toISOString().split('T')[0];
  const filename = `SPRINT-${date}-${title.toLowerCase().replace(/[^a-z0-9]+/g, '-')}.md`;

  // Store sprint plan
  const sprintDir = path.join(projectRoot, 'docs', 'SPRINTS');
  await fs.ensureDir(sprintDir);

  const sprintPath = path.join(sprintDir, filename);
  await fs.writeFile(sprintPath, content);

  // Also update current sprint symlink
  const currentPath = path.join(sprintDir, 'CURRENT-SPRINT.md');
  if (await fs.pathExists(currentPath)) {
    await fs.remove(currentPath);
  }

  // Create symlink to current sprint
  await fs.symlink(sprintPath, currentPath).catch(() => {
    // If symlink fails (Windows), copy instead
    fs.copyFile(sprintPath, currentPath);
  });

  if (verbose) {
    console.log(chalk.green(`✅ Sprint plan created: ${path.relative(projectRoot, sprintPath)}`));
    console.log(chalk.dim(`   Current sprint: ${path.relative(projectRoot, currentPath)}`));
  } else {
    console.log('done');
  }

  // Provide phase transition options
  if (verbose) {
    console.log();
    console.log(chalk.dim('─'.repeat(60)));
    console.log(chalk.bold('Planning phase complete. Next steps:'));
    console.log();
    console.log(chalk.cyan('  ginko start') + chalk.dim(' - Begin implementation'));
    console.log(chalk.cyan('  ginko capture') + chalk.dim(' - Document implementation decisions'));
    console.log(chalk.cyan('  ginko ship') + chalk.dim(' - Commit and push your work'));
    console.log();
    console.log(chalk.dim('Note: Sprint plan is now active and ready for execution.'));
  }

  // Clean up temp file
  const tempPath = path.join(ginkoDir, '.temp', `${planId}.json`);
  await fs.remove(tempPath).catch(() => {});
}

/**
 * Adapter for CLI command usage
 * Maintains backward compatibility with existing command structure
 */
export class PlanReflectionCommand {
  private pipeline: PlanReflectionPipeline | null = null;

  /**
   * Execute the plan command
   */
  async execute(feature: string | undefined, options: any = {}): Promise<void> {
    try {
      // Phase 2: Store AI-generated sprint plan
      if (options.store && options.id) {
        await storeSprintPlan(options.id, options.content || '', options.verbose);
        return;
      }

      // Phase 1 requires feature/ADR reference
      if (!feature) {
        process.stdout.write(chalk.red('error: feature or ADR reference required') + '\n');
        process.stdout.write(chalk.dim('usage: ginko plan "implement ADR-023" --days 5') + '\n');
        process.exit(1);
      }

      // Create and execute pipeline
      this.pipeline = new PlanReflectionPipeline(feature, options);
      await this.pipeline.build();

      // Exit with code 0 to avoid stderr interpretation
      // The AI prompt is expected behavior, not an error
      process.exit(0);

    } catch (error) {
      process.stdout.write(chalk.red('error: ') + (error instanceof Error ? error.message : String(error)) + '\n');
      process.exit(1);
    }
  }
}

// Export for CLI use
export default PlanReflectionCommand;
