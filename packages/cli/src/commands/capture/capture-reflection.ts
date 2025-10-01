/**
 * @fileType: command
 * @status: current
 * @updated: 2025-10-01
 * @tags: [capture, reflection, pipeline, builder, context]
 * @related: [../../core/simple-pipeline-base.ts, ../capture.ts]
 * @priority: high
 * @complexity: medium
 * @dependencies: [simple-pipeline-base, fs-extra, chalk]
 */

import { SimplePipelineBase, PipelineContext } from '../../core/simple-pipeline-base.js';
import fs from 'fs-extra';
import * as path from 'path';
import chalk from 'chalk';
import { getGinkoDir } from '../../utils/helpers.js';

/**
 * Options for capture command
 */
interface CaptureOptions {
  store?: boolean;
  id?: string;
  content?: string;
  review?: boolean;
  verbose?: boolean;
  quiet?: boolean;
  quick?: boolean;
  edit?: boolean;
}

/**
 * Context module frontmatter structure
 */
interface ContextModule {
  type: 'architecture' | 'config' | 'decision' | 'pattern' | 'gotcha' | 'module';
  tags: string[];
  area: string;
  created: string;
  updated: string;
  relevance: 'critical' | 'high' | 'medium' | 'low';
  dependencies: string[];
}

/**
 * Capture pipeline using Simple Builder Pattern
 * Implements Universal Reflection Pattern for context capture
 * Follows ADR-013 for consistent pipeline architecture
 */
export class CapturePipeline extends SimplePipelineBase {
  private ginkoDir: string = '';
  private modulesDir: string = '';
  private capturesDir: string = '';
  private options: CaptureOptions = {};
  private description: string = '';
  private captureId: string = '';
  private detectedType: ContextModule['type'] = 'module';
  private extractedTags: string[] = [];
  private area: string = '';
  private filename: string = '';

  constructor(description: string, options: CaptureOptions = {}) {
    super(`Capture context about: ${description}`);
    this.description = description;
    this.options = options;
    this.withDomain('capture');
  }

  /**
   * Initialize pipeline dependencies
   */
  async initialize(): Promise<this> {
    this.ginkoDir = await getGinkoDir();
    this.modulesDir = path.join(this.ginkoDir, 'context', 'modules');
    this.capturesDir = path.join(this.ginkoDir, 'captures');

    await fs.ensureDir(this.modulesDir);
    await fs.ensureDir(this.capturesDir);

    this.captureId = `capture-${Date.now()}`;

    if (this.options.verbose) {
      console.log(chalk.dim('Initializing capture pipeline...'));
    }

    return this;
  }

  /**
   * Get domain name for this reflector
   */
  getDomain(): string {
    return 'capture';
  }

  /**
   * Load capture quality template
   */
  getQualityTemplate(): any {
    return {
      requiredSections: [
        'context',
        'technical_details',
        'code_examples',
        'impact',
        'references',
        'related_patterns'
      ],
      contextToConsider: [
        'capture_description',
        'context_type',
        'relevant_tags',
        'current_area',
        'codebase_patterns',
        'active_workstream'
      ],
      rulesAndConstraints: [
        'Explain WHY this was discovered, not just what it is',
        'Include concrete code examples from actual files',
        'Reference specific files and patterns in the project',
        'Describe implications and trade-offs',
        'Connect to related modules and patterns',
        'Keep frontmatter structure intact',
        'Ensure all AI placeholders are replaced with real content'
      ]
    };
  }

  /**
   * Load template
   */
  loadTemplate(): this {
    const template = this.getQualityTemplate();
    this.withTemplate(template);

    if (this.options.verbose) {
      console.log(chalk.dim('  ✓ Quality template loaded'));
    }

    return this;
  }

  /**
   * Gather context for capture
   */
  async gatherContext(): Promise<this> {
    if (this.options.verbose) {
      console.log(chalk.dim('Gathering context...'));
    }

    // Detect context type and extract tags
    this.detectedType = this.detectContextType(this.description);
    this.extractedTags = this.extractTags(this.description);
    this.area = await this.getCurrentArea();

    // Generate filename
    const slug = this.description
      .toLowerCase()
      .replace(/[^a-z0-9\s]/g, '')
      .split(' ')
      .slice(0, 4)
      .join('-')
      .substring(0, 30);

    this.filename = `${this.detectedType}-${slug}.md`;

    const context = {
      description: this.description,
      type: this.detectedType,
      tags: this.extractedTags,
      area: this.area,
      filename: this.filename,
      captureId: this.captureId,
      date: new Date().toISOString().split('T')[0],
      isQuick: this.options.quick || false
    };

    this.withContext(context);

    if (this.options.verbose) {
      console.log(chalk.dim(`  Type detected: ${this.detectedType}`));
      console.log(chalk.dim(`  Tags extracted: [${this.extractedTags.join(', ')}]`));
      console.log(chalk.dim(`  Area: ${this.area}`));
      console.log(chalk.dim('  ✓ Context gathered'));
    }

    return this;
  }

  /**
   * Generate prompt for AI enhancement
   */
  generatePrompt(): string {
    const ctx = this.ctx.context;

    return chalk.cyan(`
AI Enhancement Required:

Please complete this ${ctx.type} context module about: "${ctx.description}"

Instructions:
1. Replace all [AI: ...] placeholders with specific, contextual information
2. Include concrete examples from the current codebase
3. Reference actual files and patterns you've observed
4. Keep the frontmatter structure intact
5. Ensure all information is accurate and relevant

When complete, store the enhanced content by calling:
ginko capture --store --id=${ctx.captureId} --content="[your enriched content here]"

The content should be the complete markdown file including frontmatter.`);
  }

  /**
   * Generate capture content
   */
  generateContent(): this {
    const ctx = this.ctx.context;

    if (this.options.quick) {
      // Quick capture without AI enhancement
      this.ctx.content = this.generateQuickCapture(ctx);
      this.adjustConfidence(0.7); // Lower confidence for quick captures
    } else {
      // Generate template for AI enhancement
      this.ctx.content = this.generateTemplate(ctx);
      this.adjustConfidence(0.9); // High confidence - template is well-formed
    }

    // Store content in metadata for access in output
    this.withMetadata({ output: this.ctx.content });

    if (this.options.verbose) {
      console.log(chalk.dim('  ✓ Content generated'));
    }

    return this;
  }

  /**
   * Generate template with AI placeholders
   */
  private generateTemplate(ctx: any): string {
    return `---
type: ${ctx.type}
tags: [${ctx.tags.join(', ')}]
area: ${ctx.area}
created: ${ctx.date}
updated: ${ctx.date}
relevance: medium
dependencies: []
---

# ${ctx.description}

## Context
[AI: Analyze why this was discovered and what problem it solves based on the current work in ${ctx.area}]

## Technical Details
[AI: Provide specific technical explanation with concrete details from the codebase]

## Code Examples
[AI: Include before/after code examples from actual files being worked on, especially in ${ctx.area}]

## Impact
[AI: Describe implications, performance impacts, security considerations, and trade-offs]

## References
[AI: Add links to relevant documentation, tickets, or related files in the project]

## Related Patterns
[AI: Identify similar patterns or related modules in the codebase]`;
  }

  /**
   * Generate quick capture without AI placeholders
   */
  private generateQuickCapture(ctx: any): string {
    return `---
type: ${ctx.type}
tags: [${ctx.tags.join(', ')}]
area: ${ctx.area}
created: ${ctx.date}
updated: ${ctx.date}
relevance: medium
dependencies: []
---

# ${ctx.description}

## Context
*Captured during session on ${new Date().toLocaleDateString()}*

## Key Points
- ${ctx.description}

## Notes
*Add additional notes here*
`;
  }

  /**
   * Validate generated content
   */
  validateOutput(): this {
    if (!this.ctx.content) {
      this.addError('No content generated');
      this.adjustConfidence(0.3);
      return this;
    }

    const content = this.ctx.content;

    // Check for required frontmatter
    if (!content.includes('---')) {
      this.addError('Missing frontmatter');
      this.adjustConfidence(0.5);
    }

    if (!content.includes('type:')) {
      this.addError('Missing type in frontmatter');
      this.adjustConfidence(0.7);
    }

    if (!content.includes('tags:')) {
      this.addError('Missing tags in frontmatter');
      this.adjustConfidence(0.8);
    }

    // Check for content sections
    const hasHeading = content.match(/^#\s+.+$/m);
    if (!hasHeading) {
      this.addError('Missing main heading');
      this.adjustConfidence(0.8);
    }

    if (this.options.verbose && this.ctx.errors.length === 0) {
      console.log(chalk.dim('  ✓ Content validated'));
    }

    return this;
  }

  /**
   * Display or save the capture
   */
  async output(): Promise<this> {
    const ctx = this.ctx.context;

    if (this.options.quick) {
      // Save immediately for quick captures
      const modulePath = path.join(this.modulesDir, ctx.filename);
      await fs.writeFile(modulePath, this.ctx.content || '');

      // Update index
      await this.updateIndex(ctx.filename);

      if (!this.options.quiet) {
        if (this.options.verbose) {
          console.log(chalk.dim(`Created: ${ctx.filename}`));
        }
        console.log('done');
      }
    } else {
      // Store template for AI enhancement
      const tempPath = path.join(this.ginkoDir, '.temp', `${ctx.captureId}.json`);
      await fs.ensureDir(path.dirname(tempPath));
      await fs.writeJSON(tempPath, {
        filename: ctx.filename,
        template: this.ctx.content,
        description: ctx.description,
        type: ctx.type,
        tags: ctx.tags,
        area: ctx.area,
        modulesDir: this.modulesDir
      });

      // Output template and prompt
      if (this.options.review) {
        console.log(chalk.dim('📝 Review generated template:'));
        console.log(this.ctx.content);
        console.log(chalk.dim('---'));
      } else {
        console.log(this.ctx.content);
        console.log(chalk.dim('---'));
      }

      if (this.options.verbose) {
        console.log(chalk.dim(`ID: ${ctx.captureId}`));
      }

      console.log(this.generatePrompt());
    }

    return this;
  }

  /**
   * Store AI-enhanced content (phase 2)
   */
  async storeEnrichedContent(captureId: string, content: string): Promise<void> {
    const tempPath = path.join(this.ginkoDir, '.temp', `${captureId}.json`);

    if (!await fs.pathExists(tempPath)) {
      throw new Error(`Capture ${captureId} not found`);
    }

    const { filename, modulesDir } = await fs.readJSON(tempPath);
    const modulePath = path.join(modulesDir, filename);

    // Store enriched content
    await fs.writeFile(modulePath, content);

    // Update index
    const indexPath = path.join(this.ginkoDir, 'context', 'index.json');
    let index: Record<string, ContextModule> = {};

    if (await fs.pathExists(indexPath)) {
      index = await fs.readJSON(indexPath);
    }

    // Parse frontmatter from content to update index
    const frontmatter = this.parseFrontmatter(content);
    index[filename] = frontmatter;

    await fs.writeJSON(indexPath, index, { spaces: 2 });

    // Clean up temp file
    await fs.remove(tempPath);
  }

  /**
   * Update context index
   */
  private async updateIndex(filename: string): Promise<void> {
    const indexPath = path.join(this.ginkoDir, 'context', 'index.json');
    let index: Record<string, ContextModule> = {};

    if (await fs.pathExists(indexPath)) {
      index = await fs.readJSON(indexPath);
    }

    const frontmatter = this.parseFrontmatter(this.ctx.content!);
    index[filename] = frontmatter;

    await fs.writeJSON(indexPath, index, { spaces: 2 });
  }

  /**
   * Parse frontmatter from markdown content
   */
  private parseFrontmatter(content: string): ContextModule {
    const lines = content.split('\n');
    const frontmatterStart = lines.indexOf('---');
    const frontmatterEnd = lines.indexOf('---', frontmatterStart + 1);

    if (frontmatterStart === -1 || frontmatterEnd === -1) {
      throw new Error('Invalid module format: missing frontmatter');
    }

    const frontmatterLines = lines.slice(frontmatterStart + 1, frontmatterEnd);
    const frontmatter: any = {};

    for (const line of frontmatterLines) {
      const [key, ...valueParts] = line.split(':');
      if (key && valueParts.length > 0) {
        const value = valueParts.join(':').trim();

        // Parse arrays
        if (value.startsWith('[') && value.endsWith(']')) {
          frontmatter[key.trim()] = value
            .slice(1, -1)
            .split(',')
            .map(s => s.trim());
        } else {
          frontmatter[key.trim()] = value;
        }
      }
    }

    return frontmatter as ContextModule;
  }

  /**
   * Detect context type from description
   */
  private detectContextType(description: string): ContextModule['type'] {
    const lower = description.toLowerCase();

    if (lower.includes('gotcha') || lower.includes('bug') || lower.includes('issue') ||
        lower.includes('must') || lower.includes('need') || lower.includes('require')) {
      return 'gotcha';
    }
    if (lower.includes('decide') || lower.includes('chose') || lower.includes('why') ||
        lower.includes('instead of')) {
      return 'decision';
    }
    if (lower.includes('config') || lower.includes('setup') || lower.includes('setting')) {
      return 'config';
    }
    if (lower.includes('pattern') || lower.includes('approach') || lower.includes('way to')) {
      return 'pattern';
    }
    if (lower.includes('architect') || lower.includes('structure') || lower.includes('design')) {
      return 'architecture';
    }

    return 'module';
  }

  /**
   * Extract relevant tags from description
   */
  private extractTags(description: string): string[] {
    const words = description.toLowerCase().split(/\s+/);
    const tags: string[] = [];

    // Common technical keywords to extract as tags
    const keywords = [
      'auth', 'authentication', 'security', 'api', 'database', 'db', 'cache',
      'performance', 'optimization', 'testing', 'test', 'deployment', 'deploy',
      'ui', 'frontend', 'backend', 'react', 'node', 'typescript', 'javascript',
      'async', 'sync', 'hook', 'state', 'redux', 'context', 'component',
      'error', 'exception', 'validation', 'network', 'http', 'rest', 'graphql',
      'docker', 'kubernetes', 'aws', 'azure', 'gcp', 'ci', 'cd', 'git'
    ];

    // Extract matching keywords
    for (const word of words) {
      const cleanWord = word.replace(/[^a-z]/g, '');
      if (keywords.some(kw => cleanWord.includes(kw) || kw.includes(cleanWord))) {
        const matchedKeyword = keywords.find(kw => cleanWord.includes(kw) || kw.includes(cleanWord));
        if (matchedKeyword && !tags.includes(matchedKeyword)) {
          tags.push(matchedKeyword);
        }
      }
    }

    // Add type-based default tags
    const type = this.detectContextType(description);
    if (type === 'gotcha' && !tags.includes('gotcha')) {
      tags.push('gotcha');
    }
    if (type === 'pattern' && !tags.includes('pattern')) {
      tags.push('pattern');
    }

    // Ensure at least one tag
    if (tags.length === 0) {
      tags.push('general');
    }

    // Limit to 5 most relevant tags
    return tags.slice(0, 5);
  }

  /**
   * Get current working area
   */
  private async getCurrentArea(): Promise<string> {
    const cwd = process.cwd();
    const ginkoRoot = await getGinkoDir();
    const relativePath = path.relative(ginkoRoot, cwd);

    if (relativePath.startsWith('..')) {
      return '/';
    }

    return `/${relativePath}/**` || '/';
  }

  /**
   * Custom validation for capture pipeline
   */
  protected customValidate(): void {
    if (!this.description || this.description.trim() === '') {
      this.addError('Description is required');
      this.adjustConfidence(0.3);
    }

    if (!this.ctx.context) {
      this.addError('Context not gathered');
      this.adjustConfidence(0.5);
    }
  }

  /**
   * Custom recovery logic
   */
  protected customRecover(): void {
    // If no context, try to gather it again
    if (!this.ctx.context) {
      console.log(chalk.yellow('  ⚠ Attempting to recover context...'));
      // Note: This is synchronous recovery, full recovery would need async
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

    // Validate before output
    this.validateOutput();
  }

  /**
   * Main build method using fluent interface
   */
  async build(): Promise<void> {
    try {
      if (!this.options.quiet && this.options.verbose) {
        console.log(chalk.bold.cyan('\n🚀 Building capture with Reflection Pipeline\n'));
      }

      await this
        .initialize()
        .then(p => p.loadTemplate())
        .then(p => p.gatherContext())
        .then(p => {
          p.generateContent();
          p.validateOutput();
          return p;
        })
        .then(p => {
          p.validate();
          p.recover();
          return p;
        })
        .then(p => p.execute());

      // Output after pipeline execution
      await this.output();

      // Exit successfully for non-quiet mode
      if (!this.options.quiet && !this.options.quick) {
        process.exit(0);
      }

    } catch (error) {
      if (!this.options.quiet) {
        console.error(chalk.red(`\n❌ Capture pipeline failed: ${error}`));
      }
      throw error;
    }
  }
}

/**
 * Adapter for CLI command usage
 * Maintains backward compatibility with existing command structure
 */
export class CaptureReflectionCommand {
  private pipeline: CapturePipeline | null = null;

  /**
   * Execute the capture command
   */
  async execute(description: string | undefined, options: CaptureOptions = {}): Promise<void> {
    try {
      // Phase 2: Store AI-enriched content
      if (options.store && options.id) {
        const tempPipeline = new CapturePipeline('', options);
        await tempPipeline.initialize();
        await tempPipeline.storeEnrichedContent(options.id, options.content || '');

        if (!options.verbose && !options.review) {
          console.log('done');
        }
        return;
      }

      // Phase 1: Require description
      if (!description) {
        console.error(chalk.red('error: description required'));
        process.exit(1);
      }

      // Create and execute pipeline
      this.pipeline = new CapturePipeline(description, options);
      await this.pipeline.build();

    } catch (error) {
      if (!options.quiet) {
        console.error(chalk.red('error:'), error instanceof Error ? error.message : String(error));
      }
      process.exit(1);
    }
  }
}

// Export for CLI use
export default CaptureReflectionCommand;
