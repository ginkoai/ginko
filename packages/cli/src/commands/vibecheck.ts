/**
 * @fileType: command
 * @status: current
 * @updated: 2025-08-27
 * @tags: [cli, vibecheck, recalibration, collaboration]
 * @priority: medium
 * @complexity: low
 */

import chalk from 'chalk';
import fs from 'fs-extra';
import path from 'path';
import { getGinkoDir } from '../utils/helpers.js';

export async function vibecheckCommand(concern?: string) {
  try {
    const ginkoDir = await getGinkoDir();
    
    console.log(chalk.yellow('\n🎯 Vibecheck - Quick Recalibration\n'));
    
    if (concern) {
      console.log(chalk.cyan('Your concern: ') + concern);
      console.log();
    }
    
    // Load current session to understand context
    const sessionDir = path.join(ginkoDir, 'sessions');
    const userDirs = await fs.readdir(sessionDir).catch(() => []);
    let currentHandoff = null;
    
    for (const userDir of userDirs) {
      const handoffPath = path.join(sessionDir, userDir, 'current.md');
      if (await fs.pathExists(handoffPath)) {
        currentHandoff = await fs.readFile(handoffPath, 'utf8');
        break;
      }
    }
    
    // Assessment questions
    console.log(chalk.bold('📊 Current Situation:'));
    
    if (currentHandoff) {
      const modeMatch = currentHandoff.match(/mode: ([^\n]+)/);
      const summaryMatch = currentHandoff.match(/## 📊 Session Summary\n([^\n]+)/);
      
      if (modeMatch) {
        console.log(chalk.dim(`  Mode: ${modeMatch[1]}`));
      }
      if (summaryMatch) {
        console.log(chalk.dim(`  Last activity: ${summaryMatch[1]}`));
      }
    }
    
    console.log('\n' + chalk.bold('🤔 Alignment Check:'));
    console.log('  1. Are we solving the right problem?');
    console.log('  2. Is this the simplest approach?');
    console.log('  3. Have requirements changed?');
    
    if (concern) {
      console.log('\n' + chalk.bold('💭 Addressing your concern:'));
      
      // Provide contextual guidance based on common concerns
      const concernLower = concern.toLowerCase();
      
      if (concernLower.includes('lost') || concernLower.includes('confused')) {
        console.log(chalk.green('  → Step back and review the original goal'));
        console.log(chalk.green('  → Check if you\'ve drifted from the main task'));
        console.log(chalk.green('  → Consider creating a handoff to clarify state'));
      } else if (concernLower.includes('complex') || concernLower.includes('complicated')) {
        console.log(chalk.green('  → Look for a simpler solution'));
        console.log(chalk.green('  → Break the problem into smaller pieces'));
        console.log(chalk.green('  → Consider if you\'re over-engineering'));
      } else if (concernLower.includes('stuck') || concernLower.includes('blocked')) {
        console.log(chalk.green('  → Identify the specific blocker'));
        console.log(chalk.green('  → Consider alternative approaches'));
        console.log(chalk.green('  → Document what you\'ve tried'));
      } else if (concernLower.includes('wrong') || concernLower.includes('mistake')) {
        console.log(chalk.green('  → Assess impact of current approach'));
        console.log(chalk.green('  → Consider cost of pivoting vs continuing'));
        console.log(chalk.green('  → Focus on learning, not blame'));
      } else {
        console.log(chalk.green('  → Take a moment to clarify the core issue'));
        console.log(chalk.green('  → Consider if this needs immediate action'));
        console.log(chalk.green('  → Focus on the next single step'));
      }
    }
    
    console.log('\n' + chalk.bold('🚀 Recommended Next Steps:'));
    console.log('  1. ' + chalk.cyan('Define success') + ' - What does "done" look like?');
    console.log('  2. ' + chalk.cyan('Single action') + ' - The ONE thing to do next');
    console.log('  3. ' + chalk.cyan('Clear blockers') + ' - Address what\'s stopping progress');
    
    console.log('\n' + chalk.dim('💡 Vibecheck complete. Ready to realign and continue.'));
    
    // Optionally create a vibecheck entry in session
    if (concern) {
      const vibecheckLog = path.join(ginkoDir, 'sessions', 'vibechecks.log');
      const entry = `${new Date().toISOString()} - ${concern}\n`;
      await fs.appendFile(vibecheckLog, entry).catch(() => {});
    }
    
  } catch (error) {
    console.error(chalk.red('Error during vibecheck:'), error instanceof Error ? error.message : String(error));
    console.log(chalk.yellow('\n💡 Even if the command failed, take a moment to recalibrate.'));
  }
}