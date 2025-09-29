/**
 * @fileType: command
 * @status: current
 * @updated: 2025-09-29
 * @tags: [git, reflection, changelog-chaining, orchestrator]
 * @related: [../../core/reflection-pattern.ts, git-context-gatherer.ts, ../changelog/changelog-reflection.ts]
 * @priority: high
 * @complexity: high
 * @dependencies: [reflection-pattern, chalk, execSync]
 */

import { ReflectionCommand } from '../../core/reflection-pattern.js';
import { GitContextGatherer } from './git-context-gatherer.js';
import { ChangelogReflectionCommand } from '../changelog/changelog-reflection.js';
import chalk from 'chalk';
import { execSync } from 'child_process';

interface GitOptions {
  commit?: boolean;        // Create commit (default: true)
  message?: string;        // Custom commit message
  changelog?: boolean;     // Generate changelog entry (default: true)
  'no-verify'?: boolean;  // Skip pre-commit hooks
  push?: boolean;          // Push after commit (default: false)
  release?: boolean;       // Prepare release (default: false)
  verbose?: boolean;
}

/**
 * Git-specific implementation of the Reflection Pattern
 * Orchestrates the commit→changelog→release workflow
 */
export class GitReflectionCommand extends ReflectionCommand {
  private contextGatherer: GitContextGatherer;

  constructor() {
    super('git');
    this.contextGatherer = new GitContextGatherer();
  }

  /**
   * Execute git reflection with optional changelog chaining
   */
  async execute(intent: string, options: GitOptions = {}): Promise<void> {
    console.log(chalk.blue('🔍 Analyzing git changes...\n'));

    // Gather git context
    const context = await this.contextGatherer.gather();

    if (options.verbose) {
      console.log(chalk.dim('   Git status analyzed'));
      console.log(chalk.dim(`   ${context.status.staged.length} staged, ${context.status.unstaged.length} unstaged`));
    }

    // Check if there are changes
    if (!context.status.hasChanges) {
      console.log(chalk.yellow('⚠️  No changes detected'));
      console.log(chalk.dim('   Run `git status` to verify'));
      return;
    }

    // Display analysis
    console.log(chalk.green('   ✓ Change type: ' + context.changeAnalysis.type));
    console.log(chalk.green('   ✓ Scope: ' + context.changeAnalysis.scope));
    console.log(chalk.green('   ✓ Files affected: ' + context.changeAnalysis.affectedFiles.length));
    if (context.changeAnalysis.isBreaking) {
      console.log(chalk.yellow('   ⚠️  Breaking changes detected'));
    }
    console.log();

    // Generate or use provided commit message
    const commitMessage = options.message ||
      intent ||
      await this.contextGatherer.suggestCommitMessage(context);

    console.log(chalk.blue('💬 Commit message:'));
    console.log(chalk.dim('   ' + commitMessage));
    console.log();

    // Stage changes if needed
    if (context.status.unstaged.length > 0 && options.commit !== false) {
      console.log(chalk.blue('📦 Staging changes...'));
      try {
        execSync('git add .', { stdio: 'inherit' });
        console.log(chalk.green('   ✓ Changes staged'));
        console.log();
      } catch (error) {
        console.log(chalk.red('   ✗ Failed to stage changes'));
        return;
      }
    }

    // Create commit
    let commitHash: string | undefined;
    if (options.commit !== false && context.status.staged.length > 0) {
      commitHash = await this.createCommit(commitMessage, options);

      if (!commitHash) {
        console.log(chalk.red('✗ Commit failed'));
        return;
      }
    }

    // Chain to changelog reflector
    if (options.changelog !== false && commitHash) {
      console.log(chalk.blue('📝 Generating changelog entry...\n'));

      const changelogCmd = new ChangelogReflectionCommand();
      await changelogCmd.execute(
        intent || commitMessage,
        {
          type: context.changeAnalysis.type,
          scope: context.changeAnalysis.scope,
          breaking: context.changeAnalysis.isBreaking,
          save: true,
          verbose: options.verbose
        }
      );
    }

    // Push if requested
    if (options.push) {
      await this.pushChanges(context);
    }

    // Prepare release if requested
    if (options.release) {
      await this.prepareRelease(context);
    }

    // Show next steps
    console.log(chalk.blue('\n🎯 Next steps:'));
    if (!options.push) {
      console.log(chalk.dim('   • Run `git push` to push changes'));
    }
    if (!options.release) {
      console.log(chalk.dim('   • Run `ginko ship` to create PR'));
    }
    console.log(chalk.dim('   • Run `ginko handoff` to save session'));
  }

  /**
   * Create git commit
   */
  private async createCommit(message: string, options: GitOptions): Promise<string | undefined> {
    try {
      const noVerify = options['no-verify'] ? ' --no-verify' : '';

      // Escape message for shell
      const escapedMessage = message.replace(/"/g, '\\"');

      const cmd = `git commit -m "${escapedMessage}"${noVerify}`;

      console.log(chalk.blue('💾 Creating commit...'));
      execSync(cmd, { stdio: options.verbose ? 'inherit' : 'pipe' });

      // Get commit hash
      const hash = execSync('git rev-parse --short HEAD', { encoding: 'utf-8' }).trim();

      console.log(chalk.green(`   ✓ Committed: ${hash}`));
      console.log();

      return hash;
    } catch (error) {
      console.log(chalk.red('   ✗ Commit failed'));
      if (options.verbose && error instanceof Error) {
        console.log(chalk.dim('   ' + error.message));
      }
      return undefined;
    }
  }

  /**
   * Push changes to remote
   */
  private async pushChanges(context: any): Promise<void> {
    try {
      console.log(chalk.blue('\n🚀 Pushing changes...'));

      const branch = context.branch.current;
      const upstream = context.branch.upstream;

      let cmd = 'git push';
      if (!upstream) {
        cmd = `git push -u origin ${branch}`;
        console.log(chalk.dim(`   Setting upstream to origin/${branch}`));
      }

      execSync(cmd, { stdio: 'inherit' });
      console.log(chalk.green('   ✓ Pushed successfully'));
    } catch (error) {
      console.log(chalk.red('   ✗ Push failed'));
      console.log(chalk.dim('   Run `git push` manually when ready'));
    }
  }

  /**
   * Prepare release (placeholder for future implementation)
   */
  private async prepareRelease(context: any): Promise<void> {
    console.log(chalk.blue('\n📦 Preparing release...'));
    console.log(chalk.dim('   Release preparation coming soon'));
    console.log(chalk.dim('   Use `ginko ship` for now'));
  }

  /**
   * Display detailed change analysis
   */
  private displayDetailedAnalysis(context: any): void {
    console.log(chalk.bold('\n📊 Detailed Analysis:\n'));

    console.log(chalk.cyan('Files Changed:'));
    context.changeAnalysis.affectedFiles.slice(0, 10).forEach((file: string) => {
      console.log(chalk.dim(`   • ${file}`));
    });
    if (context.changeAnalysis.affectedFiles.length > 10) {
      console.log(chalk.dim(`   ... and ${context.changeAnalysis.affectedFiles.length - 10} more`));
    }

    console.log(chalk.cyan('\nChange Statistics:'));
    console.log(chalk.dim(`   Files: ${context.diff.stats.files}`));
    console.log(chalk.green(`   +${context.diff.stats.insertions} insertions`));
    console.log(chalk.red(`   -${context.diff.stats.deletions} deletions`));

    if (context.recent.commits.length > 0) {
      console.log(chalk.cyan('\nRecent Commits:'));
      context.recent.commits.slice(0, 3).forEach((commit: any) => {
        console.log(chalk.dim(`   ${commit.hash} ${commit.message}`));
      });
    }

    console.log();
  }
}