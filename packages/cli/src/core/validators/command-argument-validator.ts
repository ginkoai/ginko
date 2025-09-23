/**
 * @fileType: utility
 * @status: current
 * @updated: 2025-09-22
 * @tags: [validation, command-arguments, cli, middleware, security]
 * @related: [input-validator.ts, command-validator.ts, index.ts]
 * @priority: critical
 * @complexity: medium
 * @dependencies: [commander]
 */

import { Command } from 'commander';
import { InputValidator, InputValidationSchema, InputValidationResult } from './input-validator.js';
import { ValidationResult, Validator } from './git-validator.js';

/**
 * Command argument configuration for validation
 */
export interface CommandArgumentConfig {
  name: string;
  description: string;
  required?: boolean;
  defaultValue?: any;
  validation?: InputValidationSchema;
  aliases?: string[];
  choices?: string[];
}

/**
 * Command validation configuration
 */
export interface CommandValidationConfig {
  name: string;
  description: string;
  arguments?: CommandArgumentConfig[];
  options?: CommandArgumentConfig[];
  subcommands?: CommandValidationConfig[];
  customValidation?: (args: any, options: any) => Promise<ValidationResult>;
  requiresGit?: boolean;
  requiresConfig?: boolean;
  requiresNetwork?: boolean;
}

/**
 * Parsed and validated command data
 */
export interface ValidatedCommandData {
  command: string;
  arguments: Record<string, any>;
  options: Record<string, any>;
  rawArgs: string[];
  valid: boolean;
  errors?: string[];
  suggestions?: string[];
}

/**
 * Command argument validator that provides type-safe validation for CLI commands
 * Integrates with Commander.js to provide comprehensive argument validation
 */
export class CommandArgumentValidator implements Validator {
  private inputValidator: InputValidator;
  private lastError?: string;
  private lastSuggestions: string[] = [];
  private commandConfigs: Map<string, CommandValidationConfig> = new Map();

  constructor() {
    this.inputValidator = new InputValidator();
    this.registerBuiltinCommands();
  }

  /**
   * Register a command configuration for validation
   */
  registerCommand(config: CommandValidationConfig): void {
    this.commandConfigs.set(config.name, config);
  }

  /**
   * Validate command arguments and options
   */
  async validateCommand(
    commandName: string,
    args: string[],
    options: Record<string, any>
  ): Promise<ValidatedCommandData> {
    const config = this.commandConfigs.get(commandName);
    if (!config) {
      return {
        command: commandName,
        arguments: {},
        options,
        rawArgs: args,
        valid: false,
        errors: [`Unknown command: ${commandName}`],
        suggestions: ['Run "ginko --help" to see available commands']
      };
    }

    const validationResult: ValidatedCommandData = {
      command: commandName,
      arguments: {},
      options: {},
      rawArgs: args,
      valid: true,
      errors: [],
      suggestions: []
    };

    // Validate arguments
    if (config.arguments) {
      const argValidation = await this.validateArguments(args, config.arguments);
      if (!argValidation.valid) {
        validationResult.valid = false;
        if (argValidation.errors) {
          const errorMessages = argValidation.errors.map(e => e.message);
          validationResult.errors?.push(...errorMessages);
        }
        if (argValidation.suggestions) {
          validationResult.suggestions?.push(...argValidation.suggestions);
        }
      } else {
        validationResult.arguments = argValidation.sanitizedData || {};
      }
    }

    // Validate options
    if (config.options) {
      const optionValidation = await this.validateOptions(options, config.options);
      if (!optionValidation.valid) {
        validationResult.valid = false;
        if (optionValidation.errors) {
          const errorMessages = optionValidation.errors.map(e => e.message);
          validationResult.errors?.push(...errorMessages);
        }
        if (optionValidation.suggestions) {
          validationResult.suggestions?.push(...optionValidation.suggestions);
        }
      } else {
        validationResult.options = optionValidation.sanitizedData || {};
      }
    }

    // Custom validation
    if (config.customValidation && validationResult.valid) {
      const customResult = await config.customValidation(
        validationResult.arguments,
        validationResult.options
      );
      if (!customResult.valid) {
        validationResult.valid = false;
        if (customResult.error) {
          validationResult.errors?.push(customResult.error);
        }
        if (customResult.suggestions) {
          validationResult.suggestions?.push(...customResult.suggestions);
        }
      }
    }

    if (!validationResult.valid) {
      this.lastError = validationResult.errors?.join('; ') || 'Command validation failed';
      this.lastSuggestions = validationResult.suggestions || [];
    }

    return validationResult;
  }

  /**
   * Validate command arguments against configuration
   */
  private async validateArguments(
    args: string[],
    argumentConfigs: CommandArgumentConfig[]
  ): Promise<InputValidationResult> {
    const argumentData: Record<string, any> = {};
    const schema: InputValidationSchema = {};

    // Map arguments to configuration
    for (let i = 0; i < argumentConfigs.length; i++) {
      const config = argumentConfigs[i];
      const value = args[i];

      if (value !== undefined) {
        argumentData[config.name] = value;
      } else if (config.defaultValue !== undefined) {
        argumentData[config.name] = config.defaultValue;
      }

      // Build validation schema
      if (config.validation) {
        Object.assign(schema, config.validation);
      } else {
        // Default string validation
        schema[config.name] = {
          type: 'string',
          required: config.required || false,
          maxLength: 500
        };
      }

      // Add choices validation if specified
      if (config.choices && config.choices.length > 0) {
        schema[config.name] = {
          ...schema[config.name],
          allowedValues: config.choices
        };
      }
    }

    return await this.inputValidator.validateInput(argumentData, schema);
  }

  /**
   * Validate command options against configuration
   */
  private async validateOptions(
    options: Record<string, any>,
    optionConfigs: CommandArgumentConfig[]
  ): Promise<InputValidationResult> {
    const schema: InputValidationSchema = {};

    // Build validation schema for options
    for (const config of optionConfigs) {
      if (config.validation) {
        Object.assign(schema, config.validation);
      } else {
        // Default validation based on option type
        schema[config.name] = {
          type: 'string',
          required: config.required || false,
          maxLength: 1000
        };
      }

      // Add choices validation if specified
      if (config.choices && config.choices.length > 0) {
        schema[config.name] = {
          ...schema[config.name],
          allowedValues: config.choices
        };
      }
    }

    return await this.inputValidator.validateInput(options, schema);
  }

  /**
   * Create a Commander.js command with built-in validation
   */
  createValidatedCommand(config: CommandValidationConfig): Command {
    const command = new Command(config.name);
    command.description(config.description);

    // Add arguments
    if (config.arguments) {
      for (const arg of config.arguments) {
        if (arg.required) {
          command.argument(`<${arg.name}>`, arg.description);
        } else {
          command.argument(`[${arg.name}]`, arg.description, arg.defaultValue);
        }
      }
    }

    // Add options
    if (config.options) {
      for (const opt of config.options) {
        const flags = opt.aliases
          ? `--${opt.name}, ${opt.aliases.map(a => `-${a}`).join(', ')}`
          : `--${opt.name}`;

        if (opt.choices) {
          command.option(flags, opt.description, opt.defaultValue);
          command.addOption(
            command.createOption(flags, opt.description)
              .choices(opt.choices)
              .default(opt.defaultValue)
          );
        } else {
          command.option(flags, opt.description, opt.defaultValue);
        }
      }
    }

    // Add validation action
    command.action(async (...args: any[]) => {
      const commandArgs = args.slice(0, -2); // Remove options and command objects
      const options = args[args.length - 2];

      const validation = await this.validateCommand(config.name, commandArgs, options);

      if (!validation.valid) {
        console.error('Command validation failed:');
        validation.errors?.forEach(error => console.error(`  • ${error}`));

        if (validation.suggestions?.length) {
          console.error('\nSuggestions:');
          validation.suggestions.forEach(suggestion => console.error(`  • ${suggestion}`));
        }

        process.exit(1);
      }

      // Continue with execution - validation passed
    });

    // Register the command configuration
    this.registerCommand(config);

    return command;
  }

  /**
   * Register built-in ginko commands with validation
   */
  private registerBuiltinCommands(): void {
    // Start command
    this.registerCommand({
      name: 'start',
      description: 'Start a new ginko session',
      options: [
        {
          name: 'message',
          description: 'Initial session message',
          validation: {
            message: {
              type: 'string',
              maxLength: 500,
              pattern: /^[a-zA-Z0-9\s.,!?-]+$/
            }
          }
        },
        {
          name: 'verbose',
          description: 'Enable verbose output',
          validation: {
            verbose: { type: 'boolean' }
          }
        }
      ],
      requiresGit: true
    });

    // Handoff command
    this.registerCommand({
      name: 'handoff',
      description: 'Create a handoff for the current session',
      arguments: [
        {
          name: 'message',
          description: 'Handoff message describing current state',
          required: true,
          validation: {
            message: {
              type: 'string',
              required: true,
              minLength: 10,
              maxLength: 1000,
              pattern: /^[a-zA-Z0-9\s.,!?-]+$/
            }
          }
        }
      ],
      requiresGit: true
    });

    // Context command
    this.registerCommand({
      name: 'context',
      description: 'Manage context modules',
      arguments: [
        {
          name: 'action',
          description: 'Context action to perform',
          choices: ['list', 'load', 'create', 'update', 'delete'],
          validation: {
            action: {
              type: 'string',
              allowedValues: ['list', 'load', 'create', 'update', 'delete']
            }
          }
        }
      ]
    });

    // Doctor command
    this.registerCommand({
      name: 'doctor',
      description: 'Diagnose ginko environment and configuration',
      options: [
        {
          name: 'fix',
          description: 'Automatically fix detected issues',
          validation: {
            fix: { type: 'boolean' }
          }
        },
        {
          name: 'verbose',
          description: 'Show detailed diagnostic information',
          validation: {
            verbose: { type: 'boolean' }
          }
        }
      ]
    });

    // Sprint command
    this.registerCommand({
      name: 'sprint',
      description: 'Sprint planning and management',
      arguments: [
        {
          name: 'action',
          description: 'Sprint action to perform',
          choices: ['start', 'status', 'complete', 'plan'],
          validation: {
            action: {
              type: 'string',
              allowedValues: ['start', 'status', 'complete', 'plan']
            }
          }
        }
      ],
      requiresGit: true,
      requiresConfig: true
    });
  }

  /**
   * Validate common CLI patterns
   */
  static validateCommonPatterns(value: string, pattern: 'email' | 'url' | 'semver' | 'uuid'): boolean {
    const patterns = {
      email: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
      url: /^https?:\/\/[^\s/$.?#].[^\s]*$/i,
      semver: /^\d+\.\d+\.\d+(-[a-zA-Z0-9-]+)?(\+[a-zA-Z0-9-]+)?$/,
      uuid: /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i
    };

    return patterns[pattern]?.test(value) || false;
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

  /**
   * Get all registered command configurations
   */
  getRegisteredCommands(): CommandValidationConfig[] {
    return Array.from(this.commandConfigs.values());
  }

  /**
   * Get command configuration by name
   */
  getCommandConfig(name: string): CommandValidationConfig | undefined {
    return this.commandConfigs.get(name);
  }
}