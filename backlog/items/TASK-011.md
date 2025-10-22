---
id: TASK-011
type: task
title: Progressive Context Loading
parent:
  - FEATURE-024-configuration-and-reference-system
status: todo
priority: high
created: '2025-10-22T00:00:00.000Z'
updated: '2025-10-22T00:00:00.000Z'
effort: 6 hours
tags: [context-loading, performance, synthesis, ai-optimization]
sprint: SPRINT-2025-10-22-configuration-system
size: L
author: chris@watchhill.ai
---

# Progressive Context Loading

## Description

Implement priority-ordered context loading that follows reference chains to achieve 80% context from 3-5 core documents instead of 50+ files.

**Goal**: Drastically reduce token usage and bootstrap time by loading strategically, not exhaustively.

## Checklist

- [ ] Implement `ContextLoader` class with priority queue
- [ ] Define loading priority order (sessions → currentSprint → refs)
- [ ] Add work mode filters for documentation depth
- [ ] Implement reference following with maxDepth limit
- [ ] Create document caching to avoid re-loading
- [ ] Add circular reference detection
- [ ] Integrate with `ginko start` synthesis
- [ ] Add performance instrumentation (timing, token counts)
- [ ] Write unit tests for loading strategies
- [ ] Create benchmarks comparing old vs new loading

## Technical Implementation

**File Locations**:
- `packages/cli/src/utils/context-loader.ts` (new)
- `packages/cli/src/commands/start/start-with-synthesis.ts` (update)
- `packages/cli/src/utils/session-synthesizer.ts` (update)

**Progressive Loading Algorithm**:

```typescript
class ContextLoader {
  private loaded = new Map<string, string>();
  private visited = new Set<string>();

  async loadProgressively(config: GinkoConfig): Promise<LoadedContext> {
    const docs: LoadedContext = {
      sessionLog: null,
      sprint: null,
      referenced: {}
    };

    // 1. Load session log (short-term memory)
    docs.sessionLog = await this.loadDocument(config.paths.sessions);

    // 2. Load current sprint (long-term bootstrap)
    docs.sprint = await this.loadDocument(config.paths.currentSprint);

    // 3. Extract references from loaded docs
    const refs = extractReferences([
      docs.sessionLog,
      docs.sprint
    ].join('\n'));

    // 4. Follow references up to maxDepth
    docs.referenced = await this.followReferences(
      refs,
      config.contextLoading.maxDepth
    );

    return docs;
  }

  private async followReferences(
    refs: Reference[],
    maxDepth: number,
    currentDepth = 0
  ): Promise<Record<string, string>> {
    if (currentDepth >= maxDepth) return {};

    const docs: Record<string, string> = {};

    for (const ref of refs) {
      if (this.visited.has(ref.rawText)) continue;
      this.visited.add(ref.rawText);

      const path = await resolveReference(ref);
      if (!path) continue;

      const content = await this.loadDocument(path);
      docs[ref.rawText] = content;

      // Recursively follow nested references
      const nestedRefs = extractReferences(content);
      const nestedDocs = await this.followReferences(
        nestedRefs,
        maxDepth,
        currentDepth + 1
      );

      Object.assign(docs, nestedDocs);
    }

    return docs;
  }
}
```

**Work Mode Filtering**:

```typescript
// hack-ship: Load only session + sprint
// think-build: Add PRDs + ADRs (default)
// full-planning: Add architecture + best-practices

const depthConfig = config.workMode.documentationDepth[workMode];
const shouldLoadType = (refType: string) => depthConfig.includes(refType);
```

## Acceptance Criteria

- Context loading completes in <1 second
- 80% of needed context from ≤5 documents
- Token usage reduced by 70% vs full-scan approach
- Work mode correctly filters documentation depth
- Circular references detected and handled gracefully
- Performance metrics logged for analysis

## Notes

- This is where the magic happens - strategic loading vs exhaustive
- Depth limit prevents reference explosion
- Caching critical for performance (same doc may be referenced multiple times)
- Related to ADR-037 Phase 3

## Dependencies

- TASK-009 (config foundation)
- TASK-010 (reference extraction)

## Related

- **PRD**: PRD-009
- **ADR**: ADR-037
- **Parent**: FEATURE-024
- **Depends**: TASK-009, TASK-010
