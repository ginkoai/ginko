---
type: decision
tags: [decision, high, git]
relevance: critical
created: 2025-11-24T23:56:20.163Z
updated: 2025-11-24T23:56:20.163Z
dependencies: []
sessionId: session-chris-at-watchhill-ai-1764028580151
insightId: 9ee5398f-3d41-4235-8d95-f5820d4b44e5
---

# DECISION: Doc taxonomy established

**Type**: decision  
**Tags**: decision, high, git  
**Created**: 2025-11-24  

## Context

DECISION: Doc taxonomy established

## Decision

DECISION: Doc taxonomy established. Git is system of record for project docs (Charter, PRDs, ADRs, Epics, User Stories). Graph is system of record for work docs (Sprints, Tasks, Events). Graph is source of truth for EVERYTHING - project docs sync to graph for traversability. Consequence: file-graph concurrency will emerge as concern. Rationale: Balance knowledge preservation (git history, PR review) with data freshness (real-time multi-workstream visibility).

## Rationale

DECISION: Doc taxonomy established. Git is system of record for project docs (Charter, PRDs, ADRs, Epics, User Stories). Graph is system of record for work docs (Sprints, Tasks, Events). Graph is source of truth for EVERYTHING - project docs sync to graph for traversability. Consequence: file-graph concurrency will emerge as concern. Rationale: Balance knowledge preservation (git history, PR review) with data freshness (real-time multi-workstream visibility).

## Implementation

*No code example available*

## Consequences

- **Time Impact**: 180 minutes
- **Reusability**: 85%

## Related Files

- `.ginko/context/index.json`
- `.ginko/sessions/chris-at-watchhill-ai/current-events.jsonl`
- `.ginko/sessions/chris-at-watchhill-ai/current-session-log.md`