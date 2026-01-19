# SPRINT: EPIC-015 Sprint 1 - CLI Status Commands

## Sprint Overview

**Sprint Goal**: Add CLI commands to update status directly in graph
**Duration**: 1.5 weeks
**Type**: Feature sprint
**Progress:** 100% (8/8 tasks complete)
**Prerequisite:** Sprint 0 complete (API endpoints exist)

**Success Criteria:**
- [x] `ginko task complete/start/pause/block` commands work
- [x] `ginko sprint start/complete/pause` commands work
- [x] `ginko epic start/complete/pause` commands work
- [ ] Dashboard reflects changes within 3 seconds (requires live testing)
- [x] Commands fail gracefully when offline
- [x] CLI help shows all new commands

---

## Sprint Tasks

### e015_s01_t01: `ginko task complete <taskId>` Command (3h)
**Status:** [x] Complete
**Priority:** HIGH
**Assignee:** Chris Norton

**Goal:** Implement CLI command to mark a task as complete

**Implementation:**
1. Create task status command structure
2. Implement `complete` subcommand
3. Call PATCH /api/v1/task/{id}/status with status="complete"
4. Display confirmation with task details

**Usage:**
```bash
ginko task complete e015_s01_t01
# Output: ✓ Task e015_s01_t01 marked complete
#         "Implement ginko task complete command"

# With context
ginko task complete e015_s01_t01 --note "All tests passing"
```

**Error Handling:**
- Invalid task ID → "Task not found: e015_s01_t01"
- Already complete → "Task already complete (no change)"
- Network error → Queue for retry, show warning

**Files:**
- Create: `packages/cli/src/commands/task/status.ts`
- Create: `packages/cli/src/commands/task/index.ts` (if not exists)
- Modify: `packages/cli/src/index.ts` - Register task command

**Acceptance Criteria:**
- [ ] Command updates task status in graph
- [ ] Confirmation message shows task title
- [ ] Invalid task ID shows helpful error
- [ ] Works with both full ID (e015_s01_t01) and short ID (t01 in context)

---

### e015_s01_t02: `ginko task start <taskId>` Command (2h)
**Status:** [x] Complete
**Priority:** HIGH
**Assignee:** Chris Norton

**Goal:** Implement CLI command to mark a task as in progress

**Implementation:**
1. Add `start` subcommand to task status command
2. Call PATCH /api/v1/task/{id}/status with status="in_progress"
3. Display confirmation

**Usage:**
```bash
ginko task start e015_s01_t02
# Output: ▶ Task e015_s01_t02 started
#         "Implement ginko task start command"
```

**Files:**
- Modify: `packages/cli/src/commands/task/status.ts`

**Acceptance Criteria:**
- [ ] Command updates task status to in_progress
- [ ] Confirmation shows task title
- [ ] Already in_progress shows "already in progress"

---

### e015_s01_t03: `ginko task pause <taskId>` Command (2h)
**Status:** [x] Complete
**Priority:** MEDIUM
**Assignee:** Chris Norton

**Goal:** Implement CLI command to pause a task

**Implementation:**
1. Add `pause` subcommand to task status command
2. Call PATCH /api/v1/task/{id}/status with status="not_started"
3. Display confirmation

**Usage:**
```bash
ginko task pause e015_s01_t03
# Output: ⏸ Task e015_s01_t03 paused
#         "Implement ginko task pause command"
```

**Note:** Pause returns task to "not_started" state. For true pause tracking, we'd need a separate "paused" status.

**Files:**
- Modify: `packages/cli/src/commands/task/status.ts`

**Acceptance Criteria:**
- [ ] Command updates task status to not_started
- [ ] Confirmation shows task title
- [ ] Can be re-started with `ginko task start`

---

### e015_s01_t04: `ginko task block <taskId> [reason]` Command (2h)
**Status:** [x] Complete
**Priority:** HIGH
**Assignee:** Chris Norton

**Goal:** Implement CLI command to mark a task as blocked with reason

**Implementation:**
1. Add `block` subcommand to task status command
2. Require reason argument (prompt if not provided)
3. Call PATCH /api/v1/task/{id}/status with status="blocked" and reason
4. Display confirmation with blocker reason

**Usage:**
```bash
ginko task block e015_s01_t04 "Waiting for API review"
# Output: ⊘ Task e015_s01_t04 blocked
#         Reason: Waiting for API review

# Interactive (no reason provided)
ginko task block e015_s01_t04
# Prompt: Reason for blocking: _
```

**Files:**
- Modify: `packages/cli/src/commands/task/status.ts`

**Acceptance Criteria:**
- [ ] Command requires or prompts for reason
- [ ] Reason stored with status in graph
- [ ] Confirmation shows blocker reason
- [ ] Blocked tasks show reason in `ginko start`

---

### e015_s01_t05: `ginko sprint start/complete/pause` Commands (3h)
**Status:** [x] Complete
**Priority:** HIGH
**Assignee:** Chris Norton

**Goal:** Implement CLI commands to update sprint status

**Implementation:**
1. Create sprint status command structure
2. Implement start, complete, pause subcommands
3. Call appropriate PATCH /api/v1/sprint/{id}/status endpoint
4. Display confirmation with sprint details

**Usage:**
```bash
ginko sprint start e015_s01
# Output: ▶ Sprint e015_s01 started
#         "CLI Status Commands"

ginko sprint complete e015_s01
# Output: ✓ Sprint e015_s01 complete
#         "CLI Status Commands" (6/6 tasks)

ginko sprint pause e015_s01
# Output: ⏸ Sprint e015_s01 paused
```

**Sprint Status Values:**
- `planned` → `active` (start)
- `active` → `complete` (complete)
- `active` → `paused` (pause)

**Files:**
- Create: `packages/cli/src/commands/sprint/status.ts`
- Create: `packages/cli/src/commands/sprint/index.ts` (if not exists)
- Modify: `packages/cli/src/index.ts` - Register sprint command

**Acceptance Criteria:**
- [ ] All three subcommands work
- [ ] Confirmation shows sprint title
- [ ] Invalid transitions show helpful error
- [ ] Works with sprint ID (e015_s01)

---

### e015_s01_t06: `ginko epic start/complete/pause` Commands (3h)
**Status:** [x] Complete
**Priority:** MEDIUM
**Assignee:** Chris Norton

**Goal:** Implement CLI commands to update epic status

**Implementation:**
1. Create epic status command structure
2. Implement start, complete, pause subcommands
3. Call appropriate PATCH /api/v1/epic/{id}/status endpoint
4. Display confirmation with epic details

**Usage:**
```bash
ginko epic start EPIC-015
# Output: ▶ Epic EPIC-015 started
#         "Graph-Authoritative Operational State"

ginko epic complete EPIC-015
# Output: ✓ Epic EPIC-015 complete
#         "Graph-Authoritative Operational State" (4 sprints)

ginko epic pause EPIC-015
# Output: ⏸ Epic EPIC-015 paused
```

**Epic Status Values:**
- `proposed` → `active` (start)
- `active` → `complete` (complete)
- `active` → `paused` (pause)

**Files:**
- Create: `packages/cli/src/commands/epic/status.ts`
- Create: `packages/cli/src/commands/epic/index.ts` (if not exists)
- Modify: `packages/cli/src/index.ts` - Register epic command

**Acceptance Criteria:**
- [ ] All three subcommands work
- [ ] Confirmation shows epic title
- [ ] Invalid transitions show helpful error
- [ ] Works with both EPIC-015 and e015 formats

---

### e015_s01_t07: `--cascade` Flag for Parent Updates (4h)
**Status:** [x] Complete
**Priority:** MEDIUM
**Assignee:** Chris Norton

**Goal:** Add flag to automatically update parent status when all children complete

**Implementation:**
1. Add `--cascade` flag to task complete command
2. After marking task complete, check if all sibling tasks complete
3. If all complete, prompt to mark sprint complete (or auto with --yes)
4. Same logic for sprint → epic

**Usage:**
```bash
# Complete task, check if sprint should also complete
ginko task complete e015_s01_t08 --cascade
# Output: ✓ Task e015_s01_t08 marked complete
#         All tasks in e015_s01 complete.
#         ✓ Sprint e015_s01 marked complete

# With confirmation prompt
ginko task complete e015_s01_t08 --cascade
# Output: ✓ Task e015_s01_t08 marked complete
#         All tasks in e015_s01 complete.
#         Mark sprint complete? [Y/n] _
```

**Logic:**
```typescript
async function cascadeCompletion(taskId: string) {
  const sprint = await getParentSprint(taskId);
  const tasks = await getSprintTasks(sprint.id);

  if (tasks.every(t => t.status === 'complete')) {
    // All tasks complete, offer to complete sprint
    await promptSprintCompletion(sprint);
  }
}
```

**Files:**
- Modify: `packages/cli/src/commands/task/status.ts`
- Modify: `packages/cli/src/commands/sprint/status.ts`
- Create: `packages/cli/src/lib/cascade-completion.ts`

**Acceptance Criteria:**
- [ ] --cascade flag checks parent completion
- [ ] User prompted before auto-completing parent
- [ ] --yes flag skips prompt
- [ ] Works for both task→sprint and sprint→epic

---

### e015_s01_t08: CLI Help and Documentation (2h)
**Status:** [x] Complete
**Priority:** LOW
**Assignee:** Chris Norton

**Goal:** Add help text and update documentation for all new commands

**Implementation:**
1. Add descriptive help text to all new commands
2. Update README with new command examples
3. Update CLAUDE.md with new workflow

**Help Text Example:**
```bash
ginko task --help
# Output:
# Usage: ginko task <command> [options]
#
# Commands:
#   complete <id>  Mark task as complete
#   start <id>     Mark task as in progress
#   pause <id>     Pause task (return to not started)
#   block <id>     Mark task as blocked (requires reason)
#
# Options:
#   --cascade      Auto-complete parent if all children complete
#   --yes          Skip confirmation prompts
```

**Files:**
- Modify: `packages/cli/src/commands/task/status.ts` - Add help
- Modify: `packages/cli/src/commands/sprint/status.ts` - Add help
- Modify: `packages/cli/src/commands/epic/status.ts` - Add help
- Modify: `packages/cli/README.md`
- Modify: `CLAUDE.md` - Add new commands to quick start

**Acceptance Criteria:**
- [ ] `ginko task --help` shows all subcommands
- [ ] `ginko sprint --help` shows all subcommands
- [ ] `ginko epic --help` shows all subcommands
- [ ] README updated with examples
- [ ] CLAUDE.md updated with new workflow

---

## Technical Notes

### API Client Updates

Add methods to graph API client:
```typescript
// packages/cli/src/commands/graph/api-client.ts
class GraphApiClient {
  async updateTaskStatus(taskId: string, status: TaskStatus, reason?: string): Promise<Task>;
  async updateSprintStatus(sprintId: string, status: SprintStatus): Promise<Sprint>;
  async updateEpicStatus(epicId: string, status: EpicStatus): Promise<Epic>;
}
```

### Offline Queue

Commands should work offline by queuing updates:
```typescript
// packages/cli/src/lib/offline-queue.ts
interface QueuedUpdate {
  type: 'task' | 'sprint' | 'epic';
  id: string;
  status: string;
  reason?: string;
  queued_at: string;
}

// Store in .ginko/pending-updates.json
// Process on next `ginko start` or `ginko sync`
```

### ID Resolution

Support multiple ID formats:
- Full: `e015_s01_t01`
- Short in context: `t01` (resolved using current sprint)
- Epic format: `EPIC-015` or `e015`

---

## Dependencies

- Sprint 0 complete (API endpoints)
- Existing CLI infrastructure
- Graph API client

---

## Sprint Metadata

**Epic:** EPIC-015 (Graph-Authoritative Operational State)
**Sprint ID:** e015_s01
**ADR:** ADR-060 Content/State Separation
**Started:** TBD
**Participants:** TBD
