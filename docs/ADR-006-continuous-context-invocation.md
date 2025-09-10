# ADR-006: Continuous Context Invocation Pattern

## Status
Proposed

## Context

The challenge of keeping AI context active throughout a session without disrupting developer flow requires careful architectural decisions. We need the AI to continuously reference and update its context while avoiding:
- Mechanical, robotic responses
- Flow-breaking interruptions
- Cognitive overload
- Process overhead

## Decision

We will implement a **Context Reflexes** pattern rather than constant prompting or mechanical checking.

### Context Reflexes

Four core reflexes embedded in AI behavior:

1. **"Why Am I Doing This?" Reflex** (30-minute intervals)
   - Natural pause points to verify alignment
   - Traces work back to PRD→Architecture→Sprint→Task

2. **"Have We Done This Before?" Reflex** (before implementation)
   - Automatic pattern search before coding
   - Natural language: "This looks similar to..."

3. **"Something Feels Off" Reflex** (confusion trigger)
   - Trust instincts when context feels incomplete
   - Proactive gap identification

4. **"Update My Understanding" Reflex** (after discoveries)
   - Capture new patterns
   - Update mental model
   - Note for future sessions

### Implementation Approach

```markdown
// In CLAUDE.md or AI instructions
## Your Natural Thought Patterns

When working, maintain these reflexes:
- Before implementing: "Let me check our patterns..."
- When confused: "I might be missing context..."
- After discoveries: "This is worth remembering..."
- Periodically: "This aligns with [goal] because..."
```

### Natural Language Integration

Good examples:
- "This reminds me of the auth pattern we used before"
- "According to our architecture, this component should..."
- "This supports our sprint goal of reducing latency"

Bad examples:
- "LOADING CONTEXT MODULE: auth-pattern.md"
- "CHECKING ALIGNMENT WITH PRD SECTION 3.2"
- "CONTEXT SCORE: 85%"

## Consequences

### Positive
- **Preserves Flow**: Natural thought patterns don't interrupt
- **Maintains Awareness**: Continuous but not intrusive
- **Encourages Learning**: Discoveries become future context
- **Human-Like**: Feels like working with experienced teammate
- **Self-Correcting**: Reflexes catch misalignment early

### Negative
- **Training Required**: AI needs instruction on reflexes
- **Subtlety Risk**: Too subtle might miss issues
- **Measurement Challenge**: Hard to quantify reflex effectiveness
- **Consistency**: Different AI models may interpret differently

### Mitigation Strategies

1. **Clear Instructions**: Detailed examples in CLAUDE.md
2. **Vibecheck Backup**: Human can always call for alignment
3. **Statusline Support**: Visual indicators supplement reflexes
4. **Progressive Enhancement**: Start simple, add reflexes gradually

## Alternatives Considered

### 1. Constant Prompting
```
"CHECK: Does this align with requirements?"
"LOAD: Relevant context for current task"
```
**Rejected**: Too mechanical, breaks flow

### 2. Scheduled Checkpoints
```
Every 15 minutes: Full context assessment
Every hour: Alignment verification
```
**Rejected**: Rigid timing doesn't match natural work patterns

### 3. Manual Triggers Only
```
User must explicitly request context checks
```
**Rejected**: Puts burden on user, misses opportunities

### 4. Fully Automatic Background
```
Invisible context management
```
**Rejected**: No visibility into AI's understanding

## Implementation Details

### Phase 1: Embed in Instructions
```markdown
// Add to CLAUDE.md
## Context Reflexes
[Full reflex descriptions]
```

### Phase 2: Natural Language Patterns
```typescript
// Examples for AI behavior
const contextPhrases = [
  "This aligns with our goal of...",
  "Similar to the pattern we used for...",
  "Let me check if we have a pattern for this...",
  "This might be a good gotcha to capture..."
];
```

### Phase 3: Measurement
- Track reflex triggers
- Monitor alignment corrections
- Measure flow preservation
- Gather developer feedback

## Related Decisions

- ADR-007: Phase Context Coherence
- ADR-008: Context Reflexes Architecture
- ADR-009: Progressive Context Loading

## References

- Context-Aware AI Systems (Research)
- Flow State Preservation in Developer Tools
- Natural Language Interface Design

---

*This ADR establishes the Context Reflexes pattern as our approach to continuous context awareness, prioritizing natural integration over mechanical process.*