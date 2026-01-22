# ADR-072: Simple Builder Pattern for Pipeline Architecture

## Status
Proposed

## Context

As Ginko evolves to support more complex AI+Human collaboration workflows, we need a consistent, extensible pattern for processing pipelines. The team evaluated several approaches to maximize both human and AI flow state while ensuring consistency and reducing errors.

### Core Requirements
- **Maximize flow state** for both AI and human collaborators
- **Minimize friction points** in pipeline execution
- **Ensure consistent, deterministic outcomes**
- **Support cross-language interoperability** (polyglot architecture)
- **Enable developer extensibility** without steep learning curves

### Challenges Identified

#### Human Challenges
- Humans can be ambiguous and imprecise in their intent
- Need to focus on high-level concepts and judgment
- Require confidence in consistent outcomes

#### AI Challenges
- AI can drift as it reasons through responses
- Context capacity saturation leads to degraded performance
- Artifacts sometimes misnamed or stored incorrectly
- Breakdowns lead to lower confidence and rework

## Decision

We will adopt the **Simple Builder Pattern** over more complex alternatives like Railway-oriented programming or full hybrid patterns.

### Chosen Pattern: Simple Builder

```typescript
export class ReflectionPipeline {
  protected ctx: PipelineContext;

  constructor(intent: string) {
    this.ctx = {
      intent,
      errors: [],
      confidence: 1.0
    };
  }

  // Chainable configuration methods
  withDomain(domain: string): this {
    this.ctx.domain = domain;
    console.log(`📁 Domain: ${domain}`);
    return this;
  }

  validate(): this {
    // Validation logic with confidence adjustment
    if (!this.ctx.domain) {
      this.ctx.errors.push('Domain is required');
      this.ctx.confidence *= 0.5;
    }
    return this;
  }

  recover(): this {
    // Auto-recovery logic
    if (this.ctx.errors.length > 0) {
      // Attempt fixes
      this.ctx.confidence = 0.7;
    }
    return this;
  }

  async execute(): Promise<PipelineContext> {
    if (this.ctx.confidence < 0.3) {
      throw new Error(`Pipeline failed: ${this.ctx.errors.join(', ')}`);
    }
    return this.ctx;
  }
}
```

## Rationale

### Why Simple Builder Over Alternatives

#### 1. Compared to Full Hybrid (Railway + Fluent + Result)
- **Hybrid Complexity**: 8/10 - Result types, monads, steep learning curve
- **Hybrid IDE Support**: 4/10 - Generics confuse autocomplete
- **Builder Complexity**: 2/10 - Just method chaining
- **Builder IDE Support**: 10/10 - Perfect autocomplete

#### 2. Compared to Functional Pipeline
- **Functional**: Requires FP knowledge, async complexity
- **Builder**: Familiar OOP pattern, straightforward async

#### 3. Compared to State Machine
- **State Machine**: Overkill for linear processes, verbose
- **Builder**: Simple for common cases, extensible when needed

### Benefits for AI+Human Collaboration

1. **Clear Processing Boundaries** - Each method validates before proceeding
2. **Progressive Context Building** - Layer context gradually
3. **Deterministic State Transitions** - Predictable flow prevents drift
4. **Error Recovery Points** - `.recover()` without full restart
5. **Confidence Tracking** - Built-in without complex types

### Cross-Language Portability

The pattern translates excellently across languages:

#### Python (9/10 fit)
```python
class ReflectionPipeline:
    def with_domain(self, domain: str) -> 'ReflectionPipeline':
        self.ctx.domain = domain
        return self
```

#### C# (9/10 fit)
```csharp
public ReflectionPipeline WithDomain(string domain) {
    _context = _context with { Domain = domain };
    return this;
}
```

#### Java (7/10 fit)
```java
public ReflectionPipeline withDomain(String domain) {
    ctx.setDomain(domain);
    return this;
}
```

## Consequences

### Positive

1. **Immediate Developer Adoption** - Zero learning curve
2. **Perfect IDE Support** - Full autocomplete in all major IDEs
3. **Extensibility** - Easy to create custom pipelines
4. **Testability** - Simple to mock and test
5. **Observability** - Clear execution flow for debugging
6. **Cross-Language** - Pattern works in Python, Java, C#, TypeScript
7. **Progressive Complexity** - Start simple, add features as needed

### Negative

1. **Less Powerful Error Handling** - Not as sophisticated as Railway pattern
2. **Mutable State** - Context is mutable (mitigated by protected access)
3. **No Automatic Error Propagation** - Must check manually

### Mitigations

1. **Error Handling**: Add `.recover()` method for common cases
2. **State Safety**: Use protected/private context
3. **Validation Gates**: Explicit `.validate()` steps

## Implementation

### Phase 1: Core Pattern (Week 1)
- Implement base `ReflectionPipeline` class
- Create `PipelineContext` interface
- Add validation and recovery methods

### Phase 2: Reflection Integration (Week 2)
- Refactor existing handoff/start commands
- Use builder pattern for all pipelines
- Add confidence tracking

### Phase 3: Polyglot Support (Week 3)
- Create Python implementation
- Add Java bridge for enterprise
- Document cross-language usage

## Example Usage

### Basic Pipeline
```typescript
const result = await new ReflectionPipeline("Create handoff")
  .withDomain("handoff")
  .withTemplate(template)
  .validate()
  .generate()
  .execute();
```

### With Error Recovery
```typescript
const result = await new ReflectionPipeline("Start session")
  .validate()        // Will flag errors
  .recover()         // Auto-fixes if possible
  .generate()
  .execute();
```

### Extension Pattern
```typescript
class CustomPRDPipeline extends ReflectionPipeline {
  constructor(intent: string) {
    super(intent);
    this.withDomain("prd"); // Auto-set domain
  }

  withUserStories(stories: string[]): this {
    this.ctx.context = { userStories: stories };
    return this;
  }
}
```

## Alternatives Considered

### 1. Railway-Oriented Programming
- **Pros**: Powerful error handling, automatic propagation
- **Cons**: High complexity, poor IDE support, steep learning curve
- **Verdict**: Too complex for most developers

### 2. Functional Pipeline
- **Pros**: Pure functions, composable, immutable
- **Cons**: Less intuitive, requires FP knowledge
- **Verdict**: Good but not universally accessible

### 3. State Machine
- **Pros**: Explicit states, visual representation
- **Cons**: Verbose, overkill for linear processes
- **Verdict**: Over-engineered for our needs

### 4. Hybrid Pattern (Fluent + Railway)
- **Pros**: Most powerful, best of both worlds
- **Cons**: Highest complexity, type system challenges
- **Verdict**: Excellent in theory, poor in practice

## Related ADRs

- ADR-003: Refactor Core Commands to Use Reflection
- ADR-004: Single-Pass Reflection Pattern
- ADR-011: Backlog Architecture
- ADR-012: Ginko Command Architecture

## References

- [Fluent Interface Pattern](https://en.wikipedia.org/wiki/Fluent_interface)
- [Builder Pattern](https://en.wikipedia.org/wiki/Builder_pattern)
- [Railway-Oriented Programming](https://fsharpforfunandprofit.com/rop/)
- [TypeScript Method Chaining](https://www.typescriptlang.org/docs/handbook/2/classes.html)

## Decision Record

- **Date**: January 15, 2025
- **Deciders**: Chris Norton, Claude (AI Assistant)
- **Outcome**: Adopt Simple Builder Pattern for pipeline architecture

## Review Schedule

- **3 Months**: Evaluate developer adoption and feedback
- **6 Months**: Assess need for more advanced patterns
- **1 Year**: Consider additions based on production usage