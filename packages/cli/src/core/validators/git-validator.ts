/**
 * @fileType: utility
 * @status: current
 * @updated: 2025-09-20
 * @tags: [git, validation, repository, safety, commands]
 * @related: [init.ts, config-loader.ts]
 * @priority: critical
 * @complexity: low
 * @dependencies: [fs-extra, path, child_process]
 */

import fs from 'fs-extra';
import path from 'path';
import { execSync } from 'child_process';
import chalk from 'chalk';

/**
 * Git repository validation for ginko commands
 * Ensures context isolation and prevents configuration errors
 */
export class GitValidator {

  /**
   * Check if current directory is in a git repository
   */
  static async isGitRepository(directory: string = process.cwd()): Promise<boolean> {
    try {
      // Check for .git directory
      const gitDir = path.join(directory, '.git');
      if (await fs.pathExists(gitDir)) {
        return true;
      }

      // Check if git command recognizes this as a repository
      execSync('git rev-parse --git-dir', {
        cwd: directory,
        stdio: 'pipe',
        timeout: 5000
      });
      return true;
    } catch (error) {
      return false;
    }
  }

  /**
   * Get the git repository root directory
   */
  static async getGitRoot(directory: string = process.cwd()): Promise<string | null> {
    try {
      const gitRoot = execSync('git rev-parse --show-toplevel', {
        cwd: directory,
        encoding: 'utf8',
        stdio: 'pipe',
        timeout: 5000
      }).trim();

      return gitRoot;
    } catch (error) {
      return null;
    }
  }

  /**
   * Validate git repository before running ginko commands
   * Throws error with helpful message if invalid
   */
  static async validateOrExit(command: string = 'ginko'): Promise<void> {
    const isGitRepo = await this.isGitRepository();

    if (!isGitRepo) {
      console.log(chalk.red(`
✗ Not in a git repository

Ginko requires a git repository for context tracking and isolation.

Options:
→ Initialize git: ${chalk.cyan('git init')}
→ Navigate to existing repo: ${chalk.cyan('cd /path/to/your/project')}
→ Clone a repository: ${chalk.cyan('git clone <repository-url>')}

Then run: ${chalk.cyan(`${command} init`)}
      `));
      process.exit(1);
    }
  }

  /**
   * Check for parent .ginko directories that could cause conflicts
   */
  static async findParentGinko(directory: string = process.cwd()): Promise<string | null> {
    let currentDir = path.dirname(directory);
    const rootDir = path.parse(directory).root;

    while (currentDir !== rootDir) {
      const ginkoPath = path.join(currentDir, '.ginko');
      if (await fs.pathExists(ginkoPath)) {
        return currentDir;
      }

      const newDir = path.dirname(currentDir);
      if (newDir === currentDir) break; // Reached filesystem root
      currentDir = newDir;
    }

    return null;
  }

  /**
   * Validate initialization location
   */
  static async validateInitLocation(directory: string = process.cwd()): Promise<{
    valid: boolean;
    warnings: string[];
    gitRoot: string | null;
  }> {
    const warnings: string[] = [];
    let valid = true;

    // Check if we're in a git repo
    const isGitRepo = await this.isGitRepository(directory);
    if (!isGitRepo) {
      valid = false;
      warnings.push('Not in a git repository');
    }

    // Get git root
    const gitRoot = await this.getGitRoot(directory);

    // Check if current directory matches git root
    if (gitRoot && path.resolve(directory) !== path.resolve(gitRoot)) {
      warnings.push(`Not at git repository root. Git root: ${gitRoot}`);
    }

    // Check for parent .ginko directories
    const parentGinko = await this.findParentGinko(directory);
    if (parentGinko) {
      warnings.push(`Found .ginko/ in parent directory: ${parentGinko}`);
    }

    // Check for existing .ginko
    const existingGinko = path.join(directory, '.ginko');
    if (await fs.pathExists(existingGinko)) {
      valid = false;
      warnings.push('Ginko already initialized in this directory');
    }

    return { valid, warnings, gitRoot };
  }

  /**
   * Interactive validation with user prompts
   */
  static async interactiveValidation(directory: string = process.cwd()): Promise<boolean> {
    const validation = await this.validateInitLocation(directory);

    if (validation.warnings.length > 0) {
      console.log(chalk.yellow('\n⚠️ Validation Warnings:'));
      validation.warnings.forEach(warning => {
        console.log(chalk.yellow(`  • ${warning}`));
      });
    }

    if (!validation.valid) {
      console.log(chalk.red('\n✗ Cannot initialize ginko here'));
      return false;
    }

    if (validation.warnings.length > 0) {
      console.log(chalk.blue(`\nWill initialize ginko in: ${directory}`));

      // In a real implementation, you'd use inquirer or similar for prompts
      // For now, we'll assume continuation
      return true;
    }

    return true;
  }

  /**
   * Display helpful git status information
   */
  static async displayGitInfo(): Promise<void> {
    try {
      const gitRoot = await this.getGitRoot();
      if (gitRoot) {
        console.log(chalk.dim(`Git repository: ${gitRoot}`));

        // Get current branch
        try {
          const branch = execSync('git branch --show-current', {
            encoding: 'utf8',
            stdio: 'pipe',
            timeout: 3000
          }).trim();
          console.log(chalk.dim(`Current branch: ${branch}`));
        } catch (error) {
          // Branch info not critical
        }
      }
    } catch (error) {
      // Git info not critical for functionality
    }
  }

  /**
   * Check git configuration for basic requirements
   */
  static async checkGitConfig(): Promise<{
    hasUserName: boolean;
    hasUserEmail: boolean;
    warnings: string[];
  }> {
    const warnings: string[] = [];
    let hasUserName = false;
    let hasUserEmail = false;

    try {
      execSync('git config user.name', { stdio: 'pipe', timeout: 3000 });
      hasUserName = true;
    } catch (error) {
      warnings.push('Git user.name not configured');
    }

    try {
      execSync('git config user.email', { stdio: 'pipe', timeout: 3000 });
      hasUserEmail = true;
    } catch (error) {
      warnings.push('Git user.email not configured');
    }

    return { hasUserName, hasUserEmail, warnings };
  }
}

/**
 * Decorator function to add git validation to commands
 */
export function requireGitRepository(commandName: string = 'ginko') {
  return function(target: any, propertyName: string, descriptor: PropertyDescriptor) {
    const method = descriptor.value;

    descriptor.value = async function(...args: any[]) {
      await GitValidator.validateOrExit(commandName);
      return method.apply(this, args);
    };

    return descriptor;
  };
}

/**
 * Quick validation function for use in command entry points
 */
export async function ensureGitRepository(commandName: string = 'ginko'): Promise<void> {
  await GitValidator.validateOrExit(commandName);
}