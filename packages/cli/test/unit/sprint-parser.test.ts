/**
 * @fileType: test
 * @status: current
 * @updated: 2025-11-21
 * @tags: [test, sprint-parser, parsing, graph, task-2]
 * @related: [../../src/lib/sprint-parser.ts]
 * @priority: critical
 * @complexity: high
 * @dependencies: [jest, fs-extra]
 */

import { describe, it, expect, beforeEach } from '@jest/globals';
import {
  parseSprint,
  extractSprintMetadata,
  extractTasks,
  extractTaskMetadata,
  extractFilePaths,
  extractADRReferences,
  validateSprintMarkdown,
  type SprintGraph,
  type Task
} from '../../src/lib/sprint-parser.js';

/**
 * Test fixtures - realistic sprint markdown content
 */
const validSprintMarkdown = `# SPRINT: Graph Infrastructure & Core Relationships (EPIC-001 Sprint 1)

## Sprint Overview

**Sprint Goal**: Build graph-native context system with Tier 1 relationships

**Epic**: [EPIC-001: Strategic Context & Dynamic Adaptivity](../epics/EPIC-001-strategic-context-and-dynamic-adaptivity.md)

**Duration**: 2 weeks (2025-11-21 to 2025-12-05)

**Type**: Infrastructure sprint (Graph-first architecture)

---

## Sprint Tasks

### TASK-1: Charter → Graph Nodes (4-6h)
**Status:** In Progress
**Owner:** TBD
**Priority:** CRITICAL
**Effort:** 5

**Goal:** Sync charter to graph with Epic, Problem, Goal nodes

**Acceptance Criteria:**
- [x] Charter-loader.ts already exists
- [ ] Create graph sync function
- [ ] Parse charter into nodes

**Files:**
- Modify: packages/cli/src/lib/charter-loader.ts
- Create: dashboard/src/app/api/v1/charter/sync/route.ts

Related: ADR-043

---

### TASK-2: Sprint → Task Graph Structure (8-10h)
**Status:** Not Started
**Owner:** TBD
**Priority:** CRITICAL
**Effort:** 9

**Goal:** Auto-sync sprint files to graph with Sprint and Task nodes

**Acceptance Criteria:**
- [ ] Parse sprint markdown into structured data
- [ ] Detect tasks from markdown
- [ ] Extract task metadata
- [ ] Create graph nodes

**Files:**
- Create: packages/cli/src/lib/sprint-parser.ts
- Create: packages/cli/test/unit/sprint-parser.test.ts
- Create: dashboard/src/app/api/v1/sprint/sync/route.ts
- Create: dashboard/src/app/api/v1/sprint/active/route.ts

References: ADR-043, ADR-002

---

### TASK-3: Task → File Relationships (6-8h)
**Status:** Not Started
**Priority:** HIGH
**Effort:** 7

**Files:**
- Modify: packages/cli/src/lib/sprint-parser.ts
- Create: dashboard/src/app/api/v1/task/[id]/files/route.ts

---
`;

const sprintWithMetadataOnly = `# SPRINT: Simple Test Sprint

**Duration**: 2025-11-01 to 2025-11-15

**Sprint Goal**: Test parsing functionality
`;

const sprintWithNoTasks = `# SPRINT: Empty Sprint

**Sprint Goal**: This sprint has no tasks defined

## No Tasks Here
This section doesn't contain any TASK-X definitions.
`;

const sprintWithMissingMetadata = `### TASK-1: Incomplete Task

**Status:** Complete

No other metadata provided.

### TASK-2: Another Task
Just a header, no status or effort.
`;

const sprintWithInvalidDates = `# SPRINT: Bad Dates

**Duration**: Invalid Date Range

**Sprint Goal**: This has bad dates
`;

const emptySprintFile = ``;

const sprintWithMultipleTasks = `# SPRINT: Multi-Task Sprint

**Sprint Goal**: Test multiple task parsing

## Tasks

### TASK-1: First Task
**Status:** Complete
**Priority:** HIGH
**Effort:** 5

### TASK-2: Second Task
**Status:** In Progress
**Priority:** CRITICAL
**Effort:** 8

### TASK-3: Third Task
**Status:** Not Started
**Priority:** MEDIUM
**Effort:** 3

### TASK-10: Double Digit Task
**Status:** Complete
**Priority:** LOW
**Effort:** 2
`;

const sprintWithFilePathsAndADRs = `# SPRINT: Comprehensive Sprint

## Sprint Overview
**Sprint Goal**: Test file and ADR extraction

## Tasks

### TASK-1: File Extraction Test
**Status:** In Progress
**Priority:** HIGH

**Description**: Working with multiple files

**Files:**
- packages/cli/src/lib/sprint-parser.ts
- packages/cli/test/unit/sprint-parser.test.ts
- dashboard/src/app/api/v1/sprint/sync/route.ts
- Modify: packages/cli/src/core/session-log-manager.ts
- Create: packages/mcp-server/src/handlers/graph-handler.ts

### TASK-2: ADR References Test
**Status:** Not Started

Follows ADR-043 and ADR-002 implementation patterns. Also references ADR-037 for architecture decisions.

**Related Documents:**
- [ADR-033](../adr/ADR-033.md) - Context Pressure
- Check ADR-025 for constraints
- ADR-001 provides foundation

---
`;

const malformedMarkdown = `# SPRINT: Malformed Content

### TASK-1: First
This task section is incomplete and malformed

**Status:** No closing

### TASK-2: Second
**Status:** Complete
**Priority:** This is not a standard value

### TASK-3A: Invalid Task ID
Should not parse because of the "A" in ID

---
Not a valid task section
`;

/**
 * Test Suite
 */
describe('Sprint Parser', () => {
  describe('extractSprintMetadata', () => {
    it('should extract sprint name from title', () => {
      const metadata = extractSprintMetadata(validSprintMarkdown);
      expect(metadata.name).toBe('Graph Infrastructure & Core Relationships (EPIC-001 Sprint 1)');
    });

    it('should extract sprint goal from overview section', () => {
      const metadata = extractSprintMetadata(validSprintMarkdown);
      expect(metadata.goal).toContain('Build graph-native context system');
    });

    it('should parse sprint start and end dates', () => {
      const metadata = extractSprintMetadata(validSprintMarkdown);
      expect(metadata.startDate).toEqual(new Date('2025-11-21'));
      expect(metadata.endDate).toEqual(new Date('2025-12-05'));
    });

    it('should handle sprint with only goal and no dates', () => {
      const metadata = extractSprintMetadata(sprintWithMetadataOnly);
      expect(metadata.name).toBe('Simple Test Sprint');
      expect(metadata.goal).toBe('Test parsing functionality');
      expect(metadata.startDate).toEqual(new Date('2025-11-01'));
      expect(metadata.endDate).toEqual(new Date('2025-11-15'));
    });

    it('should return null dates for invalid date format', () => {
      const metadata = extractSprintMetadata(sprintWithInvalidDates);
      expect(metadata.startDate).toBeNull();
      expect(metadata.endDate).toBeNull();
    });

    it('should handle empty sprint file gracefully', () => {
      const metadata = extractSprintMetadata(emptySprintFile);
      expect(metadata.name).toBeNull();
      expect(metadata.goal).toBeNull();
    });

    it('should generate sprint ID from name', () => {
      const metadata = extractSprintMetadata(validSprintMarkdown);
      expect(metadata.id).toBeDefined();
      expect(typeof metadata.id).toBe('string');
    });

    it('should handle sprint file with minimal metadata', () => {
      const minimal = '# SPRINT: Minimal';
      const metadata = extractSprintMetadata(minimal);
      expect(metadata.name).toBe('Minimal');
    });
  });

  describe('extractTasks', () => {
    it('should extract all TASK-X sections from markdown', () => {
      const tasks = extractTasks(validSprintMarkdown);
      expect(tasks.length).toBeGreaterThanOrEqual(3);
      expect(tasks.map(t => t.id)).toContain('TASK-1');
      expect(tasks.map(t => t.id)).toContain('TASK-2');
      expect(tasks.map(t => t.id)).toContain('TASK-3');
    });

    it('should extract task content correctly', () => {
      const tasks = extractTasks(validSprintMarkdown);
      const task1 = tasks.find(t => t.id === 'TASK-1');
      expect(task1).toBeDefined();
      expect(task1!.content).toContain('Charter → Graph Nodes');
    });

    it('should return empty array for sprint with no tasks', () => {
      const tasks = extractTasks(sprintWithNoTasks);
      expect(tasks).toEqual([]);
    });

    it('should handle multiple tasks correctly', () => {
      const tasks = extractTasks(sprintWithMultipleTasks);
      expect(tasks).toHaveLength(4);
      expect(tasks.map(t => t.id)).toEqual(['TASK-1', 'TASK-2', 'TASK-3', 'TASK-10']);
    });

    it('should handle double-digit task numbers', () => {
      const tasks = extractTasks(sprintWithMultipleTasks);
      const task10 = tasks.find(t => t.id === 'TASK-10');
      expect(task10).toBeDefined();
    });

    it('should handle empty file', () => {
      const tasks = extractTasks(emptySprintFile);
      expect(tasks).toEqual([]);
    });

    it('should not extract invalid task IDs like TASK-1A', () => {
      const tasks = extractTasks(malformedMarkdown);
      const invalidTask = tasks.find(t => t.id === 'TASK-1A');
      expect(invalidTask).toBeUndefined();
    });

    it('should preserve task order as they appear in file', () => {
      const tasks = extractTasks(validSprintMarkdown);
      const ids = tasks.map(t => t.id);
      const task1Index = ids.indexOf('TASK-1');
      const task2Index = ids.indexOf('TASK-2');
      expect(task1Index).toBeLessThan(task2Index);
    });
  });

  describe('extractTaskMetadata', () => {
    it('should extract status from task section', () => {
      const tasks = extractTasks(validSprintMarkdown);
      const task1 = tasks.find(t => t.id === 'TASK-1');
      const metadata = extractTaskMetadata(task1!.content);
      expect(metadata.status).toBe('in_progress');
    });

    it('should parse "Not Started" status', () => {
      const tasks = extractTasks(validSprintMarkdown);
      const task2 = tasks.find(t => t.id === 'TASK-2');
      const metadata = extractTaskMetadata(task2!.content);
      expect(metadata.status).toBe('not_started');
    });

    it('should parse "Complete" status', () => {
      const tasks = extractTasks(sprintWithMultipleTasks);
      const task1 = tasks.find(t => t.id === 'TASK-1');
      const metadata = extractTaskMetadata(task1!.content);
      expect(metadata.status).toBe('complete');
    });

    it('should handle case-insensitive status matching', () => {
      const content = '**Status:** COMPLETE';
      const metadata = extractTaskMetadata(content);
      expect(metadata.status).toBe('complete');
    });

    it('should extract priority level', () => {
      const tasks = extractTasks(validSprintMarkdown);
      const task1 = tasks.find(t => t.id === 'TASK-1');
      const metadata = extractTaskMetadata(task1!.content);
      expect(['CRITICAL', 'critical']).toContain(metadata.priority);
    });

    it('should extract effort estimate as number', () => {
      const tasks = extractTasks(validSprintMarkdown);
      const task1 = tasks.find(t => t.id === 'TASK-1');
      const metadata = extractTaskMetadata(task1!.content);
      expect(typeof metadata.effort).toBe('number');
      expect(metadata.effort).toBe(5);
    });

    it('should handle missing effort with default value', () => {
      const content = '**Status:** Not Started\n**Priority:** HIGH';
      const metadata = extractTaskMetadata(content);
      expect(metadata.effort).toBe(0);
    });

    it('should extract title from task section', () => {
      const tasks = extractTasks(validSprintMarkdown);
      const task2 = tasks.find(t => t.id === 'TASK-2');
      const metadata = extractTaskMetadata(task2!.content);
      expect(metadata.title).toContain('Sprint → Task Graph');
    });

    it('should handle missing metadata with defaults', () => {
      const content = 'Just a task with no metadata';
      const metadata = extractTaskMetadata(content);
      expect(metadata.status).toBeNull();
      expect(metadata.priority).toBeNull();
      expect(metadata.effort).toBe(0);
    });

    it('should normalize status values to lowercase underscored format', () => {
      const testCases = [
        { input: 'Not Started', expected: 'not_started' },
        { input: 'In Progress', expected: 'in_progress' },
        { input: 'Complete', expected: 'complete' }
      ];

      testCases.forEach(({ input, expected }) => {
        const content = `**Status:** ${input}`;
        const metadata = extractTaskMetadata(content);
        expect(metadata.status).toBe(expected);
      });
    });
  });

  describe('extractFilePaths', () => {
    it('should extract file paths from "Files:" section', () => {
      const tasks = extractTasks(sprintWithFilePathsAndADRs);
      const task1 = tasks.find(t => t.id === 'TASK-1');
      const files = extractFilePaths(task1!.content);

      expect(files).toContain('packages/cli/src/lib/sprint-parser.ts');
      expect(files).toContain('packages/cli/test/unit/sprint-parser.test.ts');
      expect(files).toContain('dashboard/src/app/api/v1/sprint/sync/route.ts');
    });

    it('should handle "Modify:" prefix in file paths', () => {
      const tasks = extractTasks(sprintWithFilePathsAndADRs);
      const task1 = tasks.find(t => t.id === 'TASK-1');
      const files = extractFilePaths(task1!.content);

      expect(files).toContain('packages/cli/src/core/session-log-manager.ts');
    });

    it('should handle "Create:" prefix in file paths', () => {
      const tasks = extractTasks(sprintWithFilePathsAndADRs);
      const task1 = tasks.find(t => t.id === 'TASK-1');
      const files = extractFilePaths(task1!.content);

      expect(files).toContain('packages/mcp-server/src/handlers/graph-handler.ts');
    });

    it('should return empty array when no files section exists', () => {
      const tasks = extractTasks(validSprintMarkdown);
      const task3 = tasks.find(t => t.id === 'TASK-3');
      const files = extractFilePaths(task3!.content);

      expect(Array.isArray(files)).toBe(true);
    });

    it('should handle relative and absolute file paths', () => {
      const content = `**Files:**
- src/lib/parser.ts
- /packages/cli/src/lib/another.ts
- ../shared/utils.ts
- ./local/file.ts`;

      const files = extractFilePaths(content);
      expect(files.length).toBeGreaterThan(0);
    });

    it('should handle file paths with markdown links', () => {
      const content = `**Files:**
- [packages/cli/src/lib/file.ts](../file.ts)
- packages/cli/src/other/path.ts`;

      const files = extractFilePaths(content);
      expect(files.some(f => f.includes('packages/cli/src/lib/file.ts'))).toBe(true);
    });

    it('should deduplicate file paths', () => {
      const content = `**Files:**
- packages/cli/src/lib/file.ts
- packages/cli/src/lib/file.ts
- packages/cli/src/lib/file.ts`;

      const files = extractFilePaths(content);
      expect(files.filter(f => f.includes('file.ts')).length).toBe(1);
    });

    it('should return empty array for empty content', () => {
      const files = extractFilePaths('');
      expect(files).toEqual([]);
    });
  });

  describe('extractADRReferences', () => {
    it('should extract ADR-XXX patterns', () => {
      const tasks = extractTasks(sprintWithFilePathsAndADRs);
      const task2 = tasks.find(t => t.id === 'TASK-2');
      const adrs = extractADRReferences(task2!.content);

      expect(adrs).toContain('ADR-043');
      expect(adrs).toContain('ADR-002');
      expect(adrs).toContain('ADR-037');
    });

    it('should extract ADRs from task content and related documents', () => {
      const content = `Follows ADR-043 and ADR-002 patterns. Also ADR-037.

**Related Documents:**
- [ADR-033](../adr/ADR-033.md) - Context
- ADR-025 for constraints
- ADR-001 provides foundation`;

      const adrs = extractADRReferences(content);
      expect(adrs).toContain('ADR-043');
      expect(adrs).toContain('ADR-002');
      expect(adrs).toContain('ADR-037');
      expect(adrs).toContain('ADR-033');
      expect(adrs).toContain('ADR-025');
      expect(adrs).toContain('ADR-001');
    });

    it('should handle ADRs in markdown links', () => {
      const content = '[ADR-043](../adr/ADR-043.md) document';
      const adrs = extractADRReferences(content);
      expect(adrs).toContain('ADR-043');
    });

    it('should return empty array when no ADRs present', () => {
      const content = 'No references here, just plain text';
      const adrs = extractADRReferences(content);
      expect(adrs).toEqual([]);
    });

    it('should deduplicate ADR references', () => {
      const content = 'ADR-043 is referenced in ADR-043 multiple times in ADR-043';
      const adrs = extractADRReferences(content);
      expect(adrs.filter(a => a === 'ADR-043')).toHaveLength(1);
    });

    it('should handle ADRs with leading zeros', () => {
      const content = 'Following ADR-001, ADR-002, ADR-010';
      const adrs = extractADRReferences(content);
      expect(adrs).toContain('ADR-001');
      expect(adrs).toContain('ADR-002');
      expect(adrs).toContain('ADR-010');
    });

    it('should not match invalid ADR patterns', () => {
      const content = 'ADR-ABC or ADR- or just ADR';
      const adrs = extractADRReferences(content);
      expect(adrs).toEqual([]);
    });
  });

  describe('validateSprintMarkdown', () => {
    it('should return true for valid sprint markdown', () => {
      const result = validateSprintMarkdown(validSprintMarkdown);
      expect(result.valid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should detect missing sprint title', () => {
      const invalid = 'No title here\n\nJust content';
      const result = validateSprintMarkdown(invalid);
      expect(result.valid).toBe(false);
      expect(result.errors.some(e => e.includes('title') || e.includes('SPRINT'))).toBe(true);
    });

    it('should validate task status values', () => {
      const content = `# SPRINT: Test

### TASK-1: Test
**Status:** Invalid Status`;

      const result = validateSprintMarkdown(content);
      expect(result.errors.length).toBeGreaterThan(0);
    });

    it('should warn about tasks with missing metadata', () => {
      const content = `# SPRINT: Test

### TASK-1: Task without status`;

      const result = validateSprintMarkdown(content);
      expect(result.warnings).toBeDefined();
      expect(result.warnings?.length).toBeGreaterThan(0);
    });

    it('should handle empty content', () => {
      const result = validateSprintMarkdown('');
      expect(result.valid).toBe(false);
    });

    it('should validate date format when present', () => {
      const result = validateSprintMarkdown(sprintWithInvalidDates);
      expect(result.warnings?.length || result.errors.length).toBeGreaterThan(0);
    });
  });

  describe('parseSprint', () => {
    it('should parse valid sprint markdown into SprintGraph', async () => {
      const graph = await parseSprint(validSprintMarkdown);

      expect(graph).toBeDefined();
      expect(graph.sprint).toBeDefined();
      expect(graph.sprint.name).toBe('Graph Infrastructure & Core Relationships (EPIC-001 Sprint 1)');
      expect(graph.tasks).toBeDefined();
      expect(Array.isArray(graph.tasks)).toBe(true);
    });

    it('should populate sprint metadata correctly', async () => {
      const graph = await parseSprint(validSprintMarkdown);

      expect(graph.sprint.id).toBeDefined();
      expect(graph.sprint.goal).toContain('Build graph-native');
      expect(graph.sprint.startDate).toEqual(new Date('2025-11-21'));
      expect(graph.sprint.endDate).toEqual(new Date('2025-12-05'));
    });

    it('should populate tasks with all metadata', async () => {
      const graph = await parseSprint(validSprintMarkdown);

      expect(graph.tasks.length).toBeGreaterThanOrEqual(3);

      const task1 = graph.tasks.find(t => t.id === 'TASK-1');
      expect(task1).toBeDefined();
      expect(task1!.title).toContain('Charter');
      expect(task1!.status).toBe('in_progress');
      expect(task1!.priority).toBe('CRITICAL');
      expect(task1!.effort).toBe(5);
      expect(Array.isArray(task1!.files)).toBe(true);
      expect(Array.isArray(task1!.relatedADRs)).toBe(true);
    });

    it('should extract task files correctly', async () => {
      const graph = await parseSprint(sprintWithFilePathsAndADRs);

      const task1 = graph.tasks.find(t => t.id === 'TASK-1');
      expect(task1!.files.length).toBeGreaterThan(0);
      expect(task1!.files).toContain('packages/cli/src/lib/sprint-parser.ts');
    });

    it('should extract related ADRs for tasks', async () => {
      const graph = await parseSprint(sprintWithFilePathsAndADRs);

      const task2 = graph.tasks.find(t => t.id === 'TASK-2');
      expect(task2!.relatedADRs.length).toBeGreaterThan(0);
      expect(task2!.relatedADRs).toContain('ADR-043');
    });

    it('should handle empty sprint file', async () => {
      const graph = await parseSprint(emptySprintFile);
      expect(graph.sprint.name).toBeNull();
      expect(graph.tasks).toEqual([]);
    });

    it('should return tasks in order', async () => {
      const graph = await parseSprint(sprintWithMultipleTasks);

      const ids = graph.tasks.map(t => t.id);
      expect(ids).toEqual(['TASK-1', 'TASK-2', 'TASK-3', 'TASK-10']);
    });

    it('should handle sprint with no tasks gracefully', async () => {
      const graph = await parseSprint(sprintWithNoTasks);

      expect(graph.sprint).toBeDefined();
      expect(graph.tasks).toEqual([]);
    });

    it('should set default values for missing metadata', async () => {
      const graph = await parseSprint(sprintWithMissingMetadata);

      const task1 = graph.tasks.find(t => t.id === 'TASK-1');
      expect(task1).toBeDefined();
      expect(task1!.priority || task1!.priority === null).toBe(true);
      expect(typeof task1!.effort).toBe('number');
    });

    it('should normalize status values in output', async () => {
      const graph = await parseSprint(sprintWithMultipleTasks);

      graph.tasks.forEach(task => {
        if (task.status) {
          expect(['not_started', 'in_progress', 'complete']).toContain(task.status);
        }
      });
    });

    it('should validate sprint before parsing', async () => {
      // Should still attempt to parse even with warnings
      const graph = await parseSprint(malformedMarkdown);
      expect(graph).toBeDefined();
    });
  });

  describe('Edge Cases and Error Handling', () => {
    it('should handle sprint with very long task description', () => {
      const longDescription = 'x'.repeat(5000);
      const content = `# SPRINT: Test\n\n### TASK-1: Task\n${longDescription}`;
      const tasks = extractTasks(content);
      expect(tasks.length).toBe(1);
    });

    it('should handle tasks with special characters in titles', () => {
      const content = `# SPRINT: Test\n\n### TASK-1: Task with "quotes" & 'apostrophes' (special)`;
      const tasks = extractTasks(content);
      expect(tasks).toHaveLength(1);
    });

    it('should handle file paths with spaces', () => {
      const content = `**Files:**
- packages/cli/src/lib/my file.ts
- "packages/cli/src/lib/quoted file.ts"`;

      const files = extractFilePaths(content);
      expect(files.length).toBeGreaterThan(0);
    });

    it('should handle multiple file sections in single task', () => {
      const content = `**Files Section 1:**
- file1.ts

**Files Section 2:**
- file2.ts`;

      const files = extractFilePaths(content);
      expect(files.length).toBeGreaterThanOrEqual(1);
    });

    it('should handle whitespace variations in metadata keys', () => {
      const testCases = [
        '**Status:** Complete',
        '**Status  :** Complete',
        '**Status:** Complete ',
        '**Status:**Complete'
      ];

      testCases.forEach(content => {
        const metadata = extractTaskMetadata(content);
        expect(metadata.status).toBe('complete');
      });
    });

    it('should handle markdown formatting in task content', () => {
      const content = `### TASK-1: Task

**Bold text** and *italic text* and \`code\` in description

**Status:** Complete
**Priority:** _HIGH_`;

      const metadata = extractTaskMetadata(content);
      expect(metadata.status).toBe('complete');
    });

    it('should handle inline ADR references with brackets', () => {
      const content = '[ADR-043] and [ADR-002] references';
      const adrs = extractADRReferences(content);
      expect(adrs).toContain('ADR-043');
      expect(adrs).toContain('ADR-002');
    });

    it('should handle very large sprint files efficiently', () => {
      let largeSprint = '# SPRINT: Large\n\n';
      for (let i = 1; i <= 100; i++) {
        largeSprint += `### TASK-${i}: Task ${i}\n**Status:** Complete\n\n`;
      }

      const startTime = Date.now();
      const tasks = extractTasks(largeSprint);
      const endTime = Date.now();

      expect(tasks).toHaveLength(100);
      expect(endTime - startTime).toBeLessThan(1000); // Should parse in < 1s
    });

    it('should handle Windows-style line endings', () => {
      const content = '# SPRINT: Test\r\n\r\n### TASK-1: Task\r\n**Status:** Complete';
      const metadata = extractSprintMetadata(content);
      expect(metadata.name).toBe('Test');

      const tasks = extractTasks(content);
      expect(tasks).toHaveLength(1);
    });
  });

  describe('Integration Tests', () => {
    it('should parse complex real-world sprint file', async () => {
      const graph = await parseSprint(validSprintMarkdown);

      // Should have sprint metadata
      expect(graph.sprint.name).toBeDefined();
      expect(graph.sprint.goal).toBeDefined();

      // Should have multiple tasks
      expect(graph.tasks.length).toBeGreaterThan(0);

      // Tasks should be properly structured
      graph.tasks.forEach(task => {
        expect(task.id).toMatch(/^TASK-\d+$/);
        expect(task.title).toBeDefined();
        expect(Array.isArray(task.files)).toBe(true);
        expect(Array.isArray(task.relatedADRs)).toBe(true);
      });
    });

    it('should handle sprint with mixed metadata quality', async () => {
      const mixedSprint = `# SPRINT: Mixed Quality

**Sprint Goal**: Test parsing with varying metadata quality

### TASK-1: Complete Task
**Status:** In Progress
**Priority:** CRITICAL
**Effort:** 5
**Files:** packages/cli/src/lib/file.ts
Related: ADR-043

### TASK-2: Minimal Task
**Status:** Not Started

### TASK-3: Extra Fields Task
**Status:** Complete
**Priority:** HIGH
**Effort:** 3
**Owner:** John Doe
**Custom Field:** Some Value
**Files:**
- file1.ts
- file2.ts`;

      const graph = await parseSprint(mixedSprint);
      expect(graph.tasks).toHaveLength(3);
      expect(graph.tasks[0].status).toBe('in_progress');
      expect(graph.tasks[1].status).toBe('not_started');
      expect(graph.tasks[2].status).toBe('complete');
    });
  });
});
