/**
 * @fileType: command
 * @status: current
 * @updated: 2025-08-27
 * @tags: [cli, explore, ideation, prd, backlog, collaborative]
 * @priority: high
 * @complexity: medium
 * @dependencies: [fs-extra, chalk, commander]
 */

import chalk from 'chalk';
import fs from 'fs-extra';
import path from 'path';
import { getGinkoDir, getUserEmail } from '../utils/helpers.js';

interface ExploreOptions {
  store?: boolean;
  id?: string;
  content?: string;
  type?: 'prd' | 'backlog';
  review?: boolean;
  verbose?: boolean;
}

export async function exploreCommand(topic: string | undefined, options: ExploreOptions) {
  try {
    // Phase 2: Store AI-generated PRD or backlog item
    if (options.store && options.id) {
      await storeExploration(options.id, options.content || '', options.type || 'backlog');
      if (!options.verbose) {
        console.log('done');
      }
      return;
    }

    // Phase 1 requires topic
    if (!topic) {
      console.error(chalk.red('error: exploration topic required'));
      console.error(chalk.dim('usage: ginko explore "how might we improve onboarding"'));
      process.exit(1);
    }

    // Phase 1: Generate exploration prompt for AI collaboration
    const ginkoDir = await getGinkoDir();
    const exploreId = `explore-${Date.now()}`;
    
    // Detect if this is a big idea (PRD) or focused improvement (backlog)
    const explorationSize = detectExplorationSize(topic);
    
    // Create exploration prompt
    const prompt = generateExplorationPrompt(topic, explorationSize);
    
    // Store context for phase 2
    const tempPath = path.join(ginkoDir, '.temp', `${exploreId}.json`);
    await fs.ensureDir(path.dirname(tempPath));
    await fs.writeJSON(tempPath, { 
      topic,
      type: explorationSize,
      exploreId,
      timestamp: new Date().toISOString()
    });

    if (options.verbose) {
      console.log(chalk.dim('Starting exploration mode...'));
      console.log(chalk.dim(`Type: ${explorationSize}`));
      console.log(chalk.dim(`ID: ${exploreId}`));
    }

    // Output exploration framework
    console.log(chalk.cyan('\n🔮 Exploration Mode: ' + chalk.bold(topic)));
    console.log(chalk.dim('─'.repeat(60)));
    console.log(prompt);
    console.log(chalk.dim('─'.repeat(60)));
    console.log(generateAIInstructions(exploreId, explorationSize));

    // Exit with code 43 to signal exploration mode
    process.exit(43);
    
  } catch (error) {
    console.error(chalk.red('error:'), error instanceof Error ? error.message : String(error));
    process.exit(1);
  }
}

function generateExplorationPrompt(topic: string, type: 'prd' | 'backlog'): string {
  if (type === 'prd') {
    return `
${chalk.bold('Problem Space Exploration')}

Let's explore: "${topic}"

${chalk.yellow('Current Pain Points:')}
[AI: What specific problems are users/developers experiencing?]

${chalk.yellow('Root Causes:')}
[AI: Why do these problems exist? What's the deeper issue?]

${chalk.yellow('Potential Solutions:')}
[AI: What are 3-5 different approaches we could take?]

${chalk.yellow('Trade-offs:')}
[AI: What are the pros/cons of each approach?]

${chalk.yellow('Success Metrics:')}
[AI: How would we measure if this is successful?]

${chalk.yellow('Implementation Scope:')}
[AI: Is this days, weeks, or months of work? What's the MVP?]

${chalk.yellow('Open Questions:')}
[AI: What do we still need to figure out?]
`;
  } else {
    return `
${chalk.bold('Feature Enhancement Exploration')}

Let's explore: "${topic}"

${chalk.yellow('Current State:')}
[AI: How does this work today? What's the baseline?]

${chalk.yellow('Desired State:')}
[AI: What would "better" look like? Be specific.]

${chalk.yellow('Quick Wins:')}
[AI: What could we improve in <1 day?]

${chalk.yellow('Deeper Improvements:')}
[AI: What would take 2-5 days but have bigger impact?]

${chalk.yellow('Success Criteria:')}
[AI: How do we know when this is "done"?]

${chalk.yellow('Risks:')}
[AI: What could go wrong? What should we watch for?]
`;
  }
}

function generateAIInstructions(exploreId: string, type: 'prd' | 'backlog'): string {
  const outputType = type === 'prd' ? 'PRD (Product Requirements Document)' : 'Backlog Item';
  
  return chalk.cyan(`
AI Collaboration Instructions:

This is EXPLORATION MODE - a free-flowing, hypothetical thinking space.
No code will be written yet. We're exploring possibilities.

1. Complete the exploration framework above with specific insights
2. Think broadly about the problem space
3. Consider user needs, technical constraints, and team velocity
4. Be creative but realistic about scope
5. Challenge assumptions and propose alternatives

After exploration, create a structured ${outputType} and store it:

ginko explore --store --id=${exploreId} --type=${type} --content="[structured document]"

The document should be markdown formatted for ${type === 'prd' ? 'docs/PRD/' : 'BACKLOG.md'}`);
}

async function storeExploration(exploreId: string, content: string, type: 'prd' | 'backlog') {
  const ginkoDir = await getGinkoDir();
  const projectRoot = path.dirname(ginkoDir);
  
  if (type === 'prd') {
    // Store as PRD document
    const prdDir = path.join(projectRoot, 'docs', 'PRD');
    await fs.ensureDir(prdDir);
    
    // Extract title from content (first # heading)
    const titleMatch = content.match(/^#\s+(.+)$/m);
    const title = titleMatch ? titleMatch[1] : 'Untitled PRD';
    const filename = `PRD-${new Date().toISOString().split('T')[0]}-${title.toLowerCase().replace(/[^a-z0-9]+/g, '-')}.md`;
    
    const prdPath = path.join(prdDir, filename);
    await fs.writeFile(prdPath, content);
    
    console.log(chalk.green(`✅ PRD created: ${path.relative(projectRoot, prdPath)}`));
  } else {
    // Append to BACKLOG.md
    const backlogPath = path.join(projectRoot, 'BACKLOG.md');
    
    // Read existing backlog
    let backlog = '';
    if (await fs.pathExists(backlogPath)) {
      backlog = await fs.readFile(backlogPath, 'utf8');
    } else {
      backlog = '# Ginko Development Backlog\n\nThis document contains planned features and architectural designs for future implementation.\n\n';
    }
    
    // Find appropriate section or create new one
    const featureMatch = content.match(/^###\s+FEATURE-\d+/m);
    if (featureMatch) {
      // It's a properly formatted backlog item
      backlog += '\n' + content + '\n';
    } else {
      // Wrap in feature format
      const nextId = (backlog.match(/FEATURE-(\d+)/g) || [])
        .map(m => parseInt(m.replace('FEATURE-', '')))
        .reduce((max, n) => Math.max(max, n), 0) + 1;
      
      const formatted = `\n### FEATURE-${String(nextId).padStart(3, '0')}: ${content.split('\n')[0].replace(/^#+\s*/, '')}
**Priority**: MEDIUM  
**Status**: PROPOSED  
**Created**: ${new Date().toISOString().split('T')[0]}  

${content}\n`;
      
      backlog += formatted;
    }
    
    await fs.writeFile(backlogPath, backlog);
    console.log(chalk.green(`✅ Backlog item added to BACKLOG.md`));
  }
  
  // Clean up temp file
  const tempPath = path.join(ginkoDir, '.temp', `${exploreId}.json`);
  await fs.remove(tempPath).catch(() => {}); // Ignore if doesn't exist
}

function detectExplorationSize(topic: string): 'prd' | 'backlog' {
  const lower = topic.toLowerCase();
  
  // PRD indicators (big ideas)
  if (lower.includes('system') || lower.includes('architecture') || 
      lower.includes('platform') || lower.includes('redesign') ||
      lower.includes('overhaul') || lower.includes('framework') ||
      lower.includes('how might we') || lower.includes('what if')) {
    return 'prd';
  }
  
  // Backlog indicators (focused improvements)
  if (lower.includes('fix') || lower.includes('improve') || 
      lower.includes('add') || lower.includes('update') ||
      lower.includes('enhance') || lower.includes('optimize') ||
      lower.includes('bug') || lower.includes('issue')) {
    return 'backlog';
  }
  
  // Default to backlog for smaller scope
  return 'backlog';
}