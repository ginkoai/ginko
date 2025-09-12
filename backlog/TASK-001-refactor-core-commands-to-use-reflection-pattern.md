# TASK-001: Refactor core commands to use reflection pattern

## Metadata
- **Type**: task
- **Priority**: high
- **Size**: xl
- **Status**: todo
- **Created**: 2025-09-12
- **Author**: Chris Norton

## Problem Statement
The commands `start`, `context`, `handoff`, and `capture` were created before the Universal Reflection Pattern was crystallized. They use imperative code with hardcoded logic, causing issues like:
- Context loader loads irrelevant modules (old gotchas instead of critical reflection patterns)
- Commands cannot learn or adapt from usage patterns
- No explainability for decisions made
- Inconsistent patterns across the codebase

## Solution Approach
Transform each command into a reflection domain following the Human+AI+Structure pattern:

1. **Context Domain**: AI-driven module selection with reasoning
2. **Handoff Domain**: AI synthesis of session state
3. **Capture Domain**: Immediate AI enrichment of insights
4. **Start Domain**: AI-optimized session configuration

Implementation will be phased:
- Phase 1: Parallel implementation with `--reflect` flag
- Phase 2: Make reflection default with `--legacy` fallback
- Phase 3: Remove legacy implementations

## Acceptance Criteria
- [ ] Context domain loads relevant modules with >90% accuracy
- [ ] AI explains WHY each module was selected
- [ ] Handoff captures emotional and tacit context
- [ ] Capture immediately enriches insights without two-step process
- [ ] Start command suggests optimal next actions
- [ ] All commands follow consistent reflection pattern
- [ ] Performance remains acceptable (<2s for operations)
- [ ] Backwards compatibility maintained during migration

## Technical Notes
**Dependencies**: 
- reflection-pattern.ts core implementation
- AI template system
- Context search functionality

**Security**: 
- No sensitive data in reflection prompts
- Local-only processing

**Performance**: 
- Cache common patterns
- Fast-path for simple operations

## Relationships
**Parent**: FEATURE-029 (Universal Reflection Pattern)
**Related**: 
- ADR-003 (Reflection-based command refactoring)
- PRD-001 (Additional reflection domains)
**Blocks**: None

## Implementation Notes
Start with context domain as it will provide immediate value by fixing the module loading issue. The context loader currently loads `gotcha-database-connections-need-pool.md` instead of `universal-reflection-pattern.md` because it can't understand semantic relevance.

Example of the improvement:
```typescript
// Before: Hardcoded logic
const modules = modules.filter(m => m.relevance === 'medium').slice(0, 5);

// After: AI reflection
const result = await reflect({
  domain: 'context',
  intent: 'Load modules for reflection pattern work'
});
// Returns relevant modules with explanation
```

This is a perfect example of "eating our own dog food" - using reflection to improve reflection itself.