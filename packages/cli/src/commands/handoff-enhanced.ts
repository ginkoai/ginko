/**
 * @fileType: command
 * @status: current
 * @updated: 2025-09-09
 * @tags: [cli, handoff, ai-enhanced, auto-capture, insights]
 * @related: [handoff-ai.ts, ../services/insight-extractor.ts, ../services/module-generator.ts]
 * @priority: critical
 * @complexity: high
 * @dependencies: [chalk, fs-extra, ora, simple-git]
 */

import chalk from 'chalk';
import fs from 'fs-extra';
import path from 'path';
import ora from 'ora';
import simpleGit from 'simple-git';
import { getUserEmail, getGinkoDir, detectWorkMode } from '../utils/helpers.js';
import { SessionCollector } from '../utils/session-collector.js';
import { InsightExtractor } from '../services/insight-extractor.js';
import { ModuleGenerator, GenerationResult } from '../services/module-generator.js';
import { 
  SessionData,
  SessionInsight,
  ContextModule,
  ExtractionOptions
} from '../types/session.js';

interface EnhancedHandoffOptions {
  message?: string;
  capture?: boolean;  // Enable auto-capture (default: true)
  quick?: boolean;    // Skip AI enhancement
  review?: boolean;   // Review insights before saving
  verbose?: boolean;  // Show detailed progress
  maxInsights?: number; // Max insights to capture
}

/**
 * Enhanced handoff with automatic context capture
 * Following FEATURE-018 specification
 */
export async function enhancedHandoffCommand(options: EnhancedHandoffOptions = {}) {
  const spinner = options.verbose ? ora('Initializing enhanced handoff...').start() : null;
  
  try {
    // Default to capture enabled
    const captureEnabled = options.capture !== false;
    
    // Initialize components
    const git = simpleGit();
    const ginkoDir = await getGinkoDir();
    const userEmail = await getUserEmail();
    const userSlug = userEmail.replace('@', '-at-').replace(/\./g, '-');
    const sessionDir = path.join(ginkoDir, 'sessions', userSlug);
    
    // Ensure directories exist
    await fs.ensureDir(sessionDir);
    
    // Step 1: Collect session data
    if (spinner) spinner.text = 'Collecting session data...';
    
    const collector = new SessionCollector();
    const previousHandoff = await getMostRecentHandoff(sessionDir);
    const sessionData = await collector.collectSessionData(userEmail, previousHandoff || undefined);
    
    if (options.verbose) {
      console.log(chalk.dim(`\n📊 Session: ${sessionData.duration} minutes, ${sessionData.filesChanged.length} files changed`));
    }
    
    // Step 2: Extract insights (if capture enabled)
    let insights: SessionInsight[] = [];
    let modules: ContextModule[] = [];
    
    if (captureEnabled && !options.quick) {
      if (spinner) spinner.text = 'Analyzing session for insights...';
      
      const extractor = new InsightExtractor();
      const extractionOptions: ExtractionOptions = {
        maxInsights: options.maxInsights || 6,
        verbose: options.verbose
      };
      
      const extractionResult = await extractor.extractInsights(sessionData, extractionOptions);
      insights = extractionResult.insights;
      
      if (options.verbose) {
        console.log(chalk.cyan(`\n💡 Found ${insights.length} valuable insights`));
        insights.forEach(insight => {
          console.log(chalk.dim(`  - ${insight.type}: ${insight.title}`));
        });
      }
      
      // Step 3: Review insights (if requested)
      if (options.review && insights.length > 0) {
        if (spinner) spinner.stop();
        
        console.log(chalk.cyan('\n📝 Review Insights Before Saving:\n'));
        
        for (const insight of insights) {
          console.log(chalk.yellow(`\n${insight.type.toUpperCase()}: ${insight.title}`));
          console.log(chalk.dim(`Problem: ${insight.problem}`));
          console.log(chalk.green(`Solution: ${insight.solution}`));
          console.log(chalk.blue(`Time saved: ${insight.timeSavingPotential} minutes`));
          console.log(chalk.gray(`Tags: ${insight.tags?.join(', ')}`));
        }
        
        console.log(chalk.cyan('\nPress Enter to continue or Ctrl+C to cancel...'));
        await waitForUserInput();
        
        if (spinner) spinner.start('Generating context modules...');
      }
      
      // Step 4: Generate context modules with quality control
      if (insights.length > 0) {
        if (spinner) spinner.text = 'Creating context modules...';
        
        const generator = new ModuleGenerator(ginkoDir);
        await generator.initialize();
        const generationResult = await generator.generateModules(insights);
        modules = generationResult.created;
        
        if (options.verbose) {
          console.log(chalk.cyan('\n📊 Module Generation Results:'));
          console.log(chalk.dim(generationResult.summary));
          
          if (modules.length > 0) {
            console.log(chalk.green(`\n✅ Created modules:`));
            generationResult.createdDetails.forEach(detail => {
              console.log(chalk.dim(`  - ${detail.module.filename} (quality: ${Math.round(detail.quality * 100)}%)`));
              if (detail.relatedModule) {
                console.log(chalk.dim(`    → ${detail.action}: ${detail.relatedModule}`));
              }
            });
          }
          
          if (generationResult.skipped.length > 0) {
            console.log(chalk.yellow(`\n⚠️  Skipped insights:`));
            generationResult.skipped.forEach(skip => {
              console.log(chalk.dim(`  - ${skip.insight.title}`));
              console.log(chalk.dim(`    Reason: ${skip.reason}`));
            });
          }
        } else if (insights.length > 0 && modules.length === 0) {
          // Inform user why no modules were created
          console.log(chalk.yellow('\n💡 No modules created - insights didn\'t meet quality thresholds'));
        }
      }
    }
    
    // Step 5: Generate enhanced handoff
    if (spinner) spinner.text = 'Creating enhanced handoff...';
    
    const handoffContent = await generateEnhancedHandoff({
      sessionData,
      insights,
      modules,
      message: options.message,
      userEmail,
      captureEnabled
    });
    
    // Step 6: Save handoff
    if (spinner) spinner.text = 'Saving handoff...';
    
    await saveEnhancedHandoff(sessionDir, handoffContent);
    
    // Step 7: Display summary
    if (spinner) spinner.succeed('Enhanced handoff complete!');
    
    if (!options.verbose) {
      console.log(chalk.dim('done'));
    } else {
      console.log(chalk.green('\n✨ Enhanced Handoff Summary:'));
      console.log(chalk.dim(`  - Session: ${sessionData.duration} minutes`));
      console.log(chalk.dim(`  - Files changed: ${sessionData.filesChanged.length}`));
      if (captureEnabled) {
        console.log(chalk.dim(`  - Insights captured: ${insights.length}`));
        console.log(chalk.dim(`  - Modules created: ${modules.length}`));
        
        const totalTimeSaved = insights.reduce((sum, i) => sum + i.timeSavingPotential, 0);
        console.log(chalk.cyan(`  - Future time saved: ${totalTimeSaved} minutes`));
      }
      console.log(chalk.dim(`  - Handoff saved to: ${path.join(sessionDir, 'current.md')}`));
    }
    
  } catch (error) {
    if (spinner) spinner.fail('Enhanced handoff failed');
    console.error(chalk.red('Error:'), error instanceof Error ? error.message : String(error));
    process.exit(1);
  }
}

/**
 * Generate enhanced handoff content with captured insights
 */
async function generateEnhancedHandoff(context: {
  sessionData: SessionData;
  insights: SessionInsight[];
  modules: ContextModule[];
  message?: string;
  userEmail: string;
  captureEnabled: boolean;
}): Promise<string> {
  const { sessionData, insights, modules, message, userEmail, captureEnabled } = context;
  const timestamp = new Date().toISOString();
  
  // Format insights section
  let insightsSection = '';
  if (captureEnabled && insights.length > 0) {
    insightsSection = `
## 💡 Captured Insights (${insights.length})

${insights.map(insight => `### ${insight.type}: ${insight.title}
**Problem**: ${insight.problem}
**Solution**: ${insight.solution}
**Impact**: Saves ${insight.timeSavingPotential} minutes | Reusability: ${Math.round(insight.reusabilityScore * 100)}%
**Module**: \`.ginko/context/modules/${modules.find(m => m.metadata.insightId === insight.id)?.filename}\`
`).join('\n')}`;
  }
  
  // Format modules section
  let modulesSection = '';
  if (modules.length > 0) {
    modulesSection = `
## 📁 Context Modules Created

${modules.map(module => `- \`${module.filename}\` (${module.metadata.type}, ${module.metadata.relevance} relevance)`).join('\n')}

These modules will be automatically loaded in future sessions to provide context.`;
  }
  
  // Build complete handoff
  return `---
session_id: ${Date.now()}
user: ${userEmail}
timestamp: ${timestamp}
mode: ${sessionData.workMode}
branch: ${sessionData.branch}
ai_enhanced: true
auto_capture: ${captureEnabled}
insights_captured: ${insights.length}
modules_created: ${modules.length}
---

# Enhanced Session Handoff

## 📊 Session Summary
${message || `Completed ${sessionData.duration} minute ${sessionData.workMode} session with automatic insight capture.`}

## 🎯 Key Achievements
- Modified ${sessionData.filesChanged.length} files
- ${sessionData.commits.length} new commits
${sessionData.testResults?.map(t => `- Tests: ${t.passed} passed, ${t.failed} failed`).join('\n') || ''}
${captureEnabled ? `- Captured ${insights.length} valuable insights for future reference` : ''}
${modules.length > 0 ? `- Created ${modules.length} reusable context modules` : ''}

## 🔄 Current State

### Git Status
- Branch: ${sessionData.branch}
- Files changed: ${sessionData.filesChanged.length}
- Commits this session: ${sessionData.commits.length}

### Changes Overview
${sessionData.filesChanged.slice(0, 10).map(f => `- ${f.path} (${f.status}, +${f.insertions}/-${f.deletions})`).join('\n')}
${sessionData.filesChanged.length > 10 ? `... and ${sessionData.filesChanged.length - 10} more files` : ''}
${insightsSection}
${modulesSection}

## 🚧 In Progress
${getInProgressWork(sessionData)}

## 📝 Context for Next Session

### Known Issues
${sessionData.errorLogs?.slice(0, 3).map(e => `- ${e.level}: ${e.message}`).join('\n') || '- No errors logged'}

### Next Steps
${generateNextSteps(sessionData, insights)}

## 🧠 Mental Model
${generateMentalModel(sessionData, insights)}

## 🔐 Privacy Note
This handoff and all captured insights are stored locally in git. No data is sent to external servers.

---
Generated at ${new Date().toLocaleString()}
Enhanced with automatic context capture (FEATURE-018)`;
}

/**
 * Get most recent handoff for context
 */
async function getMostRecentHandoff(sessionDir: string): Promise<string | null> {
  const currentPath = path.join(sessionDir, 'current.md');
  if (await fs.pathExists(currentPath)) {
    return fs.readFile(currentPath, 'utf8');
  }
  
  const archiveDir = path.join(sessionDir, 'archive');
  if (await fs.pathExists(archiveDir)) {
    const files = await fs.readdir(archiveDir);
    const handoffs = files
      .filter(f => f.endsWith('.md'))
      .sort()
      .reverse();
    
    if (handoffs.length > 0) {
      return fs.readFile(path.join(archiveDir, handoffs[0]), 'utf8');
    }
  }
  
  return null;
}

/**
 * Save enhanced handoff to filesystem
 */
async function saveEnhancedHandoff(sessionDir: string, content: string): Promise<void> {
  // Archive existing handoff if present
  const currentPath = path.join(sessionDir, 'current.md');
  if (await fs.pathExists(currentPath)) {
    const archiveDir = path.join(sessionDir, 'archive');
    await fs.ensureDir(archiveDir);
    
    const date = new Date().toISOString().split('T')[0];
    const archivePath = path.join(archiveDir, `${date}-handoff.md`);
    
    // Handle multiple handoffs on same day
    let counter = 1;
    let finalPath = archivePath;
    while (await fs.pathExists(finalPath)) {
      finalPath = path.join(archiveDir, `${date}-handoff-${counter}.md`);
      counter++;
    }
    
    await fs.move(currentPath, finalPath);
  }
  
  // Save new handoff
  await fs.writeFile(currentPath, content, 'utf8');
}

/**
 * Wait for user input (for review mode)
 */
async function waitForUserInput(): Promise<void> {
  return new Promise(resolve => {
    process.stdin.once('data', () => {
      resolve();
    });
  });
}

/**
 * Identify work in progress
 */
function getInProgressWork(sessionData: SessionData): string {
  const inProgress = [];
  
  if (sessionData.filesChanged.some(f => f.status === 'modified')) {
    inProgress.push('- Uncommitted changes in working directory');
  }
  
  if (sessionData.testResults?.some(t => t.failed > 0)) {
    inProgress.push('- Failing tests need attention');
  }
  
  if (sessionData.errorLogs && sessionData.errorLogs.length > 0) {
    inProgress.push('- Unresolved errors in session');
  }
  
  return inProgress.length > 0 ? inProgress.join('\n') : '- No work currently in progress';
}

/**
 * Generate next steps based on session and insights
 */
function generateNextSteps(sessionData: SessionData, insights: SessionInsight[]): string {
  const steps = [];
  
  if (sessionData.testResults?.some(t => t.failed > 0)) {
    steps.push('1. Fix failing tests');
  }
  
  if (sessionData.filesChanged.some(f => f.status === 'modified')) {
    steps.push(`${steps.length + 1}. Review and commit uncommitted changes`);
  }
  
  // Add insight-based suggestions
  const workarounds = insights.filter(i => i.type === 'workaround');
  if (workarounds.length > 0) {
    steps.push(`${steps.length + 1}. Replace workarounds with permanent solutions`);
  }
  
  if (steps.length === 0) {
    steps.push('1. Continue feature development');
  }
  
  return steps.join('\n');
}

/**
 * Generate mental model summary
 */
function generateMentalModel(sessionData: SessionData, insights: SessionInsight[]): string {
  const totalTimeSaved = insights.reduce((sum, i) => sum + i.timeSavingPotential, 0);
  
  if (insights.length === 0) {
    return `${sessionData.workMode} session focused on ${sessionData.filesChanged.length > 0 ? 'implementation' : 'exploration'}.`;
  }
  
  const insightTypes = [...new Set(insights.map(i => i.type))];
  
  return `This session revealed ${insights.length} key insights (${insightTypes.join(', ')}) that will save approximately ${totalTimeSaved} minutes in future work. The automatic capture ensures these learnings compound rather than evaporate.`;
}

// Export for use in CLI
export default enhancedHandoffCommand;