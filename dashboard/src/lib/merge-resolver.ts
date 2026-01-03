/**
 * @fileType: utility
 * @status: current
 * @updated: 2026-01-03
 * @tags: [merge, conflict-resolution, diff, concurrency, epic-008]
 * @related: [edit-lock-manager.ts, components/graph/ConflictResolver.tsx, components/graph/NodeEditor.tsx]
 * @priority: high
 * @complexity: medium
 * @dependencies: []
 */

/**
 * Merge Resolver - Handles conflict detection and resolution when locks fail
 *
 * EPIC-008 Sprint 2: Team Collaboration - Conflict Prevention
 *
 * This module provides fallback conflict resolution when the edit locking system
 * fails (e.g., lock expiry, network issues, race conditions). It detects version
 * mismatches using content hashes and provides diff visualization for manual merging.
 *
 * Features:
 * - Content hash computation for version detection
 * - Line-by-line diff generation (no external dependencies)
 * - Support for multiple resolution strategies
 */

/**
 * Information about a detected conflict between local and remote versions
 */
export interface ConflictInfo {
  nodeId: string;
  nodeType: string;
  localVersion: {
    content: string;
    editedAt: string;
    editedBy: string;
    hash: string;
  };
  remoteVersion: {
    content: string;
    editedAt: string;
    editedBy: string;
    hash: string;
  };
}

/**
 * A single line in the diff output
 */
export interface DiffLine {
  type: 'unchanged' | 'added' | 'removed';
  content: string;
  lineNumber: {
    local?: number;
    remote?: number;
  };
}

/**
 * Result of a diff operation between two content strings
 */
export interface DiffResult {
  lines: DiffLine[];
  hasChanges: boolean;
  addedCount: number;
  removedCount: number;
}

/**
 * Strategy for resolving a conflict
 */
export type MergeStrategy = 'use-local' | 'use-remote' | 'manual-merge';

/**
 * Resolution result after user makes a choice
 */
export interface MergeResolution {
  strategy: MergeStrategy;
  resolvedContent?: string; // Required for manual-merge strategy
}

/**
 * Detect if there's a version conflict by comparing hashes
 *
 * @param localHash - Hash of the content being saved
 * @param remoteHash - Hash of the current content on the server
 * @param expectedHash - Hash of the content when editing began (baseline)
 * @returns true if there's a conflict (remote has changed since edit began)
 */
export function detectConflict(
  localHash: string,
  remoteHash: string,
  expectedHash: string
): boolean {
  // No conflict if:
  // 1. Local and remote are the same (no changes needed)
  // 2. Remote matches what we expected (no one else changed it)
  if (localHash === remoteHash) {
    return false;
  }

  if (remoteHash === expectedHash) {
    return false;
  }

  // Conflict: Remote has diverged from expected baseline
  return true;
}

/**
 * Compute a simple hash of content for version comparison
 *
 * Uses a fast non-cryptographic hash suitable for content comparison.
 * This is NOT for security purposes - just for detecting changes.
 *
 * @param content - The string content to hash
 * @returns A hex string hash of the content
 */
export function computeHash(content: string): string {
  // Simple djb2 hash - fast and good distribution for change detection
  let hash = 5381;
  for (let i = 0; i < content.length; i++) {
    hash = ((hash << 5) + hash) ^ content.charCodeAt(i);
  }
  // Convert to unsigned 32-bit integer and then to hex
  return (hash >>> 0).toString(16).padStart(8, '0');
}

/**
 * Generate a line-by-line diff between local and remote content
 *
 * Uses a simple longest common subsequence (LCS) algorithm to identify
 * added, removed, and unchanged lines.
 *
 * @param localContent - The user's current version
 * @param remoteContent - The version on the server
 * @returns DiffResult with categorized lines and change statistics
 */
export function generateDiff(localContent: string, remoteContent: string): DiffResult {
  const localLines = localContent.split('\n');
  const remoteLines = remoteContent.split('\n');

  // Build LCS matrix
  const lcs = buildLCSMatrix(localLines, remoteLines);

  // Backtrack to generate diff
  const lines = backtrackDiff(localLines, remoteLines, lcs);

  // Calculate statistics
  let addedCount = 0;
  let removedCount = 0;
  for (const line of lines) {
    if (line.type === 'added') addedCount++;
    if (line.type === 'removed') removedCount++;
  }

  return {
    lines,
    hasChanges: addedCount > 0 || removedCount > 0,
    addedCount,
    removedCount,
  };
}

/**
 * Build the LCS (Longest Common Subsequence) matrix
 *
 * @param local - Array of local lines
 * @param remote - Array of remote lines
 * @returns 2D matrix for LCS computation
 */
function buildLCSMatrix(local: string[], remote: string[]): number[][] {
  const m = local.length;
  const n = remote.length;

  // Initialize matrix with zeros
  const matrix: number[][] = Array(m + 1)
    .fill(null)
    .map(() => Array(n + 1).fill(0));

  // Fill in the matrix
  for (let i = 1; i <= m; i++) {
    for (let j = 1; j <= n; j++) {
      if (local[i - 1] === remote[j - 1]) {
        matrix[i][j] = matrix[i - 1][j - 1] + 1;
      } else {
        matrix[i][j] = Math.max(matrix[i - 1][j], matrix[i][j - 1]);
      }
    }
  }

  return matrix;
}

/**
 * Backtrack through the LCS matrix to generate diff lines
 *
 * @param local - Array of local lines
 * @param remote - Array of remote lines
 * @param lcs - LCS matrix from buildLCSMatrix
 * @returns Array of DiffLine objects
 */
function backtrackDiff(local: string[], remote: string[], lcs: number[][]): DiffLine[] {
  const result: DiffLine[] = [];
  let i = local.length;
  let j = remote.length;
  let localLineNum = local.length;
  let remoteLineNum = remote.length;

  // Collect diff lines in reverse order, then reverse at the end
  const reversedLines: DiffLine[] = [];

  while (i > 0 || j > 0) {
    if (i > 0 && j > 0 && local[i - 1] === remote[j - 1]) {
      // Lines are the same - unchanged
      reversedLines.push({
        type: 'unchanged',
        content: local[i - 1],
        lineNumber: { local: localLineNum, remote: remoteLineNum },
      });
      i--;
      j--;
      localLineNum--;
      remoteLineNum--;
    } else if (j > 0 && (i === 0 || lcs[i][j - 1] >= lcs[i - 1][j])) {
      // Line exists in remote but not local - added
      reversedLines.push({
        type: 'added',
        content: remote[j - 1],
        lineNumber: { remote: remoteLineNum },
      });
      j--;
      remoteLineNum--;
    } else if (i > 0) {
      // Line exists in local but not remote - removed
      reversedLines.push({
        type: 'removed',
        content: local[i - 1],
        lineNumber: { local: localLineNum },
      });
      i--;
      localLineNum--;
    }
  }

  // Reverse to get correct order
  return reversedLines.reverse();
}

/**
 * Create a merged version of content by combining local and remote
 *
 * This creates a simple merge that includes both versions with markers,
 * suitable for manual editing.
 *
 * @param localContent - The user's version
 * @param remoteContent - The server version
 * @param localAuthor - Who made local changes
 * @param remoteAuthor - Who made remote changes
 * @returns Combined content with conflict markers
 */
export function createMergedContent(
  localContent: string,
  remoteContent: string,
  localAuthor: string,
  remoteAuthor: string
): string {
  return `<<<<<<< YOUR CHANGES (${localAuthor})
${localContent}
=======
${remoteContent}
>>>>>>> THEIR CHANGES (${remoteAuthor})`;
}

/**
 * Apply a merge resolution to get final content
 *
 * @param resolution - The chosen resolution strategy and optional content
 * @param conflict - The conflict information
 * @returns The final content to save
 */
export function applyResolution(resolution: MergeResolution, conflict: ConflictInfo): string {
  switch (resolution.strategy) {
    case 'use-local':
      return conflict.localVersion.content;
    case 'use-remote':
      return conflict.remoteVersion.content;
    case 'manual-merge':
      if (!resolution.resolvedContent) {
        throw new Error('Manual merge resolution requires resolvedContent');
      }
      return resolution.resolvedContent;
    default:
      throw new Error(`Unknown resolution strategy: ${resolution.strategy}`);
  }
}

/**
 * Format a date for display in the conflict resolver
 *
 * @param dateString - ISO date string
 * @returns Human-readable relative time
 */
export function formatEditTime(dateString: string): string {
  const date = new Date(dateString);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMinutes = Math.floor(diffMs / 60000);

  if (diffMinutes < 1) {
    return 'just now';
  } else if (diffMinutes < 60) {
    return `${diffMinutes} minute${diffMinutes === 1 ? '' : 's'} ago`;
  } else if (diffMinutes < 1440) {
    const hours = Math.floor(diffMinutes / 60);
    return `${hours} hour${hours === 1 ? '' : 's'} ago`;
  } else {
    const days = Math.floor(diffMinutes / 1440);
    return `${days} day${days === 1 ? '' : 's'} ago`;
  }
}

/**
 * Check if content has conflict markers from a previous merge attempt
 *
 * @param content - Content to check
 * @returns true if content contains unresolved conflict markers
 */
export function hasConflictMarkers(content: string): boolean {
  return content.includes('<<<<<<<') && content.includes('=======') && content.includes('>>>>>>>');
}

/**
 * Validate that manually merged content doesn't still have conflict markers
 *
 * @param content - The resolved content
 * @returns Validation result with error message if invalid
 */
export function validateResolvedContent(content: string): { valid: boolean; error?: string } {
  if (hasConflictMarkers(content)) {
    return {
      valid: false,
      error: 'Content still contains unresolved conflict markers. Please remove them before saving.',
    };
  }

  if (content.trim().length === 0) {
    return {
      valid: false,
      error: 'Content cannot be empty.',
    };
  }

  return { valid: true };
}
