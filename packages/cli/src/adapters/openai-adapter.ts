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
## How to Use This Guide with GPT

### Starting a Session
1. **Run in terminal**: \`ginko start\`
2. **Upload this file** (GPT.md) to ChatGPT
3. **For context**, also upload: \`.ginko/sessions/*/current.md\`
4. **Begin with**: "I've uploaded my project context. Let's continue working on [task]"

### During Development
- **Save progress**: Run \`ginko handoff\` in terminal periodically
- **Load handoff**: Upload \`.ginko/sessions/*/current.md\` to GPT
- **Context modules**: Upload relevant \`.ginko/context/modules/*.md\` files

### Creating a Custom GPT
For repeated use, create a Custom GPT with:
- **Instructions**: Copy contents of this GPT.md file
- **Knowledge**: Upload \`.ginko/context/modules/\` directory
- **Conversation starters**: 
  - "Load my ginko handoff"
  - "Start new feature with ginko context"
  - "Review my code using ginko standards"

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
- **Step-by-step**: Break complex tasks into steps
- **File context**: Say "I've uploaded [filename]" when sharing files
- **Save state**: Ask GPT to "summarize our progress" before ending session`;
  }
}