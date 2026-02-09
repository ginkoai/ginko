---
session_id: session-2026-02-09T14-12-36-934Z
started: 2026-02-09T14:12:36.934Z
user: chris@watchhill.ai
branch: feature/dashboard-settings-projects
flow_state: hot
---

# Session Log: session-2026-02-09T14-12-36-934Z

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

### 10:17 - [insight]
# [INSIGHT] 10:17

Root cause for EPIC-021 push failure: multi-user ID collision. Reese created EPIC-019 (GTM Launch) with sprints/tasks and pushed to graph. Chris's local didn't have it (Reese hasn't pushed to GitHub). Chris independently created EPIC-019 (Graph-Authoritative Tasks), pushed it, overwrote Reese's e019 node content but left her child sprints/tasks orphaned. Renumbered to EPIC-021 but API won't create new node — likely content similarity dedup against corrupted e019.

**Files:**
- .ginko/graph/config.json
- .ginko/sessions/chris-at-watchhill-ai/current-context.jsonl
- .ginko/sessions/chris-at-watchhill-ai/current-events.jsonl
- .ginko/sessions/chris-at-watchhill-ai/current-session-log.md
- .ginko/sessions/chris-at-watchhill-ai/insights-schedule.json

**Impact:** high
**Timestamp:** 2026-02-09T15:17:44.541Z

Files: .ginko/graph/config.json, .ginko/sessions/chris-at-watchhill-ai/current-context.jsonl, .ginko/sessions/chris-at-watchhill-ai/current-events.jsonl, .ginko/sessions/chris-at-watchhill-ai/current-session-log.md, .ginko/sessions/chris-at-watchhill-ai/insights-schedule.json
Impact: high

### 11:30 - [achievement]
# [ACHIEVEMENT] 11:30

BUG-026 fixed: Epic nodes silently not created on ginko push. Root cause was document upload using MATCH for Epic type (enrich-only), but task sync only creates Epic nodes when sprints reference them. Fix: moved Epic from MATCH to MERGE path in /api/v1/graph/documents. Sprint stays MATCH-only.

**Files:**
- .ginko/context/index.json
- .ginko/graph/config.json
- .ginko/sessions/chris-at-watchhill-ai/current-context.jsonl
- .ginko/sessions/chris-at-watchhill-ai/current-events.jsonl
- .ginko/sessions/chris-at-watchhill-ai/current-session-log.md

**Impact:** medium
**Timestamp:** 2026-02-09T16:30:27.027Z

Files: .ginko/context/index.json, .ginko/graph/config.json, .ginko/sessions/chris-at-watchhill-ai/current-context.jsonl, .ginko/sessions/chris-at-watchhill-ai/current-events.jsonl, .ginko/sessions/chris-at-watchhill-ai/current-session-log.md
Impact: medium

### 11:30 - [insight]
# [INSIGHT] 11:30

Insight: When structural nodes have multiple creation paths (task sync vs document upload), verify each path independently. Epic had a gap: task sync only creates Epic nodes when sprints reference them, so standalone Epics with no sprints had no creation path. The API returned 201 success masking the silent failure.

**Files:**
- .ginko/context/index.json
- .ginko/graph/config.json
- .ginko/sessions/chris-at-watchhill-ai/current-context.jsonl
- .ginko/sessions/chris-at-watchhill-ai/current-events.jsonl
- .ginko/sessions/chris-at-watchhill-ai/current-session-log.md

**Impact:** high
**Timestamp:** 2026-02-09T16:30:35.333Z

Files: .ginko/context/index.json, .ginko/graph/config.json, .ginko/sessions/chris-at-watchhill-ai/current-context.jsonl, .ginko/sessions/chris-at-watchhill-ai/current-events.jsonl, .ginko/sessions/chris-at-watchhill-ai/current-session-log.md
Impact: high

### 11:30 - [insight]
# [INSIGHT] 11:30

Gotcha: MATCH in Cypher silently returns 0 records when no node exists — it does NOT error. Combined with a 201 API response, this creates a silent failure pattern. Always surface MATCH miss as a warning in the API response, not just console.warn.

**Files:**
- .ginko/context/index.json
- .ginko/graph/config.json
- .ginko/sessions/chris-at-watchhill-ai/current-context.jsonl
- .ginko/sessions/chris-at-watchhill-ai/current-events.jsonl
- .ginko/sessions/chris-at-watchhill-ai/current-session-log.md

**Impact:** high
**Timestamp:** 2026-02-09T16:30:42.802Z

Files: .ginko/context/index.json, .ginko/graph/config.json, .ginko/sessions/chris-at-watchhill-ai/current-context.jsonl, .ginko/sessions/chris-at-watchhill-ai/current-events.jsonl, .ginko/sessions/chris-at-watchhill-ai/current-session-log.md
Impact: high

### 11:30 - [decision]
# [DECISION] 11:30

Decision: Sprint stays MATCH-only in document upload (task sync is sole creator). Epic moved to MERGE (like ADR, Pattern, etc.) because new Epics may be pushed before any sprints exist. MERGE on {id, graph_id} is idempotent and safe against duplicates.

**Files:**
- .ginko/context/index.json
- .ginko/graph/config.json
- .ginko/sessions/chris-at-watchhill-ai/current-context.jsonl
- .ginko/sessions/chris-at-watchhill-ai/current-events.jsonl
- .ginko/sessions/chris-at-watchhill-ai/current-session-log.md

**Impact:** medium
**Timestamp:** 2026-02-09T16:30:50.433Z

Files: .ginko/context/index.json, .ginko/graph/config.json, .ginko/sessions/chris-at-watchhill-ai/current-context.jsonl, .ginko/sessions/chris-at-watchhill-ai/current-events.jsonl, .ginko/sessions/chris-at-watchhill-ai/current-session-log.md
Impact: medium
