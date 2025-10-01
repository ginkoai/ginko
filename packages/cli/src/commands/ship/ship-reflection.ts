/**
 * @fileType: command
 * @status: current
 * @updated: 2025-10-01
 * @tags: [ship, reflection, pipeline, builder, git, pr]
 * @related: [../../core/simple-pipeline-base.ts, ../ship.ts, ../ship-ai.ts]
 * @priority: high
 * @complexity: high
 * @dependencies: [simple-pipeline-base, simple-git, fs-extra, chalk, ora]
 */

import { SimplePipelineBase, PipelineContext } from '../../core/simple-pipeline-base.js';
import simpleGit from 'simple-git';
import fs from 'fs-extra';
import * as path from 'path';
import chalk from 'chalk';
import ora from 'ora';
import { execSync } from 'child_process';
import { getUserEmail, getGinkoDir } from '../../utils/helpers.js';

/**
 * Ship Quality Template
 * Defines what makes a high-quality ship (commit + PR)
 */
interface ShipQualityTemplate {
  commitMessage: {
    requiredElements: string[];
    conventionalFormat: boolean;
    includeBody: boolean;
    includeBreakingChanges: boolean;
  };
  prDescription: {
    requiredSections: string[];
    includeTestResults: boolean;
    includeScreenshots: boolean;
    includeDeploymentNotes: boolean;
  };
  validation: {
    runTests: boolean;
    checkUncommitted: boolean;
    verifyBranch: boolean;
  };
}

/**
 * Ship Context
 * All information needed to generate quality commit messages and PRs
 */
interface ShipContext {
  // Git state
  status: any;
  currentBranch: string;
  diff: string;
  diffStat: string;
  stagedDiff: string;
  recentCommits: any[];

  // Change analysis
  changeAnalysis: {
    additions: number;
    deletions: number;
    hasNewFiles: boolean;
    hasDeletedFiles: boolean;
    hasRenames: boolean;
    fileCount: number;
  };

  // Detected characteristics
  commitType: string;
  breakingChanges: boolean;

  // Test results
  testResults: {
    passed: boolean;
    output: string;
  } | null;

  // User input
  userMessage?: string;
  targetBranch?: string;
}

/**
 * Ship options from CLI
 */
interface ShipOptions {
  branch?: string;
  noPush?: boolean;
  noTests?: boolean;
  store?: boolean;
  id?: string;
  content?: string;
  noAi?: boolean;
  quick?: boolean;
  verbose?: boolean;
}

/**
 * Ship Pipeline using Simple Builder Pattern
 * Implements the Universal Reflection Pattern for ship command
 *
 * This replaces the standalone ship.ts and ship-ai.ts implementations
 * with a unified reflection-based approach.
 */
export class ShipReflectionPipeline extends SimplePipelineBase {
  private git: any;
  private ginkoDir: string = '';
  private options: ShipOptions;
  private spinner: any;

  constructor(message: string | undefined, options: ShipOptions = {}) {
    super(message || 'Ship changes with quality commit and PR');
    this.options = options;
    this.withDomain('ship');

    if (options.verbose) {
      this.spinner = ora();
    }
  }

  /**
   * Get domain identifier
   */
  getDomain(): string {
    return 'ship';
  }

  /**
   * Get quality template for ship
   */
  getQualityTemplate(): ShipQualityTemplate {
    return {
      commitMessage: {
        requiredElements: ['type', 'subject', 'body'],
        conventionalFormat: true,
        includeBody: true,
        includeBreakingChanges: true
      },
      prDescription: {
        requiredSections: ['Summary', 'What Changed', 'Why', 'How', 'Testing'],
        includeTestResults: !this.options.noTests,
        includeScreenshots: true,
        includeDeploymentNotes: true
      },
      validation: {
        runTests: !this.options.noTests,
        checkUncommitted: true,
        verifyBranch: true
      }
    };
  }

  /**
   * Initialize pipeline
   */
  async initialize(): Promise<this> {
    this.git = simpleGit();
    this.ginkoDir = await getGinkoDir();

    if (this.spinner) {
      this.spinner.start('Initializing ship pipeline...');
      this.spinner.succeed('Ship pipeline initialized');
    } else {
      console.log(chalk.cyan('🚢 Initializing ship pipeline...'));
    }

    return this;
  }

  /**
   * Load template
   */
  loadTemplate(): this {
    const template = this.getQualityTemplate();
    this.withTemplate(template);

    if (this.spinner) {
      this.spinner.succeed('Template loaded');
    } else {
      console.log(chalk.gray('  ✓ Template loaded'));
    }

    return this;
  }

  /**
   * Gather comprehensive context for ship
   */
  async gatherContext(): Promise<this> {
    if (this.spinner) {
      this.spinner.start('Gathering context...');
    } else {
      console.log(chalk.cyan('🔍 Gathering context...'));
    }

    // Get git status and diffs
    const status = await this.git.status();
    const currentBranch = status.current;
    const diff = await this.git.diff();
    const diffStat = await this.git.diff(['--stat']);
    const stagedDiff = await this.git.diff(['--staged']);
    const recentCommits = await this.git.log({ maxCount: 10 });

    // Analyze changes
    const changeAnalysis = this.analyzeChanges(diff, diffStat);
    const commitType = this.detectCommitType(changeAnalysis, this.ctx.intent);
    const breakingChanges = this.detectBreakingChanges(diff);

    // Run tests if required
    let testResults = null;
    if (this.ctx.template.validation.runTests) {
      if (this.spinner) {
        this.spinner.text = 'Running tests...';
      }
      testResults = await this.runTests();
    }

    const context: ShipContext = {
      status,
      currentBranch,
      diff,
      diffStat,
      stagedDiff,
      recentCommits: recentCommits.all,
      changeAnalysis,
      commitType,
      breakingChanges,
      testResults,
      userMessage: this.ctx.intent,
      targetBranch: this.options.branch
    };

    this.withContext(context);

    if (this.spinner) {
      this.spinner.succeed('Context gathered');
    } else {
      console.log(chalk.gray('  ✓ Context gathered'));
    }

    return this;
  }

  /**
   * Generate prompt for AI enhancement (if needed)
   */
  generatePrompt(): string {
    const context = this.ctx.context as ShipContext;

    return `# Ship Content Generation

## Context
- **Files Changed**: ${context.changeAnalysis.fileCount}
- **Lines Added**: ${context.changeAnalysis.additions}
- **Lines Removed**: ${context.changeAnalysis.deletions}
- **Commit Type**: ${context.commitType}
- **Breaking Changes**: ${context.breakingChanges ? 'Yes' : 'No'}
- **Tests**: ${context.testResults ? (context.testResults.passed ? 'Passed ✅' : 'Failed ❌') : 'Not run'}

## User Intent
${context.userMessage || '[No message provided - analyze diffs]'}

## Recent Commits
${context.recentCommits.slice(0, 5).map(c => `- ${c.message.split('\n')[0]}`).join('\n')}

## Changes
\`\`\`diff
${context.diff.slice(0, 2000)}${context.diff.length > 2000 ? '\n... (truncated)' : ''}
\`\`\`

## Instructions
Generate a high-quality ship package with:

1. **Commit Message** (Conventional Commits format):
   - Type: ${context.commitType}
   - Subject: Clear, imperative mood (50 chars)
   - Body: What and why (wrap at 72 chars)
   - Footer: BREAKING CHANGE if applicable

2. **Pull Request Description**:
   - Summary: High-level overview
   - What Changed: Bullet points of changes
   - Why: Motivation and context
   - How: Technical approach
   - Testing: Test coverage and results
   - Screenshots: Note if applicable
   - Deploy Notes: Any migration steps

3. **Branch Name** (if needed):
   - Format: ${context.commitType}/brief-description

Format your response as:

## Commit Message
\`\`\`
<type>(<scope>): <subject>

<body>

<footer>
\`\`\`

## Pull Request Description
<markdown content>

## Branch Name
\`<branch-name>\`
`;
  }

  /**
   * Generate content (without AI, based on templates)
   */
  generateContent(): this {
    if (this.spinner) {
      this.spinner.start('Generating ship content...');
    } else {
      console.log(chalk.cyan('📝 Generating ship content...'));
    }

    const context = this.ctx.context as ShipContext;

    // Build commit message
    const commitMessage = this.buildCommitMessage(context);

    // Build PR description
    const prDescription = this.buildPRDescription(context);

    // Build branch name if needed
    const branchName = this.buildBranchName(context);

    const content = {
      commitMessage,
      prDescription,
      branchName
    };

    this.ctx.content = JSON.stringify(content, null, 2);
    this.adjustConfidence(0.85); // Good confidence for generated content

    if (this.spinner) {
      this.spinner.succeed('Content generated');
    } else {
      console.log(chalk.gray('  ✓ Content generated'));
    }

    return this;
  }

  /**
   * Validate generated output
   */
  validateOutput(): this {
    if (!this.ctx.content) {
      this.addError('No content generated');
      this.adjustConfidence(0.5);
      return this;
    }

    try {
      const content = JSON.parse(this.ctx.content);

      // Validate commit message
      if (!content.commitMessage || content.commitMessage.length < 10) {
        this.addError('Commit message too short');
        this.adjustConfidence(0.7);
      }

      // Validate conventional format
      const conventionalPattern = /^(feat|fix|docs|style|refactor|perf|test|build|ci|chore|revert)(\(.+\))?: .+/;
      if (!conventionalPattern.test(content.commitMessage.split('\n')[0])) {
        this.addError('Commit message does not follow conventional format');
        this.adjustConfidence(0.8);
      }

      // Validate PR description
      if (!content.prDescription || content.prDescription.length < 50) {
        this.addError('PR description too short');
        this.adjustConfidence(0.7);
      }

      // Validate branch name
      if (content.branchName && !/^[a-z-]+\/[a-z0-9-]+$/.test(content.branchName)) {
        this.addError('Branch name format invalid');
        this.adjustConfidence(0.9); // Minor issue
      }

    } catch (error) {
      this.addError('Failed to parse generated content');
      this.adjustConfidence(0.3);
    }

    return this;
  }

  /**
   * Execute ship operations
   */
  async executeShip(): Promise<this> {
    const context = this.ctx.context as ShipContext;
    const content = JSON.parse(this.ctx.content || '{}');

    if (this.spinner) {
      this.spinner.start('Shipping changes...');
    } else {
      console.log(chalk.bold('\n🚢 Shipping Changes\n'));
    }

    try {
      // 1. Check for uncommitted changes
      if (context.status.files.length > 0) {
        if (this.spinner) {
          this.spinner.text = 'Staging changes...';
        }
        await this.git.add('.');

        // 2. Create commit
        if (this.spinner) {
          this.spinner.text = 'Creating commit...';
        }
        const commitMsg = content.commitMessage + '\n\n🚢 Shipped with Ginko CLI\n\nCo-authored-by: Ginko <ship@ginko.ai>';
        await this.git.commit(commitMsg);

        if (this.spinner) {
          this.spinner.succeed('Changes committed');
        } else {
          console.log(chalk.green('  ✅ Changes committed'));
        }
      } else {
        if (this.spinner) {
          this.spinner.info('No uncommitted changes');
        } else {
          console.log(chalk.gray('  ℹ No uncommitted changes'));
        }
      }

      // 3. Handle branching
      const currentBranch = context.currentBranch;
      let targetBranch = currentBranch;

      if (currentBranch === 'main' || currentBranch === 'master') {
        // Create new branch
        const newBranch = this.options.branch || content.branchName || this.generateBranchName(this.ctx.intent);

        if (this.spinner) {
          this.spinner.start(`Creating branch: ${newBranch}`);
        }

        await this.git.checkoutLocalBranch(newBranch);
        targetBranch = newBranch;

        if (this.spinner) {
          this.spinner.succeed(`Created branch: ${newBranch}`);
        } else {
          console.log(chalk.green(`  ✅ Created branch: ${newBranch}`));
        }
      }

      // 4. Push to remote (unless disabled)
      if (!this.options.noPush) {
        if (this.spinner) {
          this.spinner.start('Pushing to remote...');
        }

        try {
          await this.git.push('origin', targetBranch, ['--set-upstream']);

          if (this.spinner) {
            this.spinner.succeed('Pushed to remote');
          } else {
            console.log(chalk.green('  ✅ Pushed to remote'));
          }
        } catch (error) {
          // Try without --set-upstream
          try {
            await this.git.push('origin', targetBranch);

            if (this.spinner) {
              this.spinner.succeed('Pushed to remote');
            } else {
              console.log(chalk.green('  ✅ Pushed to remote'));
            }
          } catch (pushError) {
            if (this.spinner) {
              this.spinner.fail('Push failed');
            }
            console.log(chalk.yellow(`\n  Try manually: git push -u origin ${targetBranch}`));
          }
        }
      }

      // 5. Create PR (if gh CLI available)
      if (this.checkCommand('gh --version')) {
        if (this.spinner) {
          this.spinner.start('Creating pull request...');
        }

        try {
          const prTitle = content.commitMessage.split('\n')[0];
          const prBody = content.prDescription;

          // Escape quotes in PR body
          const escapedBody = prBody.replace(/"/g, '\\"').replace(/\n/g, '\\n');

          const prCmd = `gh pr create --title "${prTitle}" --body "${escapedBody}"`;
          const prOutput = execSync(prCmd, { encoding: 'utf8' });

          if (this.spinner) {
            this.spinner.succeed('Pull request created');
          } else {
            console.log(chalk.green('  ✅ Pull request created'));
          }

          // Extract PR URL
          const urlMatch = prOutput.match(/https:\/\/github\.com\/[^\s]+/);
          if (urlMatch) {
            console.log(chalk.green('\n✅ PR URL: ') + chalk.cyan(urlMatch[0]));
          }

        } catch (error) {
          if (this.spinner) {
            this.spinner.info('Could not create PR automatically');
          }
          console.log(chalk.dim('  Create manually at GitHub or install gh CLI'));

          // Save PR description for manual use
          const prDescPath = path.join(this.ginkoDir, '.temp', 'pr-description.md');
          await fs.ensureDir(path.dirname(prDescPath));
          await fs.writeFile(prDescPath, content.prDescription);
          console.log(chalk.dim(`  PR description saved: ${prDescPath}`));
        }
      } else {
        if (this.spinner) {
          this.spinner.info('GitHub CLI not found');
        }
        console.log(chalk.dim('  Install gh CLI for automatic PR creation'));
      }

      // Success summary
      console.log(chalk.green('\n✅ Ship complete!'));
      console.log(chalk.dim('\nNext steps:'));
      console.log(chalk.dim('  • Review PR on GitHub'));
      console.log(chalk.dim('  • Request reviews if needed'));
      console.log(chalk.dim('  • Monitor CI/CD pipeline'));

    } catch (error) {
      if (this.spinner) {
        this.spinner.fail('Ship failed');
      }
      this.addError(`Ship execution failed: ${error}`);
      this.adjustConfidence(0.2);
      throw error;
    }

    return this;
  }

  /**
   * Custom validation
   */
  protected customValidate(): void {
    const context = this.ctx.context as ShipContext;

    if (!context) {
      this.addError('Context not gathered');
      this.adjustConfidence(0.5);
      return;
    }

    // Check test results if tests were run
    if (context.testResults && !context.testResults.passed) {
      this.addError('Tests failed');
      this.adjustConfidence(0.6);
      console.log(chalk.red('\n❌ Tests failed - fix before shipping'));
      console.log(chalk.dim('Skip tests with: ginko ship --no-tests'));
    }

    // Warn if breaking changes detected
    if (context.breakingChanges) {
      console.log(chalk.yellow('\n⚠️ Breaking changes detected - ensure they are documented'));
      this.adjustConfidence(0.9); // Minor reduction
    }
  }

  /**
   * Custom recovery
   */
  protected customRecover(): void {
    // If tests failed but user wants to continue, allow it
    if (this.ctx.errors.includes('Tests failed') && this.options.noTests) {
      this.removeError('Tests failed');
      this.adjustConfidence(1.1);
    }
  }

  /**
   * Custom execution
   */
  protected async customExecute(): Promise<void> {
    // Ensure we have content
    if (!this.ctx.content) {
      this.generateContent();
    }

    // Validate output
    if (!this.getErrors().includes('No content generated')) {
      this.validateOutput();
    }
  }

  /**
   * Main build method
   */
  async build(): Promise<string> {
    try {
      console.log(chalk.bold.cyan('\n🚀 Ship Pipeline Starting\n'));

      await this
        .initialize()
        .then(p => p.loadTemplate())
        .then(p => p.gatherContext())
        .then(p => {
          p.generateContent();
          p.validateOutput();
          return p;
        })
        .then(p => p.validate())
        .then(p => {
          p.recover();
          return p;
        })
        .then(p => p.executeShip())
        .then(p => p.execute());

      console.log(chalk.bold.green('\n✨ Ship pipeline completed successfully!\n'));
      return this.ctx.content || '';

    } catch (error) {
      console.error(chalk.red(`\n❌ Ship failed: ${error}`));
      throw error;
    }
  }

  // ======================
  // Helper Methods
  // ======================

  /**
   * Analyze changes from git diff
   */
  private analyzeChanges(diff: string, diffStat: string): any {
    const lines = diffStat.split('\n');
    const lastLine = lines[lines.length - 2] || '';

    const additions = parseInt(lastLine.match(/(\d+) insertion/)?.[1] || '0');
    const deletions = parseInt(lastLine.match(/(\d+) deletion/)?.[1] || '0');

    const hasNewFiles = diff.includes('new file mode');
    const hasDeletedFiles = diff.includes('deleted file mode');
    const hasRenames = diff.includes('rename from');

    return {
      additions,
      deletions,
      hasNewFiles,
      hasDeletedFiles,
      hasRenames,
      fileCount: lines.length - 2
    };
  }

  /**
   * Detect commit type from changes and message
   */
  private detectCommitType(analysis: any, message?: string): string {
    const msgLower = message?.toLowerCase() || '';

    if (msgLower.includes('fix') || msgLower.includes('bug')) return 'fix';
    if (msgLower.includes('feat') || msgLower.includes('add')) return 'feat';
    if (msgLower.includes('refactor')) return 'refactor';
    if (msgLower.includes('doc')) return 'docs';
    if (msgLower.includes('test')) return 'test';
    if (msgLower.includes('style') || msgLower.includes('format')) return 'style';
    if (msgLower.includes('perf')) return 'perf';
    if (msgLower.includes('build')) return 'build';
    if (msgLower.includes('ci')) return 'ci';

    // Infer from changes
    if (analysis.hasNewFiles) return 'feat';
    if (analysis.deletions > analysis.additions) return 'refactor';

    return 'chore';
  }

  /**
   * Detect breaking changes in diff
   */
  private detectBreakingChanges(diff: string): boolean {
    const breakingPatterns = [
      /removed?\s+\w+\s*\(/i,
      /deleted?\s+\w+/i,
      /breaking/i,
      /incompatible/i,
      /migration/i,
      /deprecated/i
    ];

    return breakingPatterns.some(pattern => pattern.test(diff));
  }

  /**
   * Run tests
   */
  private async runTests(): Promise<any> {
    try {
      // Check if test script exists
      let hasTests = false;
      try {
        const packageJson = JSON.parse(await fs.readFile('package.json', 'utf-8'));
        hasTests = !!(packageJson.scripts?.test &&
                     packageJson.scripts.test !== 'echo "Error: no test specified" && exit 1');
      } catch {
        // No package.json
      }

      if (!hasTests) {
        return { passed: true, output: 'No tests configured' };
      }

      execSync('npm test', { stdio: 'pipe' });
      return { passed: true, output: 'All tests passed' };
    } catch (error) {
      return { passed: false, output: 'Tests failed' };
    }
  }

  /**
   * Build commit message
   */
  private buildCommitMessage(context: ShipContext): string {
    const type = context.commitType;
    const subject = context.userMessage || 'Update changes';

    // Extract subject (first line, imperative mood)
    const firstLine = subject.split('\n')[0].slice(0, 50);

    // Build body
    const body = [
      `Files changed: ${context.changeAnalysis.fileCount}`,
      `Lines: +${context.changeAnalysis.additions} -${context.changeAnalysis.deletions}`,
    ];

    if (context.changeAnalysis.hasNewFiles) {
      body.push('New files added');
    }
    if (context.changeAnalysis.hasDeletedFiles) {
      body.push('Files removed');
    }

    let message = `${type}: ${firstLine}\n\n${body.join('\n')}`;

    // Add breaking change footer if detected
    if (context.breakingChanges) {
      message += '\n\nBREAKING CHANGE: This update includes breaking changes';
    }

    return message;
  }

  /**
   * Build PR description
   */
  private buildPRDescription(context: ShipContext): string {
    const sections = [];

    sections.push('## Summary');
    sections.push(context.userMessage || 'Changes from development session\n');

    sections.push('## What Changed');
    sections.push(`- ${context.changeAnalysis.fileCount} files modified`);
    sections.push(`- ${context.changeAnalysis.additions} lines added`);
    sections.push(`- ${context.changeAnalysis.deletions} lines removed`);
    if (context.changeAnalysis.hasNewFiles) sections.push('- New files created');
    if (context.changeAnalysis.hasDeletedFiles) sections.push('- Files deleted');
    sections.push('');

    sections.push('## Why');
    sections.push('See commit messages for detailed rationale\n');

    sections.push('## How');
    sections.push('Implementation follows established patterns\n');

    sections.push('## Testing');
    if (context.testResults) {
      sections.push(context.testResults.passed ? '✅ All tests passing' : '❌ Tests need attention');
    } else {
      sections.push('Tests not run');
    }
    sections.push('');

    if (context.breakingChanges) {
      sections.push('## ⚠️ Breaking Changes');
      sections.push('This PR includes breaking changes. Review carefully.\n');
    }

    sections.push('---');
    sections.push('🚢 Shipped with Ginko CLI');

    return sections.join('\n');
  }

  /**
   * Build branch name
   */
  private buildBranchName(context: ShipContext): string {
    const type = context.commitType;
    const message = context.userMessage || 'update';

    const slug = message
      .toLowerCase()
      .replace(/[^a-z0-9\s]/g, '')
      .split(' ')
      .slice(0, 3)
      .join('-');

    return `${type}/${slug}-${Date.now().toString(36)}`;
  }

  /**
   * Generate branch name from message
   */
  private generateBranchName(message?: string): string {
    if (message) {
      const slug = message
        .toLowerCase()
        .replace(/[^a-z0-9\s]/g, '')
        .split(' ')
        .slice(0, 3)
        .join('-');

      return `ship/${slug}-${Date.now().toString(36)}`;
    }

    return `ship/update-${Date.now().toString(36)}`;
  }

  /**
   * Check if command exists
   */
  private checkCommand(cmd: string): boolean {
    try {
      execSync(cmd, { stdio: 'pipe' });
      return true;
    } catch {
      return false;
    }
  }
}

/**
 * Adapter for CLI command usage
 * Maintains backward compatibility with existing command structure
 */
export class ShipReflectionCommand {
  private pipeline: ShipReflectionPipeline;

  constructor(message?: string, options: ShipOptions = {}) {
    this.pipeline = new ShipReflectionPipeline(message, options);
  }

  /**
   * Execute the ship command
   */
  async execute(): Promise<void> {
    try {
      await this.pipeline.build();
    } catch (error) {
      console.error(chalk.red(`Ship failed: ${error}`));
      throw error;
    }
  }
}

// Export for CLI use
export default ShipReflectionCommand;
