/**
 * @fileType: utility
 * @status: current
 * @updated: 2025-10-22
 * @tags: [context-loading, progressive, strategic, performance, adr-037, task-011]
 * @related: [config-loader.ts, reference-parser.ts, start-reflection.ts]
 * @priority: high
 * @complexity: high
 * @dependencies: [fs-extra, path, reference-parser, config-loader]
 */

/**
 * Progressive Context Loader (TASK-011)
 *
 * Implements strategic priority-ordered context loading that follows reference chains
 * to achieve 80% of needed context from 3-5 core documents instead of 50+ files.
 *
 * Goals:
 * - Load context in <1 second
 * - Achieve 80% context from ≤5 documents
 * - Reduce token usage by 70% vs full-scan approach
 * - Follow reference chains with depth limit
 * - Work mode filtering for documentation depth
 *
 * Based on PRD-009, ADR-037, and TASK-011
 */

import fs from 'fs-extra';
import path from 'path';
import {
  extractReferences,
  resolveReference,
  getReferencedContent,
  Reference,
  ResolvedReference,
  ReferenceType
} from './reference-parser.js';
import {
  loadProjectConfig,
  loadLocalConfig,
  resolveProjectPath
} from './config-loader.js';
import { GinkoConfig, WorkMode } from '../types/config.js';

/**
 * Loaded document with metadata
 */
export interface LoadedDocument {
  path: string;
  relativePath: string;
  content: string;
  type: string;
  tokens: number;  // Estimated token count
  loadedAt: number;
  referencedBy?: string[];  // What documents reference this
}

/**
 * Strategic context with efficiency metrics
 */
export interface StrategyContext {
  documents: Map<string, LoadedDocument>;
  references: Map<string, ResolvedReference>;
  metrics: ContextEfficiencyMetrics;
  loadOrder: string[];
  workMode: WorkMode;
}

/**
 * Context efficiency metrics
 */
export interface ContextEfficiencyMetrics {
  documentsLoaded: number;
  totalTokens: number;
  bootstrapTimeMs: number;
  cacheHits: number;
  referenceDepth: number;
  tokenReductionPercent: number;  // vs full-scan baseline
}

/**
 * Priority loading options
 */
export interface LoadingOptions {
  workMode?: WorkMode;
  maxDepth?: number;
  followReferences?: boolean;
  sessionDir?: string;
  userSlug?: string;
}

/**
 * Context Loader - Strategic progressive loading
 */
export class ContextLoader {
  private loaded = new Map<string, LoadedDocument>();
  private visited = new Set<string>();  // Circular reference detection
  private config: GinkoConfig | null = null;
  private startTime: number = 0;
  private cacheHits: number = 0;
  private maxReferenceDepth: number = 0;

  constructor() {
    this.startTime = Date.now();
  }

  /**
   * Load context strategically with priority ordering
   * Priority: session log → sprint → references → modules
   *
   * @param options - Loading options
   * @returns StrategyContext with loaded documents and metrics
   */
  async loadContextStrategic(options: LoadingOptions = {}): Promise<StrategyContext> {
    this.startTime = Date.now();
    const config = await loadProjectConfig();
    const localConfig = await loadLocalConfig();
    this.config = config;

    const workMode = options.workMode || config.workMode.default;
    const maxDepth = options.maxDepth ?? config.contextLoading.maxDepth;
    const followRefs = options.followReferences ?? config.contextLoading.followReferences;

    const references = new Map<string, ResolvedReference>();
    const loadOrder: string[] = [];

    // 1. Load session log (short-term memory)
    const sessionLog = await this.loadSessionContext(
      options.sessionDir || path.join(localConfig.projectRoot, '.ginko/sessions', localConfig.userSlug)
    );
    if (sessionLog) {
      loadOrder.push('session-log');
    }

    // 2. Load current sprint (long-term bootstrap)
    const sprint = await this.loadSprintContext();
    if (sprint) {
      loadOrder.push('current-sprint');
    }

    // 3. Extract references from loaded docs
    if (followRefs) {
      const combinedContent = [
        sessionLog?.content || '',
        sprint?.content || ''
      ].join('\n');

      const extractedRefs = extractReferences(combinedContent);

      // 4. Follow references with depth limit and work mode filtering
      const filteredRefs = this.filterByWorkMode(extractedRefs, workMode);
      await this.followReferences(filteredRefs, maxDepth, references, loadOrder);
    }

    // Calculate metrics
    const metrics = this.calculateMetrics();

    return {
      documents: this.loaded,
      references,
      metrics,
      loadOrder,
      workMode
    };
  }

  /**
   * Load session log from sessions directory
   */
  async loadSessionContext(sessionDir: string): Promise<LoadedDocument | null> {
    const sessionLogPath = path.join(sessionDir, 'current-session-log.md');

    if (!(await fs.pathExists(sessionLogPath))) {
      return null;
    }

    return this.loadDocument(sessionLogPath, 'session-log');
  }

  /**
   * Load current sprint document
   */
  async loadSprintContext(): Promise<LoadedDocument | null> {
    try {
      const sprintPath = await resolveProjectPath('currentSprint');

      if (!(await fs.pathExists(sprintPath))) {
        return null;
      }

      return this.loadDocument(sprintPath, 'sprint');
    } catch {
      return null;
    }
  }

  /**
   * Follow reference chains recursively with depth limit
   */
  private async followReferences(
    refs: Reference[],
    maxDepth: number,
    referencesMap: Map<string, ResolvedReference>,
    loadOrder: string[],
    currentDepth: number = 0
  ): Promise<void> {
    if (currentDepth >= maxDepth) {
      return;
    }

    // Track maximum depth reached
    this.maxReferenceDepth = Math.max(this.maxReferenceDepth, currentDepth);

    for (const ref of refs) {
      const refKey = `${ref.type}:${ref.id}`;

      // Skip if already visited (circular reference)
      if (this.visited.has(refKey)) {
        this.cacheHits++;
        continue;
      }
      this.visited.add(refKey);

      // Resolve reference
      const resolved = await resolveReference(ref);
      referencesMap.set(refKey, resolved);

      if (!resolved.exists || !resolved.filePath) {
        continue;
      }

      // Load referenced document
      const doc = await this.loadDocument(resolved.filePath, ref.type);
      if (!doc) continue;

      loadOrder.push(ref.rawText);

      // Extract nested references and follow recursively
      const nestedRefs = extractReferences(doc.content);
      const filteredNestedRefs = this.filterByWorkMode(
        nestedRefs,
        this.getCurrentWorkMode()
      );

      await this.followReferences(
        filteredNestedRefs,
        maxDepth,
        referencesMap,
        loadOrder,
        currentDepth + 1
      );
    }
  }

  /**
   * Filter references by work mode documentation depth
   */
  private filterByWorkMode(refs: Reference[], workMode: WorkMode): Reference[] {
    if (!this.config) return refs;

    const allowedTypes = this.config.workMode.documentationDepth[workMode];

    // Map reference types to config path keys
    const typeMapping: Record<ReferenceType, string> = {
      task: 'backlog',
      feature: 'backlog',
      prd: 'prds',
      adr: 'adrs',
      sprint: 'sprints'
    };

    return refs.filter(ref => {
      const pathKey = typeMapping[ref.type];

      // Check if this reference type should be loaded for this work mode
      if (workMode === 'hack-ship') {
        // Only load sprints and tasks in hack-ship mode
        return ref.type === 'sprint' || ref.type === 'task';
      }

      if (workMode === 'think-build') {
        // Load sprints, tasks, PRDs, ADRs
        return ['sprint', 'task', 'prd', 'adr'].includes(ref.type);
      }

      // full-planning: load everything
      return true;
    });
  }

  /**
   * Load a document and add to loaded cache
   */
  private async loadDocument(
    filePath: string,
    type: string
  ): Promise<LoadedDocument | null> {
    // Check if already loaded (cache)
    if (this.loaded.has(filePath)) {
      this.cacheHits++;
      return this.loaded.get(filePath)!;
    }

    try {
      const content = await fs.readFile(filePath, 'utf-8');
      const tokens = this.estimateTokens(content);
      const relativePath = this.getRelativePath(filePath);

      const doc: LoadedDocument = {
        path: filePath,
        relativePath,
        content,
        type,
        tokens,
        loadedAt: Date.now(),
        referencedBy: []
      };

      this.loaded.set(filePath, doc);
      return doc;
    } catch (error) {
      // File doesn't exist or can't be read
      return null;
    }
  }

  /**
   * Estimate token count (rough approximation: 1 token ≈ 4 characters)
   */
  private estimateTokens(content: string): number {
    return Math.ceil(content.length / 4);
  }

  /**
   * Get relative path from absolute path
   */
  private getRelativePath(absolutePath: string): string {
    try {
      const projectRoot = process.cwd();
      return path.relative(projectRoot, absolutePath);
    } catch {
      return absolutePath;
    }
  }

  /**
   * Get current work mode (from config or default)
   */
  private getCurrentWorkMode(): WorkMode {
    return this.config?.workMode.default || 'think-build';
  }

  /**
   * Calculate context efficiency metrics
   */
  private calculateMetrics(): ContextEfficiencyMetrics {
    const totalTokens = Array.from(this.loaded.values())
      .reduce((sum, doc) => sum + doc.tokens, 0);

    const bootstrapTimeMs = Date.now() - this.startTime;

    // Baseline: full-scan would load ~50 documents × 500 tokens = 25,000 tokens
    const baselineTokens = 25000;
    const tokenReductionPercent = Math.round(
      ((baselineTokens - totalTokens) / baselineTokens) * 100
    );

    return {
      documentsLoaded: this.loaded.size,
      totalTokens,
      bootstrapTimeMs,
      cacheHits: this.cacheHits,
      referenceDepth: this.maxReferenceDepth,
      tokenReductionPercent: Math.max(0, tokenReductionPercent)
    };
  }

  /**
   * Measure context efficiency (for testing and monitoring)
   */
  measureContextEfficiency(context: StrategyContext): {
    meetsGoals: boolean;
    issues: string[];
  } {
    const { metrics } = context;
    const issues: string[] = [];

    // Goal: Context loading completes in <1 second
    if (metrics.bootstrapTimeMs > 1000) {
      issues.push(`Bootstrap time ${metrics.bootstrapTimeMs}ms exceeds 1000ms target`);
    }

    // Goal: 80% context from ≤5 documents
    if (metrics.documentsLoaded > 5) {
      issues.push(
        `Loaded ${metrics.documentsLoaded} documents, target is ≤5 for 80% context`
      );
    }

    // Goal: 70% token reduction
    if (metrics.tokenReductionPercent < 70) {
      issues.push(
        `Token reduction ${metrics.tokenReductionPercent}% below 70% target`
      );
    }

    return {
      meetsGoals: issues.length === 0,
      issues
    };
  }

  /**
   * Reset loader state (for testing)
   */
  reset(): void {
    this.loaded.clear();
    this.visited.clear();
    this.config = null;
    this.startTime = Date.now();
    this.cacheHits = 0;
    this.maxReferenceDepth = 0;
  }
}

/**
 * Convenience function: Load context strategically
 */
export async function loadContextStrategic(
  options: LoadingOptions = {}
): Promise<StrategyContext> {
  const loader = new ContextLoader();
  return loader.loadContextStrategic(options);
}

/**
 * Format context summary for display
 */
export function formatContextSummary(context: StrategyContext): string {
  const { metrics, loadOrder, documents } = context;

  const lines: string[] = [];
  lines.push(`📊 Context Loading Summary`);
  lines.push(`   Work Mode: ${context.workMode}`);
  lines.push(`   Documents: ${metrics.documentsLoaded}`);
  lines.push(`   Tokens: ${metrics.totalTokens.toLocaleString()}`);
  lines.push(`   Time: ${metrics.bootstrapTimeMs}ms`);
  lines.push(`   Token Reduction: ${metrics.tokenReductionPercent}%`);
  lines.push(`   Reference Depth: ${metrics.referenceDepth}`);
  lines.push(`   Cache Hits: ${metrics.cacheHits}`);
  lines.push('');
  lines.push(`📄 Load Order:`);
  loadOrder.forEach((item, index) => {
    lines.push(`   ${index + 1}. ${item}`);
  });

  return lines.join('\n');
}

/**
 * Get document content by path (convenience)
 */
export function getDocumentContent(
  context: StrategyContext,
  path: string
): string | null {
  const doc = context.documents.get(path);
  return doc?.content || null;
}

/**
 * Get all loaded document paths
 */
export function getLoadedPaths(context: StrategyContext): string[] {
  return Array.from(context.documents.keys());
}

/**
 * Filter documents by type
 */
export function getDocumentsByType(
  context: StrategyContext,
  type: string
): LoadedDocument[] {
  return Array.from(context.documents.values()).filter(doc => doc.type === type);
}
