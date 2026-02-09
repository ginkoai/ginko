---
epic_id: EPIC-021
status: proposed
created: 2026-02-08
updated: 2026-02-08
roadmap_lane: now
roadmap_status: not_started
tags: [graph-authoritative, task-content, context-quality, session-start, 3x5-card]
---

# EPIC-021: Graph-Authoritative Tasks

**Status:** Proposed
**Priority:** High
**Estimated Duration:** 2 sprints (2-3 weeks)
**Prerequisite:** EPIC-018 Sprint 1 (Session Resumption Brief)
**Related ADRs:** ADR-043, ADR-052
**Related Epics:** EPIC-015 (Graph-Authoritative State), EPIC-018 (Flow State Optimization)

---

## Vision

Complete the graph-authoritative pivot by ensuring all task content (not just status) flows through the graph. Eliminate file reads at session start. Achieve instant context loading with full WHY-WHAT-HOW clarity for autonomous AI work.

**North Star:** `ginko start` provides complete context (Direction 9+, Intent 9+, Location 9+, History 8+) from graph data alone.

---

## Problem Statement

### Current State

EPIC-015 made the graph authoritative for **status**. EPIC-018 Sprint 1 implemented resumption briefs from **events**. But task **content** (the 3x5 card fields) still requires file reads:

```
From Graph API (ActiveSprintData):
  currentTask: { taskId, taskName, status }  ← THIN

From File System (TaskContent):
  problem, solution, approach, files, acceptanceCriteria  ← RICH
```

This creates:
1. **Data fragmentation** - Status from graph, content from files
2. **Slow fallback** - File reads when graph has gaps
3. **Incomplete context** - AI sees "Implement core functionality" without WHY

### Context Quality Gap (Measured)

After `ginko start`, AI self-assessment scores:

| Dimension | Score | Issue |
|-----------|-------|-------|
| Direction | 5/10 | Generic task title, no problem statement |
| Intent | 4/10 | Missing WHY - no motivation visible |
| Location | 3/10 | No entry point files shown |
| History | 4/10 | Decisions exist but truncated |

**Root cause:** Rich content exists in files but isn't pushed to graph or pulled in ActiveSprintData.

### User Story

**As an AI partner starting a session**, I want all task context (problem, solution, approach, files, acceptance criteria) loaded from the graph in one call, so I can understand WHY-WHAT-HOW without file reads or clarification cycles.

---

## Solution: Complete Graph-Authoritative Content

### Phase 1: Enrich Graph Data (API + CLI)

Push full 3x5 card content to graph on Epic/Sprint/Task creation:

```typescript
// Current Task node (thin)
{
  taskId: "e018_s02_t01",
  taskName: "Implement core functionality",
  status: "in_progress"
}

// Target Task node (rich - 3x5 card)
{
  taskId: "e018_s02_t01",
  taskName: "Implement core functionality",
  status: "in_progress",
  problem: "Task titles alone require clarification cycles...",
  solution: "Use structured rich-content schema for tasks...",
  approach: "Extend ParsedTask interface, add extraction functions...",
  files: ["src/lib/task-parser.ts", "src/commands/start/start-reflection.ts"],
  acceptanceCriteria: [
    "ParsedTask interface includes problem, scope fields",
    "Parser extracts new fields from markdown",
    "Fields sync to Neo4j task nodes"
  ],
  relatedADRs: ["ADR-052"],
  confidence: 85
}
```

### Phase 2: Enhance Session Start Output

Merge `--clean-slate` into default `ginko start` behavior. Display rich context:

```
ginko | Hot (10/10) | Think & Build | feature/dashboard-settings

RESUME: Dashboard settings - Teams to Projects rename
  WHY: Terminology "teams" confuses users expecting projects
  STOPPED AT: Checking if "team" appears in API responses
  FILES: settings.tsx, api/teams.ts
  DECISION: Use "project" consistently (ADR-045)

Sprint: Dashboard Settings Rename | 50% | 4 tasks
  Next: t02 - Update API responses (continue)

Branch: feature/dashboard-settings-projects (6 uncommitted)
```

### Phase 3: Context Scoring Feedback Loop

Auto-run context scoring after synthesis. Capture low scores for synthesis improvement:

```
ginko context score 9,8,9,7
# Logged to events for synthesis feedback loop
```

---

## Success Criteria

### Sprint 1: Graph Content Enrichment
- [ ] Task nodes in graph include: problem, solution, approach, files, acceptanceCriteria
- [ ] `ginko push` syncs full task content to graph (not just status)
- [ ] `ginko pull` retrieves full task content from graph
- [ ] ActiveSprintData includes rich task fields
- [ ] API response time <500ms for full task content

### Sprint 2: Session Start Enhancement
- [ ] `--clean-slate` merged into default `ginko start` behavior
- [ ] Start output shows WHY (problem) not just WHAT (title)
- [ ] Start output shows STOPPED AT with context
- [ ] Start output shows FILES (entry points)
- [ ] Start output shows recent DECISIONS
- [ ] Context scoring auto-runs after synthesis
- [ ] Low scores (<7) trigger enrichment suggestions

---

## Sprint Plan

### Sprint 1: Graph Content Enrichment (1.5 weeks)

**Goal:** All task content flows through graph. No file reads needed at session start.

| ID | Task | Problem | Solution | Approach |
|----|------|---------|----------|----------|
| e021_s01_t01 | Extend Task node schema | Task nodes only have id/name/status | Add 3x5 card fields to schema | Update Neo4j schema, API types, validation |
| e021_s01_t02 | Push full content on creation | Content stays in files, not pushed to graph | Push problem/solution/approach/files/AC on task creation | Modify sprint create, task create flows |
| e021_s01_t03 | Enrich ActiveSprintData response | API returns thin task data | Include full task content in sprint query | Update graph API query, response types |
| e021_s01_t04 | Update ginko push for content | Push only syncs status | Sync full task content to graph | Extend push command, add content diffing |
| e021_s01_t05 | Update ginko pull for content | Pull doesn't retrieve task content | Pull full task content from graph | Extend pull command, merge with local files |

### Sprint 2: Session Start Enhancement (1 week)

**Goal:** `ginko start` provides complete context from graph alone.

| ID | Task | Problem | Solution | Approach |
|----|------|---------|----------|----------|
| e021_s02_t01 | Merge --clean-slate to default | Separate flag adds friction | Clean-slate becomes default behavior | Remove flag, update start-reflection.ts |
| e021_s02_t02 | Display WHY in start output | Only task title shown | Show problem statement in RESUME block | Extract problem from ActiveSprintData, format |
| e021_s02_t03 | Show STOPPED AT with context | Stopping point truncated | Full stopping point with file context | Enhance resumption brief synthesis |
| e021_s02_t04 | Show entry point FILES | No visibility into where to start | Display task files prominently | Pull files from ActiveSprintData, format |
| e021_s02_t05 | Surface recent DECISIONS | Decisions exist but hidden | Show key decisions from last session | Extract from events, display in start |
| e021_s02_t06 | Auto context scoring | Scoring doesn't auto-run | Run scoring reflex after synthesis | Add scoring call, log results to events |
| e021_s02_t07 | Low score enrichment suggestions | Low scores not actionable | Suggest enrichment for dimensions <7 | Check scores, generate suggestions |

---

## Technical Architecture

### Graph Schema Extension

```cypher
// Extended Task node
CREATE (t:Task {
  id: "e021_s01_t01",
  name: "Extend Task node schema",
  status: "not_started",

  // 3x5 card fields (new)
  problem: "Task nodes only have id/name/status...",
  solution: "Add 3x5 card fields to schema...",
  approach: "Update Neo4j schema, API types...",
  files: ["packages/api/schema.ts", "packages/cli/types.ts"],
  acceptance_criteria: ["Schema includes new fields", "API returns full content"],

  // Metadata
  confidence: 85,
  related_adrs: ["ADR-052"],
  effort: "4h",
  priority: "HIGH"
})
```

### ActiveSprintData Extension

```typescript
interface ActiveSprintData {
  sprintId: string;
  sprintName: string;
  sprintGoal: string;  // NEW: Sprint-level WHY
  epicId: string;
  epicName?: string;
  progress: {
    completed: number;
    total: number;
    percentage: number;
  };
  currentTask?: {
    taskId: string;
    taskName: string;
    status: 'pending' | 'in_progress' | 'completed';
    // 3x5 card fields (NEW)
    problem?: string;
    solution?: string;
    approach?: string;
    files?: string[];
    acceptanceCriteria?: string[];
    relatedADRs?: string[];
    confidence?: number;
  };
  nextTask?: {
    taskId: string;
    taskName: string;
    problem?: string;  // Preview of next task's WHY
  };
}
```

### Start Output Format

```
ginko | {FlowState} | {WorkMode} | {Branch}

RESUME: {SprintGoal or TaskName}
  WHY: {currentTask.problem - first sentence}
  STOPPED AT: {resumptionBrief.stoppingPoint}
  FILES: {currentTask.files - top 3}
  DECISION: {resumptionBrief.decisions[0]}

Sprint: {sprintName} | {progress}% | {taskCount} tasks
  Next: {nextTask.taskId} - {nextTask.taskName} ({status})

Branch: {branch} ({uncommittedCount} uncommitted)
```

---

## Risks and Mitigations

| Risk | Impact | Mitigation |
|------|--------|------------|
| API response size increase | Slower load times | Lazy load full content only for current/next task |
| Backward compatibility | Old tasks lack content | Graceful fallback to title-only display |
| Content sync conflicts | File and graph diverge | Graph is authoritative; file is export format |

---

## Dependencies

- **EPIC-015:** Graph-authoritative state infrastructure (complete)
- **EPIC-018 Sprint 1:** Resumption brief synthesis (complete)
- **API changes:** Task node schema extension (this epic)

---

## Out of Scope

- Automatic task content generation (AI writes problem/solution) - future enhancement
- Real-time collaboration on task content - future feature
- Version history for task content changes - future feature
