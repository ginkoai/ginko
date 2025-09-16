/**
 * @fileType: command
 * @status: current
 * @updated: 2025-09-16
 * @tags: [prd, pipeline, builder, requirements, safe-defaults]
 * @related: [../../core/simple-pipeline-base.ts, ./prd-pipeline.ts]
 * @priority: high
 * @complexity: medium
 * @dependencies: [simple-pipeline-base, fs-extra]
 */

import { SimplePipelineBase, PipelineContext } from '../../core/simple-pipeline-base.js';
import fs from 'fs-extra';
import * as path from 'path';
import chalk from 'chalk';
import { getGinkoDir } from '../../utils/helpers.js';

/**
 * PRD options following ADR-014 Safe Defaults Pattern
 */
export interface PRDOptions {
  // Opt-in enhancements
  feasibility?: boolean;  // Perform feasibility analysis
  competitors?: boolean;  // Analyze competitive landscape
  metrics?: boolean;      // Generate detailed success metrics
  dryrun?: boolean;       // Preview without saving
  strict?: boolean;       // Fail on warnings

  // Opt-out of safety checks (default: false = checks enabled)
  nodup?: boolean;        // Skip duplicate detection
  novalidate?: boolean;   // Skip validation checks
  nowarn?: boolean;       // Skip warning generation
}

/**
 * PRD Analysis Results
 */
interface PRDAnalysis {
  duplicates: Array<{ id: string; similarity: number; title: string }>;
  feasibility: {
    technical: 'low' | 'medium' | 'high';
    resource: 'low' | 'medium' | 'high';
    timeline: 'aggressive' | 'realistic' | 'conservative';
    risks: string[];
  };
  validation: {
    hasUserStories: boolean;
    hasSuccessMetrics: boolean;
    hasScope: boolean;
    hasNonGoals: boolean;
    completeness: number;
  };
  warnings: string[];
  suggestions: string[];
}

/**
 * Enhanced PRD Pipeline with Safe Defaults (ADR-014)
 *
 * Provides intelligent PRD generation with:
 * - Automatic duplicate detection (opt-out with --nodup)
 * - Completeness validation by default
 * - Feasibility checking (enhanced with --feasibility)
 * - Competitive analysis (opt-in with --competitors)
 */
export class EnhancedPRDPipeline extends SimplePipelineBase {
  private ginkoDir: string = '';
  private options: PRDOptions;
  private analysis: PRDAnalysis;

  constructor(intent: string = 'Generate PRD', options: PRDOptions = {}) {
    super(intent);
    this.withDomain('prd');

    // Apply safe defaults (ADR-014)
    this.options = {
      nodup: false,
      novalidate: false,
      nowarn: false,
      ...options
    };

    // Initialize analysis
    this.analysis = {
      duplicates: [],
      feasibility: {
        technical: 'medium',
        resource: 'medium',
        timeline: 'realistic',
        risks: []
      },
      validation: {
        hasUserStories: false,
        hasSuccessMetrics: false,
        hasScope: false,
        hasNonGoals: false,
        completeness: 0
      },
      warnings: [],
      suggestions: []
    };
  }

  /**
   * Initialize pipeline
   */
  async initialize(): Promise<this> {
    console.log(chalk.cyan('📝 Initializing enhanced PRD pipeline...'));
    this.ginkoDir = await getGinkoDir();
    this.adjustConfidence(0.9);

    if (this.options.dryrun) {
      console.log(chalk.yellow('  ⚡ DRY RUN MODE - No files will be saved'));
    }

    return this;
  }

  /**
   * Load PRD template with safe defaults considerations
   */
  async loadTemplate(): Promise<this> {
    const template = {
      requiredSections: [
        'problem_statement',
        'user_stories',
        'success_metrics',
        'scope',
        'non_goals',
        'technical_requirements',
        'timeline'
      ],
      optionalSections: [
        'competitive_analysis',
        'user_research',
        'technical_design',
        'rollout_plan',
        'monitoring_plan'
      ],
      contextToConsider: [
        'existing_prds',
        'related_adrs',
        'market_research',
        'technical_constraints',
        'team_capacity'
      ],
      rulesAndConstraints: [
        'PRDs must have clear, measurable success metrics',
        'User stories follow standard format',
        'Non-goals are as important as goals',
        'Technical feasibility must be considered',
        'Timeline should account for unknowns'
      ]
    };

    this.withTemplate(template);
    console.log(chalk.gray('  ✓ Enhanced PRD template loaded'));
    return this;
  }

  /**
   * Gather context with enhanced analysis
   */
  async gatherContext(): Promise<this> {
    console.log(chalk.cyan('🔍 Gathering enhanced PRD context...'));

    const parsedIntent = this.parsePRDIntent(this.ctx.intent);

    // Duplicate detection (default: on)
    if (!this.options.nodup) {
      console.log(chalk.gray('  → Checking for similar PRDs...'));
      this.analysis.duplicates = await this.detectDuplicates(parsedIntent);

      if (this.analysis.duplicates.length > 0) {
        const highest = this.analysis.duplicates[0];
        if (highest.similarity > 0.7) {
          this.analysis.warnings.push(
            `Similar PRD exists: ${highest.id} - "${highest.title}" (${Math.round(highest.similarity * 100)}% match)`
          );
          this.analysis.suggestions.push(
            'Consider updating existing PRD instead of creating new one'
          );
        }
      }
    }

    // Validation checks (default: on)
    if (!this.options.novalidate) {
      console.log(chalk.gray('  → Validating PRD completeness...'));
      await this.validateIntent(parsedIntent);
    }

    // Feasibility analysis (opt-in with --feasibility)
    if (this.options.feasibility) {
      console.log(chalk.gray('  → Analyzing feasibility...'));
      this.analysis.feasibility = await this.analyzeFeasibility(parsedIntent);
    }

    // Competitive analysis (opt-in with --competitors)
    let competitiveData = null;
    if (this.options.competitors) {
      console.log(chalk.gray('  → Analyzing competitive landscape...'));
      competitiveData = await this.analyzeCompetitors(parsedIntent);
    }

    // Get related documents
    const relatedDocs = await this.findRelatedDocuments(parsedIntent);

    const context = {
      parsedIntent,
      analysis: this.analysis,
      relatedPRDs: relatedDocs.prds,
      relatedADRs: relatedDocs.adrs,
      competitiveData,
      prdNumber: await this.getNextPRDNumber()
    };

    this.withContext(context);
    console.log(chalk.gray('  ✓ Enhanced context gathered'));

    // Show warnings if not suppressed
    if (!this.options.nowarn && this.analysis.warnings.length > 0) {
      console.log(chalk.yellow('\n⚠️  PRD Generation Warnings:'));
      this.analysis.warnings.forEach(w => console.log(chalk.yellow(`  • ${w}`)));
    }

    return this;
  }

  /**
   * Generate PRD content with enhanced sections
   */
  generateContent(): this {
    console.log(chalk.cyan('📝 Generating enhanced PRD...'));

    const context = this.ctx.context;
    const sections: string[] = [];

    // Header
    sections.push(`# PRD-${String(context.prdNumber).padStart(3, '0')}: ${context.parsedIntent.title}\n`);
    sections.push(`**Status**: Draft`);
    sections.push(`**Author**: AI Assistant`);
    sections.push(`**Date**: ${new Date().toISOString().split('T')[0]}`);
    sections.push(`**Analysis Mode**: ${this.getAnalysisMode()}\n`);

    // Duplicate Warning (if applicable)
    if (this.analysis.duplicates.length > 0 && !this.options.nodup) {
      sections.push(`## ⚠️ Similar PRDs Detected\n`);
      this.analysis.duplicates.slice(0, 3).forEach(dup => {
        sections.push(`- ${dup.id}: "${dup.title}" (${Math.round(dup.similarity * 100)}% similar)`);
      });
      sections.push('');
      sections.push('*Consider if this should be an update to an existing PRD instead.*\n');
    }

    // Problem Statement
    sections.push(`## 📋 Problem Statement\n`);
    sections.push(context.parsedIntent.problem || 'Define the problem this PRD addresses.');
    sections.push('');

    // User Stories
    sections.push(`## 👤 User Stories\n`);
    if (context.parsedIntent.userStories?.length > 0) {
      context.parsedIntent.userStories.forEach((story: string, i: number) => {
        sections.push(`${i + 1}. ${story}`);
      });
    } else {
      sections.push('1. **As a** user');
      sections.push('   **I want** to accomplish a goal');
      sections.push('   **So that** I receive value');
    }
    sections.push('');

    // Success Metrics
    sections.push(`## 📊 Success Metrics\n`);
    sections.push('| Metric | Target | Measurement Method |');
    sections.push('|--------|--------|-------------------|');
    sections.push('| User Adoption | 80% within 3 months | Analytics tracking |');
    sections.push('| Performance | <200ms response time | APM monitoring |');
    sections.push('| User Satisfaction | >4.5/5 rating | User surveys |');

    if (this.options.metrics) {
      sections.push('| Error Rate | <0.1% | Error tracking |');
      sections.push('| Conversion | +15% improvement | A/B testing |');
    }
    sections.push('');

    // Scope & Non-Goals
    sections.push(`## 🎯 Scope\n`);
    sections.push('### In Scope');
    sections.push('- Core functionality implementation');
    sections.push('- User interface design');
    sections.push('- API development');
    sections.push('');
    sections.push('### Out of Scope (Non-Goals)');
    sections.push('- Features explicitly not included');
    sections.push('- Future enhancements for later phases');
    sections.push('');

    // Feasibility Analysis (if enabled)
    if (this.options.feasibility) {
      sections.push(`## 🔍 Feasibility Analysis\n`);
      sections.push(`- **Technical Complexity**: ${this.analysis.feasibility.technical}`);
      sections.push(`- **Resource Requirements**: ${this.analysis.feasibility.resource}`);
      sections.push(`- **Timeline Assessment**: ${this.analysis.feasibility.timeline}`);

      if (this.analysis.feasibility.risks.length > 0) {
        sections.push('\n### Identified Risks');
        this.analysis.feasibility.risks.forEach(risk => {
          sections.push(`- ${risk}`);
        });
      }
      sections.push('');
    }

    // Competitive Analysis (if enabled)
    if (this.options.competitors && context.competitiveData) {
      sections.push(`## 🏆 Competitive Analysis\n`);
      sections.push('| Competitor | Feature | Our Advantage |');
      sections.push('|------------|---------|---------------|');
      sections.push('| Competitor A | Basic implementation | Advanced features |');
      sections.push('| Competitor B | Limited scalability | Cloud-native design |');
      sections.push('');
    }

    // Technical Requirements
    sections.push(`## 🔧 Technical Requirements\n`);
    sections.push('- **Architecture**: Describe system design');
    sections.push('- **Dependencies**: List external dependencies');
    sections.push('- **Performance**: Define performance requirements');
    sections.push('- **Security**: Specify security requirements');
    sections.push('');

    // Timeline
    sections.push(`## 📅 Timeline\n`);
    sections.push('| Phase | Duration | Deliverables |');
    sections.push('|-------|----------|-------------|');
    sections.push('| Design | 2 weeks | UI mockups, API spec |');
    sections.push('| Development | 6 weeks | Core features |');
    sections.push('| Testing | 2 weeks | QA, bug fixes |');
    sections.push('| Launch | 1 week | Deployment, monitoring |');
    sections.push('');

    // Validation Report (if not disabled)
    if (!this.options.novalidate && this.analysis.validation.completeness < 100) {
      sections.push(`## ✅ Validation Report\n`);
      sections.push(`**Completeness**: ${this.analysis.validation.completeness}%\n`);

      if (!this.analysis.validation.hasUserStories) {
        sections.push('- ⚠️ Missing detailed user stories');
      }
      if (!this.analysis.validation.hasSuccessMetrics) {
        sections.push('- ⚠️ Success metrics need quantification');
      }
      if (!this.analysis.validation.hasNonGoals) {
        sections.push('- ⚠️ Non-goals should be explicitly stated');
      }
      sections.push('');
    }

    // Warnings Summary
    if (this.analysis.warnings.length > 0 && !this.options.nowarn) {
      sections.push(`## ⚠️ Generation Warnings\n`);
      this.analysis.warnings.forEach(warning => {
        sections.push(`- ${warning}`);
      });
      sections.push('');
    }

    // Suggestions
    if (this.analysis.suggestions.length > 0) {
      sections.push(`## 💡 Suggestions\n`);
      this.analysis.suggestions.forEach(suggestion => {
        sections.push(`- ${suggestion}`);
      });
      sections.push('');
    }

    // Footer
    sections.push('---');
    sections.push(`**Generated**: ${new Date().toISOString()}`);
    sections.push(`**Pipeline**: EnhancedPRDPipeline v2.0`);
    sections.push(`**Analysis**: ${this.getAnalysisMode()}`);
    sections.push(`**Confidence**: ${Math.round(this.ctx.confidence * 100)}%`);

    this.ctx.content = sections.join('\n');
    console.log(chalk.gray('  ✓ Enhanced PRD generated'));
    return this;
  }

  /**
   * Validate content with strict mode support
   */
  validateContent(): this {
    if (!this.ctx.content) {
      this.ctx.errors.push('No PRD content generated');
      this.adjustConfidence(0.3);
      return this;
    }

    // Strict mode validation
    if (this.options.strict) {
      if (this.analysis.warnings.length > 0) {
        this.ctx.errors.push(`Strict mode: ${this.analysis.warnings.length} warnings present`);
        this.adjustConfidence(0.4);
      }

      if (this.analysis.validation.completeness < 80) {
        this.ctx.errors.push(`Strict mode: PRD only ${this.analysis.validation.completeness}% complete`);
        this.adjustConfidence(0.5);
      }

      if (this.analysis.duplicates.length > 0 && this.analysis.duplicates[0].similarity > 0.8) {
        this.ctx.errors.push('Strict mode: High similarity with existing PRD');
        this.adjustConfidence(0.3);
      }
    }

    console.log(chalk.gray('  ✓ Content validated'));
    return this;
  }

  /**
   * Save PRD (skip if dryrun)
   */
  async save(): Promise<this> {
    if (this.options.dryrun) {
      console.log(chalk.yellow('\n📋 DRY RUN - PRD not saved'));
      console.log(chalk.dim('PRD would be saved to: docs/PRD/'));
      return this;
    }

    if (!this.ctx.content) {
      console.error(chalk.red('No content to save'));
      return this;
    }

    console.log(chalk.cyan('💾 Saving PRD...'));

    const prdDir = path.join(process.cwd(), 'docs', 'PRD');
    await fs.ensureDir(prdDir);

    const prdNumber = this.ctx.context?.prdNumber || 1;
    const title = this.ctx.context?.parsedIntent?.title || 'untitled';
    const slug = title.toLowerCase().replace(/[^a-z0-9]+/g, '-');
    const filename = `PRD-${String(prdNumber).padStart(3, '0')}-${slug}.md`;
    const filepath = path.join(prdDir, filename);

    await fs.writeFile(filepath, this.ctx.content, 'utf-8');

    console.log(chalk.green(`  ✅ PRD saved to: ${path.relative(process.cwd(), filepath)}`));
    if (!this.ctx.metadata) {
      this.ctx.metadata = {};
    }
    this.ctx.metadata.savedPath = filepath;

    return this;
  }

  /**
   * Execute final actions
   */
  async execute(): Promise<PipelineContext> {
    if (!this.options.dryrun && !this.ctx.metadata?.savedPath) {
      throw new Error('PRD was not saved');
    }

    console.log(chalk.green('\n✨ Enhanced PRD pipeline completed successfully!'));
    return this.ctx;
  }

  /**
   * Main build method
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
            console.log('\n' + chalk.dim('='.repeat(60)));
            console.log(ctx.content);
            console.log(chalk.dim('='.repeat(60)) + '\n');
          }
          return ctx.metadata?.savedPath || '';
        });
    } catch (error) {
      console.error(chalk.red(`Enhanced PRD pipeline failed: ${error}`));
      throw error;
    }
  }

  // Helper methods

  private parsePRDIntent(intent: string): any {
    // Extract key information from intent
    const title = intent.split('.')[0].trim();
    const problem = intent;

    // Try to extract user stories
    const userStories: string[] = [];
    const storyPattern = /as a .+?, i want .+? so that .+?/gi;
    const matches = intent.matchAll(storyPattern);
    for (const match of matches) {
      userStories.push(match[0]);
    }

    return {
      title,
      problem,
      userStories,
      raw: intent
    };
  }

  private async detectDuplicates(parsedIntent: any): Promise<any[]> {
    const duplicates: any[] = [];
    const prdDir = path.join(process.cwd(), 'docs', 'PRD');

    if (await fs.pathExists(prdDir)) {
      const files = await fs.readdir(prdDir);

      for (const file of files) {
        if (file.endsWith('.md')) {
          const content = await fs.readFile(path.join(prdDir, file), 'utf-8');
          const similarity = this.calculateSimilarity(parsedIntent.title, content);

          if (similarity > 0.3) {
            duplicates.push({
              id: file.split('-').slice(0, 2).join('-'),
              similarity,
              title: content.match(/^#\s+(.+)$/m)?.[1] || file
            });
          }
        }
      }
    }

    return duplicates.sort((a, b) => b.similarity - a.similarity);
  }

  private calculateSimilarity(title: string, content: string): number {
    // Simplified similarity calculation
    const titleWords = title.toLowerCase().split(/\s+/);
    const contentLower = content.toLowerCase();

    let matches = 0;
    titleWords.forEach(word => {
      if (contentLower.includes(word)) matches++;
    });

    return matches / titleWords.length;
  }

  private async validateIntent(parsedIntent: any): Promise<void> {
    let score = 0;
    const maxScore = 4;

    if (parsedIntent.userStories?.length > 0) {
      this.analysis.validation.hasUserStories = true;
      score++;
    }

    if (parsedIntent.problem?.length > 50) {
      this.analysis.validation.hasScope = true;
      score++;
    }

    // Check for success metrics keywords
    if (parsedIntent.raw.match(/metric|measure|success|target|goal/i)) {
      this.analysis.validation.hasSuccessMetrics = true;
      score++;
    }

    // Check for non-goals keywords
    if (parsedIntent.raw.match(/not|exclude|out of scope|won't/i)) {
      this.analysis.validation.hasNonGoals = true;
      score++;
    }

    this.analysis.validation.completeness = Math.round((score / maxScore) * 100);

    if (this.analysis.validation.completeness < 50) {
      this.analysis.warnings.push('PRD intent lacks detail - consider adding user stories and success criteria');
      this.analysis.suggestions.push('Use format: "As a [user], I want [feature] so that [benefit]"');
    }
  }

  private async analyzeFeasibility(parsedIntent: any): Promise<any> {
    const feasibility = {
      technical: 'medium' as 'low' | 'medium' | 'high',
      resource: 'medium' as 'low' | 'medium' | 'high',
      timeline: 'realistic' as 'aggressive' | 'realistic' | 'conservative',
      risks: [] as string[]
    };

    // Analyze complexity indicators
    const complexityKeywords = ['distributed', 'real-time', 'machine learning', 'blockchain', 'scale'];
    const hasComplexity = complexityKeywords.some(kw =>
      parsedIntent.raw.toLowerCase().includes(kw)
    );

    if (hasComplexity) {
      feasibility.technical = 'high';
      feasibility.resource = 'high';
      feasibility.risks.push('High technical complexity may extend timeline');
    }

    // Check for integration requirements
    if (parsedIntent.raw.match(/integrate|api|third-party|external/i)) {
      feasibility.risks.push('External dependencies may impact delivery');
    }

    // Check for compliance/security requirements
    if (parsedIntent.raw.match(/compliance|security|privacy|gdpr|hipaa/i)) {
      feasibility.risks.push('Compliance requirements need careful consideration');
      feasibility.timeline = 'conservative';
    }

    return feasibility;
  }

  private async analyzeCompetitors(parsedIntent: any): Promise<any> {
    // Simplified competitive analysis
    return {
      competitors: [
        { name: 'Competitor A', strength: 'Market share', weakness: 'User experience' },
        { name: 'Competitor B', strength: 'Features', weakness: 'Performance' }
      ],
      differentiation: 'Focus on user experience and performance'
    };
  }

  private async findRelatedDocuments(parsedIntent: any): Promise<any> {
    const related: { prds: string[]; adrs: string[] } = { prds: [], adrs: [] };

    // Search for related PRDs
    const prdDir = path.join(process.cwd(), 'docs', 'PRD');
    if (await fs.pathExists(prdDir)) {
      const files = await fs.readdir(prdDir);
      related.prds = files.slice(0, 3); // Simplified: just return first 3
    }

    // Search for related ADRs
    const adrDir = path.join(process.cwd(), 'docs', 'adr');
    if (await fs.pathExists(adrDir)) {
      const files = await fs.readdir(adrDir);
      related.adrs = files.slice(0, 3);
    }

    return related;
  }

  private async getNextPRDNumber(): Promise<number> {
    const prdDir = path.join(process.cwd(), 'docs', 'PRD');
    if (!await fs.pathExists(prdDir)) {
      return 1;
    }

    const files = await fs.readdir(prdDir);
    const prdNumbers = files
      .filter(f => f.match(/PRD-\d+/))
      .map(f => parseInt(f.match(/PRD-(\d+)/)?.[1] || '0'))
      .filter(n => !isNaN(n));

    return prdNumbers.length > 0 ? Math.max(...prdNumbers) + 1 : 1;
  }

  private getAnalysisMode(): string {
    const modes: string[] = [];

    if (!this.options.nodup) modes.push('Duplicate Check');
    if (!this.options.novalidate) modes.push('Validation');
    if (!this.options.nowarn) modes.push('Warnings');
    if (this.options.feasibility) modes.push('Feasibility');
    if (this.options.competitors) modes.push('Competitive');
    if (this.options.strict) modes.push('Strict');
    if (this.options.dryrun) modes.push('DryRun');

    return modes.length > 0 ? modes.join(', ') : 'Standard';
  }
}

export default EnhancedPRDPipeline;