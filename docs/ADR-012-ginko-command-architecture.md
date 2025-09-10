# ADR-012: Ginko Command Architecture - Structured Freedom

## Status
Proposed

## Context

Command-line interfaces typically fall into two categories:
1. **Rigid structure** (traditional CLIs): Precise syntax, steep learning curve, breaks flow
2. **Pure AI** (ChatGPT-style): Inconsistent results, endless clarifications, no patterns

Developers need something that combines the consistency of structured commands with the flexibility of natural language. The insight is that **templates and patterns can guide AI** to produce perfect results while accepting human input in any form.

## Decision

Implement a **three-layer architecture** that provides structured freedom:

```
Human Intent → Ginko Structure → AI Execution
```

### Core Architecture

```typescript
interface GinkoCommand {
  // Layer 1: Accept any input
  input: string;
  
  // Layer 2: Apply structure
  template: Template;
  pattern: WorkflowPattern;
  validation: Rules;
  
  // Layer 3: AI fills details
  aiContext: {
    gitState: GitStatus;
    backlogItems: Item[];
    recentHistory: Command[];
  };
}
```

### Command Resolution Strategy

```typescript
function resolveCommand(input: string): Resolution {
  // 1. Try direct command match
  if (commands[input.split(' ')[0]]) {
    return { type: 'direct', command: parseCommand(input) };
  }
  
  // 2. Try shortcut match
  if (shortcuts[input.split(' ')[0]]) {
    return { type: 'shortcut', command: expandShortcut(input) };
  }
  
  // 3. Detect question
  if (input.endsWith('?') || startsWithQuestion(input)) {
    return { type: 'question', template: 'help' };
  }
  
  // 4. Detect intention
  if (looksLikeCreation(input)) {
    return { type: 'create', template: inferType(input) };
  }
  
  // 5. Default to AI interpretation
  return { type: 'ai', template: 'general' };
}
```

### Progressive Interface Levels

```yaml
Level 0 - Discovery:
  Command: ginko help
  Purpose: Learn what's possible

Level 1 - Explicit:
  Command: ginko backlog create feature "OAuth"
  Purpose: Clear, unambiguous, learnable

Level 2 - Shortcuts:
  Command: ginko feature "OAuth"
  Purpose: Faster, still clear

Level 3 - Aliases:
  Command: gf "OAuth"
  Purpose: Muscle memory optimization

Level 4 - Natural:
  Command: ginko "add oauth"
  Purpose: Think less, do more

Level 5 - Intent:
  Command: ginko "ship"
  Purpose: Pure flow state
```

## Rationale

### Why This Architecture Works

1. **Eliminates Decision Fatigue**
   - Templates provide smart defaults
   - AI infers from context
   - User just states intent

2. **Maintains Consistency**
   - Every feature follows template structure
   - Every commit follows team patterns
   - Every PR looks professional

3. **Reduces Cognitive Load**
   ```
   Traditional: Remember syntax → Type correctly → Fix errors
   Ginko: State intent → Get result
   ```

4. **Leverages Comparative Advantages**
   - Humans: Know what they want
   - AI: Knows how to format it
   - Ginko: Knows the right pattern

### Template-Guided AI

Templates act as **contracts** between human intent and AI execution:

```yaml
template: feature-create
inputs:
  description: {from_user}
  context: {from_git}
structure:
  - Extract problem statement
  - Generate success criteria
  - Set appropriate priority
  - Link to parent if found
outputs:
  - Valid frontmatter
  - Consistent format
  - Linked relationships
```

### Error Prevention

```typescript
// Instead of letting AI freestyle...
ai.complete("Create a feature for OAuth")
// ...which might produce anything

// Ginko provides structure
ai.complete({
  template: 'feature-template.md',
  context: currentState,
  rules: teamPatterns,
  validation: required_fields
})
// Guaranteed valid output
```

## Consequences

### Positive

- ✅ **Zero learning curve**: Just type what you want
- ✅ **Perfect consistency**: Templates ensure quality
- ✅ **Faster over time**: Progressive mastery
- ✅ **AI amplification**: AI helps instead of confuses
- ✅ **Flow preservation**: Never break concentration

### Negative

- ⚠️ **AI dependency**: Requires AI service (mitigated by fallback to structured commands)
- ⚠️ **Template maintenance**: Templates need updates (mitigated by version control)
- ⚠️ **Ambiguity handling**: Some inputs unclear (mitigated by clarification prompts)

### Neutral

- 📝 Team must agree on templates
- 📝 Patterns become implicit knowledge
- 📝 Success depends on template quality

## Implementation Plan

### Phase 1: Core Commands (Week 1)
```bash
ginko feature/story/task/epic "description"
ginko list [filters]
ginko status
```

### Phase 2: Natural Language (Week 2)
```bash
ginko "any natural language request"
# Routes to appropriate handler
```

### Phase 3: AI Enhancement (Week 3)
- Template system
- Context gathering
- Smart inference

### Phase 4: Progressive Shortcuts (Week 4)
- Command aliases
- Interactive mode
- Command palette

## Success Metrics

1. **Time to create item**: < 5 seconds
2. **Commands to learn**: Start with 0
3. **Consistency rate**: 100% valid outputs
4. **User satisfaction**: "It just works"

## Decision Reversal

If this approach fails, we can:
1. Fall back to traditional CLI (Level 1 always works)
2. Remove AI layer (templates still valuable)
3. Export to standard formats (no lock-in)

## References

- PRD-008: Git-Native Backlog Management
- Linear's keyboard shortcuts
- Unix philosophy: "Make it easy to do the right thing"
- Behavioral Economics: Libertarian Paternalism

## Quote

> "The best interface is no interface. The best syntax is no syntax. The best command is just saying what you want." - The Ginko Philosophy