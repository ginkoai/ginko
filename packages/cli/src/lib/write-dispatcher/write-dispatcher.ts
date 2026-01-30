/**
 * @fileType: utility
 * @status: deprecated
 * @updated: 2026-01-30
 * @tags: [write-dispatch, adapter-pattern, multi-backend, adr-041, deprecated-by-adr-077]
 * @deprecated Replaced by ginko push/pull (ADR-077). Use auto-push utility instead.
 * @related: [adapters/graph-adapter.ts, adapters/local-adapter.ts, api/v1/graph/_cloud-graph-client.ts]
 * @priority: critical
 * @complexity: medium
 * @dependencies: []
 */

/**
 * Knowledge document types supported
 */
export type KnowledgeDocumentType =
  | 'ADR'
  | 'PRD'
  | 'Pattern'
  | 'Gotcha'
  | 'Session'
  | 'CodeFile'
  | 'ContextModule'
  | 'LogEntry';

/**
 * Knowledge document structure
 */
export interface KnowledgeDocument {
  type: KnowledgeDocumentType;
  id: string;
  title: string;
  content: string;
  data: Record<string, any>;
  metadata?: {
    tags?: string[];
    status?: string;
    category?: string;
    impact?: string;
    files?: string[];
    timestamp?: string;
    [key: string]: any;
  };
}

/**
 * Write operation result
 */
export interface WriteResult {
  source: string;
  id?: string;
  path?: string;
  error?: string;
  timestamp: string;
}

/**
 * Write adapter interface
 * All write destinations implement this interface
 */
export interface WriteAdapter {
  name: string;
  enabled(): boolean;
  write(document: KnowledgeDocument): Promise<WriteResult>;
}

/**
 * WriteDispatcher Configuration
 */
export interface WriteDispatcherConfig {
  primaryAdapter: string;
  enabledAdapters?: string[];
  dualWrite?: boolean;
  failFast?: boolean;
}

/**
 * WriteDispatcher
 *
 * Routes write operations to multiple backends using the adapter pattern.
 * Supports dual-write migration strategy and graceful fallback.
 *
 * Architecture (ADR-041):
 * - Primary adapter (graph) must succeed for write to be considered successful
 * - Secondary adapters (local) run concurrently for dual-write period
 * - Environment variables control which adapters are enabled
 * - Single source of truth: graph for reads, dispatched writes
 *
 * Usage:
 * ```typescript
 * const dispatcher = new WriteDispatcher({ primaryAdapter: 'graph' });
 * dispatcher.registerAdapter(new GraphAdapter());
 * dispatcher.registerAdapter(new LocalAdapter());
 *
 * const result = await dispatcher.dispatch({
 *   type: 'ADR',
 *   id: 'adr_042',
 *   title: 'Use JWT',
 *   content: '# ADR-042...',
 *   data: { status: 'proposed' }
 * });
 * ```
 */
export class WriteDispatcher {
  private adapters: Map<string, WriteAdapter> = new Map();
  private config: Required<WriteDispatcherConfig>;

  constructor(config: WriteDispatcherConfig) {
    this.config = {
      primaryAdapter: config.primaryAdapter,
      enabledAdapters: config.enabledAdapters || [],
      dualWrite: config.dualWrite !== undefined ? config.dualWrite : true,
      failFast: config.failFast !== undefined ? config.failFast : true,
    };
  }

  /**
   * Register a write adapter
   */
  registerAdapter(adapter: WriteAdapter): void {
    this.adapters.set(adapter.name, adapter);
  }

  /**
   * Unregister an adapter
   */
  unregisterAdapter(name: string): void {
    this.adapters.delete(name);
  }

  /**
   * Get list of registered adapters
   */
  getAdapters(): string[] {
    return Array.from(this.adapters.keys());
  }

  /**
   * Get enabled adapters based on configuration
   */
  private getEnabledAdapters(): WriteAdapter[] {
    return Array.from(this.adapters.values()).filter(adapter => {
      // Check if adapter itself is enabled
      if (!adapter.enabled()) {
        return false;
      }

      // If enabledAdapters list is specified, check if adapter is in the list
      if (this.config.enabledAdapters && this.config.enabledAdapters.length > 0) {
        return this.config.enabledAdapters.includes(adapter.name);
      }

      return true;
    });
  }

  /**
   * Dispatch write operation to all enabled adapters
   *
   * Strategy:
   * 1. Execute all enabled adapters concurrently
   * 2. Wait for primary adapter to complete
   * 3. If primary fails, throw error (fail fast)
   * 4. If primary succeeds, return its result
   * 5. Secondary adapter failures are logged but don't block
   *
   * @throws Error if primary adapter fails
   */
  async dispatch(document: KnowledgeDocument): Promise<WriteResult> {
    const enabledAdapters = this.getEnabledAdapters();

    if (enabledAdapters.length === 0) {
      throw new Error('No enabled adapters available for write dispatch');
    }

    // Find primary adapter
    const primaryAdapter = enabledAdapters.find(a => a.name === this.config.primaryAdapter);
    if (!primaryAdapter) {
      throw new Error(`Primary adapter '${this.config.primaryAdapter}' not found or not enabled`);
    }

    // Execute all adapters concurrently
    const writePromises = enabledAdapters.map(adapter =>
      adapter
        .write(document)
        .then(result => ({ adapter: adapter.name, result, success: true as const }))
        .catch(error => ({
          adapter: adapter.name,
          error: error instanceof Error ? error.message : String(error),
          success: false as const,
        }))
    );

    const results = await Promise.all(writePromises);

    // Check primary adapter result
    const primaryResult = results.find(r => r.adapter === this.config.primaryAdapter);

    if (!primaryResult) {
      throw new Error(`Primary adapter '${this.config.primaryAdapter}' not found in results`);
    }

    if (!primaryResult.success) {
      const errorMsg = 'error' in primaryResult ? primaryResult.error : 'Unknown error';
      throw new Error(`Primary adapter '${this.config.primaryAdapter}' failed: ${errorMsg}`);
    }

    // Log secondary adapter failures (non-blocking)
    const secondaryFailures = results.filter((r): r is { adapter: string; error: string; success: false } =>
      !r.success && r.adapter !== this.config.primaryAdapter
    );

    if (secondaryFailures.length > 0) {
      for (const failure of secondaryFailures) {
        console.warn(`[WriteDispatcher] Secondary adapter '${failure.adapter}' failed: ${failure.error}`);
      }
    }

    // Return primary adapter result
    return primaryResult.result;
  }

  /**
   * Validate configuration and adapters
   */
  validate(): { valid: boolean; errors: string[] } {
    const errors: string[] = [];

    // Check if primary adapter is registered
    if (!this.adapters.has(this.config.primaryAdapter)) {
      errors.push(`Primary adapter '${this.config.primaryAdapter}' is not registered`);
    }

    // Check if at least one adapter is enabled
    const enabledAdapters = this.getEnabledAdapters();
    if (enabledAdapters.length === 0) {
      errors.push('No adapters are enabled. Check environment configuration.');
    }

    // Check if primary adapter is enabled
    const primaryEnabled = enabledAdapters.some(a => a.name === this.config.primaryAdapter);
    if (!primaryEnabled && this.adapters.has(this.config.primaryAdapter)) {
      errors.push(`Primary adapter '${this.config.primaryAdapter}' is registered but not enabled`);
    }

    return {
      valid: errors.length === 0,
      errors,
    };
  }

  /**
   * Get dispatcher status
   */
  getStatus(): {
    primaryAdapter: string;
    registeredAdapters: string[];
    enabledAdapters: string[];
    dualWrite: boolean;
  } {
    const enabledAdapters = this.getEnabledAdapters();

    return {
      primaryAdapter: this.config.primaryAdapter,
      registeredAdapters: Array.from(this.adapters.keys()),
      enabledAdapters: enabledAdapters.map(a => a.name),
      dualWrite: this.config.dualWrite,
    };
  }
}

/**
 * Global dispatcher instance (singleton)
 */
let globalDispatcher: WriteDispatcher | null = null;

/**
 * Initialize global dispatcher
 */
export function initializeDispatcher(config: WriteDispatcherConfig): WriteDispatcher {
  globalDispatcher = new WriteDispatcher(config);
  return globalDispatcher;
}

/**
 * Get global dispatcher instance
 */
export function getDispatcher(): WriteDispatcher {
  if (!globalDispatcher) {
    throw new Error('WriteDispatcher not initialized. Call initializeDispatcher() first.');
  }
  return globalDispatcher;
}

/**
 * Check if dispatcher is initialized
 */
export function isDispatcherInitialized(): boolean {
  return globalDispatcher !== null;
}
