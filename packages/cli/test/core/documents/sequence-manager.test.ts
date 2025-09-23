/**
 * @fileType: config
 * @status: current
 * @updated: 2025-09-19
 * @tags: [test, sequence-manager, document, numbering]
 * @related: [sequence-manager.ts]
 * @priority: high
 * @complexity: medium
 * @dependencies: [vitest, fs-extra, path]
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import * as fs from 'fs-extra';
import * as path from 'path';
import * as os from 'os';
import { SequenceManager, DocumentType, createSequenceManager } from '../../../src/core/documents/sequence-manager.js';

describe('SequenceManager', () => {
  let tempDir: string;
  let ginkoRoot: string;
  let sequenceManager: SequenceManager;

  beforeEach(async () => {
    // Create temporary directory for testing
    tempDir = await fs.mkdtemp(path.join(os.tmpdir(), 'ginko-sequence-test-'));
    ginkoRoot = tempDir;

    // Create basic directory structure
    await fs.ensureDir(path.join(ginkoRoot, '.ginko'));
    await fs.ensureDir(path.join(ginkoRoot, 'docs', 'adr'));
    await fs.ensureDir(path.join(ginkoRoot, 'docs', 'PRD'));
    await fs.ensureDir(path.join(ginkoRoot, 'docs', 'sprints'));
    await fs.ensureDir(path.join(ginkoRoot, 'docs', 'strategy'));

    sequenceManager = new SequenceManager({ ginkoRoot });
  });

  afterEach(async () => {
    // Clean up temporary directory
    await fs.remove(tempDir);
  });

  describe('initialization', () => {
    it('should initialize with default values when no existing data', async () => {
      await sequenceManager.initialize();

      const sequences = await sequenceManager.getAllSequences();
      expect(sequences.ADR).toBe(1);
      expect(sequences.PRD).toBe(1);
      expect(sequences.SPRINT).toBe(1);
      expect(sequences.STRATEGY).toBe(1);
    });

    it('should initialize with custom starting numbers', async () => {
      const customSequenceManager = new SequenceManager({
        ginkoRoot,
        startingNumbers: { ADR: 10, PRD: 20 }
      });

      await customSequenceManager.initialize();

      const sequences = await customSequenceManager.getAllSequences();
      expect(sequences.ADR).toBe(10);
      expect(sequences.PRD).toBe(20);
      expect(sequences.SPRINT).toBe(1);
      expect(sequences.STRATEGY).toBe(1);
    });

    it('should scan existing documents and set correct sequence numbers', async () => {
      // Create some existing documents
      await fs.writeFile(path.join(ginkoRoot, 'docs', 'adr', 'ADR-001-test.md'), '# Test ADR');
      await fs.writeFile(path.join(ginkoRoot, 'docs', 'adr', 'ADR-005-another.md'), '# Another ADR');
      await fs.writeFile(path.join(ginkoRoot, 'docs', 'PRD', 'PRD-003-product.md'), '# Product PRD');

      await sequenceManager.initialize();

      const sequences = await sequenceManager.getAllSequences();
      expect(sequences.ADR).toBe(6); // Next after 005
      expect(sequences.PRD).toBe(4); // Next after 003
      expect(sequences.SPRINT).toBe(1); // No existing files
      expect(sequences.STRATEGY).toBe(1); // No existing files
    });

    it('should load existing sequence data from file', async () => {
      const sequenceData = {
        version: '1.0.0',
        sequences: { ADR: 15, PRD: 8, SPRINT: 3, STRATEGY: 2 },
        lastUpdated: new Date().toISOString()
      };

      await fs.writeJson(path.join(ginkoRoot, '.ginko', 'sequences.json'), sequenceData);

      await sequenceManager.initialize();

      const sequences = await sequenceManager.getAllSequences();
      expect(sequences.ADR).toBe(15);
      expect(sequences.PRD).toBe(8);
      expect(sequences.SPRINT).toBe(3);
      expect(sequences.STRATEGY).toBe(2);
    });
  });

  describe('sequence allocation', () => {
    beforeEach(async () => {
      await sequenceManager.initialize();
    });

    it('should allocate sequential numbers', async () => {
      const first = await sequenceManager.getNext('ADR');
      const second = await sequenceManager.getNext('ADR');
      const third = await sequenceManager.getNext('ADR');

      expect(first).toBe(1);
      expect(second).toBe(2);
      expect(third).toBe(3);
    });

    it('should allocate numbers independently for different types', async () => {
      const adr1 = await sequenceManager.getNext('ADR');
      const prd1 = await sequenceManager.getNext('PRD');
      const adr2 = await sequenceManager.getNext('ADR');
      const sprint1 = await sequenceManager.getNext('SPRINT');

      expect(adr1).toBe(1);
      expect(prd1).toBe(1);
      expect(adr2).toBe(2);
      expect(sprint1).toBe(1);
    });

    it('should persist sequences after allocation', async () => {
      await sequenceManager.getNext('ADR');
      await sequenceManager.getNext('ADR');
      await sequenceManager.getNext('PRD');

      // Create new instance to test persistence
      const newSequenceManager = new SequenceManager({ ginkoRoot });
      await newSequenceManager.initialize();

      const adrNext = await newSequenceManager.getNext('ADR');
      const prdNext = await newSequenceManager.getNext('PRD');

      expect(adrNext).toBe(3);
      expect(prdNext).toBe(2);
    });
  });

  describe('sequence management', () => {
    beforeEach(async () => {
      await sequenceManager.initialize();
    });

    it('should get current sequence number without incrementing', async () => {
      await sequenceManager.getNext('ADR'); // Should be 1
      await sequenceManager.getNext('ADR'); // Should be 2

      const current = await sequenceManager.getCurrent('ADR');
      expect(current).toBe(2);

      // Getting current again should return the same value
      const currentAgain = await sequenceManager.getCurrent('ADR');
      expect(currentAgain).toBe(2);
    });

    it('should set specific sequence numbers', async () => {
      await sequenceManager.setSequence('ADR', 100);

      const next = await sequenceManager.getNext('ADR');
      expect(next).toBe(100);

      const following = await sequenceManager.getNext('ADR');
      expect(following).toBe(101);
    });

    it('should reject invalid sequence numbers', async () => {
      await expect(sequenceManager.setSequence('ADR', 0)).rejects.toThrow('Sequence number must be positive');
      await expect(sequenceManager.setSequence('ADR', -1)).rejects.toThrow('Sequence number must be positive');
    });

    it('should rescan documents and update sequences', async () => {
      // Start with some sequences
      await sequenceManager.getNext('ADR');
      await sequenceManager.getNext('ADR');

      // Add new documents with higher numbers
      await fs.writeFile(path.join(ginkoRoot, 'docs', 'adr', 'ADR-010-new.md'), '# New ADR');
      await fs.writeFile(path.join(ginkoRoot, 'docs', 'PRD', 'PRD-007-product.md'), '# Product PRD');

      await sequenceManager.rescanDocuments();

      const sequences = await sequenceManager.getAllSequences();
      expect(sequences.ADR).toBe(11); // Next after 010
      expect(sequences.PRD).toBe(8);  // Next after 007
    });
  });

  describe('thread safety', () => {
    beforeEach(async () => {
      await sequenceManager.initialize();
    });

    it('should handle concurrent access safely', async () => {
      // Simulate concurrent getNext calls
      const promises = Array.from({ length: 10 }, () => sequenceManager.getNext('ADR'));
      const results = await Promise.all(promises);

      // Should get sequential numbers from 1 to 10
      expect(results.sort((a, b) => a - b)).toEqual([1, 2, 3, 4, 5, 6, 7, 8, 9, 10]);
    });

    it('should handle lock acquisition failures gracefully', async () => {
      // Mock the writeFile to simulate lock conflict
      const originalWriteFile = fs.writeFile;
      let callCount = 0;

      vi.spyOn(fs, 'writeFile').mockImplementation(async (filePath: any, data: any, options: any) => {
        if (typeof filePath === 'string' && filePath.endsWith('.lock')) {
          callCount++;
          if (callCount <= 2) {
            throw new Error('EEXIST: file already exists');
          }
        }
        return originalWriteFile(filePath, data, options);
      });

      // Should eventually succeed after retries
      const result = await sequenceManager.getNext('ADR');
      expect(result).toBe(1);

      vi.restoreAllMocks();
    });
  });

  describe('data validation', () => {
    it('should handle corrupted sequence data gracefully', async () => {
      // Write invalid JSON
      await fs.writeFile(path.join(ginkoRoot, '.ginko', 'sequences.json'), 'invalid json');

      await sequenceManager.initialize();

      // Should fall back to scanning documents
      const sequences = await sequenceManager.getAllSequences();
      expect(sequences.ADR).toBe(1);
      expect(sequences.PRD).toBe(1);
    });

    it('should validate sequence data structure', async () => {
      const invalidData = {
        version: '1.0.0',
        sequences: { ADR: 'invalid', PRD: -1, SPRINT: null },
        lastUpdated: new Date().toISOString()
      };

      await fs.writeJson(path.join(ginkoRoot, '.ginko', 'sequences.json'), invalidData);

      await sequenceManager.initialize();

      const sequences = await sequenceManager.getAllSequences();
      expect(sequences.ADR).toBe(1); // Should fall back to default
      expect(sequences.PRD).toBe(1); // Should fall back to default
      expect(sequences.SPRINT).toBe(1); // Should fall back to default
    });
  });

  describe('factory function', () => {
    it('should create sequence manager with factory', () => {
      const manager = createSequenceManager(ginkoRoot);
      expect(manager).toBeInstanceOf(SequenceManager);
    });

    it('should create sequence manager with custom starting numbers', () => {
      const manager = createSequenceManager(ginkoRoot, { ADR: 100, PRD: 200 });
      expect(manager).toBeInstanceOf(SequenceManager);
    });
  });

  describe('error handling', () => {
    it('should handle missing ginko directory gracefully', async () => {
      await fs.remove(path.join(ginkoRoot, '.ginko'));

      await sequenceManager.initialize();

      // Should create the directory and work normally
      const next = await sequenceManager.getNext('ADR');
      expect(next).toBe(1);
    });

    it('should handle missing docs directories gracefully', async () => {
      await fs.remove(path.join(ginkoRoot, 'docs'));

      await sequenceManager.initialize();

      // Should work with default values
      const sequences = await sequenceManager.getAllSequences();
      expect(sequences.ADR).toBe(1);
    });

    it('should handle permission errors gracefully', async () => {
      // This test would need platform-specific permission manipulation
      // For now, we'll test that the error is properly wrapped
      const invalidPath = path.join('/invalid/path/that/does/not/exist');
      const invalidManager = new SequenceManager({ ginkoRoot: invalidPath });

      await expect(invalidManager.initialize()).rejects.toThrow('Failed to initialize SequenceManager');
    });
  });
});