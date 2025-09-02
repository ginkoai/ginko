/**
 * @fileType: command
 * @status: current
 * @updated: 2025-08-28
 * @tags: [cli, vibecheck, ai-enhanced, recalibration]
 * @related: [vibecheck.ts, ../utils/ai-templates.ts]
 * @priority: medium
 * @complexity: medium
 * @dependencies: [chalk, fs-extra, simple-git]
 */

import chalk from 'chalk';
import fs from 'fs-extra';
import path from 'path';
import simpleGit from 'simple-git';
import { getGinkoDir, getUserEmail } from '../utils/helpers.js';
import { 
  AI_PROCESSING_EXIT_CODE,
  generateCompletionPrompt,
  validateEnrichedContent,
  TEMPLATES
} from '../utils/ai-templates.js';

interface VibecheckOptions {
  concern?: string;
  store?: boolean;
  id?: string;
  content?: string;
  ai?: boolean;
  quick?: boolean;
  verbose?: boolean;
}

/**
 * AI-enhanced vibecheck command for intelligent recalibration
 */
export async function vibecheckAiCommand(concern: string | undefined, options: VibecheckOptions) {
  // Phase 2: Store AI-enriched vibecheck analysis
  if (options.store && options.id && options.content) {
    return storeEnrichedVibecheck(options.id, options.content);
  }

  // Phase 1: Generate vibecheck template
  try {
    const ginkoDir = await getGinkoDir();
    const git = simpleGit();
    const vibecheckId = `vibecheck-${Date.now()}`;
    
    // Quick mode: basic vibecheck without AI
    if (options.quick || options.ai === false) {
      // Fall back to original vibecheck behavior
      const { vibecheckCommand } = await import('./vibecheck.js');
      return vibecheckCommand(concern);
    }
    
    // Gather context for AI analysis
    const status = await git.status();
    const log = await git.log({ maxCount: 20 });
    const diff = await git.diff(['--stat']);
    
    // Load current session
    const sessionDir = path.join(ginkoDir, 'sessions');
    const userDirs = await fs.readdir(sessionDir).catch(() => []);
    let currentHandoff = null;
    let currentMode = 'Unknown';
    let lastActivity = 'No recent activity';
    
    for (const userDir of userDirs) {
      const handoffPath = path.join(sessionDir, userDir, 'current.md');
      if (await fs.pathExists(handoffPath)) {
        currentHandoff = await fs.readFile(handoffPath, 'utf8');
        const modeMatch = currentHandoff.match(/mode: ([^\n]+)/);
        const summaryMatch = currentHandoff.match(/## 📊 Session Summary\n([^\n]+)/);
        if (modeMatch) currentMode = modeMatch[1];
        if (summaryMatch) lastActivity = summaryMatch[1];
        break;
      }
    }
    
    // Analyze recent work patterns
    const recentFiles = [...status.modified, ...status.staged].slice(0, 10);
    const commitFrequency = analyzeCommitFrequency([...log.all]);
    const workPattern = detectWorkPattern([...log.all], status);
    
    // Generate AI vibecheck template
    const template = generateVibecheckTemplate({
      concern,
      currentMode,
      lastActivity,
      recentFiles,
      commitFrequency,
      workPattern,
      status,
      vibecheckId
    });
    
    if (options.verbose) {
      console.log(chalk.dim('Generating vibecheck analysis...'));
    }
    
    // Output template and prompt for AI (to stdout to avoid stderr)
    process.stdout.write(chalk.yellow('\n🎯 AI-Enhanced Vibecheck\n\n'));
    process.stdout.write(template.content + '\n');
    process.stdout.write(chalk.dim('---\n'));
    process.stdout.write(template.prompt + '\n');
    process.stdout.write(chalk.dim(`\nWhen complete, call:\nginko vibecheck --store --id=${vibecheckId} --content="[enriched analysis]"\n\n`));
    
    // Store template temporarily
    const tempDir = path.join(ginkoDir, '.temp');
    await fs.ensureDir(tempDir);
    const tempFile = path.join(tempDir, `${vibecheckId}.tmp`);
    await fs.writeFile(tempFile, template.content);
    
    // Ensure stdout is flushed before exit
    await new Promise(resolve => process.stdout.write('', resolve));
    
    // Exit with code 0 to avoid stderr interpretation
    // The AI prompt is expected behavior, not an error
    process.exit(0);
    
  } catch (error) {
    console.error(chalk.red('Error:'), error instanceof Error ? error.message : String(error));
    process.exit(1);
  }
}

/**
 * Phase 2: Store AI-enriched vibecheck analysis
 */
async function storeEnrichedVibecheck(id: string, content: string): Promise<void> {
  try {
    const ginkoDir = await getGinkoDir();
    const vibecheckDir = path.join(ginkoDir, 'sessions', 'vibechecks');
    await fs.ensureDir(vibecheckDir);
    
    // Save enriched vibecheck
    const timestamp = new Date().toISOString().split('T')[0];
    const vibecheckFile = path.join(vibecheckDir, `${timestamp}-${id}.md`);
    await fs.writeFile(vibecheckFile, content);
    
    // Display key insights from AI analysis
    console.log(chalk.yellow('\n🎯 Vibecheck Analysis Complete\n'));
    
    // Extract and display key sections
    const alignmentMatch = content.match(/## 🎯 Alignment Assessment\n([\s\S]*?)##/);
    const recommendMatch = content.match(/## 🚀 Recommended Actions\n([\s\S]*?)##/);
    
    if (alignmentMatch) {
      console.log(chalk.bold('Alignment Assessment:'));
      console.log(alignmentMatch[1].trim());
    }
    
    if (recommendMatch) {
      console.log(chalk.bold('\nRecommended Actions:'));
      console.log(recommendMatch[1].trim());
    }
    
    // Clean up temp file
    const tempFile = path.join(ginkoDir, '.temp', `${id}.tmp`);
    await fs.remove(tempFile).catch(() => {});
    
    console.log(chalk.dim('\nVibecheck saved to .ginko/sessions/vibechecks/'));
    console.log(chalk.green('✅ Ready to realign and continue'));
    
  } catch (error) {
    console.error(chalk.red('Error storing vibecheck:'), error instanceof Error ? error.message : String(error));
    process.exit(1);
  }
}

/**
 * Generate vibecheck template for AI enhancement
 */
function generateVibecheckTemplate(context: any) {
  const timestamp = new Date().toISOString();
  
  const content = `---
type: vibecheck
timestamp: ${timestamp}
concern: ${context.concern || 'General alignment check'}
mode: ${context.currentMode}
---

# 🎯 Vibecheck Analysis

## 📊 Current Situation
- **Work Mode**: ${context.currentMode}
- **Last Activity**: ${context.lastActivity}
- **Modified Files**: ${context.recentFiles.length}
- **Commit Frequency**: ${context.commitFrequency}
- **Work Pattern**: ${context.workPattern}

## 💭 Concern
${context.concern || '[AI: Based on the work patterns and current state, identify potential concerns or areas needing recalibration]'}

## 🎯 Alignment Assessment
[AI: Analyze whether the current work aligns with stated goals and identify any drift or misalignment]

### Are we solving the right problem?
[AI: Assess based on recent commits and changes]

### Is this the simplest approach?
[AI: Evaluate complexity based on files modified and patterns observed]

### Have requirements changed?
[AI: Look for signs of scope creep or pivoting in recent work]

## 🔍 Pattern Analysis
[AI: Identify patterns in the work that might indicate issues:
- Repeated edits to same files (thrashing)
- Long gaps between commits (stuck)
- Many small commits (uncertainty)
- Touching many unrelated files (lack of focus)]

## 💡 Root Cause Analysis
[AI: Based on the concern and patterns, identify likely root causes]

## 🚀 Recommended Actions
[AI: Provide 3-5 specific, actionable recommendations to address the concern and realign]

1. Immediate action to unblock
2. Medium-term adjustment
3. Process improvement

## 🎬 Next Single Step
[AI: The ONE most important thing to do right now to move forward]

## 🧠 Mental Model Adjustment
[AI: Suggest how to reframe the problem or approach for better clarity]

---
Vibecheck complete. Ready to realign.`;

  const enhancementContext = {
    command: 'vibecheck',
    id: context.vibecheckId,
    data: {
      concern: context.concern,
      mode: context.currentMode,
      files: context.recentFiles,
      status: context.status,
      pattern: context.workPattern
    }
  };

  const prompt = generateCompletionPrompt(enhancementContext, content);

  return { content, prompt };
}

/**
 * Analyze commit frequency patterns
 */
function analyzeCommitFrequency(commits: any[]): string {
  if (commits.length < 2) return 'Insufficient data';
  
  const times = commits.map(c => new Date(c.date).getTime());
  const gaps = [];
  
  for (let i = 1; i < times.length; i++) {
    gaps.push(times[i - 1] - times[i]);
  }
  
  const avgGap = gaps.reduce((a, b) => a + b, 0) / gaps.length;
  const hours = avgGap / (1000 * 60 * 60);
  
  if (hours < 1) return 'Very frequent (< 1hr between commits)';
  if (hours < 4) return 'Frequent (1-4hr between commits)';
  if (hours < 24) return 'Regular (same day commits)';
  if (hours < 72) return 'Spaced (multi-day gaps)';
  return 'Sparse (long gaps between commits)';
}

/**
 * Detect work patterns from commits and status
 */
function detectWorkPattern(commits: any[], status: any): string {
  const recentMessages = commits.slice(0, 5).map(c => c.message.toLowerCase());
  
  // Look for patterns in commit messages
  const hasFixCommits = recentMessages.filter(m => m.includes('fix')).length > 2;
  const hasWIPCommits = recentMessages.filter(m => m.includes('wip') || m.includes('progress')).length > 0;
  const hasRefactoring = recentMessages.filter(m => m.includes('refactor')).length > 0;
  const hasDocs = recentMessages.filter(m => m.includes('doc')).length > 0;
  
  // Analyze file changes
  const manyModified = status.modified.length > 10;
  const hasConflicts = status.conflicted.length > 0;
  
  if (hasConflicts) return 'Merge conflicts present';
  if (hasFixCommits) return 'Bug fixing mode';
  if (hasWIPCommits) return 'Work in progress';
  if (hasRefactoring) return 'Refactoring';
  if (hasDocs) return 'Documentation';
  if (manyModified) return 'Large changes in progress';
  
  return 'Regular development';
}