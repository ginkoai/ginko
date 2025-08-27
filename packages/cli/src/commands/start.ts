/**
 * @fileType: command
 * @status: current
 * @updated: 2025-08-27
 * @tags: [cli, start, session, resume]
 * @priority: high
 * @complexity: medium
 */

import chalk from 'chalk';
import fs from 'fs-extra';
import path from 'path';
import ora from 'ora';
import { getUserEmail, getGinkoDir, formatTimeAgo } from '../utils/helpers.js';
import { getAdapter } from '../adapters/index.js';

export async function startCommand(sessionId?: string) {
  const spinner = ora('Loading session...').start();
  
  try {
    const ginkoDir = await getGinkoDir();
    const userEmail = await getUserEmail();
    const userSlug = userEmail.replace('@', '-at-').replace(/\./g, '-');
    const sessionDir = path.join(ginkoDir, 'sessions', userSlug);
    
    // Check for existing handoff
    const currentHandoff = path.join(sessionDir, 'current.md');
    let handoffContent = null;
    let lastSession = null;
    
    if (await fs.pathExists(currentHandoff)) {
      handoffContent = await fs.readFile(currentHandoff, 'utf8');
      const stats = await fs.stat(currentHandoff);
      lastSession = stats.mtime;
    }
    
    // If specific session requested, load from archive
    if (sessionId) {
      const archiveFile = path.join(sessionDir, 'archive', `${sessionId}.md`);
      if (await fs.pathExists(archiveFile)) {
        handoffContent = await fs.readFile(archiveFile, 'utf8');
        spinner.succeed(`Loaded session: ${sessionId}`);
      } else {
        spinner.fail(`Session not found: ${sessionId}`);
        process.exit(1);
      }
    }
    
    spinner.stop();
    
    if (handoffContent) {
      // Parse handoff metadata
      const lines = handoffContent.split('\n');
      let mode = 'Unknown';
      let branch = 'main';
      let summary = '';
      
      for (const line of lines.slice(0, 20)) {
        if (line.includes('mode:')) mode = line.split('mode:')[1].trim();
        if (line.includes('branch:')) branch = line.split('branch:')[1].trim();
        if (line.startsWith('## ') && !line.includes('📦')) {
          summary = line.replace('## ', '').replace(/[📊🎯🔄]/, '').trim();
          break;
        }
      }
      
      // Display welcome message
      console.log(chalk.green('\n✨ Welcome back!'));
      console.log(chalk.cyan(`📅 Last session: ${lastSession ? formatTimeAgo(lastSession) : 'unknown'}`));
      console.log(chalk.cyan(`🌿 Branch: ${branch}`));
      console.log(chalk.cyan(`📝 Mode: ${mode}`));
      
      if (summary) {
        console.log(chalk.yellow(`\n🎯 Continue with: ${summary}`));
      }
      
      // Show quick summary of session content
      const taskMatch = handoffContent.match(/## Next Steps.*?\n([\s\S]*?)(\n##|\n---)/);
      if (taskMatch) {
        console.log(chalk.dim('\nNext steps from last session:'));
        const tasks = taskMatch[1].split('\n')
          .filter((line: string) => line.trim().startsWith('-') || line.trim().startsWith('1.'))
          .slice(0, 3);
        tasks.forEach((task: string) => {
          console.log(chalk.dim(task));
        });
      }
      
      console.log(chalk.dim('\n📄 Full handoff available in: .ginko/sessions/'));
      
    } else {
      // No previous session
      console.log(chalk.green('\n🌱 Starting fresh session'));
      console.log(chalk.dim('No previous handoff found'));
      
      // Create initial handoff
      const timestamp = new Date().toISOString();
      const initialHandoff = `---
session_id: ${Date.now()}
user: ${userEmail}
timestamp: ${timestamp}
mode: Exploring
branch: main
---

# Session Handoff

## 🌱 New Session Started

Session initialized at ${timestamp}.

## Next Steps
- Define your goals for this session
- Start exploring or implementing
- Create a handoff when you pause

---
`;
      
      await fs.writeFile(currentHandoff, initialHandoff);
      console.log(chalk.green('✅ Created initial session handoff'));
    }
    
    // Show tip
    console.log(chalk.dim('\n💡 Tip: Run `ginko handoff` to save progress'));
    
  } catch (error) {
    spinner.fail('Failed to start session');
    console.error(chalk.red('Error:'), error instanceof Error ? error.message : String(error));
    process.exit(1);
  }
}