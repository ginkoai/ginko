# SPRINT: Graph Content Enrichment

## Sprint Overview

**Sprint Goal**: All task content flows through graph. No file reads needed at session start.
**Duration**: 1.5 weeks
**Type**: Infrastructure sprint
**Progress:** 0% (0/5 tasks complete)

**Success Criteria:**
- [ ] Task nodes in graph include: problem, solution, approach, files, acceptanceCriteria
- [ ] `ginko push` syncs full task content to graph (not just status)
- [ ] `ginko pull` retrieves full task content from graph
- [ ] ActiveSprintData includes rich task fields
- [ ] API response time <500ms for full task content

---

## Sprint Tasks

### e020_s01_t01: Extend Task node schema (4h)
**Status:** [ ] Not Started
**Priority:** HIGH
**Confidence:** 85%

**Problem:** Task nodes only have id/name/status — no WHY-WHAT-HOW context.

**Solution:** Add 3x5 card fields (problem, solution, approach, files, acceptanceCriteria) to Task node schema.

**Approach:** Update Neo4j schema to accept new fields on Task nodes. Update API types and validation in the task/sync endpoint. Add TypeScript interfaces for rich task content.

**Scope:**
  - Includes: Neo4j schema, API types, task/sync endpoint validation
  - Excludes: UI changes, CLI parsing changes

**Files:**
- `dashboard/src/app/api/v1/task/sync/route.ts`
- `dashboard/src/types/` (task types)

Follow: ADR-052 (Entity Naming Convention)

---

### e020_s01_t02: Push full content on task creation (4h)
**Status:** [ ] Not Started
**Priority:** HIGH
**Confidence:** 80%

**Problem:** Content stays in markdown files and is not pushed to graph on task/sprint creation.

**Solution:** Push problem/solution/approach/files/acceptanceCriteria on task creation via sprint create and task create flows.

**Approach:** Modify the sprint create and task create flows in the CLI to extract rich content fields from markdown and include them in the push payload. Extend the task parser to extract 3x5 card fields.

**Scope:**
  - Includes: CLI sprint create, task create, task parser extensions
  - Excludes: Retroactive enrichment of existing tasks

**Files:**
- `packages/cli/src/lib/task-parser.ts`
- `packages/cli/src/commands/sprint/` (create flows)

---

### e020_s01_t03: Enrich ActiveSprintData response (4h)
**Status:** [ ] Not Started
**Priority:** HIGH
**Confidence:** 85%

**Problem:** API returns thin task data (taskId, taskName, status) — no context for AI.

**Solution:** Include full task content (problem, solution, approach, files, acceptanceCriteria) in the ActiveSprintData graph query response.

**Approach:** Update the graph API sprint query to return 3x5 card fields. Update the ActiveSprintData TypeScript interface. Only include full content for current and next task (lazy load).

**Scope:**
  - Includes: Graph API query, response types, ActiveSprintData interface
  - Excludes: Pagination, historical task content

**Files:**
- `dashboard/src/app/api/v1/sprint/active/route.ts`
- `packages/cli/src/types/` (ActiveSprintData)

---

### e020_s01_t04: Update ginko push for content sync (4h)
**Status:** [ ] Not Started
**Priority:** HIGH
**Confidence:** 75%

**Problem:** `ginko push` only syncs task status to graph, not content fields.

**Solution:** Sync full task content (3x5 card fields) to graph on push.

**Approach:** Extend the push command to extract rich content from sprint markdown files and include it in the task sync payload. Add content diffing to avoid unnecessary updates.

**Scope:**
  - Includes: Push command extension, content extraction, content diffing
  - Excludes: Conflict resolution (graph is authoritative)

**Uncertainties:**
- Content diffing approach needs validation against large sprint files

**Files:**
- `packages/cli/src/commands/push/`
- `packages/cli/src/lib/task-parser.ts`

---

### e020_s01_t05: Update ginko pull for content retrieval (4h)
**Status:** [ ] Not Started
**Priority:** MEDIUM
**Confidence:** 75%

**Problem:** `ginko pull` doesn't retrieve task content from graph — only status.

**Solution:** Pull full task content from graph and merge with local sprint files.

**Approach:** Extend the pull command to request rich content fields from the graph API. Merge content into local sprint markdown files, preserving local formatting where possible.

**Scope:**
  - Includes: Pull command extension, content merge logic
  - Excludes: Conflict UI, interactive merge

**Uncertainties:**
- Merge strategy for content that differs between graph and local files

**Files:**
- `packages/cli/src/commands/pull/`
- `packages/cli/src/lib/task-parser.ts`

---

## Dependencies

- **EPIC-015:** Graph-authoritative state infrastructure (complete)
- **EPIC-018 Sprint 1:** Resumption brief synthesis (complete)
