# SPRINT: Dashboard Bug Verification

## Sprint Overview

**Sprint Goal**: Verify UAT bugs are fixed before closing them
**Duration**: 2026-02-05 to 2026-02-05
**Type**: Bug Verification
**Progress:** 0% (0/5 tasks complete)
**ID:** `adhoc_260205_s02`

**Success Criteria:**
- All 5 UAT bugs verified as fixed or root cause identified
- No regressions introduced
- Bugs can be confidently closed

---

## Sprint Tasks

### adhoc_260205_s02_t01: Verify BUG-001 - Project selector exists (30m)

**Status:** [ ] Not Started
**Priority:** HIGH
**Confidence:** 90%

**Problem:** Dashboard had no way to select which project to view, making it unusable for users with multiple projects.

**Solution:** Confirm project selector is visible and functional in dashboard header.

**Approach:** Navigate to dashboard, verify selector dropdown exists in header, test switching between projects, verify selection persists across page navigation.

**Scope:**
  - Includes: UI verification, selection persistence
  - Excludes: Edge cases with 0 projects

**Acceptance Criteria:**
- [ ] Project selector visible in dashboard header
- [ ] Can switch between projects
- [ ] Selection persists across page navigation

---

### adhoc_260205_s02_t02: Verify BUG-002 - GraphId filtering works (30m)

**Status:** [ ] Not Started
**Priority:** HIGH
**Confidence:** 85%

**Problem:** Dashboard queries weren't filtering by selected project's graphId, showing no data or wrong data.

**Solution:** Confirm Focus, Roadmap, Graph pages show correct project data only.

**Approach:** Select a project with known data, navigate to each page, verify data matches selected project and doesn't include other projects' data.

**Scope:**
  - Includes: Focus, Roadmap, Graph pages
  - Excludes: Settings, Insights (separate bugs)

**Acceptance Criteria:**
- [ ] Focus page shows selected project's tasks only
- [ ] Roadmap shows selected project's epics/sprints only
- [ ] Graph shows selected project's nodes only

---

### adhoc_260205_s02_t03: Verify BUG-003 - Insights member filter fixed (30m)

**Status:** [ ] Not Started
**Priority:** HIGH
**Confidence:** 80%

**Problem:** Insights page showed data from wrong project (Ginko Core Team instead of selected project), a privacy/data isolation violation.

**Solution:** Confirm insights are filtered by team membership and selected project.

**Approach:** Login with test account, select test project, check insights page, verify no cross-project data visible.

**Scope:**
  - Includes: Insights page data isolation
  - Excludes: Insights accuracy/content quality

**Acceptance Criteria:**
- [ ] Insights show only selected project's data
- [ ] No data from other teams visible
- [ ] Member filter respects team boundaries

---

### adhoc_260205_s02_t04: Verify BUG-005 - Duplicate team creation fixed (15m)

**Status:** [ ] Not Started
**Priority:** MEDIUM
**Confidence:** 95%

**Problem:** `ginko graph init` could create duplicate teams due to race condition (two teams created 1 second apart with same graph_id).

**Solution:** Confirm idempotency check prevents duplicate team creation.

**Approach:** Run `ginko graph init` on a project that already has a team, verify no duplicate created and appropriate message shown.

**Scope:**
  - Includes: CLI idempotency check
  - Excludes: Database cleanup of existing duplicates

**Acceptance Criteria:**
- [ ] Second `ginko graph init` doesn't create duplicate team
- [ ] Appropriate message shown if team already exists

---

### adhoc_260205_s02_t05: Check BUG-004 - Epic file directory (15m)

**Status:** [ ] Not Started
**Priority:** MEDIUM
**Confidence:** 90%

**Problem:** Epic files were created in `docs/sprints/` instead of `docs/epics/`, causing incorrect file organization.

**Solution:** Verify epic creation uses correct directory.

**Approach:** Run `ginko epic` to create a test epic, check file location, if wrong identify root cause (CLI code vs CLAUDE.md instructions).

**Scope:**
  - Includes: CLI epic creation path verification
  - Excludes: Fixing CLAUDE.md if that's the root cause (separate task)

**Acceptance Criteria:**
- [ ] New epics created in `docs/epics/`
- [ ] Or root cause identified and documented if still broken

---

## Related Documents

- **Bug Report**: docs/bugs/UAT-2026-01-27-bugs.md
- **Epic**: Ad-Hoc Work (Dashboard Maintenance)
- **Related Commits**: 637e087, a151b85

---

**Sprint Status**: Active
**Start Date**: 2026-02-05
**Created By**: chris@watchhill.ai
