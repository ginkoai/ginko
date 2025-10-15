/**
 * @fileType: utility
 * @status: current
 * @updated: 2025-09-19
 * @tags: [document, naming, convention, sanitization]
 * @related: [sequence-manager.ts, document-migrator.ts]
 * @priority: high
 * @complexity: medium
 * @dependencies: [path]
 */

import * as path from 'path';
import { DocumentType, SequenceManager } from './sequence-manager.js';

/**
 * Configuration for document naming
 */
export interface DocumentNamerConfig {
  /** Sequence manager for number allocation */
  sequenceManager: SequenceManager;
  /** Base directory for documents */
  docsRoot: string;
  /** Whether to enforce strict naming conventions */
  strictMode?: boolean;
}

/**
 * Result of a name generation operation
 */
export interface NameGenerationResult {
  /** The generated filename */
  filename: string;
  /** The full path to the document */
  fullPath: string;
  /** The sequence number used */
  sequenceNumber: number;
  /** Whether the name was adjusted for uniqueness */
  wasAdjusted: boolean;
  /** Original description if adjusted */
  originalDescription?: string;
}

/**
 * Options for generating document names
 */
export interface GenerateNameOptions {
  /** Document type */
  type: DocumentType;
  /** Description for the document */
  description: string;
  /** Whether to check for existing files and adjust if needed */
  ensureUnique?: boolean;
  /** Custom sequence number (overrides auto-increment) */
  customSequence?: number;
}

/**
 * Generates standardized document names following TYPE-###-description.md convention.
 * Handles sanitization, collision detection, and ensures naming consistency.
 */
export class DocumentNamer {
  private config: DocumentNamerConfig;

  constructor(config: DocumentNamerConfig) {
    this.config = config;
  }

  /**
   * Generate a standardized document name
   */
  async generateName(options: GenerateNameOptions): Promise<NameGenerationResult> {
    const { type, description, ensureUnique = true, customSequence } = options;

    // Validate inputs
    this.validateDocumentType(type);
    this.validateDescription(description);

    // Get sequence number
    const sequenceNumber = customSequence !== undefined
      ? customSequence
      : await this.config.sequenceManager.getNext(type);

    // Sanitize description
    const sanitizedDescription = this.sanitizeDescription(description);

    // Generate base filename
    const baseFilename = this.formatFilename(type, sequenceNumber, sanitizedDescription);

    let finalFilename = baseFilename;
    let wasAdjusted = false;
    let originalDescription: string | undefined;

    // Check for uniqueness if required
    if (ensureUnique) {
      const adjustmentResult = await this.ensureUniqueness(type, baseFilename, sanitizedDescription, sequenceNumber);
      finalFilename = adjustmentResult.filename;
      wasAdjusted = adjustmentResult.wasAdjusted;
      originalDescription = adjustmentResult.originalDescription;
    }

    // Generate full path
    const fullPath = this.getFullPath(type, finalFilename);

    return {
      filename: finalFilename,
      fullPath,
      sequenceNumber,
      wasAdjusted,
      originalDescription
    };
  }

  /**
   * Parse an existing document name to extract components
   */
  parseDocumentName(filename: string): { type: DocumentType; sequence: number; description: string } | null {
    const match = filename.match(/^(ADR|PRD|SPRINT|STRATEGY)-(\d{3})-(.+)\.md$/);

    if (!match) {
      return null;
    }

    return {
      type: match[1] as DocumentType,
      sequence: parseInt(match[2], 10),
      description: match[3]
    };
  }

  /**
   * Check if a filename follows the standard naming convention
   */
  isStandardName(filename: string): boolean {
    return this.parseDocumentName(filename) !== null;
  }

  /**
   * Generate a standard name from a non-standard filename
   */
  async standardizeName(type: DocumentType, originalFilename: string): Promise<NameGenerationResult> {
    // Extract description from original filename
    const baseName = path.basename(originalFilename, '.md');

    // Try to extract meaningful description
    let description = baseName;

    // Remove common prefixes that might exist
    const prefixPatterns = [
      new RegExp(`^${type}-?`, 'i'),
      /^\d+-/,
      /^[a-z]+-\d+-/i
    ];

    for (const pattern of prefixPatterns) {
      description = description.replace(pattern, '');
    }

    // Clean up the description
    description = description
      .replace(/[-_]+/g, ' ')
      .trim();

    if (!description) {
      description = 'untitled';
    }

    return this.generateName({
      type,
      description,
      ensureUnique: true
    });
  }

  /**
   * Get the full path for a document type and filename
   */
  getFullPath(type: DocumentType, filename: string): string {
    const typeDirectories: Record<DocumentType, string> = {
      'ADR': 'adr',
      'PRD': 'PRD',
      'SPRINT': 'sprints',
      'STRATEGY': 'strategy'
    };

    const subDir = typeDirectories[type];
    return path.join(this.config.docsRoot, subDir, filename);
  }

  /**
   * Get the directory path for a document type
   */
  getTypeDirectory(type: DocumentType): string {
    const typeDirectories: Record<DocumentType, string> = {
      'ADR': 'adr',
      'PRD': 'PRD',
      'SPRINT': 'sprints',
      'STRATEGY': 'strategy'
    };

    return path.join(this.config.docsRoot, typeDirectories[type]);
  }

  /**
   * Validate document type
   */
  private validateDocumentType(type: string): asserts type is DocumentType {
    const validTypes: DocumentType[] = ['ADR', 'PRD', 'SPRINT', 'STRATEGY'];
    if (!validTypes.includes(type as DocumentType)) {
      throw new Error(`Invalid document type: ${type}. Valid types are: ${validTypes.join(', ')}`);
    }
  }

  /**
   * Validate description
   */
  private validateDescription(description: string): void {
    if (!description || typeof description !== 'string') {
      throw new Error('Description is required and must be a string');
    }

    if (description.trim().length === 0) {
      throw new Error('Description cannot be empty');
    }

    if (description.length > 100) {
      throw new Error('Description too long (max 100 characters)');
    }

    // Check for invalid characters that could cause filesystem issues
    const invalidChars = /[<>:"|?*\x00-\x1f]/;
    if (invalidChars.test(description)) {
      throw new Error('Description contains invalid characters');
    }
  }

  /**
   * Sanitize description for use in filename
   */
  private sanitizeDescription(description: string): string {
    return description
      .toLowerCase()
      .trim()
      // Replace spaces and underscores with hyphens
      .replace(/[\s_]+/g, '-')
      // Replace multiple hyphens with single hyphen
      .replace(/-+/g, '-')
      // Remove non-alphanumeric characters except hyphens
      .replace(/[^a-z0-9-]/g, '')
      // Remove leading and trailing hyphens
      .replace(/^-+|-+$/g, '')
      // Ensure we have something left
      || 'untitled';
  }

  /**
   * Format the complete filename
   */
  private formatFilename(type: DocumentType, sequence: number, description: string): string {
    const paddedSequence = sequence.toString().padStart(3, '0');
    return `${type}-${paddedSequence}-${description}.md`;
  }

  /**
   * Ensure filename uniqueness by checking filesystem and adjusting if needed
   */
  private async ensureUniqueness(
    type: DocumentType,
    baseFilename: string,
    sanitizedDescription: string,
    sequenceNumber: number
  ): Promise<{ filename: string; wasAdjusted: boolean; originalDescription?: string }> {
    const fs = await import('fs-extra');
    const fullPath = this.getFullPath(type, baseFilename);

    // If file doesn't exist, we're good
    if (!await fs.pathExists(fullPath)) {
      return { filename: baseFilename, wasAdjusted: false };
    }

    // File exists, need to adjust
    let attempt = 1;
    let adjustedFilename: string;
    let adjustedPath: string;

    do {
      const adjustedDescription = `${sanitizedDescription}-${attempt}`;
      adjustedFilename = this.formatFilename(type, sequenceNumber, adjustedDescription);
      adjustedPath = this.getFullPath(type, adjustedFilename);
      attempt++;
    } while (await fs.pathExists(adjustedPath) && attempt <= 100);

    if (attempt > 100) {
      throw new Error(`Could not generate unique filename for ${baseFilename} after 100 attempts`);
    }

    return {
      filename: adjustedFilename,
      wasAdjusted: true,
      originalDescription: sanitizedDescription
    };
  }
}

/**
 * Create a document namer instance
 */
export function createDocumentNamer(sequenceManager: SequenceManager, docsRoot: string): DocumentNamer {
  return new DocumentNamer({
    sequenceManager,
    docsRoot,
    strictMode: true
  });
}