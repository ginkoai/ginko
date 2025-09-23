/**
 * @fileType: config
 * @status: current
 * @updated: 2025-09-19
 * @tags: [test, document-management, integration, api]
 * @related: [index.ts]
 * @priority: high
 * @complexity: medium
 * @dependencies: [vitest, fs-extra, path]
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import * as fs from 'fs-extra';
import * as path from 'path';
import * as os from 'os';
import {
  createDocumentManagementSystem,
  createBasicDocumentNamer,
  validateDocumentNaming,
  standardizeProjectDocuments,
  DocumentManagementSystem
} from '../../../src/core/documents/index.js';

describe('Document Management System Integration', () => {
  let tempDir: string;
  let ginkoRoot: string;
  let docsRoot: string;

  beforeEach(async () => {
    // Create temporary directory for testing
    tempDir = await fs.mkdtemp(path.join(os.tmpdir(), 'ginko-integration-test-'));
    ginkoRoot = tempDir;
    docsRoot = path.join(ginkoRoot, 'docs');

    // Create directory structure
    await fs.ensureDir(path.join(ginkoRoot, '.ginko'));
    await fs.ensureDir(path.join(docsRoot, 'adr'));
    await fs.ensureDir(path.join(docsRoot, 'PRD'));
    await fs.ensureDir(path.join(docsRoot, 'sprints'));
    await fs.ensureDir(path.join(docsRoot, 'strategy'));
  });

  afterEach(async () => {
    // Clean up temporary directory
    await fs.remove(tempDir);
  });

  describe('createDocumentManagementSystem', () => {
    it('should create complete system with all components', async () => {
      const system = await createDocumentManagementSystem({ ginkoRoot });

      expect(system.sequenceManager).toBeDefined();
      expect(system.documentNamer).toBeDefined();
      expect(system.documentMigrator).toBeDefined();
      expect(system.initialize).toBeDefined();
    });

    it('should create system with custom configuration', async () => {
      const customDocsRoot = path.join(ginkoRoot, 'custom-docs');
      await fs.ensureDir(path.join(customDocsRoot, 'adr'));

      const system = await createDocumentManagementSystem({
        ginkoRoot,
        docsRoot: customDocsRoot,
        updateReferences: false,
        startingNumbers: { ADR: 100 }
      });

      await system.initialize();

      const sequences = await system.sequenceManager.getAllSequences();
      expect(sequences.ADR).toBe(100);
    });

    it('should initialize all components correctly', async () => {
      const system = await createDocumentManagementSystem({ ginkoRoot });

      // Should not throw
      await system.initialize();

      // Should be able to use components
      const result = await system.documentNamer.generateName({
        type: 'ADR',
        description: 'test document',
        ensureUnique: false
      });

      expect(result.filename).toBe('ADR-001-test-document.md');
    });
  });

  describe('createBasicDocumentNamer', () => {
    it('should create basic namer with sequence manager', async () => {
      const { namer, sequenceManager } = await createBasicDocumentNamer(ginkoRoot);

      expect(namer).toBeDefined();
      expect(sequenceManager).toBeDefined();

      // Should be ready to use
      const result = await namer.generateName({
        type: 'ADR',
        description: 'basic test',
        ensureUnique: false
      });

      expect(result.filename).toBe('ADR-001-basic-test.md');
    });

    it('should initialize sequence manager automatically', async () => {
      // Create existing document to test scanning
      await fs.writeFile(path.join(docsRoot, 'adr', 'ADR-005-existing.md'), '# Existing');

      const { sequenceManager } = await createBasicDocumentNamer(ginkoRoot);

      const sequences = await sequenceManager.getAllSequences();
      expect(sequences.ADR).toBe(6); // Next after 005
    });
  });

  describe('validateDocumentNaming', () => {
    it('should validate compliant project', async () => {
      // Create only standard documents
      await fs.writeFile(path.join(docsRoot, 'adr', 'ADR-001-test.md'), '# Standard ADR');
      await fs.writeFile(path.join(docsRoot, 'PRD', 'PRD-001-product.md'), '# Standard PRD');

      const validation = await validateDocumentNaming(ginkoRoot);

      expect(validation.isCompliant).toBe(true);
      expect(validation.nonCompliantFiles).toHaveLength(0);
      expect(validation.issues).toHaveLength(0);
    });

    it('should identify non-compliant documents', async () => {
      // Create mix of standard and non-standard documents
      await fs.writeFile(path.join(docsRoot, 'adr', 'ADR-001-standard.md'), '# Standard');
      await fs.writeFile(path.join(docsRoot, 'adr', 'non-standard.md'), '# Non-standard');
      await fs.writeFile(path.join(docsRoot, 'PRD', 'requirements.md'), '# Non-standard PRD');

      const validation = await validateDocumentNaming(ginkoRoot);

      expect(validation.isCompliant).toBe(false);
      expect(validation.nonCompliantFiles).toHaveLength(2);
      expect(validation.nonCompliantFiles).toContain('non-standard.md');
      expect(validation.nonCompliantFiles).toContain('requirements.md');
    });

    it('should handle projects with no documents', async () => {
      const validation = await validateDocumentNaming(ginkoRoot);

      expect(validation.isCompliant).toBe(true);
      expect(validation.nonCompliantFiles).toHaveLength(0);
    });

    it('should handle validation errors gracefully', async () => {
      // Use invalid ginko root
      const validation = await validateDocumentNaming('/invalid/path');

      expect(validation.isCompliant).toBe(false);
      expect(validation.issues.length).toBeGreaterThan(0);
      expect(validation.issues[0]).toContain('Validation failed');
    });
  });

  describe('standardizeProjectDocuments', () => {
    it('should standardize all non-compliant documents', async () => {
      // Create non-standard documents
      await fs.writeFile(path.join(docsRoot, 'adr', 'auth-strategy.md'), '# Auth Strategy');
      await fs.writeFile(path.join(docsRoot, 'PRD', 'product-requirements.md'), '# Product Requirements');
      await fs.writeFile(path.join(docsRoot, 'sprints', 'planning.md'), '# Sprint Planning');

      const result = await standardizeProjectDocuments(ginkoRoot);

      expect(result.successfulMigrations).toBe(3);
      expect(result.operations).toHaveLength(3);
      expect(result.hasChanges).toBe(true);

      // Verify new files exist
      expect(await fs.pathExists(path.join(docsRoot, 'adr', 'ADR-001-auth-strategy.md'))).toBe(true);
      expect(await fs.pathExists(path.join(docsRoot, 'PRD', 'PRD-001-product-requirements.md'))).toBe(true);
      expect(await fs.pathExists(path.join(docsRoot, 'sprints', 'SPRINT-001-planning.md'))).toBe(true);

      // Original files should be gone
      expect(await fs.pathExists(path.join(docsRoot, 'adr', 'auth-strategy.md'))).toBe(false);
      expect(await fs.pathExists(path.join(docsRoot, 'PRD', 'product-requirements.md'))).toBe(false);
      expect(await fs.pathExists(path.join(docsRoot, 'sprints', 'planning.md'))).toBe(false);
    });

    it('should perform dry run without making changes', async () => {
      await fs.writeFile(path.join(docsRoot, 'adr', 'test-doc.md'), '# Test Document');

      const result = await standardizeProjectDocuments(ginkoRoot, { dryRun: true });

      expect(result.operations).toHaveLength(1);
      expect(result.successfulMigrations).toBe(0);

      // Original file should still exist
      expect(await fs.pathExists(path.join(docsRoot, 'adr', 'test-doc.md'))).toBe(true);
      expect(await fs.pathExists(path.join(docsRoot, 'adr', 'ADR-001-test-doc.md'))).toBe(false);
    });

    it('should update references when enabled', async () => {
      // Create document with reference
      await fs.writeFile(path.join(docsRoot, 'adr', 'auth-strategy.md'), '# Auth Strategy');
      await fs.writeFile(path.join(docsRoot, 'adr', 'overview.md'),
        '# Overview\n\nSee [Auth Strategy](auth-strategy.md) for details.'
      );

      const result = await standardizeProjectDocuments(ginkoRoot, {
        updateReferences: true
      });

      expect(result.referencesUpdated.length).toBeGreaterThan(0);

      // Check that reference was updated
      const overviewContent = await fs.readFile(path.join(docsRoot, 'adr', 'overview.md'), 'utf-8');
      expect(overviewContent).toContain('ADR-002-auth-strategy.md'); // Should be 002 since overview gets 001
    });

    it('should skip reference updates when disabled', async () => {
      // Create document with reference
      await fs.writeFile(path.join(docsRoot, 'adr', 'auth-strategy.md'), '# Auth Strategy');
      await fs.writeFile(path.join(docsRoot, 'adr', 'overview.md'),
        '# Overview\n\nSee [Auth Strategy](auth-strategy.md) for details.'
      );

      const result = await standardizeProjectDocuments(ginkoRoot, {
        updateReferences: false
      });

      expect(result.referencesUpdated).toHaveLength(0);

      // Reference should not be updated
      const overviewContent = await fs.readFile(path.join(docsRoot, 'adr', 'overview.md'), 'utf-8');
      expect(overviewContent).toContain('auth-strategy.md'); // Original reference
    });

    it('should create backup with custom directory', async () => {
      const customBackupDir = path.join(ginkoRoot, 'custom-backup');
      await fs.writeFile(path.join(docsRoot, 'adr', 'test.md'), '# Test');

      const result = await standardizeProjectDocuments(ginkoRoot, {
        backupDir: customBackupDir
      });

      expect(result.backupDirectory).toBeDefined();
      expect(result.backupDirectory).toContain('custom-backup');
      expect(await fs.pathExists(result.backupDirectory!)).toBe(true);
    });

    it('should handle projects with no non-standard documents', async () => {
      // Create only standard documents
      await fs.writeFile(path.join(docsRoot, 'adr', 'ADR-001-standard.md'), '# Standard');

      const result = await standardizeProjectDocuments(ginkoRoot);

      expect(result.operations).toHaveLength(0);
      expect(result.successfulMigrations).toBe(0);
      expect(result.hasChanges).toBe(false);
    });
  });

  describe('end-to-end workflow', () => {
    it('should complete full workflow from creation to standardization', async () => {
      // Step 1: Create system
      const system = await createDocumentManagementSystem({ ginkoRoot });
      await system.initialize();

      // Step 2: Use namer to create new document
      const nameResult = await system.documentNamer.generateName({
        type: 'ADR',
        description: 'new authentication system',
        ensureUnique: true
      });

      await fs.writeFile(nameResult.fullPath, '# New Authentication System');

      // Step 3: Add some non-standard documents
      await fs.writeFile(path.join(docsRoot, 'adr', 'legacy-doc.md'), '# Legacy Document');
      await fs.writeFile(path.join(docsRoot, 'PRD', 'requirements.md'), '# Requirements');

      // Step 4: Validate current state
      const validation = await validateDocumentNaming(ginkoRoot);
      expect(validation.isCompliant).toBe(false);
      expect(validation.nonCompliantFiles).toHaveLength(2);

      // Step 5: Standardize everything
      const migrationResult = await standardizeProjectDocuments(ginkoRoot);
      expect(migrationResult.successfulMigrations).toBe(2);

      // Step 6: Validate again
      const finalValidation = await validateDocumentNaming(ginkoRoot);
      expect(finalValidation.isCompliant).toBe(true);
      expect(finalValidation.nonCompliantFiles).toHaveLength(0);

      // Step 7: Verify sequence numbers are correct
      const sequences = await system.sequenceManager.getAllSequences();
      expect(sequences.ADR).toBe(4); // Original + 2 migrated
      expect(sequences.PRD).toBe(2); // 1 migrated
    });

    it('should handle complex project with references', async () => {
      // Create interconnected documents
      await fs.writeFile(path.join(docsRoot, 'adr', 'auth.md'), '# Authentication');
      await fs.writeFile(path.join(docsRoot, 'adr', 'api.md'), '# API Design');
      await fs.writeFile(path.join(docsRoot, 'PRD', 'user-management.md'),
        '# User Management\n\nSee [auth.md](../adr/auth.md) and [api.md](../adr/api.md).'
      );
      await fs.writeFile(path.join(docsRoot, 'strategy', 'overview.md'),
        '# Strategy\n\nRefer to [user-management.md](../PRD/user-management.md).'
      );

      // Standardize with reference updates
      const result = await standardizeProjectDocuments(ginkoRoot, {
        updateReferences: true
      });

      expect(result.successfulMigrations).toBe(4);
      expect(result.referencesUpdated.length).toBeGreaterThan(0);

      // Verify references were updated correctly
      const userMgmtContent = await fs.readFile(
        path.join(docsRoot, 'PRD', 'PRD-001-user-management.md'),
        'utf-8'
      );
      expect(userMgmtContent).toContain('ADR-001-auth.md');
      expect(userMgmtContent).toContain('ADR-002-api.md');

      const strategyContent = await fs.readFile(
        path.join(docsRoot, 'strategy', 'STRATEGY-001-overview.md'),
        'utf-8'
      );
      expect(strategyContent).toContain('PRD-001-user-management.md');
    });

    it('should maintain system integrity across multiple operations', async () => {
      const system = await createDocumentManagementSystem({ ginkoRoot });
      await system.initialize();

      // Create several documents in sequence
      for (let i = 1; i <= 5; i++) {
        const result = await system.documentNamer.generateName({
          type: 'ADR',
          description: `document ${i}`,
          ensureUnique: true
        });
        await fs.writeFile(result.fullPath, `# Document ${i}`);
      }

      // Add non-standard documents
      await fs.writeFile(path.join(docsRoot, 'adr', 'non-standard-1.md'), '# Non-standard 1');
      await fs.writeFile(path.join(docsRoot, 'adr', 'non-standard-2.md'), '# Non-standard 2');

      // Migrate non-standard documents
      const migrationResult = await system.documentMigrator.executeMigration();
      expect(migrationResult.successfulMigrations).toBe(2);

      // Verify sequence tracking is still correct
      const nextNumber = await system.sequenceManager.getNext('ADR');
      expect(nextNumber).toBe(8); // 5 original + 2 migrated + 1 next
    });
  });

  describe('error handling and edge cases', () => {
    it('should handle missing ginko directory', async () => {
      await fs.remove(path.join(ginkoRoot, '.ginko'));

      const system = await createDocumentManagementSystem({ ginkoRoot });
      await system.initialize();

      // Should work normally
      const result = await system.documentNamer.generateName({
        type: 'ADR',
        description: 'test',
        ensureUnique: false
      });

      expect(result.filename).toBe('ADR-001-test.md');
    });

    it('should handle missing docs directory', async () => {
      await fs.remove(docsRoot);

      const validation = await validateDocumentNaming(ginkoRoot);

      expect(validation.isCompliant).toBe(true);
      expect(validation.nonCompliantFiles).toHaveLength(0);
    });

    it('should handle permission errors gracefully', async () => {
      // This test would require platform-specific permission manipulation
      // For now, we test that functions don't throw on invalid paths

      const validation = await validateDocumentNaming('/invalid/readonly/path');
      expect(validation.isCompliant).toBe(false);
      expect(validation.issues.length).toBeGreaterThan(0);
    });

    it('should handle corrupted sequence files', async () => {
      // Create corrupted sequence file
      await fs.writeFile(path.join(ginkoRoot, '.ginko', 'sequences.json'), 'invalid json');

      const { sequenceManager } = await createBasicDocumentNamer(ginkoRoot);

      // Should recover by scanning documents
      const sequences = await sequenceManager.getAllSequences();
      expect(sequences.ADR).toBe(1);
    });
  });
});