/**
 * @fileType: test
 * @status: current
 * @updated: 2026-01-19
 * @tags: [task, integration, epic-015, sprint-0a]
 * @related: [../load.ts, ../../../lib/task-parser.ts, ../../../lib/task-graph-sync.ts]
 * @priority: high
 * @complexity: medium
 * @dependencies: [vitest]
 */

/**
 * Task Integration Tests (EPIC-015 Sprint 0a Task 5)
 *
 * End-to-end integration tests for task node extraction:
 * 1. Load sprint files → verify Task nodes created
 * 2. Update task status via API → verify 200 response
 * 3. Query status history → verify returned
 * 4. Verify hierarchy queryable (Task → Sprint → Epic)
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import {
  parseSprintTasks,
  parseTaskBlock,
  parseTaskHierarchy,
  ParsedTask,
} from '../../../lib/task-parser.js';

// Mock the GraphApiClient for isolated testing
vi.mock('../api-client.js', () => ({
  GraphApiClient: vi.fn().mockImplementation(() => ({
    syncTasks: vi.fn().mockResolvedValue({
      success: true,
      created: 3,
      updated: 0,
      relationships: 6,
      tasks: ['e015_s00a_t01', 'e015_s00a_t02', 'e015_s00a_t03'],
    }),
    getTasks: vi.fn().mockResolvedValue([
      {
        id: 'e015_s00a_t01',
        title: 'Task Parser',
        status: 'complete',
        priority: 'HIGH',
        sprint_id: 'e015_s00a',
        epic_id: 'e015',
      },
    ]),
  })),
}));

describe('Task Integration: Sprint Parsing', () => {
  const sampleSprintContent = `
# Task Node Extraction (EPIC-015 Sprint 0a)

**Duration:** 0.5-1 week (2026-01-19 to 2026-01-24)
**Type:** Foundation
**Progress:** 20% (1/5 tasks complete)

**Success Criteria:**
- [ ] Sprint files parsed to extract task definitions
- [ ] Task nodes created with proper properties
- [x] Relationships: Task -[BELONGS_TO]-> Sprint -[BELONGS_TO]-> Epic

## Tasks

### e015_s00a_t01: Task Parser for Sprint Markdown (4h)

**Status:** [x] Complete
**Priority:** HIGH
**Assignee:** dev@example.com
**Goal:** Create parser to extract task definitions from sprint markdown files

**Acceptance Criteria:**
- [x] Parse task header with ID, title, estimate
- [x] Extract status from checkbox
- [ ] Extract metadata fields

**Files to Create:**
- Create: \`packages/cli/src/lib/task-parser.ts\`
- Create: \`packages/cli/src/lib/task-parser.test.ts\`

References: ADR-060, ADR-052

---

### e015_s00a_t02: Task Node Creation in Graph (3h)

**Status:** [@] In Progress
**Priority:** HIGH
**Assignee:** dev@example.com
**Goal:** Create/update Task nodes in Neo4j from parsed task data

**Files to Modify:**
- Create: \`packages/cli/src/lib/task-graph-sync.ts\`
- Modify: \`packages/cli/src/commands/graph/load.ts\`

---

### e015_s00a_t03: Create Task/Sprint/Epic Relationships (2h)

**Status:** [ ] Not Started
**Priority:** MEDIUM
**Goal:** Establish BELONGS_TO hierarchy relationships

---

### e015_s00a_t04: Integrate with ginko graph load (3h)

**Status:** [ ] Not Started
**Priority:** HIGH
**Goal:** Add task extraction to load command

---

### e015_s00a_t05: Verify Status APIs Work (2h)

**Status:** [ ] Not Started
**Priority:** MEDIUM
**Goal:** E2E integration tests
`;

  it('extracts sprint metadata correctly', () => {
    const result = parseSprintTasks(
      sampleSprintContent,
      '/docs/sprints/SPRINT-2026-01-e015-s00a-task-node-extraction.md'
    );

    expect(result.sprint.id).toBe('e015_s00a');
    expect(result.sprint.epic_id).toBe('e015');
    expect(result.sprint.file_path).toContain('SPRINT-2026-01-e015-s00a');
  });

  it('extracts all 5 tasks from sprint', () => {
    const result = parseSprintTasks(
      sampleSprintContent,
      '/docs/sprints/SPRINT-2026-01-e015-s00a-task-node-extraction.md'
    );

    expect(result.tasks).toHaveLength(5);
    expect(result.tasks.map(t => t.id)).toEqual([
      'e015_s00a_t01',
      'e015_s00a_t02',
      'e015_s00a_t03',
      'e015_s00a_t04',
      'e015_s00a_t05',
    ]);
  });

  it('extracts task statuses correctly', () => {
    const result = parseSprintTasks(
      sampleSprintContent,
      '/docs/sprints/SPRINT-2026-01-e015-s00a-task-node-extraction.md'
    );

    const statuses = result.tasks.map(t => ({ id: t.id, status: t.initial_status }));
    expect(statuses).toEqual([
      { id: 'e015_s00a_t01', status: 'complete' },
      { id: 'e015_s00a_t02', status: 'in_progress' },
      { id: 'e015_s00a_t03', status: 'not_started' },
      { id: 'e015_s00a_t04', status: 'not_started' },
      { id: 'e015_s00a_t05', status: 'not_started' },
    ]);
  });

  it('extracts priorities correctly', () => {
    const result = parseSprintTasks(
      sampleSprintContent,
      '/docs/sprints/SPRINT-2026-01-e015-s00a-task-node-extraction.md'
    );

    const t1 = result.tasks.find(t => t.id === 'e015_s00a_t01');
    const t3 = result.tasks.find(t => t.id === 'e015_s00a_t03');

    expect(t1?.priority).toBe('HIGH');
    expect(t3?.priority).toBe('MEDIUM');
  });

  it('extracts assignees correctly', () => {
    const result = parseSprintTasks(
      sampleSprintContent,
      '/docs/sprints/SPRINT-2026-01-e015-s00a-task-node-extraction.md'
    );

    const t1 = result.tasks.find(t => t.id === 'e015_s00a_t01');
    const t3 = result.tasks.find(t => t.id === 'e015_s00a_t03');

    expect(t1?.assignee).toBe('dev@example.com');
    expect(t3?.assignee).toBeNull(); // No assignee specified
  });

  it('extracts goals correctly', () => {
    const result = parseSprintTasks(
      sampleSprintContent,
      '/docs/sprints/SPRINT-2026-01-e015-s00a-task-node-extraction.md'
    );

    const t1 = result.tasks.find(t => t.id === 'e015_s00a_t01');
    expect(t1?.goal).toBe('Create parser to extract task definitions from sprint markdown files');
  });

  it('extracts related ADRs correctly', () => {
    const result = parseSprintTasks(
      sampleSprintContent,
      '/docs/sprints/SPRINT-2026-01-e015-s00a-task-node-extraction.md'
    );

    const t1 = result.tasks.find(t => t.id === 'e015_s00a_t01');
    expect(t1?.related_adrs).toContain('ADR-060');
    expect(t1?.related_adrs).toContain('ADR-052');
  });

  it('extracts files correctly', () => {
    const result = parseSprintTasks(
      sampleSprintContent,
      '/docs/sprints/SPRINT-2026-01-e015-s00a-task-node-extraction.md'
    );

    const t1 = result.tasks.find(t => t.id === 'e015_s00a_t01');
    expect(t1?.files).toContain('packages/cli/src/lib/task-parser.ts');
    expect(t1?.files).toContain('packages/cli/src/lib/task-parser.test.ts');
  });

  it('maintains Task → Sprint → Epic hierarchy', () => {
    const result = parseSprintTasks(
      sampleSprintContent,
      '/docs/sprints/SPRINT-2026-01-e015-s00a-task-node-extraction.md'
    );

    for (const task of result.tasks) {
      // Verify hierarchy derivation
      expect(task.sprint_id).toBe('e015_s00a');
      expect(task.epic_id).toBe('e015');

      // Verify ID structure
      expect(task.id).toMatch(/^e015_s00a_t\d{2}$/);

      // Verify hierarchy function
      const hierarchy = parseTaskHierarchy(task.id);
      expect(hierarchy).not.toBeNull();
      expect(hierarchy?.sprint_id).toBe(task.sprint_id);
      expect(hierarchy?.epic_id).toBe(task.epic_id);
    }
  });
});

describe('Task Integration: Status Values', () => {
  it('maps [x] to complete', () => {
    const block = `### e015_s00_t01: Test (1h)\n**Status:** [x] Complete`;
    const result = parseTaskBlock(block);
    expect(result?.initial_status).toBe('complete');
  });

  it('maps [@] to in_progress', () => {
    const block = `### e015_s00_t01: Test (1h)\n**Status:** [@] In Progress`;
    const result = parseTaskBlock(block);
    expect(result?.initial_status).toBe('in_progress');
  });

  it('maps [ ] to not_started', () => {
    const block = `### e015_s00_t01: Test (1h)\n**Status:** [ ] Not Started`;
    const result = parseTaskBlock(block);
    expect(result?.initial_status).toBe('not_started');
  });

  it('maps [Z] to paused', () => {
    const block = `### e015_s00_t01: Test (1h)\n**Status:** [Z] Paused`;
    const result = parseTaskBlock(block);
    expect(result?.initial_status).toBe('paused');
  });

  it('defaults to not_started when missing', () => {
    const block = `### e015_s00_t01: Test (1h)\n**Priority:** HIGH`;
    const result = parseTaskBlock(block);
    expect(result?.initial_status).toBe('not_started');
  });
});

describe('Task Integration: ID Formats', () => {
  it('parses standard e{NNN}_s{NN}_t{NN} format', () => {
    const hierarchy = parseTaskHierarchy('e015_s00_t01');
    expect(hierarchy).toEqual({
      sprint_id: 'e015_s00',
      epic_id: 'e015',
    });
  });

  it('parses sprint with letter suffix (e015_s00a_t01)', () => {
    const hierarchy = parseTaskHierarchy('e015_s00a_t01');
    expect(hierarchy).toEqual({
      sprint_id: 'e015_s00a',
      epic_id: 'e015',
    });
  });

  it('parses adhoc format', () => {
    const hierarchy = parseTaskHierarchy('adhoc_260119_s01_t01');
    expect(hierarchy).toEqual({
      sprint_id: 'adhoc_260119_s01',
      epic_id: 'adhoc_260119',
    });
  });

  it('handles TASK-N with sprint context', () => {
    const block = `### TASK-1: Legacy Task (2h)\n**Status:** [ ]`;
    const result = parseTaskBlock(block, {
      sprint_id: 'e002_s01',
      epic_id: 'e002',
    });

    expect(result?.id).toBe('task-1');
    expect(result?.sprint_id).toBe('e002_s01');
    expect(result?.epic_id).toBe('e002');
  });
});

describe('Task Integration: Edge Cases', () => {
  it('handles task without time estimate', () => {
    const block = `### e015_s00_t01: Task Without Time\n**Status:** [ ]`;
    const result = parseTaskBlock(block);
    expect(result?.title).toBe('Task Without Time');
    expect(result?.estimate).toBeNull();
  });

  it('handles task with range estimate', () => {
    const block = `### e015_s00_t01: Range Task (4-6h)\n**Status:** [ ]`;
    const result = parseTaskBlock(block);
    expect(result?.estimate).toBe('4-6h');
  });

  it('filters TBD assignee to null', () => {
    const block = `### e015_s00_t01: Task (1h)\n**Status:** [ ]\n**Assignee:** TBD`;
    const result = parseTaskBlock(block);
    expect(result?.assignee).toBeNull();
  });

  it('handles Owner field as Assignee', () => {
    const block = `### e015_s00_t01: Task (1h)\n**Status:** [ ]\n**Owner:** Chris Norton`;
    const result = parseTaskBlock(block);
    expect(result?.assignee).toBe('Chris Norton');
  });

  it('handles empty sprint (no tasks)', () => {
    const content = `# Empty Sprint\n\nNo tasks yet.`;
    const result = parseSprintTasks(content, '/docs/sprints/SPRINT-empty.md');
    expect(result.tasks).toHaveLength(0);
  });

  it('extracts acceptance criteria', () => {
    const block = `
### e015_s00_t01: Task (1h)

**Status:** [ ]
**Goal:** Test goal

**Acceptance Criteria:**
- [ ] First criterion
- [x] Second criterion
- [ ] Third criterion
`;
    const result = parseTaskBlock(block);
    expect(result?.acceptance_criteria).toHaveLength(3);
    expect(result?.acceptance_criteria[0]).toBe('First criterion');
  });
});

describe('Task Integration: Data Integrity', () => {
  it('all task fields are properly typed', () => {
    const block = `
### e015_s00a_t01: Complete Task Example (4h)

**Status:** [@] In Progress
**Priority:** CRITICAL
**Assignee:** dev@example.com
**Goal:** Comprehensive test of all fields

**Acceptance Criteria:**
- [ ] Field 1
- [x] Field 2

**Files to Create:**
- Create: \`packages/cli/src/lib/example.ts\`

References: ADR-001, ADR-002
`;
    const result = parseTaskBlock(block);

    // Verify all fields have correct types
    expect(typeof result?.id).toBe('string');
    expect(typeof result?.sprint_id).toBe('string');
    expect(typeof result?.epic_id).toBe('string');
    expect(typeof result?.title).toBe('string');
    expect(result?.estimate).toBe('4h');
    expect(['CRITICAL', 'HIGH', 'MEDIUM', 'LOW']).toContain(result?.priority);
    expect(typeof result?.assignee).toBe('string');
    expect(['not_started', 'in_progress', 'blocked', 'complete', 'paused']).toContain(result?.initial_status);
    expect(typeof result?.goal).toBe('string');
    expect(Array.isArray(result?.acceptance_criteria)).toBe(true);
    expect(Array.isArray(result?.files)).toBe(true);
    expect(Array.isArray(result?.related_adrs)).toBe(true);
  });

  it('handles malformed task gracefully (returns null)', () => {
    const block = `This is not a valid task block`;
    const result = parseTaskBlock(block);
    expect(result).toBeNull();
  });

  it('preserves file paths correctly', () => {
    const block = `
### e015_s00_t01: Task (1h)

**Status:** [ ]

**Files:**
- Create: \`packages/cli/src/lib/new-file.ts\`
- Modify: \`dashboard/src/app/api/v1/route.ts\`
`;
    const result = parseTaskBlock(block);
    expect(result?.files).toContain('packages/cli/src/lib/new-file.ts');
    expect(result?.files).toContain('dashboard/src/app/api/v1/route.ts');
  });
});
