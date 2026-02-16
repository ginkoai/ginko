# SPRINT: Fix Mode & Health Nudges (EPIC-022 Sprint 2)

## Sprint Overview

**Sprint Goal**: Add `--fix` guided remediation to `ginko health` and integrate health nudges into task complete and handoff commands.
**ID:** e022_s02
**Duration**: 1-2 days
**Type**: Feature sprint
**Progress:** 100% (5/5 tasks complete)

**Success Criteria:**
- `ginko health --fix` walks through each gap with interactive remediation
- `ginko task complete` shows one-line health nudge when adherence < 80%
- `ginko handoff` shows adherence summary before completing handoff
- All nudges are non-blocking (informational, not gates)
- Builds clean in both main and OSS staging repos

---

## Sprint Tasks

### e022_s02_t01: Implement --fix guided remediation (2h)
**Priority:** HIGH
**Status:** [x]

**Problem:** `ginko health` shows gaps but doesn't help fix them. Users see problems but must manually figure out remediation.
**Solution:** `--fix` mode walks through each fail/warn item interactively, offering to run fix commands or skip.

**Approach:**
- Refactor health checks to return structured results (already done — HealthCheckItem has `fix` field)
- For each item with status fail or warn, prompt user: fix / skip / skip all
- Execute fix actions where possible (e.g., `ginko push`, mark tasks complete)
- For items that need manual action (create epic file), show instructions and pause
- Non-interactive mode (`--yes`) auto-applies safe fixes

**Scope:**
- Includes: Interactive fix flow for all current health categories
- Excludes: Auto-creating epic/sprint files (too opinionated — show instructions instead)

**Acceptance Criteria:**
- [ ] `--fix` prompts for each gap
- [ ] Safe fixes execute automatically with confirmation
- [ ] Manual fixes show clear instructions
- [ ] Skip/skip-all options work
- [ ] Summary at end shows what was fixed

---

### e022_s02_t02: Extract health check runner as reusable module (1h)
**Priority:** HIGH
**Status:** [x]

**Problem:** Health checks need to run from multiple places (health command, task complete, handoff) but are currently embedded in the health command.
**Solution:** Extract the check runner into a shared module that returns structured results.

**Approach:**
- Create `packages/cli/src/lib/health-checker.ts`
- Move check functions (checkTracking, checkCompletion, checkSync, checkSessionLogs, checkGit) to this module
- Export a `runHealthChecks()` function that returns all categories and adherence score
- Health command becomes a thin wrapper around the module
- Other commands can import and use the score/summary

**Acceptance Criteria:**
- [ ] `health-checker.ts` exports `runHealthChecks()` returning categories + adherence score
- [ ] `health.ts` command uses the extracted module
- [ ] No behavior change in `ginko health` output

---

### e022_s02_t03: Add health nudge to task complete (1h)
**Priority:** HIGH
**Status:** [x]

**Problem:** Task completion is a natural breakpoint where humans should review adherence, but there's no prompt to do so.
**Solution:** After `ginko task complete`, show a one-line health nudge when adherence is below 80%.

**Approach:**
- Import `runHealthChecks` in task status command
- After successful task completion, run checks (lightweight — all local)
- If adherence < 80%: show `"💡 Session adherence: 62% — run \`ginko health\` to review"`
- If adherence >= 80%: show nothing (don't clutter the happy path)
- Wrap in try/catch so health check failures never block task completion

**Acceptance Criteria:**
- [ ] Nudge appears after `ginko task complete` when adherence < 80%
- [ ] No nudge when adherence >= 80%
- [ ] Health check failure doesn't block task completion
- [ ] Nudge is a single line, not a full report

---

### e022_s02_t04: Add health summary to handoff (1.5h)
**Priority:** HIGH
**Status:** [x]

**Problem:** Handoff is the session boundary — the last chance to catch adherence gaps before context switches. Currently no adherence review happens here.
**Solution:** Show a brief health summary during `ginko handoff`, before the handoff completes.

**Approach:**
- Import `runHealthChecks` in handoff command
- Run checks after work reconciliation but before archiving
- Display compact summary: `"Session adherence: 75% (2 warn, 1 fail)"`
- If adherence < 60%: show expanded summary with top 3 gaps
- If adherence >= 80%: show single green line
- Always non-blocking — handoff proceeds regardless
- Wrap in try/catch for resilience

**Acceptance Criteria:**
- [ ] Health summary appears during handoff
- [ ] Compact for good adherence, expanded for poor
- [ ] Never blocks handoff completion
- [ ] Shows actionable top gaps when expanded

---

### e022_s02_t05: Copy changes to OSS staging and verify build (0.5h)
**Priority:** MEDIUM
**Status:** [x]

**Problem:** Changes need to exist in both the main repo and the OSS staging repo.
**Solution:** Copy new/modified files to staging, verify build passes.

**Acceptance Criteria:**
- [ ] health-checker.ts copied to staging
- [ ] Updated health.ts copied to staging
- [ ] Updated task/status.ts copied to staging
- [ ] Updated handoff.ts copied to staging
- [ ] `npm run build` passes in staging repo
