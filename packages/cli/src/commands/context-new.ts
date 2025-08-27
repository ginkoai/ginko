/**
 * @fileType: command
 * @status: proposed
 * @updated: 2025-08-27
 * @tags: [cli, context, modules, persistent, memory]
 * @priority: high
 * @complexity: high
 */

import chalk from 'chalk';
import fs from 'fs-extra';
import path from 'path';
import { getGinkoDir } from '../utils/helpers.js';

interface ContextModule {
  type: 'architecture' | 'config' | 'decision' | 'pattern' | 'gotcha' | 'module';
  tags: string[];
  area: string;
  created: string;
  updated: string;
  relevance: 'critical' | 'high' | 'medium' | 'low';
  dependencies: string[];
  content?: string;
  filename?: string;
}

interface ContextOptions {
  load?: string;
  capture?: string;
  list?: boolean;
  prune?: boolean;
  auto?: boolean;
}

export async function contextModuleCommand(options: ContextOptions) {
  const ginkoDir = await getGinkoDir();
  const modulesDir = path.join(ginkoDir, 'context', 'modules');
  const indexPath = path.join(ginkoDir, 'context', 'index.json');
  
  await fs.ensureDir(modulesDir);
  
  // Load existing index
  let index: Record<string, ContextModule> = {};
  if (await fs.pathExists(indexPath)) {
    index = await fs.readJSON(indexPath);
  }
  
  if (options.list) {
    await listModules(index);
  } else if (options.load) {
    await loadModules(options.load, modulesDir, index);
  } else if (options.capture) {
    await captureContext(options.capture, modulesDir, index, indexPath);
  } else if (options.prune) {
    await pruneModules(modulesDir, index, indexPath);
  } else if (options.auto) {
    await autoLoadContext(modulesDir, index);
  }
}

async function listModules(index: Record<string, ContextModule>) {
  console.log(chalk.bold('\n📚 Available Context Modules\n'));
  
  const modulesByType = new Map<string, ContextModule[]>();
  
  for (const [filename, module] of Object.entries(index)) {
    if (!modulesByType.has(module.type)) {
      modulesByType.set(module.type, []);
    }
    modulesByType.get(module.type)!.push({ ...module, filename });
  }
  
  for (const [type, modules] of modulesByType) {
    console.log(chalk.cyan(`${type}:`));
    for (const module of modules) {
      const tags = module.tags.join(', ');
      console.log(`  ${chalk.dim('•')} ${module.filename} ${chalk.dim(`[${tags}]`)}`);
    }
  }
  
  console.log(chalk.dim(`\nTotal: ${Object.keys(index).length} modules`));
  console.log(chalk.dim('Load with: ginko context load <pattern>'));
}

async function loadModules(pattern: string, modulesDir: string, index: Record<string, ContextModule>) {
  console.log(chalk.yellow(`\n📥 Loading context: ${pattern}\n`));
  
  const matches: string[] = [];
  
  // Match by filename pattern
  for (const filename of Object.keys(index)) {
    if (filename.includes(pattern) || 
        index[filename].tags.some(tag => tag.includes(pattern))) {
      matches.push(filename);
    }
  }
  
  if (matches.length === 0) {
    console.log(chalk.red('No matching context modules found'));
    return;
  }
  
  // Load and display modules
  for (const filename of matches) {
    const modulePath = path.join(modulesDir, filename);
    if (await fs.pathExists(modulePath)) {
      const content = await fs.readFile(modulePath, 'utf8');
      const module = index[filename];
      
      console.log(chalk.bold(`📄 ${filename}`));
      console.log(chalk.dim(`   Type: ${module.type} | Tags: ${module.tags.join(', ')}`));
      
      // Extract content without frontmatter
      const contentLines = content.split('\n');
      const contentStart = contentLines.findIndex(line => line === '---', 1) + 1;
      const mainContent = contentLines.slice(contentStart).join('\n');
      
      console.log(chalk.dim('   ---'));
      console.log(mainContent.split('\n').map(line => '   ' + line).join('\n'));
      console.log();
    }
  }
  
  // Load dependencies
  const allDeps = new Set<string>();
  for (const filename of matches) {
    const deps = index[filename].dependencies || [];
    deps.forEach(dep => allDeps.add(dep));
  }
  
  if (allDeps.size > 0) {
    console.log(chalk.dim(`Dependencies also loaded: ${Array.from(allDeps).join(', ')}`));
  }
  
  console.log(chalk.green(`\n✅ Loaded ${matches.length} context modules`));
}

async function captureContext(description: string, modulesDir: string, index: Record<string, ContextModule>, indexPath: string) {
  console.log(chalk.yellow('\n💾 Capturing context...\n'));
  
  // Generate filename from description
  const type = detectContextType(description);
  const slug = description
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, '')
    .split(' ')
    .slice(0, 3)
    .join('-');
  
  const filename = `${type}-${slug}.md`;
  const modulePath = path.join(modulesDir, filename);
  
  // Detect current working context
  const cwd = process.cwd();
  const area = path.relative(await getGinkoDir(), cwd);
  
  // Create module
  const module: ContextModule = {
    type,
    tags: extractTags(description),
    area: area || '/',
    created: new Date().toISOString().split('T')[0],
    updated: new Date().toISOString().split('T')[0],
    relevance: 'medium',
    dependencies: []
  };
  
  // Generate content
  const content = `---
type: ${module.type}
tags: [${module.tags.join(', ')}]
area: ${module.area}
created: ${module.created}
updated: ${module.updated}
relevance: ${module.relevance}
dependencies: []
---

# ${description}

## Context
*Captured during session on ${new Date().toLocaleDateString()}*

## Key Points
- ${description}

## Code Locations
- Current area: ${area}

## Important Context
*Add additional context here*
`;
  
  await fs.writeFile(modulePath, content);
  index[filename] = module;
  await fs.writeJSON(indexPath, index, { spaces: 2 });
  
  console.log(chalk.green(`✅ Created: ${filename}`));
  console.log(chalk.dim('Edit to add more detail: ' + modulePath));
}

async function pruneModules(modulesDir: string, index: Record<string, ContextModule>, indexPath: string) {
  console.log(chalk.yellow('\n🧹 Pruning old context modules...\n'));
  
  const usagePath = path.join(path.dirname(indexPath), 'usage-stats.json');
  let usage: Record<string, { lastUsed: string, count: number }> = {};
  
  if (await fs.pathExists(usagePath)) {
    usage = await fs.readJSON(usagePath);
  }
  
  const pruned: string[] = [];
  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
  
  for (const [filename, module] of Object.entries(index)) {
    const lastUsed = usage[filename]?.lastUsed ? new Date(usage[filename].lastUsed) : new Date(module.created);
    
    if (module.relevance === 'low' && lastUsed < thirtyDaysAgo) {
      pruned.push(filename);
      delete index[filename];
      await fs.remove(path.join(modulesDir, filename));
    }
  }
  
  if (pruned.length > 0) {
    await fs.writeJSON(indexPath, index, { spaces: 2 });
    console.log(chalk.green(`✅ Pruned ${pruned.length} unused modules`));
    pruned.forEach(f => console.log(chalk.dim(`  - ${f}`)));
  } else {
    console.log(chalk.dim('No modules to prune'));
  }
}

async function autoLoadContext(modulesDir: string, index: Record<string, ContextModule>) {
  console.log(chalk.yellow('\n🤖 Auto-detecting relevant context...\n'));
  
  const cwd = process.cwd();
  // Use fs to find files instead of glob for simplicity
  const currentFiles: string[] = [];
  async function findFiles(dir: string, files: string[] = []): Promise<string[]> {
    const items = await fs.readdir(dir).catch(() => []);
    for (const item of items) {
      const itemPath = path.join(dir, item);
      const stat = await fs.stat(itemPath).catch(() => null);
      if (stat?.isDirectory() && !item.startsWith('.') && item !== 'node_modules') {
        await findFiles(itemPath, files);
      } else if (stat?.isFile() && item.match(/\.(ts|js|tsx|jsx)$/)) {
        files.push(path.relative(cwd, itemPath));
      }
    }
    return files;
  }
  await findFiles(cwd, currentFiles);
  
  const relevant: string[] = [];
  
  for (const [filename, module] of Object.entries(index)) {
    // Check if module area matches current directory
    const areaPattern = module.area.replace('**', '.*');
    if (currentFiles.some((file: string) => file.match(areaPattern))) {
      relevant.push(filename);
      continue;
    }
    
    // Check for high relevance modules
    if (module.relevance === 'critical' || module.relevance === 'high') {
      relevant.push(filename);
    }
  }
  
  if (relevant.length > 0) {
    console.log(chalk.green('📚 Suggested context modules:'));
    relevant.forEach(filename => {
      const module = index[filename];
      console.log(`  ${chalk.cyan(filename)} - ${chalk.dim(module.tags.join(', '))}`);
    });
    
    console.log(chalk.dim('\nLoad all with: ginko context load <filename>'));
  } else {
    console.log(chalk.dim('No specific context modules suggested for current directory'));
    console.log(chalk.dim('Load core context with: ginko context load core'));
  }
}

// Helper functions
function detectContextType(description: string): ContextModule['type'] {
  const lower = description.toLowerCase();
  
  if (lower.includes('gotcha') || lower.includes('bug') || lower.includes('issue')) {
    return 'gotcha';
  }
  if (lower.includes('decide') || lower.includes('chose') || lower.includes('why')) {
    return 'decision';
  }
  if (lower.includes('config') || lower.includes('setup')) {
    return 'config';
  }
  if (lower.includes('pattern') || lower.includes('approach')) {
    return 'pattern';
  }
  if (lower.includes('architect') || lower.includes('structure')) {
    return 'architecture';
  }
  
  return 'module';
}

function extractTags(description: string): string[] {
  const words = description.toLowerCase().split(/\s+/);
  const tags: string[] = [];
  
  // Extract meaningful words as tags
  const keywords = ['auth', 'api', 'database', 'config', 'security', 'performance', 
                    'testing', 'deployment', 'ui', 'backend', 'frontend'];
  
  for (const word of words) {
    if (keywords.some(kw => word.includes(kw))) {
      tags.push(word);
    }
  }
  
  if (tags.length === 0) {
    tags.push('general');
  }
  
  return tags;
}