/**
 * @fileType: command
 * @status: current
 * @updated: 2025-09-11
 * @tags: [backlog, ai, prompts, ambient-ai]
 * @related: [context-gatherer.ts, base.ts]
 * @priority: critical
 * @complexity: medium
 * @dependencies: [chalk, context-gatherer]
 */

import chalk from 'chalk';
import { ContextGatherer } from './context-gatherer.js';
import { BacklogBase } from './base.js';
import { handleQuickQuery } from './quick-query.js';

interface AiPromptOptions {
  verbose?: boolean;
  raw?: boolean;
}

/**
 * Generate AI prompts for ambient AI to execute
 * Following the pattern: Human → CLI → Prompt → AI → Action
 */
export async function aiPromptCommand(request: string, options: AiPromptOptions = {}) {
  try {
    // First, try to handle as a quick query for immediate response
    const quickResponse = await handleQuickQuery(request);
    if (quickResponse) {
      console.log(quickResponse);
      return;
    }
    
    // Not a simple query - generate AI prompt for complex tasks
    const contextGatherer = new ContextGatherer();
    const context = await contextGatherer.gatherContext();
    const backlog = new BacklogBase();
    await backlog.init();
    
    // Detect intent from request
    const intent = detectBasicIntent(request);
    
    // Generate appropriate prompt based on intent
    const prompt = await generatePrompt(intent, request, context, backlog);
    
    // Output the prompt for the ambient AI
    if (options.raw) {
      // Raw mode: just the prompt
      console.log(prompt);
    } else {
      // Formatted mode with visual markers
      console.log(chalk.cyan('═══ AI Task ═══════════════════════════════════════════'));
      console.log(prompt);
      console.log(chalk.cyan('═══════════════════════════════════════════════════════'));
      console.log(chalk.dim('\n// The AI should now execute the suggested commands'));
    }
    
  } catch (error) {
    console.error(chalk.red('Failed to generate AI prompt'));
    console.error(chalk.red(error instanceof Error ? error.message : 'Unknown error'));
    process.exit(1);
  }
}

/**
 * Detect basic intent from request
 */
function detectBasicIntent(request: string): string {
  const lower = request.toLowerCase();
  
  if (lower.includes('create') || lower.includes('add') || lower.includes('new')) {
    return 'create';
  }
  if (lower.includes('list') || lower.includes('show all') || lower.includes('see')) {
    return 'list';
  }
  if (lower.includes('complete') || lower.includes('done') || lower.includes('finish')) {
    return 'complete';
  }
  if (lower.includes('update') || lower.includes('change') || lower.includes('modify')) {
    return 'update';
  }
  if (lower.includes('what') || lower.includes('suggest') || lower.includes('next')) {
    return 'suggest';
  }
  if (lower.includes('plan') || lower.includes('organize') || lower.includes('break down')) {
    return 'plan';
  }
  
  return 'general';
}

/**
 * Generate prompt for ambient AI based on intent
 */
async function generatePrompt(
  intent: string,
  request: string,
  context: any,
  backlog: BacklogBase
): Promise<string> {
  const contextSummary = new ContextGatherer().generateContextSummary(context);
  
  switch (intent) {
    case 'create':
      return generateCreatePrompt(request, contextSummary);
    
    case 'list':
      return generateListPrompt(request, context);
    
    case 'complete':
      return generateCompletePrompt(request, context);
    
    case 'update':
      return generateUpdatePrompt(request, context);
    
    case 'suggest':
      return generateSuggestPrompt(context);
    
    case 'plan':
      return generatePlanPrompt(request, context);
    
    default:
      return generateGeneralPrompt(request, contextSummary);
  }
}

/**
 * Generate CREATE prompt
 */
function generateCreatePrompt(request: string, contextSummary: string): string {
  return `
<ai-task>
Create a backlog item based on this request.

USER REQUEST: "${request}"

CONTEXT:
${contextSummary}

INSTRUCTIONS:
1. Determine the type (feature, story, or task) based on the request
2. Create a concise title (max 60 characters)
3. Set priority based on context:
   - critical: Blocking other work or security issues
   - high: User-facing or mentioned as important
   - medium: Standard features
   - low: Nice-to-have improvements
4. Estimate size:
   - S: < 1 day
   - M: 1-3 days
   - L: 3-5 days
   - XL: > 5 days

EXECUTE:
\`\`\`bash
ginko backlog create [type] "[title]" -p [priority] -s [size]
\`\`\`

Then edit the created file to add:
- Problem statement
- Solution approach
- Acceptance criteria
- Technical notes

EXAMPLE OUTPUT:
\`\`\`bash
ginko backlog create feature "Dark Mode Theme Support" -p high -s L
\`\`\`
</ai-task>`;
}

/**
 * Generate LIST prompt
 */
function generateListPrompt(request: string, context: any): string {
  const filters = [];
  
  if (context.inProgressItems.length > 0) {
    filters.push('Currently in progress items are most relevant');
  }
  if (context.highPriorityItems.length > 5) {
    filters.push('Many high priority items need attention');
  }
  
  return `
<ai-task>
List backlog items based on this request.

USER REQUEST: "${request}"

CONTEXT:
- Total items: ${context.activeItems.length}
- In progress: ${context.inProgressItems.length}
- High priority: ${context.highPriorityItems.length}
${filters.length > 0 ? '\nNOTE: ' + filters.join(', ') : ''}

EXECUTE ONE OF:
\`\`\`bash
ginko backlog list                    # All items
ginko backlog list -s in-progress     # Current work
ginko backlog list -p high            # High priority
ginko backlog list -t feature         # Features only
ginko backlog list --tree             # Hierarchical view
\`\`\`

Choose the most appropriate based on the request.
</ai-task>`;
}

/**
 * Generate COMPLETE prompt
 */
function generateCompletePrompt(request: string, context: any): string {
  const inProgress = context.inProgressItems[0];
  
  return `
<ai-task>
Complete a backlog item.

USER REQUEST: "${request}"

CONTEXT:
${inProgress ? `Currently working on: ${inProgress.id} - ${inProgress.title}` : 'No items currently in progress'}

INSTRUCTIONS:
1. Identify which item to complete from the request
2. If not specified and one item is in progress, complete that
3. Add a completion note if the request includes details

EXECUTE:
\`\`\`bash
ginko backlog complete [ITEM-ID] -m "Completion note"
\`\`\`

EXAMPLE:
\`\`\`bash
ginko backlog complete FEATURE-022 -m "OAuth integration fully tested and deployed"
\`\`\`
</ai-task>`;
}

/**
 * Generate UPDATE prompt
 */
function generateUpdatePrompt(request: string, context: any): string {
  return `
<ai-task>
Update a backlog item.

USER REQUEST: "${request}"

CONTEXT:
In progress: ${context.inProgressItems.map((i: any) => `${i.id} - ${i.title}`).join(', ') || 'none'}

PARSE THE REQUEST FOR:
- Item ID (or infer from context)
- New status (todo, in-progress, done, blocked)
- Priority change
- Size update
- Assignment
- Progress note

EXECUTE:
\`\`\`bash
ginko backlog update [ITEM-ID] [options]
\`\`\`

OPTIONS:
- -s <status>: Update status
- -p <priority>: Update priority
- -a <email>: Assign to someone
- --size <size>: Update size estimate
- -m <message>: Add progress note
- -e: Open in editor

EXAMPLE:
\`\`\`bash
ginko backlog update FEATURE-022 -s in-progress -m "Started implementation"
\`\`\`
</ai-task>`;
}

/**
 * Generate SUGGEST prompt
 */
function generateSuggestPrompt(context: any): string {
  const suggestions = [];
  
  if (context.inProgressItems.length > 0) {
    const item = context.inProgressItems[0];
    suggestions.push(`Continue working on: ${item.id} - ${item.title}`);
  }
  
  if (context.highPriorityItems.length > 0) {
    const items = context.highPriorityItems.slice(0, 3);
    suggestions.push('High priority items to consider:');
    items.forEach((item: any) => {
      suggestions.push(`  - ${item.id}: ${item.title} [${item.priority}]`);
    });
  }
  
  return `
<ai-task>
Suggest what to work on next.

CURRENT CONTEXT:
${context.inProgressItems.length > 0 ? 
  `Already working on: ${context.inProgressItems[0].id} - ${context.inProgressItems[0].title}` :
  'No items currently in progress'}

High priority items: ${context.highPriorityItems.length}
Total active items: ${context.activeItems.length}

SUGGESTIONS:
${suggestions.join('\n')}

RECOMMENDED ACTIONS:
${context.inProgressItems.length > 0 ?
  `1. Continue with current work:
   \`\`\`bash
   ginko backlog show ${context.inProgressItems[0].id}
   \`\`\`` :
  context.highPriorityItems.length > 0 ?
  `1. Start highest priority item:
   \`\`\`bash
   ginko backlog update ${context.highPriorityItems[0].id} -s in-progress
   \`\`\`` :
  `1. Review all items:
   \`\`\`bash
   ginko backlog list
   \`\`\``
}

2. Or create a new high-priority item if needed:
   \`\`\`bash
   ginko backlog create feature "Critical feature" -p critical
   \`\`\`
</ai-task>`;
}

/**
 * Generate PLAN prompt
 */
function generatePlanPrompt(request: string, context: any): string {
  return `
<ai-task>
Create a work plan based on this request.

USER REQUEST: "${request}"

CONTEXT:
- Active items: ${context.activeItems.length}
- In progress: ${context.inProgressItems.length}
- High priority: ${context.highPriorityItems.length}

INSTRUCTIONS:
1. Break down the request into concrete tasks
2. Identify dependencies
3. Suggest priorities
4. Estimate effort

CREATE A PLAN:
1. List existing related items
2. Identify gaps
3. Create new items as needed
4. Suggest execution order

EXAMPLE COMMANDS TO EXECUTE:
\`\`\`bash
# First, review existing items
ginko backlog list -p high

# Create parent feature
ginko backlog create feature "Main feature" -p critical -s XL

# Create child tasks
ginko backlog create task "Setup infrastructure" -p critical -s M
ginko backlog create task "Implement core logic" -p high -s L
ginko backlog create task "Add tests" -p high -s M
ginko backlog create task "Documentation" -p medium -s S
\`\`\`
</ai-task>`;
}

/**
 * Generate GENERAL prompt
 */
function generateGeneralPrompt(request: string, contextSummary: string): string {
  return `
<ai-task>
Help with backlog management.

USER REQUEST: "${request}"

CONTEXT:
${contextSummary}

AVAILABLE COMMANDS:
- ginko backlog create [type] "[title]" - Create new item
- ginko backlog list [options] - List items
- ginko backlog show [ID] - Show item details
- ginko backlog update [ID] [options] - Update item
- ginko backlog complete [ID] - Mark as done

Determine what the user wants and execute the appropriate command(s).

If the request is a question, answer it based on the context.
If the request is an action, execute the appropriate commands.
</ai-task>`;
}