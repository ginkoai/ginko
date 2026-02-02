# SPRINT: UAT Round 3 - Bug Fixes

## Sprint Overview

**Sprint ID:** `adhoc_260201_s01`
**Sprint Goal**: Fix bugs discovered during UAT Round 3 re-validation
**Priority Lane**: Now
**Status**: Not Started
**Type**: Bug Fix
**Progress:** 0% (0/10 tasks complete)

**Source:** Round 3 UAT testing (SPRINT-adhoc_260131-uat-e2e-round3.md)

**Success Criteria:**
- [ ] All CRITICAL and HIGH bugs resolved
- [ ] Build passes, tests pass after each fix
- [ ] Manual CLI verification per bug scenario
- [ ] Dashboard bugs tested in browser

---

## Sprint Tasks

### adhoc_260201_s01_t01: Fix GraphAdapter 403 Error
**Priority:** CRITICAL
**Bugs:** BUG-005, BUG-011
**Status:** [ ]

**Root Cause:** GraphAdapter loads bearer token once at creation time (`graph-adapter.ts:238`) and bakes it into config. EventQueue succeeds because `GraphApiClient.requireAuth()` re-reads token on each request. Additionally, GraphAdapter calls `POST /api/v1/graph/nodes` while EventQueue uses a different endpoint — the nodes endpoint may reject the `gk_` API key format.

**Investigation Step (Before Coding):**
```bash
curl -X POST https://app.ginkoai.com/api/v1/graph/nodes \
  -H "Authorization: Bearer $(cat ~/.ginko/auth.json | jq -r .api_key)" \
  -H "Content-Type: application/json" \
  -d '{"graphId":"gin_1762125961056_dg4bsd","label":"Test","data":{"title":"test"}}'
```

**Fix:**
- (a) Lazy token loading: Change `GraphAdapter` to call `getAccessToken()` at write time (inside `createNode()`), not at creation time. Matches the pattern that works in `GraphApiClient.requireAuth()`.
- (b) Add retry with re-auth: If 401/403 on first attempt, re-read token from disk and retry once.

**Files:**
- `packages/cli/src/lib/write-dispatcher/adapters/graph-adapter.ts` (lines 80-150, 216-254)

**Acceptance Criteria:**
- [ ] `ginko log "test"` syncs without 403 error
- [ ] GraphAdapter primary write path succeeds
- [ ] Fallback to event queue still works if primary fails for other reasons

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
**Status:** [ ]

**Root Cause:** Document ID generated from filename only (`push-command.ts:143`). Graph shows 50 epic nodes vs 17 local. Causes: (1) API may not upsert on `(graphId, id)`, (2) filenames include full slugified title (renamed files create orphan nodes), (3) legacy `ginko graph load` duplicates.

**Investigation Step (Before Coding):**
```bash
ginko graph query "epic" --type Epic --limit 50
```
Compare graph node IDs against local filenames to find mismatch pattern.

**Fix:**
- (a) Verify API upsert behavior — confirm `/api/v1/graph/documents/upload` does MERGE on `(graphId, id)`. If not, escalate as server-side fix.
- (b) Stabilize document IDs: Extract entity ID from filename pattern. `EPIC-001-anything.md` -> id: `EPIC-001`. Use ADR-052 entity ID patterns.
- (c) Add dedup on push: Fetch existing node IDs from graph before upload. Warn on suspected duplicates.
- (d) Optional: `ginko graph cleanup --dry-run` utility to identify and archive duplicates.

**Files:**
- `packages/cli/src/commands/push/push-command.ts` (line 140-143, ID generation)
- `packages/cli/src/commands/graph/api-client.ts` (verify upload endpoint)
- Optional new: `packages/cli/src/commands/graph/cleanup.ts`

**Acceptance Criteria:**
- [ ] Document IDs are stable (entity ID, not full filename)
- [ ] Repeated `ginko push` does not create duplicates
- [ ] Existing duplicates identified (cleanup plan)

---

### adhoc_260201_s01_t04: Fix Sprint Create Crash
**Priority:** HIGH
**Bugs:** BUG-024 (subsumes BUG-009 regression)
**Status:** [ ]

**Root Cause:** `breakdownFeatureWithAI()` calls `aiService.extractJSON<SprintPlan>()` which does `JSON.parse()` without runtime validation. AI can return valid JSON missing the `tasks` array. Truthy check at line 277 passes, then `plan.tasks.forEach()` at line 291 crashes with `TypeError: Cannot read properties of undefined`.

**Fix:**
```typescript
const aiPlan = await breakdownFeatureWithAI(description);

if (aiPlan && Array.isArray(aiPlan.tasks) && aiPlan.tasks.length > 0) {
  plan = aiPlan;
  spinner.succeed('Tasks generated');
} else {
  plan = createSimpleSprintPlan(description);
  spinner.info('Using simple task structure');
}
```

Also validate `name` and `goal` fields before using them at lines 287-288.

**Files:**
- `packages/cli/src/commands/sprint/create.ts` (lines 275-293)
- Optional: `packages/cli/src/services/ai-service.ts` (add schema validation to extractJSON)

**Acceptance Criteria:**
- [ ] `ginko sprint create -d "Test feature" --yes` completes without crash
- [ ] Falls back to simple plan when AI returns malformed response
- [ ] Sprint file created and valid

---

### adhoc_260201_s01_t05: Add Pre-Push Conflict Detection (Phase 1)
**Priority:** HIGH
**Bugs:** BUG-018
**Status:** [ ]

**Current State:** Push overwrites graph silently with no conflict detection. Pull has hash-based conflict detection. `pushedFiles` hashes tracked in sync-state.json but never validated before push.

**Fix (Phase 1 — conflict detection):**
1. For each file about to be pushed, fetch the graph node's `contentHash`
2. Compare against `pushedFiles[filePath]` in sync-state.json (hash at last push)
3. If graph hash differs from last-pushed hash -> graph was edited externally
4. Show conflict warning: overwrite / skip / pull first
5. In non-TTY mode: default to skip conflicting files with warning

**Files:**
- `packages/cli/src/commands/push/push-command.ts` (add pre-push validation)
- `packages/cli/src/lib/sync-state.ts` (extend with `graphHashes` tracking)

**Acceptance Criteria:**
- [ ] Push detects when graph has been edited since last push
- [ ] User prompted for conflict resolution (overwrite/skip/pull)
- [ ] Non-conflicting files push normally
- [ ] Graph hashes recorded after successful push

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
**Status:** [x]

**Fixed this session.** `sync-command.ts` now calls `updateLastSyncTimestamp()` on all successful sync operations, including when nothing needed syncing (early return path at line 485-488). Three locations patched.

**Files modified:**
- `packages/cli/src/commands/sync/sync-command.ts` (lines 485-492, 457, 643)

---

### adhoc_260201_s01_t10: Commit and Ship Fixes
**Priority:** HIGH
**Status:** [ ]
**Dependencies:** All above tasks

**Steps:**
1. Commit BUG-023 fix (already built, tested, verified)
2. Create feature branch: `fix/uat-r3-bug-fixes`
3. Commit each fix separately with conventional commit messages
4. Run full test suite: `npm test`
5. Run full build: `npm run build`
6. Push branch and create PR

**Acceptance Criteria:**
- [ ] All fixes committed with clear messages
- [ ] Build passes clean
- [ ] Tests pass
- [ ] PR created for review

---

## Priority Order

| Order | Task | Severity | Rationale |
|-------|------|----------|-----------|
| 1 | t01 — GraphAdapter 403 | CRITICAL | Root cause for event sync failures |
| 2 | t02 — Identity mismatch | HIGH | Affects attribution and team features |
| 3 | t03 — Node duplication | HIGH | Data integrity |
| 4 | t04 — Sprint create crash | HIGH | CLI crash on basic command |
| 5 | t05 — Pre-push conflict detection | HIGH | Core sync safety |
| 6 | t06 — 3-way merge (node-diff3) | MEDIUM | Enhancement to conflict resolution |
| 7 | t07 — Sync state graph hashes | MEDIUM | Optimization for conflict detection |
| 8 | t08 — Dashboard UAT | MEDIUM | Manual browser testing |
| 9 | t09 — Staleness fix | HIGH | Already complete |
| 10 | t10 — Commit and ship | HIGH | Ship all fixes |

---

## Key Design Decisions

1. **Identity model follows git**: Authentication (global) is separate from attribution (per-project). `ginko login` does NOT auto-update project configs. Mismatch warning on `ginko start`, suppressible.

2. **Merge library: node-diff3**: Pure JS, no native deps, well-tested. Phased rollout — Phase 1 is conflict detection only, Phase 2 adds merge.

3. **BUG-007 requires investigation before coding**: Need to determine if duplication is client-side (inconsistent IDs) or server-side (missing upsert). Curl test and graph query first.

4. **BUG-005/011 requires endpoint investigation**: The 403 may be endpoint-specific (nodes vs events). Curl test determines if fix is client-side (token loading) or server-side (endpoint auth).
