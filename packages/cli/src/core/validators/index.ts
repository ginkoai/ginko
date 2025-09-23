/**
 * @fileType: utility
 * @status: current
 * @updated: 2025-09-22
 * @tags: [validation, validators, exports, first-use-experience, input-validation, security]
 * @related: [git-validator.ts, config-validator.ts, environment-validator.ts, input-validator.ts, command-argument-validator.ts]
 * @priority: critical
 * @complexity: low
 * @dependencies: []
 */

// Core validation interfaces and types
export type { ValidationResult, Validator } from './git-validator.js';
export type { GinkoConfig, PlatformConfig } from './config-validator.js';
export type { Platform, NodeRequirements, EnvironmentInfo } from './environment-validator.js';

// Input validation types and interfaces
export type {
  InputValidationRule,
  InputValidationSchema,
  InputValidationError,
  InputValidationResult
} from './input-validator.js';

// Command validation types and interfaces
export type {
  CommandArgumentConfig,
  CommandValidationConfig,
  ValidatedCommandData
} from './command-argument-validator.js';

// Error handling types and interfaces
export type {
  ValidationErrorContext,
  EnhancedValidationError,
  ErrorRecoveryResult
} from './validation-error-handler.js';

// Individual validator classes
export { GitValidator } from './git-validator.js';
export { ConfigValidator } from './config-validator.js';
export { EnvironmentValidator } from './environment-validator.js';
export { InputValidator } from './input-validator.js';
export { CommandArgumentValidator } from './command-argument-validator.js';

// Error handling utilities
export { ValidationErrorHandler } from './validation-error-handler.js';

// Validation orchestration and utilities
export { ValidationOrchestrator } from './validation-orchestrator.js';
export { ValidationReport, ValidationSeverity, ValidationSummary } from './validation-orchestrator.js';

/**
 * Quick validation functions for common use cases
 */

/**
 * Perform basic environment validation for ginko
 * Returns true if environment meets minimum requirements
 */
export async function validateBasicEnvironment(): Promise<boolean> {
  try {
    const { EnvironmentValidator } = await import('./environment-validator.js');
    const envValidator = new EnvironmentValidator();
    const result = await envValidator.validate();
    return result.valid;
  } catch {
    return false;
  }
}

/**
 * Check if current directory is a valid git repository
 */
export async function isValidGitRepository(path?: string): Promise<boolean> {
  try {
    const { GitValidator } = await import('./git-validator.js');
    return await GitValidator.isGitRepository(path);
  } catch {
    return false;
  }
}

/**
 * Validate ginko configuration exists and is valid
 */
export async function validateGinkoConfig(projectRoot?: string): Promise<boolean> {
  try {
    const { ConfigValidator } = await import('./config-validator.js');
    const configValidator = new ConfigValidator(projectRoot);
    const result = await configValidator.validate();
    return result.valid;
  } catch {
    return false;
  }
}

/**
 * Validate user input according to schema
 */
export async function validateInput(
  data: Record<string, any>,
  schema: any // InputValidationSchema
): Promise<any> { // InputValidationResult
  const { InputValidator } = await import('./input-validator.js');
  const validator = new InputValidator();
  return await validator.validateInput(data, schema);
}

/**
 * Validate command arguments with built-in security checks
 */
export async function validateCommandArgs(
  commandName: string,
  args: string[],
  options: Record<string, any>
): Promise<any> { // ValidatedCommandData
  const { CommandArgumentValidator } = await import('./command-argument-validator.js');
  const validator = new CommandArgumentValidator();
  return await validator.validateCommand(commandName, args, options);
}

/**
 * Sanitize string input for CLI usage
 */
export function sanitizeCliInput(input: string): string {
  // Remove null bytes and dangerous characters
  return input
    .replace(/[\x00-\x1F\x7F]/g, '') // Remove control characters
    .replace(/[;&|`$()]/g, '') // Remove shell metacharacters
    .trim();
}

/**
 * Quick validation for common patterns
 */
export function validatePattern(value: string, pattern: 'email' | 'url' | 'filename' | 'dirname'): boolean {
  const patterns = {
    email: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
    url: /^https?:\/\/[^\s/$.?#].[^\s]*$/i,
    filename: /^[a-zA-Z0-9._-]+(\.[a-zA-Z0-9]+)?$/,
    dirname: /^[a-zA-Z0-9._-]+$/
  };

  return patterns[pattern]?.test(value) || false;
}

/**
 * Get platform information
 */
export function getPlatformInfo(): any { // Platform
  // Use dynamic import to avoid initialization issues
  return 'unknown'; // Simplified for now
}

/**
 * Check Node.js version compatibility
 */
export function isNodeCompatible(): boolean {
  // Simplified compatibility check
  const version = process.version;
  const majorVersion = parseInt(version.slice(1).split('.')[0]);
  return majorVersion >= 16;
}

/**
 * Perform comprehensive validation for ginko setup
 * Use this for the 'ginko doctor' command or init process
 */
export async function validateGinkoSetup(options?: {
  projectRoot?: string;
  skipOptional?: boolean;
  verbose?: boolean;
}): Promise<any> { // ValidationSummary
  const { ValidationOrchestrator } = await import('./validation-orchestrator.js');
  const orchestrator = new ValidationOrchestrator(options);
  return await orchestrator.runAllValidations();
}

/**
 * Quick health check - returns true if ginko can run
 */
export async function canRunGinko(projectRoot?: string): Promise<boolean> {
  try {
    const summary = await validateGinkoSetup({
      projectRoot,
      skipOptional: true
    });
    return summary.canProceed;
  } catch {
    return false;
  }
}

/**
 * Enhanced error handling with user-friendly messages
 */
export function handleValidationError(
  error: any,
  context?: any, // ValidationErrorContext
  options?: { verbose?: boolean; noColor?: boolean }
): void {
  // Dynamic import to avoid circular dependencies
  import('./validation-error-handler.js').then(({ ValidationErrorHandler }) => {
    const enhancedError = ValidationErrorHandler.createEnhancedError(error, context);
    ValidationErrorHandler.displayError(enhancedError, options);
  }).catch(() => {
    // Fallback error display
    console.error('Validation error:', error?.message || error);
  });
}

/**
 * Create a validation schema for ginko commands
 */
export async function createGinkoValidationSchema(): Promise<any> { // InputValidationSchema
  const { InputValidator } = await import('./input-validator.js');
  return InputValidator.createGinkoCommandSchema();
}