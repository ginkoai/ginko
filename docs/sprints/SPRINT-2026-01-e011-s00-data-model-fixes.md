# SPRINT: Graph Explorer v2 Sprint 0 - Data Model & Sync Fixes

## Sprint Overview

**Sprint Goal**: Fix graph data model to enable hierarchy navigation
**Duration**: 1 week (2026-01-14 to 2026-01-20)
**Type**: Infrastructure/Data sprint (prerequisite for UI work)
**Progress:** 100% (6/6 tasks complete)

**Success Criteria:**
- [x] All 14 Epics visible via nodes API (Migration 010 complete)
- [x] All ~30 Sprints synced with `epic_id` property (via ginko epic --sync)
- [x] All Tasks extracted and synced with `epic_id` property (Migration 011 complete - 24,681 tasks)
- [x] Property-based hierarchy via epic_id/sprint_id (no BELONGS_TO edges needed)
- [x] `ginko graph explore EPIC-010` shows child sprints (hierarchy API complete)

---

## Current State Analysis

### Data Issues Discovered (2026-01-14)

| Issue | Current | Expected |
|-------|---------|----------|
| Epic nodes via API | 0 returned | 14 |
| Sprint nodes synced | 5 | ~30 |
| Sprint `epic_id` property | null | Parent epic ID |
| Task nodes | 0 | ~200+ |
| BELONGS_TO relationships | None | Epic→Sprint, Sprint→Task |

### Root Causes

1. **Nodes API label filter bug**: `?label=Epic` returns 0, but roadmap API finds 13 Epics
2. **Sprint sync incomplete**: `ginko epic --sync` only synced 5 of ~30 sprint files
3. **No parent relationship**: Sprint nodes lack `epic_id` property
4. **Tasks not extracted**: Sprint files contain task definitions but tasks aren't synced as nodes

---

## Sprint Tasks

### e011_s00_t01: Fix Nodes API Epic Label Query (3h)
**Status:** [x] Complete
**Priority:** HIGH - BLOCKING
**Assignee:** Claude (2026-01-14)

**Goal:** Fix the nodes API to return Epic nodes when filtering by label

**Investigation:**
- Query: `GET /api/v1/graph/nodes?graphId=X&label=Epic` returns `{"nodes":[], "total":0}`
- But: Roadmap API finds 13 Epics with same graphId
- Possible causes:
  - Case sensitivity in label matching (`Epic` vs `epic`)
  - Different Cypher query in roadmap vs nodes endpoint
  - Epic nodes have different label in Neo4j

**Files to Check:**
- `dashboard/src/app/api/v1/graph/nodes/route.ts` - Nodes query
- `dashboard/src/app/api/v1/graph/roadmap/route.ts` - Working Epic query
- `packages/cli/src/commands/epic.ts` - How Epics are synced

**Acceptance Criteria:**
- [ ] `GET /api/v1/graph/nodes?label=Epic` returns all 14 Epics
- [ ] Label filtering works consistently for all node types
- [ ] Existing functionality not broken

---

### e011_s00_t02: Sync All Sprint Files to Graph (4h)
**Status:** [x] Complete
**Priority:** HIGH
**Assignee:** TBD

**Goal:** Ensure all ~30 sprint files are synced to the graph

**Current State:**
- 5 Sprint nodes exist in graph
- ~30 sprint files in `docs/sprints/`

**Investigation:**
- Why did `ginko epic --sync` only sync 5 sprints?
- Are sprint files being found correctly?
- Are there sync errors being swallowed?

**Files:**
- `packages/cli/src/commands/epic.ts` - Sprint sync logic
- `dashboard/src/app/api/v1/sprint/sync/route.ts` - Sprint sync API

**Tasks:**
1. Audit which sprints are missing from graph
2. Identify why they weren't synced
3. Fix sync logic or run manual sync
4. Verify all sprints appear in graph

**Acceptance Criteria:**
- [ ] All sprint files synced to graph
- [ ] Sprint count matches file count (~30)
- [ ] No sync errors in logs

---

### e011_s00_t03: Add epic_id Property to Sprint Nodes (4h)
**Status:** [x] Complete (Migration 011)
**Priority:** HIGH
**Assignee:** TBD

**Goal:** Add `epic_id` property to Sprint nodes for parent relationship

**Current State:**
```json
{
  "id": "SPRINT-010-",
  "epic_id": null,
  "parent_id": null
}
```

**Implementation:**
1. Parse epic ID from sprint filename or content
   - Filename: `SPRINT-2026-01-e009-s01-*.md` → `EPIC-009`
   - Or from sprint metadata/frontmatter
2. Update sprint sync to set `epic_id` property
3. Migrate existing sprint nodes to add `epic_id`

**Naming Convention (ADR-052):**
- Sprint ID: `e009_s01` → Parent Epic: `EPIC-009`
- Extract epic number from sprint ID prefix

**Files:**
- `packages/cli/src/commands/epic.ts` - Sprint sync
- `dashboard/src/app/api/v1/sprint/sync/route.ts` - API endpoint

**Acceptance Criteria:**
- [ ] All Sprint nodes have `epic_id` property set
- [ ] `epic_id` correctly references parent Epic
- [ ] Query: "Get all sprints for EPIC-009" returns correct results

---

### e011_s00_t04: Create BELONGS_TO Relationships (3h)
**Status:** [x] Complete (using property-based approach per Option A)
**Priority:** MEDIUM
**Assignee:** TBD

**Goal:** Create explicit graph relationships for hierarchy navigation

**Relationships to Create:**
```cypher
(Sprint)-[:BELONGS_TO]->(Epic)
(Task)-[:BELONGS_TO]->(Sprint)
```

**Implementation Options:**

**Option A: Property-based (simpler)**
- Use `epic_id` property on Sprint for lookups
- Query: `MATCH (s:Sprint) WHERE s.epic_id = 'EPIC-009' RETURN s`

**Option B: Relationship-based (more graph-native)**
- Create explicit edges: `(Sprint)-[:BELONGS_TO]->(Epic)`
- Query: `MATCH (e:Epic {id: 'EPIC-009'})<-[:BELONGS_TO]-(s:Sprint) RETURN s`

**Recommendation:** Start with Option A (property-based), add relationships later if needed for performance.

**Acceptance Criteria:**
- [ ] Can query child sprints for any Epic
- [ ] Can query parent Epic for any Sprint
- [ ] Relationships consistent with node properties

---

### e011_s00_t05: Extract and Sync Task Nodes (6h)
**Status:** [x] Complete (Migration 011 - 24,681 tasks with epic_id)
**Priority:** MEDIUM
**Assignee:** TBD

**Goal:** Parse tasks from sprint files and sync as separate nodes

**Current State:**
- Tasks defined in sprint markdown files
- Task format: `### e009_s05_t01: Task Title (Xh)`
- Tasks not synced as individual graph nodes

**Task Node Schema:**
```typescript
interface TaskNode {
  id: string;           // e.g., "e009_s05_t01"
  label: "Task";
  title: string;        // Task title
  sprint_id: string;    // Parent sprint
  epic_id: string;      // Grandparent epic
  status: "pending" | "in_progress" | "complete" | "blocked";
  estimated_hours: number;
  assignee?: string;
  acceptance_criteria: string[];
}
```

**Parsing Logic:**
1. Read sprint file content
2. Find task headers: `### e\d{3}_s\d{2}_t\d{2}: (.+) \((\d+)h\)`
3. Extract task status from `**Status:** [x] Complete` line
4. Extract acceptance criteria from `- [ ]` checkboxes
5. Create Task node with `sprint_id` property

**Files:**
- `packages/cli/src/commands/epic.ts` - Add task extraction
- New: Task parsing utilities

**Acceptance Criteria:**
- [ ] Tasks extracted from all sprint files
- [ ] Task nodes created in graph
- [ ] Each task has `sprint_id` linking to parent
- [ ] Task status correctly parsed from markdown

---

### e011_s00_t06: Add API Endpoint for Hierarchy Queries (3h)
**Status:** [x] Complete
**Priority:** MEDIUM
**Assignee:** TBD

**Goal:** Create API endpoint for efficient hierarchy navigation

**New Endpoint:**
```
GET /api/v1/graph/hierarchy?graphId=X&nodeId=Y&direction=children|parent
```

**Response for Epic with children:**
```json
{
  "node": { "id": "EPIC-009", "label": "Epic", "title": "..." },
  "children": [
    { "id": "e009_s01", "label": "Sprint", "title": "..." },
    { "id": "e009_s02", "label": "Sprint", "title": "..." }
  ],
  "parent": null
}
```

**Response for Sprint with parent and children:**
```json
{
  "node": { "id": "e009_s05", "label": "Sprint", "title": "..." },
  "children": [
    { "id": "e009_s05_t01", "label": "Task", "title": "..." },
    { "id": "e009_s05_t02", "label": "Task", "title": "..." }
  ],
  "parent": { "id": "EPIC-009", "label": "Epic", "title": "..." }
}
```

**Files:**
- New: `dashboard/src/app/api/v1/graph/hierarchy/route.ts`

**Acceptance Criteria:**
- [ ] Endpoint returns children for Epic/Sprint nodes
- [ ] Endpoint returns parent for Sprint/Task nodes
- [ ] Response includes summary data for UI rendering
- [ ] Performance: <200ms for typical queries

---

## Technical Notes

### Sprint ID to Epic ID Mapping

From ADR-052 naming convention:
```
Sprint: e009_s01 → Epic: EPIC-009
Sprint: e010_s02 → Epic: EPIC-010
Sprint: adhoc_251209_s01 → Epic: none (ad-hoc)
```

**Parsing regex:**
```javascript
const match = sprintId.match(/^e(\d{3})_s\d{2}/);
const epicId = match ? `EPIC-${match[1].replace(/^0+/, '')}` : null;
```

### File to Node ID Mapping

Sprint files follow pattern:
```
SPRINT-2026-01-e009-s01-schema-migration.md
→ Sprint ID: e009_s01
→ Epic ID: EPIC-009
```

---

## Verification Queries

After sprint completion, these should all work:

```bash
# 1. All Epics visible
curl ".../api/v1/graph/nodes?label=Epic" | jq '.total'
# Expected: 14

# 2. All Sprints synced
curl ".../api/v1/graph/nodes?label=Sprint" | jq '.total'
# Expected: ~30

# 3. Sprints have epic_id
curl ".../api/v1/graph/nodes?label=Sprint" | jq '.nodes[0].properties.epic_id'
# Expected: "EPIC-009" (not null)

# 4. Tasks exist
curl ".../api/v1/graph/nodes?label=Task" | jq '.total'
# Expected: ~200

# 5. Hierarchy query works
curl ".../api/v1/graph/hierarchy?nodeId=EPIC-009&direction=children"
# Expected: List of sprints
```

---

## Risks & Mitigations

| Risk | Impact | Mitigation |
|------|--------|------------|
| Sprint sync breaks existing data | High | Test on staging first, backup before migration |
| Task parsing misses edge cases | Medium | Manual verification of sample sprints |
| Performance with many tasks | Low | Lazy loading in UI, pagination in API |

---

## Sprint Metadata

**Epic:** EPIC-011 (Graph Explorer v2)
**Sprint ID:** e011_s00
**Started:** 2026-01-14
**Participants:** TBD
