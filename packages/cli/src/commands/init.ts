/**
 * @fileType: command
 * @status: current
 * @updated: 2025-08-27
 * @tags: [cli, init, setup, git-native]
 * @priority: high
 * @complexity: low
 */

import chalk from 'chalk';
import fs from 'fs-extra';
import path from 'path';
import ora from 'ora';
import { execSync } from 'child_process';

export async function initCommand() {
  const spinner = ora('Initializing Ginko...').start();
  
  try {
    const projectRoot = process.cwd();
    const ginkoDir = path.join(projectRoot, '.ginko');
    
    // Check if already initialized
    if (await fs.pathExists(ginkoDir)) {
      spinner.warn('Ginko already initialized in this project');
      return;
    }
    
    // Create directory structure
    await fs.ensureDir(path.join(ginkoDir, 'sessions'));
    await fs.ensureDir(path.join(ginkoDir, 'patterns'));
    await fs.ensureDir(path.join(ginkoDir, 'best-practices'));
    await fs.ensureDir(path.join(ginkoDir, 'context'));
    
    // Get user email from git config
    let userEmail = 'user@example.com';
    try {
      userEmail = execSync('git config user.email', { encoding: 'utf8' }).trim();
    } catch (e) {
      // Git not configured, use default
    }
    
    // Create user session directory
    const userSlug = userEmail.replace('@', '-at-').replace(/\./g, '-');
    await fs.ensureDir(path.join(ginkoDir, 'sessions', userSlug));
    await fs.ensureDir(path.join(ginkoDir, 'sessions', userSlug, 'archive'));
    
    // Create default configuration (privacy-first)
    const config = {
      version: '0.1.0',
      user: {
        email: userEmail
      },
      privacy: {
        analytics: {
          enabled: false,  // Disabled by default
          anonymous: true   // Always anonymous when enabled
        },
        telemetry: {
          enabled: false
        }
      },
      git: {
        autoCommit: false,
        signCommits: false
      },
      ai: {
        model: 'auto-detect',
        output: {
          format: 'human',
          colors: true,
          emojis: true
        }
      }
    };
    
    await fs.writeJSON(path.join(ginkoDir, 'config.json'), config, { spaces: 2 });
    
    // Create context rules
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
`;
    
    await fs.writeFile(path.join(ginkoDir, 'context', 'rules.md'), contextRules);
    
    // Create initial best practice
    const bestPractice = `# Local Best Practices

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
`;
    
    await fs.writeFile(path.join(ginkoDir, 'best-practices', 'local.md'), bestPractice);
    
    // Add .ginko to .gitignore if it doesn't exist
    const gitignorePath = path.join(projectRoot, '.gitignore');
    if (await fs.pathExists(gitignorePath)) {
      const gitignore = await fs.readFile(gitignorePath, 'utf8');
      if (!gitignore.includes('.ginko/config.json')) {
        await fs.appendFile(gitignorePath, '\n# Ginko local config (contains preferences)\n.ginko/config.json\n');
      }
    }
    
    spinner.succeed('Ginko initialized successfully!');
    
    console.log('\n' + chalk.green('✨ Setup complete!'));
    console.log('\nNext steps:');
    console.log(chalk.cyan('  ginko start') + ' - Begin a new session');
    console.log(chalk.cyan('  ginko handoff') + ' - Save your progress');
    console.log(chalk.cyan('  ginko status') + ' - Check session state');
    console.log('\n' + chalk.dim('📁 Created .ginko/ directory (git-tracked)'));
    console.log(chalk.dim('🔐 Privacy: All data stays local. No analytics enabled.'));
    
  } catch (error) {
    spinner.fail('Failed to initialize Ginko');
    console.error(chalk.red('Error:'), error instanceof Error ? error.message : String(error));
    process.exit(1);
  }
}