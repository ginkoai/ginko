---
session_id: session-2026-01-14T21-43-10-940Z
started: 2026-01-14T21:43:10.941Z
user: chris@watchhill.ai
branch: main
flow_state: hot
---

# Session Log: session-2026-01-14T21-43-10-940Z

## Timeline
<!-- Complete chronological log of all session events -->
<!-- Includes: fixes, features, achievements, and categorized entries (decisions/insights/git also appear in their sections) -->
<!-- GOOD: "Fixed auth timeout. Root cause: bcrypt rounds set to 15 (too slow). Reduced to 11." -->
<!-- BAD: "Fixed timeout" (too terse, missing root cause) -->

## Key Decisions
<!-- Important decisions made during session with alternatives considered -->
<!-- These entries also appear in Timeline for narrative coherence -->
<!-- GOOD: "Chose JWT over sessions. Alternatives: server sessions (harder to scale), OAuth (vendor lock-in). JWT selected for stateless mobile support." -->
<!-- BAD: "Chose JWT for auth" (missing alternatives and rationale) -->

## Insights
<!-- Patterns, gotchas, learnings discovered -->
<!-- These entries also appear in Timeline for narrative coherence -->
<!-- GOOD: "Discovered bcrypt rounds 10-11 optimal. Testing showed rounds 15 caused 800ms delays; rounds 11 achieved 200ms with acceptable entropy." -->
<!-- BAD: "Bcrypt should be 11" (missing context and discovery process) -->

## Git Operations
<!-- Commits, merges, branch changes -->
<!-- These entries also appear in Timeline for narrative coherence -->
<!-- Log significant commits with: ginko log "Committed feature X" --category=git -->

## Gotchas
<!-- Pitfalls, traps, and "lessons learned the hard way" -->
<!-- EPIC-002 Sprint 2: These become AVOID_GOTCHA relationships in the graph -->
<!-- GOOD: "EventQueue setInterval keeps process alive. Solution: timer.unref() allows clean exit." -->
<!-- BAD: "Timer bug fixed" (missing symptom, cause, and solution) -->

### 16:48 - [feature]
# [FEATURE] 16:48

Implemented hierarchical Nav Tree structure (e011_s01_t01). Changed buildTreeHierarchy in api-client.ts to nest Sprints under their parent Epic using extractEpicId(). Tasks were already nested under Sprints. Grouped ADRs, PRDs, Patterns, Gotchas, Principles under a 'Knowledge' folder with counts. Removed flat Sprints top-level branch. Updated tree-explorer default expansion to just project-root.

**Files:**
- dashboard/src/lib/graph/api-client.ts
- dashboard/src/components/graph/tree-explorer.tsx

**Impact:** high
**Timestamp:** 2026-01-14T21:48:55.844Z

Files: dashboard/src/lib/graph/api-client.ts, dashboard/src/components/graph/tree-explorer.tsx
Impact: high
