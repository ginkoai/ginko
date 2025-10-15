/**
 * @fileType: utility
 * @status: current
 * @updated: 2025-09-22
 * @tags: [templates, engine, variables, substitution, generation]
 * @related: [document-manager.ts, markdown-processor.ts, ../../types/documents.ts]
 * @priority: high
 * @complexity: medium
 * @dependencies: [fs-extra, path]
 */

import * as fs from 'fs-extra';
import * as path from 'path';
import {
  DocumentTemplate,
  TemplateVariables,
  DocumentFormat,
  DocumentMetadata,
  MarkdownFrontmatter,
  DocumentResult
} from '../../types/documents.js';

/**
 * Template engine for document generation
 */
export class TemplateEngine {
  private static instance: TemplateEngine;
  private templates: Map<string, DocumentTemplate> = new Map();
  private templateDirs: string[] = [];

  private constructor() {
    this.initializeBuiltinTemplates();
  }

  public static getInstance(): TemplateEngine {
    if (!TemplateEngine.instance) {
      TemplateEngine.instance = new TemplateEngine();
    }
    return TemplateEngine.instance;
  }

  /**
   * Initialize built-in templates
   */
  private initializeBuiltinTemplates(): void {
    // Ginko TypeScript file template
    this.registerTemplate({
      name: 'ginko-typescript',
      description: 'Standard TypeScript file with ginko frontmatter',
      format: 'md',
      content: `/**
 * @fileType: {{fileType}}
 * @status: current
 * @updated: {{date}}
 * @tags: [{{tags}}]
 * @related: [{{related}}]
 * @priority: {{priority}}
 * @complexity: {{complexity}}
 * @dependencies: [{{dependencies}}]
 */

{{content}}`,
      variables: {
        fileType: 'utility',
        date: new Date().toISOString().split('T')[0],
        tags: '',
        related: '',
        priority: 'medium',
        complexity: 'medium',
        dependencies: '',
        content: '// Add your code here'
      }
    });

    // Ginko markdown document template
    this.registerTemplate({
      name: 'ginko-markdown',
      description: 'Standard markdown document with frontmatter',
      format: 'md',
      content: `---
title: {{title}}
description: {{description}}
author: {{author}}
created: {{date}}
updated: {{date}}
tags: [{{tags}}]
template: {{template}}
---

# {{title}}

{{description}}

## Overview

{{content}}

## Related Documents

{{related}}`,
      variables: {
        title: 'Document Title',
        description: 'Document description',
        author: 'Ginko AI',
        date: new Date().toISOString().split('T')[0],
        tags: '',
        template: 'ginko-markdown',
        content: 'Add your content here...',
        related: '- [Related Document](./related.md)'
      }
    });

    // API documentation template
    this.registerTemplate({
      name: 'api-documentation',
      description: 'API endpoint documentation template',
      format: 'md',
      content: `# {{endpoint}} API

## Overview
{{description}}

## Endpoint
\`{{method}} {{endpoint}}\`

## Parameters

### Path Parameters
{{pathParams}}

### Query Parameters
{{queryParams}}

### Request Body
{{requestBody}}

## Response

### Success Response
\`\`\`json
{{successResponse}}
\`\`\`

### Error Responses
{{errorResponses}}

## Examples

### Request
\`\`\`bash
{{requestExample}}
\`\`\`

### Response
\`\`\`json
{{responseExample}}
\`\`\`

## Notes
{{notes}}`,
      variables: {
        endpoint: '/api/example',
        method: 'GET',
        description: 'API endpoint description',
        pathParams: 'None',
        queryParams: 'None',
        requestBody: 'None',
        successResponse: '{"success": true, "data": {}}',
        errorResponses: '{"error": "Error message"}',
        requestExample: 'curl -X GET /api/example',
        responseExample: '{"success": true, "data": {}}',
        notes: 'Additional notes about this endpoint'
      }
    });

    // Configuration file template
    this.registerTemplate({
      name: 'config-json',
      description: 'JSON configuration file template',
      format: 'json',
      content: `{
  "name": "{{name}}",
  "version": "{{version}}",
  "description": "{{description}}",
  "config": {
    {{configItems}}
  },
  "created": "{{date}}",
  "updated": "{{date}}"
}`,
      variables: {
        name: 'config-name',
        version: '1.0.0',
        description: 'Configuration file',
        configItems: '"key": "value"',
        date: new Date().toISOString()
      }
    });
  }

  /**
   * Register a new template
   */
  public registerTemplate(template: DocumentTemplate): void {
    this.templates.set(template.name, template);
  }

  /**
   * Get template by name
   */
  public getTemplate(name: string): DocumentTemplate | undefined {
    return this.templates.get(name);
  }

  /**
   * List all available templates
   */
  public listTemplates(): DocumentTemplate[] {
    return Array.from(this.templates.values());
  }

  /**
   * Add template directory
   */
  public addTemplateDirectory(dir: string): void {
    if (!this.templateDirs.includes(dir)) {
      this.templateDirs.push(dir);
    }
  }

  /**
   * Load templates from directory
   */
  public async loadTemplatesFromDirectory(dir: string): Promise<number> {
    try {
      if (!await fs.pathExists(dir)) {
        return 0;
      }

      this.addTemplateDirectory(dir);

      const files = await fs.readdir(dir);
      let loaded = 0;

      for (const file of files) {
        const filePath = path.join(dir, file);
        const stats = await fs.stat(filePath);

        if (stats.isFile() && this.isTemplateFile(file)) {
          const template = await this.loadTemplateFile(filePath);
          if (template) {
            this.registerTemplate(template);
            loaded++;
          }
        }
      }

      return loaded;
    } catch (error) {
      console.error(`Error loading templates from ${dir}:`, error);
      return 0;
    }
  }

  /**
   * Check if file is a template file
   */
  private isTemplateFile(filename: string): boolean {
    const templateExtensions = ['.template.md', '.template.json', '.template.yaml', '.template.txt'];
    return templateExtensions.some(ext => filename.endsWith(ext));
  }

  /**
   * Load template from file
   */
  private async loadTemplateFile(filePath: string): Promise<DocumentTemplate | null> {
    try {
      const content = await fs.readFile(filePath, 'utf8');
      const filename = path.basename(filePath);
      const name = filename.replace(/\.template\.\w+$/, '');
      const format = this.getFormatFromFilename(filename);

      if (!format) {
        console.warn(`Unknown format for template file: ${filename}`);
        return null;
      }

      // Try to extract template metadata from content
      const metadata = this.extractTemplateMetadata(content);

      return {
        name,
        description: metadata.description || `Template loaded from ${filename}`,
        format,
        content: metadata.content || content,
        variables: metadata.variables || {},
        metadata: metadata.metadata
      };
    } catch (error) {
      console.error(`Error loading template ${filePath}:`, error);
      return null;
    }
  }

  /**
   * Get format from filename
   */
  private getFormatFromFilename(filename: string): DocumentFormat | null {
    if (filename.includes('.template.md')) return 'md';
    if (filename.includes('.template.json')) return 'json';
    if (filename.includes('.template.yaml')) return 'yaml';
    if (filename.includes('.template.txt')) return 'txt';
    return null;
  }

  /**
   * Extract template metadata from content
   */
  private extractTemplateMetadata(content: string): {
    description?: string;
    content?: string;
    variables?: TemplateVariables;
    metadata?: Partial<DocumentMetadata>;
  } {
    // For now, just return the content as-is
    // In the future, we could parse special template metadata sections
    return { content };
  }

  /**
   * Generate document from template
   */
  public generateDocument(templateName: string, variables?: TemplateVariables): DocumentResult {
    const template = this.getTemplate(templateName);
    if (!template) {
      return {
        success: false,
        error: `Template not found: ${templateName}`
      };
    }

    try {
      const mergedVariables = this.mergeVariables(template.variables || {}, variables || {});
      const content = this.substituteVariables(template.content, mergedVariables);

      return {
        success: true,
        document: {
          path: '',
          format: template.format,
          metadata: template.metadata || {},
          content
        }
      };
    } catch (error) {
      return {
        success: false,
        error: `Failed to generate document: ${error instanceof Error ? error.message : String(error)}`
      };
    }
  }

  /**
   * Substitute variables in template content
   */
  public substituteVariables(content: string, variables: TemplateVariables): string {
    let result = content;

    for (const [key, value] of Object.entries(variables)) {
      const placeholder = `{{${key}}}`;
      const stringValue = this.formatValue(value);
      result = result.replace(new RegExp(placeholder.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'g'), stringValue);
    }

    return result;
  }

  /**
   * Format variable value for substitution
   */
  private formatValue(value: string | number | boolean | Date): string {
    if (value instanceof Date) {
      return value.toISOString().split('T')[0];
    }
    return String(value);
  }

  /**
   * Merge template variables with user variables
   */
  private mergeVariables(templateVars: TemplateVariables, userVars: TemplateVariables): TemplateVariables {
    return { ...templateVars, ...userVars };
  }

  /**
   * Validate template content
   */
  public validateTemplate(template: DocumentTemplate): { valid: boolean; errors: string[] } {
    const errors: string[] = [];

    if (!template.name || template.name.trim() === '') {
      errors.push('Template name is required');
    }

    if (!template.content || template.content.trim() === '') {
      errors.push('Template content is required');
    }

    if (!template.format) {
      errors.push('Template format is required');
    }

    // Check for valid variable placeholders
    const placeholders = this.extractPlaceholders(template.content);
    const variables = Object.keys(template.variables || {});

    for (const placeholder of placeholders) {
      if (!variables.includes(placeholder)) {
        errors.push(`Placeholder {{${placeholder}}} has no corresponding variable`);
      }
    }

    return {
      valid: errors.length === 0,
      errors
    };
  }

  /**
   * Extract placeholder names from template content
   */
  public extractPlaceholders(content: string): string[] {
    const placeholderRegex = /\{\{([^}]+)\}\}/g;
    const placeholders: string[] = [];
    let match;

    while ((match = placeholderRegex.exec(content)) !== null) {
      const placeholder = match[1].trim();
      if (!placeholders.includes(placeholder)) {
        placeholders.push(placeholder);
      }
    }

    return placeholders;
  }

  /**
   * Create template from document
   */
  public createTemplateFromDocument(name: string, description: string, content: string, format: DocumentFormat, extractVariables: boolean = true): DocumentTemplate {
    const template: DocumentTemplate = {
      name,
      description,
      format,
      content
    };

    if (extractVariables) {
      const placeholders = this.extractPlaceholders(content);
      template.variables = {};

      for (const placeholder of placeholders) {
        template.variables[placeholder] = `{{${placeholder}}}`;
      }
    }

    return template;
  }

  /**
   * Save template to file
   */
  public async saveTemplate(template: DocumentTemplate, outputDir: string): Promise<boolean> {
    try {
      await fs.ensureDir(outputDir);

      const filename = `${template.name}.template.${template.format}`;
      const filePath = path.join(outputDir, filename);

      await fs.writeFile(filePath, template.content, 'utf8');
      return true;
    } catch (error) {
      console.error(`Error saving template ${template.name}:`, error);
      return false;
    }
  }

  /**
   * Clear all templates
   */
  public clearTemplates(): void {
    this.templates.clear();
    this.initializeBuiltinTemplates();
  }
}