/**
 * @fileType: utility
 * @status: current
 * @updated: 2025-09-19
 * @tags: [validation, environment, nodejs, platform, first-use-experience]
 * @related: [git-validator.ts, config-validator.ts, index.ts]
 * @priority: critical
 * @complexity: medium
 * @dependencies: [fs-extra]
 */

import * as fs from 'fs-extra';
import * as path from 'path';
import * as os from 'os';
import { spawn } from 'child_process';
import { ValidationResult, Validator } from './git-validator.js';

/**
 * Platform type detection
 */
export type Platform = 'windows' | 'macos' | 'linux' | 'unknown';

/**
 * Node.js version requirements
 */
export interface NodeRequirements {
  minimum: string;
  recommended: string;
  maximum?: string;
}

/**
 * Environment information
 */
export interface EnvironmentInfo {
  platform: Platform;
  nodeVersion: string;
  npmVersion?: string;
  gitVersion?: string;
  shellType?: string;
  workingDirectory: string;
  homeDirectory: string;
  pathSeparator: string;
  executable: {
    node: string;
    npm?: string;
    git?: string;
  };
}

/**
 * Default Node.js requirements for ginko
 */
const NODE_REQUIREMENTS: NodeRequirements = {
  minimum: '18.0.0',
  recommended: '20.0.0'
};

/**
 * Validates system environment requirements for ginko
 *
 * Checks:
 * - Node.js version compatibility
 * - Platform detection and support
 * - Required commands availability
 * - Directory permissions
 * - Path configuration
 */
export class EnvironmentValidator implements Validator {
  private lastError?: string;
  private lastSuggestions: string[] = [];
  private environmentInfo?: EnvironmentInfo;

  constructor() {}

  /**
   * Perform comprehensive environment validation
   */
  async validate(): Promise<ValidationResult> {
    try {
      // Check 1: Platform detection
      const platformCheck = await this.detectPlatform();
      if (!platformCheck.valid) {
        return platformCheck;
      }

      // Check 2: Node.js version
      const nodeCheck = await this.validateNodeVersion();
      if (!nodeCheck.valid) {
        return nodeCheck;
      }

      // Check 3: Required commands
      const commandCheck = await this.validateCommands();
      if (!commandCheck.valid) {
        return commandCheck;
      }

      // Check 4: Permissions
      const permissionCheck = await this.validatePermissions();
      if (!permissionCheck.valid) {
        return permissionCheck;
      }

      // Check 5: Environment paths
      const pathCheck = await this.validatePaths();
      if (!pathCheck.valid) {
        return pathCheck;
      }

      // All checks passed
      return {
        valid: true,
        metadata: {
          environment: this.environmentInfo,
          platform: this.environmentInfo?.platform,
          nodeCompliant: this.isNodeVersionCompliant(),
          hasOptionalTools: await this.checkOptionalTools()
        }
      };

    } catch (error) {
      this.lastError = error instanceof Error ? error.message : 'Unknown environment validation error';
      this.lastSuggestions = this.generateErrorSuggestions(error);

      return {
        valid: false,
        error: this.lastError,
        suggestions: this.lastSuggestions
      };
    }
  }

  /**
   * Get user-friendly error message
   */
  getErrorMessage(): string {
    return this.lastError || 'Environment validation failed';
  }

  /**
   * Get actionable suggestions for fixing the error
   */
  getSuggestions(): string[] {
    return this.lastSuggestions;
  }

  /**
   * Detect platform and basic environment info
   */
  private async detectPlatform(): Promise<ValidationResult> {
    try {
      const platform = this.getPlatformType();
      const nodeVersion = process.version;
      const workingDirectory = process.cwd();
      const homeDirectory = os.homedir();

      this.environmentInfo = {
        platform,
        nodeVersion,
        shellType: this.getShellType(),
        workingDirectory,
        homeDirectory,
        pathSeparator: path.sep,
        executable: {
          node: process.execPath
        }
      };

      // Check if platform is supported
      if (platform === 'unknown') {
        this.lastError = 'Unsupported or unknown platform detected';
        this.lastSuggestions = [
          `Detected platform: ${process.platform}`,
          'Ginko supports Windows, macOS, and Linux',
          'Contact support if you believe this is an error'
        ];

        return {
          valid: false,
          error: this.lastError,
          suggestions: this.lastSuggestions
        };
      }

      return { valid: true };
    } catch (error) {
      this.lastError = 'Failed to detect platform environment';
      this.lastSuggestions = [
        'Check Node.js installation',
        'Verify system environment variables',
        'Restart terminal and try again'
      ];

      return {
        valid: false,
        error: this.lastError,
        suggestions: this.lastSuggestions
      };
    }
  }

  /**
   * Validate Node.js version meets requirements
   */
  private async validateNodeVersion(): Promise<ValidationResult> {
    try {
      const currentVersion = process.version.slice(1); // Remove 'v' prefix
      const meetsMinimum = this.compareVersions(currentVersion, NODE_REQUIREMENTS.minimum) >= 0;

      if (!meetsMinimum) {
        this.lastError = `Node.js version ${currentVersion} is below minimum requirement`;
        this.lastSuggestions = [
          `Minimum required: Node.js v${NODE_REQUIREMENTS.minimum}`,
          `Recommended: Node.js v${NODE_REQUIREMENTS.recommended}`,
          `Current version: v${currentVersion}`,
          'Update Node.js: https://nodejs.org/',
          'Use nvm to manage versions: https://github.com/nvm-sh/nvm'
        ];

        return {
          valid: false,
          error: this.lastError,
          suggestions: this.lastSuggestions
        };
      }

      // Check for recommended version (warning only)
      const meetsRecommended = this.compareVersions(currentVersion, NODE_REQUIREMENTS.recommended) >= 0;
      const warnings = [];

      if (!meetsRecommended) {
        warnings.push(`Consider upgrading to Node.js v${NODE_REQUIREMENTS.recommended} for best performance`);
      }

      return {
        valid: true,
        metadata: {
          currentVersion,
          meetsMinimum,
          meetsRecommended,
          warnings
        }
      };
    } catch (error) {
      this.lastError = 'Failed to validate Node.js version';
      this.lastSuggestions = [
        'Check Node.js installation: node --version',
        'Reinstall Node.js if command fails'
      ];

      return {
        valid: false,
        error: this.lastError,
        suggestions: this.lastSuggestions
      };
    }
  }

  /**
   * Validate required commands are available
   */
  private async validateCommands(): Promise<ValidationResult> {
    const commands = ['npm', 'git'];
    const missing: string[] = [];
    const available: Record<string, string> = {};

    for (const command of commands) {
      try {
        const version = await this.getCommandVersion(command);
        if (version) {
          available[command] = version;
          if (this.environmentInfo) {
            (this.environmentInfo as any)[`${command}Version`] = version;
          }
        } else {
          missing.push(command);
        }
      } catch {
        missing.push(command);
      }
    }

    if (missing.length > 0) {
      this.lastError = `Required commands not found: ${missing.join(', ')}`;
      this.lastSuggestions = [];

      missing.forEach(cmd => {
        switch (cmd) {
          case 'npm':
            this.lastSuggestions.push(
              'Install npm: comes with Node.js from https://nodejs.org/',
              'Or install yarn as alternative: https://yarnpkg.com/'
            );
            break;
          case 'git':
            this.lastSuggestions.push(
              'Install git: https://git-scm.com/downloads',
              'Verify installation: git --version'
            );
            break;
          default:
            this.lastSuggestions.push(`Install ${cmd} and ensure it's in your PATH`);
        }
      });

      return {
        valid: false,
        error: this.lastError,
        suggestions: this.lastSuggestions
      };
    }

    return {
      valid: true,
      metadata: { availableCommands: available }
    };
  }

  /**
   * Validate directory permissions
   */
  private async validatePermissions(): Promise<ValidationResult> {
    try {
      const testPaths = [
        process.cwd(),
        os.homedir()
      ];

      const permissionIssues: string[] = [];

      for (const testPath of testPaths) {
        try {
          // Test read permission
          await fs.access(testPath, fs.constants.R_OK);

          // Test write permission
          await fs.access(testPath, fs.constants.W_OK);

          // Test create file permission
          const testFile = path.join(testPath, '.ginko-test-' + Date.now());
          await fs.writeFile(testFile, 'test');
          await fs.remove(testFile);

        } catch (error) {
          permissionIssues.push(`Insufficient permissions for: ${testPath}`);
        }
      }

      if (permissionIssues.length > 0) {
        this.lastError = 'Directory permission validation failed';
        this.lastSuggestions = [
          ...permissionIssues,
          'Check directory permissions and ownership',
          'Ensure your user has read/write access',
          'On Unix systems: chmod and chown may help',
          'Try running from a different directory'
        ];

        return {
          valid: false,
          error: this.lastError,
          suggestions: this.lastSuggestions
        };
      }

      return { valid: true };
    } catch (error) {
      this.lastError = 'Failed to validate directory permissions';
      this.lastSuggestions = [
        'Check file system permissions',
        'Ensure directories are accessible',
        'Try running with appropriate user privileges'
      ];

      return {
        valid: false,
        error: this.lastError,
        suggestions: this.lastSuggestions
      };
    }
  }

  /**
   * Validate environment paths and PATH variable
   */
  private async validatePaths(): Promise<ValidationResult> {
    try {
      const pathEnv = process.env.PATH || '';
      const pathDirs = pathEnv.split(path.delimiter);

      // Check if essential directories are in PATH
      const essentialCommands = ['node', 'npm', 'git'];
      const pathIssues: string[] = [];

      for (const command of essentialCommands) {
        const found = await this.findInPath(command);
        if (!found) {
          pathIssues.push(`${command} not found in PATH`);
        }
      }

      if (pathIssues.length > 0) {
        this.lastError = 'PATH environment variable issues detected';
        this.lastSuggestions = [
          ...pathIssues,
          'Update your PATH environment variable',
          'Restart terminal after PATH changes',
          'On Windows: Use System Properties > Environment Variables',
          'On Unix: Update ~/.bashrc or ~/.zshrc'
        ];

        return {
          valid: false,
          error: this.lastError,
          suggestions: this.lastSuggestions
        };
      }

      return {
        valid: true,
        metadata: {
          pathDirs: pathDirs.length,
          pathVariable: pathEnv.length < 500 ? pathEnv : `${pathEnv.slice(0, 500)}...`
        }
      };
    } catch (error) {
      return {
        valid: true,
        metadata: { warning: 'Could not validate PATH environment' }
      };
    }
  }

  /**
   * Get platform type from process.platform
   */
  private getPlatformType(): Platform {
    switch (process.platform) {
      case 'win32':
        return 'windows';
      case 'darwin':
        return 'macos';
      case 'linux':
        return 'linux';
      default:
        return 'unknown';
    }
  }

  /**
   * Detect shell type
   */
  private getShellType(): string {
    if (process.env.SHELL) {
      return path.basename(process.env.SHELL);
    }
    if (process.platform === 'win32') {
      return process.env.COMSPEC ? path.basename(process.env.COMSPEC) : 'cmd';
    }
    return 'unknown';
  }

  /**
   * Get version of a command
   */
  private async getCommandVersion(command: string): Promise<string | null> {
    return new Promise((resolve) => {
      const versionArgs = command === 'npm' ? ['--version'] : ['--version'];
      const proc = spawn(command, versionArgs, { stdio: 'pipe' });

      let output = '';
      proc.stdout?.on('data', (data) => {
        output += data.toString();
      });

      proc.on('close', (code) => {
        if (code === 0 && output.trim()) {
          resolve(output.trim());
        } else {
          resolve(null);
        }
      });

      proc.on('error', () => {
        resolve(null);
      });

      // Timeout after 5 seconds
      setTimeout(() => {
        proc.kill();
        resolve(null);
      }, 5000);
    });
  }

  /**
   * Compare semantic versions
   */
  private compareVersions(a: string, b: string): number {
    const parseVersion = (v: string) => v.split('.').map(n => parseInt(n, 10));
    const aParts = parseVersion(a);
    const bParts = parseVersion(b);

    for (let i = 0; i < Math.max(aParts.length, bParts.length); i++) {
      const aPart = aParts[i] || 0;
      const bPart = bParts[i] || 0;

      if (aPart > bPart) return 1;
      if (aPart < bPart) return -1;
    }

    return 0;
  }

  /**
   * Check if Node.js version meets requirements
   */
  private isNodeVersionCompliant(): boolean {
    const currentVersion = process.version.slice(1);
    return this.compareVersions(currentVersion, NODE_REQUIREMENTS.minimum) >= 0;
  }

  /**
   * Check for optional tools that enhance ginko experience
   */
  private async checkOptionalTools(): Promise<Record<string, boolean>> {
    const optionalTools = ['code', 'vim', 'nano', 'curl', 'wget'];
    const available: Record<string, boolean> = {};

    for (const tool of optionalTools) {
      try {
        available[tool] = await this.findInPath(tool) !== null;
      } catch {
        available[tool] = false;
      }
    }

    return available;
  }

  /**
   * Find command in PATH
   */
  private async findInPath(command: string): Promise<string | null> {
    const pathEnv = process.env.PATH || '';
    const pathDirs = pathEnv.split(path.delimiter);
    const extensions = process.platform === 'win32' ? ['.exe', '.cmd', '.bat'] : [''];

    for (const dir of pathDirs) {
      for (const ext of extensions) {
        const fullPath = path.join(dir, command + ext);
        try {
          await fs.access(fullPath, fs.constants.X_OK);
          return fullPath;
        } catch {
          // Continue searching
        }
      }
    }

    return null;
  }

  /**
   * Generate contextual suggestions based on error type
   */
  private generateErrorSuggestions(error: any): string[] {
    const suggestions: string[] = [];

    if (error?.code === 'ENOENT') {
      suggestions.push(
        'Command not found - check installation',
        'Verify PATH environment variable',
        'Restart terminal after installation'
      );
    } else if (error?.code === 'EACCES') {
      suggestions.push(
        'Permission denied - check file permissions',
        'Try running with appropriate privileges',
        'Ensure user has execute permissions'
      );
    } else {
      suggestions.push(
        'Unexpected environment error',
        'Check system configuration',
        'Verify Node.js and system tools installation'
      );
    }

    return suggestions;
  }

  /**
   * Get environment information
   */
  getEnvironmentInfo(): EnvironmentInfo | undefined {
    return this.environmentInfo;
  }

  /**
   * Static method to quickly check Node.js version
   */
  static isNodeVersionValid(): boolean {
    const currentVersion = process.version.slice(1);
    const validator = new EnvironmentValidator();
    return validator.compareVersions(currentVersion, NODE_REQUIREMENTS.minimum) >= 0;
  }

  /**
   * Static method to get platform type
   */
  static getPlatform(): Platform {
    const validator = new EnvironmentValidator();
    return validator.getPlatformType();
  }

  /**
   * Static method to get basic environment info
   */
  static async getBasicInfo(): Promise<Partial<EnvironmentInfo>> {
    const validator = new EnvironmentValidator();
    const result = await validator.validate();
    return result.metadata?.environment || {};
  }
}