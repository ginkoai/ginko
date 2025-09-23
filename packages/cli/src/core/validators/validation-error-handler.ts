/**
 * @fileType: utility
 * @status: current
 * @updated: 2025-09-22
 * @tags: [validation, error-handling, cli, user-experience]
 * @related: [input-validator.ts, command-argument-validator.ts, validation-orchestrator.ts]
 * @priority: high
 * @complexity: medium
 * @dependencies: [chalk, cli-table3]
 */

import chalk from 'chalk';
import Table from 'cli-table3';
import { ValidationResult } from './git-validator.js';
import { InputValidationError } from './input-validator.js';
import { ValidationReport, ValidationSeverity } from './validation-orchestrator.js';

/**
 * Error context information for better error messages
 */
export interface ValidationErrorContext {
  command?: string;
  operation?: string;
  userInput?: string;
  suggestions?: string[];
  helpUrl?: string;
  relatedDocs?: string[];
}

/**
 * Enhanced validation error with context and recovery information
 */
export interface EnhancedValidationError {
  type: 'input' | 'environment' | 'command' | 'system';
  severity: ValidationSeverity;
  code: string;
  message: string;
  details?: string;
  context?: ValidationErrorContext;
  recovery?: {
    canAutoFix: boolean;
    autoFixDescription?: string;
    manualSteps?: string[];
    preventionTips?: string[];
  };
  metadata?: Record<string, any>;
}

/**
 * Validation error recovery result
 */
export interface ErrorRecoveryResult {
  success: boolean;
  message: string;
  actionsPerformed?: string[];
  remainingIssues?: string[];
}

/**
 * Comprehensive error handler for validation failures
 * Provides user-friendly error messages, suggestions, and recovery options
 */
export class ValidationErrorHandler {
  private static readonly ERROR_CODES = {
    // Input validation errors
    INVALID_INPUT_FORMAT: 'E001',
    MISSING_REQUIRED_FIELD: 'E002',
    INPUT_TOO_LONG: 'E003',
    INPUT_TOO_SHORT: 'E004',
    INVALID_FILE_PATH: 'E005',
    DANGEROUS_INPUT: 'E006',

    // Environment errors
    NODE_VERSION_INCOMPATIBLE: 'E101',
    MISSING_DEPENDENCY: 'E102',
    PERMISSION_DENIED: 'E103',
    DISK_SPACE_LOW: 'E104',

    // Git errors
    NOT_GIT_REPOSITORY: 'E201',
    GIT_COMMAND_FAILED: 'E202',
    UNCOMMITTED_CHANGES: 'E203',
    MERGE_CONFLICT: 'E204',

    // Configuration errors
    CONFIG_NOT_FOUND: 'E301',
    CONFIG_INVALID: 'E302',
    CONFIG_PERMISSION_DENIED: 'E303',

    // Command errors
    UNKNOWN_COMMAND: 'E401',
    INVALID_ARGUMENTS: 'E402',
    COMMAND_PREREQUISITE_FAILED: 'E403',

    // System errors
    NETWORK_ERROR: 'E501',
    FILE_SYSTEM_ERROR: 'E502',
    TIMEOUT_ERROR: 'E503'
  };

  /**
   * Convert various validation results to enhanced errors
   */
  static createEnhancedError(
    error: ValidationResult | InputValidationError | ValidationReport | Error,
    context?: ValidationErrorContext
  ): EnhancedValidationError {
    if (error instanceof Error) {
      return this.createFromGenericError(error, context);
    }

    if ('field' in error && 'rule' in error) {
      return this.createFromInputValidationError(error, context);
    }

    if ('validator' in error && 'severity' in error) {
      return this.createFromValidationReport(error, context);
    }

    if ('valid' in error) {
      return this.createFromValidationResult(error, context);
    }

    throw new Error('Unknown error type');
  }

  /**
   * Create enhanced error from input validation error
   */
  private static createFromInputValidationError(
    error: InputValidationError,
    context?: ValidationErrorContext
  ): EnhancedValidationError {
    const errorCode = this.getErrorCodeForInputValidation(error.rule);

    return {
      type: 'input',
      severity: ValidationSeverity.ERROR,
      code: errorCode,
      message: `Invalid ${error.field}: ${error.message}`,
      details: `Field '${error.field}' with value '${error.value}' failed validation rule '${error.rule}'`,
      context,
      recovery: {
        canAutoFix: false,
        manualSteps: [
          `Correct the value for '${error.field}'`,
          'Ensure the value meets the required format and constraints',
          'Try the command again with the corrected value'
        ],
        preventionTips: [
          'Use tab completion when available',
          'Check command help with --help flag',
          'Refer to documentation for valid input formats'
        ]
      }
    };
  }

  /**
   * Create enhanced error from validation report
   */
  private static createFromValidationReport(
    report: ValidationReport,
    context?: ValidationErrorContext
  ): EnhancedValidationError {
    return {
      type: this.getErrorTypeFromValidator(report.validator),
      severity: report.severity,
      code: this.getErrorCodeFromReport(report),
      message: report.message,
      context,
      recovery: {
        canAutoFix: this.canAutoFix(report),
        autoFixDescription: this.getAutoFixDescription(report),
        manualSteps: report.suggestions,
        preventionTips: this.getPreventionTips(report.validator)
      },
      metadata: report.metadata
    };
  }

  /**
   * Create enhanced error from validation result
   */
  private static createFromValidationResult(
    result: ValidationResult,
    context?: ValidationErrorContext
  ): EnhancedValidationError {
    return {
      type: 'system',
      severity: ValidationSeverity.ERROR,
      code: 'E999',
      message: result.error || 'Validation failed',
      context,
      recovery: {
        canAutoFix: false,
        manualSteps: result.suggestions || ['Check system requirements', 'Try again']
      }
    };
  }

  /**
   * Create enhanced error from generic error
   */
  private static createFromGenericError(
    error: Error,
    context?: ValidationErrorContext
  ): EnhancedValidationError {
    return {
      type: 'system',
      severity: ValidationSeverity.ERROR,
      code: 'E999',
      message: error.message,
      context,
      recovery: {
        canAutoFix: false,
        manualSteps: ['Check the error details', 'Verify system requirements', 'Try again']
      }
    };
  }

  /**
   * Display user-friendly error message
   */
  static displayError(error: EnhancedValidationError, options?: { verbose?: boolean; noColor?: boolean }): void {
    const { verbose = false, noColor = false } = options || {};

    // Helper functions for styling
    const red = noColor ? (str: string) => str : chalk.red;
    const yellow = noColor ? (str: string) => str : chalk.yellow;
    const blue = noColor ? (str: string) => str : chalk.blue;
    const gray = noColor ? (str: string) => str : chalk.gray;
    const bold = noColor ? (str: string) => str : chalk.bold;

    console.error('');

    // Error header
    const severityIcon = this.getSeverityIcon(error.severity);
    const severityColor = error.severity === ValidationSeverity.ERROR ? red : yellow;

    console.error(severityColor(`${severityIcon} ${bold(error.message)}`));

    if (error.code) {
      console.error(gray(`   Code: ${error.code}`));
    }

    // Context information
    if (error.context) {
      console.error('');
      if (error.context.command) {
        console.error(gray(`   Command: ${error.context.command}`));
      }
      if (error.context.operation) {
        console.error(gray(`   Operation: ${error.context.operation}`));
      }
      if (error.context.userInput && verbose) {
        console.error(gray(`   Input: ${error.context.userInput}`));
      }
    }

    // Details (verbose mode)
    if (error.details && verbose) {
      console.error('');
      console.error(gray('   Details:'));
      console.error(gray(`   ${error.details}`));
    }

    // Recovery information
    if (error.recovery) {
      console.error('');

      // Auto-fix option
      if (error.recovery.canAutoFix && error.recovery.autoFixDescription) {
        console.error(blue('   💡 Auto-fix available:'));
        console.error(`   ${error.recovery.autoFixDescription}`);
        console.error(gray('   Run with --fix flag to automatically resolve this issue'));
        console.error('');
      }

      // Manual steps
      if (error.recovery.manualSteps && error.recovery.manualSteps.length > 0) {
        console.error(yellow('   📋 To fix this issue:'));
        error.recovery.manualSteps.forEach((step, index) => {
          console.error(`   ${index + 1}. ${step}`);
        });
        console.error('');
      }

      // Prevention tips (verbose mode)
      if (error.recovery.preventionTips && error.recovery.preventionTips.length > 0 && verbose) {
        console.error(blue('   🛡️  Prevention tips:'));
        error.recovery.preventionTips.forEach(tip => {
          console.error(`   • ${tip}`);
        });
        console.error('');
      }
    }

    // Help resources
    if (error.context?.helpUrl || error.context?.relatedDocs) {
      console.error(blue('   📚 For more help:'));
      if (error.context.helpUrl) {
        console.error(`   • Documentation: ${error.context.helpUrl}`);
      }
      if (error.context.relatedDocs) {
        error.context.relatedDocs.forEach(doc => {
          console.error(`   • ${doc}`);
        });
      }
      console.error('');
    }
  }

  /**
   * Display multiple validation errors in a table format
   */
  static displayErrorTable(errors: EnhancedValidationError[], options?: { noColor?: boolean }): void {
    const { noColor = false } = options || {};

    if (errors.length === 0) return;

    const table = new Table({
      head: ['Type', 'Code', 'Message', 'Auto-fix'],
      colWidths: [12, 8, 50, 10],
      style: noColor ? {} : {
        head: ['cyan'],
        border: ['gray']
      }
    });

    errors.forEach(error => {
      const autoFix = error.recovery?.canAutoFix ? '✓' : '✗';
      const severityIcon = this.getSeverityIcon(error.severity);

      table.push([
        `${severityIcon} ${error.type}`,
        error.code,
        error.message.length > 45 ? error.message.substring(0, 42) + '...' : error.message,
        autoFix
      ]);
    });

    console.error('\nValidation Issues:');
    console.error(table.toString());
    console.error('');
  }

  /**
   * Attempt to automatically recover from validation errors
   */
  static async attemptAutoRecovery(errors: EnhancedValidationError[]): Promise<ErrorRecoveryResult> {
    const autoFixableErrors = errors.filter(e => e.recovery?.canAutoFix);

    if (autoFixableErrors.length === 0) {
      return {
        success: false,
        message: 'No auto-fixable errors found',
        remainingIssues: errors.map(e => e.message)
      };
    }

    const actionsPerformed: string[] = [];
    const remainingIssues: string[] = [];

    for (const error of autoFixableErrors) {
      try {
        const fixed = await this.performAutoFix(error);
        if (fixed) {
          actionsPerformed.push(error.recovery?.autoFixDescription || 'Fixed validation error');
        } else {
          remainingIssues.push(error.message);
        }
      } catch (fixError) {
        remainingIssues.push(`Failed to fix: ${error.message}`);
      }
    }

    // Add non-auto-fixable errors to remaining issues
    errors.filter(e => !e.recovery?.canAutoFix).forEach(e => {
      remainingIssues.push(e.message);
    });

    return {
      success: actionsPerformed.length > 0,
      message: actionsPerformed.length > 0
        ? `Successfully fixed ${actionsPerformed.length} issue(s)`
        : 'No issues could be automatically fixed',
      actionsPerformed,
      remainingIssues: remainingIssues.length > 0 ? remainingIssues : undefined
    };
  }

  /**
   * Helper methods
   */
  private static getSeverityIcon(severity: ValidationSeverity): string {
    switch (severity) {
      case ValidationSeverity.ERROR:
        return '❌';
      case ValidationSeverity.WARNING:
        return '⚠️';
      case ValidationSeverity.INFO:
        return 'ℹ️';
      default:
        return '•';
    }
  }

  private static getErrorCodeForInputValidation(rule: string): string {
    switch (rule) {
      case 'required':
        return this.ERROR_CODES.MISSING_REQUIRED_FIELD;
      case 'minLength':
        return this.ERROR_CODES.INPUT_TOO_SHORT;
      case 'maxLength':
        return this.ERROR_CODES.INPUT_TOO_LONG;
      case 'pattern':
        return this.ERROR_CODES.INVALID_INPUT_FORMAT;
      default:
        return this.ERROR_CODES.INVALID_INPUT_FORMAT;
    }
  }

  private static getErrorTypeFromValidator(validator: string): 'input' | 'environment' | 'command' | 'system' {
    if (validator.includes('input') || validator.includes('argument')) return 'input';
    if (validator.includes('environment') || validator.includes('node')) return 'environment';
    if (validator.includes('command')) return 'command';
    return 'system';
  }

  private static getErrorCodeFromReport(report: ValidationReport): string {
    // Map validator types to error codes
    if (report.validator.includes('git')) return this.ERROR_CODES.NOT_GIT_REPOSITORY;
    if (report.validator.includes('config')) return this.ERROR_CODES.CONFIG_NOT_FOUND;
    if (report.validator.includes('environment')) return this.ERROR_CODES.NODE_VERSION_INCOMPATIBLE;
    return 'E999';
  }

  private static canAutoFix(report: ValidationReport): boolean {
    // Determine if this type of validation error can be auto-fixed
    return report.validator.includes('config') || report.validator.includes('environment');
  }

  private static getAutoFixDescription(report: ValidationReport): string | undefined {
    if (report.validator.includes('config')) {
      return 'Create default ginko.json configuration file';
    }
    if (report.validator.includes('environment')) {
      return 'Install missing dependencies and update environment';
    }
    return undefined;
  }

  private static getPreventionTips(validator: string): string[] {
    const tips: string[] = [];

    if (validator.includes('git')) {
      tips.push('Ensure you are in a git repository before running ginko commands');
      tips.push('Run "git init" if this is a new project');
    }

    if (validator.includes('config')) {
      tips.push('Run "ginko init" to set up configuration');
      tips.push('Check file permissions in project directory');
    }

    if (validator.includes('environment')) {
      tips.push('Use a Node.js version manager like nvm');
      tips.push('Keep dependencies up to date');
    }

    return tips;
  }

  private static async performAutoFix(error: EnhancedValidationError): Promise<boolean> {
    // Placeholder for actual auto-fix implementations
    // This would contain specific logic for each error type
    console.log(`Attempting to auto-fix: ${error.code}`);
    return false; // For now, return false since actual fixes aren't implemented
  }
}