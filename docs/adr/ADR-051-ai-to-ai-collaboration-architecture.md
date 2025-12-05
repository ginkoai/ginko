---
type: decision
status: proposed
updated: 2025-12-05
tags: [ai-collaboration, multi-agent, orchestration, autonomy]
related: [ADR-043-event-stream-session-model.md, ADR-033-context-pressure-mitigation-strategy.md, ADR-041-graph-migration-write-dispatch.md]
priority: high
audience: [developer, ai-agent, stakeholder]
estimated-read: 12-min
dependencies: [ADR-043, ADR-033]
---

# ADR-051: AI-to-AI Collaboration Architecture

**Status:** Proposed
**Date:** 2025-12-05
**Authors:** Chris Norton, Claude
**Reviewers:** TBD

## Context

### Problem Statement

AI models have achieved near-parallel competency with mid-career human developers for individual coding tasks. However, they fall short in maintaining contextual focus over long timelines (weeks/months) required for sophisticated systems development. Current project management platforms are human-centric, lacking AI-native formatting and traversability.

Ginko solves the AI-native challenge through the collaboration graph but has been targeted at human+AI pairs. To enable **AI-orchestrated, AI-only delivery** of long-running development efforts, Ginko needs extensions for multi-agent coordination.

### Business Context

- **Market timing:** AI autonomy is accelerating; first-mover advantage for AI-native orchestration
- **Cost model:** AI rework is cheap compared to human development, enabling high-autonomy first passes
- **Target:** 80% first-pass autonomy with human refinement for final 20%

### Technical Context

Ginko's existing architecture provides strong foundations:
- **Event stream (ADR-043):** Append-only log with cursor-based sessions
- **Knowledge graph (Neo4j):** Typed relationships, multi-tenant isolation
- **Defensive logging (ADR-033):** Quality events at low context pressure
- **Write dispatcher (ADR-041):** Multi-backend persistence

Current gaps:
- No agent registry or discovery mechanism
- No atomic task claiming (race conditions possible)
- Session isolation prevents real-time cross-agent visibility
- No structured acceptance criteria verification

### Key Requirements

1. **Backward compatible:** Human+AI pairs must work unchanged
2. **Model-agnostic:** Support Claude, GPT, Gemini, Grok, etc.
3. **Flexible orchestration:** Supervisor, peer swarm, and pipeline patterns
4. **No new infrastructure:** Run on existing Neo4j, Vercel, Supabase stack
5. **Graceful degradation:** Agents can work offline, sync when connected

## Decision

Extend Ginko with an **Agent Coordination Layer** that treats AI agents as first-class collaborators while preserving the existing human+AI experience.

### Chosen Solution

Add four core primitives:

1. **Agent Registry** - Agents register with capabilities, receive identity
2. **Task Claiming** - Atomic task claim with conflict detection
3. **Real-time Events** - Sub-5-second cross-agent visibility
4. **Verification API** - Structured acceptance criteria checking

### Design Principles

```
"Cheap Rework Model"
- AI autonomy is high because AI rework cost is low
- Optimize for velocity over perfection
- Humans refine outcomes, not review every decision
```

```
"Model-Agnostic Coordination"
- Communication via event stream, not direct model APIs
- Any model that can HTTP + JSON can participate
- No Claude-specific, OpenAI-specific code paths
```

```
"Additive, Not Replacing"
- Agent registration is optional
- Task claiming supplements markdown checkboxes
- Human+AI pairs ignore agent features entirely
```

## Architecture

### System Design

```
┌─────────────────────────────────────────────────────────────────┐
│                        Ginko Platform                           │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────────────┐  │
│  │ Event Stream │  │ Task Graph   │  │ Agent Registry       │  │
│  │ (ADR-043)    │  │ (Neo4j)      │  │ (NEW)                │  │
│  └──────────────┘  └──────────────┘  └──────────────────────┘  │
│                            │                                    │
│                    REST API (model-agnostic)                    │
└─────────────────────────────────────────────────────────────────┘
                             │
        ┌────────────────────┼────────────────────┐
        │                    │                    │
   ┌────▼────┐          ┌────▼────┐          ┌────▼────┐
   │  Human  │          │ Claude  │          │  GPT-4  │
   │  + AI   │          │ Agent   │          │ Agent   │
   │ (pair)  │          │ Pool    │          │ Pool    │
   └─────────┘          └─────────┘          └─────────┘
```

### Agent Node Schema

```cypher
CREATE (a:Agent {
  id: 'agent_xxx',
  name: 'Claude-Implementer-1',
  model: 'claude-opus-4-5-20251101',      // Optional
  provider: 'anthropic',                   // Optional
  capabilities: ['typescript', 'testing', 'security'],
  status: 'active',                        // active | idle | busy | offline
  last_heartbeat: datetime(),
  organization_id: 'org_xxx',
  project_id: 'proj_xxx',
  created_at: datetime()
})
```

### Task Claiming Flow

```typescript
// Atomic claim via Cypher MERGE with constraints
MATCH (t:Task {id: $taskId, status: 'available'})
MATCH (a:Agent {id: $agentId, status: 'idle'})
WHERE NOT EXISTS((t)<-[:CLAIMED_BY]-(:Agent))
CREATE (t)<-[:CLAIMED_BY {claimed_at: datetime()}]-(a)
SET t.status = 'in_progress', a.status = 'busy'
RETURN t, a
```

If another agent already claimed: **409 Conflict** response.

### Orchestration Patterns

**Pattern A: Supervisor Agent**
```
Orchestrator Agent
  ├── decomposes Epic → Tasks
  ├── assigns to Worker Agents by capability
  ├── monitors progress via event stream
  └── resolves conflicts, reassigns blocked work
```

**Pattern B: Peer Swarm**
```
Agent Pool (equal peers)
  ├── each polls for unclaimed tasks
  ├── atomic claiming prevents conflicts
  ├── self-organize around dependencies
```

**Pattern C: Pipeline Stages**
```
Planner → Implementer → Reviewer → Deployer
```

All three patterns use the same primitives.

### API Surface

```
Agent Management:
  POST   /api/v1/agent              - Register agent
  GET    /api/v1/agent              - List agents (with filters)
  PATCH  /api/v1/agent/:id          - Update status/capabilities
  POST   /api/v1/agent/:id/heartbeat - Keep-alive signal

Task Coordination:
  POST   /api/v1/task/:id/claim     - Atomic claim (409 on conflict)
  POST   /api/v1/task/:id/release   - Release claimed task
  POST   /api/v1/task/:id/complete  - Mark complete with results
  POST   /api/v1/task/:id/block     - Signal blocker
  GET    /api/v1/task/available     - Tasks with deps satisfied

Verification:
  POST   /api/v1/task/:id/verify    - Run acceptance checks
  GET    /api/v1/task/:id/criteria  - Get acceptance criteria

Real-time:
  GET    /api/v1/events/stream      - SSE or long-poll for events
```

### Worker Self-Context Loading

**Design Principle:** Workers are responsible for their own context acquisition, not orchestrators.

```
┌─────────────────────────────────────────────────────────────┐
│                    Worker Startup Flow                       │
│                                                              │
│  1. ginko agent work --capabilities typescript              │
│     ↓                                                        │
│  2. Register as worker (or use .ginko/agent.json)           │
│     ↓                                                        │
│  3. ginko start  ← FULL PROJECT CONTEXT LOAD                │
│     • Event stream (ADR-043)                                │
│     • Patterns and gotchas                                  │
│     • Architecture Decision Records (ADRs)                  │
│     • Sprint context and current tasks                      │
│     • Session logs and handoffs                             │
│     ↓                                                        │
│  4. Start heartbeat (30s interval)                          │
│     ↓                                                        │
│  5. Poll for assignments (5s interval)                      │
│     ↓                                                        │
│  6. On assignment: LAZY LOAD task-specific context          │
│     • GET /api/v1/task/:id/criteria                         │
│     • GET /api/v1/task/:id/files                            │
│     • GET /api/v1/task/:id/patterns                         │
│     • GET /api/v1/task/:id/gotchas                          │
│     • GET /api/v1/task/:id/constraints                      │
│     ↓                                                        │
│  7. Execute, log events, verify, complete                   │
│     ↓                                                        │
│  8. Return to polling                                       │
└─────────────────────────────────────────────────────────────┘
```

**Context Loading Strategy:**

| Phase | What's Loaded | When | Why |
|-------|---------------|------|-----|
| **Startup** | Full project context | Once at initialization | Workers need project-wide patterns, ADRs, and conventions |
| **Per-Task** | Task-specific context | On each assignment | Only load what's needed for the current task |
| **Orchestrator** | Task metadata only | During assignment | Orchestrator provides WHAT to do, not HOW (context) |

**Benefits:**

1. **Decoupling:** Orchestrator doesn't need to know full context
2. **Scalability:** Workers can be added/removed without orchestrator changes
3. **Autonomy:** Workers self-sufficient, can operate independently
4. **Efficiency:** Lazy loading reduces unnecessary data transfer
5. **Consistency:** All workers use same `ginko start` context loading

**Implementation:**

```typescript
// packages/cli/src/commands/agent/work.ts
export async function workAgentCommand(options: WorkOptions) {
  // 1. Register or discover existing agent
  const agentConfig = await getOrRegisterAgent(options);

  // 2. Load full project context via ginko start
  await startCommand({ quiet: true });

  // 3. Start heartbeat
  startHeartbeat(agentConfig.agentId);

  // 4. Enter polling loop
  while (true) {
    const task = await pollForTask(agentConfig);
    if (task) {
      // 5. Lazy load task-specific context
      await loadTaskContext(task.id);

      // 6. Execute task
      await executeTask(task);
    }
  }
}
```

**Contrast with Alternatives:**

| Approach | Context Loading | Coupling | Scalability |
|----------|----------------|----------|-------------|
| **Worker Self-Loading** (chosen) | Worker calls `ginko start` | Low | High |
| Orchestrator provides context | Orchestrator sends full context | High | Low |
| Shared filesystem context | Workers read from shared FS | Medium | Medium |
| No project context | Task metadata only | None | High (but brittle) |

**Why Worker Self-Loading Wins:**

- Uses existing `ginko start` infrastructure (no new code paths)
- Workers can start/restart independently (resilient)
- Orchestrator stays simple (just task metadata + assignment)
- Natural fit with Ginko's session-based model

### Human-in-the-Loop Integration

| Trigger | Human Action | AI Continues |
|---------|--------------|--------------|
| Epic approval | Approves scope & criteria | Decomposes into tasks |
| Milestone review | Reviews sprint output | Proceeds to next sprint |
| Escalation | Resolves blocker | Resumes blocked work |
| Final acceptance | Approves deliverable | Logs achievement |
| Quality exception | Overrides failed check | Marks task complete |

Escalations are **async** - AI continues on other work while waiting.

## Alternatives Considered

### Option 1: Model-Specific Adapters

**Description:** Create adapters for each AI provider (Claude, GPT, Gemini)
**Pros:** Could optimize for model strengths
**Cons:** Maintenance burden, fragile to API changes, vendor lock-in
**Decision:** Rejected - model-agnostic HTTP is simpler and more portable

### Option 2: Message Queue Architecture (Kafka/RabbitMQ)

**Description:** Add dedicated message queue for agent communication
**Pros:** Better real-time performance, proven patterns
**Cons:** New infrastructure, operational complexity, cost
**Decision:** Rejected - polling/SSE on existing Vercel is sufficient for initial scale

### Option 3: Blockchain-Based Coordination

**Description:** Use smart contracts for task claiming and verification
**Pros:** Immutable audit trail, trustless coordination
**Cons:** Massive complexity, slow, expensive, overkill
**Decision:** Rejected - Neo4j with atomic operations is sufficient

## Consequences

### Positive Impacts

- **Parallel development:** 3x+ throughput with multiple agents
- **24/7 execution:** Agents work continuously without breaks
- **Diverse perspectives:** Cross-model teams (Claude + GPT + Gemini)
- **Human leverage:** One human can supervise multiple agent teams
- **Preserved context:** Event stream captures all agent work

### Negative Impacts

- **Complexity:** More moving parts to debug
- **Coordination overhead:** Agents need to sync, potential for conflicts
- **Quality variance:** Different models have different capabilities
- **Auth complexity:** Managing multiple agent credentials

### Neutral Impacts

- Human+AI workflow unchanged (additive features)
- API surface grows but remains coherent
- Graph schema expands with new node/relationship types

### Migration Strategy

1. **Phase 1:** Add Agent Registry (no breaking changes)
2. **Phase 2:** Add Task Claiming alongside markdown tasks
3. **Phase 3:** Add Verification API
4. **Phase 4:** Add Orchestration CLI commands
5. **Phase 5:** Add Resilience features

Existing users unaffected at each phase.

## Implementation Details

### Technical Requirements

- Neo4j AuraDB: Add Agent node type, CLAIMED_BY relationship
- Vercel: New API routes (serverless functions)
- Supabase: Agent API keys via existing auth mechanism
- CLI: New `ginko agent` command group

### Security Considerations

- Agent tokens scoped to organization/project (no cross-tenant access)
- Rate limiting on claim operations (prevent DoS)
- Heartbeat timeout releases stuck tasks (prevent deadlock)
- Audit trail via event stream (all agent actions logged)

### Performance Implications

- Task claiming: ~50ms (single Cypher query)
- Event streaming: 5-second polling interval (configurable)
- Agent heartbeat: 30-second interval
- No significant load increase for <20 concurrent agents

### Operational Impact

- New dashboard page: Agent Status (who's working on what)
- New alerts: Stale agents, claim conflicts, verification failures
- New metrics: Agent throughput, claim success rate, task duration

## Monitoring and Success Metrics

### Key Performance Indicators

| Metric | Target | Measurement |
|--------|--------|-------------|
| First-pass completion rate | 80% | Tasks completed without human intervention |
| Rework cycles | ≤2 | Human refinement iterations per deliverable |
| Time to first working version | -50% vs human | Clock time from epic to deployable |
| Context continuity | 95% | Events capture enough for seamless handoff |
| Parallel efficiency | 3x | Throughput with 4 agents vs 1 |

### Success Criteria

- Two agents can work on same project without conflicts
- Task claiming returns 409 on race condition (no double-claim)
- Agent A's event visible to Agent B within 5 seconds
- `ginko verify TASK-X` returns structured pass/fail

### Failure Criteria

- Human+AI workflow degraded by new features
- Agent coordination requires model-specific code
- New infrastructure required beyond existing stack
- Task claiming has race conditions (double-claim possible)

## Risks and Mitigations

### Technical Risks

| Risk | Impact | Probability | Mitigation |
|------|--------|-------------|------------|
| Race condition in claiming | High | Low | Atomic Cypher MERGE with constraints |
| Event stream latency | Medium | Medium | Configurable poll interval, SSE option |
| Agent credential leak | High | Low | Short-lived tokens, org-scoped access |
| Stale agent holds tasks | Medium | Medium | Heartbeat timeout auto-releases |

### Business Risks

| Risk | Impact | Probability | Mitigation |
|------|--------|-------------|------------|
| Complexity deters adoption | Medium | Medium | Keep human+AI path simple |
| Quality issues from autonomy | Medium | Medium | Verification API, human checkpoints |
| Model provider API changes | Low | High | Model-agnostic design |

## Timeline and Milestones

### Implementation Phases

- **Sprint 1:** Agent Foundation (registry, claiming)
- **Sprint 2:** Real-Time Coordination (events, status)
- **Sprint 3:** Verification & Quality (acceptance criteria)
- **Sprint 4:** Orchestration Layer (decomposition, assignment)
- **Sprint 5:** Resilience & Recovery (checkpoints, rollback)

### Key Milestones

- **After Sprint 2:** Basic multi-agent experiments possible
- **After Sprint 3:** Quality-gated autonomous work
- **After Sprint 5:** Production-ready AI-to-AI orchestration

## References

### Documentation

- [ADR-043: Event Stream Session Model](ADR-043-event-stream-session-model.md)
- [ADR-033: Context Pressure Mitigation](ADR-033-context-pressure-mitigation-strategy.md)
- [ADR-041: Write Dispatcher](ADR-041-graph-migration-write-dispatch.md)

### Code References

- Event stream: `packages/cli/src/lib/context-loader-events.ts`
- Session cursor: `packages/cli/src/lib/session-cursor.ts`
- Event queue: `packages/cli/src/lib/event-queue.ts`
- Graph API client: `packages/cli/src/commands/graph/api-client.ts`
- Sprint loader: `packages/cli/src/lib/sprint-loader.ts`
- Agent heartbeat: `packages/cli/src/lib/agent-heartbeat.ts`
- Agent work command: `packages/cli/src/commands/agent/work.ts`
- Agent client: `packages/cli/src/commands/agent/agent-client.ts`
- Start command: `packages/cli/src/commands/start/index.ts`

---

**Changelog:**

| Date | Author | Changes |
|------|--------|---------|
| 2025-12-05 | Chris Norton, Claude | Initial proposal |
| 2025-12-05 | Chris Norton, Claude | Added Worker Self-Context Loading section (EPIC-004 Sprint 1 TASK-7) |
