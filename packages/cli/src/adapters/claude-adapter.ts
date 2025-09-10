/**
 * @fileType: model
 * @status: current
 * @updated: 2025-08-28
 * @tags: [adapter, claude, anthropic, ai]
 * @related: [ai-adapter.ts, ai-instructions-template.ts]
 * @priority: high
 * @complexity: low
 * @dependencies: []
 */

import { BaseAiAdapter } from './ai-adapter.js';

export class ClaudeAdapter extends BaseAiAdapter {
  name = 'Claude';
  fileExtension = 'CLAUDE.md';
  
  getModelSpecificSections(): string {
    return `
## Claude-Specific Features

### Artifacts
- Claude can create and edit artifacts for code files
- Use clear file boundaries when sharing code
- Claude preserves exact formatting and indentation

### Context Windows
- Claude has a large context window (200k tokens)
- Can handle entire codebases in context
- Maintains conversation history effectively

### Best Practices with Claude
- Be direct and specific with requests
- Claude responds well to structured prompts
- Use markdown for clear communication`;
  }
  
  getQuickReferenceCommands(): string {
    return `
### Claude Quick Reference
- **Clear context**: Start new conversation when switching tasks
- **Code artifacts**: Request "create an artifact" for new files
- **Detailed analysis**: Claude excels at code review and refactoring

## 🧠 Context Reflexes for Claude

### Claude-Optimized Reflexes

1. **"Let me understand the context" Reflex** 🔍
   - Claude deeply analyzes before acting
   - Triggers: New tasks, complex requirements
   - Example: "Looking at the existing auth system, I see it uses JWT with..."

2. **"I notice a pattern" Reflex** 🎯
   - Claude identifies and follows established patterns
   - Triggers: Code implementation, architecture decisions
   - Example: "I see you're using the Repository pattern consistently, so I'll..."

3. **"I should clarify" Reflex** 🤝
   - Claude proactively identifies ambiguities
   - Triggers: Multiple valid approaches, unclear requirements
   - Example: "Before proceeding, should this middleware handle refresh tokens?"

4. **"Let me document this" Reflex** 📝
   - Claude captures detailed context for continuity
   - Triggers: Complex solutions, important decisions
   - Example: "This approach works because... Future considerations include..."

### Claude Work Modes
- **Deep work**: Reflexes emphasize thorough understanding
- **Collaborative**: Reflexes focus on alignment and clarity
- **Learning**: Reflexes capture detailed documentation

Claude's reflexes leverage deep context understanding and thoughtful analysis.`;
  }
}