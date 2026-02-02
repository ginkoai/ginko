# SPRINT: UAT & E2E Testing - Round 3

## Sprint Overview

**Sprint ID:** `adhoc_260131_s01`
**Sprint Goal**: Re-validate all Round 2 bugs (BUG-005 through BUG-022) after bug fix sprint, plus verify new fix (staleness false positive)
**Duration**: 1 day
**Type**: QA / Validation
**Progress:** 100% (testing complete)

**Context:**
- Round 2 found 18 bugs (BUG-005 through BUG-022)
- Bug fix commit `72bf902` addressed 7 bugs: BUG-005, BUG-006, BUG-009, BUG-010, BUG-011, BUG-012, BUG-016
- New push/pull sync architecture shipped (ADR-077, EPIC-017) via `3b5ae22`
- BUG-023 (staleness false positive) discovered and fixed during this session

---

## Bug Re-Validation Results

### Fixed (5)

| Bug | Description | Round 3 Result | Evidence |
|-----|-------------|---------------|----------|
| BUG-006 | `ginko epic list` returns "No epics found" | **FIXED** | Lists all 17 epics correctly with status and progress |
| BUG-012 | `ginko handoff` interactive prompt hangs in non-TTY | **FIXED** | TTY guard at `handoff.ts:47` skips reconciliation in non-TTY; completes without hanging |
| BUG-019 | `ginko graph load` misleading "No new content" message | **SUPERSEDED** | `ginko graph load` deprecated in favor of `ginko push` (ADR-077) |
| BUG-020 | `ginko team status` shows "No team members" | **FIXED** | Shows 6 members with progress bars, assigned sprints, and activity timestamps |
| BUG-023 | Staleness false positive after sync | **FIXED** | `updateLastSyncTimestamp()` now called on all sync completions, not just when items synced |

### Partially Fixed (3)

| Bug | Description | Round 3 Result | Remaining Issue |
|-----|-------------|---------------|-----------------|
| BUG-005 | Entity creation doesn't auto-sync to graph | **PARTIAL** | GraphAdapter enabled and loads from config (no env var needed). Event queue syncs successfully. Primary adapter write gets HTTP 403 — possible token refresh issue in direct write path. |
| BUG-010 | Task/sprint status changes don't persist | **PARTIAL** | `ginko task start` works with `--yes` flag for non-TTY. Dashboard persistence requires manual verification. |
| BUG-011 | `ginko log` doesn't sync to graph | **PARTIAL** | Same as BUG-005 — adapter enabled, primary write 403, event queue sync succeeds. Events reach graph via background queue. |

### Still Open (7)

| Bug | Description | Round 3 Result | Details |
|-----|-------------|---------------|---------|
| BUG-007 | `ginko graph load` creates duplicate nodes | **OPEN** | Graph shows 50 epic nodes vs 17 local, 200 sprint nodes vs 106 local. Deduplication still missing. `ginko push` may handle this better but not verified. |
| BUG-009 | `ginko sprint create` broken in non-TTY | **OPEN (REGRESSION)** | `--description` and `--yes` flags added, but crashes: `TypeError: Cannot read properties of undefined (reading 'forEach')` at `create.ts:291`. AI `breakdownFeatureWithAI()` returns object without `tasks` array; no null-guard on `plan.tasks`. |
| BUG-018 | Bidirectional sync broken | **OPEN** | `ginko push` and `ginko pull` work independently. `ginko diff` shows entities only in local ("not found" in graph). Full bidirectional content sync and conflict detection not implemented. |
| BUG-021 | Identity mismatch on login | **OPEN** | `.ginko/local.json` has `userEmail: "xtophr@gmail.com"`, `ginko whoami` shows `chris@watchhill.ai`. `ginko login` does not update local config to match authenticated identity. |
| BUG-022 | No client-side input validation | **OPEN** | Empty task ID (`""`) sends request to `/task//status`, returns HTML 404 parsed as JSON. Malformed ID (`"invalid-id-format"`) gets reasonable API error ("Task not found") but no client-side pre-validation before API call. |
| BUG-008 | Epic defaults wrong (Not Started/Later) | **NOT TESTED** | Requires creating a new epic via `ginko start` menu to verify. |
| BUG-016 | Tasks not auto-assigned on start | **NOT TESTED** | `ginko task start` works but auto-assignment to current user not verified. |

### Dashboard Bugs (Require Manual Browser Testing)

| Bug | Description | CLI Status | Dashboard Status |
|-----|-------------|------------|-----------------|
| BUG-013 | Insights page shows "No Insights Available" | CLI generates data (score 82/100) | **UNTESTED** — requires browser |
| BUG-014 | Dashboard doesn't persist last-accessed project | N/A | **UNTESTED** — requires browser |
| BUG-015 | Assignee field is freeform text, not dropdown | N/A | **UNTESTED** — requires browser |
| BUG-017 | No team status view on dashboard | CLI `ginko team status` works | **UNTESTED** — requires browser |

---

## Regression Checks

| Bug | Check | Round 3 Result |
|-----|-------|---------------|
| BUG-003 | Project selector — no duplicate "Team Project" entries | **REQUIRES DASHBOARD** — Cannot verify from CLI |
| BUG-004 | User isolation — no cross-user data leakage | **REQUIRES DASHBOARD** — Cannot verify from CLI |

---

## New Bugs Found

| ID | Severity | Area | Description |
|----|----------|------|-------------|
| BUG-023 | HIGH | CLI/Sync | **FIXED** — `ginko pull` (and `ginko sync`) did not update the team sync timestamp when everything was already in sync (`result.synced.length === 0`). Caused `ginko start` to show false "critically stale" warning even after recent sync. Fixed by updating timestamp on all successful sync operations regardless of item count. |
| BUG-024 | HIGH | CLI | `ginko sprint create --description "..." --yes` crashes with `TypeError: plan.tasks.forEach is not a function`. `breakdownFeatureWithAI()` at `create.ts:132` returns a truthy object with `tasks: undefined`. No guard before iterating `plan.tasks` at line 291. The `--description`/`--yes` flags were added (BUG-009 fix) but the command still crashes due to unhandled AI response shape. |

---

## Summary

| Category | Count |
|----------|-------|
| **Fixed** | 5 |
| **Partially Fixed** | 3 |
| **Still Open** | 7 |
| **Untested (Dashboard)** | 4 + 2 regressions |
| **New Bugs** | 2 (1 fixed, 1 open) |

### Priority for Next Fix Sprint

| Priority | Bugs | Rationale |
|----------|------|-----------|
| 1 | BUG-024 (sprint create crash) | CLI crash on basic command; blocks sprint creation flow |
| 2 | BUG-005/011 (403 on primary write) | Event queue workaround exists but primary path auth broken |
| 3 | BUG-021 (identity mismatch) | Affects team features, insights attribution, session paths |
| 4 | BUG-018 (bidirectional sync) | Core product promise; push/pull architecture exists but incomplete |
| 5 | BUG-007 (graph deduplication) | Data integrity; 50 vs 17 epics in graph |
| 6 | BUG-009 (sprint create regression) | Subsumed by BUG-024; same root cause |
| 7 | BUG-022 (input validation) | Defensive coding; low user impact |

---

## Test Environment

- **CLI Version:** 2.1.6-beta.1 (local build from `packages/cli/`)
- **Node.js:** v24.4.0
- **Platform:** macOS Darwin 24.3.0
- **Graph:** Connected to app.ginkoai.com (3,766 nodes, 10,372 relationships)
- **Test Date:** 2026-01-31
