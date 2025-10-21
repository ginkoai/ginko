/**
 * @fileType: command
 * @status: current
 * @updated: 2025-09-21
 * @tags: [cli, init, setup, git-native, enhanced, path-config]
 * @related: [path-config.ts, ginko-root.ts]
 * @priority: high
 * @complexity: medium
 * @dependencies: [path-config, chalk, fs-extra, ora]
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
import { pathManager } from '../core/utils/paths.js';
import { getUserEmail } from '../utils/helpers.js';

export async function initCommand(options: { quick?: boolean; analyze?: boolean; model?: string } = {}) {
  const spinner = ora('Initializing Ginko...').start();
  let deepAnalysis: any = null; // Track deep analysis results for output

  try {
    // Get paths from pathManager instead of hardcoding
    const pathConfig = pathManager.getConfig();
    const projectRoot = pathConfig.project.root;
    const ginkoDir = pathConfig.ginko.root;

    // Check if already initialized in current directory
    if (await fs.pathExists(ginkoDir)) {
      spinner.warn('Ginko already initialized in this directory');
      return;
    }

    // Check if already initialized in a parent directory
    const existingRoot = await findGinkoRoot();
    if (existingRoot && existingRoot !== projectRoot) {
      spinner.warn(`Ginko already initialized in parent directory: ${existingRoot}`);
      console.log(chalk.yellow('\nTip: Run ginko commands from any subdirectory - they will use the parent .ginko'));
      return;
    }

    // Create directory structure using pathManager
    await fs.ensureDir(pathConfig.ginko.sessions);
    await fs.ensureDir(pathManager.joinPaths(pathConfig.ginko.root, 'patterns'));
    await fs.ensureDir(pathManager.joinPaths(pathConfig.ginko.root, 'best-practices'));
    await fs.ensureDir(pathConfig.ginko.context);
    await fs.ensureDir(pathManager.joinPaths(pathConfig.ginko.context, 'modules'));

    // Get user info from git config
    let userEmail = 'user@example.com';
    let userName = 'Developer';
    try {
      userEmail = execSync('git config user.email', { encoding: 'utf8' }).trim();
      userName = execSync('git config user.name', { encoding: 'utf8' }).trim();
    } catch (e) {
      // Git not configured, use defaults
    }

    // Create user session directory using pathManager
    const userSlug = userEmail.replace('@', '-at-').replace(/\\./g, '-');
    const userSessionsDir = pathManager.joinPaths(pathConfig.ginko.sessions, userSlug);
    await fs.ensureDir(userSessionsDir);
    await fs.ensureDir(pathManager.joinPaths(userSessionsDir, 'archive'));

    // Create default configuration (privacy-first)
    const config = {
      version: '0.1.0',
      user: {
        email: userEmail
      },
      privacy: {
        shareAnonymizedUsage: false,
        trackFeatureUsage: true,
        includeStackTraces: false
      },
      features: {
        deepAnalysis: options.analyze !== false,
        autoBestPractices: true,
        smartTemplates: true
      },
      ai: {
        defaultModel: options.model || 'claude-3-5-sonnet-20241022',
        fallbackModel: 'gpt-4o-mini'
      }
    };

    // Save configuration using pathManager
    const configPath = pathManager.joinPaths(pathConfig.ginko.root, 'config.json');
    await fs.writeJSON(configPath, config, { spaces: 2 });

    // Project analysis step - skip if quick mode
    if (options.quick) {
      spinner.text = 'Quick initialization (skipping analysis)...';
      spinner.succeed('Quick initialization complete');
    } else if (options.analyze !== false) {
      spinner.text = 'Analyzing project structure...';

      try {
        const analyzer = new ProjectAnalyzer(projectRoot);

        // Perform analysis
        deepAnalysis = await analyzer.analyze();

        // Save analysis results using pathManager
        const analysisPath = pathManager.joinPaths(pathConfig.ginko.context, 'project-analysis.json');
        await fs.writeJSON(analysisPath, deepAnalysis, { spaces: 2 });

        spinner.succeed('Project analysis complete');
      } catch (analysisError) {
        spinner.warn('Project analysis failed, continuing with basic setup');
        console.warn(chalk.yellow('Analysis error:', analysisError instanceof Error ? analysisError.message : String(analysisError)));
      }
    }

    // AI instructions generation
    spinner.start('Generating AI collaboration instructions...');

    try {
      const projectContext: ProjectContext = deepAnalysis || await new ProjectAnalyzer(projectRoot).analyze();

      // Create template variables
      const variables: TemplateVariables = {
        projectName: path.basename(projectRoot),
        projectType: projectContext.projectType || 'unknown',
        techStack: projectContext.techStack || [],
        frameworks: projectContext.frameworks || [],
        languages: projectContext.languages || [],
        packageManager: projectContext.packageManager || 'unknown',
        testCommand: projectContext.testCommand || 'npm test',
        buildCommand: projectContext.buildCommand || 'npm run build',
        hasTests: projectContext.hasTests || false,
        userEmail: await getUserEmail(),
        userName: 'Developer',
        date: new Date().toISOString().split('T')[0]
      };

      // Generate instructions
      const instructions = AiInstructionsTemplate.generate(variables);

      // Save instructions using pathManager
      const instructionsPath = pathManager.joinPaths(projectRoot, 'CLAUDE.md');
      await fs.writeFile(instructionsPath, instructions);

      spinner.succeed('AI instructions generated');
    } catch (error) {
      spinner.warn('AI instructions generation failed');
      console.warn(chalk.yellow('Instructions error:', error instanceof Error ? error.message : String(error)));
    }

    // Context rules
    spinner.start('Setting up context management...');

    const contextRules = `# Context Management Rules

## Privacy & Security
- All context stored locally in .ginko/
- No data leaves your machine without explicit action
- Handoffs are git-tracked for team collaboration
- Config (.ginko/config.json) is gitignored

## Best Practices
- Always run \`ginko handoff\` before switching context
- Use \`ginko start\` to resume with full context
- Keep handoffs under 2000 words for clarity
- Include specific next steps in every handoff
`;

    const contextPath = pathManager.joinPaths(pathConfig.ginko.context, 'rules.md');
    await fs.writeFile(contextPath, contextRules);

    // Create initial best practice
    const bestPractice = `# Local Development Best Practices

## Session Management
- \`ginko start\` - Begin new session with context loading
- \`ginko handoff\` - Save progress for seamless continuation
- \`ginko vibecheck\` - Quick realignment when stuck

## Development Workflow
1. Check what exists: \`ls -la\` relevant directories
2. Find examples: Look for similar features already implemented
3. Test existing: Try current endpoints/features first
4. Plan, implement, test, document

*Customize this file for your team's specific practices*
`;

    const bestPracticePath = pathManager.joinPaths(pathConfig.ginko.root, 'best-practices', 'local.md');
    await fs.writeFile(bestPracticePath, bestPractice);

    // Add .ginko to .gitignore if it doesn't exist
    const gitignorePath = pathManager.joinPaths(projectRoot, '.gitignore');
    if (await fs.pathExists(gitignorePath)) {
      const gitignore = await fs.readFile(gitignorePath, 'utf8');
      if (!gitignore.includes('.ginko/config.json')) {
        await fs.appendFile(gitignorePath, '\n# Ginko - Keep context, ignore private config\n.ginko/config.json\n.ginko/.temp/\n');
      }
    } else {
      await fs.writeFile(gitignorePath, '# Ginko - Keep context, ignore private config\n.ginko/config.json\n.ginko/.temp/\n');
    }

    spinner.succeed('Context management configured');

    // Final setup
    spinner.start('Completing setup...');

    // Create initial session marker
    const sessionMarker = pathManager.joinPaths(pathConfig.ginko.sessions, userSlug, '.session-start');
    await fs.writeFile(sessionMarker, new Date().toISOString());

    spinner.succeed('Ginko initialized successfully!');

    // Success message
    console.log('\n' + chalk.green('🎉 Ginko is ready!'));

    if (options.quick) {
      console.log(chalk.dim('\n💨 Quick mode: Skipped project analysis. Run ') + chalk.cyan('ginko init --analyze') + chalk.dim(' anytime to analyze your project.'));
    }

    console.log('\n' + chalk.blue('Quick start:'));
    console.log('  ' + chalk.cyan('ginko start') + ' - Begin your first session');
    console.log('  ' + chalk.cyan('ginko handoff "Initial setup complete"') + ' - Save your progress');

    if (deepAnalysis) {
      console.log('\n' + chalk.blue('Project analysis:'));
      console.log('  📊 ' + chalk.yellow('Type:') + ' ' + (deepAnalysis.type || 'Unknown'));
      console.log('  🔧 ' + chalk.yellow('Languages:') + ' ' + (deepAnalysis.languages?.join(', ') || 'None detected'));
      console.log('  📦 ' + chalk.yellow('Frameworks:') + ' ' + (deepAnalysis.frameworks?.join(', ') || 'None detected'));
      console.log('  ⚗️  ' + chalk.yellow('Package Manager:') + ' ' + (deepAnalysis.packageManager || 'Unknown'));

      if (deepAnalysis.commands?.length > 0) {
        console.log('  🎯 ' + chalk.yellow('Quick Commands:') + ' ' + deepAnalysis.commands.slice(0, 3).join(', '));
      }
    }

    console.log('\n' + chalk.gray('Files created:'));
    console.log('  📁 ' + chalk.gray(pathManager.getRelativePath(ginkoDir)));
    console.log('  📄 ' + chalk.gray('CLAUDE.md (AI instructions)'));
    console.log('  🔒 ' + chalk.gray('.gitignore (updated)'));

  } catch (error) {
    spinner.fail('Initialization failed');
    console.error(chalk.red('Error:'), error instanceof Error ? error.message : String(error));
    process.exit(1);
  }
}