# SPRINT: EPIC-015 Sprint 0 - API Foundation

## Sprint Overview

**Sprint Goal**: Add graph API endpoints for status updates
**Duration**: 1 week
**Type**: Foundation sprint
**Progress:** 0% (0/6 tasks complete)
**Prerequisite:** None

**Success Criteria:**
- [ ] PATCH endpoints exist for task, sprint, and epic status
- [ ] Status changes emit events to event log
- [ ] Status history queryable via GET endpoints
- [ ] API tests pass with >90% coverage
- [ ] OpenAPI documentation updated

---

## Sprint Tasks

### e015_s00_t01: PATCH /api/v1/task/{id}/status Endpoint (3h)
**Status:** [ ] Not Started
**Priority:** HIGH
**Assignee:** TBD

**Goal:** Create API endpoint to update task status directly in graph

**Implementation:**
1. Create new route handler at `dashboard/src/app/api/v1/task/[id]/status/route.ts`
2. Accept PATCH with body: `{ status: "complete" | "in_progress" | "blocked" | "not_started" }`
3. Validate task exists before updating
4. Update Neo4j node with new status and timestamp
5. Return updated task node

**Valid Status Values:**
- `not_started` - Task pending
- `in_progress` - Task actively being worked on
- `blocked` - Task blocked with optional reason
- `complete` - Task finished

**Request/Response:**
```typescript
// PATCH /api/v1/task/{id}/status
// Request body:
{
  status: "complete",
  reason?: string  // Required for "blocked" status
}

// Response:
{
  id: "e015_s00_t01",
  status: "complete",
  status_updated_at: "2026-01-19T10:30:00Z",
  status_updated_by: "user@example.com"
}
```

**Files:**
- Create: `dashboard/src/app/api/v1/task/[id]/status/route.ts`
- Modify: `dashboard/src/lib/graph/api-client.ts` - Add updateTaskStatus method

**Acceptance Criteria:**
- [ ] PATCH request updates task status in Neo4j
- [ ] Invalid status values return 400 error
- [ ] Missing task returns 404 error
- [ ] Blocked status requires reason field
- [ ] Response includes updated timestamp

---

### e015_s00_t02: PATCH /api/v1/sprint/{id}/status Endpoint (2h)
**Status:** [ ] Not Started
**Priority:** HIGH
**Assignee:** TBD

**Goal:** Create API endpoint to update sprint status directly in graph

**Implementation:**
1. Create route handler at `dashboard/src/app/api/v1/sprint/[id]/status/route.ts`
2. Accept PATCH with body: `{ status: "active" | "complete" | "paused" | "planned" }`
3. Validate sprint exists before updating
4. Update Neo4j node with new status and timestamp
5. Return updated sprint node

**Valid Status Values:**
- `planned` - Sprint not yet started
- `active` - Sprint in progress
- `paused` - Sprint temporarily on hold
- `complete` - Sprint finished

**Files:**
- Create: `dashboard/src/app/api/v1/sprint/[id]/status/route.ts`
- Modify: `dashboard/src/lib/graph/api-client.ts` - Add updateSprintStatus method

**Acceptance Criteria:**
- [ ] PATCH request updates sprint status in Neo4j
- [ ] Invalid status values return 400 error
- [ ] Missing sprint returns 404 error
- [ ] Response includes updated timestamp

---

### e015_s00_t03: PATCH /api/v1/epic/{id}/status Endpoint (2h)
**Status:** [ ] Not Started
**Priority:** HIGH
**Assignee:** TBD

**Goal:** Create API endpoint to update epic status directly in graph

**Implementation:**
1. Create route handler at `dashboard/src/app/api/v1/epic/[id]/status/route.ts`
2. Accept PATCH with body: `{ status: "active" | "complete" | "paused" | "proposed" }`
3. Validate epic exists before updating
4. Update Neo4j node with new status and timestamp
5. Return updated epic node

**Valid Status Values:**
- `proposed` - Epic under consideration
- `active` - Epic in progress
- `paused` - Epic temporarily on hold
- `complete` - Epic finished

**Files:**
- Create: `dashboard/src/app/api/v1/epic/[id]/status/route.ts`
- Modify: `dashboard/src/lib/graph/api-client.ts` - Add updateEpicStatus method

**Acceptance Criteria:**
- [ ] PATCH request updates epic status in Neo4j
- [ ] Invalid status values return 400 error
- [ ] Missing epic returns 404 error
- [ ] Response includes updated timestamp

---

### e015_s00_t04: Status Change Event Emission (3h)
**Status:** [ ] Not Started
**Priority:** HIGH
**Assignee:** TBD

**Goal:** Emit events when status changes for future webhook/notification support

**Implementation:**
1. Create status change event type
2. Emit event after each status update in all PATCH handlers
3. Store events in event log (existing infrastructure)
4. Include old status, new status, who changed, when

**Event Schema:**
```typescript
interface StatusChangeEvent {
  event_type: "status_change";
  entity_type: "task" | "sprint" | "epic";
  entity_id: string;
  old_status: string;
  new_status: string;
  changed_by: string;
  changed_at: string;
  reason?: string;  // For blocked status
}
```

**Files:**
- Create: `dashboard/src/lib/events/status-events.ts`
- Modify: `dashboard/src/app/api/v1/task/[id]/status/route.ts`
- Modify: `dashboard/src/app/api/v1/sprint/[id]/status/route.ts`
- Modify: `dashboard/src/app/api/v1/epic/[id]/status/route.ts`

**Acceptance Criteria:**
- [ ] Status changes emit events to event log
- [ ] Events include all required fields
- [ ] Events queryable via existing event API
- [ ] No status change occurs silently

---

### e015_s00_t05: Status History Tracking (3h)
**Status:** [ ] Not Started
**Priority:** MEDIUM
**Assignee:** TBD

**Goal:** Track status history with GET endpoints for audit trail

**Implementation:**
1. Store status history as relationships or separate nodes
2. Create GET endpoints for history retrieval
3. Include who changed, when, and what changed

**Endpoints:**
```
GET /api/v1/task/{id}/status/history
GET /api/v1/sprint/{id}/status/history
GET /api/v1/epic/{id}/status/history
```

**Response Schema:**
```typescript
interface StatusHistory {
  entries: Array<{
    from_status: string;
    to_status: string;
    changed_by: string;
    changed_at: string;
    reason?: string;
  }>;
}
```

**Storage Options:**
1. **Event-sourced:** Query status change events (simpler, uses existing events)
2. **Dedicated history:** Separate STATUS_HISTORY relationships (more explicit)

**Recommended:** Option 1 - Query events, less schema changes

**Files:**
- Create: `dashboard/src/app/api/v1/task/[id]/status/history/route.ts`
- Create: `dashboard/src/app/api/v1/sprint/[id]/status/history/route.ts`
- Create: `dashboard/src/app/api/v1/epic/[id]/status/history/route.ts`

**Acceptance Criteria:**
- [ ] History endpoints return chronological status changes
- [ ] History shows who made each change
- [ ] Empty history returns empty array (not error)
- [ ] History queryable with optional date range

---

### e015_s00_t06: API Tests and Documentation (2h)
**Status:** [ ] Not Started
**Priority:** MEDIUM
**Assignee:** TBD

**Goal:** Comprehensive tests and OpenAPI documentation for all new endpoints

**Implementation:**
1. Write integration tests for all PATCH endpoints
2. Write tests for history endpoints
3. Test error cases (invalid status, missing entity)
4. Update OpenAPI spec with new endpoints

**Test Cases:**
- Happy path: Update status successfully
- Error: Invalid status value → 400
- Error: Missing entity → 404
- Error: Blocked without reason → 400
- History: Returns correct order
- Events: Status change emits event

**Files:**
- Create: `dashboard/src/app/api/v1/task/[id]/status/__tests__/route.test.ts`
- Create: `dashboard/src/app/api/v1/sprint/[id]/status/__tests__/route.test.ts`
- Create: `dashboard/src/app/api/v1/epic/[id]/status/__tests__/route.test.ts`
- Modify: `dashboard/openapi.yaml` (if exists) or create API docs

**Acceptance Criteria:**
- [ ] All endpoints have integration tests
- [ ] Error cases tested
- [ ] Test coverage >90% for new code
- [ ] API documentation updated

---

## Technical Notes

### Neo4j Schema Updates

Status fields to add/standardize:
```cypher
// Task status fields
task.status: String (not_started|in_progress|blocked|complete)
task.status_updated_at: DateTime
task.status_updated_by: String

// Sprint status fields
sprint.status: String (planned|active|paused|complete)
sprint.status_updated_at: DateTime
sprint.status_updated_by: String

// Epic status fields
epic.status: String (proposed|active|paused|complete)
epic.status_updated_at: DateTime
epic.status_updated_by: String
```

### Authentication

All PATCH endpoints require authentication. User email from session used for `status_updated_by`.

---

## Dependencies

- Existing Neo4j connection infrastructure
- Existing authentication middleware
- Event logging system (if available, or create)

---

## Sprint Metadata

**Epic:** EPIC-015 (Graph-Authoritative Operational State)
**Sprint ID:** e015_s00
**ADR:** ADR-060 Content/State Separation
**Started:** TBD
**Participants:** TBD
