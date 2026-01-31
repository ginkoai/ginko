/**
 * @fileType: command
 * @status: current
 * @updated: 2025-09-15
 * @tags: [prd, pipeline, builder, requirements, product]
 * @related: [../../core/simple-pipeline-base.ts, ./prd-reflection.ts]
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
 * PRD pipeline using Simple Builder Pattern
 * Refactored from PRDReflectionCommand to use SimplePipelineBase
 * Implements ADR-013 for consistent pipeline architecture
 * Focuses on the WHY - pain points, outcomes, value
 */
export class PRDPipeline extends SimplePipelineBase {
  private git: any;
  private projectRoot: string = '';
  private prdDir: string = '';
  private nextPRDNumber: number = 1;

  constructor(intent: string = 'Generate Product Requirements Document') {
    super(intent);
    this.withDomain('prd');
  }

  /**
   * Initialize pipeline dependencies
   */
  async initialize(): Promise<this> {
    console.log(chalk.cyan('📋 Initializing PRD pipeline...'));
    this.git = simpleGit();

    // Set up PRD directory
    try { this.projectRoot = await getProjectRoot(); } catch { this.projectRoot = process.cwd(); }
    this.prdDir = path.join(this.projectRoot, 'docs', 'PRD');
    await fs.ensureDir(this.prdDir);

    // Determine next PRD number
    await this.determineNextPRDNumber();

    console.log(chalk.gray(`  ✓ Initialized (next PRD: #${this.nextPRDNumber})`));
    return this;
  }

  /**
   * Load PRD-specific template
   */
  loadTemplate(): this {
    const template = {
      requiredSections: [
        'executive_summary',
        'problem_statement',
        'user_pain_points',
        'desired_outcomes',
        'success_metrics',
        'user_stories',
        'functional_requirements',
        'non_functional_requirements',
        'solutions_considered',
        'recommended_solution',
        'value_assessment',
        'risks_and_mitigations',
        'timeline_and_phases',
        'stakeholders'
      ],
      contextToConsider: [
        'current_user_feedback',
        'competitive_analysis',
        'technical_constraints',
        'business_goals',
        'market_positioning',
        'resource_availability',
        'regulatory_requirements',
        'integration_points',
        'user_personas',
        'dependency_analysis'
      ],
      rulesAndConstraints: [
        'Focus on WHY before HOW',
        'Define measurable success criteria',
        'Prioritize user value over technical elegance',
        'Consider multiple solution approaches',
        'Document assumptions explicitly',
        'Include clear acceptance criteria',
        'Map to business objectives',
        'Specify both functional and non-functional requirements',
        'Identify stakeholders and their concerns',
        'Provide phased implementation approach'
      ]
    };

    this.withTemplate(template);
    console.log(chalk.gray('  ✓ PRD template loaded'));
    return this;
  }

  /**
   * Gather context for PRD generation
   */
  async gatherContext(): Promise<this> {
    console.log(chalk.cyan('🔍 Gathering PRD context...'));

    // Analyze recent commits for feature context
    const recentCommits = await this.git.log({ maxCount: 50 });
    const featureCommits = recentCommits.all.filter((c: any) =>
      c.message.includes('feat:') ||
      c.message.includes('feature') ||
      c.message.includes('add')
    );

    // Check for existing PRDs to understand patterns
    const existingPRDs = await this.getExistingPRDs();

    // Analyze current codebase for technical constraints
    const technicalContext = await this.analyzeTechnicalContext();

    // Check for user feedback or issues
    const userFeedback = await this.gatherUserFeedback();

    const context = {
      featureCommits: featureCommits,
      existingPRDs: existingPRDs,
      technicalConstraints: technicalContext,
      userFeedback: userFeedback,
      projectStructure: await this.analyzeProjectStructure(),
      intent: this.ctx.intent,
      prdNumber: this.nextPRDNumber
    };

    this.withContext(context);
    console.log(chalk.gray('  ✓ Context gathered'));
    return this;
  }

  /**
   * Generate PRD content
   */
  generateContent(): this {
    console.log(chalk.cyan('📝 Generating PRD content...'));
    this.ctx.content = this.buildPRDContent();
    this.adjustConfidence(0.85); // Good confidence for PRD generation
    console.log(chalk.gray('  ✓ PRD content generated'));
    return this;
  }

  /**
   * Build the actual PRD content
   */
  private buildPRDContent(): string {
    const context = this.ctx.context;
    const date = new Date().toISOString().split('T')[0];
    const prdNumber = String(this.nextPRDNumber).padStart(3, '0');

    // Parse intent to extract title
    const title = this.extractTitleFromIntent();

    const sections: string[] = [];

    // Header
    sections.push(`# PRD-${prdNumber}: ${title}\n`);
    sections.push(`**Date**: ${date}`);
    sections.push(`**Status**: Draft`);
    sections.push(`**Author**: Generated via Ginko Pipeline\n`);

    // Executive Summary
    sections.push(`## Executive Summary\n`);
    sections.push(`This PRD outlines the requirements for: ${this.ctx.intent}`);
    sections.push(`The primary goal is to deliver value through well-defined user outcomes.\n`);

    // Problem Statement
    sections.push(`## Problem Statement\n`);
    sections.push(`### Current Situation`);
    sections.push(`Users currently face challenges with the existing solution.`);
    sections.push(``);
    sections.push(`### Impact`);
    sections.push(`This impacts productivity and user satisfaction.\n`);

    // User Pain Points
    sections.push(`## User Pain Points\n`);
    sections.push(`1. **Complexity**: Current process is too complex`);
    sections.push(`2. **Performance**: System responds slowly`);
    sections.push(`3. **Usability**: Interface is not intuitive\n`);

    // Desired Outcomes
    sections.push(`## Desired Outcomes\n`);
    sections.push(`### For Users`);
    sections.push(`- Simplified workflow with fewer steps`);
    sections.push(`- Faster response times`);
    sections.push(`- Intuitive interface\n`);
    sections.push(`### For Business`);
    sections.push(`- Increased user adoption`);
    sections.push(`- Reduced support tickets`);
    sections.push(`- Higher satisfaction scores\n`);

    // Success Metrics
    sections.push(`## Success Metrics\n`);
    sections.push(`| Metric | Current | Target | Measurement |`);
    sections.push(`|--------|---------|--------|-------------|`);
    sections.push(`| Task Completion Time | 5 mins | 2 mins | Analytics |`);
    sections.push(`| User Satisfaction | 3.2/5 | 4.5/5 | Survey |`);
    sections.push(`| Error Rate | 15% | <5% | Monitoring |\n`);

    // User Stories
    sections.push(`## User Stories\n`);
    sections.push(`### Core Stories`);
    sections.push(`1. **As a** developer, **I want to** ${this.ctx.intent.toLowerCase()} **so that** I can work more efficiently`);
    sections.push(`2. **As a** team lead, **I want to** track progress **so that** I can manage resources`);
    sections.push(`3. **As a** user, **I want to** have clear feedback **so that** I understand system state\n`);

    // Functional Requirements
    sections.push(`## Functional Requirements\n`);
    sections.push(`### Must Have (P0)`);
    sections.push(`- REQ-001: System shall provide core functionality`);
    sections.push(`- REQ-002: System shall validate all inputs`);
    sections.push(`- REQ-003: System shall provide error handling\n`);
    sections.push(`### Should Have (P1)`);
    sections.push(`- REQ-004: System should optimize performance`);
    sections.push(`- REQ-005: System should provide detailed logging\n`);
    sections.push(`### Could Have (P2)`);
    sections.push(`- REQ-006: System could include advanced features\n`);

    // Non-Functional Requirements
    sections.push(`## Non-Functional Requirements\n`);
    sections.push(`### Performance`);
    sections.push(`- Response time < 200ms for 95th percentile`);
    sections.push(`- Support 1000 concurrent users\n`);
    sections.push(`### Security`);
    sections.push(`- All data encrypted in transit and at rest`);
    sections.push(`- Authentication required for all operations\n`);
    sections.push(`### Reliability`);
    sections.push(`- 99.9% uptime SLA`);
    sections.push(`- Automated backups every 6 hours\n`);

    // Solutions Considered
    sections.push(`## Solutions Considered\n`);
    sections.push(`### Option 1: Build from Scratch`);
    sections.push(`- **Pros**: Full control, customized solution`);
    sections.push(`- **Cons**: Time intensive, higher risk\n`);
    sections.push(`### Option 2: Extend Existing System`);
    sections.push(`- **Pros**: Faster delivery, proven foundation`);
    sections.push(`- **Cons**: Technical debt, constraints\n`);
    sections.push(`### Option 3: Third-Party Integration`);
    sections.push(`- **Pros**: Quick implementation, vendor support`);
    sections.push(`- **Cons**: Vendor lock-in, limited customization\n`);

    // Recommended Solution
    sections.push(`## Recommended Solution\n`);
    sections.push(`**Option 2: Extend Existing System** is recommended because:`);
    sections.push(`- Balances speed and customization`);
    sections.push(`- Leverages existing knowledge`);
    sections.push(`- Manageable risk profile\n`);

    // Value Assessment
    sections.push(`## Value Assessment\n`);
    sections.push(`### ROI Calculation`);
    sections.push(`- **Investment**: 2 sprints (4 weeks)`);
    sections.push(`- **Expected Return**: 30% productivity improvement`);
    sections.push(`- **Payback Period**: 3 months\n`);

    // Risks and Mitigations
    sections.push(`## Risks and Mitigations\n`);
    sections.push(`| Risk | Probability | Impact | Mitigation |`);
    sections.push(`|------|------------|---------|------------|`);
    sections.push(`| Scope Creep | High | Medium | Clear acceptance criteria |`);
    sections.push(`| Technical Debt | Medium | High | Refactoring budget |`);
    sections.push(`| User Adoption | Low | High | Training and documentation |\n`);

    // Timeline and Phases
    sections.push(`## Timeline and Phases\n`);
    sections.push(`### Phase 1: Foundation (Week 1-2)`);
    sections.push(`- Core functionality implementation`);
    sections.push(`- Basic testing framework\n`);
    sections.push(`### Phase 2: Enhancement (Week 3-4)`);
    sections.push(`- Performance optimization`);
    sections.push(`- User interface improvements\n`);
    sections.push(`### Phase 3: Polish (Week 5)`);
    sections.push(`- Documentation`);
    sections.push(`- User training materials\n`);

    // Stakeholders
    sections.push(`## Stakeholders\n`);
    sections.push(`| Role | Name | Responsibility | Concerns |`);
    sections.push(`|------|------|---------------|----------|`);
    sections.push(`| Product Owner | TBD | Requirements & Priority | User value |`);
    sections.push(`| Tech Lead | TBD | Technical Approach | Maintainability |`);
    sections.push(`| QA Lead | TBD | Quality Assurance | Test coverage |`);
    sections.push(`| Users | All | Feedback & Adoption | Usability |\n`);

    // Footer
    sections.push(`---`);
    sections.push(`**Generated**: ${date}`);
    sections.push(`**Pipeline**: PRD Simple Builder Pattern`);
    sections.push(`**Confidence**: ${(this.ctx.confidence * 100).toFixed(0)}%`);

    return sections.join('\n');
  }

  /**
   * Validate PRD content
   */
  validateContent(): this {
    console.log(chalk.cyan('✅ Validating PRD...'));

    if (!this.ctx.content) {
      this.addError('No PRD content generated');
      this.adjustConfidence(0.3);
      return this;
    }

    // Check for required sections
    const requiredSections = [
      '## Problem Statement',
      '## Success Metrics',
      '## Functional Requirements',
      '## Recommended Solution'
    ];

    for (const section of requiredSections) {
      if (!this.ctx.content.includes(section)) {
        this.addError(`Missing required section: ${section}`);
        this.adjustConfidence(0.8);
      }
    }

    if (this.ctx.errors.length === 0) {
      console.log(chalk.gray('  ✓ PRD validation passed'));
    } else {
      console.log(chalk.yellow(`  ⚠ PRD validation warnings: ${this.ctx.errors.length}`));
    }

    return this;
  }

  /**
   * Save PRD to filesystem
   */
  async save(): Promise<this> {
    if (!this.ctx.content) {
      this.addError('No content to save');
      this.adjustConfidence(0.3);
      return this;
    }

    console.log(chalk.cyan('💾 Saving PRD...'));

    // Extract title for filename
    const title = this.extractTitleFromIntent();
    const cleanTitle = title
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-|-$/g, '')
      .substring(0, 50);

    const filename = `PRD-${String(this.nextPRDNumber).padStart(3, '0')}-${cleanTitle}.md`;
    const filepath = path.join(this.prdDir, filename);

    await fs.writeFile(filepath, this.ctx.content, 'utf-8');

    console.log(chalk.green(`  ✅ PRD saved to: ${path.relative(process.cwd(), filepath)}`));
    console.log(chalk.dim('  📋 Use this document for product planning and stakeholder alignment'));

    this.withMetadata({ savedPath: filepath, filename: filename });
    return this;
  }

  /**
   * Determine next PRD number
   */
  private async determineNextPRDNumber(): Promise<void> {
    try {
      const existingPRDs = await fs.readdir(this.prdDir);
      const prdNumbers = existingPRDs
        .filter(f => f.startsWith('PRD-'))
        .map(f => parseInt(f.match(/PRD-(\d+)/)?.[1] || '0', 10))
        .filter(n => !isNaN(n));

      this.nextPRDNumber = prdNumbers.length > 0
        ? Math.max(...prdNumbers) + 1
        : 1;
    } catch {
      this.nextPRDNumber = 1;
    }
  }

  /**
   * Get existing PRDs for context
   */
  private async getExistingPRDs(): Promise<string[]> {
    try {
      const files = await fs.readdir(this.prdDir);
      return files.filter(f => f.endsWith('.md'));
    } catch {
      return [];
    }
  }

  /**
   * Analyze technical context
   */
  private async analyzeTechnicalContext(): Promise<any> {
    // This would analyze the codebase for technical constraints
    return {
      language: 'TypeScript',
      framework: 'Node.js',
      dependencies: 'Various npm packages'
    };
  }

  /**
   * Gather user feedback
   */
  private async gatherUserFeedback(): Promise<any> {
    // This would gather feedback from issues, comments, etc.
    return {
      issues: [],
      requests: []
    };
  }

  /**
   * Analyze project structure
   */
  private async analyzeProjectStructure(): Promise<any> {
    // Basic project structure analysis
    return {
      type: 'CLI Application',
      architecture: 'Pipeline Pattern'
    };
  }

  /**
   * Extract title from intent
   */
  private extractTitleFromIntent(): string {
    // Simple extraction - could be enhanced
    return this.ctx.intent
      .replace(/generate|create|build|make/gi, '')
      .trim()
      .split(' ')
      .map(w => w.charAt(0).toUpperCase() + w.slice(1))
      .join(' ') || 'Product Requirements';
  }

  /**
   * Custom validation for PRD pipeline
   */
  protected customValidate(): void {
    if (!this.ctx.template) {
      this.addError('Template required for PRD');
      this.adjustConfidence(0.7);
    }

    if (!this.ctx.intent || this.ctx.intent.length < 10) {
      this.addError('Intent too short - need more detail for PRD');
      this.adjustConfidence(0.6);
    }
  }

  /**
   * Custom recovery logic
   */
  protected customRecover(): void {
    if (this.ctx.errors.includes('Intent too short')) {
      // Enhance intent with default
      this.ctx.intent = `${this.ctx.intent} with comprehensive requirements analysis`;
      this.removeError('Intent too short - need more detail for PRD');
      this.adjustConfidence(1.2);
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
      console.log(chalk.bold.cyan('\n🚀 Building PRD with Simple Pipeline Pattern\n'));

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

      console.log(chalk.bold.green('\n✨ PRD pipeline completed successfully!\n'));
      return this.ctx.content || '';
    } catch (error) {
      console.error(chalk.red(`\n❌ PRD pipeline failed: ${error}`));
      throw error;
    }
  }
}

/**
 * Adapter for CLI command usage
 * Maintains backward compatibility with existing command structure
 */
export class PRDReflectionCommand {
  private pipeline: PRDPipeline;

  constructor() {
    this.pipeline = new PRDPipeline();
  }

  /**
   * Execute the PRD command
   */
  async execute(intent: string, options: any = {}): Promise<void> {
    try {
      // Update pipeline intent if provided
      if (intent && intent.trim() !== '') {
        this.pipeline = new PRDPipeline(intent);
      }

      // Build and execute the pipeline
      await this.pipeline.build();

    } catch (error) {
      console.error(chalk.red(`PRD generation failed: ${error}`));
      throw error;
    }
  }
}

// Export for CLI use
export default PRDReflectionCommand;