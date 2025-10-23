---
id: TASK-010
type: task
title: Reference Link System
parent:
  - FEATURE-024-configuration-and-reference-system
status: complete
priority: high
created: '2025-10-22T00:00:00.000Z'
updated: '2025-10-23T00:00:00.000Z'
completed: '2025-10-23T00:00:00.000Z'
effort: 4 hours
tags: [references, parsing, navigation, context-linking]
sprint: SPRINT-2025-10-22-configuration-system
size: M
author: chris@watchhill.ai
---

# Reference Link System

## Description

Implement reference link extraction and navigation system to connect session logs → sprints → PRDs → ADRs bidirectionally.

**Goal**: Enable semantic navigation across documentation hierarchy, linking tactical work to strategic context.

## Checklist

- [x] Define reference syntax patterns (TASK-XXX, PRD-YYY, ADR-ZZZ, SPRINT-YYYY-MM-DD, FEATURE-NNN)
- [x] Implement `extractReferences(text)` parser
- [x] Create `resolveReference(ref)` to find referenced documents
- [x] Add reference validation (warn if target doesn't exist)
- [x] Update `ginko log` to support inline references
- [x] Add automatic reference detection in log descriptions
- [x] Create reference navigation helpers (getReferenceChain, getBacklinks)
- [x] Write unit tests for extraction and resolution
- [x] Update session log display to show resolved references
- [ ] Document reference syntax in user guide (deferred to sprint docs phase)

## Technical Implementation

**File Locations**:
- `packages/cli/src/utils/reference-parser.ts` (new)
- `packages/cli/src/commands/log.ts` (update)
- `packages/cli/src/utils/session-synthesizer.ts` (update)

**Reference Patterns**:

```typescript
const REFERENCE_PATTERNS = {
  task: /TASK-(\d+)/g,
  feature: /FEATURE-(\d+)/g,
  prd: /PRD-(\d+)/g,
  adr: /ADR-(\d+)/g,
  sprint: /SPRINT-(\d{4}-\d{2}-\d{2})-[\w-]+/g
};

interface Reference {
  type: 'task' | 'feature' | 'prd' | 'adr' | 'sprint';
  id: string;
  rawText: string;
}

export function extractReferences(text: string): Reference[] {
  const refs: Reference[] = [];

  for (const [type, pattern] of Object.entries(REFERENCE_PATTERNS)) {
    const matches = text.matchAll(pattern);
    for (const match of matches) {
      refs.push({
        type: type as any,
        id: match[1] || match[0],
        rawText: match[0]
      });
    }
  }

  return refs;
}
```

**Usage in Session Logs**:

```markdown
### 17:13 - [fix]
Fixed session log archival timing (TASK-006, SPRINT-2025-10-22-configuration-system)
Addresses ADR-037 implementation per PRD-009.
```

## Acceptance Criteria

- Extract all reference types from text with >99% accuracy
- Validate references against existing documents
- `ginko log` accepts references in description
- Session synthesis follows reference chains up to maxDepth
- Warn users about broken references (target doesn't exist)
- Display reference chains: "TASK-006 → FEATURE-024 → PRD-009 → ADR-037"

## Notes

- Reference syntax should be memorable and typeable
- Validation should warn, not error (don't block logging)
- Consider adding auto-complete for references in future
- Related to ADR-037 Phase 2

## Completion Status

**Completed**: 2025-10-23 (90% - user documentation deferred)

See [TASK-010-COMPLETION-STATUS.md](./TASK-010-COMPLETION-STATUS.md) for detailed completion report.

**Core functionality fully implemented**:
- ✅ Reference parser with >99% extraction accuracy
- ✅ Auto-detection in `ginko log` commands
- ✅ Reference validation with non-blocking warnings
- ✅ Navigation helpers (chains, backlinks)
- ✅ 50+ comprehensive unit tests
- ✅ Integration with context-loader (TASK-011)
- ✅ Currently in production use

**Deferred to sprint docs phase**:
- User documentation and reference guide

## Dependencies

- TASK-009 (need config to resolve reference paths) ✅ Complete

## Related

- **PRD**: PRD-009
- **ADR**: ADR-037
- **Parent**: FEATURE-024
- **Depends**: TASK-009
