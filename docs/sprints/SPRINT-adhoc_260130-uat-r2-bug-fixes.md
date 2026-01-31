# SPRINT: UAT Round 2 — Bug Fixes

## Sprint Overview

**Sprint ID:** `adhoc_260130_s01`
**Sprint Goal**: Fix all bugs discovered during UAT & E2E Testing Round 2 (SPRINT-adhoc_260129)
**Priority Lane**: Now
**Status**: In Progress
**Type**: Bug Fix
**Progress:** 0% (0/10 tasks complete)

**Source:** 18 bugs (BUG-005 through BUG-022) from `SPRINT-adhoc_260129-uat-e2e-round2.md`

**Success Criteria:**
- [ ] All CRITICAL and HIGH bugs resolved
- [ ] MEDIUM bugs resolved or triaged with rationale
- [ ] Regression tests pass for BUG-003 and BUG-004
- [ ] Re-test failed UAT cases after fixes

---

## Sprint Tasks

### adhoc_260130_s01_t01: Fix real-time event sync pipeline
**Priority:** CRITICAL
**Bugs:** BUG-005, BUG-011
**Status:** [ ]

**Problem:** Entity creation (charter, epic, sprint) and `ginko log` save locally but never sync to graph in real-time. Three errors reported: (1) "No adapters enabled", (2) "Primary adapter 'graph' registered but not enabled", (3) Graph API 404 on POST to events endpoint. Only batch `ginko graph load` works.

**Root Cause Investigation:**
- Check adapter initialization in event dispatcher
- Verify events endpoint exists and accepts project namespace
- Compare batch load endpoint vs events endpoint configuration

**Acceptance Criteria:**
- [ ] Entity creation triggers automatic graph sync
- [ ] `ginko log` entries appear in graph without manual load
- [ ] Event dispatcher adapters initialize correctly
- [ ] No 404 errors on events endpoint

---

### adhoc_260130_s01_t02: Fix graph load deduplication
**Priority:** HIGH
**Bugs:** BUG-007
**Status:** [ ]

**Problem:** `ginko graph load` creates duplicate nodes. After loading, dashboard shows duplicate epics ("e001" and "EPIC-e001: Design Portfolio v1") and duplicate sprints (e.g., "e001_s01" and "SPRINT: Design Portfolio Sprint 1...").

**Root Cause Investigation:**
- Check node matching logic — likely matching on exact title rather than entity ID
- Verify upsert vs insert behavior in graph load API
- Check if ADR-052 entity IDs are used as unique keys

**Acceptance Criteria:**
- [ ] `ginko graph load` uses entity IDs as unique keys for upsert
- [ ] Repeated loads do not create duplicates
- [ ] Existing duplicates can be cleaned up

---

### adhoc_260130_s01_t03: Fix bidirectional sync architecture
**Priority:** CRITICAL
**Bugs:** BUG-018, BUG-019
**Status:** [ ]

**Problem:** `ginko sync` (dashboard→local) reports "All nodes are synced" even when dashboard edits exist — never pulls content changes to local files. `ginko graph load` (local→graph) overwrites dashboard edits without comparison. No diffing or conflict detection. Additionally, `ginko graph load` reports "No new content" when files have changed, though content does get pushed.

**Root Cause Investigation:**
- Check what `ginko sync` actually compares (node existence vs content hash?)
- Determine if sync was designed for metadata-only (ADR, status) or full content
- Review ADR-077 (Git-integrated push/pull sync architecture) for intended design

**Acceptance Criteria:**
- [ ] `ginko sync` detects and pulls dashboard content changes to local files
- [ ] `ginko graph load` detects local changes and reports accurately
- [ ] Conflict detection when both sides have changed
- [ ] User prompted for resolution on conflicts

---

### adhoc_260130_s01_t04: Fix task/sprint status persistence
**Priority:** HIGH
**Bugs:** BUG-010, BUG-016
**Status:** [ ]

**Problem:** Task and sprint status changes via CLI (`ginko task start/complete/block/pause`) don't reflect on dashboard. All tasks show "Todo" even after completion. Tasks are also not auto-assigned to the active user when work begins.

**Root Cause Investigation:**
- Check if status changes use the broken events endpoint (BUG-005/011) or a separate API
- Verify status field mapping between CLI and dashboard
- Check auto-assignment logic in `ginko task start`

**Acceptance Criteria:**
- [ ] `ginko task complete` reflects as "Done" on dashboard
- [ ] `ginko task start` reflects as "In Progress" on dashboard
- [ ] `ginko task start` auto-assigns task to current user
- [ ] Status changes persist across CLI and dashboard

**Dependencies:** May be resolved by fixing adhoc_260130_s01_t01 (event sync pipeline)

---

### adhoc_260130_s01_t05: Add non-interactive mode for AI-executed commands
**Priority:** HIGH
**Bugs:** BUG-009, BUG-012
**Status:** [ ]

**Problem:** `ginko sprint create` uses raw interactive arrow-key prompt instead of AI-guided conversational flow. `ginko handoff` uses interactive prompt for untracked work reconciliation. Both break in non-TTY environments (Claude Code).

**Fix Approach:**
- `ginko sprint create`: Refactor to use reflection pattern (like charter/epic) — AI asks questions, user responds, AI synthesizes
- `ginko handoff`: Add `--yes` flag to auto-accept, or detect non-TTY and default to non-interactive
- General: All AI-executed commands should detect `isTTY=false` and fall back to non-interactive mode

**Acceptance Criteria:**
- [ ] `ginko sprint create` works in Claude Code via conversational flow
- [ ] `ginko handoff` completes without interactive prompts when `--yes` passed
- [ ] Non-TTY detection prevents interactive prompt hangs

---

### adhoc_260130_s01_t06: Fix identity management on login
**Priority:** HIGH
**Bugs:** BUG-021
**Status:** [ ]

**Problem:** `ginko login` authenticates against API (e.g., chris@ginkoai.com) but local `.ginko/config.json` retains a different user.email (e.g., xtophr@gmail.com). This causes insights to report against wrong user, session directories named with wrong email, and team status to not recognize the user.

**Fix Approach:**
- `ginko login` should update `.ginko/config.json` user.email to match authenticated API identity
- Or: link multiple emails to one identity (email aliases)
- Consider: should `ginko init` prompt for email and validate against API?

**Acceptance Criteria:**
- [ ] `ginko login` updates local config identity to match API auth
- [ ] `ginko whoami` shows consistent identity across API and local
- [ ] Session directories use correct identity
- [ ] `ginko insights` reports against authenticated user

---

### adhoc_260130_s01_t07: Fix epic creation defaults and local index
**Priority:** MEDIUM
**Bugs:** BUG-006, BUG-008
**Status:** [ ]

**Problem:** (a) Epics created via `ginko start` menu default to Status: Not Started, Priority Lane: Later. Should default to In Progress / Now since user is choosing to work on it immediately. (b) `ginko epic list` returns "No epics found" even though epic doc exists on disk — not registered in local index.

**Acceptance Criteria:**
- [ ] Epics created from `ginko start` default to Status: In Progress, Priority Lane: Now
- [ ] `ginko epic list` discovers and displays locally created epics
- [ ] Epic registration in local config happens at creation time

---

### adhoc_260130_s01_t08: Fix team status command
**Priority:** HIGH
**Bugs:** BUG-020
**Status:** [ ]

**Problem:** `ginko team status` shows "No team members with assigned work" even after assigning tasks via `ginko assign`. Assigned tasks are visible on dashboard but team status command doesn't detect them.

**Root Cause Investigation:**
- Check what API endpoint `ginko team status` queries
- Verify assignment data format matches query expectations
- May be related to identity mismatch (BUG-021)

**Acceptance Criteria:**
- [ ] `ginko team status` shows assigned team members and their tasks
- [ ] Assignment via `ginko assign` immediately visible in team status
- [ ] Progress percentages reflect actual task completion

---

### adhoc_260130_s01_t09: Dashboard fixes
**Priority:** MEDIUM
**Bugs:** BUG-013, BUG-014, BUG-015, BUG-017
**Status:** [ ]

**Problem:**
- BUG-013: Insights page shows "No Insights Available" despite CLI generating data
- BUG-014: Dashboard doesn't persist last-accessed project (always loads first project)
- BUG-015: Task assignee field is freeform text instead of team member dropdown
- BUG-017: No team status view on dashboard (CLI has `ginko team status`)

**Acceptance Criteria:**
- [ ] Insights page displays data (synced from CLI or computed server-side)
- [ ] Last-accessed project persisted (localStorage or user preferences)
- [ ] Assignee field shows team member dropdown
- [ ] Team status view available on dashboard (or planned for future sprint)

---

### adhoc_260130_s01_t10: Add client-side input validation
**Priority:** MEDIUM
**Bugs:** BUG-022
**Status:** [ ]

**Problem:** Empty/malformed task IDs are sent directly to API without validation. `ginko task start ""` hits `/task//status` which returns HTML 404 parsed as JSON, causing an unhelpful error.

**Acceptance Criteria:**
- [ ] Empty task IDs rejected with clear error before API call
- [ ] Malformed entity IDs (not matching expected patterns) rejected with guidance
- [ ] API error responses parsed gracefully (handle HTML responses)

---

## Priority Order

| Order | Task | Severity | Rationale |
|-------|------|----------|-----------|
| 1 | t01 — Event sync pipeline | CRITICAL | Root cause for multiple downstream bugs |
| 2 | t03 — Bidirectional sync | CRITICAL | Core product promise |
| 3 | t02 — Graph deduplication | HIGH | Data integrity |
| 4 | t04 — Status persistence | HIGH | May be resolved by t01 |
| 5 | t05 — Non-interactive mode | HIGH | Blocks AI partner usage |
| 6 | t06 — Identity management | HIGH | Affects team features |
| 7 | t08 — Team status | HIGH | Team visibility |
| 8 | t07 — Epic defaults/index | MEDIUM | UX improvement |
| 9 | t09 — Dashboard fixes | MEDIUM | Multiple small fixes |
| 10 | t10 — Input validation | MEDIUM | Defensive coding |

---

## Notes

- Tasks t01 and t04 may share a root cause — fixing the event sync pipeline could resolve status persistence
- ADR-077 (Git-integrated push/pull sync) should be reviewed before tackling t03
- Dashboard fixes (t09) may require coordination with dashboard team
- All fixes should be verified against the original UAT test cases in SPRINT-adhoc_260129
