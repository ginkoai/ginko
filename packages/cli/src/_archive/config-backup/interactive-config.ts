/**
 * @fileType: utility
 * @status: current
 * @updated: 2025-09-20
 * @tags: [interactive, prompts, configuration, setup, existing-projects]
 * @related: [project-detector.ts, config-loader.ts, init.ts]
 * @priority: high
 * @complexity: high
 * @dependencies: [inquirer, chalk, fs-extra]
 */

import chalk from 'chalk';
import fs from 'fs-extra';
import path from 'path';
import { GinkoConfig, ConfigPromptOption } from '../../types/config.js';
import { ProjectDetector } from './project-detector.js';
import { ConfigLoader } from './config-loader.js';

// Simplified prompt interface (in real implementation, would use inquirer)
interface PromptConfig {
  type: 'list' | 'input' | 'confirm';
  message: string;
  choices?: Array<{ name: string; value: any; description?: string }>;
  default?: any;
}

/**
 * Interactive configuration setup for existing projects
 */
export class InteractiveConfigSetup {
  private detector = new ProjectDetector();
  private configLoader = new ConfigLoader();

  /**
   * Run interactive configuration setup
   */
  async setupConfiguration(projectRoot: string = process.cwd()): Promise<GinkoConfig> {
    console.log(chalk.green('\n🌿 Setting up Ginko for your project\n'));

    // Analyze project
    const analysis = await this.detector.analyzeProject(projectRoot);
    this.displayProjectAnalysis(analysis);

    // Get configuration choice
    const configChoice = await this.promptForConfiguration(projectRoot);
    const config = await this.processConfigChoice(configChoice, projectRoot);

    // Confirm paths
    const confirmedConfig = await this.confirmPaths(config, projectRoot);

    // Feature selection
    const finalConfig = await this.selectFeatures(confirmedConfig);

    return finalConfig;
  }

  /**
   * Display project analysis results
   */
  private displayProjectAnalysis(analysis: any): void {
    console.log(chalk.blue('📁 Project Analysis:'));

    if (analysis.hasDocsFolder) {
      console.log(chalk.green('  ✓ Found existing docs/ folder'));
    } else {
      console.log(chalk.yellow('  • No docs/ folder found'));
    }

    if (analysis.hasExistingAdr) {
      console.log(chalk.green('  ✓ Found existing ADR documents'));
    }

    if (analysis.hasExistingPrd) {
      console.log(chalk.green('  ✓ Found existing PRD documents'));
    }

    if (analysis.existingPaths.length > 0) {
      console.log(chalk.dim(`  📂 Existing paths: ${analysis.existingPaths.join(', ')}`));
    }

    console.log();
  }

  /**
   * Prompt user for configuration approach
   */
  private async promptForConfiguration(projectRoot: string): Promise<string | Partial<GinkoConfig>> {
    const options = await this.detector.generateConfigOptions(projectRoot);

    console.log(chalk.cyan('How would you like to configure documentation paths?\n'));

    // Display options
    options.forEach((option, index) => {
      console.log(chalk.white(`${index + 1}. ${option.name}`));
      if (option.description) {
        console.log(chalk.dim(`   ${option.description}`));
      }
      console.log();
    });

    // Simulate user choice (in real implementation, use inquirer)
    // For this example, we'll default to the first option
    console.log(chalk.green(`Selected: ${options[0].name}\n`));
    return options[0].value;
  }

  /**
   * Process configuration choice and generate config
   */
  private async processConfigChoice(
    choice: string | Partial<GinkoConfig>,
    projectRoot: string
  ): Promise<Partial<GinkoConfig>> {
    if (typeof choice === 'string') {
      switch (choice) {
        case 'existing-docs':
          return await this.generateExistingDocsConfig(projectRoot);
        case 'standard-docs':
          return await this.generateStandardConfig();
        case 'custom':
          return await this.promptCustomPaths();
        default:
          return await this.generateStandardConfig();
      }
    }

    return choice;
  }

  /**
   * Generate config that works with existing docs structure
   */
  private async generateExistingDocsConfig(projectRoot: string): Promise<Partial<GinkoConfig>> {
    const analysis = await this.detector.analyzeProject(projectRoot);
    return analysis.recommendedConfig;
  }

  /**
   * Generate standard documentation configuration
   */
  private async generateStandardConfig(): Promise<Partial<GinkoConfig>> {
    return {
      version: "1.0.0",
      paths: {
        docs: {
          root: "docs",
          adr: "${docs.root}/adr",
          prd: "${docs.root}/PRD",
          sprints: "${docs.root}/sprints"
        },
        ginko: {
          root: ".ginko",
          context: "${ginko.root}/context",
          sessions: "${ginko.root}/sessions",
          backlog: "${ginko.root}/backlog",
          patterns: "${ginko.root}/patterns",
          bestPractices: "${ginko.root}/best-practices"
        }
      },
      features: {
        autoCapture: true,
        gitIntegration: true,
        aiEnhancement: true,
        documentNaming: true,
        crossPlatform: true
      }
    };
  }

  /**
   * Prompt for custom paths
   */
  private async promptCustomPaths(): Promise<Partial<GinkoConfig>> {
    console.log(chalk.cyan('Enter custom paths (press Enter for defaults):\n'));

    // Simulate prompts (in real implementation, use inquirer)
    const docsRoot = 'docs'; // Default response
    const adrPath = `${docsRoot}/adr`;
    const prdPath = `${docsRoot}/PRD`;
    const sprintsPath = `${docsRoot}/sprints`;

    console.log(chalk.dim(`Using: docs root=${docsRoot}, adr=${adrPath}, prd=${prdPath}, sprints=${sprintsPath}\n`));

    return {
      version: "1.0.0",
      paths: {
        docs: {
          root: docsRoot,
          adr: adrPath,
          prd: prdPath,
          sprints: sprintsPath
        },
        ginko: {
          root: ".ginko",
          context: "${ginko.root}/context",
          sessions: "${ginko.root}/sessions",
          backlog: "${ginko.root}/backlog",
          patterns: "${ginko.root}/patterns",
          bestPractices: "${ginko.root}/best-practices"
        }
      },
      features: {
        autoCapture: true,
        gitIntegration: true,
        aiEnhancement: true,
        documentNaming: true,
        crossPlatform: true
      }
    };
  }

  /**
   * Confirm and validate paths
   */
  private async confirmPaths(config: Partial<GinkoConfig>, projectRoot: string): Promise<Partial<GinkoConfig>> {
    console.log(chalk.blue('📋 Configuration Summary:\n'));

    if (config.paths?.docs) {
      console.log(chalk.white('Documentation paths:'));
      console.log(chalk.dim(`  Root: ${config.paths.docs.root}`));
      console.log(chalk.dim(`  ADR: ${config.paths.docs.adr}`));
      console.log(chalk.dim(`  PRD: ${config.paths.docs.prd}`));
      console.log(chalk.dim(`  Sprints: ${config.paths.docs.sprints}`));
    }

    if (config.paths?.ginko) {
      console.log(chalk.white('\nGinko paths:'));
      console.log(chalk.dim(`  Root: ${config.paths.ginko.root}`));
      console.log(chalk.dim(`  Context: ${config.paths.ginko.context}`));
      console.log(chalk.dim(`  Sessions: ${config.paths.ginko.sessions}`));
    }

    // Check for conflicts
    const conflicts = await this.checkPathConflicts(config, projectRoot);
    if (conflicts.length > 0) {
      console.log(chalk.yellow('\n⚠️ Potential conflicts:'));
      conflicts.forEach(conflict => console.log(chalk.yellow(`  • ${conflict}`)));
    }

    console.log(chalk.green('\n✓ Configuration looks good!\n'));
    return config;
  }

  /**
   * Feature selection prompts
   */
  private async selectFeatures(config: Partial<GinkoConfig>): Promise<GinkoConfig> {
    console.log(chalk.cyan('🔧 Feature Configuration:\n'));

    const features = {
      autoCapture: true,
      gitIntegration: true,
      aiEnhancement: true,
      documentNaming: true,
      crossPlatform: true,
      ...config.features
    };

    console.log(chalk.white('Enabled features:'));
    Object.entries(features).forEach(([key, value]) => {
      const status = value ? chalk.green('✓') : chalk.red('✗');
      console.log(`  ${status} ${this.getFeatureDescription(key)}`);
    });

    console.log();

    return {
      version: "1.0.0",
      ...config,
      features
    } as GinkoConfig;
  }

  /**
   * Get human-readable feature descriptions
   */
  private getFeatureDescription(feature: string): string {
    const descriptions: Record<string, string> = {
      autoCapture: 'Automatic session capture',
      gitIntegration: 'Git-native context tracking',
      aiEnhancement: 'AI-powered collaboration',
      documentNaming: 'Standardized document naming',
      crossPlatform: 'Cross-platform compatibility'
    };

    return descriptions[feature] || feature;
  }

  /**
   * Check for path conflicts with existing files/directories
   */
  private async checkPathConflicts(config: Partial<GinkoConfig>, projectRoot: string): Promise<string[]> {
    const conflicts: string[] = [];

    if (!config.paths) return conflicts;

    // Check documentation paths
    if (config.paths.docs) {
      for (const [key, pathStr] of Object.entries(config.paths.docs)) {
        if (typeof pathStr === 'string' && !pathStr.includes('${')) {
          const fullPath = path.join(projectRoot, pathStr);
          if (await fs.pathExists(fullPath)) {
            const stat = await fs.stat(fullPath);
            if (stat.isFile()) {
              conflicts.push(`Path ${pathStr} exists as a file`);
            }
          }
        }
      }
    }

    return conflicts;
  }

  /**
   * Quick setup for non-interactive environments
   */
  async quickSetup(projectRoot: string = process.cwd()): Promise<GinkoConfig> {
    console.log(chalk.green('🚀 Quick setup mode\n'));

    const analysis = await this.detector.analyzeProject(projectRoot);
    const config = analysis.recommendedConfig;

    console.log(chalk.dim('Using recommended configuration based on project structure\n'));

    return {
      version: "1.0.0",
      ...config
    } as GinkoConfig;
  }

  /**
   * Validate final configuration
   */
  async validateConfiguration(config: GinkoConfig, projectRoot: string): Promise<{
    valid: boolean;
    errors: string[];
    warnings: string[];
  }> {
    const errors: string[] = [];
    const warnings: string[] = [];

    // Validate required fields
    if (!config.version) {
      errors.push('Missing version field');
    }

    if (!config.paths) {
      errors.push('Missing paths configuration');
    }

    if (!config.features) {
      errors.push('Missing features configuration');
    }

    // Validate path accessibility
    if (config.paths?.docs) {
      for (const [key, pathStr] of Object.entries(config.paths.docs)) {
        if (typeof pathStr === 'string' && !pathStr.includes('${')) {
          const fullPath = path.join(projectRoot, pathStr);
          const dir = path.dirname(fullPath);

          try {
            await fs.ensureDir(dir);
          } catch (error) {
            errors.push(`Cannot create directory for ${key}: ${pathStr}`);
          }
        }
      }
    }

    return {
      valid: errors.length === 0,
      errors,
      warnings
    };
  }
}

// Export singleton instance
export const interactiveConfig = new InteractiveConfigSetup();