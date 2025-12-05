---
sprint_id: EPIC-004-S2
epic_id: EPIC-004
status: in_progress
created: 2025-12-05
updated: 2025-12-05
adr: ADR-051
depends: EPIC-004-S1
---

# Sprint 2: Real-Time Coordination

**Epic:** EPIC-004 - AI-to-AI Collaboration
**Goal:** Agents see each other's work in near-real-time (< 5 seconds)
**Duration:** 2 weeks
**Type:** Infrastructure
**Depends:** Sprint 1 (Agent Foundation)

## Sprint Goal

Enable real-time visibility across agents: event streaming, agent status monitoring, blocker signaling. This sprint makes multi-agent collaboration practical.

## Success Criteria

- [ ] Agent A logs event, Agent B sees it within 5 seconds
- [ ] Event stream API supports long-polling or SSE
- [ ] Blocker events signal dependencies to other agents
- [ ] Agent status dashboard shows who's working on what
- [ ] `ginko agent status` shows all active agents and their tasks
- [x] Cursor updates pushed in real-time, not just at handoff

## Tasks

### TASK-1: Real-Time Cursor Updates
**Status:** [x] Complete
**Effort:** Medium
**Files:** `packages/cli/src/lib/realtime-cursor.ts` (new), `packages/cli/src/lib/event-logger.ts`, `dashboard/src/app/api/v1/cursor/update/route.ts` (new)

Update cursor position on significant actions, not just handoff:
- After task claim ✅
- After each logged event ✅
- After task completion ✅
- Configurable: `--no-realtime-cursor` flag or `GINKO_REALTIME_CURSOR=false` env var ✅

**Acceptance:**
- [x] Cursor updates within 1 second of action (100ms debounce, well under 1s)
- [x] Can disable for low-bandwidth scenarios (`--no-realtime-cursor` flag)
- [x] No breaking change to existing handoff flow (cursor update is non-blocking)

---

### TASK-2: Event Stream Polling API
**Status:** [x] Complete
**Effort:** Medium
**Files:** `dashboard/src/app/api/v1/events/stream/route.ts`

Implement event streaming endpoint:
- `GET /api/v1/events/stream?since={event_id}&timeout=30`
- Long-poll: Hold connection up to 30s waiting for events
- Return immediately if events available
- Include agent_id in event metadata

**Acceptance:**
- [x] Returns events since specified ID
- [x] Long-poll holds connection when no events
- [x] Timeout returns empty array (not error)
- [x] Bearer token scopes to organization

---

### TASK-3: SSE Alternative (Optional)
**Status:** [x] Complete
**Effort:** Medium
**Files:** `dashboard/src/app/api/v1/events/sse/route.ts`

Server-Sent Events for true push:
- `GET /api/v1/events/sse` - Open SSE connection
- Events pushed as they occur
- Automatic reconnection support

**Acceptance:**
- [x] SSE connection stays open (edge runtime, 5min max)
- [x] Events pushed within 1 second (1s poll interval)
- [x] Client reconnection works correctly (Last-Event-ID header)
- [x] Falls back to polling if SSE unavailable (uses stream endpoint internally)

---

### TASK-4: Blocker Signaling
**Status:** [ ]
**Effort:** Small
**Files:** `packages/cli/src/lib/event-logger.ts`

Add blocker event category:
```typescript
interface BlockerEvent extends Event {
  category: 'blocker';
  blocked_by: string;      // What's blocking (task ID, resource, etc.)
  blocking_tasks: string[]; // Tasks that can't proceed
  severity: 'low' | 'medium' | 'high' | 'critical';
}
```

**Acceptance:**
- [ ] Blocker events created via `ginko log --category blocker`
- [ ] blocked_by field captured
- [ ] Other agents can query blockers affecting their tasks

---

### TASK-5: Agent Status Dashboard
**Status:** [ ]
**Effort:** Medium
**Files:** `dashboard/src/app/agent-status/page.tsx`

Visual dashboard showing:
- Active agents and their status (idle, busy, offline)
- Current task for each busy agent
- Recent events per agent
- Blockers affecting agents

**Acceptance:**
- [ ] Real-time updates (polling every 5s)
- [ ] Filter by project, status
- [ ] Click agent to see details
- [ ] Shows time since last heartbeat

---

### TASK-6: CLI Agent Status Command
**Status:** [ ]
**Effort:** Small
**Files:** `packages/cli/src/commands/agent/status.ts`
**Depends:** Sprint 1 TASK-6

Enhance `ginko agent status`:
```
ginko agent status

Active Agents (3):
  agent_abc123  Claude-Implementer  busy    TASK-4 (12m ago)
  agent_def456  GPT-Reviewer        idle    - (2m ago)
  agent_ghi789  Claude-Tester       busy    TASK-7 (5m ago)

Blockers (1):
  TASK-5 blocked by: API rate limit (high severity)
    Affects: TASK-6, TASK-8
```

**Acceptance:**
- [ ] Shows all agents in project
- [ ] Shows current task for busy agents
- [ ] Shows active blockers
- [ ] Updates on each invocation

---

### TASK-7: Event Agent Attribution
**Status:** [ ]
**Effort:** Small
**Files:** `packages/cli/src/lib/event-logger.ts`

Add agent_id to all events:
```typescript
interface Event {
  // ... existing fields
  agent_id?: string;  // ID of agent that created event (null for humans)
}
```

**Acceptance:**
- [ ] Registered agents include agent_id in events
- [ ] Human users have null/undefined agent_id
- [ ] Events queryable by agent_id

---

### TASK-8: Integration Tests
**Status:** [ ]
**Effort:** Medium
**Files:** `packages/cli/test/integration/realtime-coordination.test.ts`

Test scenarios:
- Agent A logs event, Agent B sees via stream within 5s
- Blocker event creation and query
- Cursor updates in real-time
- Dashboard data accuracy

**Acceptance:**
- [ ] Timing test: event visible < 5 seconds
- [ ] Blocker flow end-to-end
- [ ] Coverage > 80% for new code

---

## Technical Notes

### Polling vs SSE Trade-offs

| Aspect | Long-Polling | SSE |
|--------|--------------|-----|
| Latency | 0-30s (configurable) | < 1s |
| Complexity | Lower | Higher |
| Vercel support | Native | Requires edge runtime |
| Mobile/proxy compat | Better | May have issues |

**Recommendation:** Implement polling first, SSE as optional enhancement.

### Event Stream Query Pattern
```cypher
MATCH (e:Event)
WHERE e.organization_id = $orgId
  AND e.project_id = $projectId
  AND e.timestamp > $since
RETURN e
ORDER BY e.timestamp ASC
LIMIT 100
```

## Files Summary

**New files:**
- `dashboard/src/app/api/v1/events/stream/route.ts`
- `dashboard/src/app/api/v1/events/sse/route.ts` (optional)
- `dashboard/src/app/agent-status/page.tsx`
- `packages/cli/test/integration/realtime-coordination.test.ts`

**Modified files:**
- `packages/cli/src/lib/session-cursor.ts` (real-time updates)
- `packages/cli/src/lib/event-logger.ts` (blocker category, agent_id)
- `packages/cli/src/commands/agent/status.ts` (enhanced output)

## Definition of Done

- [ ] All tasks completed
- [ ] Agent A's event visible to Agent B < 5 seconds
- [ ] Blocker signaling works end-to-end
- [ ] Dashboard shows accurate real-time status
- [ ] No regression in existing functionality

---

## Progress

**Started:** 2025-12-05
**Completed:** 3/8 tasks (37.5%)

## Accomplishments This Sprint

### 2025-12-05: TASK-3 SSE Alternative
- Created `/api/v1/events/sse` endpoint with Server-Sent Events support
- Uses edge runtime for Vercel SSE compatibility (5min max connection)
- SSE events: `connected`, `event`, `heartbeat` (15s), `error`
- Reconnection via `Last-Event-ID` header for seamless resume
- Internally polls stream endpoint (composition pattern, no code duplication)
- Events pushed within 1 second of creation
- Files: `dashboard/src/app/api/v1/events/sse/route.ts`

### 2025-12-05: TASK-2 Event Stream Polling API
- Created `/api/v1/events/stream` endpoint with long-polling support
- Query parameters: `since` (event ID), `timeout` (1-60s), `limit` (1-200), `graphId`, `categories`, `agent_id`
- Returns events in chronological order with `hasMore` and `lastEventId` for pagination
- Polls every 500ms during long-poll, returns empty array on timeout (not error)
- Full Neo4j integration with proper auth and connection handling
- Files: `dashboard/src/app/api/v1/events/stream/route.ts`

### 2025-12-05: TASK-1 Real-Time Cursor Updates
- Created new `realtime-cursor.ts` module with debounced push updates
- Added `/api/v1/cursor/update` API endpoint with Neo4j MERGE pattern
- Integrated cursor updates into event-logger (onEventLogged)
- Integrated cursor updates into start command (onSessionStart)
- Integrated cursor updates into handoff command (onHandoff)
- Added `--no-realtime-cursor` CLI flag and `GINKO_REALTIME_CURSOR` env var
- Created unit tests validating <1s timing requirement
- All tests passing (12/12)

## Changelog

| Date | Change |
|------|--------|
| 2025-12-05 | Sprint created |
| 2025-12-05 | TASK-1 completed: Real-time cursor updates |
| 2025-12-05 | TASK-2 completed: Event stream polling API |
| 2025-12-05 | TASK-3 completed: SSE alternative endpoint |
