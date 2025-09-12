# ADR-004: Single-Pass Reflection Pattern

## Status
Accepted

## Context
As we implement the Universal Reflection Pattern across multiple domains (PRD, Architecture, Testing, etc.), we face a fundamental design decision about the interaction model between human and AI during the reflection process.

### Problem Statement
Should the reflection pattern be interactive (with back-and-forth during creation) or single-pass (atomic completion from intent to output)?

### Current State
The reflection pattern currently operates as: Human Intent → AI Reflection → Complete Output. Some team members have questioned whether we should add interaction points where the AI asks the human for clarification on key decisions.

### Requirements
- Predictable, consistent output generation
- Respect for human time and cognitive load
- Maintain AI focus and coherence
- Support users with varying expertise levels
- Enable iteration and refinement

## Decision
We will maintain a **single-pass reflection pattern** where the AI completes the entire reflection and output generation without interrupting for human input.

### Chosen Approach
The reflection pattern remains atomic:
1. Human provides clear intent
2. AI reflects using template, context, and rules
3. AI generates complete output
4. Human reviews and can initiate new reflection with refined intent

We will enhance this with **confidence scoring annotations** where the AI indicates uncertainty without breaking flow:
```markdown
## Decision
We will implement a plugin architecture using dependency injection.
<!-- confidence: 85% - alternative consideration: factory pattern (70%) -->
```

### Implementation Strategy
- Keep all reflection domains single-pass
- Add optional confidence annotations in output
- Support pre-reflection clarification (domain selection, scope)
- Enable post-reflection refinement through new iterations
- Never interrupt during reflection execution

## Consequences

### Positive
- ✅ **Predictable outcomes**: Every reflection produces a complete, usable artifact
- ✅ **Fast iteration**: Review-refine is faster than co-creation
- ✅ **Clear mental model**: One pattern, consistently applied across all domains
- ✅ **Maintained flow state**: No context switching or interruptions
- ✅ **AI coherence**: Full context maintained throughout generation
- ✅ **Respects expertise levels**: Humans learn by reviewing, not being quizzed

### Negative
- ❌ **Potential misdirection**: AI might pursue wrong path without early correction
- ❌ **Wasted cycles**: May generate complete output that needs significant revision
- ❌ **Missing context**: Human knowledge not incorporated during creation

### Neutral
- ⚪ Requires clear initial intent formulation
- ⚪ Multiple iterations may be needed for complex decisions
- ⚪ Human expertise grows through review rather than participation

## Alternatives Considered

### Option 1: Interactive Reflection
**Description**: AI pauses at decision points to ask human for input
**Pros**:
- Human expertise incorporated throughout
- Less chance of misdirection
- Educational for human
**Cons**:
- Breaks flow state
- Unpredictable completion time
- Risk of rabbit holes and tangents
- Requires human expertise to answer questions
- Complex state management
**Reason for rejection**: The rabbit hole risk and flow interruption outweigh the benefits. Humans may not have expertise to answer mid-process questions.

### Option 2: Hybrid Approach
**Description**: Optional interaction points that can be skipped
**Pros**:
- Flexibility for different use cases
- Can be interactive when needed
**Cons**:
- Complex implementation
- Inconsistent mental model
- Harder to predict outcomes
**Reason for rejection**: Complexity without clear benefit. Two patterns are harder to learn than one.

### Option 3: Do Nothing (Status Quo)
**Description**: Keep current single-pass approach without enhancements
**Pros**:
- Simple
- Already working
**Cons**:
- No visibility into AI confidence
- No guidance on what needs review
**Reason for rejection**: Confidence scoring adds value without complexity

## Trade-offs

| Aspect | Single-Pass | Interactive | Hybrid |
|--------|-------------|-------------|---------|
| Predictability | High | Low | Medium |
| Completion Speed | Fast | Variable | Variable |
| Human Effort | Low | High | Medium |
| Output Quality | Good | Potentially Better | Variable |
| Implementation Complexity | Low | High | Very High |
| Learning Curve | Simple | Complex | Complex |
| Flow Maintenance | Excellent | Poor | Medium |

## Related Decisions

### Prior Art
- ADR-021: No Role Prompting in Reflection Pattern - establishes simplicity principle
- FEATURE-029: Universal Reflection Pattern - defines core pattern
- PRD-001: Additional Reflection Domains - assumes single-pass model

### This Decision Enables
- Consistent domain implementations
- Predictable user experience
- Simple mental model across all tools
- Fast iteration cycles

### This Decision Constrains
- Cannot incorporate human expertise during generation
- May require multiple iterations for complex decisions
- AI must make assumptions when uncertain

## Success Metrics
- Time to complete artifact: < 30 seconds
- Iterations needed for acceptance: < 3 average
- User satisfaction with output quality: > 80%
- Successful completion rate: > 95%

## Review Schedule
- 3 months: Evaluate confidence scoring effectiveness
- 6 months: Assess if any domains need interaction
- 1 year: Review if pattern still meets needs

## Example: The Difference in Practice

### Interactive Approach (What We're Avoiding)
```
Human: Create ADR for caching strategy
AI: Should we optimize for read or write performance?
Human: I don't know, what's the difference?
AI: [Long explanation about caching patterns...]
Human: Maybe read?
AI: What's our expected cache hit ratio?
Human: How do I determine that?
[20 minutes later, no ADR produced]
```

### Single-Pass Approach (What We're Doing)
```
Human: Create ADR for caching strategy
AI: [Generates complete ADR with assumptions noted]
<!-- confidence: 70% on read optimization, considered write-through (60%) -->
Human: [Reviews] Actually, we need write optimization
Human: Create ADR for write-optimized caching strategy
AI: [Generates improved ADR with write focus]
[2 minutes total, working ADR in hand]
```

## Confidence Scoring Implementation

The AI should annotate outputs with confidence indicators when making assumptions:
- **High confidence (>80%)**: No annotation needed
- **Medium confidence (60-80%)**: Note in comments
- **Low confidence (<60%)**: Highlight alternatives considered

This gives humans immediate insight into areas needing refinement without breaking the generation flow.

## References
- Original discussion: PR comment thread on FEATURE-029
- Inspiration: Unix philosophy of "do one thing well"
- Research: "The Cost of Interrupted Work" - Microsoft Research

---
**Date**: 2025-09-12
**Author**: Chris Norton
**Reviewers**: Claude
**Approval**: Accepted based on implementation experience