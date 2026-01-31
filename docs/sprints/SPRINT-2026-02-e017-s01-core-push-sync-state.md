# SPRINT: Core Push Command + Sync State

## Sprint Overview

**Sprint ID:** `e017_s01`
**Sprint Goal**: Implement `ginko push` with git-integrated change detection, replacing `ginko graph load`
**Priority Lane**: Now
**Status**: In Progress
**Type**: Feature
**Progress:** 87% (7/8 tasks complete)

**ADR:** ADR-077: Git-Integrated Push/Pull Sync Architecture

**Success Criteria:**
- [x] Sync state module reads/writes `.ginko/sync-state.json`
- [x] Git change detection identifies files changed since last push
- [x] Entity classifier maps file paths to entity types
- [x] `ginko push` command works with subcommands (epic, sprint, charter, adr)
- [x] Event (JSONL) push support via documents endpoint
- [x] Push command registered in CLI entry point
- [x] Push skill defined for orchestrator dispatch
- [ ] Tests pass and build clean

---

## Sprint Tasks

### e017_s01_t01: Create sync state module
**Priority:** HIGH
**Estimate:** 1h
**Status:** [x]
**Files:** `packages/cli/src/lib/sync-state.ts`

Read/write `.ginko/sync-state.json` with fields:
- `lastPushCommit`: git commit SHA at last push
- `lastPullTimestamp`: ISO timestamp of last pull
- `lastPushTimestamp`: ISO timestamp of last push
- `pushedFiles`: record of file paths to content hashes

**Acceptance Criteria:**
- [x] `readSyncState()` returns default state when file doesn't exist
- [x] `writeSyncState()` creates file with proper structure
- [x] `recordPush()` updates commit SHA and timestamp
- [x] `recordPull()` updates pull timestamp

---

### e017_s01_t02: Create git change detection utility
**Priority:** HIGH
**Estimate:** 2h
**Status:** [x]
**Files:** `packages/cli/src/lib/git-change-detector.ts`

Use `simple-git` to get changed files since last push commit. When `lastPushCommit` is null (first push), return all pushable content files.

**Acceptance Criteria:**
- [x] `detectChanges()` returns files changed since given commit SHA
- [x] First push (null commit) returns all content files
- [x] Handles missing commits gracefully (e.g., after rebase)
- [x] Classifies change type (added, modified, deleted)

---

### e017_s01_t03: Extract entity type classifier
**Priority:** MEDIUM
**Estimate:** 1h
**Status:** [x]
**Files:** `packages/cli/src/lib/entity-classifier.ts`

Extract entity type classification from `graph/load.ts` into shared module. Maps file paths to entity types (ADR, Sprint, Epic, Charter, etc.).

**Acceptance Criteria:**
- [x] `classifyFile()` returns correct entity type for all known paths
- [x] `classifyFiles()` groups files by entity type
- [x] `filterByType()` filters by subcommand argument
- [x] `isPushableFile()` excludes non-content files
- [x] Detects misfiled epics in sprints directory

---

### e017_s01_t04: Implement `ginko push` command core
**Priority:** CRITICAL
**Estimate:** 4h
**Status:** [x]
**Files:** `packages/cli/src/commands/push/push-command.ts`, `packages/cli/src/commands/push/index.ts`

Implement the main push command with subcommands (epic, sprint, charter, adr) and options (--dry-run, --force, --all, --no-events).

**Push Flow:**
1. Read `lastPushCommit` from sync state
2. `git diff --name-only <lastPushCommit>..HEAD` → changed files
3. Classify files by entity type, filter by subcommand
4. For each changed file: read content, call API
5. Update `lastPushCommit` to HEAD
6. If first push → push all content files

**Acceptance Criteria:**
- [x] `ginko push` pushes all changes since last push
- [x] `ginko push epic` filters to epics only
- [x] `ginko push sprint e001_s01` filters to specific sprint
- [x] `--dry-run` previews without pushing
- [x] Sprint files trigger task sync
- [x] Sync state updated on success

---

### e017_s01_t05: Add event push support
**Priority:** MEDIUM
**Estimate:** 1h
**Status:** [x]
**Files:** `packages/cli/src/commands/push/push-command.ts`

Include session events (JSONL) in push. Upload via documents endpoint.

**Acceptance Criteria:**
- [x] JSONL event files included in push by default
- [x] `--no-events` flag skips event files
- [x] Events uploaded via documents endpoint (working API path)

---

### e017_s01_t06: Register push command in CLI entry point
**Priority:** HIGH
**Estimate:** 15m
**Status:** [x]
**Files:** `packages/cli/src/index.ts`

**Acceptance Criteria:**
- [x] `ginko push` available as a CLI command
- [x] Help text shows subcommands and options
- [x] Build passes clean

---

### e017_s01_t07: Define push skill
**Priority:** MEDIUM
**Estimate:** 30m
**Status:** [x]
**Files:** `.claude/skills/push.md`

Define the push skill for orchestrator dispatch with options, flags, error codes, retry behavior, and behavioral rules.

**Acceptance Criteria:**
- [x] Skill file documents all commands, options, and error handling
- [x] Anti-patterns section prevents use of deprecated commands
- [x] Behavioral rules guide when to push automatically

---

### e017_s01_t08: Tests + build verification
**Priority:** HIGH
**Estimate:** 2h
**Status:** [ ]
**Files:** `packages/cli/src/commands/push/__tests__/push.test.ts`

**Acceptance Criteria:**
- [ ] Unit tests for sync-state module
- [ ] Unit tests for entity-classifier
- [ ] Unit tests for git-change-detector
- [ ] Integration test for push command
- [ ] `npm run build` passes clean
- [ ] `npm test` passes

---

## Bug Fixes in This Sprint

- **BUG-007** (duplicate nodes): Git-based change detection only pushes changed files, not all files every time
- **BUG-019** (misleading "No new content"): Git diff shows exactly what changed, clear messaging for no-change case
