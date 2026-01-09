---
session_id: session-2026-01-09T15-27-13-120Z
started: 2026-01-09T15:27:13.120Z
user: chris@watchhill.ai
branch: main
flow_state: hot
---

# Session Log: session-2026-01-09T15-27-13-120Z

## Timeline
<!-- Complete chronological log of all session events -->
<!-- Includes: fixes, features, achievements, and categorized entries (decisions/insights/git also appear in their sections) -->
<!-- GOOD: "Fixed auth timeout. Root cause: bcrypt rounds set to 15 (too slow). Reduced to 11." -->
<!-- BAD: "Fixed timeout" (too terse, missing root cause) -->

### 10:35 - [fix]
Fixed three Graph view issues: (1) Simplified /api/v1/graph/status Cypher query to avoid 500 errors - split complex consolidated query into separate simpler queries with individual error handling. (2) Improved epic deduplication in tree-explorer - added normalizeId() and normalizeTitle() functions to handle different ID formats (e012, EPIC-012, epic_012) and detect title-based duplicates. (3) Added missing favicon.ico to dashboard/public directory.
Files: dashboard/src/app/api/v1/graph/status/route.ts, dashboard/src/lib/graph/api-client.ts, dashboard/public/favicon.ico
Impact: medium


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
