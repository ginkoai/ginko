/**
 * @fileType: utility
 * @status: current
 * @updated: 2025-09-19
 * @tags: [document, migration, rename, references, atomic]
 * @related: [document-namer.ts, sequence-manager.ts]
 * @priority: high
 * @complexity: high
 * @dependencies: [fs-extra, path, glob]
 */

import * as fs from 'fs-extra';
import * as path from 'path';
import { glob } from 'glob';
import { DocumentType, SequenceManager } from './sequence-manager.js';
import { DocumentNamer, NameGenerationResult } from './document-namer.js';

/**
 * Configuration for document migration
 */
export interface DocumentMigratorConfig {
  /** Document namer for generating new names */
  documentNamer: DocumentNamer;
  /** Sequence manager for tracking numbers */
  sequenceManager: SequenceManager;
  /** Root directory containing docs */
  docsRoot: string;
  /** Whether to update references in other documents */
  updateReferences?: boolean;
  /** Backup directory for original files */
  backupDir?: string;
}

/**
 * A single file migration operation
 */
export interface MigrationOperation {
  /** Original file path */
  originalPath: string;
  /** New file path after migration */
  newPath: string;
  /** Original filename */
  originalFilename: string;
  /** New filename */
  newFilename: string;
  /** Document type */
  type: DocumentType;
  /** Migration reason */
  reason: string;
  /** Whether this is a safe operation */
  isSafe: boolean;
}

/**
 * Result of a migration preview or execution
 */
export interface MigrationResult {
  /** Operations that were planned/executed */
  operations: MigrationOperation[];
  /** Files that had references updated */
  referencesUpdated: string[];
  /** Total files processed */
  totalFiles: number;
  /** Files that were successfully migrated */
  successfulMigrations: number;
  /** Errors encountered */
  errors: Array<{ file: string; error: string }>;
  /** Whether any changes were made */
  hasChanges: boolean;
  /** Backup directory if created */
  backupDirectory?: string;
}

/**
 * Reference found in a document
 */
export interface DocumentReference {
  /** File containing the reference */
  filePath: string;
  /** Line number (1-based) */
  lineNumber: number;
  /** Full line content */
  lineContent: string;
  /** Original filename being referenced */
  referencedFile: string;
  /** Type of reference (link, relative path, etc.) */
  referenceType: 'markdown-link' | 'relative-path' | 'absolute-path';
}

/**
 * Migrates documents to standardized naming convention and updates references.
 * Provides safe atomic operations with rollback capability.
 */
export class DocumentMigrator {
  private config: DocumentMigratorConfig;

  constructor(config: DocumentMigratorConfig) {
    this.config = config;
  }

  /**
   * Scan directories and generate a migration plan
   */
  async generateMigrationPlan(): Promise<MigrationResult> {
    const operations: MigrationOperation[] = [];
    const errors: Array<{ file: string; error: string }> = [];

    try {
      // Get all document types and their directories
      const typeDirectories: Record<DocumentType, string> = {
        'ADR': 'adr',
        'PRD': 'PRD',
        'SPRINT': 'sprints',
        'STRATEGY': 'strategy'
      };

      for (const [type, subDir] of Object.entries(typeDirectories) as [DocumentType, string][]) {
        const dirPath = path.join(this.config.docsRoot, subDir);

        if (await fs.pathExists(dirPath)) {
          const files = await fs.readdir(dirPath);

          for (const file of files) {
            if (file.endsWith('.md') && !this.config.documentNamer.isStandardName(file)) {
              try {
                const originalPath = path.join(dirPath, file);
                const nameResult = await this.config.documentNamer.standardizeName(type, file);

                operations.push({
                  originalPath,
                  newPath: nameResult.fullPath,
                  originalFilename: file,
                  newFilename: nameResult.filename,
                  type,
                  reason: 'Non-standard naming convention',
                  isSafe: true
                });
              } catch (error) {
                errors.push({
                  file,
                  error: error instanceof Error ? error.message : 'Unknown error'
                });
              }
            }
          }
        }
      }

      return {
        operations,
        referencesUpdated: [],
        totalFiles: operations.length,
        successfulMigrations: 0,
        errors,
        hasChanges: operations.length > 0,
        backupDirectory: undefined
      };
    } catch (error) {
      throw new Error(`Failed to generate migration plan: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Execute migration plan with atomic operations
   */
  async executeMigration(dryRun: boolean = false): Promise<MigrationResult> {
    const plan = await this.generateMigrationPlan();

    if (plan.operations.length === 0) {
      return { ...plan, successfulMigrations: 0 };
    }

    if (dryRun) {
      return plan;
    }

    let backupDirectory: string | undefined;
    const referencesUpdated: string[] = [];
    const errors: Array<{ file: string; error: string }> = [...plan.errors];
    let successfulMigrations = 0;

    try {
      // Create backup directory
      backupDirectory = await this.createBackup(plan.operations);

      // Find all references before moving files
      const allReferences = this.config.updateReferences
        ? await this.findAllReferences(plan.operations)
        : [];

      // Execute file moves
      for (const operation of plan.operations) {
        try {
          await this.executeOperation(operation);
          successfulMigrations++;
        } catch (error) {
          errors.push({
            file: operation.originalFilename,
            error: error instanceof Error ? error.message : 'Unknown error'
          });
        }
      }

      // Update references if enabled
      if (this.config.updateReferences && allReferences.length > 0) {
        const updatedFiles = await this.updateReferences(allReferences, plan.operations);
        referencesUpdated.push(...updatedFiles);
      }

      return {
        operations: plan.operations,
        referencesUpdated,
        totalFiles: plan.operations.length,
        successfulMigrations,
        errors,
        hasChanges: successfulMigrations > 0,
        backupDirectory
      };
    } catch (error) {
      // Attempt rollback if backup exists
      if (backupDirectory) {
        try {
          await this.rollback(backupDirectory, plan.operations);
        } catch (rollbackError) {
          errors.push({
            file: 'rollback',
            error: `Rollback failed: ${rollbackError instanceof Error ? rollbackError.message : 'Unknown error'}`
          });
        }
      }

      throw new Error(`Migration failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Find all references to files that will be migrated
   */
  async findAllReferences(operations: MigrationOperation[]): Promise<DocumentReference[]> {
    const references: DocumentReference[] = [];
    const operationMap = new Map(operations.map(op => [op.originalFilename, op]));

    // Search all markdown files in the docs directory
    const searchPattern = path.join(this.config.docsRoot, '**', '*.md');
    const allFiles = await glob(searchPattern, { windowsPathsNoEscape: true });

    for (const filePath of allFiles) {
      try {
        const content = await fs.readFile(filePath, 'utf-8');
        const lines = content.split('\n');

        for (let i = 0; i < lines.length; i++) {
          const line = lines[i];

          // Check for various reference patterns
          for (const [originalFilename] of operationMap) {
            const refs = this.findReferencesInLine(line, originalFilename, i + 1, filePath);
            references.push(...refs);
          }
        }
      } catch (error) {
        // Skip files that can't be read
        continue;
      }
    }

    return references;
  }

  /**
   * Find references to a specific file in a line of text
   */
  private findReferencesInLine(
    line: string,
    filename: string,
    lineNumber: number,
    filePath: string
  ): DocumentReference[] {
    const references: DocumentReference[] = [];
    const baseName = path.basename(filename, '.md');

    // Markdown link patterns
    const markdownLinkPattern = new RegExp(`\\[([^\\]]+)\\]\\(([^\\)]*${filename}[^\\)]*)\\)`, 'g');
    let match;

    while ((match = markdownLinkPattern.exec(line)) !== null) {
      references.push({
        filePath,
        lineNumber,
        lineContent: line,
        referencedFile: filename,
        referenceType: 'markdown-link'
      });
    }

    // Relative path references
    if (line.includes(filename) || line.includes(baseName)) {
      const relativePaths = [
        new RegExp(`\\.\\/[^\\s]*${filename}`, 'g'),
        new RegExp(`\\.\\.\/[^\\s]*${filename}`, 'g'),
        new RegExp(`[^\\s]*\/${filename}`, 'g')
      ];

      for (const pattern of relativePaths) {
        pattern.lastIndex = 0;
        if (pattern.test(line)) {
          references.push({
            filePath,
            lineNumber,
            lineContent: line,
            referencedFile: filename,
            referenceType: 'relative-path'
          });
          break;
        }
      }
    }

    return references;
  }

  /**
   * Update references in files
   */
  private async updateReferences(
    references: DocumentReference[],
    operations: MigrationOperation[]
  ): Promise<string[]> {
    const updatedFiles = new Set<string>();
    const operationMap = new Map(operations.map(op => [op.originalFilename, op.newFilename]));

    // Group references by file
    const referencesByFile = new Map<string, DocumentReference[]>();
    for (const ref of references) {
      if (!referencesByFile.has(ref.filePath)) {
        referencesByFile.set(ref.filePath, []);
      }
      referencesByFile.get(ref.filePath)!.push(ref);
    }

    for (const [filePath, fileReferences] of referencesByFile) {
      try {
        let content = await fs.readFile(filePath, 'utf-8');
        let modified = false;

        for (const ref of fileReferences) {
          const newFilename = operationMap.get(ref.referencedFile);
          if (newFilename) {
            // Replace the old filename with the new one
            const oldPattern = new RegExp(
              ref.referencedFile.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'),
              'g'
            );
            const newContent = content.replace(oldPattern, newFilename);

            if (newContent !== content) {
              content = newContent;
              modified = true;
            }
          }
        }

        if (modified) {
          await fs.writeFile(filePath, content, 'utf-8');
          updatedFiles.add(filePath);
        }
      } catch (error) {
        // Continue with other files if one fails
        continue;
      }
    }

    return Array.from(updatedFiles);
  }

  /**
   * Create backup of files before migration
   */
  private async createBackup(operations: MigrationOperation[]): Promise<string> {
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const backupDir = this.config.backupDir || path.join(this.config.docsRoot, '.migration-backup');
    const backupPath = path.join(backupDir, `backup-${timestamp}`);

    await fs.ensureDir(backupPath);

    for (const operation of operations) {
      const relativePath = path.relative(this.config.docsRoot, operation.originalPath);
      const backupFilePath = path.join(backupPath, relativePath);

      await fs.ensureDir(path.dirname(backupFilePath));
      await fs.copy(operation.originalPath, backupFilePath);
    }

    return backupPath;
  }

  /**
   * Execute a single migration operation
   */
  private async executeOperation(operation: MigrationOperation): Promise<void> {
    // Ensure target directory exists
    await fs.ensureDir(path.dirname(operation.newPath));

    // Move the file
    await fs.move(operation.originalPath, operation.newPath);
  }

  /**
   * Rollback migration using backup
   */
  private async rollback(backupDirectory: string, operations: MigrationOperation[]): Promise<void> {
    for (const operation of operations) {
      const relativePath = path.relative(this.config.docsRoot, operation.originalPath);
      const backupFilePath = path.join(backupDirectory, relativePath);

      if (await fs.pathExists(backupFilePath)) {
        // Remove the new file if it exists
        if (await fs.pathExists(operation.newPath)) {
          await fs.remove(operation.newPath);
        }

        // Restore from backup
        await fs.move(backupFilePath, operation.originalPath);
      }
    }
  }

  /**
   * Validate migration safety
   */
  async validateMigration(): Promise<{ isValid: boolean; issues: string[] }> {
    const issues: string[] = [];

    try {
      const plan = await this.generateMigrationPlan();

      // Check for potential conflicts
      const newPaths = new Set<string>();
      for (const operation of plan.operations) {
        if (newPaths.has(operation.newPath)) {
          issues.push(`Duplicate target path: ${operation.newPath}`);
        }
        newPaths.add(operation.newPath);

        // Check if target already exists
        if (await fs.pathExists(operation.newPath)) {
          issues.push(`Target file already exists: ${operation.newPath}`);
        }
      }

      // Check for circular references or dependency issues
      if (this.config.updateReferences) {
        const references = await this.findAllReferences(plan.operations);
        if (references.length > 100) {
          issues.push(`Large number of references to update (${references.length}). Consider reviewing manually.`);
        }
      }

      return {
        isValid: issues.length === 0,
        issues
      };
    } catch (error) {
      issues.push(`Validation failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
      return { isValid: false, issues };
    }
  }
}

/**
 * Create a document migrator instance
 */
export function createDocumentMigrator(
  documentNamer: DocumentNamer,
  sequenceManager: SequenceManager,
  docsRoot: string,
  options?: { updateReferences?: boolean; backupDir?: string }
): DocumentMigrator {
  return new DocumentMigrator({
    documentNamer,
    sequenceManager,
    docsRoot,
    updateReferences: options?.updateReferences ?? true,
    backupDir: options?.backupDir
  });
}