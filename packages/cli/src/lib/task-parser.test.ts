/**
 * @fileType: test
 * @status: current
 * @updated: 2026-01-19
 * @tags: [task-parser, test, epic-015, sprint-0a]
 * @related: [task-parser.ts]
 * @priority: high
 * @complexity: low
 * @dependencies: [vitest]
 */

import { describe, it, expect } from 'vitest';
import {
  parseTaskHierarchy,
  parseTaskBlock,
  parseSprintTasks,
  ParsedTask,
} from './task-parser.js';

describe('parseTaskHierarchy', () => {
  it('parses standard e{NNN}_s{NN}_t{NN} format', () => {
    const result = parseTaskHierarchy('e015_s00_t01');
    expect(result).toEqual({
      sprint_id: 'e015_s00',
      epic_id: 'e015',
    });
  });

  it('parses sprint with letter suffix (e015_s00a_t01)', () => {
    const result = parseTaskHierarchy('e015_s00a_t01');
    expect(result).toEqual({
      sprint_id: 'e015_s00a',
      epic_id: 'e015',
    });
  });

  it('parses adhoc format', () => {
    const result = parseTaskHierarchy('adhoc_260119_s01_t01');
    expect(result).toEqual({
      sprint_id: 'adhoc_260119_s01',
      epic_id: 'adhoc_260119',
    });
  });

  it('returns null for legacy TASK-N format (requires context)', () => {
    const result = parseTaskHierarchy('TASK-1');
    expect(result).toBeNull();
  });

  it('returns null for invalid format', () => {
    const result = parseTaskHierarchy('invalid_task_id');
    expect(result).toBeNull();
  });
});

describe('parseTaskBlock', () => {
  it('parses standard task block with all fields', () => {
    const block = `
### e015_s00a_t01: Task Parser for Sprint Markdown (4h)

**Status:** [x] Complete
**Priority:** HIGH
**Assignee:** chris@watchhill.ai
**Goal:** Create parser to extract task definitions from sprint markdown files

**Acceptance Criteria:**
- [ ] Parse task header
- [x] Extract status from checkbox
- [ ] Extract metadata fields

**Files to Create:**
- Create: \`packages/cli/src/lib/task-parser.ts\`
- Create: \`packages/cli/src/lib/task-parser.test.ts\`

Related: ADR-060, ADR-052
`;

    const result = parseTaskBlock(block);
    expect(result).not.toBeNull();
    expect(result!.id).toBe('e015_s00a_t01');
    expect(result!.sprint_id).toBe('e015_s00a');
    expect(result!.epic_id).toBe('e015');
    expect(result!.title).toBe('Task Parser for Sprint Markdown');
    expect(result!.estimate).toBe('4h');
    expect(result!.priority).toBe('HIGH');
    expect(result!.assignee).toBe('chris@watchhill.ai');
    expect(result!.initial_status).toBe('complete');
    expect(result!.goal).toBe('Create parser to extract task definitions from sprint markdown files');
    expect(result!.acceptance_criteria).toHaveLength(3);
    expect(result!.files).toContain('packages/cli/src/lib/task-parser.ts');
    expect(result!.related_adrs).toContain('ADR-060');
    expect(result!.related_adrs).toContain('ADR-052');
  });

  it('parses task with in_progress status', () => {
    const block = `
### e015_s00a_t02: Task Node Creation (3h)

**Status:** [@] In Progress
**Priority:** HIGH
**Goal:** Create Task nodes in Neo4j
`;

    const result = parseTaskBlock(block);
    expect(result!.initial_status).toBe('in_progress');
  });

  it('parses task with not_started status (space checkbox)', () => {
    const block = `
### e015_s00a_t03: Create Relationships (2h)

**Status:** [ ] Not Started
**Priority:** MEDIUM
`;

    const result = parseTaskBlock(block);
    expect(result!.initial_status).toBe('not_started');
  });

  it('parses task with paused status', () => {
    const block = `
### e015_s00a_t04: Integration (3h)

**Status:** [Z] Paused
**Priority:** LOW
`;

    const result = parseTaskBlock(block);
    expect(result!.initial_status).toBe('paused');
  });

  it('parses task without time estimate', () => {
    const block = `
### e015_s01_t01: CLI Status Command

**Status:** [ ] Not Started
**Priority:** HIGH
**Goal:** Implement ginko task complete command
`;

    const result = parseTaskBlock(block);
    expect(result!.estimate).toBeNull();
    expect(result!.title).toBe('CLI Status Command');
  });

  it('parses adhoc task format with dash separator', () => {
    const block = `
### adhoc_260119_s01_t01 - Fix notification badge z-index

**Status:** [x] Complete
**Priority:** HIGH
`;

    const result = parseTaskBlock(block);
    expect(result!.id).toBe('adhoc_260119_s01_t01');
    expect(result!.sprint_id).toBe('adhoc_260119_s01');
    expect(result!.title).toBe('Fix notification badge z-index');
  });

  it('parses legacy TASK-N format with sprint context', () => {
    const block = `
### TASK-1: Implement Feature (4-6h)

**Status:** [ ] Not Started
**Priority:** CRITICAL
**Owner:** Chris Norton
`;

    const result = parseTaskBlock(block, {
      sprint_id: 'e002_s01',
      epic_id: 'e002',
    });
    expect(result!.id).toBe('task-1');
    expect(result!.sprint_id).toBe('e002_s01');
    expect(result!.epic_id).toBe('e002');
    expect(result!.assignee).toBe('Chris Norton');
    expect(result!.priority).toBe('CRITICAL');
  });

  it('handles missing optional fields with defaults', () => {
    const block = `
### e015_s00a_t05: E2E Tests (2h)

**Status:** [ ]
`;

    const result = parseTaskBlock(block);
    expect(result!.priority).toBe('MEDIUM');
    expect(result!.assignee).toBeNull();
    expect(result!.goal).toBeNull();
    expect(result!.acceptance_criteria).toEqual([]);
    expect(result!.files).toEqual([]);
    expect(result!.related_adrs).toEqual([]);
  });

  it('filters TBD assignee to null', () => {
    const block = `
### e015_s00a_t01: Task (2h)

**Status:** [ ]
**Assignee:** TBD
`;

    const result = parseTaskBlock(block);
    expect(result!.assignee).toBeNull();
  });

  it('returns null for invalid task block', () => {
    const block = `
This is not a task block.
Just some text.
`;

    const result = parseTaskBlock(block);
    expect(result).toBeNull();
  });
});

describe('parseSprintTasks', () => {
  it('parses multiple tasks from sprint content', () => {
    const content = `
# Task Node Extraction (EPIC-015 Sprint 0a)

**Duration:** 0.5-1 week
**Progress:** 0% (0/5 tasks complete)

## Tasks

### e015_s00a_t01: Task Parser for Sprint Markdown (4h)

**Status:** [x] Complete
**Priority:** HIGH
**Goal:** Create parser

### e015_s00a_t02: Task Node Creation (3h)

**Status:** [@] In Progress
**Priority:** HIGH
**Goal:** Create nodes

### e015_s00a_t03: Create Relationships (2h)

**Status:** [ ] Not Started
**Priority:** MEDIUM
**Goal:** Create relationships
`;

    const result = parseSprintTasks(
      content,
      '/docs/sprints/SPRINT-2026-01-e015-s00a-task-node-extraction.md'
    );

    expect(result.sprint.id).toBe('e015_s00a');
    expect(result.sprint.epic_id).toBe('e015');
    expect(result.tasks).toHaveLength(3);
    expect(result.tasks[0].id).toBe('e015_s00a_t01');
    expect(result.tasks[0].initial_status).toBe('complete');
    expect(result.tasks[1].id).toBe('e015_s00a_t02');
    expect(result.tasks[1].initial_status).toBe('in_progress');
    expect(result.tasks[2].id).toBe('e015_s00a_t03');
    expect(result.tasks[2].initial_status).toBe('not_started');
  });

  it('extracts sprint metadata from filename', () => {
    const content = `# Test Sprint`;

    const result = parseSprintTasks(
      content,
      '/docs/sprints/SPRINT-2026-01-e015-s00a-task-node-extraction.md'
    );

    expect(result.sprint.id).toBe('e015_s00a');
    expect(result.sprint.epic_id).toBe('e015');
  });

  it('extracts adhoc sprint metadata', () => {
    const content = `# Dashboard Maintenance`;

    const result = parseSprintTasks(
      content,
      '/docs/sprints/SPRINT-adhoc_260119-dashboard-maintenance.md'
    );

    expect(result.sprint.id).toBe('adhoc_260119_s01');
    expect(result.sprint.epic_id).toBe('adhoc_260119');
  });

  it('handles sprint with no tasks', () => {
    const content = `
# Empty Sprint

No tasks defined yet.
`;

    const result = parseSprintTasks(
      content,
      '/docs/sprints/SPRINT-2026-01-e015-s99-empty.md'
    );

    expect(result.tasks).toHaveLength(0);
  });
});
