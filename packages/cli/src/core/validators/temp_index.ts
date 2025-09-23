/**
 * @fileType: utility
 * @status: current
 * @updated: 2025-09-19
 * @tags: [validation, validators, exports, first-use-experience]
 * @related: [git-validator.ts, config-validator.ts, environment-validator.ts]
 * @priority: critical
 * @complexity: low
 * @dependencies: []
 */

// Core validation interfaces and types
export type { ValidationResult, Validator } from './git-validator.js';
export type { GinkoConfig, PlatformConfig } from './config-validator.js';
export type { Platform, NodeRequirements, EnvironmentInfo } from './environment-validator.js';

// Individual validator classes
export { GitValidator } from './git-validator.js';
export { ConfigValidator } from './config-validator.js';
export { EnvironmentValidator } from './environment-validator.js';

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
    const configValidator = new ConfigValidator(projectRoot);
    const result = await configValidator.validate();
    return result.valid;
  } catch {
    return false;
  }
}

/**
 * Get platform information
 */
export function getPlatformInfo(): Platform {
  return EnvironmentValidator.getPlatform();
}

/**
 * Check Node.js version compatibility
 */
export function isNodeCompatible(): boolean {
  return EnvironmentValidator.isNodeVersionValid();
}

/**
 * Perform comprehensive validation for ginko setup
 * Use this for the 'ginko doctor' command or init process
 */
export async function validateGinkoSetup(options?: {
  projectRoot?: string;
  skipOptional?: boolean;
  verbose?: boolean;
}): Promise<ValidationSummary> {
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