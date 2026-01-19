# SPRINT: EPIC-015 Sprint 0a - Task Node Extraction

## Sprint Overview

**Sprint Goal**: Parse sprint files to create independent Task nodes in graph
**Duration**: 0.5-1 week
**Type**: Foundation sprint (prerequisite for Sprint 1+)
**Progress:** 100% (5/5 tasks complete)
**Prerequisite:** Sprint 0 complete (status APIs exist)

**Why This Sprint:**
EPIC-015 makes the Graph authoritative for state. Without separate Task nodes, status updates require parsing markdown - complex and inconsistent. Independent Task nodes enable:
- Direct status updates via API
- Simple queries ("all blocked tasks")
- Real-time dashboard without re-parsing
- Clean relationships (Task → Sprint → Epic)

**Success Criteria:**
- [x] Sprint files parsed to extract task definitions
- [x] Task nodes created with proper properties
- [x] Relationships: Task -[BELONGS_TO]-> Sprint -[BELONGS_TO]-> Epic
- [x] `ginko graph load` creates Task nodes automatically
- [x] Existing status APIs work with new Task nodes

---

## Target Graph Schema

### Node Types

```cypher
// Task Node
(:Task {
  id: "e015_s00_t01",           // Unique task ID (ADR-052 format)
  graph_id: "xxx",              // Multi-tenant scoping
  title: "PATCH /api/v1/task/{id}/status Endpoint",
  priority: "HIGH",
  estimate: "3h",
  status: "not_started",        // Graph-authoritative state
  status_updated_at: datetime(),
  status_updated_by: "user@example.com",
  assignee: null,
  blocked_reason: null,
  created_at: datetime(),
  updated_at: datetime()
})

// Sprint Node (existing, enhanced)
(:Sprint {
  id: "e015_s00",
  graph_id: "xxx",
  title: "API Foundation",
  status: "planned",
  epic_id: "e015",              // For relationship creation
  // ... existing properties
})

// Epic Node (existing)
(:Epic {
  id: "e015",
  graph_id: "xxx",
  title: "Graph-Authoritative Operational State",
  status: "proposed",
  // ... existing properties
})
```

### Relationships

```cypher
// Task belongs to Sprint
(t:Task)-[:BELONGS_TO]->(s:Sprint)

// Sprint belongs to Epic
(s:Sprint)-[:BELONGS_TO]->(e:Epic)

// Full hierarchy query
MATCH (t:Task)-[:BELONGS_TO]->(s:Sprint)-[:BELONGS_TO]->(e:Epic)
WHERE e.id = "e015"
RETURN e, s, t
```

---

## Sprint Tasks

### e015_s00a_t01: Task Parser for Sprint Markdown (4h)
**Status:** [x] Complete
**Priority:** HIGH
**Assignee:** chris@watchhill.ai

**Goal:** Create parser to extract task definitions from sprint markdown files

**Input Format (sprint file):**
```markdown
### e015_s00_t01: PATCH /api/v1/task/{id}/status Endpoint (3h)
**Status:** [x] Complete
**Priority:** HIGH
**Assignee:** chris@watchhill.ai

**Goal:** Create API endpoint to update task status directly in graph
```

**Output Format:**
```typescript
interface ParsedTask {
  id: string;              // e015_s00_t01
  sprint_id: string;       // e015_s00 (derived from id)
  title: string;           // "PATCH /api/v1/task/{id}/status Endpoint"
  estimate: string | null; // "3h"
  priority: string;        // "HIGH"
  assignee: string | null; // "chris@watchhill.ai"
  status: TaskStatus;      // "complete" (from checkbox)
  goal: string | null;     // "Create API endpoint..."
}
```

**Parsing Rules:**
1. Task header: `### {id}: {title} ({estimate})`
2. Status line: `**Status:** [x]` → complete, `[@]` → in_progress, `[ ]` → not_started, `[Z]` → paused
3. Priority line: `**Priority:** {value}`
4. Assignee line: `**Assignee:** {email}`
5. Goal line: `**Goal:** {description}`

**Edge Cases:**
- Missing fields → use defaults (priority: "MEDIUM", status: "not_started")
- Malformed task ID → skip with warning
- No tasks in sprint → empty array (valid)

**Files:**
- Create: `packages/cli/src/lib/task-parser.ts`
- Create: `packages/cli/src/lib/task-parser.test.ts`

**Acceptance Criteria:**
- [x] Parses all task fields from markdown
- [x] Handles missing/optional fields gracefully
- [x] Extracts sprint_id from task_id
- [x] Unit tests for all parsing rules
- [x] Tested against existing sprint files

---

### e015_s00a_t02: Task Node Creation in Graph (3h)
**Status:** [x] Complete
**Priority:** HIGH
**Assignee:** chris@watchhill.ai

**Goal:** Create/update Task nodes in Neo4j from parsed task data

**Implementation:**
1. Use MERGE to create or update Task nodes (idempotent)
2. Set all properties from parsed data
3. Preserve status if already set in graph (graph-authoritative)
4. Track sync metadata (synced_at, content_hash)

**Cypher Pattern:**
```cypher
// Create/update task node
MERGE (t:Task {id: $taskId, graph_id: $graphId})
ON CREATE SET
  t.title = $title,
  t.priority = $priority,
  t.estimate = $estimate,
  t.status = $status,           // Only on CREATE
  t.assignee = $assignee,
  t.goal = $goal,
  t.created_at = datetime(),
  t.updated_at = datetime(),
  t.synced_at = datetime()
ON MATCH SET
  t.title = $title,             // Update content
  t.priority = $priority,
  t.estimate = $estimate,
  t.goal = $goal,
  // DO NOT update status - graph is authoritative
  t.updated_at = datetime(),
  t.synced_at = datetime()
RETURN t
```

**Important:** On MATCH (task exists), do NOT overwrite status. Git has content, Graph has state.

**Files:**
- Create: `packages/cli/src/lib/task-graph-sync.ts`
- Modify: `packages/cli/src/commands/graph/load.ts`

**Acceptance Criteria:**
- [x] Task nodes created with all properties
- [x] Existing task status NOT overwritten
- [x] Content (title, goal) updated on re-sync
- [x] Idempotent (safe to run multiple times)

---

### e015_s00a_t03: Create Task/Sprint/Epic Relationships (2h)
**Status:** [x] Complete
**Priority:** HIGH
**Assignee:** chris@watchhill.ai

**Goal:** Create BELONGS_TO relationships for full hierarchy

**Implementation:**
1. After creating Task nodes, create relationships
2. Parse sprint_id from task_id (e015_s00_t01 → e015_s00)
3. Parse epic_id from sprint_id (e015_s00 → e015)
4. Use MERGE for idempotent relationship creation

**Cypher Pattern:**
```cypher
// Link Task to Sprint
MATCH (t:Task {id: $taskId, graph_id: $graphId})
MATCH (s:Sprint {id: $sprintId, graph_id: $graphId})
MERGE (t)-[:BELONGS_TO]->(s)

// Link Sprint to Epic
MATCH (s:Sprint {id: $sprintId, graph_id: $graphId})
MATCH (e:Epic {id: $epicId, graph_id: $graphId})
MERGE (s)-[:BELONGS_TO]->(e)
```

**ID Parsing Logic:**
```typescript
function parseHierarchy(taskId: string): { sprintId: string; epicId: string } {
  // e015_s00_t01 → sprint: e015_s00, epic: e015
  const parts = taskId.split('_');
  const epicId = parts[0];                    // e015
  const sprintId = `${parts[0]}_${parts[1]}`; // e015_s00
  return { sprintId, epicId };
}
```

**Files:**
- Modify: `packages/cli/src/lib/task-graph-sync.ts`

**Acceptance Criteria:**
- [x] Task → Sprint relationships created
- [x] Sprint → Epic relationships created
- [x] Relationships are idempotent
- [x] Hierarchy queryable via Cypher

---

### e015_s00a_t04: Integrate with `ginko graph load` (3h)
**Status:** [x] Complete
**Priority:** HIGH
**Assignee:** chris@watchhill.ai

**Goal:** Automatically create Task nodes when loading sprint files

**Current Flow:**
```
ginko graph load
├── Load ADRs → ADR nodes
├── Load Sprints → Sprint nodes (content only)
├── Load Epics → Epic nodes
└── Load Patterns, Gotchas, etc.
```

**New Flow:**
```
ginko graph load
├── Load ADRs → ADR nodes
├── Load Epics → Epic nodes
├── Load Sprints → Sprint nodes
│   └── Parse tasks → Task nodes + relationships
├── Load Patterns, Gotchas, etc.
└── Summary: "Created 91 sprints, 245 tasks"
```

**Implementation:**
1. After sprint node creation, call task parser
2. Create task nodes for each parsed task
3. Create relationships
4. Add task count to summary output

**Files:**
- Modify: `packages/cli/src/commands/graph/load.ts`
- Modify: `packages/cli/src/lib/graph-loader.ts` (if exists)

**Acceptance Criteria:**
- [x] `ginko graph load` creates Task nodes
- [x] Summary shows task count
- [x] Existing functionality unchanged
- [x] Performance acceptable (<30s for full load)

---

### e015_s00a_t05: Verify Status APIs Work with Task Nodes (2h)
**Status:** [x] Complete
**Priority:** MEDIUM
**Assignee:** chris@watchhill.ai

**Goal:** End-to-end test that Sprint 0 APIs work with new Task nodes

**Test Scenarios:**

1. **Load sprint files**
   ```bash
   ginko graph load --force
   # Verify: Task nodes created
   ```

2. **Update task status via API**
   ```bash
   curl -X PATCH /api/v1/task/e015_s00_t01/status \
     -d '{"graphId": "xxx", "status": "complete"}'
   # Verify: 200 response, status updated
   ```

3. **Query status history**
   ```bash
   curl /api/v1/task/e015_s00_t01/status/history?graphId=xxx
   # Verify: History returned
   ```

4. **Verify hierarchy**
   ```cypher
   MATCH (t:Task {id: "e015_s00_t01"})-[:BELONGS_TO]->(s:Sprint)-[:BELONGS_TO]->(e:Epic)
   RETURN t.status, s.id, e.id
   ```

**Files:**
- Create: `packages/cli/src/commands/graph/__tests__/task-integration.test.ts`

**Acceptance Criteria:**
- [x] Task nodes exist after graph load
- [x] Status APIs return 200 (not 404)
- [x] Status updates persist in graph
- [x] History endpoint returns events
- [x] Hierarchy relationships queryable

---

## Technical Notes

### Task ID Format (ADR-052)

All task IDs follow the hierarchical format:
```
e{NNN}_s{NN}_t{NN}
│      │     └── Task number (01-99)
│      └── Sprint number (00-99)
└── Epic number (001-999)
```

Examples:
- `e015_s00_t01` - Epic 15, Sprint 0, Task 1
- `e011_s01_t07` - Epic 11, Sprint 1, Task 7

### Ad-hoc Task IDs

Ad-hoc tasks (outside planned sprints):
```
adhoc_{YYMMDD}_s{NN}_t{NN}
```

Example: `adhoc_260119_s01_t01`

### Content vs State

| Field | Source | On Re-sync |
|-------|--------|------------|
| title | Git (sprint file) | Updated |
| goal | Git (sprint file) | Updated |
| priority | Git (sprint file) | Updated |
| estimate | Git (sprint file) | Updated |
| **status** | **Graph only** | **Preserved** |
| **assignee** | **Graph only** | **Preserved** |
| **blocked_reason** | **Graph only** | **Preserved** |

---

## Dependencies

- Sprint 0 complete (status APIs exist)
- `ginko graph load` infrastructure exists
- Neo4j connection working

---

## Risks & Mitigations

| Risk | Mitigation |
|------|------------|
| Parser misses edge cases | Extensive test coverage, manual verification |
| Existing sprints have inconsistent format | Graceful fallbacks, warning logs |
| Performance with many tasks | Batch operations, transaction optimization |
| Status overwritten on re-load | Explicit ON MATCH logic preserves graph state |

---

## Sprint Metadata

**Epic:** EPIC-015 (Graph-Authoritative Operational State)
**Sprint ID:** e015_s00a
**Inserted After:** Sprint 0 (API Foundation)
**Blocks:** Sprint 1 (CLI Status Commands)
**ADR:** ADR-060 Content/State Separation
**Started:** 2026-01-19
**Completed:** 2026-01-19
**Participants:** Chris Norton, Claude

## Accomplishments

### 2026-01-19: Sprint 0a Complete

**Files Created:**
- `packages/cli/src/lib/task-parser.ts` - Task parser for sprint markdown (supports e{NNN}_s{NN}_t{NN}, TASK-N, adhoc formats)
- `packages/cli/src/lib/task-parser.test.ts` - 19 unit tests
- `packages/cli/src/lib/task-graph-sync.ts` - Task sync utilities for graph API
- `packages/cli/src/commands/graph/__tests__/task-integration.test.ts` - 27 integration tests
- `dashboard/src/app/api/v1/task/sync/route.ts` - POST /api/v1/task/sync endpoint

**Files Modified:**
- `packages/cli/src/commands/graph/api-client.ts` - Added syncTasks() and getTasks() methods
- `packages/cli/src/commands/graph/load.ts` - Integrated task extraction during sprint loading

**Key Achievements:**
- Task parser handles all ID formats: standard (e015_s00a_t01), legacy (TASK-N), adhoc (adhoc_260119_s01_t01)
- ADR-060 principle enforced: status preserved on UPDATE (graph-authoritative)
- BELONGS_TO relationships created automatically: Task → Sprint → Epic
- All 46 tests passing (19 unit + 27 integration)
- Dashboard builds successfully
