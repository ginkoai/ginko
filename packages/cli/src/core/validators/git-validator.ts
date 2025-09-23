/**
 * @fileType: utility
 * @status: current
 * @updated: 2025-09-19
 * @tags: [validation, git, repository, first-use-experience]
 * @related: [config-validator.ts, environment-validator.ts, index.ts]
 * @priority: critical
 * @complexity: medium
 * @dependencies: [simple-git, fs-extra]
 */

import { simpleGit, SimpleGit, GitError } from 'simple-git';
import * as fs from 'fs-extra';
import * as path from 'path';

/**
 * Result of a validation check
 */
export interface ValidationResult {
  valid: boolean;
  error?: string;
  suggestions?: string[];
  metadata?: Record<string, any>;
}

/**
 * Base interface for all validators
 */
export interface Validator {
  validate(): Promise<ValidationResult>;
  getErrorMessage(): string;
  getSuggestions(): string[];
}

/**
 * Validates git repository requirements for ginko
 *
 * Checks:
 * - Git command availability
 * - Current directory is in a git repository
 * - Repository is properly initialized
 * - Working directory is clean (optional warning)
 */
export class GitValidator implements Validator {
  private git: SimpleGit;
  private currentPath: string;
  private lastError?: string;
  private lastSuggestions: string[] = [];

  constructor(cwd: string = process.cwd()) {
    this.currentPath = cwd;
    this.git = simpleGit(cwd);
  }

  /**
   * Perform comprehensive git validation
   */
  async validate(): Promise<ValidationResult> {
    try {
      // Check 1: Git command availability
      const gitAvailable = await this.checkGitCommand();
      if (!gitAvailable.valid) {
        return gitAvailable;
      }

      // Check 2: Git repository detection
      const repoCheck = await this.checkGitRepository();
      if (!repoCheck.valid) {
        return repoCheck;
      }

      // Check 3: Repository health
      const healthCheck = await this.checkRepositoryHealth();
      if (!healthCheck.valid) {
        return healthCheck;
      }

      // All checks passed
      return {
        valid: true,
        metadata: {
          gitVersion: await this.getGitVersion(),
          repositoryPath: await this.getRepositoryRoot(),
          currentBranch: await this.getCurrentBranch(),
          hasUncommittedChanges: await this.hasUncommittedChanges()
        }
      };

    } catch (error) {
      this.lastError = error instanceof Error ? error.message : 'Unknown git validation error';
      this.lastSuggestions = this.generateErrorSuggestions(error);

      return {
        valid: false,
        error: this.lastError,
        suggestions: this.lastSuggestions
      };
    }
  }

  /**
   * Get user-friendly error message
   */
  getErrorMessage(): string {
    return this.lastError || 'Git validation failed';
  }

  /**
   * Get actionable suggestions for fixing the error
   */
  getSuggestions(): string[] {
    return this.lastSuggestions;
  }

  /**
   * Check if git command is available
   */
  private async checkGitCommand(): Promise<ValidationResult> {
    try {
      await this.git.version();
      return { valid: true };
    } catch (error) {
      this.lastError = 'Git command not found or not working';
      this.lastSuggestions = [
        'Install Git: https://git-scm.com/downloads',
        'Verify Git is in your PATH: git --version',
        'On Windows: Restart terminal after Git installation',
        'On macOS: Install Xcode Command Line Tools: xcode-select --install'
      ];

      return {
        valid: false,
        error: this.lastError,
        suggestions: this.lastSuggestions
      };
    }
  }

  /**
   * Check if current directory is in a git repository
   */
  private async checkGitRepository(): Promise<ValidationResult> {
    try {
      // Try to get repository root
      const isRepo = await this.git.checkIsRepo();

      if (!isRepo) {
        this.lastError = 'Current directory is not in a git repository';
        this.lastSuggestions = [
          'Initialize a new repository: git init',
          'Navigate to an existing repository: cd /path/to/your/repo',
          'Clone a repository: git clone <repository-url>',
          'Ginko requires a git repository to track context and changes'
        ];

        return {
          valid: false,
          error: this.lastError,
          suggestions: this.lastSuggestions
        };
      }

      return { valid: true };
    } catch (error) {
      this.lastError = 'Failed to check git repository status';
      this.lastSuggestions = [
        'Ensure you have read permissions in the current directory',
        'Check if .git directory exists and is accessible',
        'Try running: git status'
      ];

      return {
        valid: false,
        error: this.lastError,
        suggestions: this.lastSuggestions
      };
    }
  }

  /**
   * Check repository health and configuration
   */
  private async checkRepositoryHealth(): Promise<ValidationResult> {
    try {
      // Check if repository has at least one commit
      const hasCommits = await this.hasCommits();

      if (!hasCommits) {
        // This is a warning, not a fatal error
        this.lastSuggestions = [
          'Repository has no commits yet',
          'Create your first commit: git add . && git commit -m "Initial commit"',
          'Ginko works best with committed code for context tracking'
        ];

        return {
          valid: true,
          metadata: { warning: 'No commits found in repository' }
        };
      }

      return { valid: true };
    } catch (error) {
      // Repository health issues are warnings, not blockers
      return {
        valid: true,
        metadata: {
          warning: 'Could not check repository health',
          details: error instanceof Error ? error.message : 'Unknown error'
        }
      };
    }
  }

  /**
   * Get git version
   */
  private async getGitVersion(): Promise<string | undefined> {
    try {
      const version = await this.git.version();
      return version.installed;
    } catch {
      return undefined;
    }
  }

  /**
   * Get repository root path
   */
  private async getRepositoryRoot(): Promise<string | undefined> {
    try {
      const root = await this.git.revparse(['--show-toplevel']);
      return root.trim();
    } catch {
      return undefined;
    }
  }

  /**
   * Get current branch name
   */
  private async getCurrentBranch(): Promise<string | undefined> {
    try {
      const branch = await this.git.branch();
      return branch.current;
    } catch {
      return undefined;
    }
  }

  /**
   * Check if repository has any commits
   */
  private async hasCommits(): Promise<boolean> {
    try {
      await this.git.log({ maxCount: 1 });
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Check if there are uncommitted changes
   */
  private async hasUncommittedChanges(): Promise<boolean> {
    try {
      const status = await this.git.status();
      return status.files.length > 0;
    } catch {
      return false;
    }
  }

  /**
   * Generate contextual suggestions based on error type
   */
  private generateErrorSuggestions(error: any): string[] {
    const suggestions: string[] = [];

    if (error instanceof GitError) {
      switch (error.git?.exitCode) {
        case 128:
          suggestions.push(
            'Repository may be corrupted or inaccessible',
            'Try: git status',
            'Reinitialize if needed: rm -rf .git && git init'
          );
          break;
        case 129:
          suggestions.push(
            'Invalid git command or arguments',
            'Check git installation: git --version'
          );
          break;
        default:
          suggestions.push(
            'Git command failed',
            'Check git installation and repository permissions'
          );
      }
    } else if (error?.message?.includes('ENOENT')) {
      suggestions.push(
        'Git executable not found',
        'Install Git from https://git-scm.com/',
        'Add Git to your system PATH'
      );
    } else {
      suggestions.push(
        'Unexpected git error occurred',
        'Try: git status',
        'Ensure repository is properly initialized'
      );
    }

    return suggestions;
  }

  /**
   * Static method to quickly check if directory is a git repo
   */
  static async isGitRepository(path: string = process.cwd()): Promise<boolean> {
    try {
      const validator = new GitValidator(path);
      const result = await validator.validate();
      return result.valid;
    } catch {
      return false;
    }
  }

  /**
   * Static method to get basic git info
   */
  static async getGitInfo(path: string = process.cwd()): Promise<Record<string, any>> {
    try {
      const validator = new GitValidator(path);
      const result = await validator.validate();
      return result.metadata || {};
    } catch {
      return {};
    }
  }
}