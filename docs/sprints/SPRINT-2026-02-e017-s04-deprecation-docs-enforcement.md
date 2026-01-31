# SPRINT: Deprecation + Documentation + Behavioral Enforcement

## Sprint Overview

**Sprint ID:** `e017_s04`
**Sprint Goal**: Deprecate old commands, update AI instructions with graph-first protocol, add output reinforcement
**Priority Lane**: Now
**Status**: Not Started
**Type**: Feature + Documentation
**Progress:** 0% (0/10 tasks complete)

**ADR:** ADR-077: Git-Integrated Push/Pull Sync Architecture
**Prerequisites:** e017_s01 (Push), e017_s02 (Pull)

**Success Criteria:**
- [ ] Old commands warn and delegate to push/pull
- [ ] AI instructions template enforces graph-first protocol
- [ ] Project CLAUDE.md updated with push/pull commands
- [ ] Ginko skill acts as behavioral anchor
- [ ] Push/pull output includes reinforcement hints
- [ ] Optional git hooks installable

---

## Sprint Tasks

### e017_s04_t01: Deprecate `ginko sync` → delegates to `ginko pull`
**Priority:** HIGH
**Estimate:** 1h
**Status:** [ ]
**Files:** `packages/cli/src/commands/sync/index.ts`

**Acceptance Criteria:**
- [ ] `ginko sync` prints deprecation warning
- [ ] Delegates to `ginko pull` logic
- [ ] Warning suggests `ginko pull` as replacement

---

### e017_s04_t02: Deprecate `ginko graph load` → delegates to `ginko push`
**Priority:** HIGH
**Estimate:** 1h
**Status:** [ ]
**Files:** `packages/cli/src/commands/graph/load.ts`

**Acceptance Criteria:**
- [ ] `ginko graph load` prints deprecation warning
- [ ] Delegates to `ginko push --all` logic
- [ ] Warning suggests `ginko push` as replacement

---

### e017_s04_t03: Deprecate `--sync` flags on epic/charter
**Priority:** MEDIUM
**Estimate:** 1h
**Status:** [ ]
**Files:** `packages/cli/src/commands/epic/index.ts`, `packages/cli/src/commands/charter.ts`

**Acceptance Criteria:**
- [ ] `ginko epic --sync` prints deprecation warning, delegates to push
- [ ] `ginko charter --sync` prints deprecation warning, delegates to push
- [ ] Warning suggests `ginko push epic` / `ginko push charter`

---

### e017_s04_t04: Update AI instructions template with graph-first protocol
**Priority:** CRITICAL
**Estimate:** 2h
**Status:** [ ]
**Files:** `packages/cli/src/templates/ai-instructions-template.ts`

Add sections: Context Retrieval Protocol, Sync Protocol, Anti-Patterns, Push/Pull Quick Reference.

**Acceptance Criteria:**
- [ ] Graph query hierarchy documented (graph → local → full scan)
- [ ] Push/pull as canonical sync commands
- [ ] Anti-patterns list (curl, reading 10+ files, skipping push, parsing local JSONL)
- [ ] Command table replaces sync/load references

---

### e017_s04_t05: Update epic + charter templates
**Priority:** MEDIUM
**Estimate:** 30m
**Status:** [ ]
**Files:** `packages/cli/src/templates/epic-template.md`, `packages/cli/src/templates/charter-template.md`

Replace `--sync` references with `ginko push`.

---

### e017_s04_t06: Update project CLAUDE.md
**Priority:** HIGH
**Estimate:** 1h
**Status:** [ ]
**Files:** `CLAUDE.md`

Add push/pull commands, graph-first protocol, anti-patterns.

---

### e017_s04_t07: Update ginko skill with graph-first enforcement
**Priority:** HIGH
**Estimate:** 1h
**Status:** [ ]
**Files:** `.claude/skills/ginko/SKILL.md`

Skill acts as behavioral anchor for orchestrator context refresh.

**Acceptance Criteria:**
- [ ] Graph-first context retrieval as hard rule
- [ ] Push/pull as canonical sync commands
- [ ] When to dispatch push subagent
- [ ] Error handling patterns

---

### e017_s04_t08: Push/pull output formatting with reinforcement
**Priority:** MEDIUM
**Estimate:** 1h
**Status:** [ ]
**Files:** `packages/cli/src/commands/push/push-command.ts`, `packages/cli/src/commands/pull/pull-command.ts`

Structured success messages with reinforcement hints, staleness warnings.

---

### e017_s04_t09: Implement `ginko hooks install` / `ginko hooks remove`
**Priority:** LOW
**Estimate:** 2h
**Status:** [ ]
**Files:** `packages/cli/src/commands/hooks/index.ts`, `packages/cli/src/commands/hooks/install.ts`

Optional post-commit hook for auto-push.

---

### e017_s04_t10: Update dashboard UnsyncedBanner messaging
**Priority:** LOW
**Estimate:** 30m
**Status:** [ ]
**Files:** `dashboard/src/components/graph/UnsyncedBanner.tsx`

Suggest `ginko push` instead of `ginko graph load`.
