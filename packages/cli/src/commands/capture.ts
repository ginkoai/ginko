/**
 * @fileType: command
 * @status: current
 * @updated: 2025-08-27
 * @tags: [cli, context, capture, ai-enhanced, flow-state]
 * @priority: critical
 * @complexity: medium
 * @dependencies: [fs-extra, chalk, commander]
 */

import chalk from 'chalk';
import fs from 'fs-extra';
import path from 'path';
import { getGinkoDir, getUserEmail } from '../utils/helpers.js';

interface CaptureOptions {
  store?: boolean;
  id?: string;
  content?: string;
  review?: boolean;
  verbose?: boolean;
  quiet?: boolean;
  quick?: boolean;
  edit?: boolean;
}

interface ContextModule {
  type: 'architecture' | 'config' | 'decision' | 'pattern' | 'gotcha' | 'module';
  tags: string[];
  area: string;
  created: string;
  updated: string;
  relevance: 'critical' | 'high' | 'medium' | 'low';
  dependencies: string[];
}

export async function captureCommand(description: string | undefined, options: CaptureOptions) {
  try {
    // Phase 2: Store AI-enriched content
    if (options.store && options.id) {
      await storeEnrichedContent(options.id, options.content || '');
      if (!options.verbose && !options.review) {
        console.log('done');
      }
      return;
    }

    // Phase 1 requires description
    if (!description) {
      console.error(chalk.red('error: description required'));
      process.exit(1);
    }

    // Phase 1: Generate template for AI enhancement
    const ginkoDir = await getGinkoDir();
    const modulesDir = path.join(ginkoDir, 'context', 'modules');
    await fs.ensureDir(modulesDir);

    // Quick capture without AI enhancement
    if (options.quick) {
      await quickCapture(description, modulesDir, options);
      if (!options.quiet) {
        console.log('done');
      }
      return;
    }

    // Generate capture ID for callback
    const captureId = `capture-${Date.now()}`;
    
    // Detect context type and extract tags
    const type = detectContextType(description);
    const tags = extractTags(description);
    const area = await getCurrentArea();
    
    // Generate filename
    const slug = description
      .toLowerCase()
      .replace(/[^a-z0-9\s]/g, '')
      .split(' ')
      .slice(0, 4)
      .join('-')
      .substring(0, 30);
    
    const filename = `${type}-${slug}.md`;
    
    // Create template with AI placeholders
    const template = generateTemplate(description, type, tags, area);
    
    // Store template temporarily for phase 2
    const tempPath = path.join(ginkoDir, '.temp', `${captureId}.json`);
    await fs.ensureDir(path.dirname(tempPath));
    await fs.writeJSON(tempPath, { 
      filename, 
      template, 
      description,
      type,
      tags,
      area,
      modulesDir 
    });

    if (options.verbose) {
      console.log(chalk.dim('Creating context module...'));
      console.log(chalk.dim(`Type detected: ${type}`));
      console.log(chalk.dim(`Tags extracted: [${tags.join(', ')}]`));
      console.log(chalk.dim(`ID: ${captureId}`));
    }

    // Output template and AI instructions to stdout
    console.log(template);
    console.log(chalk.dim('---'));
    console.log(generateAIPrompt(description, captureId, type));
    
    // Exit with code 0 (success) - the AI prompt is informational, not an error
    process.exit(0);
    
  } catch (error) {
    if (!options.quiet) {
      console.error(chalk.red('error:'), error instanceof Error ? error.message : String(error));
    }
    process.exit(1);
  }
}

async function storeEnrichedContent(captureId: string, content: string) {
  const ginkoDir = await getGinkoDir();
  const tempPath = path.join(ginkoDir, '.temp', `${captureId}.json`);
  
  if (!await fs.pathExists(tempPath)) {
    throw new Error(`Capture ${captureId} not found`);
  }

  const { filename, modulesDir } = await fs.readJSON(tempPath);
  const modulePath = path.join(modulesDir, filename);
  
  // Store enriched content
  await fs.writeFile(modulePath, content);
  
  // Update index
  const indexPath = path.join(ginkoDir, 'context', 'index.json');
  let index: Record<string, ContextModule> = {};
  
  if (await fs.pathExists(indexPath)) {
    index = await fs.readJSON(indexPath);
  }
  
  // Parse frontmatter from content to update index
  const frontmatter = parseFrontmatter(content);
  index[filename] = frontmatter;
  
  await fs.writeJSON(indexPath, index, { spaces: 2 });
  
  // Clean up temp file
  await fs.remove(tempPath);
}

async function quickCapture(description: string, modulesDir: string, options: CaptureOptions) {
  const type = detectContextType(description);
  const tags = extractTags(description);
  const area = await getCurrentArea();
  
  const slug = description
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, '')
    .split(' ')
    .slice(0, 4)
    .join('-')
    .substring(0, 30);
  
  const filename = `${type}-${slug}.md`;
  const modulePath = path.join(modulesDir, filename);
  
  const content = `---
type: ${type}
tags: [${tags.join(', ')}]
area: ${area}
created: ${new Date().toISOString().split('T')[0]}
updated: ${new Date().toISOString().split('T')[0]}
relevance: medium
dependencies: []
---

# ${description}

## Context
*Captured during session on ${new Date().toLocaleDateString()}*

## Key Points
- ${description}

## Notes
*Add additional notes here*
`;

  if (options.review) {
    console.log(chalk.dim('📝 Review before saving:'));
    console.log(content);
    console.log(chalk.dim('---'));
    // In a real implementation, we'd prompt for confirmation here
  }

  await fs.writeFile(modulePath, content);

  if (options.verbose) {
    console.log(chalk.dim(`Created: ${filename}`));
  }
}

function generateTemplate(description: string, type: string, tags: string[], area: string): string {
  const date = new Date().toISOString().split('T')[0];
  
  return `---
type: ${type}
tags: [${tags.join(', ')}]
area: ${area}
created: ${date}
updated: ${date}
relevance: medium
dependencies: []
---

# ${description}

## Context
[AI: Analyze why this was discovered and what problem it solves based on the current work in ${area}]

## Technical Details
[AI: Provide specific technical explanation with concrete details from the codebase]

## Code Examples
[AI: Include before/after code examples from actual files being worked on, especially in ${area}]

## Impact
[AI: Describe implications, performance impacts, security considerations, and trade-offs]

## References
[AI: Add links to relevant documentation, tickets, or related files in the project]

## Related Patterns
[AI: Identify similar patterns or related modules in the codebase]`;
}

function generateAIPrompt(description: string, captureId: string, type: string): string {
  return chalk.cyan(`AI Enhancement Required:

Please complete this ${type} context module about: "${description}"

Instructions:
1. Replace all [AI: ...] placeholders with specific, contextual information
2. Include concrete examples from the current codebase
3. Reference actual files and patterns you've observed
4. Keep the frontmatter structure intact
5. Ensure all information is accurate and relevant

When complete, store the enhanced content by calling:
ginko capture --store --id=${captureId} --content="[your enriched content here]"

The content should be the complete markdown file including frontmatter.`);
}

function detectContextType(description: string): ContextModule['type'] {
  const lower = description.toLowerCase();
  
  if (lower.includes('gotcha') || lower.includes('bug') || lower.includes('issue') || 
      lower.includes('must') || lower.includes('need') || lower.includes('require')) {
    return 'gotcha';
  }
  if (lower.includes('decide') || lower.includes('chose') || lower.includes('why') || 
      lower.includes('instead of')) {
    return 'decision';
  }
  if (lower.includes('config') || lower.includes('setup') || lower.includes('setting')) {
    return 'config';
  }
  if (lower.includes('pattern') || lower.includes('approach') || lower.includes('way to')) {
    return 'pattern';
  }
  if (lower.includes('architect') || lower.includes('structure') || lower.includes('design')) {
    return 'architecture';
  }
  
  return 'module';
}

function extractTags(description: string): string[] {
  const words = description.toLowerCase().split(/\s+/);
  const tags: string[] = [];
  
  // Common technical keywords to extract as tags
  const keywords = [
    'auth', 'authentication', 'security', 'api', 'database', 'db', 'cache',
    'performance', 'optimization', 'testing', 'test', 'deployment', 'deploy',
    'ui', 'frontend', 'backend', 'react', 'node', 'typescript', 'javascript',
    'async', 'sync', 'hook', 'state', 'redux', 'context', 'component',
    'error', 'exception', 'validation', 'network', 'http', 'rest', 'graphql',
    'docker', 'kubernetes', 'aws', 'azure', 'gcp', 'ci', 'cd', 'git'
  ];
  
  // Extract matching keywords
  for (const word of words) {
    const cleanWord = word.replace(/[^a-z]/g, '');
    if (keywords.some(kw => cleanWord.includes(kw) || kw.includes(cleanWord))) {
      const matchedKeyword = keywords.find(kw => cleanWord.includes(kw) || kw.includes(cleanWord));
      if (matchedKeyword && !tags.includes(matchedKeyword)) {
        tags.push(matchedKeyword);
      }
    }
  }
  
  // Add type-based default tags
  const type = detectContextType(description);
  if (type === 'gotcha' && !tags.includes('gotcha')) {
    tags.push('gotcha');
  }
  if (type === 'pattern' && !tags.includes('pattern')) {
    tags.push('pattern');
  }
  
  // Ensure at least one tag
  if (tags.length === 0) {
    tags.push('general');
  }
  
  // Limit to 5 most relevant tags
  return tags.slice(0, 5);
}

async function getCurrentArea(): Promise<string> {
  const cwd = process.cwd();
  const ginkoRoot = await getGinkoDir();
  const relativePath = path.relative(ginkoRoot, cwd);
  
  if (relativePath.startsWith('..')) {
    return '/';
  }
  
  return `/${relativePath}/**` || '/';
}

function parseFrontmatter(content: string): ContextModule {
  const lines = content.split('\n');
  const frontmatterStart = lines.indexOf('---');
  const frontmatterEnd = lines.indexOf('---', frontmatterStart + 1);
  
  if (frontmatterStart === -1 || frontmatterEnd === -1) {
    throw new Error('Invalid module format: missing frontmatter');
  }
  
  const frontmatterLines = lines.slice(frontmatterStart + 1, frontmatterEnd);
  const frontmatter: any = {};
  
  for (const line of frontmatterLines) {
    const [key, ...valueParts] = line.split(':');
    if (key && valueParts.length > 0) {
      const value = valueParts.join(':').trim();
      
      // Parse arrays
      if (value.startsWith('[') && value.endsWith(']')) {
        frontmatter[key.trim()] = value
          .slice(1, -1)
          .split(',')
          .map(s => s.trim());
      } else {
        frontmatter[key.trim()] = value;
      }
    }
  }
  
  return frontmatter as ContextModule;
}