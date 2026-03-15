/**
 * @fileType: utility
 * @status: current
 * @updated: 2026-03-09
 * @tags: [protection, git-hook, pre-commit, safety]
 * @related: [protected-manifest.ts, health-checker.ts, ../commands/init.ts]
 * @priority: high
 * @complexity: medium
 */

/**
 * Protection Hook Module
 *
 * Generates and installs a git pre-commit hook that blocks commits
 * deleting files listed in .ginko/PROTECTED. The hook is pure bash
 * with no dependencies — it reads the manifest directly.
 *
 * Composition strategy: if a pre-commit hook already exists, the
 * existing hook is renamed to pre-commit.user and a wrapper hook
 * calls it first, then runs the protection check.
 */

import fs from 'fs-extra';
import path from 'path';

// ── Constants ────────────────────────────────────────────────────

const HOOK_MARKER = '# GINKO-PROTECTION-HOOK';

// ── Hook Generation ──────────────────────────────────────────────

/**
 * Generate the protection-only pre-commit hook script (Unix bash).
 * Git for Windows uses MSYS2 bash, so this works cross-platform.
 */
export function generateProtectionCheck(): string {
  return `${HOOK_MARKER}
# Blocks commits that delete protected ginko state files.
# These files are local-only with no remote backup.
# Installed by: ginko init

PROTECTED_FILE=".ginko/PROTECTED"

if [ ! -f "$PROTECTED_FILE" ]; then
  exit 0
fi

DELETED_FILES=$(git diff --cached --diff-filter=D --name-only 2>/dev/null)
if [ -z "$DELETED_FILES" ]; then
  exit 0
fi

BLOCKED=0
while IFS='|' read -r filepath reason || [ -n "$filepath" ]; do
  filepath=$(echo "$filepath" | sed 's/^[[:space:]]*//;s/[[:space:]]*$//')

  # Skip comments and blank lines
  case "$filepath" in
    '#'*|'') continue ;;
  esac

  full_path=".ginko/$filepath"
  if echo "$DELETED_FILES" | grep -qF "$full_path"; then
    echo "BLOCKED: Cannot delete protected file: $full_path"
    reason=$(echo "$reason" | sed 's/^[[:space:]]*//;s/[[:space:]]*$//')
    [ -n "$reason" ] && echo "  Reason: $reason"
    BLOCKED=1
  fi
done < "$PROTECTED_FILE"

if [ $BLOCKED -eq 1 ]; then
  echo ""
  echo "These files are local-only state with no remote backup."
  echo "Deleting them causes permanent data loss."
  echo "See .ginko/PROTECTED for details."
  echo ""
  echo "If you really need to remove these files, use: git commit --no-verify"
  exit 1
fi`;
}

/**
 * Generate a standalone pre-commit hook (with shebang).
 */
export function generatePreCommitHook(): string {
  return `#!/bin/bash
${generateProtectionCheck()}
`;
}

/**
 * Generate a wrapper hook that calls an existing hook first,
 * then runs the protection check.
 */
function generateWrapperHook(): string {
  return `#!/bin/bash
# Ginko wrapper pre-commit hook.
# Runs the original pre-commit hook first, then the protection check.

HOOK_DIR="$(cd "$(dirname "$0")" && pwd)"

# Run the original pre-commit hook if it exists
if [ -x "$HOOK_DIR/pre-commit.user" ]; then
  "$HOOK_DIR/pre-commit.user"
  RESULT=$?
  if [ $RESULT -ne 0 ]; then
    exit $RESULT
  fi
fi

${generateProtectionCheck()}
`;
}

// ── Installation ─────────────────────────────────────────────────

/**
 * Install the pre-commit protection hook into the project's .git/hooks/.
 *
 * - If no hook exists: creates it directly.
 * - If hook exists with our marker: skips (idempotent).
 * - If hook exists without our marker: renames to pre-commit.user,
 *   creates wrapper that calls both.
 */
export async function installPreCommitHook(projectRoot: string): Promise<{
  installed: boolean;
  message: string;
}> {
  const gitDir = path.join(projectRoot, '.git');
  if (!(await fs.pathExists(gitDir))) {
    return { installed: false, message: 'Not a git repository' };
  }

  const hooksDir = path.join(gitDir, 'hooks');
  await fs.ensureDir(hooksDir);

  const hookPath = path.join(hooksDir, 'pre-commit');
  const userHookPath = path.join(hooksDir, 'pre-commit.user');

  // Check if hook already exists
  if (await fs.pathExists(hookPath)) {
    const existing = await fs.readFile(hookPath, 'utf8');

    // Already installed — skip
    if (existing.includes(HOOK_MARKER)) {
      return { installed: true, message: 'Protection hook already installed' };
    }

    // Existing hook from another tool — compose
    await fs.rename(hookPath, userHookPath);
    await fs.writeFile(hookPath, generateWrapperHook(), { mode: 0o755 });
    return {
      installed: true,
      message: 'Protection hook installed (existing hook preserved as pre-commit.user)',
    };
  }

  // No existing hook — create directly
  await fs.writeFile(hookPath, generatePreCommitHook(), { mode: 0o755 });
  return { installed: true, message: 'Protection hook installed' };
}

/**
 * Check whether the protection hook is installed.
 */
export async function isHookInstalled(projectRoot: string): Promise<boolean> {
  const hookPath = path.join(projectRoot, '.git', 'hooks', 'pre-commit');
  if (!(await fs.pathExists(hookPath))) {
    return false;
  }
  const content = await fs.readFile(hookPath, 'utf8');
  return content.includes(HOOK_MARKER);
}
