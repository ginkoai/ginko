/**
 * @fileType: command
 * @status: current
 * @updated: 2025-08-28
 * @tags: [cli, vibecheck, pause, conversation]
 * @related: [vibecheck.ts]
 * @priority: high
 * @complexity: low
 * @dependencies: [chalk, fs-extra]
 */

import chalk from 'chalk';
import fs from 'fs-extra';
import path from 'path';
import simpleGit from 'simple-git';
import { getGinkoDir, detectWorkMode } from '../utils/helpers.js';

interface VibecheckOptions {
  verbose?: boolean;
  quick?: boolean;
}

/**
 * Simple, conversational vibecheck - a pause moment for recalibration
 */
export async function vibecheckSimpleCommand(concern?: string, options: VibecheckOptions = {}) {
  try {
    const git = simpleGit();
    const ginkoDir = await getGinkoDir();
    
    // Just acknowledge the concern first
    if (concern) {
      console.log(chalk.yellow('\n🎯 Vibecheck - Let\'s take a moment\n'));
      console.log(chalk.cyan('Your concern: ') + concern);
      console.log();
      
      // Quick contextual response based on the concern
      const response = generateQuickResponse(concern);
      console.log(chalk.green(response));
      
      // Optional verbose mode with more context
      if (options.verbose) {
        await showAdditionalContext(ginkoDir, git);
      }
    } else {
      // No concern provided - show a quick status check
      console.log(chalk.yellow('\n🎯 Vibecheck - Quick alignment check\n'));
      
      const status = await git.status();
      const mode = await detectWorkMode(status);
      
      console.log(chalk.bold('Current state:'));
      console.log(`  Mode: ${chalk.cyan(mode)}`);
      console.log(`  Modified files: ${chalk.cyan(status.modified.length)}`);
      console.log(`  Branch: ${chalk.cyan(status.current)}`);
      console.log();
      
      console.log(chalk.bold('Questions to consider:'));
      console.log('  • Are we solving the right problem?');
      console.log('  • Is this the simplest approach?');
      console.log('  • What\'s the next single step?');
    }
    
    // Always end with encouragement to continue
    console.log();
    console.log(chalk.dim('💭 Take a beat to think, then continue when ready.'));
    
    // Log the vibecheck for history
    if (concern) {
      const logFile = path.join(ginkoDir, 'sessions', 'vibechecks.log');
      const entry = `${new Date().toISOString()} | ${concern}\n`;
      await fs.appendFile(logFile, entry).catch(() => {});
    }
    
  } catch (error) {
    // Even errors should be gentle in vibecheck
    console.log(chalk.yellow('\n💭 Something went wrong, but that\'s okay.'));
    console.log(chalk.dim('Take a moment to recalibrate anyway.'));
  }
}

/**
 * Generate a quick, contextual response to common concerns
 */
function generateQuickResponse(concern: string): string {
  const concernLower = concern.toLowerCase();
  
  // Pattern matching for common concerns
  if (concernLower.includes('red') || concernLower.includes('error')) {
    return '📍 I see you noticed an error. Would you like me to investigate before we continue?';
  }
  
  if (concernLower.includes('lost') || concernLower.includes('confused')) {
    return '📍 Let\'s step back and review our original goal. What were we trying to achieve?';
  }
  
  if (concernLower.includes('stuck') || concernLower.includes('blocked')) {
    return '📍 Being stuck is information. What specifically is blocking us right now?';
  }
  
  if (concernLower.includes('wrong') || concernLower.includes('mistake')) {
    return '📍 Good catch. Should we pivot or adjust our approach?';
  }
  
  if (concernLower.includes('complex') || concernLower.includes('complicated')) {
    return '📍 Complexity is a signal. Can we break this into smaller pieces?';
  }
  
  if (concernLower.includes('slow') || concernLower.includes('taking too long')) {
    return '📍 Progress over perfection. What\'s the minimum viable next step?';
  }
  
  if (concernLower.includes('working') || concernLower.includes('correct')) {
    return '📍 Let\'s verify together. What behavior are we expecting to see?';
  }
  
  if (concernLower.includes('should') || concernLower.includes('best')) {
    return '📍 There are tradeoffs to consider. What matters most for this use case?';
  }
  
  // Default response for unmatched patterns
  return '📍 I hear you. Let\'s pause and think about this together. What\'s your instinct telling you?';
}

/**
 * Show additional context when verbose mode is requested
 */
async function showAdditionalContext(ginkoDir: string, git: any): Promise<void> {
  console.log();
  console.log(chalk.bold('Additional context:'));
  
  try {
    // Recent commits
    const log = await git.log({ maxCount: 3 });
    if (log.all.length > 0) {
      console.log(chalk.dim('  Recent commits:'));
      log.all.forEach((commit: any) => {
        const msg = commit.message.split('\n')[0];
        console.log(chalk.dim(`    • ${msg}`));
      });
    }
    
    // Current session info
    const sessionDir = path.join(ginkoDir, 'sessions');
    const userDirs = await fs.readdir(sessionDir).catch(() => []);
    
    for (const userDir of userDirs) {
      const handoffPath = path.join(sessionDir, userDir, 'current.md');
      if (await fs.pathExists(handoffPath)) {
        const content = await fs.readFile(handoffPath, 'utf8');
        const summaryMatch = content.match(/## 📊 Session Summary\n([^\n]+)/);
        if (summaryMatch) {
          console.log(chalk.dim(`  Last session: ${summaryMatch[1]}`));
        }
        break;
      }
    }
  } catch {
    // Silently skip if any context gathering fails
  }
}

export { vibecheckSimpleCommand as vibecheckCommand };