# SPRINT: Health Check Command (EPIC-022 Sprint 1)

## Sprint Overview

**Sprint Goal**: Build `ginko health` — a process adherence report that gives humans a supervision dashboard at natural breakpoints.
**ID:** e022_s01
**Duration**: 1-2 days
**Type**: Feature sprint
**Progress:** 100% (6/6 tasks complete)

**Success Criteria:**
- `ginko health` displays adherence report with 5 categories
- Works fully offline (local data sources only)
- Output follows existing CLI formatting patterns
- Registered in CLI command index
- Passes build and existing tests

---

## Sprint Tasks

### e022_s01_t01: Create health command skeleton and register in CLI (1h)
**Priority:** HIGH
**Status:** [x]

**Problem:** No `ginko health` command exists. Need the command structure, registration, and basic scaffolding.
**Solution:** Create `packages/cli/src/commands/health.ts` following existing command patterns (status.ts as reference).

**Approach:**
- Create health.ts with Commander.js action pattern
- Register in index.ts
- Accept `--fix` flag (stub for Sprint 2) and `--verbose` flag
- Display placeholder sections for each health category

**Acceptance Criteria:**
- [ ] `ginko health` runs without error
- [ ] `--fix` flag accepted (shows "coming soon" message)
- [ ] `--verbose` flag accepted
- [ ] Registered in CLI help output

---

### e022_s01_t02: Implement tracking health checks (2h)
**Priority:** HIGH
**Status:** [x]

**Problem:** Need to detect whether epic files, sprint files, and task tracking exist for active work.
**Solution:** Check docs/epics/, docs/sprints/, and current-sprint.json against actual work state.

**Approach:**
- Read current-sprint.json for active sprint/epic IDs
- Check if corresponding files exist in docs/epics/ and docs/sprints/
- Check if sprint file has tasks defined
- Report: files found vs expected, gaps identified

**Scope:**
- Includes: Epic file existence, sprint file existence, task definition in sprint file
- Excludes: Task content quality assessment (that's a future enhancement)

**Acceptance Criteria:**
- [ ] Detects missing epic files for active epics
- [ ] Detects missing sprint files for active sprints
- [ ] Reports task count from sprint file
- [ ] Shows clear ✓/✗ indicators

---

### e022_s01_t03: Implement completion health checks (2h)
**Priority:** HIGH
**Status:** [x]

**Problem:** Tasks, sprints, and epics get completed in practice but not marked complete in tracking files.
**Solution:** Parse sprint files for task checkbox status and compare against actual completion signals.

**Approach:**
- Parse sprint markdown for task checkboxes: `[x]` complete, `[@]` in progress, `[ ]` not started
- Cross-reference with current-sprint.json state
- Detect "all tasks done but sprint not marked complete" pattern
- Report completion gaps

**Acceptance Criteria:**
- [ ] Counts tasks by status from sprint file
- [ ] Detects unmarked completions
- [ ] Shows "N tasks completed, M NOT MARKED" format

---

### e022_s01_t04: Implement sync health checks (1.5h)
**Priority:** MEDIUM
**Status:** [x]

**Problem:** Work can drift out of sync with the graph — unpushed changes, stale pulls, never-synced state.
**Solution:** Read sync-state.json and git state to report sync health.

**Approach:**
- Read sync-state.json for last push/pull timestamps and unpushed count
- Use staleness-detector.ts patterns for threshold logic (1 day warning, 7 day critical)
- Check git for uncommitted/unstaged file count
- Report sync age and pending change count

**Scope:**
- Includes: Push/pull staleness, uncommitted file count, unpushed entity count
- Excludes: API calls to graph (must work offline)

**Acceptance Criteria:**
- [ ] Shows last push/pull timestamps with relative time
- [ ] Warns on stale sync (>1 day)
- [ ] Reports pending changes count
- [ ] Works fully offline

---

### e022_s01_t05: Implement session log health checks (1h)
**Priority:** MEDIUM
**Status:** [x]

**Problem:** Session logging (decisions, insights, achievements) is the hardest adherence target — need visibility into what was captured.
**Solution:** Parse current-session-log.md for entry counts by category.

**Approach:**
- Read current-session-log.md
- Count entries in Timeline section
- Categorize entries (decisions, insights, achievements) by content markers
- Check if context score was recorded this session

**Acceptance Criteria:**
- [ ] Counts session log entries
- [ ] Categorizes by type where possible
- [ ] Detects missing context score
- [ ] Handles empty/missing session log gracefully

---

### e022_s01_t06: Compose health report with adherence score (1.5h)
**Priority:** HIGH
**Status:** [x]

**Problem:** Individual checks need to be composed into a single, scannable report with an overall adherence score.
**Solution:** Aggregate all checks into formatted output with per-category status and overall percentage.

**Approach:**
- Collect results from all health check modules
- Calculate adherence score: each check item is pass/warn/fail, weighted by priority
- Format output using GINKO_BRAND patterns (chalk, box drawing)
- Show overall adherence percentage
- Add "Run `ginko health --fix` for guided remediation" when gaps exist
- Show one-line nudge suggestion at completion moments

**Acceptance Criteria:**
- [ ] All 5 categories displayed in single report
- [ ] Overall adherence percentage calculated
- [ ] Color-coded status (green/yellow/red)
- [ ] Actionable suggestions for each gap
- [ ] Clean output at default verbosity, detailed at --verbose
