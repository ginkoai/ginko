/**
 * @fileType: utility
 * @status: current
 * @updated: 2025-09-22
 * @tags: [filesystem, documents, operations, abstraction, cross-platform]
 * @related: [document-manager.ts, ../../types/documents.ts]
 * @priority: high
 * @complexity: medium
 * @dependencies: [fs-extra, path, glob]
 */

import * as fs from 'fs-extra';
import * as path from 'path';
import { glob } from 'glob';
import {
  DocumentFormat,
  FileOperation,
  FileOperationResult,
  DocumentSearchCriteria,
  DocumentOptions
} from '../../types/documents.js';

/**
 * Cross-platform file system abstraction for document operations
 */
export class DocumentFileSystem {
  private static instance: DocumentFileSystem;

  private constructor() {}

  public static getInstance(): DocumentFileSystem {
    if (!DocumentFileSystem.instance) {
      DocumentFileSystem.instance = new DocumentFileSystem();
    }
    return DocumentFileSystem.instance;
  }

  /**
   * Check if a file exists
   */
  public async exists(filePath: string): Promise<boolean> {
    try {
      return await fs.pathExists(filePath);
    } catch {
      return false;
    }
  }

  /**
   * Read file contents
   */
  public async readFile(filePath: string, options: DocumentOptions = {}): Promise<FileOperationResult> {
    try {
      if (!await this.exists(filePath)) {
        return {
          operation: 'read',
          path: filePath,
          success: false,
          error: 'File does not exist'
        };
      }

      const encoding = options.encoding || 'utf8';
      const content = await fs.readFile(filePath, encoding);
      const stats = await fs.stat(filePath);

      return {
        operation: 'read',
        path: filePath,
        success: true,
        size: stats.size,
        created: stats.birthtime,
        modified: stats.mtime
      };
    } catch (error) {
      return {
        operation: 'read',
        path: filePath,
        success: false,
        error: error instanceof Error ? error.message : String(error)
      };
    }
  }

  /**
   * Write file contents
   */
  public async writeFile(filePath: string, content: string, options: DocumentOptions = {}): Promise<FileOperationResult> {
    try {
      const encoding = options.encoding || 'utf8';
      const exists = await this.exists(filePath);

      // Ensure directory exists
      await fs.ensureDir(path.dirname(filePath));

      await fs.writeFile(filePath, content, encoding);
      const stats = await fs.stat(filePath);

      return {
        operation: exists ? 'update' : 'create',
        path: filePath,
        success: true,
        size: stats.size,
        created: stats.birthtime,
        modified: stats.mtime
      };
    } catch (error) {
      return {
        operation: 'write',
        path: filePath,
        success: false,
        error: error instanceof Error ? error.message : String(error)
      };
    }
  }

  /**
   * Copy file
   */
  public async copyFile(sourcePath: string, destPath: string): Promise<FileOperationResult> {
    try {
      if (!await this.exists(sourcePath)) {
        return {
          operation: 'copy',
          path: sourcePath,
          success: false,
          error: 'Source file does not exist'
        };
      }

      // Ensure destination directory exists
      await fs.ensureDir(path.dirname(destPath));

      await fs.copy(sourcePath, destPath);
      const stats = await fs.stat(destPath);

      return {
        operation: 'copy',
        path: destPath,
        success: true,
        size: stats.size,
        created: stats.birthtime,
        modified: stats.mtime
      };
    } catch (error) {
      return {
        operation: 'copy',
        path: sourcePath,
        success: false,
        error: error instanceof Error ? error.message : String(error)
      };
    }
  }

  /**
   * Move file
   */
  public async moveFile(sourcePath: string, destPath: string): Promise<FileOperationResult> {
    try {
      if (!await this.exists(sourcePath)) {
        return {
          operation: 'move',
          path: sourcePath,
          success: false,
          error: 'Source file does not exist'
        };
      }

      // Ensure destination directory exists
      await fs.ensureDir(path.dirname(destPath));

      await fs.move(sourcePath, destPath);
      const stats = await fs.stat(destPath);

      return {
        operation: 'move',
        path: destPath,
        success: true,
        size: stats.size,
        created: stats.birthtime,
        modified: stats.mtime
      };
    } catch (error) {
      return {
        operation: 'move',
        path: sourcePath,
        success: false,
        error: error instanceof Error ? error.message : String(error)
      };
    }
  }

  /**
   * Delete file
   */
  public async deleteFile(filePath: string): Promise<FileOperationResult> {
    try {
      if (!await this.exists(filePath)) {
        return {
          operation: 'delete',
          path: filePath,
          success: false,
          error: 'File does not exist'
        };
      }

      await fs.remove(filePath);

      return {
        operation: 'delete',
        path: filePath,
        success: true
      };
    } catch (error) {
      return {
        operation: 'delete',
        path: filePath,
        success: false,
        error: error instanceof Error ? error.message : String(error)
      };
    }
  }

  /**
   * Ensure directory exists
   */
  public async ensureDir(dirPath: string): Promise<boolean> {
    try {
      await fs.ensureDir(dirPath);
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Get file statistics
   */
  public async getStats(filePath: string): Promise<fs.Stats | null> {
    try {
      return await fs.stat(filePath);
    } catch {
      return null;
    }
  }

  /**
   * Find files matching criteria
   */
  public async findFiles(criteria: DocumentSearchCriteria, baseDir: string = process.cwd()): Promise<string[]> {
    try {
      const patterns = this.buildGlobPatterns(criteria);
      const allFiles: string[] = [];

      for (const pattern of patterns) {
        const files = await new Promise<string[]>((resolve, reject) => {
          glob(pattern, {
            cwd: baseDir,
            absolute: true,
            nodir: true
          }, (err, matches) => {
            if (err) reject(err);
            else resolve(matches);
          });
        });
        allFiles.push(...files);
      }

      // Remove duplicates
      const uniqueFiles = Array.from(new Set(allFiles));

      // Apply additional filters
      return this.applyFilters(uniqueFiles, criteria);
    } catch (error) {
      console.error('Error finding files:', error);
      return [];
    }
  }

  /**
   * Build glob patterns from search criteria
   */
  private buildGlobPatterns(criteria: DocumentSearchCriteria): string[] {
    const patterns: string[] = [];

    if (criteria.path) {
      patterns.push(criteria.path);
    } else {
      // Build patterns based on format
      if (criteria.format) {
        const formats = Array.isArray(criteria.format) ? criteria.format : [criteria.format];
        for (const format of formats) {
          switch (format) {
            case 'md':
              patterns.push('**/*.md', '**/*.markdown');
              break;
            case 'json':
              patterns.push('**/*.json');
              break;
            case 'yaml':
              patterns.push('**/*.yaml', '**/*.yml');
              break;
            case 'txt':
              patterns.push('**/*.txt');
              break;
          }
        }
      } else {
        // Default to all supported formats
        patterns.push('**/*.md', '**/*.markdown', '**/*.json', '**/*.yaml', '**/*.yml', '**/*.txt');
      }
    }

    return patterns.length > 0 ? patterns : ['**/*'];
  }

  /**
   * Apply additional filters to file list
   */
  private async applyFilters(files: string[], criteria: DocumentSearchCriteria): Promise<string[]> {
    const filtered: string[] = [];

    for (const file of files) {
      try {
        const stats = await this.getStats(file);
        if (!stats) continue;

        // Filter by creation date
        if (criteria.created) {
          if (criteria.created.from && stats.birthtime < criteria.created.from) continue;
          if (criteria.created.to && stats.birthtime > criteria.created.to) continue;
        }

        // Filter by modification date
        if (criteria.updated) {
          if (criteria.updated.from && stats.mtime < criteria.updated.from) continue;
          if (criteria.updated.to && stats.mtime > criteria.updated.to) continue;
        }

        filtered.push(file);
      } catch {
        // Skip files that can't be stat'd
        continue;
      }
    }

    return filtered;
  }

  /**
   * Get document format from file extension
   */
  public getDocumentFormat(filePath: string): DocumentFormat | null {
    const ext = path.extname(filePath).toLowerCase();

    switch (ext) {
      case '.md':
      case '.markdown':
        return 'md';
      case '.json':
        return 'json';
      case '.yaml':
      case '.yml':
        return 'yaml';
      case '.txt':
        return 'txt';
      default:
        return null;
    }
  }

  /**
   * Normalize file path for cross-platform compatibility
   */
  public normalizePath(filePath: string): string {
    return path.normalize(filePath).replace(/\\/g, '/');
  }

  /**
   * Get relative path from base directory
   */
  public getRelativePath(filePath: string, baseDir: string = process.cwd()): string {
    return path.relative(baseDir, filePath).replace(/\\/g, '/');
  }

  /**
   * Get absolute path
   */
  public getAbsolutePath(filePath: string, baseDir?: string): string {
    if (path.isAbsolute(filePath)) {
      return filePath;
    }
    return path.resolve(baseDir || process.cwd(), filePath);
  }

  /**
   * Check if path is safe (within allowed directory)
   */
  public isSafePath(filePath: string, allowedDir: string): boolean {
    const resolvedPath = path.resolve(filePath);
    const resolvedAllowed = path.resolve(allowedDir);

    return resolvedPath.startsWith(resolvedAllowed + path.sep) || resolvedPath === resolvedAllowed;
  }

  /**
   * Create backup of file
   */
  public async createBackup(filePath: string, backupSuffix: string = '.backup'): Promise<FileOperationResult> {
    try {
      if (!await this.exists(filePath)) {
        return {
          operation: 'copy',
          path: filePath,
          success: false,
          error: 'Original file does not exist'
        };
      }

      const backupPath = `${filePath}${backupSuffix}`;
      return await this.copyFile(filePath, backupPath);
    } catch (error) {
      return {
        operation: 'copy',
        path: filePath,
        success: false,
        error: error instanceof Error ? error.message : String(error)
      };
    }
  }

  /**
   * List directory contents
   */
  public async listDirectory(dirPath: string, recursive: boolean = false): Promise<string[]> {
    try {
      if (!await fs.pathExists(dirPath)) {
        return [];
      }

      if (recursive) {
        const files = await new Promise<string[]>((resolve, reject) => {
          glob('**/*', {
            cwd: dirPath,
            absolute: true,
            nodir: true
          }, (err, matches) => {
            if (err) reject(err);
            else resolve(matches);
          });
        });
        return files;
      } else {
        const entries = await fs.readdir(dirPath, { withFileTypes: true });
        return entries
          .filter(entry => entry.isFile())
          .map(entry => path.join(dirPath, entry.name));
      }
    } catch {
      return [];
    }
  }
}