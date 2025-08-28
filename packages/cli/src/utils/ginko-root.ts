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

/**
 * Find the ginko root directory by walking up the directory tree
 * Similar to how git finds the .git directory
 * 
 * @param startDir - Directory to start searching from (defaults to cwd)
 * @returns Path to ginko root directory, or null if not found
 */
export async function findGinkoRoot(startDir?: string): Promise<string | null> {
  let currentDir = startDir || process.cwd();
  const root = path.parse(currentDir).root;

  while (currentDir !== root) {
    const ginkoPath = path.join(currentDir, '.ginko');
    
    if (await fs.pathExists(ginkoPath)) {
      const stats = await fs.stat(ginkoPath);
      if (stats.isDirectory()) {
        return currentDir;
      }
    }

    // Move up one directory
    const parentDir = path.dirname(currentDir);
    if (parentDir === currentDir) {
      // We've reached the root
      break;
    }
    currentDir = parentDir;
  }

  // Check the root directory itself
  const rootGinkoPath = path.join(root, '.ginko');
  if (await fs.pathExists(rootGinkoPath)) {
    const stats = await fs.stat(rootGinkoPath);
    if (stats.isDirectory()) {
      return root;
    }
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