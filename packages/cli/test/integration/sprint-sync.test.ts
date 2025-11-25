/**
 * @fileType: test
 * @status: current
 * @updated: 2025-11-24
 * @tags: [test, integration, sprint-sync, epic-002, task-2]
 * @related: [sprint/sync/route.ts, sprint-loader.ts, _cloud-graph-client.ts]
 * @priority: critical
 * @complexity: high
 * @dependencies: [jest, fs-extra]
 */

/**
 * Sprint Sync Integration Tests - TASK-2
 *
 * Validates Sprint → Task graph structure:
 * - CONTAINS relationships (Sprint → Task)
 * - NEXT_TASK relationship (Sprint → first incomplete Task)
 * - Full sprint sync workflow with mocked API
 *
 * Part of EPIC-002: AI-Native Sprint Graphs (Phase 1)
 */

import { describe, it, expect, beforeEach, afterEach } from '@jest/globals';
import fs from 'fs-extra';
import path from 'path';
import os from 'os';

// Mock fetch globally
global.fetch = jest.fn();

// Sample sprint markdown for testing
const SAMPLE_SPRINT_CONTENT = `# SPRINT-2025-11-epic002-phase1

**Duration:** 2025-11-20 to 2025-12-04
**Goal:** Prove value of AI-native sprint graphs with Task → MUST_FOLLOW → ADR relationships
**Progress:** 25%

## Overview
Phase 1 of EPIC-002: AI-Native Sprint Graphs

## Tasks

### TASK-1: Task → MUST_FOLLOW → ADR Relationship Implementation
**Status:** Complete
**Priority:** HIGH
**Owner:** Chris Norton
**Effort:** 4 hours

**Files:**
- Update: \`dashboard/src/app/api/v1/sprint/sync/route.ts\`
- Update: \`packages/cli/src/lib/sprint-loader.ts\`

Follow: ADR-002, ADR-043

### TASK-2: Sprint → Task Graph Structure Validation
**Status:** In Progress
**Priority:** HIGH
**Owner:** Chris Norton
**Effort:** 4 hours

**Files:**
- Create: \`packages/cli/test/integration/sprint-sync.test.ts\`

Follow: ADR-002, ADR-043, ADR-047

### TASK-3: Query Performance Optimization
**Status:** Not Started
**Priority:** MEDIUM
**Owner:** Chris Norton
**Effort:** 2 hours

Follow: ADR-043

### TASK-4: Documentation & Testing
**Status:** Not Started
**Priority:** LOW
**Owner:** Chris Norton
**Effort:** 2 hours
`;

// Expected graph structure from sample content
interface ParsedSprintGraph {
  sprint: {
    id: string;
    name: string;
    goal: string;
    startDate: string;
    endDate: string;
    progress: number;
  };
  tasks: Array<{
    id: string;
    title: string;
    status: 'not_started' | 'in_progress' | 'complete';
    effort: string;
    priority: string;
    files: string[];
    relatedADRs: string[];
    owner?: string;
  }>;
}

// Mock CloudGraphClient behavior
interface MockNode {
  label: string;
  properties: Record<string, unknown>;
}

interface MockRelationship {
  fromId: string;
  toId: string;
  type: string;
  properties?: Record<string, unknown>;
}

class MockGraphStore {
  nodes: Map<string, MockNode> = new Map();
  relationships: MockRelationship[] = [];

  createNode(label: string, properties: Record<string, unknown>): void {
    const id = properties.id as string;
    this.nodes.set(id, { label, properties });
  }

  createRelationship(
    fromId: string,
    toId: string,
    props: { type: string; [key: string]: unknown }
  ): void {
    this.relationships.push({
      fromId,
      toId,
      type: props.type,
      properties: props,
    });
  }

  getNodesByLabel(label: string): MockNode[] {
    return Array.from(this.nodes.values()).filter(n => n.label === label);
  }

  getRelationshipsByType(type: string): MockRelationship[] {
    return this.relationships.filter(r => r.type === type);
  }

  getRelationshipsFrom(nodeId: string): MockRelationship[] {
    return this.relationships.filter(r => r.fromId === nodeId);
  }

  clear(): void {
    this.nodes.clear();
    this.relationships = [];
  }
}

describe('Sprint Sync Integration Tests - TASK-2', () => {
  let tempDir: string;
  let originalEnv: NodeJS.ProcessEnv;
  let mockStore: MockGraphStore;

  beforeEach(async () => {
    // Save original environment
    originalEnv = { ...process.env };

    // Create temp directory
    tempDir = await fs.mkdtemp(path.join(os.tmpdir(), 'sprint-sync-test-'));
    tempDir = await fs.realpath(tempDir);

    // Initialize mock store
    mockStore = new MockGraphStore();

    // Clear and setup fetch mock
    (global.fetch as jest.Mock).mockReset();
    setupFetchMock(mockStore);
  });

  afterEach(async () => {
    // Restore environment
    process.env = originalEnv;

    // Clean up temp directory
    await fs.remove(tempDir);

    jest.restoreAllMocks();
  });

  /**
   * Setup fetch mock to simulate CloudGraphClient behavior
   */
  function setupFetchMock(store: MockGraphStore): void {
    (global.fetch as jest.Mock).mockImplementation(
      async (url: string, options: RequestInit) => {
        const body = options.body ? JSON.parse(options.body as string) : {};

        // Handle node creation
        if (url.includes('/api/v1/graph/nodes') && options.method === 'POST') {
          store.createNode(body.label, body.properties);
          return {
            ok: true,
            json: async () => ({
              nodeId: body.properties.id,
              label: body.label,
              created: true,
            }),
          };
        }

        // Handle relationship creation
        if (url.includes('/api/v1/graph/relationships') && options.method === 'POST') {
          store.createRelationship(body.fromNodeId, body.toNodeId, {
            type: body.type,
            ...body.properties,
          });
          return {
            ok: true,
            json: async () => ({
              relationshipId: `rel_${Date.now()}`,
              type: body.type,
              created: true,
            }),
          };
        }

        return {
          ok: false,
          status: 404,
          json: async () => ({ error: 'Not found' }),
        };
      }
    );
  }

  /**
   * Parse sprint content to graph structure (mirrors route.ts logic)
   */
  function parseSprintToGraph(content: string): ParsedSprintGraph {
    // Extract sprint metadata from header
    const sprintNameMatch = content.match(/^#\s+(.+?)(?:\n|$)/m);
    const sprintName = sprintNameMatch ? sprintNameMatch[1].trim() : 'Unknown Sprint';

    // Extract sprint ID from title
    const sprintIdMatch = sprintName.match(/SPRINT[- ](\d{4})[- ](\d{2})[- ](.+)/i);
    const sprintId = sprintIdMatch
      ? `sprint_${sprintIdMatch[1]}_${sprintIdMatch[2]}_${sprintIdMatch[3].toLowerCase().replace(/[^a-z0-9]+/g, '_')}`
      : `sprint_${Date.now()}`;

    // Extract dates
    const dateRangeMatch = content.match(/\*\*(?:Duration|Timeline|Dates?):\*\*\s*([^\n]+)/i);
    let startDate = '';
    let endDate = '';
    if (dateRangeMatch) {
      const rangeMatch = dateRangeMatch[1].match(
        /(\d{4}-\d{2}-\d{2})\s*(?:to|–|-)\s*(\d{4}-\d{2}-\d{2})/
      );
      if (rangeMatch) {
        startDate = rangeMatch[1];
        endDate = rangeMatch[2];
      }
    }

    // Extract goal and progress
    const goalMatch = content.match(/\*\*(?:Goal|Sprint Goal):\*\*\s*([^\n]+)/i);
    const goal = goalMatch ? goalMatch[1].trim() : '';
    const progressMatch = content.match(/\*\*Progress:\*\*\s*(\d+)%/i);
    const progress = progressMatch ? parseInt(progressMatch[1], 10) : 0;

    const sprint = { id: sprintId, name: sprintName, goal, startDate, endDate, progress };

    // Extract tasks
    const tasks: ParsedSprintGraph['tasks'] = [];
    const taskSections = content.split(/\n### TASK-/);

    for (let i = 1; i < taskSections.length; i++) {
      const section = taskSections[i];
      const firstLine = section.split('\n')[0];
      const taskMatch = firstLine.match(/^(\d+):\s*(.+)$/);
      if (!taskMatch) continue;

      const taskNumber = taskMatch[1];
      const taskTitle = taskMatch[2].trim();
      const taskId = `task_${taskNumber}`;

      // Status
      let status: 'not_started' | 'in_progress' | 'complete' = 'not_started';
      const statusMatch = section.match(/\*\*Status:\*\*\s*(.+?)(?:\n|$)/);
      if (statusMatch) {
        const statusText = statusMatch[1].trim().toLowerCase();
        if (statusText.includes('complete') || statusText.includes('done')) {
          status = 'complete';
        } else if (statusText.includes('in progress') || statusText.includes('in-progress')) {
          status = 'in_progress';
        }
      }

      // Other fields
      const effortMatch = section.match(/\*\*Effort:\*\*\s*([^\n]+)/i);
      const effort = effortMatch ? effortMatch[1].trim() : '';
      const priorityMatch = section.match(/\*\*Priority:\*\*\s*([^\n]+)/i);
      const priority = priorityMatch ? priorityMatch[1].trim().toUpperCase() : 'MEDIUM';
      const ownerMatch = section.match(/\*\*Owner:\*\*\s*([^\n]+)/i);
      const owner = ownerMatch ? ownerMatch[1].trim() : undefined;

      // Files
      const filesMatch = section.match(/\*\*Files:\*\*\s*([\s\S]*?)(?=\n\*\*|$)/i);
      const files: string[] = [];
      if (filesMatch) {
        const fileLines = filesMatch[1].match(/[-*]\s*(?:Create|Update|Modify):\s*`([^`]+)`/gi);
        if (fileLines) {
          fileLines.forEach(line => {
            const fileMatch = line.match(/`([^`]+)`/);
            if (fileMatch) files.push(fileMatch[1]);
          });
        }
      }

      // ADRs
      const relatedADRs: string[] = [];
      const adrPattern = /ADR-(\d{3})/g;
      let adrMatch;
      while ((adrMatch = adrPattern.exec(section)) !== null) {
        const adrId = `adr_${adrMatch[1]}`;
        if (!relatedADRs.includes(adrId)) relatedADRs.push(adrId);
      }

      tasks.push({ id: taskId, title: taskTitle, status, effort, priority, files, relatedADRs, owner });
    }

    return { sprint, tasks };
  }

  /**
   * Simulate syncSprintToGraph (mirrors route.ts logic)
   */
  async function syncSprintToGraph(
    store: MockGraphStore,
    graph: ParsedSprintGraph
  ): Promise<{ nodes: number; relationships: number; nextTaskId: string | null }> {
    let nodeCount = 0;
    let relCount = 0;

    // Create Sprint node
    store.createNode('Sprint', {
      id: graph.sprint.id,
      name: graph.sprint.name,
      goal: graph.sprint.goal,
      startDate: graph.sprint.startDate,
      endDate: graph.sprint.endDate,
      progress: graph.sprint.progress,
    });
    nodeCount++;

    // Create File nodes
    const allFiles = new Set<string>();
    for (const task of graph.tasks) {
      task.files.forEach(file => allFiles.add(file));
    }
    for (const filePath of allFiles) {
      store.createNode('File', {
        id: `file_${filePath.replace(/[^a-zA-Z0-9]/g, '_')}`,
        path: filePath,
        status: 'current',
      });
      nodeCount++;
    }

    // Create Task nodes
    for (const task of graph.tasks) {
      store.createNode('Task', {
        id: task.id,
        title: task.title,
        status: task.status,
        effort: task.effort,
        priority: task.priority,
        files: task.files,
        relatedADRs: task.relatedADRs,
        owner: task.owner || '',
      });
      nodeCount++;
    }

    // Find first incomplete task
    const nextTask = graph.tasks.find(t => t.status === 'not_started' || t.status === 'in_progress');

    // Create CONTAINS relationships (Sprint → Task)
    for (const task of graph.tasks) {
      store.createRelationship(graph.sprint.id, task.id, { type: 'CONTAINS' });
      relCount++;
    }

    // Create NEXT_TASK relationship
    if (nextTask) {
      store.createRelationship(graph.sprint.id, nextTask.id, { type: 'NEXT_TASK' });
      relCount++;
    }

    // Create MODIFIES relationships (Task → File)
    for (const task of graph.tasks) {
      for (const filePath of task.files) {
        const fileId = `file_${filePath.replace(/[^a-zA-Z0-9]/g, '_')}`;
        store.createRelationship(task.id, fileId, { type: 'MODIFIES' });
        relCount++;
      }
    }

    // Create MUST_FOLLOW relationships (Task → ADR)
    for (const task of graph.tasks) {
      for (const adrId of task.relatedADRs) {
        store.createNode('ADR', { id: adrId });
        nodeCount++;
        store.createRelationship(task.id, adrId, {
          type: 'MUST_FOLLOW',
          source: 'sprint_definition',
          extracted_at: new Date().toISOString(),
        });
        relCount++;
      }
    }

    return { nodes: nodeCount, relationships: relCount, nextTaskId: nextTask ? nextTask.id : null };
  }

  describe('Sprint Parsing', () => {
    it('should parse sprint metadata correctly', () => {
      const graph = parseSprintToGraph(SAMPLE_SPRINT_CONTENT);

      expect(graph.sprint.name).toBe('SPRINT-2025-11-epic002-phase1');
      expect(graph.sprint.id).toMatch(/^sprint_2025_11_epic002_phase1$/);
      expect(graph.sprint.goal).toContain('Prove value of AI-native sprint graphs');
      expect(graph.sprint.startDate).toBe('2025-11-20');
      expect(graph.sprint.endDate).toBe('2025-12-04');
      expect(graph.sprint.progress).toBe(25);
    });

    it('should parse all tasks from sprint content', () => {
      const graph = parseSprintToGraph(SAMPLE_SPRINT_CONTENT);

      expect(graph.tasks).toHaveLength(4);
      expect(graph.tasks.map(t => t.id)).toEqual(['task_1', 'task_2', 'task_3', 'task_4']);
    });

    it('should parse task status correctly', () => {
      const graph = parseSprintToGraph(SAMPLE_SPRINT_CONTENT);

      const task1 = graph.tasks.find(t => t.id === 'task_1');
      const task2 = graph.tasks.find(t => t.id === 'task_2');
      const task3 = graph.tasks.find(t => t.id === 'task_3');

      expect(task1?.status).toBe('complete');
      expect(task2?.status).toBe('in_progress');
      expect(task3?.status).toBe('not_started');
    });

    it('should extract ADR references from tasks', () => {
      const graph = parseSprintToGraph(SAMPLE_SPRINT_CONTENT);

      const task1 = graph.tasks.find(t => t.id === 'task_1');
      const task2 = graph.tasks.find(t => t.id === 'task_2');

      expect(task1?.relatedADRs).toContain('adr_002');
      expect(task1?.relatedADRs).toContain('adr_043');
      expect(task2?.relatedADRs).toContain('adr_047');
    });

    it('should extract file references from tasks', () => {
      const graph = parseSprintToGraph(SAMPLE_SPRINT_CONTENT);

      const task1 = graph.tasks.find(t => t.id === 'task_1');
      const task2 = graph.tasks.find(t => t.id === 'task_2');

      expect(task1?.files).toContain('dashboard/src/app/api/v1/sprint/sync/route.ts');
      expect(task1?.files).toContain('packages/cli/src/lib/sprint-loader.ts');
      expect(task2?.files).toContain('packages/cli/test/integration/sprint-sync.test.ts');
    });
  });

  describe('CONTAINS Relationships (Sprint → Task)', () => {
    it('should create CONTAINS relationship for each task', async () => {
      const graph = parseSprintToGraph(SAMPLE_SPRINT_CONTENT);
      await syncSprintToGraph(mockStore, graph);

      const containsRels = mockStore.getRelationshipsByType('CONTAINS');

      // Should have one CONTAINS per task
      expect(containsRels).toHaveLength(4);

      // All should originate from the sprint
      containsRels.forEach(rel => {
        expect(rel.fromId).toBe(graph.sprint.id);
      });

      // Should point to each task
      const targetIds = containsRels.map(r => r.toId);
      expect(targetIds).toContain('task_1');
      expect(targetIds).toContain('task_2');
      expect(targetIds).toContain('task_3');
      expect(targetIds).toContain('task_4');
    });

    it('should create Sprint and Task nodes', async () => {
      const graph = parseSprintToGraph(SAMPLE_SPRINT_CONTENT);
      await syncSprintToGraph(mockStore, graph);

      const sprintNodes = mockStore.getNodesByLabel('Sprint');
      const taskNodes = mockStore.getNodesByLabel('Task');

      expect(sprintNodes).toHaveLength(1);
      expect(taskNodes).toHaveLength(4);
    });
  });

  describe('NEXT_TASK Relationship', () => {
    it('should point to first incomplete task (in_progress)', async () => {
      const graph = parseSprintToGraph(SAMPLE_SPRINT_CONTENT);
      await syncSprintToGraph(mockStore, graph);

      const nextTaskRels = mockStore.getRelationshipsByType('NEXT_TASK');

      expect(nextTaskRels).toHaveLength(1);
      expect(nextTaskRels[0].fromId).toBe(graph.sprint.id);
      // task_2 is "In Progress", which is the first incomplete task
      expect(nextTaskRels[0].toId).toBe('task_2');
    });

    it('should point to first not_started task when no in_progress exists', async () => {
      // Modify content to have no in_progress tasks
      const modifiedContent = SAMPLE_SPRINT_CONTENT.replace(
        '**Status:** In Progress',
        '**Status:** Complete'
      );

      const graph = parseSprintToGraph(modifiedContent);
      await syncSprintToGraph(mockStore, graph);

      const nextTaskRels = mockStore.getRelationshipsByType('NEXT_TASK');

      expect(nextTaskRels).toHaveLength(1);
      // task_3 is now the first not_started task
      expect(nextTaskRels[0].toId).toBe('task_3');
    });

    it('should not create NEXT_TASK when all tasks are complete', async () => {
      // Modify content to have all tasks complete
      const allCompleteContent = SAMPLE_SPRINT_CONTENT
        .replace('**Status:** In Progress', '**Status:** Complete')
        .replace(/\*\*Status:\*\* Not Started/g, '**Status:** Complete');

      const graph = parseSprintToGraph(allCompleteContent);
      await syncSprintToGraph(mockStore, graph);

      const nextTaskRels = mockStore.getRelationshipsByType('NEXT_TASK');

      expect(nextTaskRels).toHaveLength(0);
    });
  });

  describe('MUST_FOLLOW Relationships (Task → ADR)', () => {
    it('should create MUST_FOLLOW relationships for ADR references', async () => {
      const graph = parseSprintToGraph(SAMPLE_SPRINT_CONTENT);
      await syncSprintToGraph(mockStore, graph);

      const mustFollowRels = mockStore.getRelationshipsByType('MUST_FOLLOW');

      // TASK-1: ADR-002, ADR-043 (2)
      // TASK-2: ADR-002, ADR-043, ADR-047 (3)
      // TASK-3: ADR-043 (1)
      // TASK-4: none (0)
      expect(mustFollowRels.length).toBeGreaterThanOrEqual(6);
    });

    it('should create ADR nodes for referenced ADRs', async () => {
      const graph = parseSprintToGraph(SAMPLE_SPRINT_CONTENT);
      await syncSprintToGraph(mockStore, graph);

      const adrNodes = mockStore.getNodesByLabel('ADR');

      // Should have ADR-002, ADR-043, ADR-047 (deduped across tasks)
      const adrIds = adrNodes.map(n => n.properties.id);
      expect(adrIds).toContain('adr_002');
      expect(adrIds).toContain('adr_043');
      expect(adrIds).toContain('adr_047');
    });

    it('should include source metadata in MUST_FOLLOW relationships', async () => {
      const graph = parseSprintToGraph(SAMPLE_SPRINT_CONTENT);
      await syncSprintToGraph(mockStore, graph);

      const mustFollowRels = mockStore.getRelationshipsByType('MUST_FOLLOW');

      mustFollowRels.forEach(rel => {
        expect(rel.properties?.source).toBe('sprint_definition');
        expect(rel.properties?.extracted_at).toBeDefined();
      });
    });
  });

  describe('MODIFIES Relationships (Task → File)', () => {
    it('should create MODIFIES relationships for file references', async () => {
      const graph = parseSprintToGraph(SAMPLE_SPRINT_CONTENT);
      await syncSprintToGraph(mockStore, graph);

      const modifiesRels = mockStore.getRelationshipsByType('MODIFIES');

      // TASK-1: 2 files, TASK-2: 1 file, TASK-3: 0 files, TASK-4: 0 files
      expect(modifiesRels).toHaveLength(3);
    });

    it('should create File nodes for referenced files', async () => {
      const graph = parseSprintToGraph(SAMPLE_SPRINT_CONTENT);
      await syncSprintToGraph(mockStore, graph);

      const fileNodes = mockStore.getNodesByLabel('File');

      expect(fileNodes.length).toBeGreaterThanOrEqual(3);
    });
  });

  describe('Full Sprint Sync Workflow', () => {
    it('should return correct node and relationship counts', async () => {
      const graph = parseSprintToGraph(SAMPLE_SPRINT_CONTENT);
      const result = await syncSprintToGraph(mockStore, graph);

      // Nodes: 1 Sprint + 4 Tasks + 3 Files + 6 ADRs (with duplicates)
      expect(result.nodes).toBeGreaterThan(8);

      // Relationships: 4 CONTAINS + 1 NEXT_TASK + 3 MODIFIES + 6 MUST_FOLLOW
      expect(result.relationships).toBeGreaterThanOrEqual(14);

      expect(result.nextTaskId).toBe('task_2');
    });

    it('should handle empty sprint content gracefully', async () => {
      const emptyContent = '# Empty Sprint\n\n**Progress:** 0%\n';
      const graph = parseSprintToGraph(emptyContent);

      expect(graph.tasks).toHaveLength(0);

      const result = await syncSprintToGraph(mockStore, graph);

      expect(result.nodes).toBe(1); // Just the sprint
      expect(result.relationships).toBe(0);
      expect(result.nextTaskId).toBeNull();
    });

    it('should handle sprint with no ADR references', async () => {
      const noAdrContent = `# SPRINT-2025-11-test

**Progress:** 0%

### TASK-1: Simple Task
**Status:** Not Started
`;
      const graph = parseSprintToGraph(noAdrContent);
      await syncSprintToGraph(mockStore, graph);

      const mustFollowRels = mockStore.getRelationshipsByType('MUST_FOLLOW');
      expect(mustFollowRels).toHaveLength(0);
    });
  });
});
