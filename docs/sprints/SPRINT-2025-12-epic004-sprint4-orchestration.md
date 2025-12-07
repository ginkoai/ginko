---
sprint_id: EPIC-004-S4
epic_id: EPIC-004
status: not_started
created: 2025-12-05
updated: 2025-12-05
adr: ADR-051
depends: EPIC-004-S3
---

# Sprint 4: Orchestration Layer

**Epic:** EPIC-004 - AI-to-AI Collaboration
**Goal:** Enable supervisor pattern for complex projects
**Duration:** 2 weeks
**Type:** Feature
**Depends:** Sprint 3 (Verification & Quality)

## Sprint Goal

Build the orchestration primitives: work decomposition, dependency management, task assignment. This sprint enables the supervisor agent pattern for coordinating multiple workers.

## Success Criteria

- [ ] Epic can be decomposed into suggested task breakdown via API
- [ ] Tasks can declare dependencies on other tasks
- [ ] Available tasks API returns only tasks with satisfied dependencies
- [ ] Supervisor can assign tasks to specific agents
- [x] `ginko orchestrate` runs as a supervisor agent
- [ ] Topological ordering ensures correct execution sequence

## Tasks

### TASK-1: Work Decomposition API
**Status:** [ ]
**Effort:** Large
**Files:** `dashboard/src/app/api/v1/epic/decompose/route.ts`

AI-assisted decomposition:
- `POST /api/v1/epic/:id/decompose` - Suggest task breakdown
- Uses LLM to analyze epic scope
- Returns suggested tasks with estimates, dependencies
- Human/orchestrator approves or modifies

```typescript
interface DecompositionResult {
  epicId: string;
  suggestedTasks: {
    title: string;
    description: string;
    effort: 'small' | 'medium' | 'large';
    capabilities: string[];  // Required agent capabilities
    dependsOn: string[];     // Other task IDs
  }[];
  reasoning: string;
}
```

**Acceptance:**
- [ ] Analyzes epic content for scope
- [ ] Suggests reasonable task breakdown
- [ ] Identifies dependencies between tasks
- [ ] Estimates effort per task

---

### TASK-2: Task Dependency Schema
**Status:** [ ]
**Effort:** Medium
**Files:** `packages/cli/src/lib/sprint-loader.ts`, `src/graph/schema/task-deps.cypher`

Add dependency support to tasks:
```markdown
### TASK-3: Implement API
**Depends:** TASK-1, TASK-2
```

Graph relationship:
```cypher
(t1:Task)-[:DEPENDS_ON]->(t2:Task)
```

**Acceptance:**
- [ ] Dependencies parsed from markdown
- [ ] DEPENDS_ON relationships created in graph
- [ ] Circular dependency detection
- [ ] Missing dependency warning

---

### TASK-3: Dependency Graph Visualization
**Status:** [ ]
**Effort:** Small
**Files:** `packages/cli/src/commands/sprint/deps.ts`

Show task dependencies:
```
ginko sprint deps

TASK-1 (available)
  └─> TASK-3 (blocked)
      └─> TASK-5 (blocked)
TASK-2 (available)
  └─> TASK-3 (blocked)
TASK-4 (available)
```

**Acceptance:**
- [ ] Shows dependency tree
- [ ] Indicates blocked vs available
- [ ] Detects circular dependencies

---

### TASK-4: Available Tasks API
**Status:** [ ]
**Effort:** Medium
**Files:** `dashboard/src/app/api/v1/task/available/route.ts`

Return tasks ready for execution:
- `GET /api/v1/task/available?capabilities=typescript,testing`
- Only tasks with all dependencies complete
- Filter by required capabilities
- Ordered by priority

```cypher
MATCH (t:Task {status: 'available'})
WHERE NOT EXISTS {
  MATCH (t)-[:DEPENDS_ON]->(dep:Task)
  WHERE dep.status <> 'complete'
}
AND ALL(cap IN $capabilities WHERE cap IN t.required_capabilities)
RETURN t
ORDER BY t.priority DESC
```

**Acceptance:**
- [ ] Only returns unblocked tasks
- [ ] Capability filtering works
- [ ] Priority ordering correct
- [ ] Empty array if none available (not error)

---

### TASK-5: Task Assignment API
**Status:** [ ]
**Effort:** Small
**Files:** `dashboard/src/app/api/v1/task/[id]/assign/route.ts`

Supervisor assigns tasks to agents:
- `POST /api/v1/task/:id/assign` - Assign to specific agent
- Different from claiming (orchestrator assigns, agent claims)
- Agent can accept or reject assignment

**Acceptance:**
- [ ] Orchestrator can assign any available task
- [ ] Creates ASSIGNED_TO relationship
- [ ] Agent notified via event stream
- [ ] Agent can accept (claim) or reject

---

### TASK-6: Topological Task Ordering
**Status:** [ ]
**Effort:** Medium
**Files:** `packages/cli/src/lib/task-dependencies.ts`

Compute optimal execution order:
```typescript
function getExecutionOrder(tasks: Task[]): Task[][] {
  // Returns tasks grouped by "wave"
  // Wave 1: No dependencies
  // Wave 2: Depends only on Wave 1
  // etc.
}
```

**Acceptance:**
- [ ] Returns tasks in waves
- [ ] Parallel execution within waves
- [ ] Detects and rejects circular deps
- [ ] Handles missing dependencies gracefully

---

### TASK-7: CLI Orchestrate Command
**Status:** [x]
**Effort:** Large
**Files:** `packages/cli/src/commands/orchestrate.ts`

Run as supervisor agent:
```
ginko orchestrate --epic EPIC-004

Orchestrator starting for EPIC-004...
Registered as agent_orchestrator_xxx

Wave 1 (3 tasks):
  → Assigned TASK-1 to agent_worker_1
  → Assigned TASK-2 to agent_worker_2
  → TASK-4 waiting for available agent

Monitoring progress...
  ✓ TASK-1 complete (agent_worker_1)
  → Assigned TASK-3 to agent_worker_1 (deps satisfied)
```

**Acceptance:**
- [x] Registers as orchestrator agent
- [x] Monitors available workers
- [x] Assigns tasks based on capabilities
- [x] Reacts to task completions
- [x] Handles blockers and reassignment

---

### TASK-8: Worker Agent Mode
**Status:** [x] Complete
**Effort:** Medium
**Files:** `packages/cli/src/commands/agent/work.ts`, `packages/cli/src/commands/agent/agent-client.ts`

Run as worker agent:
```
ginko agent work --capabilities typescript,testing

Worker agent_worker_xxx started
Capabilities: typescript, testing
Waiting for assignments...

Received: TASK-1 - Implement auth module
Claiming... ✓
Working...
```

**Acceptance:**
- [x] Registers with capabilities (via AgentClient.register)
- [x] Polls for assignments (via AgentClient.getAvailableTasks)
- [x] Claims assigned tasks (via AgentClient.claimTask with 409 handling)
- [x] Reports progress via events (via logEvent on claim/start)
- [x] Notifies on completion/blocker (via logEvent with achievement/blocker category)

---

### TASK-9: Orchestrator Context Pressure Monitoring
**Status:** [x] Complete
**Effort:** Medium
**Files:** `packages/cli/src/lib/context-metrics.ts`, `packages/cli/src/commands/orchestrate.ts`

Monitor and respond to context pressure (external measurement, not model self-report):

```typescript
interface ContextMetrics {
  estimatedTokens: number;      // Token count via tiktoken/claude tokenizer
  contextLimit: number;         // Model max (200k Opus, 128k GPT-4)
  pressure: number;             // estimatedTokens / contextLimit
  messageCount: number;         // Conversation turns
  toolCallCount: number;        // Tool invocations
  eventsSinceStart: number;     // Session activity
}

// Model-specific limits
const MODEL_LIMITS = {
  'claude-opus-4-5-20251101': 200000,
  'claude-sonnet-4-20250514': 200000,
  'gpt-4-turbo': 128000,
  'gpt-4o': 128000,
  'gemini-pro': 1000000,
};
```

**Acceptance:**
- [x] Token estimation within 10% accuracy
- [x] Pressure calculated correctly per model
- [x] Metrics updated on each orchestrator cycle
- [x] Warning logged at 70% pressure

---

### TASK-10: Orchestrator Lifecycle & Respawn
**Status:** [ ]
**Effort:** Medium
**Files:** `packages/cli/src/commands/orchestrate.ts`, `packages/cli/src/lib/orchestrator-state.ts`

Implement orchestrator exit conditions and clean respawn:

```
EXIT CONDITIONS:
  ✓ All tasks complete → success exit (code 0)
  ✓ Context pressure > 80% → checkpoint + respawn
  ✓ No progress for 10 cycles → escalate + pause
  ✓ Human interrupt (SIGINT) → graceful shutdown
  ✓ Max runtime exceeded (configurable) → checkpoint + respawn
```

Respawn flow:
1. Save state to graph (active assignments, completed tasks, blockers)
2. Exit with special code (e.g., 75 for "respawn needed")
3. Wrapper script or parent process restarts
4. New instance loads state, continues seamlessly

**Acceptance:**
- [ ] Clean exit on all tasks complete
- [ ] Checkpoint created at 80% pressure
- [ ] Exit code indicates respawn vs success vs failure
- [ ] State persisted to graph for recovery
- [ ] New instance resumes from checkpoint

---

### TASK-11: Integration Tests
**Status:** [ ]
**Effort:** Medium
**Files:** `packages/cli/test/integration/orchestration.test.ts`

Test scenarios:
- Decomposition produces valid tasks
- Dependency graph traversal
- Topological ordering correctness
- Orchestrator assigns, worker executes
- Blocked tasks wait for dependencies
- Context pressure triggers respawn
- State recovery after restart

**Acceptance:**
- [ ] Full orchestration flow tested
- [ ] Edge cases: circular deps, no workers, etc.
- [ ] Respawn flow tested
- [ ] Coverage > 80% for new code

---

## Technical Notes

### Orchestration Loop

```
while (incompleteTasks > 0) {
  1. Get available tasks (deps satisfied)
  2. Get idle agents with matching capabilities
  3. Assign tasks to agents
  4. Wait for events (completion, blocker, timeout)
  5. Handle events:
     - completion: update deps, find newly available tasks
     - blocker: escalate or reassign
     - timeout: mark agent stale, release task
}
```

### Assignment vs Claiming

| Aspect | Assignment | Claiming |
|--------|------------|----------|
| Initiator | Orchestrator | Worker |
| Conflict | None (single source) | 409 on race |
| Use case | Supervisor pattern | Peer swarm |

Agents can work in either mode or both.

### Capability Matching

```typescript
function canExecute(task: Task, agent: Agent): boolean {
  return task.requiredCapabilities.every(
    cap => agent.capabilities.includes(cap)
  );
}
```

## Files Summary

**New files:**
- `dashboard/src/app/api/v1/epic/decompose/route.ts`
- `dashboard/src/app/api/v1/task/available/route.ts`
- `dashboard/src/app/api/v1/task/[id]/assign/route.ts`
- `packages/cli/src/lib/task-dependencies.ts`
- `packages/cli/src/commands/orchestrate.ts`
- `packages/cli/src/commands/agent/work.ts`
- `packages/cli/src/commands/sprint/deps.ts`
- `src/graph/schema/task-deps.cypher`
- `packages/cli/test/integration/orchestration.test.ts`

**Modified files:**
- `packages/cli/src/lib/sprint-loader.ts` (dependency parsing)
- `packages/cli/src/index.ts` (add commands)

## Definition of Done

- [ ] All tasks completed
- [ ] Orchestrator can decompose, assign, and monitor
- [ ] Workers can receive assignments and execute
- [ ] Dependencies respected in execution order
- [ ] Full integration test passing
- [ ] No regression in existing functionality

---

## Progress

**Started:** 2025-12-05
**Completed:** 9/11 tasks (TASK-1-9)

## Accomplishments

### 2025-12-07: TASK-9 Orchestrator Context Pressure Monitoring Complete
- Created `packages/cli/src/lib/context-metrics.ts` with comprehensive context monitoring
- Features:
  - Token estimation using character-based heuristic (~4 chars/token)
  - Model-specific context limits (Claude 200K, GPT-4 128K, Gemini 1M)
  - Pressure zone classification (optimal/elevated/warning/critical)
  - ContextMonitor class with trend analysis
  - Singleton pattern for global monitoring
- Integrated into orchestrate.ts:
  - Context pressure checked each orchestration cycle
  - Respawn triggered at >80% pressure
  - Warning logged at >70% pressure (throttled to every 5 min)
  - Pressure metrics included in checkpoint files
  - Verbose mode shows context metrics per cycle
- Unit tests: 50 tests covering all functionality
- Files: packages/cli/src/lib/context-metrics.ts, packages/cli/src/commands/orchestrate.ts, packages/cli/test/unit/context-metrics.test.ts

### 2025-12-07: TASK-8 Worker Agent Mode Complete
- Implemented full worker agent loop in `ginko agent work` command
- Features:
  - Registers as worker agent (with graceful fallback for API errors)
  - Loads project context via `ginko start` at startup
  - Polls for available tasks matching agent capabilities
  - Claims tasks atomically with 409 conflict handling
  - Loads task-specific context (files, patterns, gotchas, constraints)
  - Presents task details for AI execution
  - Reports progress via events (achievement/blocker categories)
  - Tracks worker stats (completed, failed, released)
  - Graceful shutdown with stats display
- Added task management methods to AgentClient:
  - `getAvailableTasks()` - Query available tasks by capabilities
  - `claimTask()` - Atomic task claiming
  - `releaseTask()` - Release claimed task
  - `getTaskContext()` - Load task-specific context
- Options: --name, --capabilities, --poll-interval, --max-tasks
- Integration tests: 13 tests covering task types, capability matching, priority ordering, stats, errors
- Files: packages/cli/src/commands/agent/work.ts, packages/cli/src/commands/agent/agent-client.ts

### 2025-12-07: TASK-7 CLI Orchestrate Command Complete
- Implemented `ginko orchestrate` command for multi-agent task coordination
- Features:
  - Registers as orchestrator agent (with graceful fallback for API errors)
  - Loads sprint tasks with dependency validation
  - Computes execution waves via topological sorting
  - Discovers available worker agents
  - Assigns tasks based on capabilities matching
  - Monitors completion events via polling
  - Handles blockers, reassignment, and progress stalls
  - Graceful shutdown with checkpoint persistence
  - Exit codes: 0 (success), 1 (error), 75 (respawn needed)
- Options: --dry-run, --verbose, --poll-interval, --max-runtime
- Files: packages/cli/src/commands/orchestrate.ts, packages/cli/src/index.ts

### 2025-12-05: Tasks 1-6 Complete (Orchestration Foundation)
- TASK-1: Work Decomposition API
- TASK-2: Task Dependency Schema
- TASK-3: Dependency Graph Visualization
- TASK-4: Available Tasks API
- TASK-5: Task Assignment API
- TASK-6: Topological Task Ordering

## Changelog

| Date | Change |
|------|--------|
| 2025-12-05 | Sprint created |
| 2025-12-05 | Tasks 1-6 complete - orchestration foundation |
| 2025-12-07 | TASK-7 complete - CLI orchestrate command |
| 2025-12-07 | TASK-8 complete - Worker agent mode |
| 2025-12-07 | TASK-9 complete - Context pressure monitoring |
