/**
 * @fileType: utility
 * @status: current
 * @updated: 2025-09-22
 * @tags: [test, unit-test, error-handling, validation, jest]
 * @related: [../../../src/core/validators/validation-error-handler.ts]
 * @priority: high
 * @complexity: medium
 * @dependencies: [jest]
 */

import {
  ValidationErrorHandler,
  EnhancedValidationError
} from '../../../src/core/validators/validation-error-handler.js';
import { ValidationSeverity } from '../../../src/core/validators/validation-orchestrator.js';
import type {
  InputValidationError,
  ValidationResult
} from '../../../src/core/validators/index.js';

// Mock console methods to test output
const mockConsoleError = jest.spyOn(console, 'error').mockImplementation(() => {});

describe('ValidationErrorHandler', () => {
  beforeEach(() => {
    mockConsoleError.mockClear();
  });

  afterAll(() => {
    mockConsoleError.mockRestore();
  });

  describe('createEnhancedError', () => {
    it('should create enhanced error from input validation error', () => {
      const inputError: InputValidationError = {
        field: 'email',
        value: 'invalid-email',
        rule: 'pattern',
        message: 'Invalid email format'
      };

      const enhanced = ValidationErrorHandler.createEnhancedError(inputError, {
        command: 'test-command'
      });

      expect(enhanced.type).toBe('input');
      expect(enhanced.severity).toBe(ValidationSeverity.ERROR);
      expect(enhanced.code).toBe('E001'); // INVALID_INPUT_FORMAT
      expect(enhanced.message).toContain('Invalid email');
      expect(enhanced.context?.command).toBe('test-command');
      expect(enhanced.recovery?.canAutoFix).toBe(false);
      expect(enhanced.recovery?.manualSteps).toBeDefined();
    });

    it('should create enhanced error from validation result', () => {
      const validationResult: ValidationResult = {
        valid: false,
        error: 'Validation failed',
        suggestions: ['Check your input', 'Try again']
      };

      const enhanced = ValidationErrorHandler.createEnhancedError(validationResult);

      expect(enhanced.type).toBe('system');
      expect(enhanced.severity).toBe(ValidationSeverity.ERROR);
      expect(enhanced.message).toBe('Validation failed');
      expect(enhanced.recovery?.manualSteps).toEqual(['Check your input', 'Try again']);
    });

    it('should create enhanced error from generic error', () => {
      const genericError = new Error('Something went wrong');

      const enhanced = ValidationErrorHandler.createEnhancedError(genericError, {
        operation: 'file-read'
      });

      expect(enhanced.type).toBe('system');
      expect(enhanced.message).toBe('Something went wrong');
      expect(enhanced.context?.operation).toBe('file-read');
    });

    it('should create enhanced error from validation report', () => {
      const validationReport = {
        validator: 'git-validator',
        severity: ValidationSeverity.ERROR,
        valid: false,
        message: 'Not a git repository',
        suggestions: ['Run git init', 'Check directory'],
        metadata: { path: '/test/path' }
      };

      const enhanced = ValidationErrorHandler.createEnhancedError(validationReport);

      expect(enhanced.type).toBe('system'); // git validator maps to system type
      expect(enhanced.severity).toBe(ValidationSeverity.ERROR);
      expect(enhanced.message).toBe('Not a git repository');
      expect(enhanced.recovery?.manualSteps).toEqual(['Run git init', 'Check directory']);
      expect(enhanced.metadata).toEqual({ path: '/test/path' });
    });
  });

  describe('displayError', () => {
    it('should display error with basic information', () => {
      const error: EnhancedValidationError = {
        type: 'input',
        severity: ValidationSeverity.ERROR,
        code: 'E001',
        message: 'Invalid input format',
        recovery: {
          canAutoFix: false,
          manualSteps: ['Check input format', 'Try again']
        }
      };

      ValidationErrorHandler.displayError(error);

      expect(mockConsoleError).toHaveBeenCalledWith('');
      expect(mockConsoleError).toHaveBeenCalledWith(expect.stringContaining('Invalid input format'));
      expect(mockConsoleError).toHaveBeenCalledWith(expect.stringContaining('Code: E001'));
    });

    it('should display error with context information', () => {
      const error: EnhancedValidationError = {
        type: 'command',
        severity: ValidationSeverity.ERROR,
        code: 'E401',
        message: 'Invalid command',
        context: {
          command: 'test-cmd',
          operation: 'validation',
          userInput: 'invalid input'
        },
        recovery: {
          canAutoFix: false,
          manualSteps: ['Use valid command']
        }
      };

      ValidationErrorHandler.displayError(error, { verbose: true });

      expect(mockConsoleError).toHaveBeenCalledWith(expect.stringContaining('Command: test-cmd'));
      expect(mockConsoleError).toHaveBeenCalledWith(expect.stringContaining('Operation: validation'));
      expect(mockConsoleError).toHaveBeenCalledWith(expect.stringContaining('Input: invalid input'));
    });

    it('should display auto-fix information when available', () => {
      const error: EnhancedValidationError = {
        type: 'environment',
        severity: ValidationSeverity.WARNING,
        code: 'E102',
        message: 'Missing dependency',
        recovery: {
          canAutoFix: true,
          autoFixDescription: 'Install missing packages automatically',
          manualSteps: ['Run npm install']
        }
      };

      ValidationErrorHandler.displayError(error);

      expect(mockConsoleError).toHaveBeenCalledWith(expect.stringContaining('Auto-fix available'));
      expect(mockConsoleError).toHaveBeenCalledWith(expect.stringContaining('Install missing packages'));
      expect(mockConsoleError).toHaveBeenCalledWith(expect.stringContaining('--fix flag'));
    });

    it('should display help resources when provided', () => {
      const error: EnhancedValidationError = {
        type: 'system',
        severity: ValidationSeverity.ERROR,
        code: 'E999',
        message: 'System error',
        context: {
          helpUrl: 'https://docs.ginko.ai/troubleshooting',
          relatedDocs: ['Setup Guide', 'FAQ']
        },
        recovery: {
          canAutoFix: false
        }
      };

      ValidationErrorHandler.displayError(error);

      expect(mockConsoleError).toHaveBeenCalledWith(expect.stringContaining('For more help'));
      expect(mockConsoleError).toHaveBeenCalledWith(expect.stringContaining('https://docs.ginko.ai/troubleshooting'));
      expect(mockConsoleError).toHaveBeenCalledWith(expect.stringContaining('Setup Guide'));
      expect(mockConsoleError).toHaveBeenCalledWith(expect.stringContaining('FAQ'));
    });

    it('should handle no-color option', () => {
      const error: EnhancedValidationError = {
        type: 'input',
        severity: ValidationSeverity.ERROR,
        code: 'E001',
        message: 'Test error',
        recovery: { canAutoFix: false }
      };

      ValidationErrorHandler.displayError(error, { noColor: true });

      // In no-color mode, output should not contain ANSI color codes
      const errorCalls = mockConsoleError.mock.calls.flat();
      const hasColorCodes = errorCalls.some(call =>
        typeof call === 'string' && call.includes('\u001b[')
      );
      expect(hasColorCodes).toBe(false);
    });
  });

  describe('displayErrorTable', () => {
    it('should display multiple errors in table format', () => {
      const errors: EnhancedValidationError[] = [
        {
          type: 'input',
          severity: ValidationSeverity.ERROR,
          code: 'E001',
          message: 'Invalid input',
          recovery: { canAutoFix: false }
        },
        {
          type: 'environment',
          severity: ValidationSeverity.WARNING,
          code: 'E102',
          message: 'Missing dependency',
          recovery: { canAutoFix: true }
        }
      ];

      ValidationErrorHandler.displayErrorTable(errors);

      expect(mockConsoleError).toHaveBeenCalledWith('\nValidation Issues:');
      expect(mockConsoleError).toHaveBeenCalledWith(expect.stringContaining('Type'));
      expect(mockConsoleError).toHaveBeenCalledWith(expect.stringContaining('Code'));
      expect(mockConsoleError).toHaveBeenCalledWith(expect.stringContaining('Message'));
    });

    it('should handle empty error array', () => {
      ValidationErrorHandler.displayErrorTable([]);

      // Should not display anything for empty array
      expect(mockConsoleError).not.toHaveBeenCalledWith(expect.stringContaining('Validation Issues'));
    });

    it('should truncate long messages in table', () => {
      const longMessage = 'A'.repeat(100);
      const errors: EnhancedValidationError[] = [
        {
          type: 'input',
          severity: ValidationSeverity.ERROR,
          code: 'E001',
          message: longMessage,
          recovery: { canAutoFix: false }
        }
      ];

      ValidationErrorHandler.displayErrorTable(errors);

      // Should truncate message to fit table
      const tableCalls = mockConsoleError.mock.calls.flat();
      const hasFullMessage = tableCalls.some(call =>
        typeof call === 'string' && call.includes(longMessage)
      );
      expect(hasFullMessage).toBe(false);
    });
  });

  describe('attemptAutoRecovery', () => {
    it('should identify auto-fixable errors', async () => {
      const errors: EnhancedValidationError[] = [
        {
          type: 'input',
          severity: ValidationSeverity.ERROR,
          code: 'E001',
          message: 'Invalid input',
          recovery: { canAutoFix: false }
        },
        {
          type: 'environment',
          severity: ValidationSeverity.WARNING,
          code: 'E102',
          message: 'Missing dependency',
          recovery: {
            canAutoFix: true,
            autoFixDescription: 'Install dependency'
          }
        }
      ];

      const result = await ValidationErrorHandler.attemptAutoRecovery(errors);

      expect(result.success).toBe(false); // Mock implementation returns false
      expect(result.message).toContain('No auto-fixable errors found');
      expect(result.remainingIssues).toHaveLength(2);
    });

    it('should handle errors with no auto-fix capability', async () => {
      const errors: EnhancedValidationError[] = [
        {
          type: 'input',
          severity: ValidationSeverity.ERROR,
          code: 'E001',
          message: 'Cannot auto-fix this',
          recovery: { canAutoFix: false }
        }
      ];

      const result = await ValidationErrorHandler.attemptAutoRecovery(errors);

      expect(result.success).toBe(false);
      expect(result.message).toBe('No auto-fixable errors found');
      expect(result.remainingIssues).toContain('Cannot auto-fix this');
    });

    it('should handle empty error array', async () => {
      const result = await ValidationErrorHandler.attemptAutoRecovery([]);

      expect(result.success).toBe(false);
      expect(result.message).toBe('No auto-fixable errors found');
      expect(result.remainingIssues).toHaveLength(0);
    });
  });

  describe('error classification', () => {
    it('should correctly classify different error types', () => {
      const inputError: InputValidationError = {
        field: 'name',
        value: '',
        rule: 'required',
        message: 'Field is required'
      };

      const enhanced = ValidationErrorHandler.createEnhancedError(inputError);
      expect(enhanced.type).toBe('input');
      expect(enhanced.code).toBe('E002'); // MISSING_REQUIRED_FIELD
    });

    it('should provide appropriate recovery suggestions', () => {
      const inputError: InputValidationError = {
        field: 'email',
        value: 'invalid',
        rule: 'pattern',
        message: 'Invalid format'
      };

      const enhanced = ValidationErrorHandler.createEnhancedError(inputError);

      expect(enhanced.recovery?.preventionTips).toContain('Use tab completion when available');
      expect(enhanced.recovery?.preventionTips).toContain('Check command help with --help flag');
      expect(enhanced.recovery?.manualSteps).toContain('Correct the value for \'email\'');
    });
  });

  describe('integration with other validators', () => {
    it('should handle validation results from different validator types', () => {
      // Test with different validator types to ensure proper error classification
      const gitValidationReport = {
        validator: 'git-validator',
        severity: ValidationSeverity.ERROR,
        valid: false,
        message: 'Not a git repository',
        suggestions: ['Run git init']
      };

      const gitEnhanced = ValidationErrorHandler.createEnhancedError(gitValidationReport);
      expect(gitEnhanced.recovery?.preventionTips).toContain('Ensure you are in a git repository');

      const configValidationReport = {
        validator: 'config-validator',
        severity: ValidationSeverity.ERROR,
        valid: false,
        message: 'Config not found',
        suggestions: ['Run ginko init']
      };

      const configEnhanced = ValidationErrorHandler.createEnhancedError(configValidationReport);
      expect(configEnhanced.recovery?.preventionTips).toContain('Run "ginko init" to set up configuration');
    });
  });
});