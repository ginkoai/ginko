# SPRINT: EPIC-015 Sprint 3 - Migration & Cleanup

## Sprint Overview

**Sprint Goal**: Migrate existing data and remove legacy code
**Duration**: 1.5 weeks
**Type**: Migration sprint
**Progress:** 0% (0/8 tasks complete)
**Prerequisite:** Sprint 2 complete (graph-first reading works)

**Success Criteria:**
- [ ] All existing sprint/task status migrated to graph
- [ ] Sprint files contain content only (no status checkboxes)
- [ ] CURRENT-SPRINT.md concept removed
- [ ] Sync command is content-only
- [ ] Documentation fully updated
- [ ] No legacy status comparison code remains

---

## Sprint Tasks

### e015_s03_t01: Create Migration Script (4h)
**Status:** [ ] Not Started
**Priority:** HIGH
**Assignee:** TBD

**Goal:** Script to parse all sprint files and migrate status to graph

**Implementation:**
1. Find all sprint files in `docs/sprints/`
2. Parse checkbox status for each task
3. Map to graph status values
4. Call graph API to set status
5. Generate migration report

**Status Mapping:**
```typescript
const statusMapping = {
  '[x]': 'complete',
  '[@]': 'in_progress',
  '[Z]': 'paused',      // Map to not_started
  '[ ]': 'not_started',
};
```

**Usage:**
```bash
# Dry run (no changes)
ginko migrate status --dry-run
# Output:
# Migration Plan:
# e015_s00_t01: not_started → not_started (no change)
# e015_s00_t02: not_started → not_started (no change)
# e011_s01_t01: [x] → complete
# e011_s01_t02: [x] → complete
# ...
# 47 tasks to update, 12 no change

# Execute migration
ginko migrate status
# Output:
# Migrating 47 tasks...
# ✓ e011_s01_t01 → complete
# ✓ e011_s01_t02 → complete
# ...
# Migration complete: 47 updated, 0 errors
```

**Error Handling:**
- Invalid task ID → Log warning, continue
- Graph API error → Retry 3x, then skip with warning
- Parse error → Log and continue

**Files:**
- Create: `packages/cli/src/commands/migrate/status-migration.ts`
- Create: `packages/cli/src/commands/migrate/index.ts`

**Acceptance Criteria:**
- [ ] Dry-run shows planned changes
- [ ] Execute mode updates graph
- [ ] Report generated with counts
- [ ] Errors handled gracefully
- [ ] Idempotent (safe to run twice)

---

### e015_s03_t02: Run Migration on Production Graph (2h)
**Status:** [ ] Not Started
**Priority:** HIGH
**Assignee:** TBD

**Goal:** Execute migration on production data

**Pre-Migration Checklist:**
- [ ] Backup production graph
- [ ] Run dry-run to review changes
- [ ] Schedule during low-activity period
- [ ] Notify team of migration

**Execution Steps:**
1. Run `ginko migrate status --dry-run` and review
2. Run `ginko migrate status` to execute
3. Verify via dashboard that statuses are correct
4. Run `ginko start` to confirm CLI reads correctly
5. Document any issues encountered

**Rollback Plan:**
If migration fails or produces incorrect results:
1. Restore from graph backup
2. Investigate failure cause
3. Fix migration script
4. Retry

**Files:**
- No code changes
- Create: `docs/migrations/2026-01-e015-status-migration.md` (log)

**Acceptance Criteria:**
- [ ] Dry-run completed successfully
- [ ] Migration executed without errors
- [ ] Dashboard shows correct statuses
- [ ] CLI reads correct statuses
- [ ] Migration documented

---

### e015_s03_t03: Remove Status Fields from Sprint Template (2h)
**Status:** [ ] Not Started
**Priority:** MEDIUM
**Assignee:** TBD

**Goal:** Update sprint file template to remove status checkboxes

**Current Template:**
```markdown
### e015_s03_t03: Task Title (2h)
**Status:** [ ] Not Started
**Priority:** MEDIUM

**Goal:** Description...
```

**New Template:**
```markdown
### e015_s03_t03: Task Title (2h)
**Priority:** MEDIUM

**Goal:** Description...
```

**Changes:**
1. Remove `**Status:**` line from task blocks
2. Remove success criteria checkboxes (track in graph)
3. Keep sprint progress line (computed from graph)
4. Update `ginko epic` command template generation

**Files:**
- Modify: `packages/cli/src/commands/epic/templates/sprint.ts`
- Modify: `packages/cli/src/commands/sprint/create.ts` (if exists)
- Update existing sprint files (future tasks only)

**Acceptance Criteria:**
- [ ] New sprint files have no status fields
- [ ] Template generation updated
- [ ] Existing files can be updated later

---

### e015_s03_t04: Deprecate CURRENT-SPRINT.md (3h)
**Status:** [ ] Not Started
**Priority:** HIGH
**Assignee:** TBD

**Goal:** Remove the CURRENT-SPRINT.md concept entirely

**Background:**
CURRENT-SPRINT.md was a duplicate of the active sprint file, causing sync issues. With graph-authoritative state, we no longer need it.

**Implementation:**
1. Remove CURRENT-SPRINT.md file
2. Update code that references it
3. Add migration note if file exists (warning, not error)
4. Update active sprint detection to use graph only

**Code Changes:**
```typescript
// REMOVE references to CURRENT-SPRINT.md
const CURRENT_SPRINT_PATH = 'docs/sprints/CURRENT-SPRINT.md';

// REPLACE with graph query
async function getActiveSprint() {
  return graphClient.getActiveSprint();
}
```

**Files:**
- Delete: `docs/sprints/CURRENT-SPRINT.md` (if exists)
- Modify: `packages/cli/src/lib/sprint-loader.ts`
- Modify: `packages/cli/src/commands/start/start-reflection.ts`
- Grep for "CURRENT-SPRINT" and update all references

**Acceptance Criteria:**
- [ ] CURRENT-SPRINT.md removed
- [ ] No code references CURRENT-SPRINT.md
- [ ] Active sprint determined from graph
- [ ] Clear migration path for users with existing file

---

### e015_s03_t05: Update Sync to Content-Only (3h)
**Status:** [ ] Not Started
**Priority:** HIGH
**Assignee:** TBD

**Goal:** Modify ginko sync to only sync content (not status)

**Current Behavior:**
`ginko sync` pulls both content AND status from graph to files.

**New Behavior:**
`ginko sync` only pulls content changes (titles, descriptions, acceptance criteria). Status stays in graph only.

**Implementation:**
1. Remove status field mapping in sprint-syncer
2. Keep content field mapping
3. Do not write checkbox status to files
4. Update sync output to clarify content-only

**Code Changes:**
```typescript
// sprint-syncer.ts

// REMOVE
function mapGraphStatusToCheckbox(status: string): string {
  // ...
}

// KEEP
function syncSprintContent(graphSprint: Sprint): string {
  return `
# Sprint: ${graphSprint.title}

## Tasks
${graphSprint.tasks.map(t => `
### ${t.id}: ${t.title}
**Priority:** ${t.priority}
**Goal:** ${t.description}
`).join('\n')}
`;
}
```

**Files:**
- Modify: `packages/cli/src/commands/sync/sprint-syncer.ts`
- Modify: `packages/cli/src/commands/sync/index.ts`

**Acceptance Criteria:**
- [ ] Sync updates content only
- [ ] No status checkboxes written
- [ ] Existing status in files preserved (not deleted)
- [ ] Sync output clarifies "content synced, status in graph"

---

### e015_s03_t06: Update CLAUDE.md Documentation (2h)
**Status:** [ ] Not Started
**Priority:** MEDIUM
**Assignee:** TBD

**Goal:** Update CLAUDE.md with new graph-authoritative workflow

**Sections to Update:**

1. **Quick Start** - Add status commands
```markdown
ginko task complete <id>   # Mark task complete
ginko task start <id>      # Start working on task
ginko task block <id>      # Mark task blocked
```

2. **Sprint Progress Tracking** - Remove checkbox instructions
```markdown
## Sprint Progress Tracking

Status is managed via CLI commands, not file checkboxes:
- `ginko task complete e015_s03_t06` - Complete a task
- `ginko sprint complete e015_s03` - Complete a sprint
- Progress displays in `ginko start` from graph
```

3. **Session Logging** - Update workflow
```markdown
**Before commits:**
- Mark completed tasks: `ginko task complete <id>`
- Log what was done: `ginko log "description"`
```

4. **Remove obsolete sections:**
- Checkbox syntax documentation
- CURRENT-SPRINT.md references
- Manual sprint file updates for status

**Files:**
- Modify: `CLAUDE.md`

**Acceptance Criteria:**
- [ ] New status commands documented
- [ ] Old checkbox workflow removed
- [ ] Quick start updated
- [ ] No references to CURRENT-SPRINT.md

---

### e015_s03_t07: Remove Legacy Status Comparison Logic (3h)
**Status:** [ ] Not Started
**Priority:** MEDIUM
**Assignee:** TBD

**Goal:** Remove code that compared file status vs graph status

**Background:**
Previously, code existed to:
- Detect status drift between file and graph
- Reconcile differences
- Warn about mismatches

This is no longer needed with single-source-of-truth.

**Implementation:**
1. Find all status comparison code
2. Remove reconciliation logic
3. Remove drift detection
4. Simplify to graph-only reading

**Search Patterns:**
```bash
# Find status comparison code
grep -r "status.*drift" packages/cli/
grep -r "reconcile.*status" packages/cli/
grep -r "file.*vs.*graph" packages/cli/
```

**Files:**
- Modify: Various CLI files (find via search)
- Possibly: `packages/cli/src/lib/status-reconciler.ts` (delete if exists)

**Acceptance Criteria:**
- [ ] No status comparison code remains
- [ ] No drift detection
- [ ] Cleaner, simpler status flow
- [ ] No dead code

---

### e015_s03_t08: Final Integration Testing (3h)
**Status:** [ ] Not Started
**Priority:** HIGH
**Assignee:** TBD

**Goal:** End-to-end testing of complete graph-authoritative system

**Test Scenarios:**

1. **New Sprint Creation**
   - Create epic with sprints
   - Verify status defaults to "not_started" in graph
   - Verify sprint files have no status

2. **Status Updates**
   - `ginko task start` → Graph updated
   - `ginko task complete` → Graph updated
   - Dashboard shows changes immediately
   - `ginko start` shows correct status

3. **Sync Flow**
   - Edit sprint content in dashboard
   - Run `ginko sync`
   - Content updated, no status in files

4. **Offline Flow**
   - Go offline
   - Queue status updates
   - Come back online
   - Updates sync successfully

5. **Multi-User Flow**
   - User A completes task
   - User B sees update immediately
   - No git push/pull required for status

**Regression Tests:**
- `ginko start` performance (< 2s)
- `ginko log` still works
- `ginko handoff` still works
- Sprint display correct

**Files:**
- Create: `packages/cli/src/__tests__/e2e/graph-authoritative.test.ts`

**Acceptance Criteria:**
- [ ] All test scenarios pass
- [ ] No regression in existing functionality
- [ ] Performance within targets
- [ ] Clean test output

---

## Technical Notes

### Post-Migration File State

After migration, sprint files will have this format:
```markdown
# SPRINT: e015_s03 - Migration & Cleanup

## Sprint Overview
**Sprint Goal**: Migrate existing data...
**Duration**: 1.5 weeks
**Type**: Migration sprint

## Sprint Tasks

### e015_s03_t01: Create Migration Script (4h)
**Priority:** HIGH

**Goal:** Script to parse all sprint files...

**Files:**
- Create: `packages/cli/src/commands/migrate/status-migration.ts`

**Acceptance Criteria:**
- Dry-run shows planned changes
- Execute mode updates graph
```

Note: No `**Status:**` line, no checkboxes.

### Backwards Compatibility

Sprint files with old checkbox format will still be valid:
- Checkboxes are simply ignored
- Content is read normally
- No errors or warnings

### Documentation Updates

All team members should be notified:
1. Email/Slack announcement
2. CLAUDE.md changes highlighted
3. Brief demo of new commands

---

## Dependencies

- Sprint 2 complete (graph-first reading)
- Migration script tested
- Team notification sent

---

## Sprint Metadata

**Epic:** EPIC-015 (Graph-Authoritative Operational State)
**Sprint ID:** e015_s03
**ADR:** ADR-060 Content/State Separation
**Started:** TBD
**Participants:** TBD
