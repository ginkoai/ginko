/**
 * @fileType: command
 * @status: current
 * @updated: 2025-08-28
 * @tags: [cli, start, session, git-native, context-aware]
 * @priority: high
 * @complexity: medium
 * @dependencies: [chalk, fs-extra, simple-git]
 */

import chalk from 'chalk';
import fs from 'fs-extra';
import path from 'path';
import ora from 'ora';
import simpleGit from 'simple-git';
import { getUserEmail, getGinkoDir, formatTimeAgo, detectWorkMode } from '../utils/helpers.js';

interface StartOptions {
  verbose?: boolean;
  minimal?: boolean;
}

/**
 * Enhanced start command - fully git-native, context-aware session initialization
 */
export async function startEnhancedCommand(sessionId?: string, options: StartOptions = {}) {
  const spinner = options.minimal ? null : ora('Starting session...').start();
  
  try {
    const ginkoDir = await getGinkoDir();
    const userEmail = await getUserEmail();
    const userSlug = userEmail.replace('@', '-at-').replace(/\./g, '-');
    const sessionDir = path.join(ginkoDir, 'sessions', userSlug);
    const git = simpleGit();
    
    // Ensure session directory exists
    await fs.ensureDir(sessionDir);
    await fs.ensureDir(path.join(sessionDir, 'archive'));
    
    // Load or create session
    const currentHandoff = path.join(sessionDir, 'current.md');
    let handoffContent = null;
    let lastSession = null;
    let isNewSession = true;
    
    if (await fs.pathExists(currentHandoff)) {
      handoffContent = await fs.readFile(currentHandoff, 'utf8');
      const stats = await fs.stat(currentHandoff);
      lastSession = stats.mtime;
      isNewSession = false;
    }
    
    // Load specific session if requested
    if (sessionId) {
      const archiveFile = path.join(sessionDir, 'archive', `${sessionId}.md`);
      if (await fs.pathExists(archiveFile)) {
        handoffContent = await fs.readFile(archiveFile, 'utf8');
        if (spinner) spinner.text = `Loading session ${sessionId}`;
      } else {
        if (spinner) spinner.fail(`Session not found: ${sessionId}`);
        console.error(chalk.red(`No session found with ID: ${sessionId}`));
        process.exit(1);
      }
    }
    
    // Get current git status
    const status = await git.status();
    const branch = await git.branchLocal();
    const mode = await detectWorkMode(status);
    
    if (spinner) spinner.succeed('Session loaded');
    
    // Display welcome message
    console.log();
    if (isNewSession) {
      console.log(chalk.green('✨ Starting new session'));
    } else {
      console.log(chalk.green('✨ Welcome back!'));
      if (lastSession) {
        console.log(chalk.dim(`📅 Last session: ${formatTimeAgo(lastSession)}`));
      }
    }
    
    // Display current state
    console.log(chalk.dim(`🌿 Branch: ${branch.current}`));
    console.log(chalk.dim(`📝 Mode: ${mode}`));
    
    // Load and display relevant context modules
    const contextModules = await loadRelevantContext(ginkoDir, status, options.verbose || false);
    if (contextModules.length > 0) {
      console.log();
      console.log(chalk.bold('📚 Loaded context modules:'));
      contextModules.forEach(module => {
        console.log(chalk.dim(`  • ${module.name}: ${module.summary}`));
      });
    }
    
    // Extract key information from handoff
    if (handoffContent && !options.minimal) {
      const summary = extractFromHandoff(handoffContent, 'Session Summary');
      const nextSteps = extractFromHandoff(handoffContent, 'Next Steps');
      
      if (summary) {
        console.log();
        console.log(chalk.bold('🎯 Continue with:'), chalk.cyan(summary));
      }
      
      if (nextSteps) {
        console.log();
        console.log(chalk.bold('Next steps from last session:'));
        nextSteps.split('\n').filter(line => line.trim()).slice(0, 3).forEach(step => {
          console.log(chalk.dim(`  ${step.trim()}`));
        });
      }
    }
    
    // Check for uncommitted changes in .ginko directory
    const ginkoStatus = await git.status(['.ginko']);
    if (ginkoStatus.modified.length > 0 || ginkoStatus.not_added.length > 0) {
      console.log();
      console.log(chalk.yellow('⚠️  Uncommitted session files detected'));
      console.log(chalk.dim('   Consider: git add .ginko && git commit -m "Session progress"'));
    }
    
    // Load best practices if they exist
    const bestPracticesPath = path.join(ginkoDir, 'best-practices.md');
    if (await fs.pathExists(bestPracticesPath) && options.verbose) {
      const practices = await fs.readFile(bestPracticesPath, 'utf8');
      const criticalPractices = extractCriticalPractices(practices);
      if (criticalPractices.length > 0) {
        console.log();
        console.log(chalk.bold('📋 Remember:'));
        criticalPractices.forEach(practice => {
          console.log(chalk.dim(`  • ${practice}`));
        });
      }
    }
    
    // Output concise action prompt
    console.log();
    if (isNewSession) {
      console.log(chalk.dim('💡 Tip: Run'), chalk.cyan('ginko capture'), chalk.dim('to save insights as you work'));
    } else {
      console.log(chalk.dim('💡 Tip: Run'), chalk.cyan('ginko handoff'), chalk.dim('to save progress before stopping'));
    }
    
    // Save session start time
    const sessionStartPath = path.join(sessionDir, '.session-start');
    await fs.writeFile(sessionStartPath, new Date().toISOString());
    
    // If verbose, show full handoff content
    if (options.verbose && handoffContent) {
      console.log();
      console.log(chalk.dim('--- Full handoff ---'));
      console.log(handoffContent);
      console.log(chalk.dim('--- End handoff ---'));
    }
    
  } catch (error) {
    if (spinner) spinner.fail('Failed to start session');
    console.error(chalk.red('Error:'), error instanceof Error ? error.message : String(error));
    process.exit(1);
  }
}

interface ContextModule {
  name: string;
  summary: string;
  score: number;
  type?: string;
}

/**
 * Load context modules relevant to current work
 */
async function loadRelevantContext(ginkoDir: string, status: any, verbose: boolean): Promise<ContextModule[]> {
  const contextDir = path.join(ginkoDir, 'context', 'modules');
  const modules: ContextModule[] = [];
  
  if (!await fs.pathExists(contextDir)) {
    return modules;
  }
  
  try {
    const files = await fs.readdir(contextDir);
    const modifiedFiles = new Set(status.modified);
    
    // Score each module by relevance
    const scoredModules: (ContextModule | null)[] = await Promise.all(files.map(async file => {
      if (!file.endsWith('.md')) return null;
      
      const content = await fs.readFile(path.join(contextDir, file), 'utf8');
      const frontmatter = extractFrontmatter(content);
      
      // Calculate relevance score
      let score = 0;
      
      // Check if module relates to modified files
      if (frontmatter.area) {
        for (const modified of modifiedFiles) {
          if (typeof modified === 'string' && modified.includes(frontmatter.area)) {
            score += 10;
          }
        }
      }
      
      // Prioritize by recency
      if (frontmatter.updated) {
        const daysSince = Math.floor((Date.now() - new Date(frontmatter.updated).getTime()) / (1000 * 60 * 60 * 24));
        if (daysSince < 1) score += 5;
        else if (daysSince < 7) score += 2;
      }
      
      // Prioritize by type
      if (frontmatter.type === 'gotcha') score += 3;
      if (frontmatter.type === 'pattern') score += 2;
      
      const module: ContextModule = {
        name: file.replace('.md', ''),
        summary: frontmatter.summary || extractFirstLine(content),
        score,
        type: frontmatter.type
      };
      
      return module;
    }));
    
    // Filter and sort by relevance
    const filtered = scoredModules.filter((m): m is ContextModule => m !== null && m.score > 0);
    const sorted = filtered.sort((a, b) => b.score - a.score);
    const relevant = sorted.slice(0, verbose ? 10 : 5);
    
    return relevant;
    
  } catch (error) {
    // Silently fail - context loading is not critical
    return modules;
  }
}

/**
 * Extract specific section from handoff content
 */
function extractFromHandoff(content: string, section: string): string | null {
  const regex = new RegExp(`##[^#]*${section}\\n([^#]+)`, 'i');
  const match = content.match(regex);
  return match ? match[1].trim() : null;
}

/**
 * Extract frontmatter from markdown file
 */
function extractFrontmatter(content: string): any {
  const frontmatterMatch = content.match(/^---\n([\s\S]*?)\n---/);
  if (!frontmatterMatch) return {};
  
  const frontmatter: any = {};
  const lines = frontmatterMatch[1].split('\n');
  
  lines.forEach(line => {
    const [key, value] = line.split(':').map(s => s.trim());
    if (key && value) {
      frontmatter[key] = value;
    }
  });
  
  return frontmatter;
}

/**
 * Extract first meaningful line from content
 */
function extractFirstLine(content: string): string {
  const lines = content.split('\n');
  for (const line of lines) {
    const trimmed = line.trim();
    if (trimmed && !trimmed.startsWith('#') && !trimmed.startsWith('---')) {
      return trimmed.slice(0, 80) + (trimmed.length > 80 ? '...' : '');
    }
  }
  return 'Context module';
}

/**
 * Extract critical practices from best practices file
 */
function extractCriticalPractices(content: string): string[] {
  const practices = [];
  const lines = content.split('\n');
  
  for (const line of lines) {
    if (line.includes('ALWAYS') || line.includes('NEVER') || line.includes('MUST')) {
      const practice = line.replace(/^[\s\-\*]+/, '').trim();
      if (practice.length > 0 && practice.length < 100) {
        practices.push(practice);
      }
    }
  }
  
  return practices.slice(0, 3); // Top 3 critical practices
}

export { startEnhancedCommand as startCommand };