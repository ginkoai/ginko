/**
 * @fileType: utility
 * @status: current
 * @updated: 2025-08-28
 * @tags: [ginko, root, directory, git-style]
 * @related: [init.ts, capture.ts, status.ts]
 * @priority: critical
 * @complexity: low
 * @dependencies: [fs-extra, path]
 */

import fs from 'fs-extra';
import path from 'path';
import { execSync } from 'child_process';

/**
 * Get git repository root using git command
 *
 * @param startDir - Directory to start searching from (defaults to cwd)
 * @returns Path to git root directory, or null if not in a git repo
 */
function getGitRoot(startDir?: string): string | null {
  try {
    const gitRoot = execSync('git rev-parse --show-toplevel', {
      encoding: 'utf8',
      cwd: startDir || process.cwd(),
      stdio: ['pipe', 'pipe', 'ignore'] // Suppress stderr
    }).trim();
    return path.resolve(gitRoot);
  } catch (error) {
    return null;
  }
}

/**
 * Check if a .ginko directory is a project root (not just global auth)
 * Project .ginko must contain at least one of: config.yml, ginko.json, or sessions/<user>/
 *
 * CRITICAL: ~/.ginko/ (home directory) is NEVER a project root, only global auth storage
 *
 * @param ginkoPath - Path to .ginko directory
 * @returns true if this is a project .ginko, false if it's global auth or home directory
 */
async function isProjectGinko(ginkoPath: string): Promise<boolean> {
  try {
    // NEVER treat home directory .ginko as project root (global auth only)
    const homeDir = process.env.HOME || process.env.USERPROFILE || '';
    const homeGinkoPath = path.join(homeDir, '.ginko');
    if (path.resolve(ginkoPath) === path.resolve(homeGinkoPath)) {
      return false; // This is global auth directory, not a project
    }

    // Check for project markers
    const configYml = path.join(ginkoPath, 'config.yml');
    const ginkoJson = path.join(ginkoPath, '../ginko.json'); // Team config at root
    const sessionsDir = path.join(ginkoPath, 'sessions');

    // If config files exist, it's a project
    if (await fs.pathExists(configYml) || await fs.pathExists(ginkoJson)) {
      return true;
    }

    // If sessions directory exists with user directories, it's a project
    if (await fs.pathExists(sessionsDir)) {
      const entries = await fs.readdir(sessionsDir);
      // Filter out just 'auth.json' - if there are user session dirs, it's a project
      const nonAuthEntries = entries.filter(e => e !== 'auth.json');
      if (nonAuthEntries.length > 0) {
        return true;
      }
    }

    // Only contains auth.json → global auth directory, not a project
    return false;
  } catch (error) {
    return false;
  }
}

/**
 * Find the ginko root directory
 * Prefers git repository root for monorepo compatibility,
 * falls back to walking up directory tree
 *
 * IMPORTANT: Distinguishes between:
 * - Global auth: ~/.ginko/ (contains only auth.json)
 * - Project root: <project>/.ginko/ (contains config, sessions, etc.)
 *
 * @param startDir - Directory to start searching from (defaults to cwd)
 * @returns Path to ginko root directory, or null if not found
 */
export async function findGinkoRoot(startDir?: string): Promise<string | null> {
  const start = startDir || process.cwd();

  // First, try to use git repository root (preferred for monorepos)
  const gitRoot = getGitRoot(start);
  if (gitRoot) {
    const gitGinkoPath = path.join(gitRoot, '.ginko');
    if (await fs.pathExists(gitGinkoPath)) {
      const stats = await fs.stat(gitGinkoPath);
      if (stats.isDirectory() && await isProjectGinko(gitGinkoPath)) {
        return gitRoot;
      }
    }
  }

  // Fall back to walking up directory tree, but stop at git boundary
  let currentDir = start;
  const root = path.parse(currentDir).root;
  const homeDir = process.env.HOME || process.env.USERPROFILE || '';

  while (currentDir !== root) {
    const ginkoPath = path.join(currentDir, '.ginko');

    if (await fs.pathExists(ginkoPath)) {
      const stats = await fs.stat(ginkoPath);
      if (stats.isDirectory() && await isProjectGinko(ginkoPath)) {
        return currentDir;
      }
    }

    // Stop at git repository boundary (don't search outside git repo)
    const gitRootHere = getGitRoot(currentDir);
    if (gitRootHere && gitRootHere !== currentDir) {
      // We're inside a git repo but not at its root, keep going up to git root
    } else if (gitRootHere === currentDir) {
      // We're at git root and no .ginko found
      break;
    }

    // Don't search above home directory (stops at ~/.ginko global auth)
    if (homeDir && currentDir === homeDir) {
      break;
    }

    // Move up one directory
    const parentDir = path.dirname(currentDir);
    if (parentDir === currentDir) {
      // We've reached the root
      break;
    }
    currentDir = parentDir;
  }

  return null;
}

/**
 * Get the ginko root directory or throw an error if not found
 * 
 * @param startDir - Directory to start searching from
 * @returns Path to ginko root directory
 * @throws Error if ginko is not initialized
 */
export async function requireGinkoRoot(startDir?: string): Promise<string> {
  const root = await findGinkoRoot(startDir);
  
  if (!root) {
    throw new Error('Ginko not initialized. Run `ginko init` first.');
  }
  
  return root;
}

/**
 * Check if we're in a ginko-initialized project
 * 
 * @param startDir - Directory to start searching from
 * @returns true if in a ginko project, false otherwise
 */
export async function isGinkoProject(startDir?: string): Promise<boolean> {
  const root = await findGinkoRoot(startDir);
  return root !== null;
}

/**
 * Get the path to a file within the .ginko directory
 * 
 * @param relativePath - Path relative to .ginko directory
 * @param startDir - Directory to start searching from
 * @returns Full path to the file
 * @throws Error if ginko is not initialized
 */
export async function getGinkoPath(relativePath: string, startDir?: string): Promise<string> {
  const root = await requireGinkoRoot(startDir);
  return path.join(root, '.ginko', relativePath);
}

/**
 * Get the path to the user's session directory
 * 
 * @param userEmail - User email (will be slugified)
 * @param startDir - Directory to start searching from
 * @returns Full path to user session directory
 */
export async function getUserSessionPath(userEmail: string, startDir?: string): Promise<string> {
  const userSlug = userEmail.replace('@', '-at-').replace(/\./g, '-');
  return getGinkoPath(path.join('sessions', userSlug), startDir);
}