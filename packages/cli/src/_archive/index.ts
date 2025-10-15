/**
 * @fileType: utility
 * @status: current
 * @updated: 2025-09-19
 * @tags: [config, exports, index, configuration-system]
 * @related: [config-schema.ts, config-loader.ts, path-resolver.ts, config-migrator.ts]
 * @priority: critical
 * @complexity: low
 * @dependencies: []
 */

/**
 * Configuration System Exports
 * Complete configuration management for Ginko CLI
 * Implements ADR-028 First-Use Experience Enhancement Architecture
 */

// Import core classes for type definitions
import { ConfigLoader } from './config-loader.js';
import { PathResolver } from './path-resolver.js';
import { ConfigMigrator } from './config-migrator.js';

// Core configuration types and schemas
export type {
  GinkoConfig,
  PlatformConfig,
  PathConfiguration,
  FeatureFlags,
  ConfigMigration,
  SupportedVersion
} from './config-schema.js';

export {
  DEFAULT_CONFIG,
  GINKO_CONFIG_SCHEMA,
  SUPPORTED_CONFIG_VERSIONS,
  isValidGinkoConfig,
  isPlatformConfig,
  validateConfig,
  ConfigValidationError
} from './config-schema.js';

// Path resolution with variable substitution
export type {
  ResolverContext,
  ResolutionResult
} from './path-resolver.js';

export {
  PathResolver,
  CircularReferenceError,
  VariableNotFoundError,
  PathResolverUtils
} from './path-resolver.js';

// Configuration loading and caching
export type {
  LoaderOptions,
  LoadResult
} from './config-loader.js';

export {
  ConfigLoader,
  ConfigLoadError,
  ConfigLoaderUtils
} from './config-loader.js';

// Configuration migration system
export type {
  MigrationResult,
  MigrationOptions
} from './config-migrator.js';

export {
  ConfigMigrator,
  MigrationError,
  MigrationUtils
} from './config-migrator.js';

/**
 * Quick-start configuration utilities
 * These provide convenient access to common configuration operations
 */

/**
 * Initialize a new ginko configuration in the current directory
 *
 * @param projectRoot - Project root directory (defaults to cwd)
 * @param options - Configuration options
 * @returns Promise<LoadResult> - The initialized configuration
 *
 * @example
 * ```typescript
 * import { initializeConfig } from './config';
 *
 * const result = await initializeConfig();
 * console.log('Configuration initialized:', result.configPath);
 * ```
 */
export async function initializeConfig(
  projectRoot?: string,
  options?: Partial<LoaderOptions>
): Promise<LoadResult> {
  const loader = ConfigLoader.getInstance();
  return loader.initialize({ projectRoot, ...options });
}

/**
 * Load configuration with automatic migration and defaults
 *
 * @param projectRoot - Project root directory (defaults to cwd)
 * @param options - Loading options
 * @returns Promise<LoadResult> - The loaded configuration with resolver
 *
 * @example
 * ```typescript
 * import { loadConfig } from './config';
 *
 * const result = await loadConfig();
 * const docsPath = result.resolver.resolve('${docs.root}');
 * ```
 */
export async function loadConfig(
  projectRoot?: string,
  options?: Partial<LoaderOptions>
): Promise<LoadResult> {
  const loader = ConfigLoader.getInstance();
  return loader.load({ projectRoot, ...options });
}

/**
 * Get a resolved path from configuration
 *
 * @param pathKey - Path key in format "category.key" (e.g., "docs.adr")
 * @param projectRoot - Project root directory (defaults to cwd)
 * @returns Promise<string> - The resolved absolute path
 *
 * @example
 * ```typescript
 * import { getConfigPath } from './config';
 *
 * const adrPath = await getConfigPath('docs.adr');
 * const sessionsPath = await getConfigPath('ginko.sessions');
 * ```
 */
export async function getConfigPath(pathKey: string, projectRoot?: string): Promise<string> {
  return ConfigLoaderUtils.getResolvedPath(pathKey, projectRoot);
}

/**
 * Check if a feature is enabled in configuration
 *
 * @param feature - Feature name
 * @param projectRoot - Project root directory (defaults to cwd)
 * @returns Promise<boolean> - Whether the feature is enabled
 *
 * @example
 * ```typescript
 * import { isFeatureEnabled } from './config';
 *
 * if (await isFeatureEnabled('autoHandoff')) {
 *   console.log('Auto-handoff is enabled');
 * }
 * ```
 */
export async function isFeatureEnabled(feature: string, projectRoot?: string): Promise<boolean> {
  return ConfigLoaderUtils.isFeatureEnabled(feature, projectRoot);
}

/**
 * Update configuration values
 *
 * @param updates - Partial configuration updates
 * @param projectRoot - Project root directory (defaults to cwd)
 *
 * @example
 * ```typescript
 * import { updateConfig } from './config';
 *
 * await updateConfig({
 *   features: { autoHandoff: false },
 *   paths: { docs: { custom: './my-docs' } }
 * });
 * ```
 */
export async function updateConfig(
  updates: Partial<GinkoConfig>,
  projectRoot?: string
): Promise<void> {
  return ConfigLoaderUtils.updateConfig(updates, projectRoot);
}

/**
 * Check if configuration exists and needs migration
 *
 * @param projectRoot - Project root directory (defaults to cwd)
 * @param configFileName - Configuration file name (defaults to 'ginko.json')
 * @returns Promise<{exists: boolean, needsMigration: boolean, currentVersion: string}>
 *
 * @example
 * ```typescript
 * import { checkConfigurationStatus } from './config';
 *
 * const status = await checkConfigurationStatus();
 * if (status.needsMigration) {
 *   console.log(`Migration needed from ${status.currentVersion} to latest`);
 * }
 * ```
 */
export async function checkConfigurationStatus(
  projectRoot?: string,
  configFileName?: string
): Promise<{
  exists: boolean;
  needsMigration: boolean;
  currentVersion: string;
  plan?: ReturnType<ConfigMigrator['getMigrationPlan']>;
}> {
  return MigrationUtils.checkMigrationNeeded(
    projectRoot || process.cwd(),
    configFileName || 'ginko.json'
  );
}

/**
 * Perform safe configuration migration with backup
 *
 * @param projectRoot - Project root directory (defaults to cwd)
 * @param options - Migration options
 * @returns Promise<MigrationResult> - Migration result with details
 *
 * @example
 * ```typescript
 * import { migrateConfiguration } from './config';
 *
 * const result = await migrateConfiguration();
 * if (result.migrated) {
 *   console.log(`Successfully migrated from ${result.fromVersion} to ${result.toVersion}`);
 *   if (result.backupPath) {
 *     console.log(`Backup created at: ${result.backupPath}`);
 *   }
 * }
 * ```
 */
export async function migrateConfiguration(
  projectRoot?: string,
  options?: Partial<MigrationOptions>
): Promise<MigrationResult> {
  return MigrationUtils.safeMigrate(projectRoot || process.cwd(), options);
}

/**
 * Create a new path resolver with current configuration
 *
 * @param projectRoot - Project root directory (defaults to cwd)
 * @returns Promise<PathResolver> - Configured path resolver
 *
 * @example
 * ```typescript
 * import { createPathResolver } from './config';
 *
 * const resolver = await createPathResolver();
 * const result = resolver.resolve('${docs.root}/custom/${ginko.sessions}');
 * console.log('Resolved path:', result.resolved);
 * ```
 */
export async function createPathResolver(projectRoot?: string): Promise<PathResolver> {
  const result = await loadConfig(projectRoot);
  return result.resolver;
}

/**
 * Validate a path template against current configuration
 *
 * @param pathTemplate - Path template with variables (e.g., '${docs.root}/files')
 * @param projectRoot - Project root directory (defaults to cwd)
 * @returns Promise<{valid: boolean, errors: string[]}> - Validation result
 *
 * @example
 * ```typescript
 * import { validatePathTemplate } from './config';
 *
 * const result = await validatePathTemplate('${docs.root}/${unknown.var}');
 * if (!result.valid) {
 *   console.error('Invalid path:', result.errors.join(', '));
 * }
 * ```
 */
export async function validatePathTemplate(
  pathTemplate: string,
  projectRoot?: string
): Promise<{ valid: boolean; errors: string[] }> {
  try {
    const resolver = await createPathResolver(projectRoot);
    return resolver.validatePath(pathTemplate);
  } catch (error) {
    return {
      valid: false,
      errors: [error instanceof Error ? error.message : 'Unknown validation error']
    };
  }
}

/**
 * Get comprehensive configuration statistics
 *
 * @param projectRoot - Project root directory (defaults to cwd)
 * @returns Promise<ConfigurationStats> - Configuration system statistics
 *
 * @example
 * ```typescript
 * import { getConfigurationStats } from './config';
 *
 * const stats = await getConfigurationStats();
 * console.log('Configuration loaded from:', stats.configPath);
 * console.log('Available variables:', stats.resolver.availableVariables);
 * ```
 */
export async function getConfigurationStats(projectRoot?: string): Promise<{
  loader: ReturnType<ConfigLoader['getStats']>;
  resolver: ReturnType<PathResolver['getStats']>;
  configPath: string;
  fromFile: boolean;
  migrated: boolean;
}> {
  const loader = ConfigLoader.getInstance();
  const result = await loader.load({ projectRoot });

  return {
    loader: loader.getStats(),
    resolver: result.resolver.getStats(),
    configPath: result.configPath,
    fromFile: result.fromFile,
    migrated: result.migrated
  };
}

/**
 * Configuration system version information
 */
export const CONFIG_SYSTEM_VERSION = '1.0.0';

/**
 * Default configuration file name
 */
export const DEFAULT_CONFIG_FILE = 'ginko.json';

/**
 * Supported configuration schema versions
 */
export const SUPPORTED_VERSIONS = Object.keys(SUPPORTED_CONFIG_VERSIONS);

/**
 * Re-export commonly used types for convenience
 */
export type ConfigurationSystem = {
  config: GinkoConfig;
  resolver: PathResolver;
  loader: ConfigLoader;
  migrator: ConfigMigrator;
};

/**
 * Create a complete configuration system instance
 *
 * @param projectRoot - Project root directory (defaults to cwd)
 * @returns Promise<ConfigurationSystem> - Complete configuration system
 *
 * @example
 * ```typescript
 * import { createConfigurationSystem } from './config';
 *
 * const system = await createConfigurationSystem();
 *
 * // Use the configuration
 * const docsPath = await system.resolver.resolve('${docs.root}');
 *
 * // Update configuration
 * await system.loader.save({
 *   ...system.config,
 *   features: { ...system.config.features, newFeature: true }
 * });
 * ```
 */
export async function createConfigurationSystem(projectRoot?: string): Promise<ConfigurationSystem> {
  const loader = ConfigLoader.getInstance();
  const result = await loader.load({ projectRoot });
  const migrator = new ConfigMigrator();

  return {
    config: result.config,
    resolver: result.resolver,
    loader,
    migrator
  };
}