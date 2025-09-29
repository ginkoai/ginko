# Simple Builder Pattern Migration Guide

## Overview

This guide documents the migration from the complex `ReflectionCommand` base class to the simpler `SimplePipelineBase` pattern, implementing ADR-013 for consistent pipeline architecture.

## Why Migrate?

### Before: ReflectionCommand Pattern (Complexity: 8/10)
- Deep inheritance hierarchy
- Complex method overrides
- Difficult to test individual steps
- Hard to understand flow
- Tight coupling between steps

### After: SimplePipelineBase Pattern (Complexity: 2/10)
- Flat, chainable interface
- Clear step-by-step execution
- Easy to test each step
- Self-documenting flow
- Loose coupling with confidence tracking

## Migration Steps

### 1. Change Base Class

**Before:**
```typescript
import { ReflectionCommand } from '../../core/reflection-pattern.js';

export class HandoffReflectionCommand extends ReflectionCommand {
  constructor() {
    super('handoff');
  }
}
```

**After:**
```typescript
import { SimplePipelineBase } from '../../core/simple-pipeline-base.js';

export class HandoffPipeline extends SimplePipelineBase {
  constructor(intent: string = 'Default intent') {
    super(intent);
    this.withDomain('handoff');
  }
}
```

### 2. Convert Methods to Pipeline Steps

**Before:**
```typescript
async loadTemplate(): Promise<any> {
  return { /* template */ };
}

async gatherContext(parsedIntent: any): Promise<any> {
  // Complex context gathering
  return context;
}
```

**After:**
```typescript
loadTemplate(): this {
  const template = { /* template */ };
  this.withTemplate(template);
  return this;  // Enable chaining
}

async gatherContext(): Promise<this> {
  // Context gathering
  this.withContext(context);
  return this;  // Enable chaining
}
```

### 3. Implement Pipeline Flow

**Before:**
```typescript
async execute(intent: string, options: any = {}): Promise<void> {
  const parsedIntent = this.parseIntent(intent);
  const template = await this.loadTemplate();
  const context = await this.gatherContext(parsedIntent);
  const prompt = await this.generatePrompt(intent, template, context);
  // ... complex execution
}
```

**After:**
```typescript
async build(): Promise<string> {
  await this
    .initialize()
    .then(p => p.loadTemplate())
    .then(p => p.gatherContext())
    .then(p => {
      p.generateContent();
      p.scoreQuality();
      return p;
    })
    .then(p => p.validate())
    .then(p => p.recover())
    .then(p => p.enhanceIfNeeded())
    .then(p => p.save())
    .then(p => p.execute());

  return this.ctx.content || '';
}
```

### 4. Add Confidence Tracking

Each step can adjust confidence:

```typescript
generateContent(): this {
  this.ctx.content = this.buildHandoffContent();
  this.adjustConfidence(0.9); // High confidence after generation
  return this;
}

scoreQuality(): this {
  const qualityReport = HandoffQualityScorer.score(this.ctx.content);
  if (qualityReport.percentage < TARGET_SCORE) {
    this.adjustConfidence(0.7); // Lower confidence for poor quality
  }
  return this;
}
```

### 5. Implement Custom Hooks

Override base class hooks for domain-specific logic:

```typescript
protected customValidate(): void {
  if (!this.ctx.template) {
    this.addError('Template required for handoff');
    this.adjustConfidence(0.7);
  }
}

protected customRecover(): void {
  if (!this.ctx.context?.workstream) {
    // Provide default workstream
    this.ctx.context.workstream = { /* defaults */ };
    this.removeError('No workstream detected');
  }
}

protected async customExecute(): Promise<void> {
  // Domain-specific execution logic
  if (!this.ctx.content) {
    this.generateContent();
  }
}
```

### 6. Create Backward-Compatible Adapter

Maintain compatibility with existing CLI:

```typescript
export class HandoffReflectionCommand {
  private pipeline: HandoffPipeline;

  constructor() {
    this.pipeline = new HandoffPipeline();
  }

  async execute(intent: string, options: any = {}): Promise<void> {
    if (intent && intent.trim() !== '') {
      this.pipeline = new HandoffPipeline(intent);
    }
    await this.pipeline.build();
  }
}
```

## Real-World Examples

### HandoffPipeline
- **File**: `src/commands/handoff/handoff-reflection-pipeline.ts`
- **Key Features**: Quality scoring, context aggregation, content enhancement
- **Confidence Tracking**: Adjusts based on quality scores

### StartPipeline
- **File**: `src/commands/start/start-reflection-pipeline.ts`
- **Key Features**: Handoff loading, workstream detection, session display
- **Confidence Tracking**: Minimal - start should always work

## Testing

### Unit Testing Individual Steps

```typescript
const pipeline = new HandoffPipeline('Test intent');
await pipeline.initialize();
pipeline.loadTemplate();

// Test individual step
const confidence = pipeline.getConfidence();
const errors = pipeline.getErrors();
assert(confidence > 0.5);
assert(errors.length === 0);
```

### Integration Testing Full Pipeline

```typescript
const pipeline = new HandoffPipeline('Integration test');
const content = await pipeline.build();
assert(content.length > 0);
assert(pipeline.isValid());
```

## Benefits After Migration

1. **Clarity**: Each step is explicit and self-documenting
2. **Testability**: Can test individual pipeline steps
3. **Flexibility**: Easy to add/remove/reorder steps
4. **Confidence**: Built-in confidence tracking
5. **Recovery**: Automatic error recovery attempts
6. **Chaining**: Fluent interface for better readability

## Common Pitfalls

1. **Forgetting to return `this`**: Each step must return `this` for chaining
2. **Not initializing dependencies**: Use `initialize()` for async setup
3. **Skipping validation**: Always call `validate()` before execution
4. **Ignoring confidence**: Check confidence thresholds in `customExecute()`

## Migration Checklist

- [ ] Change base class to `SimplePipelineBase`
- [ ] Convert methods to return `this` for chaining
- [ ] Implement `initialize()` for async setup
- [ ] Add confidence adjustments to each step
- [ ] Override custom hooks for domain logic
- [ ] Create backward-compatible adapter
- [ ] Write tests for individual steps
- [ ] Test full pipeline execution
- [ ] Update documentation

## Cross-Language Support

The Simple Builder Pattern works well across languages:

### Python (9/10 compatibility)
```python
class SimplePipeline:
    def __init__(self, intent):
        self.ctx = {'intent': intent, 'confidence': 1.0}

    def with_domain(self, domain):
        self.ctx['domain'] = domain
        return self

    def build(self):
        return self.initialize() \
            .load_template() \
            .gather_context() \
            .generate_content() \
            .validate() \
            .execute()
```

### C# (9/10 compatibility)
```csharp
public class SimplePipeline
{
    private PipelineContext ctx;

    public SimplePipeline WithDomain(string domain)
    {
        ctx.Domain = domain;
        return this;
    }

    public async Task<string> Build()
    {
        return await this
            .Initialize()
            .LoadTemplate()
            .GatherContext()
            .GenerateContent()
            .Validate()
            .Execute();
    }
}
```

### Java (7/10 compatibility)
```java
public class SimplePipeline {
    private PipelineContext ctx;

    public SimplePipeline withDomain(String domain) {
        ctx.domain = domain;
        return this;
    }

    public String build() {
        return this
            .initialize()
            .loadTemplate()
            .gatherContext()
            .generateContent()
            .validate()
            .execute();
    }
}
```

## Conclusion

The Simple Builder Pattern dramatically reduces complexity while maintaining all functionality. It's easier to understand, test, and extend, making it ideal for both human and AI developers. The pattern's cross-language support ensures it can be adopted across different technology stacks.