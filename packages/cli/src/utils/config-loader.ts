/**
 * @fileType: utility
 * @status: current
 * @updated: 2025-10-22
 * @tags: [config, loader, two-tier, adr-037, path-resolution]
 * @related: [config.ts, init.ts, ginko-root.ts]
 * @priority: critical
 * @complexity: medium
 * @dependencies: [fs-extra, path]
 */

import fs from 'fs-extra';
import path from 'path';
import { GinkoConfig, LocalConfig, DEFAULT_GINKO_CONFIG } from '../types/config.js';
import { findGinkoRoot } from './ginko-root.js';

/**
 * Configuration cache for performance
 * Cleared on process exit or explicit invalidation
 */
let configCache: {
  ginkoConfig?: GinkoConfig;
  localConfig?: LocalConfig;
  projectRoot?: string;
  timestamp?: number;
} = {};

/**
 * Cache TTL in milliseconds (10 seconds)
 */
const CACHE_TTL = 10000;

/**
 * Load the team-shared ginko.json configuration
 * Falls back to progressive search if ginko.json doesn't exist
 *
 * @returns GinkoConfig object
 * @throws Error if project root cannot be determined
 */
export async function loadProjectConfig(): Promise<GinkoConfig> {
  // Check cache
  if (configCache.ginkoConfig && configCache.timestamp) {
    const age = Date.now() - configCache.timestamp;
    if (age < CACHE_TTL) {
      return configCache.ginkoConfig;
    }
  }

  // Find project root (where .ginko directory or ginko.json exists)
  let projectRoot = await findGinkoRoot();

  if (!projectRoot) {
    // No .ginko directory found, check for ginko.json in current directory
    const currentDir = process.cwd();
    const ginkoJsonPath = path.join(currentDir, 'ginko.json');

    if (await fs.pathExists(ginkoJsonPath)) {
      projectRoot = currentDir;
    } else {
      throw new Error(
        'Ginko not initialized. Run `ginko init` to create configuration.'
      );
    }
  }

  const ginkoJsonPath = path.join(projectRoot, 'ginko.json');

  // Try to load ginko.json
  if (await fs.pathExists(ginkoJsonPath)) {
    try {
      const config = await fs.readJSON(ginkoJsonPath);

      // Validate config structure
      if (!config.version || !config.project || !config.paths) {
        throw new Error(
          `Invalid ginko.json structure. Missing required fields: version, project, or paths.`
        );
      }

      // Cache the config
      configCache.ginkoConfig = config;
      configCache.projectRoot = projectRoot;
      configCache.timestamp = Date.now();

      return config;
    } catch (error) {
      if (error instanceof Error && error.message.includes('Invalid ginko.json')) {
        throw error;
      }
      throw new Error(
        `Failed to parse ginko.json: ${error instanceof Error ? error.message : String(error)}`
      );
    }
  }

  // ginko.json doesn't exist, return default config with warning
  console.warn(
    'Warning: ginko.json not found. Using default configuration. ' +
    'Run `ginko init --migrate` to create team-shared configuration.'
  );

  // Use default config with project name from directory
  const defaultConfig = { ...DEFAULT_GINKO_CONFIG };
  defaultConfig.project.name = path.basename(projectRoot);

  // Cache the default config
  configCache.ginkoConfig = defaultConfig;
  configCache.projectRoot = projectRoot;
  configCache.timestamp = Date.now();

  return defaultConfig;
}

/**
 * Load the user-specific .ginko/local.json configuration
 * Creates it if it doesn't exist
 *
 * @returns LocalConfig object
 * @throws Error if project root cannot be determined
 */
export async function loadLocalConfig(): Promise<LocalConfig> {
  // Check cache
  if (configCache.localConfig && configCache.timestamp) {
    const age = Date.now() - configCache.timestamp;
    if (age < CACHE_TTL) {
      return configCache.localConfig;
    }
  }

  // Get project root
  const projectRoot = configCache.projectRoot || await findGinkoRoot();

  if (!projectRoot) {
    throw new Error(
      'Ginko not initialized. Run `ginko init` to create configuration.'
    );
  }

  const localConfigPath = path.join(projectRoot, '.ginko', 'local.json');

  // Try to load local.json
  if (await fs.pathExists(localConfigPath)) {
    try {
      const config = await fs.readJSON(localConfigPath);

      // Validate structure
      if (!config.projectRoot || !config.userEmail || !config.userSlug) {
        throw new Error(
          `Invalid local.json structure. Missing required fields: projectRoot, userEmail, or userSlug.`
        );
      }

      // Cache the config
      configCache.localConfig = config;
      configCache.timestamp = Date.now();

      return config;
    } catch (error) {
      if (error instanceof Error && error.message.includes('Invalid local.json')) {
        throw error;
      }
      throw new Error(
        `Failed to parse .ginko/local.json: ${error instanceof Error ? error.message : String(error)}`
      );
    }
  }

  // local.json doesn't exist, create it
  const localConfig = await createLocalConfig(projectRoot);

  // Cache the new config
  configCache.localConfig = localConfig;
  configCache.timestamp = Date.now();

  return localConfig;
}

/**
 * Create a new local.json configuration file
 *
 * @param projectRoot - Absolute path to project root
 * @returns LocalConfig object
 */
async function createLocalConfig(projectRoot: string): Promise<LocalConfig> {
  // Priority: (1) auth email from ~/.ginko/auth.json, (2) git config user.email, (3) default
  let userEmail = 'user@example.com';

  // Try authenticated email first (ensures new projects default to correct identity)
  try {
    const { loadAuthSession } = await import('./auth-storage.js');
    const session = await loadAuthSession();
    if (session?.user?.email) {
      userEmail = session.user.email;
    }
  } catch {
    // Auth not available - fall through to git
  }

  // Fall back to git config if auth didn't provide an email
  if (userEmail === 'user@example.com') {
    try {
      const { execSync } = await import('child_process');
      userEmail = execSync('git config user.email', { encoding: 'utf8' }).trim();
    } catch {
      // Git not configured, use default
    }
  }

  const userSlug = userEmail.replace('@', '-at-').replace(/\./g, '-');

  const localConfig: LocalConfig = {
    projectRoot,
    userEmail,
    userSlug,
    workMode: 'think-build'
  };

  // Ensure .ginko directory exists
  await fs.ensureDir(path.join(projectRoot, '.ginko'));

  // Write local.json
  const localConfigPath = path.join(projectRoot, '.ginko', 'local.json');
  await fs.writeJSON(localConfigPath, localConfig, { spaces: 2 });

  console.log(`Created .ginko/local.json for user: ${userEmail}`);

  return localConfig;
}

/**
 * Resolve a relative project path to an absolute path
 * Uses both ginko.json (structure) and local.json (root)
 *
 * @param relativePath - Relative path from project root or path key
 * @returns Absolute path
 * @throws Error if configuration cannot be loaded
 *
 * @example
 * // Using path key
 * const sprintPath = await resolveProjectPath('currentSprint');
 * // → /Users/cnorton/Development/ginko/docs/sprints/CURRENT-SPRINT.md
 *
 * // Using relative path directly
 * const customPath = await resolveProjectPath('docs/custom/file.md');
 * // → /Users/cnorton/Development/ginko/docs/custom/file.md
 */
export async function resolveProjectPath(relativePath: string): Promise<string> {
  const [localConfig, projectConfig] = await Promise.all([
    loadLocalConfig(),
    loadProjectConfig()
  ]);

  // Check if relativePath is a path key in config
  if (projectConfig.paths[relativePath]) {
    relativePath = projectConfig.paths[relativePath];
  }

  // Resolve to absolute path using Node's path module (cross-platform)
  return path.resolve(localConfig.projectRoot, relativePath);
}

/**
 * Get all configured paths as absolute paths
 * Useful for displaying available paths to users
 *
 * @returns Record of path keys to absolute paths
 */
export async function getAllPaths(): Promise<Record<string, string>> {
  const [localConfig, projectConfig] = await Promise.all([
    loadLocalConfig(),
    loadProjectConfig()
  ]);

  const absolutePaths: Record<string, string> = {};

  for (const [key, relativePath] of Object.entries(projectConfig.paths)) {
    absolutePaths[key] = path.resolve(localConfig.projectRoot, relativePath);
  }

  return absolutePaths;
}

/**
 * Invalidate the configuration cache
 * Useful after updating configuration files
 */
export function invalidateConfigCache(): void {
  configCache = {};
}

/**
 * Validate both configuration files exist and are valid
 * Returns validation results with helpful error messages
 *
 * @returns Validation result object
 */
export async function validateConfiguration(): Promise<{
  valid: boolean;
  errors: string[];
  warnings: string[];
}> {
  const errors: string[] = [];
  const warnings: string[] = [];

  try {
    // Try to load project config
    const projectConfig = await loadProjectConfig();

    // Check required paths exist
    const localConfig = await loadLocalConfig();
    const criticalPaths = ['sessions', 'context'];

    for (const pathKey of criticalPaths) {
      if (projectConfig.paths[pathKey]) {
        const absolutePath = path.resolve(
          localConfig.projectRoot,
          projectConfig.paths[pathKey]
        );

        if (!(await fs.pathExists(absolutePath))) {
          warnings.push(
            `Path '${pathKey}' (${projectConfig.paths[pathKey]}) does not exist. ` +
            `Run \`ginko init\` to create missing directories.`
          );
        }
      }
    }
  } catch (error) {
    errors.push(error instanceof Error ? error.message : String(error));
  }

  return {
    valid: errors.length === 0,
    errors,
    warnings
  };
}

/**
 * Get the project root directory
 * Uses cached value if available, otherwise finds it
 *
 * @returns Absolute path to project root
 */
export async function getProjectRoot(): Promise<string> {
  if (configCache.projectRoot) {
    return configCache.projectRoot;
  }

  const projectRoot = await findGinkoRoot();

  if (!projectRoot) {
    throw new Error(
      'Ginko not initialized. Run `ginko init` to create configuration.'
    );
  }

  configCache.projectRoot = projectRoot;
  return projectRoot;
}
