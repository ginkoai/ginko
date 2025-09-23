/**
 * @fileType: utility
 * @status: current
 * @updated: 2025-09-22
 * @tags: [validation, input, sanitization, security, cli-arguments]
 * @related: [index.ts, command-validator.ts, validation-orchestrator.ts]
 * @priority: critical
 * @complexity: medium
 * @dependencies: [fs-extra]
 */

import * as fs from 'fs-extra';
import * as path from 'path';
import { ValidationResult, Validator } from './git-validator.js';

/**
 * Input validation rules for different input types
 */
export interface InputValidationRule {
  type: 'string' | 'number' | 'boolean' | 'email' | 'url' | 'filepath' | 'dirname' | 'regex';
  required?: boolean;
  minLength?: number;
  maxLength?: number;
  min?: number;
  max?: number;
  pattern?: RegExp;
  allowedValues?: any[];
  customValidator?: (value: any) => boolean | string;
}

/**
 * Input validation schema for command arguments
 */
export interface InputValidationSchema {
  [key: string]: InputValidationRule;
}

/**
 * Input validation error details
 */
export interface InputValidationError {
  field: string;
  value: any;
  rule: string;
  message: string;
}

/**
 * Input validation result with detailed error information
 */
export interface InputValidationResult extends ValidationResult {
  errors?: InputValidationError[];
  sanitizedData?: Record<string, any>;
}

/**
 * Security-focused input validator for CLI arguments and user inputs
 * Provides sanitization and validation to prevent injection attacks and malformed data
 */
export class InputValidator implements Validator {
  private lastError?: string;
  private lastSuggestions: string[] = [];
  private lastValidationErrors: InputValidationError[] = [];

  /**
   * Validate and sanitize user input according to schema
   */
  async validateInput(
    data: Record<string, any>,
    schema: InputValidationSchema
  ): Promise<InputValidationResult> {
    const errors: InputValidationError[] = [];
    const sanitizedData: Record<string, any> = {};

    for (const [field, rule] of Object.entries(schema)) {
      const value = data[field];

      // Check required fields
      if (rule.required && (value === undefined || value === null || value === '')) {
        errors.push({
          field,
          value,
          rule: 'required',
          message: `Field '${field}' is required`
        });
        continue;
      }

      // Skip validation for optional empty fields
      if (!rule.required && (value === undefined || value === null || value === '')) {
        continue;
      }

      // Validate and sanitize based on type
      try {
        const sanitizedValue = await this.validateFieldValue(field, value, rule);
        sanitizedData[field] = sanitizedValue;
      } catch (error) {
        if (error instanceof Error) {
          errors.push({
            field,
            value,
            rule: 'validation',
            message: error.message
          });
        }
      }
    }

    this.lastValidationErrors = errors;
    const valid = errors.length === 0;

    if (!valid) {
      this.lastError = `Validation failed for ${errors.length} field(s)`;
      this.lastSuggestions = errors.map(err => `Fix ${err.field}: ${err.message}`);
    }

    return {
      valid,
      error: this.lastError,
      suggestions: this.lastSuggestions,
      errors,
      sanitizedData: valid ? sanitizedData : undefined
    };
  }

  /**
   * Validate individual field value according to rule
   */
  private async validateFieldValue(field: string, value: any, rule: InputValidationRule): Promise<any> {
    let sanitizedValue = value;

    // Type validation and basic sanitization
    switch (rule.type) {
      case 'string':
        sanitizedValue = this.validateString(value, rule);
        break;
      case 'number':
        sanitizedValue = this.validateNumber(value, rule);
        break;
      case 'boolean':
        sanitizedValue = this.validateBoolean(value);
        break;
      case 'email':
        sanitizedValue = this.validateEmail(value);
        break;
      case 'url':
        sanitizedValue = this.validateUrl(value);
        break;
      case 'filepath':
        sanitizedValue = await this.validateFilePath(value, rule);
        break;
      case 'dirname':
        sanitizedValue = await this.validateDirectoryName(value, rule);
        break;
      case 'regex':
        sanitizedValue = this.validateRegex(value, rule);
        break;
      default:
        throw new Error(`Unknown validation type: ${rule.type}`);
    }

    // Custom validator
    if (rule.customValidator) {
      const result = rule.customValidator(sanitizedValue);
      if (result === false) {
        throw new Error(`Custom validation failed for field '${field}'`);
      }
      if (typeof result === 'string') {
        throw new Error(result);
      }
    }

    return sanitizedValue;
  }

  /**
   * Validate and sanitize string values
   */
  private validateString(value: any, rule: InputValidationRule): string {
    if (typeof value !== 'string') {
      throw new Error('Value must be a string');
    }

    // Basic sanitization
    let sanitized = value.trim();

    // Length validation
    if (rule.minLength !== undefined && sanitized.length < rule.minLength) {
      throw new Error(`String must be at least ${rule.minLength} characters long`);
    }
    if (rule.maxLength !== undefined && sanitized.length > rule.maxLength) {
      throw new Error(`String must be no more than ${rule.maxLength} characters long`);
    }

    // Pattern validation
    if (rule.pattern && !rule.pattern.test(sanitized)) {
      throw new Error('String does not match required pattern');
    }

    // Allowed values validation
    if (rule.allowedValues && !rule.allowedValues.includes(sanitized)) {
      throw new Error(`Value must be one of: ${rule.allowedValues.join(', ')}`);
    }

    // Security: Remove potentially dangerous characters for CLI usage
    sanitized = this.sanitizeForCli(sanitized);

    return sanitized;
  }

  /**
   * Validate number values
   */
  private validateNumber(value: any, rule: InputValidationRule): number {
    const num = typeof value === 'string' ? parseFloat(value) : value;

    if (typeof num !== 'number' || isNaN(num)) {
      throw new Error('Value must be a valid number');
    }

    if (rule.min !== undefined && num < rule.min) {
      throw new Error(`Number must be at least ${rule.min}`);
    }
    if (rule.max !== undefined && num > rule.max) {
      throw new Error(`Number must be no more than ${rule.max}`);
    }

    return num;
  }

  /**
   * Validate boolean values
   */
  private validateBoolean(value: any): boolean {
    if (typeof value === 'boolean') {
      return value;
    }
    if (typeof value === 'string') {
      const lower = value.toLowerCase().trim();
      if (['true', 'yes', '1', 'on'].includes(lower)) return true;
      if (['false', 'no', '0', 'off'].includes(lower)) return false;
    }
    if (typeof value === 'number') {
      return value !== 0;
    }
    throw new Error('Value must be a boolean or boolean-like string');
  }

  /**
   * Validate email addresses
   */
  private validateEmail(value: any): string {
    if (typeof value !== 'string') {
      throw new Error('Email must be a string');
    }

    const sanitized = value.trim().toLowerCase();
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

    if (!emailRegex.test(sanitized)) {
      throw new Error('Invalid email format');
    }

    return sanitized;
  }

  /**
   * Validate URL values
   */
  private validateUrl(value: any): string {
    if (typeof value !== 'string') {
      throw new Error('URL must be a string');
    }

    const sanitized = value.trim();

    try {
      new URL(sanitized);
      return sanitized;
    } catch {
      throw new Error('Invalid URL format');
    }
  }

  /**
   * Validate file paths
   */
  private async validateFilePath(value: any, rule: InputValidationRule): Promise<string> {
    if (typeof value !== 'string') {
      throw new Error('File path must be a string');
    }

    const sanitized = this.sanitizeFilePath(value.trim());

    // Check if file exists (optional based on rule)
    if (rule.customValidator === undefined) {
      try {
        await fs.access(sanitized);
      } catch {
        throw new Error(`File does not exist: ${sanitized}`);
      }
    }

    return sanitized;
  }

  /**
   * Validate directory names/paths
   */
  private async validateDirectoryName(value: any, rule: InputValidationRule): Promise<string> {
    if (typeof value !== 'string') {
      throw new Error('Directory name must be a string');
    }

    const sanitized = this.sanitizeFilePath(value.trim());

    // Validate directory name format
    if (path.basename(sanitized) !== sanitized) {
      // It's a path, validate it exists
      try {
        const stats = await fs.stat(sanitized);
        if (!stats.isDirectory()) {
          throw new Error(`Path exists but is not a directory: ${sanitized}`);
        }
      } catch {
        throw new Error(`Directory does not exist: ${sanitized}`);
      }
    } else {
      // It's just a name, validate format
      if (!/^[a-zA-Z0-9._-]+$/.test(sanitized)) {
        throw new Error('Directory name contains invalid characters');
      }
    }

    return sanitized;
  }

  /**
   * Validate regex patterns
   */
  private validateRegex(value: any, rule: InputValidationRule): RegExp {
    if (value instanceof RegExp) {
      return value;
    }

    if (typeof value !== 'string') {
      throw new Error('Regex must be a string or RegExp object');
    }

    try {
      return new RegExp(value);
    } catch {
      throw new Error('Invalid regular expression');
    }
  }

  /**
   * Sanitize strings for CLI usage by removing dangerous characters
   */
  private sanitizeForCli(input: string): string {
    // Remove null bytes and control characters
    let sanitized = input.replace(/[\x00-\x1F\x7F]/g, '');

    // Remove shell metacharacters that could be dangerous
    sanitized = sanitized.replace(/[;&|`$()]/g, '');

    return sanitized;
  }

  /**
   * Sanitize file paths to prevent directory traversal
   */
  private sanitizeFilePath(input: string): string {
    // Normalize path and resolve relative references
    let sanitized = path.normalize(input);

    // Remove null bytes
    sanitized = sanitized.replace(/\x00/g, '');

    // Prevent directory traversal beyond current working directory
    const resolved = path.resolve(sanitized);
    const cwd = process.cwd();

    if (!resolved.startsWith(cwd)) {
      throw new Error('File path must be within current working directory');
    }

    return sanitized;
  }

  /**
   * Quick validation for common CLI argument patterns
   */
  static validateCliArgument(value: string, type: 'filename' | 'dirname' | 'command' | 'flag'): boolean {
    switch (type) {
      case 'filename':
        return /^[a-zA-Z0-9._-]+(\.[a-zA-Z0-9]+)?$/.test(value);
      case 'dirname':
        return /^[a-zA-Z0-9._-]+$/.test(value);
      case 'command':
        return /^[a-zA-Z][a-zA-Z0-9-]*$/.test(value);
      case 'flag':
        return /^--?[a-zA-Z][a-zA-Z0-9-]*$/.test(value);
      default:
        return false;
    }
  }

  /**
   * Create validation schema for common ginko command patterns
   */
  static createGinkoCommandSchema(): InputValidationSchema {
    return {
      message: {
        type: 'string',
        required: false,
        maxLength: 500,
        pattern: /^[a-zA-Z0-9\s.,!?-]+$/
      },
      file: {
        type: 'filepath',
        required: false
      },
      directory: {
        type: 'dirname',
        required: false
      },
      format: {
        type: 'string',
        required: false,
        allowedValues: ['json', 'yaml', 'markdown', 'text']
      },
      verbose: {
        type: 'boolean',
        required: false
      },
      force: {
        type: 'boolean',
        required: false
      }
    };
  }

  async validate(): Promise<ValidationResult> {
    // This validator is stateless, always valid
    return { valid: true };
  }

  getErrorMessage(): string {
    return this.lastError || 'No validation errors';
  }

  getSuggestions(): string[] {
    return this.lastSuggestions;
  }

  getValidationErrors(): InputValidationError[] {
    return this.lastValidationErrors;
  }
}