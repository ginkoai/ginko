/**
 * @fileType: service
 * @status: current
 * @updated: 2025-09-09
 * @tags: [insights, quality, deduplication, similarity]
 * @related: [./insight-extractor.ts, ./module-generator.ts]
 * @priority: critical
 * @complexity: high
 * @dependencies: []
 */

import fs from 'fs-extra';
import path from 'path';
import { SessionInsight, ContextModule } from '../types/session.js';

/**
 * Quality control and deduplication for insights
 */
export class InsightQualityController {
  private existingModules: Map<string, ParsedModule> = new Map();
  private readonly SIMILARITY_THRESHOLD = 0.75; // 75% similarity triggers review
  private readonly QUALITY_THRESHOLD = 0.65; // Minimum quality score for creation
  
  /**
   * Load and parse existing context modules
   */
  async loadExistingModules(modulesDir: string): Promise<void> {
    try {
      const files = await fs.readdir(modulesDir);
      
      for (const file of files) {
        if (file.endsWith('.md')) {
          const content = await fs.readFile(path.join(modulesDir, file), 'utf8');
          const parsed = this.parseModule(content, file);
          if (parsed) {
            this.existingModules.set(file, parsed);
          }
        }
      }
    } catch (error) {
      // Directory might not exist yet
    }
  }
  
  /**
   * Check if an insight meets quality thresholds
   */
  assessInsightQuality(insight: SessionInsight): QualityAssessment {
    const scores = {
      clarity: this.assessClarity(insight),
      specificity: this.assessSpecificity(insight),
      actionability: this.assessActionability(insight),
      completeness: this.assessCompleteness(insight),
      uniqueness: this.assessUniqueness(insight)
    };
    
    const overallScore = (
      scores.clarity * 0.2 +
      scores.specificity * 0.25 +
      scores.actionability * 0.25 +
      scores.completeness * 0.15 +
      scores.uniqueness * 0.15
    );
    
    const issues: string[] = [];
    
    // Identify specific quality issues
    if (scores.clarity < 0.5) {
      issues.push('Problem or solution is unclear');
    }
    if (scores.specificity < 0.5) {
      issues.push('Too generic or vague to be actionable');
    }
    if (scores.actionability < 0.5) {
      issues.push('No clear action or solution provided');
    }
    if (scores.completeness < 0.5) {
      issues.push('Missing critical information');
    }
    
    // Check for trivial insights
    if (this.isTrivialInsight(insight)) {
      issues.push('Insight is too trivial or obvious');
      scores.uniqueness = 0;
    }
    
    return {
      shouldCreate: overallScore >= this.QUALITY_THRESHOLD && issues.length === 0,
      score: overallScore,
      scores,
      issues,
      recommendation: this.getRecommendation(overallScore, issues)
    };
  }
  
  /**
   * Find similar existing modules
   */
  findSimilarModules(insight: SessionInsight): SimilarityResult[] {
    const results: SimilarityResult[] = [];
    
    for (const [filename, module] of this.existingModules) {
      const similarity = this.calculateSimilarity(insight, module);
      
      if (similarity.score >= this.SIMILARITY_THRESHOLD) {
        results.push({
          filename,
          module,
          similarity,
          distinctionAnalysis: this.analyzeDistinction(insight, module)
        });
      }
    }
    
    // Sort by similarity score descending
    results.sort((a, b) => b.similarity.score - a.similarity.score);
    
    return results;
  }
  
  /**
   * Determine if new module should be created despite similarities
   */
  shouldCreateDespiteSimilarity(
    insight: SessionInsight,
    similar: SimilarityResult[]
  ): CreationDecision {
    // No similar modules - easy yes
    if (similar.length === 0) {
      return {
        shouldCreate: true,
        reason: 'No similar modules found',
        action: 'create'
      };
    }
    
    const mostSimilar = similar[0];
    
    // Near duplicate (>90% similar)
    if (mostSimilar.similarity.score > 0.9) {
      // Check if there's a meaningful distinction
      if (mostSimilar.distinctionAnalysis.hasMeaningfulDistinction) {
        return {
          shouldCreate: true,
          reason: `Similar but distinct: ${mostSimilar.distinctionAnalysis.distinction}`,
          action: 'create-variant',
          relatedModule: mostSimilar.filename,
          suggestion: `Consider updating existing module instead`
        };
      }
      
      return {
        shouldCreate: false,
        reason: 'Near duplicate of existing module',
        action: 'skip',
        existingModule: mostSimilar.filename
      };
    }
    
    // High similarity (75-90%)
    if (mostSimilar.similarity.score > 0.75) {
      // Analyze the distinction
      const distinction = mostSimilar.distinctionAnalysis;
      
      if (distinction.hasMeaningfulDistinction) {
        // Different problem domain
        if (distinction.differentDomain) {
          return {
            shouldCreate: true,
            reason: 'Different problem domain',
            action: 'create',
            relatedModule: mostSimilar.filename
          };
        }
        
        // Different solution approach
        if (distinction.differentApproach) {
          return {
            shouldCreate: true,
            reason: 'Alternative solution approach',
            action: 'create-alternative',
            relatedModule: mostSimilar.filename,
            suggestion: 'Link to related module as alternative approach'
          };
        }
        
        // Evolution or refinement
        if (distinction.isRefinement) {
          return {
            shouldCreate: true,
            reason: 'Refinement or evolution of existing pattern',
            action: 'create-evolution',
            relatedModule: mostSimilar.filename,
            suggestion: 'Consider updating the original module'
          };
        }
      }
      
      // Similar but in different context
      if (this.isDifferentContext(insight, mostSimilar.module)) {
        return {
          shouldCreate: true,
          reason: 'Similar pattern in different context',
          action: 'create-contextual',
          relatedModule: mostSimilar.filename
        };
      }
    }
    
    // Default: create if quality is high enough
    return {
      shouldCreate: true,
      reason: 'Sufficiently distinct from existing modules',
      action: 'create'
    };
  }
  
  /**
   * Calculate similarity between insight and existing module
   */
  private calculateSimilarity(insight: SessionInsight, module: ParsedModule): SimilarityScore {
    // Title similarity
    const titleSim = this.stringSimilarity(insight.title, module.title);
    
    // Problem similarity
    const problemSim = this.stringSimilarity(insight.problem, module.problem);
    
    // Solution similarity
    const solutionSim = this.stringSimilarity(insight.solution, module.solution);
    
    // Tag overlap
    const tagSim = this.calculateTagOverlap(insight.tags || [], module.tags);
    
    // Type match
    const typeSim = insight.type === module.type ? 1.0 : 0.3;
    
    // Code similarity (if both have code)
    let codeSim = 0;
    if (insight.codeExample && module.codeExample) {
      codeSim = this.stringSimilarity(
        insight.codeExample.after,
        module.codeExample
      );
    }
    
    // Weighted average
    const score = (
      titleSim * 0.15 +
      problemSim * 0.25 +
      solutionSim * 0.30 +
      tagSim * 0.10 +
      typeSim * 0.10 +
      codeSim * 0.10
    );
    
    return {
      score,
      components: {
        title: titleSim,
        problem: problemSim,
        solution: solutionSim,
        tags: tagSim,
        type: typeSim,
        code: codeSim
      }
    };
  }
  
  /**
   * Analyze what makes two similar insights distinct
   */
  private analyzeDistinction(insight: SessionInsight, module: ParsedModule): DistinctionAnalysis {
    const distinctions: string[] = [];
    let hasMeaningfulDistinction = false;
    
    // Check for different problem domains
    const differentDomain = this.isDifferentDomain(insight, module);
    if (differentDomain) {
      distinctions.push('Different problem domain');
      hasMeaningfulDistinction = true;
    }
    
    // Check for different approaches
    const differentApproach = this.isDifferentApproach(insight, module);
    if (differentApproach) {
      distinctions.push('Different solution approach');
      hasMeaningfulDistinction = true;
    }
    
    // Check if it's a refinement
    const isRefinement = this.isRefinement(insight, module);
    if (isRefinement) {
      distinctions.push('Refinement or evolution');
      hasMeaningfulDistinction = true;
    }
    
    // Check for different error types
    if (insight.preventedError && module.prevention &&
        !this.stringSimilarity(insight.preventedError, module.prevention)) {
      distinctions.push('Prevents different error');
      hasMeaningfulDistinction = true;
    }
    
    // Check for significant time saving difference
    if (Math.abs(insight.timeSavingPotential - (module.timeSaving || 0)) > 30) {
      distinctions.push('Significantly different time impact');
      hasMeaningfulDistinction = true;
    }
    
    return {
      hasMeaningfulDistinction,
      distinction: distinctions.join(', '),
      differentDomain,
      differentApproach,
      isRefinement,
      distinctions
    };
  }
  
  /**
   * Assess clarity of problem and solution
   */
  private assessClarity(insight: SessionInsight): number {
    let score = 1.0;
    
    // Check problem clarity
    if (insight.problem.length < 20) score -= 0.3;
    if (insight.problem.split(' ').length < 5) score -= 0.2;
    if (!insight.problem.match(/[.!?]$/)) score -= 0.1;
    
    // Check solution clarity
    if (insight.solution.length < 20) score -= 0.3;
    if (insight.solution.split(' ').length < 5) score -= 0.2;
    
    return Math.max(0, score);
  }
  
  /**
   * Assess specificity vs genericness
   */
  private assessSpecificity(insight: SessionInsight): number {
    const genericTerms = [
      'something', 'somehow', 'some', 'thing', 'stuff',
      'various', 'multiple', 'several', 'many',
      'issue', 'problem', 'error', 'bug'
    ];
    
    const text = `${insight.problem} ${insight.solution}`.toLowerCase();
    const words = text.split(/\s+/);
    const genericCount = words.filter(w => genericTerms.includes(w)).length;
    
    // Penalize generic language
    let score = 1.0 - (genericCount / words.length) * 2;
    
    // Boost for specific technical terms
    if (insight.tags && insight.tags.length > 2) score += 0.2;
    if (insight.codeExample) score += 0.3;
    
    return Math.max(0, Math.min(1, score));
  }
  
  /**
   * Assess actionability of the insight
   */
  private assessActionability(insight: SessionInsight): number {
    let score = 0.5;
    
    // Has clear solution
    if (insight.solution.length > 30) score += 0.2;
    
    // Has code example
    if (insight.codeExample) score += 0.3;
    
    // Has prevention strategy
    if (insight.preventedError) score += 0.2;
    
    // Action verbs in solution
    const actionVerbs = ['use', 'add', 'remove', 'change', 'update', 'implement', 'replace', 'configure'];
    const hasActionVerb = actionVerbs.some(verb => 
      insight.solution.toLowerCase().includes(verb)
    );
    if (hasActionVerb) score += 0.2;
    
    return Math.min(1, score);
  }
  
  /**
   * Assess completeness of information
   */
  private assessCompleteness(insight: SessionInsight): number {
    let score = 0;
    const fields = [
      insight.problem.length > 10,
      insight.solution.length > 10,
      insight.impact.length > 10,
      insight.timeSavingPotential > 0,
      insight.reusabilityScore > 0,
      (insight.tags?.length || 0) > 0,
      !!insight.codeExample,
      !!insight.preventedError
    ];
    
    score = fields.filter(f => f).length / fields.length;
    return score;
  }
  
  /**
   * Assess uniqueness compared to common knowledge
   */
  private assessUniqueness(insight: SessionInsight): number {
    // List of trivial/obvious insights
    const trivialPatterns = [
      /always?\s+use\s+typescript/i,
      /add\s+error\s+handling/i,
      /write\s+tests/i,
      /use\s+git/i,
      /comment\s+your\s+code/i,
      /follow\s+best\s+practices/i
    ];
    
    const text = `${insight.problem} ${insight.solution}`;
    const isTrivial = trivialPatterns.some(pattern => pattern.test(text));
    
    if (isTrivial) return 0.2;
    
    // Check for unique technical details
    if (insight.codeExample) return 0.9;
    if (insight.timeSavingPotential > 60) return 0.8;
    
    return 0.7;
  }
  
  /**
   * Check if insight is trivial
   */
  private isTrivialInsight(insight: SessionInsight): boolean {
    const trivialIndicators = [
      insight.problem.length < 15,
      insight.solution.length < 15,
      insight.timeSavingPotential < 10,
      insight.reusabilityScore < 0.3,
      /^(always|never|just|simply)/i.test(insight.solution)
    ];
    
    return trivialIndicators.filter(i => i).length >= 3;
  }
  
  /**
   * Simple string similarity using Jaccard index
   */
  private stringSimilarity(str1: string, str2: string): number {
    if (!str1 || !str2) return 0;
    
    const words1 = new Set(str1.toLowerCase().split(/\s+/));
    const words2 = new Set(str2.toLowerCase().split(/\s+/));
    
    const intersection = new Set([...words1].filter(w => words2.has(w)));
    const union = new Set([...words1, ...words2]);
    
    return intersection.size / union.size;
  }
  
  /**
   * Calculate tag overlap coefficient
   */
  private calculateTagOverlap(tags1: string[], tags2: string[]): number {
    if (tags1.length === 0 || tags2.length === 0) return 0;
    
    const set1 = new Set(tags1.map(t => t.toLowerCase()));
    const set2 = new Set(tags2.map(t => t.toLowerCase()));
    
    const intersection = new Set([...set1].filter(t => set2.has(t)));
    const smaller = Math.min(set1.size, set2.size);
    
    return intersection.size / smaller;
  }
  
  /**
   * Check if insights are from different domains
   */
  private isDifferentDomain(insight: SessionInsight, module: ParsedModule): boolean {
    // Check tag overlap
    const tagOverlap = this.calculateTagOverlap(insight.tags || [], module.tags);
    return tagOverlap < 0.3;
  }
  
  /**
   * Check if insights have different approaches
   */
  private isDifferentApproach(insight: SessionInsight, module: ParsedModule): boolean {
    if (!insight.codeExample || !module.codeExample) return false;
    
    // Very different code despite similar problem
    const codeSim = this.stringSimilarity(
      insight.codeExample.after,
      module.codeExample
    );
    const problemSim = this.stringSimilarity(insight.problem, module.problem);
    
    return problemSim > 0.7 && codeSim < 0.3;
  }
  
  /**
   * Check if new insight is a refinement
   */
  private isRefinement(insight: SessionInsight, module: ParsedModule): boolean {
    // Higher time saving for similar problem
    const timeDiff = insight.timeSavingPotential - (module.timeSaving || 0);
    const problemSim = this.stringSimilarity(insight.problem, module.problem);
    
    return problemSim > 0.7 && timeDiff > 20;
  }
  
  /**
   * Check if insights are in different contexts
   */
  private isDifferentContext(insight: SessionInsight, module: ParsedModule): boolean {
    // Different file types or frameworks
    const insightContext = this.extractContext(insight.tags || []);
    const moduleContext = this.extractContext(module.tags);
    
    return insightContext !== moduleContext && insightContext !== 'unknown';
  }
  
  /**
   * Extract context from tags
   */
  private extractContext(tags: string[]): string {
    const contexts = {
      frontend: ['react', 'vue', 'angular', 'svelte', 'ui', 'component'],
      backend: ['api', 'server', 'database', 'sql', 'rest', 'graphql'],
      testing: ['test', 'jest', 'vitest', 'mocha', 'cypress'],
      devops: ['docker', 'kubernetes', 'ci', 'cd', 'deploy'],
      mobile: ['ios', 'android', 'react-native', 'flutter']
    };
    
    for (const [context, keywords] of Object.entries(contexts)) {
      if (tags.some(tag => keywords.includes(tag.toLowerCase()))) {
        return context;
      }
    }
    
    return 'unknown';
  }
  
  /**
   * Parse existing module content
   */
  private parseModule(content: string, filename: string): ParsedModule | null {
    try {
      // Extract frontmatter
      const frontmatterMatch = content.match(/^---\n([\s\S]*?)\n---/);
      const frontmatter = frontmatterMatch ? this.parseFrontmatter(frontmatterMatch[1]) : {};
      
      // Extract title
      const titleMatch = content.match(/^# (.+)$/m);
      const title = titleMatch ? titleMatch[1] : filename;
      
      // Extract problem (various formats)
      const problemMatch = content.match(/## (?:The )?(Problem|Issue|Context|Gotcha|What Was Discovered)\n\n([\s\S]*?)(?=\n##)/);
      const problem = problemMatch ? problemMatch[2].trim() : '';
      
      // Extract solution
      const solutionMatch = content.match(/## (?:The )?(Solution|Implementation|Decision|How It Works)\n\n([\s\S]*?)(?=\n##)/);
      const solution = solutionMatch ? solutionMatch[2].trim() : '';
      
      // Extract code example
      const codeMatch = content.match(/```[\w]*\n([\s\S]*?)```/);
      const codeExample = codeMatch ? codeMatch[1] : undefined;
      
      // Extract time saving
      const timeMatch = content.match(/Time Saved[:\s]+(\d+)\s+minutes/i);
      const timeSaving = timeMatch ? parseInt(timeMatch[1]) : undefined;
      
      // Extract prevention
      const preventionMatch = content.match(/## (?:How to Avoid|Prevention)\n\n([\s\S]*?)(?=\n##|$)/);
      const prevention = preventionMatch ? preventionMatch[1].trim() : undefined;
      
      return {
        filename,
        title,
        type: frontmatter.type || 'discovery',
        tags: frontmatter.tags || [],
        problem,
        solution,
        codeExample,
        timeSaving,
        prevention,
        created: frontmatter.created
      };
    } catch (error) {
      return null;
    }
  }
  
  /**
   * Parse frontmatter YAML
   */
  private parseFrontmatter(yaml: string): any {
    const result: any = {};
    const lines = yaml.split('\n');
    
    for (const line of lines) {
      const match = line.match(/^(\w+):\s*(.+)$/);
      if (match) {
        const key = match[1];
        let value: any = match[2];
        
        // Parse arrays
        if (value.startsWith('[') && value.endsWith(']')) {
          value = value.slice(1, -1).split(',').map((s: string) => s.trim());
        }
        
        result[key] = value;
      }
    }
    
    return result;
  }
  
  /**
   * Get recommendation based on quality assessment
   */
  private getRecommendation(score: number, issues: string[]): string {
    if (score >= 0.8 && issues.length === 0) {
      return 'High quality insight - create module';
    }
    if (score >= this.QUALITY_THRESHOLD) {
      return 'Acceptable quality - create with improvements';
    }
    if (score >= 0.5) {
      return 'Borderline quality - enhance before creating';
    }
    return 'Low quality - skip or substantially improve';
  }
}

// Type definitions
interface ParsedModule {
  filename: string;
  title: string;
  type: string;
  tags: string[];
  problem: string;
  solution: string;
  codeExample?: string;
  timeSaving?: number;
  prevention?: string;
  created?: string;
}

interface QualityAssessment {
  shouldCreate: boolean;
  score: number;
  scores: {
    clarity: number;
    specificity: number;
    actionability: number;
    completeness: number;
    uniqueness: number;
  };
  issues: string[];
  recommendation: string;
}

interface SimilarityScore {
  score: number;
  components: {
    title: number;
    problem: number;
    solution: number;
    tags: number;
    type: number;
    code: number;
  };
}

interface DistinctionAnalysis {
  hasMeaningfulDistinction: boolean;
  distinction: string;
  differentDomain: boolean;
  differentApproach: boolean;
  isRefinement: boolean;
  distinctions: string[];
}

interface SimilarityResult {
  filename: string;
  module: ParsedModule;
  similarity: SimilarityScore;
  distinctionAnalysis: DistinctionAnalysis;
}

interface CreationDecision {
  shouldCreate: boolean;
  reason: string;
  action: 'create' | 'skip' | 'create-variant' | 'create-alternative' | 'create-evolution' | 'create-contextual';
  existingModule?: string;
  relatedModule?: string;
  suggestion?: string;
}

export {
  QualityAssessment,
  SimilarityResult,
  CreationDecision
};