/**
 * @fileType: command
 * @status: current
 * @updated: 2025-08-27
 * @tags: [cli, handoff, session, git-native]
 * @priority: high
 * @complexity: medium
 */

import chalk from 'chalk';
import fs from 'fs-extra';
import path from 'path';
import ora from 'ora';
import simpleGit from 'simple-git';
import { getUserEmail, getGinkoDir, detectWorkMode } from '../utils/helpers.js';

export async function handoffCommand(message?: string) {
  const spinner = ora('Creating handoff...').start();
  
  try {
    const git = simpleGit();
    const ginkoDir = await getGinkoDir();
    const userEmail = await getUserEmail();
    const userSlug = userEmail.replace('@', '-at-').replace(/\./g, '-');
    const sessionDir = path.join(ginkoDir, 'sessions', userSlug);
    const currentHandoff = path.join(sessionDir, 'current.md');
    
    // Get git status
    const status = await git.status();
    const branch = await git.branchLocal();
    const currentBranch = branch.current;
    
    // Detect work mode
    const mode = await detectWorkMode(status);
    
    // Get recent commits
    const log = await git.log({ maxCount: 5 });
    const recentCommits = log.all.map(commit => 
      `- ${commit.hash.substring(0, 7)} ${commit.message}`
    ).join('\n');
    
    // Build handoff content
    const timestamp = new Date().toISOString();
    const sessionId = Date.now();
    
    let handoffContent = `---
session_id: ${sessionId}
user: ${userEmail}
timestamp: ${timestamp}
mode: ${mode}
branch: ${currentBranch}
context_usage: estimated
---

# Session Handoff

## 📊 Session Summary
${message || 'Session progress saved'}

## 🔄 Current State

### Git Status
- Branch: ${currentBranch}
- Modified files: ${status.modified.length}
- Staged files: ${status.staged.length}
- Untracked files: ${status.not_added.length}

### Recent Activity
${recentCommits || 'No recent commits'}

## 📁 Working Files
`;
    
    // Add modified files list
    if (status.modified.length > 0) {
      handoffContent += '\n### Modified\n';
      status.modified.slice(0, 10).forEach(file => {
        handoffContent += `- ${file}\n`;
      });
      if (status.modified.length > 10) {
        handoffContent += `- ... and ${status.modified.length - 10} more\n`;
      }
    }
    
    // Add work mode insights
    handoffContent += `\n## 🎯 Work Mode: ${mode}\n`;
    
    switch (mode) {
      case 'Implementing':
        handoffContent += 'Focused on adding new functionality.\n';
        break;
      case 'Debugging':
        handoffContent += 'Working through issues and fixes.\n';
        break;
      case 'Refactoring':
        handoffContent += 'Improving code structure and quality.\n';
        break;
      case 'Exploring':
        handoffContent += 'Investigating and understanding the codebase.\n';
        break;
    }
    
    // Add next steps section
    handoffContent += `
## Next Steps
- Review changes with \`git diff\`
- Continue work on ${currentBranch}
- Run tests to verify changes
${message ? `- Note: ${message}` : ''}

## 🔐 Privacy Note
This handoff is stored locally in git. No data was sent to any server.

---
Generated at ${new Date().toLocaleString()}
`;
    
    // Archive existing handoff if it exists
    if (await fs.pathExists(currentHandoff)) {
      const existing = await fs.readFile(currentHandoff, 'utf8');
      const existingMatch = existing.match(/session_id: (\d+)/);
      if (existingMatch) {
        const archiveFile = path.join(sessionDir, 'archive', `${existingMatch[1]}.md`);
        await fs.move(currentHandoff, archiveFile, { overwrite: true });
        spinner.text = 'Archived previous handoff';
      }
    }
    
    // Write new handoff
    await fs.writeFile(currentHandoff, handoffContent);
    
    // Optionally add to git
    const config = await fs.readJSON(path.join(ginkoDir, 'config.json'));
    if (config.git?.autoCommit) {
      await git.add(currentHandoff);
      await git.commit(`📝 Session handoff: ${message || mode}`);
      spinner.text = 'Committed handoff to git';
    }
    
    spinner.succeed('Handoff created successfully!');
    
    console.log(chalk.green('\n✅ Session saved'));
    console.log(chalk.cyan(`📁 Location: .ginko/sessions/${userSlug}/current.md`));
    console.log(chalk.dim(`🎯 Mode detected: ${mode}`));
    console.log(chalk.dim('🔐 Privacy: All data stored locally'));
    
    if (!config.git?.autoCommit) {
      console.log(chalk.yellow('\n💡 Tip: Add handoff to git with:'));
      console.log(chalk.dim(`   git add .ginko/sessions/`));
      console.log(chalk.dim(`   git commit -m "Session handoff"`));
    }
    
  } catch (error) {
    spinner.fail('Failed to create handoff');
    console.error(chalk.red('Error:'), error instanceof Error ? error.message : String(error));
    process.exit(1);
  }
}