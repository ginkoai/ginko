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
- **Detailed analysis**: Claude excels at code review and refactoring`;
  }
}