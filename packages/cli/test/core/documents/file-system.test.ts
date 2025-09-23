/**
 * @fileType: test
 * @status: current
 * @updated: 2025-09-22
 * @tags: [test, filesystem, operations, documents]
 * @related: [file-system.ts, documents.ts]
 * @priority: high
 * @complexity: medium
 * @dependencies: [jest, fs-extra, path, os]
 */

import { describe, it, expect, beforeEach, afterEach } from '@jest/globals';
import fs from 'fs-extra';
import path from 'path';
import os from 'os';
import { DocumentFileSystem } from '../../../src/core/documents/file-system.js';

describe('DocumentFileSystem', () => {
  let fileSystem: DocumentFileSystem;
  let tempDir: string;

  beforeEach(async () => {
    fileSystem = DocumentFileSystem.getInstance();
    tempDir = await fs.mkdtemp(path.join(os.tmpdir(), 'ginko-fs-test-'));
  });

  afterEach(async () => {
    await fs.remove(tempDir);
  });

  describe('exists', () => {
    it('should return true for existing file', async () => {
      const filePath = path.join(tempDir, 'test.md');
      await fs.writeFile(filePath, 'test content');

      const exists = await fileSystem.exists(filePath);

      expect(exists).toBe(true);
    });

    it('should return false for non-existent file', async () => {
      const filePath = path.join(tempDir, 'nonexistent.md');

      const exists = await fileSystem.exists(filePath);

      expect(exists).toBe(false);
    });
  });

  describe('readFile', () => {
    it('should read file successfully', async () => {
      const filePath = path.join(tempDir, 'test.txt');
      const content = 'Test file content';
      await fs.writeFile(filePath, content);

      const result = await fileSystem.readFile(filePath);

      expect(result.success).toBe(true);
      expect(result.operation).toBe('read');
      expect(result.path).toBe(filePath);
      expect(result.size).toBe(content.length);
      expect(result.created).toBeInstanceOf(Date);
      expect(result.modified).toBeInstanceOf(Date);
    });

    it('should handle non-existent file', async () => {
      const filePath = path.join(tempDir, 'nonexistent.txt');

      const result = await fileSystem.readFile(filePath);

      expect(result.success).toBe(false);
      expect(result.error).toBe('File does not exist');
    });
  });

  describe('writeFile', () => {
    it('should create new file', async () => {
      const filePath = path.join(tempDir, 'new.txt');
      const content = 'New file content';

      const result = await fileSystem.writeFile(filePath, content);

      expect(result.success).toBe(true);
      expect(result.operation).toBe('create');
      expect(result.path).toBe(filePath);
      expect(await fs.readFile(filePath, 'utf8')).toBe(content);
    });

    it('should update existing file', async () => {
      const filePath = path.join(tempDir, 'existing.txt');
      await fs.writeFile(filePath, 'original content');

      const newContent = 'updated content';
      const result = await fileSystem.writeFile(filePath, newContent);

      expect(result.success).toBe(true);
      expect(result.operation).toBe('update');
      expect(await fs.readFile(filePath, 'utf8')).toBe(newContent);
    });

    it('should create directories if they do not exist', async () => {
      const filePath = path.join(tempDir, 'nested', 'deep', 'file.txt');
      const content = 'Nested file content';

      const result = await fileSystem.writeFile(filePath, content);

      expect(result.success).toBe(true);
      expect(await fs.readFile(filePath, 'utf8')).toBe(content);
    });
  });

  describe('copyFile', () => {
    it('should copy file successfully', async () => {
      const sourcePath = path.join(tempDir, 'source.txt');
      const destPath = path.join(tempDir, 'dest.txt');
      const content = 'File to copy';

      await fs.writeFile(sourcePath, content);

      const result = await fileSystem.copyFile(sourcePath, destPath);

      expect(result.success).toBe(true);
      expect(result.operation).toBe('copy');
      expect(result.path).toBe(destPath);
      expect(await fs.readFile(destPath, 'utf8')).toBe(content);
    });

    it('should handle non-existent source', async () => {
      const sourcePath = path.join(tempDir, 'nonexistent.txt');
      const destPath = path.join(tempDir, 'dest.txt');

      const result = await fileSystem.copyFile(sourcePath, destPath);

      expect(result.success).toBe(false);
      expect(result.error).toBe('Source file does not exist');
    });
  });

  describe('moveFile', () => {
    it('should move file successfully', async () => {
      const sourcePath = path.join(tempDir, 'source.txt');
      const destPath = path.join(tempDir, 'dest.txt');
      const content = 'File to move';

      await fs.writeFile(sourcePath, content);

      const result = await fileSystem.moveFile(sourcePath, destPath);

      expect(result.success).toBe(true);
      expect(result.operation).toBe('move');
      expect(result.path).toBe(destPath);
      expect(await fs.pathExists(sourcePath)).toBe(false);
      expect(await fs.readFile(destPath, 'utf8')).toBe(content);
    });
  });

  describe('deleteFile', () => {
    it('should delete file successfully', async () => {
      const filePath = path.join(tempDir, 'todelete.txt');
      await fs.writeFile(filePath, 'content to delete');

      const result = await fileSystem.deleteFile(filePath);

      expect(result.success).toBe(true);
      expect(result.operation).toBe('delete');
      expect(await fs.pathExists(filePath)).toBe(false);
    });

    it('should handle non-existent file', async () => {
      const filePath = path.join(tempDir, 'nonexistent.txt');

      const result = await fileSystem.deleteFile(filePath);

      expect(result.success).toBe(false);
      expect(result.error).toBe('File does not exist');
    });
  });

  describe('findFiles', () => {
    beforeEach(async () => {
      // Create test file structure
      await fs.writeFile(path.join(tempDir, 'doc1.md'), '# Doc 1');
      await fs.writeFile(path.join(tempDir, 'doc2.markdown'), '# Doc 2');
      await fs.writeFile(path.join(tempDir, 'data.json'), '{"test": true}');
      await fs.writeFile(path.join(tempDir, 'config.yaml'), 'key: value');
      await fs.writeFile(path.join(tempDir, 'readme.txt'), 'Readme text');

      await fs.ensureDir(path.join(tempDir, 'subdir'));
      await fs.writeFile(path.join(tempDir, 'subdir', 'nested.md'), '# Nested');
    });

    it('should find markdown files', async () => {
      const files = await fileSystem.findFiles({ format: 'md' }, tempDir);

      expect(files).toHaveLength(3);
      expect(files.some(f => f.endsWith('doc1.md'))).toBe(true);
      expect(files.some(f => f.endsWith('doc2.markdown'))).toBe(true);
      expect(files.some(f => f.endsWith('nested.md'))).toBe(true);
    });

    it('should find JSON files', async () => {
      const files = await fileSystem.findFiles({ format: 'json' }, tempDir);

      expect(files).toHaveLength(1);
      expect(files[0]).toMatch(/data\.json$/);
    });

    it('should find all supported formats', async () => {
      const files = await fileSystem.findFiles({}, tempDir);

      expect(files.length).toBeGreaterThan(4);
    });
  });

  describe('getDocumentFormat', () => {
    it('should detect markdown format', () => {
      expect(fileSystem.getDocumentFormat('test.md')).toBe('md');
      expect(fileSystem.getDocumentFormat('test.markdown')).toBe('md');
    });

    it('should detect JSON format', () => {
      expect(fileSystem.getDocumentFormat('test.json')).toBe('json');
    });

    it('should detect YAML format', () => {
      expect(fileSystem.getDocumentFormat('test.yaml')).toBe('yaml');
      expect(fileSystem.getDocumentFormat('test.yml')).toBe('yaml');
    });

    it('should detect text format', () => {
      expect(fileSystem.getDocumentFormat('test.txt')).toBe('txt');
    });

    it('should return null for unknown format', () => {
      expect(fileSystem.getDocumentFormat('test.unknown')).toBeNull();
    });
  });

  describe('normalizePath', () => {
    it('should normalize Windows paths', () => {
      const windowsPath = 'C:\\Users\\test\\file.md';
      const normalized = fileSystem.normalizePath(windowsPath);

      expect(normalized).toBe('C:/Users/test/file.md');
    });

    it('should normalize Unix paths', () => {
      const unixPath = '/home/user/file.md';
      const normalized = fileSystem.normalizePath(unixPath);

      expect(normalized).toBe('/home/user/file.md');
    });
  });

  describe('isSafePath', () => {
    it('should allow paths within allowed directory', () => {
      const allowedDir = '/home/user/project';
      const safePath = '/home/user/project/file.md';

      const isSafe = fileSystem.isSafePath(safePath, allowedDir);

      expect(isSafe).toBe(true);
    });

    it('should reject paths outside allowed directory', () => {
      const allowedDir = '/home/user/project';
      const unsafePath = '/home/user/other/file.md';

      const isSafe = fileSystem.isSafePath(unsafePath, allowedDir);

      expect(isSafe).toBe(false);
    });

    it('should reject path traversal attempts', () => {
      const allowedDir = '/home/user/project';
      const maliciousPath = '/home/user/project/../../../etc/passwd';

      const isSafe = fileSystem.isSafePath(maliciousPath, allowedDir);

      expect(isSafe).toBe(false);
    });
  });

  describe('createBackup', () => {
    it('should create backup successfully', async () => {
      const filePath = path.join(tempDir, 'original.txt');
      const content = 'Original content';
      await fs.writeFile(filePath, content);

      const result = await fileSystem.createBackup(filePath);

      expect(result.success).toBe(true);
      expect(await fs.pathExists(filePath + '.backup')).toBe(true);
      expect(await fs.readFile(filePath + '.backup', 'utf8')).toBe(content);
    });

    it('should handle custom backup suffix', async () => {
      const filePath = path.join(tempDir, 'original.txt');
      await fs.writeFile(filePath, 'content');

      const result = await fileSystem.createBackup(filePath, '.bak');

      expect(result.success).toBe(true);
      expect(await fs.pathExists(filePath + '.bak')).toBe(true);
    });
  });

  describe('listDirectory', () => {
    beforeEach(async () => {
      await fs.writeFile(path.join(tempDir, 'file1.md'), 'content');
      await fs.writeFile(path.join(tempDir, 'file2.txt'), 'content');
      await fs.ensureDir(path.join(tempDir, 'subdir'));
      await fs.writeFile(path.join(tempDir, 'subdir', 'nested.md'), 'content');
    });

    it('should list files in directory (non-recursive)', async () => {
      const files = await fileSystem.listDirectory(tempDir, false);

      expect(files).toHaveLength(2);
      expect(files.some(f => f.endsWith('file1.md'))).toBe(true);
      expect(files.some(f => f.endsWith('file2.txt'))).toBe(true);
      expect(files.some(f => f.includes('subdir'))).toBe(false);
    });

    it('should list files recursively', async () => {
      const files = await fileSystem.listDirectory(tempDir, true);

      expect(files).toHaveLength(3);
      expect(files.some(f => f.endsWith('nested.md'))).toBe(true);
    });

    it('should handle non-existent directory', async () => {
      const files = await fileSystem.listDirectory('/nonexistent', false);

      expect(files).toHaveLength(0);
    });
  });
});