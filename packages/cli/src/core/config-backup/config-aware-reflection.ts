/**
 * @fileType: utility
 * @status: current
 * @updated: 2025-09-21
 * @tags: [reflection, config-aware, paths, documents, base-class]
 * @related: [reflection-pattern.ts, config-loader.ts, reflectors]
 * @priority: high
 * @complexity: medium
 * @dependencies: [reflection-pattern, config-loader, fs-extra, path, path-config]
 */

import { ReflectionCommand } from '../reflection-pattern.js';
import { configLoader } from './config-loader.js';
import { GinkoConfig } from '../../types/config.js';
import { pathManager } from './path-config.js';
import fs from 'fs-extra';
import path from 'path';
import chalk from 'chalk';

/**
 * Configuration-aware reflection base class
 * Handles path resolution and document naming using pathManager
 */
export abstract class ConfigAwareReflectionCommand extends ReflectionCommand {
  protected config: GinkoConfig | null = null;

  constructor(domain: string) {
    super(domain);
  }

  /**
   * Load configuration before executing
   */
  async execute(intent: string, options: any = {}): Promise<void> {
    // Load configuration
    this.config = await configLoader.loadConfig();

    // Call parent execute
    await super.execute(intent, options);
  }

  /**
   * Save artifact using configuration-based paths
   */
  async saveArtifact(content: string, filename?: string): Promise<string> {
    if (!this.config) {
      throw new Error('Configuration not loaded');
    }

    // Get the configured path for this domain
    const documentPath = await this.getDocumentPath();
    await fs.ensureDir(documentPath);

    // Generate filename if not provided
    if (!filename) {
      filename = await this.generateDocumentName(content);
    }

    const filePath = path.join(documentPath, filename);
    await fs.writeFile(filePath, content, 'utf8');

    console.log(chalk.green(`✓ Saved to: ${filePath}`));
    return filePath;
  }

  /**
   * Get document path for this domain using pathManager
   */
  protected async getDocumentPath(): Promise<string> {
    try {
      // Map domain to configuration path using pathManager
      const pathConfig = pathManager.getConfig();

      const pathMapping: Record<string, string> = {
        'prd': pathConfig.docs.prd,
        'architecture': pathConfig.docs.adr,
        'adr': pathConfig.docs.adr,
        'sprint': pathConfig.docs.sprints,
        'backlog': pathConfig.ginko.backlog,
        'documentation': pathConfig.docs.root
      };

      const documentPath = pathMapping[this.domain];
      if (!documentPath) {
        throw new Error(`No path configured for domain: ${this.domain}`);
      }

      return documentPath;
    } catch (error) {
      // Fallback to default paths if configuration fails
      console.warn(chalk.yellow(`Warning: Using fallback path for ${this.domain}`));
      return this.getFallbackPath();
    }
  }

  /**
   * Get fallback path when configuration fails - now using pathManager
   */
  protected getFallbackPath(): string {
    const pathConfig = pathManager.getConfig();

    const fallbackPaths: Record<string, string> = {
      'prd': pathConfig.docs.prd,
      'architecture': pathConfig.docs.adr,
      'adr': pathConfig.docs.adr,
      'sprint': pathConfig.docs.sprints,
      'backlog': pathConfig.ginko.backlog,
      'documentation': pathConfig.docs.root
    };

    return fallbackPaths[this.domain] || pathConfig.docs.root;
  }

  // ... rest of the methods remain the same but paths are now configuration-based
}