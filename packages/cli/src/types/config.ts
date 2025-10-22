/**
 * @fileType: model
 * @status: current
 * @updated: 2025-10-22
 * @tags: [config, schema, types, paths, features, two-tier, adr-037]
 * @related: [config-loader.ts, init.ts]
 * @priority: critical
 * @complexity: medium
 * @dependencies: []
 */

/**
 * Work mode enumeration
 */
export type WorkMode = 'hack-ship' | 'think-build' | 'full-planning';

/**
 * Configuration schema for ginko.json (team-shared, git-tracked)
 * All paths are RELATIVE to project root
 * Per ADR-037: Two-Tier Configuration Architecture
 */
export interface GinkoConfig {
  $schema?: string;
  version: string;
  project: ProjectConfig;
  paths: Record<string, string>;  // All relative paths
  workMode: WorkModeConfig;
  contextLoading: ContextLoadingConfig;
}

/**
 * Project metadata
 */
export interface ProjectConfig {
  name: string;
  type: 'monorepo' | 'single' | 'library';
}

/**
 * Work mode configuration
 * Controls documentation depth per mode
 */
export interface WorkModeConfig {
  default: WorkMode;
  documentationDepth: Record<WorkMode, string[]>;
}

/**
 * Context loading configuration
 */
export interface ContextLoadingConfig {
  progressive: boolean;
  maxDepth: number;
  followReferences: boolean;
  priorityOrder: string[];
}

/**
 * Local configuration schema for .ginko/local.json (user-specific, git-ignored)
 * Contains absolute paths and user preferences
 * Per ADR-037: Two-Tier Configuration Architecture
 */
export interface LocalConfig {
  projectRoot: string;  // Absolute path to project root
  userEmail: string;
  userSlug: string;
  workMode?: WorkMode;
  lastSession?: string;
}

/**
 * Default team-shared configuration
 * Used when ginko.json doesn't exist
 */
export const DEFAULT_GINKO_CONFIG: GinkoConfig = {
  $schema: "https://ginko.ai/schemas/ginko-config.json",
  version: "1.0",
  project: {
    name: "Project",
    type: "single"
  },
  paths: {
    docs: "docs",
    sprints: "docs/sprints",
    currentSprint: "docs/sprints/CURRENT-SPRINT.md",
    prds: "docs/PRD",
    adrs: "docs/adr",
    architecture: "docs/architecture",
    backlog: "backlog",
    context: ".ginko/context/modules",
    sessions: ".ginko/sessions",
    bestPractices: ".ginko/best-practices"
  },
  workMode: {
    default: "think-build",
    documentationDepth: {
      "hack-ship": ["currentSprint", "sessions"],
      "think-build": ["currentSprint", "sessions", "adrs", "prds"],
      "full-planning": ["currentSprint", "sessions", "adrs", "prds", "architecture", "bestPractices"]
    }
  },
  contextLoading: {
    progressive: true,
    maxDepth: 3,
    followReferences: true,
    priorityOrder: ["sessions", "currentSprint", "prds", "adrs", "context"]
  }
};

// ========================================================================
// LEGACY TYPES (Backward Compatibility)
// These types are deprecated but maintained for backward compatibility
// ========================================================================

/**
 * @deprecated Use GinkoConfig instead
 * Path configuration with variable substitution support
 */
export interface PathsConfig {
  docs: DocsPathConfig;
  ginko: GinkoPathConfig;
}

/**
 * @deprecated Use GinkoConfig.paths instead
 * Documentation paths configuration
 */
export interface DocsPathConfig {
  root: string;
  adr: string;
  prd: string;
  sprints: string;
  [key: string]: string;
}

/**
 * @deprecated Use GinkoConfig.paths instead
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
 * @deprecated Feature toggles no longer used in ADR-037 configuration
 */
export interface FeaturesConfig {
  autoCapture: boolean;
  gitIntegration: boolean;
  aiEnhancement: boolean;
  documentNaming?: boolean;
  crossPlatform?: boolean;
}

/**
 * @deprecated Platform config no longer part of main configuration
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
 * @deprecated Document naming moved to separate system
 */
export interface NamingConfig {
  format: string;
  dateFormat?: string;
  types: DocumentTypeConfig;
}

/**
 * @deprecated Document types handled differently in ADR-037
 */
export interface DocumentTypeConfig {
  [key: string]: {
    prefix: string;
    path: string;
  };
}

/**
 * @deprecated Use DEFAULT_GINKO_CONFIG instead
 */
export const DEFAULT_CONFIG: any = {
  version: "1.0.0",
  paths: {
    docs: {
      root: "docs",
      adr: "docs/adr",
      prd: "docs/PRD",
      sprints: "docs/sprints"
    },
    ginko: {
      root: ".ginko",
      context: ".ginko/context",
      sessions: ".ginko/sessions",
      backlog: ".ginko/backlog",
      patterns: ".ginko/patterns",
      bestPractices: ".ginko/best-practices"
    }
  },
  features: {
    autoCapture: true,
    gitIntegration: true,
    aiEnhancement: true,
    documentNaming: true,
    crossPlatform: true
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