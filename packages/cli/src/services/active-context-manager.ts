/**
 * @fileType: service
 * @status: current
 * @updated: 2025-09-10
 * @tags: [context, progressive-loading, management, ai]
 * @related: [context-search.ts, insight-extractor.ts, ../types/session.ts]
 * @priority: critical
 * @complexity: high
 * @dependencies: [fs-extra, ../utils/helpers.ts]
 */

import fs from 'fs-extra';
import path from 'path';
import { ContextSearch, SearchResult, IndexedModule } from './context-search.js';
import { getGinkoDir } from '../utils/helpers.js';

export interface LoadingStrategy {
  initial: {
    hierarchy: string[];
    modules: string[];
    threshold: number;
  };
  onDemand: {
    triggers: string[];
    threshold: number;
  };
  justInTime: {
    triggers: string[];
    threshold: number;
  };
}

export interface ContextLevel {
  immediate: ContextItem[];
  deferred: ContextItem[];
  available: ContextItem[];
}

export interface ContextItem {
  id: string;
  type: 'module' | 'pattern' | 'gotcha' | 'decision' | 'task';
  title: string;
  content?: string;
  relevanceScore: number;
  loadedAt?: Date;
  accessCount: number;
  lastAccessed?: Date;
  tags: string[];
}

export interface CacheEntry {
  item: ContextItem;
  tier: 'hot' | 'warm' | 'cold';
  ttl: number | null;
  expires?: Date;
}

export type WorkMode = 'hack-ship' | 'think-build' | 'full-planning';
export type Phase = 'understanding' | 'designing' | 'implementing' | 'testing' | 'debugging';

/**
 * Manages progressive context loading based on ADR-009
 */
export class ActiveContextManager {
  private contextSearch: ContextSearch | null = null;
  private cache: Map<string, CacheEntry> = new Map();
  private loadingStrategy: LoadingStrategy;
  private currentPhase: Phase = 'understanding';
  private workMode: WorkMode = 'think-build';
  private ginkoDir: string | null = null;
  
  constructor(workMode: WorkMode = 'think-build') {
    this.workMode = workMode;
    this.loadingStrategy = this.getStrategyForMode(workMode);
  }
  
  private async ensureContextSearch(): Promise<ContextSearch> {
    if (!this.contextSearch) {
      this.ginkoDir = await getGinkoDir();
      this.contextSearch = new ContextSearch(this.ginkoDir);
      await this.contextSearch.loadIndex();
    }
    return this.contextSearch;
  }
  
  /**
   * Load initial context for session start
   */
  async loadInitialContext(sessionData: any): Promise<ContextLevel> {
    const context: ContextLevel = {
      immediate: [],
      deferred: [],
      available: []
    };
    
    // Load current task if exists
    const currentTask = await this.loadCurrentTask(sessionData);
    if (currentTask) {
      context.immediate.push(currentTask);
      this.addToCache(currentTask, 'hot');
    }
    
    // Load top relevant patterns
    const topPatterns = await this.loadTopPatterns(3, sessionData);
    context.immediate.push(...topPatterns);
    topPatterns.forEach(p => this.addToCache(p, 'hot'));
    
    // Queue likely needs for background loading
    context.deferred = await this.identifyLikelyNeeds(sessionData);
    
    // Index all available modules without loading
    context.available = await this.indexAvailableModules();
    
    // Start background loading of deferred items
    this.backgroundLoadDeferred(context.deferred);
    
    return context;
  }
  
  /**
   * Load context on-demand based on triggers
   */
  async loadOnDemand(trigger: string, context?: any): Promise<ContextItem[]> {
    const items: ContextItem[] = [];
    
    // Check cache first
    const cachedItems = this.searchCache(trigger);
    if (cachedItems.length > 0) {
      return cachedItems;
    }
    
    // Load based on trigger type
    switch (trigger) {
      case 'pattern_search':
        items.push(...await this.loadPatterns(context));
        break;
      case 'error_encountered':
        items.push(...await this.searchGotchas(context));
        break;
      case 'design_decision':
        items.push(...await this.loadArchitectureContext());
        break;
      case 'new_file_created':
        items.push(...await this.loadPatternsForFileType(context));
        break;
      case 'import_added':
        items.push(...await this.loadModulePatterns(context));
        break;
      default:
        // Generic search
        const contextSearch = await this.ensureContextSearch();
        const results = await contextSearch.search({ searchText: trigger });
        items.push(...this.resultsToItems(results));
    }
    
    // Cache loaded items
    items.forEach(item => this.addToCache(item, 'warm'));
    
    return items;
  }
  
  /**
   * Load context just-in-time for specific events
   */
  async loadJustInTime(event: any): Promise<ContextItem[]> {
    const items: ContextItem[] = [];
    
    switch (event.type) {
      case 'test_failure':
        items.push(...await this.loadTestPatterns(event));
        break;
      case 'performance_degradation':
        items.push(...await this.loadOptimizationPatterns());
        break;
      case 'security_concern':
        items.push(...await this.loadSecurityGotchas());
        break;
      case 'merge_conflict':
        items.push(...await this.loadConflictContext(event));
        break;
      case 'compilation_error':
        items.push(...await this.loadErrorPatterns(event));
        break;
    }
    
    // Cache with appropriate tier
    items.forEach(item => this.addToCache(item, 'warm'));
    
    return items;
  }
  
  /**
   * Update current phase for predictive loading
   */
  async setPhase(phase: Phase): Promise<void> {
    this.currentPhase = phase;
    await this.predictAndPreload(phase);
  }
  
  /**
   * Get loading strategy based on work mode
   */
  private getStrategyForMode(mode: WorkMode): LoadingStrategy {
    switch (mode) {
      case 'hack-ship':
        return {
          initial: {
            hierarchy: ['current_task'],
            modules: ['top_1_relevant'],
            threshold: 0.9
          },
          onDemand: {
            triggers: ['error_encountered'],
            threshold: 0.8
          },
          justInTime: {
            triggers: ['compilation_error'],
            threshold: 0.7
          }
        };
      
      case 'think-build':
        return {
          initial: {
            hierarchy: ['current_task', 'sprint_goal'],
            modules: ['top_3_relevant'],
            threshold: 0.7
          },
          onDemand: {
            triggers: ['pattern_search', 'error_encountered', 'design_decision'],
            threshold: 0.6
          },
          justInTime: {
            triggers: ['test_failure', 'compilation_error', 'performance_issue'],
            threshold: 0.5
          }
        };
      
      case 'full-planning':
        return {
          initial: {
            hierarchy: ['current_task', 'sprint_goal', 'architecture'],
            modules: ['top_5_relevant'],
            threshold: 0.5
          },
          onDemand: {
            triggers: ['pattern_search', 'error_encountered', 'design_decision', 'review'],
            threshold: 0.4
          },
          justInTime: {
            triggers: ['test_failure', 'compilation_error', 'performance_issue', 'security_concern'],
            threshold: 0.3
          }
        };
    }
  }
  
  /**
   * Predictive preloading based on current phase
   */
  private async predictAndPreload(phase: Phase): Promise<void> {
    const predictions: Record<Phase, string[]> = {
      'understanding': ['project-overview', 'architecture', 'decisions'],
      'designing': ['architecture', 'patterns', 'decisions', 'best-practices'],
      'implementing': ['patterns', 'utilities', 'gotchas', 'examples'],
      'testing': ['test-patterns', 'mocks', 'fixtures', 'assertions'],
      'debugging': ['error-patterns', 'logs', 'gotchas', 'debugging-tips']
    };
    
    const likely = predictions[phase] || [];
    
    // Background load predicted needs
    const contextSearch = await this.ensureContextSearch();
    for (const topic of likely) {
      const results = await contextSearch.search({ searchText: topic });
      const items = this.resultsToItems(results);
      items.forEach(item => this.addToCache(item, 'warm'));
    }
  }
  
  /**
   * Cache management
   */
  private addToCache(item: ContextItem, tier: 'hot' | 'warm' | 'cold'): void {
    const ttl = this.getTTLForTier(tier);
    const entry: CacheEntry = {
      item,
      tier,
      ttl,
      expires: ttl ? new Date(Date.now() + ttl) : undefined
    };
    
    this.cache.set(item.id, entry);
    
    // Clean expired entries periodically
    if (this.cache.size > 100) {
      this.cleanExpiredCache();
    }
  }
  
  private getTTLForTier(tier: string): number | null {
    switch (tier) {
      case 'hot':
        return null; // No expiration
      case 'warm':
        return 30 * 60 * 1000; // 30 minutes
      case 'cold':
        return 5 * 60 * 1000; // 5 minutes
      default:
        return 10 * 60 * 1000; // 10 minutes default
    }
  }
  
  private cleanExpiredCache(): void {
    const now = new Date();
    for (const [key, entry] of this.cache.entries()) {
      if (entry.expires && entry.expires < now) {
        this.cache.delete(key);
      }
    }
  }
  
  private searchCache(query: string): ContextItem[] {
    const results: ContextItem[] = [];
    const queryLower = query.toLowerCase();
    
    for (const entry of this.cache.values()) {
      if (entry.item.title.toLowerCase().includes(queryLower) ||
          entry.item.tags.some(tag => tag.toLowerCase().includes(queryLower))) {
        results.push(entry.item);
        // Update access stats
        entry.item.accessCount++;
        entry.item.lastAccessed = new Date();
      }
    }
    
    return results;
  }
  
  /**
   * Helper methods for loading specific context types
   */
  private async loadCurrentTask(sessionData: any): Promise<ContextItem | null> {
    const ginkoDir = await getGinkoDir();
    const sessionFile = path.join(ginkoDir, 'sessions', sessionData.userSlug, 'current.md');
    
    if (await fs.pathExists(sessionFile)) {
      const content = await fs.readFile(sessionFile, 'utf8');
      return {
        id: 'current-task',
        type: 'task',
        title: 'Current Session Task',
        content,
        relevanceScore: 1.0,
        accessCount: 1,
        tags: ['session', 'current', 'task']
      };
    }
    
    return null;
  }
  
  private async loadTopPatterns(count: number, sessionData: any): Promise<ContextItem[]> {
    const contextSearch = await this.ensureContextSearch();
    const results = await contextSearch.search({ searchText: sessionData.branch || '', limit: count });
    return this.resultsToItems(results);
  }
  
  private async identifyLikelyNeeds(sessionData: any): Promise<ContextItem[]> {
    // Analyze session data to predict needs
    const keywords = [
      ...(sessionData.filesChanged || []).map((f: any) => path.basename(f.path)),
      ...(sessionData.tags || [])
    ];
    
    const items: ContextItem[] = [];
    const contextSearch = await this.ensureContextSearch();
    for (const keyword of keywords) {
      const results = await contextSearch.search({ searchText: keyword, limit: 2 });
      items.push(...this.resultsToItems(results));
    }
    
    return items;
  }
  
  private async indexAvailableModules(): Promise<ContextItem[]> {
    const ginkoDir = await getGinkoDir();
    const modulesDir = path.join(ginkoDir, 'context', 'modules');
    
    if (!await fs.pathExists(modulesDir)) {
      return [];
    }
    
    const files = await fs.readdir(modulesDir);
    const items: ContextItem[] = [];
    
    for (const file of files) {
      if (file.endsWith('.md')) {
        items.push({
          id: file.replace('.md', ''),
          type: 'module',
          title: file.replace('.md', '').replace(/-/g, ' '),
          relevanceScore: 0,
          accessCount: 0,
          tags: []
        });
      }
    }
    
    return items;
  }
  
  private resultsToItems(results: SearchResult[]): ContextItem[] {
    return results.map(r => ({
      id: r.module.filename || 'unknown',
      type: r.module.type as any,
      title: r.module.title || r.module.filename?.replace('.md', '').replace(/-/g, ' ') || 'Untitled',
      content: undefined, // Content loaded separately
      relevanceScore: r.score,
      accessCount: 0,
      tags: r.module.tags || []
    }));
  }
  
  private async backgroundLoadDeferred(items: ContextItem[]): Promise<void> {
    // Load deferred items in background
    setTimeout(async () => {
      for (const item of items) {
        if (!item.content) {
          // Load content from file
          const ginkoDir = await getGinkoDir();
          const filePath = path.join(ginkoDir, 'context', 'modules', `${item.id}.md`);
          if (await fs.pathExists(filePath)) {
            item.content = await fs.readFile(filePath, 'utf8');
          }
        }
        this.addToCache(item, 'warm');
      }
    }, 100);
  }
  
  // Specific pattern loaders
  private async loadPatterns(context?: any): Promise<ContextItem[]> {
    const contextSearch = await this.ensureContextSearch();
    const modules = await contextSearch.searchByType('pattern');
    return modules.map(m => this.moduleToItem(m));
  }
  
  private async searchGotchas(context?: any): Promise<ContextItem[]> {
    const contextSearch = await this.ensureContextSearch();
    const modules = await contextSearch.searchByType('gotcha');
    return modules.map(m => this.moduleToItem(m));
  }
  
  private moduleToItem(module: any): ContextItem {
    return {
      id: module.filename || 'unknown',
      type: module.type as any,
      title: module.title || module.filename?.replace('.md', '').replace(/-/g, ' ') || 'Untitled',
      content: undefined,
      relevanceScore: 0.5,
      accessCount: 0,
      tags: module.tags || []
    };
  }
  
  private async loadArchitectureContext(): Promise<ContextItem[]> {
    const contextSearch = await this.ensureContextSearch();
    const results = await contextSearch.search({ searchText: 'architecture' });
    return this.resultsToItems(results);
  }
  
  private async loadPatternsForFileType(context?: any): Promise<ContextItem[]> {
    if (!context?.fileType) return [];
    const contextSearch = await this.ensureContextSearch();
    const results = await contextSearch.search({ searchText: context.fileType });
    return this.resultsToItems(results);
  }
  
  private async loadModulePatterns(context?: any): Promise<ContextItem[]> {
    if (!context?.module) return [];
    const contextSearch = await this.ensureContextSearch();
    const results = await contextSearch.search({ searchText: context.module });
    return this.resultsToItems(results);
  }
  
  private async loadTestPatterns(event: any): Promise<ContextItem[]> {
    const contextSearch = await this.ensureContextSearch();
    const results = await contextSearch.search({ searchText: 'test' });
    return this.resultsToItems(results);
  }
  
  private async loadOptimizationPatterns(): Promise<ContextItem[]> {
    const contextSearch = await this.ensureContextSearch();
    const results = await contextSearch.search({ searchText: 'optimization performance' });
    return this.resultsToItems(results);
  }
  
  private async loadSecurityGotchas(): Promise<ContextItem[]> {
    const contextSearch = await this.ensureContextSearch();
    const results = await contextSearch.search({ searchText: 'security vulnerability' });
    return this.resultsToItems(results);
  }
  
  private async loadConflictContext(event: any): Promise<ContextItem[]> {
    const contextSearch = await this.ensureContextSearch();
    const results = await contextSearch.search({ searchText: 'merge conflict resolution' });
    return this.resultsToItems(results);
  }
  
  private async loadErrorPatterns(event: any): Promise<ContextItem[]> {
    const contextSearch = await this.ensureContextSearch();
    const errorKeywords = event.error?.message?.split(' ').slice(0, 3).join(' ') || 'error';
    const results = await contextSearch.search({ searchText: errorKeywords });
    return this.resultsToItems(results);
  }
  
  /**
   * Get current context statistics
   */
  getStats(): any {
    const stats = {
      cacheSize: this.cache.size,
      hotItems: 0,
      warmItems: 0,
      coldItems: 0,
      totalAccess: 0,
      currentPhase: this.currentPhase,
      workMode: this.workMode
    };
    
    for (const entry of this.cache.values()) {
      stats[`${entry.tier}Items` as keyof typeof stats]++;
      stats.totalAccess += entry.item.accessCount;
    }
    
    return stats;
  }
}