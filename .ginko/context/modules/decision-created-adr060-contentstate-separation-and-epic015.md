---
type: decision
tags: [decision, high, git, auth]
relevance: critical
created: 2026-01-16T17:44:40.866Z
updated: 2026-01-16T17:44:40.866Z
dependencies: []
sessionId: session-chris-at-watchhill-ai-1768585480819
insightId: 216806ea-49b9-4f89-ba72-a981379f0627
---

# Created ADR-060 (Content/State Separation) and EPIC-015 (...

**Type**: decision  
**Tags**: decision, high, git, auth  
**Created**: 2026-01-16  

## Context

Created ADR-060 (Content/State Separation) and EPIC-015 (Graph-Authoritative State)

## Decision

establishing single source of truth

## Rationale

Created ADR-060 (Content/State Separation) and EPIC-015 (Graph-Authoritative State). Decision: Graph is authoritative for operational state (task/sprint/epic status), Git remains authoritative for content (definitions, descriptions). Eliminates dual-write sync bugs by establishing single source of truth.

## Implementation

*No code example available*

## Consequences

- **Time Impact**: 180 minutes
- **Reusability**: 85%

## Related Files

- `.ginko/sessions/chris-at-watchhill-ai/current-context.jsonl`
- `.ginko/sessions/chris-at-watchhill-ai/current-session-log.md`