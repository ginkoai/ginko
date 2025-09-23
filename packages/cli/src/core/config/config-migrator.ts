/**
 * @fileType: utility
 * @status: current
 * @updated: 2025-09-19
 * @tags: [migration, config, versioning, backward-compatibility]
 * @related: [config-schema.ts, config-loader.ts]
 * @priority: high
 * @complexity: high
 * @dependencies: [fs, path]
 */

import * as fs from 'fs/promises';
import * as path from 'path';
import {
  GinkoConfig,
  DEFAULT_CONFIG,
  ConfigMigration,
  SupportedVersion,
  SUPPORTED_CONFIG_VERSIONS,
  isValidGinkoConfig
} from './config-schema.js';

/**
 * Configuration Migration System
 * Handles upgrading old configuration formats to current version
 * Implements ADR-028 First-Use Experience Enhancement Architecture
 */

export interface MigrationResult {
  /** Migrated configuration */
  config: GinkoConfig;
  /** Whether migration was needed */
  migrated: boolean;
  /** Original version */
  fromVersion: string | null;
  /** Target version */
  toVersion: string;
  /** Applied migrations */
  appliedMigrations: string[];
  /** Migration warnings */
  warnings: string[];
  /** Backup file path (if backup was created) */
  backupPath?: string;
}

export interface MigrationOptions {
  /** Create backup before migration */
  createBackup?: boolean;
  /** Target version (defaults to latest) */
  targetVersion?: string;
  /** Enable dry run mode (don't modify files) */
  dryRun?: boolean;
  /** Project root directory */
  projectRoot?: string;
  /** Configuration file name */
  configFileName?: string;
}

export class MigrationError extends Error {
  constructor(
    message: string,
    public fromVersion?: string,
    public toVersion?: string,
    public cause?: Error
  ) {
    super(message);
    this.name = 'MigrationError';
  }
}

/**
 * ConfigMigrator handles version upgrades and format changes
 */
export class ConfigMigrator {
  private migrations: Map<string, ConfigMigration> = new Map();

  constructor() {
    this.registerBuiltInMigrations();
  }

  /**
   * Register built-in migrations
   */
  private registerBuiltInMigrations(): void {
    // Migration from no version to 1.0.0
    this.registerMigration({
      from: 'none',
      to: '1.0.0',
      description: 'Initialize configuration with default structure',
      migrate: this.migrateToV1_0_0.bind(this)
    });

    // Future migrations would be added here
    // Example:
    // this.registerMigration({
    //   from: '1.0.0',
    //   to: '1.1.0',
    //   description: 'Add new feature flags',
    //   migrate: this.migrateToV1_1_0.bind(this)
    // });
  }

  /**
   * Register a custom migration
   */
  registerMigration(migration: ConfigMigration): void {
    const key = `${migration.from}->${migration.to}`;
    this.migrations.set(key, migration);
  }

  /**
   * Migrate configuration from one version to another
   */
  async migrate(
    config: any,
    options: MigrationOptions = {}
  ): Promise<GinkoConfig> {
    const {
      targetVersion = DEFAULT_CONFIG.version,
      createBackup = true,
      dryRun = false,
      projectRoot = process.cwd(),
      configFileName = 'ginko.json'
    } = options;

    const result = await this.migrateConfig(config, targetVersion, {
      createBackup,
      dryRun,
      projectRoot,
      configFileName
    });

    return result.config;
  }

  /**
   * Migrate configuration with full result details
   */
  async migrateConfig(
    config: any,
    targetVersion: string = DEFAULT_CONFIG.version,
    options: MigrationOptions = {}
  ): Promise<MigrationResult> {
    const {
      createBackup = true,
      dryRun = false,
      projectRoot = process.cwd(),
      configFileName = 'ginko.json'
    } = options;

    const fromVersion = this.detectVersion(config);
    const appliedMigrations: string[] = [];
    const warnings: string[] = [];
    let currentConfig = config;
    let backupPath: string | undefined;

    // If already at target version, no migration needed
    if (fromVersion === targetVersion && isValidGinkoConfig(config)) {
      return {
        config: currentConfig as GinkoConfig,
        migrated: false,
        fromVersion,
        toVersion: targetVersion,
        appliedMigrations,
        warnings
      };
    }

    // Create backup if requested
    if (createBackup && !dryRun) {
      backupPath = await this.createBackup(projectRoot, configFileName);
    }

    try {
      // Find migration path
      const migrationPath = this.findMigrationPath(fromVersion, targetVersion);

      if (migrationPath.length === 0) {
        throw new MigrationError(
          `No migration path found from ${fromVersion} to ${targetVersion}`,
          fromVersion,
          targetVersion
        );
      }

      // Apply migrations in sequence
      for (const migrationKey of migrationPath) {
        const migration = this.migrations.get(migrationKey);
        if (!migration) {
          throw new MigrationError(
            `Migration not found: ${migrationKey}`,
            fromVersion,
            targetVersion
          );
        }

        try {
          currentConfig = migration.migrate(currentConfig);
          appliedMigrations.push(migration.description);
        } catch (error) {
          throw new MigrationError(
            `Migration failed: ${migration.description}`,
            migration.from,
            migration.to,
            error instanceof Error ? error : new Error('Unknown error')
          );
        }
      }

      // Validate final configuration
      if (!isValidGinkoConfig(currentConfig)) {
        throw new MigrationError(
          'Migration produced invalid configuration',
          fromVersion,
          targetVersion
        );
      }

      // Update migration history
      currentConfig.metadata = {
        ...currentConfig.metadata,
        migrationHistory: [
          ...(currentConfig.metadata?.migrationHistory || []),
          `${fromVersion} -> ${targetVersion} (${new Date().toISOString()})`
        ],
        updatedAt: new Date().toISOString()
      };

      return {
        config: currentConfig,
        migrated: true,
        fromVersion,
        toVersion: targetVersion,
        appliedMigrations,
        warnings,
        backupPath
      };

    } catch (error) {
      // If migration fails and we created a backup, inform user
      if (backupPath) {
        warnings.push(`Backup created at: ${backupPath}`);
      }
      throw error;
    }
  }

  /**
   * Detect configuration version
   */
  detectVersion(config: any): string {
    if (!config || typeof config !== 'object') {
      return 'none';
    }

    if (config.version && typeof config.version === 'string') {
      return config.version;
    }

    // Try to detect version from structure
    if (config.paths && config.features) {
      return '1.0.0'; // Looks like v1.0.0 structure
    }

    return 'none';
  }

  /**
   * Find migration path between versions
   */
  private findMigrationPath(fromVersion: string, toVersion: string): string[] {
    // For now, we use a simple approach since we only have one migration
    // In the future, this could implement a graph-based pathfinding algorithm

    if (fromVersion === toVersion) {
      return [];
    }

    // Direct migration available?
    const directKey = `${fromVersion}->${toVersion}`;
    if (this.migrations.has(directKey)) {
      return [directKey];
    }

    // For now, only handle migration from 'none' to '1.0.0'
    if (fromVersion === 'none' && toVersion === '1.0.0') {
      return ['none->1.0.0'];
    }

    // Future: implement proper pathfinding for multi-step migrations
    throw new MigrationError(
      `No migration path found from ${fromVersion} to ${toVersion}`,
      fromVersion,
      toVersion
    );
  }

  /**
   * Create backup of configuration file
   */
  private async createBackup(projectRoot: string, configFileName: string): Promise<string> {
    const configPath = path.join(projectRoot, configFileName);
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const backupFileName = `${configFileName}.backup.${timestamp}`;
    const backupPath = path.join(projectRoot, backupFileName);

    try {
      await fs.copyFile(configPath, backupPath);
      return backupPath;
    } catch (error) {
      throw new MigrationError(
        `Failed to create backup at ${backupPath}`,
        undefined,
        undefined,
        error instanceof Error ? error : new Error('Unknown error')
      );
    }
  }

  /**
   * Migration: none -> 1.0.0
   * Handles the initial migration from any format to v1.0.0
   */
  private migrateToV1_0_0(oldConfig: any): GinkoConfig {
    // Start with default config
    const newConfig: GinkoConfig = JSON.parse(JSON.stringify(DEFAULT_CONFIG));

    if (!oldConfig || typeof oldConfig !== 'object') {
      return newConfig;
    }

    // Preserve any existing paths
    if (oldConfig.paths) {
      if (oldConfig.paths.docs) {
        newConfig.paths.docs = { ...newConfig.paths.docs, ...oldConfig.paths.docs };
      }
      if (oldConfig.paths.ginko) {
        newConfig.paths.ginko = { ...newConfig.paths.ginko, ...oldConfig.paths.ginko };
      }
    }

    // Preserve any existing features
    if (oldConfig.features) {
      newConfig.features = { ...newConfig.features, ...oldConfig.features };
    }

    // Preserve platform configuration if valid
    if (oldConfig.platform && typeof oldConfig.platform === 'object') {
      newConfig.platform = oldConfig.platform;
    }

    // Preserve metadata
    if (oldConfig.metadata) {
      newConfig.metadata = {
        ...newConfig.metadata,
        ...oldConfig.metadata,
        updatedAt: new Date().toISOString()
      };
    }

    return newConfig;
  }

  /**
   * Check if configuration needs migration
   */
  needsMigration(config: any, targetVersion: string = DEFAULT_CONFIG.version): boolean {
    const currentVersion = this.detectVersion(config);

    if (currentVersion === targetVersion && isValidGinkoConfig(config)) {
      return false;
    }

    return true;
  }

  /**
   * Get available migrations
   */
  getAvailableMigrations(): Array<{
    from: string;
    to: string;
    description: string;
  }> {
    return Array.from(this.migrations.values()).map(migration => ({
      from: migration.from,
      to: migration.to,
      description: migration.description
    }));
  }

  /**
   * Validate migration compatibility
   */
  canMigrate(fromVersion: string, toVersion: string): boolean {
    try {
      this.findMigrationPath(fromVersion, toVersion);
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Get migration plan (dry run)
   */
  getMigrationPlan(
    config: any,
    targetVersion: string = DEFAULT_CONFIG.version
  ): {
    needed: boolean;
    fromVersion: string;
    toVersion: string;
    steps: Array<{ from: string; to: string; description: string }>;
  } {
    const fromVersion = this.detectVersion(config);
    const needed = this.needsMigration(config, targetVersion);

    if (!needed) {
      return {
        needed: false,
        fromVersion,
        toVersion: targetVersion,
        steps: []
      };
    }

    try {
      const migrationPath = this.findMigrationPath(fromVersion, targetVersion);
      const steps = migrationPath.map(key => {
        const migration = this.migrations.get(key)!;
        return {
          from: migration.from,
          to: migration.to,
          description: migration.description
        };
      });

      return {
        needed: true,
        fromVersion,
        toVersion: targetVersion,
        steps
      };
    } catch {
      return {
        needed: true,
        fromVersion,
        toVersion: targetVersion,
        steps: []
      };
    }
  }
}

/**
 * Utility functions for migration operations
 */
export namespace MigrationUtils {
  /**
   * Check if a configuration file exists and needs migration
   */
  export async function checkMigrationNeeded(
    projectRoot: string = process.cwd(),
    configFileName: string = 'ginko.json',
    targetVersion: string = DEFAULT_CONFIG.version
  ): Promise<{
    exists: boolean;
    needsMigration: boolean;
    currentVersion: string;
    plan?: ReturnType<ConfigMigrator['getMigrationPlan']>;
  }> {
    const configPath = path.join(projectRoot, configFileName);

    try {
      const content = await fs.readFile(configPath, 'utf-8');
      const config = JSON.parse(content);
      const migrator = new ConfigMigrator();
      const plan = migrator.getMigrationPlan(config, targetVersion);

      return {
        exists: true,
        needsMigration: plan.needed,
        currentVersion: plan.fromVersion,
        plan
      };
    } catch (error) {
      if (error instanceof Error && 'code' in error && error.code === 'ENOENT') {
        return {
          exists: false,
          needsMigration: false,
          currentVersion: 'none'
        };
      }
      throw error;
    }
  }

  /**
   * Perform safe migration with comprehensive error handling
   */
  export async function safeMigrate(
    projectRoot: string = process.cwd(),
    options: MigrationOptions = {}
  ): Promise<MigrationResult> {
    const {
      configFileName = 'ginko.json',
      targetVersion = DEFAULT_CONFIG.version,
      createBackup = true
    } = options;

    const configPath = path.join(projectRoot, configFileName);

    try {
      // Read current configuration
      const content = await fs.readFile(configPath, 'utf-8');
      const config = JSON.parse(content);

      // Perform migration
      const migrator = new ConfigMigrator();
      const result = await migrator.migrateConfig(config, targetVersion, {
        ...options,
        projectRoot,
        configFileName
      });

      // Write updated configuration if not dry run
      if (!options.dryRun) {
        await fs.writeFile(
          configPath,
          JSON.stringify(result.config, null, 2) + '\n',
          'utf-8'
        );
      }

      return result;

    } catch (error) {
      throw new MigrationError(
        `Failed to migrate configuration at ${configPath}`,
        undefined,
        undefined,
        error instanceof Error ? error : new Error('Unknown error')
      );
    }
  }

  /**
   * List all backup files for a configuration
   */
  export async function listBackups(
    projectRoot: string = process.cwd(),
    configFileName: string = 'ginko.json'
  ): Promise<Array<{ path: string; created: Date; size: number }>> {
    try {
      const files = await fs.readdir(projectRoot);
      const backupPattern = new RegExp(`^${configFileName}\\.backup\\.(\\d{4}-\\d{2}-\\d{2}T\\d{2}-\\d{2}-\\d{2}).*$`);
      const backups: Array<{ path: string; created: Date; size: number }> = [];

      for (const file of files) {
        const match = backupPattern.exec(file);
        if (match) {
          const filePath = path.join(projectRoot, file);
          const stats = await fs.stat(filePath);
          const timestamp = match[1].replace(/-/g, ':').replace(/T(\d{2}):(\d{2}):(\d{2})/, 'T$1:$2:$3');

          backups.push({
            path: filePath,
            created: new Date(timestamp),
            size: stats.size
          });
        }
      }

      return backups.sort((a, b) => b.created.getTime() - a.created.getTime());
    } catch {
      return [];
    }
  }

  /**
   * Clean up old backup files
   */
  export async function cleanupBackups(
    projectRoot: string = process.cwd(),
    configFileName: string = 'ginko.json',
    keepCount: number = 5
  ): Promise<number> {
    const backups = await listBackups(projectRoot, configFileName);
    const toDelete = backups.slice(keepCount);

    let deletedCount = 0;
    for (const backup of toDelete) {
      try {
        await fs.unlink(backup.path);
        deletedCount++;
      } catch {
        // Ignore deletion errors
      }
    }

    return deletedCount;
  }
}