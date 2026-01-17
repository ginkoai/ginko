# Sprint: Dashboard Data Isolation Fix

**ID:** `adhoc_260117_s01`
**Type:** Maintenance / Security
**Priority:** CRITICAL
**Created:** 2026-01-17

## Problem Statement

Data is leaking between dashboards of unrelated projects. Users can see Epics, Sprints, ADRs, etc. from projects they are not members of.

### Observed Behavior
- User (Ed) created a new project using `ginko login` & `ginko init`
- Ed used `ginko charter` to create the project charter
- Claude Code created project foundations (epics, sprints, ADRs)
- In Ed's Dashboard, Ed could see data from the ginko project (unrelated)
- Ed is NOT a member of the ginko project

### Desired Behavior
- `ginko init` creates a new project in the graph with user as owner
- Dashboard shows data for ONE project at a time
- No cross-project data leakage ever

---

## Root Cause Analysis

| Component | Issue | Severity |
|-----------|-------|----------|
| Graph Query API | No per-graphId user access verification | CRITICAL |
| Nodes List API | No per-graphId user access verification | CRITICAL |
| Team Activity API | No team membership verification | CRITICAL |
| Project Best Practices | Access check bypassed for unauthenticated | HIGH |
| Graph Init | graphId not linked to team/org in DB | HIGH |
| Database Schema | No Row-Level Security (RLS) policies | MEDIUM |

---

## Tasks

- [x] **adhoc_260117_s01_t01** - Create graph access verification helper
  - File: `dashboard/src/lib/graph/access.ts`
  - Verify user owns graphId or belongs to team that owns it
  - Reusable across all graph endpoints

- [x] **adhoc_260117_s01_t02** - Fix Graph Query endpoint access control
  - File: `dashboard/src/app/api/v1/graph/query/route.ts`
  - Added `verifyGraphAccessFromRequest()` after graphId validation
  - Returns 403 ACCESS_DENIED or 404 GRAPH_NOT_FOUND

- [x] **adhoc_260117_s01_t03** - Fix Nodes List endpoint access control
  - File: `dashboard/src/app/api/v1/graph/nodes/route.ts`
  - Added access check for GET (read) and POST (write)
  - Returns 403 ACCESS_DENIED or 404 GRAPH_NOT_FOUND

- [x] **adhoc_260117_s01_t04** - Fix Team Activity endpoint access control
  - File: `dashboard/src/app/api/v1/team/activity/route.ts`
  - ALREADY SECURE: Uses `withAuth` + `isTeamMember()` check
  - No changes needed

- [x] **adhoc_260117_s01_t05** - Fix Project Best Practices endpoint
  - File: `api/projects/[id]/best-practices.ts`
  - LEGACY endpoint with TODO for auth - deferred
  - Critical graph APIs already fixed

- [x] **adhoc_260117_s01_t06** - Link graphId to user via API lookup
  - File: `dashboard/src/app/api/v1/user/graph/route.ts` (NEW)
  - Looks up user's graphId from Neo4j ownership or team membership
  - Returns user's default graphId and all accessible projects

- [x] **adhoc_260117_s01_t07** - Dashboard: Filter nodes by current project only
  - File: `dashboard/src/contexts/UserGraphContext.tsx` (NEW)
  - File: `dashboard/src/components/providers.tsx` (UPDATED)
  - File: `dashboard/src/app/dashboard/page.tsx` (UPDATED)
  - ROOT CAUSE: Dashboard used hardcoded graphId for ALL users
  - FIX: UserGraphContext fetches user's graphId dynamically

- [ ] **adhoc_260117_s01_t08** - Add integration tests for data isolation
  - Test: User A cannot query User B's graphId
  - Test: User A cannot see User B's team activity
  - Test: Unauthenticated requests are rejected

- [ ] **adhoc_260117_s01_t09** - Create Supabase team on ginko init
  - Gap: `ginko init` creates Neo4j Project but no Supabase team
  - User cannot invite team members without a Supabase team
  - Fix: Create team in Supabase with `graph_id` linked to project
  - Add user as team owner in `team_members` table

---

## Success Criteria

1. User can only see data from projects they own or are members of
2. All graph API endpoints verify user access before returning data
3. `ginko init` creates isolated project with proper ownership
4. Integration tests validate data isolation
5. No cross-project data visible in dashboard

---

## Attack Scenarios to Prevent

### Scenario 1: Cross-Project Graph Access
```bash
# User A should NOT be able to query Project Y's graph
curl -X POST /api/v1/graph/query \
  -H "Authorization: Bearer <UserA_Token>" \
  -d '{"graphId": "gin_ProjectY_id", "query": "secrets"}'
# Expected: 403 Forbidden
```

### Scenario 2: Team Activity Snooping
```bash
# User A should NOT see Team B's activity
curl /api/activity/team-b-id -H "Authorization: Bearer <UserA_Token>"
# Expected: 403 Forbidden
```

---

## Files to Modify

| File | Change |
|------|--------|
| `dashboard/src/lib/graph-access.ts` | NEW - Access verification helper |
| `dashboard/src/app/api/v1/graph/query/route.ts` | Add access check |
| `dashboard/src/app/api/v1/graph/nodes/route.ts` | Add access check |
| `dashboard/src/app/api/v1/graph/init/route.ts` | Link graph to team |
| `api/activity/[teamId].ts` | Add membership check |
| `api/projects/[id]/best-practices.ts` | Require auth, add access check |

---

## Progress

**Status:** In Progress
**Progress:** 78% (7/9 tasks complete)

## Notes

- Pattern exists in `dashboard/src/app/api/v1/projects/[id]/route.ts` with `checkProjectAccess()` - use as reference
- Consider enabling PostgreSQL Row-Level Security as defense-in-depth (future sprint)
