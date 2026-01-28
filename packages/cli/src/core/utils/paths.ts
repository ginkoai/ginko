/**
 * @fileType: utility
 * @status: current
 * @updated: 2025-10-04
 * @tags: [paths, utilities, ginko]
 * @related: [../../utils/ginko-root.ts]
 * @priority: high
 * @complexity: low
 * @dependencies: [path, child_process]
 */

import path from 'path';
import { execSync } from 'child_process';

export interface PathConfig {
  project: {
    root: string;
    worktrees: string;
    packages: string;
  };
  ginko: {
    root: string;
    context: string;
    sessions: string;
    backlog: string;
  };
  docs: {
    root: string;
    adr: string;
    prd: string;
    sprints: string;
  };
}

/**
 * Check if current directory is in a git repository
 */
export function isInGitRepo(): boolean {
  try {
    execSync('git rev-parse --is-inside-work-tree', {
      encoding: 'utf8',
      cwd: process.cwd(),
      stdio: ['pipe', 'pipe', 'ignore']
    });
    return true;
  } catch {
    return false;
  }
}

/**
 * Get project root by finding git repository root
 */
function getProjectRoot(): string {
  try {
    const gitRoot = execSync('git rev-parse --show-toplevel', {
      encoding: 'utf8',
      cwd: process.cwd(),
      stdio: ['pipe', 'pipe', 'ignore']  // Suppress stderr for non-git directories
    }).trim();
    return path.resolve(gitRoot);
  } catch (error) {
    // Not in a git repo, use current directory
    return process.cwd();
  }
}

/**
 * Get path configuration
 */
export function getConfig(): PathConfig {
  const projectRoot = getProjectRoot();
  const projectName = path.basename(projectRoot);

  return {
    project: {
      root: projectRoot,
      worktrees: path.join(path.dirname(projectRoot), `${projectName}-worktrees`),
      packages: path.join(projectRoot, 'packages')
    },
    ginko: {
      root: path.join(projectRoot, '.ginko'),
      context: path.join(projectRoot, '.ginko', 'context'),
      sessions: path.join(projectRoot, '.ginko', 'sessions'),
      backlog: path.join(projectRoot, '.ginko', 'backlog')
    },
    docs: {
      root: path.join(projectRoot, 'docs'),
      adr: path.join(projectRoot, 'docs', 'adr'),
      prd: path.join(projectRoot, 'docs', 'PRD'),
      sprints: path.join(projectRoot, 'docs', 'sprints')
    }
  };
}

/**
 * Join paths with platform-appropriate separators
 */
export function joinPaths(...segments: string[]): string {
  return path.join(...segments);
}

/**
 * Get relative path from project root
 */
export function getRelativePath(absolutePath: string): string {
  const projectRoot = getProjectRoot();
  return path.relative(projectRoot, absolutePath);
}

/**
 * Path manager singleton
 */
export const pathManager = {
  getConfig,
  joinPaths,
  getRelativePath
};
