/**
 * @fileType: utility
 * @status: current
 * @updated: 2025-09-22
 * @tags: [documents, manager, orchestration, markdown, templates, filesystem]
 * @related: [markdown-processor.ts, file-system.ts, template-engine.ts, ../../types/documents.ts]
 * @priority: critical
 * @complexity: high
 * @dependencies: [fs-extra, path, gray-matter, marked]
 */

import * as path from 'path';
import {
  Document,
  DocumentFormat,
  DocumentResult,
  BatchDocumentResult,
  DocumentSearchCriteria,
  DocumentOptions,
  TemplateVariables,
  DocumentMetadata
} from '../../types/documents.js';
import { MarkdownProcessor } from './markdown-processor.js';
import { DocumentFileSystem } from './file-system.js';
import { TemplateEngine } from './template-engine.js';

/**
 * Central document management orchestrator
 */
export class DocumentManager {
  private static instance: DocumentManager;
  private markdownProcessor: MarkdownProcessor;
  private fileSystem: DocumentFileSystem;
  private templateEngine: TemplateEngine;

  private constructor() {
    this.markdownProcessor = MarkdownProcessor.getInstance();
    this.fileSystem = DocumentFileSystem.getInstance();
    this.templateEngine = TemplateEngine.getInstance();
  }

  public static getInstance(): DocumentManager {
    if (!DocumentManager.instance) {
      DocumentManager.instance = new DocumentManager();
    }
    return DocumentManager.instance;
  }

  /**
   * Load document from file
   */
  public async loadDocument(filePath: string, options: DocumentOptions = {}): Promise<DocumentResult> {
    try {
      const absolutePath = this.fileSystem.getAbsolutePath(filePath);
      const format = this.fileSystem.getDocumentFormat(absolutePath);

      if (!format) {
        return {
          success: false,
          error: `Unsupported file format: ${path.extname(filePath)}`
        };
      }

      switch (format) {
        case 'md':
          return await this.markdownProcessor.parseFile(absolutePath, options);

        case 'json':
          return await this.loadJsonDocument(absolutePath, options);

        case 'yaml':
          return await this.loadYamlDocument(absolutePath, options);

        case 'txt':
          return await this.loadTextDocument(absolutePath, options);

        default:
          return {
            success: false,
            error: `Unsupported document format: ${format}`
          };
      }
    } catch (error) {
      return {
        success: false,
        error: `Failed to load document: ${error instanceof Error ? error.message : String(error)}`
      };
    }
  }

  /**
   * Save document to file
   */
  public async saveDocument(document: Document, filePath?: string, options: DocumentOptions = {}): Promise<DocumentResult> {
    try {
      const targetPath = filePath || document.path;
      if (!targetPath) {
        return {
          success: false,
          error: 'No file path specified'
        };
      }

      const absolutePath = this.fileSystem.getAbsolutePath(targetPath);
      const format = document.format || this.fileSystem.getDocumentFormat(absolutePath);

      if (!format) {
        return {
          success: false,
          error: `Cannot determine document format for: ${targetPath}`
        };
      }

      let content: string;

      switch (format) {
        case 'md':
          content = this.generateMarkdownContent(document);
          break;

        case 'json':
          content = this.generateJsonContent(document);
          break;

        case 'yaml':
          content = this.generateYamlContent(document);
          break;

        case 'txt':
          content = document.content;
          break;

        default:
          return {
            success: false,
            error: `Unsupported document format: ${format}`
          };
      }

      const writeResult = await this.fileSystem.writeFile(absolutePath, content, options);

      if (!writeResult.success) {
        return {
          success: false,
          error: writeResult.error
        };
      }

      // Update document path and metadata
      const updatedDocument: Document = {
        ...document,
        path: absolutePath,
        metadata: {
          ...document.metadata,
          updated: new Date()
        }
      };

      return {
        success: true,
        document: updatedDocument
      };
    } catch (error) {
      return {
        success: false,
        error: `Failed to save document: ${error instanceof Error ? error.message : String(error)}`
      };
    }
  }

  /**
   * Create document from template
   */
  public createFromTemplate(templateName: string, variables?: TemplateVariables, outputPath?: string): DocumentResult {
    try {
      const result = this.templateEngine.generateDocument(templateName, variables);

      if (!result.success || !result.document) {
        return result;
      }

      if (outputPath) {
        result.document.path = this.fileSystem.getAbsolutePath(outputPath);
      }

      return result;
    } catch (error) {
      return {
        success: false,
        error: `Failed to create document from template: ${error instanceof Error ? error.message : String(error)}`
      };
    }
  }

  /**
   * Search for documents
   */
  public async searchDocuments(criteria: DocumentSearchCriteria, baseDir?: string): Promise<string[]> {
    return await this.fileSystem.findFiles(criteria, baseDir);
  }

  /**
   * Load multiple documents
   */
  public async loadDocuments(filePaths: string[], options: DocumentOptions = {}): Promise<BatchDocumentResult> {
    const results: DocumentResult[] = [];
    let processed = 0;
    let failed = 0;
    const errors: string[] = [];

    for (const filePath of filePaths) {
      const result = await this.loadDocument(filePath, options);
      results.push(result);

      if (result.success) {
        processed++;
      } else {
        failed++;
        if (result.error) {
          errors.push(`${filePath}: ${result.error}`);
        }
      }
    }

    return {
      success: failed === 0,
      processed,
      failed,
      results,
      errors
    };
  }

  /**
   * Validate document
   */
  public validateDocument(document: Document): { valid: boolean; errors: string[]; warnings: string[] } {
    const errors: string[] = [];
    const warnings: string[] = [];

    // Basic validation
    if (!document.content || document.content.trim() === '') {
      errors.push('Document content is empty');
    }

    if (!document.format) {
      errors.push('Document format is not specified');
    }

    // Format-specific validation
    if (document.format === 'md') {
      const markdownValidation = this.markdownProcessor.validateMarkdown(document.content);
      errors.push(...markdownValidation.errors);
      warnings.push(...markdownValidation.warnings);

      // Validate frontmatter if present
      if (document.raw) {
        const frontmatterValidation = this.markdownProcessor.validateFrontmatter(document.metadata);
        errors.push(...frontmatterValidation.errors);
        warnings.push(...frontmatterValidation.warnings);
      }
    }

    return {
      valid: errors.length === 0,
      errors,
      warnings
    };
  }

  /**
   * Get document statistics
   */
  public getDocumentStats(document: Document): {
    wordCount: number;
    characterCount: number;
    lineCount: number;
    hasMetadata: boolean;
    links: Array<{ text: string; url: string; type: 'internal' | 'external' }>;
    toc?: Array<{ level: number; title: string; anchor: string }>;
  } {
    const content = document.content;
    const wordCount = content.split(/\s+/).filter(word => word.length > 0).length;
    const characterCount = content.length;
    const lineCount = content.split('\n').length;
    const hasMetadata = Object.keys(document.metadata).length > 0;

    const stats = {
      wordCount,
      characterCount,
      lineCount,
      hasMetadata,
      links: [] as Array<{ text: string; url: string; type: 'internal' | 'external' }>
    };

    // Extract links and TOC for markdown
    if (document.format === 'md') {
      stats.links = this.markdownProcessor.extractLinks(content);
      (stats as any).toc = this.markdownProcessor.extractTableOfContents(content);
    }

    return stats;
  }

  /**
   * Copy document
   */
  public async copyDocument(sourcePath: string, destPath: string, options: DocumentOptions = {}): Promise<DocumentResult> {
    try {
      const sourceDoc = await this.loadDocument(sourcePath, options);
      if (!sourceDoc.success || !sourceDoc.document) {
        return sourceDoc;
      }

      // Update metadata
      sourceDoc.document.metadata.created = new Date();
      sourceDoc.document.metadata.updated = new Date();

      return await this.saveDocument(sourceDoc.document, destPath, options);
    } catch (error) {
      return {
        success: false,
        error: `Failed to copy document: ${error instanceof Error ? error.message : String(error)}`
      };
    }
  }

  /**
   * Move document
   */
  public async moveDocument(sourcePath: string, destPath: string, options: DocumentOptions = {}): Promise<DocumentResult> {
    try {
      const copyResult = await this.copyDocument(sourcePath, destPath, options);
      if (!copyResult.success) {
        return copyResult;
      }

      // Delete source file
      const deleteResult = await this.fileSystem.deleteFile(sourcePath);
      if (!deleteResult.success) {
        return {
          success: false,
          error: `Failed to delete source file: ${deleteResult.error}`
        };
      }

      return copyResult;
    } catch (error) {
      return {
        success: false,
        error: `Failed to move document: ${error instanceof Error ? error.message : String(error)}`
      };
    }
  }

  /**
   * Delete document
   */
  public async deleteDocument(filePath: string): Promise<DocumentResult> {
    try {
      const result = await this.fileSystem.deleteFile(filePath);

      return {
        success: result.success,
        error: result.error
      };
    } catch (error) {
      return {
        success: false,
        error: `Failed to delete document: ${error instanceof Error ? error.message : String(error)}`
      };
    }
  }

  // Private helper methods

  private async loadJsonDocument(filePath: string, options: DocumentOptions): Promise<DocumentResult> {
    try {
      const content = await import('fs-extra').then(fs => fs.readFile(filePath, options.encoding || 'utf8'));
      const jsonData = JSON.parse(content);

      return {
        success: true,
        document: {
          path: filePath,
          format: 'json',
          metadata: this.extractJsonMetadata(jsonData),
          content: JSON.stringify(jsonData, null, 2),
          raw: content
        }
      };
    } catch (error) {
      return {
        success: false,
        error: `Failed to parse JSON: ${error instanceof Error ? error.message : String(error)}`
      };
    }
  }

  private async loadYamlDocument(filePath: string, options: DocumentOptions): Promise<DocumentResult> {
    try {
      const content = await import('fs-extra').then(fs => fs.readFile(filePath, options.encoding || 'utf8'));

      // For now, treat YAML as plain text
      // In the future, we could add yaml parsing if needed
      return {
        success: true,
        document: {
          path: filePath,
          format: 'yaml',
          metadata: {},
          content,
          raw: content
        }
      };
    } catch (error) {
      return {
        success: false,
        error: `Failed to load YAML: ${error instanceof Error ? error.message : String(error)}`
      };
    }
  }

  private async loadTextDocument(filePath: string, options: DocumentOptions): Promise<DocumentResult> {
    try {
      const content = await import('fs-extra').then(fs => fs.readFile(filePath, options.encoding || 'utf8'));

      return {
        success: true,
        document: {
          path: filePath,
          format: 'txt',
          metadata: {},
          content,
          raw: content
        }
      };
    } catch (error) {
      return {
        success: false,
        error: `Failed to load text document: ${error instanceof Error ? error.message : String(error)}`
      };
    }
  }

  private generateMarkdownContent(document: Document): string {
    if (document.metadata && Object.keys(document.metadata).length > 0) {
      return this.markdownProcessor.generateMarkdown(document.metadata as any, document.content);
    }
    return document.content;
  }

  private generateJsonContent(document: Document): string {
    const jsonData = {
      metadata: document.metadata,
      content: document.content
    };
    return JSON.stringify(jsonData, null, 2);
  }

  private generateYamlContent(document: Document): string {
    // For now, just return content as-is
    // In the future, we could add proper YAML serialization
    return document.content;
  }

  private extractJsonMetadata(jsonData: any): DocumentMetadata {
    const metadata: DocumentMetadata = {};

    if (jsonData.metadata) {
      return jsonData.metadata;
    }

    // Extract common fields
    if (jsonData.title) metadata.title = jsonData.title;
    if (jsonData.description) metadata.description = jsonData.description;
    if (jsonData.author) metadata.author = jsonData.author;
    if (jsonData.created) metadata.created = new Date(jsonData.created);
    if (jsonData.updated) metadata.updated = new Date(jsonData.updated);
    if (jsonData.version) metadata.version = jsonData.version;

    return metadata;
  }

  /**
   * Initialize template directories
   */
  public async initializeTemplateDirectories(dirs: string[]): Promise<number> {
    let totalLoaded = 0;

    for (const dir of dirs) {
      try {
        const loaded = await this.templateEngine.loadTemplatesFromDirectory(dir);
        totalLoaded += loaded;
      } catch (error) {
        console.error(`Failed to load templates from ${dir}:`, error);
      }
    }

    return totalLoaded;
  }

  /**
   * Get available templates
   */
  public getAvailableTemplates() {
    return this.templateEngine.listTemplates();
  }
}