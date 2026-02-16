/**
 * @fileType: service
 * @status: current
 * @updated: 2025-09-09
 * @tags: [search, context, modules, index]
 * @related: [./module-generator.ts, ../types/session.ts]
 * @priority: high
 * @complexity: medium
 * @dependencies: [fs-extra, path]
 */

import fs from 'fs-extra';
import path from 'path';
import { ContextModule, InsightType } from '../types/session.js';

export interface SearchOptions {
  tags?: string[];
  type?: InsightType;
  relevance?: 'critical' | 'high' | 'medium' | 'low';
  minTimeSaving?: number;
  createdAfter?: Date;
  searchText?: string;
  limit?: number;
}

export interface SearchResult {
  module: IndexedModule;
  score: number;
  matches: {
    tags?: string[];
    title?: boolean;
    problem?: boolean;
    solution?: boolean;
    branch?: boolean;
    error?: boolean;
  };
}

export interface IndexedModule {
  filename: string;
  type: InsightType;
  tags: string[];
  relevance: string;
  created: string;
  updated?: string;
  sessionId?: string;
  timeSaving?: number;
  title?: string;
  summary?: string;
}

/**
 * Service for searching and retrieving context modules
 */
export class ContextSearch {
  private index: Map<string, IndexedModule> = new Map();
  private modulesDir: string;
  private indexPath: string;
  
  constructor(ginkoDir: string) {
    this.modulesDir = path.join(ginkoDir, 'context', 'modules');
    this.indexPath = path.join(ginkoDir, 'context', 'index.json');
  }
  
  /**
   * Load the index into memory for fast searching
   */
  async loadIndex(): Promise<void> {
    try {
      const indexData = await fs.readJSON(this.indexPath);
      
      // Handle both old format (direct modules) and new format (modules array)
      if (indexData.modules && Array.isArray(indexData.modules)) {
        // New format from module generator
        for (const module of indexData.modules) {
          this.index.set(module.filename, module);
        }
      } else {
        // Old format - direct module entries
        for (const [filename, metadata] of Object.entries(indexData)) {
          if (typeof metadata === 'object' && metadata !== null && !Array.isArray(metadata)) {
            // Skip non-module entries like 'modules', 'lastUpdated', etc.
            if (filename.endsWith('.md')) {
              this.index.set(filename, {
                filename,
                ...(metadata as any)
              });
            }
          }
        }
      }
      
      // Load additional metadata from module files if needed
      await this.enrichIndexWithModuleContent();
    } catch (error: any) {
      // Index doesn't exist yet — this is normal for new projects
      if (error?.code !== 'ENOENT') {
        console.warn('Context index error:', error);
      }
    }
  }
  
  /**
   * Search for modules matching criteria
   */
  async search(options: SearchOptions): Promise<SearchResult[]> {
    const results: SearchResult[] = [];
    
    for (const [filename, module] of this.index) {
      const score = this.calculateMatchScore(module, options);
      
      if (score > 0) {
        const matches = this.getMatches(module, options);
        results.push({ module, score, matches });
      }
    }
    
    // Sort by score descending
    results.sort((a, b) => b.score - a.score);
    
    // Apply limit if specified
    if (options.limit) {
      return results.slice(0, options.limit);
    }
    
    return results;
  }
  
  /**
   * Quick search by tags (most common use case)
   */
  async searchByTags(tags: string[]): Promise<IndexedModule[]> {
    const results = await this.search({ tags });
    return results.map(r => r.module);
  }
  
  /**
   * Search by type
   */
  async searchByType(type: InsightType): Promise<IndexedModule[]> {
    const results = await this.search({ type });
    return results.map(r => r.module);
  }
  
  /**
   * Get modules relevant to current work
   */
  async getRelevantModules(context: {
    branch?: string;
    files?: string[];
    errors?: string[];
  }): Promise<IndexedModule[]> {
    const relevantTags = new Set<string>();
    
    // Extract tags from branch name
    if (context.branch) {
      const branchTags = context.branch.toLowerCase().split(/[-_\/]/)
        .filter(t => t.length > 2);
      branchTags.forEach(t => relevantTags.add(t));
    }
    
    // Extract tags from file paths
    if (context.files) {
      for (const file of context.files) {
        const fileTags = path.basename(file, path.extname(file))
          .toLowerCase().split(/[-_]/)
          .filter(t => t.length > 2);
        fileTags.forEach(t => relevantTags.add(t));
      }
    }
    
    // Search for modules with matching tags
    const results = await this.search({
      tags: Array.from(relevantTags),
      relevance: 'critical' // Prioritize critical modules
    });
    
    return results.map(r => r.module);
  }
  
  /**
   * Full-text search across module content
   */
  async searchFullText(query: string): Promise<SearchResult[]> {
    const results: SearchResult[] = [];
    const queryLower = query.toLowerCase();
    
    for (const [filename, module] of this.index) {
      try {
        const filepath = path.join(this.modulesDir, filename);
        const content = await fs.readFile(filepath, 'utf8');
        const contentLower = content.toLowerCase();
        
        if (contentLower.includes(queryLower)) {
          const score = this.calculateTextMatchScore(content, query);
          results.push({
            module,
            score,
            matches: {
              title: module.title?.toLowerCase().includes(queryLower),
              problem: !!(content.match(/## .*Problem/i) && 
                       content.split(/## .*Problem/i)[1]?.toLowerCase().includes(queryLower)),
              solution: !!(content.match(/## .*Solution/i) && 
                        content.split(/## .*Solution/i)[1]?.toLowerCase().includes(queryLower))
            }
          });
        }
      } catch (error) {
        // Module file not found
        continue;
      }
    }
    
    results.sort((a, b) => b.score - a.score);
    return results;
  }
  
  /**
   * Calculate match score for a module
   */
  private calculateMatchScore(module: IndexedModule, options: SearchOptions): number {
    let score = 0;
    
    // If no specific search criteria, return a base score based on relevance
    const hasSearchCriteria = options.type || 
                             (options.tags && options.tags.length > 0) || 
                             options.relevance || 
                             options.minTimeSaving || 
                             options.createdAfter ||
                             options.searchText;
    
    if (!hasSearchCriteria) {
      // Base score for listing all modules
      const relevanceScores: Record<string, number> = {
        'critical': 1.0,
        'high': 0.8,
        'medium': 0.6,
        'low': 0.4
      };
      return relevanceScores[module.relevance || 'medium'] || 0.5;
    }
    
    // Type match (exact)
    if (options.type && module.type === options.type) {
      score += 1;
    } else if (options.type && module.type !== options.type) {
      return 0; // No match if type specified but doesn't match
    }
    
    // Tag matches (partial)
    if (options.tags && options.tags.length > 0) {
      const moduleTags = new Set(module.tags.map(t => t.toLowerCase()));
      const matchingTags = options.tags.filter(tag => 
        moduleTags.has(tag.toLowerCase())
      );
      if (matchingTags.length === 0) {
        return 0; // No tag matches when tags specified
      }
      score += matchingTags.length / options.tags.length;
    }
    
    // Relevance match (minimum threshold)
    if (options.relevance) {
      const relevanceOrder = ['low', 'medium', 'high', 'critical'];
      const moduleIndex = relevanceOrder.indexOf(module.relevance);
      const optionIndex = relevanceOrder.indexOf(options.relevance);
      
      if (moduleIndex >= optionIndex) {
        score += 0.5;
      } else {
        score *= 0.5; // Penalize lower relevance
      }
    }
    
    // Time saving threshold
    if (options.minTimeSaving && module.timeSaving) {
      if (module.timeSaving >= options.minTimeSaving) {
        score += 0.3;
      } else {
        return 0; // No match if below threshold
      }
    }
    
    // Recency boost
    if (options.createdAfter && module.created) {
      const moduleDate = new Date(module.created);
      if (moduleDate >= options.createdAfter) {
        score += 0.2;
      }
    }
    
    return score;
  }
  
  /**
   * Calculate text match score
   */
  private calculateTextMatchScore(content: string, query: string): number {
    const queryLower = query.toLowerCase();
    const contentLower = content.toLowerCase();
    
    let score = 0;
    
    // Title match is highest value
    if (content.match(/^# (.+)$/m)?.[1]?.toLowerCase().includes(queryLower)) {
      score += 3;
    }
    
    // Problem/solution matches are high value
    if (content.match(/## .*Problem/i) && 
        content.split(/## .*Problem/i)[1]?.toLowerCase().includes(queryLower)) {
      score += 2;
    }
    
    if (content.match(/## .*Solution/i) && 
        content.split(/## .*Solution/i)[1]?.toLowerCase().includes(queryLower)) {
      score += 2;
    }
    
    // Count occurrences
    const occurrences = (contentLower.match(new RegExp(queryLower, 'g')) || []).length;
    score += Math.min(occurrences * 0.1, 1); // Cap at 1 point for frequency
    
    return score;
  }
  
  /**
   * Get specific matches for a module
   */
  private getMatches(module: IndexedModule, options: SearchOptions): any {
    const matches: any = {};
    
    if (options.tags) {
      const moduleTags = new Set(module.tags.map(t => t.toLowerCase()));
      matches.tags = options.tags.filter(tag => 
        moduleTags.has(tag.toLowerCase())
      );
    }
    
    return matches;
  }
  
  /**
   * Enrich index with content from module files
   */
  private async enrichIndexWithModuleContent(): Promise<void> {
    for (const [filename, module] of this.index) {
      try {
        const filepath = path.join(this.modulesDir, filename);
        const content = await fs.readFile(filepath, 'utf8');
        
        // Extract title
        const titleMatch = content.match(/^# (.+)$/m);
        if (titleMatch) {
          module.title = titleMatch[1];
        }
        
        // Extract time saving if available
        const timeMatch = content.match(/Time Saved[:\s]+(\d+)\s+minutes/i);
        if (timeMatch) {
          module.timeSaving = parseInt(timeMatch[1]);
        }
        
        // Extract summary (first paragraph after title)
        const summaryMatch = content.match(/^# .+\n\n(.+?)(?:\n\n|$)/m);
        if (summaryMatch) {
          module.summary = summaryMatch[1];
        }
      } catch (error) {
        // Module file not found, skip enrichment
        continue;
      }
    }
  }
}