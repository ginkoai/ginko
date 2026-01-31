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
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
import { ProjectAnalyzer } from '../analysis/project-analyzer.js';
import { AiInstructionsTemplate, TemplateVariables, ProjectContext } from '../templates/ai-instructions-template.js';
import { AiAdapter } from '../adapters/ai-adapter.js';
import { ClaudeAdapter } from '../adapters/claude-adapter.js';
import { OpenAIAdapter } from '../adapters/openai-adapter.js';
import { GenericAdapter } from '../adapters/generic-adapter.js';
import { CursorAdapter } from '../adapters/cursor-adapter.js';
import { findGinkoRoot } from '../utils/ginko-root.js';
import { pathManager, isInGitRepo } from '../core/utils/paths.js';
import { getUserEmail } from '../utils/helpers.js';
import { GinkoConfig, LocalConfig, DEFAULT_GINKO_CONFIG } from '../types/config.js';

export async function initCommand(options: { quick?: boolean; analyze?: boolean; model?: string; upgrade?: boolean } = {}) {
  const spinner = ora('Initializing Ginko...').start();
  let deepAnalysis: any = null; // Track deep analysis results for output

  try {
    // Get paths from pathManager instead of hardcoding
    const pathConfig = pathManager.getConfig();
    const projectRoot = pathConfig.project.root;
    const ginkoDir = pathConfig.ginko.root;

    // Check if already initialized in current directory
    if (await fs.pathExists(ginkoDir)) {
      if (options.upgrade) {
        spinner.info('Upgrading existing Ginko project...');
        await upgradeProject(projectRoot, spinner);
        return;
      }
      spinner.warn('Ginko already initialized in this directory');
      console.log(chalk.dim('  Tip: Use --upgrade to update AI instructions and skills'));
      return;
    }

    // Check if already initialized in a parent directory
    const existingRoot = await findGinkoRoot();
    if (existingRoot && existingRoot !== projectRoot) {
      if (options.upgrade) {
        spinner.info(`Upgrading Ginko project at ${existingRoot}...`);
        await upgradeProject(existingRoot, spinner);
        return;
      }
      spinner.warn(`Ginko already initialized in parent directory: ${existingRoot}`);
      console.log(chalk.yellow('\nTip: Run ginko commands from any subdirectory - they will use the parent .ginko'));
      return;
    }

    // --upgrade on a non-initialized project should inform the user
    if (options.upgrade) {
      spinner.fail('No existing Ginko project found');
      console.log(chalk.yellow('\n  Run `ginko init` first to initialize a new project.'));
      return;
    }

    // UAT-004: Warn if not in a git repository
    if (!isInGitRepo()) {
      spinner.warn('Not in a git repository');
      console.log(chalk.yellow('\n⚠️  Ginko works best with git for version control and context tracking.'));
      console.log(chalk.dim('   Some features may be limited without git:'));
      console.log(chalk.dim('   • Session history and rollback'));
      console.log(chalk.dim('   • Change tracking and diffs'));
      console.log(chalk.dim('   • Team collaboration features'));
      console.log('');
      console.log(chalk.dim('   To initialize a git repository: git init'));
      console.log('');
      spinner.start('Continuing with initialization...');
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
    const userSlug = userEmail.replace('@', '-at-').replace(/\./g, '-');
    const userSessionsDir = pathManager.joinPaths(pathConfig.ginko.sessions, userSlug);
    await fs.ensureDir(userSessionsDir);
    await fs.ensureDir(pathManager.joinPaths(userSessionsDir, 'archive'));

    // Create team-shared ginko.json configuration (ADR-037)
    spinner.text = 'Creating team-shared configuration (ginko.json)...';

    const ginkoConfig: GinkoConfig = {
      ...DEFAULT_GINKO_CONFIG,
      project: {
        name: path.basename(projectRoot),
        type: 'single' // Can be updated by user later
      }
    };

    const ginkoJsonPath = path.join(projectRoot, 'ginko.json');
    await fs.writeJSON(ginkoJsonPath, ginkoConfig, { spaces: 2 });

    // Create user-specific local.json configuration (ADR-037)
    spinner.text = 'Creating user-specific configuration (.ginko/local.json)...';

    const localConfig: LocalConfig = {
      projectRoot,
      userEmail,
      userSlug,
      workMode: 'think-build'
    };

    const localJsonPath = pathManager.joinPaths(pathConfig.ginko.root, 'local.json');
    await fs.writeJSON(localJsonPath, localConfig, { spaces: 2 });

    // Create legacy config.json for backward compatibility
    const legacyConfig = {
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

    // Save legacy configuration using pathManager
    const configPath = pathManager.joinPaths(pathConfig.ginko.root, 'config.json');
    await fs.writeJSON(configPath, legacyConfig, { spaces: 2 });

    // Project analysis step - skip if quick mode
    if (options.quick) {
      spinner.text = 'Quick initialization mode (skipping analysis)...';
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

    // AI instructions generation - skip in quick mode
    if (options.quick) {
      spinner.text = 'Skipping AI instructions generation (quick mode)...';
    } else {
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
    }

    // Install Claude Code skills
    spinner.start('Installing AI skills...');
    try {
      const skillsDir = path.join(projectRoot, '.claude', 'skills');
      const ginkoSkillDir = path.join(skillsDir, 'ginko');

      await fs.ensureDir(ginkoSkillDir);

      // Resolve templates directory (works from both src/ and dist/)
      const templateSkillsDir = path.join(__dirname, '..', 'templates', 'skills');

      // Copy ginko skill files (don't overwrite existing)
      const ginkoSkillPath = path.join(ginkoSkillDir, 'SKILL.md');
      if (!await fs.pathExists(ginkoSkillPath)) {
        await fs.copy(
          path.join(templateSkillsDir, 'ginko', 'SKILL.md'),
          ginkoSkillPath
        );
      }

      const commandsRefPath = path.join(ginkoSkillDir, 'commands-reference.md');
      if (!await fs.pathExists(commandsRefPath)) {
        await fs.copy(
          path.join(templateSkillsDir, 'ginko', 'commands-reference.md'),
          commandsRefPath
        );
      }

      // Copy push/pull skills (don't overwrite existing)
      const pushSkillPath = path.join(skillsDir, 'push.md');
      if (!await fs.pathExists(pushSkillPath)) {
        await fs.copy(
          path.join(templateSkillsDir, 'push.md'),
          pushSkillPath
        );
      }

      const pullSkillPath = path.join(skillsDir, 'pull.md');
      if (!await fs.pathExists(pullSkillPath)) {
        await fs.copy(
          path.join(templateSkillsDir, 'pull.md'),
          pullSkillPath
        );
      }

      spinner.succeed('AI skills installed');
    } catch (error) {
      spinner.warn('AI skills installation failed');
      console.warn(chalk.yellow('Skills error:', error instanceof Error ? error.message : String(error)));
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
    const ginkoIgnoreRules = `
# Ginko - Keep context, ignore private config (ADR-037)
.ginko/config.json
.ginko/local.json
.ginko/.temp/
`;

    if (await fs.pathExists(gitignorePath)) {
      const gitignore = await fs.readFile(gitignorePath, 'utf8');
      if (!gitignore.includes('.ginko/local.json')) {
        await fs.appendFile(gitignorePath, ginkoIgnoreRules);
      }
    } else {
      await fs.writeFile(gitignorePath, ginkoIgnoreRules);
    }

    spinner.succeed('Context management configured');

    // Cloud graph initialization (automatic, with graceful degradation)
    spinner.start('Initializing cloud knowledge graph...');

    try {
      const { getCurrentUser } = await import('../utils/auth-storage.js');
      const user = await getCurrentUser();

      if (user) {
        // Auto-init graph with minimal prompts
        const { initCommand: graphInit } = await import('./graph/init.js');
        await graphInit({
          quick: true,        // No confirmation prompts during init
          skipLoad: false     // Auto-load documents if they exist
        });

        spinner.succeed('Cloud knowledge graph initialized');
      } else {
        spinner.info('Graph initialization skipped (not authenticated)');
        console.log(chalk.dim('  Run "ginko login" then "ginko graph init" to enable cloud features'));
      }
    } catch (error) {
      // Graceful degradation - don't fail init if graph fails
      spinner.warn('Graph initialization skipped');
      const errorMsg = error instanceof Error ? error.message : String(error);
      if (errorMsg.includes('ENOTFOUND') || errorMsg.includes('ECONNREFUSED')) {
        console.log(chalk.dim('  (Offline - run "ginko graph init" when connected)'));
      } else {
        console.log(chalk.dim(`  (${errorMsg})`));
      }
    }

    // Final setup
    spinner.text = 'Completing setup...';

    // Create initial session marker
    const sessionMarker = pathManager.joinPaths(pathConfig.ginko.sessions, userSlug, '.session-start');
    await fs.writeFile(sessionMarker, new Date().toISOString());

    spinner.succeed('Ginko initialized successfully!');

    // Success message
    console.log('\n' + chalk.green('✅ Initialization complete!'));
    console.log('\n' + chalk.bold('Next steps:'));
    console.log('  1. ' + chalk.cyan('claude') + chalk.dim('         Start Claude Code (AI assistant)'));
    console.log('  2. ' + chalk.cyan('ginko start') + chalk.dim('    Begin your first session\n'));

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
    console.log('  📄 ' + chalk.gray('ginko.json (team-shared configuration)'));
    console.log('  📄 ' + chalk.gray('.ginko/local.json (user-specific configuration)'));
    console.log('  📄 ' + chalk.gray('CLAUDE.md (AI instructions)'));
    console.log('  📄 ' + chalk.gray('.claude/skills/ (AI skill definitions)'));
    console.log('  🔒 ' + chalk.gray('.gitignore (updated)'));
    console.log('\n' + chalk.blue('💡 Configuration:'));
    console.log('  • ginko.json is tracked in git (team-shared structure)');
    console.log('  • .ginko/local.json is git-ignored (your local paths)');

  } catch (error) {
    spinner.fail('Initialization failed');
    console.error(chalk.red('Error:'), error instanceof Error ? error.message : String(error));
    process.exit(1);
  }
}

/**
 * Upgrade an existing Ginko project: regenerate CLAUDE.md and overwrite skills.
 * Does NOT touch .ginko/ config, ginko.json, local.json, .gitignore, git, or graph.
 */
async function upgradeProject(projectRoot: string, spinner: ReturnType<typeof ora>) {
  const updated: string[] = [];

  // 1. Regenerate CLAUDE.md
  spinner.start('Regenerating AI instructions (CLAUDE.md)...');
  try {
    const projectContext: ProjectContext = await new ProjectAnalyzer(projectRoot).analyze();

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

    const instructions = AiInstructionsTemplate.generate(variables);
    const instructionsPath = path.join(projectRoot, 'CLAUDE.md');
    await fs.writeFile(instructionsPath, instructions);

    spinner.succeed('AI instructions regenerated');
    updated.push('CLAUDE.md');
  } catch (error) {
    spinner.warn('AI instructions generation failed');
    console.warn(chalk.yellow('  ' + (error instanceof Error ? error.message : String(error))));
  }

  // 2. Install/overwrite skills (no pathExists guard — upgrade means latest)
  spinner.start('Updating AI skills...');
  try {
    const skillsDir = path.join(projectRoot, '.claude', 'skills');
    const ginkoSkillDir = path.join(skillsDir, 'ginko');
    await fs.ensureDir(ginkoSkillDir);

    const templateSkillsDir = path.join(__dirname, '..', 'templates', 'skills');

    await fs.copy(
      path.join(templateSkillsDir, 'ginko', 'SKILL.md'),
      path.join(ginkoSkillDir, 'SKILL.md')
    );
    await fs.copy(
      path.join(templateSkillsDir, 'ginko', 'commands-reference.md'),
      path.join(ginkoSkillDir, 'commands-reference.md')
    );
    await fs.copy(
      path.join(templateSkillsDir, 'push.md'),
      path.join(skillsDir, 'push.md')
    );
    await fs.copy(
      path.join(templateSkillsDir, 'pull.md'),
      path.join(skillsDir, 'pull.md')
    );

    spinner.succeed('AI skills updated');
    updated.push('.claude/skills/ginko/SKILL.md');
    updated.push('.claude/skills/ginko/commands-reference.md');
    updated.push('.claude/skills/push.md');
    updated.push('.claude/skills/pull.md');
  } catch (error) {
    spinner.warn('AI skills update failed');
    console.warn(chalk.yellow('  ' + (error instanceof Error ? error.message : String(error))));
  }

  // Summary
  console.log('\n' + chalk.green('Upgrade complete!'));
  if (updated.length > 0) {
    console.log(chalk.gray('\nFiles updated:'));
    for (const file of updated) {
      console.log('  ' + chalk.gray(file));
    }
  }
}