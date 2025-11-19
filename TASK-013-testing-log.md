# TASK-013: Graph Reliability Testing Log

**Started:** 2025-11-19
**Owner:** Chris Norton
**Goal:** Achieve 99.9% graph reliability through systematic testing

---

## Test Environment

- **Mode:** Cloud-only (`GINKO_CLOUD_ONLY=true`)
- **Branch:** main
- **API Endpoint:** `/api/v1/context/initial-load` (consolidated endpoint)
- **Testing Method:** Real-world usage with fail-fast validation

---

## Bugs Discovered

### Bug #1: Events Not Visible After Creation (CRITICAL)

**Discovered:** 2025-11-19 03:45 UTC
**Severity:** CRITICAL
**Status:** Investigating

**Description:**
Events created via `ginko log` in cloud-only mode are not visible in subsequent `ginko start` calls.

**Steps to Reproduce:**
1. Enable cloud-only mode: `export GINKO_CLOUD_ONLY=true`
2. Create event: `ginko log "Test event" --category=insight --impact=low`
3. Observe success message: `[EventLogger] ☁️  Cloud-only: Event synced to graph`
4. Start new session: `ginko start`
5. Observe result: `0 my events (last 0 days)`

**Expected Behavior:**
Event should be visible immediately in the next `ginko start` call.

**Actual Behavior:**
- Event write reports success
- Event read returns 0 events
- Event is NOT visible in resume point

**Root Cause:** ✅ IDENTIFIED

Cloud-only mode implementation is fundamentally broken:

1. **Event write path:** `event-logger.ts` calls `addToQueue(event)` in cloud-only mode
2. **Queue dependency:** `addToQueue()` calls `getUnsyncedEvents()` to check threshold
3. **Local file dependency:** `getUnsyncedEvents()` reads from LOCAL file via `loadEvents()`
4. **No local file:** Cloud-only mode doesn't create local files
5. **Event lost:** `getUnsyncedEvents()` returns empty array, event never synced

**The Flow:**
```
ginko log (cloud-only)
  → event-logger.ts: addToQueue()
    → event-queue.ts: getUnsyncedEvents()
      → event-logger.ts: loadEvents()
        → Read local .jsonl file
        → FILE DOESN'T EXIST (cloud-only mode)
        → Returns []
      → pendingCount = 0
      → Threshold not reached (0 < 5)
      → NO SYNC TRIGGERED
  → Event never written to graph!
```

**Client-Side Fix:** ✅ IMPLEMENTED

Modified `event-logger.ts` to bypass queue in cloud-only mode:
- Calls `createGraphEvents()` directly
- Writes synchronously to `/api/v1/graph/events`
- No dependency on local files

**Status After Fix:**
- ✅ Events write successfully (200 OK response)
- ❌ Events NOT visible in subsequent reads
- **Conclusion:** Server-side bug, events not persisting or not queryable

**Files:**
- `packages/cli/src/lib/event-logger.ts:177-211` (fixed cloud-only write)
- `packages/cli/src/lib/context-loader-events.ts:149-214` (cloud-only read)
- `packages/cli/src/lib/event-queue.ts` (queue implementation)

---

### Bug #2: Events Not Persisted/Queryable on Server (CRITICAL)

**Discovered:** 2025-11-19 03:50 UTC
**Severity:** CRITICAL - BLOCKING
**Status:** Requires server-side investigation

**Description:**
Events successfully written to `/api/v1/graph/events` (200 OK) are not returned by `/api/v1/context/initial-load`.

**Evidence:**
1. Client logs show: `[EventLogger] ☁️  Cloud-only: Event synced to graph`
2. No errors thrown (API returns 200 OK)
3. Subsequent `ginko start` shows: `0 events`
4. Tested with correct `GINKO_GRAPH_ID` set

**Hypothesis:**
1. Events not actually persisting to Neo4j database
2. Write endpoint (`/api/v1/graph/events`) works, but query endpoint (`/api/v1/context/initial-load`) has bug
3. Cache invalidation issue
4. Query filtering out events incorrectly
5. Write and read using different graph partitions

**API Debugging Results:** ✅ COMPLETE

**Write Endpoint (`/api/v1/graph/events`):**
```http
POST https://app.ginkoai.com/api/v1/graph/events
Content-Type: application/json

{
  "graphId": "gin_1762125961056_dg4bsd",
  "events": [{
    "id": "event_1763524621011_11177b7b",
    "user_id": "chris@watchhill.ai",
    "organization_id": "watchhill-ai",
    "project_id": "ginko",
    "category": "insight",
    "description": "...",
    "timestamp": "2025-11-19T03:57:01.011Z",
    "impact": "low",
    "files": [...],
    "branch": "main",
    "shared": false,
    "pressure": 0.5
  }]
}

Response: 201 Created
{
  "created": 1,
  "events": [{
    "id": "event_1763524621011_11177b7b",
    "timestamp": "2025-11-19T03:57:01.011000000Z"
  }]
}
```

**Read Endpoint (`/api/v1/context/initial-load`):**
```http
GET https://app.ginkoai.com/api/v1/context/initial-load?
    cursorId=chronological&
    userId=chris@watchhill.ai&
    projectId=ginko&
    eventLimit=50&
    includeTeam=false&
    teamEventLimit=20&
    teamDays=7&
    documentDepth=2

Response: 200 OK
{
  "cursor": {"id": "chronological", "current_event_id": "chronological"},
  "myEvents": [],  // ❌ EMPTY despite event created above!
  "documents": [],
  "relatedDocs": [],
  "sprint": null,
  "loaded_at": "2025-11-19T03:57:11.481Z",
  "event_count": 0,
  "token_estimate": 0,
  "performance": {
    "queryTimeMs": 465,
    "eventsLoaded": 0,
    "documentsLoaded": 0,
    "relationshipsTraversed": 0
  }
}
```

**Analysis:**
- Write succeeds (201, "created": 1)
- Read returns empty immediately after write (200, "myEvents": [])
- Same userId/projectId in both requests
- Time delta < 20 seconds between write and read
- Performance metrics show query executed (465ms) but found 0 events

**Root Cause Hypotheses:**
1. **Write-Read inconsistency**: Different data stores or partitions
2. **Async persistence**: 201 returned before Neo4j commit complete
3. **Query bug**: Initial-load endpoint filters events incorrectly
4. **Schema mismatch**: Event structure doesn't match query expectations
5. **Cache staleness**: Read hitting stale cache layer

**Server-Side Investigation Required:**
1. Check Neo4j database directly for event node with ID `event_1763524621011_11177b7b`
2. Review `/api/v1/graph/events` persistence logic (is commit synchronous?)
3. Review `/api/v1/context/initial-load` query Cypher statement
4. Check if graphId parameter is being used in query filtering
5. Test with freshly created graphId to rule out data corruption

**Impact:**
Blocks all cloud-only mode testing until resolved. Cannot validate any other scenarios without event visibility.

**Workaround:**
None available - both cloud-only and dual-write modes rely on graph API for reads.

---

## Testing Scenarios

### Scenario 1: Basic Event Creation and Visibility
**Status:** ❌ FAILED (Bug #1)

- [x] Event created successfully
- [ ] Event visible in next `ginko start`
- [ ] Event contains correct metadata
- [ ] Event timestamp accurate

### Scenario 2: Multiple Rapid Events
**Status:** ⏭️ BLOCKED (depends on Bug #1 fix)

### Scenario 3: Network Interruption Handling
**Status:** ⏭️ BLOCKED (depends on Bug #1 fix)

### Scenario 4: API Failure Handling
**Status:** ⏭️ PENDING

### Scenario 5: Team Collaboration
**Status:** ⏭️ PENDING

---

## Metrics

**Reliability Score:** 0% (0/1 tests passing)
**Critical Bugs:** 1
**High Priority Bugs:** 0
**Medium Priority Bugs:** 0

**Target:** 99.9% reliability (all scenarios passing)

---

## Notes

- Cloud-only mode is correctly preventing local file writes (no `.jsonl` file created)
- Event queue reports success, but unclear if synchronous or async
- Need to add detailed logging to trace event write/read path

