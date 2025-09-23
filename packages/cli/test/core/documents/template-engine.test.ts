/**
 * @fileType: test
 * @status: current
 * @updated: 2025-09-22
 * @tags: [test, template, engine, generation, variables]
 * @related: [template-engine.ts, documents.ts]
 * @priority: high
 * @complexity: medium
 * @dependencies: [jest, fs-extra, path, os]
 */

import { describe, it, expect, beforeEach, afterEach } from '@jest/globals';
import fs from 'fs-extra';
import path from 'path';
import os from 'os';
import { TemplateEngine } from '../../../src/core/documents/template-engine.js';

describe('TemplateEngine', () => {
  let engine: TemplateEngine;
  let tempDir: string;

  beforeEach(async () => {
    engine = TemplateEngine.getInstance();
    tempDir = await fs.mkdtemp(path.join(os.tmpdir(), 'ginko-template-test-'));

    // Clear templates for clean slate in each test
    engine.clearTemplates();
  });

  afterEach(async () => {
    await fs.remove(tempDir);
  });

  describe('built-in templates', () => {
    it('should have ginko-typescript template', () => {
      const template = engine.getTemplate('ginko-typescript');

      expect(template).toBeDefined();
      expect(template!.name).toBe('ginko-typescript');
      expect(template!.format).toBe('md');
      expect(template!.content).toContain('@fileType:');
      expect(template!.content).toContain('@status:');
      expect(template!.content).toContain('@updated:');
    });

    it('should have ginko-markdown template', () => {
      const template = engine.getTemplate('ginko-markdown');

      expect(template).toBeDefined();
      expect(template!.name).toBe('ginko-markdown');
      expect(template!.format).toBe('md');
      expect(template!.content).toContain('title:');
      expect(template!.content).toContain('description:');
    });

    it('should have api-documentation template', () => {
      const template = engine.getTemplate('api-documentation');

      expect(template).toBeDefined();
      expect(template!.name).toBe('api-documentation');
      expect(template!.format).toBe('md');
      expect(template!.content).toContain('## Endpoint');
      expect(template!.content).toContain('## Parameters');
    });

    it('should list all built-in templates', () => {
      const templates = engine.listTemplates();

      expect(templates.length).toBeGreaterThan(0);
      expect(templates.some(t => t.name === 'ginko-typescript')).toBe(true);
      expect(templates.some(t => t.name === 'ginko-markdown')).toBe(true);
      expect(templates.some(t => t.name === 'api-documentation')).toBe(true);
    });
  });

  describe('template registration', () => {
    it('should register custom template', () => {
      const customTemplate = {
        name: 'custom-test',
        description: 'Custom test template',
        format: 'md' as const,
        content: '# {{title}}\n\n{{content}}',
        variables: {
          title: 'Default Title',
          content: 'Default content'
        }
      };

      engine.registerTemplate(customTemplate);

      const retrieved = engine.getTemplate('custom-test');
      expect(retrieved).toBeDefined();
      expect(retrieved!.name).toBe('custom-test');
      expect(retrieved!.content).toBe('# {{title}}\n\n{{content}}');
    });
  });

  describe('generateDocument', () => {
    beforeEach(() => {
      // Register a simple test template
      engine.registerTemplate({
        name: 'test-template',
        description: 'Test template',
        format: 'md',
        content: '# {{title}}\n\nAuthor: {{author}}\nDate: {{date}}\n\n{{content}}',
        variables: {
          title: 'Default Title',
          author: 'Default Author',
          date: '2025-01-01',
          content: 'Default content'
        }
      });
    });

    it('should generate document with default variables', () => {
      const result = engine.generateDocument('test-template');

      expect(result.success).toBe(true);
      expect(result.document).toBeDefined();
      expect(result.document!.content).toContain('# Default Title');
      expect(result.document!.content).toContain('Author: Default Author');
      expect(result.document!.content).toContain('Date: 2025-01-01');
    });

    it('should generate document with custom variables', () => {
      const variables = {
        title: 'Custom Title',
        author: 'Custom Author',
        content: 'Custom content here'
      };

      const result = engine.generateDocument('test-template', variables);

      expect(result.success).toBe(true);
      expect(result.document!.content).toContain('# Custom Title');
      expect(result.document!.content).toContain('Author: Custom Author');
      expect(result.document!.content).toContain('Custom content here');
    });

    it('should handle non-existent template', () => {
      const result = engine.generateDocument('non-existent');

      expect(result.success).toBe(false);
      expect(result.error).toContain('Template not found');
    });
  });

  describe('substituteVariables', () => {
    it('should substitute simple variables', () => {
      const content = 'Hello {{name}}, today is {{day}}.';
      const variables = {
        name: 'World',
        day: 'Monday'
      };

      const result = engine.substituteVariables(content, variables);

      expect(result).toBe('Hello World, today is Monday.');
    });

    it('should handle multiple instances of same variable', () => {
      const content = '{{name}} said "Hello {{name}}!"';
      const variables = { name: 'Alice' };

      const result = engine.substituteVariables(content, variables);

      expect(result).toBe('Alice said "Hello Alice!"');
    });

    it('should handle different data types', () => {
      const content = 'Name: {{name}}, Age: {{age}}, Active: {{active}}, Date: {{date}}';
      const variables = {
        name: 'Test',
        age: 25,
        active: true,
        date: new Date('2025-09-22')
      };

      const result = engine.substituteVariables(content, variables);

      expect(result).toContain('Name: Test');
      expect(result).toContain('Age: 25');
      expect(result).toContain('Active: true');
      expect(result).toContain('Date: 2025-09-22');
    });

    it('should leave unmatched placeholders unchanged', () => {
      const content = 'Hello {{name}}, goodbye {{unknown}}.';
      const variables = { name: 'World' };

      const result = engine.substituteVariables(content, variables);

      expect(result).toBe('Hello World, goodbye {{unknown}}.');
    });
  });

  describe('extractPlaceholders', () => {
    it('should extract all placeholders', () => {
      const content = '{{title}} by {{author}} on {{date}}. {{title}} is great!';

      const placeholders = engine.extractPlaceholders(content);

      expect(placeholders).toEqual(['title', 'author', 'date']);
    });

    it('should handle placeholders with spaces', () => {
      const content = '{{ title }} and {{ complex name }}';

      const placeholders = engine.extractPlaceholders(content);

      expect(placeholders).toEqual(['title', 'complex name']);
    });

    it('should return empty array for no placeholders', () => {
      const content = 'No placeholders here.';

      const placeholders = engine.extractPlaceholders(content);

      expect(placeholders).toEqual([]);
    });
  });

  describe('validateTemplate', () => {
    it('should validate correct template', () => {
      const template = {
        name: 'valid-template',
        description: 'Valid template',
        format: 'md' as const,
        content: '# {{title}}\n\n{{content}}',
        variables: {
          title: 'Default',
          content: 'Default content'
        }
      };

      const result = engine.validateTemplate(template);

      expect(result.valid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should detect missing name', () => {
      const template = {
        name: '',
        description: 'Invalid template',
        format: 'md' as const,
        content: '# {{title}}',
        variables: { title: 'Default' }
      };

      const result = engine.validateTemplate(template);

      expect(result.valid).toBe(false);
      expect(result.errors).toContain('Template name is required');
    });

    it('should detect missing content', () => {
      const template = {
        name: 'invalid-template',
        description: 'Invalid template',
        format: 'md' as const,
        content: '',
        variables: {}
      };

      const result = engine.validateTemplate(template);

      expect(result.valid).toBe(false);
      expect(result.errors).toContain('Template content is required');
    });

    it('should detect placeholder without variable', () => {
      const template = {
        name: 'invalid-template',
        description: 'Invalid template',
        format: 'md' as const,
        content: '# {{title}}\n\n{{missing}}',
        variables: { title: 'Default' }
      };

      const result = engine.validateTemplate(template);

      expect(result.valid).toBe(false);
      expect(result.errors).toContain('Placeholder {{missing}} has no corresponding variable');
    });
  });

  describe('loadTemplatesFromDirectory', () => {
    beforeEach(async () => {
      // Create test template files
      await fs.writeFile(
        path.join(tempDir, 'simple.template.md'),
        '# {{title}}\n\n{{content}}'
      );

      await fs.writeFile(
        path.join(tempDir, 'config.template.json'),
        '{\n  "name": "{{name}}",\n  "version": "{{version}}"\n}'
      );

      await fs.writeFile(
        path.join(tempDir, 'not-a-template.md'),
        '# Regular markdown file'
      );
    });

    it('should load template files from directory', async () => {
      const loaded = await engine.loadTemplatesFromDirectory(tempDir);

      expect(loaded).toBe(2);

      const simpleTemplate = engine.getTemplate('simple');
      expect(simpleTemplate).toBeDefined();
      expect(simpleTemplate!.format).toBe('md');

      const configTemplate = engine.getTemplate('config');
      expect(configTemplate).toBeDefined();
      expect(configTemplate!.format).toBe('json');
    });

    it('should handle non-existent directory', async () => {
      const loaded = await engine.loadTemplatesFromDirectory('/nonexistent');

      expect(loaded).toBe(0);
    });
  });

  describe('createTemplateFromDocument', () => {
    it('should create template from document content', () => {
      const content = '# {{title}}\n\nBy {{author}}\n\n{{content}}';

      const template = engine.createTemplateFromDocument(
        'new-template',
        'Generated template',
        content,
        'md',
        true
      );

      expect(template.name).toBe('new-template');
      expect(template.description).toBe('Generated template');
      expect(template.format).toBe('md');
      expect(template.content).toBe(content);
      expect(template.variables).toEqual({
        title: '{{title}}',
        author: '{{author}}',
        content: '{{content}}'
      });
    });

    it('should create template without variable extraction', () => {
      const content = '# {{title}}\n\n{{content}}';

      const template = engine.createTemplateFromDocument(
        'no-vars',
        'No variables',
        content,
        'md',
        false
      );

      expect(template.variables).toBeUndefined();
    });
  });

  describe('saveTemplate', () => {
    it('should save template to file', async () => {
      const template = {
        name: 'save-test',
        description: 'Test saving',
        format: 'md' as const,
        content: '# {{title}}\n\n{{content}}'
      };

      const saved = await engine.saveTemplate(template, tempDir);

      expect(saved).toBe(true);

      const filePath = path.join(tempDir, 'save-test.template.md');
      expect(await fs.pathExists(filePath)).toBe(true);

      const fileContent = await fs.readFile(filePath, 'utf8');
      expect(fileContent).toBe(template.content);
    });
  });
});