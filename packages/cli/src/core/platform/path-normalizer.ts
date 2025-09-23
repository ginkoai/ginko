/**
 * @fileType: utility
 * @status: current
 * @updated: 2025-09-19
 * @tags: [paths, cross-platform, normalization, windows, unix]
 * @related: [platform-detector.ts, hook-adapter.ts, index.ts]
 * @priority: high
 * @complexity: medium
 * @dependencies: [path, os]
 */

import * as path from 'path';
import * as os from 'os';
import { Platform } from './platform-detector.js';

export interface PathConversionOptions {
  preserveCase?: boolean;
  expandVariables?: boolean;
  useForwardSlashes?: boolean;
  makeRelative?: boolean;
  basePath?: string;
}

export interface NormalizedPath {
  original: string;
  normalized: string;
  platform: Platform;
  isAbsolute: boolean;
  segments: string[];
  drive?: string;
  root: string;
}

/**
 * Handles cross-platform path normalization and conversion
 * Resolves differences between Windows and Unix path formats
 */
export class PathNormalizer {
  private readonly windowsDrivePattern = /^[A-Za-z]:/;
  private readonly windowsPathPattern = /^[A-Za-z]:[\\\/]/;
  private readonly unixAbsolutePattern = /^\//;

  /**
   * Normalize a path for the current platform
   */
  normalize(inputPath: string, targetPlatform?: Platform): string {
    const platform = targetPlatform || this.getCurrentPlatform();
    const normalizedPath = this.basicNormalize(inputPath, platform);
    return this.expandEnvironmentVariables(normalizedPath, platform);
  }

  /**
   * Convert a path from one platform to another
   */
  convertPath(inputPath: string, fromPlatform: Platform, toPlatform: Platform): string {
    if (fromPlatform === toPlatform) {
      return inputPath;
    }

    let converted = inputPath;

    // Handle bulk string conversion (for script content)
    if (this.isScriptContent(inputPath)) {
      return this.convertPathsInText(inputPath, fromPlatform, toPlatform);
    }

    // Convert individual path
    if (fromPlatform === 'windows' && (toPlatform === 'linux' || toPlatform === 'macos')) {
      converted = this.convertWindowsToUnix(inputPath);
    } else if ((fromPlatform === 'linux' || fromPlatform === 'macos') && toPlatform === 'windows') {
      converted = this.convertUnixToWindows(inputPath);
    }

    return this.normalize(converted, toPlatform);
  }

  /**
   * Parse a path into components
   */
  parse(inputPath: string, platform?: Platform): NormalizedPath {
    const targetPlatform = platform || this.getCurrentPlatform();
    const normalized = this.normalize(inputPath, targetPlatform);
    const parsed = path.parse(normalized);

    return {
      original: inputPath,
      normalized,
      platform: targetPlatform,
      isAbsolute: path.isAbsolute(normalized),
      segments: normalized.split(path.sep).filter(segment => segment !== ''),
      drive: this.extractDrive(normalized),
      root: parsed.root
    };
  }

  /**
   * Convert home directory references
   */
  expandHomeDirectory(inputPath: string, platform?: Platform): string {
    const targetPlatform = platform || this.getCurrentPlatform();
    let expanded = inputPath;

    // Unix-style home directory expansion
    if (expanded.startsWith('~/')) {
      const homeDir = this.getHomeDirectory(targetPlatform);
      expanded = path.join(homeDir, expanded.slice(2));
    }

    // Windows-style home directory
    if (expanded.includes('%USERPROFILE%')) {
      const homeDir = this.getHomeDirectory(targetPlatform);
      expanded = expanded.replace(/%USERPROFILE%/g, homeDir);
    }

    if (expanded.includes('%HOME%')) {
      const homeDir = this.getHomeDirectory(targetPlatform);
      expanded = expanded.replace(/%HOME%/g, homeDir);
    }

    return expanded;
  }

  /**
   * Get the appropriate Claude hooks path for any platform
   */
  getClaudeHooksPath(platform?: Platform): string {
    const targetPlatform = platform || this.getCurrentPlatform();
    const homeDir = this.getHomeDirectory(targetPlatform);
    return this.joinPath([homeDir, '.claude', 'hooks'], targetPlatform);
  }

  /**
   * Get the appropriate ginko directory path for any platform
   */
  getGinkoPath(platform?: Platform): string {
    const targetPlatform = platform || this.getCurrentPlatform();
    const homeDir = this.getHomeDirectory(targetPlatform);
    return this.joinPath([homeDir, '.ginko'], targetPlatform);
  }

  /**
   * Join path segments using platform-specific separators
   */
  joinPath(segments: string[], platform?: Platform): string {
    const targetPlatform = platform || this.getCurrentPlatform();
    const separator = targetPlatform === 'windows' ? '\\' : '/';
    return segments.join(separator);
  }

  /**
   * Make a path relative to a base path
   */
  makeRelative(inputPath: string, basePath: string, platform?: Platform): string {
    const targetPlatform = platform || this.getCurrentPlatform();
    const normalizedInput = this.normalize(inputPath, targetPlatform);
    const normalizedBase = this.normalize(basePath, targetPlatform);

    return path.relative(normalizedBase, normalizedInput);
  }

  /**
   * Make a path absolute
   */
  makeAbsolute(inputPath: string, basePath?: string, platform?: Platform): string {
    const targetPlatform = platform || this.getCurrentPlatform();
    const base = basePath || process.cwd();

    if (path.isAbsolute(inputPath)) {
      return this.normalize(inputPath, targetPlatform);
    }

    return this.normalize(path.resolve(base, inputPath), targetPlatform);
  }

  /**
   * Check if a path exists and normalize it
   */
  async normalizePath(inputPath: string, options: PathConversionOptions = {}): Promise<string> {
    let normalized = inputPath;

    // Expand home directory
    normalized = this.expandHomeDirectory(normalized);

    // Expand environment variables
    if (options.expandVariables !== false) {
      normalized = this.expandEnvironmentVariables(normalized);
    }

    // Make relative if requested
    if (options.makeRelative && options.basePath) {
      normalized = this.makeRelative(normalized, options.basePath);
    }

    // Use forward slashes if requested
    if (options.useForwardSlashes) {
      normalized = normalized.replace(/\\/g, '/');
    }

    return path.normalize(normalized);
  }

  /**
   * Basic path normalization
   */
  private basicNormalize(inputPath: string, platform: Platform): string {
    let normalized = inputPath;

    // Handle empty or null paths
    if (!normalized || normalized.trim() === '') {
      return '';
    }

    // Expand home directory first
    normalized = this.expandHomeDirectory(normalized, platform);

    // Platform-specific normalization
    if (platform === 'windows') {
      // Convert forward slashes to backslashes
      normalized = normalized.replace(/\//g, '\\');

      // Handle UNC paths
      if (normalized.startsWith('\\\\')) {
        return normalized;
      }

      // Ensure drive letter format
      if (this.windowsDrivePattern.test(normalized) && !normalized.includes('\\')) {
        normalized = normalized.replace(':', ':\\');
      }
    } else {
      // Unix-like systems: convert backslashes to forward slashes
      normalized = normalized.replace(/\\/g, '/');
    }

    return path.normalize(normalized);
  }

  /**
   * Convert Windows path to Unix
   */
  private convertWindowsToUnix(windowsPath: string): string {
    let unixPath = windowsPath;

    // Convert backslashes to forward slashes
    unixPath = unixPath.replace(/\\/g, '/');

    // Convert drive letters (C:\ -> /c/)
    unixPath = unixPath.replace(/^([A-Za-z]):\//g, '/$1/');

    // Handle common Windows paths
    unixPath = unixPath.replace(/^\/Users\/([^\/]+)\//, '/home/$1/');
    unixPath = unixPath.replace(/^\/c\/Users\/([^\/]+)\//, '/home/$1/');

    // Remove duplicate slashes
    unixPath = unixPath.replace(/\/+/g, '/');

    return unixPath;
  }

  /**
   * Convert Unix path to Windows
   */
  private convertUnixToWindows(unixPath: string): string {
    let windowsPath = unixPath;

    // Convert forward slashes to backslashes
    windowsPath = windowsPath.replace(/\//g, '\\');

    // Convert mount points to drive letters (/c/ -> C:\)
    windowsPath = windowsPath.replace(/^\\([a-zA-Z])\\/, '$1:\\');

    // Handle common Unix paths
    windowsPath = windowsPath.replace(/^\\home\\([^\\]+)\\/, 'C:\\Users\\$1\\');
    windowsPath = windowsPath.replace(/^\/home\//, 'C:\\Users\\');

    // Handle absolute paths that don't start with drive
    if (windowsPath.startsWith('\\') && !windowsPath.startsWith('\\\\')) {
      windowsPath = 'C:' + windowsPath;
    }

    return windowsPath;
  }

  /**
   * Convert paths within text content (for scripts)
   */
  private convertPathsInText(content: string, fromPlatform: Platform, toPlatform: Platform): string {
    let converted = content;

    // Common path patterns to convert
    const pathPatterns = [
      // Quoted paths
      /"([A-Za-z]:[\\\/][^"]+)"/g,
      /'([A-Za-z]:[\\\/][^']+)'/g,
      /"(\/[^"]+)"/g,
      /'(\/[^']+)'/g,
      // Unquoted paths (more careful)
      /\b([A-Za-z]:[\\\/]\S+)/g,
      /\b(\/[a-zA-Z][^\s]*)/g,
      // Environment variables with paths
      /%([A-Z_]+)%/g,
      /\$\{([A-Z_]+)\}/g,
      /\$([A-Z_]+)/g
    ];

    for (const pattern of pathPatterns) {
      converted = converted.replace(pattern, (match, path) => {
        if (this.looksLikePath(path)) {
          const convertedPath = this.convertPath(path, fromPlatform, toPlatform);
          return match.replace(path, convertedPath);
        }
        return match;
      });
    }

    return converted;
  }

  /**
   * Expand environment variables in path
   */
  private expandEnvironmentVariables(inputPath: string, platform?: Platform): string {
    const targetPlatform = platform || this.getCurrentPlatform();
    let expanded = inputPath;

    // Windows environment variables (%VAR%)
    expanded = expanded.replace(/%([A-Z_][A-Z0-9_]*)%/g, (match, varName) => {
      const value = process.env[varName];
      return value || match;
    });

    // Unix environment variables ($VAR or ${VAR})
    expanded = expanded.replace(/\$\{([A-Z_][A-Z0-9_]*)\}/g, (match, varName) => {
      const value = process.env[varName];
      return value || match;
    });

    expanded = expanded.replace(/\$([A-Z_][A-Z0-9_]*)/g, (match, varName) => {
      const value = process.env[varName];
      return value || match;
    });

    return expanded;
  }

  /**
   * Get current platform
   */
  private getCurrentPlatform(): Platform {
    const platform = os.platform();
    switch (platform) {
      case 'win32':
        return 'windows';
      case 'darwin':
        return 'macos';
      case 'linux':
        return 'linux';
      default:
        return 'linux';
    }
  }

  /**
   * Get home directory for platform
   */
  private getHomeDirectory(platform: Platform): string {
    if (platform === 'windows') {
      return process.env.USERPROFILE || process.env.HOME || 'C:\\Users\\Default';
    } else {
      return process.env.HOME || '/home/user';
    }
  }

  /**
   * Extract drive letter from Windows path
   */
  private extractDrive(inputPath: string): string | undefined {
    const match = inputPath.match(/^([A-Za-z]):/);
    return match ? match[1].toUpperCase() + ':' : undefined;
  }

  /**
   * Check if string looks like a path
   */
  private looksLikePath(str: string): boolean {
    if (!str || str.length < 2) return false;

    // Windows absolute path
    if (this.windowsPathPattern.test(str)) return true;

    // Unix absolute path
    if (this.unixAbsolutePattern.test(str)) return true;

    // Relative path with directory separators
    if (str.includes('/') || str.includes('\\')) return true;

    // Home directory reference
    if (str.startsWith('~/')) return true;

    return false;
  }

  /**
   * Check if string contains script content vs a single path
   */
  private isScriptContent(str: string): boolean {
    // If it contains newlines or is very long, it's probably script content
    return str.includes('\n') || str.length > 200;
  }
}