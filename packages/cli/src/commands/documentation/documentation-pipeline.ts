/**
 * @fileType: command
 * @status: current
 * @updated: 2025-09-15
 * @tags: [documentation, pipeline, builder, docs, readme]
 * @related: [../../core/simple-pipeline-base.ts, ./documentation-reflection.ts]
 * @priority: high
 * @complexity: medium
 * @dependencies: [simple-pipeline-base, fs-extra, chalk]
 */

import { SimplePipelineBase, PipelineContext } from '../../core/simple-pipeline-base.js';
import fs from 'fs-extra';
import * as path from 'path';
import chalk from 'chalk';
import simpleGit from 'simple-git';
import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);

/**
 * Documentation pipeline using Simple Builder Pattern
 * Refactored from DocumentationReflectionCommand to use SimplePipelineBase
 * Implements ADR-013 for consistent pipeline architecture
 * Generates comprehensive documentation artifacts
 */
export class DocumentationPipeline extends SimplePipelineBase {
  private git: any;
  private docsDir: string = '';
  private packageInfo: any = null;
  private existingDocs: string[] = [];

  constructor(intent: string = 'Generate project documentation') {
    super(intent);
    this.withDomain('documentation');
  }

  /**
   * Initialize pipeline dependencies
   */
  async initialize(): Promise<this> {
    console.log(chalk.cyan('📚 Initializing Documentation pipeline...'));
    this.git = simpleGit();

    // Set up docs directory
    this.docsDir = path.join(process.cwd(), 'docs');
    await fs.ensureDir(this.docsDir);

    // Load package.json if available
    await this.loadPackageInfo();

    // Check existing documentation
    await this.scanExistingDocs();

    console.log(chalk.gray(`  ✓ Initialized (${this.existingDocs.length} existing docs found)`));
    return this;
  }

  /**
   * Load documentation-specific template
   */
  loadTemplate(): this {
    const template = {
      requiredSections: [
        'overview',
        'installation',
        'getting_started',
        'api_reference',
        'configuration',
        'examples',
        'troubleshooting',
        'contributing',
        'changelog'
      ],
      contextToConsider: [
        'package_json_metadata',
        'public_api_interfaces',
        'existing_documentation',
        'code_comments_and_jsdoc',
        'test_examples',
        'common_issues_from_git_history',
        'dependency_documentation'
      ],
      rulesAndConstraints: [
        'Use clear, concise language appropriate for target audience',
        'Include working code examples for all major features',
        'Follow team documentation standards and style guide',
        'Link to related documentation and external resources',
        'Include version compatibility information',
        'Provide clear migration guides for breaking changes',
        'Use semantic versioning in examples',
        'Include performance considerations where relevant',
        'Add diagrams and visuals where helpful',
        'Maintain consistency with existing documentation'
      ]
    };

    this.withTemplate(template);
    console.log(chalk.gray('  ✓ Documentation template loaded'));
    return this;
  }

  /**
   * Gather documentation-specific context
   */
  async gatherContext(): Promise<this> {
    console.log(chalk.cyan('🔍 Gathering documentation context...'));

    // Get current branch and recent changes
    const status = await this.git.status();
    const branch = await this.git.branchLocal();
    const recentCommits = await this.git.log({ maxCount: 50 });

    // Analyze code structure
    const codeStructure = await this.analyzeCodeStructure();

    // Get test examples if available
    const testExamples = await this.gatherTestExamples();

    // Analyze common issues from git history
    const commonIssues = this.analyzeCommonIssues(recentCommits.all);

    // Check for existing API documentation
    const apiDocs = await this.scanAPIDocumentation();

    const context = {
      conversationContext: {
        intent: this.ctx.intent,
        timestamp: Date.now()
      },
      systemState: {
        currentBranch: branch.current,
        modifiedFiles: status.modified,
        hasChanges: status.files.length > 0
      },
      domainKnowledge: {
        packageInfo: this.packageInfo,
        existingDocs: this.existingDocs,
        codeStructure: codeStructure,
        apiDocs: apiDocs
      },
      pastPatterns: {
        testExamples: testExamples,
        commonIssues: commonIssues,
        recentChanges: recentCommits.all.slice(0, 10)
      },
      projectContext: {
        name: this.packageInfo?.name || 'Project',
        version: this.packageInfo?.version || '1.0.0',
        description: this.packageInfo?.description || '',
        dependencies: this.packageInfo?.dependencies || {},
        scripts: this.packageInfo?.scripts || {}
      }
    };

    this.withContext(context);
    console.log(chalk.gray('  ✓ Context gathered'));
    return this;
  }

  /**
   * Generate documentation content
   */
  generateContent(): this {
    console.log(chalk.cyan('📝 Generating documentation...'));

    // Determine what type of documentation to generate
    const docType = this.determineDocumentationType();

    switch (docType) {
      case 'readme':
        this.ctx.content = this.buildREADMEContent();
        break;
      case 'api':
        this.ctx.content = this.buildAPIDocumentation();
        break;
      case 'guide':
        this.ctx.content = this.buildUserGuide();
        break;
      case 'changelog':
        this.ctx.content = this.buildChangelog();
        break;
      default:
        this.ctx.content = this.buildREADMEContent();
    }

    this.adjustConfidence(0.9); // High confidence for documentation
    console.log(chalk.gray('  ✓ Documentation generated'));
    return this;
  }

  /**
   * Build README documentation
   */
  private buildREADMEContent(): string {
    const context = this.ctx.context;
    const projectName = context.projectContext.name;
    const description = context.projectContext.description;
    const version = context.projectContext.version;

    const sections: string[] = [];

    // Header
    sections.push(`# ${projectName}\n`);
    if (description) {
      sections.push(`> ${description}\n`);
    }

    // Badges
    sections.push(`![Version](https://img.shields.io/badge/version-${version}-blue.svg)`);
    sections.push(`![License](https://img.shields.io/badge/license-MIT-green.svg)`);
    sections.push(`![Build Status](https://img.shields.io/badge/build-passing-brightgreen.svg)\n`);

    // Table of Contents
    sections.push(`## Table of Contents\n`);
    sections.push(`- [Overview](#overview)`);
    sections.push(`- [Features](#features)`);
    sections.push(`- [Installation](#installation)`);
    sections.push(`- [Getting Started](#getting-started)`);
    sections.push(`- [Usage](#usage)`);
    sections.push(`- [API Reference](#api-reference)`);
    sections.push(`- [Configuration](#configuration)`);
    sections.push(`- [Examples](#examples)`);
    sections.push(`- [Troubleshooting](#troubleshooting)`);
    sections.push(`- [Contributing](#contributing)`);
    sections.push(`- [License](#license)\n`);

    // Overview
    sections.push(`## Overview\n`);
    sections.push(`${projectName} is a powerful tool designed to ${this.generateProjectPurpose()}.`);
    sections.push(`It provides a simple and intuitive interface for developers to achieve their goals efficiently.\n`);

    // Features
    sections.push(`## Features\n`);
    sections.push(`- ✨ **Easy to Use**: Simple API with minimal configuration`);
    sections.push(`- 🚀 **High Performance**: Optimized for speed and efficiency`);
    sections.push(`- 🔧 **Extensible**: Plugin architecture for custom extensions`);
    sections.push(`- 📚 **Well Documented**: Comprehensive documentation and examples`);
    sections.push(`- 🧪 **Fully Tested**: Extensive test coverage for reliability`);
    sections.push(`- 🔒 **Secure**: Built with security best practices\n`);

    // Installation
    sections.push(`## Installation\n`);
    sections.push(`### Using npm`);
    sections.push('```bash');
    sections.push(`npm install ${projectName}`);
    sections.push('```\n');
    sections.push(`### Using yarn`);
    sections.push('```bash');
    sections.push(`yarn add ${projectName}`);
    sections.push('```\n');
    sections.push(`### Using pnpm`);
    sections.push('```bash');
    sections.push(`pnpm add ${projectName}`);
    sections.push('```\n');

    // Getting Started
    sections.push(`## Getting Started\n`);
    sections.push(`### Basic Setup`);
    sections.push('```javascript');
    sections.push(`const ${this.getModuleName()} = require('${projectName}');`);
    sections.push(``);
    sections.push(`// Initialize with default configuration`);
    sections.push(`const instance = new ${this.getModuleName()}();`);
    sections.push(``);
    sections.push(`// Use the main functionality`);
    sections.push(`instance.execute();`);
    sections.push('```\n');

    // Usage
    sections.push(`## Usage\n`);
    sections.push(`### Common Use Cases\n`);
    sections.push(`#### Example 1: Basic Usage`);
    sections.push('```javascript');
    sections.push(`import { ${this.getModuleName()} } from '${projectName}';`);
    sections.push(``);
    sections.push(`const config = {`);
    sections.push(`  option1: 'value1',`);
    sections.push(`  option2: true`);
    sections.push(`};`);
    sections.push(``);
    sections.push(`const instance = new ${this.getModuleName()}(config);`);
    sections.push(`const result = await instance.process(data);`);
    sections.push(`console.log(result);`);
    sections.push('```\n');

    // API Reference
    sections.push(`## API Reference\n`);
    sections.push(`### Core Classes\n`);
    sections.push(`#### ${this.getModuleName()}`);
    sections.push(``);
    sections.push(`The main class that provides core functionality.\n`);
    sections.push(`##### Constructor`);
    sections.push('```javascript');
    sections.push(`new ${this.getModuleName()}(options?: Options)`);
    sections.push('```\n');
    sections.push(`**Parameters:**`);
    sections.push(`- \`options\` (optional): Configuration object`);
    sections.push(`  - \`option1\`: string - Description of option1`);
    sections.push(`  - \`option2\`: boolean - Description of option2\n`);
    sections.push(`##### Methods\n`);
    sections.push(`###### \`process(data: any): Promise<Result>\``);
    sections.push(`Processes the input data and returns a result.\n`);
    sections.push(`**Parameters:**`);
    sections.push(`- \`data\`: The input data to process\n`);
    sections.push(`**Returns:**`);
    sections.push(`- \`Promise<Result>\`: The processed result\n`);

    // Configuration
    sections.push(`## Configuration\n`);
    sections.push(`### Configuration Options\n`);
    sections.push('```javascript');
    sections.push(`const config = {`);
    sections.push(`  // Core options`);
    sections.push(`  debug: false,          // Enable debug logging`);
    sections.push(`  timeout: 5000,         // Operation timeout in ms`);
    sections.push(`  retries: 3,            // Number of retry attempts`);
    sections.push(`  `);
    sections.push(`  // Advanced options`);
    sections.push(`  cache: true,           // Enable caching`);
    sections.push(`  cacheSize: 100,        // Maximum cache entries`);
    sections.push(`  parallel: true,        // Enable parallel processing`);
    sections.push(`};`);
    sections.push('```\n');

    // Examples
    sections.push(`## Examples\n`);
    sections.push(`### Advanced Example`);
    sections.push('```javascript');
    sections.push(`import { ${this.getModuleName()}, Pipeline } from '${projectName}';`);
    sections.push(``);
    sections.push(`// Create a processing pipeline`);
    sections.push(`const pipeline = new Pipeline()`);
    sections.push(`  .add(step1)`);
    sections.push(`  .add(step2)`);
    sections.push(`  .add(step3);`);
    sections.push(``);
    sections.push(`// Process data through the pipeline`);
    sections.push(`const result = await pipeline.execute(inputData);`);
    sections.push('```\n');
    sections.push(`More examples can be found in the [examples](./examples) directory.\n`);

    // Troubleshooting
    sections.push(`## Troubleshooting\n`);
    sections.push(`### Common Issues\n`);
    sections.push(`#### Issue: Module not found`);
    sections.push(`**Solution**: Ensure the package is properly installed:`);
    sections.push('```bash');
    sections.push(`npm list ${projectName}`);
    sections.push('```\n');
    sections.push(`#### Issue: Configuration not working`);
    sections.push(`**Solution**: Verify your configuration object matches the expected schema.\n`);
    sections.push(`#### Issue: Performance problems`);
    sections.push(`**Solution**: Consider enabling caching and parallel processing options.\n`);

    // Contributing
    sections.push(`## Contributing\n`);
    sections.push(`We welcome contributions! Please see our [Contributing Guide](CONTRIBUTING.md) for details.\n`);
    sections.push(`### Development Setup`);
    sections.push('```bash');
    sections.push(`# Clone the repository`);
    sections.push(`git clone https://github.com/username/${projectName}.git`);
    sections.push(``);
    sections.push(`# Install dependencies`);
    sections.push(`npm install`);
    sections.push(``);
    sections.push(`# Run tests`);
    sections.push(`npm test`);
    sections.push(``);
    sections.push(`# Build the project`);
    sections.push(`npm run build`);
    sections.push('```\n');

    // License
    sections.push(`## License\n`);
    sections.push(`This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.\n`);

    // Footer
    sections.push(`---\n`);
    sections.push(`**Generated with**: Ginko Documentation Pipeline`);
    sections.push(`**Date**: ${new Date().toISOString().split('T')[0]}`);
    sections.push(`**Confidence**: ${(this.ctx.confidence * 100).toFixed(0)}%`);

    return sections.join('\n');
  }

  /**
   * Build API documentation
   */
  private buildAPIDocumentation(): string {
    const sections: string[] = [];

    sections.push(`# API Documentation\n`);
    sections.push(`## Overview\n`);
    sections.push(`This document provides comprehensive API reference for all public interfaces.\n`);

    // Add API sections based on context
    sections.push(`## Classes\n`);
    sections.push(`### Main Classes\n`);
    sections.push(`Documentation for core classes and their methods.\n`);

    sections.push(`## Functions\n`);
    sections.push(`### Utility Functions\n`);
    sections.push(`Helper functions and utilities.\n`);

    sections.push(`## Types\n`);
    sections.push(`### Type Definitions\n`);
    sections.push(`TypeScript type definitions and interfaces.\n`);

    return sections.join('\n');
  }

  /**
   * Build user guide
   */
  private buildUserGuide(): string {
    const sections: string[] = [];

    sections.push(`# User Guide\n`);
    sections.push(`## Introduction\n`);
    sections.push(`Welcome to the comprehensive user guide.\n`);

    sections.push(`## Getting Started\n`);
    sections.push(`Step-by-step instructions for new users.\n`);

    sections.push(`## Advanced Topics\n`);
    sections.push(`In-depth coverage of advanced features.\n`);

    return sections.join('\n');
  }

  /**
   * Build changelog
   */
  private buildChangelog(): string {
    const sections: string[] = [];
    const date = new Date().toISOString().split('T')[0];

    sections.push(`# Changelog\n`);
    sections.push(`All notable changes to this project will be documented in this file.\n`);
    sections.push(`The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),`);
    sections.push(`and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).\n`);

    sections.push(`## [Unreleased]\n`);
    sections.push(`### Added`);
    sections.push(`- New features in development\n`);
    sections.push(`### Changed`);
    sections.push(`- Updates to existing functionality\n`);
    sections.push(`### Fixed`);
    sections.push(`- Bug fixes\n`);

    sections.push(`## [${this.ctx.context?.projectContext?.version || '1.0.0'}] - ${date}\n`);
    sections.push(`### Added`);
    sections.push(`- Initial release`);
    sections.push(`- Core functionality`);
    sections.push(`- Documentation\n`);

    return sections.join('\n');
  }

  /**
   * Validate documentation content
   */
  validateContent(): this {
    console.log(chalk.cyan('✅ Validating documentation...'));

    if (!this.ctx.content) {
      this.addError('No documentation content generated');
      this.adjustConfidence(0.3);
      return this;
    }

    // Check minimum content length
    if (this.ctx.content.length < 500) {
      this.addError('Documentation seems too short');
      this.adjustConfidence(0.7);
    }

    // Check for key sections in README
    if (this.ctx.content.includes('# ')) {
      const requiredSections = ['## Installation', '## Usage', '## API'];
      for (const section of requiredSections) {
        if (!this.ctx.content.includes(section)) {
          console.log(chalk.yellow(`  ⚠ Missing recommended section: ${section}`));
        }
      }
    }

    if (this.ctx.errors.length === 0) {
      console.log(chalk.gray('  ✓ Documentation validation passed'));
    } else {
      console.log(chalk.yellow(`  ⚠ Documentation validation warnings: ${this.ctx.errors.length}`));
    }

    return this;
  }

  /**
   * Save documentation to filesystem
   */
  async save(): Promise<this> {
    if (!this.ctx.content) {
      this.addError('No content to save');
      this.adjustConfidence(0.3);
      return this;
    }

    console.log(chalk.cyan('💾 Saving documentation...'));

    // Determine filename based on content type
    const docType = this.determineDocumentationType();
    let filename = 'README.md';

    switch (docType) {
      case 'api':
        filename = 'API.md';
        break;
      case 'guide':
        filename = 'USER_GUIDE.md';
        break;
      case 'changelog':
        filename = 'CHANGELOG.md';
        break;
    }

    const filepath = docType === 'readme'
      ? path.join(process.cwd(), filename)
      : path.join(this.docsDir, filename);

    await fs.writeFile(filepath, this.ctx.content, 'utf-8');

    console.log(chalk.green(`  ✅ Documentation saved to: ${path.relative(process.cwd(), filepath)}`));
    console.log(chalk.dim('  📚 Keep documentation up to date with code changes'));

    this.withMetadata({ savedPath: filepath, filename: filename });
    return this;
  }

  /**
   * Load package.json information
   */
  private async loadPackageInfo(): Promise<void> {
    try {
      const packagePath = path.join(process.cwd(), 'package.json');
      this.packageInfo = await fs.readJson(packagePath);
    } catch {
      this.packageInfo = null;
    }
  }

  /**
   * Scan for existing documentation
   */
  private async scanExistingDocs(): Promise<void> {
    try {
      const files = await fs.readdir(this.docsDir);
      this.existingDocs = files.filter(f => f.endsWith('.md'));
    } catch {
      this.existingDocs = [];
    }

    // Also check for README in root
    try {
      const rootFiles = await fs.readdir(process.cwd());
      const readmes = rootFiles.filter(f => f.toLowerCase().includes('readme'));
      this.existingDocs.push(...readmes);
    } catch {
      // Ignore
    }
  }

  /**
   * Analyze code structure
   */
  private async analyzeCodeStructure(): Promise<any> {
    const structure = {
      hasSrc: false,
      hasTests: false,
      hasExamples: false,
      mainFile: 'index.js'
    };

    try {
      const files = await fs.readdir(process.cwd());
      structure.hasSrc = files.includes('src');
      structure.hasTests = files.includes('test') || files.includes('tests');
      structure.hasExamples = files.includes('examples');

      if (this.packageInfo?.main) {
        structure.mainFile = this.packageInfo.main;
      }
    } catch {
      // Use defaults
    }

    return structure;
  }

  /**
   * Gather test examples
   */
  private async gatherTestExamples(): Promise<string[]> {
    const examples: string[] = [];

    try {
      const testDirs = ['test', 'tests', '__tests__', 'spec'];
      for (const dir of testDirs) {
        const testPath = path.join(process.cwd(), dir);
        if (await fs.pathExists(testPath)) {
          const files = await fs.readdir(testPath);
          examples.push(...files.filter(f => f.includes('.test.') || f.includes('.spec.')));
        }
      }
    } catch {
      // No tests found
    }

    return examples;
  }

  /**
   * Analyze common issues from git history
   */
  private analyzeCommonIssues(commits: any[]): string[] {
    const issues: string[] = [];
    const keywords = ['fix:', 'bug:', 'issue:', 'error:', 'problem:'];

    commits.forEach(commit => {
      const message = commit.message.toLowerCase();
      for (const keyword of keywords) {
        if (message.includes(keyword)) {
          issues.push(commit.message);
          break;
        }
      }
    });

    return issues.slice(0, 10); // Top 10 recent issues
  }

  /**
   * Scan for API documentation
   */
  private async scanAPIDocumentation(): Promise<any> {
    const apiDocs = {
      hasJSDoc: false,
      hasTypeScript: false,
      hasOpenAPI: false
    };

    try {
      const files = await fs.readdir(process.cwd());
      apiDocs.hasTypeScript = files.some(f => f.endsWith('.d.ts'));
      apiDocs.hasOpenAPI = files.some(f => f.includes('openapi') || f.includes('swagger'));
    } catch {
      // Use defaults
    }

    return apiDocs;
  }

  /**
   * Determine what type of documentation to generate
   */
  private determineDocumentationType(): string {
    const intent = this.ctx.intent.toLowerCase();

    if (intent.includes('api')) return 'api';
    if (intent.includes('guide') || intent.includes('tutorial')) return 'guide';
    if (intent.includes('changelog') || intent.includes('release')) return 'changelog';
    if (intent.includes('readme')) return 'readme';

    // Default to README
    return 'readme';
  }

  /**
   * Generate project purpose description
   */
  private generateProjectPurpose(): string {
    if (this.packageInfo?.description) {
      return this.packageInfo.description.toLowerCase();
    }

    // Generate based on intent
    const intent = this.ctx.intent.toLowerCase();
    if (intent.includes('cli')) return 'provide command-line interface functionality';
    if (intent.includes('api')) return 'expose API endpoints for integration';
    if (intent.includes('library')) return 'provide reusable components and utilities';

    return 'streamline development workflows';
  }

  /**
   * Get module name from package name
   */
  private getModuleName(): string {
    if (!this.packageInfo?.name) return 'Module';

    const name = this.packageInfo.name;
    // Convert kebab-case to PascalCase
    return name
      .split(/[-_]/)
      .map((word: string) => word.charAt(0).toUpperCase() + word.slice(1))
      .join('');
  }

  /**
   * Custom validation for documentation pipeline
   */
  protected customValidate(): void {
    if (!this.ctx.template) {
      this.addError('Template required for documentation');
      this.adjustConfidence(0.7);
    }
  }

  /**
   * Custom recovery logic
   */
  protected customRecover(): void {
    if (this.ctx.errors.includes('Documentation seems too short')) {
      // This is a warning, not critical
      this.removeError('Documentation seems too short');
      console.log(chalk.yellow('  ⚠ Consider adding more detailed documentation'));
      this.adjustConfidence(1.1);
    }
  }

  /**
   * Custom execution logic
   */
  protected async customExecute(): Promise<void> {
    // Ensure we have content
    if (!this.ctx.content) {
      this.generateContent();
    }

    // Validate the content
    this.validateContent();
  }

  /**
   * Main build method using fluent interface
   */
  async build(): Promise<string> {
    try {
      console.log(chalk.bold.cyan('\n📚 Building Documentation with Simple Pipeline Pattern\n'));

      await this
        .initialize()
        .then(p => p.loadTemplate())
        .then(p => p.gatherContext())
        .then(p => {
          p.generateContent();
          p.validateContent();
          return p;
        })
        .then(p => p.validate())
        .then(p => p.recover())
        .then(p => p.save())
        .then(p => p.execute());

      console.log(chalk.bold.green('\n✨ Documentation pipeline completed successfully!\n'));
      return this.ctx.content || '';
    } catch (error) {
      console.error(chalk.red(`\n❌ Documentation pipeline failed: ${error}`));
      throw error;
    }
  }
}

/**
 * Adapter for CLI command usage
 * Maintains backward compatibility with existing command structure
 */
export class DocumentationReflectionCommand {
  private pipeline: DocumentationPipeline;

  constructor() {
    this.pipeline = new DocumentationPipeline();
  }

  /**
   * Execute the documentation command
   */
  async execute(intent: string, options: any = {}): Promise<void> {
    try {
      // Update pipeline intent if provided
      if (intent && intent.trim() !== '') {
        this.pipeline = new DocumentationPipeline(intent);
      }

      // Build and execute the pipeline
      await this.pipeline.build();

    } catch (error) {
      console.error(chalk.red(`Documentation generation failed: ${error}`));
      throw error;
    }
  }
}

// Export for CLI use
export default DocumentationReflectionCommand;