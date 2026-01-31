# SPRINT: Cleanup + WriteDispatcher Retirement

## Sprint Overview

**Sprint ID:** `e017_s05`
**Sprint Goal**: Remove broken code paths, mark ADR-077 Accepted, full regression test
**Priority Lane**: Now
**Status**: Not Started
**Type**: Cleanup
**Progress:** 0% (0/7 tasks complete)

**ADR:** ADR-077: Git-Integrated Push/Pull Sync Architecture
**Prerequisites:** e017_s03 (Auto-Push), e017_s04 (Deprecation)

**Success Criteria:**
- [ ] WriteDispatcher module deprecated with warnings
- [ ] GraphAdapter and LocalAdapter deprecated
- [ ] EventQueue and DLQ deprecated
- [ ] EventQueue removed from handoff
- [ ] Dispatcher-logger cleaned up
- [ ] ADR-077 status updated to Accepted
- [ ] Full regression test passes

---

## Sprint Tasks

### e017_s05_t01: Deprecate WriteDispatcher module
**Priority:** HIGH
**Estimate:** 1h
**Status:** [ ]
**Files:** `packages/cli/src/lib/write-dispatcher/write-dispatcher.ts`

Add `@deprecated` tags and runtime deprecation warnings if invoked.

---

### e017_s05_t02: Deprecate GraphAdapter + LocalAdapter
**Priority:** HIGH
**Estimate:** 30m
**Status:** [ ]
**Files:** `packages/cli/src/lib/write-dispatcher/adapters/graph-adapter.ts`, `local-adapter.ts`

---

### e017_s05_t03: Deprecate EventQueue + DLQ modules
**Priority:** HIGH
**Estimate:** 30m
**Status:** [ ]
**Files:** `packages/cli/src/lib/event-queue.ts`, `packages/cli/src/lib/dead-letter-queue.ts`

---

### e017_s05_t04: Remove EventQueue usage from handoff
**Priority:** HIGH
**Estimate:** 1h
**Status:** [ ]
**Files:** `packages/cli/src/commands/handoff.ts`

Replaced by auto-push in Sprint 3.

---

### e017_s05_t05: Remove dispatcher initialization from dispatcher-logger
**Priority:** MEDIUM
**Estimate:** 30m
**Status:** [ ]
**Files:** `packages/cli/src/utils/dispatcher-logger.ts`

---

### e017_s05_t06: Update ADR-077 status: Proposed → Accepted
**Priority:** MEDIUM
**Estimate:** 15m
**Status:** [ ]
**Files:** `docs/adr/ADR-077-git-integrated-push-pull-sync.md`

---

### e017_s05_t07: Full regression test
**Priority:** CRITICAL
**Estimate:** 3h
**Status:** [ ]

Verify push, pull, status, diff, auto-push, deprecation warnings, skills.
Test against UAT Round 2 cases to confirm all 6 bugs resolved.
