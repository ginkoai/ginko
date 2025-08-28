/**
 * @fileType: model
 * @status: current
 * @updated: 2025-08-28
 * @tags: [adapter, generic, fallback, ai]
 * @related: [ai-adapter.ts, ai-instructions-template.ts]
 * @priority: medium
 * @complexity: low
 * @dependencies: []
 */

import { BaseAiAdapter } from './ai-adapter';

export class GenericAdapter extends BaseAiAdapter {
  name = 'AI';
  fileExtension = 'AI.md';
  
  getModelSpecificSections(): string {
    return `
## AI Assistant Guidelines

### General Best Practices
- Be clear and specific with requests
- Provide context when needed
- Break complex tasks into smaller steps

### Code Collaboration
- Share complete code files when possible
- Specify language and framework versions
- Include error messages verbatim`;
  }
  
  getQuickReferenceCommands(): string {
    return `
### AI Quick Reference
- **New features**: Provide clear requirements
- **Bug fixes**: Include full error messages
- **Refactoring**: Explain the goal clearly`;
  }
}