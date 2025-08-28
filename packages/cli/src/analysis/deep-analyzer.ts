/**
 * @fileType: utility
 * @status: current
 * @updated: 2025-08-28
 * @tags: [analysis, deep-scan, project-intelligence, patterns]
 * @related: [project-analyzer.ts, init.ts]
 * @priority: high
 * @complexity: high
 * @dependencies: [fs-extra, glob]
 */

import fs from 'fs-extra';
import path from 'path';
import glob from 'glob';
import { ProjectContext } from '../templates/ai-instructions-template.js';

export interface DeepAnalysisResult extends ProjectContext {
  patterns: PatternMatch[];
  dependencies: DependencyInfo[];
  codeMetrics: CodeMetrics;
  suggestions: string[];
  commonIssues: string[];
  bestPractices: string[];
}

interface PatternMatch {
  pattern: string;
  description: string;
  files: string[];
  confidence: 'high' | 'medium' | 'low';
}

interface DependencyInfo {
  name: string;
  version: string;
  type: 'production' | 'development' | 'peer';
  hasKnownIssues: boolean;
  suggestions?: string[];
}

interface CodeMetrics {
  totalFiles: number;
  totalLines: number;
  languages: Record<string, number>;
  testCoverage: number | null;
  complexity: 'low' | 'medium' | 'high';
  componentCount?: number;
  apiEndpoints?: number;
}

export class DeepAnalyzer {
  private projectRoot: string;
  private cache: Map<string, any> = new Map();

  constructor(projectRoot: string) {
    this.projectRoot = projectRoot;
  }

  async analyze(): Promise<DeepAnalysisResult> {
    console.log('🔍 Starting deep project analysis...');
    
    // Start with basic analysis
    const { ProjectAnalyzer } = await import('./project-analyzer.js');
    const basicAnalysis = await ProjectAnalyzer.quickAnalyze(this.projectRoot);
    
    // Perform deep analysis
    const [patterns, dependencies, codeMetrics] = await Promise.all([
      this.detectPatterns(),
      this.analyzeDependencies(),
      this.calculateMetrics(),
    ]);
    
    // Generate insights
    const suggestions = this.generateSuggestions(patterns, dependencies, codeMetrics);
    const commonIssues = this.detectCommonIssues(patterns, dependencies);
    const bestPractices = this.suggestBestPractices(basicAnalysis, patterns);
    
    return {
      ...basicAnalysis,
      patterns,
      dependencies,
      codeMetrics,
      suggestions,
      commonIssues,
      bestPractices,
    };
  }

  private async detectPatterns(): Promise<PatternMatch[]> {
    const patterns: PatternMatch[] = [];
    
    // Check for React patterns
    const reactFiles = glob.sync('**/*.{jsx,tsx}', {
      cwd: this.projectRoot,
      ignore: ['node_modules/**', 'dist/**', 'build/**'],
    });
    
    if (reactFiles.length > 0) {
      // Check for hooks
      const hookFiles = reactFiles.filter(f => f.includes('use') || f.includes('hook'));
      if (hookFiles.length > 0) {
        patterns.push({
          pattern: 'React Hooks',
          description: 'Custom React hooks detected',
          files: hookFiles.slice(0, 5),
          confidence: 'high',
        });
      }
      
      // Check for context providers
      const contextFiles = await this.findFilesWithContent('createContext', reactFiles);
      if (contextFiles.length > 0) {
        patterns.push({
          pattern: 'Context API',
          description: 'React Context API usage detected',
          files: contextFiles.slice(0, 5),
          confidence: 'high',
        });
      }
    }
    
    // Check for API patterns
    const apiPatterns = [
      { glob: '**/api/**/*.{js,ts}', pattern: 'API Routes', description: 'API route handlers detected' },
      { glob: '**/controllers/**/*.{js,ts}', pattern: 'MVC Controllers', description: 'MVC controller pattern detected' },
      { glob: '**/models/**/*.{js,ts}', pattern: 'Data Models', description: 'Data model definitions detected' },
      { glob: '**/services/**/*.{js,ts}', pattern: 'Service Layer', description: 'Service layer pattern detected' },
    ];
    
    for (const { glob: globPattern, pattern, description } of apiPatterns) {
      const files = glob.sync(globPattern, {
        cwd: this.projectRoot,
        ignore: ['node_modules/**', 'dist/**', 'build/**'],
      });
      
      if (files.length > 0) {
        patterns.push({
          pattern,
          description,
          files: files.slice(0, 5),
          confidence: files.length > 2 ? 'high' : 'medium',
        });
      }
    }
    
    // Check for testing patterns
    const testFiles = glob.sync('**/*.{test,spec}.{js,jsx,ts,tsx}', {
      cwd: this.projectRoot,
      ignore: ['node_modules/**'],
    });
    
    if (testFiles.length > 0) {
      const hasE2E = testFiles.some(f => f.includes('e2e') || f.includes('integration'));
      const hasUnit = testFiles.some(f => !f.includes('e2e') && !f.includes('integration'));
      
      if (hasE2E) {
        patterns.push({
          pattern: 'E2E Testing',
          description: 'End-to-end tests detected',
          files: testFiles.filter(f => f.includes('e2e')).slice(0, 3),
          confidence: 'high',
        });
      }
      
      if (hasUnit) {
        patterns.push({
          pattern: 'Unit Testing',
          description: 'Unit tests detected',
          files: testFiles.filter(f => !f.includes('e2e')).slice(0, 3),
          confidence: 'high',
        });
      }
    }
    
    return patterns;
  }

  private async analyzeDependencies(): Promise<DependencyInfo[]> {
    const dependencies: DependencyInfo[] = [];
    const packageJsonPath = path.join(this.projectRoot, 'package.json');
    
    if (!await fs.pathExists(packageJsonPath)) {
      return dependencies;
    }
    
    const packageJson = await fs.readJSON(packageJsonPath);
    
    // Analyze production dependencies
    for (const [name, version] of Object.entries(packageJson.dependencies || {})) {
      const info: DependencyInfo = {
        name,
        version: version as string,
        type: 'production',
        hasKnownIssues: false,
      };
      
      // Check for commonly problematic dependencies
      if (this.hasKnownIssues(name, version as string)) {
        info.hasKnownIssues = true;
        info.suggestions = this.getDependencySuggestions(name, version as string);
      }
      
      dependencies.push(info);
    }
    
    // Analyze dev dependencies (only major ones)
    const importantDevDeps = ['typescript', 'eslint', 'prettier', 'jest', 'vitest', 'webpack', 'vite'];
    for (const [name, version] of Object.entries(packageJson.devDependencies || {})) {
      if (importantDevDeps.some(dep => name.includes(dep))) {
        dependencies.push({
          name,
          version: version as string,
          type: 'development',
          hasKnownIssues: false,
        });
      }
    }
    
    return dependencies;
  }

  private async calculateMetrics(): Promise<CodeMetrics> {
    const metrics: CodeMetrics = {
      totalFiles: 0,
      totalLines: 0,
      languages: {},
      testCoverage: null,
      complexity: 'low',
    };
    
    // Count files by extension
    const extensions = ['.js', '.jsx', '.ts', '.tsx', '.py', '.go', '.rs', '.java', '.css', '.scss'];
    
    for (const ext of extensions) {
      const files = glob.sync(`**/*${ext}`, {
        cwd: this.projectRoot,
        ignore: ['node_modules/**', 'dist/**', 'build/**', '.git/**'],
      });
      
      if (files.length > 0) {
        const language = this.getLanguageFromExtension(ext);
        metrics.languages[language] = files.length;
        metrics.totalFiles += files.length;
        
        // Estimate lines (rough approximation)
        for (const file of files.slice(0, 10)) {
          try {
            const content = await fs.readFile(path.join(this.projectRoot, file), 'utf-8');
            metrics.totalLines += content.split('\n').length;
          } catch (e) {
            // Skip files that can't be read
          }
        }
      }
    }
    
    // Estimate complexity based on file count and structure
    if (metrics.totalFiles > 500) {
      metrics.complexity = 'high';
    } else if (metrics.totalFiles > 100) {
      metrics.complexity = 'medium';
    }
    
    // Count React components
    const componentFiles = glob.sync('**/*.{jsx,tsx}', {
      cwd: this.projectRoot,
      ignore: ['node_modules/**', 'dist/**', 'build/**', '*.test.*', '*.spec.*'],
    });
    
    if (componentFiles.length > 0) {
      metrics.componentCount = componentFiles.length;
    }
    
    // Count API endpoints (heuristic)
    const apiFiles = glob.sync('**/api/**/*.{js,ts}', {
      cwd: this.projectRoot,
      ignore: ['node_modules/**', 'dist/**', 'build/**'],
    });
    
    if (apiFiles.length > 0) {
      metrics.apiEndpoints = apiFiles.length * 2; // Rough estimate
    }
    
    return metrics;
  }

  private async findFilesWithContent(searchTerm: string, files: string[]): Promise<string[]> {
    const matches: string[] = [];
    
    for (const file of files.slice(0, 20)) { // Limit search for performance
      try {
        const content = await fs.readFile(path.join(this.projectRoot, file), 'utf-8');
        if (content.includes(searchTerm)) {
          matches.push(file);
        }
      } catch (e) {
        // Skip files that can't be read
      }
    }
    
    return matches;
  }

  private hasKnownIssues(dep: string, version: string): boolean {
    // Check for known problematic dependencies
    const problematic = {
      'moment': 'Large bundle size, consider date-fns or dayjs',
      'lodash': 'Large bundle size if not tree-shaken properly',
      'request': 'Deprecated, use fetch or axios',
      'node-sass': 'Deprecated, use sass (Dart Sass)',
    };
    
    return dep in problematic;
  }

  private getDependencySuggestions(dep: string, version: string): string[] {
    const suggestions: Record<string, string[]> = {
      'moment': ['Consider migrating to date-fns or dayjs for smaller bundle size'],
      'lodash': ['Use lodash-es for tree-shaking', 'Consider native JavaScript alternatives'],
      'request': ['Migrate to node-fetch or axios'],
      'node-sass': ['Migrate to sass (Dart Sass)'],
    };
    
    return suggestions[dep] || [];
  }

  private generateSuggestions(
    patterns: PatternMatch[],
    dependencies: DependencyInfo[],
    metrics: CodeMetrics
  ): string[] {
    const suggestions: string[] = [];
    
    // Testing suggestions
    const hasTests = patterns.some(p => p.pattern.includes('Testing'));
    if (!hasTests && metrics.totalFiles > 10) {
      suggestions.push('Consider adding tests to improve code reliability');
    }
    
    // TypeScript suggestion
    const hasTypeScript = 'TypeScript' in metrics.languages;
    if (!hasTypeScript && metrics.complexity !== 'low') {
      suggestions.push('Consider adopting TypeScript for better type safety');
    }
    
    // Code organization
    const hasServiceLayer = patterns.some(p => p.pattern === 'Service Layer');
    if (!hasServiceLayer && metrics.apiEndpoints && metrics.apiEndpoints > 5) {
      suggestions.push('Consider implementing a service layer for better code organization');
    }
    
    // Bundle size
    const hasProblematicDeps = dependencies.some(d => d.hasKnownIssues);
    if (hasProblematicDeps) {
      suggestions.push('Review dependencies with known issues for potential optimizations');
    }
    
    return suggestions;
  }

  private detectCommonIssues(patterns: PatternMatch[], dependencies: DependencyInfo[]): string[] {
    const issues: string[] = [];
    
    // Check for missing patterns
    const hasErrorHandling = patterns.some(p => 
      p.pattern.includes('Error') || p.pattern.includes('Exception')
    );
    if (!hasErrorHandling) {
      issues.push('No centralized error handling detected');
    }
    
    // Check dependencies
    const problematicDeps = dependencies.filter(d => d.hasKnownIssues);
    if (problematicDeps.length > 0) {
      issues.push(`${problematicDeps.length} dependencies with known issues detected`);
    }
    
    return issues;
  }

  private suggestBestPractices(
    context: ProjectContext,
    patterns: PatternMatch[]
  ): string[] {
    const practices: string[] = [];
    
    if (context.frameworks.includes('react')) {
      practices.push('Use React.memo for expensive components');
      practices.push('Implement error boundaries for graceful error handling');
      
      const hasContext = patterns.some(p => p.pattern === 'Context API');
      if (hasContext) {
        practices.push('Consider splitting contexts to avoid unnecessary re-renders');
      }
    }
    
    if (context.projectType === 'api') {
      practices.push('Implement rate limiting for API endpoints');
      practices.push('Use API versioning for backward compatibility');
      practices.push('Add request validation middleware');
    }
    
    if (context.hasTests) {
      practices.push('Maintain test coverage above 80%');
      practices.push('Write tests before fixing bugs');
    }
    
    return practices;
  }

  private getLanguageFromExtension(ext: string): string {
    const map: Record<string, string> = {
      '.js': 'JavaScript',
      '.jsx': 'React JSX',
      '.ts': 'TypeScript',
      '.tsx': 'React TSX',
      '.py': 'Python',
      '.go': 'Go',
      '.rs': 'Rust',
      '.java': 'Java',
      '.css': 'CSS',
      '.scss': 'SCSS',
    };
    
    return map[ext] || 'Unknown';
  }

  // Cache analysis results
  async cacheResults(results: DeepAnalysisResult): Promise<void> {
    const cacheDir = path.join(this.projectRoot, '.ginko', '.cache');
    await fs.ensureDir(cacheDir);
    
    const cacheFile = path.join(cacheDir, 'deep-analysis.json');
    const cacheData = {
      timestamp: new Date().toISOString(),
      results,
    };
    
    await fs.writeJSON(cacheFile, cacheData, { spaces: 2 });
  }

  // Load cached results if recent
  async loadCache(): Promise<DeepAnalysisResult | null> {
    const cacheFile = path.join(this.projectRoot, '.ginko', '.cache', 'deep-analysis.json');
    
    if (!await fs.pathExists(cacheFile)) {
      return null;
    }
    
    const cache = await fs.readJSON(cacheFile);
    const cacheAge = Date.now() - new Date(cache.timestamp).getTime();
    
    // Cache valid for 1 hour
    if (cacheAge < 3600000) {
      console.log('📦 Using cached analysis results');
      return cache.results;
    }
    
    return null;
  }
}