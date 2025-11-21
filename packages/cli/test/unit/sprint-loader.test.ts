/**
 * @fileType: test
 * @status: current
 * @updated: 2025-11-21
 * @tags: [test, sprint-loader, checklist, task-5, epic-001]
 * @related: [../../src/lib/sprint-loader.ts]
 * @priority: high
 * @complexity: medium
 * @dependencies: [jest]
 */

import { describe, it, expect } from '@jest/globals';
import {
  parseSprintChecklist,
  formatSprintChecklist,
  formatCurrentTaskDetails,
  type TaskState,
  type Task,
  type SprintChecklist
} from '../../src/lib/sprint-loader.js';

/**
 * Test fixtures - Sprint markdown with different task states
 */
const sprintWithMixedStates = `# SPRINT: Graph Infrastructure & Core Relationships (EPIC-001 Sprint 1)

## Sprint Overview

**Sprint Goal**: Build graph-native context system

**Duration**: 2 weeks (2025-11-21 to 2025-12-05)

**Progress:** 60% (3/5 tasks complete, 1 in progress)

---

## Sprint Tasks

### TASK-1: Charter → Graph Nodes (4-6h)
**Status:** [x] Complete
**Owner:** Chris Norton
**Priority:** CRITICAL

**Goal:** Sync charter to graph with Epic, Problem, Goal nodes

**Files:**
- Modify: \`packages/cli/src/lib/charter-loader.ts\`
- Create: \`dashboard/src/app/api/v1/charter/sync/route.ts\`

---

### TASK-2: Sprint → Task Graph Structure (8-10h)
**Status:** [x] Complete
**Owner:** Chris Norton
**Priority:** CRITICAL

**Goal:** Auto-sync sprint files to graph

**Files:**
- Create: \`packages/cli/src/lib/sprint-parser.ts\`
- Create: \`dashboard/src/app/api/v1/sprint/sync/route.ts\`

---

### TASK-3: Task → File Relationships (6-8h)
**Status:** [x] Complete
**Owner:** Chris Norton
**Priority:** HIGH

**Goal:** Create MODIFIES relationships

**Files:**
- Create: \`dashboard/src/app/api/v1/task/[id]/files/route.ts\`

---

### TASK-4: Task → Event Relationships (6-8h)
**Status:** [@] In Progress
**Owner:** Chris Norton
**Priority:** HIGH

**Goal:** Connect tasks to events for hot/cold detection

**Files:**
- Create: \`packages/cli/src/lib/event-task-linker.ts\`
- Create: \`dashboard/src/app/api/v1/task/[id]/activity/route.ts\`

---

### TASK-5: Sprint Command (4-6h)
**Status:** [ ] Not Started
**Priority:** MEDIUM

**Goal:** Add ginko sprint command for progress tracking

**Files:**
- Create: \`packages/cli/src/commands/sprint.ts\`

---
`;

const sprintAllComplete = `# SPRINT: Test Sprint

**Progress:** 100% (2/2 tasks complete)

## Sprint Tasks

### TASK-1: First Task
**Status:** [x] Complete

### TASK-2: Second Task
**Status:** [x] Complete
`;

const sprintAllTodo = `# SPRINT: New Sprint

**Progress:** 0% (0/3 tasks complete)

## Sprint Tasks

### TASK-1: First Task
**Status:** [ ] Not Started

### TASK-2: Second Task
**Status:** [ ] Not Started

### TASK-3: Third Task
**Status:** [ ] Not Started
`;

const sprintMultipleInProgress = `# SPRINT: Parallel Work Sprint

**Progress:** 33% (1/3 complete, 2 in progress)

## Sprint Tasks

### TASK-1: Completed Task
**Status:** [x] Complete

### TASK-2: First Active Task
**Status:** [@] In Progress
**Priority:** HIGH

### TASK-3: Second Active Task
**Status:** [@] In Progress
**Priority:** MEDIUM
`;

/**
 * Task State Parsing Tests
 */
describe('Task State Parsing', () => {
  it('should parse [ ] as todo state', () => {
    const checklist = parseSprintChecklist(sprintAllTodo, 'test.md');
    expect(checklist.tasks.every(t => t.state === 'todo')).toBe(true);
    expect(checklist.progress.todo).toBe(3);
    expect(checklist.progress.complete).toBe(0);
    expect(checklist.progress.inProgress).toBe(0);
  });

  it('should parse [@] as in_progress state', () => {
    const checklist = parseSprintChecklist(sprintWithMixedStates, 'test.md');
    const inProgressTask = checklist.tasks.find(t => t.id === 'TASK-4');
    expect(inProgressTask?.state).toBe('in_progress');
    expect(checklist.progress.inProgress).toBe(1);
  });

  it('should parse [x] as complete state', () => {
    const checklist = parseSprintChecklist(sprintAllComplete, 'test.md');
    expect(checklist.tasks.every(t => t.state === 'complete')).toBe(true);
    expect(checklist.progress.complete).toBe(2);
  });

  it('should handle mixed task states correctly', () => {
    const checklist = parseSprintChecklist(sprintWithMixedStates, 'test.md');
    expect(checklist.progress.complete).toBe(3);
    expect(checklist.progress.inProgress).toBe(1);
    expect(checklist.progress.todo).toBe(1);
    expect(checklist.progress.total).toBe(5);
  });
});

/**
 * Sprint Metadata Parsing Tests
 */
describe('Sprint Metadata Parsing', () => {
  it('should extract sprint name from title', () => {
    const checklist = parseSprintChecklist(sprintWithMixedStates, 'test.md');
    expect(checklist.name).toBe('Graph Infrastructure & Core Relationships (EPIC-001 Sprint 1)');
  });

  it('should use filename as fallback if no title', () => {
    const minimal = '### TASK-1: Test\n**Status:** [ ] Not Started';
    const checklist = parseSprintChecklist(minimal, 'SPRINT-2025-12-test.md');
    expect(checklist.name).toBe('SPRINT-2025-12-test');
  });

  it('should extract task IDs correctly', () => {
    const checklist = parseSprintChecklist(sprintWithMixedStates, 'test.md');
    const taskIds = checklist.tasks.map(t => t.id);
    expect(taskIds).toEqual(['TASK-1', 'TASK-2', 'TASK-3', 'TASK-4', 'TASK-5']);
  });

  it('should extract task titles correctly', () => {
    const checklist = parseSprintChecklist(sprintWithMixedStates, 'test.md');
    const task1 = checklist.tasks.find(t => t.id === 'TASK-1');
    expect(task1?.title).toBe('Charter → Graph Nodes');
  });

  it('should extract effort estimates', () => {
    const checklist = parseSprintChecklist(sprintWithMixedStates, 'test.md');
    const task1 = checklist.tasks.find(t => t.id === 'TASK-1');
    expect(task1?.effort).toBe('4-6h');
  });

  it('should extract priority levels', () => {
    const checklist = parseSprintChecklist(sprintWithMixedStates, 'test.md');
    const task1 = checklist.tasks.find(t => t.id === 'TASK-1');
    expect(task1?.priority).toBe('CRITICAL');
  });

  it('should extract file paths from Files section', () => {
    const checklist = parseSprintChecklist(sprintWithMixedStates, 'test.md');
    const task1 = checklist.tasks.find(t => t.id === 'TASK-1');
    expect(task1?.files).toContain('packages/cli/src/lib/charter-loader.ts');
    expect(task1?.files).toContain('dashboard/src/app/api/v1/charter/sync/route.ts');
  });
});

/**
 * Current Task Detection Tests
 */
describe('Current Task Detection', () => {
  it('should identify first [@] task as current', () => {
    const checklist = parseSprintChecklist(sprintWithMixedStates, 'test.md');
    expect(checklist.currentTask?.id).toBe('TASK-4');
    expect(checklist.currentTask?.state).toBe('in_progress');
  });

  it('should fall back to first [ ] task if no [@]', () => {
    const checklist = parseSprintChecklist(sprintAllTodo, 'test.md');
    expect(checklist.currentTask?.id).toBe('TASK-1');
    expect(checklist.currentTask?.state).toBe('todo');
  });

  it('should have no current task if all complete', () => {
    const checklist = parseSprintChecklist(sprintAllComplete, 'test.md');
    expect(checklist.currentTask).toBeUndefined();
  });

  it('should prefer [@] over [ ] even if [@] comes later', () => {
    const checklist = parseSprintChecklist(sprintWithMixedStates, 'test.md');
    // TASK-4 is [@] and TASK-5 is [ ]
    expect(checklist.currentTask?.id).toBe('TASK-4');
  });

  it('should handle multiple [@] tasks (return first)', () => {
    const checklist = parseSprintChecklist(sprintMultipleInProgress, 'test.md');
    expect(checklist.currentTask?.id).toBe('TASK-2');
    expect(checklist.progress.inProgress).toBe(2);
  });
});

/**
 * Recent Completions Tests
 */
describe('Recent Completions', () => {
  it('should return last 3 completed tasks', () => {
    const checklist = parseSprintChecklist(sprintWithMixedStates, 'test.md');
    expect(checklist.recentCompletions).toHaveLength(3);
    expect(checklist.recentCompletions[0].id).toBe('TASK-3'); // Most recent first
    expect(checklist.recentCompletions[1].id).toBe('TASK-2');
    expect(checklist.recentCompletions[2].id).toBe('TASK-1');
  });

  it('should return all completions if less than 3', () => {
    const checklist = parseSprintChecklist(sprintAllComplete, 'test.md');
    expect(checklist.recentCompletions).toHaveLength(2);
  });

  it('should return empty array if no completions', () => {
    const checklist = parseSprintChecklist(sprintAllTodo, 'test.md');
    expect(checklist.recentCompletions).toHaveLength(0);
  });
});

/**
 * Progress Calculation Tests
 */
describe('Progress Calculation', () => {
  it('should calculate progress percentages correctly', () => {
    const checklist = parseSprintChecklist(sprintWithMixedStates, 'test.md');
    expect(checklist.progress.complete).toBe(3);
    expect(checklist.progress.total).toBe(5);
    // 3/5 = 60%
  });

  it('should handle 100% completion', () => {
    const checklist = parseSprintChecklist(sprintAllComplete, 'test.md');
    expect(checklist.progress.complete).toBe(2);
    expect(checklist.progress.total).toBe(2);
    // 2/2 = 100%
  });

  it('should handle 0% completion', () => {
    const checklist = parseSprintChecklist(sprintAllTodo, 'test.md');
    expect(checklist.progress.complete).toBe(0);
    expect(checklist.progress.total).toBe(3);
  });
});

/**
 * Formatting Tests
 */
describe('Sprint Checklist Formatting', () => {
  it('should format sprint header with progress', () => {
    const checklist = parseSprintChecklist(sprintWithMixedStates, 'test.md');
    const output = formatSprintChecklist(checklist, 10);

    expect(output).toContain('📋 Active Sprint: Graph Infrastructure');
    expect(output).toContain('Progress: 3/5 complete, 1 in progress (60%)');
  });

  it('should mark current task with RESUME HERE', () => {
    const checklist = parseSprintChecklist(sprintWithMixedStates, 'test.md');
    const output = formatSprintChecklist(checklist, 10);

    expect(output).toContain('[@] TASK-4: Task → Event Relationships ← RESUME HERE');
  });

  it('should display correct checkbox symbols', () => {
    const checklist = parseSprintChecklist(sprintWithMixedStates, 'test.md');
    const output = formatSprintChecklist(checklist, 10);

    expect(output).toContain('[x] TASK-1');
    expect(output).toContain('[x] TASK-2');
    expect(output).toContain('[x] TASK-3');
    expect(output).toContain('[@] TASK-4');
    expect(output).toContain('[ ] TASK-5');
  });

  it('should truncate task list if exceeds maxTasks', () => {
    const checklist = parseSprintChecklist(sprintWithMixedStates, 'test.md');
    const output = formatSprintChecklist(checklist, 3);

    expect(output).toContain('... (2 more tasks)');
  });

  it('should show celebration when 100% complete', () => {
    const checklist = parseSprintChecklist(sprintAllComplete, 'test.md');
    const output = formatSprintChecklist(checklist, 10);

    expect(output).toContain('🎉 Sprint Complete! All tasks done.');
  });

  it('should warn about multiple in-progress tasks', () => {
    const checklist = parseSprintChecklist(sprintMultipleInProgress, 'test.md');
    const output = formatSprintChecklist(checklist, 10);

    expect(output).toContain('⚠️  Multiple tasks in progress (2)');
    expect(output).toContain('Primary: TASK-2');
    expect(output).toContain('Also active: TASK-3');
  });
});

/**
 * Current Task Details Formatting Tests
 */
describe('Current Task Details Formatting', () => {
  it('should format task with all metadata', () => {
    const task: Task = {
      id: 'TASK-4',
      title: 'Task → Event Relationships',
      state: 'in_progress',
      priority: 'HIGH',
      effort: '6-8h',
      files: ['packages/cli/src/lib/event-task-linker.ts', 'dashboard/src/app/api/v1/task/[id]/activity/route.ts'],
    };

    const output = formatCurrentTaskDetails(task);

    expect(output).toContain('🎯 Current Task (TASK-4):');
    expect(output).toContain('Status: In progress');
    expect(output).toContain('Priority: HIGH');
    expect(output).toContain('Effort: 6-8h');
    expect(output).toContain('Files: packages/cli/src/lib/event-task-linker.ts');
  });

  it('should truncate file list if more than 3 files', () => {
    const task: Task = {
      id: 'TASK-1',
      title: 'Test Task',
      state: 'in_progress',
      files: ['file1.ts', 'file2.ts', 'file3.ts', 'file4.ts', 'file5.ts'],
    };

    const output = formatCurrentTaskDetails(task);

    expect(output).toContain('file1.ts, file2.ts, file3.ts (+2 more)');
  });

  it('should show "Ready to start" for todo tasks', () => {
    const task: Task = {
      id: 'TASK-5',
      title: 'New Task',
      state: 'todo',
    };

    const output = formatCurrentTaskDetails(task);

    expect(output).toContain('Status: Ready to start');
  });

  it('should handle task with pattern reference', () => {
    const task: Task = {
      id: 'TASK-5',
      title: 'Add message argument',
      state: 'todo',
      pattern: 'log.ts:45-67',
    };

    const output = formatCurrentTaskDetails(task);

    expect(output).toContain('Pattern: log.ts:45-67');
  });
});

/**
 * Edge Cases Tests
 */
describe('Edge Cases', () => {
  it('should handle empty sprint markdown', () => {
    const checklist = parseSprintChecklist('', 'test.md');
    expect(checklist.tasks).toHaveLength(0);
    expect(checklist.progress.total).toBe(0);
  });

  it('should handle sprint with no tasks section', () => {
    const noTasks = '# SPRINT: Test\n\n**Goal:** Do stuff';
    const checklist = parseSprintChecklist(noTasks, 'test.md');
    expect(checklist.tasks).toHaveLength(0);
  });

  it('should handle malformed task headers gracefully', () => {
    const malformed = `
### TASK-1: Valid Task
**Status:** [x] Complete

### Invalid Header Without TASK-ID
**Status:** [ ] Not Started

### TASK-2: Another Valid Task
**Status:** [ ] Not Started
`;
    const checklist = parseSprintChecklist(malformed, 'test.md');
    expect(checklist.tasks).toHaveLength(2); // Only valid tasks
    expect(checklist.tasks.map(t => t.id)).toEqual(['TASK-1', 'TASK-2']);
  });

  it('should handle missing status line (default to todo)', () => {
    const noStatus = `
### TASK-1: Task Without Status
**Priority:** HIGH
`;
    const checklist = parseSprintChecklist(noStatus, 'test.md');
    expect(checklist.tasks[0].state).toBe('todo');
  });

  it('should handle case-insensitive [X] for completion', () => {
    const upperX = '### TASK-1: Test\n**Status:** [X] Complete';
    const checklist = parseSprintChecklist(upperX, 'test.md');
    expect(checklist.tasks[0].state).toBe('complete');
  });
});
