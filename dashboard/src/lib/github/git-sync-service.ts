/**
 * @fileType: utility
 * @status: current
 * @updated: 2025-01-16
 * @tags: [github, git-sync, service, ADR-054]
 * @related: [client.ts, types.ts, node-syncer.ts]
 * @priority: high
 * @complexity: medium
 * @dependencies: []
 */

/**
 * Git Sync Service (ADR-054 / e011_s02_t03)
 *
 * Syncs dashboard node edits to git-native markdown files via GitHub API.
 * Patterns adapted from packages/cli/src/commands/sync/node-syncer.ts
 */

import { GitHubClient } from './client';
import type {
  SyncableNode,
  SyncableNodeType,
  GitSyncResult,
  GitSyncOptions,
} from './types';

/**
 * Get file path for a node based on its type and ID
 * Mirrors packages/cli/src/commands/sync/node-syncer.ts:getFilePath
 */
export function getFilePath(node: SyncableNode): string {
  const type = node.type;
  const slug = node.slug || slugify(node.title);

  switch (type) {
    case 'ADR':
      return `docs/adr/${node.id}-${slug}.md`;
    case 'PRD':
      return `docs/prd/${node.id}-${slug}.md`;
    case 'Pattern':
      return `docs/patterns/PATTERN-${slug}.md`;
    case 'Gotcha':
      return `docs/gotchas/GOTCHA-${slug}.md`;
    case 'Charter':
      return 'docs/PROJECT-CHARTER.md';
    default:
      throw new Error(`Unknown node type: ${type}`);
  }
}

/**
 * Convert title to URL-friendly slug
 */
function slugify(text: string | undefined | null): string {
  if (!text) {
    return 'untitled';
  }
  return text
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .substring(0, 50) || 'untitled';
}

/**
 * Generate YAML frontmatter for node
 * Mirrors packages/cli/src/commands/sync/node-syncer.ts:generateFrontmatter
 */
function generateFrontmatter(node: SyncableNode): string {
  const lines: string[] = [];

  lines.push(`type: ${node.type.toLowerCase()}`);
  lines.push(`status: ${node.status || 'draft'}`);
  lines.push(`updated: ${new Date().toISOString().split('T')[0]}`);

  if (node.tags && node.tags.length > 0) {
    lines.push(`tags: [${node.tags.join(', ')}]`);
  }

  lines.push(`synced-from: dashboard`);
  lines.push(`synced-at: ${new Date().toISOString()}`);

  return lines.join('\n') + '\n';
}

/**
 * Format node content as markdown file
 * Mirrors packages/cli/src/commands/sync/node-syncer.ts:formatNodeAsMarkdown
 */
export function formatNodeAsMarkdown(node: SyncableNode): string {
  const frontmatter = generateFrontmatter(node);
  const body = node.content || '';

  return `---\n${frontmatter}---\n\n# ${node.title}\n\n${body}`;
}

/**
 * Build commit message for node update
 */
export function buildCommitMessage(
  node: SyncableNode,
  author?: { name: string; email: string }
): string {
  const typeLabel = node.type.toLowerCase();
  const title = node.title || node.id;

  let message = `docs(${typeLabel}): Update ${node.id} - ${title}\n\nUpdated via Ginko Dashboard.`;

  if (author) {
    message += `\n\nCo-Authored-By: ${author.name} <${author.email}>`;
  }

  return message;
}

/**
 * Check if a node type is syncable
 */
export function isSyncableType(type: string): type is SyncableNodeType {
  return ['ADR', 'PRD', 'Pattern', 'Gotcha', 'Charter'].includes(type);
}

/**
 * Sync a node to git via GitHub API
 */
export async function syncNodeToGit(
  client: GitHubClient,
  node: SyncableNode,
  options: GitSyncOptions = {}
): Promise<GitSyncResult> {
  try {
    // Get file path for this node type
    const filePath = getFilePath(node);

    // Format node as markdown
    const content = formatNodeAsMarkdown(node);

    // Check if file exists to get SHA (required for updates)
    const existingFile = await client.getFile(filePath, options.branch);

    // Build commit message
    const commitMessage = buildCommitMessage(node, options.author);

    // Create or update file
    const result = await client.createOrUpdateFile(
      filePath,
      content,
      commitMessage,
      existingFile?.sha,
      options.branch
    );

    return {
      success: true,
      commitSha: result.sha,
      filePath: result.path,
    };
  } catch (error) {
    console.error('[Git Sync] Error syncing node:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

/**
 * Main sync function that handles project lookup and sync
 */
export async function syncToGit(
  node: SyncableNode,
  repoUrl: string,
  token: string,
  options: GitSyncOptions = {}
): Promise<GitSyncResult> {
  // Validate node type is syncable
  if (!isSyncableType(node.type)) {
    return {
      success: false,
      error: `Node type '${node.type}' is not syncable`,
    };
  }

  // Validate required fields
  if (!node.id || !node.title) {
    return {
      success: false,
      error: 'Node must have id and title',
    };
  }

  // Create GitHub client
  const client = new GitHubClient(repoUrl, token);

  // Sync the node
  return syncNodeToGit(client, node, options);
}
