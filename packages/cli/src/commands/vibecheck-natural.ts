/**
 * @fileType: command
 * @status: current
 * @updated: 2025-08-28
 * @tags: [cli, vibecheck, natural-conversation]
 * @priority: critical
 * @complexity: low
 * @dependencies: [chalk, fs-extra, simple-git]
 */

import chalk from 'chalk';
import fs from 'fs-extra';
import path from 'path';
import simpleGit from 'simple-git';
import { getGinkoDir, detectWorkMode } from '../utils/helpers.js';

interface VibecheckOptions {
  verbose?: boolean;
}

/**
 * Natural vibecheck - just gather context and let the AI respond naturally
 */
export async function vibecheckNaturalCommand(concern?: string, options: VibecheckOptions = {}) {
  try {
    const git = simpleGit();
    const ginkoDir = await getGinkoDir();
    const status = await git.status();
    const log = await git.log({ maxCount: 10 });
    
    // If no concern, just show a simple status
    if (!concern) {
      const mode = await detectWorkMode(status);
      console.log(chalk.yellow('\n🎯 Vibecheck\n'));
      console.log(`Currently ${chalk.cyan(mode.toLowerCase())} on ${chalk.cyan(status.current)}`);
      console.log(`${chalk.dim(status.modified.length + ' modified files')}`);
      console.log();
      console.log(chalk.dim('How are things going?'));
      return;
    }
    
    // Gather context for the AI to understand the situation
    const context = await gatherContext(git, ginkoDir, status, log);
    
    // Output for AI to process naturally
    console.log(chalk.yellow('\n🎯 Vibecheck\n'));
    console.log(concern);
    console.log();
    
    // Provide context as a hint to the AI (exit code 48 for natural vibecheck)
    console.log(chalk.dim('---'));
    console.log(chalk.dim('Context for AI response:'));
    console.log(chalk.dim(JSON.stringify(context, null, 2)));
    console.log(chalk.dim('---'));
    console.log(chalk.dim(`
Respond naturally to the vibecheck concern above. Be a thoughtful pair programmer:
- Consider what we've been working on (see context)
- Acknowledge the concern directly and conversationally
- Be concise - 1-3 sentences usually
- Offer actionable next steps if appropriate
- Keep the tone calm and supportive
- Goal is to help return to flow state

Don't use templates or formal structure. Just respond naturally.
`));
    
    // Exit with code 0 to avoid stderr interpretation
    // The vibecheck prompt is expected behavior, not an error
    process.exit(0);
    
  } catch (error) {
    console.log(chalk.yellow('\n🎯 Vibecheck\n'));
    console.log(chalk.dim('Something went wrong, but let\'s take a moment anyway.'));
  }
}

/**
 * Gather relevant context for AI awareness
 */
async function gatherContext(git: any, ginkoDir: string, status: any, log: any) {
  const mode = await detectWorkMode(status);
  
  // Count potential issues
  const recentMessages = log.all.map((c: any) => c.message.toLowerCase());
  const fixAttempts = recentMessages.filter((m: string) => 
    m.includes('fix') || m.includes('debug') || m.includes('attempt')
  ).length;
  
  // Get last session activity
  let lastActivity = '';
  try {
    const sessionDirs = await fs.readdir(path.join(ginkoDir, 'sessions')).catch(() => []);
    for (const dir of sessionDirs) {
      const currentPath = path.join(ginkoDir, 'sessions', dir, 'current.md');
      if (await fs.pathExists(currentPath)) {
        const content = await fs.readFile(currentPath, 'utf8');
        const match = content.match(/## 📊 Session Summary\n([^\n]+)/);
        if (match) lastActivity = match[1];
        break;
      }
    }
  } catch {}
  
  return {
    currentMode: mode,
    branch: status.current,
    modifiedFiles: status.modified.length,
    uncommittedFiles: status.not_added.length,
    recentCommitCount: log.all.length,
    fixAttempts,
    lastActivity: lastActivity || 'No previous activity found',
    hasConflicts: status.conflicted.length > 0,
    lastCommitMessage: log.latest?.message || '',
    timeSinceLastCommit: log.latest ? 
      Math.round((Date.now() - new Date(log.latest.date).getTime()) / 1000 / 60) + ' minutes ago' : 
      'No commits yet'
  };
}

export { vibecheckNaturalCommand as vibecheckCommand };