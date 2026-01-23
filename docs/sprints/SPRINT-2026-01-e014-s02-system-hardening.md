# SPRINT: System Hardening & Reliability

## Sprint Overview

**Sprint Goal**: Fix maintenance epic linking, improve task status sync, and enhance task visibility
**Duration**: 2-3 days
**Type**: Maintenance/Hardening sprint
**Progress:** 0% (0/7 tasks complete)

**Success Criteria:**
- [ ] Maintenance sprints correctly link to Maintenance Epic
- [ ] AI task completions consistently update the graph
- [ ] ginko start displays table formatting in all environments
- [ ] Task cards show goal, approach, and acceptance criteria prominently

---

## Sprint Tasks

### e014_s02_t01: Fix Maintenance Epic Sprint Linking (2h)

**Status:** [ ] Not Started
**Priority:** HIGH
**Assignee:** TBD

**Goal:** Sprints correctly appear under Maintenance Epic in graph nav tree

**Approach:** Debug the naming/linking flow to identify why sprints aren't being associated with EPIC-014. Ensure sprints use `e{NNN}_s{NN}` format and that the CONTAINS relationship is created in Neo4j during sync.

**Acceptance Criteria:**
- [ ] Maintenance Epic shows all child sprints in Graph nav tree
- [ ] Sprint-Epic `CONTAINS` relationship exists in Neo4j
- [ ] New maintenance sprints auto-link when created with `e{NNN}_s{NN}` format
- [ ] Epic view shows correct sprint count

**Files:**
- `dashboard/src/lib/graph/api-client.ts` (getChildNodes)
- `dashboard/src/app/api/v1/sprint/sync/route.ts`
- `dashboard/src/app/api/v1/epic/sync/route.ts`

---

### e014_s02_t02: Add Task Completion Instructions to CLAUDE.md (1h)

**Status:** [ ] Not Started
**Priority:** CRITICAL
**Assignee:** TBD

**Goal:** AI consistently updates graph when completing tasks

**Approach:** Add explicit instruction to CLAUDE.md requiring AI to call `ginko task complete <id>` after finishing each task. Create AGENTS.md template for non-Claude models. Place instruction prominently in the workflow section.

**Acceptance Criteria:**
- [ ] CLAUDE.md includes explicit instruction to run `ginko task complete <id>` after finishing tasks
- [ ] Instruction placed in workflow section (not buried)
- [ ] Creates AGENTS.md template for non-Claude models
- [ ] `ginko start` shows accurate "next task" after AI completes work

**Files:**
- `CLAUDE.md`
- `AGENTS.md` (new)

---

### e014_s02_t03: Fix Table Formatting in Non-TTY Environments (2h)

**Status:** [ ] Not Started
**Priority:** HIGH
**Assignee:** TBD

**Goal:** ginko start displays box-drawing table in Claude Code terminal

**Approach:** Investigate `process.stdout.isTTY` detection in native Claude Code. Force table output regardless of TTY status, or add config flag to override. Test in both Claude Code and standard terminals.

**Acceptance Criteria:**
- [ ] `ginko start` displays box-drawing characters in Claude Code terminal
- [ ] Table renders correctly regardless of `process.stdout.isTTY` value
- [ ] No regression in regular terminal emulators
- [ ] Sprint task list visible with status indicators `[ ]` `[@]` `[x]`

**Files:**
- `packages/cli/src/lib/output-formatter.ts`
- `packages/cli/src/commands/start/start-reflection.ts`

---

### e014_s02_t04: Add Approach Field to Task Schema (2h)

**Status:** [ ] Not Started
**Priority:** MEDIUM
**Assignee:** TBD

**Goal:** Tasks include "how" alongside "what"

**Approach:** Extend task-parser.ts to extract `**Approach:**` section from sprint markdown. Update sync endpoint to persist approach field to Neo4j. Update UI schema to include approach in edit modal. AI should generate 2-3 sentence approach during sprint creation.

**Acceptance Criteria:**
- [ ] `**Approach:**` section parsed from sprint markdown
- [ ] `approach` field synced to Neo4j Task node
- [ ] Task edit modal includes approach field
- [ ] AI generates 2-3 sentence approach during sprint creation

**Files:**
- `packages/cli/src/lib/task-parser.ts`
- `dashboard/src/app/api/v1/task/sync/route.ts`
- `dashboard/src/lib/node-schemas.ts`

---

### e014_s02_t05: Move Acceptance Criteria to Task Card Body (1h)

**Status:** [ ] Not Started
**Priority:** MEDIUM
**Assignee:** TBD

**Goal:** Key task info visible without expanding Properties panel

**Approach:** Update TaskView component to display acceptance_criteria in the main card body alongside goal and approach. Render as checkbox list matching markdown format. Keep metadata (dates, IDs) in Properties panel.

**Acceptance Criteria:**
- [ ] Acceptance criteria visible in main Task card (not collapsed in Properties)
- [ ] Displays as checkbox list matching markdown format
- [ ] Goal, Approach, and Acceptance Criteria appear in logical order
- [ ] Properties panel still shows metadata (dates, IDs, etc.)

**Files:**
- `dashboard/src/components/graph/NodeView.tsx`
- `dashboard/src/components/graph/TaskView.tsx` (if separate)

---

### e014_s02_t06: Auto-Add UAT Task to Sprint Creation (2h)

**Status:** [ ] Not Started
**Priority:** MEDIUM
**Assignee:** TBD

**Goal:** Every sprint ends with explicit testing/review task

**Approach:** Modify sprint generation to append "UAT & Polish" as final task. Generate testing checklist derived from sprint tasks. Scale UAT task complexity to sprint scope (brief for small sprints, detailed for large ones).

**Acceptance Criteria:**
- [ ] Sprint generation appends "UAT & Polish" as final task
- [ ] UAT task includes testing checklist derived from sprint tasks
- [ ] UAT task scales to sprint scope (brief for small sprints)
- [ ] Can be manually removed if not needed

**Files:**
- `packages/cli/src/commands/sprint/index.ts`
- `packages/cli/src/templates/sprint-template.md` (if exists)

---

### e014_s02_t07: UAT & Polish (1h)

**Status:** [ ] Not Started
**Priority:** HIGH
**Assignee:** TBD

**Goal:** Verify all sprint tasks working correctly

**Approach:** Manually test each completed task. Verify no regressions in existing functionality. Test edge cases including empty sprints, large epics, and non-numeric IDs.

**Acceptance Criteria:**
- [ ] All tasks manually verified working
- [ ] No regressions in existing functionality
- [ ] Edge cases tested (empty sprints, large epics, non-numeric IDs)
- [ ] Maintenance Epic shows this sprint correctly (meta-validation)

**Test Plan:**
1. [ ] Create new maintenance sprint, verify it links to EPIC-014
2. [ ] Complete a task using AI, verify graph updates
3. [ ] Run `ginko start` in Claude Code, verify table formatting
4. [ ] Create sprint with approach fields, verify they sync
5. [ ] View Task in dashboard, verify acceptance criteria in main body
6. [ ] Create new sprint, verify UAT task auto-added

---

## Sprint Metadata

**Epic:** EPIC-014 (Dashboard Maintenance Q1-2026)
**Sprint ID:** e014_s02
**Started:** 2026-01-23
**Participants:** Chris Norton, Claude
