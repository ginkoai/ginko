/**
 * @fileType: utility
 * @status: current
 * @updated: 2025-01-16
 * @tags: [github, git-sync, types, ADR-054]
 * @related: [client.ts, git-sync-service.ts]
 * @priority: high
 * @complexity: low
 * @dependencies: []
 */

/**
 * GitHub Git Sync Types (ADR-054 / e011_s02_t03)
 *
 * Type definitions for syncing dashboard edits to git-native markdown files.
 */

/**
 * Supported node types for git sync
 */
export type SyncableNodeType = 'ADR' | 'PRD' | 'Pattern' | 'Gotcha' | 'Charter';

/**
 * Node data required for syncing to git
 */
export interface SyncableNode {
  id: string;
  type: SyncableNodeType;
  title: string;
  content?: string;
  status?: string;
  tags?: string[];
  slug?: string;
}

/**
 * Result from GitHub file operations
 */
export interface GitHubFileResult {
  sha: string;
  path: string;
  url: string;
}

/**
 * Result from git sync operation
 */
export interface GitSyncResult {
  success: boolean;
  commitSha?: string;
  filePath?: string;
  error?: string;
}

/**
 * Project settings required for git sync
 */
export interface ProjectGitSettings {
  repoOwner: string;
  repoName: string;
  defaultBranch?: string;
}

/**
 * GitHub file content response
 */
export interface GitHubFileContent {
  content: string;
  sha: string;
  path: string;
  encoding: string;
}

/**
 * Options for git sync operation
 */
export interface GitSyncOptions {
  author?: {
    name: string;
    email: string;
  };
  branch?: string;
}
