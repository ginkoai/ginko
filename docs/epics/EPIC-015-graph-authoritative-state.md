---
epic_id: EPIC-015
status: proposed
created: 2026-01-16
updated: 2026-01-16
roadmap_lane: next
roadmap_status: not_started
tags: [architecture, graph, state-management, cli, sync]
---

# EPIC-015: Graph-Authoritative Operational State

**Status:** Proposed
**Priority:** High
**Estimated Duration:** 4 sprints (6-8 weeks)
**Prerequisite:** None (standalone architectural change)
**ADR:** ADR-060: Content/State Separation

---

## Vision

Establish the graph database as the single source of truth for operational state (task/sprint/epic status, assignments, progress) while keeping git as the source of truth for content (definitions, descriptions, acceptance criteria). This eliminates the sync bugs inherent to dual-write architectures.

---

## Problem Statement

### The Bug That Triggered This

`ginko start` reported tasks as "not started" when they were actually complete:

```
Sprint: Graph Explorer v2 Sprint 1... 14%
├── 01 Refactor Nav Tree [x]
├── 02 Add Parent Link [ ]  ← Actually [x] Complete
├── 03 Show Child Cards [ ]  ← Actually [x] Complete
```

**Root cause**: Three sources of truth had diverged:
- `CURRENT-SPRINT.md` (14% complete)
- Sprint-specific file (86% complete)
- Graph database (unknown state)

### Architectural Issues

| Problem | Impact |
|---------|--------|
| Dual-write required | Every status change must update file AND graph |
| Sync must be perfect | Any failure causes state divergence |
| Delayed team visibility | Status changes require git push/pull cycle |
| High context pressure | AI must parse markdown to get status |
| No event model | Can't trigger webhooks on status changes |

---

## Solution: Content/State Separation

### What Lives Where

| Type | Home | Rationale |
|------|------|-----------|
| ADRs, Patterns, Gotchas, PRDs, Charter | **Git** | Versioned knowledge artifacts |
| Epic/Sprint/Task definitions | **Git** → synced to Graph | Content benefits from version control |
| Epic/Sprint/Task **status** | **Graph only** | Real-time operational state |
| Assignments, progress | **Graph only** | Frequently changing state |

### Architecture

```
┌─────────────────────────────────────────────────────────┐
│                        GIT                              │
│  Content: definitions, descriptions, acceptance criteria│
└────────────────────────┬────────────────────────────────┘
                         │ ginko sync (content only)
                         ↓
┌─────────────────────────────────────────────────────────┐
│                       GRAPH                             │
│  Content mirror + State (authoritative)                 │
│  Events → webhooks, notifications                       │
└─────────────────────────────────────────────────────────┘
```

---

## Sprint Breakdown

### Sprint 0: API Foundation (e015_s00)
**Goal:** Add graph API endpoints for status updates
**Duration:** 1 week

| Task | Description | Estimate |
|------|-------------|----------|
| t01 | Add `PATCH /api/v1/task/{id}/status` endpoint | 3h |
| t02 | Add `PATCH /api/v1/sprint/{id}/status` endpoint | 2h |
| t03 | Add `PATCH /api/v1/epic/{id}/status` endpoint | 2h |
| t04 | Add status change event emission (for future webhooks) | 3h |
| t05 | Add status history tracking (who changed, when) | 3h |
| t06 | API tests and documentation | 2h |

**Acceptance Criteria:**
- [ ] All status endpoints return updated node
- [ ] Status changes emit events to event log
- [ ] Status history queryable via API

---

### Sprint 1: CLI Status Commands (e015_s01)
**Goal:** Add CLI commands to update status directly in graph
**Duration:** 1.5 weeks

| Task | Description | Estimate |
|------|-------------|----------|
| t01 | Implement `ginko task complete <taskId>` | 3h |
| t02 | Implement `ginko task start <taskId>` | 2h |
| t03 | Implement `ginko task pause <taskId>` | 2h |
| t04 | Implement `ginko task block <taskId> [reason]` | 2h |
| t05 | Implement `ginko sprint start/complete/pause` | 3h |
| t06 | Implement `ginko epic start/complete/pause` | 3h |
| t07 | Add `--cascade` flag to auto-update parent status | 4h |
| t08 | CLI help and documentation | 2h |

**Acceptance Criteria:**
- [ ] All status commands update graph immediately
- [ ] Dashboard reflects changes within 3 seconds
- [ ] Commands work offline with queuing (graceful failure)

---

### Sprint 2: Graph-First Reading (e015_s02)
**Goal:** Update `ginko start` to read status from graph only
**Duration:** 1.5 weeks

| Task | Description | Estimate |
|------|-------------|----------|
| t01 | Create `GET /api/v1/sprint/active` with full task status | 3h |
| t02 | Remove status parsing from `sprint-loader.ts` | 4h |
| t03 | Update `start-reflection.ts` to use graph-only for status | 4h |
| t04 | Implement local state cache (`.ginko/state-cache.json`) | 3h |
| t05 | Add offline mode with stale indicator | 3h |
| t06 | Add queued status updates for offline changes | 4h |
| t07 | Integration tests for graph-first flow | 3h |

**Acceptance Criteria:**
- [ ] `ginko start` shows correct status from graph
- [ ] Offline mode works with cached state + stale warning
- [ ] No sprint file parsing for status

---

### Sprint 3: Migration & Cleanup (e015_s03)
**Goal:** Migrate existing data and remove legacy code
**Duration:** 1.5 weeks

| Task | Description | Estimate |
|------|-------------|----------|
| t01 | Create migration script: parse all sprint files → graph status | 4h |
| t02 | Run migration on production graph | 2h |
| t03 | Remove status fields from sprint markdown template | 2h |
| t04 | Deprecate and remove `CURRENT-SPRINT.md` concept | 3h |
| t05 | Update sprint file sync to content-only | 3h |
| t06 | Update CLAUDE.md with new workflow documentation | 2h |
| t07 | Remove legacy status comparison logic from start | 3h |
| t08 | Final integration testing | 3h |

**Acceptance Criteria:**
- [ ] All existing sprint/task status migrated to graph
- [ ] Sprint files contain content only (no status)
- [ ] `CURRENT-SPRINT.md` no longer used
- [ ] Documentation updated

---

## Success Criteria

| Metric | Target |
|--------|--------|
| Status sync bugs | 0 (eliminated by design) |
| Team visibility latency | < 3 seconds |
| `ginko start` time | No regression |
| Offline functionality | Graceful degradation with cache |

---

## Risks & Mitigations

| Risk | Mitigation |
|------|------------|
| Graph unavailability | Local cache + queued updates |
| Migration data loss | Dry-run mode + backup before migration |
| Breaking existing workflows | Feature flags for gradual rollout |
| AI confusion during transition | Clear CLAUDE.md updates |

---

## Out of Scope

- Webhook/notification system (future epic, uses events from this work)
- Bidirectional content sync (content stays git → graph only)
- Real-time collaboration (future, builds on this foundation)

---

## References

- ADR-060: Content/State Separation
- ADR-054: Dashboard to Git Sync (superseded for state)
- EPIC-011: Graph Explorer v2 (consumer of this work)
