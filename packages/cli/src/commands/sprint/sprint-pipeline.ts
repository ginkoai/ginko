/**
 * @fileType: command
 * @status: current
 * @updated: 2025-09-15
 * @tags: [sprint, pipeline, builder, planning, agile]
 * @related: [../../core/simple-pipeline-base.ts, ../backlog/backlog-pipeline.ts]
 * @priority: high
 * @complexity: medium
 * @dependencies: [simple-pipeline-base, simple-git, fs-extra]
 */

import { SimplePipelineBase, PipelineContext } from '../../core/simple-pipeline-base.js';
import simpleGit from 'simple-git';
import fs from 'fs-extra';
import * as path from 'path';
import chalk from 'chalk';
import { getGinkoDir } from '../../utils/helpers.js';

/**
 * Sprint pipeline using Simple Builder Pattern
 * Implements ADR-013 for consistent pipeline architecture
 * Generates sprint plans, tracks velocity, and manages sprint goals
 */
export class SprintPipeline extends SimplePipelineBase {
  private git: any;
  private ginkoDir: string = '';

  constructor(intent: string = 'Generate sprint plan') {
    super(intent);
    this.withDomain('sprint');
  }

  /**
   * Initialize pipeline dependencies
   */
  async initialize(): Promise<this> {
    console.log(chalk.cyan('📋 Initializing sprint pipeline...'));
    this.git = simpleGit();
    this.ginkoDir = await getGinkoDir();
    this.adjustConfidence(0.9); // High confidence for sprint planning
    return this;
  }

  /**
   * Load sprint template
   */
  async loadTemplate(): Promise<this> {
    const template = {
      requiredSections: [
        'sprint_goal',
        'duration',
        'user_stories',
        'technical_tasks',
        'acceptance_criteria',
        'risk_assessment',
        'capacity_planning',
        'success_metrics'
      ],
      contextToConsider: [
        'backlog_items',
        'team_velocity',
        'previous_sprints',
        'active_prds',
        'technical_debt',
        'dependencies'
      ],
      rulesAndConstraints: [
        'Sprint goals must be SMART (Specific, Measurable, Achievable, Relevant, Time-bound)',
        'User stories follow: As a [user], I want [feature] so that [benefit]',
        'Technical tasks include effort estimates',
        'Acceptance criteria are testable and clear',
        'Risk assessment includes mitigation strategies',
        'Capacity accounts for meetings and context switching'
      ]
    };

    this.withTemplate(template);
    console.log(chalk.gray('  ✓ Sprint template loaded'));
    return this;
  }

  /**
   * Gather context for sprint planning
   */
  async gatherContext(): Promise<this> {
    console.log(chalk.cyan('🔍 Gathering sprint context...'));

    // Get backlog items
    const backlogPath = path.join(this.ginkoDir, 'backlog');
    const backlogItems = await this.getBacklogItems(backlogPath);

    // Get velocity from previous sprints
    const velocity = await this.calculateVelocity();

    // Get active PRDs and ADRs
    const activeDocs = await this.getActiveDocuments();

    // Get team capacity
    const capacity = this.calculateCapacity();

    const context = {
      backlogItems,
      velocity,
      activePRDs: activeDocs.prds,
      activeADRs: activeDocs.adrs,
      capacity,
      sprintNumber: await this.getNextSprintNumber(),
      startDate: new Date().toISOString().split('T')[0],
      endDate: this.calculateEndDate(14) // 2-week sprint default
    };

    this.withContext(context);
    console.log(chalk.gray('  ✓ Context gathered'));
    return this;
  }

  /**
   * Generate sprint content
   */
  generateContent(): this {
    console.log(chalk.cyan('📝 Generating sprint plan...'));

    const context = this.ctx.context;
    const intent = this.parseSprintIntent(this.ctx.intent);

    const sections: string[] = [];

    // Header
    sections.push(`# Sprint ${context.sprintNumber}: ${intent.goal || 'Development Sprint'}\n`);
    sections.push(`**Duration**: ${context.startDate} to ${context.endDate}`);
    sections.push(`**Velocity Target**: ${context.velocity} story points`);
    sections.push(`**Team Capacity**: ${context.capacity} hours\n`);

    // Sprint Goal
    sections.push(`## 🎯 Sprint Goal\n`);
    sections.push(`${intent.goal || 'Deliver value through iterative development'}\n`);

    // User Stories
    if (context.backlogItems?.userStories?.length > 0) {
      sections.push(`## 📖 User Stories\n`);
      context.backlogItems.userStories.forEach((story: any, i: number) => {
        sections.push(`### Story ${i + 1}: ${story.title}`);
        sections.push(`**As a** ${story.user || 'user'}`);
        sections.push(`**I want** ${story.feature}`);
        sections.push(`**So that** ${story.benefit}`);
        sections.push(`**Points**: ${story.points || 3}`);
        sections.push(`**Priority**: ${story.priority || 'MEDIUM'}\n`);
      });
    }

    // Technical Tasks
    sections.push(`## 🔧 Technical Tasks\n`);
    if (context.backlogItems?.tasks?.length > 0) {
      context.backlogItems.tasks.forEach((task: any) => {
        sections.push(`- [ ] ${task.title} (${task.estimate || '4h'})`);
      });
    } else {
      sections.push(`- [ ] Implement core features`);
      sections.push(`- [ ] Write unit tests`);
      sections.push(`- [ ] Update documentation`);
    }
    sections.push('');

    // Acceptance Criteria
    sections.push(`## ✅ Acceptance Criteria\n`);
    sections.push(`- [ ] All user stories implemented and tested`);
    sections.push(`- [ ] Code coverage above 80%`);
    sections.push(`- [ ] No critical bugs in production`);
    sections.push(`- [ ] Documentation updated`);
    sections.push(`- [ ] Sprint demo prepared\n`);

    // Risk Assessment
    sections.push(`## ⚠️ Risk Assessment\n`);
    sections.push(`| Risk | Probability | Impact | Mitigation |`);
    sections.push(`|------|------------|--------|------------|`);
    sections.push(`| Scope creep | Medium | High | Daily standups, clear priorities |`);
    sections.push(`| Technical debt | Low | Medium | Allocate 20% for refactoring |`);
    sections.push(`| Dependencies | Medium | High | Early integration testing |\n`);

    // Success Metrics
    sections.push(`## 📊 Success Metrics\n`);
    sections.push(`- **Velocity**: Complete ${context.velocity} story points`);
    sections.push(`- **Quality**: Zero critical bugs`);
    sections.push(`- **Delivery**: 90% of committed stories completed`);
    sections.push(`- **Team Health**: Sustainable pace maintained\n`);

    // Footer
    sections.push('---');
    sections.push(`**Generated**: ${new Date().toISOString()}`);
    sections.push(`**Pipeline**: SprintPipeline v1.0`);
    sections.push(`**Confidence**: ${Math.round(this.ctx.confidence * 100)}%`);

    this.ctx.content = sections.join('\n');
    console.log(chalk.gray('  ✓ Sprint plan generated'));
    return this;
  }

  /**
   * Validate sprint content
   */
  validateContent(): this {
    if (!this.ctx.content) {
      this.ctx.errors.push('No sprint content generated');
      this.adjustConfidence(0.3);
      return this;
    }

    // Check for required sections
    const requiredPatterns = [
      /Sprint Goal/i,
      /Technical Tasks/i,
      /Acceptance Criteria/i,
      /Success Metrics/i
    ];

    for (const pattern of requiredPatterns) {
      if (!pattern.test(this.ctx.content)) {
        this.ctx.errors.push(`Missing required section: ${pattern.source}`);
        this.adjustConfidence(0.7);
      }
    }

    console.log(chalk.gray('  ✓ Content validated'));
    return this;
  }

  /**
   * Save sprint plan
   */
  async save(): Promise<this> {
    if (!this.ctx.content) {
      console.error(chalk.red('No content to save'));
      return this;
    }

    console.log(chalk.cyan('💾 Saving sprint plan...'));

    const sprintsDir = path.join(this.ginkoDir, 'sprints');
    await fs.ensureDir(sprintsDir);

    const sprintNumber = this.ctx.context?.sprintNumber || 1;
    const filename = `sprint-${String(sprintNumber).padStart(3, '0')}.md`;
    const filepath = path.join(sprintsDir, filename);

    await fs.writeFile(filepath, this.ctx.content, 'utf-8');

    console.log(chalk.green(`  ✅ Sprint plan saved to: ${path.relative(process.cwd(), filepath)}`));
    if (!this.ctx.metadata) {
      this.ctx.metadata = {};
    }
    this.ctx.metadata.savedPath = filepath;

    return this;
  }

  /**
   * Execute final pipeline actions
   */
  async execute(): Promise<PipelineContext> {
    if (!this.ctx.metadata?.savedPath) {
      throw new Error('Sprint plan was not saved');
    }

    console.log(chalk.green('\n✨ Sprint pipeline completed successfully!'));
    return this.ctx;
  }

  /**
   * Main build method using fluent interface
   */
  async build(): Promise<string> {
    try {
      return await this.initialize()
        .then(p => p.loadTemplate())
        .then(p => p.gatherContext())
        .then(p => {
          p.generateContent();
          p.validateContent();
          return p;
        })
        .then(p => p.validate())
        .then(p => p.recover())
        .then(p => p.save())
        .then(p => p.execute())
        .then(ctx => ctx.metadata?.savedPath || '');
    } catch (error) {
      console.error(chalk.red(`Sprint pipeline failed: ${error}`));
      throw error;
    }
  }

  // Helper methods

  private async getBacklogItems(backlogPath: string): Promise<any> {
    if (!await fs.pathExists(backlogPath)) {
      return { tasks: [], userStories: [] };
    }

    const items: { tasks: any[]; userStories: any[] } = { tasks: [], userStories: [] };
    const files = await fs.readdir(backlogPath);

    for (const file of files.slice(0, 10)) { // Limit to recent items
      if (file.endsWith('.md')) {
        const content = await fs.readFile(path.join(backlogPath, file), 'utf-8');
        if (content.includes('User Story')) {
          items.userStories.push(this.parseUserStory(content));
        } else {
          items.tasks.push(this.parseTask(content));
        }
      }
    }

    return items;
  }

  private parseUserStory(content: string): any {
    return {
      title: content.match(/^#\s+(.+)$/m)?.[1] || 'User Story',
      user: 'user',
      feature: 'new functionality',
      benefit: 'improved experience',
      points: 3
    };
  }

  private parseTask(content: string): any {
    return {
      title: content.match(/^#\s+(.+)$/m)?.[1] || 'Task',
      estimate: '4h',
      priority: 'MEDIUM'
    };
  }

  private async calculateVelocity(): Promise<number> {
    // Simplified velocity calculation
    return 21; // Default velocity for 2-week sprint
  }

  private async getActiveDocuments(): Promise<any> {
    const git = simpleGit();
    const log = await git.log({ maxCount: 50 });

    const prds: string[] = [];
    const adrs: string[] = [];

    log.all.forEach(commit => {
      const prdMatch = commit.message.match(/PRD-\d+/g);
      const adrMatch = commit.message.match(/ADR-\d+/g);
      if (prdMatch) prds.push(...prdMatch);
      if (adrMatch) adrs.push(...adrMatch);
    });

    return {
      prds: [...new Set(prds)],
      adrs: [...new Set(adrs)]
    };
  }

  private calculateCapacity(): number {
    // 2-week sprint, 5 developers, 6 productive hours/day
    return 2 * 5 * 5 * 6;
  }

  private calculateEndDate(days: number): string {
    const endDate = new Date();
    endDate.setDate(endDate.getDate() + days);
    return endDate.toISOString().split('T')[0];
  }

  private async getNextSprintNumber(): Promise<number> {
    const sprintsDir = path.join(this.ginkoDir, 'sprints');
    if (!await fs.pathExists(sprintsDir)) {
      return 1;
    }

    const files = await fs.readdir(sprintsDir);
    const sprintNumbers = files
      .filter(f => f.match(/sprint-\d+\.md/))
      .map(f => parseInt(f.match(/\d+/)?.[0] || '0'))
      .filter(n => !isNaN(n));

    return sprintNumbers.length > 0 ? Math.max(...sprintNumbers) + 1 : 1;
  }

  private parseSprintIntent(intent: string): any {
    return {
      goal: intent || 'Development Sprint',
      duration: 14,
      focus: 'feature development'
    };
  }
}

/**
 * Adapter for CLI command usage
 */
export class SprintReflectionCommand {
  private pipeline: SprintPipeline;

  constructor() {
    this.pipeline = new SprintPipeline();
  }

  async execute(intent: string, options: any = {}): Promise<void> {
    try {
      if (intent && intent.trim() !== '') {
        this.pipeline = new SprintPipeline(intent);
      }
      await this.pipeline.build();
    } catch (error) {
      console.error(chalk.red(`Sprint planning failed: ${error}`));
      throw error;
    }
  }
}

export default SprintPipeline;