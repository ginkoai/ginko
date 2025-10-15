/**
 * @fileType: utility
 * @status: current
 * @updated: 2025-09-29
 * @tags: [bug, context, analysis]
 * @related: [bug-reflection.ts]
 * @priority: high
 * @complexity: medium
 * @dependencies: [fs, path, execSync]
 */

import fs from 'fs/promises';
import path from 'path';
import { execSync } from 'child_process';
import { getGinkoDir } from '../../utils/helpers.js';

export interface BugContext {
  errors: string[];
  stackTraces: string[];
  affectedFiles: string[];
  affectedComponents: string[];
  recentChanges: string[];
  similarBugs: string[];
  probableCause?: string;
  workaround?: string;
}

/**
 * Gathers contextual information for bug analysis
 */
export class BugContextGatherer {
  /**
   * Gather all relevant context for a bug
   */
  async gather(description: string): Promise<BugContext> {
    const context: BugContext = {
      errors: [],
      stackTraces: [],
      affectedFiles: [],
      affectedComponents: [],
      recentChanges: [],
      similarBugs: []
    };

    try {
      // Extract potential file paths from description
      context.affectedFiles = this.extractFilePaths(description);

      // Extract component names
      context.affectedComponents = this.extractComponents(description, context.affectedFiles);

      // Get recent git changes to affected areas
      context.recentChanges = await this.getRecentChanges(context.affectedComponents);

      // Look for similar bugs in history
      context.similarBugs = await this.findSimilarBugs(description);

      // Extract error messages
      context.errors = this.extractErrors(description);

      // Try to identify probable cause from context
      if (context.errors.length > 0 || context.affectedFiles.length > 0) {
        context.probableCause = this.analyzeProbableCause(description, context);
      }

    } catch (error) {
      // Context gathering is best-effort, continue with partial context
      console.error('Warning: Some context gathering failed:', error);
    }

    return context;
  }

  /**
   * Extract file paths mentioned in description
   */
  private extractFilePaths(description: string): string[] {
    const patterns = [
      /(?:^|\s)([a-z0-9_\-/]+\.[a-z]{2,4})/gi,  // file.ext
      /`([^`]+\.[a-z]{2,4})`/g,                    // `file.ext`
      /src\/[a-z0-9_\-/]+\.[a-z]{2,4}/gi          // src/path/file.ext
    ];

    const files = new Set<string>();

    patterns.forEach(pattern => {
      const matches = description.matchAll(pattern);
      for (const match of matches) {
        const file = match[1] || match[0];
        if (file && !file.includes('http')) {
          files.add(file.trim());
        }
      }
    });

    return Array.from(files);
  }

  /**
   * Extract component names from description and file paths
   */
  private extractComponents(description: string, files: string[]): string[] {
    const components = new Set<string>();

    // Extract from file paths (e.g., src/auth/login.ts -> auth)
    files.forEach(file => {
      const parts = file.split('/');
      if (parts.length > 1 && parts[0] === 'src') {
        components.add(parts[1]);
      } else if (parts.length > 0) {
        components.add(parts[0]);
      }
    });

    // Look for common component keywords in description
    const keywords = [
      'auth', 'authentication', 'database', 'db', 'api', 'server',
      'client', 'ui', 'frontend', 'backend', 'config', 'validation',
      'middleware', 'router', 'controller', 'service', 'model'
    ];

    const lower = description.toLowerCase();
    keywords.forEach(keyword => {
      if (lower.includes(keyword)) {
        components.add(keyword);
      }
    });

    return Array.from(components);
  }

  /**
   * Get recent git changes related to components
   */
  private async getRecentChanges(components: string[]): Promise<string[]> {
    if (components.length === 0) return [];

    try {
      const changes: string[] = [];

      for (const component of components.slice(0, 3)) {  // Limit to first 3
        try {
          const log = execSync(
            `git log --oneline --since="2 weeks ago" -- "*${component}*" | head -5`,
            { encoding: 'utf-8', stdio: ['pipe', 'pipe', 'ignore'] }
          ).trim();

          if (log) {
            changes.push(...log.split('\n').filter(Boolean));
          }
        } catch {
          // Skip if git log fails for this component
        }
      }

      return changes.slice(0, 5);  // Return max 5 most recent
    } catch {
      return [];
    }
  }

  /**
   * Find similar bugs in history
   */
  private async findSimilarBugs(description: string): Promise<string[]> {
    try {
      const ginkoDir = await getGinkoDir();
      const bugsDir = path.join(ginkoDir, 'bugs');
      const files = await fs.readdir(bugsDir);

      const bugFiles = files.filter(f => f.startsWith('BUG-') && f.endsWith('.md'));
      const keywords = this.extractKeywords(description);

      const similar: string[] = [];

      for (const file of bugFiles.slice(0, 10)) {  // Check last 10 bugs
        try {
          const content = await fs.readFile(path.join(bugsDir, file), 'utf-8');
          const title = content.match(/^# (BUG-\d+: .+)$/m)?.[1];

          if (title && keywords.some(kw => content.toLowerCase().includes(kw))) {
            similar.push(title);
          }
        } catch {
          // Skip if can't read bug file
        }
      }

      return similar;
    } catch {
      return [];
    }
  }

  /**
   * Extract keywords for similarity matching
   */
  private extractKeywords(text: string): string[] {
    const words = text.toLowerCase()
      .replace(/[^a-z0-9\s]/g, ' ')
      .split(/\s+/)
      .filter(w => w.length > 4);  // Only words longer than 4 chars

    // Remove common words
    const stopWords = new Set([
      'about', 'after', 'before', 'being', 'could', 'should', 'would',
      'there', 'their', 'these', 'those', 'where', 'which', 'while'
    ]);

    return words.filter(w => !stopWords.has(w)).slice(0, 5);
  }

  /**
   * Extract error messages from description
   */
  private extractErrors(description: string): string[] {
    const errors: string[] = [];

    // Look for error patterns
    const patterns = [
      /Error: .+/g,
      /Exception: .+/g,
      /Failed to .+/g,
      /Cannot .+/g,
      /Unable to .+/g
    ];

    patterns.forEach(pattern => {
      const matches = description.matchAll(pattern);
      for (const match of matches) {
        errors.push(match[0]);
      }
    });

    return errors;
  }

  /**
   * Analyze probable cause from context
   */
  private analyzeProbableCause(description: string, context: BugContext): string {
    const causes: string[] = [];

    // Check for timeout issues
    if (description.toLowerCase().includes('timeout')) {
      causes.push('Possible timeout in ' + (context.affectedComponents[0] || 'component'));
    }

    // Check for null/undefined
    if (description.match(/\b(null|undefined|cannot read property)\b/i)) {
      causes.push('Likely null/undefined reference');
    }

    // Check for connection issues
    if (description.match(/\b(connection|connect|refused)\b/i)) {
      causes.push('Connection issue with external service');
    }

    // Check for permission issues
    if (description.match(/\b(permission|forbidden|unauthorized|403|401)\b/i)) {
      causes.push('Permission or authentication issue');
    }

    // Check for not found
    if (description.match(/\b(not found|404|missing)\b/i)) {
      causes.push('Resource not found or misconfigured path');
    }

    if (causes.length > 0) {
      return causes.join('; ');
    }

    // Default analysis
    if (context.recentChanges.length > 0) {
      return 'May be related to recent changes in ' + (context.affectedComponents[0] || 'affected area');
    }

    return 'Requires further investigation';
  }
}