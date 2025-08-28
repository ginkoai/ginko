/**
 * @fileType: model
 * @status: current
 * @updated: 2025-08-28
 * @tags: [adapter, openai, gpt, ai]
 * @related: [ai-adapter.ts, ai-instructions-template.ts]
 * @priority: high
 * @complexity: low
 * @dependencies: []
 */

import { BaseAiAdapter } from './ai-adapter.js';

export class OpenAIAdapter extends BaseAiAdapter {
  name = 'GPT';
  fileExtension = 'GPT.md';
  
  getModelSpecificSections(): string {
    return `
## GPT-Specific Features

### Code Interpreter
- GPT can execute Python code directly
- Useful for data analysis and calculations
- Can generate and test code in real-time

### Function Calling
- GPT supports function calling for tools
- Can integrate with external APIs
- Structured outputs with JSON mode

### Best Practices with GPT
- Use system prompts for consistent behavior
- GPT works well with step-by-step instructions
- Effective with Chain-of-Thought prompting`;
  }
  
  getQuickReferenceCommands(): string {
    return `
### GPT Quick Reference
- **Code execution**: Ask to "run this code" for Python
- **Structured output**: Request JSON format for data
- **Step-by-step**: Break complex tasks into steps`;
  }
}