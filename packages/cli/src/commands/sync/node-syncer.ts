/**
 * @fileType: utility
 * @status: current
 * @updated: 2025-12-15
 * @tags: [sync, node-syncer, cloud-to-local, ADR-054]
 * @related: [sync-command.ts, types.ts]
 * @priority: high
 * @complexity: medium
 * @dependencies: [crypto, fs, path]
 */

/**
 * Node Syncer (ADR-054)
 *
 * Handles syncing individual nodes from cloud graph to local git files.
 */

import * as fs from 'fs/promises';
import * as path from 'path';
import * as crypto from 'crypto';
import type { UnsyncedNode, NodeType, SyncConflict, ConflictResolution } from './types.js';

/**
 * Compute SHA-256 hash of content
 */
export function computeHash(content: string): string {
  return crypto.createHash('sha256').update(content).digest('hex');
}

/**
 * Get file path for a node based on its type and ID
 */
export function getFilePath(projectRoot: string, node: UnsyncedNode): string {
  const type = node.type;
  const slug = node.slug || slugify(node.title);

  switch (type) {
    case 'ADR':
      return path.join(projectRoot, 'docs', 'adr', `${node.id}-${slug}.md`);
    case 'PRD':
      return path.join(projectRoot, 'docs', 'prd', `${node.id}-${slug}.md`);
    case 'Pattern':
      return path.join(projectRoot, 'docs', 'patterns', `PATTERN-${slug}.md`);
    case 'Gotcha':
      return path.join(projectRoot, 'docs', 'gotchas', `GOTCHA-${slug}.md`);
    case 'Charter':
      return path.join(projectRoot, 'docs', 'PROJECT-CHARTER.md');
    default:
      throw new Error(`Unknown node type: ${type}`);
  }
}

/**
 * Convert title to URL-friendly slug
 */
function slugify(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .substring(0, 50);
}

/**
 * Check if a file exists
 */
export async function fileExists(filePath: string): Promise<boolean> {
  try {
    await fs.access(filePath);
    return true;
  } catch {
    return false;
  }
}

/**
 * Read file content, return null if doesn't exist
 */
export async function readFileContent(filePath: string): Promise<string | null> {
  try {
    return await fs.readFile(filePath, 'utf-8');
  } catch {
    return null;
  }
}

/**
 * Write content to file, creating directories as needed
 */
export async function writeFileContent(filePath: string, content: string): Promise<void> {
  const dir = path.dirname(filePath);
  await fs.mkdir(dir, { recursive: true });
  await fs.writeFile(filePath, content, 'utf-8');
}

/**
 * Format node content as markdown file
 */
export function formatNodeAsMarkdown(node: UnsyncedNode): string {
  const frontmatter = generateFrontmatter(node);
  const body = node.content || '';

  return `---\n${frontmatter}---\n\n# ${node.title}\n\n${body}`;
}

/**
 * Generate YAML frontmatter for node
 */
function generateFrontmatter(node: UnsyncedNode): string {
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
 * Detect if there's a conflict between graph and local versions
 */
export async function detectConflict(
  node: UnsyncedNode,
  projectRoot: string
): Promise<SyncConflict | null> {
  const filePath = getFilePath(projectRoot, node);
  const localContent = await readFileContent(filePath);

  if (!localContent) {
    // File doesn't exist locally - no conflict
    return null;
  }

  const localHash = computeHash(localContent);

  // If local hash matches what we last synced, no conflict
  if (node.gitHash && localHash === node.gitHash) {
    return null;
  }

  // If local hash matches current graph content, no conflict
  if (localHash === node.contentHash) {
    return null;
  }

  // Conflict: local file changed since last sync
  return {
    node,
    localContent,
    localHash,
  };
}

/**
 * Apply a sync resolution
 */
export async function applyResolution(
  conflict: SyncConflict,
  resolution: ConflictResolution,
  projectRoot: string
): Promise<{ applied: boolean; content: string }> {
  const filePath = getFilePath(projectRoot, conflict.node);

  switch (resolution) {
    case 'use-graph':
      // Overwrite local with graph version
      const graphContent = formatNodeAsMarkdown(conflict.node);
      await writeFileContent(filePath, graphContent);
      return { applied: true, content: graphContent };

    case 'use-local':
      // Keep local, just mark as synced (content returned for API update)
      return { applied: true, content: conflict.localContent };

    case 'skip':
      // Don't do anything
      return { applied: false, content: '' };

    case 'merge':
      // Future: implement 3-way merge
      // For now, treat as skip
      console.warn('Merge not yet implemented, skipping');
      return { applied: false, content: '' };

    default:
      return { applied: false, content: '' };
  }
}

/**
 * Sync a single node from graph to local
 */
export async function syncNode(
  node: UnsyncedNode,
  projectRoot: string,
  options: { force?: boolean } = {}
): Promise<{ success: boolean; filePath: string; hash: string; conflict?: SyncConflict }> {
  const filePath = getFilePath(projectRoot, node);

  // Check for conflicts (unless force mode)
  if (!options.force) {
    const conflict = await detectConflict(node, projectRoot);
    if (conflict) {
      return {
        success: false,
        filePath,
        hash: '',
        conflict,
      };
    }
  }

  // Write graph content to local file
  const content = formatNodeAsMarkdown(node);
  await writeFileContent(filePath, content);
  const hash = computeHash(content);

  return {
    success: true,
    filePath,
    hash,
  };
}
