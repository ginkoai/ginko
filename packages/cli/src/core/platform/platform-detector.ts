/**
 * @fileType: utility
 * @status: current
 * @updated: 2025-09-19
 * @tags: [platform, detection, os, environment, cross-platform]
 * @related: [hook-adapter.ts, path-normalizer.ts, index.ts]
 * @priority: high
 * @complexity: medium
 * @dependencies: [fs-extra, os, child_process]
 */

import * as os from 'os';
import * as fs from 'fs-extra';
import { execSync } from 'child_process';
import * as path from 'path';

export type Platform = 'windows' | 'macos' | 'linux';
export type Shell = 'bash' | 'zsh' | 'powershell' | 'cmd' | 'fish' | 'unknown';
export type PackageManager = 'npm' | 'yarn' | 'pnpm' | 'unknown';

export interface PlatformInfo {
  platform: Platform;
  shell: Shell;
  packageManager: PackageManager;
  homeDirectory: string;
  pathSeparator: string;
  scriptExtension: string;
  executableExtension: string;
  nodeVersion?: string;
  gitVersion?: string;
  architecture: string;
  environmentVars: Record<string, string>;
}

export interface EnvironmentCapabilities {
  hasGit: boolean;
  hasNode: boolean;
  hasNpm: boolean;
  hasYarn: boolean;
  hasPnpm: boolean;
  canExecuteShell: boolean;
  canExecuteBatch: boolean;
  canExecutePowerShell: boolean;
  supportedScriptTypes: string[];
}

/**
 * Detects platform, environment, and development tools
 * Provides comprehensive information for cross-platform compatibility
 */
export class PlatformDetector {
  private cachedInfo: PlatformInfo | null = null;
  private cachedCapabilities: EnvironmentCapabilities | null = null;

  /**
   * Get comprehensive platform information
   */
  async detect(): Promise<PlatformInfo> {
    if (this.cachedInfo) {
      return this.cachedInfo;
    }

    const platform = this.detectPlatform();
    const shell = await this.detectShell();
    const packageManager = await this.detectPackageManager();
    const homeDirectory = os.homedir();
    const architecture = os.arch();

    const info: PlatformInfo = {
      platform,
      shell,
      packageManager,
      homeDirectory,
      pathSeparator: platform === 'windows' ? '\\' : '/',
      scriptExtension: this.getScriptExtension(platform, shell),
      executableExtension: platform === 'windows' ? '.exe' : '',
      nodeVersion: await this.getNodeVersion(),
      gitVersion: await this.getGitVersion(),
      architecture,
      environmentVars: this.getRelevantEnvVars()
    };

    this.cachedInfo = info;
    return info;
  }

  /**
   * Get environment capabilities
   */
  async getCapabilities(): Promise<EnvironmentCapabilities> {
    if (this.cachedCapabilities) {
      return this.cachedCapabilities;
    }

    const capabilities: EnvironmentCapabilities = {
      hasGit: await this.checkCommand('git'),
      hasNode: await this.checkCommand('node'),
      hasNpm: await this.checkCommand('npm'),
      hasYarn: await this.checkCommand('yarn'),
      hasPnpm: await this.checkCommand('pnpm'),
      canExecuteShell: await this.canExecuteType('shell'),
      canExecuteBatch: await this.canExecuteType('batch'),
      canExecutePowerShell: await this.canExecuteType('powershell'),
      supportedScriptTypes: await this.getSupportedScriptTypes()
    };

    this.cachedCapabilities = capabilities;
    return capabilities;
  }

  /**
   * Detect the current platform
   */
  private detectPlatform(): Platform {
    const platform = os.platform();
    switch (platform) {
      case 'win32':
        return 'windows';
      case 'darwin':
        return 'macos';
      case 'linux':
        return 'linux';
      default:
        // Default to linux for other Unix-like systems
        return 'linux';
    }
  }

  /**
   * Detect the current shell
   */
  private async detectShell(): Promise<Shell> {
    try {
      // Check environment variables first
      const shell = process.env.SHELL || process.env.ComSpec || '';

      if (shell.includes('bash')) return 'bash';
      if (shell.includes('zsh')) return 'zsh';
      if (shell.includes('powershell') || shell.includes('pwsh')) return 'powershell';
      if (shell.includes('cmd')) return 'cmd';
      if (shell.includes('fish')) return 'fish';

      // Try to detect by checking what's available
      const platform = this.detectPlatform();

      if (platform === 'windows') {
        // Check for PowerShell first, then cmd
        if (await this.checkCommand('powershell')) return 'powershell';
        if (await this.checkCommand('pwsh')) return 'powershell';
        return 'cmd';
      } else {
        // Unix-like systems
        if (await this.checkCommand('zsh')) return 'zsh';
        if (await this.checkCommand('bash')) return 'bash';
        if (await this.checkCommand('fish')) return 'fish';
        return 'bash'; // Default fallback
      }
    } catch {
      return 'unknown';
    }
  }

  /**
   * Detect the preferred package manager
   */
  private async detectPackageManager(): Promise<PackageManager> {
    try {
      // Check for lock files first (most reliable)
      const cwd = process.cwd();

      if (await fs.pathExists(path.join(cwd, 'pnpm-lock.yaml'))) {
        return 'pnpm';
      }

      if (await fs.pathExists(path.join(cwd, 'yarn.lock'))) {
        return 'yarn';
      }

      if (await fs.pathExists(path.join(cwd, 'package-lock.json'))) {
        return 'npm';
      }

      // Check for globally available package managers
      if (await this.checkCommand('pnpm')) return 'pnpm';
      if (await this.checkCommand('yarn')) return 'yarn';
      if (await this.checkCommand('npm')) return 'npm';

      return 'unknown';
    } catch {
      return 'unknown';
    }
  }

  /**
   * Get the appropriate script extension for the platform and shell
   */
  private getScriptExtension(platform: Platform, shell: Shell): string {
    if (platform === 'windows') {
      return shell === 'powershell' ? '.ps1' : '.bat';
    }
    return '.sh';
  }

  /**
   * Get Node.js version
   */
  private async getNodeVersion(): Promise<string | undefined> {
    try {
      const version = execSync('node --version', {
        encoding: 'utf8',
        stdio: 'pipe',
        timeout: 5000
      }).trim();
      return version;
    } catch {
      return undefined;
    }
  }

  /**
   * Get Git version
   */
  private async getGitVersion(): Promise<string | undefined> {
    try {
      const version = execSync('git --version', {
        encoding: 'utf8',
        stdio: 'pipe',
        timeout: 5000
      }).trim();
      return version;
    } catch {
      return undefined;
    }
  }

  /**
   * Get relevant environment variables
   */
  private getRelevantEnvVars(): Record<string, string> {
    const relevantVars = [
      'PATH', 'HOME', 'USER', 'USERNAME', 'USERPROFILE',
      'SHELL', 'ComSpec', 'NODE_ENV', 'npm_config_prefix',
      'CLAUDE_CONFIG_PATH', 'CLAUDE_HOOKS_PATH'
    ];

    const envVars: Record<string, string> = {};
    for (const varName of relevantVars) {
      const value = process.env[varName];
      if (value) {
        envVars[varName] = value;
      }
    }

    return envVars;
  }

  /**
   * Check if a command is available
   */
  private async checkCommand(command: string): Promise<boolean> {
    try {
      const platform = this.detectPlatform();
      const checkCmd = platform === 'windows'
        ? `where ${command}`
        : `which ${command}`;

      execSync(checkCmd, {
        stdio: 'pipe',
        timeout: 3000
      });
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Check if we can execute a specific script type
   */
  private async canExecuteType(type: 'shell' | 'batch' | 'powershell'): Promise<boolean> {
    try {
      switch (type) {
        case 'shell':
          return await this.checkCommand('sh') || await this.checkCommand('bash');
        case 'batch':
          return this.detectPlatform() === 'windows';
        case 'powershell':
          return await this.checkCommand('powershell') || await this.checkCommand('pwsh');
        default:
          return false;
      }
    } catch {
      return false;
    }
  }

  /**
   * Get all supported script types for this environment
   */
  private async getSupportedScriptTypes(): Promise<string[]> {
    const types: string[] = [];
    const capabilities = await this.getCapabilities();

    if (capabilities.canExecuteShell) types.push('.sh');
    if (capabilities.canExecuteBatch) types.push('.bat');
    if (capabilities.canExecutePowerShell) types.push('.ps1');

    return types;
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
  isUnixLike(): boolean {
    const platform = this.detectPlatform();
    return platform === 'macos' || platform === 'linux';
  }

  /**
   * Get the appropriate Claude hooks directory for this platform
   */
  getClaudeHooksDirectory(): string {
    const homeDir = os.homedir();
    return path.join(homeDir, '.claude', 'hooks');
  }

  /**
   * Get the appropriate ginko directory for this platform
   */
  getGinkoDirectory(): string {
    const homeDir = os.homedir();
    return path.join(homeDir, '.ginko');
  }

  /**
   * Clear cached information (useful for testing)
   */
  clearCache(): void {
    this.cachedInfo = null;
    this.cachedCapabilities = null;
  }
}