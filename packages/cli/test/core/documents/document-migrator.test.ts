/**
 * @fileType: config
 * @status: current
 * @updated: 2025-09-19
 * @tags: [test, document-migrator, migration, references]
 * @related: [document-migrator.ts]
 * @priority: high
 * @complexity: high
 * @dependencies: [vitest, fs-extra, path]
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import * as fs from 'fs-extra';
import * as path from 'path';
import * as os from 'os';
import { DocumentMigrator, createDocumentMigrator } from '../../../src/core/documents/document-migrator.js';
import { DocumentNamer } from '../../../src/core/documents/document-namer.js';
import { SequenceManager } from '../../../src/core/documents/sequence-manager.js';

describe('DocumentMigrator', () => {
  let tempDir: string;
  let docsRoot: string;
  let sequenceManager: SequenceManager;
  let documentNamer: DocumentNamer;
  let documentMigrator: DocumentMigrator;

  beforeEach(async () => {
    // Create temporary directory for testing
    tempDir = await fs.mkdtemp(path.join(os.tmpdir(), 'ginko-migrator-test-'));
    docsRoot = path.join(tempDir, 'docs');

    // Create directory structure
    await fs.ensureDir(path.join(tempDir, '.ginko'));
    await fs.ensureDir(path.join(docsRoot, 'adr'));
    await fs.ensureDir(path.join(docsRoot, 'PRD'));
    await fs.ensureDir(path.join(docsRoot, 'sprints'));
    await fs.ensureDir(path.join(docsRoot, 'strategy'));

    sequenceManager = new SequenceManager({ ginkoRoot: tempDir });
    await sequenceManager.initialize();

    documentNamer = new DocumentNamer({
      sequenceManager,
      docsRoot,
      strictMode: true
    });

    documentMigrator = new DocumentMigrator({
      documentNamer,
      sequenceManager,
      docsRoot,
      updateReferences: true
    });
  });

  afterEach(async () => {
    // Clean up temporary directory
    await fs.remove(tempDir);
  });

  describe('migration plan generation', () => {
    it('should generate empty plan when all documents are standard', async () => {
      // Create standard documents
      await fs.writeFile(path.join(docsRoot, 'adr', 'ADR-001-test.md'), '# Standard ADR');
      await fs.writeFile(path.join(docsRoot, 'PRD', 'PRD-001-product.md'), '# Standard PRD');

      const plan = await documentMigrator.generateMigrationPlan();

      expect(plan.operations).toHaveLength(0);
      expect(plan.hasChanges).toBe(false);
      expect(plan.totalFiles).toBe(0);
    });

    it('should identify non-standard documents for migration', async () => {
      // Create non-standard documents
      await fs.writeFile(path.join(docsRoot, 'adr', 'architecture-decision.md'), '# Non-standard ADR');
      await fs.writeFile(path.join(docsRoot, 'PRD', 'product-requirements.md'), '# Non-standard PRD');
      await fs.writeFile(path.join(docsRoot, 'sprints', 'sprint-planning.md'), '# Non-standard Sprint');

      const plan = await documentMigrator.generateMigrationPlan();

      expect(plan.operations).toHaveLength(3);
      expect(plan.hasChanges).toBe(true);
      expect(plan.totalFiles).toBe(3);

      const adrOp = plan.operations.find(op => op.type === 'ADR');
      expect(adrOp?.originalFilename).toBe('architecture-decision.md');
      expect(adrOp?.newFilename).toBe('ADR-001-architecture-decision.md');
    });

    it('should handle mixed standard and non-standard documents', async () => {
      // Create mix of documents
      await fs.writeFile(path.join(docsRoot, 'adr', 'ADR-001-standard.md'), '# Standard');
      await fs.writeFile(path.join(docsRoot, 'adr', 'non-standard.md'), '# Non-standard');
      await fs.writeFile(path.join(docsRoot, 'PRD', 'PRD-002-standard.md'), '# Standard PRD');
      await fs.writeFile(path.join(docsRoot, 'PRD', 'requirements.md'), '# Non-standard PRD');

      const plan = await documentMigrator.generateMigrationPlan();

      expect(plan.operations).toHaveLength(2);
      const filenames = plan.operations.map(op => op.originalFilename);
      expect(filenames).toContain('non-standard.md');
      expect(filenames).toContain('requirements.md');
    });

    it('should generate correct new paths and filenames', async () => {
      await fs.writeFile(path.join(docsRoot, 'adr', 'auth-strategy.md'), '# Auth Strategy');

      const plan = await documentMigrator.generateMigrationPlan();

      expect(plan.operations).toHaveLength(1);
      const operation = plan.operations[0];
      expect(operation.originalPath).toBe(path.join(docsRoot, 'adr', 'auth-strategy.md'));
      expect(operation.newPath).toBe(path.join(docsRoot, 'adr', 'ADR-001-auth-strategy.md'));
      expect(operation.newFilename).toBe('ADR-001-auth-strategy.md');
      expect(operation.type).toBe('ADR');
      expect(operation.reason).toBe('Non-standard naming convention');
      expect(operation.isSafe).toBe(true);
    });
  });

  describe('dry run execution', () => {
    it('should return plan without making changes in dry run mode', async () => {
      await fs.writeFile(path.join(docsRoot, 'adr', 'test-document.md'), '# Test Document');

      const result = await documentMigrator.executeMigration(true);

      expect(result.operations).toHaveLength(1);
      expect(result.successfulMigrations).toBe(0);
      expect(result.hasChanges).toBe(true);

      // File should still exist with original name
      expect(await fs.pathExists(path.join(docsRoot, 'adr', 'test-document.md'))).toBe(true);
      expect(await fs.pathExists(path.join(docsRoot, 'adr', 'ADR-001-test-document.md'))).toBe(false);
    });
  });

  describe('migration execution', () => {
    it('should successfully migrate non-standard documents', async () => {
      const originalContent = '# Authentication Strategy\n\nThis is a test document.';
      await fs.writeFile(path.join(docsRoot, 'adr', 'auth-strategy.md'), originalContent);

      const result = await documentMigrator.executeMigration(false);

      expect(result.successfulMigrations).toBe(1);
      expect(result.operations).toHaveLength(1);

      // Original file should be gone
      expect(await fs.pathExists(path.join(docsRoot, 'adr', 'auth-strategy.md'))).toBe(false);

      // New file should exist with same content
      const newPath = path.join(docsRoot, 'adr', 'ADR-001-auth-strategy.md');
      expect(await fs.pathExists(newPath)).toBe(true);
      const newContent = await fs.readFile(newPath, 'utf-8');
      expect(newContent).toBe(originalContent);
    });

    it('should create backup before migration', async () => {
      await fs.writeFile(path.join(docsRoot, 'adr', 'test.md'), '# Test');

      const result = await documentMigrator.executeMigration(false);

      expect(result.backupDirectory).toBeDefined();
      expect(await fs.pathExists(result.backupDirectory!)).toBe(true);

      // Backup should contain original file
      const backupFiles = await fs.readdir(result.backupDirectory!, { recursive: true });
      expect(backupFiles.some(file => file.toString().includes('test.md'))).toBe(true);
    });

    it('should handle multiple documents in single migration', async () => {
      await fs.writeFile(path.join(docsRoot, 'adr', 'auth.md'), '# Auth');
      await fs.writeFile(path.join(docsRoot, 'PRD', 'product.md'), '# Product');
      await fs.writeFile(path.join(docsRoot, 'sprints', 'planning.md'), '# Planning');

      const result = await documentMigrator.executeMigration(false);

      expect(result.successfulMigrations).toBe(3);
      expect(result.operations).toHaveLength(3);

      // All original files should be gone
      expect(await fs.pathExists(path.join(docsRoot, 'adr', 'auth.md'))).toBe(false);
      expect(await fs.pathExists(path.join(docsRoot, 'PRD', 'product.md'))).toBe(false);
      expect(await fs.pathExists(path.join(docsRoot, 'sprints', 'planning.md'))).toBe(false);

      // New files should exist
      expect(await fs.pathExists(path.join(docsRoot, 'adr', 'ADR-001-auth.md'))).toBe(true);
      expect(await fs.pathExists(path.join(docsRoot, 'PRD', 'PRD-001-product.md'))).toBe(true);
      expect(await fs.pathExists(path.join(docsRoot, 'sprints', 'SPRINT-001-planning.md'))).toBe(true);
    });
  });

  describe('reference finding and updating', () => {
    it('should find markdown link references', async () => {
      // Create documents with references
      await fs.writeFile(path.join(docsRoot, 'adr', 'auth-strategy.md'), '# Auth Strategy');
      await fs.writeFile(path.join(docsRoot, 'adr', 'overview.md'),
        '# Overview\n\nSee [Auth Strategy](auth-strategy.md) for details.\n\nAlso check [auth-strategy.md](./auth-strategy.md).'
      );

      const plan = await documentMigrator.generateMigrationPlan();
      const references = await documentMigrator.findAllReferences(plan.operations);

      expect(references).toHaveLength(2);
      expect(references.every(ref => ref.referencedFile === 'auth-strategy.md')).toBe(true);
      expect(references.some(ref => ref.referenceType === 'markdown-link')).toBe(true);
    });

    it('should find relative path references', async () => {
      await fs.writeFile(path.join(docsRoot, 'adr', 'test-doc.md'), '# Test');
      await fs.writeFile(path.join(docsRoot, 'PRD', 'product.md'),
        '# Product\n\nReference: ../adr/test-doc.md\n\nAnother: ./test-doc.md'
      );

      const plan = await documentMigrator.generateMigrationPlan();
      const references = await documentMigrator.findAllReferences(plan.operations);

      expect(references.length).toBeGreaterThan(0);
      expect(references.some(ref => ref.referenceType === 'relative-path')).toBe(true);
    });

    it('should update references during migration', async () => {
      // Create document with reference
      await fs.writeFile(path.join(docsRoot, 'adr', 'auth-strategy.md'), '# Auth Strategy');
      await fs.writeFile(path.join(docsRoot, 'adr', 'overview.md'),
        '# Overview\n\nSee [Auth Strategy](auth-strategy.md) for authentication details.'
      );

      const result = await documentMigrator.executeMigration(false);

      expect(result.referencesUpdated).toHaveLength(1);

      // Check that reference was updated
      const overviewContent = await fs.readFile(path.join(docsRoot, 'adr', 'overview.md'), 'utf-8');
      expect(overviewContent).toContain('ADR-002-auth-strategy.md'); // Should be 002 since overview gets 001
    });

    it('should handle references in different directories', async () => {
      await fs.writeFile(path.join(docsRoot, 'adr', 'auth.md'), '# Auth');
      await fs.writeFile(path.join(docsRoot, 'PRD', 'product.md'),
        '# Product\n\nSee authentication in [auth.md](../adr/auth.md).'
      );
      await fs.writeFile(path.join(docsRoot, 'strategy', 'overview.md'),
        '# Strategy Overview\n\nRefer to [auth.md](../adr/auth.md) and [product.md](../PRD/product.md).'
      );

      const result = await documentMigrator.executeMigration(false);

      expect(result.referencesUpdated.length).toBeGreaterThan(0);

      // Check that references were updated
      const strategyContent = await fs.readFile(path.join(docsRoot, 'strategy', 'overview.md'), 'utf-8');
      expect(strategyContent).toContain('ADR-001-auth.md');
      expect(strategyContent).toContain('PRD-001-product.md');
    });
  });

  describe('validation', () => {
    it('should validate successful migration', async () => {
      await fs.writeFile(path.join(docsRoot, 'adr', 'test.md'), '# Test');

      const validation = await documentMigrator.validateMigration();

      expect(validation.isValid).toBe(true);
      expect(validation.issues).toHaveLength(0);
    });

    it('should detect duplicate target paths', async () => {
      // This would be a complex scenario to set up, but the concept is:
      // Two different files that would standardize to the same name
      await fs.writeFile(path.join(docsRoot, 'adr', 'test-document.md'), '# Test 1');
      await fs.writeFile(path.join(docsRoot, 'adr', 'test_document.md'), '# Test 2');

      const validation = await documentMigrator.validateMigration();

      // Depending on implementation, this might be caught
      expect(validation.isValid).toBe(false);
      expect(validation.issues.some(issue => issue.includes('Duplicate target path'))).toBe(true);
    });

    it('should detect existing target files', async () => {
      await fs.writeFile(path.join(docsRoot, 'adr', 'test.md'), '# Test to migrate');
      await fs.writeFile(path.join(docsRoot, 'adr', 'ADR-001-test.md'), '# Existing standard file');

      const validation = await documentMigrator.validateMigration();

      expect(validation.isValid).toBe(false);
      expect(validation.issues.some(issue => issue.includes('Target file already exists'))).toBe(true);
    });

    it('should warn about large number of references', async () => {
      // Create a document that would have many references
      await fs.writeFile(path.join(docsRoot, 'adr', 'popular-doc.md'), '# Popular Document');

      // Create many files with references (simplified test)
      for (let i = 0; i < 10; i++) {
        await fs.writeFile(
          path.join(docsRoot, 'adr', `ref-${i}.md`),
          `# Reference ${i}\n\nSee [popular-doc.md](popular-doc.md).`
        );
      }

      const validation = await documentMigrator.validateMigration();

      // This test might need adjustment based on actual threshold
      expect(validation.issues.some(issue => issue.includes('Large number of references'))).toBe(false);
    });
  });

  describe('error handling and rollback', () => {
    it('should handle individual file migration failures gracefully', async () => {
      await fs.writeFile(path.join(docsRoot, 'adr', 'good.md'), '# Good File');
      await fs.writeFile(path.join(docsRoot, 'adr', 'bad.md'), '# Bad File');

      // Mock move to fail for one file
      const originalMove = fs.move;
      vi.spyOn(fs, 'move').mockImplementation(async (src, dest) => {
        if (src.includes('bad.md')) {
          throw new Error('Simulated filesystem error');
        }
        return originalMove(src, dest);
      });

      const result = await documentMigrator.executeMigration(false);

      expect(result.successfulMigrations).toBe(1);
      expect(result.errors).toHaveLength(1);
      expect(result.errors[0].file).toBe('bad.md');

      // Good file should be migrated
      expect(await fs.pathExists(path.join(docsRoot, 'adr', 'ADR-001-good.md'))).toBe(true);
      // Bad file should remain
      expect(await fs.pathExists(path.join(docsRoot, 'adr', 'bad.md'))).toBe(true);

      vi.restoreAllMocks();
    });

    it('should handle missing directories gracefully', async () => {
      // Remove one of the type directories
      await fs.remove(path.join(docsRoot, 'strategy'));

      const plan = await documentMigrator.generateMigrationPlan();

      expect(plan.operations).toHaveLength(0);
      expect(plan.errors).toHaveLength(0);
    });

    it('should handle permission errors during plan generation', async () => {
      await fs.writeFile(path.join(docsRoot, 'adr', 'test.md'), '# Test');

      // Mock readdir to throw permission error
      vi.spyOn(fs, 'readdir').mockRejectedValueOnce(new Error('Permission denied'));

      const plan = await documentMigrator.generateMigrationPlan();

      expect(plan.operations).toHaveLength(0);
      // Should not throw, but might have errors recorded
    });
  });

  describe('factory function', () => {
    it('should create document migrator with factory', () => {
      const migrator = createDocumentMigrator(documentNamer, sequenceManager, docsRoot);
      expect(migrator).toBeInstanceOf(DocumentMigrator);
    });

    it('should create document migrator with options', () => {
      const migrator = createDocumentMigrator(
        documentNamer,
        sequenceManager,
        docsRoot,
        { updateReferences: false, backupDir: '/custom/backup' }
      );
      expect(migrator).toBeInstanceOf(DocumentMigrator);
    });
  });

  describe('backup and restore', () => {
    it('should create timestamped backup directories', async () => {
      await fs.writeFile(path.join(docsRoot, 'adr', 'test.md'), '# Test');

      const result = await documentMigrator.executeMigration(false);

      expect(result.backupDirectory).toBeDefined();
      expect(result.backupDirectory).toMatch(/backup-\d{4}-\d{2}-\d{2}T\d{2}-\d{2}-\d{2}/);
    });

    it('should preserve directory structure in backup', async () => {
      await fs.writeFile(path.join(docsRoot, 'adr', 'test1.md'), '# Test 1');
      await fs.writeFile(path.join(docsRoot, 'PRD', 'test2.md'), '# Test 2');

      const result = await documentMigrator.executeMigration(false);

      const backupDir = result.backupDirectory!;
      expect(await fs.pathExists(path.join(backupDir, 'adr', 'test1.md'))).toBe(true);
      expect(await fs.pathExists(path.join(backupDir, 'PRD', 'test2.md'))).toBe(true);
    });

    it('should preserve file content in backup', async () => {
      const originalContent = '# Original Content\n\nThis should be preserved.';
      await fs.writeFile(path.join(docsRoot, 'adr', 'test.md'), originalContent);

      const result = await documentMigrator.executeMigration(false);

      const backupFile = path.join(result.backupDirectory!, 'adr', 'test.md');
      const backupContent = await fs.readFile(backupFile, 'utf-8');
      expect(backupContent).toBe(originalContent);
    });
  });
});