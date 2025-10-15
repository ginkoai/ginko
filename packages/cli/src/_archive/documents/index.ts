/**
 * @fileType: config
 * @status: current
 * @updated: 2025-09-19
 * @tags: [document, management, export, api]
 * @related: [sequence-manager.ts, document-namer.ts, document-migrator.ts]
 * @priority: high
 * @complexity: low
 * @dependencies: [all document management components]
 */

// Core components
export {
  SequenceManager,
  DocumentType,
  SequenceData,
  SequenceManagerConfig,
  createSequenceManager
} from './sequence-manager.js';

export {
  DocumentNamer,
  DocumentNamerConfig,
  NameGenerationResult,
  GenerateNameOptions,
  createDocumentNamer
} from './document-namer.js';

export {
  DocumentMigrator,
  DocumentMigratorConfig,
  MigrationOperation,
  MigrationResult,
  DocumentReference,
  createDocumentMigrator
} from './document-migrator.js';

// Convenience factory for complete document management system
import { SequenceManager, createSequenceManager } from './sequence-manager.js';
import { DocumentNamer, createDocumentNamer } from './document-namer.js';
import { DocumentMigrator, createDocumentMigrator } from './document-migrator.js';

/**
 * Configuration for the complete document management system
 */
export interface DocumentManagementConfig {
  /** Root directory of the ginko project */
  ginkoRoot: string;
  /** Root directory containing docs */
  docsRoot?: string;
  /** Whether to update references during migration */
  updateReferences?: boolean;
  /** Custom backup directory for migrations */
  backupDir?: string;
  /** Custom starting numbers for document types */
  startingNumbers?: Partial<Record<import('./sequence-manager.js').DocumentType, number>>;
}

/**
 * Complete document management system with all components
 */
export interface DocumentManagementSystem {
  /** Sequence manager for tracking document numbers */
  sequenceManager: SequenceManager;
  /** Document namer for generating standardized names */
  documentNamer: DocumentNamer;
  /** Document migrator for renaming existing documents */
  documentMigrator: DocumentMigrator;
  /** Initialize the entire system */
  initialize: () => Promise<void>;
}

/**
 * Create a complete document management system with all components configured
 */
export async function createDocumentManagementSystem(
  config: DocumentManagementConfig
): Promise<DocumentManagementSystem> {
  const docsRoot = config.docsRoot || `${config.ginkoRoot}/docs`;

  // Create sequence manager
  const sequenceManager = createSequenceManager(config.ginkoRoot, config.startingNumbers);

  // Create document namer
  const documentNamer = createDocumentNamer(sequenceManager, docsRoot);

  // Create document migrator
  const documentMigrator = createDocumentMigrator(
    documentNamer,
    sequenceManager,
    docsRoot,
    {
      updateReferences: config.updateReferences ?? true,
      backupDir: config.backupDir
    }
  );

  return {
    sequenceManager,
    documentNamer,
    documentMigrator,
    initialize: async () => {
      await sequenceManager.initialize();
    }
  };
}

/**
 * Quick factory for basic document naming without migration
 */
export async function createBasicDocumentNamer(ginkoRoot: string): Promise<{
  namer: DocumentNamer;
  sequenceManager: SequenceManager;
}> {
  const docsRoot = `${ginkoRoot}/docs`;
  const sequenceManager = createSequenceManager(ginkoRoot);
  await sequenceManager.initialize();

  const namer = createDocumentNamer(sequenceManager, docsRoot);

  return { namer, sequenceManager };
}

/**
 * Utility function to validate document naming compliance across project
 */
export async function validateDocumentNaming(ginkoRoot: string): Promise<{
  isCompliant: boolean;
  nonCompliantFiles: string[];
  issues: string[];
}> {
  const { documentMigrator } = await createDocumentManagementSystem({ ginkoRoot });

  try {
    const migrationPlan = await documentMigrator.generateMigrationPlan();
    const validation = await documentMigrator.validateMigration();

    return {
      isCompliant: migrationPlan.operations.length === 0 && validation.isValid,
      nonCompliantFiles: migrationPlan.operations.map(op => op.originalFilename),
      issues: validation.issues
    };
  } catch (error) {
    return {
      isCompliant: false,
      nonCompliantFiles: [],
      issues: [`Validation failed: ${error instanceof Error ? error.message : 'Unknown error'}`]
    };
  }
}

/**
 * Utility function to standardize all documents in a project
 */
export async function standardizeProjectDocuments(
  ginkoRoot: string,
  options?: {
    dryRun?: boolean;
    updateReferences?: boolean;
    backupDir?: string;
  }
): Promise<import('./document-migrator.js').MigrationResult> {
  const { documentMigrator } = await createDocumentManagementSystem({
    ginkoRoot,
    updateReferences: options?.updateReferences,
    backupDir: options?.backupDir
  });

  return documentMigrator.executeMigration(options?.dryRun ?? false);
}
n// Import enhanced utilities for factory functions
import { DocumentManager } from "./document-manager.js";
import { MarkdownProcessor } from "./markdown-processor.js";
import { DocumentFileSystem } from "./file-system.js";
import { TemplateEngine } from "./template-engine.js";
// Enhanced Document Management Utilities (2025-09-22)
export { DocumentManager } from './document-manager.js';
export { MarkdownProcessor } from './markdown-processor.js';
export { DocumentFileSystem } from './file-system.js';
export { TemplateEngine } from './template-engine.js';

// Re-export enhanced types
export type {
  Document,
  DocumentFormat,
  DocumentMetadata,
  MarkdownFrontmatter,
  DocumentResult,
  BatchDocumentResult,
  DocumentSearchCriteria,
  DocumentOptions,
  DocumentTemplate,
  TemplateVariables,
  FileOperation,
  FileOperationResult
} from '../../types/documents.js';

/**
 * Enhanced factory function to get complete document manager with all capabilities
 */
export function createEnhancedDocumentManager() {
  return DocumentManager.getInstance();
}

/**
 * Enhanced factory function to get markdown processor
 */
export function createMarkdownProcessor() {
  return MarkdownProcessor.getInstance();
}

/**
 * Enhanced factory function to get file system utilities
 */
export function createDocumentFileSystem() {
  return DocumentFileSystem.getInstance();
}

/**
 * Enhanced factory function to get template engine
 */
export function createTemplateEngine() {
  return TemplateEngine.getInstance();
}
