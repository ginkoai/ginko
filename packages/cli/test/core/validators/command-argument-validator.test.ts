/**
 * @fileType: utility
 * @status: current
 * @updated: 2025-09-22
 * @tags: [test, unit-test, command-validation, cli, jest]
 * @related: [../../../src/core/validators/command-argument-validator.ts]
 * @priority: high
 * @complexity: medium
 * @dependencies: [jest, commander]
 */

import { CommandArgumentValidator } from '../../../src/core/validators/command-argument-validator.js';
import type {
  CommandValidationConfig,
  ValidatedCommandData
} from '../../../src/core/validators/command-argument-validator.js';

describe('CommandArgumentValidator', () => {
  let validator: CommandArgumentValidator;

  beforeEach(() => {
    validator = new CommandArgumentValidator();
  });

  describe('registerCommand', () => {
    it('should register command configurations', () => {
      const config: CommandValidationConfig = {
        name: 'test-command',
        description: 'Test command for validation',
        arguments: [
          {
            name: 'target',
            description: 'Target for the command',
            required: true
          }
        ]
      };

      validator.registerCommand(config);

      const registeredCommands = validator.getRegisteredCommands();
      expect(registeredCommands).toContainEqual(config);
      expect(validator.getCommandConfig('test-command')).toEqual(config);
    });
  });

  describe('validateCommand', () => {
    beforeEach(() => {
      // Register test commands
      validator.registerCommand({
        name: 'start',
        description: 'Start a new session',
        arguments: [
          {
            name: 'message',
            description: 'Initial message',
            required: false,
            validation: {
              message: {
                type: 'string',
                maxLength: 100
              }
            }
          }
        ],
        options: [
          {
            name: 'verbose',
            description: 'Enable verbose output',
            validation: {
              verbose: { type: 'boolean' }
            }
          }
        ]
      });

      validator.registerCommand({
        name: 'handoff',
        description: 'Create a handoff',
        arguments: [
          {
            name: 'message',
            description: 'Handoff message',
            required: true,
            validation: {
              message: {
                type: 'string',
                required: true,
                minLength: 10,
                maxLength: 500
              }
            }
          }
        ]
      });
    });

    it('should validate unknown commands', async () => {
      const result = await validator.validateCommand('unknown-command', [], {});

      expect(result.valid).toBe(false);
      expect(result.errors).toContain('Unknown command: unknown-command');
      expect(result.suggestions).toContain('Run "ginko --help" to see available commands');
    });

    it('should validate valid commands with arguments', async () => {
      const result = await validator.validateCommand(
        'handoff',
        ['This is a valid handoff message with enough length'],
        {}
      );

      expect(result.valid).toBe(true);
      expect(result.command).toBe('handoff');
      expect(result.arguments.message).toBe('This is a valid handoff message with enough length');
    });

    it('should validate commands with missing required arguments', async () => {
      const result = await validator.validateCommand('handoff', [], {});

      expect(result.valid).toBe(false);
      expect(result.errors).toContain('Field \'message\' is required');
    });

    it('should validate commands with invalid argument length', async () => {
      const result = await validator.validateCommand('handoff', ['Too short'], {});

      expect(result.valid).toBe(false);
      expect(result.errors?.[0]).toContain('at least 10 characters');
    });

    it('should validate commands with options', async () => {
      const result = await validator.validateCommand(
        'start',
        ['Initial session message'],
        { verbose: true }
      );

      expect(result.valid).toBe(true);
      expect(result.options.verbose).toBe(true);
    });

    it('should validate commands with choices', async () => {
      validator.registerCommand({
        name: 'context',
        description: 'Manage context',
        arguments: [
          {
            name: 'action',
            description: 'Action to perform',
            choices: ['list', 'load', 'create'],
            validation: {
              action: {
                type: 'string',
                allowedValues: ['list', 'load', 'create']
              }
            }
          }
        ]
      });

      // Valid choice
      const validResult = await validator.validateCommand('context', ['list'], {});
      expect(validResult.valid).toBe(true);

      // Invalid choice
      const invalidResult = await validator.validateCommand('context', ['invalid'], {});
      expect(invalidResult.valid).toBe(false);
      expect(invalidResult.errors?.[0]).toContain('must be one of');
    });

    it('should handle custom validation', async () => {
      validator.registerCommand({
        name: 'custom-test',
        description: 'Test custom validation',
        arguments: [
          {
            name: 'value',
            description: 'Test value',
            required: true
          }
        ],
        customValidation: async (args, options) => {
          if (args.value === 'forbidden') {
            return {
              valid: false,
              error: 'This value is not allowed',
              suggestions: ['Try a different value']
            };
          }
          return { valid: true };
        }
      });

      // Valid custom validation
      const validResult = await validator.validateCommand('custom-test', ['allowed'], {});
      expect(validResult.valid).toBe(true);

      // Failed custom validation
      const invalidResult = await validator.validateCommand('custom-test', ['forbidden'], {});
      expect(invalidResult.valid).toBe(false);
      expect(invalidResult.errors).toContain('This value is not allowed');
      expect(invalidResult.suggestions).toContain('Try a different value');
    });
  });

  describe('createValidatedCommand', () => {
    it('should create a Commander.js command with validation', () => {
      const config: CommandValidationConfig = {
        name: 'test',
        description: 'Test command',
        arguments: [
          {
            name: 'target',
            description: 'Target parameter',
            required: true
          }
        ],
        options: [
          {
            name: 'verbose',
            description: 'Verbose output',
            aliases: ['v']
          }
        ]
      };

      const command = validator.createValidatedCommand(config);

      expect(command.name()).toBe('test');
      expect(command.description()).toBe('Test command');

      // Check that the command is registered
      expect(validator.getCommandConfig('test')).toEqual(config);
    });

    it('should create commands with choices', () => {
      const config: CommandValidationConfig = {
        name: 'format',
        description: 'Format command',
        options: [
          {
            name: 'type',
            description: 'Output format',
            choices: ['json', 'yaml', 'text']
          }
        ]
      };

      const command = validator.createValidatedCommand(config);
      expect(command.name()).toBe('format');
    });
  });

  describe('builtin commands', () => {
    it('should have registered builtin ginko commands', () => {
      const commands = validator.getRegisteredCommands();
      const commandNames = commands.map(c => c.name);

      expect(commandNames).toContain('start');
      expect(commandNames).toContain('handoff');
      expect(commandNames).toContain('context');
      expect(commandNames).toContain('doctor');
      expect(commandNames).toContain('sprint');
    });

    it('should validate start command', async () => {
      const result = await validator.validateCommand('start', [], { verbose: true });
      expect(result.valid).toBe(true);
      expect(result.options.verbose).toBe(true);
    });

    it('should validate handoff command with proper message', async () => {
      const message = 'Completed feature implementation and testing';
      const result = await validator.validateCommand('handoff', [message], {});

      expect(result.valid).toBe(true);
      expect(result.arguments.message).toBe(message);
    });

    it('should validate context command with valid action', async () => {
      const result = await validator.validateCommand('context', ['list'], {});
      expect(result.valid).toBe(true);
      expect(result.arguments.action).toBe('list');
    });

    it('should validate doctor command with options', async () => {
      const result = await validator.validateCommand('doctor', [], { fix: true, verbose: true });
      expect(result.valid).toBe(true);
      expect(result.options.fix).toBe(true);
      expect(result.options.verbose).toBe(true);
    });

    it('should validate sprint command with action', async () => {
      const result = await validator.validateCommand('sprint', ['start'], {});
      expect(result.valid).toBe(true);
      expect(result.arguments.action).toBe('start');
    });
  });

  describe('static methods', () => {
    it('should validate common patterns', () => {
      expect(CommandArgumentValidator.validateCommonPatterns('test@example.com', 'email')).toBe(true);
      expect(CommandArgumentValidator.validateCommonPatterns('invalid-email', 'email')).toBe(false);

      expect(CommandArgumentValidator.validateCommonPatterns('https://example.com', 'url')).toBe(true);
      expect(CommandArgumentValidator.validateCommonPatterns('not-a-url', 'url')).toBe(false);

      expect(CommandArgumentValidator.validateCommonPatterns('1.0.0', 'semver')).toBe(true);
      expect(CommandArgumentValidator.validateCommonPatterns('invalid-version', 'semver')).toBe(false);

      const uuid = '123e4567-e89b-12d3-a456-426614174000';
      expect(CommandArgumentValidator.validateCommonPatterns(uuid, 'uuid')).toBe(true);
      expect(CommandArgumentValidator.validateCommonPatterns('invalid-uuid', 'uuid')).toBe(false);
    });
  });

  describe('error handling', () => {
    it('should provide helpful error messages for validation failures', async () => {
      validator.registerCommand({
        name: 'error-test',
        description: 'Command for testing errors',
        arguments: [
          {
            name: 'required-arg',
            description: 'Required argument',
            required: true,
            validation: {
              'required-arg': {
                type: 'string',
                required: true,
                minLength: 5
              }
            }
          }
        ]
      });

      const result = await validator.validateCommand('error-test', ['ab'], {});

      expect(result.valid).toBe(false);
      expect(result.errors).toBeDefined();
      expect(result.errors?.length).toBeGreaterThan(0);
      expect(result.suggestions).toBeDefined();
    });

    it('should track validation state correctly', async () => {
      const result = await validator.validateCommand('unknown', [], {});

      expect(result.valid).toBe(false);
      expect(validator.getErrorMessage()).toContain('Unknown command');
      expect(validator.getSuggestions()).toContain('Run "ginko --help" to see available commands');
    });
  });

  describe('integration scenarios', () => {
    it('should handle complex command with multiple arguments and options', async () => {
      validator.registerCommand({
        name: 'complex',
        description: 'Complex command for testing',
        arguments: [
          {
            name: 'action',
            description: 'Action to perform',
            required: true,
            choices: ['create', 'update', 'delete'],
            validation: {
              action: {
                type: 'string',
                required: true,
                allowedValues: ['create', 'update', 'delete']
              }
            }
          },
          {
            name: 'target',
            description: 'Target resource',
            required: true,
            validation: {
              target: {
                type: 'string',
                required: true,
                minLength: 3,
                maxLength: 50,
                pattern: /^[a-zA-Z0-9-_]+$/
              }
            }
          }
        ],
        options: [
          {
            name: 'force',
            description: 'Force the operation',
            validation: {
              force: { type: 'boolean' }
            }
          },
          {
            name: 'format',
            description: 'Output format',
            choices: ['json', 'yaml', 'text'],
            validation: {
              format: {
                type: 'string',
                allowedValues: ['json', 'yaml', 'text']
              }
            }
          }
        ]
      });

      const result = await validator.validateCommand(
        'complex',
        ['create', 'my-resource'],
        { force: true, format: 'json' }
      );

      expect(result.valid).toBe(true);
      expect(result.arguments.action).toBe('create');
      expect(result.arguments.target).toBe('my-resource');
      expect(result.options.force).toBe(true);
      expect(result.options.format).toBe('json');
    });

    it('should handle edge cases gracefully', async () => {
      // Empty command name
      const emptyResult = await validator.validateCommand('', [], {});
      expect(emptyResult.valid).toBe(false);

      // Very long arguments
      const longArg = 'a'.repeat(10000);
      const longResult = await validator.validateCommand('start', [longArg], {});
      expect(longResult.valid).toBe(false);

      // Special characters in arguments
      const specialResult = await validator.validateCommand('start', ['test\x00injection'], {});
      // Should either sanitize or reject
      if (specialResult.valid) {
        expect(specialResult.arguments.message).not.toContain('\x00');
      }
    });
  });
});