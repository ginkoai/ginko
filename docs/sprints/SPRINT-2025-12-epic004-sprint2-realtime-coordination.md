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

- [x] Agent A logs event, Agent B sees it within 5 seconds (via stream endpoint)
- [x] Event stream API supports long-polling or SSE (both implemented)
- [x] Blocker events signal dependencies to other agents (blocker category + fields)
- [x] Agent status dashboard shows who's working on what (/dashboard/agents)
- [x] `ginko agent status` shows all active agents and their tasks (enhanced CLI)
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
**Status:** [x] Complete
**Effort:** Small
**Files:** `packages/cli/src/lib/event-logger.ts`, `packages/cli/src/commands/log.ts`, `packages/cli/src/utils/command-helpers.ts`

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
- [x] Blocker events created via `ginko log --category blocker`
- [x] blocked_by field captured (--blocked-by flag)
- [x] blocking_tasks field captured (--blocking-tasks flag)
- [x] severity field captured (--severity flag: low, medium, high, critical)
- [x] Other agents can query blockers affecting their tasks via event stream

---

### TASK-5: Agent Status Dashboard
**Status:** [x] Complete
**Effort:** Medium
**Files:** `dashboard/src/app/dashboard/agents/page.tsx`, `dashboard/src/components/agents/`

Visual dashboard showing:
- Active agents and their status (idle, busy, offline)
- Current task for each busy agent
- Recent events per agent
- Blockers affecting agents

**Acceptance:**
- [x] Real-time updates (polling every 5s for agents, 10s for blockers)
- [x] Groups by status: busy, idle, offline
- [x] Shows agent details in cards (capabilities, current task)
- [x] Shows time since last heartbeat
- [x] Displays active blockers with severity badges

---

### TASK-6: CLI Agent Status Command
**Status:** [x] Complete
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
- [x] Shows all agents in project (via API)
- [x] Shows current task for busy agents (from metadata)
- [x] Shows active blockers (from event stream)
- [x] Updates on each invocation (real-time from API)

---

### TASK-7: Event Agent Attribution
**Status:** [x] Complete
**Effort:** Small
**Files:** `packages/cli/src/lib/event-logger.ts`

Add agent_id to all events:
```typescript
interface Event {
  // ... existing fields
  agent_id?: string;  // ID of agent that created event (undefined for humans)
}
```

**Acceptance:**
- [x] Registered agents include agent_id in events (read from `.ginko/agent.json`)
- [x] Human users have undefined agent_id (not included in JSON)
- [x] Events queryable by agent_id (synced to graph with agent_id)

---

### TASK-8: Integration Tests
**Status:** [x] Complete
**Effort:** Medium
**Files:** `packages/cli/test/integration/realtime-coordination.test.ts`

Test scenarios:
- Agent A logs event, Agent B sees via stream within 5s
- Blocker event creation and query
- Cursor updates in real-time
- Dashboard data accuracy

**Acceptance:**
- [x] Timing test: event visible < 5 seconds (configurable polling)
- [x] Blocker flow end-to-end (create + query)
- [x] Agent attribution tests (agent_id in events)
- [x] Event streaming tests (polling, filtering, since parameter)
- [x] 12 tests passing

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

- [x] All tasks completed (8/8)
- [x] Agent A's event visible to Agent B < 5 seconds (validated in tests)
- [x] Blocker signaling works end-to-end (CLI + API + dashboard)
- [x] Dashboard shows accurate real-time status (5s polling)
- [x] No regression in existing functionality (all tests passing)

---

## Progress

**Started:** 2025-12-05
**Completed:** 8/8 tasks (100%)

## Accomplishments This Sprint

### 2025-12-05: TASK-8 Integration Tests
- Created comprehensive integration test suite for Sprint 2 features
- 12 tests covering: event streaming, blocker signaling, agent attribution, cursor updates
- Event visibility timing test validates <5 second latency requirement
- Blocker tests validate create + query + filter by severity
- Agent attribution tests validate agent_id in events
- Files: `packages/cli/test/integration/realtime-coordination.test.ts`

### 2025-12-05: TASK-5 Agent Status Dashboard
- Created new `/dashboard/agents` page for visual agent monitoring
- AgentStatusGrid component with real-time polling (5s interval)
- AgentCard component showing status, capabilities, current task
- BlockersList component showing active blockers with severity
- Groups agents by status: busy (with pulse), idle, offline (collapsed)
- Summary stats: total agents, busy, idle, offline counts
- Files: `dashboard/src/app/dashboard/agents/page.tsx`, `dashboard/src/components/agents/`

### 2025-12-05: TASK-6 CLI Agent Status Command
- Rewrote `ginko agent status` to show all agents from API
- Displays active, idle, and offline agents with time since last update
- Fetches and displays active blockers from event stream
- Shows current task for busy agents (from metadata)
- Graceful fallback to local config when not authenticated
- Files: `packages/cli/src/commands/agent/status.ts`

### 2025-12-05: TASK-7 Event Agent Attribution
- Added `agent_id` field to Event interface and EventContext
- Created `getAgentId()` function to read from `.ginko/agent.json`
- Agent events include agent_id when registered, undefined for humans
- Graph sync includes agent_id for queryable agent-specific events
- Files: `packages/cli/src/lib/event-logger.ts`

### 2025-12-05: TASK-4 Blocker Signaling
- Added `blocker` category to event logging system
- New CLI options: `--blocked-by`, `--blocking-tasks`, `--severity`
- Blocker severity levels: low, medium, high, critical
- Visual output shows blocker details with severity-based coloring
- Events synced to graph for multi-agent coordination
- Auto-detection patterns for blocker category (blocked, impediment, stuck, etc.)
- Files: `packages/cli/src/lib/event-logger.ts`, `packages/cli/src/commands/log.ts`, `packages/cli/src/utils/command-helpers.ts`, `packages/cli/src/index.ts`

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
