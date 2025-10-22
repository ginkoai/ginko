---
id: TASK-014
type: task
title: Remove Synthesis Sections from Session Log Template
parent:
  - ADR-033-context-pressure-mitigation-strategy
status: todo
priority: high
created: '2025-10-22T00:00:00.000Z'
updated: '2025-10-22T00:00:00.000Z'
effort: 1 hour
tags: [session-logging, defensive-logging, adr-033, template-cleanup, architectural-refinement]
size: S
author: chris@watchhill.ai
---

# Remove Synthesis Sections from Session Log Template

## Description

Implement ADR-033 Addendum 2 by removing synthesis-requiring sections (Achievements, Files Affected) from session log template and routing logic.

**Goal**: Enforce "pure capture" philosophy - session logs capture raw facts with zero synthesis requirements. Synthesis happens at `ginko start` under optimal pressure (5-15%).

## Context

After implementing TASK-013 and observing production usage during SPRINT-2025-10-22, we identified that two sections violate defensive logging principles:

1. **Achievements Section**: Duplicates Timeline entries, forcing synthesis under variable pressure
2. **Files Affected Section**: Aggregates inline file references redundantly

Both require synthesis at session end (potentially 80-95% pressure), contradicting ADR-033's core principle of capturing facts at low-medium pressure (20-80%) and deferring synthesis to fresh sessions.

**ADR-033 Addendum 2**: Session logs must be pure capture only. Synthesis belongs in `ginko start` at 5-15% pressure.

## Checklist

### Phase 1: Template Updates
- [ ] Update `packages/cli/src/core/session-log-manager.ts`
  - Remove `## Files Affected` section from template (lines ~100-102)
  - Remove `## Achievements` section from template (lines ~111-113)
  - Update template comments to reflect pure capture philosophy
- [ ] Verify template generates with 4 sections only:
  - Timeline
  - Key Decisions
  - Insights
  - Git Operations

### Phase 2: Routing Logic Updates
- [ ] Update `logEvent()` routing switch (line ~175-177)
  - Change `case 'achievement':` to route to Timeline only
  - Remove dual-routing logic for achievements (lines ~197-207)
  - Simplify: achievement entries go to Timeline like fix/feature
- [ ] Update section comment explaining routing behavior

### Phase 3: Testing
- [ ] Update unit tests in `test/unit/session-log-manager.test.ts`
  - Remove tests expecting Achievements section
  - Remove tests expecting Files Affected section
  - Add test verifying achievement routes to Timeline only
  - Verify backward compatibility with existing logs
- [ ] Create test session log with new template
- [ ] Verify `ginko log --show` displays correctly
- [ ] Test achievement entries appear in Timeline

### Phase 4: Documentation
- [ ] Update TASK-013 documentation
  - Note: Files Affected section removed per ADR-033 Addendum 2
  - Reference ADR-033 for rationale
- [ ] Update session logging examples in CLAUDE.md
  - Show 4-section template
  - Explain pure capture vs synthesis separation

## Technical Implementation

### Template Changes

**Before** (6 sections):
```markdown
## Timeline
## Key Decisions
## Files Affected      ❌ Remove
## Insights
## Git Operations
## Achievements        ❌ Remove
```

**After** (4 sections):
```markdown
## Timeline
## Key Decisions
## Insights
## Git Operations
```

### Routing Changes

**Before**:
```typescript
case 'achievement':
  sectionMarker = '## Achievements';
  break;

// Later: dual-routing logic
if (shouldAppendToTimeline) {
  // Append to Timeline too
}
```

**After**:
```typescript
case 'achievement':
  sectionMarker = '## Timeline';  // Simple routing
  break;

// Remove dual-routing logic entirely
```

### Example Session Log Output

**Before TASK-014**:
```markdown
## Timeline
### 11:31 - [achievement]
Completed TASK-009...

## Achievements
### 11:31 - [achievement]  ← Duplicate
Completed TASK-009...
```

**After TASK-014**:
```markdown
## Timeline
### 11:31 - [achievement]
Completed TASK-009...

## Key Decisions
<!-- Empty until decision logged -->

## Insights
<!-- Empty until insight logged -->

## Git Operations
<!-- Empty until git op logged -->
```

## Acceptance Criteria

- [ ] Session log template has exactly 4 sections: Timeline, Key Decisions, Insights, Git Operations
- [ ] `[achievement]` entries appear in Timeline only (no duplication)
- [ ] `[decision]` entries appear in Key Decisions section
- [ ] `[insight]` entries appear in Insights section
- [ ] `[git]` entries appear in Git Operations section
- [ ] `[fix]` and `[feature]` entries appear in Timeline only
- [ ] No synthesis sections in template
- [ ] All tests passing
- [ ] Existing session logs parse correctly (backward compatible)
- [ ] `ginko log --show` displays new template correctly

## Files Affected

- `packages/cli/src/core/session-log-manager.ts`
  - Lines ~95-113: Template definition
  - Lines ~165-207: Routing logic
- `packages/cli/test/unit/session-log-manager.test.ts`
  - Update tests for new template
- `CLAUDE.md`
  - Session logging examples

## Backward Compatibility

**Existing Logs**: Session logs with Achievements/Files Affected sections remain valid and parseable. The `extractEntries()` function will continue to work with old logs.

**New Logs**: Use simplified 4-section template. No migration required.

**Parsing**: No changes to parsing logic needed - sections are optional in parsing.

## Technical Notes

### Template Location
`packages/cli/src/core/session-log-manager.ts` lines 70-120

### Routing Location
`packages/cli/src/core/session-log-manager.ts` lines 160-210

### Section Detection
Current code uses `extractEntries(logContent, 'SectionName')` which is flexible - works whether section exists or not.

### No Database Changes
This is template-only. No schema changes, no migrations needed.

## Implementation Time

**Estimated**: 1 hour
- Template changes: 10 minutes
- Routing changes: 10 minutes
- Test updates: 20 minutes
- Documentation: 20 minutes

## Related

- **ADR**: ADR-033 Addendum 2 - Session Logs as Pure Capture
- **Parent**: ADR-033 - Context Pressure Mitigation Strategy
- **Related**: TASK-013 - Session Log Quality Enhancements
- **Implements**: Pure capture philosophy (historian vs strategist separation)

## Notes

**Philosophical Clarity**: This task crystallizes the separation between:
- **Historian Role** (session log): Capture raw facts at 20-80% pressure
- **Strategist Role** (ginko start): Synthesize at 5-15% pressure

**Quality Principle**: Session log quality should be independent of when the session ends. Synthesis under high pressure yields uneven results.

**User Impact**: Minimal - users continue logging as before. The improvement is in consistency and architectural clarity.

## Success Validation

**Before TASK-014**:
```
Session ends at 92% pressure
AI synthesizes achievements → degraded quality (65%)
Duplicate entries in Timeline + Achievements
Files listed twice (inline + aggregated)
```

**After TASK-014**:
```
Session ends at 92% pressure
AI just saves raw Timeline → full quality (100%)
No synthesis required
Next session starts at 5% pressure
AI synthesizes from Timeline → optimal quality (100%)
```
