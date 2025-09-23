/**
 * @fileType: test
 * @status: current
 * @updated: 2025-09-22
 * @tags: [test, document, manager, integration, orchestration]
 * @related: [document-manager.ts, documents.ts]
 * @priority: critical
 * @complexity: high
 * @dependencies: [jest, fs-extra, path, os]
 */

import { describe, it, expect, beforeEach, afterEach } from '@jest/globals';
import fs from 'fs-extra';
import path from 'path';
import os from 'os';
import { DocumentManager } from '../../../src/core/documents/document-manager.js';

describe('DocumentManager', () => {
  let manager: DocumentManager;
  let tempDir: string;

  beforeEach(async () => {
    manager = DocumentManager.getInstance();
    tempDir = await fs.mkdtemp(path.join(os.tmpdir(), 'ginko-manager-test-'));
  });

  afterEach(async () => {
    await fs.remove(tempDir);
  });

  describe('loadDocument', () => {
    it('should load markdown document', async () => {
      const filePath = path.join(tempDir, 'test.md');
      const content = `---
title: Test Document
author: Test Author
---

# Test Document

This is test content.`;

      await fs.writeFile(filePath, content);

      const result = await manager.loadDocument(filePath);

      expect(result.success).toBe(true);
      expect(result.document).toBeDefined();
      expect(result.document!.format).toBe('md');
      expect(result.document!.metadata.title).toBe('Test Document');
      expect(result.document!.metadata.author).toBe('Test Author');
      expect(result.document!.content).toContain('# Test Document');
    });

    it('should load JSON document', async () => {
      const filePath = path.join(tempDir, 'test.json');
      const data = {
        title: 'JSON Document',
        version: '1.0.0',
        data: { key: 'value' }
      };

      await fs.writeFile(filePath, JSON.stringify(data, null, 2));

      const result = await manager.loadDocument(filePath);

      expect(result.success).toBe(true);
      expect(result.document!.format).toBe('json');
      expect(result.document!.metadata.title).toBe('JSON Document');
      expect(result.document!.content).toContain('"key": "value"');
    });

    it('should load text document', async () => {
      const filePath = path.join(tempDir, 'test.txt');
      const content = 'Plain text content';

      await fs.writeFile(filePath, content);

      const result = await manager.loadDocument(filePath);

      expect(result.success).toBe(true);
      expect(result.document!.format).toBe('txt');
      expect(result.document!.content).toBe(content);
    });

    it('should handle unsupported format', async () => {
      const filePath = path.join(tempDir, 'test.unknown');
      await fs.writeFile(filePath, 'content');

      const result = await manager.loadDocument(filePath);

      expect(result.success).toBe(false);
      expect(result.error).toContain('Unsupported file format');
    });

    it('should handle non-existent file', async () => {
      const result = await manager.loadDocument('/nonexistent/file.md');

      expect(result.success).toBe(false);
      expect(result.error).toContain('File not found');
    });
  });

  describe('saveDocument', () => {
    it('should save markdown document', async () => {
      const document = {
        path: '',
        format: 'md' as const,
        metadata: {
          title: 'Test Document',
          author: 'Test Author',
          fileType: 'utility',
          status: 'current' as const,
          updated: new Date('2025-09-22')
        },
        content: '# Test Document\n\nContent here.'
      };

      const filePath = path.join(tempDir, 'output.md');
      const result = await manager.saveDocument(document, filePath);

      expect(result.success).toBe(true);
      expect(result.document!.path).toBe(filePath);

      const fileContent = await fs.readFile(filePath, 'utf8');
      expect(fileContent).toContain('# Test Document');
      expect(fileContent).toContain('@fileType: utility');
      expect(fileContent).toContain('@status: current');
    });

    it('should save JSON document', async () => {
      const document = {
        path: '',
        format: 'json' as const,
        metadata: { title: 'JSON Doc', version: '1.0' },
        content: '{"test": true}'
      };

      const filePath = path.join(tempDir, 'output.json');
      const result = await manager.saveDocument(document, filePath);

      expect(result.success).toBe(true);

      const fileContent = await fs.readFile(filePath, 'utf8');
      const jsonData = JSON.parse(fileContent);
      expect(jsonData.metadata.title).toBe('JSON Doc');
      expect(jsonData.content).toBe('{"test": true}');
    });

    it('should handle missing file path', async () => {
      const document = {
        path: '',
        format: 'md' as const,
        metadata: {},
        content: 'content'
      };

      const result = await manager.saveDocument(document);

      expect(result.success).toBe(false);
      expect(result.error).toContain('No file path specified');
    });
  });

  describe('createFromTemplate', () => {
    it('should create document from built-in template', () => {
      const variables = {
        fileType: 'component',
        tags: 'react, ui',
        priority: 'high',
        content: 'const MyComponent = () => <div>Hello</div>;'
      };

      const result = manager.createFromTemplate('ginko-typescript', variables);

      expect(result.success).toBe(true);
      expect(result.document).toBeDefined();
      expect(result.document!.content).toContain('@fileType: component');
      expect(result.document!.content).toContain('@tags: [react, ui]');
      expect(result.document!.content).toContain('@priority: high');
      expect(result.document!.content).toContain('const MyComponent');
    });

    it('should handle non-existent template', () => {
      const result = manager.createFromTemplate('non-existent-template');

      expect(result.success).toBe(false);
      expect(result.error).toContain('Template not found');
    });

    it('should set output path when provided', () => {
      const outputPath = '/path/to/output.md';
      const result = manager.createFromTemplate('ginko-markdown', {}, outputPath);

      expect(result.success).toBe(true);
      expect(result.document!.path).toBe(path.resolve(outputPath));
    });
  });

  describe('searchDocuments', () => {
    beforeEach(async () => {
      // Create test documents
      await fs.writeFile(path.join(tempDir, 'doc1.md'), '# Document 1');
      await fs.writeFile(path.join(tempDir, 'doc2.md'), '# Document 2');
      await fs.writeFile(path.join(tempDir, 'data.json'), '{"test": true}');
      await fs.writeFile(path.join(tempDir, 'readme.txt'), 'README');

      await fs.ensureDir(path.join(tempDir, 'subdir'));
      await fs.writeFile(path.join(tempDir, 'subdir', 'nested.md'), '# Nested');
    });

    it('should find markdown documents', async () => {
      const files = await manager.searchDocuments({ format: 'md' }, tempDir);

      expect(files.length).toBe(3);
      expect(files.some(f => f.endsWith('doc1.md'))).toBe(true);
      expect(files.some(f => f.endsWith('doc2.md'))).toBe(true);
      expect(files.some(f => f.endsWith('nested.md'))).toBe(true);
    });

    it('should find JSON documents', async () => {
      const files = await manager.searchDocuments({ format: 'json' }, tempDir);

      expect(files.length).toBe(1);
      expect(files[0]).toMatch(/data\.json$/);
    });
  });

  describe('loadDocuments', () => {
    beforeEach(async () => {
      await fs.writeFile(path.join(tempDir, 'doc1.md'), '# Doc 1');
      await fs.writeFile(path.join(tempDir, 'doc2.md'), '# Doc 2');
      await fs.writeFile(path.join(tempDir, 'data.json'), '{"title": "Data"}');
    });

    it('should load multiple documents successfully', async () => {
      const filePaths = [
        path.join(tempDir, 'doc1.md'),
        path.join(tempDir, 'doc2.md'),
        path.join(tempDir, 'data.json')
      ];

      const result = await manager.loadDocuments(filePaths);

      expect(result.success).toBe(true);
      expect(result.processed).toBe(3);
      expect(result.failed).toBe(0);
      expect(result.results).toHaveLength(3);
    });

    it('should handle mixed success and failure', async () => {
      const filePaths = [
        path.join(tempDir, 'doc1.md'),
        path.join(tempDir, 'nonexistent.md'),
        path.join(tempDir, 'data.json')
      ];

      const result = await manager.loadDocuments(filePaths);

      expect(result.success).toBe(false);
      expect(result.processed).toBe(2);
      expect(result.failed).toBe(1);
      expect(result.errors).toHaveLength(1);
    });
  });

  describe('validateDocument', () => {
    it('should validate correct document', () => {
      const document = {
        path: '/test.md',
        format: 'md' as const,
        metadata: {
          fileType: 'utility',
          status: 'current',
          updated: new Date()
        },
        content: '# Valid Document\n\nThis is [a link](http://example.com).'
      };

      const result = manager.validateDocument(document);

      expect(result.valid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should detect empty content', () => {
      const document = {
        path: '/test.md',
        format: 'md' as const,
        metadata: {},
        content: ''
      };

      const result = manager.validateDocument(document);

      expect(result.valid).toBe(false);
      expect(result.errors).toContain('Document content is empty');
    });

    it('should detect missing format', () => {
      const document = {
        path: '/test',
        format: undefined as any,
        metadata: {},
        content: 'content'
      };

      const result = manager.validateDocument(document);

      expect(result.valid).toBe(false);
      expect(result.errors).toContain('Document format is not specified');
    });
  });

  describe('getDocumentStats', () => {
    it('should calculate basic stats', () => {
      const document = {
        path: '/test.md',
        format: 'md' as const,
        metadata: { title: 'Test' },
        content: '# Title\n\nThis is **bold** text with [a link](http://example.com).\n\nSecond paragraph.'
      };

      const stats = manager.getDocumentStats(document);

      expect(stats.wordCount).toBe(12);
      expect(stats.characterCount).toBeGreaterThan(70);
      expect(stats.lineCount).toBe(5);
      expect(stats.hasMetadata).toBe(true);
      expect(stats.links).toHaveLength(1);
      expect(stats.links[0]).toEqual({
        text: 'a link',
        url: 'http://example.com',
        type: 'external'
      });
    });

    it('should extract table of contents for markdown', () => {
      const document = {
        path: '/test.md',
        format: 'md' as const,
        metadata: {},
        content: '# Main Title\n\n## Section 1\n\n### Subsection\n\n## Section 2'
      };

      const stats = manager.getDocumentStats(document) as any;

      expect(stats.toc).toHaveLength(4);
      expect(stats.toc[0]).toEqual({ level: 1, title: 'Main Title', anchor: 'main-title' });
      expect(stats.toc[1]).toEqual({ level: 2, title: 'Section 1', anchor: 'section-1' });
    });
  });

  describe('copyDocument', () => {
    it('should copy document successfully', async () => {
      const sourcePath = path.join(tempDir, 'source.md');
      const destPath = path.join(tempDir, 'dest.md');

      const originalContent = '---\ntitle: Original\n---\n\n# Original Document';
      await fs.writeFile(sourcePath, originalContent);

      const result = await manager.copyDocument(sourcePath, destPath);

      expect(result.success).toBe(true);
      expect(await fs.pathExists(destPath)).toBe(true);

      const destContent = await fs.readFile(destPath, 'utf8');
      expect(destContent).toContain('# Original Document');
    });

    it('should handle non-existent source', async () => {
      const result = await manager.copyDocument('/nonexistent.md', '/dest.md');

      expect(result.success).toBe(false);
      expect(result.error).toContain('File not found');
    });
  });

  describe('moveDocument', () => {
    it('should move document successfully', async () => {
      const sourcePath = path.join(tempDir, 'source.md');
      const destPath = path.join(tempDir, 'dest.md');

      await fs.writeFile(sourcePath, '# Document to Move');

      const result = await manager.moveDocument(sourcePath, destPath);

      expect(result.success).toBe(true);
      expect(await fs.pathExists(sourcePath)).toBe(false);
      expect(await fs.pathExists(destPath)).toBe(true);
    });
  });

  describe('deleteDocument', () => {
    it('should delete document successfully', async () => {
      const filePath = path.join(tempDir, 'todelete.md');
      await fs.writeFile(filePath, '# Document to Delete');

      const result = await manager.deleteDocument(filePath);

      expect(result.success).toBe(true);
      expect(await fs.pathExists(filePath)).toBe(false);
    });

    it('should handle non-existent file', async () => {
      const result = await manager.deleteDocument('/nonexistent.md');

      expect(result.success).toBe(false);
      expect(result.error).toContain('File does not exist');
    });
  });

  describe('template integration', () => {
    beforeEach(async () => {
      // Create a template directory with test templates
      const templateDir = path.join(tempDir, 'templates');
      await fs.ensureDir(templateDir);

      await fs.writeFile(
        path.join(templateDir, 'custom.template.md'),
        '# {{title}}\n\nCreated by {{author}}\n\n{{content}}'
      );
    });

    it('should initialize template directories', async () => {
      const templateDir = path.join(tempDir, 'templates');
      const loaded = await manager.initializeTemplateDirectories([templateDir]);

      expect(loaded).toBe(1);

      const templates = manager.getAvailableTemplates();
      expect(templates.some(t => t.name === 'custom')).toBe(true);
    });

    it('should create document from loaded template', async () => {
      const templateDir = path.join(tempDir, 'templates');
      await manager.initializeTemplateDirectories([templateDir]);

      const variables = {
        title: 'My Document',
        author: 'Test Author',
        content: 'This is my content.'
      };

      const result = manager.createFromTemplate('custom', variables);

      expect(result.success).toBe(true);
      expect(result.document!.content).toContain('# My Document');
      expect(result.document!.content).toContain('Created by Test Author');
      expect(result.document!.content).toContain('This is my content.');
    });
  });
});