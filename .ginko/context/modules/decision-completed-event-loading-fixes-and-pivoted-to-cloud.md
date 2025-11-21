---
type: decision
tags: [decision, high, testing]
relevance: critical
created: 2025-11-19T02:57:10.970Z
updated: 2025-11-19T02:57:10.970Z
dependencies: []
sessionId: session-chris-at-watchhill-ai-1763521030951
insightId: 001c0a7c-fa8f-4b60-86d0-ec5c56c5e03e
---

# Completed event loading fixes and pivoted to cloud-first ...

**Type**: decision  
**Tags**: decision, high, testing  
**Created**: 2025-11-19  

## Context

Completed event loading fixes and pivoted to cloud-first architecture

## Decision

falling back to local files

## Rationale

Completed event loading fixes and pivoted to cloud-first architecture. Fixed 3 critical bugs: (1) Reset stale cursor to latest event (14 days old → current), (2) Improved blocked event detection with smart regex (word boundaries + unblocking words), fixed 24/24 unit tests, (3) Deduplicated events in current-events.jsonl (43 → 41 events, removed 2 duplicates within 10s window). 

Root cause analysis revealed cursors are over-engineered (YAGNI) - we only need simple chronological queries for 'last 50 events'. Investigation showed dual-write (local files + cloud graph) masks cloud graph bugs by falling back to local files. 

Architectural pivot: Created TASK-011 (Remove cursors, use chronological queries), TASK-012 (Eliminate dual-write, cloud-graph-only), TASK-013 (Graph reliability testing). This eliminates state sync complexity, makes cloud graph source of truth, and provides feedback loop to fix graph bugs. Cancelled TASK-010 (cursor advancement) as obsolete.

## Implementation

*No code example available*

## Consequences

- **Time Impact**: 180 minutes
- **Reusability**: 85%

## Related Files

- `.ginko/context/index.json`
- `.ginko/sessions/chris-at-watchhill-ai/current-events.jsonl`
- `.ginko/sessions/chris-at-watchhill-ai/current-session-log.md`
- `.ginko/sessions/chris-at-watchhill-ai/cursors.json`
- `docs/adr/ADR-INDEX.md`