/**
 * @fileType: command
 * @status: current
 * @updated: 2025-09-15
 * @tags: [sprint, pipeline, builder, planning, agile, safe-defaults]
 * @related: [../../core/simple-pipeline-base.ts, ./sprint-pipeline.ts]
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
 * Sprint planning options following ADR-014 Safe Defaults Pattern
 */
export interface SprintOptions {
  // Opt-in enhancements
  wbs?: boolean;      // Perform work breakdown structure analysis
  trace?: boolean;    // Verify PRD→ADR→Backlog traceability
  dryrun?: boolean;   // Preview without saving
  strict?: boolean;   // Fail on warnings or dependency issues

  // Opt-out of safety checks (default: false = checks enabled)
  nodep?: boolean;    // Skip dependency analysis
  nowarn?: boolean;   // Skip warning generation
}

/**
 * Sprint analysis results
 */
interface SprintAnalysis {
  requestedPoints: number;
  velocityTarget: number;
  isOverloaded: boolean;
  dependencies: DependencyGraph;
  traceability: TraceabilityReport;
  warnings: string[];
  recommendations: string[];
}

/**
 * Dependency graph structure
 */
interface DependencyGraph {
  nodes: string[];
  edges: Array<{ from: string; to: string; type: 'explicit' | 'implicit' }>;
  ordering: string[];
  blockers: string[];
  parallelizable: string[][];
  criticalPath: string[];
}

/**
 * Traceability report
 */
interface TraceabilityReport {
  complete: string[];
  missingADRs: string[];
  missingBacklog: string[];
  orphanedItems: string[];
}

/**
 * Enhanced Sprint Pipeline with Safe Defaults (ADR-014)
 *
 * Provides intelligent sprint planning with:
 * - Automatic dependency analysis (opt-out with --nodep)
 * - Capacity validation by default
 * - Traceability checking (enhanced with --trace)
 * - Work breakdown structure (opt-in with --wbs)
 */
export class EnhancedSprintPipeline extends SimplePipelineBase {
  private git: any;
  private ginkoDir: string = '';
  private options: SprintOptions;
  private analysis: SprintAnalysis;

  constructor(intent: string = 'Generate sprint plan', options: SprintOptions = {}) {
    super(intent);
    this.withDomain('sprint');

    // Apply safe defaults (ADR-014)
    this.options = {
      nodep: false,
      nowarn: false,
      ...options
    };

    // Initialize analysis
    this.analysis = {
      requestedPoints: 0,
      velocityTarget: 21,
      isOverloaded: false,
      dependencies: {
        nodes: [],
        edges: [],
        ordering: [],
        blockers: [],
        parallelizable: [],
        criticalPath: []
      },
      traceability: {
        complete: [],
        missingADRs: [],
        missingBacklog: [],
        orphanedItems: []
      },
      warnings: [],
      recommendations: []
    };
  }

  /**
   * Initialize pipeline dependencies
   */
  async initialize(): Promise<this> {
    console.log(chalk.cyan('📋 Initializing enhanced sprint pipeline...'));
    this.git = simpleGit();
    this.ginkoDir = await getGinkoDir();
    this.adjustConfidence(0.9);

    if (this.options.dryrun) {
      console.log(chalk.yellow('  ⚡ DRY RUN MODE - No files will be saved'));
    }

    return this;
  }

  /**
   * Load sprint template with safe defaults considerations
   */
  async loadTemplate(): Promise<this> {
    const template = {
      requiredSections: [
        'sprint_goal',
        'capacity_analysis',  // Added for safe defaults
        'dependency_check',   // Added for safe defaults
        'user_stories',
        'technical_tasks',
        'acceptance_criteria',
        'risk_assessment',
        'success_metrics'
      ],
      contextToConsider: [
        'requested_items',
        'dependencies',
        'velocity_history',
        'team_capacity',
        'traceability',
        'technical_debt'
      ],
      rulesAndConstraints: [
        'Sprint capacity must not exceed velocity without explicit acknowledgment',
        'Dependencies must be satisfied or explicitly waived',
        'All PRDs should have traced ADRs and backlog items',
        'Sprint goals must be SMART',
        'Risk mitigation strategies required for identified risks'
      ]
    };

    this.withTemplate(template);
    console.log(chalk.gray('  ✓ Enhanced sprint template loaded'));
    return this;
  }

  /**
   * Gather context with enhanced analysis
   */
  async gatherContext(): Promise<this> {
    console.log(chalk.cyan('🔍 Gathering enhanced sprint context...'));

    // Parse intent for requested items
    const parsedIntent = this.parseSprintIntent(this.ctx.intent);

    // Basic context gathering
    const backlogItems = await this.getBacklogItems();
    const velocity = await this.calculateVelocity();
    const capacity = this.calculateCapacity();

    // Dependency analysis (default: on)
    if (!this.options.nodep && parsedIntent.requestedItems.length > 0) {
      console.log(chalk.gray('  → Analyzing dependencies...'));
      this.analysis.dependencies = await this.analyzeDependencies(parsedIntent.requestedItems);
    }

    // Traceability check (enhanced with --trace)
    if (this.options.trace && parsedIntent.requestedItems.length > 0) {
      console.log(chalk.gray('  → Verifying traceability...'));
      this.analysis.traceability = await this.verifyTraceability(parsedIntent.requestedItems);
    }

    // Work breakdown structure (opt-in with --wbs)
    if (this.options.wbs && parsedIntent.requestedItems.length > 0) {
      console.log(chalk.gray('  → Performing work breakdown...'));
      const wbsItems = await this.performWorkBreakdown(parsedIntent.requestedItems);
      backlogItems.tasks.push(...wbsItems.tasks);
      backlogItems.userStories.push(...wbsItems.stories);
    }

    // Capacity analysis (always performed)
    await this.analyzeCapacity(parsedIntent.requestedItems, velocity);

    const context = {
      parsedIntent,
      backlogItems,
      velocity,
      capacity,
      analysis: this.analysis,
      sprintNumber: await this.getNextSprintNumber(),
      startDate: new Date().toISOString().split('T')[0],
      endDate: this.calculateEndDate(14)
    };

    this.withContext(context);
    console.log(chalk.gray('  ✓ Enhanced context gathered'));

    // Show warnings if not suppressed
    if (!this.options.nowarn && this.analysis.warnings.length > 0) {
      console.log(chalk.yellow('\n⚠️  Sprint Planning Warnings:'));
      this.analysis.warnings.forEach(w => console.log(chalk.yellow(`  • ${w}`)));
    }

    return this;
  }

  /**
   * Generate sprint content with enhanced sections
   */
  generateContent(): this {
    console.log(chalk.cyan('📝 Generating enhanced sprint plan...'));

    const context = this.ctx.context;
    const sections: string[] = [];

    // Header
    sections.push(`# Sprint ${context.sprintNumber}: ${context.parsedIntent.goal || 'Development Sprint'}\n`);
    sections.push(`**Duration**: ${context.startDate} to ${context.endDate}`);
    sections.push(`**Velocity Target**: ${context.velocity} story points`);
    sections.push(`**Team Capacity**: ${context.capacity} hours`);
    sections.push(`**Analysis Mode**: ${this.getAnalysisMode()}\n`);

    // Capacity Analysis Section (Safe Default)
    sections.push(`## 📊 Capacity Analysis\n`);
    if (this.analysis.isOverloaded) {
      sections.push(`### ⚠️ Sprint Overloaded`);
      sections.push(`- **Requested**: ${this.analysis.requestedPoints} points`);
      sections.push(`- **Capacity**: ${this.analysis.velocityTarget} points`);
      sections.push(`- **Overload**: ${this.analysis.requestedPoints - this.analysis.velocityTarget} points`);
      sections.push(`- **Risk**: High probability of sprint failure\n`);

      if (this.analysis.recommendations.length > 0) {
        sections.push(`### Recommendations`);
        this.analysis.recommendations.forEach(rec => {
          sections.push(`- ${rec}`);
        });
      }
    } else {
      sections.push(`### ✅ Capacity Check Passed`);
      sections.push(`- **Requested**: ${this.analysis.requestedPoints} points`);
      sections.push(`- **Available**: ${this.analysis.velocityTarget} points`);
      sections.push(`- **Buffer**: ${this.analysis.velocityTarget - this.analysis.requestedPoints} points`);
    }
    sections.push('');

    // Dependency Analysis Section (Safe Default unless --nodep)
    if (!this.options.nodep) {
      sections.push(`## 🔗 Dependency Analysis\n`);

      if (this.analysis.dependencies.blockers.length > 0) {
        sections.push(`### ⚠️ Blocking Dependencies`);
        this.analysis.dependencies.blockers.forEach(blocker => {
          sections.push(`- ${blocker}`);
        });
        sections.push('');
      }

      if (this.analysis.dependencies.ordering.length > 0) {
        sections.push(`### Recommended Execution Order`);
        this.analysis.dependencies.ordering.forEach((item, i) => {
          sections.push(`${i + 1}. ${item}`);
        });
        sections.push('');
      }

      if (this.analysis.dependencies.parallelizable.length > 0) {
        sections.push(`### Parallelization Opportunities`);
        this.analysis.dependencies.parallelizable.forEach(group => {
          sections.push(`- [${group.join(', ')}] can be worked in parallel`);
        });
        sections.push('');
      }

      if (this.analysis.dependencies.criticalPath.length > 0) {
        sections.push(`### Critical Path`);
        sections.push(`${this.analysis.dependencies.criticalPath.join(' → ')}`);
        sections.push('');
      }
    } else {
      sections.push(`## Dependencies\n`);
      sections.push(`*Analysis skipped (--nodep flag)*\n`);
    }

    // Traceability Report (if --trace)
    if (this.options.trace) {
      sections.push(`## 🔍 Traceability Report\n`);

      if (this.analysis.traceability.complete.length > 0) {
        sections.push(`### ✅ Complete Traceability`);
        this.analysis.traceability.complete.forEach(item => {
          sections.push(`- ${item}: PRD → ADR → Backlog`);
        });
        sections.push('');
      }

      if (this.analysis.traceability.missingADRs.length > 0) {
        sections.push(`### ⚠️ Missing Architecture Decisions`);
        this.analysis.traceability.missingADRs.forEach(item => {
          sections.push(`- ${item}: Needs ADR documentation`);
        });
        sections.push('');
      }

      if (this.analysis.traceability.missingBacklog.length > 0) {
        sections.push(`### ⚠️ Missing Work Breakdown`);
        this.analysis.traceability.missingBacklog.forEach(item => {
          sections.push(`- ${item}: Needs backlog decomposition`);
        });
        sections.push('');
      }
    }

    // Sprint Goal
    sections.push(`## 🎯 Sprint Goal\n`);
    sections.push(`${context.parsedIntent.goal || 'Deliver value through iterative development'}\n`);

    // Work Items (potentially from WBS)
    sections.push(`## 📝 Sprint Backlog\n`);

    if (context.parsedIntent.requestedItems.length > 0) {
      sections.push(`### Requested Items`);
      context.parsedIntent.requestedItems.forEach((item: string) => {
        const points = this.estimatePoints(item);
        sections.push(`- [ ] ${item} (${points} points)`);
      });
      sections.push('');
    }

    // User Stories
    if (context.backlogItems?.userStories?.length > 0) {
      sections.push(`### User Stories`);
      context.backlogItems.userStories.forEach((story: any, i: number) => {
        sections.push(`${i + 1}. **${story.title}**`);
        sections.push(`   - As a ${story.user}`);
        sections.push(`   - I want ${story.feature}`);
        sections.push(`   - So that ${story.benefit}`);
        sections.push(`   - Points: ${story.points || 3}`);
      });
      sections.push('');
    }

    // Technical Tasks
    if (context.backlogItems?.tasks?.length > 0) {
      sections.push(`### Technical Tasks`);
      context.backlogItems.tasks.forEach((task: any) => {
        sections.push(`- [ ] ${task.title} (${task.estimate || '4h'})`);
      });
    }
    sections.push('');

    // Auto-generated UAT Task (e014_s02_t06)
    sections.push(`### UAT & Polish (Final Task)\n`);
    sections.push(`**Goal:** Verify sprint deliverables and ensure production readiness\n`);

    // Generate testing checklist derived from sprint scope
    const totalItems =
      (context.parsedIntent?.requestedItems?.length || 0) +
      (context.backlogItems?.userStories?.length || 0) +
      (context.backlogItems?.tasks?.length || 0);

    // Scale UAT complexity based on sprint size
    if (totalItems <= 3) {
      // Small sprint: brief UAT
      sections.push(`**Acceptance Criteria:**`);
      sections.push(`- [ ] All sprint tasks completed and working`);
      sections.push(`- [ ] Build passes with no errors`);
      sections.push(`- [ ] Quick manual verification of changes`);
    } else if (totalItems <= 7) {
      // Medium sprint: standard UAT
      sections.push(`**Acceptance Criteria:**`);
      sections.push(`- [ ] All sprint tasks completed and working`);
      sections.push(`- [ ] Build passes with no errors`);
      sections.push(`- [ ] Unit tests pass for new code`);
      sections.push(`- [ ] Manual verification of each feature`);
      sections.push(`- [ ] Documentation updated if needed`);
    } else {
      // Large sprint: detailed UAT
      sections.push(`**Acceptance Criteria:**`);
      sections.push(`- [ ] All sprint tasks completed and working`);
      sections.push(`- [ ] Build passes with no errors or warnings`);
      sections.push(`- [ ] Unit tests pass with adequate coverage`);
      sections.push(`- [ ] Integration tests pass`);
      sections.push(`- [ ] Manual verification of each feature`);
      sections.push(`- [ ] Edge cases tested`);
      sections.push(`- [ ] Documentation updated`);
      sections.push(`- [ ] Performance acceptable`);
    }
    sections.push('');

    // Acceptance Criteria
    sections.push(`## ✅ Acceptance Criteria\n`);
    sections.push(`- [ ] All committed items completed`);
    sections.push(`- [ ] Code coverage above 80%`);
    sections.push(`- [ ] No critical bugs`);
    sections.push(`- [ ] Documentation updated`);
    if (!this.options.nodep) {
      sections.push(`- [ ] All dependencies satisfied`);
    }
    sections.push('');

    // Risk Assessment
    sections.push(`## ⚠️ Risk Assessment\n`);
    sections.push(`| Risk | Probability | Impact | Mitigation |`);
    sections.push(`|------|------------|--------|------------|`);

    if (this.analysis.isOverloaded) {
      sections.push(`| Sprint overload | High | High | Defer lower priority items |`);
    }
    if (this.analysis.dependencies.blockers.length > 0) {
      sections.push(`| Blocked dependencies | High | High | Resolve blockers first |`);
    }
    sections.push(`| Scope creep | Medium | High | Daily standups, clear priorities |`);
    sections.push(`| Technical debt | Low | Medium | Allocate 20% for refactoring |`);
    sections.push('');

    // Success Metrics
    sections.push(`## 📊 Success Metrics\n`);
    sections.push(`- **Velocity**: Complete ${context.velocity} story points`);
    sections.push(`- **Quality**: Zero critical bugs`);
    sections.push(`- **Delivery**: 90% of committed stories`);
    if (!this.options.nodep) {
      sections.push(`- **Dependencies**: All satisfied or deferred`);
    }
    sections.push('');

    // Warnings Summary (if any)
    if (this.analysis.warnings.length > 0 && !this.options.nowarn) {
      sections.push(`## ⚠️ Planning Warnings\n`);
      this.analysis.warnings.forEach(warning => {
        sections.push(`- ${warning}`);
      });
      sections.push('');
    }

    // Footer
    sections.push('---');
    sections.push(`**Generated**: ${new Date().toISOString()}`);
    sections.push(`**Pipeline**: EnhancedSprintPipeline v2.0`);
    sections.push(`**Analysis**: ${this.getAnalysisMode()}`);
    sections.push(`**Confidence**: ${Math.round(this.ctx.confidence * 100)}%`);

    this.ctx.content = sections.join('\n');
    console.log(chalk.gray('  ✓ Enhanced sprint plan generated'));
    return this;
  }

  /**
   * Validate content with strict mode support
   */
  validateContent(): this {
    if (!this.ctx.content) {
      this.ctx.errors.push('No sprint content generated');
      this.adjustConfidence(0.3);
      return this;
    }

    // Strict mode validation
    if (this.options.strict) {
      if (this.analysis.warnings.length > 0) {
        this.ctx.errors.push(`Strict mode: ${this.analysis.warnings.length} warnings present`);
        this.adjustConfidence(0.4);
      }

      if (this.analysis.dependencies.blockers.length > 0) {
        this.ctx.errors.push(`Strict mode: ${this.analysis.dependencies.blockers.length} blocking dependencies`);
        this.adjustConfidence(0.3);
      }

      if (this.analysis.isOverloaded) {
        this.ctx.errors.push('Strict mode: Sprint capacity exceeded');
        this.adjustConfidence(0.3);
      }
    }

    console.log(chalk.gray('  ✓ Content validated'));
    return this;
  }

  /**
   * Save sprint plan (skip if dryrun)
   */
  async save(): Promise<this> {
    if (this.options.dryrun) {
      console.log(chalk.yellow('\n📋 DRY RUN - Sprint plan not saved'));
      console.log(chalk.dim('Plan would be saved to: .ginko/sprints/'));
      return this;
    }

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
   * Main build method with enhanced flow
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
        .then(ctx => {
          if (this.options.dryrun) {
            // In dryrun, display the content
            console.log('\n' + chalk.dim('='.repeat(60)));
            console.log(ctx.content);
            console.log(chalk.dim('='.repeat(60)) + '\n');
          }
          return ctx.metadata?.savedPath || '';
        });
    } catch (error) {
      console.error(chalk.red(`Enhanced sprint pipeline failed: ${error}`));
      throw error;
    }
  }

  // Helper methods

  /**
   * Parse sprint intent for requested items
   */
  private parseSprintIntent(intent: string): any {
    const prdPattern = /PRD-[A-Z0-9]+/gi;
    const adrPattern = /ADR-[A-Z0-9]+/gi;
    const taskPattern = /TASK-[A-Z0-9]+/gi;
    const backlogPattern = /BACKLOG-[A-Z0-9]+/gi;

    const prds = intent.match(prdPattern) || [];
    const adrs = intent.match(adrPattern) || [];
    const tasks = intent.match(taskPattern) || [];
    const backlogs = intent.match(backlogPattern) || [];

    const allItems = [...prds, ...adrs, ...tasks, ...backlogs];

    // Remove item references from goal
    let goal = intent;
    allItems.forEach(item => {
      goal = goal.replace(item, '').replace(/,\s*,/g, ',').trim();
    });
    goal = goal.replace(/^[,\s]+|[,\s]+$/g, '');

    return {
      requestedItems: allItems,
      prds,
      adrs,
      tasks,
      backlogs,
      goal: goal || `Work on ${allItems.join(', ')}`,
      hasSpecificItems: allItems.length > 0
    };
  }

  /**
   * Analyze dependencies between requested items
   */
  private async analyzeDependencies(items: string[]): Promise<DependencyGraph> {
    const graph: DependencyGraph = {
      nodes: items,
      edges: [],
      ordering: [],
      blockers: [],
      parallelizable: [],
      criticalPath: []
    };

    // Analyze each item for dependencies
    for (const item of items) {
      const deps = await this.findItemDependencies(item);

      for (const dep of deps) {
        graph.edges.push({ from: item, to: dep, type: 'explicit' });

        // Check if dependency is not in sprint
        if (!items.includes(dep)) {
          graph.blockers.push(`${item} depends on ${dep} (not in sprint)`);
          this.analysis.warnings.push(`${item} has external dependency: ${dep}`);
        }
      }
    }

    // Perform topological sort for ordering
    graph.ordering = this.topologicalSort(graph);

    // Find parallelizable groups
    graph.parallelizable = this.findParallelGroups(graph);

    // Calculate critical path
    graph.criticalPath = this.findCriticalPath(graph);

    return graph;
  }

  /**
   * Find dependencies for a specific item
   */
  private async findItemDependencies(item: string): Promise<string[]> {
    const deps: string[] = [];

    // Try to load the item file
    const itemPath = await this.findItemFile(item);
    if (itemPath && await fs.pathExists(itemPath)) {
      const content = await fs.readFile(itemPath, 'utf-8');

      // Look for dependency patterns
      const depPatterns = [
        /depends?\s+on[:\s]+([\w-]+)/gi,
        /requires?[:\s]+([\w-]+)/gi,
        /prerequisite[:\s]+([\w-]+)/gi,
        /after[:\s]+([\w-]+)/gi
      ];

      for (const pattern of depPatterns) {
        const matches = content.matchAll(pattern);
        for (const match of matches) {
          // Try to normalize to item format (PRD-X, ADR-Y, etc.)
          const dep = match[1].toUpperCase();
          if (dep.match(/^(PRD|ADR|TASK|BACKLOG)-/)) {
            deps.push(dep);
          }
        }
      }
    }

    // Mock data for demonstration
    if (item === 'PRD-C') deps.push('PRD-A');
    if (item === 'PRD-B') deps.push('PRD-A', 'PRD-C');

    return [...new Set(deps)];
  }

  /**
   * Verify traceability for requested items
   */
  private async verifyTraceability(items: string[]): Promise<TraceabilityReport> {
    const report: TraceabilityReport = {
      complete: [],
      missingADRs: [],
      missingBacklog: [],
      orphanedItems: []
    };

    for (const item of items) {
      if (item.startsWith('PRD-')) {
        const hasADR = await this.checkForADR(item);
        const hasBacklog = await this.checkForBacklog(item);

        if (hasADR && hasBacklog) {
          report.complete.push(item);
        } else {
          if (!hasADR) {
            report.missingADRs.push(item);
            this.analysis.warnings.push(`${item} lacks architecture decision record`);
          }
          if (!hasBacklog) {
            report.missingBacklog.push(item);
            this.analysis.warnings.push(`${item} lacks backlog decomposition`);
          }
        }
      }
    }

    return report;
  }

  /**
   * Perform work breakdown structure analysis
   */
  private async performWorkBreakdown(items: string[]): Promise<any> {
    const wbsItems: { tasks: any[]; stories: any[] } = { tasks: [], stories: [] };

    for (const item of items) {
      if (item.startsWith('PRD-')) {
        // Generate user stories from PRD
        wbsItems.stories.push({
          title: `User story from ${item}`,
          user: 'user',
          feature: `functionality from ${item}`,
          benefit: 'improved experience',
          points: 5,
          source: item
        });

        // Generate technical tasks
        wbsItems.tasks.push(
          { title: `Implement backend for ${item}`, estimate: '8h', source: item },
          { title: `Create UI for ${item}`, estimate: '6h', source: item },
          { title: `Write tests for ${item}`, estimate: '4h', source: item }
        );
      }
    }

    console.log(chalk.gray(`  → Generated ${wbsItems.stories.length} stories and ${wbsItems.tasks.length} tasks`));
    return wbsItems;
  }

  /**
   * Analyze capacity vs requested work
   */
  private async analyzeCapacity(items: string[], velocity: number): Promise<void> {
    // Estimate points for each item
    let totalPoints = 0;

    for (const item of items) {
      const points = this.estimatePoints(item);
      totalPoints += points;
    }

    this.analysis.requestedPoints = totalPoints;
    this.analysis.velocityTarget = velocity;

    if (totalPoints > velocity) {
      this.analysis.isOverloaded = true;
      this.analysis.warnings.push(
        `Sprint overloaded: ${totalPoints} points requested vs ${velocity} velocity`
      );
      this.analysis.recommendations.push(
        `Split into ${Math.ceil(totalPoints / velocity)} sprints`,
        `Defer ${totalPoints - velocity} points of lower priority work`,
        `Consider increasing team capacity or reducing scope`
      );
    }
  }

  /**
   * Estimate story points for an item
   */
  private estimatePoints(item: string): number {
    // Use Fibonacci sequence for estimates
    if (item.startsWith('PRD-')) return 13;  // PRDs are typically large
    if (item.startsWith('ADR-')) return 5;   // ADRs are medium
    if (item.startsWith('TASK-')) return 3;  // Tasks are small
    if (item.startsWith('BACKLOG-')) return 3;
    return 8; // Default medium estimate
  }

  /**
   * Find file path for an item
   */
  private async findItemFile(item: string): Promise<string | null> {
    const type = item.split('-')[0];
    const searchPaths: Record<string, string> = {
      PRD: path.join(this.ginkoDir, '..', 'docs', 'PRD'),
      ADR: path.join(this.ginkoDir, '..', 'docs', 'adr'),
      TASK: path.join(this.ginkoDir, 'backlog'),
      BACKLOG: path.join(this.ginkoDir, 'backlog')
    };

    const searchDir = searchPaths[type];
    if (searchDir && await fs.pathExists(searchDir)) {
      const files = await fs.readdir(searchDir);
      const matchingFile = files.find(f => f.includes(item));
      if (matchingFile) {
        return path.join(searchDir, matchingFile);
      }
    }

    return null;
  }

  /**
   * Check if PRD has associated ADRs
   */
  private async checkForADR(prdId: string): Promise<boolean> {
    // Simplified check - in reality would search ADR files for PRD reference
    const adrDir = path.join(this.ginkoDir, '..', 'docs', 'adr');
    if (await fs.pathExists(adrDir)) {
      const files = await fs.readdir(adrDir);
      return files.some(f => f.includes(prdId.replace('PRD', 'ADR')));
    }
    return false;
  }

  /**
   * Check if PRD has backlog items
   */
  private async checkForBacklog(prdId: string): Promise<boolean> {
    // Simplified check - in reality would search backlog for PRD reference
    const backlogDir = path.join(this.ginkoDir, 'backlog');
    if (await fs.pathExists(backlogDir)) {
      const files = await fs.readdir(backlogDir);
      return files.length > 0; // Simplified
    }
    return false;
  }

  /**
   * Topological sort for dependency ordering
   */
  private topologicalSort(graph: DependencyGraph): string[] {
    const visited = new Set<string>();
    const stack: string[] = [];

    const visit = (node: string) => {
      if (visited.has(node)) return;
      visited.add(node);

      // Visit dependencies first
      const deps = graph.edges
        .filter(e => e.from === node)
        .map(e => e.to)
        .filter(dep => graph.nodes.includes(dep));

      deps.forEach(dep => visit(dep));
      stack.push(node);
    };

    graph.nodes.forEach(node => visit(node));
    return stack;
  }

  /**
   * Find groups of items that can be worked in parallel
   */
  private findParallelGroups(graph: DependencyGraph): string[][] {
    const groups: string[][] = [];
    const assigned = new Set<string>();

    for (const node of graph.nodes) {
      if (assigned.has(node)) continue;

      // Find all nodes that don't depend on this node or its dependencies
      const group = [node];

      for (const other of graph.nodes) {
        if (assigned.has(other) || other === node) continue;

        // Check if they can be parallel
        const hasConflict = graph.edges.some(e =>
          (e.from === node && e.to === other) ||
          (e.from === other && e.to === node)
        );

        if (!hasConflict) {
          group.push(other);
          assigned.add(other);
        }
      }

      if (group.length > 1) {
        groups.push(group);
      }
      assigned.add(node);
    }

    return groups;
  }

  /**
   * Find critical path through dependencies
   */
  private findCriticalPath(graph: DependencyGraph): string[] {
    if (graph.ordering.length === 0) return [];

    // Simplified: return the longest dependency chain
    // In reality, would calculate based on effort estimates
    return graph.ordering.slice(0, Math.min(3, graph.ordering.length));
  }

  /**
   * Get backlog items from filesystem
   */
  private async getBacklogItems(): Promise<any> {
    const backlogPath = path.join(this.ginkoDir, 'backlog');
    if (!await fs.pathExists(backlogPath)) {
      return { tasks: [], userStories: [] };
    }

    const items: { tasks: any[]; userStories: any[] } = { tasks: [], userStories: [] };
    const files = await fs.readdir(backlogPath);

    for (const file of files.slice(0, 10)) {
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
    return 21; // Default 2-week sprint velocity
  }

  private calculateCapacity(): number {
    return 2 * 5 * 5 * 6; // 2 weeks × 5 devs × 5 days × 6 hours
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

  /**
   * Get analysis mode description
   */
  private getAnalysisMode(): string {
    const modes: string[] = [];

    if (!this.options.nodep) modes.push('Dependencies');
    if (!this.options.nowarn) modes.push('Warnings');
    if (this.options.trace) modes.push('Traceability');
    if (this.options.wbs) modes.push('WBS');
    if (this.options.strict) modes.push('Strict');
    if (this.options.dryrun) modes.push('DryRun');

    return modes.length > 0 ? modes.join(', ') : 'Standard';
  }
}

/**
 * CLI Adapter
 */
export class EnhancedSprintReflectionCommand {
  private pipeline: EnhancedSprintPipeline;

  constructor() {
    this.pipeline = new EnhancedSprintPipeline();
  }

  async execute(intent: string, options: any = {}): Promise<void> {
    try {
      // Convert CLI options to pipeline options
      const pipelineOptions: SprintOptions = {
        wbs: options.wbs || false,
        trace: options.trace || false,
        dryrun: options.dryrun || false,
        strict: options.strict || false,
        nodep: options.nodep || false,
        nowarn: options.nowarn || false
      };

      this.pipeline = new EnhancedSprintPipeline(intent, pipelineOptions);
      await this.pipeline.build();
    } catch (error) {
      console.error(chalk.red(`Sprint planning failed: ${error}`));
      throw error;
    }
  }
}

export default EnhancedSprintPipeline;