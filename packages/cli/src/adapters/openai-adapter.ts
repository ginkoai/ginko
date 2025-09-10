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
- Effective with Chain-of-Thought prompting

## 🧠 Context Reflexes for GPT

### GPT-Optimized Reflexes

1. **"Let me think step-by-step" Reflex** 🔍
   - GPT naturally breaks down complex problems
   - Triggers: Complex implementations, multi-step tasks
   - Example: "Step 1: Check existing auth... Step 2: Design middleware..."

2. **"Analyzing the pattern" Reflex** 📊
   - GPT excels at pattern recognition and analysis
   - Triggers: Before implementing, when seeing repeated code
   - Example: "I notice this follows the Repository pattern like in..."

3. **"Clarification needed" Reflex** ❓
   - GPT asks specific, structured questions
   - Triggers: Ambiguous requirements, missing context
   - Example: "To proceed, I need to know: 1) Auth type? 2) User roles?"

4. **"Documenting insights" Reflex** 📝
   - GPT captures learnings in structured format
   - Triggers: After solving problems, discovering patterns
   - Example: "Key learning: [insight]. This applies to [use cases]."

### GPT Work Modes
- **Fast iteration**: Reflexes focus on rapid validation
- **Structured development**: Reflexes emphasize documentation
- **Deep analysis**: Reflexes trigger comprehensive exploration

GPT's reflexes leverage its strength in structured thinking and analysis.`;
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