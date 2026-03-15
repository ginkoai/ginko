import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import fs from 'fs-extra';
import path from 'path';
import os from 'os';
import {
  generateManifest,
  parseManifest,
  validateManifest,
  getDefaultProtectedFiles,
} from '../../src/lib/protected-manifest.js';

describe('protected-manifest', () => {
  let tmpDir: string;

  beforeEach(async () => {
    tmpDir = await fs.mkdtemp(path.join(os.tmpdir(), 'ginko-test-'));
  });

  afterEach(async () => {
    await fs.remove(tmpDir);
  });

  describe('getDefaultProtectedFiles', () => {
    it('returns the three canonical protected files', () => {
      const files = getDefaultProtectedFiles();
      expect(files).toHaveLength(3);
      expect(files.map((f) => f.path)).toEqual([
        'graph/config.json',
        'sync-state.json',
        'user-progress.json',
      ]);
    });
  });

  describe('generateManifest', () => {
    it('produces valid format with header and entries', () => {
      const content = generateManifest();
      expect(content).toContain('# GINKO PROTECTED FILES');
      expect(content).toContain('graph/config.json |');
      expect(content).toContain('sync-state.json |');
      expect(content).toContain('user-progress.json |');
    });

    it('accepts custom entries', () => {
      const content = generateManifest([
        { path: 'custom.json', reason: 'Custom reason' },
      ]);
      expect(content).toContain('custom.json | Custom reason');
      expect(content).not.toContain('graph/config.json');
    });
  });

  describe('parseManifest', () => {
    it('parses entries with path and reason', () => {
      const content = generateManifest();
      const entries = parseManifest(content);
      expect(entries).toHaveLength(3);
      expect(entries[0].path).toBe('graph/config.json');
      expect(entries[0].reason).toContain('Graph connection ID');
    });

    it('skips comment lines and blank lines', () => {
      const content = `# comment

graph/config.json | reason

# another comment
sync-state.json | reason2
`;
      const entries = parseManifest(content);
      expect(entries).toHaveLength(2);
    });

    it('handles entries without a reason', () => {
      const content = 'some-file.json\n';
      const entries = parseManifest(content);
      expect(entries).toHaveLength(1);
      expect(entries[0].path).toBe('some-file.json');
      expect(entries[0].reason).toBe('');
    });
  });

  describe('validateManifest', () => {
    it('reports missing files', async () => {
      const ginkoDir = tmpDir;
      await fs.writeFile(
        path.join(ginkoDir, 'PROTECTED'),
        generateManifest(),
      );
      // Create only one of the three files
      await fs.ensureDir(path.join(ginkoDir, 'graph'));
      await fs.writeFile(path.join(ginkoDir, 'graph', 'config.json'), '{}');

      const result = await validateManifest(ginkoDir);
      expect(result.present).toHaveLength(1);
      expect(result.missing).toHaveLength(2);
      expect(result.missing.map((m) => m.path)).toContain('sync-state.json');
      expect(result.missing.map((m) => m.path)).toContain(
        'user-progress.json',
      );
    });

    it('passes when all files exist', async () => {
      const ginkoDir = tmpDir;
      await fs.writeFile(
        path.join(ginkoDir, 'PROTECTED'),
        generateManifest(),
      );
      await fs.ensureDir(path.join(ginkoDir, 'graph'));
      await fs.writeFile(path.join(ginkoDir, 'graph', 'config.json'), '{}');
      await fs.writeFile(path.join(ginkoDir, 'sync-state.json'), '{}');
      await fs.writeFile(path.join(ginkoDir, 'user-progress.json'), '{}');

      const result = await validateManifest(ginkoDir);
      expect(result.present).toHaveLength(3);
      expect(result.missing).toHaveLength(0);
    });

    it('returns all defaults as missing when no manifest exists', async () => {
      const result = await validateManifest(tmpDir);
      expect(result.missing).toHaveLength(3);
      expect(result.present).toHaveLength(0);
    });
  });
});
