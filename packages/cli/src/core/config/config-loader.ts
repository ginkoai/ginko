/**
 * @fileType: utility
 * @status: current
 * @updated: 2025-09-19
 * @tags: [config, loader, singleton, defaults, caching]
 * @related: [config-schema.ts, path-resolver.ts, config-migrator.ts]
 * @priority: critical
 * @complexity: high
 * @dependencies: [fs, path]
 */

import * as fs from 'fs/promises';
import * as path from 'path';
import {
  GinkoConfig,
  DEFAULT_CONFIG,
  isValidGinkoConfig,
  validateConfig,
  ConfigValidationError,
  PlatformConfig
} from './config-schema.js';
import { PathResolver, ResolverContext } from './path-resolver.js';

/**
 * Configuration Loader with Singleton Pattern
 * Implements ADR-028 First-Use Experience Enhancement Architecture
 */

export interface LoaderOptions {
  /** Project root directory (defaults to cwd) */
  projectRoot?: string;
  /** Configuration file name (defaults to 'ginko.json') */
  configFileName?: string;
  /** Force reload from disk, ignoring cache */
  forceReload?: boolean;
  /** Enable automatic migration */
  autoMigrate?: boolean;
  /** Validation strictness level */
  validation?: 'strict' | 'loose' | 'none';
}

export interface LoadResult {
  /** Loaded configuration */
  config: GinkoConfig;
  /** Path to configuration file */
  configPath: string;
  /** Whether config was loaded from file or defaults */
  fromFile: boolean;
  /** Whether config was migrated */
  migrated: boolean;
  /** Path resolver instance */
  resolver: PathResolver;
  /** Validation warnings */
  warnings: string[];
  /** Load timestamp */
  loadedAt: Date;
}

export class ConfigLoadError extends Error {
  constructor(
    message: string,
    public configPath?: string,
    public cause?: Error
  ) {
    super(message);
    this.name = 'ConfigLoadError';
  }
}

/**
 * ConfigLoader singleton for managing ginko configuration
 */
export class ConfigLoader {
  private static instance: ConfigLoader | null = null;
  private cachedResult: LoadResult | null = null;
  private loadPromise: Promise<LoadResult> | null = null;

  private constructor() {
    // Private constructor for singleton
  }

  /**
   * Get the singleton instance
   */
  static getInstance(): ConfigLoader {
    if (!ConfigLoader.instance) {
      ConfigLoader.instance = new ConfigLoader();
    }
    return ConfigLoader.instance;
  }

  /**
   * Reset the singleton (useful for testing)
   */
  static reset(): void {
    ConfigLoader.instance = null;
  }

  /**
   * Load configuration with caching and graceful fallback
   */
  async load(options: LoaderOptions = {}): Promise<LoadResult> {
    const {
      projectRoot = process.cwd(),
      configFileName = 'ginko.json',
      forceReload = false,
      autoMigrate = true,
      validation = 'strict'
    } = options;

    // Return cached result if available and not forcing reload
    if (this.cachedResult && !forceReload) {
      return this.cachedResult;
    }

    // If already loading, return the same promise
    if (this.loadPromise && !forceReload) {
      return this.loadPromise;
    }

    // Start loading
    this.loadPromise = this.doLoad(projectRoot, configFileName, autoMigrate, validation);

    try {
      const result = await this.loadPromise;
      this.cachedResult = result;
      return result;
    } finally {
      this.loadPromise = null;
    }
  }

  /**
   * Internal loading logic
   */
  private async doLoad(
    projectRoot: string,
    configFileName: string,
    autoMigrate: boolean,
    validation: 'strict' | 'loose' | 'none'
  ): Promise<LoadResult> {
    const configPath = path.join(projectRoot, configFileName);
    const warnings: string[] = [];

    try {
      // Try to load from file
      const fileContent = await fs.readFile(configPath, 'utf-8');
      let config: any;

      try {
        config = JSON.parse(fileContent);
      } catch (parseError) {
        throw new ConfigLoadError(
          `Invalid JSON in configuration file: ${configPath}`,
          configPath,
          parseError instanceof Error ? parseError : new Error('Parse error')
        );
      }

      // Validate configuration
      if (validation !== 'none') {
        const validationResult = validateConfig(config);
        if (!validationResult.valid) {
          if (validation === 'strict') {
            throw new ConfigValidationError(
              `Configuration validation failed: ${validationResult.errors.join(', ')}`
            );
          } else {
            warnings.push(...validationResult.errors);
          }
        }
      }

      // Handle migration if needed
      let migrated = false;
      if (autoMigrate && this.needsMigration(config)) {
        const { ConfigMigrator } = await import('./config-migrator.js');
        const migrator = new ConfigMigrator();
        config = await migrator.migrate(config);
        migrated = true;
        warnings.push('Configuration was automatically migrated to current version');
      }

      // Merge with defaults for any missing fields
      const mergedConfig = this.mergeWithDefaults(config);

      // Create path resolver
      const resolver = this.createPathResolver(mergedConfig);

      return {
        config: mergedConfig,
        configPath,
        fromFile: true,
        migrated,
        resolver,
        warnings,
        loadedAt: new Date()
      };

    } catch (error) {
      if (error instanceof ConfigLoadError || error instanceof ConfigValidationError) {
        throw error;
      }

      // File doesn't exist or other IO error - use defaults
      if (error instanceof Error && 'code' in error && error.code === 'ENOENT') {
        warnings.push(`Configuration file not found at ${configPath}, using defaults`);
      } else {
        warnings.push(`Failed to load configuration: ${error instanceof Error ? error.message : 'Unknown error'}`);
      }

      const defaultConfig = this.createDefaultConfig();
      const resolver = this.createPathResolver(defaultConfig);

      return {
        config: defaultConfig,
        configPath,
        fromFile: false,
        migrated: false,
        resolver,
        warnings,
        loadedAt: new Date()
      };
    }
  }

  /**
   * Save configuration to file
   */
  async save(config: GinkoConfig, options: LoaderOptions = {}): Promise<void> {
    const {
      projectRoot = process.cwd(),
      configFileName = 'ginko.json'
    } = options;

    const configPath = path.join(projectRoot, configFileName);

    // Validate before saving
    const validationResult = validateConfig(config);
    if (!validationResult.valid) {
      throw new ConfigValidationError(
        `Cannot save invalid configuration: ${validationResult.errors.join(', ')}`
      );
    }

    // Update metadata
    const configWithMetadata = {
      ...config,
      metadata: {
        ...config.metadata,
        updatedAt: new Date().toISOString(),
        updatedBy: process.env.USER || process.env.USERNAME || 'unknown'
      }
    };

    try {
      // Ensure directory exists
      await fs.mkdir(path.dirname(configPath), { recursive: true });

      // Write file with pretty formatting
      await fs.writeFile(
        configPath,
        JSON.stringify(configWithMetadata, null, 2) + '\n',
        'utf-8'
      );

      // Clear cache to force reload
      this.cachedResult = null;

    } catch (error) {
      throw new ConfigLoadError(
        `Failed to save configuration to ${configPath}`,
        configPath,
        error instanceof Error ? error : new Error('Unknown error')
      );
    }
  }

  /**
   * Create default configuration with platform detection
   */
  private createDefaultConfig(): GinkoConfig {
    const platform = this.detectPlatform();

    return {
      ...DEFAULT_CONFIG,
      platform,
      metadata: {
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        updatedBy: process.env.USER || process.env.USERNAME || 'unknown',
        migrationHistory: []
      }
    };
  }

  /**
   * Detect current platform configuration
   */
  private detectPlatform(): PlatformConfig {
    const type = PathResolver.detectPlatform();
    const homeDirectory = require('os').homedir();

    // Detect shell
    let shell: PlatformConfig['shell'] = 'bash';
    if (type === 'windows') {
      shell = process.env.ComSpec?.includes('powershell') ? 'powershell' : 'cmd';
    } else {
      shell = path.basename(process.env.SHELL || 'bash') as PlatformConfig['shell'];
    }

    return {
      type,
      shell,
      pathSeparator: path.sep as '/' | '\\',
      homeDirectory,
      specific: this.getPlatformSpecific(type)
    };
  }

  /**
   * Get platform-specific configurations
   */
  private getPlatformSpecific(type: 'windows' | 'macos' | 'linux'): PlatformConfig['specific'] {
    switch (type) {
      case 'windows':
        return {
          windows: {
            useWSL: !!process.env.WSL_DISTRO_NAME,
            wslDistro: process.env.WSL_DISTRO_NAME
          }
        };
      case 'macos':
        return {
          macos: {
            brewPrefix: process.env.HOMEBREW_PREFIX || '/opt/homebrew'
          }
        };
      case 'linux':
        return {
          linux: {
            distribution: this.detectLinuxDistribution()
          }
        };
    }
  }

  /**
   * Detect Linux distribution
   */
  private detectLinuxDistribution(): string {
    try {
      // This is a simplified detection - could be enhanced
      if (process.env.DEBIAN_FRONTEND) return 'debian';
      if (process.env.RHEL_VERSION) return 'rhel';
      return 'unknown';
    } catch {
      return 'unknown';
    }
  }

  /**
   * Check if configuration needs migration
   */
  private needsMigration(config: any): boolean {
    if (!config.version) return true;
    if (config.version !== DEFAULT_CONFIG.version) return true;
    return false;
  }

  /**
   * Merge user configuration with defaults
   */
  private mergeWithDefaults(userConfig: Partial<GinkoConfig>): GinkoConfig {
    const defaultConfig = this.createDefaultConfig();

    return {
      version: userConfig.version || defaultConfig.version,
      paths: {
        docs: { ...defaultConfig.paths.docs, ...userConfig.paths?.docs },
        ginko: { ...defaultConfig.paths.ginko, ...userConfig.paths?.ginko }
      },
      features: { ...defaultConfig.features, ...userConfig.features },
      platform: userConfig.platform || defaultConfig.platform,
      metadata: { ...defaultConfig.metadata, ...userConfig.metadata }
    };
  }

  /**
   * Create path resolver from configuration
   */
  private createPathResolver(config: GinkoConfig): PathResolver {
    // Flatten path configuration for resolver
    const variables: Record<string, string> = {};

    // Add docs paths
    for (const [key, value] of Object.entries(config.paths.docs)) {
      variables[`docs.${key}`] = value;
    }

    // Add ginko paths
    for (const [key, value] of Object.entries(config.paths.ginko)) {
      variables[`ginko.${key}`] = value;
    }

    return PathResolver.create(variables);
  }

  /**
   * Get current configuration without loading
   */
  getCached(): LoadResult | null {
    return this.cachedResult;
  }

  /**
   * Check if configuration exists
   */
  async exists(options: LoaderOptions = {}): Promise<boolean> {
    const {
      projectRoot = process.cwd(),
      configFileName = 'ginko.json'
    } = options;

    const configPath = path.join(projectRoot, configFileName);

    try {
      await fs.access(configPath);
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Initialize a new configuration file
   */
  async initialize(options: LoaderOptions = {}): Promise<LoadResult> {
    const {
      projectRoot = process.cwd(),
      configFileName = 'ginko.json'
    } = options;

    const configPath = path.join(projectRoot, configFileName);

    // Check if file already exists
    if (await this.exists(options)) {
      throw new ConfigLoadError(
        `Configuration file already exists at ${configPath}`,
        configPath
      );
    }

    // Create default configuration
    const config = this.createDefaultConfig();

    // Save to file
    await this.save(config, options);

    // Return load result
    return this.load({ ...options, forceReload: true });
  }

  /**
   * Invalidate cache
   */
  invalidateCache(): void {
    this.cachedResult = null;
  }

  /**
   * Get configuration statistics
   */
  getStats(): {
    cached: boolean;
    loadedAt?: Date;
    configPath?: string;
    fromFile?: boolean;
    migrated?: boolean;
  } {
    if (!this.cachedResult) {
      return { cached: false };
    }

    return {
      cached: true,
      loadedAt: this.cachedResult.loadedAt,
      configPath: this.cachedResult.configPath,
      fromFile: this.cachedResult.fromFile,
      migrated: this.cachedResult.migrated
    };
  }
}

/**
 * Convenience functions for common operations
 */
export namespace ConfigLoaderUtils {
  /**
   * Quick load with defaults
   */
  export async function quickLoad(projectRoot?: string): Promise<GinkoConfig> {
    const loader = ConfigLoader.getInstance();
    const result = await loader.load({ projectRoot });
    return result.config;
  }

  /**
   * Get resolved path from configuration
   */
  export async function getResolvedPath(pathKey: string, projectRoot?: string): Promise<string> {
    const loader = ConfigLoader.getInstance();
    const result = await loader.load({ projectRoot });

    // Parse path key (e.g., "docs.adr" or "ginko.sessions")
    const [category, key] = pathKey.split('.');
    if (!category || !key) {
      throw new Error(`Invalid path key: ${pathKey}. Expected format: "category.key"`);
    }

    const pathTemplate = (result.config.paths as any)[category]?.[key];
    if (!pathTemplate) {
      throw new Error(`Path not found: ${pathKey}`);
    }

    const resolved = result.resolver.resolve(pathTemplate);
    if (!resolved.success) {
      throw new Error(`Failed to resolve path ${pathKey}: ${resolved.errors.join(', ')}`);
    }

    return resolved.resolved;
  }

  /**
   * Check if a feature is enabled
   */
  export async function isFeatureEnabled(feature: string, projectRoot?: string): Promise<boolean> {
    const config = await quickLoad(projectRoot);
    return config.features[feature] === true;
  }

  /**
   * Update a single configuration value
   */
  export async function updateConfig(
    updates: Partial<GinkoConfig>,
    projectRoot?: string
  ): Promise<void> {
    const loader = ConfigLoader.getInstance();
    const result = await loader.load({ projectRoot });

    const updatedConfig = {
      ...result.config,
      ...updates,
      metadata: {
        ...result.config.metadata,
        updatedAt: new Date().toISOString()
      }
    };

    await loader.save(updatedConfig, { projectRoot });
  }
}