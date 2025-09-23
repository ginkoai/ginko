/**
 * @fileType: config
 * @status: current
 * @updated: 2025-09-19
 * @tags: [test, document-namer, naming, convention]
 * @related: [document-namer.ts]
 * @priority: high
 * @complexity: medium
 * @dependencies: [vitest, fs-extra, path]
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import * as fs from 'fs-extra';
import * as path from 'path';
import * as os from 'os';
import { DocumentNamer, createDocumentNamer } from '../../../src/core/documents/document-namer.js';
import { SequenceManager, DocumentType } from '../../../src/core/documents/sequence-manager.js';

describe('DocumentNamer', () => {
  let tempDir: string;
  let docsRoot: string;
  let sequenceManager: SequenceManager;
  let documentNamer: DocumentNamer;

  beforeEach(async () => {
    // Create temporary directory for testing
    tempDir = await fs.mkdtemp(path.join(os.tmpdir(), 'ginko-namer-test-'));
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
  });

  afterEach(async () => {
    // Clean up temporary directory
    await fs.remove(tempDir);
  });

  describe('name generation', () => {
    it('should generate standard name format', async () => {
      const result = await documentNamer.generateName({
        type: 'ADR',
        description: 'authentication strategy',
        ensureUnique: false
      });

      expect(result.filename).toBe('ADR-001-authentication-strategy.md');
      expect(result.sequenceNumber).toBe(1);
      expect(result.wasAdjusted).toBe(false);
    });

    it('should pad sequence numbers correctly', async () => {
      // Set sequence to a higher number
      await sequenceManager.setSequence('ADR', 42);

      const result = await documentNamer.generateName({
        type: 'ADR',
        description: 'test document',
        ensureUnique: false
      });

      expect(result.filename).toBe('ADR-042-test-document.md');
    });

    it('should handle three-digit sequence numbers', async () => {
      await sequenceManager.setSequence('ADR', 123);

      const result = await documentNamer.generateName({
        type: 'ADR',
        description: 'large number test',
        ensureUnique: false
      });

      expect(result.filename).toBe('ADR-123-large-number-test.md');
    });

    it('should use custom sequence numbers when provided', async () => {
      const result = await documentNamer.generateName({
        type: 'ADR',
        description: 'custom sequence',
        customSequence: 999,
        ensureUnique: false
      });

      expect(result.filename).toBe('ADR-999-custom-sequence.md');
      expect(result.sequenceNumber).toBe(999);
    });

    it('should generate correct full paths', async () => {
      const result = await documentNamer.generateName({
        type: 'ADR',
        description: 'test document',
        ensureUnique: false
      });

      const expectedPath = path.join(docsRoot, 'adr', 'ADR-001-test-document.md');
      expect(result.fullPath).toBe(expectedPath);
    });
  });

  describe('description sanitization', () => {
    it('should convert to lowercase', async () => {
      const result = await documentNamer.generateName({
        type: 'ADR',
        description: 'UPPERCASE Description',
        ensureUnique: false
      });

      expect(result.filename).toBe('ADR-001-uppercase-description.md');
    });

    it('should replace spaces with hyphens', async () => {
      const result = await documentNamer.generateName({
        type: 'ADR',
        description: 'multiple word description',
        ensureUnique: false
      });

      expect(result.filename).toBe('ADR-001-multiple-word-description.md');
    });

    it('should replace underscores with hyphens', async () => {
      const result = await documentNamer.generateName({
        type: 'ADR',
        description: 'snake_case_description',
        ensureUnique: false
      });

      expect(result.filename).toBe('ADR-001-snake-case-description.md');
    });

    it('should remove special characters', async () => {
      const result = await documentNamer.generateName({
        type: 'ADR',
        description: 'special!@#$%characters',
        ensureUnique: false
      });

      expect(result.filename).toBe('ADR-001-specialcharacters.md');
    });

    it('should remove leading and trailing hyphens', async () => {
      const result = await documentNamer.generateName({
        type: 'ADR',
        description: '---trimmed description---',
        ensureUnique: false
      });

      expect(result.filename).toBe('ADR-001-trimmed-description.md');
    });

    it('should collapse multiple hyphens', async () => {
      const result = await documentNamer.generateName({
        type: 'ADR',
        description: 'multiple---hyphens',
        ensureUnique: false
      });

      expect(result.filename).toBe('ADR-001-multiple-hyphens.md');
    });

    it('should handle empty description after sanitization', async () => {
      const result = await documentNamer.generateName({
        type: 'ADR',
        description: '!@#$%',
        ensureUnique: false
      });

      expect(result.filename).toBe('ADR-001-untitled.md');
    });
  });

  describe('uniqueness handling', () => {
    it('should detect existing files and adjust names', async () => {
      // Create existing file
      const existingPath = path.join(docsRoot, 'adr', 'ADR-001-test-document.md');
      await fs.writeFile(existingPath, '# Existing Document');

      const result = await documentNamer.generateName({
        type: 'ADR',
        description: 'test document',
        ensureUnique: true
      });

      expect(result.filename).toBe('ADR-001-test-document-1.md');
      expect(result.wasAdjusted).toBe(true);
      expect(result.originalDescription).toBe('test-document');
    });

    it('should handle multiple conflicts', async () => {
      // Create multiple existing files
      await fs.writeFile(path.join(docsRoot, 'adr', 'ADR-001-test.md'), '# Test 1');
      await fs.writeFile(path.join(docsRoot, 'adr', 'ADR-001-test-1.md'), '# Test 2');
      await fs.writeFile(path.join(docsRoot, 'adr', 'ADR-001-test-2.md'), '# Test 3');

      const result = await documentNamer.generateName({
        type: 'ADR',
        description: 'test',
        ensureUnique: true
      });

      expect(result.filename).toBe('ADR-001-test-3.md');
      expect(result.wasAdjusted).toBe(true);
    });

    it('should not adjust when ensureUnique is false', async () => {
      // Create existing file
      await fs.writeFile(path.join(docsRoot, 'adr', 'ADR-001-test.md'), '# Existing');

      const result = await documentNamer.generateName({
        type: 'ADR',
        description: 'test',
        ensureUnique: false
      });

      expect(result.filename).toBe('ADR-001-test.md');
      expect(result.wasAdjusted).toBe(false);
    });
  });

  describe('name parsing', () => {
    it('should parse standard document names correctly', () => {
      const parsed = documentNamer.parseDocumentName('ADR-001-authentication-strategy.md');

      expect(parsed).toEqual({
        type: 'ADR',
        sequence: 1,
        description: 'authentication-strategy'
      });
    });

    it('should parse different document types', () => {
      const adr = documentNamer.parseDocumentName('ADR-042-test.md');
      const prd = documentNamer.parseDocumentName('PRD-123-product.md');
      const sprint = documentNamer.parseDocumentName('SPRINT-007-planning.md');
      const strategy = documentNamer.parseDocumentName('STRATEGY-001-business.md');

      expect(adr?.type).toBe('ADR');
      expect(prd?.type).toBe('PRD');
      expect(sprint?.type).toBe('SPRINT');
      expect(strategy?.type).toBe('STRATEGY');
    });

    it('should return null for non-standard names', () => {
      const nonStandard = [
        'document.md',
        'ADR-001.md',
        'ADR-1-test.md',
        'adr-001-test.md',
        'ADR-001-test.txt',
        'INVALID-001-test.md'
      ];

      nonStandard.forEach(name => {
        expect(documentNamer.parseDocumentName(name)).toBeNull();
      });
    });

    it('should detect standard vs non-standard names', () => {
      expect(documentNamer.isStandardName('ADR-001-test.md')).toBe(true);
      expect(documentNamer.isStandardName('PRD-042-product.md')).toBe(true);
      expect(documentNamer.isStandardName('document.md')).toBe(false);
      expect(documentNamer.isStandardName('ADR-1-test.md')).toBe(false);
    });
  });

  describe('name standardization', () => {
    it('should standardize non-standard names', async () => {
      const result = await documentNamer.standardizeName('ADR', 'authentication-strategy.md');

      expect(result.filename).toBe('ADR-001-authentication-strategy.md');
      expect(result.sequenceNumber).toBe(1);
    });

    it('should extract description from filename', async () => {
      const result = await documentNamer.standardizeName('ADR', 'my_complex-document_name.md');

      expect(result.filename).toBe('ADR-001-my-complex-document-name.md');
    });

    it('should remove type prefixes from description', async () => {
      const result = await documentNamer.standardizeName('ADR', 'ADR-authentication-strategy.md');

      expect(result.filename).toBe('ADR-001-authentication-strategy.md');
    });

    it('should remove number prefixes', async () => {
      const result = await documentNamer.standardizeName('ADR', '001-authentication-strategy.md');

      expect(result.filename).toBe('ADR-001-authentication-strategy.md');
    });

    it('should handle empty descriptions gracefully', async () => {
      const result = await documentNamer.standardizeName('ADR', 'ADR.md');

      expect(result.filename).toBe('ADR-001-untitled.md');
    });
  });

  describe('path utilities', () => {
    it('should get correct full paths for different types', () => {
      const adrPath = documentNamer.getFullPath('ADR', 'ADR-001-test.md');
      const prdPath = documentNamer.getFullPath('PRD', 'PRD-001-test.md');
      const sprintPath = documentNamer.getFullPath('SPRINT', 'SPRINT-001-test.md');
      const strategyPath = documentNamer.getFullPath('STRATEGY', 'STRATEGY-001-test.md');

      expect(adrPath).toBe(path.join(docsRoot, 'adr', 'ADR-001-test.md'));
      expect(prdPath).toBe(path.join(docsRoot, 'PRD', 'PRD-001-test.md'));
      expect(sprintPath).toBe(path.join(docsRoot, 'sprints', 'SPRINT-001-test.md'));
      expect(strategyPath).toBe(path.join(docsRoot, 'strategy', 'STRATEGY-001-test.md'));
    });

    it('should get correct type directories', () => {
      expect(documentNamer.getTypeDirectory('ADR')).toBe(path.join(docsRoot, 'adr'));
      expect(documentNamer.getTypeDirectory('PRD')).toBe(path.join(docsRoot, 'PRD'));
      expect(documentNamer.getTypeDirectory('SPRINT')).toBe(path.join(docsRoot, 'sprints'));
      expect(documentNamer.getTypeDirectory('STRATEGY')).toBe(path.join(docsRoot, 'strategy'));
    });
  });

  describe('validation', () => {
    it('should validate document types', async () => {
      await expect(documentNamer.generateName({
        type: 'INVALID' as DocumentType,
        description: 'test'
      })).rejects.toThrow('Invalid document type: INVALID');
    });

    it('should validate description requirements', async () => {
      await expect(documentNamer.generateName({
        type: 'ADR',
        description: ''
      })).rejects.toThrow('Description cannot be empty');

      await expect(documentNamer.generateName({
        type: 'ADR',
        description: null as any
      })).rejects.toThrow('Description is required and must be a string');
    });

    it('should validate description length', async () => {
      const longDescription = 'a'.repeat(101);

      await expect(documentNamer.generateName({
        type: 'ADR',
        description: longDescription
      })).rejects.toThrow('Description too long');
    });

    it('should validate against invalid characters', async () => {
      const invalidChars = ['<', '>', ':', '"', '|', '?', '*'];

      for (const char of invalidChars) {
        await expect(documentNamer.generateName({
          type: 'ADR',
          description: `test${char}description`
        })).rejects.toThrow('Description contains invalid characters');
      }
    });
  });

  describe('factory function', () => {
    it('should create document namer with factory', () => {
      const namer = createDocumentNamer(sequenceManager, docsRoot);
      expect(namer).toBeInstanceOf(DocumentNamer);
    });
  });

  describe('error handling', () => {
    it('should handle filesystem errors gracefully during uniqueness check', async () => {
      // Mock fs.pathExists to throw an error
      vi.spyOn(fs, 'pathExists').mockRejectedValueOnce(new Error('Filesystem error'));

      // Should still work, treating as if file doesn't exist
      const result = await documentNamer.generateName({
        type: 'ADR',
        description: 'test',
        ensureUnique: true
      });

      expect(result.filename).toBe('ADR-001-test.md');
      expect(result.wasAdjusted).toBe(false);

      vi.restoreAllMocks();
    });

    it('should throw error if too many conflicts exist', async () => {
      // Mock fs.pathExists to always return true
      vi.spyOn(fs, 'pathExists').mockResolvedValue(true);

      await expect(documentNamer.generateName({
        type: 'ADR',
        description: 'test',
        ensureUnique: true
      })).rejects.toThrow('Could not generate unique filename');

      vi.restoreAllMocks();
    });
  });
});