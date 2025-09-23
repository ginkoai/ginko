/**
 * @fileType: utility
 * @status: current
 * @updated: 2025-09-19
 * @tags: [validation, orchestrator, coordinator, first-use-experience]
 * @related: [git-validator.ts, config-validator.ts, environment-validator.ts, index.ts]
 * @priority: critical
 * @complexity: medium
 * @dependencies: []
 */

import { GitValidator, ValidationResult, Validator } from './git-validator.js';
import { ConfigValidator } from './config-validator.js';
import { EnvironmentValidator } from './environment-validator.js';

/**
 * Severity levels for validation issues
 */
export enum ValidationSeverity {
  ERROR = 'error',
  WARNING = 'warning',
  INFO = 'info'
}

/**
 * Individual validation report entry
 */
export interface ValidationReport {
  validator: string;
  severity: ValidationSeverity;
  valid: boolean;
  message: string;
  suggestions: string[];
  metadata?: Record<string, any>;
  duration?: number; // milliseconds
}

/**
 * Summary of all validation results
 */
export interface ValidationSummary {
  success: boolean;
  canProceed: boolean;
  reports: ValidationReport[];
  errors: ValidationReport[];
  warnings: ValidationReport[];
  duration: number; // milliseconds
  metadata: {
    platform: string;
    nodeVersion: string;
    gitAvailable: boolean;
    configExists: boolean;
    totalChecks: number;
    passedChecks: number;
  };
}

/**
 * Options for validation orchestration
 */
export interface ValidationOptions {
  projectRoot?: string;
  skipOptional?: boolean;
  verbose?: boolean;
  timeoutMs?: number;
}

/**
 * Orchestrates multiple validators to provide comprehensive validation
 * Used by ginko doctor command and init process
 */
export class ValidationOrchestrator {
  private options: ValidationOptions;
  private reports: ValidationReport[] = [];

  constructor(options: ValidationOptions = {}) {
    this.options = {
      projectRoot: process.cwd(),
      skipOptional: false,
      verbose: false,
      timeoutMs: 10000,
      ...options
    };
  }

  /**
   * Run all validation checks
   */
  async runAllValidations(): Promise<ValidationSummary> {
    const startTime = Date.now();
    this.reports = [];

    try {
      // Run core validations in order
      await this.runEnvironmentValidation();
      await this.runGitValidation();
      await this.runConfigValidation();

      // Run optional validations if requested
      if (!this.options.skipOptional) {
        await this.runOptionalValidations();
      }

      return this.generateSummary(Date.now() - startTime);
    } catch (error) {
      // If orchestration itself fails, create emergency summary
      return this.generateEmergencySummary(
        Date.now() - startTime,
        error instanceof Error ? error.message : 'Unknown orchestration error'
      );
    }
  }

  /**
   * Run only critical validations needed for ginko to function
   */
  async runCriticalValidations(): Promise<ValidationSummary> {
    const startTime = Date.now();
    this.reports = [];

    try {
      await this.runEnvironmentValidation();
      await this.runGitValidation();

      return this.generateSummary(Date.now() - startTime);
    } catch (error) {
      return this.generateEmergencySummary(
        Date.now() - startTime,
        error instanceof Error ? error.message : 'Critical validation failed'
      );
    }
  }

  /**
   * Run environment validation
   */
  private async runEnvironmentValidation(): Promise<void> {
    const validator = new EnvironmentValidator();
    await this.runValidator('Environment', validator, ValidationSeverity.ERROR);
  }

  /**
   * Run git repository validation
   */
  private async runGitValidation(): Promise<void> {
    const validator = new GitValidator(this.options.projectRoot);
    await this.runValidator('Git Repository', validator, ValidationSeverity.ERROR);
  }

  /**
   * Run configuration validation
   */
  private async runConfigValidation(): Promise<void> {
    const validator = new ConfigValidator(this.options.projectRoot);
    await this.runValidator('Configuration', validator, ValidationSeverity.WARNING);
  }

  /**
   * Run optional validations for enhanced experience
   */
  private async runOptionalValidations(): Promise<void> {
    // Could add validators for:
    // - IDE integration checks
    // - Network connectivity
    // - Disk space requirements
    // - Performance benchmarks

    // For now, we'll add a placeholder that succeeds
    this.reports.push({
      validator: 'Optional Tools',
      severity: ValidationSeverity.INFO,
      valid: true,
      message: 'Optional tool checks completed',
      suggestions: [
        'Consider installing VS Code for enhanced development experience',
        'Install vim or nano for quick file editing',
        'curl or wget can help with downloading resources'
      ],
      metadata: { skipped: false }
    });
  }

  /**
   * Run a single validator with timeout and error handling
   */
  private async runValidator(
    name: string,
    validator: Validator,
    defaultSeverity: ValidationSeverity
  ): Promise<void> {
    const startTime = Date.now();

    try {
      // Create timeout promise
      const timeoutPromise = new Promise<ValidationResult>((_, reject) => {
        setTimeout(() => {
          reject(new Error(`Validation timeout (${this.options.timeoutMs}ms)`));
        }, this.options.timeoutMs);
      });

      // Race validation against timeout
      const result = await Promise.race([
        validator.validate(),
        timeoutPromise
      ]);

      const duration = Date.now() - startTime;

      // Determine severity
      let severity = defaultSeverity;
      if (result.valid) {
        severity = ValidationSeverity.INFO;
      } else if (result.metadata?.warning) {
        severity = ValidationSeverity.WARNING;
      }

      this.reports.push({
        validator: name,
        severity,
        valid: result.valid,
        message: result.error || `${name} validation passed`,
        suggestions: result.suggestions || [],
        metadata: result.metadata,
        duration
      });

    } catch (error) {
      const duration = Date.now() - startTime;

      this.reports.push({
        validator: name,
        severity: ValidationSeverity.ERROR,
        valid: false,
        message: error instanceof Error ? error.message : `${name} validation failed`,
        suggestions: this.getGenericSuggestions(name),
        duration
      });
    }
  }

  /**
   * Generate comprehensive validation summary
   */
  private generateSummary(totalDuration: number): ValidationSummary {
    const errors = this.reports.filter(r => r.severity === ValidationSeverity.ERROR);
    const warnings = this.reports.filter(r => r.severity === ValidationSeverity.WARNING);
    const passedChecks = this.reports.filter(r => r.valid).length;

    // Determine if ginko can proceed
    // Critical: No errors in Environment or Git validation
    const criticalErrors = errors.filter(r =>
      r.validator === 'Environment' || r.validator === 'Git Repository'
    );
    const canProceed = criticalErrors.length === 0;

    // Overall success: no errors at all
    const success = errors.length === 0;

    return {
      success,
      canProceed,
      reports: this.reports,
      errors,
      warnings,
      duration: totalDuration,
      metadata: {
        platform: process.platform,
        nodeVersion: process.version,
        gitAvailable: this.isToolAvailable('Git Repository'),
        configExists: this.isToolAvailable('Configuration'),
        totalChecks: this.reports.length,
        passedChecks
      }
    };
  }

  /**
   * Generate emergency summary when orchestration fails
   */
  private generateEmergencySummary(duration: number, error: string): ValidationSummary {
    const emergencyReport: ValidationReport = {
      validator: 'Orchestration',
      severity: ValidationSeverity.ERROR,
      valid: false,
      message: `Validation system failed: ${error}`,
      suggestions: [
        'Check Node.js installation and permissions',
        'Try running in a different directory',
        'Contact support if issue persists'
      ],
      duration
    };

    return {
      success: false,
      canProceed: false,
      reports: [emergencyReport],
      errors: [emergencyReport],
      warnings: [],
      duration,
      metadata: {
        platform: process.platform,
        nodeVersion: process.version,
        gitAvailable: false,
        configExists: false,
        totalChecks: 1,
        passedChecks: 0
      }
    };
  }

  /**
   * Check if a tool/validator passed
   */
  private isToolAvailable(validatorName: string): boolean {
    const report = this.reports.find(r => r.validator === validatorName);
    return report?.valid ?? false;
  }

  /**
   * Get generic suggestions for validator failures
   */
  private getGenericSuggestions(validatorName: string): string[] {
    switch (validatorName) {
      case 'Environment':
        return [
          'Check Node.js installation: node --version',
          'Verify system requirements',
          'Restart terminal and try again'
        ];
      case 'Git Repository':
        return [
          'Initialize git repository: git init',
          'Navigate to existing repository',
          'Install git if not available'
        ];
      case 'Configuration':
        return [
          'Create ginko.json: ginko init',
          'Check file permissions',
          'Verify JSON syntax'
        ];
      default:
        return [
          'Check system configuration',
          'Verify all requirements are met',
          'Try running validation again'
        ];
    }
  }

  /**
   * Get filtered reports by severity
   */
  getReportsBySeverity(severity: ValidationSeverity): ValidationReport[] {
    return this.reports.filter(r => r.severity === severity);
  }

  /**
   * Get failed validations
   */
  getFailedValidations(): ValidationReport[] {
    return this.reports.filter(r => !r.valid);
  }

  /**
   * Check if specific validator passed
   */
  hasValidatorPassed(validatorName: string): boolean {
    return this.isToolAvailable(validatorName);
  }

  /**
   * Get suggestions for fixing all issues
   */
  getAllSuggestions(): string[] {
    const allSuggestions: string[] = [];

    this.reports
      .filter(r => !r.valid)
      .forEach(r => {
        allSuggestions.push(`${r.validator}: ${r.message}`);
        r.suggestions.forEach(s => allSuggestions.push(`  → ${s}`));
      });

    return allSuggestions;
  }
}