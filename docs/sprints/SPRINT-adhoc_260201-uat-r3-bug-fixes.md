# SPRINT: UAT Round 3 - Bug Fixes

## Sprint Overview

**Sprint ID:** `adhoc_260201_s01`
**Sprint Goal**: Fix bugs discovered during UAT Round 3 re-validation
**Priority Lane**: Now
**Status**: In Progress
**Type**: Bug Fix
**Progress:** 70% (7/10 tasks complete)

**Source:** Round 3 UAT testing (SPRINT-adhoc_260131-uat-e2e-round3.md)

**Success Criteria:**
- [x] All CRITICAL and HIGH bugs resolved
- [ ] Build passes, tests pass after each fix
- [ ] Manual CLI verification per bug scenario
- [ ] Dashboard bugs tested in browser

---

## Sprint Tasks

### adhoc_260201_s01_t01: Fix GraphAdapter 403 Error
**Priority:** CRITICAL
**Bugs:** BUG-005, BUG-011
**Status:** [x] FIXED

**Root Cause (actual):** `.env` had stale `GINKO_GRAPH_TOKEN=test_token_12345` which overrode the real `gk_` API key from `~/.ginko/auth.json`. The test token doesn't start with `gk_`, so `resolveUserId()` routed it to the OAuth JWT path, returning "Invalid or expired token". EventQueue was unaffected because it calls `getAccessToken()` which checks `GINKO_API_KEY` (not `GINKO_GRAPH_TOKEN`).

**Fix applied:**
- Removed stale `GINKO_GRAPH_TOKEN` from `.env`
- Updated `.env.example` to document token should be left unset
- Fixed `mcp.ginko.ai` -> `app.ginkoai.com` in graph-adapter URLs
- Added diagnostic logging to dashboard nodes/access routes

**Commit:** `f614c6f` fix(cli): resolve GraphAdapter 403 on node creation (BUG-005/011)

---

### adhoc_260201_s01_t02: Fix Identity Mismatch (Git Model)
**Priority:** HIGH
**Bugs:** BUG-021
**Status:** [ ]

**Root Cause:** `ginko login` saves auth to `~/.ginko/auth.json` (global) but never updates `.ginko/local.json` (project-level). `local.json` set during `ginko init` from `git config user.email`.

**Design: Follow Git's Identity Model**
- `~/.ginko/auth.json` = **authentication** (API key + account, global)
- `.ginko/local.json` = **attribution** (project-local identity, from `git config user.email`)
- These CAN legitimately differ (work Ginko account + personal git email for OSS projects)
- Do NOT auto-update local.json on login

**Fix:**
- (a) Identity mismatch warning on `ginko start`: Compare local.json userEmail against auth.json user.email. If different, show one-time warning with guidance. Suppressible via `"suppressIdentityWarning": true` in local.json.
- (b) Default to auth email on `ginko init`: Change priority to (1) auth email if authenticated, (2) `git config user.email` fallback. New projects default to correct identity.
- (c) Ensure `ginko config set userEmail <email>` works for manual override.

**Files:**
- `packages/cli/src/commands/start/start-reflection.ts` (add mismatch check)
- `packages/cli/src/utils/config-loader.ts` (line 186-192, default email priority)
- `packages/cli/src/commands/config.ts` (ensure config set works)

**Acceptance Criteria:**
- [ ] `ginko start` shows warning when local.json email differs from auth.json
- [ ] Warning is suppressible
- [ ] `ginko init` on new project defaults to authenticated email
- [ ] `ginko config set userEmail` updates local.json

---

### adhoc_260201_s01_t03: Fix Node Duplication on Push
**Priority:** HIGH
**Bugs:** BUG-007
**Status:** [x] FIXED

**Fix applied:** `ginko graph cleanup` command added (commit `92909c6`), plus epic node consolidation and sync tech debt cleanup (commit `a99680a`).

**Commits:**
- `92909c6` feat(cli): add `ginko graph cleanup` command (BUG-007)
- `a99680a` feat: epic node consolidation & sync tech debt cleanup (ADR-052, ADR-077)

---

### adhoc_260201_s01_t04: Fix Sprint Create Crash
**Priority:** HIGH
**Bugs:** BUG-024 (subsumes BUG-009 regression)
**Status:** [x] FIXED

**Fix applied:** `Array.isArray(aiPlan.tasks)` guard at line 277 of `create.ts` prevents the crash. If AI returns malformed output without a `tasks` array, falls back to `createSimpleSprintPlan()`.

---

### adhoc_260201_s01_t05: Add Pre-Push Conflict Detection (Phase 1)
**Priority:** HIGH
**Bugs:** BUG-018
**Status:** [x] FIXED

**Fix applied:** Full `ginko push` / `ginko pull` / `ginko diff` implemented via ADR-077 (commit `3b5ae22`). Push sends local changes to graph, pull brings dashboard edits back to local git. Replaced old one-way `ginko graph load` / `ginko sync` commands.

**Commit:** `3b5ae22` feat(cli): implement git-integrated push/pull sync (ADR-077, EPIC-017)

---

### adhoc_260201_s01_t06: Implement 3-Way Merge with node-diff3 (Phase 2)
**Priority:** MEDIUM
**Bugs:** BUG-018
**Status:** [ ]
**Dependencies:** adhoc_260201_s01_t05

**Fix (Phase 2 — content merge):**
- Install `node-diff3` dependency
- Create `packages/cli/src/lib/merge.ts` wrapper
- 3-way merge: base (last sync) vs local vs remote (graph)
- Clean merge: apply automatically, show result
- Conflict: show conflict markers, let user choose per-section
- Integrate into push conflict resolution (option to merge instead of overwrite/skip)

**Files:**
- `package.json` (add node-diff3 dependency)
- New: `packages/cli/src/lib/merge.ts`
- `packages/cli/src/commands/push/push-command.ts` (integrate merge option)

**Acceptance Criteria:**
- [ ] Clean merges resolved automatically
- [ ] Conflicting sections shown with markers
- [ ] User can resolve per-section

---

### adhoc_260201_s01_t07: Extend Sync State with Graph Versions (Phase 3)
**Priority:** MEDIUM
**Bugs:** BUG-018
**Status:** [ ]
**Dependencies:** adhoc_260201_s01_t05

**Fix:**
Extend sync state interface:
```typescript
interface SyncState {
  lastPushCommit: string | null;
  lastPushTimestamp: string | null;
  lastPullTimestamp: string | null;
  pushedFiles: Record<string, string>;   // path -> local content hash
  graphHashes: Record<string, string>;    // NEW: path -> graph hash at push time
}
```
After push succeeds, store graph version hashes so next push can detect graph-side changes without a separate fetch.

**Files:**
- `packages/cli/src/lib/sync-state.ts` (extend interface)
- `packages/cli/src/commands/push/push-command.ts` (record graph hashes after push)
- `packages/cli/src/commands/pull/pull-command.ts` (record graph hashes after pull)

**Acceptance Criteria:**
- [ ] Graph hashes stored in sync-state.json after push
- [ ] Pre-push conflict detection uses stored hashes (no extra API call when available)

---

### adhoc_260201_s01_t08: Dashboard Manual UAT Testing
**Priority:** MEDIUM
**Bugs:** BUG-003, BUG-004, BUG-013, BUG-014, BUG-015, BUG-017
**Status:** [ ]

**Test Protocol (requires browser):**

| # | Test | Bug | Expected |
|---|------|-----|----------|
| 1 | Project selector — no duplicates | BUG-003 regression | Each project appears once |
| 2 | User isolation — no cross-user data | BUG-004 regression | Only own project data visible |
| 3 | Insights page after push | BUG-013 | Shows insights data (score, categories) |
| 4 | Project persistence on refresh | BUG-014 | Last-viewed project persists |
| 5 | Assignee field dropdown | BUG-015 | Shows team member dropdown, not freeform |
| 6 | Team status view exists | BUG-017 | Feature gap — document as roadmap item |

**Acceptance Criteria:**
- [ ] BUG-003 regression check passes
- [ ] BUG-004 regression check passes
- [ ] Dashboard bugs documented with current status

---

### adhoc_260201_s01_t09: Fix Staleness Timestamp (Already Done)
**Priority:** HIGH
**Bugs:** BUG-023
**Status:** [x] FIXED

**Fixed this session.** `sync-command.ts` now calls `updateLastSyncTimestamp()` on all successful sync operations, including when nothing needed syncing (early return path at line 485-488). Three locations patched.

**Files modified:**
- `packages/cli/src/commands/sync/sync-command.ts` (lines 485-492, 457, 643)

---

### adhoc_260201_s01_t10: Commit and Ship Fixes
**Priority:** HIGH
**Status:** [x] PARTIAL
**Dependencies:** All above tasks

**Steps:**
1. ~~Commit BUG-023 fix (already built, tested, verified)~~
2. ~~Create feature branch: `fix/uat-r3-bug-fixes`~~
3. ~~Commit each fix separately with conventional commit messages~~
4. [ ] Run full test suite: `npm test`
5. [ ] Run full build: `npm run build`
6. [ ] Push branch and create PR

---

## Priority Order

| Order | Task | Severity | Status |
|-------|------|----------|--------|
| 1 | t01 — GraphAdapter 403 | CRITICAL | **FIXED** |
| 2 | t02 — Identity mismatch | HIGH | OPEN |
| 3 | t03 — Node duplication | HIGH | **FIXED** |
| 4 | t04 — Sprint create crash | HIGH | **FIXED** |
| 5 | t05 — Pre-push conflict detection | HIGH | **FIXED** |
| 6 | t06 — 3-way merge (node-diff3) | MEDIUM | OPEN |
| 7 | t07 — Sync state graph hashes | MEDIUM | OPEN |
| 8 | t08 — Dashboard UAT | MEDIUM | OPEN |
| 9 | t09 — Staleness fix | HIGH | **FIXED** |
| 10 | t10 — Commit and ship | HIGH | PARTIAL |

---

## Key Design Decisions

1. **Identity model follows git**: Authentication (global) is separate from attribution (per-project). `ginko login` does NOT auto-update project configs. Mismatch warning on `ginko start`, suppressible.

2. **Merge library: node-diff3**: Pure JS, no native deps, well-tested. Phased rollout — Phase 1 is conflict detection only, Phase 2 adds merge.

3. **BUG-005/011 root cause was stale .env**: Not a code bug in the GraphAdapter or dashboard. Stale `GINKO_GRAPH_TOKEN=test_token_12345` in `.env` overrode the real `gk_` API key. Also fixed stale `mcp.ginko.ai` URLs in graph-adapter source.
