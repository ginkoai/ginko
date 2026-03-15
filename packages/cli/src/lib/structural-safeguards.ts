/**
 * @fileType: utility
 * @status: current
 * @updated: 2026-03-09
 * @tags: [protection, safeguards, startup, lightweight]
 * @related: [protected-manifest.ts, protection-hook.ts, ../commands/start/start-reflection.ts]
 * @priority: high
 * @complexity: low
 */

/**
 * Structural Safeguards — lightweight check for missing infrastructure.
 *
 * Runs on `ginko start` to detect and auto-install safeguards added in
 * newer CLI versions. Unlike `ginko init --upgrade` (which regenerates
 * CLAUDE.md, skills, and commands), this only touches structural pieces
 * that are safe to create idempotently.
 */

import fs from 'fs-extra';
import path from 'path';
import chalk from 'chalk';
import { findGinkoRoot } from '../utils/ginko-root.js';

interface SafeguardResult {
  installed: string[];
  warnings: string[];
}

/**
 * Check for and auto-install missing structural safeguards.
 * Designed to be fast and safe to run on every `ginko start`.
 * Returns messages to display (empty if everything is in place).
 */
export async function ensureStructuralSafeguards(): Promise<SafeguardResult> {
  const installed: string[] = [];
  const warnings: string[] = [];

  try {
    const projectRoot = await findGinkoRoot();
    if (!projectRoot) return { installed, warnings };

    const ginkoDir = path.join(projectRoot, '.ginko');

    if (!(await fs.pathExists(ginkoDir))) return { installed, warnings };

    // 1. Check PROTECTED manifest
    const protectedPath = path.join(ginkoDir, 'PROTECTED');
    if (!(await fs.pathExists(protectedPath))) {
      try {
        const { generateManifest } = await import('./protected-manifest.js');
        await fs.writeFile(protectedPath, generateManifest());
        installed.push('.ginko/PROTECTED manifest');
      } catch {
        warnings.push('Could not create .ginko/PROTECTED manifest');
      }
    }

    // 2. Check pre-commit protection hook
    try {
      const { isHookInstalled, installPreCommitHook } = await import('./protection-hook.js');
      if (!(await isHookInstalled(projectRoot))) {
        const result = await installPreCommitHook(projectRoot);
        if (result.installed) {
          installed.push('pre-commit protection hook');
        } else {
          warnings.push(result.message);
        }
      }
    } catch {
      // Not a git repo or hook install failed — skip silently
    }

  } catch {
    // Non-critical — don't break start
  }

  return { installed, warnings };
}

/**
 * Format safeguard results for display.
 * Returns null if nothing to show.
 */
export function formatSafeguardMessage(result: SafeguardResult): string | null {
  if (result.installed.length === 0 && result.warnings.length === 0) {
    return null;
  }

  const lines: string[] = [];

  if (result.installed.length > 0) {
    lines.push(
      chalk.green('  Safeguards installed: ') +
      chalk.dim(result.installed.join(', '))
    );
  }

  if (result.warnings.length > 0) {
    for (const w of result.warnings) {
      lines.push(chalk.yellow(`  Safeguard warning: ${w}`));
    }
  }

  return lines.join('\n');
}
