# SPRINT: Team Collaboration Sprint 2 - Visibility & Coordination

## Sprint Overview

**Sprint Goal**: Enable team visibility (who's working on what) and prevent conflicts on concurrent edits
**Duration**: 2 weeks (2026-01-03 to 2026-01-17)
**Type**: Feature sprint
**Progress:** 100% (8/8 tasks complete)

**Success Criteria:**
- [x] Team activity feed shows real-time member activity
- [x] Dashboard displays who's working on what
- [x] Staleness detection warns members with outdated context
- [x] Zero conflicts on concurrent knowledge edits (lock-based prevention)

---

## Sprint Tasks

### e008_s02_t01: Team Activity Feed API (6h)
**Status:** [x] Complete
**Priority:** HIGH

**Goal:** API endpoint to retrieve team member activity stream

**Implementation Notes:**
```typescript
// GET /api/v1/team/activity?team_id=...&limit=50&since=...
interface ActivityItem {
  id: string;
  member: { user_id: string; email: string; avatar_url?: string };
  action: 'synced' | 'edited' | 'created' | 'logged';
  target_type: 'ADR' | 'Pattern' | 'Sprint' | 'Event';
  target_id: string;
  target_title?: string;
  timestamp: string;
}
```
- Use `withAuth` from `/dashboard/src/lib/auth/middleware.ts`
- Query Neo4j for Events by graph_id
- Support filtering: `member_id`, `category`, `since`, `limit/offset`
- Return pagination info (`hasMore`, `count`)

**Files:**
- `dashboard/src/app/api/v1/team/activity/route.ts` (new)

---

### e008_s02_t02: Team Activity Feed Component (8h)
**Status:** [x] Complete
**Priority:** HIGH
**Depends:** t01

**Goal:** Dashboard component showing team activity stream

**Implementation Notes:**
```typescript
interface TeamActivityFeedProps {
  teamId: string;
  graphId: string;
  refreshInterval?: number;  // default 30000ms
  maxItems?: number;
}
```
- Polling with setInterval (30s default)
- Group by time: Today, Yesterday, This Week
- Filter controls: member dropdown, action type chips
- Use Avatar, Badge components from ui/

**Files:**
- `dashboard/src/components/team/TeamActivityFeed.tsx` (new)
- `dashboard/src/components/team/ActivityItem.tsx` (new)

---

### e008_s02_t03: "Who's Working On What" Dashboard View (6h)
**Status:** [x] Complete
**Priority:** HIGH
**Depends:** t01

**Goal:** Visual display of current team member assignments and activity

**Implementation Notes:**
```typescript
interface MemberStatus {
  member: TeamMember;
  status: 'active' | 'idle' | 'offline';  // <5min, <1h, >1h
  currentTask?: { id: string; title: string };
  lastActivity?: string;
}
```
- Grid layout: `grid-cols-1 md:grid-cols-2 lg:grid-cols-3`
- Status indicators: green (active), yellow (idle), gray (offline)
- Click member to expand recent activity

**Files:**
- `dashboard/src/components/team/TeamWorkboard.tsx` (new)
- `dashboard/src/components/team/MemberActivity.tsx` (new)

---

### e008_s02_t04: Staleness Detection System (6h)
**Status:** [x] Complete
**Priority:** HIGH

**Goal:** Detect and warn when member's local context is stale

**Implementation Notes:**
```typescript
interface StalenessResult {
  isStale: boolean;
  severity: 'none' | 'warning' | 'critical';
  daysSinceSync: number;
  changedSinceSync: { adrs: number; patterns: number; total: number };
  message: string;
}
```
- Thresholds: warning=1 day, critical=7 days
- CLI: Show warning on `ginko start` if stale
- Dashboard: Banner with dismiss option
- Build on existing `team-sync.ts` logic

**Files:**
- `packages/cli/src/lib/staleness-detector.ts` (new)
- `packages/cli/src/commands/start/start-reflection.ts` (update)
- `dashboard/src/components/team/StalenessWarning.tsx` (new)

---

### e008_s02_t05: Conflict Prevention - Edit Locking (8h)
**Status:** [x] Complete
**Priority:** HIGH

**Goal:** Prevent conflicts by locking knowledge nodes during edit

**Implementation Notes:**
```typescript
interface EditLock {
  nodeId: string;
  userId: string;
  userEmail: string;
  acquiredAt: string;
  expiresAt: string;  // 15 min auto-expire
}

interface LockResult {
  success: boolean;
  lock?: EditLock;
  heldBy?: { userId: string; email: string; since: string };
}
```
- Store in Supabase `node_locks` table (needs migration)
- Auto-expire after 15 minutes
- NodeEditor: acquire on mount, release on unmount/save
- Show "Editing by X" badge if locked

**Migration:**
```sql
CREATE TABLE node_locks (
  node_id TEXT NOT NULL,
  graph_id TEXT NOT NULL,
  user_id UUID NOT NULL,
  user_email TEXT NOT NULL,
  acquired_at TIMESTAMPTZ DEFAULT NOW(),
  expires_at TIMESTAMPTZ NOT NULL,
  PRIMARY KEY (node_id, graph_id)
);
```

**Files:**
- `dashboard/src/lib/edit-lock-manager.ts` (new)
- `dashboard/src/app/api/v1/graph/lock/route.ts` (new)
- `dashboard/src/components/graph/NodeEditor.tsx` (update)
- `dashboard/supabase/migrations/20260103_node_locks.sql` (new)

---

### e008_s02_t06: Conflict Prevention - Merge Strategy (6h)
**Status:** [x] Complete
**Priority:** MEDIUM
**Depends:** t05

**Goal:** Handle edge cases where locks fail and concurrent edits occur

**Implementation Notes:**
```typescript
interface ConflictInfo {
  nodeId: string;
  localVersion: { content: string; editedBy: string; hash: string };
  remoteVersion: { content: string; editedBy: string; hash: string };
}

interface ConflictResolverProps {
  conflict: ConflictInfo;
  onResolve: (resolution: 'use-local' | 'use-remote' | 'manual') => void;
}
```
- Side-by-side diff view
- Options: "Keep Mine", "Keep Theirs", "Manual Edit"
- Modal triggered on version mismatch during save

**Files:**
- `dashboard/src/lib/merge-resolver.ts` (new)
- `dashboard/src/components/graph/ConflictResolver.tsx` (new)

---

### e008_s02_t07: Enhanced Sync with Team Awareness (4h)
**Status:** [x] Complete
**Priority:** MEDIUM
**Depends:** t04

**Goal:** Make `ginko sync` team-aware with improved feedback

**Implementation Notes:**
```typescript
interface TeamChangeSummary {
  byMember: Map<string, { email: string; changes: { type: string; count: number }[] }>;
  totalChanges: number;
}
```
- Show team changes before sync: "3 ADRs updated by chris@, 1 Pattern by dev1@"
- Add `--preview` flag for dry run
- Integrate staleness warnings

**Files:**
- `packages/cli/src/lib/team-sync-reporter.ts` (new)
- `packages/cli/src/commands/sync/sync-command.ts` (update)

---

### e008_s02_t08: Full Dashboard Member Management UI (6h)
**Status:** [x] Complete
**Priority:** MEDIUM

**Goal:** Complete CRUD interface for team members in dashboard

**Implementation Notes:**
- InviteModal: Standalone invite form extracted from InviteButton
- MemberDetailView: Slide-over with activity history, role change, remove action
- PendingInvitations: List with revoke buttons, expiry countdown
- Uses existing APIs: `/api/v1/team/invite`, `/api/v1/teams/[id]/members`

**Files:**
- `dashboard/src/components/team/InviteModal.tsx` (new)
- `dashboard/src/components/team/MemberDetailView.tsx` (new)
- `dashboard/src/components/team/PendingInvitations.tsx` (new)

---

## Execution Plan

**Wave 1 (Parallel - No Dependencies):**
- t01: Team Activity Feed API
- t04: Staleness Detection System
- t05: Edit Locking API + Migration
- t08: Member Management UI

**Wave 2 (After Wave 1):**
- t02: Activity Feed Component (after t01)
- t03: Workboard Component (after t01)
- t06: Merge Strategy (after t05)

**Wave 3 (After Wave 2):**
- t07: Enhanced Sync (after t04)

---

## Accomplishments This Sprint

### 2026-01-03: Sprint 2 Complete - All 8 Tasks Done

**Wave 1 (Parallel):**
- **t01**: Team Activity Feed API - `GET /api/v1/team/activity` with filtering, pagination, member enrichment
- **t04**: Staleness Detection - CLI + Dashboard warning system with configurable thresholds
- **t05**: Edit Locking - `node_locks` table, API, EditLockManager, NodeEditor integration
- **t08**: Member Management UI - InviteModal, MemberDetailView, PendingInvitations components

**Wave 2 (Parallel):**
- **t02**: Activity Feed Component - TeamActivityFeed with polling, time grouping, filters
- **t03**: Team Workboard - "Who's Working On What" view with status indicators (active/idle/offline)
- **t06**: Merge Strategy - ConflictResolver modal with side-by-side diff, three resolution options

**Wave 3:**
- **t07**: Enhanced Sync - `--preview` flag, team change summary before sync

**Files Created (17 new files):**
- `dashboard/src/app/api/v1/team/activity/route.ts`
- `dashboard/src/app/api/v1/graph/lock/route.ts`
- `dashboard/src/lib/edit-lock-manager.ts`
- `dashboard/src/lib/merge-resolver.ts`
- `dashboard/src/components/team/TeamActivityFeed.tsx`
- `dashboard/src/components/team/ActivityItem.tsx`
- `dashboard/src/components/team/TeamWorkboard.tsx`
- `dashboard/src/components/team/MemberActivity.tsx`
- `dashboard/src/components/team/StalenessWarning.tsx`
- `dashboard/src/components/team/InviteModal.tsx`
- `dashboard/src/components/team/MemberDetailView.tsx`
- `dashboard/src/components/team/PendingInvitations.tsx`
- `dashboard/src/components/graph/ConflictResolver.tsx`
- `dashboard/supabase/migrations/20260103_node_locks.sql`
- `packages/cli/src/lib/staleness-detector.ts`
- `packages/cli/src/lib/team-sync-reporter.ts`

**Files Modified:**
- `packages/cli/src/commands/start/start-reflection.ts` - staleness check integration
- `packages/cli/src/commands/sync/sync-command.ts` - team change summary, --preview flag
- `dashboard/src/components/graph/NodeEditor.tsx` - edit locking integration

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
**Started:** 2026-01-03
**Participants:** Chris Norton, Claude
