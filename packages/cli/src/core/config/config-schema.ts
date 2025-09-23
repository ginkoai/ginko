/**
 * @fileType: config
 * @status: current
 * @updated: 2025-09-19
 * @tags: [config, schema, typescript, json-schema, validation]
 * @related: [config-loader.ts, config-migrator.ts, path-resolver.ts]
 * @priority: critical
 * @complexity: medium
 * @dependencies: []
 */

/**
 * Configuration Schema for Ginko CLI
 * Implements ADR-028 First-Use Experience Enhancement Architecture
 */

export interface PlatformConfig {
  /** Operating system platform */
  type: 'windows' | 'macos' | 'linux';
  /** Shell type for script execution */
  shell: 'bash' | 'zsh' | 'powershell' | 'cmd';
  /** Path separator for this platform */
  pathSeparator: '/' | '\\';
  /** Home directory path */
  homeDirectory: string;
  /** Platform-specific configurations */
  specific?: {
    /** Windows-specific settings */
    windows?: {
      useWSL?: boolean;
      wslDistro?: string;
    };
    /** macOS-specific settings */
    macos?: {
      brewPrefix?: string;
    };
    /** Linux-specific settings */
    linux?: {
      distribution?: string;
    };
  };
}

export interface PathConfiguration {
  /** Document paths configuration */
  docs: Record<string, string>;
  /** Ginko-specific paths configuration */
  ginko: Record<string, string>;
}

export interface FeatureFlags {
  /** Enable/disable specific features */
  [featureName: string]: boolean;
}

export interface GinkoConfig {
  /** Configuration schema version */
  version: string;
  /** Path configurations with variable substitution support */
  paths: PathConfiguration;
  /** Feature flags for enabling/disabling functionality */
  features: FeatureFlags;
  /** Platform-specific configuration (optional) */
  platform?: PlatformConfig;
  /** Additional metadata */
  metadata?: {
    /** When this config was created */
    createdAt?: string;
    /** When this config was last updated */
    updatedAt?: string;
    /** User who created/updated this config */
    updatedBy?: string;
    /** Migration history */
    migrationHistory?: string[];
  };
}

/**
 * Default configuration values
 */
export const DEFAULT_CONFIG: GinkoConfig = {
  version: '1.0.0',
  paths: {
    docs: {
      root: './docs',
      adr: '${docs.root}/adr',
      prd: '${docs.root}/PRD',
      ux: '${docs.root}/UX',
      architecture: '${docs.root}/architecture',
      api: '${docs.root}/api'
    },
    ginko: {
      root: './.ginko',
      context: '${ginko.root}/context',
      sessions: '${ginko.root}/sessions',
      cache: '${ginko.root}/cache',
      modules: '${ginko.context}/modules',
      templates: '${ginko.context}/templates'
    }
  },
  features: {
    autoHandoff: true,
    contextCaching: true,
    smartSuggestions: true,
    gitHooks: false,
    telemetry: false,
    experimentalFeatures: false
  }
};

/**
 * JSON Schema definition for ginko.json configuration file
 * Used for validation and IDE support
 */
export const GINKO_CONFIG_SCHEMA = {
  $schema: 'http://json-schema.org/draft-07/schema#',
  type: 'object',
  title: 'Ginko Configuration',
  description: 'Configuration schema for Ginko CLI',
  required: ['version', 'paths', 'features'],
  properties: {
    version: {
      type: 'string',
      description: 'Configuration schema version',
      pattern: '^\\d+\\.\\d+\\.\\d+$',
      examples: ['1.0.0', '1.1.0']
    },
    paths: {
      type: 'object',
      description: 'Path configurations with variable substitution support',
      required: ['docs', 'ginko'],
      properties: {
        docs: {
          type: 'object',
          description: 'Document paths configuration',
          patternProperties: {
            '^[a-zA-Z][a-zA-Z0-9_]*$': {
              type: 'string',
              description: 'Path value (supports ${variable} substitution)'
            }
          },
          additionalProperties: false
        },
        ginko: {
          type: 'object',
          description: 'Ginko-specific paths configuration',
          patternProperties: {
            '^[a-zA-Z][a-zA-Z0-9_]*$': {
              type: 'string',
              description: 'Path value (supports ${variable} substitution)'
            }
          },
          additionalProperties: false
        }
      },
      additionalProperties: false
    },
    features: {
      type: 'object',
      description: 'Feature flags for enabling/disabling functionality',
      patternProperties: {
        '^[a-zA-Z][a-zA-Z0-9_]*$': {
          type: 'boolean',
          description: 'Feature enabled/disabled'
        }
      },
      additionalProperties: false
    },
    platform: {
      type: 'object',
      description: 'Platform-specific configuration',
      properties: {
        type: {
          type: 'string',
          enum: ['windows', 'macos', 'linux'],
          description: 'Operating system platform'
        },
        shell: {
          type: 'string',
          enum: ['bash', 'zsh', 'powershell', 'cmd'],
          description: 'Shell type for script execution'
        },
        pathSeparator: {
          type: 'string',
          enum: ['/', '\\'],
          description: 'Path separator for this platform'
        },
        homeDirectory: {
          type: 'string',
          description: 'Home directory path'
        },
        specific: {
          type: 'object',
          description: 'Platform-specific configurations',
          properties: {
            windows: {
              type: 'object',
              properties: {
                useWSL: {
                  type: 'boolean',
                  description: 'Use Windows Subsystem for Linux'
                },
                wslDistro: {
                  type: 'string',
                  description: 'WSL distribution name'
                }
              },
              additionalProperties: false
            },
            macos: {
              type: 'object',
              properties: {
                brewPrefix: {
                  type: 'string',
                  description: 'Homebrew installation prefix'
                }
              },
              additionalProperties: false
            },
            linux: {
              type: 'object',
              properties: {
                distribution: {
                  type: 'string',
                  description: 'Linux distribution name'
                }
              },
              additionalProperties: false
            }
          },
          additionalProperties: false
        }
      },
      required: ['type', 'shell', 'pathSeparator', 'homeDirectory'],
      additionalProperties: false
    },
    metadata: {
      type: 'object',
      description: 'Additional metadata',
      properties: {
        createdAt: {
          type: 'string',
          format: 'date-time',
          description: 'When this config was created'
        },
        updatedAt: {
          type: 'string',
          format: 'date-time',
          description: 'When this config was last updated'
        },
        updatedBy: {
          type: 'string',
          description: 'User who created/updated this config'
        },
        migrationHistory: {
          type: 'array',
          items: {
            type: 'string'
          },
          description: 'Migration history'
        }
      },
      additionalProperties: false
    }
  },
  additionalProperties: false
} as const;

/**
 * Type guards for configuration validation
 */
export function isValidGinkoConfig(obj: any): obj is GinkoConfig {
  if (!obj || typeof obj !== 'object') return false;

  // Check required fields
  if (typeof obj.version !== 'string') return false;
  if (!obj.paths || typeof obj.paths !== 'object') return false;
  if (!obj.features || typeof obj.features !== 'object') return false;

  // Check paths structure
  if (!obj.paths.docs || typeof obj.paths.docs !== 'object') return false;
  if (!obj.paths.ginko || typeof obj.paths.ginko !== 'object') return false;

  // Validate version format
  const versionPattern = /^\d+\.\d+\.\d+$/;
  if (!versionPattern.test(obj.version)) return false;

  return true;
}

export function isPlatformConfig(obj: any): obj is PlatformConfig {
  if (!obj || typeof obj !== 'object') return false;

  const validTypes = ['windows', 'macos', 'linux'];
  const validShells = ['bash', 'zsh', 'powershell', 'cmd'];
  const validSeparators = ['/', '\\'];

  return (
    validTypes.includes(obj.type) &&
    validShells.includes(obj.shell) &&
    validSeparators.includes(obj.pathSeparator) &&
    typeof obj.homeDirectory === 'string'
  );
}

/**
 * Configuration validation errors
 */
export class ConfigValidationError extends Error {
  constructor(
    message: string,
    public field?: string,
    public value?: any
  ) {
    super(message);
    this.name = 'ConfigValidationError';
  }
}

/**
 * Validate configuration against schema
 */
export function validateConfig(config: any): { valid: boolean; errors: string[] } {
  const errors: string[] = [];

  try {
    if (!isValidGinkoConfig(config)) {
      errors.push('Configuration does not match required schema');
    }

    // Additional validation logic can be added here
    // For example, checking for circular references in paths

    return { valid: errors.length === 0, errors };
  } catch (error) {
    return {
      valid: false,
      errors: [`Validation failed: ${error instanceof Error ? error.message : 'Unknown error'}`]
    };
  }
}

/**
 * Configuration migration interfaces
 */
export interface ConfigMigration {
  /** From version */
  from: string;
  /** To version */
  to: string;
  /** Migration description */
  description: string;
  /** Migration function */
  migrate: (oldConfig: any) => GinkoConfig;
}

/**
 * Supported configuration versions and their features
 */
export const SUPPORTED_CONFIG_VERSIONS = {
  '1.0.0': {
    description: 'Initial configuration schema',
    features: ['basic-paths', 'feature-flags', 'platform-detection']
  }
} as const;

export type SupportedVersion = keyof typeof SUPPORTED_CONFIG_VERSIONS;