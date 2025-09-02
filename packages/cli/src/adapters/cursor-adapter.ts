/**
 * @fileType: model
 * @status: current
 * @updated: 2025-08-28
 * @tags: [adapter, cursor, ide, ai]
 * @related: [ai-adapter.ts, ai-instructions-template.ts]
 * @priority: high
 * @complexity: low
 * @dependencies: []
 */

import { BaseAiAdapter } from './ai-adapter.js';

export class CursorAdapter extends BaseAiAdapter {
  name = 'Cursor';
  fileExtension = '.cursorrules';
  
  getModelSpecificSections(): string {
    return `
## Cursor IDE Integration

This project uses Ginko for AI-enhanced development. The .ginko/ directory contains:
- Session handoffs for context continuity
- Best practices and team standards
- Project-specific patterns

### Cursor-Specific Features

#### Using Ginko Context
- Session files: .ginko/sessions/*/current.md contains latest work context
- Handoffs: .ginko/sessions/*/handoff.md for seamless continuation
- Context modules: .ginko/context/modules/*.md for specific domains

#### Cursor Commands
- Use Cmd+K to reference ginko context files
- Use Cmd+L to ask about session state
- @codebase includes .ginko automatically

### Workflow Integration

1. **Starting work**: Run \`ginko start\` in terminal to load context
2. **During development**: Cursor reads .ginko/ for persistent context
3. **Saving progress**: Run \`ginko handoff\` to save session state
4. **Switching tasks**: Handoffs preserve mental model across context switches

### Cursor Best Practices
- Keep .cursorrules concise to save tokens
- Reference .ginko/context/modules/ for detailed patterns
- Use @doc to pull in specific ginko modules
- Let Cursor's indexing handle the .ginko directory`;
  }
  
  getQuickReferenceCommands(): string {
    return `
### Quick Commands
- **Load context**: Reference .ginko/sessions/*/current.md
- **Check handoff**: Read .ginko/sessions/*/handoff.md
- **Team standards**: See .ginko/context/modules/best-practices.md
- **Save state**: Run \`ginko handoff\` in terminal`;
  }
  
  /**
   * Override the main generate method for Cursor's special format
   */
  async generate(projectInfo: any): Promise<string> {
    // For Cursor, we generate a more concise .cursorrules file
    // that references the .ginko directory for detailed context
    
    const projectName = projectInfo.name || projectInfo.projectName || 'Unnamed Project';
    const projectType = projectInfo.type || projectInfo.projectType || 'software';
    const techStack = projectInfo.techStack || [];
    const languages = projectInfo.languages || [];
    const frameworks = projectInfo.frameworks || [];
    const quickCommands = projectInfo.quickCommands || [];
    
    // Find test command from quick commands
    const testCommand = quickCommands.find((cmd: any) => 
      cmd.name?.toLowerCase().includes('test') || cmd.command?.includes('test')
    )?.command;
    
    const template = `# Project: ${projectName}

You are an AI assistant helping with ${projectType} development.

## Project Context
- Tech Stack: ${techStack.join(', ') || 'Not specified'}
- Languages: ${languages.join(', ') || 'Not specified'}  
- Frameworks: ${frameworks.join(', ') || 'Not specified'}

## Development Methodology
Follow INVENTORY → CONTEXT → THINK → PLAN → PRE-MORTEM → VALIDATE → ACT → TEST

## Ginko Integration
This project uses Ginko for context management:
- Session context: .ginko/sessions/*/current.md
- Handoffs: .ginko/sessions/*/handoff.md
- Best practices: .ginko/context/modules/best-practices.md
- Project patterns: .ginko/context/modules/*.md

When starting work, check .ginko/sessions/ for recent context and handoffs.

## Code Style
${frameworks.includes('react') ? '- Use functional components with hooks\n' : ''}${frameworks.includes('nextjs') ? '- Follow Next.js App Router patterns\n' : ''}${languages.includes('typescript') ? '- Use TypeScript strictly, avoid any\n' : ''}- Follow existing patterns in the codebase
- Maintain consistency with team standards

## Testing
${testCommand ? `Run tests with: ${testCommand}` : 'Add tests for new features'}

## Quick Reference
${this.getQuickReferenceCommands()}

---
Note: Extended context and detailed patterns are in .ginko/context/modules/
This keeps the .cursorrules file concise while maintaining full context access.`;

    return template;
  }
}