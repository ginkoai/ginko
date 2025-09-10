/**
 * @fileType: model
 * @status: current
 * @updated: 2025-09-10
 * @tags: [adapter, grok, xai, ai]
 * @related: [ai-adapter.ts, ai-instructions-template.ts]
 * @priority: high
 * @complexity: low
 * @dependencies: []
 */

import { BaseAiAdapter } from './ai-adapter.js';

export class GrokAdapter extends BaseAiAdapter {
  name = 'Grok';
  fileExtension = 'GROK.md';
  
  getModelSpecificSections(): string {
    return `
## How to Use This Guide with Grok

### Starting a Session
1. **Run in terminal**: \`ginko start\`
2. **Set API key**: \`export GROK_API_KEY=your-key\` or \`export XAI_API_KEY=your-key\`
3. **Run handoff**: \`ginko handoff\` to extract insights with Grok
4. **Begin with**: "Let's continue working on [task] with Grok's assistance"

### During Development
- **Save progress**: Run \`ginko handoff\` in terminal periodically
- **Grok analyzes**: Session changes, patterns, and insights
- **Context modules**: Generated automatically in \`.ginko/context/modules/\`

### Grok-Specific Features

#### Humor & Personality
- Grok has a distinctive personality with humor
- Can provide entertaining yet accurate technical explanations
- Balances professionalism with wit

#### Real-Time Knowledge
- Access to current information through X platform
- Up-to-date with latest tech trends and discussions
- Can reference recent developments in tech

#### Technical Depth
- Strong understanding of complex systems
- Excellent at explaining intricate concepts simply
- Good at identifying non-obvious connections

### Best Practices with Grok
- Embrace Grok's humor while staying focused on tasks
- Ask for explanations "in Grok style" for memorable learning
- Use for both serious analysis and creative problem-solving
- Leverage real-time knowledge for current tech questions`;
  }
  
  getQuickReferenceCommands(): string {
    return `
### Grok Quick Reference
- **API setup**: \`export GROK_API_KEY=your-key\`
- **Humor mode**: Ask Grok to "explain with humor"
- **Deep dive**: Request "technical deep dive" for complex topics
- **Current events**: Ask about "latest developments in [topic]"
- **Creative solutions**: "Give me an unconventional approach"

## 🧠 Context Reflexes for Grok

### Grok-Enhanced Reflexes

1. **"Actually, here's a better way" Reflex** 🚀
   - Grok suggests unconventional but effective approaches
   - Triggers: Seeing standard patterns, complex problems
   - Example: "The typical approach would be X, but considering Y, let's try..."

2. **"This reminds me of..." Reflex** 🔗
   - Grok connects to broader tech context and trends
   - Triggers: Implementation decisions, architecture choices
   - Example: "This is similar to how Discord solved scaling with..."

3. **"Let me be real with you" Reflex** 💭
   - Grok provides honest assessment when something's off
   - Triggers: Over-engineering, wrong approach, confusion
   - Example: "Honestly, this is getting complex. The simple solution is..."

4. **"Fun fact" Learning Reflex** 💡
   - Grok makes insights memorable with context
   - Triggers: Discovering patterns, solving problems
   - Example: "Fun fact: This bug happens because JavaScript's sort() treats numbers as strings by default."

### Grok Work Modes
- **Exploration mode**: Reflexes encourage creative solutions
- **Reality check mode**: Reflexes provide honest feedback
- **Learning mode**: Reflexes include memorable context

Grok's reflexes blend technical expertise with personality for memorable collaboration.`;
  }
}