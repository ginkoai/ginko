/**
 * @fileType: command
 * @status: current
 * @updated: 2025-08-28
 * @tags: [cli, ship, ai-enhanced, git, pr]
 * @related: [ship.ts, ../utils/ai-templates.ts]
 * @priority: high
 * @complexity: high
 * @dependencies: [chalk, ora, simple-git]
 */

import chalk from 'chalk';
import ora from 'ora';
import simpleGit from 'simple-git';
import { execSync } from 'child_process';
import fs from 'fs-extra';
import path from 'path';
import { getGinkoDir } from '../utils/helpers.js';
import { 
  AI_PROCESSING_EXIT_CODE,
  generateCompletionPrompt,
  TEMPLATES
} from '../utils/ai-templates.js';

interface ShipOptions {
  branch?: string;
  message?: string;
  noPush?: boolean;
  noTests?: boolean;
  store?: boolean;
  id?: string;
  content?: string;
  ai?: boolean;
  quick?: boolean;
  verbose?: boolean;
}

/**
 * AI-enhanced ship command for intelligent commit messages and PR descriptions
 */
export async function shipAiCommand(message: string | undefined, options: ShipOptions) {
  // Phase 2: Execute ship with AI-generated content
  if (options.store && options.id && options.content) {
    return executeShip(options.id, options.content, options);
  }

  // Phase 1: Generate ship template for AI enhancement
  const spinner = options.verbose ? ora('Analyzing changes...').start() : null;
  
  try {
    const git = simpleGit();
    const ginkoDir = await getGinkoDir();
    const shipId = `ship-${Date.now()}`;
    
    // Quick mode: use basic ship without AI
    if (options.quick || options.ai === false) {
      const { shipCommand } = await import('./ship.js');
      return shipCommand(message, options);
    }
    
    // Gather comprehensive context
    const status = await git.status();
    const diff = await git.diff();
    const diffStat = await git.diff(['--stat']);
    const stagedDiff = await git.diff(['--staged']);
    const log = await git.log({ maxCount: 10 });
    
    // Analyze changes
    const changeAnalysis = analyzeChanges(diff, diffStat);
    const commitType = detectCommitType(changeAnalysis, message);
    const breakingChanges = detectBreakingChanges(diff);
    
    // Run tests if not skipped
    let testResults = null;
    if (!options.noTests) {
      if (spinner) spinner.text = 'Running tests...';
      testResults = await runTests();
    }
    
    // Generate AI template for commit and PR
    const template = generateShipTemplate({
      shipId,
      message,
      status,
      changeAnalysis,
      commitType,
      breakingChanges,
      testResults,
      log,
      branch: options.branch,
      currentBranch: status.current
    });
    
    if (spinner) spinner.stop();
    
    // Output template and prompt for AI (to stdout to avoid stderr)
    process.stdout.write(chalk.cyan('\n🚢 AI-Enhanced Ship\n\n'));
    process.stdout.write(template.content + '\n');
    process.stdout.write(chalk.dim('---\n'));
    process.stdout.write(template.prompt + '\n');
    process.stdout.write(chalk.dim(`\nWhen complete, call:\nginko ship --store --id=${shipId} --content="[enriched content]"\n\n`));
    
    // Store template and options
    const tempDir = path.join(ginkoDir, '.temp');
    await fs.ensureDir(tempDir);
    const tempFile = path.join(tempDir, `${shipId}.json`);
    await fs.writeJSON(tempFile, {
      template: template.content,
      options,
      analysis: changeAnalysis
    });
    
    // Ensure stdout is flushed before exit
    await new Promise(resolve => process.stdout.write('', resolve));
    
    // Exit with special code 47 for ship
    process.exit(47);
    
  } catch (error) {
    if (spinner) spinner.fail('Failed to prepare ship');
    console.error(chalk.red('Error:'), error instanceof Error ? error.message : String(error));
    process.exit(1);
  }
}

/**
 * Phase 2: Execute ship with AI-generated content
 */
async function executeShip(id: string, content: string, options: ShipOptions): Promise<void> {
  const spinner = ora('Shipping with AI-enhanced content...').start();
  
  try {
    const git = simpleGit();
    const ginkoDir = await getGinkoDir();
    
    // Parse AI-generated content
    const commitMsgMatch = content.match(/## Commit Message\n```\n([\s\S]*?)\n```/);
    const prDescMatch = content.match(/## Pull Request Description\n([\s\S]*?)(?=##|$)/);
    const branchNameMatch = content.match(/## Branch Name\n`([^`]+)`/);
    
    if (!commitMsgMatch) {
      throw new Error('AI did not generate a proper commit message');
    }
    
    const commitMessage = commitMsgMatch[1];
    const prDescription = prDescMatch ? prDescMatch[1].trim() : '';
    const branchName = options.branch || (branchNameMatch ? branchNameMatch[1] : null);
    
    // Stage all changes
    spinner.text = 'Staging changes...';
    await git.add('.');
    
    // Create commit with AI-generated message
    spinner.text = 'Creating commit...';
    await git.commit(commitMessage);
    spinner.succeed('Commit created with AI-generated message');
    
    // Create and switch to new branch if specified
    if (branchName && branchName !== (await git.branchLocal()).current) {
      spinner.start(`Creating branch: ${branchName}`);
      await git.checkoutLocalBranch(branchName);
      spinner.succeed(`Switched to branch: ${branchName}`);
    }
    
    // Push to remote unless disabled
    if (!options.noPush) {
      spinner.start('Pushing to remote...');
      const currentBranch = (await git.branchLocal()).current;
      await git.push('origin', currentBranch, ['--set-upstream']);
      spinner.succeed('Pushed to remote');
      
      // Create PR if description was generated
      if (prDescription && branchName) {
        spinner.start('Creating pull request...');
        try {
          // Try using gh CLI if available
          const prCmd = `gh pr create --title "${commitMessage.split('\n')[0]}" --body "${prDescription.replace(/"/g, '\\"')}"`;
          execSync(prCmd, { stdio: 'pipe' });
          spinner.succeed('Pull request created');
        } catch {
          spinner.info('Install GitHub CLI (gh) to auto-create PRs');
          console.log(chalk.dim('\nPR Description saved to .ginko/.temp/pr-description.md'));
          await fs.writeFile(path.join(ginkoDir, '.temp', 'pr-description.md'), prDescription);
        }
      }
    }
    
    // Clean up temp files
    const tempFile = path.join(ginkoDir, '.temp', `${id}.json`);
    await fs.remove(tempFile).catch(() => {});
    
    console.log(chalk.green('\n✅ Successfully shipped!'));
    
    if (options.noPush) {
      console.log(chalk.yellow('\n📝 Changes committed but not pushed (--no-push flag)'));
      console.log(chalk.dim('Push when ready: git push'));
    }
    
  } catch (error) {
    spinner.fail('Ship failed');
    console.error(chalk.red('Error:'), error instanceof Error ? error.message : String(error));
    process.exit(1);
  }
}

/**
 * Generate ship template for AI enhancement
 */
function generateShipTemplate(context: any) {
  const content = `---
type: ship
id: ${context.shipId}
branch: ${context.branch || context.currentBranch}
---

# 🚢 Ship Preparation

## Changes Summary
${context.message || '[AI: Analyze the diffs and provide a concise summary of what changed]'}

## Change Analysis
- **Files Changed**: ${context.status.modified.length + context.status.created.length}
- **Lines Added**: ${context.changeAnalysis.additions}
- **Lines Removed**: ${context.changeAnalysis.deletions}
- **Commit Type**: ${context.commitType}
- **Breaking Changes**: ${context.breakingChanges ? 'Yes' : 'No'}

## Commit Message
\`\`\`
[AI: Generate a conventional commit message following the pattern:
<type>(<scope>): <subject>

<body>

<footer>

Types: feat, fix, docs, style, refactor, perf, test, build, ci, chore, revert
Include BREAKING CHANGE in footer if applicable]
\`\`\`

## Pull Request Description
[AI: Generate a comprehensive PR description including:
- What changed and why
- How it was implemented
- Testing performed
- Screenshots/examples if UI changes
- Breaking changes if any
- Related issues/tickets]

### What Changed
[AI: Describe what functionality changed]

### Why
[AI: Explain the motivation and context]

### How
[AI: Brief technical approach]

### Testing
${context.testResults ? `Tests: ${context.testResults.passed ? 'Passed ✅' : 'Failed ❌'}` : 'Tests not run'}
[AI: Describe testing approach and coverage]

### Screenshots
[AI: Note if screenshots would be helpful for UI changes]

## Branch Name
\`${context.branch || '[AI: Suggest branch name like feature/description or fix/issue]'}\`

## Deploy Notes
[AI: Any special deployment considerations or migration steps]`;

  const enhancementContext = {
    command: 'ship',
    id: context.shipId,
    data: {
      status: context.status,
      commits: context.log.all,
      branch: context.currentBranch,
      files: [...context.status.modified, ...context.status.created],
      analysis: context.changeAnalysis
    }
  };

  const prompt = generateCompletionPrompt(enhancementContext, content);

  return { content, prompt };
}

/**
 * Analyze changes from diffs
 */
function analyzeChanges(diff: string, diffStat: string): any {
  const lines = diffStat.split('\n');
  const lastLine = lines[lines.length - 2] || '';
  
  const additions = parseInt(lastLine.match(/(\d+) insertion/)?.[1] || '0');
  const deletions = parseInt(lastLine.match(/(\d+) deletion/)?.[1] || '0');
  
  // Detect types of changes
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
function detectCommitType(analysis: any, message?: string): string {
  const msgLower = message?.toLowerCase() || '';
  
  if (msgLower.includes('fix') || msgLower.includes('bug')) return 'fix';
  if (msgLower.includes('feat') || msgLower.includes('add')) return 'feat';
  if (msgLower.includes('refactor')) return 'refactor';
  if (msgLower.includes('doc')) return 'docs';
  if (msgLower.includes('test')) return 'test';
  if (msgLower.includes('style') || msgLower.includes('format')) return 'style';
  if (msgLower.includes('perf')) return 'perf';
  
  // Infer from changes
  if (analysis.hasNewFiles) return 'feat';
  if (analysis.deletions > analysis.additions) return 'refactor';
  
  return 'chore';
}

/**
 * Detect potential breaking changes
 */
function detectBreakingChanges(diff: string): boolean {
  const breakingPatterns = [
    /removed?\s+\w+\s*\(/i,  // Removed function
    /deleted?\s+\w+/i,       // Deleted something
    /breaking/i,             // Explicit breaking mention
    /incompatible/i,         // Incompatible change
    /migration/i,            // Migration needed
    /deprecated/i            // Deprecation
  ];
  
  return breakingPatterns.some(pattern => pattern.test(diff));
}

/**
 * Run tests and capture results
 */
async function runTests(): Promise<any> {
  try {
    execSync('npm test', { stdio: 'pipe' });
    return { passed: true, output: 'All tests passed' };
  } catch (error) {
    return { passed: false, output: 'Tests failed' };
  }
}