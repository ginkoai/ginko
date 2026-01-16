/**
 * @fileType: utility
 * @status: current
 * @updated: 2025-01-16
 * @tags: [github, git-sync, module, ADR-054]
 * @related: [client.ts, git-sync-service.ts, types.ts]
 * @priority: high
 * @complexity: low
 * @dependencies: []
 */

/**
 * GitHub Module (ADR-054 / e011_s02_t03)
 *
 * Exports for git sync functionality.
 */

export { GitHubClient } from './client';
export {
  syncToGit,
  syncNodeToGit,
  getFilePath,
  formatNodeAsMarkdown,
  buildCommitMessage,
  isSyncableType,
} from './git-sync-service';
export type {
  SyncableNode,
  SyncableNodeType,
  GitSyncResult,
  GitSyncOptions,
  ProjectGitSettings,
  GitHubFileContent,
  GitHubFileResult,
} from './types';
