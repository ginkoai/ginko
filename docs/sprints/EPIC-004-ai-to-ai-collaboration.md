---
epic_id: EPIC-004
status: proposed
created: 2025-12-05
updated: 2025-12-05
adr: ADR-051
---

# EPIC-004: AI-to-AI Collaboration

## Vision

Enable AI-orchestrated, AI-only delivery of long-running system development with 80% first-pass autonomy. Transform Ginko from a human+AI collaboration tool into a multi-agent orchestration platform while preserving backward compatibility.

## Goal

Extend Ginko with an Agent Coordination Layer that allows multiple AI agents (across different models and providers) to collaborate on complex development projects with minimal human intervention. Humans refine outcomes rather than review every decision.

## Success Criteria

- [ ] Agents can register with capabilities and be discovered by orchestrators
- [ ] Atomic task claiming prevents race conditions (409 on conflict)
- [ ] Cross-agent event visibility within 5 seconds
- [ ] Structured verification API for acceptance criteria
- [ ] Orchestrator can decompose epics into assigned tasks
- [ ] Graceful recovery from agent failures (checkpoint/rollback)
- [ ] Human+AI workflow unchanged (backward compatible)
- [ ] Model-agnostic design (Claude, GPT, Gemini, Grok all work)
- [ ] No new infrastructure required (runs on existing stack)

## Design Principles

### "Cheap Rework Model"
AI autonomy is high because AI rework cost is low. Optimize for velocity over perfection. Humans refine outcomes, not review every decision.

### "Model-Agnostic Coordination"
Communication via event stream and REST API, not direct model APIs. Any model that can HTTP + JSON can participate.

### "Additive, Not Replacing"
Agent registration is optional. Task claiming supplements markdown checkboxes. Human+AI pairs ignore agent features entirely.

## Scope

### In Scope

- Agent registry (node type, API, CLI commands)
- Task claiming API with atomic conflict detection
- Real-time event streaming (polling or SSE)
- Agent heartbeat and stale detection
- Blocker signaling and escalation
- Acceptance criteria schema and verification API
- Work decomposition API (epic → tasks)
- Task dependency graph and topological ordering
- Checkpoint and rollback mechanisms
- Agent status dashboard
- CLI: `ginko agent`, `ginko verify`, `ginko orchestrate`
- Orchestrator lifecycle management (exit conditions, respawn)
- Context pressure monitoring (external measurement)
- Notification hooks (Slack, Discord, Teams, webhook)

### Out of Scope

- Model-specific adapters or optimizations
- New infrastructure (Kafka, Redis, etc.)
- Direct agent-to-agent communication (all via event stream)
- Billing/metering for agent usage (future consideration)
- Agent marketplace or capability trading

## Target Users

**Primary: AI Orchestration Systems**
- Supervisor agents managing worker pools
- Autonomous development pipelines
- CI/CD systems with AI-powered stages

**Secondary: Human + Multi-AI Teams**
- One human supervising multiple AI agents
- Specialized agents for different tasks (impl, review, test)
- Cross-model diversity for better outcomes

**Preserved: Human + Single AI Pairs**
- Existing workflow unchanged
- No forced adoption of agent features
- Performance unaffected

## Orchestration Patterns

### Pattern A: Supervisor Agent
```
Orchestrator Agent
  ├── decomposes Epic → Tasks
  ├── assigns to Worker Agents by capability
  ├── monitors progress via event stream
  └── resolves conflicts, reassigns blocked work
```

### Pattern B: Peer Swarm
```
Agent Pool (equal peers)
  ├── each polls for unclaimed tasks
  ├── atomic claiming prevents conflicts
  ├── self-organize around dependencies
```

### Pattern C: Pipeline Stages
```
Planner → Implementer → Reviewer → Deployer
```

## Human-in-the-Loop Integration

| Trigger | Human Action | AI Continues |
|---------|--------------|--------------|
| Epic approval | Approves scope & criteria | Decomposes into tasks |
| Milestone review | Reviews sprint output | Proceeds to next sprint |
| Escalation | Resolves blocker | Resumes blocked work |
| Final acceptance | Approves deliverable | Logs achievement |
| Quality exception | Overrides failed check | Marks task complete |

Escalations are **async** - AI continues on other work while waiting.

## Sprint Breakdown

| Sprint | Goal | Tasks | Duration | Status |
|--------|------|-------|----------|--------|
| Sprint 1 | Agent Foundation | 8 | 2 weeks | Not Started |
| Sprint 2 | Real-Time Coordination | 8 | 2 weeks | Not Started |
| Sprint 3 | Verification & Quality | 9 | 2 weeks | Not Started |
| Sprint 4 | Orchestration Layer | 11 | 2 weeks | Not Started |
| Sprint 5 | Resilience & Recovery | 16 | 2 weeks | Not Started |

**Total: 52 tasks across 5 sprints (10 weeks)**

## Success Metrics

| Metric | Target | Measurement |
|--------|--------|-------------|
| First-pass completion rate | 80% | Tasks completed without human intervention |
| Rework cycles | ≤2 | Human refinement iterations per deliverable |
| Time to first working version | -50% vs human | Clock time from epic to deployable |
| Context continuity | 95% | Events capture enough for seamless handoff |
| Parallel efficiency | 3x | Throughput with 4 agents vs 1 |

## Risks & Mitigations

| Risk | Impact | Probability | Mitigation |
|------|--------|-------------|------------|
| Race conditions in claiming | High | Low | Atomic Cypher MERGE with constraints |
| Backward compatibility broken | High | Low | Additive-only changes, feature flags |
| Quality issues from autonomy | Medium | Medium | Verification API, human checkpoints |
| Agent coordination overhead | Medium | Medium | Efficient polling, batched operations |
| Model provider API changes | Low | High | Model-agnostic design |

## Infrastructure Requirements

**None.** All features run on existing stack:

| Component | Current | EPIC-004 Addition |
|-----------|---------|-------------------|
| Neo4j AuraDB | ✅ | + Agent nodes, CLAIMED_BY relationships |
| Vercel | ✅ | + New API routes (serverless) |
| Supabase Auth | ✅ | + Agent API keys (same mechanism) |
| CLI | ✅ | + `ginko agent` command group |

## Dependencies

- ADR-043: Event Stream Session Model (foundation)
- ADR-033: Context Pressure Mitigation (logging quality)
- ADR-041: Write Dispatcher (multi-backend writes)

## Timeline

- **After Sprint 2:** Basic multi-agent experiments possible
- **After Sprint 3:** Quality-gated autonomous work
- **After Sprint 5:** Production-ready AI-to-AI orchestration

---

## Changelog

### v1.0.0 - 2025-12-05
- Initial epic creation
- Participants: chris@watchhill.ai, Claude
