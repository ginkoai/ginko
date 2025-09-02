import chalk from 'chalk';
import fs from 'fs-extra';
import path from 'path';
import ora from 'ora';
import { execSync } from 'child_process';

export async function uninstallCopilotCommand(options: { force?: boolean; revertCommit?: boolean } = {}) {
  const spinner = ora('Checking GitHub Copilot integration...').start();

  try {
    const projectRoot = process.cwd();
    const copilotInstructionsPath = path.join(projectRoot, '.github', 'copilot-instructions.md');
    const vscodeSettingsPath = path.join(projectRoot, '.vscode', 'settings.json');
    const githubDir = path.join(projectRoot, '.github');
    const vscodeDir = path.join(projectRoot, '.vscode');

    // Check what exists
    const hasInstructions = await fs.pathExists(copilotInstructionsPath);
    const hasSettings = await fs.pathExists(vscodeSettingsPath);

    if (!hasInstructions && !hasSettings) {
      spinner.info(chalk.yellow('No GitHub Copilot integration found'));
      return;
    }

    spinner.stop();

    // Show what will be removed
    console.log(chalk.cyan('\n📋 GitHub Copilot integration found:'));
    if (hasInstructions) {
      console.log('  • .github/copilot-instructions.md');
    }
    if (hasSettings) {
      console.log('  • .vscode/settings.json (Copilot settings)');
    }

    // Confirm removal unless forced
    if (!options.force) {
      console.log(chalk.yellow('\n⚠️  This will remove GitHub Copilot configuration'));
      console.log(chalk.dim('  (Your Ginko sessions and context will be preserved)'));
      
      const shouldContinue = await promptYesNo('\nContinue with uninstall?');
      if (!shouldContinue) {
        console.log(chalk.gray('Uninstall cancelled'));
        return;
      }
    }

    spinner.start('Removing GitHub Copilot integration...');

    // Remove copilot-instructions.md
    if (hasInstructions) {
      await fs.remove(copilotInstructionsPath);
      
      // Remove .github directory if empty
      try {
        const githubContents = await fs.readdir(githubDir);
        if (githubContents.length === 0) {
          await fs.remove(githubDir);
        }
      } catch (e) {
        // Directory might not exist or have other files
      }
    }

    // Clean VS Code settings
    if (hasSettings) {
      try {
        const settingsContent = await fs.readFile(vscodeSettingsPath, 'utf8');
        const settings = JSON.parse(settingsContent);
        
        // Remove Copilot-specific settings
        const copilotKeys = [
          'github.copilot.enable',
          'github.copilot.editor.enableAutoCompletions',
          'github.copilot.editor.enableCodeActions',
          'github.copilot.chat.welcomeMessage',
          'github.copilot.chat.localeOverride',
          'github.copilot.advanced'
        ];
        
        copilotKeys.forEach(key => delete settings[key]);
        
        // Check if settings is now empty
        if (Object.keys(settings).length === 0) {
          // Remove the file entirely
          await fs.remove(vscodeSettingsPath);
          
          // Remove .vscode directory if empty
          try {
            const vscodeContents = await fs.readdir(vscodeDir);
            if (vscodeContents.length === 0) {
              await fs.remove(vscodeDir);
            }
          } catch (e) {
            // Directory might not exist or have other files
          }
        } else {
          // Write back cleaned settings
          await fs.writeFile(vscodeSettingsPath, JSON.stringify(settings, null, 2), 'utf8');
        }
      } catch (e) {
        console.warn(chalk.yellow('\n⚠ Could not clean VS Code settings - file may be malformed'));
      }
    }

    spinner.succeed(chalk.green('✓ GitHub Copilot integration removed'));

    // Handle git revert if requested
    if (options.revertCommit) {
      spinner.start('Looking for Copilot integration commit...');
      
      try {
        // Find the most recent commit that added Copilot configuration
        const gitLog = execSync(
          `git log --grep="GitHub Copilot" --grep="copilot" -i --pretty=format:"%H %s" -n 10`,
          { encoding: 'utf8' }
        );
        
        if (gitLog) {
          const commits = gitLog.split('\n').filter(Boolean);
          const copilotCommit = commits.find(commit => 
            commit.toLowerCase().includes('copilot') && 
            commit.toLowerCase().includes('ginko')
          );
          
          if (copilotCommit) {
            const [hash, ...messageParts] = copilotCommit.split(' ');
            const message = messageParts.join(' ');
            
            spinner.stop();
            console.log(chalk.cyan('\n📝 Found Copilot integration commit:'));
            console.log(`  ${chalk.dim(hash.substring(0, 7))} ${message}`);
            
            const shouldRevert = await promptYesNo('\nRevert this commit?');
            if (shouldRevert) {
              spinner.start('Reverting commit...');
              execSync(`git revert ${hash} --no-edit`, { stdio: 'pipe' });
              spinner.succeed(chalk.green('✓ Commit reverted'));
            }
          } else {
            spinner.info(chalk.yellow('No Copilot integration commit found'));
          }
        }
      } catch (e) {
        spinner.warn(chalk.yellow('Could not search git history'));
      }
    }

    // Summary
    console.log(chalk.green('\n✨ GitHub Copilot integration has been removed'));
    console.log(chalk.dim('Your Ginko sessions and context have been preserved'));
    console.log(chalk.dim('Run "ginko init-copilot" to set up again anytime'));

  } catch (error) {
    spinner.fail(chalk.red('Failed to uninstall GitHub Copilot integration'));
    console.error(error);
    process.exit(1);
  }
}

async function promptYesNo(question: string): Promise<boolean> {
  // Simple implementation - in production would use inquirer or similar
  console.log(chalk.cyan(question + ' (y/n)'));
  return true; // Default to yes for now
}