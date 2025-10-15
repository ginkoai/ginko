/**
 * @fileType: utility
 * @status: current
 * @updated: 2025-09-19
 * @tags: [path, resolver, variables, substitution, cross-platform]
 * @related: [config-schema.ts, config-loader.ts]
 * @priority: critical
 * @complexity: high
 * @dependencies: [path, os]
 */

import * as path from 'path';
import * as os from 'os';

/**
 * Path Resolution with Variable Substitution
 * Supports ${variable} syntax with cross-platform compatibility
 * Implements ADR-028 First-Use Experience Enhancement Architecture
 */

export interface ResolverContext {
  /** Base variables available for substitution */
  variables: Record<string, string>;
  /** Environment variables (process.env) */
  env: Record<string, string | undefined>;
  /** Platform information */
  platform: {
    type: 'windows' | 'macos' | 'linux';
    separator: string;
    homeDir: string;
  };
}

export interface ResolutionResult {
  /** Resolved path */
  resolved: string;
  /** Original template path */
  original: string;
  /** Variables that were substituted */
  substituted: Array<{ variable: string; value: string }>;
  /** Variables that were not found */
  missing: string[];
  /** Whether resolution was successful */
  success: boolean;
  /** Any errors encountered */
  errors: string[];
}

export class CircularReferenceError extends Error {
  constructor(variable: string, path: string[]) {
    super(`Circular reference detected: ${variable} -> ${path.join(' -> ')}`);
    this.name = 'CircularReferenceError';
  }
}

export class VariableNotFoundError extends Error {
  constructor(variable: string, availableVars: string[]) {
    super(`Variable '${variable}' not found. Available: ${availableVars.join(', ')}`);
    this.name = 'VariableNotFoundError';
  }
}

/**
 * PathResolver handles variable substitution in configuration paths
 */
export class PathResolver {
  private context: ResolverContext;
  private resolutionCache = new Map<string, ResolutionResult>();

  constructor(context: ResolverContext) {
    this.context = context;
  }

  /**
   * Create a PathResolver with platform detection
   */
  static create(variables: Record<string, string> = {}): PathResolver {
    const platform = {
      type: PathResolver.detectPlatform(),
      separator: path.sep,
      homeDir: os.homedir()
    };

    const context: ResolverContext = {
      variables: {
        // Built-in variables
        'platform.home': platform.homeDir,
        'platform.sep': platform.separator,
        'platform.type': platform.type,
        // User-provided variables
        ...variables
      },
      env: process.env,
      platform
    };

    return new PathResolver(context);
  }

  /**
   * Detect the current platform
   */
  static detectPlatform(): 'windows' | 'macos' | 'linux' {
    switch (process.platform) {
      case 'win32': return 'windows';
      case 'darwin': return 'macos';
      default: return 'linux';
    }
  }

  /**
   * Resolve a path with variable substitution
   */
  resolve(pathTemplate: string): ResolutionResult {
    // Check cache first
    const cacheKey = this.getCacheKey(pathTemplate);
    if (this.resolutionCache.has(cacheKey)) {
      return this.resolutionCache.get(cacheKey)!;
    }

    const result = this.doResolve(pathTemplate);

    // Cache successful resolutions
    if (result.success) {
      this.resolutionCache.set(cacheKey, result);
    }

    return result;
  }

  /**
   * Resolve multiple paths at once
   */
  resolveMultiple(pathTemplates: Record<string, string>): Record<string, ResolutionResult> {
    const results: Record<string, ResolutionResult> = {};

    for (const [key, template] of Object.entries(pathTemplates)) {
      results[key] = this.resolve(template);
    }

    return results;
  }

  /**
   * Internal resolution logic
   */
  private doResolve(pathTemplate: string, visited = new Set<string>()): ResolutionResult {
    const result: ResolutionResult = {
      resolved: pathTemplate,
      original: pathTemplate,
      substituted: [],
      missing: [],
      success: true,
      errors: []
    };

    try {
      // Find all variables in the template
      const variables = this.extractVariables(pathTemplate);

      if (variables.length === 0) {
        // No variables to substitute, normalize the path
        result.resolved = this.normalizePath(pathTemplate);
        return result;
      }

      // Check for circular references
      for (const variable of variables) {
        if (visited.has(variable)) {
          throw new CircularReferenceError(variable, Array.from(visited));
        }
      }

      let resolvedPath = pathTemplate;

      // Substitute each variable
      for (const variable of variables) {
        const value = this.getVariableValue(variable, visited);

        if (value === undefined) {
          result.missing.push(variable);
          result.success = false;
          continue;
        }

        const pattern = new RegExp(`\\$\\{${this.escapeRegex(variable)}\\}`, 'g');
        resolvedPath = resolvedPath.replace(pattern, value);

        result.substituted.push({ variable, value });
      }

      if (result.success) {
        result.resolved = this.normalizePath(resolvedPath);
      }

    } catch (error) {
      result.success = false;
      result.errors.push(error instanceof Error ? error.message : 'Unknown error');
    }

    return result;
  }

  /**
   * Extract variables from a path template
   */
  private extractVariables(pathTemplate: string): string[] {
    const variablePattern = /\$\{([^}]+)\}/g;
    const variables: string[] = [];
    let match;

    while ((match = variablePattern.exec(pathTemplate)) !== null) {
      variables.push(match[1]);
    }

    return variables;
  }

  /**
   * Get the value of a variable with recursive resolution
   */
  private getVariableValue(variable: string, visited: Set<string>): string | undefined {
    // Check environment variables first
    if (variable.startsWith('env.')) {
      const envVar = variable.substring(4);
      return this.context.env[envVar];
    }

    // Check context variables
    const value = this.context.variables[variable];
    if (value === undefined) {
      return undefined;
    }

    // If the value contains variables, resolve them recursively
    if (this.hasVariables(value)) {
      const newVisited = new Set([...visited, variable]);
      const result = this.doResolve(value, newVisited);
      return result.success ? result.resolved : undefined;
    }

    return value;
  }

  /**
   * Check if a string contains variables
   */
  private hasVariables(str: string): boolean {
    return /\$\{[^}]+\}/.test(str);
  }

  /**
   * Normalize path for the current platform
   */
  private normalizePath(pathStr: string): string {
    // Convert path separators to platform-specific
    let normalized = pathStr.replace(/[\/\\]/g, path.sep);

    // Resolve relative paths
    normalized = path.resolve(normalized);

    return normalized;
  }

  /**
   * Escape special regex characters
   */
  private escapeRegex(str: string): string {
    return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  }

  /**
   * Generate cache key for path template
   */
  private getCacheKey(pathTemplate: string): string {
    // Include variables in cache key to handle context changes
    const varsHash = JSON.stringify(this.context.variables);
    return `${pathTemplate}:${varsHash}`;
  }

  /**
   * Update the resolver context
   */
  updateContext(newVariables: Record<string, string>): void {
    this.context.variables = { ...this.context.variables, ...newVariables };
    this.resolutionCache.clear(); // Clear cache when context changes
  }

  /**
   * Get all available variables
   */
  getAvailableVariables(): string[] {
    return [
      ...Object.keys(this.context.variables),
      ...Object.keys(this.context.env).map(key => `env.${key}`)
    ];
  }

  /**
   * Validate that all variables in a path can be resolved
   */
  validatePath(pathTemplate: string): { valid: boolean; errors: string[] } {
    const result = this.resolve(pathTemplate);

    if (result.success) {
      return { valid: true, errors: [] };
    }

    const errors: string[] = [];

    if (result.missing.length > 0) {
      errors.push(`Missing variables: ${result.missing.join(', ')}`);
    }

    errors.push(...result.errors);

    return { valid: false, errors };
  }

  /**
   * Get resolution statistics
   */
  getStats(): {
    cacheSize: number;
    availableVariables: number;
    platformInfo: typeof this.context.platform;
  } {
    return {
      cacheSize: this.resolutionCache.size,
      availableVariables: this.getAvailableVariables().length,
      platformInfo: this.context.platform
    };
  }

  /**
   * Clear the resolution cache
   */
  clearCache(): void {
    this.resolutionCache.clear();
  }
}

/**
 * Utility functions for path resolution
 */
export namespace PathResolverUtils {
  /**
   * Check if a path template is valid (contains only supported variable syntax)
   */
  export function isValidTemplate(pathTemplate: string): boolean {
    // Check for balanced braces
    const openBraces = (pathTemplate.match(/\$\{/g) || []).length;
    const closeBraces = (pathTemplate.match(/\}/g) || []).length;

    if (openBraces !== closeBraces) {
      return false;
    }

    // Check for valid variable names (alphanumeric, dots, underscores)
    const variablePattern = /\$\{([^}]+)\}/g;
    let match;

    while ((match = variablePattern.exec(pathTemplate)) !== null) {
      const varName = match[1];
      if (!/^[a-zA-Z0-9_.]+$/.test(varName)) {
        return false;
      }
    }

    return true;
  }

  /**
   * Extract all unique variables from a set of path templates
   */
  export function extractAllVariables(pathTemplates: Record<string, string>): string[] {
    const variables = new Set<string>();

    for (const template of Object.values(pathTemplates)) {
      const templateVars = PathResolver.prototype['extractVariables'].call(
        { extractVariables: PathResolver.prototype['extractVariables'] },
        template
      );
      templateVars.forEach(v => variables.add(v));
    }

    return Array.from(variables);
  }

  /**
   * Create a dependency graph of variables
   */
  export function createDependencyGraph(
    pathTemplates: Record<string, string>
  ): Record<string, string[]> {
    const graph: Record<string, string[]> = {};

    for (const [key, template] of Object.entries(pathTemplates)) {
      const resolver = new PathResolver({
        variables: {},
        env: {},
        platform: { type: 'linux', separator: '/', homeDir: '/home/user' }
      });

      const variables = resolver['extractVariables'](template);
      graph[key] = variables;
    }

    return graph;
  }

  /**
   * Detect potential circular references in path templates
   */
  export function detectCircularReferences(
    pathTemplates: Record<string, string>
  ): string[] {
    const graph = createDependencyGraph(pathTemplates);
    const issues: string[] = [];

    function hasCycle(node: string, visited: Set<string>, path: string[]): boolean {
      if (path.includes(node)) {
        issues.push(`Circular reference: ${[...path, node].join(' -> ')}`);
        return true;
      }

      if (visited.has(node)) {
        return false;
      }

      visited.add(node);
      const dependencies = graph[node] || [];

      for (const dep of dependencies) {
        if (hasCycle(dep, visited, [...path, node])) {
          return true;
        }
      }

      return false;
    }

    const visited = new Set<string>();
    for (const node of Object.keys(graph)) {
      if (!visited.has(node)) {
        hasCycle(node, visited, []);
      }
    }

    return issues;
  }
}