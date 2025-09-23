/**
 * @fileType: utility
 * @status: current
 * @updated: 2025-09-22
 * @tags: [markdown, parser, frontmatter, processing, content]
 * @related: [document-manager.ts, template-engine.ts, ../../types/documents.ts]
 * @priority: high
 * @complexity: medium
 * @dependencies: [marked, gray-matter, fs-extra]
 */

import { marked } from 'marked';
import * as matter from 'gray-matter';
import * as fs from 'fs-extra';
import * as path from 'path';
import { Document, DocumentMetadata, MarkdownFrontmatter, DocumentResult, DocumentOptions } from '../../types/documents.js';

/**
 * Markdown processing and manipulation utilities
 */
export class MarkdownProcessor {
  private static instance: MarkdownProcessor;

  private constructor() {
    this.configureMarked();
  }

  public static getInstance(): MarkdownProcessor {
    if (!MarkdownProcessor.instance) {
      MarkdownProcessor.instance = new MarkdownProcessor();
    }
    return MarkdownProcessor.instance;
  }

  /**
   * Configure marked parser with safe defaults
   */
  private configureMarked(): void {
    marked.setOptions({
      gfm: true,
      breaks: false,
      pedantic: false,
      
      
      
    });
  }

  /**
   * Parse markdown file with frontmatter
   */
  public async parseFile(filePath: string, options: DocumentOptions = {}): Promise<DocumentResult> {
    try {
      if (!await fs.pathExists(filePath)) {
        return {
          success: false,
          error: `File not found: ${filePath}`
        };
      }

      const encoding = options.encoding || 'utf8';
      const raw = await fs.readFile(filePath, encoding);

      return this.parseContent(raw, filePath, options);
    } catch (error) {
      return {
        success: false,
        error: `Failed to parse file ${filePath}: ${error instanceof Error ? error.message : String(error)}`
      };
    }
  }

  /**
   * Parse markdown content string
   */
  public parseContent(content: string, filePath?: string, options: DocumentOptions = {}): DocumentResult {
    try {
      const parsed = matter(content);

      // Validate frontmatter if requested
      if (options.validateFrontmatter) {
        const validation = this.validateFrontmatter(parsed.data);
        if (!validation.valid) {
          return {
            success: false,
            error: `Invalid frontmatter: ${validation.errors.join(', ')}`,
            warnings: validation.warnings
          };
        }
      }

      const document: Document = {
        path: filePath || '',
        format: 'md',
        metadata: this.extractMetadata(parsed.data),
        content: parsed.content.trim(),
        raw: content
      };

      return {
        success: true,
        document
      };
    } catch (error) {
      return {
        success: false,
        error: `Failed to parse content: ${error instanceof Error ? error.message : String(error)}`
      };
    }
  }

  /**
   * Convert markdown to HTML
   */
  public async toHtml(content: string): Promise<string> {
    return marked(content);
  }

  /**
   * Extract and normalize metadata from frontmatter
   */
  private extractMetadata(frontmatter: any): DocumentMetadata {
    const metadata: DocumentMetadata = {};

    // Standard fields
    if (frontmatter.title) metadata.title = String(frontmatter.title);
    if (frontmatter.description) metadata.description = String(frontmatter.description);
    if (frontmatter.author) metadata.author = String(frontmatter.author);

    // Date fields
    if (frontmatter.created) {
      metadata.created = new Date(frontmatter.created);
    }
    if (frontmatter.updated) {
      metadata.updated = new Date(frontmatter.updated);
    }

    // Array fields
    if (Array.isArray(frontmatter.tags)) {
      metadata.tags = frontmatter.tags.map((tag: any) => String(tag));
    }

    // Template field
    if (frontmatter.template) metadata.template = String(frontmatter.template);
    if (frontmatter.version) metadata.version = String(frontmatter.version);

    // Copy all other fields
    for (const [key, value] of Object.entries(frontmatter)) {
      if (!metadata.hasOwnProperty(key)) {
        metadata[key] = value;
      }
    }

    return metadata;
  }

  /**
   * Validate frontmatter structure
   */
  public validateFrontmatter(frontmatter: any): { valid: boolean; errors: string[]; warnings: string[] } {
    const errors: string[] = [];
    const warnings: string[] = [];

    // Check for required ginko frontmatter fields
    if (!frontmatter.fileType) {
      warnings.push('Missing @fileType field');
    } else {
      const validFileTypes = ['component', 'page', 'api-route', 'hook', 'utility', 'provider', 'model', 'config'];
      if (!validFileTypes.includes(frontmatter.fileType)) {
        warnings.push(`Unusual fileType: ${frontmatter.fileType}`);
      }
    }

    if (!frontmatter.status) {
      warnings.push('Missing @status field');
    } else {
      const validStatuses = ['current', 'deprecated', 'draft'];
      if (!validStatuses.includes(frontmatter.status)) {
        errors.push(`Invalid status: ${frontmatter.status}. Must be one of: ${validStatuses.join(', ')}`);
      }
    }

    if (!frontmatter.updated) {
      warnings.push('Missing @updated field');
    }

    if (frontmatter.priority) {
      const validPriorities = ['critical', 'high', 'medium', 'low'];
      if (!validPriorities.includes(frontmatter.priority)) {
        errors.push(`Invalid priority: ${frontmatter.priority}. Must be one of: ${validPriorities.join(', ')}`);
      }
    }

    if (frontmatter.complexity) {
      const validComplexities = ['low', 'medium', 'high'];
      if (!validComplexities.includes(frontmatter.complexity)) {
        errors.push(`Invalid complexity: ${frontmatter.complexity}. Must be one of: ${validComplexities.join(', ')}`);
      }
    }

    return {
      valid: errors.length === 0,
      errors,
      warnings
    };
  }

  /**
   * Generate markdown with frontmatter
   */
  public generateMarkdown(metadata: MarkdownFrontmatter, content: string): string {
    const frontmatterString = this.generateFrontmatter(metadata);
    return `${frontmatterString}\n\n${content}`;
  }

  /**
   * Generate frontmatter string
   */
  public generateFrontmatter(metadata: MarkdownFrontmatter): string {
    const lines: string[] = ['/**'];

    if (metadata.fileType) lines.push(` * @fileType: ${metadata.fileType}`);
    if (metadata.status) lines.push(` * @status: ${metadata.status}`);
    if (metadata.updated) {
      const date = metadata.updated instanceof Date ? metadata.updated : new Date(metadata.updated);
      lines.push(` * @updated: ${date.toISOString().split('T')[0]}`);
    }
    if (metadata.tags && metadata.tags.length > 0) {
      lines.push(` * @tags: [${metadata.tags.join(', ')}]`);
    }
    if (metadata.related && metadata.related.length > 0) {
      lines.push(` * @related: [${metadata.related.join(', ')}]`);
    }
    if (metadata.priority) lines.push(` * @priority: ${metadata.priority}`);
    if (metadata.complexity) lines.push(` * @complexity: ${metadata.complexity}`);
    if (metadata.dependencies && metadata.dependencies.length > 0) {
      lines.push(` * @dependencies: [${metadata.dependencies.join(', ')}]`);
    }

    lines.push(' */');
    return lines.join('\n');
  }

  /**
   * Update frontmatter in existing markdown
   */
  public updateFrontmatter(content: string, updates: Partial<MarkdownFrontmatter>): string {
    const parsed = matter(content);
    const updatedData = { ...parsed.data, ...updates };

    return matter.stringify(parsed.content, updatedData);
  }

  /**
   * Extract table of contents from markdown
   */
  public extractTableOfContents(content: string): Array<{ level: number; title: string; anchor: string }> {
    const toc: Array<{ level: number; title: string; anchor: string }> = [];
    const lines = content.split('\n');

    for (const line of lines) {
      const match = line.match(/^(#{1,6})\s+(.+)$/);
      if (match) {
        const level = match[1].length;
        const title = match[2].trim();
        const anchor = title
          .toLowerCase()
          .replace(/[^\w\s-]/g, '')
          .replace(/\s+/g, '-');

        toc.push({ level, title, anchor });
      }
    }

    return toc;
  }

  /**
   * Extract links from markdown content
   */
  public extractLinks(content: string): Array<{ text: string; url: string; type: 'internal' | 'external' }> {
    const links: Array<{ text: string; url: string; type: 'internal' | 'external' }> = [];

    // Match markdown links [text](url)
    const linkRegex = /\[([^\]]+)\]\(([^)]+)\)/g;
    let match;

    while ((match = linkRegex.exec(content)) !== null) {
      const text = match[1];
      const url = match[2];
      const type = url.startsWith('http') || url.startsWith('//') ? 'external' : 'internal';

      links.push({ text, url, type });
    }

    return links;
  }

  /**
   * Validate markdown syntax
   */
  public validateMarkdown(content: string): { valid: boolean; errors: string[]; warnings: string[] } {
    const errors: string[] = [];
    const warnings: string[] = [];

    try {
      // Try to parse with marked
      marked(content);

      // Check for common issues
      const lines = content.split('\n');

      for (let i = 0; i < lines.length; i++) {
        const line = lines[i];
        const lineNum = i + 1;

        // Check for unbalanced brackets
        const openBrackets = (line.match(/\[/g) || []).length;
        const closeBrackets = (line.match(/\]/g) || []).length;
        if (openBrackets !== closeBrackets) {
          warnings.push(`Line ${lineNum}: Unbalanced brackets`);
        }

        // Check for unbalanced parentheses in links
        const openParens = (line.match(/\(/g) || []).length;
        const closeParens = (line.match(/\)/g) || []).length;
        if (openParens !== closeParens) {
          warnings.push(`Line ${lineNum}: Unbalanced parentheses`);
        }
      }

    } catch (error) {
      errors.push(`Markdown parsing error: ${error instanceof Error ? error.message : String(error)}`);
    }

    return {
      valid: errors.length === 0,
      errors,
      warnings
    };
  }
}