/**
 * @fileType: utility
 * @status: current
 * @updated: 2025-09-20
 * @tags: [platform, cross-platform, hooks, compatibility, adapter]
 * @related: [config-loader.ts, git-validator.ts]
 * @priority: high
 * @complexity: medium
 * @dependencies: [os, path, fs]
 */

import * as os from 'os';
import * as path from 'path';
import * as fs from 'fs';

export type Platform = 'windows' | 'macos' | 'linux';

export interface PlatformConfig {
  platform: Platform;
  hookExtension: string;
  shellExtension: string;
  pathSeparator: string;
  homeDirectory: string;
  claudeConfigPath: string;
  hookDirectory: string;
}

export interface HookInfo {
  name: string;
  platform: Platform;
  path: string;
  extension: string;
  content?: string;
}

/**
 * PlatformAdapter handles cross-platform compatibility for ginko CLI
 * Provides platform detection, path resolution, and hook management
 */
export class PlatformAdapter {
  private _platform: Platform | null = null;
  private _config: PlatformConfig | null = null;

  /**
   * Detect current operating system platform
   */
  detectPlatform(): Platform {
    if (this._platform) {
      return this._platform;
    }

    const platform = process.platform;

    if (platform === 'win32') {
      this._platform = 'windows';
    } else if (platform === 'darwin') {
      this._platform = 'macos';
    } else {
      this._platform = 'linux';
    }

    return this._platform;
  }

  /**
   * Get platform-specific configuration
   */
  getPlatformConfig(): PlatformConfig {
    if (this._config) {
      return this._config;
    }

    const platform = this.detectPlatform();
    const homeDir = os.homedir();

    this._config = {
      platform,
      hookExtension: this.getHookExtension(platform),
      shellExtension: this.getShellExtension(platform),
      pathSeparator: platform === 'windows' ? '\\' : '/',
      homeDirectory: homeDir,
      claudeConfigPath: this.getClaudeConfigPath(platform, homeDir),
      hookDirectory: this.getHookDirectory(platform, homeDir)
    };

    return this._config;
  }

  /**
   * Get appropriate hook file extension for platform
   */
  getHookExtension(platform?: Platform): string {
    const currentPlatform = platform || this.detectPlatform();

    switch (currentPlatform) {
      case 'windows':
        return '.bat';
      case 'macos':
      case 'linux':
        return '.sh';
      default:
        return '.sh';
    }
  }

  /**
   * Get appropriate shell script extension for platform
   */
  getShellExtension(platform?: Platform): string {
    const currentPlatform = platform || this.detectPlatform();

    switch (currentPlatform) {
      case 'windows':
        return '.bat';
      case 'macos':
      case 'linux':
        return '.sh';
      default:
        return '.sh';
    }
  }

  /**
   * Get Claude configuration directory path for platform
   */
  getClaudeConfigPath(platform?: Platform, homeDir?: string): string {
    const currentPlatform = platform || this.detectPlatform();
    const home = homeDir || os.homedir();

    switch (currentPlatform) {
      case 'windows':
        return path.join(home, 'AppData', 'Roaming', 'Claude');
      case 'macos':
        return path.join(home, 'Library', 'Application Support', 'Claude');
      case 'linux':
        return path.join(home, '.config', 'claude');
      default:
        return path.join(home, '.claude');
    }
  }

  /**
   * Get hook directory path for platform
   */
  getHookDirectory(platform?: Platform, homeDir?: string): string {
    const claudeConfigPath = this.getClaudeConfigPath(platform, homeDir);
    return path.join(claudeConfigPath, 'hooks');
  }

  /**
   * Adapt hook path for current platform
   */
  adaptHookPath(hookName: string, platform?: Platform): string {
    const config = this.getPlatformConfig();
    const currentPlatform = platform || config.platform;
    const ext = this.getHookExtension(currentPlatform);

    // Remove any existing extension from hookName
    const baseName = hookName.replace(/\.(sh|bat|ps1)$/, '');

    return path.join(
      this.getHookDirectory(currentPlatform),
      `${baseName}${ext}`
    );
  }

  /**
   * Find all existing hooks in the system
   */
  async findExistingHooks(): Promise<HookInfo[]> {
    const hooks: HookInfo[] = [];
    const config = this.getPlatformConfig();

    try {
      if (!fs.existsSync(config.hookDirectory)) {
        return hooks;
      }

      const files = await fs.promises.readdir(config.hookDirectory);

      for (const file of files) {
        const filePath = path.join(config.hookDirectory, file);
        const stat = await fs.promises.stat(filePath);

        if (stat.isFile()) {
          const ext = path.extname(file);
          const baseName = path.basename(file, ext);

          let platform: Platform;
          if (ext === '.bat') {
            platform = 'windows';
          } else if (ext === '.sh') {
            // Could be macOS or Linux, use current platform as default
            platform = config.platform === 'windows' ? 'linux' : config.platform;
          } else {
            continue; // Skip non-hook files
          }

          hooks.push({
            name: baseName,
            platform,
            path: filePath,
            extension: ext
          });
        }
      }
    } catch (error) {
      console.warn(`Warning: Could not read hook directory: ${error}`);
    }

    return hooks;
  }

  /**
   * Check if hooks directory exists and create it if needed
   */
  async ensureHookDirectory(): Promise<void> {
    const config = this.getPlatformConfig();

    try {
      await fs.promises.mkdir(config.hookDirectory, { recursive: true });
    } catch (error) {
      throw new Error(`Failed to create hook directory: ${error}`);
    }
  }

  /**
   * Check if current platform is Windows
   */
  isWindows(): boolean {
    return this.detectPlatform() === 'windows';
  }

  /**
   * Check if current platform is macOS
   */
  isMacOS(): boolean {
    return this.detectPlatform() === 'macos';
  }

  /**
   * Check if current platform is Linux
   */
  isLinux(): boolean {
    return this.detectPlatform() === 'linux';
  }

  /**
   * Check if current platform is Unix-like (macOS or Linux)
   */
  isUnix(): boolean {
    const platform = this.detectPlatform();
    return platform === 'macos' || platform === 'linux';
  }

  /**
   * Get platform-appropriate path separator
   */
  getPathSeparator(): string {
    return this.getPlatformConfig().pathSeparator;
  }

  /**
   * Normalize path for current platform
   */
  normalizePath(inputPath: string): string {
    const config = this.getPlatformConfig();

    if (config.platform === 'windows') {
      // Convert forward slashes to backslashes on Windows
      return inputPath.replace(/\//g, '\\');
    } else {
      // Convert backslashes to forward slashes on Unix-like systems
      return inputPath.replace(/\\/g, '/');
    }
  }

  /**
   * Get platform display name for user messages
   */
  getPlatformDisplayName(platform?: Platform): string {
    const currentPlatform = platform || this.detectPlatform();

    switch (currentPlatform) {
      case 'windows':
        return 'Windows';
      case 'macos':
        return 'macOS';
      case 'linux':
        return 'Linux';
      default:
        return 'Unknown';
    }
  }
}

// Export singleton instance
export const platformAdapter = new PlatformAdapter();