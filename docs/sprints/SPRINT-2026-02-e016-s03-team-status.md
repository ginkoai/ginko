# SPRINT: EPIC-016 Sprint 3 - Team Status

## Sprint Overview

**Sprint Goal**: Provide team visibility without polluting personal workstream
**Duration**: 1 week
**Type**: Feature sprint
**Progress:** 0% (0/6 tasks complete)
**Prerequisite:** Sprint 2 complete (assignment enforcement)

**Success Criteria:**
- [ ] `ginko team status` shows all team members' work
- [ ] Per-user progress and last activity displayed
- [ ] Unassigned work summary shown
- [ ] Dashboard team view (optional stretch)
- [ ] No performance issues with large teams

---

## Sprint Tasks

### e016_s03_t01: Team Status API Endpoint (3h)
**Priority:** HIGH

**Goal:** Create API to fetch team-wide work status

**Endpoint:**
```
GET /api/v1/team/status
```

**Response:**
```typescript
{
  members: [{
    email: string,
    name?: string,
    activeSprint: {
      id: string,
      title: string,
      epic: { id: string, title: string }
    } | null,
    progress: {
      complete: number,
      total: number,
      inProgress: number
    },
    lastActivity: Date | null
  }],
  unassigned: [{
    sprintId: string,
    sprintTitle: string,
    epicTitle: string,
    taskCount: number
  }],
  summary: {
    totalMembers: number,
    activeMembers: number,  // activity in last 24h
    totalUnassigned: number
  }
}
```

**Query Logic:**
1. Find all unique assignees from Task nodes
2. For each assignee, find their most active sprint
3. Calculate progress (complete/total) per user
4. Find all sprints with unassigned tasks
5. Compute summary statistics

**Files:**
- Create: `dashboard/src/app/api/v1/team/status/route.ts`

**Acceptance Criteria:**
- Returns all users with assignments
- Shows most active sprint per user
- Lists unassigned work by sprint
- Handles empty team gracefully

---

### e016_s03_t02: ginko team status Command (3h)
**Priority:** HIGH

**Goal:** CLI command to display team work status

**Output:**
```
┌─────────────────────────────────────────────────────────────────────────┐
│  Team Status                                                            │
├─────────────────────────────────────────────────────────────────────────┤
│  chris@watchhill.ai                                                     │
│  └─ EPIC-016 Sprint 1      3/7 ████░░░░ 43%    active 30m ago          │
│                                                                         │
│  alice@company.com                                                      │
│  └─ EPIC-015 Sprint 3      2/8 ██░░░░░░ 25%    active 2h ago           │
│                                                                         │
│  bob@company.com                                                        │
│  └─ (no active work)                           last seen 3d ago        │
├─────────────────────────────────────────────────────────────────────────┤
│  Unassigned Work                                                        │
│  └─ EPIC-011 Sprint 2      5 tasks            needs owner              │
│  └─ EPIC-009 Sprint 4      8 tasks            needs owner              │
├─────────────────────────────────────────────────────────────────────────┤
│  Summary: 3 members │ 2 active today │ 13 unassigned tasks             │
└─────────────────────────────────────────────────────────────────────────┘
```

**Implementation:**
1. Call team status API
2. Format members with progress bars
3. Show relative time for last activity
4. List unassigned work
5. Display summary line

**Files:**
- Create: `packages/cli/src/commands/team/status.ts`
- Create: `packages/cli/src/commands/team/index.ts`

**Acceptance Criteria:**
- Clear, scannable display
- Progress bars for visual status
- Relative time (30m ago, 2h ago, 3d ago)
- Summary statistics at bottom

---

### e016_s03_t03: Last Activity Tracking (2h)
**Priority:** MEDIUM

**Goal:** Track when each user was last active

**Implementation:**
1. Update `lastActivityAt` on task status changes
2. Track at user level (most recent across all tasks)
3. Store in graph (could be User node or computed)

**Activity Events:**
- Task started
- Task completed
- Task blocked
- Session started (ginko start)

**Files:**
- Modify: `dashboard/src/app/api/v1/task/[taskId]/status/route.ts`
- Modify: `packages/cli/src/commands/start/start-reflection.ts`

**Acceptance Criteria:**
- lastActivityAt updated on status changes
- Queryable per user
- Handles users with no activity

---

### e016_s03_t04: Unassigned Work Summary (2h)
**Priority:** MEDIUM

**Goal:** Aggregate unassigned tasks by sprint for team visibility

**Query:**
```cypher
MATCH (t:Task)-[:BELONGS_TO]->(s:Sprint)-[:BELONGS_TO]->(e:Epic)
WHERE t.assignee IS NULL AND t.status <> 'complete'
RETURN s.id, s.title, e.title, count(t) as taskCount
ORDER BY taskCount DESC
```

**Display:**
- Group by sprint
- Show epic context
- Sort by count (most unassigned first)
- "needs owner" indicator

**Files:**
- Part of: `dashboard/src/app/api/v1/team/status/route.ts`

**Acceptance Criteria:**
- Accurate count of unassigned
- Grouped by sprint
- Epic context included
- Sorted by urgency (count)

---

### e016_s03_t05: Team Command Help & Docs (1h)
**Priority:** LOW

**Goal:** Documentation and help text for team commands

**Help Output:**
```
Usage: ginko team [command]

Team visibility commands

Commands:
  status    Show team work status and unassigned tasks

Examples:
  ginko team status    View all team members' current work
```

**Documentation:**
- Update CLAUDE.md with team commands
- Add to ginko --help
- Example workflows

**Files:**
- Modify: `CLAUDE.md`
- Modify: `packages/cli/src/commands/team/index.ts`

**Acceptance Criteria:**
- Clear help text
- Examples included
- CLAUDE.md updated

---

### e016_s03_t06: Integration Tests (2h)
**Priority:** MEDIUM

**Goal:** Test team status flows

**Test Scenarios:**
1. Team with multiple active members
2. Team with inactive members
3. Large unassigned backlog
4. Empty team (no assignments anywhere)
5. Single user (solo mode)
6. API performance with many users

**Files:**
- Create: `packages/cli/src/__tests__/team-status.test.ts`
- Create: `dashboard/src/app/api/v1/team/__tests__/status.test.ts`

**Acceptance Criteria:**
- All scenarios covered
- Performance acceptable (< 3s for 20 users)
- Edge cases handled

---

## Technical Notes

### Performance Considerations

- Cache team status (refresh every 5 minutes)
- Limit historical activity query to 30 days
- Paginate if team > 50 members

### Privacy Considerations

- Only show work-related info (no personal data)
- Activity is work activity, not surveillance
- Consider opt-out for sensitive projects

---

## Dependencies

- Sprint 2 complete (assignments working)
- User activity events logged

---

## Next Sprint

Sprint 4: Flow-Aware Nudging - defer prompts during deep work, batch at natural breakpoints.
