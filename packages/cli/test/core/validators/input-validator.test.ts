/**
 * @fileType: utility
 * @status: current
 * @updated: 2025-09-22
 * @tags: [test, unit-test, input-validation, security, jest]
 * @related: [../../../src/core/validators/input-validator.ts]
 * @priority: high
 * @complexity: medium
 * @dependencies: [jest, fs-extra]
 */

import { InputValidator } from '../../../src/core/validators/input-validator.js';
import * as fs from 'fs-extra';
import * as path from 'path';
import * as os from 'os';

describe('InputValidator', () => {
  let validator: InputValidator;
  let tempDir: string;

  beforeEach(async () => {
    validator = new InputValidator();
    tempDir = await fs.mkdtemp(path.join(os.tmpdir(), 'ginko-input-test-'));
  });

  afterEach(async () => {
    await fs.remove(tempDir);
  });

  describe('validateInput', () => {
    it('should validate required string fields', async () => {
      const schema = {
        name: { type: 'string' as const, required: true, minLength: 2, maxLength: 50 }
      };

      // Valid input
      const validResult = await validator.validateInput({ name: 'John Doe' }, schema);
      expect(validResult.valid).toBe(true);
      expect(validResult.sanitizedData).toEqual({ name: 'John Doe' });

      // Missing required field
      const missingResult = await validator.validateInput({}, schema);
      expect(missingResult.valid).toBe(false);
      expect(missingResult.errors).toHaveLength(1);
      expect(missingResult.errors?.[0].rule).toBe('required');

      // Too short
      const shortResult = await validator.validateInput({ name: 'J' }, schema);
      expect(shortResult.valid).toBe(false);
      expect(shortResult.errors?.[0].message).toContain('at least 2 characters');
    });

    it('should validate number fields with range constraints', async () => {
      const schema = {
        age: { type: 'number' as const, required: true, min: 0, max: 150 }
      };

      // Valid number
      const validResult = await validator.validateInput({ age: 25 }, schema);
      expect(validResult.valid).toBe(true);
      expect(validResult.sanitizedData).toEqual({ age: 25 });

      // String number (should convert)
      const stringResult = await validator.validateInput({ age: '30' }, schema);
      expect(stringResult.valid).toBe(true);
      expect(stringResult.sanitizedData).toEqual({ age: 30 });

      // Out of range
      const outOfRangeResult = await validator.validateInput({ age: 200 }, schema);
      expect(outOfRangeResult.valid).toBe(false);
      expect(outOfRangeResult.errors?.[0].message).toContain('no more than 150');
    });

    it('should validate boolean fields', async () => {
      const schema = {
        active: { type: 'boolean' as const, required: false }
      };

      // Boolean values
      expect((await validator.validateInput({ active: true }, schema)).valid).toBe(true);
      expect((await validator.validateInput({ active: false }, schema)).valid).toBe(true);

      // String boolean values
      expect((await validator.validateInput({ active: 'true' }, schema)).valid).toBe(true);
      expect((await validator.validateInput({ active: 'false' }, schema)).valid).toBe(true);
      expect((await validator.validateInput({ active: 'yes' }, schema)).valid).toBe(true);
      expect((await validator.validateInput({ active: 'no' }, schema)).valid).toBe(true);

      // Number boolean values
      expect((await validator.validateInput({ active: 1 }, schema)).valid).toBe(true);
      expect((await validator.validateInput({ active: 0 }, schema)).valid).toBe(true);
    });

    it('should validate email addresses', async () => {
      const schema = {
        email: { type: 'email' as const, required: true }
      };

      // Valid emails
      const validEmail = await validator.validateInput({ email: 'test@example.com' }, schema);
      expect(validEmail.valid).toBe(true);

      // Invalid emails
      const invalidEmail = await validator.validateInput({ email: 'invalid-email' }, schema);
      expect(invalidEmail.valid).toBe(false);
      expect(invalidEmail.errors?.[0].message).toContain('Invalid email format');
    });

    it('should validate URL format', async () => {
      const schema = {
        website: { type: 'url' as const, required: true }
      };

      // Valid URLs
      const validUrl = await validator.validateInput({ website: 'https://example.com' }, schema);
      expect(validUrl.valid).toBe(true);

      // Invalid URLs
      const invalidUrl = await validator.validateInput({ website: 'not-a-url' }, schema);
      expect(invalidUrl.valid).toBe(false);
      expect(invalidUrl.errors?.[0].message).toContain('Invalid URL format');
    });

    it('should validate file paths', async () => {
      // Create a test file
      const testFile = path.join(tempDir, 'test.txt');
      await fs.writeFile(testFile, 'test content');

      const schema = {
        file: { type: 'filepath' as const, required: true }
      };

      // Valid file path (existing file)
      const validFile = await validator.validateInput({ file: testFile }, schema);
      expect(validFile.valid).toBe(true);

      // Non-existent file
      const invalidFile = await validator.validateInput({ file: '/non/existent/file.txt' }, schema);
      expect(invalidFile.valid).toBe(false);
      expect(invalidFile.errors?.[0].message).toContain('File does not exist');
    });

    it('should validate directory names', async () => {
      // Create a test directory
      const testDir = path.join(tempDir, 'testdir');
      await fs.mkdir(testDir);

      const schema = {
        directory: { type: 'dirname' as const, required: true }
      };

      // Valid directory path
      const validDir = await validator.validateInput({ directory: testDir }, schema);
      expect(validDir.valid).toBe(true);

      // Valid directory name (format only)
      const validName = await validator.validateInput({ directory: 'valid-dir-name' }, schema);
      expect(validName.valid).toBe(true);

      // Invalid directory name format
      const invalidName = await validator.validateInput({ directory: 'invalid/dir/name' }, schema);
      expect(invalidName.valid).toBe(false);
    });

    it('should validate allowed values', async () => {
      const schema = {
        status: {
          type: 'string' as const,
          required: true,
          allowedValues: ['active', 'inactive', 'pending']
        }
      };

      // Valid value
      const validStatus = await validator.validateInput({ status: 'active' }, schema);
      expect(validStatus.valid).toBe(true);

      // Invalid value
      const invalidStatus = await validator.validateInput({ status: 'unknown' }, schema);
      expect(invalidStatus.valid).toBe(false);
      expect(invalidStatus.errors?.[0].message).toContain('must be one of');
    });

    it('should use custom validators', async () => {
      const schema = {
        username: {
          type: 'string' as const,
          required: true,
          customValidator: (value: string) => {
            if (value.includes('admin')) {
              return 'Username cannot contain "admin"';
            }
            return true;
          }
        }
      };

      // Valid username
      const validUser = await validator.validateInput({ username: 'john_doe' }, schema);
      expect(validUser.valid).toBe(true);

      // Invalid username (contains admin)
      const invalidUser = await validator.validateInput({ username: 'admin_user' }, schema);
      expect(invalidUser.valid).toBe(false);
      expect(invalidUser.errors?.[0].message).toContain('cannot contain "admin"');
    });

    it('should sanitize dangerous input', async () => {
      const schema = {
        command: { type: 'string' as const, required: true }
      };

      // Input with dangerous characters
      const dangerousInput = 'rm -rf /; echo "dangerous"';
      const result = await validator.validateInput({ command: dangerousInput }, schema);

      expect(result.valid).toBe(true);
      expect(result.sanitizedData?.command).not.toContain(';');
      expect(result.sanitizedData?.command).not.toContain('|');
      expect(result.sanitizedData?.command).not.toContain('$');
    });

    it('should handle complex validation schemas', async () => {
      const schema = {
        name: { type: 'string' as const, required: true, minLength: 2, maxLength: 50 },
        email: { type: 'email' as const, required: true },
        age: { type: 'number' as const, required: false, min: 0, max: 150 },
        active: { type: 'boolean' as const, required: false },
        role: {
          type: 'string' as const,
          required: true,
          allowedValues: ['user', 'admin', 'moderator']
        }
      };

      const validData = {
        name: 'John Doe',
        email: 'john@example.com',
        age: 30,
        active: true,
        role: 'user'
      };

      const result = await validator.validateInput(validData, schema);
      expect(result.valid).toBe(true);
      expect(result.sanitizedData).toEqual(validData);
    });
  });

  describe('static methods', () => {
    it('should validate CLI argument patterns', () => {
      expect(InputValidator.validateCliArgument('file.txt', 'filename')).toBe(true);
      expect(InputValidator.validateCliArgument('invalid/file.txt', 'filename')).toBe(false);

      expect(InputValidator.validateCliArgument('my-dir', 'dirname')).toBe(true);
      expect(InputValidator.validateCliArgument('invalid/dir', 'dirname')).toBe(false);

      expect(InputValidator.validateCliArgument('start', 'command')).toBe(true);
      expect(InputValidator.validateCliArgument('123invalid', 'command')).toBe(false);

      expect(InputValidator.validateCliArgument('--verbose', 'flag')).toBe(true);
      expect(InputValidator.validateCliArgument('-v', 'flag')).toBe(true);
      expect(InputValidator.validateCliArgument('invalid-flag', 'flag')).toBe(false);
    });

    it('should create ginko command schema', () => {
      const schema = InputValidator.createGinkoCommandSchema();

      expect(schema.message).toBeDefined();
      expect(schema.file).toBeDefined();
      expect(schema.directory).toBeDefined();
      expect(schema.format).toBeDefined();
      expect(schema.verbose).toBeDefined();
      expect(schema.force).toBeDefined();

      expect(schema.format.allowedValues).toEqual(['json', 'yaml', 'markdown', 'text']);
    });
  });

  describe('error handling', () => {
    it('should provide meaningful error messages', async () => {
      const schema = {
        name: { type: 'string' as const, required: true, minLength: 5 },
        age: { type: 'number' as const, required: true, min: 18 }
      };

      const invalidData = {
        name: 'Jo',
        age: 16
      };

      const result = await validator.validateInput(invalidData, schema);

      expect(result.valid).toBe(false);
      expect(result.errors).toHaveLength(2);

      const nameError = result.errors?.find(e => e.field === 'name');
      const ageError = result.errors?.find(e => e.field === 'age');

      expect(nameError?.message).toContain('at least 5 characters');
      expect(ageError?.message).toContain('at least 18');
    });

    it('should track validation errors', async () => {
      const schema = {
        invalid: { type: 'string' as const, required: true }
      };

      await validator.validateInput({}, schema);

      expect(validator.getErrorMessage()).toContain('Validation failed');
      expect(validator.getSuggestions()).toHaveLength(1);
      expect(validator.getValidationErrors()).toHaveLength(1);
    });
  });

  describe('path security', () => {
    it('should prevent directory traversal attacks', async () => {
      const schema = {
        file: { type: 'filepath' as const, required: true }
      };

      // Attempt directory traversal
      const traversalPath = '../../../etc/passwd';

      const result = await validator.validateInput({ file: traversalPath }, schema);
      expect(result.valid).toBe(false);
      expect(result.errors?.[0].message).toContain('within current working directory');
    });

    it('should remove null bytes from file paths', async () => {
      const schema = {
        file: { type: 'filepath' as const, required: true }
      };

      const maliciousPath = 'file.txt\x00.exe';

      const result = await validator.validateInput({ file: maliciousPath }, schema);

      // Should either fail validation or sanitize the path
      if (result.valid) {
        expect(result.sanitizedData?.file).not.toContain('\x00');
      }
    });
  });
});