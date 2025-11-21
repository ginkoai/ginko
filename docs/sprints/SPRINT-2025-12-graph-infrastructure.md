# SPRINT: Graph Infrastructure & Core Relationships (EPIC-001 Sprint 1)

## Sprint Overview

**Sprint Goal**: Build graph-native context system with Tier 1 relationships (Sprint→Task, Task→File, Task→Event, Epic→Problem) to enable EPIC-002's AI-centric cognitive scaffolding.

**Epic**: [EPIC-001: Strategic Context & Dynamic Adaptivity](../epics/EPIC-001-strategic-context-and-dynamic-adaptivity.md)

**Duration**: 2 weeks (2025-11-21 to 2025-12-05)

**Type**: Infrastructure sprint (Graph-first architecture)

**Philosophy**: Graph relationships first, text displays second. Build the foundation that eliminates 14-18 hours of rework when implementing EPIC-002.

**Success Criteria:**
- Sprint → Task graph structure operational (CONTAINS, NEXT_TASK)
- Task → File relationships (MODIFIES - attention direction)
- Task → Event relationships (RECENT_ACTIVITY - momentum awareness)
- Charter → Graph nodes (Epic → Problem → Goal)
- Graph query API: `/api/v1/sprint/active` (<200ms)
- Session startup <2.5s with graph query
- Zero rework needed for EPIC-002

**Progress:** 50% (2/4 tasks complete)

---

## Strategic Context

### The Pivot (2025-11-21)

**Original Plan**: Surface context as text displays
- TASK-2: Team activity feed (text)
- TASK-3: Patterns/gotchas display (text)

**Problem Identified**: Would require 14-18 hours rework for EPIC-002
- EPIC-002 needs graph relationships, not text parsing
- Display-first approach incompatible with AI-native sprint graphs

**New Approach**: Graph-first architecture
- Build relationships that EPIC-002 will consume directly
- Text displays become graph traversal views
- Foundation enables 5-10x AI productivity improvements

### EPIC-002 Dependencies

This sprint builds **Tier 1: Actionable Context** relationships:

```cypher
(Sprint)-[:NEXT_TASK]->(Task)
  // Eliminates "what should I work on?" paralysis
  // Explicit priority/hotness signal

(Task)-[:RECENT_ACTIVITY]->(Event)
  // Hot vs. cold tasks (momentum awareness)
  // "TASK-013 has 7 events in last 4h" = active

(Task)-[:MODIFIES]->(File)
  // Attention direction (where to focus reads)
  // 70% faster file discovery (ADR-002)

(Sprint)-[:IMPLEMENTS]->(Epic)-[:SOLVES]->(Problem)
  // Strategic grounding
  // AI understands "why" not just "what"
```

---

## Sprint Tasks

### TASK-1: Charter → Graph Nodes (4-6h)
**Status:** ✅ Complete
**Owner:** Chris Norton
**Priority:** CRITICAL

**Goal:** Sync charter to graph with Epic, Problem, Goal nodes

**Acceptance Criteria:**
- [x] Charter-loader.ts already exists (from old Sprint 1) ✅
- [ ] Create graph sync function in `charter-loader.ts`
- [ ] Parse charter into nodes:
  - Epic node (from charter title)
  - Problem nodes (from "Problems We're Solving")
  - Goal nodes (from "Goals" section)
  - User nodes (from "Who This Is For")
- [ ] Create relationships:
  - `(Epic)-[:SOLVES]->(Problem)`
  - `(Epic)-[:HAS_GOAL]->(Goal)`
  - `(Problem)-[:IMPACTS]->(User)`
- [ ] Sync on charter file changes (filesystem watcher)
- [ ] API endpoint: `POST /api/v1/charter/sync`

**Implementation:**

```typescript
// packages/cli/src/lib/charter-loader.ts
interface CharterGraph {
  epic: { id: string; name: string; purpose: string };
  problems: Array<{ id: string; description: string }>;
  goals: Array<{ id: number; text: string; metric?: string }>;
  users: Array<{ id: string; description: string }>;
}

async function syncCharterToGraph(charter: Charter): Promise<void> {
  const graph = parseCharterToGraph(charter);
  await createGraphNodes(graph);
  await createRelationships(graph);
}
```

**Files:**
- Modify: `packages/cli/src/lib/charter-loader.ts`
- Create: `dashboard/src/app/api/v1/charter/sync/route.ts`

---

### TASK-2: Sprint → Task Graph Structure (8-10h)
**Status:** ✅ Complete
**Owner:** Chris Norton
**Priority:** CRITICAL

**Goal:** Auto-sync sprint files to graph with Sprint and Task nodes

**Acceptance Criteria:**
- [ ] Parse sprint markdown into structured data
- [ ] Detect tasks from markdown (TASK-XXX patterns)
- [ ] Extract task metadata:
  - Status (Not Started, In Progress, Complete)
  - Effort estimate
  - Priority
  - Files mentioned
  - Related ADRs/patterns
- [ ] Create graph nodes:
  - Sprint node (from sprint file name)
  - Task nodes (from task sections)
- [ ] Create relationships:
  - `(Sprint)-[:CONTAINS]->(Task)`
  - `(Sprint)-[:NEXT_TASK]->(Task)` - First incomplete task
- [ ] Sync on sprint file changes
- [ ] API endpoint: `POST /api/v1/sprint/sync`
- [ ] API endpoint: `GET /api/v1/sprint/active` (<200ms)

**Implementation:**

```typescript
// packages/cli/src/lib/sprint-parser.ts
interface SprintGraph {
  sprint: {
    id: string;
    name: string;
    goal: string;
    startDate: Date;
    endDate: Date;
  };
  tasks: Array<{
    id: string;
    title: string;
    status: 'not_started' | 'in_progress' | 'complete';
    effort: number;
    priority: string;
    files: string[];
    relatedADRs: string[];
  }>;
}

async function parseSprint(markdown: string): Promise<SprintGraph> {
  // Parse markdown sections
  // Extract tasks with regex: /### TASK-\d+:/
  // Extract metadata from task sections
  return graph;
}

async function syncSprintToGraph(sprintFile: string): Promise<void> {
  const markdown = await fs.readFile(sprintFile, 'utf-8');
  const graph = await parseSprint(markdown);
  await createGraphNodes(graph);
  await createRelationships(graph);
}
```

**Files:**
- Create: `packages/cli/src/lib/sprint-parser.ts`
- Create: `packages/cli/test/unit/sprint-parser.test.ts`
- Create: `dashboard/src/app/api/v1/sprint/sync/route.ts`
- Create: `dashboard/src/app/api/v1/sprint/active/route.ts`

---

### TASK-3: Task → File Relationships (6-8h)
**Status:** Not Started
**Owner:** TBD
**Priority:** HIGH

**Goal:** Create MODIFIES relationships for attention direction (ADR-002)

**Acceptance Criteria:**
- [ ] Extract file paths from task descriptions
- [ ] Parse "Files:" sections in tasks
- [ ] Create File nodes in graph (if not exist)
- [ ] Create relationships:
  - `(Task)-[:MODIFIES]->(File)` - Files being changed
  - `(File)-[:HAS_FRONTMATTER]->(:Metadata)` - ADR-002 metadata
- [ ] Query: "What files does TASK-X modify?"
- [ ] Query: "What tasks modify file Y?"
- [ ] API endpoint: `GET /api/v1/task/{id}/files`

**Implementation:**

```typescript
// dashboard/src/app/api/v1/task/[id]/files/route.ts
export async function GET(
  request: Request,
  { params }: { params: { id: string } }
) {
  const query = `
    MATCH (t:Task {id: $taskId})-[:MODIFIES]->(f:File)
    OPTIONAL MATCH (f)-[:HAS_FRONTMATTER]->(m:Metadata)
    RETURN f.path, f.status, m.tags, m.complexity
    ORDER BY f.path
  `;

  const files = await runQuery(query, { taskId: params.id });
  return Response.json({ files });
}
```

**Files:**
- Modify: `packages/cli/src/lib/sprint-parser.ts` (extract file paths)
- Create: `dashboard/src/app/api/v1/task/[id]/files/route.ts`

---

### TASK-4: Task → Event Relationships (6-8h)
**Status:** Not Started
**Owner:** TBD
**Priority:** HIGH

**Goal:** Connect tasks to events for hot/cold detection (momentum awareness)

**Acceptance Criteria:**
- [ ] Parse event descriptions for TASK-XXX mentions
- [ ] Create relationships:
  - `(Task)-[:RECENT_ACTIVITY]->(Event)` - Events mentioning task
  - Include timestamp, category, impact as relationship properties
- [ ] Query: "How hot is TASK-X?" (event count in last 4h/24h/7d)
- [ ] Query: "What's the most active task?" (highest event count)
- [ ] API endpoint: `GET /api/v1/task/{id}/activity`
- [ ] API endpoint: `GET /api/v1/sprint/hot-tasks`

**Implementation:**

```typescript
// dashboard/src/app/api/v1/task/[id]/activity/route.ts
export async function GET(
  request: Request,
  { params }: { params: { id: string } }
) {
  const query = `
    MATCH (t:Task {id: $taskId})<-[:RECENT_ACTIVITY]-(e:Event)
    WHERE e.timestamp > datetime() - duration({hours: 24})
    RETURN e, count(e) as count
    ORDER BY e.timestamp DESC
  `;

  const activity = await runQuery(query, { taskId: params.id });

  return Response.json({
    task: params.id,
    lastActivity: activity[0]?.timestamp || null,
    count24h: activity.length,
    hotness: calculateHotness(activity),
    events: activity.slice(0, 10) // Most recent 10
  });
}
```

**Files:**
- Create: `packages/cli/src/lib/event-task-linker.ts` (extract task mentions)
- Create: `dashboard/src/app/api/v1/task/[id]/activity/route.ts`
- Create: `dashboard/src/app/api/v1/sprint/hot-tasks/route.ts`

---

## Testing Strategy

### Unit Tests

**Total Tests**: ~50 tests across 4 files

**Test Files:**
1. `charter-loader.test.ts` (12 tests)
   - Charter parsing to graph nodes
   - Relationship creation
   - Sync on file changes

2. `sprint-parser.test.ts` (20 tests)
   - Sprint markdown parsing
   - Task extraction (status, effort, priority)
   - File path extraction
   - ADR/pattern mentions

3. `event-task-linker.test.ts` (10 tests)
   - TASK-XXX pattern detection
   - Event → Task relationship creation

4. `graph-api.test.ts` (8 tests)
   - Query performance (<200ms)
   - Relationship traversal
   - Data consistency

**Run Command:**
```bash
npm test -- --testPathPattern="charter-loader|sprint-parser|event-task-linker|graph-api"
```

### Integration Tests

**Scenario 1: Sprint Sync End-to-End**
1. Create sprint markdown file
2. Run sprint sync
3. Query `/api/v1/sprint/active`
4. Verify Sprint + Task nodes created
5. Verify CONTAINS relationships
6. Verify NEXT_TASK points to first incomplete

**Scenario 2: Task → File → Metadata Chain**
1. Task mentions file in "Files:" section
2. File has ADR-002 frontmatter
3. Query `/api/v1/task/TASK-X/files`
4. Verify File node returned with metadata (tags, complexity)

**Scenario 3: Hot Task Detection**
1. Log 5 events mentioning TASK-X in last 2 hours
2. Query `/api/v1/task/TASK-X/activity`
3. Verify hotness calculation
4. Query `/api/v1/sprint/hot-tasks`
5. Verify TASK-X ranked high

---

## Performance Targets

| Operation | Target | Measurement |
|-----------|--------|-------------|
| Charter sync | <500ms | Time to create all nodes + relationships |
| Sprint sync | <1s | Time to parse + create graph |
| Task query | <50ms | Single task with relationships |
| Sprint query | <200ms | Full sprint graph (tasks + files + events) |
| Hot tasks query | <100ms | Calculate hotness for all tasks |

**Monitoring:**
```bash
ginko graph health  # From TASK-013
```

---

## Milestones

### Milestone 1: Charter & Sprint Graph (Week 1)
**Target:** End of week 1 (2025-11-28)

**Deliverables:**
- ✅ TASK-1 complete (Charter → Graph)
- ✅ TASK-2 complete (Sprint → Task structure)
- ✅ Graph sync working automatically
- ✅ API endpoints operational

**Success Criteria:**
- Sprint structure visible in graph
- Charter problems linked to epic
- Sync time <1s total

---

### Milestone 2: Task Relationships (Week 2)
**Target:** End of sprint (2025-12-05)

**Deliverables:**
- ✅ TASK-3 complete (Task → File)
- ✅ TASK-4 complete (Task → Event)
- ✅ All relationships operational
- ✅ Performance targets met

**Success Criteria:**
- Task → File attention direction working
- Hot/cold task detection accurate
- Graph query <200ms
- Foundation validated for EPIC-002

---

## Success Metrics

### Infrastructure Metrics

1. **Graph Relationships**: 100% of Tier 1 operational
   - Sprint → Task (CONTAINS, NEXT_TASK) ✅
   - Task → File (MODIFIES) ✅
   - Task → Event (RECENT_ACTIVITY) ✅
   - Epic → Problem (SOLVES) ✅

2. **Query Performance**: <200ms for sprint graph
3. **Sync Performance**: <1s for sprint file changes
4. **Session Startup**: <2.5s (no regression)

### EPIC-002 Readiness

- ✅ Tier 1 relationships ready for consumption
- ✅ Task-centric graph structure established
- ✅ Attention direction (MODIFIES) functional
- ✅ Momentum awareness (RECENT_ACTIVITY) functional
- ✅ Zero rework needed for EPIC-002 Phase 1

---

## Risks and Mitigations

| Risk | Impact | Probability | Mitigation |
|------|---------|-------------|------------|
| Sprint parsing fragile | High | Medium | Comprehensive tests, graceful failures, manual override |
| Graph sync performance | Medium | Low | Parallel queries, caching, incremental sync |
| Task detection inaccurate | Medium | Medium | Regex validation, human review, correction API |
| File path extraction misses edge cases | Low | Medium | Test with real sprint files, handle relative paths |

---

## Related Documents

### Epic & Strategic Context
- **[EPIC-001: Strategic Context & Dynamic Adaptivity](../epics/EPIC-001-strategic-context-and-dynamic-adaptivity.md)** (Realigned 2025-11-21)
- **[EPIC-002: AI-Native Sprint Graphs](../epics/EPIC-002-ai-native-sprint-graphs.md)** (Strategic driver)

### Architecture Decision Records
- **[ADR-002](../adr/ADR-002-ai-readable-code-frontmatter.md)** - AI-Optimized File Discovery (File→Metadata)
- **[ADR-043](../adr/ADR-043-event-based-context-loading.md)** - Event-Based Context Loading
- **[ADR-047](../adr/ADR-047-graph-first-context-architecture.md)** (To be created)

### Code References
- Charter loader: `packages/cli/src/lib/charter-loader.ts`
- Context loading: `packages/cli/src/lib/context-loader-events.ts`
- Session display: `packages/cli/src/commands/start/start-reflection.ts`
- Graph API: `dashboard/src/app/api/v1/`

### Next Sprint
- **Sprint 2: Pattern & Constraint Graph** (Tier 2 relationships)

---

**Sprint Status**: Planning
**Start Date**: 2025-11-21
**End Date**: 2025-12-05 (2 weeks)
**Progress**: 0% (0/4 tasks complete)
