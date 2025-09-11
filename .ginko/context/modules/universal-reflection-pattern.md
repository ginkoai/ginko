---
type: pattern
tags: [reflection, ai, universal, architecture, core-pattern]
area: packages/cli/src
created: 2025-09-11
updated: 2025-09-11
relevance: critical
dependencies: [ai-template.ts, ai-reflection-pattern-backlog.md]
---

# Reflection and the Universal Pattern

## Context
Discovered through iterative refactoring of the ginko backlog system. Started with wrong approach (embedded AI), evolved through multiple iterations to discover that the core pattern isn't about backlog management - it's about structured reflection that enables Human+AI+Structure collaboration in ANY domain.

## The Universal Pattern

```typescript
interface ReflectionPattern {
  // 1. Human provides intent
  intent: string;
  
  // 2. System provides structure
  template: {
    requiredSections: string[];
    contextToConsider: string[];
    rulesAndConstraints: string[];
  };
  
  // 3. AI reflects and creates
  reflection: {
    conversationContext: any;
    systemState: any;
    domainKnowledge: any;
    pastPatterns: any;
  };
  
  // 4. Output follows structure
  output: {
    format: 'markdown' | 'code' | 'json';
    location: string;
    validation: string[];
  };
}
```

## The Flow

```
Human Intent → Domain Command → Template+Context → AI Reflection → Structured Output
```

## Discovery Journey

### Iteration 1: Wrong - Embedded AI
```typescript
// Tried to BE an AI
const ai = new AIService(apiKey);
const response = await ai.complete(prompt);
```
**Problem**: Ginko trying to be middleware between human and AI

### Iteration 2: Wrong - Command Explanation
```typescript
// Tried to teach AI how to use commands
return `To create item, run: ginko backlog create...`;
```
**Problem**: AI already knows how to use CLI tools

### Iteration 3: Right - Reflection Templates
```typescript
// Guide AI to create rich content through reflection
return generateContentTemplate(intent, request, context);
```
**Success**: AI reflects on context to create comprehensive output

## Universal Application Examples

### Domain: Documentation
```bash
ginko docs api "auth endpoints"
→ Template: API structure, examples, security
→ AI Reflects: Code, tests, usage patterns
→ Output: Complete API documentation
```

### Domain: Testing
```bash
ginko test "payment flow"
→ Template: Test structure, coverage requirements
→ AI Reflects: Implementation, edge cases, mocks
→ Output: Comprehensive test suite
```

### Domain: Architecture
```bash
ginko architecture "caching strategy"
→ Template: ADR format, decision matrix
→ AI Reflects: Performance, constraints, options
→ Output: Complete ADR with rationale
```

### Domain: Debugging
```bash
ginko debug "login failures"
→ Template: Investigation structure
→ AI Reflects: Logs, changes, patterns
→ Output: Structured debugging plan
```

## Implementation Pattern

### Step 1: Detect Intent Domain
```typescript
function detectDomain(request: string): Domain {
  // Simple pattern matching or AI classification
  if (request.match(/create|feature|story/)) return 'backlog';
  if (request.match(/test|spec/)) return 'testing';
  if (request.match(/doc|api/)) return 'documentation';
  // ...
}
```

### Step 2: Load Domain Template
```typescript
function loadTemplate(domain: Domain): Template {
  return {
    requiredSections: domainConfig[domain].sections,
    contextToConsider: domainConfig[domain].context,
    rulesAndConstraints: domainConfig[domain].rules
  };
}
```

### Step 3: Gather Context
```typescript
function gatherContext(): Context {
  return {
    conversationHistory: getCurrentConversation(),
    systemState: getProjectState(),
    relatedFiles: findRelatedFiles(),
    pastPatterns: loadSimilarPatterns()
  };
}
```

### Step 4: Generate Reflection Prompt
```typescript
function generateReflectionPrompt(
  intent: string,
  template: Template,
  context: Context
): string {
  return `
<reflection-task>
Intent: ${intent}

Required Sections:
${template.requiredSections}

Consider This Context:
${context}

Follow These Rules:
${template.rulesAndConstraints}

Create comprehensive output following the template.
</reflection-task>`;
}
```

## Key Insights

### 1. Structure Enhances Creativity
Templates don't limit AI - they channel its capabilities into consistent, high-quality output.

### 2. Context is Everything
AI reflection on conversation + system state produces far richer content than simple command execution.

### 3. Human Judgment Remains Central
Human provides intent and validation; AI provides comprehensive execution; Structure ensures quality.

### 4. Universal Applicability
Any domain where you need Human+AI+Structure can use this pattern.

## Benefits

1. **Consistency**: Same structure across all outputs
2. **Completeness**: Templates ensure nothing forgotten
3. **Context-Aware**: AI considers full situation
4. **Quality**: Reflection produces thoughtful content
5. **Efficiency**: One command → comprehensive output

## Anti-Patterns

❌ **Don't explain commands** - AI knows how to use CLI
❌ **Don't be middleware** - Let AI and human communicate
❌ **Don't over-pattern-match** - Simple queries don't need templates

## Future Evolution

### Meta-Reflection
```bash
ginko pattern create "new domain"
→ Uses reflection pattern to create new reflection patterns!
```

### Learning Templates
Templates evolve based on team usage and preferences.

### Context Modules
Automatically discover and load relevant context.

## Impact

This pattern fundamentally changes how we think about AI augmentation:
- Not about AI doing tasks FOR humans
- Not about humans instructing AI step-by-step
- But about **structured reflection** that multiplies human capability

## References
- Initial wrong approach: ai-enhanced.ts (deprecated)
- Correct implementation: ai-template.ts
- Conversation that led to discovery: This session
- Related patterns: Handoff generation, PRD creation

## The Meta-Discovery

We discovered this pattern THROUGH the reflection process itself - by reflecting on our iterations, failures, and successes, we found the universal principle that makes Human+AI collaboration truly powerful.