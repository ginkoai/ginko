# SPRINT: Team Collaboration Sprint 1 - Foundation (Schema & APIs)

## Sprint Overview

**Sprint Goal**: Establish the foundational schema, APIs, and CLI commands for team membership management
**Duration**: 2 weeks (2026-01-06 to 2026-01-17)
**Type**: Infrastructure sprint
**Progress:** 100% (10/10 tasks complete) ✅ CLOSED
**Closed:** 2026-01-03

**Success Criteria:**
- [x] Graph schema supports teams, memberships, and roles
- [x] All team management API endpoints operational
- [x] `ginko invite` and `ginko join` commands functional
- [x] Basic member list visible in dashboard

---

## Sprint Tasks

### e008_s01_t01: Design Team Graph Schema (4h)
**Status:** [x] Complete
**Priority:** HIGH

**Goal:** Define Neo4j schema for teams, memberships, and relationships

**Implementation Notes:**
- Create Team node type with id, name, projectId, createdAt
- Create Membership relationship with role, status, joinedAt, lastActive
- Add indexes for efficient querying by userId, projectId
- Consider future RBAC extensibility in schema design

**Files:**
- `src/graph/schema/XXX-team-membership.cypher` (new)
- `dashboard/src/lib/node-schemas.ts`

Follow: ADR-052 (entity naming)

---

### e008_s01_t02: Create Team Management API Endpoints (8h)
**Status:** [x] Complete
**Priority:** HIGH

**Goal:** Implement CRUD API routes for team membership

**Implementation Notes:**
Endpoints to create:
- `POST /api/v1/team/invite` - Create and send invitation
- `POST /api/v1/team/join` - Accept invitation via code
- `GET /api/v1/team/members` - List team members with status
- `PATCH /api/v1/team/members/:id` - Update member role/status
- `DELETE /api/v1/team/members/:id` - Remove member from team

**Files:**
- `dashboard/src/app/api/v1/team/invite/route.ts` (new)
- `dashboard/src/app/api/v1/team/join/route.ts` (new)
- `dashboard/src/app/api/v1/team/members/route.ts` (new)
- `dashboard/src/app/api/v1/team/members/[id]/route.ts` (new)

Follow: Existing API patterns in dashboard/src/app/api/v1/

---

### e008_s01_t03: Implement Invitation System (6h)
**Status:** [x] Complete
**Priority:** HIGH

**Goal:** Create secure invitation flow with expiring codes

**Implementation Notes:**
- Generate secure invite codes (UUID or similar)
- Store invitations with expiry (7 days default)
- Email notification (integrate with existing email service or defer)
- Invitation states: pending, accepted, expired, revoked

**Files:**
- `dashboard/src/lib/invitation-manager.ts` (new)
- `dashboard/src/app/api/v1/team/invite/route.ts`

---

### e008_s01_t04: Implement `ginko invite` Command (4h)
**Status:** [x] Complete
**Priority:** HIGH

**Goal:** CLI command for project owners to invite team members

**Implementation Notes:**
```bash
ginko invite user@example.com              # Invite as member (default)
ginko invite user@example.com --role owner # Invite as owner
ginko invite --list                        # List pending invitations
ginko invite --revoke <code>               # Revoke invitation
```

**Files:**
- `packages/cli/src/commands/invite/` (new directory)
- `packages/cli/src/commands/invite/invite-command.ts` (new)
- `packages/cli/src/commands/invite/index.ts` (new)
- `packages/cli/src/index.ts` (register command)

Follow: Existing command patterns (see charter, epic commands)

---

### e008_s01_t05: Implement `ginko join` Command (4h)
**Status:** [x] Complete
**Priority:** HIGH

**Goal:** CLI command for users to join a ginko-enabled project

**Implementation Notes:**
```bash
ginko join <invite-code>    # Join via invitation code
ginko join                  # Interactive: prompt for code
```

Flow:
1. Validate invite code against API
2. Clone/access project repository (if not already present)
3. Initialize local ginko state
4. Register membership in graph
5. Run initial sync to load team context

**Files:**
- `packages/cli/src/commands/join/` (new directory)
- `packages/cli/src/commands/join/join-command.ts` (new)
- `packages/cli/src/commands/join/index.ts` (new)
- `packages/cli/src/index.ts` (register command)

---

### e008_s01_t06: Implement `ginko team` Command (3h)
**Status:** [x] Complete (pre-existing)
**Priority:** MEDIUM

**Goal:** CLI command to view team members and their status

**Implementation Notes:**
```bash
ginko team                  # List all team members
ginko team --active         # Show only active members
```

Output format:
```
Team: ginko (5 members)
  chris@watchhill.ai    owner    active    last: 2 hours ago
  dev1@example.com      member   active    last: 1 day ago
  dev2@example.com      member   idle      last: 5 days ago
```

**Files:**
- `packages/cli/src/commands/team/` (new directory)
- `packages/cli/src/commands/team/team-command.ts` (new)
- `packages/cli/src/commands/team/index.ts` (new)

---

### e008_s01_t07: Dashboard Member List Component (6h)
**Status:** [x] Complete
**Priority:** HIGH

**Goal:** Basic team member list in dashboard with status indicators

**Implementation Notes:**
- Display all team members with role badges
- Show last active timestamp
- Visual indicator for online/recent/idle status
- Owner actions: invite button, member management dropdown

**Files:**
- `dashboard/src/components/team/TeamMemberList.tsx` (new)
- `dashboard/src/components/team/MemberCard.tsx` (new)
- `dashboard/src/components/team/InviteButton.tsx` (new)
- `dashboard/src/components/team/index.ts` (new)

---

### e008_s01_t08: Permission Checks Middleware (4h)
**Status:** [x] Complete (built into API routes)
**Priority:** HIGH

**Goal:** Implement owner/member permission validation

**Implementation Notes:**
- Create middleware to check user role on protected endpoints
- Owner-only actions: invite, change roles, remove members, view all insights
- Member actions: view team, view own insights, sync

**Files:**
- `dashboard/src/lib/permissions.ts` (new)
- `dashboard/src/app/api/v1/team/` (apply to routes)

---

### e008_s01_t09: Update `ginko sync` for Team Context (4h)
**Status:** [x] Complete
**Priority:** MEDIUM

**Goal:** Ensure sync loads team-level context and detects staleness

**Implementation Notes:**
- Add team membership check on sync
- Load team-level patterns, gotchas, ADRs
- Show staleness warning if last sync > threshold (configurable)
- Track per-member last sync timestamp

**Files:**
- `packages/cli/src/commands/sync/sync-command.ts`
- `packages/cli/src/commands/sync/team-sync.ts` (new)
- `packages/cli/src/commands/sync/types.ts`
- `dashboard/src/app/api/v1/graph/membership/route.ts` (new)
- `dashboard/src/app/api/v1/graph/membership/sync/route.ts` (new)
- `dashboard/supabase/migrations/20260103_team_sync_tracking.sql` (new)

---

### e008_s01_t10: Integration Tests for Team APIs (4h)
**Status:** [x] Complete
**Priority:** MEDIUM

**Goal:** Test coverage for team management flows

**Implementation Notes:**
- Test invite creation and validation
- Test join flow with valid/invalid/expired codes
- Test permission checks (owner vs member)
- Test member CRUD operations
- Test membership sync endpoints

**Files:**
- `dashboard/src/app/api/v1/team/__tests__/integration/team-management.test.ts` (new)
- `dashboard/src/app/api/v1/graph/membership/__tests__/integration/membership.test.ts` (new)

---

## Accomplishments This Sprint

### 2026-01-03: UAT Bug Fix - Team Members Display
- Fixed team member showing "Unknown" with "??" avatar for users without complete profiles
- Root cause: user_profiles table lacked github_username/full_name for some users
- Solution: API falls back to auth.users.user_metadata via service role client
- Files: dashboard/src/app/api/v1/teams/[id]/members/route.ts

### 2026-01-03: Team Sync Context (t09)
- Implemented team-aware sync with membership verification and staleness detection
- Added `--staleness-days` and `--skip-team-check` CLI options
- Created API endpoints: `/api/v1/graph/membership` and `/api/v1/graph/membership/sync`
- Added database migration for `last_sync_at` tracking on team_members
- Staleness warnings display when sync hasn't occurred in configurable threshold (default: 3 days)
- Files: team-sync.ts, sync-command.ts, types.ts, 2 API routes, 1 migration

### 2026-01-03: Integration Tests for Team APIs (t10)
- Created comprehensive test suite for team management API (invite, join, revoke flows)
- Created test suite for membership sync endpoints (get membership, update sync timestamp)
- Tests cover permission checks, validation, error handling, and edge cases
- Files: team-management.test.ts, membership.test.ts

## Next Steps

Sprint 1 complete. Proceeding to Sprint 2: Team activity feed, staleness detection, conflict prevention.

## Blockers

None - Sprint completed successfully.

---

## Sprint Metadata

**Epic:** EPIC-008 (Team Collaboration)
**Sprint ID:** e008_s01
**Created:** 2026-01-03
**Closed:** 2026-01-03
**Participants:** Chris Norton, Claude
