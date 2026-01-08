---
session_id: session-2026-01-07T23-36-01-259Z
started: 2026-01-07T23:36:01.259Z
user: chris@watchhill.ai
branch: main
flow_state: hot
---

# Session Log: session-2026-01-07T23-36-01-259Z

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

### 18:40 - [fix]
# [FIX] 18:40

Deleted orphan entity epic_ginko_1763746656116 from graph. Root cause: timestamp-based ID generation bug created malformed entity ID on 2025-11-21. Used DELETE /api/v1/graph/nodes endpoint directly since CLI lacks delete command. Entity confirmed removed - graph explore returns 404.

**Files:**
- .ginko/sessions/chris-at-watchhill-ai/current-context.jsonl
- .ginko/sessions/chris-at-watchhill-ai/current-events.jsonl
- .ginko/sessions/chris-at-watchhill-ai/current-session-log.md

**Impact:** medium
**Timestamp:** 2026-01-07T23:40:14.408Z

Files: .ginko/sessions/chris-at-watchhill-ai/current-context.jsonl, .ginko/sessions/chris-at-watchhill-ai/current-events.jsonl, .ginko/sessions/chris-at-watchhill-ai/current-session-log.md
Impact: medium

### 18:44 - [git]
# [GIT] 18:44

Committed and pushed orphan entity cleanup to main. Commit 14a7892: fix(graph): Delete orphan entity epic_ginko_1763746656116. Sprint e008_s05 now at 75% (6/8 tasks).

**Impact:** low
**Timestamp:** 2026-01-07T23:44:37.066Z

Impact: low

### 18:50 - [achievement]
# [ACHIEVEMENT] 18:50

Completed T5 and T6 for sprint e008_s05. T5: Created /api/v1/epic/backfill endpoint, backfilled createdBy for all 10 epics to chris@watchhill.ai. T6: Fixed by orphan deletion - suggestedId now returns sequential EPIC-011 format instead of timestamp. Deployed to Vercel and verified both fixes working.

**Files:**
- .ginko/sessions/chris-at-watchhill-ai/current-events.jsonl
- .ginko/sessions/chris-at-watchhill-ai/current-session-log.md

**Impact:** high
**Timestamp:** 2026-01-07T23:50:45.100Z

Files: .ginko/sessions/chris-at-watchhill-ai/current-events.jsonl, .ginko/sessions/chris-at-watchhill-ai/current-session-log.md
Impact: high

### 18:52 - [achievement]
# [ACHIEVEMENT] 18:52

Sprint e008_s05 COMPLETE\! All 8 tasks done, all success criteria met. Data integrity issues resolved: orphan deleted, createdBy backfilled, suggestedId fixed, EPIC-INDEX updated, duplicate detection added. Committed 5494194 and pushed to main.

**Impact:** high
**Timestamp:** 2026-01-07T23:52:20.299Z

Impact: high

### 18:57 - [insight]
# [INSIGHT] 18:57

INSIGHT: Orphan entities with malformed IDs can poison ID calculations. The orphan epic_ginko_1763746656116 (timestamp ID) caused findNextAvailableId() to return EPIC-1763746656117 instead of EPIC-011. Always validate ID format before including in max calculations.

**Impact:** medium
**Timestamp:** 2026-01-07T23:57:47.776Z

Impact: medium

### 18:57 - [insight]
# [INSIGHT] 18:57

INSIGHT: Generic node delete API works for all entity types. DELETE /api/v1/graph/nodes/:id can remove Epic, Sprint, ADR, etc. No need for entity-specific delete endpoints. Uses DETACH DELETE to clean up relationships.

**Files:**
- .ginko/sessions/chris-at-watchhill-ai/current-events.jsonl
- .ginko/sessions/chris-at-watchhill-ai/current-session-log.md

**Impact:** medium
**Timestamp:** 2026-01-07T23:57:55.110Z

Files: .ginko/sessions/chris-at-watchhill-ai/current-events.jsonl, .ginko/sessions/chris-at-watchhill-ai/current-session-log.md
Impact: medium

### 18:58 - [insight]
# [INSIGHT] 18:58

PATTERN: Backfill endpoints for schema evolution. When adding required fields like createdBy, create a one-time /backfill endpoint to populate existing records. Pattern: MATCH nodes WHERE field IS NULL OR field = 'unknown' SET field = default.

**Files:**
- .ginko/sessions/chris-at-watchhill-ai/current-events.jsonl
- .ginko/sessions/chris-at-watchhill-ai/current-session-log.md

**Impact:** medium
**Timestamp:** 2026-01-07T23:58:01.113Z

Files: .ginko/sessions/chris-at-watchhill-ai/current-events.jsonl, .ginko/sessions/chris-at-watchhill-ai/current-session-log.md
Impact: medium

### 18:58 - [insight]
# [INSIGHT] 18:58

GOTCHA: Timestamp-based ID generation creates malformed entities. Using Date.now() for entity IDs (e.g., epic_ginko_1763746656116) breaks sequential ID patterns and poisons max calculations. Always use sequential IDs with proper format validation (EPIC-NNN, ADR-NNN).

**Files:**
- .ginko/sessions/chris-at-watchhill-ai/current-events.jsonl
- .ginko/sessions/chris-at-watchhill-ai/current-session-log.md

**Impact:** high
**Timestamp:** 2026-01-07T23:58:14.494Z

Files: .ginko/sessions/chris-at-watchhill-ai/current-events.jsonl, .ginko/sessions/chris-at-watchhill-ai/current-session-log.md
Impact: high

### 18:58 - [insight]
# [INSIGHT] 18:58

INSIGHT: Data integrity issues compound. Single orphan entity (timestamp ID) caused multiple downstream problems: broken suggestedId, polluted graph queries, confusing conflict detection. Early cleanup prevents cascade failures.

**Files:**
- .ginko/context/index.json
- .ginko/sessions/chris-at-watchhill-ai/current-events.jsonl
- .ginko/sessions/chris-at-watchhill-ai/current-session-log.md

**Impact:** high
**Timestamp:** 2026-01-07T23:58:29.209Z

Files: .ginko/context/index.json, .ginko/sessions/chris-at-watchhill-ai/current-events.jsonl, .ginko/sessions/chris-at-watchhill-ai/current-session-log.md
Impact: high
