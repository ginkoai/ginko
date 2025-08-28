/**
 * @fileType: command
 * @status: current
 * @updated: 2025-08-27
 * @tags: [cli, architecture, adr, design, decision]
 * @priority: high
 * @complexity: medium
 * @dependencies: [fs-extra, chalk, commander]
 */

import chalk from 'chalk';
import fs from 'fs-extra';
import path from 'path';
import { getGinkoDir } from '../utils/helpers.js';

interface ArchitectureOptions {
  store?: boolean;
  id?: string;
  content?: string;
  review?: boolean;
  verbose?: boolean;
  number?: string;
}

export async function architectureCommand(decision: string | undefined, options: ArchitectureOptions) {
  try {
    // Phase 2: Store AI-generated ADR
    if (options.store && options.id) {
      await storeADR(options.id, options.content || '', options.number);
      if (!options.verbose) {
        console.log('done');
      }
      return;
    }

    // Phase 1 requires decision topic
    if (!decision) {
      console.error(chalk.red('error: architecture decision required'));
      console.error(chalk.dim('usage: ginko architecture "migrate to event-driven architecture"'));
      process.exit(1);
    }

    // Phase 1: Generate ADR template for AI collaboration
    const ginkoDir = await getGinkoDir();
    const archId = `arch-${Date.now()}`;
    const projectRoot = path.dirname(ginkoDir);
    
    // Get next ADR number
    const adrNumber = await getNextADRNumber(projectRoot);
    
    // Create ADR framework
    const framework = generateADRFramework(decision, adrNumber);
    
    // Store context for phase 2
    const tempPath = path.join(ginkoDir, '.temp', `${archId}.json`);
    await fs.ensureDir(path.dirname(tempPath));
    await fs.writeJSON(tempPath, { 
      decision,
      adrNumber,
      archId,
      timestamp: new Date().toISOString()
    });

    if (options.verbose) {
      console.log(chalk.dim('Starting architecture design mode...'));
      console.log(chalk.dim(`ADR Number: ${adrNumber}`));
      console.log(chalk.dim(`ID: ${archId}`));
    }

    // Output ADR framework (to stdout to avoid stderr)
    process.stdout.write(chalk.blue('\n🏛️  Architecture Decision Mode') + '\n');
    process.stdout.write(chalk.dim('─'.repeat(60)) + '\n');
    process.stdout.write(framework + '\n');
    process.stdout.write(chalk.dim('─'.repeat(60)) + '\n');
    process.stdout.write(generateArchInstructions(archId, adrNumber) + '\n');

    // Ensure stdout is flushed before exit
    await new Promise(resolve => process.stdout.write('', resolve));

    // Exit with code 44 to signal architecture mode
    process.exit(44);
    
  } catch (error) {
    console.error(chalk.red('error:'), error instanceof Error ? error.message : String(error));
    process.exit(1);
  }
}

function generateADRFramework(decision: string, adrNumber: string): string {
  const date = new Date().toISOString().split('T')[0];
  
  return `# ADR-${adrNumber}: ${decision}

## Status
${chalk.yellow('[AI: Proposed, Accepted, Deprecated, or Superseded]')}

## Date
${date}

## Context
${chalk.yellow('[AI: What is the issue that we\'re seeing that is motivating this decision?]')}
${chalk.yellow('[AI: What is the context within which this decision is being made?]')}
${chalk.yellow('[AI: What forces are at play (technical, business, team)?]')}

## Decision
${chalk.yellow('[AI: What is the change that we\'re proposing and/or doing?]')}
${chalk.yellow('[AI: Be specific about what will be implemented]')}

## Considered Alternatives
${chalk.yellow('[AI: What other options were considered?]')}

### Option 1: [Name]
${chalk.yellow('[AI: Description, Pros, Cons]')}

### Option 2: [Name]
${chalk.yellow('[AI: Description, Pros, Cons]')}

### Option 3: [Name]
${chalk.yellow('[AI: Description, Pros, Cons]')}

## Consequences

### Positive
${chalk.yellow('[AI: What becomes easier or more possible?]')}
${chalk.yellow('[AI: What improves in terms of performance, maintainability, etc.?]')}

### Negative
${chalk.yellow('[AI: What becomes more difficult?]')}
${chalk.yellow('[AI: What are the trade-offs?]')}

### Neutral
${chalk.yellow('[AI: What changes without being better or worse?]')}

## Implementation Plan
${chalk.yellow('[AI: High-level steps to implement this decision]')}
${chalk.yellow('[AI: Key milestones and checkpoints]')}

## References
${chalk.yellow('[AI: Links to relevant documentation, RFCs, or other ADRs]')}
${chalk.yellow('[AI: Related PRDs, tickets, or discussions]')}`;
}

function generateArchInstructions(archId: string, adrNumber: string): string {
  return chalk.blue(`
Architecture Design Instructions:

This is ARCHITECTURE MODE - we're making concrete technical decisions.
Focus on clarity, rationale, and long-term implications.

1. Complete the ADR framework with specific technical details
2. Be explicit about trade-offs and constraints
3. Consider team capabilities and existing patterns
4. Think about migration paths and rollback strategies
5. Reference specific technologies and versions when relevant

After design is complete, store the ADR:

ginko architecture --store --id=${archId} --number=${adrNumber} --content="[complete ADR]"

The ADR will be stored in: docs/reference/architecture/ADR-${adrNumber}-[title].md

Remember: ADRs are immutable once accepted. Be thorough.`);
}

async function storeADR(archId: string, content: string, adrNumber?: string) {
  const ginkoDir = await getGinkoDir();
  const projectRoot = path.dirname(ginkoDir);
  
  // Get ADR number from temp file if not provided
  if (!adrNumber) {
    const tempPath = path.join(ginkoDir, '.temp', `${archId}.json`);
    if (await fs.pathExists(tempPath)) {
      const temp = await fs.readJSON(tempPath);
      adrNumber = temp.adrNumber;
    }
  }
  
  if (!adrNumber) {
    throw new Error('ADR number not found');
  }
  
  // Extract title from content
  const titleMatch = content.match(/^#\s+ADR-\d+:\s+(.+)$/m);
  const title = titleMatch ? titleMatch[1] : 'Untitled Decision';
  const filename = `ADR-${adrNumber}-${title.toLowerCase().replace(/[^a-z0-9]+/g, '-')}.md`;
  
  // Store ADR
  const adrDir = path.join(projectRoot, 'docs', 'reference', 'architecture');
  await fs.ensureDir(adrDir);
  
  const adrPath = path.join(adrDir, filename);
  await fs.writeFile(adrPath, content);
  
  // Update ADR index if it exists
  const indexPath = path.join(adrDir, 'ADR-INDEX.md');
  if (await fs.pathExists(indexPath)) {
    let index = await fs.readFile(indexPath, 'utf8');
    const entry = `- [ADR-${adrNumber}: ${title}](./${filename})\n`;
    
    // Find the right place to insert (numerically sorted)
    const lines = index.split('\n');
    let inserted = false;
    const newLines = [];
    
    for (const line of lines) {
      if (!inserted && line.match(/^-\s+\[ADR-(\d+)/)) {
        const num = parseInt(RegExp.$1);
        if (num > parseInt(adrNumber)) {
          newLines.push(entry);
          inserted = true;
        }
      }
      newLines.push(line);
    }
    
    if (!inserted) {
      // Add at the end
      newLines.push(entry);
    }
    
    await fs.writeFile(indexPath, newLines.join('\n'));
  }
  
  console.log(chalk.green(`✅ ADR created: ${path.relative(projectRoot, adrPath)}`));
  
  // Clean up temp file
  const tempPath = path.join(ginkoDir, '.temp', `${archId}.json`);
  await fs.remove(tempPath).catch(() => {});
}

async function getNextADRNumber(projectRoot: string): Promise<string> {
  const adrDir = path.join(projectRoot, 'docs', 'reference', 'architecture');
  
  if (!await fs.pathExists(adrDir)) {
    return '001';
  }
  
  const files = await fs.readdir(adrDir);
  const adrNumbers = files
    .filter(f => f.match(/^ADR-(\d+)/))
    .map(f => parseInt(f.match(/^ADR-(\d+)/)![1]))
    .filter(n => !isNaN(n));
  
  if (adrNumbers.length === 0) {
    return '001';
  }
  
  const nextNumber = Math.max(...adrNumbers) + 1;
  return String(nextNumber).padStart(3, '0');
}