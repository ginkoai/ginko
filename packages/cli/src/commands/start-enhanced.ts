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
import { ContextSearch, SearchResult } from '../services/context-search.js';

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
    
    // Load and display relevant context modules with enhanced search
    const contextModules = await loadEnhancedContext(
      ginkoDir, 
      {
        branch: branch.current,
        status,
        mode,
        previousErrors: extractErrorsFromHandoff(handoffContent),
        verbose: options.verbose || false
      }
    );
    
    if (contextModules.length > 0 && !options.minimal) {
      console.log();
      console.log(chalk.bold('📚 Loaded context modules:'));
      
      // Display modules with relevance indicators
      contextModules.forEach((result, index) => {
        const module = result.module;
        const relevanceIcon = getRelevanceIcon(module.relevance || 'medium');
        const typeIcon = getTypeIcon(module.type);
        
        console.log(chalk.dim(`  ${typeIcon} ${module.title || module.filename}`));
        
        // Show relevance reason
        if (options.verbose && result.matches) {
          const reasons = [];
          if (result.matches.tags?.length) {
            reasons.push(`tags: ${result.matches.tags.join(', ')}`);
          }
          if (result.matches.branch) {
            reasons.push('branch match');
          }
          if (result.matches.error) {
            reasons.push('error pattern');
          }
          if (reasons.length > 0) {
            console.log(chalk.dim(`     → ${reasons.join(', ')}`));
          }
        }
      });
      
      // Show quick tip from top module
      if (contextModules.length > 0) {
        const topModule = contextModules[0].module;
        const tip = await extractQuickTip(ginkoDir, topModule.filename);
        if (tip) {
          console.log();
          console.log(chalk.cyan('💡 Quick tip from ' + topModule.filename.replace('.md', '') + ':'));
          console.log(chalk.dim(`   "${tip}"`));
        }
      }
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
 * Load relevant context modules using enhanced search
 */
async function loadEnhancedContext(
  ginkoDir: string, 
  context: {
    branch: string;
    status: any;
    mode: string;
    previousErrors?: string[];
    verbose: boolean;
  }
): Promise<SearchResult[]> {
  try {
    const search = new ContextSearch(ginkoDir);
    await search.loadIndex();
    
    // Build search context
    const searchContext: any = {
      branch: context.branch,
      files: [...(context.status.modified || []), ...(context.status.created || [])]
    };
    
    // Add error patterns if available
    if (context.previousErrors && context.previousErrors.length > 0) {
      searchContext.errors = context.previousErrors;
    }
    
    // Get relevant modules
    let relevantModules = await search.getRelevantModules(searchContext);
    
    // If no relevant modules found, get recent high-relevance modules
    if (relevantModules.length === 0) {
      const allModules = await search.search({ 
        relevance: 'medium',
        limit: context.verbose ? 10 : 5 
      });
      relevantModules = allModules.map(r => r.module);
    }
    
    // Convert to SearchResult format for consistency
    const results: SearchResult[] = relevantModules.map(module => ({
      module,
      score: calculateContextScore(module, context),
      matches: {
        branch: module.tags?.some(tag => 
          context.branch.toLowerCase().includes(tag.toLowerCase())
        ),
        error: context.previousErrors?.some(error =>
          module.tags?.some(tag => error.toLowerCase().includes(tag.toLowerCase()))
        ),
        tags: module.tags?.filter(tag => 
          searchContext.files?.some((file: string) => 
            file.toLowerCase().includes(tag.toLowerCase())
          )
        )
      }
    }));
    
    // Sort by score and limit
    results.sort((a, b) => b.score - a.score);
    const limit = context.verbose ? 10 : 5;
    
    return results.slice(0, limit);
    
  } catch (error) {
    // Fallback to basic loading if search fails
    return loadBasicContext(ginkoDir, context.status, context.verbose);
  }
}

/**
 * Fallback to basic context loading (original implementation)
 */
async function loadBasicContext(ginkoDir: string, status: any, verbose: boolean): Promise<SearchResult[]> {
  const contextDir = path.join(ginkoDir, 'context', 'modules');
  
  if (!await fs.pathExists(contextDir)) {
    return [];
  }
  
  try {
    const files = await fs.readdir(contextDir);
    const results: SearchResult[] = [];
    
    for (const file of files.slice(0, verbose ? 10 : 5)) {
      if (!file.endsWith('.md')) continue;
      
      const content = await fs.readFile(path.join(contextDir, file), 'utf8');
      const frontmatter = extractFrontmatter(content);
      
      results.push({
        module: {
          filename: file,
          type: frontmatter.type || 'pattern',
          tags: frontmatter.tags?.split(',').map((t: string) => t.trim()) || [],
          relevance: frontmatter.relevance || 'medium',
          created: frontmatter.created,
          title: extractFirstLine(content)
        },
        score: 1,
        matches: {}
      });
    }
    
    return results;
  } catch (error) {
    return [];
  }
}

/**
 * Calculate context-specific relevance score
 */
function calculateContextScore(module: any, context: any): number {
  let score = 0;
  
  // Relevance level scoring
  const relevanceScores: Record<string, number> = {
    'critical': 10,
    'high': 7,
    'medium': 4,
    'low': 2
  };
  score += relevanceScores[module.relevance || 'medium'];
  
  // Type scoring based on work mode
  if (context.mode === 'debugging' && module.type === 'gotcha') {
    score += 5;
  } else if (context.mode === 'developing' && module.type === 'pattern') {
    score += 4;
  } else if (context.mode === 'exploring' && module.type === 'architecture') {
    score += 3;
  }
  
  // Recency bonus
  if (module.created) {
    const daysSince = Math.floor(
      (Date.now() - new Date(module.created).getTime()) / (1000 * 60 * 60 * 24)
    );
    if (daysSince < 1) score += 5;
    else if (daysSince < 7) score += 2;
  }
  
  // Branch name matching
  if (module.tags && context.branch) {
    const branchWords = context.branch.toLowerCase().split(/[-_\/]/);
    const matchingTags = module.tags.filter((tag: string) => 
      branchWords.includes(tag.toLowerCase())
    );
    score += matchingTags.length * 2;
  }
  
  return score;
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
 * Extract errors from previous handoff
 */
function extractErrorsFromHandoff(handoffContent: string | null): string[] {
  if (!handoffContent) return [];
  
  const errors: string[] = [];
  const errorSection = extractFromHandoff(handoffContent, 'Known Issues');
  
  if (errorSection) {
    // Extract error patterns from the known issues
    const lines = errorSection.split('\n');
    lines.forEach(line => {
      if (line.includes('error') || line.includes('Error') || line.includes('failed')) {
        errors.push(line);
      }
    });
  }
  
  return errors;
}

/**
 * Get icon for relevance level
 */
function getRelevanceIcon(relevance: string): string {
  const icons: Record<string, string> = {
    'critical': '🔴',
    'high': '🟠',
    'medium': '🟡',
    'low': '⚪'
  };
  return icons[relevance] || '⚪';
}

/**
 * Get icon for insight type
 */
function getTypeIcon(type: string): string {
  const icons: Record<string, string> = {
    'gotcha': '⚠️',
    'pattern': '📐',
    'decision': '🎯',
    'discovery': '💡',
    'optimization': '⚡',
    'workaround': '🔧',
    'configuration': '⚙️',
    'architecture': '🏗️'
  };
  return icons[type] || '📄';
}

/**
 * Extract quick tip from module
 */
async function extractQuickTip(ginkoDir: string, filename: string): Promise<string | null> {
  try {
    const filepath = path.join(ginkoDir, 'context', 'modules', filename);
    const content = await fs.readFile(filepath, 'utf8');
    
    // Try to extract the solution or key insight
    const solutionMatch = content.match(/## (?:The )?Solution\n\n([^\n]+)/);
    if (solutionMatch) {
      return solutionMatch[1].trim();
    }
    
    // Try to extract "How to Avoid"
    const avoidMatch = content.match(/## How to Avoid\n\n([^\n]+)/);
    if (avoidMatch) {
      return avoidMatch[1].trim();
    }
    
    // Try to extract first line of problem
    const problemMatch = content.match(/## (?:The )?(?:Problem|Gotcha)\n\n([^\n]+)/);
    if (problemMatch) {
      return problemMatch[1].trim();
    }
    
    return null;
  } catch (error) {
    return null;
  }
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