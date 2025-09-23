/**
 * @fileType: utility
 * @status: current
 * @updated: 2025-09-19
 * @tags: [validation, config, ginko-json, schema, first-use-experience]
 * @related: [git-validator.ts, environment-validator.ts, index.ts]
 * @priority: critical
 * @complexity: medium
 * @dependencies: [fs-extra]
 */

import * as fs from 'fs-extra';
import * as path from 'path';
import { ValidationResult, Validator } from './git-validator.js';

/**
 * Schema for ginko.json configuration
 */
export interface GinkoConfig {
  version: string;
  paths: {
    docs: Record<string, string>;
    ginko: Record<string, string>;
  };
  features: Record<string, boolean>;
  platform?: PlatformConfig;
  [key: string]: any; // Allow additional properties
}

/**
 * Platform-specific configuration
 */
export interface PlatformConfig {
  type: 'windows' | 'macos' | 'linux';
  shell?: string;
  pathSeparator?: string;
  hooks?: Record<string, string>;
}

/**
 * Default ginko configuration
 */
const DEFAULT_CONFIG: GinkoConfig = {
  version: '1.0.0',
  paths: {
    docs: {
      root: './docs',
      adr: './docs/adr',
      prd: './docs/PRD',
      retrospectives: './docs/retrospectives'
    },
    ginko: {
      root: './.ginko',
      context: './.ginko/context',
      modules: './.ginko/context/modules',
      sessions: './.ginko/sessions'
    }
  },
  features: {
    autoHandoff: true,
    contextCapture: true,
    aiInsights: true,
    teamSharing: false
  }
};

/**
 * Validates ginko.json configuration file
 *
 * Checks:
 * - File exists and is readable
 * - Valid JSON syntax
 * - Required fields are present
 * - Paths are valid and accessible
 * - Configuration schema compliance
 */
export class ConfigValidator implements Validator {
  private configPath: string;
  private lastError?: string;
  private lastSuggestions: string[] = [];
  private config?: GinkoConfig;

  constructor(projectRoot: string = process.cwd()) {
    this.configPath = path.join(projectRoot, 'ginko.json');
  }

  /**
   * Perform comprehensive config validation
   */
  async validate(): Promise<ValidationResult> {
    try {
      // Check 1: File existence and readability
      const fileCheck = await this.checkConfigFile();
      if (!fileCheck.valid) {
        return fileCheck;
      }

      // Check 2: JSON syntax and loading
      const loadCheck = await this.loadConfiguration();
      if (!loadCheck.valid) {
        return loadCheck;
      }

      // Check 3: Schema validation
      const schemaCheck = await this.validateSchema();
      if (!schemaCheck.valid) {
        return schemaCheck;
      }

      // Check 4: Path validation
      const pathCheck = await this.validatePaths();
      if (!pathCheck.valid) {
        return pathCheck;
      }

      // All checks passed
      return {
        valid: true,
        metadata: {
          configPath: this.configPath,
          config: this.config,
          hasCustomPaths: this.hasCustomPaths(),
          hasPlatformConfig: !!this.config?.platform,
          enabledFeatures: this.getEnabledFeatures()
        }
      };

    } catch (error) {
      this.lastError = error instanceof Error ? error.message : 'Unknown config validation error';
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
    return this.lastError || 'Configuration validation failed';
  }

  /**
   * Get actionable suggestions for fixing the error
   */
  getSuggestions(): string[] {
    return this.lastSuggestions;
  }

  /**
   * Check if config file exists and is readable
   */
  private async checkConfigFile(): Promise<ValidationResult> {
    try {
      const exists = await fs.pathExists(this.configPath);

      if (!exists) {
        this.lastError = 'ginko.json configuration file not found';
        this.lastSuggestions = [
          'Create ginko.json: ginko init',
          'Or create manually with default configuration',
          `Expected location: ${this.configPath}`,
          'Run in project root directory where ginko.json should exist'
        ];

        return {
          valid: false,
          error: this.lastError,
          suggestions: this.lastSuggestions
        };
      }

      // Check if file is readable
      try {
        await fs.access(this.configPath, fs.constants.R_OK);
      } catch {
        this.lastError = 'ginko.json exists but is not readable';
        this.lastSuggestions = [
          'Check file permissions on ginko.json',
          'Ensure your user has read access',
          `File location: ${this.configPath}`
        ];

        return {
          valid: false,
          error: this.lastError,
          suggestions: this.lastSuggestions
        };
      }

      return { valid: true };
    } catch (error) {
      this.lastError = 'Failed to check config file accessibility';
      this.lastSuggestions = [
        'Verify directory permissions',
        'Check if path is valid',
        `Target path: ${this.configPath}`
      ];

      return {
        valid: false,
        error: this.lastError,
        suggestions: this.lastSuggestions
      };
    }
  }

  /**
   * Load and parse JSON configuration
   */
  private async loadConfiguration(): Promise<ValidationResult> {
    try {
      const configData = await fs.readFile(this.configPath, 'utf-8');

      // Parse JSON
      try {
        this.config = JSON.parse(configData);
      } catch (parseError) {
        this.lastError = 'ginko.json contains invalid JSON syntax';
        this.lastSuggestions = [
          'Fix JSON syntax errors in ginko.json',
          'Validate JSON online: https://jsonlint.com/',
          'Check for missing commas, quotes, or brackets',
          'Parse error: ' + (parseError instanceof Error ? parseError.message : 'Unknown')
        ];

        return {
          valid: false,
          error: this.lastError,
          suggestions: this.lastSuggestions
        };
      }

      return { valid: true };
    } catch (error) {
      this.lastError = 'Failed to read ginko.json file';
      this.lastSuggestions = [
        'Check if file is corrupted',
        'Ensure file encoding is UTF-8',
        'Try recreating the file: ginko init --force'
      ];

      return {
        valid: false,
        error: this.lastError,
        suggestions: this.lastSuggestions
      };
    }
  }

  /**
   * Validate configuration schema
   */
  private async validateSchema(): Promise<ValidationResult> {
    if (!this.config) {
      this.lastError = 'Configuration not loaded';
      return { valid: false, error: this.lastError };
    }

    const errors: string[] = [];

    // Check required top-level fields
    if (!this.config.version) {
      errors.push('Missing required field: version');
    }

    if (!this.config.paths) {
      errors.push('Missing required field: paths');
    } else {
      // Check required path categories
      if (!this.config.paths.docs) {
        errors.push('Missing required field: paths.docs');
      }
      if (!this.config.paths.ginko) {
        errors.push('Missing required field: paths.ginko');
      }
    }

    if (!this.config.features) {
      errors.push('Missing required field: features');
    }

    // Check version format
    if (this.config.version && !this.isValidVersion(this.config.version)) {
      errors.push('Invalid version format. Expected semantic version (e.g., "1.0.0")');
    }

    if (errors.length > 0) {
      this.lastError = 'Configuration schema validation failed';
      this.lastSuggestions = [
        ...errors.map(err => `Fix: ${err}`),
        'Compare with default config structure',
        'Run: ginko init --force to reset to defaults'
      ];

      return {
        valid: false,
        error: this.lastError,
        suggestions: this.lastSuggestions
      };
    }

    return { valid: true };
  }

  /**
   * Validate configured paths exist or can be created
   */
  private async validatePaths(): Promise<ValidationResult> {
    if (!this.config?.paths) {
      return { valid: true }; // Already validated in schema check
    }

    const warnings: string[] = [];
    const errors: string[] = [];

    // Validate document paths
    if (this.config.paths.docs) {
      for (const [name, docPath] of Object.entries(this.config.paths.docs)) {
        const fullPath = path.resolve(docPath);
        const exists = await fs.pathExists(fullPath);

        if (!exists) {
          warnings.push(`Document path '${name}' does not exist: ${docPath}`);
        } else {
          try {
            await fs.access(fullPath, fs.constants.R_OK | fs.constants.W_OK);
          } catch {
            errors.push(`Document path '${name}' is not accessible: ${docPath}`);
          }
        }
      }
    }

    // Validate ginko paths
    if (this.config.paths.ginko) {
      for (const [name, ginkoPath] of Object.entries(this.config.paths.ginko)) {
        const fullPath = path.resolve(ginkoPath);
        const exists = await fs.pathExists(fullPath);

        if (!exists) {
          warnings.push(`Ginko path '${name}' does not exist: ${ginkoPath}`);
        }
      }
    }

    if (errors.length > 0) {
      this.lastError = 'Path validation failed';
      this.lastSuggestions = [
        ...errors.map(err => `Fix: ${err}`),
        'Ensure all paths are accessible',
        'Check directory permissions',
        'Run: ginko init to create missing directories'
      ];

      return {
        valid: false,
        error: this.lastError,
        suggestions: this.lastSuggestions
      };
    }

    // Return success with warnings
    return {
      valid: true,
      metadata: {
        warnings,
        pathsChecked: {
          docs: Object.keys(this.config.paths.docs || {}),
          ginko: Object.keys(this.config.paths.ginko || {})
        }
      }
    };
  }

  /**
   * Check if version string is valid semantic version
   */
  private isValidVersion(version: string): boolean {
    const semverRegex = /^\d+\.\d+\.\d+(-[a-zA-Z0-9.-]+)?(\+[a-zA-Z0-9.-]+)?$/;
    return semverRegex.test(version);
  }

  /**
   * Check if config has custom paths (different from defaults)
   */
  private hasCustomPaths(): boolean {
    if (!this.config?.paths) return false;

    const defaultDocs = DEFAULT_CONFIG.paths.docs;
    const defaultGinko = DEFAULT_CONFIG.paths.ginko;

    return (
      JSON.stringify(this.config.paths.docs) !== JSON.stringify(defaultDocs) ||
      JSON.stringify(this.config.paths.ginko) !== JSON.stringify(defaultGinko)
    );
  }

  /**
   * Get list of enabled features
   */
  private getEnabledFeatures(): string[] {
    if (!this.config?.features) return [];

    return Object.entries(this.config.features)
      .filter(([_, enabled]) => enabled === true)
      .map(([feature, _]) => feature);
  }

  /**
   * Generate contextual suggestions based on error type
   */
  private generateErrorSuggestions(error: any): string[] {
    const suggestions: string[] = [];

    if (error?.code === 'ENOENT') {
      suggestions.push(
        'File not found - create ginko.json configuration',
        'Run: ginko init',
        'Or copy from another project'
      );
    } else if (error?.code === 'EACCES') {
      suggestions.push(
        'Permission denied - check file permissions',
        'Ensure you have read/write access to the directory'
      );
    } else if (error instanceof SyntaxError) {
      suggestions.push(
        'JSON syntax error in ginko.json',
        'Use a JSON validator to find syntax issues',
        'Check for trailing commas, missing quotes'
      );
    } else {
      suggestions.push(
        'Unexpected configuration error',
        'Verify ginko.json format and accessibility',
        'Try recreating: ginko init --force'
      );
    }

    return suggestions;
  }

  /**
   * Get the loaded configuration
   */
  getConfig(): GinkoConfig | undefined {
    return this.config;
  }

  /**
   * Get default configuration
   */
  static getDefaultConfig(): GinkoConfig {
    return JSON.parse(JSON.stringify(DEFAULT_CONFIG));
  }

  /**
   * Static method to validate a config object directly
   */
  static validateConfigObject(config: any): ValidationResult {
    try {
      // Basic type check
      if (typeof config !== 'object' || config === null) {
        return {
          valid: false,
          error: 'Configuration must be an object',
          suggestions: ['Ensure ginko.json contains a valid JSON object']
        };
      }

      // Required fields check
      const required = ['version', 'paths', 'features'];
      const missing = required.filter(field => !(field in config));

      if (missing.length > 0) {
        return {
          valid: false,
          error: `Missing required fields: ${missing.join(', ')}`,
          suggestions: missing.map(field => `Add required field: ${field}`)
        };
      }

      return { valid: true };
    } catch (error) {
      return {
        valid: false,
        error: 'Failed to validate configuration object',
        suggestions: ['Check configuration structure and types']
      };
    }
  }

  /**
   * Static method to merge user config with defaults
   */
  static mergeWithDefaults(userConfig: Partial<GinkoConfig>): GinkoConfig {
    const merged: GinkoConfig = {
      ...DEFAULT_CONFIG,
      ...userConfig
    };

    // Deep merge paths
    if (userConfig.paths) {
      merged.paths = {
        docs: { ...DEFAULT_CONFIG.paths.docs, ...userConfig.paths.docs },
        ginko: { ...DEFAULT_CONFIG.paths.ginko, ...userConfig.paths.ginko }
      };
    }

    // Deep merge features
    if (userConfig.features) {
      merged.features = { ...DEFAULT_CONFIG.features, ...userConfig.features };
    }

    return merged;
  }
}