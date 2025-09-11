/**
 * @fileType: command
 * @status: current
 * @updated: 2025-09-11
 * @tags: [magic, ai, natural-language, router]
 * @related: [backlog/ai-enhanced.ts]
 * @priority: critical
 * @complexity: high
 * @dependencies: [chalk, ora]
 */

import chalk from 'chalk';
import ora from 'ora';
import { aiEnhancedCommand } from './backlog/ai-enhanced.js';
import { getAiAdapter } from '../adapters/ai-completion.js';

interface MagicOptions {
  verbose?: boolean;
  dryRun?: boolean;
}

/**
 * Domain types that can be detected
 */
type Domain = 'backlog' | 'git' | 'session' | 'context' | 'general';

/**
 * Magic command router - determines domain and routes to appropriate AI handler
 */
export async function magicCommand(request: string, options: MagicOptions = {}) {
  const spinner = ora('✨ Analyzing request...').start();
  
  try {
    // Detect domain from request
    const domain = await detectDomain(request);
    
    if (options.verbose) {
      spinner.stop();
      console.log(chalk.dim(`Detected domain: ${domain}`));
      spinner.start();
    }
    
    spinner.text = `Processing ${domain} request...`;
    
    // Route to appropriate handler
    switch (domain) {
      case 'backlog':
        spinner.stop();
        return aiEnhancedCommand(request, options);
        
      case 'git':
        spinner.succeed('Git operations coming soon!');
        console.log(chalk.dim('For now, use: git commit -m "message"'));
        break;
        
      case 'session':
        spinner.succeed('Session management coming soon!');
        console.log(chalk.dim('For now, use: ginko handoff "message"'));
        break;
        
      case 'context':
        spinner.succeed('Context management coming soon!');
        console.log(chalk.dim('For now, use: ginko context'));
        break;
        
      default:
        spinner.stop();
        return handleGeneralRequest(request);
    }
    
  } catch (error) {
    spinner.fail('Failed to process magic command');
    console.error(chalk.red(error instanceof Error ? error.message : 'Unknown error'));
    
    // Suggest specific commands
    console.log(chalk.dim('\nTry a more specific command:'));
    console.log(chalk.green('  ginko backlog ai "your request"'));
    console.log(chalk.green('  ginko handoff "your message"'));
    console.log(chalk.green('  ginko vibecheck'));
    
    process.exit(1);
  }
}

/**
 * Detect which domain the request belongs to
 */
async function detectDomain(request: string): Promise<Domain> {
  const lower = request.toLowerCase();
  
  // Quick pattern matching for obvious domains
  const backlogKeywords = [
    'feature', 'story', 'task', 'backlog', 'create', 'add', 'todo',
    'priority', 'assign', 'complete', 'done', 'finish', 'work on',
    'what should i', 'next', 'plan'
  ];
  
  const gitKeywords = [
    'commit', 'push', 'pull', 'branch', 'merge', 'checkout', 'stash',
    'diff', 'log', 'status', 'git'
  ];
  
  const sessionKeywords = [
    'handoff', 'session', 'capture', 'context', 'vibecheck', 'status'
  ];
  
  // Check patterns
  if (backlogKeywords.some(keyword => lower.includes(keyword))) {
    return 'backlog';
  }
  
  if (gitKeywords.some(keyword => lower.includes(keyword))) {
    return 'git';
  }
  
  if (sessionKeywords.some(keyword => lower.includes(keyword))) {
    return 'session';
  }
  
  // If unclear, use AI to determine
  try {
    const adapter = await getAiAdapter();
    const prompt = `
Categorize this request into one of these domains:
- backlog: Managing tasks, features, stories, work items
- git: Version control operations
- session: Session management, handoffs, context
- general: General questions or help

Request: "${request}"

Respond with just the domain name.`;

    const response = await adapter.complete(prompt, {
      temperature: 0.1,
      maxTokens: 10
    });
    
    const domain = response.trim().toLowerCase();
    if (['backlog', 'git', 'session', 'context', 'general'].includes(domain)) {
      return domain as Domain;
    }
  } catch (error) {
    // Fallback to general if AI fails
  }
  
  return 'general';
}

/**
 * Handle general requests that don't fit a specific domain
 */
async function handleGeneralRequest(request: string): Promise<void> {
  try {
    const adapter = await getAiAdapter();
    const prompt = `
You are Ginko, a helpful AI assistant for developers. Answer this request concisely:

"${request}"

If this is about using Ginko, suggest specific commands.
Keep your response brief and actionable.`;

    const response = await adapter.complete(prompt, {
      temperature: 0.7
    });
    
    console.log(response);
  } catch (error) {
    console.log(chalk.yellow('I understand you want help with: ') + request);
    console.log(chalk.dim('\nAvailable commands:'));
    console.log(chalk.green('  ginko backlog ai "manage work items"'));
    console.log(chalk.green('  ginko handoff "save progress"'));
    console.log(chalk.green('  ginko vibecheck'));
    console.log(chalk.green('  ginko --help'));
  }
}