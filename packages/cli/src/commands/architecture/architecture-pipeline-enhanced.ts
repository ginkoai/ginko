/**
 * @fileType: command
 * @status: current
 * @updated: 2025-09-16
 * @tags: [architecture, adr, pipeline, builder, safe-defaults]
 * @related: [../../core/simple-pipeline-base.ts, ./architecture-pipeline.ts]
 * @priority: high
 * @complexity: medium
 * @dependencies: [simple-pipeline-base, fs-extra]
 */

import { SimplePipelineBase, PipelineContext } from '../../core/simple-pipeline-base.js';
import fs from 'fs-extra';
import * as path from 'path';
import chalk from 'chalk';
import { getGinkoDir, getProjectRoot } from '../../utils/helpers.js';

/**
 * Architecture ADR options following ADR-014 Safe Defaults Pattern
 */
export interface ArchitectureOptions {
  // Opt-in enhancements
  alternatives?: boolean;  // Deep dive into alternatives
  tradeoffs?: boolean;    // Detailed trade-off analysis
  impacts?: boolean;      // System-wide impact analysis
  dryrun?: boolean;       // Preview without saving
  strict?: boolean;       // Fail on warnings

  // Opt-out of safety checks (default: false = checks enabled)
  noconflict?: boolean;   // Skip conflict detection
  novalidate?: boolean;   // Skip validation checks
  nowarn?: boolean;       // Skip warning generation
}

/**
 * Architecture Analysis Results
 */
interface ArchitectureAnalysis {
  conflicts: Array<{
    adr: string;
    type: 'supersedes' | 'contradicts' | 'overlaps';
    description: string;
  }>;
  impacts: {
    components: string[];
    performance: 'positive' | 'neutral' | 'negative';
    security: 'improved' | 'unchanged' | 'reduced';
    complexity: 'reduced' | 'unchanged' | 'increased';
    risk: 'low' | 'medium' | 'high';
  };
  validation: {
    hasContext: boolean;
    hasDecision: boolean;
    hasAlternatives: boolean;
    hasConsequences: boolean;
    completeness: number;
  };
  warnings: string[];
  recommendations: string[];
}

/**
 * Enhanced Architecture Pipeline with Safe Defaults (ADR-014)
 *
 * Provides intelligent ADR generation with:
 * - Automatic conflict detection (opt-out with --noconflict)
 * - Architecture validation by default
 * - Impact analysis (enhanced with --impacts)
 * - Alternative evaluation (enhanced with --alternatives)
 */
export class EnhancedArchitecturePipeline extends SimplePipelineBase {
  private ginkoDir: string = '';
  private options: ArchitectureOptions;
  private analysis: ArchitectureAnalysis;

  constructor(intent: string = 'Generate ADR', options: ArchitectureOptions = {}) {
    super(intent);
    this.withDomain('architecture');

    // Apply safe defaults (ADR-014)
    this.options = {
      noconflict: false,
      novalidate: false,
      nowarn: false,
      ...options
    };

    // Initialize analysis
    this.analysis = {
      conflicts: [],
      impacts: {
        components: [],
        performance: 'neutral',
        security: 'unchanged',
        complexity: 'unchanged',
        risk: 'medium'
      },
      validation: {
        hasContext: false,
        hasDecision: false,
        hasAlternatives: false,
        hasConsequences: false,
        completeness: 0
      },
      warnings: [],
      recommendations: []
    };
  }

  /**
   * Initialize pipeline
   */
  async initialize(): Promise<this> {
    console.log(chalk.cyan('🏗️  Initializing enhanced architecture pipeline...'));
    this.ginkoDir = await getGinkoDir();
    this.adjustConfidence(0.95); // High confidence for architecture decisions

    if (this.options.dryrun) {
      console.log(chalk.yellow('  ⚡ DRY RUN MODE - No files will be saved'));
    }

    return this;
  }

  /**
   * Load ADR template
   */
  async loadTemplate(): Promise<this> {
    const template = {
      requiredSections: [
        'title',
        'status',
        'context',
        'decision',
        'consequences',
        'alternatives_considered'
      ],
      optionalSections: [
        'trade_offs',
        'implementation_notes',
        'references',
        'review_notes'
      ],
      contextToConsider: [
        'existing_architecture',
        'related_adrs',
        'technical_constraints',
        'non_functional_requirements',
        'team_expertise'
      ],
      rulesAndConstraints: [
        'ADRs must be immutable once accepted',
        'Decisions should be reversible when possible',
        'Consider long-term maintainability',
        'Document why alternatives were rejected',
        'Include both positive and negative consequences'
      ]
    };

    this.withTemplate(template);
    console.log(chalk.gray('  ✓ Enhanced ADR template loaded'));
    return this;
  }

  /**
   * Gather context with enhanced analysis
   */
  async gatherContext(): Promise<this> {
    console.log(chalk.cyan('🔍 Gathering enhanced architecture context...'));

    const parsedIntent = this.parseArchitectureIntent(this.ctx.intent);

    // Conflict detection (default: on)
    if (!this.options.noconflict) {
      console.log(chalk.gray('  → Checking for conflicting ADRs...'));
      this.analysis.conflicts = await this.detectConflicts(parsedIntent);

      if (this.analysis.conflicts.length > 0) {
        this.analysis.conflicts.forEach(conflict => {
          if (conflict.type === 'contradicts') {
            this.analysis.warnings.push(
              `Contradicts ${conflict.adr}: ${conflict.description}`
            );
          } else if (conflict.type === 'supersedes') {
            this.analysis.recommendations.push(
              `Consider marking ${conflict.adr} as superseded by this decision`
            );
          }
        });
      }
    }

    // Validation checks (default: on)
    if (!this.options.novalidate) {
      console.log(chalk.gray('  → Validating architecture decision...'));
      await this.validateDecision(parsedIntent);
    }

    // Impact analysis (opt-in with --impacts)
    if (this.options.impacts) {
      console.log(chalk.gray('  → Analyzing system-wide impacts...'));
      this.analysis.impacts = await this.analyzeImpacts(parsedIntent);
    }

    // Alternative analysis (opt-in with --alternatives)
    let alternatives = null;
    if (this.options.alternatives) {
      console.log(chalk.gray('  → Evaluating alternatives in depth...'));
      alternatives = await this.evaluateAlternatives(parsedIntent);
    }

    // Get related ADRs
    const relatedADRs = await this.findRelatedADRs(parsedIntent);

    const context = {
      parsedIntent,
      analysis: this.analysis,
      relatedADRs,
      alternatives,
      adrNumber: await this.getNextADRNumber()
    };

    this.withContext(context);
    console.log(chalk.gray('  ✓ Enhanced context gathered'));

    // Show warnings if not suppressed
    if (!this.options.nowarn && this.analysis.warnings.length > 0) {
      console.log(chalk.yellow('\n⚠️  Architecture Decision Warnings:'));
      this.analysis.warnings.forEach(w => console.log(chalk.yellow(`  • ${w}`)));
    }

    return this;
  }

  /**
   * Generate ADR content
   */
  generateContent(): this {
    console.log(chalk.cyan('📝 Generating enhanced ADR...'));

    const context = this.ctx.context;
    const sections: string[] = [];

    // Header
    const adrNumber = String(context.adrNumber).padStart(3, '0');
    sections.push(`# ADR-${adrNumber}: ${context.parsedIntent.title}\n`);
    sections.push(`**Status**: Proposed`);
    sections.push(`**Date**: ${new Date().toISOString().split('T')[0]}`);
    sections.push(`**Deciders**: Development Team`);
    sections.push(`**Category**: ${context.parsedIntent.category || 'Architecture'}`);
    sections.push(`**Analysis Mode**: ${this.getAnalysisMode()}\n`);

    // Conflict Warning (if applicable)
    if (this.analysis.conflicts.length > 0 && !this.options.noconflict) {
      sections.push(`## ⚠️ Related ADRs\n`);
      this.analysis.conflicts.forEach(conflict => {
        const icon = conflict.type === 'contradicts' ? '❌' :
                     conflict.type === 'supersedes' ? '🔄' : '🔗';
        sections.push(`- ${icon} ${conflict.adr}: ${conflict.description}`);
      });
      sections.push('');
    }

    // Context
    sections.push(`## Context\n`);
    sections.push(context.parsedIntent.context || 'Describe the architectural issue or decision trigger.');
    sections.push('');

    // Problem
    sections.push(`### Problem Statement\n`);
    sections.push(context.parsedIntent.problem || 'What specific problem are we solving?');
    sections.push('');

    // Constraints
    sections.push(`### Constraints\n`);
    sections.push('- Technical constraints');
    sections.push('- Time constraints');
    sections.push('- Resource constraints');
    sections.push('');

    // Decision
    sections.push(`## Decision\n`);
    sections.push(context.parsedIntent.decision || 'We will implement [specific solution].');
    sections.push('');

    // Rationale
    sections.push(`### Rationale\n`);
    sections.push('The key reasons for this decision:');
    sections.push('1. Primary benefit');
    sections.push('2. Alignment with goals');
    sections.push('3. Technical advantages');
    sections.push('');

    // Alternatives Considered
    sections.push(`## Alternatives Considered\n`);

    if (context.alternatives && this.options.alternatives) {
      // Detailed alternatives from analysis
      context.alternatives.forEach((alt: any) => {
        sections.push(`### ${alt.name}`);
        sections.push(`**Pros**: ${alt.pros.join(', ')}`);
        sections.push(`**Cons**: ${alt.cons.join(', ')}`);
        sections.push(`**Rejected because**: ${alt.rejectionReason}\n`);
      });
    } else {
      // Basic alternatives
      sections.push('### Alternative 1: Do Nothing');
      sections.push('- **Pros**: No change required');
      sections.push('- **Cons**: Problem persists');
      sections.push('');
      sections.push('### Alternative 2: Different Approach');
      sections.push('- **Pros**: May be simpler');
      sections.push('- **Cons**: Does not fully address the problem');
    }
    sections.push('');

    // Consequences
    sections.push(`## Consequences\n`);
    sections.push('### Positive');
    sections.push('- Improved system quality');
    sections.push('- Better maintainability');
    sections.push('- Clear architecture direction');
    sections.push('');
    sections.push('### Negative');
    sections.push('- Implementation effort required');
    sections.push('- Learning curve for team');
    sections.push('- Potential migration costs');
    sections.push('');
    sections.push('### Neutral');
    sections.push('- Changes to development workflow');
    sections.push('- New patterns to follow');
    sections.push('');

    // Impact Analysis (if enabled)
    if (this.options.impacts) {
      sections.push(`## 🎯 Impact Analysis\n`);
      sections.push(`- **Affected Components**: ${this.analysis.impacts.components.join(', ') || 'TBD'}`);
      sections.push(`- **Performance Impact**: ${this.analysis.impacts.performance}`);
      sections.push(`- **Security Impact**: ${this.analysis.impacts.security}`);
      sections.push(`- **Complexity Impact**: ${this.analysis.impacts.complexity}`);
      sections.push(`- **Risk Level**: ${this.analysis.impacts.risk}`);
      sections.push('');
    }

    // Trade-offs (if enabled)
    if (this.options.tradeoffs) {
      sections.push(`## ⚖️ Trade-offs\n`);
      sections.push('| Gain | Loss |');
      sections.push('|------|------|');
      sections.push('| Improved maintainability | Initial development time |');
      sections.push('| Better performance | Increased complexity |');
      sections.push('| Standardization | Flexibility |');
      sections.push('');
    }

    // Implementation Notes
    sections.push(`## Implementation Notes\n`);
    sections.push('- Migration strategy required');
    sections.push('- Documentation updates needed');
    sections.push('- Team training considerations');
    sections.push('');

    // Validation Report (if not disabled)
    if (!this.options.novalidate && this.analysis.validation.completeness < 100) {
      sections.push(`## ✅ Validation Report\n`);
      sections.push(`**Completeness**: ${this.analysis.validation.completeness}%\n`);

      if (!this.analysis.validation.hasContext) {
        sections.push('- ⚠️ Context needs more detail');
      }
      if (!this.analysis.validation.hasAlternatives) {
        sections.push('- ⚠️ Consider more alternatives');
      }
      if (!this.analysis.validation.hasConsequences) {
        sections.push('- ⚠️ Document both positive and negative consequences');
      }
      sections.push('');
    }

    // Warnings Summary
    if (this.analysis.warnings.length > 0 && !this.options.nowarn) {
      sections.push(`## ⚠️ Architecture Warnings\n`);
      this.analysis.warnings.forEach(warning => {
        sections.push(`- ${warning}`);
      });
      sections.push('');
    }

    // Recommendations
    if (this.analysis.recommendations.length > 0) {
      sections.push(`## 💡 Recommendations\n`);
      this.analysis.recommendations.forEach(rec => {
        sections.push(`- ${rec}`);
      });
      sections.push('');
    }

    // References
    sections.push(`## References\n`);
    if (context.relatedADRs?.length > 0) {
      sections.push('### Related ADRs');
      context.relatedADRs.forEach((adr: string) => {
        sections.push(`- ${adr}`);
      });
      sections.push('');
    }
    sections.push('- [Architecture Decision Records](https://adr.github.io/)');
    sections.push('- Project documentation');
    sections.push('');

    // Footer
    sections.push('---');
    sections.push(`**Generated**: ${new Date().toISOString()}`);
    sections.push(`**Pipeline**: EnhancedArchitecturePipeline v2.0`);
    sections.push(`**Analysis**: ${this.getAnalysisMode()}`);
    sections.push(`**Confidence**: ${Math.round(this.ctx.confidence * 100)}%`);

    this.ctx.content = sections.join('\n');
    console.log(chalk.gray('  ✓ Enhanced ADR generated'));
    return this;
  }

  /**
   * Validate content with strict mode
   */
  validateContent(): this {
    if (!this.ctx.content) {
      this.ctx.errors.push('No ADR content generated');
      this.adjustConfidence(0.3);
      return this;
    }

    // Strict mode validation
    if (this.options.strict) {
      if (this.analysis.warnings.length > 0) {
        this.ctx.errors.push(`Strict mode: ${this.analysis.warnings.length} warnings present`);
        this.adjustConfidence(0.4);
      }

      if (this.analysis.conflicts.some(c => c.type === 'contradicts')) {
        this.ctx.errors.push('Strict mode: Contradicting ADRs detected');
        this.adjustConfidence(0.3);
      }

      if (this.analysis.validation.completeness < 80) {
        this.ctx.errors.push(`Strict mode: ADR only ${this.analysis.validation.completeness}% complete`);
        this.adjustConfidence(0.5);
      }
    }

    console.log(chalk.gray('  ✓ Content validated'));
    return this;
  }

  /**
   * Save ADR (skip if dryrun)
   */
  async save(): Promise<this> {
    if (this.options.dryrun) {
      console.log(chalk.yellow('\n📋 DRY RUN - ADR not saved'));
      console.log(chalk.dim('ADR would be saved to: docs/adr/'));
      return this;
    }

    if (!this.ctx.content) {
      console.error(chalk.red('No content to save'));
      return this;
    }

    console.log(chalk.cyan('💾 Saving ADR...'));

    const projectRoot = await getProjectRoot();
    const adrDir = path.join(projectRoot, 'docs', 'adr');
    await fs.ensureDir(adrDir);

    const adrNumber = this.ctx.context?.adrNumber || 1;
    const title = this.ctx.context?.parsedIntent?.title || 'untitled';
    const slug = title.toLowerCase().replace(/[^a-z0-9]+/g, '-');
    const filename = `ADR-${String(adrNumber).padStart(3, '0')}-${slug}.md`;
    const filepath = path.join(adrDir, filename);

    await fs.writeFile(filepath, this.ctx.content, 'utf-8');

    console.log(chalk.green(`  ✅ ADR saved to: ${path.relative(projectRoot, filepath)}`));
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
      throw new Error('ADR was not saved');
    }

    console.log(chalk.green('\n✨ Enhanced architecture pipeline completed successfully!'));
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
      console.error(chalk.red(`Enhanced architecture pipeline failed: ${error}`));
      throw error;
    }
  }

  // Helper methods

  private parseArchitectureIntent(intent: string): any {
    const title = intent.split('.')[0].split(':')[0].trim();
    const context = intent;

    // Try to extract decision
    let decision = '';
    if (intent.includes('will') || intent.includes('should')) {
      decision = intent.split(/will|should/)[1]?.trim() || '';
    }

    // Detect category
    let category = 'Architecture';
    if (intent.match(/database|data|storage/i)) category = 'Data';
    if (intent.match(/api|service|microservice/i)) category = 'Services';
    if (intent.match(/security|auth|encryption/i)) category = 'Security';
    if (intent.match(/performance|cache|optimization/i)) category = 'Performance';

    return {
      title,
      context,
      decision,
      category,
      problem: intent,
      raw: intent
    };
  }

  private async detectConflicts(parsedIntent: any): Promise<any[]> {
    const conflicts: any[] = [];
    const projectRoot = await getProjectRoot();
    const adrDir = path.join(projectRoot, 'docs', 'adr');

    if (await fs.pathExists(adrDir)) {
      const files = await fs.readdir(adrDir);

      for (const file of files) {
        if (file.endsWith('.md') && file !== 'README.md') {
          const content = await fs.readFile(path.join(adrDir, file), 'utf-8');

          // Check for topic overlap
          const overlap = this.checkTopicOverlap(parsedIntent, content);
          if (overlap.score > 0.3) {
            conflicts.push({
              adr: file.split('-').slice(0, 2).join('-'),
              type: overlap.type,
              description: overlap.description
            });
          }
        }
      }
    }

    return conflicts;
  }

  private checkTopicOverlap(parsedIntent: any, content: string): any {
    // Extract key terms from intent
    const intentTerms = parsedIntent.raw.toLowerCase().split(/\s+/);
    const contentLower = content.toLowerCase();

    let matchCount = 0;
    intentTerms.forEach((term: string) => {
      if (term.length > 4 && contentLower.includes(term)) {
        matchCount++;
      }
    });

    const score = matchCount / intentTerms.length;

    // Determine conflict type
    let type: 'supersedes' | 'contradicts' | 'overlaps' = 'overlaps';
    let description = 'Related architecture decision';

    if (content.includes('superseded') || content.includes('deprecated')) {
      type = 'supersedes';
      description = 'This decision may supersede the existing one';
    } else if (score > 0.6) {
      type = 'contradicts';
      description = 'Potentially conflicting architecture decision';
    }

    return { score, type, description };
  }

  private async validateDecision(parsedIntent: any): Promise<void> {
    let score = 0;
    const maxScore = 4;

    if (parsedIntent.context?.length > 50) {
      this.analysis.validation.hasContext = true;
      score++;
    } else {
      this.analysis.warnings.push('Context section needs more detail');
    }

    if (parsedIntent.decision?.length > 20) {
      this.analysis.validation.hasDecision = true;
      score++;
    } else {
      this.analysis.warnings.push('Decision statement should be more explicit');
    }

    // Check for alternatives mentioned
    if (parsedIntent.raw.match(/alternative|option|instead|versus|vs/i)) {
      this.analysis.validation.hasAlternatives = true;
      score++;
    } else {
      this.analysis.recommendations.push('Consider documenting alternative approaches');
    }

    // Check for consequences mentioned
    if (parsedIntent.raw.match(/consequence|result|impact|effect/i)) {
      this.analysis.validation.hasConsequences = true;
      score++;
    }

    this.analysis.validation.completeness = Math.round((score / maxScore) * 100);
  }

  private async analyzeImpacts(parsedIntent: any): Promise<any> {
    const impacts = {
      components: [] as string[],
      performance: 'neutral' as 'positive' | 'neutral' | 'negative',
      security: 'unchanged' as 'improved' | 'unchanged' | 'reduced',
      complexity: 'unchanged' as 'reduced' | 'unchanged' | 'increased',
      risk: 'medium' as 'low' | 'medium' | 'high'
    };

    // Detect affected components
    if (parsedIntent.raw.match(/api|service/i)) {
      impacts.components.push('API Layer');
    }
    if (parsedIntent.raw.match(/database|data|storage/i)) {
      impacts.components.push('Data Layer');
    }
    if (parsedIntent.raw.match(/ui|frontend|component/i)) {
      impacts.components.push('UI Layer');
    }

    // Analyze performance impact
    if (parsedIntent.raw.match(/cache|optimize|performance/i)) {
      impacts.performance = 'positive';
    } else if (parsedIntent.raw.match(/additional|extra|more/i)) {
      impacts.performance = 'negative';
    }

    // Analyze security impact
    if (parsedIntent.raw.match(/security|encryption|auth/i)) {
      impacts.security = 'improved';
    }

    // Analyze complexity
    if (parsedIntent.raw.match(/simplif|streamline|reduce/i)) {
      impacts.complexity = 'reduced';
    } else if (parsedIntent.raw.match(/additional|complex|distributed/i)) {
      impacts.complexity = 'increased';
      impacts.risk = 'high';
    }

    return impacts;
  }

  private async evaluateAlternatives(parsedIntent: any): Promise<any[]> {
    // Generate common alternatives based on the decision type
    const alternatives: any[] = [];

    // Always include "do nothing" option
    alternatives.push({
      name: 'Maintain Status Quo',
      pros: ['No implementation effort', 'No risk of breaking changes'],
      cons: ['Problem remains unsolved', 'Technical debt accumulates'],
      rejectionReason: 'Does not address the core problem'
    });

    // Add context-specific alternatives
    if (parsedIntent.category === 'Data') {
      alternatives.push({
        name: 'NoSQL Solution',
        pros: ['Flexible schema', 'Better scalability'],
        cons: ['Eventual consistency', 'Learning curve'],
        rejectionReason: 'Team lacks NoSQL expertise'
      });
    }

    if (parsedIntent.category === 'Services') {
      alternatives.push({
        name: 'Monolithic Approach',
        pros: ['Simpler deployment', 'Easier debugging'],
        cons: ['Scaling limitations', 'Deployment coupling'],
        rejectionReason: 'Does not align with microservices strategy'
      });
    }

    return alternatives;
  }

  private async findRelatedADRs(parsedIntent: any): Promise<string[]> {
    const related: string[] = [];
    const projectRoot = await getProjectRoot();
    const adrDir = path.join(projectRoot, 'docs', 'adr');

    if (await fs.pathExists(adrDir)) {
      const files = await fs.readdir(adrDir);
      // Return ADRs that might be related (simplified)
      return files
        .filter(f => f.endsWith('.md') && f !== 'README.md')
        .slice(0, 5);
    }

    return related;
  }

  private async getNextADRNumber(): Promise<number> {
    const projectRoot = await getProjectRoot();
    const adrDir = path.join(projectRoot, 'docs', 'adr');
    if (!await fs.pathExists(adrDir)) {
      return 1;
    }

    const files = await fs.readdir(adrDir);
    const adrNumbers = files
      .filter(f => f.match(/ADR-\d+/))
      .map(f => parseInt(f.match(/ADR-(\d+)/)?.[1] || '0'))
      .filter(n => !isNaN(n));

    return adrNumbers.length > 0 ? Math.max(...adrNumbers) + 1 : 1;
  }

  private getAnalysisMode(): string {
    const modes: string[] = [];

    if (!this.options.noconflict) modes.push('Conflict Check');
    if (!this.options.novalidate) modes.push('Validation');
    if (!this.options.nowarn) modes.push('Warnings');
    if (this.options.impacts) modes.push('Impact Analysis');
    if (this.options.alternatives) modes.push('Alternatives');
    if (this.options.tradeoffs) modes.push('Trade-offs');
    if (this.options.strict) modes.push('Strict');
    if (this.options.dryrun) modes.push('DryRun');

    return modes.length > 0 ? modes.join(', ') : 'Standard';
  }
}

export default EnhancedArchitecturePipeline;