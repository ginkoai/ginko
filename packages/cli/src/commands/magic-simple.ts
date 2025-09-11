/**
 * @fileType: command
 * @status: current
 * @updated: 2025-09-11
 * @tags: [magic, router, simple]
 * @related: [backlog/ai-template.ts]
 * @priority: high
 * @complexity: low
 * @dependencies: [chalk]
 */

import chalk from 'chalk';
import { aiTemplateCommand } from './backlog/ai-template.js';

interface MagicOptions {
  verbose?: boolean;
}

/**
 * Simple magic command router
 * Only generates templates when valuable, otherwise tells user to ask AI directly
 */
export async function magicSimpleCommand(request: string, options: MagicOptions = {}) {
  const lower = request.toLowerCase();
  
  // Route content generation to template system
  if (lower.match(/create|write|plan|decompose|break.*down/)) {
    return aiTemplateCommand(request, options);
  }
  
  // For simple queries, just tell user to ask AI
  console.log(chalk.yellow('Just ask me (the AI) directly!'));
  console.log(chalk.dim('\nI can run commands like:'));
  console.log(chalk.green('  ginko backlog list'));
  console.log(chalk.green('  ginko backlog show FEATURE-001'));
  console.log(chalk.green('  ginko status'));
  console.log(chalk.dim('\nOr for content creation, use:'));
  console.log(chalk.green('  ginko backlog ai "create feature for [description]"'));
}