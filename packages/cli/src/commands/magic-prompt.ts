/**
 * @fileType: command
 * @status: current
 * @updated: 2025-09-11
 * @tags: [magic, ai, natural-language, prompts, router]
 * @related: [backlog/ai-prompt.ts]
 * @priority: critical
 * @complexity: low
 * @dependencies: [chalk]
 */

import chalk from 'chalk';
import { aiPromptCommand } from './backlog/ai-prompt.js';

interface MagicOptions {
  verbose?: boolean;
  raw?: boolean;
}

/**
 * Magic command - outputs prompts for ambient AI based on domain
 */
export async function magicPromptCommand(request: string, options: MagicOptions = {}) {
  try {
    // Detect domain from request
    const domain = detectDomain(request);
    
    if (options.verbose) {
      console.log(chalk.dim(`Detected domain: ${domain}`));
    }
    
    // Route to appropriate prompt generator
    switch (domain) {
      case 'backlog':
        return aiPromptCommand(request, options);
        
      case 'git':
        outputGitPrompt(request);
        break;
        
      case 'session':
        outputSessionPrompt(request);
        break;
        
      case 'context':
        outputContextPrompt(request);
        break;
        
      default:
        outputGeneralPrompt(request);
    }
    
  } catch (error) {
    console.error(chalk.red('Failed to generate prompt'));
    console.error(chalk.red(error instanceof Error ? error.message : 'Unknown error'));
    process.exit(1);
  }
}

/**
 * Detect which domain the request belongs to
 */
function detectDomain(request: string): string {
  const lower = request.toLowerCase();
  
  // Backlog keywords
  if (lower.match(/(feature|story|task|backlog|create|add|todo|priority|assign|complete|done|work on|plan)/)) {
    return 'backlog';
  }
  
  // Git keywords
  if (lower.match(/(commit|push|pull|branch|merge|checkout|stash|diff|git)/)) {
    return 'git';
  }
  
  // Session keywords
  if (lower.match(/(handoff|session|capture|vibecheck)/)) {
    return 'session';
  }
  
  // Context keywords
  if (lower.match(/(context|remember|learned|insight)/)) {
    return 'context';
  }
  
  return 'general';
}

/**
 * Output git operation prompt
 */
function outputGitPrompt(request: string): void {
  console.log(chalk.cyan('═══ AI Task ═══════════════════════════════════════════'));
  console.log(`
<ai-task>
Help with git operation.

USER REQUEST: "${request}"

COMMON COMMANDS:
\`\`\`bash
git add .                          # Stage all changes
git commit -m "message"            # Commit with message
git push                           # Push to remote
git pull                           # Pull from remote
git status                         # Check status
git diff                           # View changes
git log --oneline -10              # Recent commits
git checkout -b feature-branch     # Create new branch
\`\`\`

Execute the appropriate git command(s) based on the request.
</ai-task>`);
  console.log(chalk.cyan('═══════════════════════════════════════════════════════'));
}

/**
 * Output session management prompt
 */
function outputSessionPrompt(request: string): void {
  console.log(chalk.cyan('═══ AI Task ═══════════════════════════════════════════'));
  console.log(`
<ai-task>
Help with session management.

USER REQUEST: "${request}"

AVAILABLE COMMANDS:
\`\`\`bash
ginko handoff "message"     # Save session progress
ginko status                # Show current status
ginko vibecheck             # Quick recalibration
ginko capture "insight"     # Capture a learning
\`\`\`

Execute the appropriate command based on the request.
</ai-task>`);
  console.log(chalk.cyan('═══════════════════════════════════════════════════════'));
}

/**
 * Output context management prompt
 */
function outputContextPrompt(request: string): void {
  console.log(chalk.cyan('═══ AI Task ═══════════════════════════════════════════'));
  console.log(`
<ai-task>
Help with context management.

USER REQUEST: "${request}"

AVAILABLE COMMANDS:
\`\`\`bash
ginko context               # Show current context
ginko context -a file.ts    # Add file to context
ginko context -r file.ts    # Remove from context
ginko capture "learning"    # Capture an insight
\`\`\`

Execute the appropriate command based on the request.
</ai-task>`);
  console.log(chalk.cyan('═══════════════════════════════════════════════════════'));
}

/**
 * Output general help prompt
 */
function outputGeneralPrompt(request: string): void {
  console.log(chalk.cyan('═══ AI Task ═══════════════════════════════════════════'));
  console.log(`
<ai-task>
Help with Ginko command.

USER REQUEST: "${request}"

MAIN GINKO COMMANDS:
- ginko init                  # Initialize project
- ginko start                 # Start session
- ginko handoff "message"     # Save progress
- ginko backlog [command]     # Manage backlog
- ginko ship "message"        # Create PR
- ginko vibecheck            # Recalibrate
- ginko --help               # Show all commands

Determine what the user wants and execute the appropriate command.
</ai-task>`);
  console.log(chalk.cyan('═══════════════════════════════════════════════════════'));
}