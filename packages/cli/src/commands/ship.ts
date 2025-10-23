/**
 * @fileType: command
 * @status: current
 * @updated: 2025-10-23
 * @tags: [cli, ship, git, pr, deployment]
 * @priority: medium
 * @complexity: high
 */

import chalk from 'chalk';
import { execSync } from 'child_process';
import ora from 'ora';
import { cleanupTempFiles } from '../utils/cleanup.js';
import * as fs from 'fs/promises';
import * as path from 'path';
import * as readline from 'readline/promises';

interface ShipOptions {
  branch?: string;
  message?: string;
  noPush?: boolean;
  noTests?: boolean;
  noClean?: boolean;
  docs?: boolean;
}

export async function shipCommand(message?: string, options: ShipOptions = {}) {
  console.log(chalk.bold('\n🚢 Shipping Changes\n'));

  const spinner = ora('Preparing to ship...').start();

  try {
    // 1. Cleanup temp files (before tests)
    if (!options.noClean) {
      spinner.stop();
      await cleanupTempFiles();
      spinner.start('Preparing to ship...');
    } else {
      spinner.info('Skipping cleanup (--no-clean flag)');
    }

    // 2. Pre-flight checks
    if (!options.noTests) {
      spinner.text = 'Checking for tests...';
      
      // Check if package.json has test script
      let hasTests = false;
      try {
        const packageJson = JSON.parse(execSync('cat package.json', { encoding: 'utf8' }));
        hasTests = !!(packageJson.scripts && packageJson.scripts.test && packageJson.scripts.test !== 'echo \"Error: no test specified\" && exit 1');
      } catch {
        // No package.json or can't parse
      }
      
      if (hasTests) {
        spinner.text = 'Running tests...';
        try {
          execSync('npm test', { stdio: 'pipe' });
          spinner.succeed('Tests passed');
        } catch (error) {
          spinner.fail('Tests failed');
          console.log(chalk.red('\n❌ Fix failing tests before shipping'));
          console.log(chalk.dim('Skip tests with: ginko ship --no-tests'));
          process.exit(1);
        }
      } else {
        spinner.info('No test script found');
      }
    } else {
      spinner.info('Skipping tests (--no-tests flag)');
    }

    // 3. Update docs (if --docs flag)
    if (options.docs) {
      spinner.stop();
      await updateDocs();
      spinner.start('Preparing to ship...');
    }

    // 4. Check for uncommitted changes
    spinner.start('Checking git status...');
    const status = execSync('git status --porcelain', { encoding: 'utf8' });
    
    if (status) {
      spinner.info('Uncommitted changes detected');
      console.log(chalk.dim('\nFiles to commit:'));
      console.log(chalk.dim(status));
      
      // Stage and commit
      spinner.start('Creating commit...');
      execSync('git add -A');
      
      const commitMessage = message || 'Ship: Update changes';
      const commitCmd = `git commit -m "${commitMessage}\n\n🚢 Shipped with Ginko CLI\n\nCo-Authored-By: Chris Norton <chris@watchhill.ai>"`;

      try {
        execSync(commitCmd, { stdio: 'pipe' });
        spinner.succeed('Changes committed');
      } catch (error) {
        spinner.fail('Commit failed');
        console.log(chalk.red('Error:'), error);
        process.exit(1);
      }
    } else {
      spinner.info('No uncommitted changes');
    }

    // 5. Prepare branch
    spinner.start('Checking branch...');
    const currentBranch = execSync('git branch --show-current', { encoding: 'utf8' }).trim();
    
    if (currentBranch === 'main' || currentBranch === 'master') {
      spinner.warn('On main branch');
      
      // Create feature branch
      const branchName = options.branch || generateBranchName(message);
      spinner.start(`Creating branch: ${branchName}`);
      
      try {
        execSync(`git checkout -b ${branchName}`);
        spinner.succeed(`Created branch: ${branchName}`);
      } catch (error) {
        spinner.fail('Failed to create branch');
        process.exit(1);
      }
    } else {
      spinner.succeed(`On branch: ${currentBranch}`);
    }

    // 6. Push to remote
    if (!options.noPush) {
      spinner.start('Pushing to remote...');
      const pushBranch = execSync('git branch --show-current', { encoding: 'utf8' }).trim();
      
      try {
        execSync(`git push -u origin ${pushBranch}`, { stdio: 'pipe' });
        spinner.succeed('Pushed to remote');
      } catch (error) {
        // Try without -u if branch exists
        try {
          execSync(`git push origin ${pushBranch}`, { stdio: 'pipe' });
          spinner.succeed('Pushed to remote');
        } catch (pushError) {
          spinner.fail('Push failed');
          console.log(chalk.yellow('\nTry manually: git push -u origin ' + pushBranch));
        }
      }
    }

    // 7. Create PR (if gh CLI available)
    if (checkCommand('gh --version')) {
      spinner.start('Creating pull request...');
      
      try {
        const prTitle = message || 'Ship: Update from Ginko session';
        const prBody = `## Summary\n${message || 'Changes from development session'}\n\n## Changes\n- See commits for details\n\n🚢 Shipped with Ginko CLI`;
        
        const prCmd = `gh pr create --title "${prTitle}" --body "${prBody}" 2>&1`;
        const prOutput = execSync(prCmd, { encoding: 'utf8' });
        
        spinner.succeed('Pull request created');
        
        // Extract and show PR URL
        const urlMatch = prOutput.match(/https:\/\/github\.com\/[^\s]+/);
        if (urlMatch) {
          console.log(chalk.green('\n✅ PR URL: ') + chalk.cyan(urlMatch[0]));
        }
      } catch (error) {
        spinner.info('Could not create PR automatically');
        console.log(chalk.dim('Create manually at GitHub or install gh CLI'));
      }
    } else {
      spinner.info('GitHub CLI not found');
      console.log(chalk.dim('Install gh CLI for automatic PR creation'));
    }

    // 8. Success summary
    console.log(chalk.green('\n✅ Ship complete!'));
    console.log(chalk.dim('\nNext steps:'));
    console.log(chalk.dim('  • Review PR on GitHub'));
    console.log(chalk.dim('  • Request reviews if needed'));
    console.log(chalk.dim('  • Monitor CI/CD pipeline'));

  } catch (error) {
    spinner.fail('Ship failed');
    console.error(chalk.red('Error:'), error instanceof Error ? error.message : String(error));
    process.exit(1);
  }
}

// Helper functions
function checkCommand(cmd: string): boolean {
  try {
    // Check if command exists by trying to run it with --help
    execSync(`${cmd} --help`, { stdio: 'pipe' });
    return true;
  } catch {
    // Command doesn't exist or failed
    return false;
  }
}

function generateBranchName(message?: string): string {
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
 * Update documentation (CHANGELOG.md and sprint tasks)
 */
async function updateDocs(): Promise<void> {
  console.log(chalk.bold('\n📝 Updating Documentation\n'));

  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
  });

  try {
    // 1. Update CHANGELOG.md
    const changelogPath = path.join(process.cwd(), 'packages', 'cli', 'CHANGELOG.md');

    try {
      let changelog = await fs.readFile(changelogPath, 'utf-8');

      // Check if there's an Unreleased section
      if (!changelog.includes('## [Unreleased]')) {
        console.log(chalk.yellow('⚠️  No [Unreleased] section in CHANGELOG.md'));

        // Prompt for version and changes
        const version = await rl.question(chalk.cyan('Enter version (e.g., 1.2.0): '));
        const changes = await rl.question(chalk.cyan('Enter changes (comma-separated): '));

        if (version && changes) {
          const date = new Date().toISOString().split('T')[0];
          const changesList = changes.split(',').map(c => `- ${c.trim()}`).join('\n');

          const newSection = `\n## [Unreleased]\n\n## [${version}] - ${date}\n${changesList}\n`;

          // Insert after first heading
          const firstHeadingIndex = changelog.indexOf('\n## ');
          if (firstHeadingIndex !== -1) {
            changelog = changelog.slice(0, firstHeadingIndex) + newSection + changelog.slice(firstHeadingIndex);
            await fs.writeFile(changelogPath, changelog, 'utf-8');
            console.log(chalk.green('✅ Updated CHANGELOG.md'));
          }
        }
      } else {
        console.log(chalk.green('✅ CHANGELOG.md has [Unreleased] section'));
      }
    } catch (error) {
      console.log(chalk.yellow(`⚠️  Could not update CHANGELOG.md: ${error}`));
    }

    // 2. Check sprint tasks
    const sprintPath = path.join(process.cwd(), 'docs', 'sprints', 'CURRENT-SPRINT.md');

    try {
      const sprintContent = await fs.readFile(sprintPath, 'utf-8');

      // Find incomplete tasks [ ]
      const incompleteTasks = sprintContent.match(/- \[ \] .+/g) || [];

      if (incompleteTasks.length > 0) {
        console.log(chalk.yellow(`\n⚠️  Found ${incompleteTasks.length} incomplete tasks in CURRENT-SPRINT.md:`));
        incompleteTasks.slice(0, 5).forEach(task => {
          console.log(chalk.dim(`     ${task}`));
        });

        if (incompleteTasks.length > 5) {
          console.log(chalk.dim(`     ... and ${incompleteTasks.length - 5} more`));
        }

        const confirm = await rl.question(chalk.cyan('\nAre these tasks addressed or can be deferred? (y/N): '));

        if (confirm.toLowerCase() !== 'y') {
          console.log(chalk.red('❌ Please complete or defer sprint tasks before shipping'));
          process.exit(1);
        }
      } else {
        console.log(chalk.green('✅ All sprint tasks completed'));
      }
    } catch (error) {
      console.log(chalk.dim(`⚠️  Could not read CURRENT-SPRINT.md: ${error}`));
    }

  } finally {
    rl.close();
  }

  console.log();
}