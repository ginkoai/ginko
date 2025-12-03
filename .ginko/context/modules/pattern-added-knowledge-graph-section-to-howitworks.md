---
type: pattern
tags: [feature, high]
relevance: critical
created: 2025-12-03T19:14:48.064Z
updated: 2025-12-03T19:14:48.064Z
dependencies: []
sessionId: session-chris-at-watchhill-ai-1764789288031
insightId: 5e6dc1c5-da9d-4b45-b672-26d2deb7705c
---

# Added Knowledge Graph section to how-it-works

**Type**: pattern  
**Tags**: feature, high  
**Created**: 2025-12-03  

## Pattern Description

Added Knowledge Graph section to how-it-works

## Implementation

Knowledge Graph section to how-it-works

## Code Example

*No code example available*

## When to Use

Added Knowledge Graph section to how-it-works.html explaining cloud graph capabilities: Real-time sync (events sync as you work), Semantic search (natural language queries), Knowledge traversal (AI navigates relationships between patterns, ADRs, sprints, gotchas), Team context (cross-team pattern sharing). Includes visual diagram showing PROJECT node connected to Events/Patterns/ADRs/Sprints/Gotchas/Team satellites, 4-step flow diagram (Local capture → Background sync → Vector embedding → AI retrieval), and semantic query terminal example. Added ~200 lines CSS for graph visualization, flow diagrams, responsive layout.

## Benefits

- **Time Saved**: 120 minutes
- **Reusability**: 85%

## Related Files

- `.ginko/sessions/chris-at-watchhill-ai/current-events.jsonl`
- `.ginko/sessions/chris-at-watchhill-ai/current-session-log.md`
- `dashboard/src/app/api/v1/graph/nodes/route.ts`
- `docs/sprints/SPRINT-2025-12-epic003-sprint1.md`
- `packages/cli/src/templates/ai-instructions-template.ts`