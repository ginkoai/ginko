/**
 * @fileType: utility
 * @status: current
 * @updated: 2025-09-19
 * @tags: [document, sequence, numbering, persistence]
 * @related: [document-namer.ts, document-migrator.ts]
 * @priority: high
 * @complexity: medium
 * @dependencies: [fs-extra, path]
 */

import * as fs from 'fs-extra';
import * as path from 'path';

/**
 * Document types supported by the ginko system
 */
export type DocumentType = 'ADR' | 'PRD' | 'SPRINT' | 'STRATEGY';

/**
 * Interface for sequence data storage
 */
export interface SequenceData {
  version: string;
  sequences: Record<DocumentType, number>;
  lastUpdated: string;
}

/**
 * Configuration for the sequence manager
 */
export interface SequenceManagerConfig {
  /** Directory where .ginko folder is located */
  ginkoRoot: string;
  /** Custom starting numbers for document types */
  startingNumbers?: Partial<Record<DocumentType, number>>;
}

/**
 * Manages document sequence numbers for consistent naming convention.
 * Ensures thread-safe allocation and persistent storage of document numbers.
 */
export class SequenceManager {
  private readonly sequencePath: string;
  private readonly lockPath: string;
  private data: SequenceData;
  private config: SequenceManagerConfig;

  constructor(config: SequenceManagerConfig) {
    this.config = config;
    this.sequencePath = path.join(config.ginkoRoot, '.ginko', 'sequences.json');
    this.lockPath = path.join(config.ginkoRoot, '.ginko', 'sequences.lock');
    this.data = this.getDefaultData();
  }

  /**
   * Initialize the sequence manager by loading existing data or creating defaults
   */
  async initialize(): Promise<void> {
    try {
      await fs.ensureDir(path.dirname(this.sequencePath));

      if (await fs.pathExists(this.sequencePath)) {
        await this.loadSequenceData();
      } else {
        await this.scanExistingDocuments();
        await this.saveSequenceData();
      }
    } catch (error) {
      throw new Error(`Failed to initialize SequenceManager: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Get the next sequence number for a document type
   */
  async getNext(type: DocumentType): Promise<number> {
    await this.acquireLock();

    try {
      await this.loadSequenceData();
      const nextNumber = this.data.sequences[type];
      this.data.sequences[type]++;
      this.data.lastUpdated = new Date().toISOString();
      await this.saveSequenceData();

      return nextNumber;
    } finally {
      await this.releaseLock();
    }
  }

  /**
   * Get the current sequence number for a document type without incrementing
   */
  async getCurrent(type: DocumentType): Promise<number> {
    await this.loadSequenceData();
    return this.data.sequences[type] - 1;
  }

  /**
   * Set a specific sequence number for a document type
   */
  async setSequence(type: DocumentType, number: number): Promise<void> {
    if (number < 1) {
      throw new Error(`Sequence number must be positive, got: ${number}`);
    }

    await this.acquireLock();

    try {
      await this.loadSequenceData();
      this.data.sequences[type] = number;
      this.data.lastUpdated = new Date().toISOString();
      await this.saveSequenceData();
    } finally {
      await this.releaseLock();
    }
  }

  /**
   * Reset sequences based on existing documents in the filesystem
   */
  async rescanDocuments(): Promise<void> {
    await this.acquireLock();

    try {
      await this.scanExistingDocuments();
      await this.saveSequenceData();
    } finally {
      await this.releaseLock();
    }
  }

  /**
   * Get all current sequence numbers
   */
  async getAllSequences(): Promise<Record<DocumentType, number>> {
    await this.loadSequenceData();
    return { ...this.data.sequences };
  }

  /**
   * Load sequence data from persistent storage
   */
  private async loadSequenceData(): Promise<void> {
    try {
      if (await fs.pathExists(this.sequencePath)) {
        const content = await fs.readJson(this.sequencePath);
        this.data = this.validateSequenceData(content);
      }
    } catch (error) {
      // If we can't load, fall back to scanning documents
      await this.scanExistingDocuments();
    }
  }

  /**
   * Save sequence data to persistent storage
   */
  private async saveSequenceData(): Promise<void> {
    await fs.writeJson(this.sequencePath, this.data, { spaces: 2 });
  }

  /**
   * Scan existing documents to determine current sequence numbers
   */
  private async scanExistingDocuments(): Promise<void> {
    const docsPath = path.join(this.config.ginkoRoot, 'docs');
    const typeDirectories: Record<DocumentType, string> = {
      'ADR': path.join(docsPath, 'adr'),
      'PRD': path.join(docsPath, 'PRD'),
      'SPRINT': path.join(docsPath, 'sprints'),
      'STRATEGY': path.join(docsPath, 'strategy')
    };

    for (const [type, dirPath] of Object.entries(typeDirectories) as [DocumentType, string][]) {
      let maxNumber = this.config.startingNumbers?.[type] || 1;

      if (await fs.pathExists(dirPath)) {
        const files = await fs.readdir(dirPath);

        for (const file of files) {
          if (file.endsWith('.md')) {
            const match = file.match(new RegExp(`^${type}-(\\d{3})-`));
            if (match) {
              const number = parseInt(match[1], 10);
              maxNumber = Math.max(maxNumber, number + 1);
            }
          }
        }
      }

      this.data.sequences[type] = maxNumber;
    }

    this.data.lastUpdated = new Date().toISOString();
  }

  /**
   * Acquire a lock for thread-safe operations
   */
  private async acquireLock(): Promise<void> {
    let attempts = 0;
    const maxAttempts = 100;
    const retryDelay = 50; // milliseconds

    while (attempts < maxAttempts) {
      try {
        await fs.writeFile(this.lockPath, process.pid.toString(), { flag: 'wx' });
        return;
      } catch (error) {
        attempts++;
        if (attempts >= maxAttempts) {
          throw new Error('Failed to acquire sequence lock after maximum attempts');
        }
        await this.delay(retryDelay);
      }
    }
  }

  /**
   * Release the lock
   */
  private async releaseLock(): Promise<void> {
    try {
      await fs.remove(this.lockPath);
    } catch (error) {
      // Lock file might not exist, which is ok
    }
  }

  /**
   * Simple delay utility
   */
  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * Get default sequence data
   */
  private getDefaultData(): SequenceData {
    return {
      version: '1.0.0',
      sequences: {
        'ADR': this.config.startingNumbers?.ADR || 1,
        'PRD': this.config.startingNumbers?.PRD || 1,
        'SPRINT': this.config.startingNumbers?.SPRINT || 1,
        'STRATEGY': this.config.startingNumbers?.STRATEGY || 1
      },
      lastUpdated: new Date().toISOString()
    };
  }

  /**
   * Validate and migrate sequence data from storage
   */
  private validateSequenceData(data: any): SequenceData {
    const defaultData = this.getDefaultData();

    if (!data || typeof data !== 'object') {
      return defaultData;
    }

    return {
      version: data.version || defaultData.version,
      sequences: {
        'ADR': this.validateSequenceNumber(data.sequences?.ADR, defaultData.sequences.ADR),
        'PRD': this.validateSequenceNumber(data.sequences?.PRD, defaultData.sequences.PRD),
        'SPRINT': this.validateSequenceNumber(data.sequences?.SPRINT, defaultData.sequences.SPRINT),
        'STRATEGY': this.validateSequenceNumber(data.sequences?.STRATEGY, defaultData.sequences.STRATEGY)
      },
      lastUpdated: data.lastUpdated || defaultData.lastUpdated
    };
  }

  /**
   * Validate a sequence number
   */
  private validateSequenceNumber(value: any, defaultValue: number): number {
    if (typeof value === 'number' && value >= 1 && Number.isInteger(value)) {
      return value;
    }
    return defaultValue;
  }
}

/**
 * Create a sequence manager instance with default configuration
 */
export function createSequenceManager(ginkoRoot: string, startingNumbers?: Partial<Record<DocumentType, number>>): SequenceManager {
  return new SequenceManager({ ginkoRoot, startingNumbers });
}