/**
 * @fileType: utility
 * @status: current
 * @updated: 2025-09-22
 * @tags: [test, unit-test, integration-test, validation, input-validation, jest]
 * @related: [../../../src/core/validators/index.ts, index.test.ts]
 * @priority: high
 * @complexity: low
 * @dependencies: [jest]
 */

import {
  validateInput,
  validateCommandArgs,
  sanitizeCliInput,
  validatePattern,
  handleValidationError,
  createGinkoValidationSchema,
  InputValidationSchema
} from '../../../src/core/validators/index.js';

// Mock console.error for testing error display
const mockConsoleError = jest.spyOn(console, 'error').mockImplementation(() => {});

describe('Extended Validation Index Functions', () => {
  beforeEach(() => {
    mockConsoleError.mockClear();
  });

  afterAll(() => {
    mockConsoleError.mockRestore();
  });

  describe('validateInput', () => {
    it('should validate input using schema', async () => {
      const schema: InputValidationSchema = {
        name: { type: 'string', required: true, minLength: 2 },
        age: { type: 'number', required: false, min: 0 }
      };

      const validData = { name: 'John', age: 25 };
      const result = await validateInput(validData, schema);

      expect(result.valid).toBe(true);
      expect(result.sanitizedData).toEqual(validData);
    });

    it('should reject invalid input', async () => {
      const schema: InputValidationSchema = {
        email: { type: 'email', required: true }
      };

      const invalidData = { email: 'not-an-email' };
      const result = await validateInput(invalidData, schema);

      expect(result.valid).toBe(false);
      expect(result.errors).toBeDefined();
      expect(result.errors?.[0].message).toContain('Invalid email format');
    });
  });

  describe('validateCommandArgs', () => {
    it('should validate known ginko commands', async () => {
      // Test start command
      const startResult = await validateCommandArgs('start', [], { verbose: true });
      expect(startResult.valid).toBe(true);
      expect(startResult.command).toBe('start');

      // Test handoff command with valid message
      const handoffMessage = 'Completed feature implementation successfully';
      const handoffResult = await validateCommandArgs('handoff', [handoffMessage], {});
      expect(handoffResult.valid).toBe(true);
      expect(handoffResult.arguments.message).toBe(handoffMessage);
    });

    it('should reject unknown commands', async () => {
      const result = await validateCommandArgs('unknown-command', [], {});
      expect(result.valid).toBe(false);
      expect(result.errors).toContain('Unknown command: unknown-command');
    });

    it('should validate command with insufficient arguments', async () => {
      const result = await validateCommandArgs('handoff', [], {});
      expect(result.valid).toBe(false);
      expect(result.errors?.[0]).toContain('required');
    });
  });

  describe('sanitizeCliInput', () => {
    it('should remove dangerous characters', () => {
      const dangerous = 'rm -rf /; echo "test"';
      const sanitized = sanitizeCliInput(dangerous);

      expect(sanitized).not.toContain(';');
      expect(sanitized).not.toContain('|');
      expect(sanitized).not.toContain('$');
    });

    it('should remove control characters', () => {
      const withControlChars = 'test\x00\x01\x1F\x7F';
      const sanitized = sanitizeCliInput(withControlChars);

      expect(sanitized).toBe('test');
    });

    it('should trim whitespace', () => {
      const withWhitespace = '  test  ';
      const sanitized = sanitizeCliInput(withWhitespace);

      expect(sanitized).toBe('test');
    });
  });

  describe('validatePattern', () => {
    it('should validate email patterns', () => {
      expect(validatePattern('test@example.com', 'email')).toBe(true);
      expect(validatePattern('invalid-email', 'email')).toBe(false);
    });

    it('should validate URL patterns', () => {
      expect(validatePattern('https://example.com', 'url')).toBe(true);
      expect(validatePattern('http://test.org', 'url')).toBe(true);
      expect(validatePattern('not-a-url', 'url')).toBe(false);
    });

    it('should validate filename patterns', () => {
      expect(validatePattern('file.txt', 'filename')).toBe(true);
      expect(validatePattern('my-file_2.js', 'filename')).toBe(true);
      expect(validatePattern('invalid/file.txt', 'filename')).toBe(false);
    });

    it('should validate directory name patterns', () => {
      expect(validatePattern('my-dir', 'dirname')).toBe(true);
      expect(validatePattern('valid_dir', 'dirname')).toBe(true);
      expect(validatePattern('invalid/dir', 'dirname')).toBe(false);
    });
  });

  describe('createGinkoValidationSchema', () => {
    it('should create a valid schema for ginko commands', () => {
      const schema = createGinkoValidationSchema();

      expect(schema.message).toBeDefined();
      expect(schema.file).toBeDefined();
      expect(schema.directory).toBeDefined();
      expect(schema.format).toBeDefined();
      expect(schema.verbose).toBeDefined();
      expect(schema.force).toBeDefined();

      // Check specific properties
      expect(schema.message.type).toBe('string');
      expect(schema.message.maxLength).toBe(500);
      expect(schema.file.type).toBe('filepath');
      expect(schema.directory.type).toBe('dirname');
      expect(schema.format.allowedValues).toEqual(['json', 'yaml', 'markdown', 'text']);
    });

    it('should be usable with validateInput', async () => {
      const schema = createGinkoValidationSchema();

      const validData = {
        message: 'Test message',
        format: 'json',
        verbose: true
      };

      const result = await validateInput(validData, schema);
      expect(result.valid).toBe(true);
    });
  });

  describe('handleValidationError', () => {
    it('should display errors using the error handler', () => {
      const error = new Error('Test validation error');
      const context = {
        command: 'test',
        operation: 'validation'
      };

      handleValidationError(error, context);

      expect(mockConsoleError).toHaveBeenCalled();
      // Should display the error message
      const errorCalls = mockConsoleError.mock.calls.flat();
      const hasErrorMessage = errorCalls.some(call =>
        typeof call === 'string' && call.includes('Test validation error')
      );
      expect(hasErrorMessage).toBe(true);
    });

    it('should handle input validation errors', () => {
      const inputError = {
        field: 'email',
        value: 'invalid',
        rule: 'pattern',
        message: 'Invalid email format'
      };

      handleValidationError(inputError);

      expect(mockConsoleError).toHaveBeenCalled();
    });

    it('should respect display options', () => {
      const error = new Error('Test error');

      handleValidationError(error, undefined, { noColor: true, verbose: true });

      expect(mockConsoleError).toHaveBeenCalled();
    });
  });

  describe('integration scenarios', () => {
    it('should work together for complete validation workflow', async () => {
      // 1. Create schema
      const schema = createGinkoValidationSchema();

      // 2. Prepare input data
      const rawInput = {
        message: '  Test handoff message  ',
        format: 'json',
        verbose: 'true',
        force: false
      };

      // 3. Validate input
      const inputResult = await validateInput(rawInput, schema);
      expect(inputResult.valid).toBe(true);

      // 4. Validate command args
      const commandResult = await validateCommandArgs('start', [], inputResult.sanitizedData || {});
      expect(commandResult.valid).toBe(true);

      // 5. Test sanitization
      const dangerousMessage = 'message; rm -rf /';
      const sanitized = sanitizeCliInput(dangerousMessage);
      expect(sanitized).not.toContain(';');

      // 6. Pattern validation
      expect(validatePattern('config.json', 'filename')).toBe(true);
    });

    it('should handle validation failure workflow', async () => {
      // Create invalid input
      const invalidInput = {
        message: '', // Too short
        format: 'invalid-format', // Not allowed
        verbose: 'maybe' // Invalid boolean
      };

      const schema = createGinkoValidationSchema();
      const result = await validateInput(invalidInput, schema);

      expect(result.valid).toBe(false);
      expect(result.errors).toBeDefined();
      expect(result.errors?.length).toBeGreaterThan(0);

      // Test error handling
      if (result.errors && result.errors.length > 0) {
        handleValidationError(result.errors[0]);
        expect(mockConsoleError).toHaveBeenCalled();
      }
    });

    it('should validate complete ginko command scenarios', async () => {
      // Test various ginko commands with different argument patterns
      const scenarios = [
        {
          command: 'start',
          args: [],
          options: { verbose: true },
          shouldBeValid: true
        },
        {
          command: 'handoff',
          args: ['Implemented validation layer with comprehensive testing'],
          options: {},
          shouldBeValid: true
        },
        {
          command: 'context',
          args: ['list'],
          options: {},
          shouldBeValid: true
        },
        {
          command: 'doctor',
          args: [],
          options: { fix: true, verbose: false },
          shouldBeValid: true
        },
        {
          command: 'sprint',
          args: ['start'],
          options: {},
          shouldBeValid: true
        },
        {
          command: 'unknown',
          args: [],
          options: {},
          shouldBeValid: false
        }
      ];

      for (const scenario of scenarios) {
        const result = await validateCommandArgs(
          scenario.command,
          scenario.args,
          scenario.options
        );

        expect(result.valid).toBe(scenario.shouldBeValid);

        if (scenario.shouldBeValid) {
          expect(result.command).toBe(scenario.command);
        } else {
          expect(result.errors).toBeDefined();
          expect(result.errors?.length).toBeGreaterThan(0);
        }
      }
    });
  });
});