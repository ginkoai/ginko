/**
 * @fileType: utility
 * @status: current
 * @updated: 2025-09-20
 * @tags: [migration, hooks, conversion, cross-platform, windows, unix]
 * @related: [platform-adapter.ts, hook-templates.ts]
 * @priority: high
 * @complexity: high
 * @dependencies: [fs, path, platform-adapter, hook-templates]
 */

import * as fs from 'fs';
import * as path from 'path';
import { Platform, PlatformAdapter, HookInfo } from './platform-adapter';
import HookTemplates from './hook-templates';

export interface MigrationResult {
  success: boolean;
  sourcePath: string;
  targetPath: string;
  error?: string;
  warnings?: string[];
}

export interface ConversionOptions {
  preserveComments?: boolean;
  addPlatformHeader?: boolean;
  backupOriginal?: boolean;
  overwriteExisting?: boolean;
}

/**
 * HookMigration handles conversion of hook scripts between platforms
 */
export class HookMigration {
  private platformAdapter: PlatformAdapter;

  constructor(platformAdapter?: PlatformAdapter) {
    this.platformAdapter = platformAdapter || new PlatformAdapter();
  }

  /**
   * Migrate all hooks from one platform to another
   */
  async migrateAllHooks(
    targetPlatform: Platform,
    options?: ConversionOptions
  ): Promise<MigrationResult[]> {
    const results: MigrationResult[] = [];
    const currentPlatform = this.platformAdapter.detectPlatform();

    if (currentPlatform === targetPlatform) {
      console.log(`Already on ${targetPlatform}, no migration needed.`);
      return results;
    }

    const existingHooks = await this.platformAdapter.findExistingHooks();

    console.log(`Found ${existingHooks.length} hooks to migrate from ${currentPlatform} to ${targetPlatform}`);

    for (const hook of existingHooks) {
      if (hook.platform !== targetPlatform) {
        const result = await this.migrateHook(hook, targetPlatform, options);
        results.push(result);
      }
    }

    return results;
  }

  /**
   * Migrate a single hook to target platform
   */
  async migrateHook(
    hook: HookInfo,
    targetPlatform: Platform,
    options?: ConversionOptions
  ): Promise<MigrationResult> {
    const defaultOptions: ConversionOptions = {
      preserveComments: true,
      addPlatformHeader: true,
      backupOriginal: true,
      overwriteExisting: false,
      ...options
    };

    try {
      // Read existing hook content
      const sourceContent = await fs.promises.readFile(hook.path, 'utf-8');

      // Convert content to target platform
      const convertedContent = this.convertHookContent(
        sourceContent,
        hook.platform,
        targetPlatform,
        defaultOptions
      );

      // Generate target path
      const targetPath = this.platformAdapter.adaptHookPath(hook.name, targetPlatform);

      // Ensure target directory exists
      await this.platformAdapter.ensureHookDirectory();

      // Check if target already exists
      if (fs.existsSync(targetPath) && !defaultOptions.overwriteExisting) {
        return {
          success: false,
          sourcePath: hook.path,
          targetPath,
          error: `Target file already exists: ${targetPath}. Use overwriteExisting option to replace.`
        };
      }

      // Backup original if requested
      if (defaultOptions.backupOriginal) {
        const backupPath = `${hook.path}.backup.${Date.now()}`;
        await fs.promises.copyFile(hook.path, backupPath);
      }

      // Write converted content
      await fs.promises.writeFile(targetPath, convertedContent, 'utf-8');

      // Make executable on Unix systems
      if (targetPlatform !== 'windows') {
        await fs.promises.chmod(targetPath, '755');
      }

      // Remove original if migration successful
      if (fs.existsSync(targetPath)) {
        await fs.promises.unlink(hook.path);
      }

      return {
        success: true,
        sourcePath: hook.path,
        targetPath,
        warnings: this.generateWarnings(hook.platform, targetPlatform)
      };

    } catch (error) {
      return {
        success: false,
        sourcePath: hook.path,
        targetPath: '',
        error: `Migration failed: ${error}`
      };
    }
  }

  /**
   * Convert hook content between platforms
   */
  convertHookContent(
    content: string,
    sourcePlatform: Platform,
    targetPlatform: Platform,
    options: ConversionOptions
  ): string {
    if (sourcePlatform === targetPlatform) {
      return content;
    }

    let converted = content;

    if (sourcePlatform === 'windows' && targetPlatform !== 'windows') {
      // Windows to Unix conversion
      converted = this.convertBatToSh(converted, options);
    } else if (sourcePlatform !== 'windows' && targetPlatform === 'windows') {
      // Unix to Windows conversion
      converted = this.convertShToBat(converted, options);
    }

    if (options.addPlatformHeader) {
      converted = this.addPlatformHeader(converted, targetPlatform);
    }

    return converted;
  }

  /**
   * Convert Windows batch script to Unix shell script
   */
  private convertBatToSh(content: string, options: ConversionOptions): string {
    let converted = content;

    // Add shebang
    if (!converted.startsWith('#!')) {
      converted = '#!/bin/bash\n' + converted;
    }

    // Convert comments
    converted = converted.replace(/@echo off\s*\n?/g, '');
    converted = converted.replace(/^REM\s/gm, '# ');

    // Convert echo commands
    converted = converted.replace(/^echo\s+(.+)$/gm, 'echo "$1"');

    // Convert exit commands
    converted = converted.replace(/exit \/b (\d+)/g, 'exit $1');

    // Convert environment variables
    converted = converted.replace(/%([^%]+)%/g, '${$1}');

    // Convert path separators
    converted = converted.replace(/\\\\/g, '/');

    // Convert common Windows paths
    converted = converted.replace(/%USERPROFILE%/g, '$HOME');
    converted = converted.replace(/%TEMP%/g, '/tmp');
    converted = converted.replace(/%CD%/g, '$(pwd)');

    // Convert Windows commands to Unix equivalents
    converted = converted.replace(/where\s+(\w+)/g, 'command -v $1');
    converted = converted.replace(/if exist\s+"?([^"]+)"?\s+\(/g, 'if [ -e "$1" ]; then');
    converted = converted.replace(/if not exist\s+"?([^"]+)"?\s+\(/g, 'if [ ! -e "$1" ]; then');

    // Convert conditional statements
    converted = converted.replace(/if %ERRORLEVEL% EQU 0 \(/g, 'if [ $? -eq 0 ]; then');
    converted = converted.replace(/if %ERRORLEVEL% NEQ 0 \(/g, 'if [ $? -ne 0 ]; then');

    // Convert parentheses blocks to proper bash syntax
    converted = converted.replace(/\)$/gm, 'fi');

    // Add set -e for error handling
    if (!converted.includes('set -e')) {
      const lines = converted.split('\n');
      const shebangIndex = lines.findIndex(line => line.startsWith('#!'));
      if (shebangIndex >= 0) {
        lines.splice(shebangIndex + 1, 0, 'set -e');
        converted = lines.join('\n');
      }
    }

    return converted;
  }

  /**
   * Convert Unix shell script to Windows batch script
   */
  private convertShToBat(content: string, options: ConversionOptions): string {
    let converted = content;

    // Remove shebang and add batch header
    converted = converted.replace(/^#![^\n]*\n?/g, '@echo off\n');

    // Remove set commands
    converted = converted.replace(/^set -[ex]\s*\n?/gm, '');

    // Convert comments
    converted = converted.replace(/^#\s/gm, 'REM ');

    // Convert echo commands
    converted = converted.replace(/echo\s+"([^"]+)"/g, 'echo $1');
    converted = converted.replace(/echo\s+([^">\s]+)/g, 'echo $1');

    // Convert exit commands
    converted = converted.replace(/exit\s+(\d+)/g, 'exit /b $1');
    converted = converted.replace(/exit\s*$/g, 'exit /b 0');

    // Convert environment variables
    converted = converted.replace(/\$\{([^}]+)\}/g, '%$1%');
    converted = converted.replace(/\$([A-Z_][A-Z0-9_]*)/g, '%$1%');

    // Convert path separators
    converted = converted.replace(/\//g, '\\');

    // Convert common Unix paths
    converted = converted.replace(/\$HOME/g, '%USERPROFILE%');
    converted = converted.replace(/\/tmp/g, '%TEMP%');
    converted = converted.replace(/\$\(pwd\)/g, '%CD%');

    // Convert Unix commands to Windows equivalents
    converted = converted.replace(/command -v\s+(\w+)/g, 'where $1');
    converted = converted.replace(/if \[ -e "([^"]+)" \]; then/g, 'if exist "$1" (');
    converted = converted.replace(/if \[ ! -e "([^"]+)" \]; then/g, 'if not exist "$1" (');

    // Convert conditional statements
    converted = converted.replace(/if \[ \$\? -eq 0 \]; then/g, 'if %ERRORLEVEL% EQU 0 (');
    converted = converted.replace(/if \[ \$\? -ne 0 \]; then/g, 'if %ERRORLEVEL% NEQ 0 (');

    // Convert fi to closing parentheses
    converted = converted.replace(/^fi$/gm, ')');

    // Convert null redirections
    converted = converted.replace(/>\s*\/dev\/null\s*2>&1/g, '>nul 2>&1');
    converted = converted.replace(/&>\s*\/dev\/null/g, '>nul 2>&1');

    return converted;
  }

  /**
   * Add platform-specific header to hook
   */
  private addPlatformHeader(content: string, platform: Platform): string {
    const timestamp = new Date().toISOString().split('T')[0];
    const platformName = this.platformAdapter.getPlatformDisplayName(platform);

    const header = platform === 'windows'
      ? `REM Generated for ${platformName} on ${timestamp}\nREM Migrated by ginko platform adapter\n\n`
      : `# Generated for ${platformName} on ${timestamp}\n# Migrated by ginko platform adapter\n\n`;

    // Insert after shebang/echo off but before other content
    if (platform === 'windows') {
      return content.replace(/(@echo off\s*\n?)/, `$1${header}`);
    } else {
      return content.replace(/(#![^\n]*\n?)/, `$1${header}`);
    }
  }

  /**
   * Generate warnings for platform migration
   */
  private generateWarnings(sourcePlatform: Platform, targetPlatform: Platform): string[] {
    const warnings: string[] = [];

    if (sourcePlatform === 'windows' && targetPlatform !== 'windows') {
      warnings.push('Windows-specific commands may not work on Unix systems');
      warnings.push('Check path separators and environment variables');
      warnings.push('Verify file permissions after migration');
    } else if (sourcePlatform !== 'windows' && targetPlatform === 'windows') {
      warnings.push('Unix-specific commands may not work on Windows');
      warnings.push('Check for Windows equivalents of shell commands');
      warnings.push('Review path handling and case sensitivity');
    }

    warnings.push('Test the migrated hook thoroughly before relying on it');
    warnings.push('Manual adjustments may be required for complex scripts');

    return warnings;
  }

  /**
   * Create fresh hooks for current platform from templates
   */
  async createFreshHooks(
    hookNames?: string[],
    options?: ConversionOptions
  ): Promise<MigrationResult[]> {
    const platform = this.platformAdapter.detectPlatform();
    const hooks = hookNames || HookTemplates.getAvailableHookNames();
    const results: MigrationResult[] = [];

    await this.platformAdapter.ensureHookDirectory();

    for (const hookName of hooks) {
      try {
        const template = HookTemplates.getTemplate(hookName, platform);
        if (!template) {
          results.push({
            success: false,
            sourcePath: '',
            targetPath: '',
            error: `No template found for hook: ${hookName}`
          });
          continue;
        }

        const targetPath = this.platformAdapter.adaptHookPath(hookName, platform);

        // Check if already exists
        if (fs.existsSync(targetPath) && !options?.overwriteExisting) {
          results.push({
            success: false,
            sourcePath: '',
            targetPath,
            error: `Hook already exists: ${targetPath}`
          });
          continue;
        }

        // Write template content
        await fs.promises.writeFile(targetPath, template.content, 'utf-8');

        // Make executable on Unix systems
        if (platform !== 'windows') {
          await fs.promises.chmod(targetPath, '755');
        }

        results.push({
          success: true,
          sourcePath: 'template',
          targetPath,
          warnings: [`Created fresh ${platform} hook from template`]
        });

      } catch (error) {
        results.push({
          success: false,
          sourcePath: '',
          targetPath: '',
          error: `Failed to create hook ${hookName}: ${error}`
        });
      }
    }

    return results;
  }

  /**
   * List hooks that need migration
   */
  async listMigrationNeeded(): Promise<HookInfo[]> {
    const currentPlatform = this.platformAdapter.detectPlatform();
    const existingHooks = await this.platformAdapter.findExistingHooks();

    return existingHooks.filter(hook => hook.platform !== currentPlatform);
  }

  /**
   * Validate hook content for platform compatibility
   */
  validateHookCompatibility(content: string, platform: Platform): string[] {
    const issues: string[] = [];

    if (platform === 'windows') {
      // Check for Unix-specific patterns
      if (content.includes('#!/')) {
        issues.push('Contains Unix shebang, not compatible with Windows batch');
      }
      if (content.includes('set -e')) {
        issues.push('Contains Unix shell options, not compatible with Windows');
      }
      if (/\$\{[^}]+\}/.test(content)) {
        issues.push('Contains Unix variable syntax, use %VAR% for Windows');
      }
    } else {
      // Check for Windows-specific patterns
      if (content.includes('@echo off')) {
        issues.push('Contains Windows batch header, not compatible with Unix');
      }
      if (content.includes('exit /b')) {
        issues.push('Contains Windows exit syntax, use "exit" for Unix');
      }
      if (/%[^%]+%/.test(content)) {
        issues.push('Contains Windows variable syntax, use ${VAR} for Unix');
      }
    }

    return issues;
  }
}

export default HookMigration;