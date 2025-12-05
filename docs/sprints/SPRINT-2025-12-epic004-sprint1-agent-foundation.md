---
sprint_id: EPIC-004-S1
epic_id: EPIC-004
status: complete
created: 2025-12-05
updated: 2025-12-05
adr: ADR-051
---

# Sprint 1: Agent Foundation

**Epic:** EPIC-004 - AI-to-AI Collaboration
**Goal:** Agents can register, discover each other, and claim tasks atomically
**Duration:** 2 weeks
**Type:** Infrastructure

## Sprint Goal

Establish the foundational primitives for multi-agent coordination: agent identity, capability declaration, task claiming with conflict detection.

## Success Criteria

- [x] Agent node type exists in Neo4j with proper schema
- [x] POST /api/v1/agent creates agent with capabilities
- [x] GET /api/v1/agent lists agents with filters (status, capabilities)
- [x] POST /api/v1/task/:id/claim atomically claims task
- [x] Concurrent claim attempts return 409 Conflict
- [x] `ginko agent register` creates agent from CLI
- [x] `ginko agent list` shows active agents
- [x] Agent heartbeat updates last_active timestamp

## Tasks

### TASK-1: Agent Node Schema
**Status:** [x] Complete
**Effort:** Small
**Files:** `src/graph/schema/agent.cypher`

Create Neo4j schema for Agent nodes:
```cypher
CREATE CONSTRAINT agent_id IF NOT EXISTS
FOR (a:Agent) REQUIRE a.id IS UNIQUE;

// Agent properties: id, name, model, provider, capabilities[],
// status, last_heartbeat, organization_id, project_id, created_at
```

**Acceptance:**
- [ ] Schema migration runs without error
- [ ] Agent node can be created with all properties
- [ ] Unique constraint prevents duplicate IDs

---

### TASK-2: Agent Registration API
**Status:** [x] Complete
**Effort:** Medium
**Files:** `dashboard/src/app/api/v1/agent/route.ts`
**Depends:** TASK-1

Implement REST endpoints:
- `POST /api/v1/agent` - Register new agent
- `GET /api/v1/agent` - List agents with filters
- `PATCH /api/v1/agent/:id` - Update agent status/capabilities
- `DELETE /api/v1/agent/:id` - Deregister agent

**Acceptance:**
- [ ] Bearer token required (same auth as other endpoints)
- [ ] Agent scoped to organization_id from token
- [ ] Capabilities stored as array
- [ ] Status enum: active, idle, busy, offline

---

### TASK-3: Agent Heartbeat
**Status:** [x] Complete
**Effort:** Small
**Files:** `packages/cli/src/lib/agent-heartbeat.ts`, `dashboard/src/app/api/v1/agent/[id]/heartbeat/route.ts`
**Depends:** TASK-2

Implement heartbeat mechanism:
- `POST /api/v1/agent/:id/heartbeat` - Update last_heartbeat
- CLI sends heartbeat every 30 seconds when active
- Stale agents (no heartbeat for 5 min) marked offline

**Acceptance:**
- [ ] Heartbeat updates last_heartbeat timestamp
- [ ] Stale detection query works correctly
- [ ] Offline agents excluded from task assignment

---

### TASK-4: Task Claiming API
**Status:** [x] Complete
**Effort:** Medium
**Files:** `dashboard/src/app/api/v1/task/[id]/claim/route.ts`
**Depends:** TASK-2

Implement atomic task claiming:
```cypher
MATCH (t:Task {id: $taskId, status: 'available'})
MATCH (a:Agent {id: $agentId})
WHERE NOT EXISTS((t)<-[:CLAIMED_BY]-(:Agent))
CREATE (t)<-[:CLAIMED_BY {claimed_at: datetime()}]-(a)
SET t.status = 'in_progress', a.status = 'busy'
RETURN t, a
```

**Acceptance:**
- [ ] First claim succeeds with 200
- [ ] Concurrent claim returns 409 Conflict
- [ ] Already-claimed task returns 409
- [ ] Agent status updated to 'busy'

---

### TASK-5: Task Release API
**Status:** [x] Complete
**Effort:** Small
**Files:** `dashboard/src/app/api/v1/task/[id]/release/route.ts`
**Depends:** TASK-4

Implement task release:
- `POST /api/v1/task/:id/release` - Release claimed task
- Only claiming agent can release
- Task returns to 'available' status

**Acceptance:**
- [ ] Claiming agent can release
- [ ] Non-claiming agent gets 403
- [ ] Released task becomes available again

---

### TASK-6: CLI Agent Commands
**Status:** [x] Complete
**Effort:** Medium
**Files:** `packages/cli/src/commands/agent/register.ts`, `packages/cli/src/commands/agent/list.ts`, `packages/cli/src/commands/agent/status.ts`
**Depends:** TASK-2, TASK-3

Implement CLI commands:
- `ginko agent register --name "Worker-1" --capabilities typescript,testing`
- `ginko agent list [--status active] [--capability typescript]`
- `ginko agent status` - Show current agent's status

**Acceptance:**
- [ ] Register creates agent and stores ID locally
- [ ] List shows agents with filtering
- [ ] Status shows current agent info

---

### TASK-7: Worker Self-Context Loading
**Status:** [x] Complete
**Effort:** Small
**Files:** `packages/cli/src/commands/agent/work.ts`, `docs/adr/ADR-051-ai-to-ai-collaboration-architecture.md`

Document and implement worker context loading flow:
- Workers call `ginko start` on startup to load project context
- Task-specific context loaded lazily on assignment
- Orchestrator provides task metadata, NOT full project context

```
Worker Startup Flow:
1. ginko agent work --capabilities typescript
2. Register as worker agent
3. ginko start (load project context: events, patterns, ADRs)
4. Poll for assignments
5. On assignment: load task-specific files + criteria
6. Execute, log events, verify, complete
7. Return to polling
```

**Acceptance:**
- [ ] Worker calls ginko start automatically on startup
- [ ] Context loaded before accepting first task
- [ ] Task-specific context loaded per-assignment
- [ ] ADR-051 updated with context loading section

---

### TASK-8: Integration Tests
**Status:** [x] Complete
**Effort:** Medium
**Files:** `packages/cli/test/integration/agent-coordination.test.ts`
**Depends:** TASK-1 through TASK-7

Write integration tests:
- Agent registration flow
- Task claiming race condition (concurrent claims)
- Heartbeat and stale detection
- Task release and re-claim
- Worker context loading flow

**Acceptance:**
- [ ] All tests pass
- [ ] Race condition test verifies only one claim succeeds
- [ ] Coverage > 80% for new code

---

## Technical Notes

### Agent ID Format
```
agent_{timestamp}_{random6}
Example: agent_1733400000000_abc123
```

### Capability Naming Convention
```
Lowercase, hyphenated: typescript, security-review, test-generation
```

### Authentication
Agents use the same bearer token mechanism as human users. The agent's `organization_id` is derived from the token.

## Files Summary

**New files:**
- `src/graph/schema/agent.cypher`
- `dashboard/src/app/api/v1/agent/route.ts`
- `dashboard/src/app/api/v1/agent/[id]/route.ts`
- `dashboard/src/app/api/v1/agent/[id]/heartbeat/route.ts`
- `dashboard/src/app/api/v1/task/[id]/claim/route.ts`
- `dashboard/src/app/api/v1/task/[id]/release/route.ts`
- `packages/cli/src/lib/agent-heartbeat.ts`
- `packages/cli/src/commands/agent/register.ts`
- `packages/cli/src/commands/agent/list.ts`
- `packages/cli/src/commands/agent/status.ts`
- `packages/cli/test/integration/agent-coordination.test.ts`

**Modified files:**
- `packages/cli/src/index.ts` (add agent command group)

## Definition of Done

- [ ] All tasks completed
- [ ] Integration tests passing
- [ ] API documentation updated
- [ ] No regression in existing functionality
- [ ] Two agents can register; one claims task; other gets 409

---

## Progress

**Started:** 2025-12-05
**Completed:** 8/8 tasks ✅

## Accomplishments

### 2025-12-05: Sprint Complete
- Built entire Agent Foundation infrastructure using parallel agents
- Created 18 new files (+3,703 lines)
- All 8 tasks completed in single session
- Commit: f717119

**Key Deliverables:**
- Agent schema with unique constraints and indexes
- Full CRUD API for agents (register/list/update/delete)
- Atomic task claiming with 409 conflict detection
- Task release API with ownership verification
- CLI commands: `ginko agent register|list|status|work`
- Agent heartbeat mechanism (30s interval, .unref() pattern)
- Worker self-context loading via `ginko start`
- 29 integration tests covering race conditions

## Changelog

| Date | Change |
|------|--------|
| 2025-12-05 | Sprint created |
| 2025-12-05 | Sprint completed - all 8 tasks done |
