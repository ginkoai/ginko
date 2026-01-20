# SPRINT: EPIC-016 Sprint 2 - Assignment Enforcement

## Sprint Overview

**Sprint Goal**: Ensure tasks require assignment before active work begins
**Duration**: 1 week
**Type**: Feature sprint
**Progress:** 0% (0/7 tasks complete)
**Prerequisite:** Sprint 1 complete (personal workstream displays)

**Success Criteria:**
- [ ] Sprint start prompts for bulk assignment
- [ ] Unassigned "Next" task prompts for assignment
- [ ] `ginko task start` auto-assigns if unassigned
- [ ] Skip-to-next-assigned logic works
- [ ] Mixed assignment scenarios handled

---

## Sprint Tasks

### e016_s02_t01: Sprint Start Assignment Prompt (3h)
**Priority:** HIGH

**Goal:** Prompt user to claim unassigned tasks when starting a sprint

**Flow:**
```
User: ginko sprint start e016_s01

ginko: Starting sprint e016_s01 - Personal Workstream Foundation

       This sprint has 7 unassigned tasks.
       Assign all to you? [Y/n]

User: Y

ginko: ✓ Assigned 7 tasks to chris@watchhill.ai
       ✓ Sprint e016_s01 is now active

       Next: e016_s01_t01 - User Identification
```

**Implementation:**
1. Check unassigned count before starting sprint
2. Prompt if unassigned > 0
3. Bulk assign on confirmation
4. Continue with sprint start

**Files:**
- Modify: `packages/cli/src/commands/sprint/status.ts`
- Use: `packages/cli/src/commands/graph/api-client.ts` (assign endpoint)

**Acceptance Criteria:**
- Prompts when sprint has unassigned tasks
- Bulk assigns on Y
- Proceeds without assignment on n
- Shows confirmation with count

---

### e016_s02_t02: Per-Task Assignment Prompt (2h)
**Priority:** HIGH

**Goal:** Prompt for assignment when "Next" task is unassigned

**Flow:**
```
ginko start

ginko: Your Work
       ├─ EPIC-016 Sprint 1    0/7 yours, 7 unassigned
       │  └─ Next: e016_s01_t01 - User Identification (unassigned)

       Assign e016_s01_t01 to you? [Y/n]

User: Y

ginko: ✓ Assigned e016_s01_t01 to chris@watchhill.ai
```

**Implementation:**
1. Check if nextTask.assignee is null
2. Prompt before displaying
3. Assign on confirmation
4. Re-fetch workstream to update display

**Files:**
- Modify: `packages/cli/src/commands/start/start-reflection.ts`

**Acceptance Criteria:**
- Prompts only when Next is unassigned
- Assigns on Y
- Shows updated workstream after assignment
- Skips prompt if Next is already assigned

---

### e016_s02_t03: Skip-to-Next-Assigned Logic (2h)
**Priority:** MEDIUM

**Goal:** When user declines assignment, skip to next assigned task

**Flow:**
```
ginko: Next: e016_s01_t01 - User Identification (unassigned)
       Assign to you? [Y/n]

User: n

ginko: Skipping unassigned tasks...
       Next: e016_s01_t04 - Refactor ginko start (assigned to you)
```

**Implementation:**
1. Filter workstream for assigned tasks only
2. Find next assigned task by recency
3. Display skip message
4. Handle case where no assigned tasks exist

**Files:**
- Modify: `packages/cli/src/lib/workstream-logic.ts`
- Modify: `packages/cli/src/commands/start/start-reflection.ts`

**Acceptance Criteria:**
- Skips to next assigned task on decline
- Clear message about skipping
- Handles no-assigned-tasks gracefully
- Preserves recency ordering

---

### e016_s02_t04: Mixed Assignment Handling (2h)
**Priority:** MEDIUM

**Goal:** Handle sprints where some tasks are pre-assigned to others

**Flow:**
```
User: ginko sprint start e016_s01

ginko: Starting sprint e016_s01 - Personal Workstream Foundation

       Task assignments:
       • 3 tasks assigned to alice@company.com
       • 4 tasks unassigned

       Assign the 4 unassigned tasks to you? [Y/n]
```

**Implementation:**
1. Group tasks by assignee
2. Display existing assignments
3. Only offer to assign unassigned tasks
4. Preserve existing assignments

**Files:**
- Modify: `packages/cli/src/commands/sprint/status.ts`

**Acceptance Criteria:**
- Shows existing assignment breakdown
- Only offers unassigned tasks
- Preserves other users' assignments
- Clear display of who owns what

---

### e016_s02_t05: Auto-Assign on Task Start (2h)
**Priority:** HIGH

**Goal:** `ginko task start` auto-assigns to current user if unassigned

**Flow:**
```
User: ginko task start e016_s01_t01

ginko: Task e016_s01_t01 is unassigned.
       Assigning to chris@watchhill.ai...
       ✓ Task e016_s01_t01 is now in progress
```

**Implementation:**
1. Check assignee before status change
2. If null, assign to current user
3. Then proceed with status change
4. Single transaction (assign + start)

**Files:**
- Modify: `packages/cli/src/commands/task/status.ts`

**Acceptance Criteria:**
- Auto-assigns on task start
- Shows assignment message
- Works in single operation
- Updates lastActivityAt

---

### e016_s02_t06: Assign Command Enhancements (2h)
**Priority:** MEDIUM

**Goal:** Improve `ginko assign` for common workflows

**Enhancements:**
```bash
# Assign to self (no email needed)
ginko assign e016_s01_t01 --me

# Reassign (override existing)
ginko assign e016_s01_t01 alice@company.com --force

# Unassign
ginko assign e016_s01_t01 --none
```

**Files:**
- Modify: `packages/cli/src/commands/assign.ts`

**Acceptance Criteria:**
- `--me` assigns to current user
- `--force` allows reassignment
- `--none` clears assignment
- Clear confirmation messages

---

### e016_s02_t07: Integration Tests (2h)
**Priority:** MEDIUM

**Goal:** Test all assignment prompt flows

**Test Scenarios:**
1. Sprint start with all unassigned → bulk assign
2. Sprint start with mixed assignments → partial assign
3. Sprint start with all assigned → no prompt
4. Next task unassigned → single assign prompt
5. Decline assignment → skip to assigned
6. Auto-assign on task start
7. Assign command variants

**Files:**
- Create: `packages/cli/src/__tests__/assignment-prompts.test.ts`

**Acceptance Criteria:**
- All flows covered
- Edge cases tested
- Mock user input for prompts

---

## Technical Notes

### Prompt UX

- Use simple Y/n prompts (Y is default)
- Show counts clearly
- Provide escape hatch (n to skip)
- Never block; always allow progress

### Transaction Safety

- Assign + status change should be atomic where possible
- If assign fails, don't change status
- Clear error messages on failure

---

## Dependencies

- Sprint 1 complete (workstream API, user identification)
- Assignment API endpoint working

---

## Next Sprint

Sprint 3: Team Status - visibility into team's work without personal bleedover.
