# SPRINT: Open-Source Release Sprint 3 - Local-Only Mode Verification (EPIC-021 Sprint 3)

## Sprint Overview

**Sprint Goal**: Verify all CLI features work in local-only mode with zero credentials.
**ID:** e021_s03
**Duration**: 1-2 days
**Type**: Feature sprint
**Progress:** 0% (0/4 tasks complete)

**Success Criteria:**
- All graph-dependent code paths degrade gracefully (no crashes, no errors)
- Graph-only commands show clear "requires Ginko Cloud" message
- Full local workflow (init → start → log → handoff → resume) works with zero env vars

---

## Sprint Tasks

### e021_s03_t01: Audit all graph-dependent code paths (3h)
**Priority:** HIGH
**Status:** [ ]

**Problem:** 44 files reference neo4j/graph/supabase — unclear which already degrade gracefully.
**Solution:** Categorize each: (a) already graceful, (b) needs guard, (c) needs "requires Ginko Cloud" message.

**Approach:**
- Audit each of the 44 graph-dependent files
- Key risk files: context-loader-events.ts, task-graph-sync.ts, event-queue.ts, auto-push.ts
- Document findings per file

---

### e021_s03_t02: Add graceful degradation to ungated paths (4h)
**Priority:** HIGH
**Status:** [ ]

**Problem:** Some graph-dependent paths may crash or show cryptic errors without credentials.
**Solution:** Add appropriate guards following existing patterns.

**Approach:**
- Graph-only commands (push, pull, diff, team status): show "requires Ginko Cloud" message
- Optional graph commands (start, handoff, log): silently skip graph calls
- Follow existing pattern from event-logger.ts:158: "Never block user on network issues"

---

### e021_s03_t03: End-to-end local-only verification (2h)
**Priority:** HIGH
**Status:** [ ]

**Problem:** Need to prove the full local workflow works without any cloud connectivity.
**Solution:** Run complete workflow in a fresh temp directory with zero env vars.

**Approach:**
- Fresh temp dir: git init → ginko init → ginko start → ginko log → ginko handoff → ginko start (resume)
- All steps must complete with zero env vars and no errors
- Document any warnings that appear (acceptable) vs errors (not acceptable)

---

### e021_s03_t04: Document tier model in README (1h)
**Priority:** MEDIUM
**Status:** [ ]

**Problem:** Users need to understand what's free vs what requires Ginko Cloud.
**Solution:** Clear tier comparison in README.

**Approach:**
- Local (free): sessions, handoff, context capture, sprint/task tracking, AI features (BYOK)
- Ginko Cloud (premium): graph sync, team visibility, dashboard, push/pull, coaching insights

---

## Accomplishments This Sprint

[To be filled as work progresses]

## Next Steps

Sprint 4: CI/CD & Testing (e021_s04)

## Blockers

None identified.
