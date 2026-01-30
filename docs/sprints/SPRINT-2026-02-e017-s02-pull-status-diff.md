# SPRINT: Pull Command + Status + Diff

## Sprint Overview

**Sprint ID:** `e017_s02`
**Sprint Goal**: Implement `ginko pull`, enhance `ginko status` with sync state, add `ginko diff`
**Priority Lane**: Now
**Status**: Not Started
**Type**: Feature
**Progress:** 0% (0/6 tasks complete)

**ADR:** ADR-077: Git-Integrated Push/Pull Sync Architecture
**Prerequisite:** e017_s01 (Core Push)

**Success Criteria:**
- [ ] `ginko pull` wraps existing sync logic with new interface
- [ ] `ginko status` shows last push/pull timestamps and unpushed count
- [ ] `ginko diff` compares local file with graph version
- [ ] All commands registered in CLI entry point
- [ ] Pull skill defined for orchestrator dispatch
- [ ] Tests pass and build clean

---

## Sprint Tasks

### e017_s02_t01: Implement `ginko pull` command
**Priority:** CRITICAL
**Estimate:** 3h
**Status:** [ ]
**Files:** `packages/cli/src/commands/pull/pull-command.ts`, `packages/cli/src/commands/pull/index.ts`

Wrap existing `syncCommand()` logic from `sync-command.ts`. Add subcommands (`pull epic`, `pull sprint`). Update `lastPullTimestamp` on success.

**Acceptance Criteria:**
- [ ] `ginko pull` delegates to existing sync logic
- [ ] `ginko pull epic` filters to epic type
- [ ] `ginko pull sprint` filters to sprint type
- [ ] `--force` overwrites local with graph version
- [ ] `--dry-run` previews changes
- [ ] Sync state `lastPullTimestamp` updated on success

---

### e017_s02_t02: Enhance `ginko status` with sync state
**Priority:** HIGH
**Estimate:** 2h
**Status:** [ ]
**Files:** `packages/cli/src/commands/status.ts`

Show last push/pull timestamps, unpushed file count (from git diff), and staleness warnings.

**Acceptance Criteria:**
- [ ] Status shows last push timestamp and commit
- [ ] Status shows last pull timestamp
- [ ] Status shows unpushed file count
- [ ] Staleness warning if >2h since last push with unpushed changes

---

### e017_s02_t03: Implement `ginko diff` command
**Priority:** MEDIUM
**Estimate:** 2h
**Status:** [ ]
**Files:** `packages/cli/src/commands/diff/diff-command.ts`, `packages/cli/src/commands/diff/index.ts`

Fetch node from graph, compare with local file, show property-level diff.

**Acceptance Criteria:**
- [ ] `ginko diff epic/EPIC-001` shows local vs graph diff
- [ ] Shows content differences in readable format
- [ ] Handles missing local or graph versions gracefully

---

### e017_s02_t04: Register pull + diff commands in CLI entry point
**Priority:** HIGH
**Estimate:** 15m
**Status:** [ ]
**Files:** `packages/cli/src/index.ts`

**Acceptance Criteria:**
- [ ] `ginko pull` and `ginko diff` available as CLI commands
- [ ] Help text shows subcommands and options

---

### e017_s02_t05: Define pull skill
**Priority:** MEDIUM
**Estimate:** 30m
**Status:** [ ]
**Files:** `.claude/skills/pull.md`

**Acceptance Criteria:**
- [ ] Pull skill documents commands, options, error handling
- [ ] Anti-patterns section prevents use of deprecated `ginko sync`

---

### e017_s02_t06: Tests + verification
**Priority:** HIGH
**Estimate:** 2h
**Status:** [ ]
**Files:** `packages/cli/src/commands/pull/__tests__/pull.test.ts`

**Acceptance Criteria:**
- [ ] Pull command tests with mocked sync logic
- [ ] Status enhancement tests
- [ ] Build passes clean

---

## Bug Fixes in This Sprint

- **BUG-018** (bidirectional sync broken): Push + Pull replaces broken bidirectional `sync` command
