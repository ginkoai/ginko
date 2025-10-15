/**
 * @fileType: utility
 * @status: current
 * @updated: 2025-09-20
 * @tags: [config, loader, paths, variables, resolution]
 * @related: [config.ts, init.ts, project-detector.ts]
 * @priority: high
 * @complexity: medium
 * @dependencies: [fs-extra, path]
 */

import fs from 'fs-extra';
import path from 'path';
import os from 'os';
import { GinkoConfig, DEFAULT_CONFIG, PathsConfig, PlatformConfig } from '../../types/config.js';
import { findGinkoRoot } from '../../utils/ginko-root.js';
import { PlatformAdapter } from '../platform/platform-adapter.js';

/**
 * Configuration loader with path resolution and variable substitution
 */
export class ConfigLoader {
  private cachedConfig: GinkoConfig | null = null;
  private configPath: string | null = null;
  private platformAdapter: PlatformAdapter;

  constructor() {
    this.platformAdapter = new PlatformAdapter();
  }

  /**
   * Load ginko configuration from ginko.json or defaults
   */
  async loadConfig(projectRoot?: string): Promise<GinkoConfig> {
    if (this.cachedConfig && this.configPath) {
      return this.cachedConfig;
    }

    const root = projectRoot || await this.findProjectRoot();
    const configFile = path.join(root, 'ginko.json');

    let config: GinkoConfig;

    if (await fs.pathExists(configFile)) {
      try {
        const rawConfig = await fs.readJSON(configFile);
        config = this.mergeWithDefaults(rawConfig);
        this.configPath = configFile;
      } catch (error) {
        console.warn(`Warning: Could not parse ginko.json, using defaults. Error: ${error}`);
        config = { ...DEFAULT_CONFIG };
      }
    } else {
      config = { ...DEFAULT_CONFIG };
    }

    // Apply platform-specific settings
    config = this.applyPlatformDefaults(config);

    // Resolve path variables
    config.paths = this.resolvePathVariables(config.paths);

    this.cachedConfig = config;
    return config;
  }

  /**
   * Save configuration to ginko.json
   */
  async saveConfig(config: GinkoConfig, projectRoot?: string): Promise<void> {
    const root = projectRoot || await this.findProjectRoot();
    const configFile = path.join(root, 'ginko.json');

    // Don't save resolved paths, keep variables for portability
    const configToSave = {
      ...config,
      paths: this.unresolvePathVariables(config.paths)
    };

    await fs.writeJSON(configFile, configToSave, { spaces: 2 });
    this.configPath = configFile;
    this.cachedConfig = config; // Keep resolved version in cache
  }

  /**
   * Resolve path variables like ${docs.root}/adr
   */
  private resolvePathVariables(paths: PathsConfig): PathsConfig {
    const resolved = JSON.parse(JSON.stringify(paths)); // Deep clone

    // First pass: resolve root paths
    for (const [category, categoryPaths] of Object.entries(resolved)) {
      if (typeof categoryPaths === 'object') {
        for (const [key, value] of Object.entries(categoryPaths)) {
          if (typeof value === 'string' && !value.includes('${')) {
            // Already resolved or no variables
            continue;
          }
        }
      }
    }

    // Second pass: resolve dependent paths
    const maxIterations = 5; // Prevent infinite loops
    for (let i = 0; i < maxIterations; i++) {
      let hasUnresolved = false;

      for (const [category, categoryPaths] of Object.entries(resolved)) {
        if (typeof categoryPaths === 'object') {
          for (const [key, value] of Object.entries(categoryPaths)) {
            if (typeof value === 'string' && value.includes('${')) {
              const resolvedValue = this.substituteVariables(value, resolved);
              if (resolvedValue !== value) {
                (categoryPaths as any)[key] = resolvedValue;
              } else {
                hasUnresolved = true;
              }
            }
          }
        }
      }

      if (!hasUnresolved) break;
    }

    return resolved;
  }

  /**
   * Convert resolved paths back to variables for saving
   */
  private unresolvePathVariables(paths: PathsConfig): PathsConfig {
    // Return the original variable-based format
    // This is a simplified approach - in practice, we'd track original vs resolved
    return {
      docs: {
        root: "docs",
        adr: "${docs.root}/adr",
        prd: "${docs.root}/PRD",
        sprints: "${docs.root}/sprints"
      },
      ginko: {
        root: ".ginko",
        context: "${ginko.root}/context",
        sessions: "${ginko.root}/sessions",
        backlog: "${ginko.root}/backlog",
        patterns: "${ginko.root}/patterns",
        bestPractices: "${ginko.root}/best-practices"
      }
    };
  }

  /**
   * Substitute variables in a path string
   */
  private substituteVariables(template: string, paths: PathsConfig): string {
    let result = template;

    // Replace ${category.key} with actual values
    const variableRegex = /\$\{([^}]+)\}/g;
    result = result.replace(variableRegex, (match, variable) => {
      const [category, key] = variable.split('.');

      if (paths[category] && typeof paths[category] === 'object') {
        const value = (paths[category] as any)[key];
        if (typeof value === 'string' && !value.includes('${')) {
          return value;
        }
      }

      return match; // Keep unresolved
    });

    return result;
  }

  /**
   * Apply platform-specific configuration defaults
   */
  private applyPlatformDefaults(config: GinkoConfig): GinkoConfig {
    const platformConfig = this.platformAdapter.getPlatformConfig();

    const enhancedPlatformConfig: PlatformConfig = {
      platform: platformConfig.platform,
      hookExtension: platformConfig.hookExtension as '.bat' | '.sh',
      shellExtension: platformConfig.shellExtension as '.bat' | '.sh',
      pathSeparator: platformConfig.pathSeparator as '/' | '\\',
      homeDirectory: platformConfig.homeDirectory,
      claudeConfigPath: platformConfig.claudeConfigPath,
      hookDirectory: platformConfig.hookDirectory,
      autoDetect: config.platform?.autoDetect ?? true,
      migrationSettings: {
        backupOriginal: config.platform?.migrationSettings?.backupOriginal ?? true,
        preserveComments: config.platform?.migrationSettings?.preserveComments ?? true,
        addPlatformHeader: config.platform?.migrationSettings?.addPlatformHeader ?? true,
        ...config.platform?.migrationSettings
      }
    };

    return {
      ...config,
      platform: enhancedPlatformConfig
    };
  }

  /**
   * Get platform adapter for external access
   */
  getPlatformAdapter(): PlatformAdapter {
    return this.platformAdapter;
  }

  /**
   * Merge user config with defaults
   */
  private mergeWithDefaults(userConfig: Partial<GinkoConfig>): GinkoConfig {
    return {
      version: userConfig.version || DEFAULT_CONFIG.version,
      paths: {
        docs: {
          ...DEFAULT_CONFIG.paths.docs,
          ...userConfig.paths?.docs
        },
        ginko: {
          ...DEFAULT_CONFIG.paths.ginko,
          ...userConfig.paths?.ginko
        }
      },
      features: {
        ...DEFAULT_CONFIG.features,
        ...userConfig.features
      },
      platform: userConfig.platform,
      naming: {
        ...DEFAULT_CONFIG.naming,
        ...userConfig.naming,
        types: {
          ...DEFAULT_CONFIG.naming?.types,
          ...userConfig.naming?.types
        }
      }
    };
  }

  /**
   * Find project root (git root or current directory)
   */
  private async findProjectRoot(): Promise<string> {
    try {
      const ginkoRoot = await findGinkoRoot();
      if (ginkoRoot) {
        return ginkoRoot;
      }
    } catch (error) {
      // Continue to fallback
    }

    return process.cwd();
  }

  /**
   * Get resolved path for a specific type
   */
  async getPath(type: string, subpath?: string): Promise<string> {
    const config = await this.loadConfig();

    // Handle ginko paths
    if (type.startsWith('ginko.')) {
      const key = type.substring(6); // Remove 'ginko.'
      const basePath = (config.paths.ginko as any)[key];
      if (!basePath) {
        throw new Error(`Unknown ginko path: ${type}`);
      }
      return subpath ? path.join(basePath, subpath) : basePath;
    }

    // Handle docs paths
    if (type.startsWith('docs.')) {
      const key = type.substring(5); // Remove 'docs.'
      const basePath = (config.paths.docs as any)[key];
      if (!basePath) {
        throw new Error(`Unknown docs path: ${type}`);
      }
      return subpath ? path.join(basePath, subpath) : basePath;
    }

    // Handle document type paths from naming config
    if (config.naming?.types?.[type]) {
      const docType = config.naming.types[type];
      const resolvedPath = this.substituteVariables(docType.path, config.paths);
      return subpath ? path.join(resolvedPath, subpath) : resolvedPath;
    }

    throw new Error(`Unknown path type: ${type}`);
  }

  /**
   * Ensure all configured paths exist
   */
  async ensurePaths(): Promise<void> {
    const config = await this.loadConfig();
    const pathsToCreate = [
      ...Object.values(config.paths.ginko),
      ...Object.values(config.paths.docs)
    ];

    for (const pathStr of pathsToCreate) {
      if (typeof pathStr === 'string' && !pathStr.includes('${')) {
        await fs.ensureDir(pathStr);
      }
    }
  }

  /**
   * Clear cached configuration (for testing)
   */
  clearCache(): void {
    this.cachedConfig = null;
    this.configPath = null;
  }
}

// Export singleton instance
export const configLoader = new ConfigLoader();