---
epic_id: EPIC-016
status: proposed
created: 2026-01-20
updated: 2026-01-20
roadmap_lane: next
roadmap_status: not_started
tags: [assignment, workstream, team-collaboration, flow, ux]
---

# EPIC-016: Personal Workstreams & Assignment

**Status:** Proposed
**Priority:** High
**Estimated Duration:** 4 sprints (5-6 weeks)
**Prerequisite:** EPIC-015 (Graph-Authoritative State) - Complete
**ADR:** ADR-061: Task Assignment and Work Tracking Architecture

---

## Vision

Transform ginko from a shared-view tool to a personal workstream experience where each user sees their own prioritized work, assignments are enforced to ensure traceability, and the system respects flow state by timing administrative prompts appropriately.

**North Star:** Maximize time spent in flow state.

---

## Problem Statement

### Current State

After EPIC-015, the graph is authoritative for status. However:

1. **No personal view** - `ginko start` shows the same "Active Sprint" to everyone
2. **Anonymous work** - Tasks can be started without assignment, breaking traceability
3. **No team visibility** - Can't see what others are working on
4. **Interrupting prompts** - No awareness of user's flow state when nudging

### User Stories

**As a developer**, I want to see MY assigned tasks across all sprints so I can focus on my work without noise from others.

**As a team lead**, I want to see who's working on what so I can understand capacity and prevent duplication.

**As a user in flow**, I want ginko to defer administrative prompts until natural breakpoints so my concentration isn't broken.

---

## Solution: Personal Workstreams with Flow-Aware Nudging

### Core Principles

1. **Work cannot be anonymous** - Starting work requires assignment
2. **Continue where you left off** - "Next" determined by recency
3. **Plan the work; work the plan** - Encourage tracked work over ad-hoc
4. **Flow over administration** - Time prompts to natural breakpoints

### Key Changes

| Component | Current | Target |
|-----------|---------|--------|
| `ginko start` | Shows team's active sprint | Shows user's personal workstream |
| Task start | No assignment required | Assignment required (via prompts) |
| Team view | None | `ginko team status` command |
| Nudging | Immediate | Flow-aware, deferred during deep work |

---

## Success Criteria

- [ ] `ginko start` shows only the current user's assigned tasks
- [ ] Cannot mark task as `in_progress` without assignment
- [ ] Sprint start prompts for bulk assignment of unassigned tasks
- [ ] `ginko team status` shows all team members' current work
- [ ] Ad-hoc work tracking with batch reconciliation at handoff
- [ ] No regression in `ginko start` performance (< 2s)

---

## Sprint Plan

### Sprint 1: Personal Workstream Foundation (1.5 weeks)
**Goal:** `ginko start` shows user's own work filtered by assignment

**Tasks:**
1. Add user identification (git config email / ginko login)
2. Add `assignee` field to Task nodes in graph
3. Create workstream API endpoint (`GET /api/v1/user/{email}/workstream`)
4. Refactor `ginko start` to filter by current user's assignments
5. Implement "continue where you left off" logic for Next task
6. Show unassigned count as subtle nudge
7. Integration tests for personal workstream

### Sprint 2: Assignment Enforcement (1 week)
**Goal:** Tasks require assignment before active work

**Tasks:**
1. Add assignment prompt to `ginko sprint start`
2. Add per-task assignment prompt when Next is unassigned
3. Implement `ginko assign` command enhancements
4. Add skip-to-next-assigned logic
5. Handle mixed assignments (some pre-assigned to others)
6. Update `ginko task start` to auto-assign if unassigned
7. Integration tests for assignment flows

### Sprint 3: Team Status (1 week)
**Goal:** Team visibility without personal workstream bleedover

**Tasks:**
1. Create team status API (`GET /api/v1/team/status`)
2. Implement `ginko team status` command
3. Show per-user progress and last activity
4. Show unassigned work summary
5. Add team activity to dashboard (optional)
6. Documentation updates

### Sprint 4: Flow-Aware Nudging (1.5 weeks)
**Goal:** AI partner defers prompts during deep work

**Tasks:**
1. Define flow detection heuristics in CLAUDE.md
2. Implement deferred prompt queue for ad-hoc work
3. Add batch reconciliation to handoff flow
4. Update "Track This Work" reflex with flow awareness
5. Add flow state indicators to session context
6. Integration tests for deferral behavior
7. Documentation and training

---

## Technical Architecture

### New API Endpoints

```typescript
// Personal workstream
GET /api/v1/user/{email}/workstream
Response: {
  user: { email: string, name?: string },
  sprints: [{
    id: string,
    title: string,
    epic: { id: string, title: string },
    status: 'planned' | 'active' | 'paused' | 'complete',
    tasks: {
      assigned: number,
      complete: number,
      unassigned: number
    },
    lastActivity: Date,
    nextTask: { id: string, title: string } | null
  }]
}

// Team overview
GET /api/v1/team/status
Response: {
  members: [{
    email: string,
    name?: string,
    activeSprint: { id: string, title: string } | null,
    progress: { complete: number, total: number },
    lastActivity: Date
  }],
  unassigned: [{
    sprintId: string,
    sprintTitle: string,
    taskCount: number
  }]
}

// Assignment
PATCH /api/v1/task/{taskId}/assign
Body: { assignee: string }
```

### Graph Schema Changes

```cypher
// Add assignee to Task nodes
(t:Task {
  id: string,
  title: string,
  status: string,
  assignee: string | null,  // NEW: email of assigned user
  assignedAt: datetime | null,  // NEW: when assigned
  lastActivityAt: datetime  // NEW: for "continue where you left off"
})
```

### CLI Changes

```bash
# Personal workstream (default)
ginko start
# Shows: Your Work with assigned tasks

# Team view (explicit)
ginko team status
# Shows: All team members + unassigned work

# Assignment
ginko assign <taskId> <email>
ginko assign --sprint <sprintId> --all <email>
```

---

## Risks & Mitigations

| Risk | Impact | Mitigation |
|------|--------|------------|
| User identification fails | Can't filter workstream | Fallback to git config, clear error message |
| Performance regression | Slow `ginko start` | Cache workstream, lazy load details |
| Over-nudging annoys users | Flow disruption | Conservative heuristics, easy opt-out |
| Team resistance to assignment | Adoption friction | Make bulk assignment easy, clear value prop |

---

## Dependencies

- **EPIC-015** (Complete) - Graph-authoritative status
- **ADR-061** (Accepted) - Architecture specification
- **ginko login** - User identification (may need enhancement)

---

## Out of Scope

- Role-based task routing (future: auto-assign by expertise)
- Capacity planning algorithms
- Time tracking / estimates
- Cross-project workstreams

---

## References

- ADR-061: Task Assignment and Work Tracking Architecture
- ADR-060: Content/State Separation
- ADR-048: Dynamic Adaptivity Mode Sensing
- ADR-052: Unified Entity Naming Convention
