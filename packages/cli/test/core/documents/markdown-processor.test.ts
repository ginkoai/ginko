/**
 * @fileType: test
 * @status: current
 * @updated: 2025-09-22
 * @tags: [test, markdown, processor, frontmatter, validation]
 * @related: [markdown-processor.ts, documents.ts]
 * @priority: high
 * @complexity: medium
 * @dependencies: [jest, fs-extra, path]
 */

import { describe, it, expect, beforeEach, afterEach } from '@jest/globals';
import fs from 'fs-extra';
import path from 'path';
import os from 'os';
import { MarkdownProcessor } from '../../../src/core/documents/markdown-processor.js';

describe('MarkdownProcessor', () => {
  let processor: MarkdownProcessor;
  let tempDir: string;
  let testFile: string;

  beforeEach(async () => {
    processor = MarkdownProcessor.getInstance();
    tempDir = await fs.mkdtemp(path.join(os.tmpdir(), 'ginko-test-'));
    testFile = path.join(tempDir, 'test.md');
  });

  afterEach(async () => {
    await fs.remove(tempDir);
  });

  describe('parseContent', () => {
    it('should parse markdown with frontmatter', () => {
      const content = `/**
 * @fileType: utility
 * @status: current
 * @updated: 2025-09-22
 * @tags: [test, example]
 * @priority: high
 * @complexity: medium
 */

# Test Document

This is a test document.`;

      const result = processor.parseContent(content);

      expect(result.success).toBe(true);
      expect(result.document).toBeDefined();
      expect(result.document!.format).toBe('md');
      expect(result.document!.content).toBe('# Test Document\n\nThis is a test document.');
      expect(result.document!.metadata.fileType).toBe('utility');
      expect(result.document!.metadata.status).toBe('current');
      expect(result.document!.metadata.tags).toEqual(['test', 'example']);
    });

    it('should parse markdown without frontmatter', () => {
      const content = `# Simple Document

This is simple content.`;

      const result = processor.parseContent(content);

      expect(result.success).toBe(true);
      expect(result.document).toBeDefined();
      expect(result.document!.content).toBe(content);
      expect(Object.keys(result.document!.metadata)).toHaveLength(0);
    });

    it('should handle empty content', () => {
      const result = processor.parseContent('');

      expect(result.success).toBe(true);
      expect(result.document!.content).toBe('');
    });
  });

  describe('parseFile', () => {
    it('should parse markdown file successfully', async () => {
      const content = `---
title: Test File
author: Test Author
---

# File Content

This is file content.`;

      await fs.writeFile(testFile, content, 'utf8');

      const result = await processor.parseFile(testFile);

      expect(result.success).toBe(true);
      expect(result.document).toBeDefined();
      expect(result.document!.path).toBe(testFile);
      expect(result.document!.metadata.title).toBe('Test File');
      expect(result.document!.metadata.author).toBe('Test Author');
    });

    it('should handle non-existent file', async () => {
      const result = await processor.parseFile('/non/existent/file.md');

      expect(result.success).toBe(false);
      expect(result.error).toContain('File not found');
    });
  });

  describe('validateFrontmatter', () => {
    it('should validate correct ginko frontmatter', () => {
      const frontmatter = {
        fileType: 'utility',
        status: 'current',
        updated: '2025-09-22',
        tags: ['test'],
        priority: 'high',
        complexity: 'medium'
      };

      const result = processor.validateFrontmatter(frontmatter);

      expect(result.valid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should detect invalid status', () => {
      const frontmatter = {
        fileType: 'utility',
        status: 'invalid-status',
        updated: '2025-09-22'
      };

      const result = processor.validateFrontmatter(frontmatter);

      expect(result.valid).toBe(false);
      expect(result.errors).toContain('Invalid status: invalid-status. Must be one of: current, deprecated, draft');
    });

    it('should warn about missing fields', () => {
      const frontmatter = {};

      const result = processor.validateFrontmatter(frontmatter);

      expect(result.warnings).toContain('Missing @fileType field');
      expect(result.warnings).toContain('Missing @status field');
      expect(result.warnings).toContain('Missing @updated field');
    });
  });

  describe('generateFrontmatter', () => {
    it('should generate correct frontmatter format', () => {
      const metadata = {
        fileType: 'utility',
        status: 'current' as const,
        updated: new Date('2025-09-22'),
        tags: ['test', 'example'],
        priority: 'high' as const,
        complexity: 'medium' as const,
        dependencies: ['fs-extra']
      };

      const result = processor.generateFrontmatter(metadata);

      expect(result).toContain(' * @fileType: utility');
      expect(result).toContain(' * @status: current');
      expect(result).toContain(' * @updated: 2025-09-22');
      expect(result).toContain(' * @tags: [test, example]');
      expect(result).toContain(' * @priority: high');
      expect(result).toContain(' * @complexity: medium');
      expect(result).toContain(' * @dependencies: [fs-extra]');
    });
  });

  describe('extractTableOfContents', () => {
    it('should extract headings correctly', () => {
      const content = `# Main Title

## Section 1

### Subsection 1.1

## Section 2

### Subsection 2.1

#### Deep Section`;

      const toc = processor.extractTableOfContents(content);

      expect(toc).toHaveLength(6);
      expect(toc[0]).toEqual({ level: 1, title: 'Main Title', anchor: 'main-title' });
      expect(toc[1]).toEqual({ level: 2, title: 'Section 1', anchor: 'section-1' });
      expect(toc[2]).toEqual({ level: 3, title: 'Subsection 1.1', anchor: 'subsection-11' });
      expect(toc[5]).toEqual({ level: 4, title: 'Deep Section', anchor: 'deep-section' });
    });

    it('should handle special characters in headings', () => {
      const content = `# API: Test & Validation

## Section (with parentheses)`;

      const toc = processor.extractTableOfContents(content);

      expect(toc[0].anchor).toBe('api-test--validation');
      expect(toc[1].anchor).toBe('section-with-parentheses');
    });
  });

  describe('extractLinks', () => {
    it('should extract markdown links', () => {
      const content = `Check out [Internal Link](./file.md) and [External Link](https://example.com).

Also see [Relative](../other.md) and [Absolute](http://test.com).`;

      const links = processor.extractLinks(content);

      expect(links).toHaveLength(4);
      expect(links[0]).toEqual({ text: 'Internal Link', url: './file.md', type: 'internal' });
      expect(links[1]).toEqual({ text: 'External Link', url: 'https://example.com', type: 'external' });
      expect(links[2]).toEqual({ text: 'Relative', url: '../other.md', type: 'internal' });
      expect(links[3]).toEqual({ text: 'Absolute', url: 'http://test.com', type: 'external' });
    });
  });

  describe('validateMarkdown', () => {
    it('should validate correct markdown', () => {
      const content = `# Title

This is [a link](http://example.com) with **bold** text.

- List item 1
- List item 2`;

      const result = processor.validateMarkdown(content);

      expect(result.valid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should detect unbalanced brackets', () => {
      const content = `# Title

This is [unbalanced link(http://example.com).`;

      const result = processor.validateMarkdown(content);

      expect(result.warnings.some(w => w.includes('Unbalanced brackets'))).toBe(true);
    });
  });

  describe('updateFrontmatter', () => {
    it('should update existing frontmatter', () => {
      const content = `---
title: Old Title
author: Old Author
---

# Content

This is content.`;

      const result = processor.updateFrontmatter(content, { title: 'New Title' });

      expect(result).toContain('title: New Title');
      expect(result).toContain('author: Old Author');
      expect(result).toContain('# Content');
    });
  });

  describe('toHtml', () => {
    it('should convert markdown to HTML', async () => {
      const markdown = `# Title

This is **bold** text with a [link](http://example.com).`;

      const html = await processor.toHtml(markdown);

      expect(html).toContain('<h1>Title</h1>');
      expect(html).toContain('<strong>bold</strong>');
      expect(html).toContain('<a href="http://example.com">link</a>');
    });
  });
});