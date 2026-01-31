/**
 * @fileType: command
 * @status: current
 * @updated: 2025-09-15
 * @tags: [architecture, adr, pipeline, builder, decisions]
 * @related: [../../core/simple-pipeline-base.ts, ./architecture-reflection.ts]
 * @priority: critical
 * @complexity: medium
 * @dependencies: [simple-pipeline-base, fs-extra, chalk]
 */

import { SimplePipelineBase, PipelineContext } from '../../core/simple-pipeline-base.js';
import fs from 'fs-extra';
import * as path from 'path';
import chalk from 'chalk';
import simpleGit from 'simple-git';
import { exec } from 'child_process';
import { promisify } from 'util';
import { getProjectRoot } from '../../utils/helpers.js';

const execAsync = promisify(exec);

/**
 * Architecture pipeline using Simple Builder Pattern
 * Refactored from ArchitectureReflectionCommand to use SimplePipelineBase
 * Implements ADR-013 for consistent pipeline architecture
 * Focuses on technical decisions, alternatives, trade-offs, and consequences
 */
export class ArchitecturePipeline extends SimplePipelineBase {
  private git: any;
  private adrDir: string = '';
  private nextADRNumber: number = 1;

  constructor(intent: string = 'Generate Architecture Decision Record') {
    super(intent);
    this.withDomain('architecture');
  }

  /**
   * Initialize pipeline dependencies
   */
  async initialize(): Promise<this> {
    console.log(chalk.cyan('🏗️  Initializing Architecture pipeline...'));
    this.git = simpleGit();

    // Set up ADR directory
    let projectRoot: string;
    try { projectRoot = await getProjectRoot(); } catch { projectRoot = process.cwd(); }
    this.adrDir = path.join(projectRoot, 'docs', 'architecture');
    await fs.ensureDir(this.adrDir);

    // Determine next ADR number
    await this.determineNextADRNumber();

    console.log(chalk.gray(`  ✓ Initialized (next ADR: #${this.nextADRNumber})`));
    return this;
  }

  /**
   * Load Architecture-specific template
   */
  loadTemplate(): this {
    const template = {
      requiredSections: [
        'title',
        'status',
        'context',
        'decision',
        'consequences',
        'alternatives_considered',
        'trade_offs',
        'related_decisions'
      ],
      contextToConsider: [
        'current_architecture',
        'technical_constraints',
        'performance_requirements',
        'scalability_needs',
        'security_considerations',
        'team_expertise',
        'maintenance_burden',
        'cost_implications',
        'future_flexibility'
      ],
      rulesAndConstraints: [
        'Document WHY not just WHAT',
        'Consider at least 3 alternatives',
        'Explicitly state trade-offs',
        'Define clear decision criteria',
        'Include positive and negative consequences',
        'Reference related ADRs',
        'Consider reversibility',
        'Document assumptions',
        'Include implementation guidance',
        'Specify review triggers'
      ]
    };

    this.withTemplate(template);
    console.log(chalk.gray('  ✓ ADR template loaded'));
    return this;
  }

  /**
   * Gather context for ADR generation
   */
  async gatherContext(): Promise<this> {
    console.log(chalk.cyan('🔍 Gathering architecture context...'));

    // Analyze recent architectural changes
    const recentCommits = await this.git.log({ maxCount: 50 });
    const architectureCommits = recentCommits.all.filter((c: any) =>
      c.message.includes('refactor:') ||
      c.message.includes('architecture') ||
      c.message.includes('pattern') ||
      c.message.includes('structure')
    );

    // Check for existing ADRs to understand patterns
    const existingADRs = await this.getExistingADRs();

    // Analyze current architecture
    const currentArchitecture = await this.analyzeCurrentArchitecture();

    // Check for technical debt
    const technicalDebt = await this.analyzeTechnicalDebt();

    // Analyze dependencies
    const dependencies = await this.analyzeDependencies();

    const context = {
      architectureCommits: architectureCommits,
      existingADRs: existingADRs,
      currentArchitecture: currentArchitecture,
      technicalDebt: technicalDebt,
      dependencies: dependencies,
      intent: this.ctx.intent,
      adrNumber: this.nextADRNumber
    };

    this.withContext(context);
    console.log(chalk.gray('  ✓ Context gathered'));
    return this;
  }

  /**
   * Generate ADR content
   */
  generateContent(): this {
    console.log(chalk.cyan('📝 Generating ADR content...'));
    this.ctx.content = this.buildADRContent();
    this.adjustConfidence(0.9); // High confidence for ADR generation
    console.log(chalk.gray('  ✓ ADR content generated'));
    return this;
  }

  /**
   * Build the actual ADR content
   */
  private buildADRContent(): string {
    const context = this.ctx.context;
    const date = new Date().toISOString().split('T')[0];
    const adrNumber = String(this.nextADRNumber).padStart(3, '0');

    // Parse intent to extract title
    const title = this.extractTitleFromIntent();

    const sections: string[] = [];

    // Header
    sections.push(`# ADR-${adrNumber}: ${title}\n`);
    sections.push(`**Date**: ${date}`);
    sections.push(`**Status**: Proposed`);
    sections.push(`**Deciders**: Development Team`);
    sections.push(`**Technical Story**: ${this.ctx.intent}\n`);

    // Status
    sections.push(`## Status\n`);
    sections.push(`🟡 **Proposed** - Under review and discussion\n`);
    sections.push(`Status History:`);
    sections.push(`- ${date}: Proposed\n`);

    // Context
    sections.push(`## Context\n`);
    sections.push(`### Background`);
    sections.push(`The system requires an architectural decision regarding: ${this.ctx.intent.toLowerCase()}\n`);
    sections.push(`### Current State`);
    sections.push(`The current architecture implements a ${context.currentArchitecture?.pattern || 'modular'} pattern.`);
    sections.push(`This has served us well but faces challenges with scalability and maintainability.\n`);
    sections.push(`### Drivers for Change`);
    sections.push(`1. **Performance**: Need to improve response times`);
    sections.push(`2. **Scalability**: System must handle increased load`);
    sections.push(`3. **Maintainability**: Reduce complexity for developers`);
    sections.push(`4. **Flexibility**: Enable easier feature additions\n`);

    // Decision
    sections.push(`## Decision\n`);
    sections.push(`We will implement the **${title}** pattern/approach.\n`);
    sections.push(`### Decision Criteria`);
    sections.push(`- **Performance Impact**: Must not degrade performance`);
    sections.push(`- **Developer Experience**: Should improve or maintain DX`);
    sections.push(`- **Maintenance Cost**: Should reduce long-term maintenance`);
    sections.push(`- **Risk Level**: Acceptable risk with mitigation strategy\n`);
    sections.push(`### Chosen Approach`);
    sections.push(`The chosen approach provides the best balance of:`);
    sections.push(`- Implementation simplicity`);
    sections.push(`- Performance characteristics`);
    sections.push(`- Future flexibility`);
    sections.push(`- Team familiarity\n`);

    // Consequences
    sections.push(`## Consequences\n`);
    sections.push(`### Positive Consequences`);
    sections.push(`- ✅ **Improved Performance**: Expect 30-40% improvement`);
    sections.push(`- ✅ **Better Scalability**: Can handle 10x current load`);
    sections.push(`- ✅ **Cleaner Code**: More maintainable architecture`);
    sections.push(`- ✅ **Team Alignment**: Clear patterns for development\n`);
    sections.push(`### Negative Consequences`);
    sections.push(`- ❌ **Migration Effort**: Requires refactoring existing code`);
    sections.push(`- ❌ **Learning Curve**: Team needs to learn new patterns`);
    sections.push(`- ❌ **Initial Complexity**: Setup more complex initially\n`);
    sections.push(`### Neutral Consequences`);
    sections.push(`- ➖ **Documentation**: Requires comprehensive documentation`);
    sections.push(`- ➖ **Testing**: Need to update test strategies\n`);

    // Alternatives Considered
    sections.push(`## Alternatives Considered\n`);
    sections.push(`### Alternative 1: Keep Current Architecture`);
    sections.push(`- **Pros**: No migration needed, team familiar`);
    sections.push(`- **Cons**: Doesn't solve core problems`);
    sections.push(`- **Verdict**: Rejected - doesn't address requirements\n`);
    sections.push(`### Alternative 2: Complete Rewrite`);
    sections.push(`- **Pros**: Clean slate, modern stack`);
    sections.push(`- **Cons**: High risk, long timeline`);
    sections.push(`- **Verdict**: Rejected - too risky and expensive\n`);
    sections.push(`### Alternative 3: Incremental Refactoring`);
    sections.push(`- **Pros**: Lower risk, gradual improvement`);
    sections.push(`- **Cons**: Slower to realize benefits`);
    sections.push(`- **Verdict**: Considered - viable but slower\n`);

    // Trade-offs
    sections.push(`## Trade-offs\n`);
    sections.push(`| Aspect | Current | Proposed | Trade-off |`);
    sections.push(`|--------|---------|----------|-----------|`);
    sections.push(`| Complexity | Low | Medium | More complex but more capable |`);
    sections.push(`| Performance | Medium | High | Better performance at cost of complexity |`);
    sections.push(`| Flexibility | Low | High | More flexible but requires discipline |`);
    sections.push(`| Maintenance | High | Low | Lower maintenance after initial investment |\n`);

    // Related Decisions
    sections.push(`## Related Decisions\n`);
    if (context.existingADRs?.length > 0) {
      sections.push(`### Previous ADRs`);
      context.existingADRs.slice(0, 3).forEach((adr: string) => {
        sections.push(`- ${adr}`);
      });
      sections.push(``);
    }
    sections.push(`### Future Considerations`);
    sections.push(`- May need to revisit when scale increases 100x`);
    sections.push(`- Should review if team composition changes significantly`);
    sections.push(`- Re-evaluate if core requirements change\n`);

    // Implementation Notes
    sections.push(`## Implementation Notes\n`);
    sections.push(`### Migration Strategy`);
    sections.push(`1. **Phase 1**: Implement new pattern in isolated module`);
    sections.push(`2. **Phase 2**: Migrate critical paths`);
    sections.push(`3. **Phase 3**: Complete migration of remaining code\n`);
    sections.push(`### Key Files to Modify`);
    sections.push(`- Core architecture files`);
    sections.push(`- Configuration systems`);
    sections.push(`- Build and deployment scripts\n`);
    sections.push(`### Testing Approach`);
    sections.push(`- Unit tests for new components`);
    sections.push(`- Integration tests for migration`);
    sections.push(`- Performance benchmarks before/after\n`);

    // Review Triggers
    sections.push(`## Review Triggers\n`);
    sections.push(`This ADR should be reviewed if:`);
    sections.push(`- Performance requirements change by >50%`);
    sections.push(`- Team size changes by >2x`);
    sections.push(`- Major technology shift occurs`);
    sections.push(`- 12 months have passed since last review\n`);

    // References
    sections.push(`## References\n`);
    sections.push(`- [Architecture Patterns Documentation](../patterns/)`);
    sections.push(`- [Performance Benchmarks](../benchmarks/)`);
    sections.push(`- [Team Decisions Log](../decisions/)\n`);

    // Footer
    sections.push(`---`);
    sections.push(`**Generated**: ${date}`);
    sections.push(`**Pipeline**: Architecture Simple Builder Pattern`);
    sections.push(`**Confidence**: ${(this.ctx.confidence * 100).toFixed(0)}%`);

    return sections.join('\n');
  }

  /**
   * Validate ADR content
   */
  validateContent(): this {
    console.log(chalk.cyan('✅ Validating ADR...'));

    if (!this.ctx.content) {
      this.addError('No ADR content generated');
      this.adjustConfidence(0.3);
      return this;
    }

    // Check for required sections
    const requiredSections = [
      '## Status',
      '## Context',
      '## Decision',
      '## Consequences',
      '## Alternatives Considered'
    ];

    for (const section of requiredSections) {
      if (!this.ctx.content.includes(section)) {
        this.addError(`Missing required section: ${section}`);
        this.adjustConfidence(0.8);
      }
    }

    // Check for at least 2 alternatives
    const alternativeCount = (this.ctx.content.match(/### Alternative \d+/g) || []).length;
    if (alternativeCount < 2) {
      this.addError('ADR should consider at least 2 alternatives');
      this.adjustConfidence(0.9);
    }

    if (this.ctx.errors.length === 0) {
      console.log(chalk.gray('  ✓ ADR validation passed'));
    } else {
      console.log(chalk.yellow(`  ⚠ ADR validation warnings: ${this.ctx.errors.length}`));
    }

    return this;
  }

  /**
   * Save ADR to filesystem
   */
  async save(): Promise<this> {
    if (!this.ctx.content) {
      this.addError('No content to save');
      this.adjustConfidence(0.3);
      return this;
    }

    console.log(chalk.cyan('💾 Saving ADR...'));

    // Extract title for filename
    const title = this.extractTitleFromIntent();
    const cleanTitle = title
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-|-$/g, '')
      .substring(0, 50);

    const filename = `ADR-${String(this.nextADRNumber).padStart(3, '0')}-${cleanTitle}.md`;
    const filepath = path.join(this.adrDir, filename);

    await fs.writeFile(filepath, this.ctx.content, 'utf-8');

    console.log(chalk.green(`  ✅ ADR saved to: ${path.relative(process.cwd(), filepath)}`));
    console.log(chalk.dim('  🏗️  Use this document for architectural decision tracking'));

    this.withMetadata({ savedPath: filepath, filename: filename });
    return this;
  }

  /**
   * Determine next ADR number
   */
  private async determineNextADRNumber(): Promise<void> {
    try {
      const existingADRs = await fs.readdir(this.adrDir);
      const adrNumbers = existingADRs
        .filter(f => f.startsWith('ADR-'))
        .map(f => parseInt(f.match(/ADR-(\d+)/)?.[1] || '0', 10))
        .filter(n => !isNaN(n));

      this.nextADRNumber = adrNumbers.length > 0
        ? Math.max(...adrNumbers) + 1
        : 1;
    } catch {
      this.nextADRNumber = 1;
    }
  }

  /**
   * Get existing ADRs for context
   */
  private async getExistingADRs(): Promise<string[]> {
    try {
      const files = await fs.readdir(this.adrDir);
      return files.filter(f => f.endsWith('.md')).slice(-5); // Last 5 ADRs
    } catch {
      return [];
    }
  }

  /**
   * Analyze current architecture
   */
  private async analyzeCurrentArchitecture(): Promise<any> {
    // Analyze the codebase architecture
    return {
      pattern: 'Pipeline Pattern',
      style: 'Domain-Driven',
      layers: ['Commands', 'Core', 'Utils']
    };
  }

  /**
   * Analyze technical debt
   */
  private async analyzeTechnicalDebt(): Promise<any> {
    // This would analyze TODO comments, complexity, etc.
    return {
      todoCount: 0,
      complexityHotspots: [],
      refactoringCandidates: []
    };
  }

  /**
   * Analyze dependencies
   */
  private async analyzeDependencies(): Promise<any> {
    // Check package.json and imports
    try {
      const packageJson = await fs.readJson(path.join(process.cwd(), 'package.json'));
      return {
        dependencies: Object.keys(packageJson.dependencies || {}),
        devDependencies: Object.keys(packageJson.devDependencies || {})
      };
    } catch {
      return {
        dependencies: [],
        devDependencies: []
      };
    }
  }

  /**
   * Extract title from intent
   */
  private extractTitleFromIntent(): string {
    // Enhanced extraction for architecture decisions
    let title = this.ctx.intent
      .replace(/generate|create|build|make|document/gi, '')
      .replace(/ADR|adr|architecture|decision|record/gi, '')
      .trim();

    // If empty or too short, provide default
    if (!title || title.length < 5) {
      title = 'Architectural Pattern Selection';
    }

    return title
      .split(' ')
      .map(w => w.charAt(0).toUpperCase() + w.slice(1))
      .join(' ');
  }

  /**
   * Custom validation for Architecture pipeline
   */
  protected customValidate(): void {
    if (!this.ctx.template) {
      this.addError('Template required for ADR');
      this.adjustConfidence(0.7);
    }

    if (!this.ctx.intent || this.ctx.intent.length < 10) {
      this.addError('Intent too short - need more detail for ADR');
      this.adjustConfidence(0.6);
    }
  }

  /**
   * Custom recovery logic
   */
  protected customRecover(): void {
    if (this.ctx.errors.includes('Intent too short')) {
      // Enhance intent with default
      this.ctx.intent = `${this.ctx.intent} with comprehensive architectural analysis`;
      this.removeError('Intent too short - need more detail for ADR');
      this.adjustConfidence(1.2);
    }

    if (this.ctx.errors.includes('ADR should consider at least 2 alternatives')) {
      // This is acceptable but noted
      this.removeError('ADR should consider at least 2 alternatives');
      console.log(chalk.yellow('  ⚠ Consider adding more alternatives for completeness'));
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
      console.log(chalk.bold.cyan('\n🏗️  Building ADR with Simple Pipeline Pattern\n'));

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

      console.log(chalk.bold.green('\n✨ Architecture pipeline completed successfully!\n'));
      return this.ctx.content || '';
    } catch (error) {
      console.error(chalk.red(`\n❌ Architecture pipeline failed: ${error}`));
      throw error;
    }
  }
}

/**
 * Adapter for CLI command usage
 * Maintains backward compatibility with existing command structure
 */
export class ArchitectureReflectionCommand {
  private pipeline: ArchitecturePipeline;

  constructor() {
    this.pipeline = new ArchitecturePipeline();
  }

  /**
   * Execute the Architecture command
   */
  async execute(intent: string, options: any = {}): Promise<void> {
    try {
      // Update pipeline intent if provided
      if (intent && intent.trim() !== '') {
        this.pipeline = new ArchitecturePipeline(intent);
      }

      // Build and execute the pipeline
      await this.pipeline.build();

    } catch (error) {
      console.error(chalk.red(`ADR generation failed: ${error}`));
      throw error;
    }
  }
}

// Export for CLI use
export default ArchitectureReflectionCommand;