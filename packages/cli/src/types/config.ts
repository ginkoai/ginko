/**
 * @fileType: model
 * @status: current
 * @updated: 2025-09-20
 * @tags: [config, schema, types, paths, features]
 * @related: [config-loader.ts, init.ts]
 * @priority: high
 * @complexity: medium
 * @dependencies: []
 */

/**
 * Configuration schema for ginko.json
 * Supports path customization and feature toggles
 */
export interface GinkoConfig {
  version: string;
  paths: PathsConfig;
  features: FeaturesConfig;
  platform?: PlatformConfig;
  naming?: NamingConfig;
}

/**
 * Path configuration with variable substitution support
 * Allows customization of documentation and ginko directories
 */
export interface PathsConfig {
  docs: DocsPathConfig;
  ginko: GinkoPathConfig;
}

/**
 * Documentation paths configuration
 * Supports variable substitution like ${docs.root}/adr
 */
export interface DocsPathConfig {
  root: string;
  adr: string;
  prd: string;
  sprints: string;
  [key: string]: string; // Allow additional custom paths
}

/**
 * Ginko internal paths configuration
 */
export interface GinkoPathConfig {
  root: string;
  context: string;
  sessions: string;
  backlog: string;
  patterns?: string;
  bestPractices?: string;
}

/**
 * Feature toggles for ginko functionality
 */
export interface FeaturesConfig {
  autoCapture: boolean;
  gitIntegration: boolean;
  aiEnhancement: boolean;
  documentNaming?: boolean;
  crossPlatform?: boolean;
}

/**
 * Platform-specific configuration
 */
export interface PlatformConfig {
  platform: 'windows' | 'macos' | 'linux';
  hookExtension: '.bat' | '.sh';
  shellExtension: '.bat' | '.sh';
  pathSeparator: '/' | '\\';
  homeDirectory: string;
  claudeConfigPath: string;
  hookDirectory: string;
  autoDetect?: boolean;
  migrationSettings?: {
    backupOriginal: boolean;
    preserveComments: boolean;
    addPlatformHeader: boolean;
  };
}

/**
 * Document naming configuration
 */
export interface NamingConfig {
  format: string; // e.g., "{TYPE}-{NUMBER:03d}-{description}"
  dateFormat?: string; // e.g., "YYYY-MM-DD"
  types: DocumentTypeConfig;
}

/**
 * Document type configurations
 */
export interface DocumentTypeConfig {
  [key: string]: {
    prefix: string;
    path: string;
  };
}

/**
 * Default configuration values
 */
export const DEFAULT_CONFIG: GinkoConfig = {
  version: "1.0.0",
  paths: {
    docs: {
      root: "docs",
      adr: "${docs.root}/adr",
      prd: "${docs.root}/PRD",
      sprints: "${docs.root}/sprints"
    },
    ginko: {
      root: ".ginko",
      context: "${ginko.root}/context",
      sessions: "${ginko.root}/sessions",
      backlog: "${ginko.root}/backlog",
      patterns: "${ginko.root}/patterns",
      bestPractices: "${ginko.root}/best-practices"
    }
  },
  features: {
    autoCapture: true,
    gitIntegration: true,
    aiEnhancement: true,
    documentNaming: true,
    crossPlatform: true
  },
  naming: {
    format: "{TYPE}-{NUMBER:03d}-{description}",
    dateFormat: "YYYY-MM-DD",
    types: {
      ADR: { prefix: "ADR", path: "${docs.adr}" },
      PRD: { prefix: "PRD", path: "${docs.prd}" },
      SPRINT: { prefix: "SPRINT", path: "${docs.sprints}" }
    }
  }
};

/**
 * Configuration for existing project detection
 */
export interface ProjectDetectionConfig {
  hasDocsFolder: boolean;
  hasExistingAdr: boolean;
  hasExistingPrd: boolean;
  existingPaths: string[];
  recommendedConfig: Partial<GinkoConfig>;
}

/**
 * Configuration prompt options for interactive setup
 */
export interface ConfigPromptOption {
  name: string;
  value: string | Partial<GinkoConfig>;
  description?: string;
}

/**
 * Migration settings for existing installations
 */
export interface MigrationConfig {
  backupExisting: boolean;
  updateDocuments: boolean;
  validatePaths: boolean;
  preserveCustomPaths: boolean;
}