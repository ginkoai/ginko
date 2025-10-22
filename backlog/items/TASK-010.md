---
id: TASK-010
type: task
title: Reference Link System
parent:
  - FEATURE-024-configuration-and-reference-system
status: todo
priority: high
created: '2025-10-22T00:00:00.000Z'
updated: '2025-10-22T00:00:00.000Z'
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

- [ ] Define reference syntax patterns (TASK-XXX, PRD-YYY, ADR-ZZZ, SPRINT-YYYY-MM-DD, FEATURE-NNN)
- [ ] Implement `extractReferences(text)` parser
- [ ] Create `resolveReference(ref)` to find referenced documents
- [ ] Add reference validation (warn if target doesn't exist)
- [ ] Update `ginko log` to support inline references
- [ ] Add automatic reference detection in log descriptions
- [ ] Create reference navigation helpers (getReferenceChain, getBacklinks)
- [ ] Write unit tests for extraction and resolution
- [ ] Update session log display to show resolved references
- [ ] Document reference syntax in user guide

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

## Dependencies

- TASK-009 (need config to resolve reference paths)

## Related

- **PRD**: PRD-009
- **ADR**: ADR-037
- **Parent**: FEATURE-024
- **Depends**: TASK-009
