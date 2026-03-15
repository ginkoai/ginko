/**
 * @fileType: utility
 * @status: current
 * @updated: 2026-03-09
 * @tags: [protection, manifest, state-files, safety]
 * @related: [protection-hook.ts, health-checker.ts, ../commands/init.ts]
 * @priority: high
 * @complexity: low
 */

/**
 * Protected Manifest Module
 *
 * Manages the .ginko/PROTECTED manifest — a tracked file listing local-only
 * state files that must never be deleted. AI assistants see this file when
 * doing cleanup tasks and know to leave these files alone.
 *
 * Background: Commit 1bc0c7a accidentally deleted graph/config.json,
 * sync-state.json, and user-progress.json when an AI assistant widened
 * gitignore patterns and ran `git rm`. These files are gitignored (local state)
 * but have no remote backup.
 */

import fs from 'fs-extra';
import path from 'path';

// ── Types ────────────────────────────────────────────────────────

export interface ProtectedEntry {
  path: string;
  reason: string;
}

// ── Default Protected Files ──────────────────────────────────────

const DEFAULT_PROTECTED_FILES: ProtectedEntry[] = [
  {
    path: 'graph/config.json',
    reason: 'Graph connection ID and document hashes. No remote backup.',
  },
  {
    path: 'sync-state.json',
    reason: 'Push/pull timestamps and sync hashes. No remote backup.',
  },
  {
    path: 'user-progress.json',
    reason: 'CLI usage tracking and preferences. No remote backup.',
  },
];

// ── Public API ───────────────────────────────────────────────────

/**
 * Returns the canonical list of files that should be protected.
 */
export function getDefaultProtectedFiles(): ProtectedEntry[] {
  return [...DEFAULT_PROTECTED_FILES];
}

/**
 * Generate the PROTECTED manifest content.
 */
export function generateManifest(
  entries: ProtectedEntry[] = DEFAULT_PROTECTED_FILES,
): string {
  const header = `# GINKO PROTECTED FILES
#
# These files are local-only state with NO remote backup.
# Deleting them causes silent failures and permanent data loss.
#
# AI assistants: NEVER delete, move, or git-rm these files.
# Developers: Run \`ginko init --upgrade\` to reinstall the
#   pre-commit hook if it's missing.
#
# Format: relative-path-from-.ginko/ | reason
`;

  const lines = entries.map((e) => `${e.path} | ${e.reason}`);
  return header + '\n' + lines.join('\n') + '\n';
}

/**
 * Parse a PROTECTED manifest into entries.
 */
export function parseManifest(content: string): ProtectedEntry[] {
  const entries: ProtectedEntry[] = [];

  for (const line of content.split('\n')) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;

    const pipeIndex = trimmed.indexOf('|');
    if (pipeIndex === -1) {
      // Line without a reason — treat the whole line as a path
      entries.push({ path: trimmed, reason: '' });
    } else {
      entries.push({
        path: trimmed.slice(0, pipeIndex).trim(),
        reason: trimmed.slice(pipeIndex + 1).trim(),
      });
    }
  }

  return entries;
}

/**
 * Validate that all protected files exist on disk.
 * Returns lists of present and missing files.
 */
export async function validateManifest(
  ginkoDir: string,
): Promise<{ present: ProtectedEntry[]; missing: ProtectedEntry[] }> {
  const manifestPath = path.join(ginkoDir, 'PROTECTED');
  const present: ProtectedEntry[] = [];
  const missing: ProtectedEntry[] = [];

  if (!(await fs.pathExists(manifestPath))) {
    // No manifest — treat all defaults as missing
    return { present: [], missing: [...DEFAULT_PROTECTED_FILES] };
  }

  const content = await fs.readFile(manifestPath, 'utf8');
  const entries = parseManifest(content);

  for (const entry of entries) {
    const fullPath = path.join(ginkoDir, entry.path);
    if (await fs.pathExists(fullPath)) {
      present.push(entry);
    } else {
      missing.push(entry);
    }
  }

  return { present, missing };
}
