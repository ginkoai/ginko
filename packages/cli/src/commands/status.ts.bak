/**
 * @fileType: command
 * @status: current
 * @updated: 2025-08-28
 * @tags: [cli, status, session, info, progressive-learning]
 * @priority: medium
 * @complexity: low
 */

import chalk from 'chalk';
import fs from 'fs-extra';
import path from 'path';
import simpleGit from 'simple-git';
import { getUserEmail, getGinkoDir, formatTimeAgo, getProjectInfo } from '../utils/helpers.js';
import { ProgressiveLearning } from '../utils/progressive-learning.js';

export async function statusCommand() {
  try {
    const git = simpleGit();
    const ginkoDir = await getGinkoDir();
    const userEmail = await getUserEmail();
    const userSlug = userEmail.replace('@', '-at-').replace(/\./g, '-');
    const sessionDir = path.join(ginkoDir, 'sessions', userSlug);
    const currentHandoff = path.join(sessionDir, 'current.md');
    const projectInfo = await getProjectInfo();
    
    console.log(chalk.green('\n🌿 Ginko Status\n'));
    
    // Project info
    console.log(chalk.cyan('📦 Project'));
    console.log(`  Name: ${projectInfo.name}`);
    console.log(`  Type: ${projectInfo.type}`);
    console.log(`  User: ${userEmail}`);
    
    // Session info
    console.log(chalk.cyan('\n📝 Session'));
    let lastHandoffTime: Date | null = null;
    if (await fs.pathExists(currentHandoff)) {
      const stats = await fs.stat(currentHandoff);
      lastHandoffTime = stats.mtime;
      const content = await fs.readFile(currentHandoff, 'utf8');
      const modeMatch = content.match(/mode: (.*)/);
      const mode = modeMatch ? modeMatch[1] : 'Unknown';
      
      console.log(`  Status: Active`);
      console.log(`  Mode: ${mode}`);
      console.log(`  Last saved: ${formatTimeAgo(stats.mtime)}`);
      console.log(`  Size: ${Math.round(stats.size / 1024)}KB`);
    } else {
      console.log(`  Status: No active session`);
      console.log(chalk.dim(`  Run 'ginko start' to begin`));
    }
    
    // Git status
    const gitStatus = await git.status();
    const branch = await git.branchLocal();
    
    console.log(chalk.cyan('\n🌳 Git'));
    console.log(`  Branch: ${branch.current}`);
    console.log(`  Modified: ${gitStatus.modified.length} files`);
    console.log(`  Staged: ${gitStatus.staged.length} files`);
    console.log(`  Untracked: ${gitStatus.not_added.length} files`);
    
    // Privacy status
    const config = await fs.readJSON(path.join(ginkoDir, 'config.json'));
    console.log(chalk.cyan('\n🔐 Privacy'));
    console.log(`  Analytics: ${config.privacy?.analytics?.enabled ? chalk.yellow('Enabled (anonymous)') : chalk.green('Disabled')}`);
    console.log(`  Telemetry: ${config.privacy?.telemetry?.enabled ? chalk.yellow('Enabled') : chalk.green('Disabled')}`);
    console.log(chalk.dim(`  All data stored locally in .ginko/`));
    
    // Archive stats
    const archiveDir = path.join(sessionDir, 'archive');
    let archiveCount = 0;
    if (await fs.pathExists(archiveDir)) {
      const archives = await fs.readdir(archiveDir);
      archiveCount = archives.length;
      console.log(chalk.cyan('\n📚 Archives'));
      console.log(`  Sessions: ${archives.length}`);
      if (archives.length > 0) {
        console.log(chalk.dim(`  View with: ls .ginko/sessions/${userSlug}/archive/`));
      }
    }
    
    // Progressive learning hints
    await ProgressiveLearning.updateProgress('status');
    
    const sessionAge = lastHandoffTime ? 
      Math.floor((Date.now() - lastHandoffTime.getTime()) / 60000) : 0;
    
    await ProgressiveLearning.showHint({
      command: 'status',
      gitStatus,
      sessionAge,
      fileCount: archiveCount,
    });
    
    // Show smart suggestions
    const suggestions = await ProgressiveLearning.getSmartSuggestions(gitStatus);
    if (suggestions.length > 0) {
      console.log(ProgressiveLearning.formatSuggestions(suggestions));
    }
    
  } catch (error) {
    console.error(chalk.red('Error:'), error instanceof Error ? error.message : String(error));
    process.exit(1);
  }
}