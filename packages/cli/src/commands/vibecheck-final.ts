/**
 * @fileType: command
 * @status: current
 * @updated: 2025-08-28
 * @tags: [cli, vibecheck, conversation]
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
 * Vibecheck - A simple pause moment that provides context for natural conversation
 * 
 * Philosophy: The vibecheck is not a tool that generates output, but rather
 * a moment that provides context. The AI should naturally respond to the concern
 * based on awareness of what's been happening.
 */
export async function vibecheckCommand(concern?: string, options: VibecheckOptions = {}) {
  try {
    const git = simpleGit();
    const ginkoDir = await getGinkoDir();
    const status = await git.status();
    
    console.log(chalk.yellow('\n🎯 Vibecheck\n'));
    
    // If no concern provided, just show current state
    if (!concern) {
      const mode = await detectWorkMode(status);
      console.log(`Currently ${chalk.cyan(mode.toLowerCase())} on branch ${chalk.cyan(status.current)}`);
      console.log(chalk.dim(`${status.modified.length} files modified, ${status.staged.length} staged`));
      
      // Simple prompt
      console.log();
      console.log('How\'s it going?');
      return;
    }
    
    // Show the concern
    console.log(concern);
    
    // In verbose mode, show additional context
    if (options.verbose) {
      console.log();
      console.log(chalk.dim('Current context:'));
      
      const log = await git.log({ maxCount: 5 });
      const mode = await detectWorkMode(status);
      
      // Recent activity
      console.log(chalk.dim(`  • Mode: ${mode}`));
      console.log(chalk.dim(`  • Branch: ${status.current}`));
      console.log(chalk.dim(`  • Changes: ${status.modified.length} modified, ${status.staged.length} staged`));
      
      // Recent commits hint at what we've been doing
      if (log.all.length > 0) {
        const recentWork = analyzeRecentWork([...log.all]);
        if (recentWork) {
          console.log(chalk.dim(`  • Recent focus: ${recentWork}`));
        }
      }
      
      // Check for patterns that might be relevant
      const patterns = detectPatterns([...log.all], status);
      if (patterns.length > 0) {
        console.log(chalk.dim(`  • Patterns: ${patterns.join(', ')}`));
      }
    }
    
    // Log the vibecheck
    await logVibecheck(ginkoDir, concern);
    
    // That's it - no special exit codes, no templates
    // The AI should just respond naturally to the concern
    
  } catch (error) {
    // Even errors should be calm
    console.log(chalk.yellow('\n🎯 Vibecheck\n'));
    console.log('Let\'s pause for a moment.');
  }
}

/**
 * Analyze recent commits to understand what we've been working on
 */
function analyzeRecentWork(commits: any[]): string {
  const messages = commits.map(c => c.message.toLowerCase());
  
  // Look for patterns
  const fixing = messages.filter(m => m.includes('fix')).length;
  const features = messages.filter(m => m.includes('feat') || m.includes('add')).length;
  const refactoring = messages.filter(m => m.includes('refactor')).length;
  
  if (fixing >= 2) return 'Bug fixing';
  if (features >= 2) return 'Feature development';
  if (refactoring >= 1) return 'Refactoring';
  
  // Default to first commit message topic
  if (messages.length > 0) {
    const firstMsg = messages[0].split(':')[0].split(' ')[0];
    return firstMsg.charAt(0).toUpperCase() + firstMsg.slice(1);
  }
  
  return '';
}

/**
 * Detect patterns that might indicate issues
 */
function detectPatterns(commits: any[], status: any): string[] {
  const patterns: string[] = [];
  const messages = commits.map(c => c.message.toLowerCase());
  
  // Multiple fix attempts might indicate struggling
  const fixes = messages.filter(m => m.includes('fix')).length;
  if (fixes >= 3) patterns.push('multiple fix attempts');
  
  // Many uncommitted changes might indicate uncertainty
  if (status.modified.length > 10) patterns.push('many uncommitted changes');
  
  // WIP commits indicate exploration
  if (messages.some(m => m.includes('wip'))) patterns.push('work in progress');
  
  // Reverts indicate backtracking
  if (messages.some(m => m.includes('revert'))) patterns.push('backtracking');
  
  return patterns;
}

/**
 * Log vibecheck for future pattern analysis
 */
async function logVibecheck(ginkoDir: string, concern: string): Promise<void> {
  try {
    const logFile = path.join(ginkoDir, 'sessions', 'vibechecks.log');
    const entry = `${new Date().toISOString()} | ${concern}\n`;
    await fs.appendFile(logFile, entry);
  } catch {
    // Silent fail - logging is not critical
  }
}

export default vibecheckCommand;