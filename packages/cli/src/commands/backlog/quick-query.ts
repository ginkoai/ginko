/**
 * @fileType: utility
 * @status: current
 * @updated: 2025-09-11
 * @tags: [backlog, query, direct-response, performance]
 * @related: [ai-prompt.ts, base.ts]
 * @priority: high
 * @complexity: low
 * @dependencies: [chalk, base]
 */

import chalk from 'chalk';
import { BacklogBase } from './base.js';
import { ContextGatherer } from './context-gatherer.js';

/**
 * Handle simple queries directly without AI prompts
 * Preserves flow by giving immediate answers
 */
export async function handleQuickQuery(request: string): Promise<string | null> {
  const lower = request.toLowerCase();
  
  // Count queries
  if (lower.match(/how many.*(open|active|todo|feature|story|task)/)) {
    return await getCountResponse(request);
  }
  
  // Status queries
  if (lower.match(/what.*working on|current (work|task|feature)/)) {
    return await getCurrentWorkResponse();
  }
  
  // Priority queries
  if (lower.match(/what.*(critical|high priority|urgent)/)) {
    return await getHighPriorityResponse();
  }
  
  // Summary queries
  if (lower.match(/status|summary|overview/)) {
    return await getSummaryResponse();
  }
  
  // Not a simple query - return null to fall back to prompt generation
  return null;
}

async function getCountResponse(request: string): Promise<string> {
  const backlog = new BacklogBase();
  await backlog.init();
  const items = await backlog.listItems();
  
  const lower = request.toLowerCase();
  let filtered = items;
  let label = 'items';
  
  // Filter by type
  if (lower.includes('feature')) {
    filtered = items.filter(i => i.type === 'feature');
    label = 'features';
  } else if (lower.includes('story') || lower.includes('stories')) {
    filtered = items.filter(i => i.type === 'story');
    label = 'stories';
  } else if (lower.includes('task')) {
    filtered = items.filter(i => i.type === 'task');
    label = 'tasks';
  }
  
  // Filter by status (handle both lowercase and uppercase variants)
  const openItems = filtered.filter(i => i.status !== 'done' && (i.status as string) !== 'COMPLETE');
  const todoItems = filtered.filter(i => i.status === 'todo' || (i.status as string) === 'PROPOSED');
  const inProgressItems = filtered.filter(i => 
    i.status === 'in-progress' || (i.status as string) === 'IN_PROGRESS'
  );
  const doneItems = filtered.filter(i => i.status === 'done' || (i.status as string) === 'COMPLETE');
  
  // Generate response based on what was asked
  if (lower.includes('open') || lower.includes('active')) {
    return chalk.cyan(`📊 ${openItems.length} open ${label}`) + 
           chalk.gray(` (${todoItems.length} todo, ${inProgressItems.length} in progress)`);
  }
  
  if (lower.includes('todo')) {
    return chalk.cyan(`📋 ${todoItems.length} ${label} in todo`);
  }
  
  if (lower.includes('done') || lower.includes('complete')) {
    return chalk.green(`✅ ${doneItems.length} completed ${label}`);
  }
  
  // Default: show all with breakdown
  return chalk.cyan(`📊 ${filtered.length} total ${label}`) +
         chalk.gray(`\n  • ${todoItems.length} todo\n  • ${inProgressItems.length} in progress\n  • ${doneItems.length} done`);
}

async function getCurrentWorkResponse(): Promise<string> {
  const context = await new ContextGatherer().gatherContext();
  
  if (context.inProgressItems.length === 0) {
    return chalk.yellow('No items currently in progress');
  }
  
  const current = context.inProgressItems[0];
  return chalk.cyan(`Currently working on:\n`) +
         chalk.green(`${current.id}`) + `: ${current.title} ` +
         chalk.gray(`[${current.priority}] [${current.size}]`);
}

async function getHighPriorityResponse(): Promise<string> {
  const context = await new ContextGatherer().gatherContext();
  
  if (context.highPriorityItems.length === 0) {
    return chalk.yellow('No high priority items');
  }
  
  let response = chalk.cyan(`${context.highPriorityItems.length} high priority items:\n`);
  context.highPriorityItems.slice(0, 5).forEach(item => {
    const status = item.status === 'in-progress' ? chalk.yellow('[IN PROGRESS]') :
                   item.status === 'todo' ? chalk.gray('[TODO]') :
                   chalk.blue(`[${item.status}]`);
    response += `  ${chalk.green(item.id)}: ${item.title} ${status}\n`;
  });
  
  if (context.highPriorityItems.length > 5) {
    response += chalk.gray(`  ... and ${context.highPriorityItems.length - 5} more`);
  }
  
  return response;
}

async function getSummaryResponse(): Promise<string> {
  const context = await new ContextGatherer().gatherContext();
  const backlog = new BacklogBase();
  await backlog.init();
  const allItems = await backlog.listItems();
  
  const features = allItems.filter(i => i.type === 'feature');
  const stories = allItems.filter(i => i.type === 'story');
  const tasks = allItems.filter(i => i.type === 'task');
  
  return chalk.cyan('📊 Backlog Summary\n') +
         chalk.gray('─'.repeat(40)) + '\n' +
         `Total items: ${chalk.bold(allItems.length)}\n` +
         `  • Features: ${features.length}\n` +
         `  • Stories: ${stories.length}\n` +
         `  • Tasks: ${tasks.length}\n` +
         chalk.gray('─'.repeat(40)) + '\n' +
         `In Progress: ${chalk.yellow(context.inProgressItems.length)}\n` +
         `High Priority: ${chalk.red(context.highPriorityItems.length)}\n` +
         `Todo: ${allItems.filter(i => i.status === 'todo').length}\n` +
         `Done: ${chalk.green(allItems.filter(i => i.status === 'done').length)}`;
}