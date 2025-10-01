/**
 * @fileType: command
 * @status: current
 * @updated: 2025-10-01
 * @tags: [explore, reflection, pipeline, builder, prd, backlog]
 * @related: [../../core/simple-pipeline-base.ts, ../explore.ts]
 * @priority: high
 * @complexity: medium
 * @dependencies: [simple-pipeline-base, fs-extra, chalk]
 */

import { SimplePipelineBase, PipelineContext } from '../../core/simple-pipeline-base.js';
import fs from 'fs-extra';
import * as path from 'path';
import chalk from 'chalk';
import { getGinkoDir } from '../../utils/helpers.js';

interface ExploreOptions {
  store?: boolean;
  id?: string;
  content?: string;
  type?: 'prd' | 'backlog';
  review?: boolean;
  verbose?: boolean;
}

/**
 * Explore pipeline using Simple Builder Pattern
 * Implements Universal Reflection Pattern for exploration mode
 */
export class ExplorePipeline extends SimplePipelineBase {
  private topic: string | undefined;
  private options: ExploreOptions;
  private ginkoDir: string = '';
  private exploreId: string = '';
  private explorationType: 'prd' | 'backlog' = 'backlog';

  constructor(topic: string | undefined, options: ExploreOptions = {}) {
    super(topic || 'Exploration mode');
    this.topic = topic;
    this.options = options;
    this.withDomain('explore');
  }

  /**
   * Initialize pipeline dependencies
   */
  async initialize(): Promise<this> {
    this.ginkoDir = await getGinkoDir();
    this.exploreId = this.options.id || `explore-${Date.now()}`;

    if (this.options.verbose) {
      console.log(chalk.cyan('🔮 Initializing exploration pipeline...'));
    }

    return this;
  }

  /**
   * Get domain for this reflector
   */
  getDomain(): string {
    return 'explore';
  }

  /**
   * Get quality template for exploration output
   */
  getQualityTemplate(): any {
    if (this.explorationType === 'prd') {
      return {
        requiredSections: [
          'problem_space',
          'pain_points',
          'root_causes',
          'potential_solutions',
          'trade_offs',
          'success_metrics',
          'implementation_scope',
          'open_questions'
        ],
        contextToConsider: [
          'user_needs',
          'technical_constraints',
          'team_velocity',
          'existing_architecture',
          'alternatives'
        ],
        rulesAndConstraints: [
          'Think broadly about problem space',
          'Consider user needs and technical constraints',
          'Be creative but realistic about scope',
          'Challenge assumptions and propose alternatives',
          'Define clear success metrics',
          'Identify MVP vs. full implementation',
          'Call out open questions and unknowns'
        ]
      };
    } else {
      return {
        requiredSections: [
          'current_state',
          'desired_state',
          'quick_wins',
          'deeper_improvements',
          'success_criteria',
          'risks'
        ],
        contextToConsider: [
          'baseline_functionality',
          'improvement_opportunities',
          'effort_estimates',
          'impact_assessment',
          'potential_blockers'
        ],
        rulesAndConstraints: [
          'Describe current state clearly',
          'Define specific desired outcomes',
          'Identify quick wins (<1 day)',
          'Assess deeper improvements (2-5 days)',
          'Establish clear success criteria',
          'Document potential risks'
        ]
      };
    }
  }

  /**
   * Gather context for exploration
   */
  async gatherContext(): Promise<this> {
    if (this.options.verbose) {
      console.log(chalk.cyan('🔍 Gathering exploration context...'));
    }

    // Detect exploration size/type
    this.explorationType = this.detectExplorationSize();

    // Load any existing temp data
    let tempData = null;
    const tempPath = path.join(this.ginkoDir, '.temp', `${this.exploreId}.json`);
    if (await fs.pathExists(tempPath)) {
      tempData = await fs.readJSON(tempPath);
    }

    const context = {
      topic: this.topic,
      type: this.explorationType,
      exploreId: this.exploreId,
      timestamp: new Date().toISOString(),
      tempData,
      outputType: this.explorationType === 'prd' ? 'PRD (Product Requirements Document)' : 'Backlog Item'
    };

    this.withContext(context);

    if (this.options.verbose) {
      console.log(chalk.gray(`  ✓ Type detected: ${this.explorationType}`));
      console.log(chalk.gray(`  ✓ ID: ${this.exploreId}`));
    }

    return this;
  }

  /**
   * Generate exploration prompt for AI collaboration
   */
  generatePrompt(): this {
    if (this.options.verbose) {
      console.log(chalk.cyan('📝 Generating exploration prompt...'));
    }

    const prompt = this.buildExplorationPrompt();
    const instructions = this.buildAIInstructions();

    this.ctx.content = `${prompt}\n${instructions}`;
    this.adjustConfidence(0.9);

    if (this.options.verbose) {
      console.log(chalk.gray('  ✓ Prompt generated'));
    }

    return this;
  }

  /**
   * Build exploration prompt based on type
   */
  private buildExplorationPrompt(): string {
    if (!this.topic) {
      return '';
    }

    if (this.explorationType === 'prd') {
      return `
${chalk.bold('Problem Space Exploration')}

Let's explore: "${this.topic}"

${chalk.yellow('Current Pain Points:')}
[AI: What specific problems are users/developers experiencing?]

${chalk.yellow('Root Causes:')}
[AI: Why do these problems exist? What's the deeper issue?]

${chalk.yellow('Potential Solutions:')}
[AI: What are 3-5 different approaches we could take?]

${chalk.yellow('Trade-offs:')}
[AI: What are the pros/cons of each approach?]

${chalk.yellow('Success Metrics:')}
[AI: How would we measure if this is successful?]

${chalk.yellow('Implementation Scope:')}
[AI: Is this days, weeks, or months of work? What's the MVP?]

${chalk.yellow('Open Questions:')}
[AI: What do we still need to figure out?]
`;
    } else {
      return `
${chalk.bold('Feature Enhancement Exploration')}

Let's explore: "${this.topic}"

${chalk.yellow('Current State:')}
[AI: How does this work today? What's the baseline?]

${chalk.yellow('Desired State:')}
[AI: What would "better" look like? Be specific.]

${chalk.yellow('Quick Wins:')}
[AI: What could we improve in <1 day?]

${chalk.yellow('Deeper Improvements:')}
[AI: What would take 2-5 days but have bigger impact?]

${chalk.yellow('Success Criteria:')}
[AI: How do we know when this is "done"?]

${chalk.yellow('Risks:')}
[AI: What could go wrong? What should we watch for?]
`;
    }
  }

  /**
   * Build AI collaboration instructions
   */
  private buildAIInstructions(): string {
    const outputType = this.ctx.context.outputType;

    return chalk.cyan(`
AI Collaboration Instructions:

This is EXPLORATION MODE - a free-flowing, hypothetical thinking space.
No code will be written yet. We're exploring possibilities.

1. Complete the exploration framework above with specific insights
2. Think broadly about the problem space
3. Consider user needs, technical constraints, and team velocity
4. Be creative but realistic about scope
5. Challenge assumptions and propose alternatives

After exploration, create a structured ${outputType} and store it:

ginko explore --store --id=${this.exploreId} --type=${this.explorationType} --content="[structured document]"

The document should be markdown formatted for ${this.explorationType === 'prd' ? 'docs/PRD/' : 'BACKLOG.md'}`);
  }

  /**
   * Validate exploration output
   */
  validateOutput(): this {
    if (!this.ctx.content) {
      this.addError('No exploration content generated');
      this.adjustConfidence(0.5);
      return this;
    }

    // If storing, validate that we have the required data
    if (this.options.store) {
      if (!this.options.id) {
        this.addError('Store operation requires --id');
        this.adjustConfidence(0.3);
      }
      if (!this.options.content) {
        this.addError('Store operation requires --content');
        this.adjustConfidence(0.3);
      }
    }

    return this;
  }

  /**
   * Store exploration result (PRD or backlog item)
   */
  async storeExploration(): Promise<this> {
    if (!this.options.store || !this.options.id) {
      return this;
    }

    const content = this.options.content || '';
    const type = this.options.type || 'backlog';
    const projectRoot = path.dirname(this.ginkoDir);

    if (type === 'prd') {
      await this.storePRD(content, projectRoot);
    } else {
      await this.storeBacklogItem(content, projectRoot);
    }

    // Clean up temp file
    const tempPath = path.join(this.ginkoDir, '.temp', `${this.options.id}.json`);
    await fs.remove(tempPath).catch(() => {}); // Ignore if doesn't exist

    return this;
  }

  /**
   * Store as PRD document
   */
  private async storePRD(content: string, projectRoot: string): Promise<void> {
    const prdDir = path.join(projectRoot, 'docs', 'PRD');
    await fs.ensureDir(prdDir);

    // Extract title from content (first # heading)
    const titleMatch = content.match(/^#\s+(.+)$/m);
    const title = titleMatch ? titleMatch[1] : 'Untitled PRD';
    const filename = `PRD-${new Date().toISOString().split('T')[0]}-${title.toLowerCase().replace(/[^a-z0-9]+/g, '-')}.md`;

    const prdPath = path.join(prdDir, filename);
    await fs.writeFile(prdPath, content);

    console.log(chalk.green(`✅ PRD created: ${path.relative(projectRoot, prdPath)}`));

    // Provide phase transition options
    console.log();
    console.log(chalk.dim('─'.repeat(60)));
    console.log(chalk.bold('Exploration phase complete. Next steps:'));
    console.log();
    console.log(chalk.cyan('  ginko architecture') + chalk.dim(' - Design technical implementation'));
    console.log(chalk.cyan('  ginko capture') + chalk.dim(' - Save key insights from exploration'));
    console.log(chalk.cyan('  ginko handoff') + chalk.dim(' - Document exploration for team review'));
    console.log();
    console.log(chalk.dim('Note: Architecture phase will define the technical approach.'));
  }

  /**
   * Store as backlog item
   */
  private async storeBacklogItem(content: string, projectRoot: string): Promise<void> {
    const backlogPath = path.join(projectRoot, 'BACKLOG.md');

    // Read existing backlog
    let backlog = '';
    if (await fs.pathExists(backlogPath)) {
      backlog = await fs.readFile(backlogPath, 'utf8');
    } else {
      backlog = '# Ginko Development Backlog\n\nThis document contains planned features and architectural designs for future implementation.\n\n';
    }

    // Find appropriate section or create new one
    const featureMatch = content.match(/^###\s+FEATURE-\d+/m);
    if (featureMatch) {
      // It's a properly formatted backlog item
      backlog += '\n' + content + '\n';
    } else {
      // Wrap in feature format
      const nextId = (backlog.match(/FEATURE-(\d+)/g) || [])
        .map(m => parseInt(m.replace('FEATURE-', '')))
        .reduce((max, n) => Math.max(max, n), 0) + 1;

      const formatted = `\n### FEATURE-${String(nextId).padStart(3, '0')}: ${content.split('\n')[0].replace(/^#+\s*/, '')}
**Priority**: MEDIUM
**Status**: PROPOSED
**Created**: ${new Date().toISOString().split('T')[0]}

${content}\n`;

      backlog += formatted;
    }

    await fs.writeFile(backlogPath, backlog);
    console.log(chalk.green(`✅ Backlog item added to BACKLOG.md`));
  }

  /**
   * Detect exploration size based on topic keywords
   */
  private detectExplorationSize(): 'prd' | 'backlog' {
    if (!this.topic) {
      return 'backlog';
    }

    const lower = this.topic.toLowerCase();

    // PRD indicators (big ideas)
    if (lower.includes('system') || lower.includes('architecture') ||
      lower.includes('platform') || lower.includes('redesign') ||
      lower.includes('overhaul') || lower.includes('framework') ||
      lower.includes('how might we') || lower.includes('what if')) {
      return 'prd';
    }

    // Backlog indicators (focused improvements)
    if (lower.includes('fix') || lower.includes('improve') ||
      lower.includes('add') || lower.includes('update') ||
      lower.includes('enhance') || lower.includes('optimize') ||
      lower.includes('bug') || lower.includes('issue')) {
      return 'backlog';
    }

    // Default to backlog for smaller scope
    return 'backlog';
  }

  /**
   * Save temp context for phase 2
   */
  private async saveTempContext(): Promise<void> {
    const tempPath = path.join(this.ginkoDir, '.temp', `${this.exploreId}.json`);
    await fs.ensureDir(path.dirname(tempPath));
    await fs.writeJSON(tempPath, {
      topic: this.topic,
      type: this.explorationType,
      exploreId: this.exploreId,
      timestamp: new Date().toISOString()
    });
  }

  /**
   * Output exploration framework to stdout
   */
  private async outputExploration(): Promise<void> {
    process.stdout.write(chalk.cyan('\n🔮 Exploration Mode: ' + chalk.bold(this.topic || '')) + '\n');
    process.stdout.write(chalk.dim('─'.repeat(60)) + '\n');
    process.stdout.write((this.ctx.content || '') + '\n');
    process.stdout.write(chalk.dim('─'.repeat(60)) + '\n');

    // Ensure stdout is flushed
    await new Promise(resolve => process.stdout.write('', resolve));
  }

  /**
   * Custom validation for explore
   */
  protected customValidate(): void {
    // Phase 2 (store) validation
    if (this.options.store) {
      if (!this.options.id) {
        this.addError('Store operation requires --id parameter');
        this.adjustConfidence(0.3);
      }
      if (!this.options.content) {
        this.addError('Store operation requires --content parameter');
        this.adjustConfidence(0.3);
      }
      return;
    }

    // Phase 1 (generate prompt) validation
    if (!this.topic) {
      this.addError('Exploration topic required for prompt generation');
      this.adjustConfidence(0.2);
    }
  }

  /**
   * Custom recovery logic
   */
  protected customRecover(): void {
    // If no topic but we have a valid store operation, allow it
    if (this.options.store && this.options.id && this.options.content) {
      this.removeError('Exploration topic required for prompt generation');
      this.adjustConfidence(1.2); // Boost confidence
    }
  }

  /**
   * Custom execution logic
   */
  protected async customExecute(): Promise<void> {
    // Phase 2: Store exploration result
    if (this.options.store && this.options.id) {
      await this.storeExploration();
      if (!this.options.verbose) {
        console.log('done');
      }
      return;
    }

    // Phase 1: Generate and output exploration prompt
    if (!this.ctx.content) {
      this.generatePrompt();
    }

    await this.saveTempContext();
    await this.outputExploration();
  }

  /**
   * Main build method using fluent interface
   */
  async build(): Promise<void> {
    try {
      if (this.options.verbose) {
        console.log(chalk.bold.cyan('\n🚀 Building exploration with Simple Pipeline Pattern\n'));
      }

      await this
        .initialize()
        .then(p => p.gatherContext())
        .then(p => {
          p.validateOutput();
          return p;
        })
        .then(p => p.validate())
        .then(p => {
          p.recover();
          return p;
        })
        .then(p => p.execute());

      if (this.options.verbose) {
        console.log(chalk.bold.green('\n✨ Exploration pipeline completed successfully!\n'));
      }

    } catch (error) {
      process.stdout.write(chalk.red('error: ') + (error instanceof Error ? error.message : String(error)) + '\n');
      process.exit(1);
    }
  }
}

/**
 * Adapter for CLI command usage
 * Maintains backward compatibility with existing command structure
 */
export class ExploreReflectionCommand {
  private pipeline: ExplorePipeline;

  constructor(topic: string | undefined, options: ExploreOptions = {}) {
    this.pipeline = new ExplorePipeline(topic, options);
  }

  /**
   * Execute the explore command
   */
  async execute(): Promise<void> {
    try {
      await this.pipeline.build();

      // Exit with code 0 to avoid stderr interpretation
      // The AI prompt is expected behavior, not an error
      if (!this.pipeline['options'].store) {
        process.exit(0);
      }
    } catch (error) {
      console.error(chalk.red(`Exploration failed: ${error}`));
      throw error;
    }
  }
}

// Export for CLI use
export default ExploreReflectionCommand;
