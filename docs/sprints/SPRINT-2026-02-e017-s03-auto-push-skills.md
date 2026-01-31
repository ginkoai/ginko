# SPRINT: Auto-Push via Orchestrator + Skills

## Sprint Overview

**Sprint ID:** `e017_s03`
**Sprint Goal**: Orchestrator dispatches push to subagent after workflow events. Non-blocking. Fixes status persistence.
**Priority Lane**: Now
**Status**: Not Started
**Type**: Feature
**Progress:** 0% (0/8 tasks complete)

**ADR:** ADR-077: Git-Integrated Push/Pull Sync Architecture
**Prerequisite:** e017_s01 (Core Push)

**Success Criteria:**
- [ ] Auto-push utility triggers non-blocking push after operations
- [ ] Task status commands auto-push after changes
- [ ] Sprint/epic/charter creation auto-pushes
- [ ] Handoff command pushes all uncommitted changes
- [ ] `GINKO_AUTO_PUSH=false` disables auto-push
- [ ] Tests pass and build clean

---

## Sprint Tasks

### e017_s03_t01: Create auto-push utility
**Priority:** CRITICAL
**Estimate:** 2h
**Status:** [ ]
**Files:** `packages/cli/src/lib/auto-push.ts`

Non-blocking push via skill dispatch. Respects `GINKO_AUTO_PUSH=false` env var.

**Acceptance Criteria:**
- [ ] `autoPush()` triggers push in background (non-blocking)
- [ ] Respects GINKO_AUTO_PUSH=false to disable
- [ ] Handles errors gracefully (log warning, don't block caller)
- [ ] Supports targeted push (entity type + optional ID)

---

### e017_s03_t02: Add auto-push to task status commands
**Priority:** CRITICAL
**Estimate:** 1h
**Status:** [ ]
**Files:** `packages/cli/src/commands/task/status.ts`

Auto-push after complete, start, block, and pause operations.

**Acceptance Criteria:**
- [ ] `ginko task complete` triggers auto-push
- [ ] `ginko task start` triggers auto-push
- [ ] `ginko task block` triggers auto-push
- [ ] `ginko task pause` triggers auto-push

---

### e017_s03_t03: Add auto-push to sprint commands
**Priority:** HIGH
**Estimate:** 1h
**Status:** [ ]
**Files:** `packages/cli/src/commands/sprint/create.ts`

**Acceptance Criteria:**
- [ ] Sprint creation triggers auto-push
- [ ] Sprint completion triggers auto-push

---

### e017_s03_t04: Add auto-push to epic commands
**Priority:** HIGH
**Estimate:** 1h
**Status:** [ ]
**Files:** `packages/cli/src/commands/epic.ts`

**Acceptance Criteria:**
- [ ] Epic creation triggers auto-push
- [ ] Epic status changes trigger auto-push

---

### e017_s03_t05: Add auto-push to charter creation
**Priority:** MEDIUM
**Estimate:** 30m
**Status:** [ ]
**Files:** `packages/cli/src/commands/charter.ts`

**Acceptance Criteria:**
- [ ] Charter creation triggers auto-push

---

### e017_s03_t06: Add push-all to handoff command
**Priority:** HIGH
**Estimate:** 1h
**Status:** [ ]
**Files:** `packages/cli/src/commands/handoff.ts`

Replace broken EventQueue flush with push-all.

**Acceptance Criteria:**
- [ ] Handoff runs `ginko push` for all uncommitted changes
- [ ] Events included in handoff push

---

### e017_s03_t07: Define auto-push skill for orchestrator
**Priority:** MEDIUM
**Estimate:** 30m
**Status:** [ ]
**Files:** `.claude/skills/push.md`

**Acceptance Criteria:**
- [ ] Auto-push section added to push skill
- [ ] Describes when orchestrator should dispatch push subagent

---

### e017_s03_t08: Tests for auto-push integration points
**Priority:** HIGH
**Estimate:** 2h
**Status:** [ ]
**Files:** `packages/cli/src/lib/__tests__/auto-push.test.ts`

**Acceptance Criteria:**
- [ ] Auto-push utility tests
- [ ] Integration tests for task status auto-push
- [ ] Build passes clean

---

## Bug Fixes in This Sprint

- **BUG-005** (entity creation doesn't auto-sync): Auto-push after epic/charter creation
- **BUG-010** (status changes don't persist): Auto-push after task/sprint status changes
- **BUG-011** (event sync broken): Replaced by auto-push through working API path
