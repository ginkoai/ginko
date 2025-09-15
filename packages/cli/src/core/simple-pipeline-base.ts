/**
 * @fileType: utility
 * @status: current
 * @updated: 2025-09-15
 * @tags: [pipeline, builder, pattern, core, architecture]
 * @related: [simple-pipeline.ts, ../commands/handoff/handoff-reflection.ts]
 * @priority: critical
 * @complexity: medium
 * @dependencies: []
 */

/**
 * Simple Builder Pattern for Pipeline Architecture
 * Implements ADR-013 for consistent, extensible pipeline processing
 */

export interface PipelineContext {
  intent: string;
  domain?: string;
  template?: any;
  context?: any;
  content?: string;
  errors: string[];
  confidence: number;
  metadata?: Record<string, any>;
}

/**
 * Base class for all pipeline implementations
 * Provides fluent interface with confidence tracking and error recovery
 */
export abstract class SimplePipelineBase {
  protected ctx: PipelineContext;

  constructor(intent: string) {
    this.ctx = {
      intent,
      errors: [],
      confidence: 1.0,
      metadata: {}
    };
  }

  /**
   * Set the domain for this pipeline
   */
  withDomain(domain: string): this {
    this.ctx.domain = domain;
    console.log(`📁 Domain: ${domain}`);
    return this;
  }

  /**
   * Add template data
   */
  withTemplate(template: any): this {
    this.ctx.template = template;
    return this;
  }

  /**
   * Add context data
   */
  withContext(context: any): this {
    this.ctx.context = context;
    return this;
  }

  /**
   * Add metadata
   */
  withMetadata(metadata: Record<string, any>): this {
    this.ctx.metadata = { ...this.ctx.metadata, ...metadata };
    return this;
  }

  /**
   * Validate the pipeline state
   */
  validate(): this {
    // Basic validation - can be overridden
    if (!this.ctx.domain) {
      this.addError('Domain is required');
      this.ctx.confidence *= 0.5;
    }

    if (!this.ctx.intent || this.ctx.intent.trim() === '') {
      this.addError('Intent cannot be empty');
      this.ctx.confidence *= 0.3;
    }

    // Call custom validation if available
    this.customValidate();

    return this;
  }

  /**
   * Attempt to recover from errors
   */
  recover(): this {
    if (this.ctx.errors.length === 0) {
      return this;
    }

    // Attempt basic recovery
    if (!this.ctx.domain && this.ctx.intent) {
      // Try to infer domain from intent
      if (this.ctx.intent.toLowerCase().includes('handoff')) {
        this.ctx.domain = 'handoff';
        this.ctx.confidence = Math.min(this.ctx.confidence * 1.5, 0.8);
        this.removeError('Domain is required');
      } else if (this.ctx.intent.toLowerCase().includes('start')) {
        this.ctx.domain = 'start';
        this.ctx.confidence = Math.min(this.ctx.confidence * 1.5, 0.8);
        this.removeError('Domain is required');
      }
    }

    // Call custom recovery if available
    this.customRecover();

    return this;
  }

  /**
   * Execute the pipeline
   */
  async execute(): Promise<PipelineContext> {
    // Check confidence threshold
    if (this.ctx.confidence < 0.3) {
      throw new Error(`Pipeline failed with low confidence (${this.ctx.confidence}): ${this.ctx.errors.join(', ')}`);
    }

    // Execute custom logic
    await this.customExecute();

    return this.ctx;
  }

  /**
   * Helper: Add an error
   */
  protected addError(error: string): void {
    if (!this.ctx.errors.includes(error)) {
      this.ctx.errors.push(error);
    }
  }

  /**
   * Helper: Remove an error
   */
  protected removeError(error: string): void {
    this.ctx.errors = this.ctx.errors.filter(e => e !== error);
  }

  /**
   * Helper: Adjust confidence
   */
  protected adjustConfidence(factor: number): void {
    this.ctx.confidence = Math.max(0, Math.min(1, this.ctx.confidence * factor));
  }

  /**
   * Hook for custom validation logic
   * Override in subclasses
   */
  protected customValidate(): void {
    // Override in subclasses
  }

  /**
   * Hook for custom recovery logic
   * Override in subclasses
   */
  protected customRecover(): void {
    // Override in subclasses
  }

  /**
   * Hook for custom execution logic
   * Override in subclasses
   */
  protected async customExecute(): Promise<void> {
    // Override in subclasses
  }

  /**
   * Get the current confidence level
   */
  getConfidence(): number {
    return this.ctx.confidence;
  }

  /**
   * Get current errors
   */
  getErrors(): string[] {
    return [...this.ctx.errors];
  }

  /**
   * Check if pipeline is valid
   */
  isValid(): boolean {
    return this.ctx.errors.length === 0 && this.ctx.confidence >= 0.3;
  }
}

/**
 * Example concrete implementation for handoff domain
 */
export class HandoffPipeline extends SimplePipelineBase {
  constructor(intent: string) {
    super(intent);
    this.withDomain('handoff');
  }

  /**
   * Gather context specific to handoff
   */
  gatherContext(): this {
    // Implementation would go here
    this.ctx.context = {
      ...this.ctx.context,
      gathered: true,
      timestamp: Date.now()
    };
    return this;
  }

  /**
   * Detect workstream from git activity
   */
  detectWorkstream(): this {
    // Implementation would go here
    this.ctx.metadata = {
      ...this.ctx.metadata,
      workstream: 'detected'
    };
    return this;
  }

  /**
   * Generate handoff content
   */
  generateContent(): this {
    // Implementation would go here
    this.ctx.content = 'Generated handoff content';
    this.ctx.confidence = 0.9; // High confidence after generation
    return this;
  }

  /**
   * Custom validation for handoff
   */
  protected customValidate(): void {
    if (!this.ctx.template) {
      this.addError('Template required for handoff');
      this.adjustConfidence(0.7);
    }
  }

  /**
   * Custom execution for handoff
   */
  protected async customExecute(): Promise<void> {
    // Ensure we have content
    if (!this.ctx.content) {
      this.generateContent();
    }
  }

  /**
   * Fluent build method for handoff
   */
  async build(): Promise<string> {
    await this
      .gatherContext()
      .detectWorkstream()
      .generateContent()
      .validate()
      .recover()
      .execute();

    return this.ctx.content || '';
  }
}