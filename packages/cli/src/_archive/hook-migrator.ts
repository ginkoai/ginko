/**
 * @fileType: utility
 * @status: current
 * @updated: 2025-09-20
 * @tags: [hooks, migration, platform, conversion, cross-platform]
 * @related: [platform-adapter.ts, types.ts, platform-templates.ts]
 * @priority: high
 * @complexity: medium
 * @dependencies: [fs, path]
 */

import * as fs from 'fs';
import * as path from 'path';
import { platformAdapter } from './platform-adapter';
import type {
  Platform,
  HookScript,
  HookConversionResult,
  MigrationResult,
  HookInfo
} from './types';

export class HookMigrator {
  private static instance: HookMigrator;

  private constructor() {}

  public static getInstance(): HookMigrator {
    if (!HookMigrator.instance) {
      HookMigrator.instance = new HookMigrator();
    }
    return HookMigrator.instance;
  }

  /**
   * Migrate all hooks from one platform to another
   */
  public async migrateHooks(targetPlatform?: Platform): Promise<MigrationResult> {
    const currentPlatform = platformAdapter.detectPlatform();
    const target = targetPlatform || currentPlatform;

    const result: MigrationResult = {
      success: false,
      migratedHooks: [],
      errors: [],
      warnings: []
    };

    try {
      // Get all existing hooks
      const existingHooks = await platformAdapter.findExistingHooks();

      if (existingHooks.length === 0) {
        result.warnings.push('No hooks found to migrate');
        result.success = true;
        return result;
      }

      // Create backup
      const backupPath = await this.createHookBackup(existingHooks);
      result.backupPath = backupPath;

      // Ensure target hook directory exists
      await platformAdapter.ensureHookDirectory();

      // Migrate each hook
      for (const hook of existingHooks) {
        try {
          if (hook.platform === target) {
            result.warnings.push(`Hook ${hook.name} is already for target platform ${target}`);
            continue;
          }

          // Read hook content
          const content = await fs.promises.readFile(hook.path, 'utf-8');

          // Convert to target platform
          const conversionResult = await this.convertHookScript(
            content,
            hook.platform,
            target,
            hook.name
          );

          if (!conversionResult.success) {
            result.errors.push(`Failed to convert ${hook.name}: ${conversionResult.errors.join(', ')}`);
            continue;
          }

          // Write converted hook
          const targetPath = platformAdapter.adaptHookPath(hook.name, target);
          await fs.promises.writeFile(targetPath, conversionResult.convertedContent, 'utf-8');

          // Set executable permissions on Unix-like systems
          if (target !== 'windows') {
            await fs.promises.chmod(targetPath, 0o755);
          }

          // Remove old hook if it's a different platform
          if (hook.platform !== target && hook.path !== targetPath) {
            await fs.promises.unlink(hook.path);
          }

          result.migratedHooks.push(hook.name);
          result.warnings.push(...conversionResult.warnings);

        } catch (error) {
          result.errors.push(`Error migrating ${hook.name}: ${error}`);
        }
      }

      result.success = result.errors.length === 0;

    } catch (error) {
      result.errors.push(`Migration failed: ${error}`);
      result.success = false;
    }

    return result;
  }

  /**
   * Convert a hook script from one platform to another
   */
  public async convertHookScript(
    content: string,
    sourcePlatform: Platform,
    targetPlatform: Platform,
    hookName: string
  ): Promise<HookConversionResult> {
    const result: HookConversionResult = {
      success: false,
      convertedContent: '',
      errors: [],
      warnings: [],
      targetPlatform
    };

    try {
      if (sourcePlatform === targetPlatform) {
        result.convertedContent = content;
        result.success = true;
        return result;
      }

      let convertedContent = content;

      // Convert based on target platform
      if (targetPlatform === 'windows') {
        convertedContent = this.convertToWindowsBatch(content, sourcePlatform);
      } else {
        convertedContent = this.convertToUnixShell(content, sourcePlatform);
      }

      result.convertedContent = convertedContent;
      result.success = true;

      // Add warnings about manual review
      if (sourcePlatform !== targetPlatform) {
        result.warnings.push(
          `Hook ${hookName} was converted from ${sourcePlatform} to ${targetPlatform}. ` +
          'Please review the converted script for platform-specific commands or paths.'
        );
      }

    } catch (error) {
      result.errors.push(`Conversion failed: ${error}`);
    }

    return result;
  }

  /**
   * Convert shell script to Windows batch
   */
  private convertToWindowsBatch(content: string, sourcePlatform: Platform): string {
    if (sourcePlatform === 'windows') {
      return content;
    }

    let converted = content;

    // Replace shebang with @echo off
    converted = converted.replace(/^#!/, '@echo off\nREM ');

    // Convert common shell commands to batch equivalents
    const conversions = [
      // Exit codes
      { from: /exit 0/g, to: 'exit /b 0' },
      { from: /exit 1/g, to: 'exit /b 1' },
      { from: /exit (\d+)/g, to: 'exit /b $1' },

      // Environment variables
      { from: /\$([A-Z_][A-Z0-9_]*)/g, to: '%$1%' },
      { from: /\$\{([A-Z_][A-Z0-9_]*)\}/g, to: '%$1%' },

      // Path separators
      { from: /\//g, to: '\\' },

      // Common commands
      { from: /\bls\b/g, to: 'dir' },
      { from: /\bcat\b/g, to: 'type' },
      { from: /\bcp\b/g, to: 'copy' },
      { from: /\bmv\b/g, to: 'move' },
      { from: /\brm\b/g, to: 'del' },
      { from: /\bmkdir -p\b/g, to: 'mkdir' },
      { from: /\bwhich\b/g, to: 'where' },

      // Conditional syntax
      { from: /if \[ (.*?) \]; then/g, to: 'if $1 (' },
      { from: /elif \[ (.*?) \]; then/g, to: ') else if $1 (' },
      { from: /else/g, to: ') else (' },
      { from: /fi/g, to: ')' },

      // Comments (preserve existing)
      { from: /^(\s*)#/gm, to: '$1REM' }
    ];

    for (const { from, to } of conversions) {
      converted = converted.replace(from, to);
    }

    return converted;
  }

  /**
   * Convert Windows batch to Unix shell
   */
  private convertToUnixShell(content: string, sourcePlatform: Platform): string {
    if (sourcePlatform !== 'windows') {
      return content;
    }

    let converted = content;

    // Add shebang if not present
    if (!converted.startsWith('#!')) {
      converted = '#!/bin/bash\n' + converted;
    }

    // Convert batch commands to shell equivalents
    const conversions = [
      // Remove @echo off and convert to comment
      { from: /@echo off/g, to: '# Shell script converted from batch' },

      // Exit codes
      { from: /exit \/b 0/g, to: 'exit 0' },
      { from: /exit \/b 1/g, to: 'exit 1' },
      { from: /exit \/b (\d+)/g, to: 'exit $1' },

      // Environment variables
      { from: /%([A-Z_][A-Z0-9_]*)%/g, to: '${$1}' },

      // Path separators
      { from: /\\/g, to: '/' },

      // Common commands
      { from: /\bdir\b/g, to: 'ls' },
      { from: /\btype\b/g, to: 'cat' },
      { from: /\bcopy\b/g, to: 'cp' },
      { from: /\bmove\b/g, to: 'mv' },
      { from: /\bdel\b/g, to: 'rm' },
      { from: /\bwhere\b/g, to: 'which' },

      // Comments
      { from: /^(\s*)REM/gm, to: '$1#' },

      // Conditional syntax (basic conversion)
      { from: /if (.*?) \(/g, to: 'if [ $1 ]; then' },
      { from: /\) else if (.*?) \(/g, to: 'elif [ $1 ]; then' },
      { from: /\) else \(/g, to: 'else' },
      { from: /\)$/gm, to: 'fi' }
    ];

    for (const { from, to } of conversions) {
      converted = converted.replace(from, to);
    }

    return converted;
  }

  /**
   * Create backup of existing hooks
   */
  private async createHookBackup(hooks: HookInfo[]): Promise<string> {
    const config = platformAdapter.getPlatformConfig();
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const backupDir = path.join(config.hookDirectory, `backup-${timestamp}`);

    await fs.promises.mkdir(backupDir, { recursive: true });

    for (const hook of hooks) {
      const backupPath = path.join(backupDir, path.basename(hook.path));
      await fs.promises.copyFile(hook.path, backupPath);
    }

    return backupDir;
  }

  /**
   * Restore hooks from backup
   */
  public async restoreFromBackup(backupPath: string): Promise<MigrationResult> {
    const result: MigrationResult = {
      success: false,
      migratedHooks: [],
      errors: [],
      warnings: []
    };

    try {
      if (!fs.existsSync(backupPath)) {
        result.errors.push(`Backup directory not found: ${backupPath}`);
        return result;
      }

      const config = platformAdapter.getPlatformConfig();
      const backupFiles = await fs.promises.readdir(backupPath);

      for (const file of backupFiles) {
        try {
          const backupFilePath = path.join(backupPath, file);
          const restorePath = path.join(config.hookDirectory, file);

          await fs.promises.copyFile(backupFilePath, restorePath);

          // Set executable permissions if needed
          if (!platformAdapter.isWindows()) {
            await fs.promises.chmod(restorePath, 0o755);
          }

          result.migratedHooks.push(file);
        } catch (error) {
          result.errors.push(`Failed to restore ${file}: ${error}`);
        }
      }

      result.success = result.errors.length === 0;

    } catch (error) {
      result.errors.push(`Restore failed: ${error}`);
    }

    return result;
  }

  /**
   * Validate hook script syntax for platform
   */
  public validateHookScript(content: string, platform: Platform): { isValid: boolean; errors: string[] } {
    const errors: string[] = [];

    if (platform === 'windows') {
      // Basic Windows batch validation
      if (!content.includes('@echo off') && !content.includes('REM')) {
        errors.push('Windows batch files should typically start with @echo off');
      }

      // Check for Unix-specific syntax that won't work on Windows
      if (content.includes('#!/')) {
        errors.push('Shebang lines are not supported in Windows batch files');
      }

      if (content.match(/\$[A-Z_]/)) {
        errors.push('Unix-style environment variables found. Use %VARIABLE% syntax instead');
      }
    } else {
      // Basic Unix shell validation
      if (!content.startsWith('#!')) {
        errors.push('Shell scripts should start with a shebang (#!/bin/bash)');
      }

      // Check for Windows-specific syntax
      if (content.includes('@echo off')) {
        errors.push('Windows batch syntax found in shell script');
      }

      if (content.match(/%[A-Z_]+%/)) {
        errors.push('Windows-style environment variables found. Use ${VARIABLE} syntax instead');
      }
    }

    return {
      isValid: errors.length === 0,
      errors
    };
  }
}

// Export singleton instance
export const hookMigrator = HookMigrator.getInstance();