/**
 * @fileType: adapter
 * @status: current
 * @updated: 2025-09-20
 * @tags: [platform, paths, cross-platform, os-detection]
 * @related: [path-config.ts, platform-adapter.ts]
 * @priority: critical
 * @complexity: medium
 * @dependencies: [path, os]
 */

import path from 'path';
import os from 'os';

export type Platform = 'windows' | 'macos' | 'linux';

export interface PlatformPaths {
  home: string;
  config: string;
  cache: string;
  temp: string;
  separator: string;
  pathSeparator: string;
}

export class PathAdapter {
  private platform: Platform;
  private platformPaths: PlatformPaths;

  constructor() {
    this.platform = this.detectPlatform();
    this.platformPaths = this.getPlatformPaths();
  }

  /**
   * Detect current platform
   */
  private detectPlatform(): Platform {
    const platform = os.platform();

    switch (platform) {
      case 'win32':
        return 'windows';
      case 'darwin':
        return 'macos';
      default:
        return 'linux';
    }
  }

  /**
   * Get platform-specific paths
   */
  private getPlatformPaths(): PlatformPaths {
    const homeDir = os.homedir();

    switch (this.platform) {
      case 'windows':
        return {
          home: homeDir,
          config: path.join(homeDir, 'AppData', 'Roaming'),
          cache: path.join(homeDir, 'AppData', 'Local'),
          temp: os.tmpdir(),
          separator: '\\',
          pathSeparator: ';'
        };

      case 'macos':
        return {
          home: homeDir,
          config: path.join(homeDir, 'Library', 'Application Support'),
          cache: path.join(homeDir, 'Library', 'Caches'),
          temp: os.tmpdir(),
          separator: '/',
          pathSeparator: ':'
        };

      case 'linux':
        return {
          home: homeDir,
          config: process.env.XDG_CONFIG_HOME || path.join(homeDir, '.config'),
          cache: process.env.XDG_CACHE_HOME || path.join(homeDir, '.cache'),
          temp: os.tmpdir(),
          separator: '/',
          pathSeparator: ':'
        };
    }
  }

  /**
   * Get current platform
   */
  getPlatform(): Platform {
    return this.platform;
  }

  /**
   * Get platform paths
   */
  getPaths(): PlatformPaths {
    return this.platformPaths;
  }

  /**
   * Convert path to platform-appropriate format
   */
  adaptPath(inputPath: string): string {
    // Normalize separators for current platform
    return path.normalize(inputPath);
  }

  /**
   * Convert Windows path to Unix format (for cross-platform compatibility)
   */
  toUnixPath(inputPath: string): string {
    return inputPath.replace(/\\/g, '/');
  }

  /**
   * Convert Unix path to Windows format
   */
  toWindowsPath(inputPath: string): string {
    return inputPath.replace(/\//g, '\\');
  }

  /**
   * Join paths with platform-appropriate separators
   */
  joinPaths(...segments: string[]): string {
    return path.join(...segments);
  }

  /**
   * Resolve path relative to current working directory
   */
  resolvePath(...segments: string[]): string {
    return path.resolve(...segments);
  }

  /**
   * Get relative path between two absolute paths
   */
  getRelativePath(from: string, to: string): string {
    return path.relative(from, to);
  }

  /**
   * Check if path is absolute
   */
  isAbsolute(inputPath: string): boolean {
    return path.isAbsolute(inputPath);
  }

  /**
   * Get directory name from path
   */
  dirname(inputPath: string): string {
    return path.dirname(inputPath);
  }

  /**
   * Get base name from path
   */
  basename(inputPath: string, ext?: string): string {
    return path.basename(inputPath, ext);
  }

  /**
   * Get file extension from path
   */
  extname(inputPath: string): string {
    return path.extname(inputPath);
  }

  /**
   * Parse path into components
   */
  parsePath(inputPath: string): path.ParsedPath {
    return path.parse(inputPath);
  }

  /**
   * Format path from components
   */
  formatPath(pathObject: path.FormatInputPathObject): string {
    return path.format(pathObject);
  }

  /**
   * Get user-specific application config directory
   */
  getConfigDir(appName: string): string {
    return path.join(this.platformPaths.config, appName);
  }

  /**
   * Get user-specific application cache directory
   */
  getCacheDir(appName: string): string {
    return path.join(this.platformPaths.cache, appName);
  }

  /**
   * Get temporary directory for application
   */
  getTempDir(appName?: string): string {
    if (appName) {
      return path.join(this.platformPaths.temp, appName);
    }
    return this.platformPaths.temp;
  }

  /**
   * Expand tilde (~) to home directory
   */
  expandTilde(inputPath: string): string {
    if (inputPath.startsWith('~/')) {
      return path.join(this.platformPaths.home, inputPath.slice(2));
    }
    return inputPath;
  }

  /**
   * Convert absolute path to use tilde notation
   */
  toTildePath(inputPath: string): string {
    if (inputPath.startsWith(this.platformPaths.home)) {
      return '~' + inputPath.slice(this.platformPaths.home.length);
    }
    return inputPath;
  }

  /**
   * Validate path format for current platform
   */
  isValidPath(inputPath: string): boolean {
    try {
      // Attempt to parse and normalize the path
      const normalized = path.normalize(inputPath);
      return normalized.length > 0;
    } catch {
      return false;
    }
  }

  /**
   * Get environment-appropriate path separator
   */
  getPathSeparator(): string {
    return this.platformPaths.pathSeparator;
  }

  /**
   * Get environment-appropriate directory separator
   */
  getDirectorySeparator(): string {
    return this.platformPaths.separator;
  }

  /**
   * Split PATH environment variable
   */
  splitPath(pathEnv: string = process.env.PATH || ''): string[] {
    return pathEnv.split(this.platformPaths.pathSeparator);
  }

  /**
   * Join PATH environment variable
   */
  joinPath(pathArray: string[]): string {
    return pathArray.join(this.platformPaths.pathSeparator);
  }
}

/**
 * Global path adapter instance
 */
export const pathAdapter = new PathAdapter();

/**
 * Convenience functions
 */
export const adaptPath = (inputPath: string) => pathAdapter.adaptPath(inputPath);
export const joinPaths = (...segments: string[]) => pathAdapter.joinPaths(...segments);
export const resolvePath = (...segments: string[]) => pathAdapter.resolvePath(...segments);
export const normalizePath = (inputPath: string) => pathAdapter.adaptPath(inputPath);
export const expandTilde = (inputPath: string) => pathAdapter.expandTilde(inputPath);
export const isAbsolutePath = (inputPath: string) => pathAdapter.isAbsolute(inputPath);
export const getRelativePath = (from: string, to: string) => pathAdapter.getRelativePath(from, to);