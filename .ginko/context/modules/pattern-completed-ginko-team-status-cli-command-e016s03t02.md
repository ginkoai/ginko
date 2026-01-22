---
type: pattern
tags: [feature, high, api, cli]
relevance: critical
created: 2026-01-21T22:09:35.720Z
updated: 2026-01-21T22:09:35.720Z
dependencies: []
sessionId: session-chris-at-watchhill-ai-1769033375678
insightId: 995463f3-5137-47de-867a-0b9fd4ed8a24
---

# Completed ginko team status CLI command (e016_s03_t02)

**Type**: pattern  
**Tags**: feature, high, api, cli  
**Created**: 2026-01-21  

## Pattern Description

Completed ginko team status CLI command (e016_s03_t02)

## Implementation

Completed ginko team status CLI command (e016_s03_t02). Displays team work status with progress bars, relative timestamps, and unassigned work summary. Uses new /api/v1/team/status endpoint. Fixed Neo4j query syntax (NOT IN, position function). Command registered as subcommand: ginko team status.

## Code Example

*No code example available*

## When to Use

Completed ginko team status CLI command (e016_s03_t02). Displays team work status with progress bars, relative timestamps, and unassigned work summary. Uses new /api/v1/team/status endpoint. Fixed Neo4j query syntax (NOT IN, position function). Command registered as subcommand: ginko team status.

## Benefits

- **Time Saved**: 120 minutes
- **Reusability**: 85%

## Related Files

- `packages/cli/src/commands/team/status.ts`
- `packages/cli/src/commands/team/index.ts`
- `packages/cli/src/index.ts`