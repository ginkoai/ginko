/**
 * @fileType: command
 * @status: current
 * @updated: 2025-08-27
 * @tags: [cli, ship, git, pr, deployment]
 * @priority: medium
 * @complexity: high
 */

import chalk from 'chalk';
import { execSync } from 'child_process';
import ora from 'ora';

interface ShipOptions {
  branch?: string;
  message?: string;
  noPush?: boolean;
  noTests?: boolean;
}

export async function shipCommand(message?: string, options: ShipOptions = {}) {
  console.log(chalk.bold('\n🚢 Shipping Changes\n'));
  
  const spinner = ora('Preparing to ship...').start();
  
  try {
    // 1. Pre-flight checks
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
    
    // 2. Check for uncommitted changes
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
      const commitCmd = `git commit -m "${commitMessage}\n\n🚢 Shipped with Ginko CLI\n\nCo-authored-by: Ginko <ship@ginko.ai>"`;
      
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
    
    // 3. Prepare branch
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
    
    // 4. Push to remote
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
    
    // 5. Create PR (if gh CLI available)
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
    
    // 6. Success summary
    console.log(chalk.green('\n✅ Ship complete!'));
    console.log(chalk.dim('\nNext steps:'));
    console.log(chalk.dim('  • Review PR on GitHub'));
    console.log(chalk.dim('  • Request reviews if needed'));
    console.log(chalk.dim('  • Monitor CI/CD pipeline'));
    console.log(chalk.dim('  • Create handoff: ginko handoff "Shipped feature"'));
    
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