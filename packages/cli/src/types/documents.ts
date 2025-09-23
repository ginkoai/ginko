/**
 * @fileType: model
 * @status: current
 * @updated: 2025-09-22
 * @tags: [types, documents, interfaces]
 * @related: [document-manager.ts, markdown-processor.ts]
 * @priority: critical
 * @complexity: medium
 * @dependencies: []
 */

// Document formats supported by the system
export type DocumentFormat = 'md' | 'json' | 'yaml' | 'txt';

// Document processing result
export interface DocumentResult<T = any> {
  success: boolean;
  data?: T;
  error?: string;
  warnings?: string[];
}

// Document metadata
export interface DocumentMetadata {
  path: string;
  format: DocumentFormat;
  size: number;
  created: Date;
  modified: Date;
  frontmatter?: Record<string, any>;
}

// Search criteria for documents
export interface DocumentSearchCriteria {
  pattern?: string;
  format?: DocumentFormat;
  tags?: string[];
  directory?: string;
  recursive?: boolean;
  maxResults?: number;
}

// Document statistics
export interface DocumentStats {
  wordCount: number;
  lineCount: number;
  characterCount: number;
  readingTime: number; // in minutes
}

// Frontmatter validation result
export interface FrontmatterValidation {
  valid: boolean;
  errors: string[];
  warnings: string[];
  metadata: Record<string, any>;
}

// Template context for document generation
export interface TemplateContext {
  [key: string]: any;
  date?: string;
  author?: string;
  project?: string;
}

// Template definition
export interface Template {
  name: string;
  description: string;
  content: string;
  variables: string[];
}

// Document creation options
export interface DocumentCreateOptions {
  template?: string;
  context?: TemplateContext;
  overwrite?: boolean;
  backup?: boolean;
}

// Document update options
export interface DocumentUpdateOptions {
  merge?: boolean;
  preserveFrontmatter?: boolean;
  backup?: boolean;
}

// File system operation result
export interface FileSystemResult<T = any> {
  success: boolean;
  data?: T;
  error?: string;
  path?: string;
}

// Document link information
export interface DocumentLink {
  text: string;
  url: string;
  type: 'internal' | 'external';
  valid: boolean;
}

// Table of contents entry
export interface TOCEntry {
  level: number;
  title: string;
  anchor: string;
  line: number;
}