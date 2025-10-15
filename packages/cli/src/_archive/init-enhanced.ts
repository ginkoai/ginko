/**
 * @fileType: command
 * @status: current
 * @updated: 2025-09-20
 * @tags: [cli, init, setup, git-native, config-system, interactive]
 * @related: [config-loader.ts, project-detector.ts, git-validator.ts]
 * @priority: high
 * @complexity: high
 * @dependencies: [chalk, fs-extra, ora, child_process]
 */

import chalk from 'chalk';
import fs from 'fs-extra';
import path from 'path';
import ora from 'ora';
import { execSync } from 'child_process';
import { ProjectAnalyzer } from '../analysis/project-analyzer.js';
import { AiInstructionsTemplate, TemplateVariables, ProjectContext } from '../templates/ai-instructions-template.js';
import { AiAdapter } from '../adapters/ai-adapter.js';
import { ClaudeAdapter } from '../adapters/claude-adapter.js';
import { OpenAIAdapter } from '../adapters/openai-adapter.js';
import { GenericAdapter } from '../adapters/generic-adapter.js';
import { CursorAdapter } from '../adapters/cursor-adapter.js';
import { findGinkoRoot } from '../utils/ginko-root.js';

// Import new configuration system
import { GitValidator } from '../core/validators/git-validator.js';
import { configLoader } from '../core/config/config-loader.js';
import { interactiveConfig } from '../core/config/interactive-config.js';
import { GinkoConfig } from '../types/config.js';

export interface InitOptions {
  quick?: boolean;
  analyze?: boolean;
  model?: string;
  interactive?: boolean;
  migrate?: boolean;
  config?: string; // Path to existing config file
}

export async function initCommand(options: InitOptions = {}) {
  const spinner = ora('Initializing Ginko...').start();
  let deepAnalysis: any = null;

  try {
    const projectRoot = process.cwd();

    // Phase 1: Git Repository Validation (Critical Safety)
    spinner.text = 'Validating git repository...';
    await GitValidator.validateOrExit('ginko init');

    // Additional validation for init location
    const validation = await GitValidator.validateInitLocation(projectRoot);
    if (!validation.valid) {
      spinner.fail('Cannot initialize ginko here');
      validation.warnings.forEach(warning => {
        console.log(chalk.red(`✗ ${warning}`));
      });
      process.exit(1);
    }

    if (validation.warnings.length > 0) {
      spinner.warn('Validation warnings found');
      validation.warnings.forEach(warning => {
        console.log(chalk.yellow(`⚠️ ${warning}`));
      });

      // In interactive mode, we could prompt to continue
      if (options.interactive !== false) {
        console.log(chalk.blue(`\nProceeding with initialization in: ${projectRoot}`));
      }
    }

    const ginkoDir = path.join(projectRoot, '.ginko');

    // Check if already initialized
    if (await fs.pathExists(ginkoDir)) {
      if (options.migrate) {
        spinner.text = 'Migrating existing installation...';
        await migrateExistingInstallation(ginkoDir, options);
      } else {
        spinner.warn('Ginko already initialized in this directory');
        console.log(chalk.yellow('Use --migrate to update configuration'));
        return;
      }
    }

    // Phase 2: Configuration Setup
    spinner.text = 'Setting up configuration...';
    let config: GinkoConfig;

    if (options.config) {
      // Load config from file
      const configFile = path.resolve(options.config);
      config = await fs.readJSON(configFile);
      console.log(chalk.blue(`Using configuration from: ${configFile}`));
    } else if (options.interactive !== false) {
      // Interactive configuration
      spinner.stop();
      config = await interactiveConfig.setupConfiguration(projectRoot);
      spinner = ora('Creating project structure...').start();
    } else {
      // Quick setup with smart defaults
      config = await interactiveConfig.quickSetup(projectRoot);
    }

    // Save configuration
    await configLoader.saveConfig(config, projectRoot);

    // Phase 3: Create Directory Structure
    spinner.text = 'Creating directory structure...';
    await createDirectoryStructure(config, projectRoot);

    // Phase 4: User and Git Configuration
    spinner.text = 'Configuring user settings...';
    const userInfo = await setupUserConfiguration(ginkoDir);

    // Phase 5: Project Analysis and AI Instructions
    if (!options.quick) {
      spinner.text = 'Analyzing project structure...';

      let projectContext;

      if (options.analyze) {
        // Deep analysis mode
        spinner.text = '🔬 Performing deep project analysis...';
        const { DeepAnalyzer } = await import('../analysis/deep-analyzer.js');
        const analyzer = new DeepAnalyzer(projectRoot);

        deepAnalysis = await analyzer.loadCache();
        if (!deepAnalysis) {
          deepAnalysis = await analyzer.analyze();
          await analyzer.cacheResults(deepAnalysis);
        }

        projectContext = deepAnalysis;
      } else {
        projectContext = await ProjectAnalyzer.quickAnalyze(projectRoot);
      }

      // Generate AI instructions
      await generateAiInstructions(projectRoot, projectContext, userInfo, options);

      // Generate context modules
      await generateContextModules(ginkoDir, projectContext, config);
    }

    // Phase 6: Create Initial Files
    spinner.text = 'Creating initial files...';
    await createInitialFiles(ginkoDir, config);

    // Phase 7: Git Integration
    spinner.text = 'Setting up git integration...';
    await setupGitIntegration(projectRoot, config);

    spinner.succeed('Ginko initialized successfully!');

    // Display success information
    displaySuccessMessage(config, projectRoot, deepAnalysis);

  } catch (error) {
    spinner.fail('Initialization failed');
    console.error(chalk.red('Error:'), error instanceof Error ? error.message : String(error));
    process.exit(1);
  }
}

/**
 * Create directory structure based on configuration
 */
async function createDirectoryStructure(config: GinkoConfig, projectRoot: string): Promise<void> {
  // Create ginko directories
  const ginkoRoot = await configLoader.getPath('ginko.root');
  await fs.ensureDir(path.join(projectRoot, ginkoRoot));

  const ginkoPaths = ['context', 'sessions', 'backlog', 'patterns', 'bestPractices'];
  for (const pathKey of ginkoPaths) {
    try {
      const pathValue = await configLoader.getPath(`ginko.${pathKey}`);
      await fs.ensureDir(path.join(projectRoot, pathValue));
    } catch (error) {
      // Skip if path not configured
    }
  }

  // Create context modules directory
  const contextPath = await configLoader.getPath('ginko.context');
  await fs.ensureDir(path.join(projectRoot, contextPath, 'modules'));

  // Create documentation directories if configured
  if (config.features.documentNaming) {
    const docsPaths = ['docs.adr', 'docs.prd', 'docs.sprints'];
    for (const pathKey of docsPaths) {
      try {
        const pathValue = await configLoader.getPath(pathKey);
        await fs.ensureDir(path.join(projectRoot, pathValue));
      } catch (error) {
        // Skip if path not configured
      }
    }
  }
}

/**
 * Setup user configuration
 */
async function setupUserConfiguration(ginkoDir: string): Promise<{ email: string; name: string }> {
  let userEmail = 'user@example.com';
  let userName = 'Developer';

  try {
    userEmail = execSync('git config user.email', { encoding: 'utf8' }).trim();
    userName = execSync('git config user.name', { encoding: 'utf8' }).trim();
  } catch (e) {
    console.log(chalk.yellow('⚠️ Git user not configured. Using defaults.'));
    console.log(chalk.dim('Set with: git config --global user.name "Your Name"'));
    console.log(chalk.dim('         git config --global user.email "your@email.com"'));
  }

  // Create user session directory
  const userSlug = userEmail.replace('@', '-at-').replace(/\./g, '-');
  const sessionsPath = path.join(ginkoDir, 'sessions', userSlug);
  await fs.ensureDir(sessionsPath);
  await fs.ensureDir(path.join(sessionsPath, 'archive'));

  // Create legacy config for compatibility
  const legacyConfig = {
    version: '0.1.0',
    user: { email: userEmail },
    privacy: {
      analytics: { enabled: false, anonymous: true },
      telemetry: { enabled: false }
    },
    git: { autoCommit: false, signCommits: false },
    ai: {
      model: 'auto-detect',
      output: { format: 'human', colors: true, emojis: true }
    }
  };

  await fs.writeJSON(path.join(ginkoDir, 'config.json'), legacyConfig, { spaces: 2 });

  return { email: userEmail, name: userName };
}

/**
 * Generate AI instructions with project context
 */
async function generateAiInstructions(
  projectRoot: string,
  projectContext: ProjectContext,
  userInfo: { email: string; name: string },
  options: InitOptions
): Promise<void> {
  const adapter = selectAiAdapter(options.model);

  const templateVars: TemplateVariables = {
    ...projectContext,
    userEmail: userInfo.email,
    userName: userInfo.name,
    date: new Date().toISOString().split('T')[0],
    aiModel: adapter.name,
  };

  let aiInstructions: string;
  if (adapter instanceof CursorAdapter) {
    aiInstructions = await adapter.generate(templateVars);
  } else {
    const modelContent = adapter.getModelSpecificSections() + adapter.getQuickReferenceCommands();
    aiInstructions = AiInstructionsTemplate.generate(templateVars, modelContent);
  }

  await fs.writeFile(path.join(projectRoot, adapter.fileExtension), aiInstructions);
}

/**
 * Generate context modules based on project analysis
 */
async function generateContextModules(
  ginkoDir: string,
  projectContext: ProjectContext,
  config: GinkoConfig
): Promise<void> {
  const contextModulesDir = path.join(ginkoDir, 'context', 'modules');

  // Create configuration context module
  const configModule = `# Configuration Context

## Ginko Configuration
${JSON.stringify(config, null, 2)}

## Path Resolution
- Documentation root: ${config.paths.docs.root}
- ADR path: ${config.paths.docs.adr}
- PRD path: ${config.paths.docs.prd}
- Sprints path: ${config.paths.docs.sprints}

## Enabled Features
${Object.entries(config.features)
  .map(([key, enabled]) => `- ${key}: ${enabled ? '✓' : '✗'}`)
  .join('\n')}

## Usage
Use \`ginko config\` to view or modify configuration.
Use \`configLoader.getPath()\` in code to resolve paths.
`;

  await fs.writeFile(path.join(contextModulesDir, 'configuration.md'), configModule);

  // Create project structure module if we have analysis
  if (projectContext) {
    const projectModule = `# Project Structure Context

## Analysis Results
${JSON.stringify(projectContext, null, 2)}

## Key Patterns
Based on project analysis, the following patterns were detected:
- Type: ${projectContext.type || 'Unknown'}
- Framework: ${projectContext.framework || 'None detected'}
- Package Manager: ${projectContext.packageManager || 'None detected'}

## Recommendations
Follow existing patterns when making changes.
Maintain consistency with detected project structure.
`;

    await fs.writeFile(path.join(contextModulesDir, 'project-structure.md'), projectModule);
  }
}

/**
 * Create initial files and templates
 */
async function createInitialFiles(ginkoDir: string, config: GinkoConfig): Promise<void> {
  // Context rules
  const contextRules = `# Context Rules

## Auto-Load
- Current file being edited
- Files in same directory
- Recent files (last 5 edited)

## Exclude
- node_modules/
- .git/
- dist/
- build/
- *.log
- *.tmp

## Boundaries
- Module: Current package/workspace
- Project: Repository root
- Focus: Active feature branch

## Configuration-Based Paths
${Object.entries(config.paths.docs)
  .map(([key, path]) => `- ${key}: ${path}`)
  .join('\n')}
`;

  await fs.writeFile(path.join(ginkoDir, 'context', 'rules.md'), contextRules);

  // Best practices
  const bestPractices = `# Local Best Practices

## Code Style
- Follow existing patterns in the codebase
- Maintain consistent naming conventions
- Document complex logic

## Git Workflow
- Commit early and often
- Write clear commit messages
- Create handoffs at natural breakpoints

## AI Collaboration
- Keep context focused
- Use vibecheck when stuck
- Archive sessions when complete

## Configuration Management
- Use ginko.json for path customization
- Update configuration through \`ginko config\` command
- Document any custom paths in team documentation
${config.features.documentNaming ? `
## Document Naming
- Follow ${config.naming?.format || 'TYPE-###-description'} format
- Use \`ginko reflect\` for automatic naming
- Maintain sequential numbering within document types` : ''}
`;

  await fs.writeFile(path.join(ginkoDir, 'best-practices', 'local.md'), bestPractices);
}

/**
 * Setup git integration
 */
async function setupGitIntegration(projectRoot: string, config: GinkoConfig): Promise<void> {
  const gitignorePath = path.join(projectRoot, '.gitignore');
  const ginkoIgnore = `
# Ginko AI collaboration
.ginko/sessions/
.ginko/context/modules/
*.ginko-temp
`;

  if (await fs.pathExists(gitignorePath)) {
    const content = await fs.readFile(gitignorePath, 'utf8');
    if (!content.includes('.ginko/')) {
      await fs.appendFile(gitignorePath, ginkoIgnore);
    }
  } else {
    await fs.writeFile(gitignorePath, ginkoIgnore.trim());
  }

  // Create .ginko/gitkeep files for important directories
  const keepDirs = ['context', 'best-practices', 'patterns'];
  for (const dir of keepDirs) {
    try {
      const dirPath = await configLoader.getPath(`ginko.${dir}`);
      await fs.writeFile(path.join(projectRoot, dirPath, '.gitkeep'), '');
    } catch (error) {
      // Skip if path not configured
    }
  }
}

/**
 * Migrate existing installation
 */
async function migrateExistingInstallation(ginkoDir: string, options: InitOptions): Promise<void> {
  // Backup existing configuration
  const backupDir = path.join(ginkoDir, 'migration-backup');
  await fs.ensureDir(backupDir);

  const filesToBackup = ['config.json', 'ginko.json'];
  for (const file of filesToBackup) {
    const filePath = path.join(ginkoDir, file);
    if (await fs.pathExists(filePath)) {
      await fs.copy(filePath, path.join(backupDir, file));
    }
  }

  console.log(chalk.blue(`✓ Backed up existing configuration to ${backupDir}`));
}

/**
 * Select AI adapter based on model preference
 */
function selectAiAdapter(model?: string): AiAdapter {
  switch (model?.toLowerCase()) {
    case 'claude':
      return new ClaudeAdapter();
    case 'openai':
    case 'gpt':
      return new OpenAIAdapter();
    case 'cursor':
      return new CursorAdapter();
    default:
      // Auto-detect based on environment or use generic
      return new GenericAdapter();
  }
}

/**
 * Display success message with next steps
 */
function displaySuccessMessage(config: GinkoConfig, projectRoot: string, analysis?: any): void {
  console.log(chalk.green('\n🎉 Ginko is ready to enhance your development workflow!\n'));

  console.log(chalk.white('📁 Configuration:'));
  console.log(chalk.dim(`  • Project root: ${projectRoot}`));
  console.log(chalk.dim(`  • Documentation: ${config.paths.docs.root}`));
  console.log(chalk.dim(`  • Context storage: ${config.paths.ginko.root}`));

  console.log(chalk.white('\n⚡ Enabled features:'));
  Object.entries(config.features).forEach(([key, enabled]) => {
    if (enabled) {
      console.log(chalk.green(`  ✓ ${key}`));
    }
  });

  console.log(chalk.white('\n🚀 Next steps:'));
  console.log(chalk.cyan('  ginko start') + chalk.dim(' - Begin your first session'));
  console.log(chalk.cyan('  ginko context') + chalk.dim(' - View available context modules'));
  console.log(chalk.cyan('  ginko config') + chalk.dim(' - View or modify configuration'));

  if (config.features.documentNaming) {
    console.log(chalk.cyan('  ginko reflect') + chalk.dim(' - Create documented decisions'));
  }

  if (analysis) {
    console.log(chalk.white('\n📊 Project analysis completed'));
    console.log(chalk.dim('  Deep analysis results saved for AI context'));
  }

  console.log(chalk.white('\n💡 Tips:'));
  console.log(chalk.dim('  • Use ginko.json to customize paths for your project'));
  console.log(chalk.dim('  • Run `ginko doctor` if you encounter any issues'));
  console.log(chalk.dim('  • Check CLAUDE.md for AI collaboration guidelines'));
}