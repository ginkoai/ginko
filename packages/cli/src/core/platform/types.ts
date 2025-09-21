/**
 * @fileType: model
 * @status: current
 * @updated: 2025-09-20
 * @tags: [platform, types, cross-platform, compatibility]
 * @related: [platform-adapter.ts, hook-migrator.ts]
 * @priority: high
 * @complexity: low
 * @dependencies: []
 */

export type Platform = 'windows' | 'macos' | 'linux';

export interface PlatformConfig {
  platform: Platform;
  hookExtension: string;
  pathSeparator: string;
  homeDirectory: string;
  claudeHooksPath: string;
  shellCommand: string;
  executable: boolean;
}

export interface HookScript {
  name: string;
  content: string;
  platform: Platform;
  path: string;
  executable: boolean;
}

export interface HookConversionResult {
  success: boolean;
  convertedContent: string;
  errors: string[];
  warnings: string[];
  targetPlatform: Platform;
}

export interface PlatformDetectionResult {
  platform: Platform;
  isSupported: boolean;
  version?: string;
  architecture?: string;
}

export interface MigrationResult {
  success: boolean;
  migratedHooks: string[];
  errors: string[];
  warnings: string[];
  backupPath?: string;
}

export interface PathResolution {
  original: string;
  resolved: string;
  isValid: boolean;
  platform: Platform;
}