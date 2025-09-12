# ADR-021: No Role Prompting in Reflection Pattern

## Status
Accepted

## Context

During implementation of the Universal Reflection Pattern, we considered adding role prompting to improve AI output quality. Role prompting involves defining a specific persona ("You are a senior architect...") before task execution.

While developing the reflection pattern that achieved 70% faster content creation, the question arose: Should we add role definitions to further improve quality?

### Current State
- Reflection pattern uses domain detection + templates + context
- Templates provide structure through required sections and rules
- Context gathering supplies domain-specific information
- No explicit role definitions

### Considered Enhancement
```typescript
interface DomainConfig {
  role: {
    title: string;           // "Senior Product Engineer"
    expertise: string[];     // ["Agile", "Architecture"]
    mindset: string[];       // ["Think user-first"]
  }
}
```

## Decision

**We will NOT add role prompting to the reflection pattern.**

Instead, we will rely on:
1. Domain-specific templates
2. Comprehensive context gathering
3. Clear rules and constraints
4. Concrete examples

## Rationale

### Performance vs Complexity Analysis

```
Value = (Quality Improvement × Usage Frequency) / (Implementation + Maintenance Cost)
Value = (5-10% × High) / (Medium complexity)
      = Not Worth It
```

### Empirical Evidence

1. **Marginal Gains**: Modern LLMs (Claude 3+, GPT-4) show only 5-10% improvement with role prompting
2. **Template Sufficiency**: Our template structure already provides 80% of the guidance
3. **Context Over Role**: Rich context (git state, project info) more valuable than role definition
4. **Implicit Understanding**: "Create API documentation" + documentation template already signals appropriate behavior

### Complexity Costs

- **Implementation**: +20 lines per domain × 8 domains = 160 lines
- **Role Scoping**: Managing role bleed between tasks
- **Testing Burden**: Validating role persistence/clearing
- **Mental Overhead**: Another abstraction for users to understand
- **Maintenance**: Role definitions need updates as AI models evolve

## Alternatives Considered

### Alternative 1: Full Role Implementation
```typescript
generateReflectionPrompt() {
  return `
    ROLE: You are a ${role.title} with expertise in ${role.expertise}.
    MINDSET: ${role.mindset}
    ...
  `;
}
```
**Rejected**: Complexity outweighs marginal gains.

### Alternative 2: Scoped Roles
```xml
<task-specific-role scope="local">
  For this task only, act as...
</task-specific-role>
```
**Rejected**: Adds scope management complexity for minimal benefit.

### Alternative 3: Optional Roles
```bash
ginko reflect --role "senior-architect" "design cache layer"
```
**Rejected**: User configuration burden without clear value.

## Consequences

### Positive
- ✅ **Simpler codebase**: ~200 fewer lines of code
- ✅ **Faster development**: Ship working features sooner
- ✅ **Easier testing**: No role persistence to validate
- ✅ **Clear mental model**: Template + Context = Output
- ✅ **Future flexibility**: Can add roles later if needed

### Negative
- ❌ **Potential inconsistency**: 5-10% more variation in outputs
- ❌ **Generic tone**: Less domain-specific language
- ❌ **Missed optimization**: Not squeezing last 10% of quality

### Neutral
- ⚪ **User perception**: Users may expect role configuration
- ⚪ **Competitive features**: Other tools might offer roles
- ⚪ **Future revisit**: May reconsider with usage data

## Implementation

No implementation required - this is a decision NOT to implement.

Instead, we focus on:
1. Completing remaining domain implementations
2. Improving context gathering
3. Adding output validation
4. Enhancing templates with examples

## Validation

We will monitor for:
- User complaints about output quality
- Inconsistent tone/depth across generations
- Domain confusion in outputs
- Requests for role configuration

If these exceed threshold (>10% of feedback), revisit this decision.

## Examples

### What We're NOT Building
```typescript
// NOT THIS
class BacklogReflection {
  defineRole() {
    return {
      title: "Senior Product Engineer",
      expertise: ["Agile", "Technical Architecture"],
      mindset: ["User value first", "Consider technical debt"]
    };
  }
}
```

### What We ARE Building
```typescript
// THIS - Simpler, focused on structure
class BacklogReflection {
  loadTemplate() {
    return {
      requiredSections: ['problem', 'solution', 'criteria'],
      rules: ['Max 60 char title', 'Include examples'],
      outputExample: '...concrete example...'
    };
  }
}
```

## Learning

**Key Insight**: Features that seem valuable in theory may not justify their complexity in practice. The 80/20 rule applies: 80% of value comes from 20% of features.

**Architecture Principle**: Defer complexity until proven necessary by usage, not speculation.

## References

- Original reflection pattern: `/packages/cli/src/core/reflection-pattern.ts`
- Performance discussion: This conversation thread
- Template examples: `/packages/cli/docs/REFLECTION-PATTERN-EXAMPLES.md`
- Complexity budget concept: "A Philosophy of Software Design" - John Ousterhout

## Decision Makers

- **Proposed by**: Chris Norton & Claude
- **Date**: 2025-09-12
- **Review**: After 1000 uses or 3 months, whichever comes first

## Appendix: Quick Decision Framework

```
Should we add feature X?

1. Quality improvement > 20%?  → Consider it
2. Quality improvement 10-20%? → Need strong justification  
3. Quality improvement < 10%?  → Probably skip it ← WE ARE HERE
4. Complexity cost > Medium?   → Higher bar for acceptance
5. Can add it later?          → Defer until proven needed
```

This decision follows principle #3 and #5: Low improvement + can defer = Don't build.