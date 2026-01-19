# SPRINT: EPIC-015 Sprint 2 - Graph-First Reading

## Sprint Overview

**Sprint Goal**: Update `ginko start` to read status from graph only
**Duration**: 1.5 weeks
**Type**: Refactoring sprint
**Progress:** 0% (0/7 tasks complete)
**Prerequisite:** Sprint 1 complete (CLI status commands work)

**Success Criteria:**
- [ ] `ginko start` shows correct status from graph (not files)
- [ ] No sprint file parsing for status
- [ ] Offline mode works with cached state + stale warning
- [ ] Status display latency < 500ms
- [ ] Queued offline updates sync automatically

---

## Sprint Tasks

### e015_s02_t01: Enhance GET /api/v1/sprint/active Endpoint (3h)
**Status:** [ ] Not Started
**Priority:** HIGH
**Assignee:** TBD

**Goal:** Create or enhance API endpoint to return active sprint with full task status

**Implementation:**
1. Create/modify GET /api/v1/sprint/active endpoint
2. Return active sprint with all tasks and their statuses
3. Include progress calculation (complete/total)
4. Return next recommended task

**Response Schema:**
```typescript
interface ActiveSprintResponse {
  sprint: {
    id: string;           // e015_s02
    title: string;        // "Graph-First Reading"
    epic_id: string;      // EPIC-015
    status: SprintStatus; // "active"
    progress: {
      complete: number;   // 3
      total: number;      // 7
      percent: number;    // 43
    };
  };
  tasks: Array<{
    id: string;           // e015_s02_t01
    title: string;
    status: TaskStatus;   // "complete" | "in_progress" | "blocked" | "not_started"
    blocked_reason?: string;
    assignee?: string;
  }>;
  next_task?: {
    id: string;
    title: string;
    continue: boolean;    // true if was in_progress
  };
  blocked_tasks: Array<{
    id: string;
    title: string;
    reason: string;
  }>;
}
```

**Files:**
- Create/Modify: `dashboard/src/app/api/v1/sprint/active/route.ts`
- Modify: `dashboard/src/lib/graph/queries.ts` - Add active sprint query

**Acceptance Criteria:**
- [ ] Endpoint returns active sprint with tasks
- [ ] All task statuses come from graph (not computed)
- [ ] Progress calculated from graph status
- [ ] Next task identified (in_progress or first not_started)
- [ ] Response time < 200ms

---

### e015_s02_t02: Remove Status Parsing from sprint-loader.ts (4h)
**Status:** [ ] Not Started
**Priority:** HIGH
**Assignee:** TBD

**Goal:** Remove markdown checkbox parsing for status, keep content loading only

**Current Behavior:**
```typescript
// sprint-loader.ts currently parses:
// - [x] Task complete
// - [ ] Task not started
// - [@] Task in progress
```

**New Behavior:**
- Sprint loader only loads content (title, description, acceptance criteria)
- Status comes from graph API call
- Remove checkbox pattern matching

**Implementation:**
1. Identify all status parsing code in sprint-loader.ts
2. Remove checkbox pattern matching
3. Remove status-related fields from local sprint type
4. Keep content loading for offline/fallback

**Code Changes:**
```typescript
// REMOVE
function parseTaskStatus(line: string): TaskStatus {
  if (line.includes('[x]')) return 'complete';
  if (line.includes('[@]')) return 'in_progress';
  // ...
}

// KEEP (content only)
function loadSprintContent(filePath: string): SprintContent {
  return {
    id: extractId(filePath),
    title: extractTitle(content),
    tasks: extractTaskDefinitions(content), // No status!
  };
}
```

**Files:**
- Modify: `packages/cli/src/lib/sprint-loader.ts`
- Modify: `packages/cli/src/types/sprint.ts` - Remove status from local types

**Acceptance Criteria:**
- [ ] No checkbox parsing in sprint-loader.ts
- [ ] Content (titles, descriptions) still loads from files
- [ ] Status-related code removed cleanly
- [ ] No regression in sprint content loading

---

### e015_s02_t03: Update start-reflection.ts for Graph-Only Status (4h)
**Status:** [ ] Not Started
**Priority:** HIGH
**Assignee:** TBD

**Goal:** Refactor start command to fetch status exclusively from graph

**Current Flow:**
```
ginko start
├── Load sprint file (content + status)
├── Parse checkboxes for status
└── Display combined view
```

**New Flow:**
```
ginko start
├── Fetch GET /api/v1/sprint/active (status from graph)
├── Load sprint file (content only, for offline)
├── Merge: graph status + file content
└── Display combined view
```

**Implementation:**
1. Add graph API call at start of start-reflection
2. Use graph status as authoritative
3. Fall back to cached status if offline
4. Display stale indicator if using cache

**Code Changes:**
```typescript
// start-reflection.ts
async function loadSprintState(): Promise<SprintState> {
  try {
    // Primary: Graph API
    const graphState = await graphClient.getActiveSprint();
    await cacheState(graphState);
    return graphState;
  } catch (error) {
    // Fallback: Local cache
    const cached = await loadCachedState();
    if (cached) {
      cached.stale = true;
      return cached;
    }
    throw new Error('No sprint state available (offline, no cache)');
  }
}
```

**Files:**
- Modify: `packages/cli/src/commands/start/start-reflection.ts`
- Modify: `packages/cli/src/lib/sprint-loader.ts` - Content only
- Create: `packages/cli/src/lib/graph-sprint-client.ts`

**Acceptance Criteria:**
- [ ] Status comes from graph API
- [ ] File content used for descriptions
- [ ] Offline uses cached state with warning
- [ ] No regression in start command output

---

### e015_s02_t04: Implement Local State Cache (3h)
**Status:** [ ] Not Started
**Priority:** HIGH
**Assignee:** TBD

**Goal:** Cache graph state locally for offline use

**Implementation:**
1. Create state cache file at `.ginko/state-cache.json`
2. Update cache after each successful graph fetch
3. Include timestamp for staleness detection
4. Load from cache when graph unavailable

**Cache Schema:**
```typescript
// .ginko/state-cache.json
interface StateCache {
  version: 1;
  fetched_at: string;        // ISO timestamp
  active_sprint: {
    id: string;
    title: string;
    progress: { complete: number; total: number; percent: number };
    tasks: Array<{
      id: string;
      title: string;
      status: TaskStatus;
      blocked_reason?: string;
    }>;
    next_task?: { id: string; title: string; continue: boolean };
  };
}
```

**Staleness Rules:**
- Fresh: < 5 minutes
- Stale: 5 minutes - 24 hours (show warning)
- Expired: > 24 hours (force refresh if possible)

**Files:**
- Create: `packages/cli/src/lib/state-cache.ts`
- Modify: `packages/cli/src/commands/start/start-reflection.ts`

**Acceptance Criteria:**
- [ ] Cache updates on successful graph fetch
- [ ] Cache loads when graph unavailable
- [ ] Staleness calculated from timestamp
- [ ] Cache file is .gitignored

---

### e015_s02_t05: Add Offline Mode with Stale Indicator (3h)
**Status:** [ ] Not Started
**Priority:** MEDIUM
**Assignee:** TBD

**Goal:** Show clear offline/stale indicators in ginko start output

**Implementation:**
1. Detect offline state (graph API fails)
2. Show warning banner when using cached state
3. Show staleness age in human-readable format
4. Indicate which data is from cache vs fresh

**Display Examples:**
```
# Online (fresh)
┌─────────────────────────────────────────────────────────────────────────┐
│  ginko     Ready │ Hot (10/10) │ Think & Build                          │
├─────────────────────────────────────────────────────────────────────────┤
│  Sprint: e015_s02 - Graph-First Reading                    43% [3/7]    │
│  Next: e015_s02_t04 - Implement local state cache                       │
└─────────────────────────────────────────────────────────────────────────┘

# Offline (cached)
┌─────────────────────────────────────────────────────────────────────────┐
│  ginko     ⚠️ Offline │ Using cached state (15 min ago)                 │
├─────────────────────────────────────────────────────────────────────────┤
│  Sprint: e015_s02 - Graph-First Reading                    43% [3/7]    │
│  Next: e015_s02_t04 - Implement local state cache                       │
│  ⚠️ Status may be outdated. Run `ginko sync` when online.               │
└─────────────────────────────────────────────────────────────────────────┘
```

**Files:**
- Modify: `packages/cli/src/commands/start/start-reflection.ts`
- Modify: `packages/cli/src/lib/display-utils.ts` (or similar)

**Acceptance Criteria:**
- [ ] Offline state clearly indicated
- [ ] Staleness age shown
- [ ] Actionable message (run ginko sync)
- [ ] Fresh state shows no warning

---

### e015_s02_t06: Add Queued Status Updates for Offline (4h)
**Status:** [ ] Not Started
**Priority:** MEDIUM
**Assignee:** TBD

**Goal:** Queue status updates when offline, sync when back online

**Implementation:**
1. Detect offline when status update fails
2. Save update to offline queue
3. Show queued indicator to user
4. Process queue on next successful graph connection

**Queue Storage:**
```typescript
// .ginko/pending-updates.json
interface OfflineQueue {
  version: 1;
  updates: Array<{
    id: string;           // unique update ID
    entity_type: 'task' | 'sprint' | 'epic';
    entity_id: string;    // e015_s02_t01
    status: string;
    reason?: string;
    queued_at: string;
  }>;
}
```

**User Experience:**
```bash
# Offline update
ginko task complete e015_s02_t01
# Output: ✓ Task e015_s02_t01 marked complete (queued - offline)
#         Will sync when back online.

# Coming back online
ginko start
# Output: Syncing 2 queued updates...
#         ✓ e015_s02_t01 → complete
#         ✓ e015_s02_t02 → in_progress
#         Done.
```

**Conflict Resolution:**
- If graph state changed while offline, show conflict
- Default: Local wins (user's intent)
- Option: `--force-remote` to discard local

**Files:**
- Create: `packages/cli/src/lib/offline-queue.ts`
- Modify: `packages/cli/src/commands/task/status.ts`
- Modify: `packages/cli/src/commands/start/start-reflection.ts`

**Acceptance Criteria:**
- [ ] Updates queue when offline
- [ ] Queue processes on next online connection
- [ ] Conflicts detected and reported
- [ ] Queue file is .gitignored

---

### e015_s02_t07: Integration Tests for Graph-First Flow (3h)
**Status:** [ ] Not Started
**Priority:** MEDIUM
**Assignee:** TBD

**Goal:** End-to-end tests for new graph-first status flow

**Test Scenarios:**

1. **Online Happy Path**
   - `ginko start` fetches from graph
   - Status displays correctly
   - Cache updated

2. **Offline with Cache**
   - Graph API fails
   - Cached state loads
   - Stale warning displays
   - Commands queue updates

3. **Cache Expired**
   - Graph API fails
   - Cache > 24 hours old
   - Appropriate error message

4. **Queue Processing**
   - Queue offline updates
   - Come back online
   - Updates sync successfully
   - Queue cleared

5. **Conflict Detection**
   - Queue update offline
   - Same entity updated elsewhere
   - Conflict detected on sync

**Files:**
- Create: `packages/cli/src/commands/start/__tests__/graph-first.test.ts`
- Create: `packages/cli/src/lib/__tests__/state-cache.test.ts`
- Create: `packages/cli/src/lib/__tests__/offline-queue.test.ts`

**Acceptance Criteria:**
- [ ] All test scenarios pass
- [ ] Mocked graph API for offline tests
- [ ] Edge cases covered (empty cache, corrupt cache)
- [ ] Test coverage >80% for new code

---

## Technical Notes

### Migration Path

During this sprint, both systems coexist:
1. Graph API is authoritative for status
2. Sprint files still exist for content
3. Old checkbox syntax ignored (not parsed)

Full file migration happens in Sprint 3.

### Performance Considerations

Graph API call should be fast:
```
Target: < 200ms for /api/v1/sprint/active
```

If slow, consider:
- Caching active sprint ID
- Parallel fetch (sprint + tasks)
- Edge caching

### Error Handling

```typescript
try {
  const state = await graphClient.getActiveSprint();
} catch (error) {
  if (error.code === 'ECONNREFUSED') {
    // Offline - use cache
  } else if (error.status === 404) {
    // No active sprint
  } else {
    // Unknown error - log and fallback
  }
}
```

---

## Dependencies

- Sprint 1 complete (CLI status commands)
- Graph API endpoints working
- Existing start command infrastructure

---

## Sprint Metadata

**Epic:** EPIC-015 (Graph-Authoritative Operational State)
**Sprint ID:** e015_s02
**ADR:** ADR-060 Content/State Separation
**Started:** TBD
**Participants:** TBD
