/**
 * @fileType: utility
 * @status: current
 * @updated: 2025-09-20
 * @tags: [project, detection, existing, integration, paths]
 * @related: [config-loader.ts, init.ts, config.ts]
 * @priority: high
 * @complexity: medium
 * @dependencies: [fs-extra, path, glob]
 */

import fs from 'fs-extra';
import path from 'path';
import { glob } from 'glob';
import { GinkoConfig, ProjectDetectionConfig, ConfigPromptOption } from '../../types/config.js';

/**
 * Detects existing project structure and recommends configuration
 */
export class ProjectDetector {

  /**
   * Analyze existing project structure
   */
  async analyzeProject(projectRoot: string = process.cwd()): Promise<ProjectDetectionConfig> {
    const hasDocsFolder = await fs.pathExists(path.join(projectRoot, 'docs'));
    const hasExistingAdr = await this.hasExistingDocuments(projectRoot, 'adr');
    const hasExistingPrd = await this.hasExistingDocuments(projectRoot, 'prd');
    const existingPaths = await this.findExistingDocumentPaths(projectRoot);

    const recommendedConfig = await this.generateRecommendedConfig(projectRoot, {
      hasDocsFolder,
      hasExistingAdr,
      hasExistingPrd,
      existingPaths
    });

    return {
      hasDocsFolder,
      hasExistingAdr,
      hasExistingPrd,
      existingPaths,
      recommendedConfig
    };
  }

  /**
   * Generate configuration options for interactive setup
   */
  async generateConfigOptions(projectRoot: string = process.cwd()): Promise<ConfigPromptOption[]> {
    const analysis = await this.analyzeProject(projectRoot);
    const options: ConfigPromptOption[] = [];

    if (analysis.hasDocsFolder) {
      // Option 1: Use existing docs structure
      options.push({
        name: 'Use existing docs/ folder structure (recommended)',
        value: 'existing-docs',
        description: 'Works with your current documentation layout'
      });

      // Option 2: Create ginko subdirectory
      options.push({
        name: 'Create docs/ginko/ subdirectory (safe)',
        value: {
          paths: {
            docs: {
              root: 'docs/ginko',
              adr: '${docs.root}/adr',
              prd: '${docs.root}/PRD',
              sprints: '${docs.root}/sprints'
            }
          }
        },
        description: 'Avoids conflicts with existing documentation'
      });
    } else {
      // Option 1: Standard docs layout
      options.push({
        name: 'Create standard docs/ structure (recommended)',
        value: 'standard-docs',
        description: 'Creates docs/adr, docs/PRD, docs/sprints'
      });
    }

    // Option 3: Custom paths
    options.push({
      name: 'Custom paths...',
      value: 'custom',
      description: 'Configure custom documentation paths'
    });

    // Option 4: Minimal setup
    options.push({
      name: 'Minimal setup (no documentation paths)',
      value: {
        features: {
          autoCapture: true,
          gitIntegration: true,
          aiEnhancement: true,
          documentNaming: false
        }
      },
      description: 'Only session and context tracking'
    });

    return options;
  }

  /**
   * Check for existing document types
   */
  private async hasExistingDocuments(projectRoot: string, type: string): Promise<boolean> {
    const patterns = this.getDocumentPatterns(type);

    for (const pattern of patterns) {
      const files = await glob(pattern, { cwd: projectRoot, ignore: ['node_modules/**'] });
      if (files.length > 0) {
        return true;
      }
    }

    return false;
  }

  /**
   * Find all existing document paths
   */
  private async findExistingDocumentPaths(projectRoot: string): Promise<string[]> {
    const paths: string[] = [];
    const commonPaths = [
      'docs', 'documentation', 'doc',
      'adr', 'adrs', 'architecture', 'decisions',
      'prd', 'requirements', 'specs', 'specifications',
      'sprints', 'iterations', 'planning'
    ];

    for (const pathName of commonPaths) {
      const fullPath = path.join(projectRoot, pathName);
      if (await fs.pathExists(fullPath)) {
        const stat = await fs.stat(fullPath);
        if (stat.isDirectory()) {
          paths.push(pathName);
        }
      }
    }

    return paths;
  }

  /**
   * Get file patterns for document types
   */
  private getDocumentPatterns(type: string): string[] {
    switch (type.toLowerCase()) {
      case 'adr':
        return [
          '**/adr/**/*.md',
          '**/adrs/**/*.md',
          '**/architecture/**/*.md',
          '**/decisions/**/*.md',
          '**/*adr*.md',
          '**/*decision*.md'
        ];
      case 'prd':
        return [
          '**/prd/**/*.md',
          '**/prds/**/*.md',
          '**/requirements/**/*.md',
          '**/specs/**/*.md',
          '**/*prd*.md',
          '**/*requirement*.md',
          '**/*spec*.md'
        ];
      case 'sprint':
        return [
          '**/sprints/**/*.md',
          '**/sprint/**/*.md',
          '**/iterations/**/*.md',
          '**/planning/**/*.md',
          '**/*sprint*.md',
          '**/*iteration*.md'
        ];
      default:
        return [];
    }
  }

  /**
   * Generate recommended configuration based on analysis
   */
  private async generateRecommendedConfig(
    projectRoot: string,
    analysis: Omit<ProjectDetectionConfig, 'recommendedConfig'>
  ): Promise<Partial<GinkoConfig>> {
    const config: Partial<GinkoConfig> = {
      version: "1.0.0",
      features: {
        autoCapture: true,
        gitIntegration: true,
        aiEnhancement: true,
        documentNaming: true,
        crossPlatform: true
      }
    };

    // Configure paths based on existing structure
    if (analysis.hasDocsFolder) {
      // Use existing docs folder
      config.paths = {
        docs: {
          root: 'docs',
          adr: analysis.hasExistingAdr ? await this.findBestAdrPath(projectRoot) : '${docs.root}/adr',
          prd: analysis.hasExistingPrd ? await this.findBestPrdPath(projectRoot) : '${docs.root}/PRD',
          sprints: '${docs.root}/sprints'
        },
        ginko: {
          root: '.ginko',
          context: '${ginko.root}/context',
          sessions: '${ginko.root}/sessions',
          backlog: '${ginko.root}/backlog',
          patterns: '${ginko.root}/patterns',
          bestPractices: '${ginko.root}/best-practices'
        }
      };
    } else {
      // Standard setup
      config.paths = {
        docs: {
          root: 'docs',
          adr: '${docs.root}/adr',
          prd: '${docs.root}/PRD',
          sprints: '${docs.root}/sprints'
        },
        ginko: {
          root: '.ginko',
          context: '${ginko.root}/context',
          sessions: '${ginko.root}/sessions',
          backlog: '${ginko.root}/backlog',
          patterns: '${ginko.root}/patterns',
          bestPractices: '${ginko.root}/best-practices'
        }
      };
    }

    return config;
  }

  /**
   * Find the best existing ADR path
   */
  private async findBestAdrPath(projectRoot: string): Promise<string> {
    const possiblePaths = [
      'docs/adr',
      'docs/adrs',
      'docs/architecture',
      'docs/decisions',
      'adr',
      'adrs',
      'architecture/decisions'
    ];

    for (const pathStr of possiblePaths) {
      const fullPath = path.join(projectRoot, pathStr);
      if (await fs.pathExists(fullPath)) {
        const files = await glob('**/*.md', { cwd: fullPath });
        if (files.length > 0) {
          return pathStr;
        }
      }
    }

    return '${docs.root}/adr'; // Default
  }

  /**
   * Find the best existing PRD path
   */
  private async findBestPrdPath(projectRoot: string): Promise<string> {
    const possiblePaths = [
      'docs/PRD',
      'docs/prd',
      'docs/requirements',
      'docs/specs',
      'requirements',
      'specs',
      'specifications'
    ];

    for (const pathStr of possiblePaths) {
      const fullPath = path.join(projectRoot, pathStr);
      if (await fs.pathExists(fullPath)) {
        const files = await glob('**/*.md', { cwd: fullPath });
        if (files.length > 0) {
          return pathStr;
        }
      }
    }

    return '${docs.root}/PRD'; // Default
  }

  /**
   * Validate that a project can support ginko integration
   */
  async validateProjectCompatibility(projectRoot: string = process.cwd()): Promise<{
    compatible: boolean;
    issues: string[];
    recommendations: string[];
  }> {
    const issues: string[] = [];
    const recommendations: string[] = [];

    // Check if it's a git repository
    const gitDir = path.join(projectRoot, '.git');
    if (!await fs.pathExists(gitDir)) {
      issues.push('Not a git repository');
      recommendations.push('Run: git init');
    }

    // Check for existing .ginko directory
    const ginkoDir = path.join(projectRoot, '.ginko');
    if (await fs.pathExists(ginkoDir)) {
      issues.push('Ginko already initialized');
      recommendations.push('Use ginko config to modify settings');
    }

    // Check write permissions
    try {
      const testFile = path.join(projectRoot, '.ginko-test');
      await fs.writeFile(testFile, 'test');
      await fs.remove(testFile);
    } catch (error) {
      issues.push('No write permissions to project directory');
      recommendations.push('Check directory permissions');
    }

    return {
      compatible: issues.length === 0,
      issues,
      recommendations
    };
  }
}

// Export singleton instance
export const projectDetector = new ProjectDetector();