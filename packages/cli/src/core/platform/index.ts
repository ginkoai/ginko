/**
 * @fileType: config
 * @status: current
 * @updated: 2025-09-19
 * @tags: [platform, adapter, export, cross-platform, api]
 * @related: [platform-detector.ts, hook-adapter.ts, path-normalizer.ts]
 * @priority: high
 * @complexity: low
 * @dependencies: [platform-detector, hook-adapter, path-normalizer]
 */

// Export types
export type {
  Platform,
  Shell,
  PackageManager,
  PlatformInfo,
  EnvironmentCapabilities
} from './platform-detector.js';

export type {
  HookInfo,
  ConversionResult,
  HookTemplate
} from './hook-adapter.js';

export type {
  PathConversionOptions,
  NormalizedPath
} from './path-normalizer.js';

// Export classes
export { PlatformDetector } from './platform-detector.js';
export { HookAdapter } from './hook-adapter.js';
export { PathNormalizer } from './path-normalizer.js';

// Export a unified platform adapter facade
import { PlatformDetector } from './platform-detector.js';
import { HookAdapter } from './hook-adapter.js';
import { PathNormalizer } from './path-normalizer.js';

/**
 * Unified platform adapter that combines all cross-platform functionality
 * Provides a single entry point for platform-specific operations
 */
export class PlatformAdapter {
  private detector: PlatformDetector;
  private hookAdapter: HookAdapter;
  private pathNormalizer: PathNormalizer;

  constructor() {
    this.detector = new PlatformDetector();
    this.hookAdapter = new HookAdapter();
    this.pathNormalizer = new PathNormalizer();
  }

  /**
   * Get platform detection capabilities
   */
  get platform() {
    return this.detector;
  }

  /**
   * Get hook conversion capabilities
   */
  get hooks() {
    return this.hookAdapter;
  }

  /**
   * Get path normalization capabilities
   */
  get paths() {
    return this.pathNormalizer;
  }

  /**
   * Perform complete platform adaptation for a new installation
   */
  async adaptForCurrentPlatform(): Promise<{
    platform: import('./platform-detector.js').PlatformInfo;
    capabilities: import('./platform-detector.js').EnvironmentCapabilities;
    hooksPath: string;
    ginkoPath: string;
    adaptationSuccess: boolean;
    errors: string[];
    warnings: string[];
  }> {
    const errors: string[] = [];
    const warnings: string[] = [];

    try {
      // Detect platform information
      const platform = await this.detector.detect();
      const capabilities = await this.detector.getCapabilities();

      // Get platform-appropriate paths
      const hooksPath = this.pathNormalizer.getClaudeHooksPath(platform.platform);
      const ginkoPath = this.pathNormalizer.getGinkoPath(platform.platform);

      // Generate hook templates if needed
      try {
        const hookResult = await this.hookAdapter.generateHookTemplates(hooksPath);
        if (!hookResult.success) {
          errors.push(...hookResult.errors);
          warnings.push(...hookResult.warnings);
        }
      } catch (error) {
        warnings.push(`Could not generate hook templates: ${error instanceof Error ? error.message : String(error)}`);
      }

      return {
        platform,
        capabilities,
        hooksPath,
        ginkoPath,
        adaptationSuccess: errors.length === 0,
        errors,
        warnings
      };

    } catch (error) {
      errors.push(`Platform adaptation failed: ${error instanceof Error ? error.message : String(error)}`);

      // Return minimal fallback information
      return {
        platform: {
          platform: 'linux',
          shell: 'bash',
          packageManager: 'npm',
          homeDirectory: require('os').homedir(),
          pathSeparator: '/',
          scriptExtension: '.sh',
          executableExtension: '',
          architecture: require('os').arch(),
          environmentVars: {}
        },
        capabilities: {
          hasGit: false,
          hasNode: false,
          hasNpm: false,
          hasYarn: false,
          hasPnpm: false,
          canExecuteShell: false,
          canExecuteBatch: false,
          canExecutePowerShell: false,
          supportedScriptTypes: []
        },
        hooksPath: '',
        ginkoPath: '',
        adaptationSuccess: false,
        errors,
        warnings
      };
    }
  }

  /**
   * Convert existing hooks to current platform
   */
  async migrateHooks(hooksDirectory: string): Promise<import('./hook-adapter.js').ConversionResult> {
    return await this.hookAdapter.convertHooks(hooksDirectory);
  }

  /**
   * Normalize a path for current platform
   */
  normalizePath(inputPath: string): string {
    return this.pathNormalizer.normalize(inputPath);
  }

  /**
   * Convert a path between platforms
   */
  convertPath(
    inputPath: string,
    fromPlatform: import('./platform-detector.js').Platform,
    toPlatform: import('./platform-detector.js').Platform
  ): string {
    return this.pathNormalizer.convertPath(inputPath, fromPlatform, toPlatform);
  }

  /**
   * Get diagnostic information for troubleshooting
   */
  async getDiagnosticInfo(): Promise<{
    platform: import('./platform-detector.js').PlatformInfo;
    capabilities: import('./platform-detector.js').EnvironmentCapabilities;
    paths: {
      claudeHooks: string;
      ginko: string;
      home: string;
      current: string;
    };
    issues: string[];
    recommendations: string[];
  }> {
    const platform = await this.detector.detect();
    const capabilities = await this.detector.getCapabilities();
    const issues: string[] = [];
    const recommendations: string[] = [];

    // Check for common issues
    if (!capabilities.hasGit) {
      issues.push('Git is not available in PATH');
      recommendations.push('Install Git and ensure it is in your PATH');
    }

    if (!capabilities.hasNode) {
      issues.push('Node.js is not available in PATH');
      recommendations.push('Install Node.js and ensure it is in your PATH');
    }

    if (platform.platform === 'windows' && platform.shell === 'cmd') {
      recommendations.push('Consider using PowerShell for better scripting capabilities');
    }

    const paths = {
      claudeHooks: this.pathNormalizer.getClaudeHooksPath(platform.platform),
      ginko: this.pathNormalizer.getGinkoPath(platform.platform),
      home: platform.homeDirectory,
      current: process.cwd()
    };

    return {
      platform,
      capabilities,
      paths,
      issues,
      recommendations
    };
  }
}

// Export a default instance for convenience
export const platformAdapter = new PlatformAdapter();