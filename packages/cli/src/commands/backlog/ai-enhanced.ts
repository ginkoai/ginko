/**
 * @fileType: command
 * @status: current
 * @updated: 2025-09-11
 * @tags: [backlog, ai, natural-language, magic]
 * @related: [context-gatherer.ts, base.ts, templates.ts]
 * @priority: critical
 * @complexity: high
 * @dependencies: [chalk, ora, ai-adapter]
 */

import chalk from 'chalk';
import ora from 'ora';
import { BacklogBase, ItemType, ItemPriority, ItemSize, BacklogItem } from './base.js';
import { ContextGatherer, BacklogContext } from './context-gatherer.js';
import { getAiAdapter } from '../../adapters/ai-completion.js';
import { getUserEmail } from '../../utils/helpers.js';

interface AiEnhancedOptions {
  dryRun?: boolean;
  verbose?: boolean;
  force?: boolean;
}

/**
 * Intent types that can be detected from natural language
 */
type Intent = 
  | 'create'
  | 'list'
  | 'show'
  | 'update'
  | 'complete'
  | 'query'
  | 'suggest'
  | 'plan';

interface ParsedIntent {
  intent: Intent;
  confidence: number;
  params: Record<string, any>;
  reasoning?: string;
}

/**
 * AI-enhanced backlog command with natural language understanding
 */
export class AiEnhancedBacklog {
  private backlog: BacklogBase;
  private contextGatherer: ContextGatherer;
  private adapter: any;
  
  constructor() {
    this.backlog = new BacklogBase();
    this.contextGatherer = new ContextGatherer();
  }
  
  private async getAdapter() {
    if (!this.adapter) {
      this.adapter = await getAiAdapter();
    }
    return this.adapter;
  }
  
  /**
   * Main entry point for natural language backlog management
   */
  async execute(request: string, options: AiEnhancedOptions = {}) {
    const spinner = ora('Understanding your request...').start();
    
    try {
      await this.backlog.init();
      
      // Gather rich context
      spinner.text = 'Gathering context...';
      const context = await this.contextGatherer.gatherContext();
      
      // Parse intent from natural language
      spinner.text = 'Analyzing intent...';
      const parsedIntent = await this.parseIntent(request, context, options);
      
      if (options.verbose) {
        spinner.stop();
        console.log(chalk.dim('Context summary:'));
        console.log(chalk.dim(this.contextGatherer.generateContextSummary(context)));
        console.log(chalk.dim(`\nDetected intent: ${parsedIntent.intent} (${Math.round(parsedIntent.confidence * 100)}% confidence)`));
        if (parsedIntent.reasoning) {
          console.log(chalk.dim(`Reasoning: ${parsedIntent.reasoning}`));
        }
        spinner.start();
      }
      
      // Execute based on intent
      spinner.text = 'Executing...';
      const result = await this.executeIntent(parsedIntent, context, request, options);
      
      spinner.succeed('Done!');
      
      if (result) {
        console.log(result);
      }
      
    } catch (error) {
      spinner.fail('Failed to process request');
      console.error(chalk.red(error instanceof Error ? error.message : 'Unknown error'));
      
      // Suggest fallback commands
      this.suggestFallback(request);
      process.exit(1);
    }
  }
  
  /**
   * Parse intent from natural language using AI
   */
  private async parseIntent(request: string, context: BacklogContext, options: AiEnhancedOptions): Promise<ParsedIntent> {
    // First try pattern matching for common patterns
    const quickIntent = this.quickIntentDetection(request);
    if (quickIntent && quickIntent.confidence > 0.8) {
      return quickIntent;
    }
    
    // Use AI for complex intent detection
    const prompt = `
You are a backlog management assistant. Analyze this request and determine the user's intent.

Request: "${request}"

Context:
${this.contextGatherer.generateContextSummary(context)}

Possible intents:
- create: User wants to create a new backlog item (feature, story, or task)
- list: User wants to see backlog items
- show: User wants details about a specific item
- update: User wants to modify an existing item
- complete: User wants to mark something as done
- query: User is asking a question about the backlog
- suggest: User wants recommendations on what to work on
- plan: User wants to organize or plan work

Analyze the request and respond with JSON:
{
  "intent": "one of the intents above",
  "confidence": 0.0 to 1.0,
  "params": {
    "type": "feature|story|task (if creating)",
    "id": "item ID (if referencing specific item)",
    "status": "new status (if updating)",
    "priority": "priority level (if mentioned)",
    "description": "extracted description",
    "filters": "any filter criteria mentioned"
  },
  "reasoning": "brief explanation of why you chose this intent"
}`;

    try {
      const adapter = await this.getAdapter();
      const response = await adapter.complete(prompt, {
        temperature: 0.3,
        format: 'json'
      });
      
      return JSON.parse(response);
    } catch (error) {
      // Fallback to pattern matching if AI fails
      return this.quickIntentDetection(request) || {
        intent: 'query',
        confidence: 0.5,
        params: { description: request }
      };
    }
  }
  
  /**
   * Quick intent detection using patterns (no AI needed)
   */
  private quickIntentDetection(request: string): ParsedIntent | null {
    const lower = request.toLowerCase();
    
    // Create patterns
    if (lower.match(/^(create|add|new)\s+(feature|story|task)/)) {
      const type = lower.match(/(feature|story|task)/)?.[1] as ItemType;
      return {
        intent: 'create',
        confidence: 0.95,
        params: {
          type,
          description: request.replace(/^(create|add|new)\s+(feature|story|task)\s*/i, '')
        }
      };
    }
    
    // List patterns
    if (lower.match(/^(list|show all|see|view)\s*(features?|stories|tasks?|items?|backlog)?/)) {
      return {
        intent: 'list',
        confidence: 0.9,
        params: {}
      };
    }
    
    // Complete patterns
    if (lower.match(/^(complete|done|finish|ship)\s+/)) {
      const id = lower.match(/(FEATURE|STORY|TASK)-\d+/i)?.[0];
      return {
        intent: 'complete',
        confidence: id ? 0.95 : 0.7,
        params: { id }
      };
    }
    
    // Query patterns
    if (lower.includes('?') || lower.startsWith('what') || lower.startsWith('how')) {
      return {
        intent: 'query',
        confidence: 0.85,
        params: { question: request }
      };
    }
    
    // Suggest patterns
    if (lower.match(/what.*work on|next|suggest|recommend/)) {
      return {
        intent: 'suggest',
        confidence: 0.9,
        params: {}
      };
    }
    
    return null;
  }
  
  /**
   * Execute the parsed intent
   */
  private async executeIntent(
    intent: ParsedIntent,
    context: BacklogContext,
    originalRequest: string,
    options: AiEnhancedOptions
  ): Promise<string> {
    switch (intent.intent) {
      case 'create':
        return this.executeCreate(intent.params, context, options);
        
      case 'list':
        return this.executeList(intent.params, context);
        
      case 'show':
        return this.executeShow(intent.params, context);
        
      case 'update':
        return this.executeUpdate(intent.params, context);
        
      case 'complete':
        return this.executeComplete(intent.params, context);
        
      case 'query':
        return this.executeQuery(originalRequest, context);
        
      case 'suggest':
        return this.executeSuggest(context);
        
      case 'plan':
        return this.executePlan(originalRequest, context);
        
      default:
        throw new Error(`Unknown intent: ${intent.intent}`);
    }
  }
  
  /**
   * Create a new backlog item with AI enhancement
   */
  private async executeCreate(params: any, context: BacklogContext, options: AiEnhancedOptions): Promise<string> {
    const type = params.type || 'feature';
    const description = params.description || params.title;
    
    if (!description) {
      throw new Error('No description provided for new item');
    }
    
    // Use AI to enrich the item creation
    const enrichPrompt = `
Given this request to create a ${type}: "${description}"

Context:
${this.contextGatherer.generateContextSummary(context)}

Generate a complete backlog item with:
1. A clear, concise title (max 60 chars)
2. Priority based on context (critical, high, medium, low)
3. Size estimate (S, M, L, XL)
4. Detailed description following the template
5. Acceptance criteria (if feature or story)
6. Tags based on the content

Respond with JSON:
{
  "title": "concise title",
  "priority": "priority level",
  "size": "size estimate",
  "description": "full markdown description",
  "acceptance_criteria": ["criteria 1", "criteria 2"],
  "tags": ["tag1", "tag2"],
  "reasoning": "why these choices were made"
}`;

    const adapter = await this.getAdapter();
    const aiResponse = await adapter.complete(enrichPrompt, {
      temperature: 0.5,
      format: 'json'
    });
    
    const enriched = JSON.parse(aiResponse);
    
    // Generate ID and create item
    const id = await this.backlog.generateId(type);
    const userEmail = await getUserEmail();
    
    const item: BacklogItem = {
      id,
      type,
      title: enriched.title,
      status: 'todo',
      priority: enriched.priority as ItemPriority,
      size: enriched.size as ItemSize,
      created: new Date().toISOString(),
      updated: new Date().toISOString(),
      author: userEmail,
      description: enriched.description,
      acceptance_criteria: enriched.acceptance_criteria,
      tags: enriched.tags
    };
    
    if (options.dryRun) {
      return chalk.yellow('DRY RUN - Would create:\n') + this.backlog.formatItem(item, true);
    }
    
    await this.backlog.saveItem(item);
    
    let output = chalk.green(`✨ Created ${id}: ${item.title}\n`);
    output += this.backlog.formatItem(item, true);
    
    if (options.verbose && enriched.reasoning) {
      output += chalk.dim(`\nAI reasoning: ${enriched.reasoning}`);
    }
    
    return output;
  }
  
  /**
   * List items with smart filtering
   */
  private async executeList(params: any, context: BacklogContext): Promise<string> {
    // Use context to smart filter
    let items = await this.backlog.listItems(params.filters);
    
    if (items.length === 0) {
      return chalk.yellow('No items found. Try: ginko "create a new feature"');
    }
    
    // Group by status for better visualization
    const grouped = {
      'in-progress': items.filter(i => i.status === 'in-progress'),
      'todo': items.filter(i => i.status === 'todo' && (i.priority === 'critical' || i.priority === 'high')),
      'other': items.filter(i => i.status === 'todo' && i.priority !== 'critical' && i.priority !== 'high')
    };
    
    let output = '';
    
    if (grouped['in-progress'].length > 0) {
      output += chalk.cyan('🚀 In Progress:\n');
      grouped['in-progress'].forEach(item => {
        output += '  ' + this.backlog.formatItem(item) + '\n';
      });
    }
    
    if (grouped['todo'].length > 0) {
      output += chalk.yellow('\n⚡ High Priority:\n');
      grouped['todo'].forEach(item => {
        output += '  ' + this.backlog.formatItem(item) + '\n';
      });
    }
    
    if (grouped['other'].length > 0 && grouped['other'].length <= 5) {
      output += chalk.gray('\n📋 Other:\n');
      grouped['other'].forEach(item => {
        output += '  ' + this.backlog.formatItem(item) + '\n';
      });
    } else if (grouped['other'].length > 5) {
      output += chalk.gray(`\n📋 And ${grouped['other'].length} more items...`);
    }
    
    return output;
  }
  
  /**
   * Show item details
   */
  private async executeShow(params: any, context: BacklogContext): Promise<string> {
    if (!params.id) {
      // Try to infer from context
      if (context.inProgressItems.length === 1) {
        params.id = context.inProgressItems[0].id;
      } else {
        throw new Error('Please specify which item to show');
      }
    }
    
    const item = await this.backlog.loadItem(params.id);
    if (!item) {
      throw new Error(`Item not found: ${params.id}`);
    }
    
    return this.backlog.formatItem(item, true);
  }
  
  /**
   * Update an item
   */
  private async executeUpdate(params: any, context: BacklogContext): Promise<string> {
    if (!params.id) {
      // Try to infer from context
      if (context.inProgressItems.length === 1) {
        params.id = context.inProgressItems[0].id;
      } else {
        throw new Error('Please specify which item to update');
      }
    }
    
    const item = await this.backlog.loadItem(params.id);
    if (!item) {
      throw new Error(`Item not found: ${params.id}`);
    }
    
    // Apply updates
    if (params.status) item.status = params.status;
    if (params.priority) item.priority = params.priority;
    if (params.size) item.size = params.size;
    if (params.assignee) item.assignee = params.assignee;
    
    item.updated = new Date().toISOString();
    
    await this.backlog.saveItem(item);
    
    return chalk.green(`✅ Updated ${item.id}: ${item.title}`);
  }
  
  /**
   * Complete an item
   */
  private async executeComplete(params: any, context: BacklogContext): Promise<string> {
    if (!params.id) {
      // Try to infer from context
      if (context.inProgressItems.length === 1) {
        params.id = context.inProgressItems[0].id;
      } else {
        throw new Error('Please specify which item to complete');
      }
    }
    
    const item = await this.backlog.loadItem(params.id);
    if (!item) {
      throw new Error(`Item not found: ${params.id}`);
    }
    
    item.status = 'done';
    item.updated = new Date().toISOString();
    
    await this.backlog.saveItem(item);
    await this.backlog.archiveItem(item.id);
    
    return chalk.green(`🎉 Completed and archived ${item.id}: ${item.title}`);
  }
  
  /**
   * Answer a query about the backlog
   */
  private async executeQuery(question: string, context: BacklogContext): Promise<string> {
    const prompt = `
Answer this question about the backlog: "${question}"

Current backlog context:
- ${context.activeItems.length} active items
- ${context.inProgressItems.length} in progress
- ${context.highPriorityItems.length} high priority items
- Currently working on: ${context.inProgressItems.map(i => i.title).join(', ') || 'nothing specific'}

Recent items:
${context.recentlyUpdated.map(i => `- ${i.id}: ${i.title} [${i.status}]`).join('\n')}

Provide a helpful, concise answer.`;

    const adapter = await this.getAdapter();
    const answer = await adapter.complete(prompt, { temperature: 0.5 });
    
    return answer;
  }
  
  /**
   * Suggest what to work on next
   */
  private async executeSuggest(context: BacklogContext): Promise<string> {
    if (context.inProgressItems.length > 0) {
      return chalk.yellow(`You're already working on: ${context.inProgressItems[0].title} (${context.inProgressItems[0].id})\nConsider finishing it before starting something new.`);
    }
    
    if (context.highPriorityItems.length > 0) {
      const item = context.highPriorityItems[0];
      return chalk.cyan(`🎯 Suggested next item:\n${this.backlog.formatItem(item, true)}\n\nStart with: ${chalk.green(`ginko "start working on ${item.id}"`)}`) ;
    }
    
    return chalk.yellow('No high priority items. Consider reviewing your backlog or creating new items.');
  }
  
  /**
   * Plan work
   */
  private async executePlan(request: string, context: BacklogContext): Promise<string> {
    const prompt = `
Help plan work based on this request: "${request}"

Current backlog has:
- ${context.activeItems.length} active items
- ${context.highPriorityItems.length} high priority items

Create a suggested work plan.`;

    const adapter = await this.getAdapter();
    const plan = await adapter.complete(prompt, { temperature: 0.7 });
    
    return chalk.cyan('📋 Suggested Plan:\n') + plan;
  }
  
  /**
   * Suggest fallback commands when AI fails
   */
  private suggestFallback(request: string) {
    console.log(chalk.dim('\nTry these specific commands instead:'));
    
    const suggestions = [
      'ginko backlog create "Your description"',
      'ginko backlog list',
      'ginko backlog show FEATURE-001',
      'ginko backlog update FEATURE-001 -s in-progress',
      'ginko backlog complete FEATURE-001'
    ];
    
    suggestions.forEach(cmd => {
      console.log(`  ${chalk.green(cmd)}`);
    });
  }
}

/**
 * Main command entry point
 */
export async function aiEnhancedCommand(request: string, options: AiEnhancedOptions = {}) {
  const enhancedBacklog = new AiEnhancedBacklog();
  await enhancedBacklog.execute(request, options);
}