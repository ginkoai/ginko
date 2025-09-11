---
type: module
tags: [ai, reflection, backlog, templates, architecture]
area: packages/cli/src/commands/backlog
created: 2025-09-11
updated: 2025-09-11
relevance: critical
dependencies: [ai-template.ts, magic-simple.ts]
---

# AI Reflection Pattern for Backlog Management

## Context
Discovered during implementation of ginko backlog AI enhancement. Initially built wrong architecture (embedded AI with API keys), then realized the correct pattern: ginko should output templates that guide ambient AI (Claude/Cursor/Copilot) to create rich content through reflection on context and conversation.

## The Reflection Pattern

### Core Insight
When a human asks "create a feature for X", the AI shouldn't just execute `ginko feature "X"`. Instead:

1. **Human Intent** → "Create feature for dark mode"
2. **AI Recognition** → Understands this needs rich content
3. **AI Calls** → `ginko backlog ai "create feature for dark mode"`
4. **Ginko Returns** → Template + Context + Rules
5. **AI Reflects On**:
   - The conversation context
   - Current system state
   - Related work items
   - Technical constraints
6. **AI Creates** → Complete, structured backlog item

### Three-Part Harmony
- **Human Judgment**: Decides what needs to be built
- **AI Contextual Creation**: Fills templates with rich, contextual content
- **Traditional Code**: Provides structure, storage, git tracking

## Technical Implementation

### Wrong Approach (What We Built First)
```typescript
// ai-enhanced.ts - WRONG: Embedded AI
const adapter = await getAiAdapter();
const response = await adapter.complete(prompt);
```
**Problems**: Needs API keys, creates middleware, ginko trying to BE an AI

### Correct Approach (Final Architecture)
```typescript
// ai-template.ts - RIGHT: Template generation
export async function aiTemplateCommand(request: string) {
  const template = generateContentTemplate(intent, request, context);
  console.log(template); // AI reads and acts on this
}
```
**Benefits**: No API keys, works with any AI, transparent, powerful

## Code Examples

### Template-Based Content Generation
```typescript
// From ai-template.ts
function generateCreateItemTemplate(request: string, context: any): string {
  return `
<ai-task>
CREATE A COMPLETE ITEM WITH:
1. METADATA: Type, Title, Priority, Size
2. PROBLEM STATEMENT: What, Who, Pain point
3. SOLUTION APPROACH: Technical approach, Alternatives
4. ACCEPTANCE CRITERIA: Measurable outcomes
5. TECHNICAL NOTES: Dependencies, Security, Performance

EXECUTE:
\`\`\`bash
ginko backlog create [type] "[title]" -p [priority] -s [size]
\`\`\`
Then edit backlog/items/[ID].md with complete content
</ai-task>`;
}
```

### Simple Queries Don't Need Templates
```typescript
// From quick-query.ts
if (isSimpleQuery(request)) {
  // Direct response for "how many features?"
  return `📊 ${openItems.length} open features`;
}
// Only complex content generation gets templates
```

## Impact

### Architecture Benefits
- **No Configuration**: Works immediately in Claude Code, Cursor, Copilot
- **Transparent**: Users see templates, understand the process
- **Powerful**: AI has full context for rich content creation
- **Git-Native**: Everything tracked in version control

### Quality Improvement
Without reflection pattern:
```markdown
Title: Dark mode
Description: Add dark mode
```

With reflection pattern:
```markdown
Title: Dark Mode Theme Support
Problem: 68% users want dark mode for reduced eye strain...
Solution: CSS variables + theme context provider...
Acceptance Criteria: [8 specific criteria]
Technical Notes: Performance, security, dependencies...
```

## Key Principles

1. **Templates for Content, Not Commands**: Don't teach AI to use CLI, guide content creation
2. **Reflection Over Execution**: AI reflects on context to create rich content
3. **Ambient AI Integration**: Leverage existing AI, don't embed one
4. **Progressive Enhancement**: Simple commands → shortcuts → AI templates

## Anti-Patterns to Avoid

❌ **Command Explanation Prompts**
```
"To list items, execute: ginko backlog list"
```

❌ **Unnecessary Middleware**
```
Human → Ginko → AI Service → Response
```

❌ **Pattern Matching Every Query**
```typescript
if (query.includes('how many')) { /* handle directly */ }
```

## Related Patterns

- **Handoff Template Pattern**: Similar reflection for session handoffs
- **PRD Generation**: Templates guide comprehensive documentation
- **Sprint Planning**: Structured templates with context awareness

## References
- ADR-012: Ginko Command Architecture - Structured Freedom
- ADR-024: AI Reflection Pattern
- backlog/items/STORY-002: AI Integration Layer design

## Usage Guidelines

### When to Use Reflection (Templates)
- Creating new backlog items with rich content
- Writing PRDs or technical specifications  
- Planning sprints or decomposing work
- Any content that benefits from structure + context

### When NOT to Use Reflection
- Simple queries (counts, status checks)
- Direct command execution
- Navigation or viewing operations
- Updates to existing items

## Future Enhancements
- Template learning from team patterns
- Context module auto-discovery
- Progressive template complexity based on user expertise