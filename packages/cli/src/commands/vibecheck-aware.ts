/**
 * @fileType: command
 * @status: current
 * @updated: 2025-08-28
 * @tags: [cli, vibecheck, situational-awareness, pair-programming]
 * @priority: critical
 * @complexity: medium
 * @dependencies: [chalk, fs-extra, simple-git]
 */

import chalk from 'chalk';
import fs from 'fs-extra';
import path from 'path';
import simpleGit from 'simple-git';
import { getGinkoDir, detectWorkMode } from '../utils/helpers.js';

interface VibecheckOptions {
  verbose?: boolean;
  analyze?: boolean;
}

interface SessionContext {
  mode: string;
  recentCommits: any[];
  uncommittedChanges: number;
  lastActivity: string;
  workPattern: string;
  contextSaturation: number;
  failedAttempts: number;
}

/**
 * Situationally-aware vibecheck - like a thoughtful pair programming partner
 */
export async function vibecheckAwareCommand(concern?: string, options: VibecheckOptions = {}) {
  try {
    const git = simpleGit();
    const ginkoDir = await getGinkoDir();
    
    // Gather situational context
    const context = await gatherSituationalContext(git, ginkoDir);
    
    // Start with a simple acknowledgment
    console.log(chalk.yellow('\n🎯 Vibecheck\n'));
    
    if (concern) {
      // Show the concern
      console.log(chalk.dim('You: ') + concern);
      console.log();
      
      // Generate situationally-aware response
      const response = generateAwareResponse(concern, context);
      console.log(chalk.cyan('Me: ') + response.primary);
      
      // Offer options if relevant
      if (response.options.length > 0) {
        console.log();
        response.options.forEach((option, i) => {
          console.log(chalk.dim(`  ${i + 1}. ${option}`));
        });
      }
      
      // Show awareness hints if verbose
      if (options.verbose && response.awareness) {
        console.log();
        console.log(chalk.dim(`(Awareness: ${response.awareness})`));
      }
    } else {
      // No specific concern - do a general check based on patterns
      const assessment = assessCurrentSituation(context);
      console.log(chalk.cyan(assessment.message));
      
      if (assessment.suggestion) {
        console.log();
        console.log(chalk.dim(assessment.suggestion));
      }
    }
    
    // Always end with calm encouragement
    console.log();
    console.log(chalk.dim('Take your time. We\'ll continue when you\'re ready.'));
    
    // Log for pattern recognition
    if (concern) {
      await logVibecheck(ginkoDir, concern, context);
    }
    
  } catch (error) {
    // Even errors should maintain the calm vibe
    console.log(chalk.yellow('\n🎯 Vibecheck\n'));
    console.log(chalk.cyan('Let\'s pause for a moment. Something feels off.'));
    console.log(chalk.dim('\nTake a breath. What\'s your gut telling you?'));
  }
}

/**
 * Gather comprehensive situational context
 */
async function gatherSituationalContext(git: any, ginkoDir: string): Promise<SessionContext> {
  const status = await git.status();
  const log = await git.log({ maxCount: 20 });
  const mode = await detectWorkMode(status);
  
  // Analyze recent activity patterns
  const recentCommits = [...log.all].slice(0, 10);
  const uncommittedChanges = status.modified.length + status.not_added.length;
  
  // Detect work patterns
  const workPattern = analyzeWorkPattern(recentCommits, status);
  const failedAttempts = countFailedAttempts(recentCommits);
  const contextSaturation = estimateContextSaturation(ginkoDir);
  
  // Get last activity from session
  let lastActivity = 'Starting fresh';
  try {
    const sessionFiles = await fs.readdir(path.join(ginkoDir, 'sessions')).catch(() => []);
    for (const dir of sessionFiles) {
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
    mode,
    recentCommits,
    uncommittedChanges,
    lastActivity,
    workPattern,
    contextSaturation,
    failedAttempts
  };
}

/**
 * Generate situationally-aware response based on concern and context
 */
function generateAwareResponse(concern: string, context: SessionContext) {
  const concernLower = concern.toLowerCase();
  
  // Debugging situations
  if (context.mode === 'Debugging' || concernLower.includes('error') || concernLower.includes('bug')) {
    if (context.failedAttempts >= 3) {
      return {
        primary: 'We\'ve been at this for a while. Maybe we should try a different angle?',
        options: [
          'Step back and re-read the error message carefully',
          'Add some debug logging to understand the flow',
          'Take a 5-minute break and come back fresh',
          'Mark as BUG and move to something else'
        ],
        awareness: `${context.failedAttempts} similar attempts in recent commits`
      };
    }
    
    if (concernLower.includes('red') || concernLower.includes('error message')) {
      return {
        primary: 'I see the error too. Let\'s think about this systematically.',
        options: [
          'Read the full error stack',
          'Check if we introduced this recently',
          'Look for similar patterns we\'ve fixed before'
        ],
        awareness: 'Error detection in output'
      };
    }
    
    return {
      primary: 'Debugging can be frustrating. What specifically isn\'t working as expected?',
      options: [],
      awareness: 'Debugging mode active'
    };
  }
  
  // Lost/confused situations
  if (concernLower.includes('lost') || concernLower.includes('confused') || concernLower.includes('what')) {
    if (context.contextSaturation > 0.7) {
      return {
        primary: 'Our context might be getting cluttered. Should we clear our heads?',
        options: [
          'Create a quick handoff to summarize where we are',
          'Run `ginko compact` to reduce context',
          'Just tell me the original goal again'
        ],
        awareness: 'High context saturation detected'
      };
    }
    
    return {
      primary: `Let\'s recenter. We were: "${context.lastActivity}". Still the goal?`,
      options: [
        'Yes, let\'s refocus on that',
        'Actually, priorities have changed',
        'I need to rethink the approach'
      ],
      awareness: 'Checking alignment with original goal'
    };
  }
  
  // Complexity/overthinking situations
  if (concernLower.includes('complex') || concernLower.includes('complicated') || concernLower.includes('over')) {
    return {
      primary: 'You\'re right to pause. Complexity is a smell.',
      options: [
        'What\'s the simplest thing that could work?',
        'Can we break this into smaller steps?',
        'Should we ship what works and iterate?'
      ],
      awareness: `${context.uncommittedChanges} uncommitted changes might indicate overthinking`
    };
  }
  
  // Progress check situations
  if (concernLower.includes('progress') || concernLower.includes('right') || concernLower.includes('should')) {
    if (context.workPattern === 'steady') {
      return {
        primary: 'We\'re making steady progress. Trust the process.',
        options: [],
        awareness: 'Consistent commit pattern detected'
      };
    }
    
    return {
      primary: 'Let me check... ' + (context.failedAttempts > 1 ? 
        'We might be spinning. Time to try something different?' : 
        'We\'re on track. What\'s making you uncertain?'),
      options: [],
      awareness: `Work pattern: ${context.workPattern}`
    };
  }
  
  // Stuck/blocked situations
  if (concernLower.includes('stuck') || concernLower.includes('blocked')) {
    return {
      primary: 'Being stuck is information. What\'s the specific blocker?',
      options: [
        'Missing information or documentation',
        'Technical issue I can\'t resolve',
        'Unclear requirements',
        'Need to wait for something external'
      ],
      awareness: 'Detecting blockage pattern'
    };
  }
  
  // Time pressure situations
  if (concernLower.includes('taking too long') || concernLower.includes('slow')) {
    return {
      primary: 'Progress over perfection. What\'s the MVP here?',
      options: [
        'Ship what works, improve later',
        'Cut scope to essential features',
        'This actually needs the full time'
      ],
      awareness: 'Time concern detected'
    };
  }
  
  // Default: open-ended support
  return {
    primary: 'I\'m listening. What\'s on your mind?',
    options: [],
    awareness: 'Open conversation mode'
  };
}

/**
 * Assess situation when no specific concern is provided
 */
function assessCurrentSituation(context: SessionContext) {
  // Multiple failed attempts
  if (context.failedAttempts >= 3) {
    return {
      message: 'I notice we\'ve had a few failed attempts. Everything okay?',
      suggestion: 'Sometimes a fresh perspective helps.'
    };
  }
  
  // Many uncommitted changes
  if (context.uncommittedChanges > 15) {
    return {
      message: 'That\'s a lot of uncommitted changes. Feeling overwhelmed?',
      suggestion: 'Maybe we should commit what works and continue?'
    };
  }
  
  // High context saturation
  if (context.contextSaturation > 0.8) {
    return {
      message: 'Our context is getting pretty full. Still focused?',
      suggestion: 'Consider `ginko compact` if things feel cluttered.'
    };
  }
  
  // Debugging for a while
  if (context.mode === 'Debugging' && context.workPattern === 'thrashing') {
    return {
      message: 'We\'ve been debugging for a bit. Need a different approach?',
      suggestion: 'Sometimes stepping away briefly helps.'
    };
  }
  
  // Everything seems fine
  return {
    message: 'Just checking in. How are things going?',
    suggestion: null
  };
}

/**
 * Analyze work patterns from commits and status
 */
function analyzeWorkPattern(commits: any[], status: any): string {
  if (commits.length < 3) return 'just-started';
  
  const messages = commits.map(c => c.message.toLowerCase());
  const hasFixCommits = messages.filter(m => m.includes('fix')).length;
  const hasWIPCommits = messages.filter(m => m.includes('wip') || m.includes('temp')).length;
  
  // Detect thrashing (repeated attempts at same thing)
  const similarMessages = messages.filter((m, i) => 
    messages.slice(i + 1).some(other => similar(m, other))
  ).length;
  
  if (similarMessages > 3) return 'thrashing';
  if (hasFixCommits > commits.length / 2) return 'debugging';
  if (hasWIPCommits > 2) return 'exploring';
  if (status.modified.length > 10) return 'heavy-changes';
  
  return 'steady';
}

/**
 * Count failed attempts from commit patterns
 */
function countFailedAttempts(commits: any[]): number {
  const messages = commits.map(c => c.message.toLowerCase());
  let count = 0;
  
  for (const msg of messages) {
    if (msg.includes('fix') || msg.includes('retry') || msg.includes('attempt') || 
        msg.includes('revert') || msg.includes('still') || msg.includes('again')) {
      count++;
    }
  }
  
  return count;
}

/**
 * Estimate context saturation (0-1)
 */
function estimateContextSaturation(ginkoDir: string): number {
  // This is a simplified estimation
  // In reality, would check context file sizes, module count, etc.
  try {
    const contextPath = path.join(ginkoDir, 'context');
    if (!fs.pathExistsSync(contextPath)) return 0;
    
    const modules = fs.readdirSync(path.join(contextPath, 'modules')).length;
    // Assume saturation increases with module count
    return Math.min(modules / 20, 1);
  } catch {
    return 0.5; // Default middle ground
  }
}

/**
 * Simple string similarity check
 */
function similar(a: string, b: string): boolean {
  const wordsA = a.split(/\s+/);
  const wordsB = b.split(/\s+/);
  const common = wordsA.filter(w => wordsB.includes(w)).length;
  return common > Math.min(wordsA.length, wordsB.length) * 0.5;
}

/**
 * Log vibecheck for pattern analysis
 */
async function logVibecheck(ginkoDir: string, concern: string, context: SessionContext): Promise<void> {
  try {
    const logFile = path.join(ginkoDir, 'sessions', 'vibechecks.log');
    const entry = {
      timestamp: new Date().toISOString(),
      concern,
      mode: context.mode,
      pattern: context.workPattern,
      failedAttempts: context.failedAttempts
    };
    await fs.appendFile(logFile, JSON.stringify(entry) + '\n');
  } catch {
    // Silent fail for logging
  }
}

export { vibecheckAwareCommand as vibecheckCommand };