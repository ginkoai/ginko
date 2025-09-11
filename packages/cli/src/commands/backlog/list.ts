/**
 * @fileType: command
 * @status: current
 * @updated: 2025-09-11
 * @tags: [backlog, list, view, crud]
 * @related: [base.ts, index.ts]
 * @priority: high
 * @complexity: low
 * @dependencies: [chalk, cli-table3]
 */

import chalk from 'chalk';
import Table from 'cli-table3';
import { BacklogBase, ItemType, ItemStatus, ItemPriority } from './base.js';

interface ListOptions {
  type?: ItemType;
  status?: ItemStatus;
  priority?: ItemPriority;
  assigned?: string;
  tree?: boolean;
  json?: boolean;
}

/**
 * List backlog items with optional filters
 */
export async function listCommand(options: ListOptions = {}) {
  try {
    const backlog = new BacklogBase();
    await backlog.init();

    // Load items with filters
    const items = await backlog.listItems({
      type: options.type,
      status: options.status,
      priority: options.priority,
      assignee: options.assigned
    });

    if (items.length === 0) {
      console.log(chalk.yellow('No backlog items found'));
      console.log(chalk.dim(`Try: ${chalk.green('ginko backlog create')} "Your first item"`));
      return;
    }

    // JSON output
    if (options.json) {
      console.log(JSON.stringify(items, null, 2));
      return;
    }

    // Tree view (hierarchical)
    if (options.tree) {
      displayTree(items);
      return;
    }

    // Table view (default)
    displayTable(items);

    // Summary
    const summary = {
      total: items.length,
      todo: items.filter(i => i.status === 'todo').length,
      inProgress: items.filter(i => i.status === 'in-progress').length,
      done: items.filter(i => i.status === 'done').length,
      blocked: items.filter(i => i.status === 'blocked').length
    };

    console.log(chalk.dim(`
📊 Summary: ${summary.total} items (${summary.todo} todo, ${summary.inProgress} in progress, ${summary.done} done, ${summary.blocked} blocked)`));

  } catch (error) {
    console.error(chalk.red('Failed to list backlog items'));
    console.error(chalk.red(error instanceof Error ? error.message : 'Unknown error'));
    process.exit(1);
  }
}

/**
 * Display items in table format
 */
function displayTable(items: any[]) {
  const table = new Table({
    head: ['ID', 'Type', 'Title', 'Status', 'Priority', 'Size', 'Assignee'],
    style: {
      head: ['cyan']
    }
  });

  const statusColors: Record<string, typeof chalk.gray> = {
    'todo': chalk.gray,
    'in-progress': chalk.yellow,
    'done': chalk.green,
    'blocked': chalk.red
  };

  const priorityColors: Record<string, typeof chalk.gray> = {
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

  for (const item of items) {
    const statusColor = statusColors[item.status] || chalk.gray;
    const priorityColor = priorityColors[item.priority] || chalk.gray;
    const icon = typeIcons[item.type as keyof typeof typeIcons] || '📄';

    table.push([
      chalk.bold(item.id),
      `${icon} ${item.type}`,
      item.title.slice(0, 40) + (item.title.length > 40 ? '...' : ''),
      statusColor(item.status),
      priorityColor(item.priority),
      chalk.dim(item.size),
      item.assignee ? chalk.cyan(`@${item.assignee.split('@')[0]}`) : chalk.dim('-')
    ]);
  }

  console.log(table.toString());
}

/**
 * Display items in tree format (showing hierarchy)
 */
function displayTree(items: any[]) {
  // Group by parent/child relationships
  const rootItems = items.filter(i => !i.parent);
  const childMap = new Map<string, any[]>();
  
  for (const item of items) {
    if (item.parent) {
      if (!childMap.has(item.parent)) {
        childMap.set(item.parent, []);
      }
      childMap.get(item.parent)!.push(item);
    }
  }

  // Display tree
  const printItem = (item: any, indent = '') => {
    const backlog = new BacklogBase();
    console.log(indent + backlog.formatItem(item));
    
    const children = childMap.get(item.id) || [];
    for (let i = 0; i < children.length; i++) {
      const isLast = i === children.length - 1;
      const childIndent = indent + (isLast ? '  └─ ' : '  ├─ ');
      const nextIndent = indent + (isLast ? '     ' : '  │  ');
      printItem(children[i], childIndent);
    }
  };

  for (const item of rootItems) {
    printItem(item);
  }
}