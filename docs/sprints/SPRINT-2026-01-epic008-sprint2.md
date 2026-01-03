# SPRINT: Team Collaboration Sprint 2 - Visibility & Coordination

## Sprint Overview

**Sprint Goal**: Enable team visibility (who's working on what) and prevent conflicts on concurrent edits
**Duration**: 2 weeks (2026-01-20 to 2026-01-31)
**Type**: Feature sprint
**Progress:** 0% (0/8 tasks complete)

**Success Criteria:**
- [ ] Team activity feed shows real-time member activity
- [ ] Dashboard displays who's working on what
- [ ] Staleness detection warns members with outdated context
- [ ] Zero conflicts on concurrent knowledge edits (lock-based prevention)

---

## Sprint Tasks

### e008_s02_t01: Team Activity Feed API (6h)
**Status:** [ ] Not Started
**Priority:** HIGH

**Goal:** API endpoint to retrieve team member activity stream

**Implementation Notes:**
- Aggregate events across team members
- Filter by time range, member, event type
- Support pagination for large teams
- Return: member, action, target, timestamp

**Files:**
- `dashboard/src/app/api/v1/team/activity/route.ts` (new)

---

### e008_s02_t02: Team Activity Feed Component (8h)
**Status:** [ ] Not Started
**Priority:** HIGH

**Goal:** Dashboard component showing team activity stream

**Implementation Notes:**
- Real-time updates (polling or SSE)
- Filter by member, action type
- Grouped by time (today, yesterday, this week)
- Click to view details or jump to related item

**Files:**
- `dashboard/src/components/team/TeamActivityFeed.tsx` (new)
- `dashboard/src/components/team/ActivityItem.tsx` (new)

---

### e008_s02_t03: "Who's Working On What" Dashboard View (6h)
**Status:** [ ] Not Started
**Priority:** HIGH

**Goal:** Visual display of current team member assignments and activity

**Implementation Notes:**
- Show each member with their current task (if any)
- Status indicators: active (green), idle (yellow), offline (gray)
- Click member to see recent activity
- Integrate with sprint task assignments

**Files:**
- `dashboard/src/components/team/TeamWorkboard.tsx` (new)
- `dashboard/src/components/team/MemberActivity.tsx` (new)

---

### e008_s02_t04: Staleness Detection System (6h)
**Status:** [ ] Not Started
**Priority:** HIGH

**Goal:** Detect and warn when member's local context is stale

**Implementation Notes:**
- Track last sync timestamp per member in graph
- Compare against team's latest changes
- Configurable staleness threshold (default: 24h for active, 7d for occasional)
- Warning in CLI on `ginko start` and dashboard banner

**Files:**
- `packages/cli/src/lib/staleness-detector.ts` (new)
- `packages/cli/src/commands/start/start-reflection.ts` (update)
- `dashboard/src/components/team/StalenessWarning.tsx` (new)

---

### e008_s02_t05: Conflict Prevention - Edit Locking (8h)
**Status:** [ ] Not Started
**Priority:** HIGH

**Goal:** Prevent conflicts by locking knowledge nodes during edit

**Implementation Notes:**
- Acquire lock when user starts editing (dashboard or CLI)
- Lock includes: userId, timestamp, expiry (15 min auto-release)
- Show "being edited by X" indicator to other users
- Release lock on save or timeout
- Graceful handling if lock holder disconnects

**Files:**
- `dashboard/src/lib/edit-lock-manager.ts` (new)
- `dashboard/src/app/api/v1/graph/lock/route.ts` (new)
- `dashboard/src/components/graph/NodeEditor.tsx` (update)

---

### e008_s02_t06: Conflict Prevention - Merge Strategy (6h)
**Status:** [ ] Not Started
**Priority:** MEDIUM

**Goal:** Handle edge cases where locks fail and concurrent edits occur

**Implementation Notes:**
- Detect conflict on save (version mismatch)
- Show diff between versions
- Options: keep mine, keep theirs, manual merge
- Log conflict events for debugging

**Files:**
- `dashboard/src/lib/merge-resolver.ts` (new)
- `dashboard/src/components/graph/ConflictResolver.tsx` (new)

---

### e008_s02_t07: Enhanced Sync with Team Awareness (4h)
**Status:** [ ] Not Started
**Priority:** MEDIUM

**Goal:** Make `ginko sync` team-aware with improved feedback

**Implementation Notes:**
- Show team changes since last sync
- Highlight changes by other members
- Summary: "3 ADRs updated by chris@, 1 Pattern added by dev1@"
- Option: `ginko sync --preview` for dry run

**Files:**
- `packages/cli/src/commands/sync/sync-command.ts` (update)
- `packages/cli/src/lib/team-sync-reporter.ts` (new)

---

### e008_s02_t08: Full Dashboard Member Management UI (6h)
**Status:** [ ] Not Started
**Priority:** MEDIUM

**Goal:** Complete CRUD interface for team members in dashboard

**Implementation Notes:**
- Invite modal with email input and role selection
- Member detail view with activity history
- Actions: change role, suspend, remove (with confirmation)
- Pending invitations list with revoke option

**Files:**
- `dashboard/src/components/team/InviteModal.tsx` (new)
- `dashboard/src/components/team/MemberDetailView.tsx` (new)
- `dashboard/src/components/team/PendingInvitations.tsx` (new)

---

## Accomplishments This Sprint

[To be filled as work progresses]

## Next Steps

After Sprint 2 completion:
- Sprint 3: Insights member filter, onboarding optimization
- Sprint 4: Billing and seat management

## Blockers

[To be updated if blockers arise]

---

## Sprint Metadata

**Epic:** EPIC-008 (Team Collaboration)
**Sprint ID:** e008_s02
**Created:** 2026-01-03
**Participants:** Chris Norton, Claude
