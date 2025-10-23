/**
 * @fileType: model
 * @status: current
 * @updated: 2025-09-11
 * @tags: [backlog, base-class, git-native, types]
 * @related: [index.ts, create.ts, list.ts]
 * @priority: critical
 * @complexity: medium
 * @dependencies: [fs-extra, path, gray-matter]
 */

import fs from 'fs-extra';
import path from 'path';
import matter from 'gray-matter';
import chalk from 'chalk';
import { getGinkoDir } from '../../utils/helpers.js';

/**
 * Backlog item types
 */
export type ItemType = 'feature' | 'story' | 'task';
export type ItemStatus = 'todo' | 'in-progress' | 'done' | 'blocked';
export type ItemPriority = 'critical' | 'high' | 'medium' | 'low';
export type ItemSize = 'S' | 'M' | 'L' | 'XL';

/**
 * Backlog item metadata structure
 */
export interface BacklogItem {
  id: string;
  type: ItemType;
  title: string;
  status: ItemStatus;
  priority: ItemPriority;
  size: ItemSize;
  created: string;
  updated: string;
  author?: string;
  assignee?: string;
  parent?: string;
  children?: string[];
  tags?: string[];
  description?: string;
  acceptance_criteria?: string[];
  technical_notes?: string;
  dependencies?: string[];
}

/**
 * Base class for backlog operations
 */
export class BacklogBase {
  protected backlogDir: string;
  protected itemsDir: string;
  protected archiveDir: string;
  protected templatesDir: string;

  constructor() {
    // Paths will be initialized in init()
    this.backlogDir = '';
    this.itemsDir = '';
    this.archiveDir = '';
    this.templatesDir = '';
  }

  /**
   * Initialize backlog directories
   */
  async init(): Promise<void> {
    const projectRoot = await this.findProjectRoot();
    this.backlogDir = path.join(projectRoot, 'backlog');
    this.itemsDir = path.join(this.backlogDir, 'items');
    this.archiveDir = path.join(this.backlogDir, 'archive');
    this.templatesDir = path.join(this.backlogDir, 'templates');

    // Ensure directories exist
    await fs.ensureDir(this.itemsDir);
    await fs.ensureDir(this.archiveDir);
    await fs.ensureDir(this.templatesDir);
  }

  /**
   * Find project root (where .ginko exists)
   */
  protected async findProjectRoot(): Promise<string> {
    let currentDir = process.cwd();
    
    while (currentDir !== path.parse(currentDir).root) {
      if (await fs.pathExists(path.join(currentDir, '.ginko'))) {
        return currentDir;
      }
      currentDir = path.dirname(currentDir);
    }
    
    // If no .ginko found, use current directory
    return process.cwd();
  }

  /**
   * Generate next ID for a given type
   */
  async generateId(type: ItemType): Promise<string> {
    const prefix = type.toUpperCase();
    const files = await fs.readdir(this.itemsDir);
    
    // Filter files by type prefix
    const typeFiles = files.filter(f => f.startsWith(prefix));
    
    // Extract numbers and find max
    let maxNum = 0;
    for (const file of typeFiles) {
      const match = file.match(new RegExp(`^${prefix}-(\\d+)`));
      if (match) {
        const num = parseInt(match[1], 10);
        if (num > maxNum) maxNum = num;
      }
    }
    
    // Generate next ID with zero padding
    const nextNum = maxNum + 1;
    return `${prefix}-${String(nextNum).padStart(3, '0')}`;
  }

  /**
   * Load a backlog item from file
   */
  async loadItem(id: string): Promise<BacklogItem | null> {
    const filePath = path.join(this.itemsDir, `${id}.md`);
    
    if (!await fs.pathExists(filePath)) {
      return null;
    }

    const content = await fs.readFile(filePath, 'utf8');
    const { data, content: body } = matter(content);
    
    return {
      id,
      type: data.type || 'feature',
      title: data.title || 'Untitled',
      status: data.status || 'todo',
      priority: data.priority || 'medium',
      size: data.size || 'M',
      created: data.created || new Date().toISOString(),
      updated: data.updated || new Date().toISOString(),
      author: data.author,
      assignee: data.assignee,
      parent: data.parent,
      children: data.children || [],
      tags: data.tags || [],
      description: body,
      acceptance_criteria: data.acceptance_criteria || [],
      technical_notes: data.technical_notes,
      dependencies: data.dependencies || []
    };
  }

  /**
   * Save a backlog item to file
   */
  async saveItem(item: BacklogItem): Promise<void> {
    const filePath = path.join(this.itemsDir, `${item.id}.md`);
    
    // Prepare frontmatter
    const frontmatter = {
      id: item.id,
      type: item.type,
      title: item.title,
      status: item.status,
      priority: item.priority,
      size: item.size,
      created: item.created,
      updated: new Date().toISOString(),
      author: item.author,
      assignee: item.assignee,
      parent: item.parent,
      children: item.children?.length ? item.children : undefined,
      tags: item.tags?.length ? item.tags : undefined,
      acceptance_criteria: item.acceptance_criteria?.length ? item.acceptance_criteria : undefined,
      dependencies: item.dependencies?.length ? item.dependencies : undefined,
      technical_notes: item.technical_notes
    };

    // Remove undefined values
    Object.keys(frontmatter).forEach(key => {
      if (frontmatter[key as keyof typeof frontmatter] === undefined) {
        delete frontmatter[key as keyof typeof frontmatter];
      }
    });

    // Create markdown content
    const content = matter.stringify(item.description || '', frontmatter);
    
    await fs.writeFile(filePath, content);
  }

  /**
   * List all backlog items with optional filters
   */
  async listItems(filters?: {
    type?: ItemType;
    status?: ItemStatus;
    priority?: ItemPriority;
    assignee?: string;
  }): Promise<BacklogItem[]> {
    const files = await fs.readdir(this.itemsDir);
    const items: BacklogItem[] = [];

    for (const file of files) {
      if (!file.endsWith('.md')) continue;

      // Skip documentation and completion status files
      if (file.includes('-COMPLETION-STATUS') || file.includes('COMPLETION-STATUS')) continue;

      const id = file.replace('.md', '');
      const item = await this.loadItem(id);
      
      if (!item) continue;

      // Apply filters
      if (filters) {
        if (filters.type && item.type !== filters.type) continue;
        if (filters.status && item.status !== filters.status) continue;
        if (filters.priority && item.priority !== filters.priority) continue;
        if (filters.assignee && item.assignee !== filters.assignee) continue;
      }

      items.push(item);
    }

    // Sort by priority and creation date
    return items.sort((a, b) => {
      const priorityOrder = { critical: 0, high: 1, medium: 2, low: 3 };
      const priorityDiff = priorityOrder[a.priority] - priorityOrder[b.priority];
      if (priorityDiff !== 0) return priorityDiff;
      return new Date(b.created).getTime() - new Date(a.created).getTime();
    });
  }

  /**
   * Archive a completed item
   */
  async archiveItem(id: string): Promise<void> {
    const sourcePath = path.join(this.itemsDir, `${id}.md`);
    const destPath = path.join(this.archiveDir, `${id}.md`);
    
    if (await fs.pathExists(sourcePath)) {
      await fs.move(sourcePath, destPath, { overwrite: true });
    }
  }

  /**
   * Get item template
   */
  async getTemplate(type: ItemType): Promise<string> {
    const templatePath = path.join(this.templatesDir, `${type}.md`);
    
    if (await fs.pathExists(templatePath)) {
      return await fs.readFile(templatePath, 'utf8');
    }

    // Return default template if custom doesn't exist
    return this.getDefaultTemplate(type);
  }

  /**
   * Get default template for item type
   */
  protected getDefaultTemplate(type: ItemType): string {
    const templates = {
      feature: `## Problem Statement


## Proposed Solution


## User Stories


## Acceptance Criteria
- [ ] 
- [ ] 

## Technical Considerations


## Dependencies
`,
      story: `## Story
As a [user type]
I want to [goal]
So that [benefit]

## Acceptance Criteria
- [ ] 
- [ ] 

## Implementation Notes


## Testing Considerations
`,
      task: `## Description


## Steps
1. 
2. 

## Definition of Done
- [ ] 
- [ ] 

## Notes
`
    };

    return templates[type];
  }

  /**
   * Format item for display
   */
  formatItem(item: BacklogItem, verbose = false): string {
    const statusColors = {
      'todo': chalk.gray,
      'in-progress': chalk.yellow,
      'done': chalk.green,
      'blocked': chalk.red
    };

    const priorityColors = {
      'critical': chalk.red,
      'high': chalk.magenta,
      'medium': chalk.yellow,
      'low': chalk.gray
    };

    const typeIcons = {
      'feature': '✨',
      'story': '📖',
      'task': '✅'
    };

    const statusColor = statusColors[item.status];
    const priorityColor = priorityColors[item.priority];
    const icon = typeIcons[item.type];

    let output = `${icon} ${chalk.bold(item.id)} - ${item.title}\n`;
    output += `   ${statusColor(`[${item.status}]`)} ${priorityColor(`[${item.priority}]`)} ${chalk.dim(`[${item.size}]`)}`;
    
    if (item.assignee) {
      output += ` ${chalk.cyan(`@${item.assignee.split('@')[0]}`)}`;
    }

    if (verbose && item.description) {
      output += `\n\n${chalk.dim(item.description.slice(0, 200))}`;
      if (item.description.length > 200) {
        output += chalk.dim('...');
      }
    }

    return output;
  }
}