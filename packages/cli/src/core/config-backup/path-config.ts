/**
 * @fileType: config
 * @status: current
 * @updated: 2025-09-20
 * @tags: [paths, configuration, cross-platform, adapters]
 * @related: [platform-adapter.ts, config-loader.ts]
 * @priority: critical
 * @complexity: medium
 * @dependencies: [path, fs-extra]
 */

import path from 'path';
import fs from 'fs-extra';
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
  build: {
    dist: string;
    temp: string;
    logs: string;
  };
}

export class PathManager {
  private config: PathConfig;
  private projectRoot: string;

  constructor() {
    this.projectRoot = this.detectProjectRoot();
    this.config = this.loadDefaultConfig();
  }

  /**
   * Detect project root by finding git repository root
   */
  private detectProjectRoot(): string {
    try {
      const gitRoot = execSync('git rev-parse --show-toplevel', {
        encoding: 'utf8',
        cwd: process.cwd()
      }).trim();

      // Normalize path separators for current platform
      return path.resolve(gitRoot);
    } catch (error) {
      // Fallback to current working directory
      return process.cwd();
    }
  }

  /**
   * Load default path configuration relative to project root
   */
  private loadDefaultConfig(): PathConfig {
    return {
      project: {
        root: this.projectRoot,
        worktrees: path.join(path.dirname(this.projectRoot), `${path.basename(this.projectRoot)}-worktrees`),
        packages: path.join(this.projectRoot, 'packages')
      },
      ginko: {
        root: path.join(this.projectRoot, '.ginko'),
        context: path.join(this.projectRoot, '.ginko', 'context'),
        sessions: path.join(this.projectRoot, '.ginko', 'sessions'),
        backlog: path.join(this.projectRoot, '.ginko', 'backlog')
      },
      docs: {
        root: path.join(this.projectRoot, 'docs'),
        adr: path.join(this.projectRoot, 'docs', 'adr'),
        prd: path.join(this.projectRoot, 'docs', 'PRD'),
        sprints: path.join(this.projectRoot, 'docs', 'sprints')
      },
      build: {
        dist: path.join(this.projectRoot, 'dist'),
        temp: path.join(this.projectRoot, '.temp'),
        logs: path.join(this.projectRoot, '.logs')
      }
    };
  }

  /**
   * Get project root path
   */
  getProjectRoot(): string {
    return this.projectRoot;
  }

  /**
   * Get worktree paths dynamically
   */
  async getWorktreePaths(): Promise<Record<string, string>> {
    try {
      const worktreeList = execSync('git worktree list --porcelain', {
        encoding: 'utf8',
        cwd: this.projectRoot
      });

      const worktrees: Record<string, string> = {};
      const lines = worktreeList.split('\n');

      let currentPath = '';
      let currentBranch = '';

      for (const line of lines) {
        if (line.startsWith('worktree ')) {
          currentPath = line.replace('worktree ', '');
        } else if (line.startsWith('branch ')) {
          currentBranch = line.replace('branch refs/heads/', '');
          if (currentBranch.startsWith('feature/')) {
            const name = currentBranch.replace('feature/', '');
            worktrees[name] = path.resolve(currentPath);
          }
        }
      }

      return worktrees;
    } catch (error) {
      return {};
    }
  }

  /**
   * Get path for specific worktree
   */
  async getWorktreePath(name: string): Promise<string | null> {
    const worktrees = await this.getWorktreePaths();
    return worktrees[name] || null;
  }

  /**
   * Get configuration with variable substitution
   */
  getConfig(): PathConfig {
    return this.config;
  }

  /**
   * Resolve path with platform-specific separators
   */
  resolvePath(...segments: string[]): string {
    return path.resolve(this.projectRoot, ...segments);
  }

  /**
   * Get relative path from project root
   */
  getRelativePath(absolutePath: string): string {
    return path.relative(this.projectRoot, absolutePath);
  }

  /**
   * Ensure directory exists
   */
  async ensureDir(dirPath: string): Promise<void> {
    await fs.ensureDir(dirPath);
  }

  /**
   * Check if path exists
   */
  async pathExists(filePath: string): Promise<boolean> {
    return fs.pathExists(filePath);
  }

  /**
   * Normalize path for current platform
   */
  normalizePath(inputPath: string): string {
    return path.normalize(inputPath);
  }

  /**
   * Join paths with platform-appropriate separators
   */
  joinPaths(...segments: string[]): string {
    return path.join(...segments);
  }

  /**
   * Get package path
   */
  getPackagePath(packageName: string): string {
    return path.join(this.config.project.packages, packageName);
  }

  /**
   * Get source path for a package
   */
  getPackageSourcePath(packageName: string): string {
    return path.join(this.getPackagePath(packageName), 'src');
  }

  /**
   * Update configuration from ginko.json if it exists
   */
  async loadConfigFile(): Promise<void> {
    const configPath = path.join(this.projectRoot, 'ginko.json');

    if (await fs.pathExists(configPath)) {
      try {
        const configData = await fs.readJson(configPath);

        // Merge with default config, applying variable substitution
        if (configData.paths) {
          this.mergePathConfig(configData.paths);
        }
      } catch (error) {
        // Fallback to default config if file is invalid
        console.warn('Invalid ginko.json, using default paths');
      }
    }
  }

  /**
   * Merge custom path configuration with defaults
   */
  private mergePathConfig(customPaths: any): void {
    // Apply variable substitution and merge
    // This would implement the ${docs.root}/adr pattern substitution
    // For now, use defaults
  }
}

/**
 * Global path manager instance
 */
export const pathManager = new PathManager();

/**
 * Convenience functions for common operations
 */
export const paths = {
  root: () => pathManager.getProjectRoot(),
  worktree: (name: string) => pathManager.getWorktreePath(name),
  package: (name: string) => pathManager.getPackagePath(name),
  packageSrc: (name: string) => pathManager.getPackageSourcePath(name),
  resolve: (...segments: string[]) => pathManager.resolvePath(...segments),
  join: (...segments: string[]) => pathManager.joinPaths(...segments),
  normalize: (inputPath: string) => pathManager.normalizePath(inputPath),
  relative: (absolutePath: string) => pathManager.getRelativePath(absolutePath)
};