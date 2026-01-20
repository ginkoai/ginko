# SPRINT: EPIC-016 Sprint 1 - Personal Workstream Foundation

## Sprint Overview

**Sprint Goal**: Transform `ginko start` to show user's personal workstream filtered by assignment
**Duration**: 1.5 weeks
**Type**: Feature sprint
**Progress:** 0% (0/7 tasks complete)
**Prerequisite:** EPIC-015 complete (graph-authoritative status)

**Success Criteria:**
- [ ] User identified automatically (git config or ginko login)
- [ ] `ginko start` shows only user's assigned tasks
- [ ] "Next" determined by most recent activity
- [ ] Unassigned count shown as subtle nudge
- [ ] No performance regression (< 2s startup)

---

## Sprint Tasks

### e016_s01_t01: User Identification (2h)
**Priority:** HIGH

**Goal:** Reliably identify current user for workstream filtering

**Implementation:**
1. Check `ginko login` stored credentials first
2. Fallback to `git config user.email`
3. Cache user identity in session
4. Clear error if neither available

**API:**
```typescript
// packages/cli/src/lib/user-identity.ts
export async function getCurrentUser(): Promise<{ email: string; name?: string } | null>
```

**Files:**
- Create: `packages/cli/src/lib/user-identity.ts`
- Modify: `packages/cli/src/commands/start/start-reflection.ts`

**Acceptance Criteria:**
- Returns email from ginko login if available
- Falls back to git config user.email
- Returns null with clear message if neither found
- Cached for session duration

---

### e016_s01_t02: Add Assignee Field to Task Nodes (2h)
**Priority:** HIGH

**Goal:** Extend Task node schema to include assignment information

**Schema Changes:**
```cypher
(t:Task {
  // existing fields...
  assignee: string | null,
  assignedAt: datetime | null,
  lastActivityAt: datetime
})
```

**Implementation:**
1. Update Task node creation to include assignee fields
2. Add migration for existing Task nodes (set assignee = null)
3. Update task sync to preserve assignee
4. Update status change to update lastActivityAt

**Files:**
- Modify: `dashboard/src/app/api/v1/task/sync/route.ts`
- Modify: `dashboard/src/app/api/v1/task/[taskId]/status/route.ts`
- Modify: `packages/cli/src/lib/task-graph-sync.ts`

**Acceptance Criteria:**
- New tasks created with assignee field
- Existing tasks have assignee = null
- Status changes update lastActivityAt
- Assignment preserved through sync

---

### e016_s01_t03: Workstream API Endpoint (3h)
**Priority:** HIGH

**Goal:** Create API to fetch user's personal workstream

**Endpoint:**
```
GET /api/v1/user/{email}/workstream
```

**Response:**
```typescript
{
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
    lastActivity: Date | null,
    nextTask: { id: string, title: string, status: string } | null
  }]
}
```

**Query Logic:**
1. Find all Tasks where assignee = {email}
2. Group by Sprint
3. For each sprint, calculate assigned/complete/unassigned counts
4. Determine nextTask by lastActivityAt (most recent first)
5. Include sprints with unassigned tasks user might claim

**Files:**
- Create: `dashboard/src/app/api/v1/user/[email]/workstream/route.ts`

**Acceptance Criteria:**
- Returns sprints where user has assignments
- Includes task counts (assigned, complete, unassigned)
- nextTask determined by recency
- Handles user with no assignments gracefully

---

### e016_s01_t04: Refactor ginko start for Personal View (4h)
**Priority:** HIGH

**Goal:** Display user's personal workstream instead of team's active sprint

**Current Output:**
```
Sprint: Active Sprint 0% 1/6
├── 01 Task A [ ]
├── 02 Task B [ ]
...
```

**New Output:**
```
┌─────────────────────────────────────────────────────────────────────────┐
│  ginko                                                                  │
├─────────────────────────────────────────────────────────────────────────┤
│  Ready │ Hot (10/10) │ Think & Build                                    │
│  User: chris@watchhill.ai                                               │
├─────────────────────────────────────────────────────────────────────────┤
│  Your Work                                                              │
│  ├─ EPIC-016 Sprint 1 (Personal Workstream)    0/7 tasks, 0 unassigned │
│  │  └─ Next: e016_s01_t01 - User Identification                        │
│  └─ EPIC-015 Sprint 3 (Migration)              0/8 tasks, 8 unassigned │
├─────────────────────────────────────────────────────────────────────────┤
│  Branch: main (clean)                                                   │
└─────────────────────────────────────────────────────────────────────────┘
```

**Implementation:**
1. Call workstream API instead of active sprint API
2. Render multi-sprint view grouped by epic
3. Show "Next" from most recently active sprint
4. Show unassigned count per sprint

**Files:**
- Modify: `packages/cli/src/commands/start/start-reflection.ts`
- Modify: `packages/cli/src/commands/start/formatters.ts` (if exists)

**Acceptance Criteria:**
- Shows "Your Work" header with user email
- Lists all sprints where user has work
- "Next" is from most recently active sprint
- Unassigned count shown per sprint
- Graceful handling when user has no assignments

---

### e016_s01_t05: Continue Where You Left Off Logic (2h)
**Priority:** MEDIUM

**Goal:** Determine "Next" task based on recency, not sprint order

**Logic:**
```typescript
function determineNextTask(workstream: Workstream): Task | null {
  // 1. Find most recently active sprint (by lastActivityAt)
  // 2. Within that sprint, find first incomplete assigned task
  // 3. If all complete in that sprint, move to next most recent
  // 4. Return null if all assigned work complete
}
```

**Edge Cases:**
- User has no recent activity → use sprint priority
- All tasks in recent sprint complete → move to next sprint
- User has no assignments → return null with message

**Files:**
- Create: `packages/cli/src/lib/workstream-logic.ts`
- Modify: `packages/cli/src/commands/start/start-reflection.ts`

**Acceptance Criteria:**
- Next task is from most recently worked sprint
- Falls back to sprint order if no recent activity
- Handles all-complete gracefully
- Updates lastActivityAt on task start/complete

---

### e016_s01_t06: Unassigned Count Display (1h)
**Priority:** LOW

**Goal:** Show unassigned task count as subtle nudge to claim work

**Display:**
```
├─ EPIC-016 Sprint 1    3/7 yours, 4 unassigned
```

**Implementation:**
1. Include unassigned count in workstream API response
2. Display in sprint line if > 0
3. Subtle formatting (not alarming)

**Files:**
- Modify: `packages/cli/src/commands/start/start-reflection.ts`

**Acceptance Criteria:**
- Shows unassigned count when > 0
- Hidden when 0 (clean display)
- Subtle visual treatment

---

### e016_s01_t07: Integration Tests (2h)
**Priority:** MEDIUM

**Goal:** Comprehensive tests for personal workstream flow

**Test Scenarios:**
1. User with assignments in multiple sprints
2. User with no assignments (empty workstream)
3. User identification fallback (ginko login → git config)
4. "Next" determination by recency
5. Unassigned count display
6. Performance (< 2s with cache)

**Files:**
- Create: `packages/cli/src/__tests__/workstream.test.ts`
- Create: `dashboard/src/app/api/v1/user/__tests__/workstream.test.ts`

**Acceptance Criteria:**
- All scenarios covered
- Performance benchmark included
- Mocked API for offline testing

---

## Technical Notes

### Performance Considerations

- Cache workstream response in state cache (same as Sprint 2 status cache)
- Lazy load task details only when needed
- Target: < 2s for `ginko start` including workstream fetch

### Backwards Compatibility

- If user identification fails, fall back to current behavior (show active sprint)
- Log warning suggesting `ginko login` setup

---

## Dependencies

- EPIC-015 Sprint 2 complete (graph-first reading)
- User email available via git config or ginko login

---

## Next Sprint

Sprint 2: Assignment Enforcement - prompts to ensure work is assigned before starting.
