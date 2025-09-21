/**
 * @fileType: utility
 * @status: current
 * @updated: 2025-09-20
 * @tags: [path, resolution, cross-platform, windows, unix, config]
 * @related: [platform-adapter.ts, config-loader.ts]
 * @priority: high
 * @complexity: medium
 * @dependencies: [path, os, platform-adapter]
 */

import * as path from 'path';
import * as os from 'path';
import { Platform, PlatformAdapter } from './platform-adapter';

export interface PathConfig {
  platform: Platform;
  separators: {
    path: string;
    drive: string;
  };
  roots: {
    home: string;
    temp: string;
    config: string;
  };
  patterns: {
    absolute: RegExp;
    relative: RegExp;
    home: RegExp;
  };
}

export interface ResolvedPath {
  original: string;
  resolved: string;
  platform: Platform;
  isAbsolute: boolean;
  isHome: boolean;
  components: string[];
}

/**
 * CrossPlatformPathResolver handles path resolution across different operating systems
 */
export class CrossPlatformPathResolver {
  private platformAdapter: PlatformAdapter;
  private config: PathConfig;

  constructor(platformAdapter?: PlatformAdapter) {
    this.platformAdapter = platformAdapter || new PlatformAdapter();
    this.config = this.initializeConfig();
  }

  /**
   * Initialize platform-specific path configuration
   */
  private initializeConfig(): PathConfig {
    const platform = this.platformAdapter.detectPlatform();
    const homeDir = os.homedir();

    const config: PathConfig = {
      platform,
      separators: {
        path: platform === 'windows' ? '\\' : '/',
        drive: platform === 'windows' ? ':' : ''
      },
      roots: {
        home: homeDir,
        temp: platform === 'windows' ? process.env.TEMP || 'C:\\temp' : '/tmp',
        config: this.platformAdapter.getClaudeConfigPath()
      },
      patterns: {
        absolute: platform === 'windows'
          ? /^[A-Za-z]:\\/
          : /^\//,
        relative: /^\.\.?\//,
        home: /^~\//
      }
    };

    return config;
  }

  /**
   * Resolve a path for the current platform
   */
  resolvePath(inputPath: string, basePath?: string): ResolvedPath {
    const normalizedInput = this.normalizeSeparators(inputPath);

    let resolved: string;
    let isAbsolute = false;
    let isHome = false;

    // Handle different path types
    if (this.config.patterns.home.test(normalizedInput)) {
      // Home directory path (~/)
      resolved = this.resolveHomePath(normalizedInput);
      isHome = true;
      isAbsolute = true;
    } else if (this.config.patterns.absolute.test(normalizedInput)) {
      // Absolute path
      resolved = this.resolveAbsolutePath(normalizedInput);
      isAbsolute = true;
    } else {
      // Relative path
      resolved = this.resolveRelativePath(normalizedInput, basePath);
      isAbsolute = false;
    }

    // Normalize for current platform
    resolved = this.normalizePath(resolved);

    return {
      original: inputPath,
      resolved,
      platform: this.config.platform,
      isAbsolute,
      isHome,
      components: this.splitPath(resolved)
    };
  }

  /**
   * Resolve home directory path
   */
  private resolveHomePath(homePath: string): string {
    const relativePart = homePath.substring(2); // Remove ~/
    return path.join(this.config.roots.home, relativePart);
  }

  /**
   * Resolve absolute path
   */
  private resolveAbsolutePath(absolutePath: string): string {
    // Convert foreign platform absolute paths
    if (this.config.platform === 'windows' && absolutePath.startsWith('/')) {
      // Unix path on Windows - convert to Windows format
      return 'C:' + absolutePath.replace(/\//g, '\\');
    } else if (this.config.platform !== 'windows' && /^[A-Za-z]:/.test(absolutePath)) {
      // Windows path on Unix - convert to Unix format
      const driveLetter = absolutePath[0].toLowerCase();
      const pathPart = absolutePath.substring(2).replace(/\\/g, '/');
      return `/mnt/${driveLetter}${pathPart}`;
    }

    return absolutePath;
  }

  /**
   * Resolve relative path
   */
  private resolveRelativePath(relativePath: string, basePath?: string): string {
    const base = basePath || process.cwd();
    return path.resolve(base, relativePath);
  }

  /**
   * Normalize path separators for current platform
   */
  normalizeSeparators(inputPath: string): string {
    if (this.config.platform === 'windows') {
      return inputPath.replace(/\//g, '\\');
    } else {
      return inputPath.replace(/\\/g, '/');
    }
  }

  /**
   * Normalize path for current platform
   */
  normalizePath(inputPath: string): string {
    return path.normalize(this.normalizeSeparators(inputPath));
  }

  /**
   * Split path into components
   */
  splitPath(inputPath: string): string[] {
    const normalized = this.normalizePath(inputPath);
    const separator = this.config.separators.path;

    return normalized.split(separator).filter(component => component.length > 0);
  }

  /**
   * Join path components for current platform
   */
  joinPath(...components: string[]): string {
    return this.normalizePath(path.join(...components));
  }

  /**
   * Convert path to platform-specific format
   */
  convertPathToPlatform(inputPath: string, targetPlatform: Platform): string {
    const resolved = this.resolvePath(inputPath);

    if (targetPlatform === 'windows') {
      // Convert to Windows format
      if (resolved.resolved.startsWith('/')) {
        // Unix absolute path
        return 'C:' + resolved.resolved.replace(/\//g, '\\');
      }
      return resolved.resolved.replace(/\//g, '\\');
    } else {
      // Convert to Unix format
      if (/^[A-Za-z]:/.test(resolved.resolved)) {
        // Windows absolute path
        const driveLetter = resolved.resolved[0].toLowerCase();
        const pathPart = resolved.resolved.substring(2).replace(/\\/g, '/');
        return `/mnt/${driveLetter}${pathPart}`;
      }
      return resolved.resolved.replace(/\\/g, '/');
    }
  }

  /**
   * Get platform-specific special directories
   */
  getSpecialDirectory(type: 'home' | 'temp' | 'config' | 'desktop' | 'documents'): string {
    const homeDir = this.config.roots.home;

    switch (type) {
      case 'home':
        return homeDir;

      case 'temp':
        return this.config.roots.temp;

      case 'config':
        return this.config.roots.config;

      case 'desktop':
        if (this.config.platform === 'windows') {
          return path.join(homeDir, 'Desktop');
        } else if (this.config.platform === 'macos') {
          return path.join(homeDir, 'Desktop');
        } else {
          return path.join(homeDir, 'Desktop');
        }

      case 'documents':
        if (this.config.platform === 'windows') {
          return path.join(homeDir, 'Documents');
        } else if (this.config.platform === 'macos') {
          return path.join(homeDir, 'Documents');
        } else {
          return path.join(homeDir, 'Documents');
        }

      default:
        return homeDir;
    }
  }

  /**
   * Create portable path that works across platforms
   */
  createPortablePath(inputPath: string): string {
    const resolved = this.resolvePath(inputPath);

    // Convert to portable format using forward slashes
    let portable = resolved.resolved.replace(/\\/g, '/');

    // Replace home directory with ~ if applicable
    if (portable.startsWith(this.config.roots.home)) {
      portable = portable.replace(this.config.roots.home, '~');
    }

    // Remove drive letters for Windows paths
    if (this.config.platform === 'windows' && /^[A-Za-z]:/.test(portable)) {
      portable = portable.substring(2);
    }

    return portable;
  }

  /**
   * Validate path for platform compatibility
   */
  validatePath(inputPath: string, targetPlatform?: Platform): {
    valid: boolean;
    issues: string[];
    suggestions: string[];
  } {
    const target = targetPlatform || this.config.platform;
    const issues: string[] = [];
    const suggestions: string[] = [];

    // Check for platform-specific issues
    if (target === 'windows') {
      // Windows path validation
      if (inputPath.includes('/') && !inputPath.includes('\\')) {
        issues.push('Uses Unix path separators on Windows');
        suggestions.push('Replace forward slashes with backslashes');
      }

      if (inputPath.length > 260) {
        issues.push('Path exceeds Windows MAX_PATH limit (260 characters)');
        suggestions.push('Shorten path or use long path support');
      }

      if (/[<>:"|?*]/.test(inputPath)) {
        issues.push('Contains invalid Windows filename characters');
        suggestions.push('Remove or replace invalid characters: < > : " | ? *');
      }

      if (inputPath.endsWith(' ') || inputPath.endsWith('.')) {
        issues.push('Windows paths cannot end with space or period');
        suggestions.push('Remove trailing spaces and periods');
      }
    } else {
      // Unix path validation
      if (inputPath.includes('\\') && !inputPath.includes('/')) {
        issues.push('Uses Windows path separators on Unix');
        suggestions.push('Replace backslashes with forward slashes');
      }

      if (/^[A-Za-z]:/.test(inputPath)) {
        issues.push('Contains Windows drive letter on Unix system');
        suggestions.push('Remove drive letter and adjust path');
      }
    }

    // Check for reserved names (Windows)
    if (target === 'windows') {
      const reservedNames = ['CON', 'PRN', 'AUX', 'NUL', 'COM1', 'COM2', 'COM3', 'COM4', 'COM5', 'COM6', 'COM7', 'COM8', 'COM9', 'LPT1', 'LPT2', 'LPT3', 'LPT4', 'LPT5', 'LPT6', 'LPT7', 'LPT8', 'LPT9'];
      const filename = path.basename(inputPath).toUpperCase();

      if (reservedNames.includes(filename)) {
        issues.push(`Uses reserved Windows filename: ${filename}`);
        suggestions.push('Choose a different filename');
      }
    }

    return {
      valid: issues.length === 0,
      issues,
      suggestions
    };
  }

  /**
   * Get relative path between two paths
   */
  getRelativePath(from: string, to: string): string {
    const resolvedFrom = this.resolvePath(from);
    const resolvedTo = this.resolvePath(to);

    return path.relative(resolvedFrom.resolved, resolvedTo.resolved);
  }

  /**
   * Check if path exists and is accessible
   */
  async checkPathAccess(inputPath: string): Promise<{
    exists: boolean;
    readable: boolean;
    writable: boolean;
    isDirectory: boolean;
    isFile: boolean;
  }> {
    const fs = await import('fs');
    const resolved = this.resolvePath(inputPath);

    try {
      const stats = await fs.promises.stat(resolved.resolved);

      // Test read access
      let readable = false;
      try {
        await fs.promises.access(resolved.resolved, fs.constants.R_OK);
        readable = true;
      } catch {
        readable = false;
      }

      // Test write access
      let writable = false;
      try {
        await fs.promises.access(resolved.resolved, fs.constants.W_OK);
        writable = true;
      } catch {
        writable = false;
      }

      return {
        exists: true,
        readable,
        writable,
        isDirectory: stats.isDirectory(),
        isFile: stats.isFile()
      };
    } catch {
      return {
        exists: false,
        readable: false,
        writable: false,
        isDirectory: false,
        isFile: false
      };
    }
  }

  /**
   * Get current platform configuration
   */
  getConfig(): PathConfig {
    return { ...this.config };
  }
}

export default CrossPlatformPathResolver;