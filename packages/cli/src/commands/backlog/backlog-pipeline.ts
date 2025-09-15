/**
 * @fileType: command
 * @status: current
 * @updated: 2025-09-15
 * @tags: [backlog, pipeline, builder, tasks, management]
 * @related: [../../core/simple-pipeline-base.ts, ./backlog-reflection.ts]
 * @priority: high
 * @complexity: medium
 * @dependencies: [simple-pipeline-base, fs-extra, chalk]
 */

import { SimplePipelineBase, PipelineContext } from '../../core/simple-pipeline-base.js';
import fs from 'fs-extra';
import * as path from 'path';
import chalk from 'chalk';
import simpleGit from 'simple-git';
import { ContextGatherer } from './context-gatherer.js';
import { BacklogBase } from './base.js';

/**
 * Backlog pipeline using Simple Builder Pattern
 * Refactored from BacklogReflectionCommand to use SimplePipelineBase
 * Implements ADR-013 for consistent pipeline architecture
 * Manages backlog items, tasks, and development tracking
 */
export class BacklogPipeline extends SimplePipelineBase {
  private git: any;
  private backlogDir: string = '';
  private contextGatherer: ContextGatherer;
  private backlog: BacklogBase;
  private nextItemNumber: number = 1;

  constructor(intent: string = 'Create backlog item') {
    super(intent);
    this.withDomain('backlog');
    this.contextGatherer = new ContextGatherer();
    this.backlog = new BacklogBase();
  }

  /**
   * Initialize pipeline dependencies
   */
  async initialize(): Promise<this> {
    console.log(chalk.cyan('📝 Initializing Backlog pipeline...'));
    this.git = simpleGit();

    // Initialize backlog base
    await this.backlog.init();

    // Set up backlog directory
    this.backlogDir = path.join(process.cwd(), '.ginko', 'backlog');
    await fs.ensureDir(this.backlogDir);

    // Determine next item number
    await this.determineNextItemNumber();

    console.log(chalk.gray(`  ✓ Initialized (next item: #${this.nextItemNumber})`));
    return this;
  }

  /**
   * Load backlog-specific template
   */
  loadTemplate(): this {
    const template = {
      requiredSections: [
        'metadata',
        'problem_statement',
        'solution_approach',
        'acceptance_criteria',
        'technical_notes',
        'relationships'
      ],
      contextToConsider: [
        'current_work_in_progress',
        'related_backlog_items',
        'recent_commits',
        'project_technologies',
        'team_patterns'
      ],
      rulesAndConstraints: [
        'Title must be concise (max 60 chars)',
        'Priority based on: Critical=blocking/security, High=user-facing, Medium=improvements, Low=nice-to-have',
        'Size estimates: S=<1day, M=1-3days, L=3-5days, XL=>5days',
        'Include specific, measurable acceptance criteria',
        'Reference related items by ID',
        'Follow existing patterns in the codebase',
        'Consider technical debt implications',
        'Document dependencies clearly'
      ]
    };

    this.withTemplate(template);
    console.log(chalk.gray('  ✓ Backlog template loaded'));
    return this;
  }

  /**
   * Gather backlog-specific context
   */
  async gatherContext(): Promise<this> {
    console.log(chalk.cyan('🔍 Gathering backlog context...'));

    // Gather system context
    const systemContext = await this.contextGatherer.gatherContext();

    // Get existing backlog items
    const backlogItems = await this.backlog.listItems();

    // Analyze recent git activity
    const recentCommits = await this.git.log({ maxCount: 30 });
    const taskCommits = recentCommits.all.filter((c: any) =>
      c.message.includes('task:') ||
      c.message.includes('fix:') ||
      c.message.includes('feat:')
    );

    // Analyze work patterns
    const workPatterns = this.analyzeWorkPatterns(backlogItems);

    const context = {
      conversationContext: {
        intent: this.ctx.intent,
        timestamp: Date.now()
      },
      systemState: {
        currentBranch: systemContext.currentBranch,
        modifiedFiles: systemContext.modifiedFiles,
        isDirty: systemContext.isDirty
      },
      domainKnowledge: {
        totalItems: backlogItems.length,
        inProgress: systemContext.inProgressItems || [],
        highPriority: systemContext.highPriorityItems || [],
        recentlyUpdated: systemContext.recentlyUpdated || []
      },
      pastPatterns: workPatterns,
      projectContext: {
        technologies: systemContext.mainTechnologies || [],
        hasTests: systemContext.hasTests || false,
        hasCICD: systemContext.hasCICD || false
      },
      recentTasks: taskCommits,
      backlogItems: backlogItems,
      itemNumber: this.nextItemNumber
    };

    this.withContext(context);
    console.log(chalk.gray('  ✓ Context gathered'));
    return this;
  }

  /**
   * Generate backlog item content
   */
  generateContent(): this {
    console.log(chalk.cyan('📝 Generating backlog item...'));
    this.ctx.content = this.buildBacklogContent();
    this.adjustConfidence(0.85); // Good confidence for backlog generation
    console.log(chalk.gray('  ✓ Backlog item generated'));
    return this;
  }

  /**
   * Build the actual backlog content
   */
  private buildBacklogContent(): string {
    const context = this.ctx.context;
    const date = new Date().toISOString().split('T')[0];
    const itemNumber = String(this.nextItemNumber).padStart(4, '0');

    // Parse intent to extract type and details
    const { type, title, priority, size } = this.parseBacklogIntent();

    const sections: string[] = [];

    // Header
    sections.push(`# ${type.toUpperCase()}-${itemNumber}: ${title}\n`);

    // Metadata
    sections.push(`## Metadata\n`);
    sections.push(`- **Type**: ${type}`);
    sections.push(`- **Priority**: ${priority}`);
    sections.push(`- **Size**: ${size}`);
    sections.push(`- **Status**: TODO`);
    sections.push(`- **Created**: ${date}`);
    sections.push(`- **Author**: Generated via Ginko Pipeline\n`);

    // Problem Statement
    sections.push(`## Problem Statement\n`);
    sections.push(`### What is the problem?`);
    sections.push(`${this.generateProblemStatement()}\n`);
    sections.push(`### Who is affected?`);
    sections.push(`- Primary: Developers using this functionality`);
    sections.push(`- Secondary: End users experiencing the issue\n`);
    sections.push(`### Current pain points`);
    sections.push(`- Manual process is time-consuming`);
    sections.push(`- Error-prone implementation`);
    sections.push(`- Lack of clear documentation\n`);

    // Solution Approach
    sections.push(`## Solution Approach\n`);
    sections.push(`### Technical Approach`);
    sections.push(`${this.generateSolutionApproach()}\n`);
    sections.push(`### Alternatives Considered`);
    sections.push(`1. **Quick Fix**: Minimal change but doesn't address root cause`);
    sections.push(`2. **Full Refactor**: Complete rewrite but high risk`);
    sections.push(`3. **Incremental**: Step-by-step improvement (recommended)\n`);

    // Acceptance Criteria
    sections.push(`## Acceptance Criteria\n`);
    sections.push(`- [ ] Core functionality implemented and tested`);
    sections.push(`- [ ] Unit tests provide >80% coverage`);
    sections.push(`- [ ] Documentation updated with examples`);
    sections.push(`- [ ] Code review completed and approved`);
    sections.push(`- [ ] No regression in existing functionality`);
    sections.push(`- [ ] Performance metrics meet requirements`);
    sections.push(`- [ ] Error handling covers edge cases\n`);

    // Technical Notes
    sections.push(`## Technical Notes\n`);
    sections.push(`### Dependencies`);
    if (context.projectContext?.technologies?.length > 0) {
      context.projectContext.technologies.slice(0, 5).forEach((tech: string) => {
        sections.push(`- ${tech}`);
      });
    } else {
      sections.push(`- No external dependencies identified`);
    }
    sections.push(``);
    sections.push(`### Security Considerations`);
    sections.push(`- Input validation required`);
    sections.push(`- Authentication checks in place`);
    sections.push(`- No sensitive data exposure\n`);
    sections.push(`### Performance Requirements`);
    sections.push(`- Response time < 200ms`);
    sections.push(`- Memory usage within limits`);
    sections.push(`- Scalable to expected load\n`);

    // Relationships
    sections.push(`## Relationships\n`);
    if (context.backlogItems?.length > 0) {
      sections.push(`### Related Items`);
      context.backlogItems.slice(-3).forEach((item: any) => {
        sections.push(`- ${item.id || item.name || 'Previous item'}`);
      });
      sections.push(``);
    }
    sections.push(`### Parent Feature`);
    sections.push(`- Main feature branch or epic\n`);
    sections.push(`### Blocks`);
    sections.push(`- No blocking dependencies identified\n`);
    sections.push(`### Blocked By`);
    sections.push(`- No items blocking this work\n`);

    // Implementation Notes
    sections.push(`## Implementation Notes\n`);
    sections.push(`### Key Files to Modify`);
    if (context.systemState?.modifiedFiles?.length > 0) {
      sections.push(`Based on recent activity:`);
      context.systemState.modifiedFiles.slice(0, 5).forEach((file: string) => {
        sections.push(`- ${file}`);
      });
    } else {
      sections.push(`- To be determined during implementation`);
    }
    sections.push(``);
    sections.push(`### Testing Strategy`);
    sections.push(`- Unit tests for new functionality`);
    sections.push(`- Integration tests for workflows`);
    sections.push(`- Manual testing for UI changes\n`);

    // Command to Execute
    sections.push(`## Execute Command\n`);
    sections.push('```bash');
    sections.push(`ginko backlog create ${type} "${title}" -p ${priority} -s ${size}`);
    sections.push('```\n');

    // Footer
    sections.push(`---`);
    sections.push(`**Generated**: ${date}`);
    sections.push(`**Pipeline**: Backlog Simple Builder Pattern`);
    sections.push(`**Confidence**: ${(this.ctx.confidence * 100).toFixed(0)}%`);

    return sections.join('\n');
  }

  /**
   * Validate backlog content
   */
  validateContent(): this {
    console.log(chalk.cyan('✅ Validating backlog item...'));

    if (!this.ctx.content) {
      this.addError('No backlog content generated');
      this.adjustConfidence(0.3);
      return this;
    }

    // Check for required sections
    const requiredSections = [
      '## Metadata',
      '## Problem Statement',
      '## Solution Approach',
      '## Acceptance Criteria'
    ];

    for (const section of requiredSections) {
      if (!this.ctx.content.includes(section)) {
        this.addError(`Missing required section: ${section}`);
        this.adjustConfidence(0.8);
      }
    }

    // Check for acceptance criteria checkboxes
    const checkboxCount = (this.ctx.content.match(/- \[ \]/g) || []).length;
    if (checkboxCount < 3) {
      this.addError('Should have at least 3 acceptance criteria');
      this.adjustConfidence(0.9);
    }

    if (this.ctx.errors.length === 0) {
      console.log(chalk.gray('  ✓ Backlog validation passed'));
    } else {
      console.log(chalk.yellow(`  ⚠ Backlog validation warnings: ${this.ctx.errors.length}`));
    }

    return this;
  }

  /**
   * Save backlog item to filesystem
   */
  async save(): Promise<this> {
    if (!this.ctx.content) {
      this.addError('No content to save');
      this.adjustConfidence(0.3);
      return this;
    }

    console.log(chalk.cyan('💾 Saving backlog item...'));

    const { type, title } = this.parseBacklogIntent();
    const cleanTitle = title
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-|-$/g, '')
      .substring(0, 50);

    const filename = `${type.toUpperCase()}-${String(this.nextItemNumber).padStart(4, '0')}-${cleanTitle}.md`;
    const filepath = path.join(this.backlogDir, filename);

    await fs.writeFile(filepath, this.ctx.content, 'utf-8');

    console.log(chalk.green(`  ✅ Backlog item saved to: ${path.relative(process.cwd(), filepath)}`));
    console.log(chalk.dim('  📋 Use this for task tracking and sprint planning'));

    this.withMetadata({ savedPath: filepath, filename: filename });
    return this;
  }

  /**
   * Determine next item number
   */
  private async determineNextItemNumber(): Promise<void> {
    try {
      const existingItems = await fs.readdir(this.backlogDir);
      const itemNumbers = existingItems
        .map(f => {
          const match = f.match(/[A-Z]+-(\d+)/);
          return match ? parseInt(match[1], 10) : 0;
        })
        .filter(n => !isNaN(n));

      this.nextItemNumber = itemNumbers.length > 0
        ? Math.max(...itemNumbers) + 1
        : 1;
    } catch {
      this.nextItemNumber = 1;
    }
  }

  /**
   * Analyze work patterns from existing backlog
   */
  private analyzeWorkPatterns(backlogItems: any[]): any {
    const types = new Set<string>();
    const sizes = new Map<string, number>();
    const priorities = new Map<string, number>();

    backlogItems.forEach(item => {
      if (item.type) types.add(item.type);
      if (item.size) {
        sizes.set(item.size, (sizes.get(item.size) || 0) + 1);
      }
      if (item.priority) {
        priorities.set(item.priority, (priorities.get(item.priority) || 0) + 1);
      }
    });

    return {
      existingTypes: Array.from(types),
      commonSizes: Array.from(sizes.entries()).sort((a, b) => b[1] - a[1]).map(e => e[0]),
      priorityDistribution: Object.fromEntries(priorities)
    };
  }

  /**
   * Parse backlog intent to extract details
   */
  private parseBacklogIntent(): { type: string; title: string; priority: string; size: string } {
    const intent = this.ctx.intent.toLowerCase();

    // Determine type
    let type = 'task';
    if (intent.includes('bug') || intent.includes('fix')) type = 'bug';
    else if (intent.includes('feature') || intent.includes('add')) type = 'feature';
    else if (intent.includes('refactor') || intent.includes('improve')) type = 'refactor';
    else if (intent.includes('test')) type = 'test';
    else if (intent.includes('doc')) type = 'docs';

    // Extract title
    let title = this.ctx.intent
      .replace(/create|add|new|backlog|item|task|bug|feature|refactor/gi, '')
      .trim();

    if (!title || title.length < 5) {
      title = 'Implement new functionality';
    }

    // Determine priority
    let priority = 'Medium';
    if (intent.includes('critical') || intent.includes('urgent')) priority = 'Critical';
    else if (intent.includes('high') || intent.includes('important')) priority = 'High';
    else if (intent.includes('low') || intent.includes('minor')) priority = 'Low';

    // Determine size
    let size = 'M';
    if (intent.includes('small') || intent.includes('quick')) size = 'S';
    else if (intent.includes('large') || intent.includes('complex')) size = 'L';
    else if (intent.includes('huge') || intent.includes('epic')) size = 'XL';

    return { type, title, priority, size };
  }

  /**
   * Generate problem statement based on intent
   */
  private generateProblemStatement(): string {
    const { type, title } = this.parseBacklogIntent();

    switch (type) {
      case 'bug':
        return `A defect has been identified in ${title}. This causes unexpected behavior and impacts user experience.`;
      case 'feature':
        return `Users have requested ${title}. This would enhance the product capabilities and provide additional value.`;
      case 'refactor':
        return `The current implementation of ${title} has technical debt that needs to be addressed for maintainability.`;
      case 'test':
        return `Test coverage for ${title} is insufficient, creating risk for regressions and bugs.`;
      case 'docs':
        return `Documentation for ${title} is missing or outdated, making it difficult for users and developers.`;
      default:
        return `There is a need to ${title} to improve the system.`;
    }
  }

  /**
   * Generate solution approach based on type
   */
  private generateSolutionApproach(): string {
    const { type } = this.parseBacklogIntent();

    switch (type) {
      case 'bug':
        return 'Identify root cause through debugging, implement fix with minimal side effects, add tests to prevent regression.';
      case 'feature':
        return 'Design user-friendly interface, implement core functionality with proper error handling, ensure backward compatibility.';
      case 'refactor':
        return 'Analyze current implementation, identify improvement opportunities, refactor incrementally with continuous testing.';
      case 'test':
        return 'Identify critical paths, write comprehensive unit tests, add integration tests for workflows, ensure CI/CD integration.';
      case 'docs':
        return 'Review existing documentation, identify gaps, write clear examples and explanations, maintain consistency with codebase.';
      default:
        return 'Implement solution following best practices, ensure quality through testing, document changes thoroughly.';
    }
  }

  /**
   * Custom validation for backlog pipeline
   */
  protected customValidate(): void {
    if (!this.ctx.template) {
      this.addError('Template required for backlog item');
      this.adjustConfidence(0.7);
    }

    if (!this.ctx.intent || this.ctx.intent.length < 5) {
      this.addError('Intent too short - need more detail for backlog item');
      this.adjustConfidence(0.6);
    }
  }

  /**
   * Custom recovery logic
   */
  protected customRecover(): void {
    if (this.ctx.errors.includes('Intent too short')) {
      // Enhance intent with default
      this.ctx.intent = `${this.ctx.intent} task for development`;
      this.removeError('Intent too short - need more detail for backlog item');
      this.adjustConfidence(1.2);
    }

    if (this.ctx.errors.includes('Should have at least 3 acceptance criteria')) {
      // This is acceptable but noted
      this.removeError('Should have at least 3 acceptance criteria');
      console.log(chalk.yellow('  ⚠ Consider adding more acceptance criteria'));
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

    // Validate the content
    this.validateContent();
  }

  /**
   * Main build method using fluent interface
   */
  async build(): Promise<string> {
    try {
      console.log(chalk.bold.cyan('\n📝 Building Backlog Item with Simple Pipeline Pattern\n'));

      await this
        .initialize()
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
        .then(p => p.execute());

      console.log(chalk.bold.green('\n✨ Backlog pipeline completed successfully!\n'));
      return this.ctx.content || '';
    } catch (error) {
      console.error(chalk.red(`\n❌ Backlog pipeline failed: ${error}`));
      throw error;
    }
  }
}

/**
 * Adapter for CLI command usage
 * Maintains backward compatibility with existing command structure
 */
export class BacklogReflectionCommand {
  private pipeline: BacklogPipeline;

  constructor() {
    this.pipeline = new BacklogPipeline();
  }

  /**
   * Execute the backlog command
   */
  async execute(intent: string, options: any = {}): Promise<void> {
    try {
      // Update pipeline intent if provided
      if (intent && intent.trim() !== '') {
        this.pipeline = new BacklogPipeline(intent);
      }

      // Build and execute the pipeline
      await this.pipeline.build();

    } catch (error) {
      console.error(chalk.red(`Backlog generation failed: ${error}`));
      throw error;
    }
  }
}

// Export for CLI use
export default BacklogReflectionCommand;