---
type: decision
tags: [decision, high, api, testing]
relevance: critical
created: 2025-11-21T21:58:32.720Z
updated: 2025-11-21T21:58:32.720Z
dependencies: []
sessionId: session-chris-at-watchhill-ai-1763762312703
insightId: b57571b3-b000-4157-8f58-13c527c56b87
---

# DECISION: File metadata strategy - Hybrid model (Option A)

**Type**: decision  
**Tags**: decision, high, api, testing  
**Created**: 2025-11-21  

## Context

DECISION: File metadata strategy - Hybrid model (Option A)

## Decision

DECISION: File metadata strategy - Hybrid model (Option A). Graph stores relationships only (MODIFIES), filesystem is source of truth for metadata. Rationale: (1) Graph's purpose is relationships/relevance not comprehensive data, (2) Syncing metadata in two places is losing battle, (3) Files must be read for work anyway, (4) ADR-002 designed for this (head -12 = 0.1s). Graph reduces search space, files provide truth. NEXT STEP: Enhance GET /api/v1/task/[id]/files to read frontmatter from filesystem on query. Add readFrontmatter() helper: read first 12 lines, parse @fileType/@tags/@complexity/@priority. Return {path, exists, metadata}. Deferred to fresh session for proper testing. Current TASK-3 complete: File nodes + MODIFIES relationships working, API returns paths. Enhancement adds metadata enrichment without staleness risk.

## Rationale

DECISION: File metadata strategy - Hybrid model (Option A). Graph stores relationships only (MODIFIES), filesystem is source of truth for metadata. Rationale: (1) Graph's purpose is relationships/relevance not comprehensive data, (2) Syncing metadata in two places is losing battle, (3) Files must be read for work anyway, (4) ADR-002 designed for this (head -12 = 0.1s). Graph reduces search space, files provide truth. NEXT STEP: Enhance GET /api/v1/task/[id]/files to read frontmatter from filesystem on query. Add readFrontmatter() helper: read first 12 lines, parse @fileType/@tags/@complexity/@priority. Return {path, exists, metadata}. Deferred to fresh session for proper testing. Current TASK-3 complete: File nodes + MODIFIES relationships working, API returns paths. Enhancement adds metadata enrichment without staleness risk.

## Implementation

*No code example available*

## Consequences

- **Time Impact**: 180 minutes
- **Reusability**: 85%

## Related Files

- `dashboard/src/app/api/v1/task/[id]/files/route.ts`