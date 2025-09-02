import chalk from 'chalk';
import fs from 'fs-extra';
import path from 'path';
import ora from 'ora';
import { execSync } from 'child_process';

export async function uninstallCursorCommand(options: { 
  force?: boolean; 
  keepSessions?: boolean; 
  revertCommit?: boolean;
} = {}) {
  const spinner = ora('Preparing Cursor uninstall...').start();

  try {
    const projectRoot = process.cwd();
    
    // Check if we're in a git repo
    let isGitRepo = false;
    try {
      execSync('git status', { cwd: projectRoot, stdio: 'pipe' });
      isGitRepo = true;
    } catch {
      // Not a git repo
    }

    // Files to remove
    const filesToRemove = [
      path.join(projectRoot, '.cursorrules'),
      path.join(projectRoot, '.ginko', 'generated')
    ];

    // Check what exists
    const existingFiles = filesToRemove.filter(file => fs.existsSync(file));
    
    if (existingFiles.length === 0) {
      spinner.warn('No Cursor integration files found to remove');
      return;
    }

    // Show what will be removed
    console.log('\n' + chalk.bold('🗑️  Files to remove:'));
    existingFiles.forEach(file => {
      console.log(chalk.red('  -') + ` ${path.relative(projectRoot, file)}`);
    });

    // Prompt for confirmation unless --force
    if (!options.force) {
      const answer = await new Promise<string>((resolve) => {
        const readline = require('readline');
        const rl = readline.createInterface({
          input: process.stdin,
          output: process.stdout
        });
        
        rl.question('\nAre you sure you want to remove Cursor integration? (y/N): ', (answer: string) => {
          rl.close();
          resolve(answer.toLowerCase());
        });
      });

      if (answer !== 'y' && answer !== 'yes') {
        spinner.info('Uninstall cancelled');
        return;
      }
    }

    // Remove files
    spinner.text = 'Removing Cursor integration files...';
    
    for (const file of existingFiles) {
      if (fs.existsSync(file)) {
        if (fs.lstatSync(file).isDirectory()) {
          await fs.remove(file);
        } else {
          await fs.unlink(file);
        }
      }
    }

    // Optionally revert the git commit
    if (options.revertCommit && isGitRepo) {
      try {
        spinner.text = 'Reverting Cursor integration commit...';
        
        // Find the Cursor integration commit
        const logOutput = execSync(
          'git log --oneline --grep="feat: add Ginko Cursor integration" -n 1',
          { cwd: projectRoot, encoding: 'utf8', stdio: 'pipe' }
        ).toString();
        
        if (logOutput.trim()) {
          const commitHash = logOutput.split(' ')[0];
          execSync(`git revert ${commitHash} --no-edit`, { 
            cwd: projectRoot, 
            stdio: 'pipe' 
          });
          spinner.succeed('Git commit reverted successfully');
        } else {
          spinner.warn('No Cursor integration commit found to revert');
        }
      } catch (gitError) {
        spinner.warn('Failed to revert git commit (files removed manually)');
        console.log(chalk.yellow('You may need to manually revert or reset the commit'));
      }
    }

    // Clean up .gitignore if it only contains Ginko entries
    const gitignorePath = path.join(projectRoot, '.gitignore');
    if (fs.existsSync(gitignorePath)) {
      const gitignore = await fs.readFile(gitignorePath, 'utf8');
      const ginkoLines = gitignore.split('\n').filter(line => 
        line.includes('.ginko/config.json') || line.includes('Ginko local config')
      );
      
      if (ginkoLines.length > 0) {
        const cleanedGitignore = gitignore
          .split('\n')
          .filter(line => !line.includes('.ginko/config.json') && !line.includes('Ginko local config'))
          .join('\n')
          .replace(/\n\n+/g, '\n\n') // Remove extra blank lines
          .trim();
        
        if (cleanedGitignore) {
          await fs.writeFile(gitignorePath, cleanedGitignore + '\n', 'utf8');
        } else {
          await fs.unlink(gitignorePath);
        }
      }
    }

    spinner.succeed('Cursor integration uninstalled successfully!');

    console.log('\n' + chalk.bold('📋 What was removed:'));
    existingFiles.forEach(file => {
      console.log(chalk.red('  ✓') + ` ${path.relative(projectRoot, file)}`);
    });

    if (options.revertCommit && isGitRepo) {
      console.log(chalk.red('  ✓') + ' Git commit reverted');
    }

    console.log('\n' + chalk.dim('Note: Your .ginko sessions and context are preserved unless you manually remove them.'));
    
  } catch (error: any) {
    spinner.fail('Failed to uninstall Cursor integration');
    console.error(chalk.red(error?.message || error));
    process.exitCode = 1;
  }
}
