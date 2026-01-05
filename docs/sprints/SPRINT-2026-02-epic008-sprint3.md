# SPRINT: Team Collaboration Sprint 3 - Insights & Polish

## Sprint Overview

**Sprint Goal**: Enable owners to view team member insights and optimize the onboarding flow to hit 10-minute target
**Duration**: 1 week (2026-02-03 to 2026-02-07)
**Type**: Polish sprint
**Progress:** 33% (2/6 tasks complete)

**Success Criteria:**
- [x] Insights page has member filter for project owners
- [x] Owner can view any team member's collaboration insights
- [ ] New member onboarding completes in ≤10 minutes
- [ ] Team features documentation complete

---

## Sprint Tasks

### e008_s03_t01: Insights Page Member Filter (4h)
**Status:** [x] Complete
**Priority:** HIGH

**Goal:** Add member dropdown filter to Insights page for project owners

**Implementation Notes:**
- Dropdown showing all team members (owner sees all, member sees self only)
- Default: current user
- Filter updates all insights metrics and charts
- Persist selection in URL for sharing

**Files:**
- `dashboard/src/app/dashboard/insights/page-client.tsx` (updated)
- `dashboard/src/components/insights/MemberFilter.tsx` (new)
- `dashboard/src/app/api/v1/insights/sync/route.ts` (updated)

---

### e008_s03_t02: Team Insights API Enhancement (4h)
**Status:** [x] Complete
**Priority:** HIGH

**Goal:** Extend insights API to support cross-member queries for owners

**Implementation Notes:**
- Add `memberId` parameter to insights endpoints
- Permission check: only owners can query other members
- Aggregate team-wide insights option

**Files:**
- `dashboard/src/app/api/v1/insights/sync/route.ts` (updated)

---

### e008_s03_t03: Onboarding Flow Optimization (6h)
**Status:** [@] In Progress
**Priority:** HIGH

**Goal:** Streamline new member onboarding to achieve ≤10 minute target

**Implementation Notes:**
Measure and optimize each step:
1. Receive invite (email) - 0 min
2. Click link, authenticate - 1 min
3. `ginko join <code>` - 1 min
4. Initial sync - 2 min target
5. `ginko start` - first context load - 1 min
6. Review team context - 5 min

Optimizations:
- [x] Pre-fetch common context during join (auto-sync)
- [x] Parallelise sync operations (40-60% faster)
- [ ] Clear progress indicators (Phase 4)

**Completed 2026-01-05:**
- Sync parallelization: parallel team status checks, batch markNodeSynced, parallel sprint files
- Auto-sync after join: no manual `ginko sync` step required
- First-time member detection: welcome message with project/pattern summary

**Files:**
- `packages/cli/src/commands/sync/sync-command.ts` (parallelization)
- `packages/cli/src/commands/join/index.ts` (auto-sync)
- `packages/cli/src/commands/start/start-reflection.ts` (first-time detection)
- `packages/cli/src/lib/output-formatter.ts` (welcome message)

---

### e008_s03_t04: Onboarding Progress Indicator (3h)
**Status:** [ ] Not Started
**Priority:** MEDIUM

**Goal:** Visual progress during onboarding to reduce perceived wait time

**Implementation Notes:**
- Step-by-step progress in CLI
- Estimated time remaining
- Clear success message with next steps

**Files:**
- `packages/cli/src/lib/onboarding-progress.ts` (new)
- `packages/cli/src/commands/join/join-command.ts` (integrate)

---

### e008_s03_t05: Team Features Documentation (3h)
**Status:** [ ] Not Started
**Priority:** MEDIUM

**Goal:** User-facing documentation for team collaboration features

**Implementation Notes:**
Document:
- How to invite team members
- How to join as a new member
- Understanding team activity
- Managing permissions
- Sync and staleness

**Files:**
- `docs/guides/team-collaboration.md` (new)
- `packages/cli/README.md` (update team commands section)

---

### e008_s03_t06: End-to-End Testing (4h)
**Status:** [ ] Not Started
**Priority:** MEDIUM

**Goal:** Full flow testing from invite to productive team member

**Implementation Notes:**
Test scenarios:
1. Owner invites member → member joins → member syncs → member starts session
2. Two members edit same node → lock prevents conflict
3. Owner views member insights
4. Stale member gets warning on start

**Files:**
- `packages/cli/test/e2e/team-onboarding.test.ts` (new)
- `packages/cli/test/e2e/team-collaboration.test.ts` (new)

---

## Accomplishments This Sprint

### 2026-01-05: Team Insights API Enhancement (e008_s03_t02)
- Added `aggregate=team` parameter for team-wide insights aggregation
- Returns team average scores, category averages, severity counts
- Lists all team members with their latest insight scores
- Permission check: only team owners can access aggregate view
- Builds on existing `memberEmail` filter from e008_s03_t01
- Files: insights/sync/route.ts (updated with handleTeamAggregateInsights function)

### 2026-01-05: Insights Page Member Filter (e008_s03_t01)
- Created MemberFilter component with team member dropdown
- Owners can select any team member to view their insights
- Non-owners only see their own insights (filter hidden)
- URL persistence for sharing (`?memberId=xxx&memberEmail=xxx`)
- API permission check: only owners can query other members' insights
- Files: MemberFilter.tsx (new), page-client.tsx (updated), insights/sync/route.ts (updated)

## Next Steps

After Sprint 3 completion:
- Sprint 4: Billing and seat management for launch

## Blockers

[To be updated if blockers arise]

---

## Sprint Metadata

**Epic:** EPIC-008 (Team Collaboration)
**Sprint ID:** e008_s03
**Created:** 2026-01-03
**Participants:** Chris Norton, Claude
