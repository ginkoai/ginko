/**
 * @fileType: command
 * @status: current
 * @updated: 2025-09-20
 * @tags: [prd, reflection, requirements, product, config-aware]
 * @related: [../../core/config/config-aware-reflection.ts, prd-reflection.ts]
 * @priority: critical
 * @complexity: medium
 * @dependencies: [config-aware-reflection, fs-extra, chalk]
 */

import { ConfigAwareReflectionCommand } from '../../core/config/config-aware-reflection.js';
import { exec } from 'child_process';
import { promisify } from 'util';
import chalk from 'chalk';

const execAsync = promisify(exec);

/**
 * Enhanced PRD reflection command with configuration support
 * Uses configurable paths and document naming conventions
 */
export class PRDReflectionCommand extends ConfigAwareReflectionCommand {
  constructor() {
    super('prd');
  }

  /**
   * Execute PRD reflection with enhanced configuration support
   */
  async execute(intent: string, options: any = {}): Promise<void> {
    console.log(chalk.blue('🔍 Creating Product Requirements Document...'));

    // Load configuration first
    await super.execute(intent, options);

    try {
      // Gather context for PRD
      const context = await this.gatherPRDContext();

      // Generate PRD content
      const prdContent = await this.generatePRD(intent, context);

      // Save using configuration-aware paths and naming
      const savedPath = await this.saveArtifact(prdContent);

      this.displayCreationSummary(savedPath, 'Product Requirements Document');

    } catch (error) {
      console.error(chalk.red('Failed to create PRD:'), error);
      throw error;
    }
  }

  /**
   * Gather context for PRD creation
   */
  private async gatherPRDContext(): Promise<any> {
    const context: any = {
      timestamp: new Date().toISOString(),
      projectRoot: process.cwd()
    };

    try {
      // Get git information
      const { stdout: gitBranch } = await execAsync('git branch --show-current');
      context.branch = gitBranch.trim();

      const { stdout: gitRemote } = await execAsync('git remote get-url origin');
      context.repository = gitRemote.trim();
    } catch (error) {
      // Git info not critical
      context.branch = 'unknown';
      context.repository = 'unknown';
    }

    try {
      // Get package.json if it exists
      const fs = await import('fs-extra');
      const path = await import('path');
      const packagePath = path.join(context.projectRoot, 'package.json');

      if (await fs.pathExists(packagePath)) {
        const packageJson = await fs.readJSON(packagePath);
        context.projectName = packageJson.name;
        context.version = packageJson.version;
        context.description = packageJson.description;
      }
    } catch (error) {
      // Package.json not critical
    }

    return context;
  }

  /**
   * Generate PRD content using template
   */
  private async generatePRD(intent: string, context: any): Promise<string> {
    const template = this.getPRDTemplate();

    const variables = {
      title: this.extractPRDTitle(intent),
      intent: intent,
      date: new Date().toISOString().slice(0, 10),
      projectName: context.projectName || 'Project',
      version: context.version || '1.0.0',
      branch: context.branch || 'main',
      author: await this.getAuthor()
    };

    return await this.replacePlaceholders(template, variables);
  }

  /**
   * Extract PRD title from intent
   */
  private extractPRDTitle(intent: string): string {
    // Clean up and format the intent as a title
    const title = intent
      .replace(/^(create|write|generate|prd|requirement)\s*/i, '')
      .replace(/\s+/g, ' ')
      .trim();

    return title.charAt(0).toUpperCase() + title.slice(1);
  }

  /**
   * Get author from git config
   */
  private async getAuthor(): Promise<string> {
    try {
      const { stdout } = await execAsync('git config user.name');
      return stdout.trim();
    } catch (error) {
      return 'Product Team';
    }
  }

  /**
   * Replace placeholders in template
   */
  private async replacePlaceholders(template: string, variables: Record<string, any>): Promise<string> {
    let content = template;

    for (const [key, value] of Object.entries(variables)) {
      const placeholder = new RegExp(`\\{\\{${key}\\}\\}`, 'g');
      content = content.replace(placeholder, String(value));
    }

    return content;
  }

  /**
   * Get PRD template
   */
  private getPRDTemplate(): string {
    return `# Product Requirements Document: {{title}}

## Executive Summary
{{intent}}

## Problem Statement

### Current State
<!-- Describe the current situation and pain points -->

### Desired State
<!-- Describe the ideal outcome after implementing this requirement -->

## Success Metrics

### Primary KPIs
<!-- Key performance indicators to measure success -->

### Secondary KPIs
<!-- Additional metrics that indicate success -->

## User Stories

### Story 1: [User Type]
**As a** [user type]
**I want to** [action/capability]
**So that I** [benefit/outcome]

**Acceptance Criteria:**
- [ ] Criterion 1
- [ ] Criterion 2
- [ ] Criterion 3

## Solution Overview

### Approach
<!-- High-level solution approach -->

### Key Features
<!-- Main features and capabilities -->

### Technical Requirements
<!-- Technical constraints and requirements -->

## Implementation Plan

### Phase 1: Foundation
- [ ] Task 1
- [ ] Task 2

### Phase 2: Core Features
- [ ] Task 1
- [ ] Task 2

### Phase 3: Enhancement
- [ ] Task 1
- [ ] Task 2

## Risk Analysis

### High Risk
- **Risk**: Description
- **Mitigation**: Approach

### Medium Risk
- **Risk**: Description
- **Mitigation**: Approach

## Success Criteria for Launch

### Must Have
- [ ] Criterion 1
- [ ] Criterion 2

### Should Have
- [ ] Criterion 1
- [ ] Criterion 2

### Nice to Have
- [ ] Criterion 1
- [ ] Criterion 2

## Future Enhancements

### Phase 2 Considerations
<!-- Future improvements and extensions -->

---

**Document Version**: 1.0.0
**Last Updated**: {{date}}
**Author**: {{author}}
**Status**: Draft
**Project**: {{projectName}} v{{version}}
**Branch**: {{branch}}`;
  }

  /**
   * Override to provide PRD-specific document type
   */
  protected getDocumentType(): string {
    return 'PRD';
  }

  /**
   * Override to provide better PRD title extraction
   */
  protected extractTitle(content: string): string {
    // Try PRD-specific patterns first
    const patterns = [
      /^#\s+Product Requirements Document:\s+(.+)$/m,
      /^#\s+PRD:\s+(.+)$/m,
      /^#\s+(.+)$/m
    ];

    for (const pattern of patterns) {
      const match = content.match(pattern);
      if (match && match[1]) {
        return match[1].trim();
      }
    }

    return 'product-requirements-document';
  }

  /**
   * Display PRD-specific creation summary
   */
  protected displayCreationSummary(filePath: string, documentType: string): void {
    super.displayCreationSummary(filePath, documentType);

    console.log(chalk.yellow('\n📋 PRD Template sections:'));
    console.log(chalk.dim('  • Executive Summary - High-level overview'));
    console.log(chalk.dim('  • Problem Statement - Current vs desired state'));
    console.log(chalk.dim('  • User Stories - Acceptance criteria'));
    console.log(chalk.dim('  • Implementation Plan - Phased approach'));
    console.log(chalk.dim('  • Risk Analysis - Mitigation strategies'));

    if (this.config?.features.documentNaming) {
      console.log(chalk.green('\n🏷️ Using standardized naming convention'));
      console.log(chalk.dim('  Filename follows: PRD-###-description.md'));
    }
  }
}

/**
 * Helper to list existing PRDs with enhanced information
 */
export async function listPRDs(): Promise<void> {
  const command = new PRDReflectionCommand();
  await command.execute('', {}); // Load config

  const documents = await command.listDocuments();

  if (documents.length === 0) {
    console.log(chalk.yellow('No PRDs found'));
    console.log(chalk.dim('Create your first PRD with: ginko reflect "create user authentication PRD"'));
    return;
  }

  console.log(chalk.blue('📋 Existing Product Requirements Documents:\n'));

  for (const doc of documents.slice(0, 10)) { // Show latest 10
    const docPath = await command['getDocumentPath']();
    const fullPath = require('path').join(docPath, doc);

    try {
      const fs = await import('fs-extra');
      const content = await fs.readFile(fullPath, 'utf8');
      const title = command['extractTitle'](content);
      const dateMatch = content.match(/Last Updated.*?(\d{4}-\d{2}-\d{2})/);
      const date = dateMatch ? dateMatch[1] : 'Unknown';

      console.log(chalk.white(`  📄 ${doc}`));
      console.log(chalk.dim(`     Title: ${title}`));
      console.log(chalk.dim(`     Updated: ${date}`));
      console.log();
    } catch (error) {
      console.log(chalk.white(`  📄 ${doc}`));
      console.log(chalk.dim(`     (Unable to read metadata)`));
      console.log();
    }
  }

  if (documents.length > 10) {
    console.log(chalk.dim(`... and ${documents.length - 10} more`));
  }
}