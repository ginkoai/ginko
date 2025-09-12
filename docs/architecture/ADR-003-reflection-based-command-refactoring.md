# ADR-003: Refactoring Core Commands to Use Reflection Pattern

## Status
Proposed

## Context
The commands `start`, `context`, `handoff`, and `capture` were created before we crystallized the Universal Reflection Pattern. These commands currently use imperative code with hardcoded logic, missing the opportunity to leverage the reflection pattern's power for self-improvement and consistency.

## Decision
Refactor these core commands to use the reflection pattern, transforming them into reflection domains that follow the Human+AI+Structure collaboration model.

## Current State Analysis

### 1. Start Command (start-enhanced.ts)
**Current**: Imperative loading of context modules with hardcoded scoring
**Problems**:
- Loads irrelevant modules (gotchas instead of reflection patterns)
- Static scoring algorithm can't learn or adapt
- No explanation of WHY modules were selected

### 2. Context Command (context-new.ts)
**Current**: Direct file manipulation and search
**Problems**:
- No AI assistance in finding relevant context
- Manual pattern matching
- Can't understand semantic relationships

### 3. Handoff Command (handoff-enhanced.ts)
**Current**: Template-based generation with fixed structure
**Problems**:
- Can't adapt to different handoff styles
- No learning from successful handoffs
- Misses important context

### 4. Capture Command (capture.ts)
**Current**: Basic template creation waiting for AI enrichment
**Problems**:
- Two-step process (create then enrich)
- No immediate value extraction
- Doesn't learn from patterns

## Proposed Reflection Domains

### Context Domain
```typescript
// ginko reflect --domain context "Load modules for reflection pattern work"
{
  intent: "Load relevant context modules for current work",
  template: {
    requiredSections: ['relevant_modules', 'reasoning', 'connections'],
    contextToConsider: ['current_branch', 'recent_files', 'session_goals', 'error_patterns'],
    rulesAndConstraints: [
      'Prioritize critical relevance over medium',
      'Prefer recent modules over stale',
      'Match topic tags to current work',
      'Explain selection reasoning'
    ]
  },
  reflection: {
    // AI analyzes all modules and current context
    // Understands semantic relationships
    // Learns from usage patterns
  },
  output: {
    format: 'structured',
    modules: ['module1.md', 'module2.md'],
    reasoning: 'Selected reflection patterns because...'
  }
}
```

### Handoff Domain
```typescript
// ginko reflect --domain handoff "Create session handoff"
{
  intent: "Capture session state for seamless continuation",
  template: {
    requiredSections: ['summary', 'state', 'next_steps', 'insights'],
    contextToConsider: ['git_changes', 'completed_tasks', 'blockers', 'learnings'],
    rulesAndConstraints: [
      'Preserve emotional context',
      'Highlight decisions made',
      'Surface hidden dependencies',
      'Make next session startup instant'
    ]
  },
  reflection: {
    // AI synthesizes session activity
    // Identifies key decisions and turning points
    // Extracts tacit knowledge
  },
  output: {
    format: 'markdown',
    location: '.ginko/sessions/[user]/handoff.md'
  }
}
```

### Capture Domain
```typescript
// ginko reflect --domain capture "Extract insight about reflection patterns"
{
  intent: "Capture and contextualize development insight",
  template: {
    requiredSections: ['insight', 'context', 'impact', 'application'],
    contextToConsider: ['triggering_event', 'code_context', 'problem_solved'],
    rulesAndConstraints: [
      'Extract generalizable pattern',
      'Connect to existing modules',
      'Quantify impact',
      'Provide concrete examples'
    ]
  },
  reflection: {
    // AI immediately enriches with context
    // Identifies pattern category
    // Links to related insights
  },
  output: {
    format: 'module',
    location: '.ginko/context/modules/'
  }
}
```

### Start Domain
```typescript
// ginko reflect --domain start "Begin development session"
{
  intent: "Initialize optimal development environment",
  template: {
    requiredSections: ['session_setup', 'loaded_context', 'suggested_focus'],
    contextToConsider: ['last_handoff', 'branch_name', 'uncommitted_changes', 'time_since_last'],
    rulesAndConstraints: [
      'Load only relevant context',
      'Suggest immediate next action',
      'Surface blockers early',
      'Set appropriate work mode'
    ]
  },
  reflection: {
    // AI determines session configuration
    // Predicts needed modules
    // Suggests optimal workflow
  },
  output: {
    format: 'interactive',
    session_config: { mode: 'developing', focus: 'reflection-patterns' }
  }
}
```

## Implementation Strategy

### Phase 1: Parallel Implementation
1. Create new reflection-based versions alongside existing commands
2. Add `--reflect` flag to use new implementation
3. Gather metrics on effectiveness

### Phase 2: Migration
1. Make reflection version default with `--legacy` fallback
2. Deprecate imperative implementations
3. Remove legacy code

### Phase 3: Learning Loop
1. Collect usage patterns
2. AI analyzes successful sessions
3. Continuously improve domain templates

## Benefits

### Immediate
- **Consistency**: All commands follow same pattern
- **Explainability**: AI explains its choices
- **Adaptability**: Learns from usage

### Long-term
- **Self-improvement**: Commands get better over time
- **Extensibility**: Easy to add new domains
- **Composability**: Domains can invoke each other

## Example: Context Loading Today vs Tomorrow

### Today (Imperative)
```typescript
// Hardcoded logic that loads wrong modules
const modules = await fs.readdir(contextDir);
const filtered = modules.filter(m => m.relevance === 'medium');
return filtered.slice(0, 5); // Returns old gotchas
```

### Tomorrow (Reflection)
```typescript
// AI understands current work and selects perfectly
const result = await reflect({
  domain: 'context',
  intent: 'Load modules for reflection pattern development'
});
// Returns: reflection-pattern.md, universal-pattern.md, human-ai-collaboration.md
// With explanation: "Selected reflection modules due to PRD work on domains"
```

## Risks and Mitigations

### Risk: Breaking existing workflows
**Mitigation**: Parallel implementation with gradual migration

### Risk: AI overhead for simple operations
**Mitigation**: Cache common patterns, fast-path for simple cases

### Risk: Loss of determinism
**Mitigation**: Provide `--deterministic` flag for CI/CD

## Consequences

### Positive
- Dogfooding our own pattern increases confidence
- Commands become smarter over time
- Reduces maintenance burden
- Creates unified mental model

### Negative
- Initial complexity increase
- Requires AI for basic operations
- May be slower initially

## Metrics for Success
- Context module relevance score > 90%
- Handoff resume time < 30 seconds
- Capture enrichment accuracy > 85%
- User satisfaction increase

## Related
- FEATURE-029: Universal Reflection Pattern
- PRD-001: Additional Reflection Domains
- ADR-002: AI-Optimized File Discovery

## Decision
Proceed with refactoring these commands to use reflection pattern, starting with the context domain as it will immediately improve the development experience.

---
**Status**: Proposed
**Date**: 2025-09-12
**Author**: Chris Norton
**Reviewed**: Pending