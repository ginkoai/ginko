/**
 * @fileType: command
 * @status: current
 * @updated: 2025-09-11
 * @tags: [backlog, ai, reflection, universal-pattern]
 * @related: [backlog-reflection.ts, base.ts, index.ts]
 * @priority: high
 * @complexity: low
 * @dependencies: [backlog-reflection]
 */

import { BacklogReflectionCommand } from './backlog-reflection.js';

interface AiOptions {
  verbose?: boolean;
  raw?: boolean;
}

/**
 * AI-enhanced backlog management using Reflection Pattern
 * Generates reflection prompts for AI to create rich content
 */
export async function aiCommand(request: string, options: AiOptions = {}) {
  const reflectionCommand = new BacklogReflectionCommand();
  return reflectionCommand.execute(request, options);
}

/**
 * Get command suggestions based on request keywords
 */
function getSuggestions(request: string): Array<{ command: string; description: string }> {
  const suggestions = [];

  // Create keywords
  if (request.includes('create') || request.includes('add') || request.includes('new')) {
    suggestions.push({
      command: 'ginko backlog create "Your description"',
      description: 'Create a new backlog item'
    });
  }

  // List keywords
  if (request.includes('list') || request.includes('show all') || request.includes('see') || request.includes('view')) {
    suggestions.push({
      command: 'ginko backlog list',
      description: 'List all backlog items'
    });
  }

  // Show keywords
  if (request.includes('details') || request.includes('show') && !request.includes('all')) {
    suggestions.push({
      command: 'ginko backlog show FEATURE-001',
      description: 'Show item details'
    });
  }

  // Update keywords
  if (request.includes('update') || request.includes('edit') || request.includes('change') || request.includes('start')) {
    suggestions.push({
      command: 'ginko backlog update FEATURE-001 -s in-progress',
      description: 'Update item status'
    });
  }

  // Complete keywords
  if (request.includes('complete') || request.includes('done') || request.includes('finish')) {
    suggestions.push({
      command: 'ginko backlog complete FEATURE-001',
      description: 'Mark item as complete'
    });
  }

  // Priority keywords
  if (request.includes('priority') || request.includes('important') || request.includes('critical')) {
    suggestions.push({
      command: 'ginko backlog list -p high',
      description: 'List high priority items'
    });
  }

  // Assignment keywords
  if (request.includes('assign') || request.includes('my') || request.includes('me')) {
    suggestions.push({
      command: 'ginko backlog list -a your@email.com',
      description: 'List items assigned to you'
    });
  }

  return suggestions;
}