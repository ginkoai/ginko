---
session_id: session-2025-12-30T22-55-51-280Z
started: 2025-12-30T22:55:51.280Z
user: chris@watchhill.ai
branch: main
flow_state: hot
---

# Session Log: session-2025-12-30T22-55-51-280Z

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

### 11:25 - [fix]
# [FIX] 11:25

Fixed B12 critical blocker: NodeEditorModal was sending graphId in request body but API expects it as query parameter. Changed fetch URL from /api/v1/graph/nodes/{id} to /api/v1/graph/nodes/{id}?graphId={graphId}. Also wrapped formData in 'properties' key to match API expectation.

**Files:**
- dashboard/src/components/graph/NodeEditorModal.tsx:241

**Impact:** high
**Timestamp:** 2025-12-31T16:25:00.088Z

Files: dashboard/src/components/graph/NodeEditorModal.tsx:241
Impact: high

### 13:36 - [fix]
# [FIX] 13:36

Fixed B20: timeZoneOffsetSeconds error when saving nodes. Root cause: Neo4j DateTime objects from loaded nodes were being sent back in form data. Solution: Filter out system-managed fields (editedAt, updatedAt, createdAt, syncedAt, synced, contentHash, gitHash, id, graphId) before building the Cypher SET clause. These fields are auto-managed by the API.

**Files:**
- dashboard/src/app/api/v1/graph/nodes/[id]/route.ts:139-146

**Impact:** high
**Timestamp:** 2025-12-31T18:36:52.997Z

Files: dashboard/src/app/api/v1/graph/nodes/[id]/route.ts:139-146
Impact: high
