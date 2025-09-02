/**
 * @fileType: command
 * @status: current
 * @updated: 2025-08-28
 * @tags: [cli, handoff, ai-enhanced, session]
 * @related: [handoff.ts, ../utils/ai-templates.ts]
 * @priority: high
 * @complexity: high
 * @dependencies: [chalk, fs-extra, ora, simple-git]
 */

import chalk from 'chalk';
import fs from 'fs-extra';
import path from 'path';
import ora from 'ora';
import simpleGit from 'simple-git';
import { getUserEmail, getGinkoDir, detectWorkMode } from '../utils/helpers.js';
import { 
  AI_PROCESSING_EXIT_CODE,
  generateCompletionPrompt,
  validateEnrichedContent,
  TEMPLATES
} from '../utils/ai-templates.js';

interface HandoffOptions {
  message?: string;
  store?: boolean;
  id?: string;
  content?: string;
  ai?: boolean;
  quick?: boolean;
  review?: boolean;
  verbose?: boolean;
}

/**
 * AI-enhanced handoff command following ADR-024 pattern:
 * User → CLI → Template+Prompt → AI → Enriched Content → CLI → Storage
 */
export async function handoffAiCommand(options: HandoffOptions) {
  // Phase 2: Store AI-enriched content
  if (options.store && options.id && options.content) {
    return storeEnrichedHandoff(options.id, options.content);
  }

  // Phase 1: Generate template with AI prompts
  const spinner = options.verbose ? ora('Generating handoff template...').start() : null;
  
  try {
    const git = simpleGit();
    const ginkoDir = await getGinkoDir();
    const userEmail = await getUserEmail();
    const userSlug = userEmail.replace('@', '-at-').replace(/\./g, '-');
    const sessionDir = path.join(ginkoDir, 'sessions', userSlug);
    const handoffId = `handoff-${Date.now()}`;
    
    // Gather context
    const status = await git.status();
    const branch = await git.branchLocal();
    const currentBranch = branch.current;
    const mode = await detectWorkMode(status);
    
    // Get recent commits and changes
    const log = await git.log({ maxCount: 10 });
    const diff = await git.diff(['--stat']);
    const stagedDiff = await git.diff(['--staged', '--stat']);
    
    // Quick mode: basic template without AI
    if (options.quick) {
      const basicHandoff = await generateBasicHandoff({
        userEmail,
        currentBranch,
        mode,
        message: options.message,
        status,
        commits: log.all
      });
      
      await saveHandoff(sessionDir, basicHandoff, options.message);
      
      if (spinner) spinner.succeed('Handoff created (quick mode)');
      console.log(chalk.dim('done'));
      return;
    }
    
    // Generate AI-enhanced template
    const template = await generateAiHandoffTemplate({
      handoffId,
      userEmail,
      currentBranch,
      mode,
      message: options.message,
      status,
      commits: log.all,
      diff,
      stagedDiff,
      sessionDir
    });
    
    // Review mode: show template before AI processing
    if (options.review) {
      if (spinner) spinner.stop();
      console.log(chalk.cyan('\n📝 Handoff Template for AI Enhancement:\n'));
      console.log(template.content);
      console.log(chalk.cyan('\n---\n'));
    }
    
    // Output template and prompt for AI
    if (spinner) spinner.succeed('Template generated');
    
    // Exit with special code to signal AI processing needed
    if (options.ai !== false) {
      // Write to stdout explicitly to avoid stderr
      process.stdout.write(chalk.yellow('\n🤖 AI Enhancement Required:\n\n'));
      process.stdout.write(template.prompt + '\n');
      process.stdout.write(chalk.dim(`\nWhen complete, call:\nginko handoff --store --id=${handoffId} --content="[enriched content]"\n\n`));
      
      // Store template temporarily for AI processing
      const tempFile = path.join(sessionDir, `.${handoffId}.tmp`);
      await fs.writeFile(tempFile, template.content);
      
      // Ensure stdout is flushed before exit
      await new Promise(resolve => process.stdout.write('', resolve));
      
      // Use exit code 0 to avoid stderr interpretation
      // The AI enhancement prompt is expected behavior, not an error
      process.exit(0);
    }
    
    // No AI mode: save basic template
    await saveHandoff(sessionDir, template.content, options.message);
    console.log(chalk.dim('done'));
    
  } catch (error) {
    if (spinner) spinner.fail('Failed to generate handoff');
    console.error(chalk.red('Error:'), error instanceof Error ? error.message : String(error));
    process.exit(1);
  }
}

/**
 * Phase 2: Store AI-enriched handoff content
 */
async function storeEnrichedHandoff(id: string, content: string): Promise<void> {
  const spinner = ora('Storing enriched handoff...').start();
  
  try {
    const ginkoDir = await getGinkoDir();
    const userEmail = await getUserEmail();
    const userSlug = userEmail.replace('@', '-at-').replace(/\./g, '-');
    const sessionDir = path.join(ginkoDir, 'sessions', userSlug);
    const tempFile = path.join(sessionDir, `.${id}.tmp`);
    
    // Load original template for validation
    let originalTemplate = '';
    if (await fs.pathExists(tempFile)) {
      originalTemplate = await fs.readFile(tempFile, 'utf8');
    }
    
    // Validate enriched content
    const validation = validateEnrichedContent(originalTemplate, content);
    if (!validation.valid) {
      throw new Error(`Content validation failed: ${validation.issues.join(', ')}`);
    }
    
    // Extract summary for archive naming
    const summaryMatch = content.match(/## 📊 Session Summary\n([^\n]+)/);
    const summary = summaryMatch?.[1] || 'session handoff';
    
    // Archive existing handoff if present
    await archiveExistingHandoff(sessionDir, summary);
    
    // Save enriched content
    const currentHandoff = path.join(sessionDir, 'current.md');
    await fs.writeFile(currentHandoff, content);
    
    // Clean up temp file
    if (await fs.pathExists(tempFile)) {
      await fs.remove(tempFile);
    }
    
    // Optionally commit to git
    const config = await fs.readJSON(path.join(ginkoDir, 'config.json')).catch(() => ({}));
    if (config.git?.autoCommit) {
      const git = simpleGit();
      await git.add(currentHandoff);
      await git.commit(`📝 AI-enhanced session handoff`);
    }
    
    spinner.succeed('Enriched handoff stored successfully');
    console.log(chalk.dim('done'));
    
  } catch (error) {
    spinner.fail('Failed to store enriched handoff');
    console.error(chalk.red('Error:'), error instanceof Error ? error.message : String(error));
    process.exit(1);
  }
}

/**
 * Get the most recent handoff for context
 */
async function getMostRecentHandoff(sessionDir: string): Promise<string | null> {
  // Check current.md first
  const currentPath = path.join(sessionDir, 'current.md');
  if (await fs.pathExists(currentPath)) {
    return fs.readFile(currentPath, 'utf8');
  }
  
  // Otherwise check archive
  const archiveDir = path.join(sessionDir, 'archive');
  if (await fs.pathExists(archiveDir)) {
    const files = await fs.readdir(archiveDir);
    const handoffs = files
      .filter(f => f.endsWith('.md'))
      .sort()
      .reverse(); // Most recent first by date prefix
    
    if (handoffs.length > 0) {
      return fs.readFile(path.join(archiveDir, handoffs[0]), 'utf8');
    }
  }
  
  return null;
}

/**
 * Generate AI-enhanced handoff template with placeholders
 */
async function generateAiHandoffTemplate(context: any) {
  const timestamp = new Date().toISOString();
  const sessionId = Date.now();
  
  // Read previous handoff for context
  const previousHandoff = await getMostRecentHandoff(context.sessionDir);
  
  const content = `---
session_id: ${sessionId}
user: ${context.userEmail}
timestamp: ${timestamp}
mode: ${context.mode}
branch: ${context.currentBranch}
ai_enhanced: true
ai_model: [AI: Please identify your model name, e.g., claude-3.5-sonnet, gpt-4-turbo, cursor-fast]
ai_version: [AI: Please identify your version/date, e.g., 20241022, 2024-04-09, latest]
ai_provider: [AI: Please identify your provider, e.g., anthropic, openai, cursor, github]
---

# Session Handoff

## 📊 Session Summary
${context.message || TEMPLATES.handoffSummary}

## 🎯 Key Achievements
${TEMPLATES.keyAchievements}
- Achievement 1
- Achievement 2
- Achievement 3

## 🔄 Current State

### Git Status
- Branch: ${context.currentBranch}
- Modified files: ${context.status.modified.length}
- Staged files: ${context.status.staged.length}
- Untracked files: ${context.status.not_added.length}

### Changes Overview
[AI: Analyze the diffs and provide a high-level overview of the types of changes made]

## 💡 Technical Decisions
${TEMPLATES.technicalDecisions}

## 🚧 In Progress
[AI: Identify work that appears to be in progress based on uncommitted changes and TODO comments]

## 📝 Context for Next Session
[AI: Provide essential context that the next session will need to continue smoothly]

### Known Issues
${TEMPLATES.knownIssues}

### Dependencies
[AI: Note any new dependencies added or external services configured]

### Next Steps
${TEMPLATES.nextSteps}
1. Next step 1
2. Next step 2
3. Next step 3

## 📁 Key Files Modified

### Core Changes
[AI: List the most important files changed with brief explanations of why they matter]

### Supporting Changes
[AI: List secondary files that were modified to support the main changes]

## 🧠 Mental Model
${TEMPLATES.mentalModel}

## 🔐 Privacy Note
This handoff is stored locally in git. AI enhancement happens on your local machine.

---
Generated at ${new Date().toLocaleString()}
AI-Enhanced with ADR-024 pattern`;

  const enhancementContext = {
    command: 'handoff',
    id: context.handoffId,
    data: {
      commits: context.commits,
      status: context.status,
      branch: context.currentBranch,
      mode: context.mode,
      files: [...context.status.modified, ...context.status.staged, ...context.status.not_added],
      previousHandoff: previousHandoff ? previousHandoff.substring(0, 2000) : null // Include first 2000 chars for context
    }
  };

  // Enhanced prompt with model identification and previous context
  const basePrompt = generateCompletionPrompt(enhancementContext, content);
  const prompt = `${basePrompt}

IMPORTANT: AI Model Identification
In the frontmatter, replace the [AI: ...] placeholders with your actual model information:
- ai_model: Your model name (e.g., claude-3.5-sonnet, gpt-4-turbo, cursor-fast, copilot-chat)
- ai_version: Your version/date (e.g., 20241022, 2024-04-09, latest)
- ai_provider: Your provider (e.g., anthropic, openai, cursor, github)

If you're unsure, use "unknown" for any field.

${previousHandoff ? `Previous Handoff for Context:
---
${previousHandoff}
---
Use this previous handoff to maintain continuity and understand what was worked on before.` : 'This is the first handoff for this session.'}

Ginko Philosophy: "Nothing special, just quicker" - You're simply filling out what a developer would write manually, just faster.`;

  return { content, prompt };
}

/**
 * Generate basic handoff without AI enhancement
 */
async function generateBasicHandoff(context: any): Promise<string> {
  const timestamp = new Date().toISOString();
  const sessionId = Date.now();
  
  return `---
session_id: ${sessionId}
user: ${context.userEmail}
timestamp: ${timestamp}
mode: ${context.mode}
branch: ${context.currentBranch}
---

# Session Handoff

## 📊 Session Summary
${context.message || 'Session progress saved'}

## 🔄 Current State

### Git Status
- Branch: ${context.currentBranch}
- Modified files: ${context.status.modified.length}
- Staged files: ${context.status.staged.length}
- Untracked files: ${context.status.not_added.length}

### Recent Activity
${context.commits.map((c: any) => `- ${c.hash.substring(0, 7)} ${c.message}`).join('\n')}

## 📁 Working Files

### Modified
${context.status.modified.map((f: string) => `- ${f}`).join('\n') || '- No modified files'}

## 🎯 Work Mode: ${context.mode}

## Next Steps
- Review changes with \`git diff\`
- Continue work on ${context.currentBranch}
- Run tests to verify changes

## 🔐 Privacy Note
This handoff is stored locally in git. No data was sent to any server.

---
Generated at ${new Date().toLocaleString()}`;
}

/**
 * Save handoff to filesystem
 */
async function saveHandoff(sessionDir: string, content: string, message?: string): Promise<void> {
  // Extract summary from content for archive naming
  const summaryMatch = content.match(/## 📊 Session Summary\n([^\n]+)/);
  const summary = message || summaryMatch?.[1] || 'session handoff';
  
  await archiveExistingHandoff(sessionDir, summary);
  const currentHandoff = path.join(sessionDir, 'current.md');
  await fs.writeFile(currentHandoff, content);
}

/**
 * Archive existing handoff if present
 */
// Common words to filter out when generating descriptions
const COMMON_WORDS = new Set([
  'the', 'and', 'for', 'with', 'from', 'into', 'this', 'that', 'was', 'are',
  'been', 'have', 'has', 'had', 'were', 'will', 'would', 'could', 'should'
]);

/**
 * Generate a 3-word description from text for archive naming
 */
function generateThreeWordDesc(text: string): string {
  // Remove common words and punctuation, extract meaningful words
  const words = text.toLowerCase()
    .replace(/[^\w\s]/g, '')
    .split(/\s+/)
    .filter(w => w.length > 2 && !COMMON_WORDS.has(w));
  
  // Take first 3 meaningful words
  const desc = words.slice(0, 3).join('-');
  
  // Fallback if not enough words
  return desc || 'session-handoff-archive';
}

/**
 * Archive existing handoff with descriptive naming
 */
async function archiveExistingHandoff(sessionDir: string, message?: string): Promise<void> {
  const currentHandoff = path.join(sessionDir, 'current.md');
  
  if (await fs.pathExists(currentHandoff)) {
    const existing = await fs.readFile(currentHandoff, 'utf8');
    const timestampMatch = existing.match(/timestamp: ([^\n]+)/);
    const summaryMatch = existing.match(/## 📊 Session Summary\n([^\n]+)/);
    
    if (timestampMatch) {
      const timestamp = new Date(timestampMatch[1]);
      const date = timestamp.toISOString().split('T')[0];
      
      // Generate 3-word description from message or summary
      const description = generateThreeWordDesc(
        message || summaryMatch?.[1] || 'session handoff complete'
      );
      
      const archiveDir = path.join(sessionDir, 'archive');
      await fs.ensureDir(archiveDir);
      
      // Create unique filename with counter if needed
      let counter = 0;
      let archiveFile;
      do {
        const suffix = counter > 0 ? `-${counter}` : '';
        archiveFile = path.join(
          archiveDir,
          `${date}-${description}${suffix}.md`
        );
        counter++;
      } while (await fs.pathExists(archiveFile));
      
      await fs.move(currentHandoff, archiveFile);
    }
  }
}