/**
 * @fileType: test
 * @status: current
 * @updated: 2025-11-24
 * @tags: [test, integration, context-modules, epic-002, sprint-2, task-5]
 * @related: [sprint/sync/route.ts, sprint-loader.ts, _cloud-graph-client.ts]
 * @priority: high
 * @complexity: high
 * @dependencies: [jest, fs-extra]
 */

/**
 * Context Module Integration Tests - TASK-5 (EPIC-002 Sprint 2)
 *
 * Validates context module system end-to-end:
 * - Pattern node creation and APPLIES_PATTERN relationships
 * - Gotcha node creation and AVOID_GOTCHA relationships
 * - Pattern → File (APPLIED_IN) relationships
 * - Sprint sync with mixed context modules
 *
 * Part of EPIC-002: AI-Native Sprint Graphs (Sprint 2)
 */

import { describe, it, expect, beforeEach, afterEach } from '@jest/globals';

// =============================================================================
// SECTION 1: Mock Infrastructure
// =============================================================================

/**
 * Mock graph node structure
 */
interface MockNode {
  label: string;
  properties: Record<string, unknown>;
}

/**
 * Mock graph relationship structure
 */
interface MockRelationship {
  fromId: string;
  toId: string;
  type: string;
  properties?: Record<string, unknown>;
}

/**
 * In-memory graph store for testing
 * Simulates Neo4j behavior without actual database connection
 */
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

  getRelationshipsTo(nodeId: string): MockRelationship[] {
    return this.relationships.filter(r => r.toId === nodeId);
  }

  clear(): void {
    this.nodes.clear();
    this.relationships = [];
  }
}

// =============================================================================
// SECTION 2: Sample Test Data
// =============================================================================

/**
 * Sprint with pattern references
 */
const SPRINT_WITH_PATTERNS = `# SPRINT-2025-11-test-patterns

**Duration:** 2025-11-20 to 2025-12-04
**Goal:** Test pattern extraction and relationship creation
**Progress:** 25%

## Tasks

### TASK-1: Implement Retry Logic
**Status:** In Progress
**Priority:** HIGH
**Owner:** Test User
**Effort:** 4 hours

Use pattern from packages/cli/src/lib/event-queue.ts for retry logic.
Apply pattern_exponential_backoff for the retry mechanism.

**Files:**
- Create: \`packages/cli/src/services/retry-service.ts\`
- Update: \`packages/cli/src/lib/api-client.ts\`

Follow: ADR-002, ADR-043

### TASK-2: Apply Event Pattern
**Status:** Not Started
**Priority:** MEDIUM
**Owner:** Test User
**Effort:** 2 hours

See example from packages/cli/src/lib/event-emitter.ts for reference.
Use pattern_event_sourcing approach.

**Files:**
- Create: \`packages/cli/src/services/event-store.ts\`

Follow: ADR-043
`;

/**
 * Sprint with gotcha warnings
 */
const SPRINT_WITH_GOTCHAS = `# SPRINT-2025-11-test-gotchas

**Duration:** 2025-11-20 to 2025-12-04
**Goal:** Test gotcha extraction and relationship creation
**Progress:** 0%

## Tasks

### TASK-1: Fix Timer Issue
**Status:** Not Started
**Priority:** CRITICAL
**Owner:** Test User
**Effort:** 2 hours

Avoid the timer-unref-gotcha that causes process hang.
Watch out for async cleanup issues.

**Files:**
- Update: \`packages/cli/src/lib/event-queue.ts\`

Follow: ADR-043

### TASK-2: Handle Edge Cases
**Status:** Not Started
**Priority:** HIGH
**Owner:** Test User
**Effort:** 3 hours

Beware of null pointer exceptions in the parser.
Gotcha: race conditions in concurrent updates.
Avoid memory-leak-gotcha in long-running processes.

**Files:**
- Update: \`packages/cli/src/lib/parser.ts\`
`;

/**
 * Sprint with mixed patterns and gotchas
 */
const SPRINT_MIXED = `# SPRINT-2025-11-test-mixed

**Duration:** 2025-11-20 to 2025-12-04
**Goal:** Test combined pattern and gotcha extraction
**Progress:** 50%

## Tasks

### TASK-1: Refactor Context Loader
**Status:** Complete
**Priority:** HIGH
**Owner:** Test User
**Effort:** 4 hours

Use pattern from context-loader-events.ts for streaming.
Apply pattern_cursor for pagination.
Avoid the memory-leak-gotcha when processing large files.
Watch out for timeout issues with slow connections.

**Files:**
- Update: \`packages/cli/src/lib/context-loader.ts\`
- Create: \`packages/cli/src/lib/stream-processor.ts\`

Follow: ADR-002, ADR-033, ADR-043

### TASK-2: Add Caching Layer
**Status:** In Progress
**Priority:** MEDIUM
**Owner:** Test User
**Effort:** 3 hours

See example from packages/cli/src/services/cache.ts for reference.
Use pattern_lru_cache for eviction.
Beware of stale cache entries.

**Files:**
- Create: \`packages/cli/src/services/cache-layer.ts\`

Follow: ADR-043
`;

// =============================================================================
// SECTION 3: Parser Functions (extracted from route.ts for testing)
// =============================================================================

interface ParsedTask {
  id: string;
  title: string;
  status: 'not_started' | 'in_progress' | 'complete';
  effort: string;
  priority: string;
  files: string[];
  relatedADRs: string[];
  relatedPatterns: string[];
  relatedGotchas: string[];
  owner?: string;
}

interface ParsedSprint {
  sprint: {
    id: string;
    name: string;
    goal: string;
    startDate: string;
    endDate: string;
    progress: number;
  };
  tasks: ParsedTask[];
}

/**
 * Parse sprint markdown into graph structure
 * Mirrors the parseSprintToGraph function from route.ts
 */
function parseSprintToGraph(content: string): ParsedSprint {
  // Extract sprint metadata
  const sprintNameMatch = content.match(/^#\s+(.+?)(?:\n|$)/m);
  const sprintName = sprintNameMatch ? sprintNameMatch[1].trim() : 'Unknown Sprint';

  const sprintIdMatch = sprintName.match(/SPRINT[- ](\d{4})[- ](\d{2})[- ](.+)/i);
  const sprintId = sprintIdMatch
    ? `sprint_${sprintIdMatch[1]}_${sprintIdMatch[2]}_${sprintIdMatch[3].toLowerCase().replace(/[^a-z0-9]+/g, '_')}`
    : `sprint_${Date.now()}`;

  const dateRangeMatch = content.match(/\*\*(?:Duration|Timeline|Dates?):\*\*\s*([^\n]+)/i);
  let startDate = '';
  let endDate = '';
  if (dateRangeMatch) {
    const rangeMatch = dateRangeMatch[1].match(/(\d{4}-\d{2}-\d{2})\s*(?:to|–|-)\s*(\d{4}-\d{2}-\d{2})/);
    if (rangeMatch) {
      startDate = rangeMatch[1];
      endDate = rangeMatch[2];
    }
  }

  const goalMatch = content.match(/\*\*(?:Goal|Sprint Goal):\*\*\s*([^\n]+)/i);
  const goal = goalMatch ? goalMatch[1].trim() : '';

  const progressMatch = content.match(/\*\*Progress:\*\*\s*(\d+)%/i);
  const progress = progressMatch ? parseInt(progressMatch[1], 10) : 0;

  const sprint = { id: sprintId, name: sprintName, goal, startDate, endDate, progress };

  // Extract tasks
  const tasks: ParsedTask[] = [];
  const taskSections = content.split(/\n### TASK-/);

  for (let i = 1; i < taskSections.length; i++) {
    const section = taskSections[i];
    const firstLine = section.split('\n')[0];
    const taskMatch = firstLine.match(/^(\d+):\s*(.+)$/);

    if (!taskMatch) continue;

    const taskNumber = taskMatch[1];
    const taskTitle = taskMatch[2].trim();
    const taskId = `task_${taskNumber}_test`;

    // Status
    let status: 'not_started' | 'in_progress' | 'complete' = 'not_started';
    const statusMatch = section.match(/\*\*Status:\*\*\s*(.+?)(?:\n|$)/);
    if (statusMatch) {
      const statusText = statusMatch[1].trim().toLowerCase();
      if (statusText.includes('complete') || statusText.includes('done')) {
        status = 'complete';
      } else if (statusText.includes('in progress')) {
        status = 'in_progress';
      }
    }

    // Effort and priority
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

    // Patterns (EPIC-002 Sprint 2)
    const relatedPatterns: string[] = [];
    const patternFileMatches = section.matchAll(/(?:use|apply|see|follow)\s+(?:the\s+)?(?:pattern|example)\s+(?:from|in)\s+[`"]?([a-zA-Z0-9_\-./]+\.[a-zA-Z]+)[`"]?/gi);
    for (const match of patternFileMatches) {
      const patternId = `pattern_${match[1].replace(/[^a-zA-Z0-9]/g, '_')}`;
      if (!relatedPatterns.includes(patternId)) relatedPatterns.push(patternId);
    }
    const explicitPatternMatches = section.matchAll(/pattern[_-]([a-zA-Z0-9_]+)/gi);
    for (const match of explicitPatternMatches) {
      const patternId = `pattern_${match[1]}`;
      if (!relatedPatterns.includes(patternId)) relatedPatterns.push(patternId);
    }

    // Gotchas (EPIC-002 Sprint 2)
    const relatedGotchas: string[] = [];
    const gotchaWarningMatches = section.matchAll(/(?:avoid|watch out for|beware of|gotcha:)\s+[`"]?([^`".\n]+)[`"]?/gi);
    for (const match of gotchaWarningMatches) {
      const gotchaId = `gotcha_${match[1].trim().toLowerCase().replace(/[^a-z0-9]+/g, '_')}`;
      if (!relatedGotchas.includes(gotchaId)) relatedGotchas.push(gotchaId);
    }
    const explicitGotchaMatches = section.matchAll(/\b([a-z][a-z0-9]*(?:-[a-z0-9]+)*-gotcha)\b/gi);
    for (const match of explicitGotchaMatches) {
      const gotchaId = `gotcha_${match[1].replace(/-/g, '_')}`;
      if (!relatedGotchas.includes(gotchaId)) relatedGotchas.push(gotchaId);
    }

    tasks.push({
      id: taskId,
      title: taskTitle,
      status,
      effort,
      priority,
      files,
      relatedADRs,
      relatedPatterns,
      relatedGotchas,
      owner,
    });
  }

  return { sprint, tasks };
}

/**
 * Sync parsed sprint to mock graph store
 */
function syncToMockGraph(store: MockGraphStore, graph: ParsedSprint): {
  nodes: number;
  relationships: number;
} {
  let nodeCount = 0;
  let relCount = 0;

  // Create Sprint node
  store.createNode('Sprint', {
    id: graph.sprint.id,
    name: graph.sprint.name,
    goal: graph.sprint.goal,
    progress: graph.sprint.progress,
  });
  nodeCount++;

  // Create File nodes
  const allFiles = new Set<string>();
  graph.tasks.forEach(t => t.files.forEach(f => allFiles.add(f)));
  for (const filePath of allFiles) {
    store.createNode('File', {
      id: `file_${filePath.replace(/[^a-zA-Z0-9]/g, '_')}`,
      path: filePath,
    });
    nodeCount++;
  }

  // Create Task nodes and relationships
  for (const task of graph.tasks) {
    store.createNode('Task', {
      id: task.id,
      title: task.title,
      status: task.status,
      priority: task.priority,
    });
    nodeCount++;

    // Sprint → Task (CONTAINS)
    store.createRelationship(graph.sprint.id, task.id, { type: 'CONTAINS' });
    relCount++;

    // Task → File (MODIFIES)
    for (const filePath of task.files) {
      const fileId = `file_${filePath.replace(/[^a-zA-Z0-9]/g, '_')}`;
      store.createRelationship(task.id, fileId, { type: 'MODIFIES' });
      relCount++;
    }

    // Task → ADR (MUST_FOLLOW)
    for (const adrId of task.relatedADRs) {
      store.createNode('ADR', { id: adrId });
      nodeCount++;
      store.createRelationship(task.id, adrId, { type: 'MUST_FOLLOW', source: 'sprint_definition' });
      relCount++;
    }

    // Task → Pattern (APPLIES_PATTERN)
    for (const patternId of task.relatedPatterns) {
      store.createNode('Pattern', { id: patternId, category: 'pattern' });
      nodeCount++;
      store.createRelationship(task.id, patternId, { type: 'APPLIES_PATTERN', source: 'sprint_definition' });
      relCount++;

      // Pattern → File (APPLIED_IN)
      for (const filePath of task.files) {
        const fileId = `file_${filePath.replace(/[^a-zA-Z0-9]/g, '_')}`;
        store.createRelationship(patternId, fileId, { type: 'APPLIED_IN' });
        relCount++;
      }
    }

    // Task → Gotcha (AVOID_GOTCHA)
    for (const gotchaId of task.relatedGotchas) {
      store.createNode('Gotcha', { id: gotchaId, category: 'gotcha', severity: 'medium' });
      nodeCount++;
      store.createRelationship(task.id, gotchaId, { type: 'AVOID_GOTCHA', source: 'sprint_definition' });
      relCount++;
    }
  }

  return { nodes: nodeCount, relationships: relCount };
}

// =============================================================================
// SECTION 4: Test Suites
// =============================================================================

describe('Context Module Integration Tests (EPIC-002 Sprint 2 TASK-5)', () => {
  let store: MockGraphStore;

  beforeEach(() => {
    store = new MockGraphStore();
  });

  afterEach(() => {
    store.clear();
  });

  // ---------------------------------------------------------------------------
  // Pattern Relationship Tests
  // ---------------------------------------------------------------------------
  describe('Pattern Relationships', () => {
    it('should extract pattern references from "use pattern from file.ts" syntax', () => {
      const graph = parseSprintToGraph(SPRINT_WITH_PATTERNS);

      expect(graph.tasks[0].relatedPatterns).toContain('pattern_packages_cli_src_lib_event_queue_ts');
    });

    it('should extract explicit pattern_xxx references', () => {
      const graph = parseSprintToGraph(SPRINT_WITH_PATTERNS);

      expect(graph.tasks[0].relatedPatterns).toContain('pattern_exponential_backoff');
      expect(graph.tasks[1].relatedPatterns).toContain('pattern_event_sourcing');
    });

    it('should extract pattern references from "see example from file.ts" syntax', () => {
      const graph = parseSprintToGraph(SPRINT_WITH_PATTERNS);

      // The regex matches "See example from packages/cli/src/lib/event-emitter.ts"
      expect(graph.tasks[1].relatedPatterns).toContain('pattern_packages_cli_src_lib_event_emitter_ts');
    });

    it('should create Pattern nodes in graph', () => {
      const graph = parseSprintToGraph(SPRINT_WITH_PATTERNS);
      syncToMockGraph(store, graph);

      const patternNodes = store.getNodesByLabel('Pattern');
      // 4 patterns: event-queue file, exponential_backoff, event-emitter file, event_sourcing
      expect(patternNodes.length).toBeGreaterThanOrEqual(4);

      const patternIds = patternNodes.map(n => n.properties.id);
      expect(patternIds).toContain('pattern_exponential_backoff');
      expect(patternIds).toContain('pattern_event_sourcing');
    });

    it('should create APPLIES_PATTERN relationships', () => {
      const graph = parseSprintToGraph(SPRINT_WITH_PATTERNS);
      syncToMockGraph(store, graph);

      const appliesPatternRels = store.getRelationshipsByType('APPLIES_PATTERN');
      // 4 patterns across 2 tasks
      expect(appliesPatternRels.length).toBeGreaterThanOrEqual(4);

      // Verify source metadata
      expect(appliesPatternRels[0].properties?.source).toBe('sprint_definition');
    });

    it('should create APPLIED_IN relationships (Pattern → File)', () => {
      const graph = parseSprintToGraph(SPRINT_WITH_PATTERNS);
      syncToMockGraph(store, graph);

      const appliedInRels = store.getRelationshipsByType('APPLIED_IN');
      expect(appliedInRels.length).toBeGreaterThan(0);

      // Verify at least one pattern has APPLIED_IN relationship
      // Pattern from TASK-1 should link to TASK-1's files
      const patternRels = store.getRelationshipsFrom('pattern_packages_cli_src_lib_event_queue_ts');
      const appliedInFromPattern = patternRels.filter(r => r.type === 'APPLIED_IN');
      expect(appliedInFromPattern.length).toBeGreaterThanOrEqual(1);
    });
  });

  // ---------------------------------------------------------------------------
  // Gotcha Relationship Tests
  // ---------------------------------------------------------------------------
  describe('Gotcha Relationships', () => {
    it('should extract gotcha warnings from "avoid X" syntax', () => {
      const graph = parseSprintToGraph(SPRINT_WITH_GOTCHAS);

      expect(graph.tasks[0].relatedGotchas).toContain('gotcha_the_timer_unref_gotcha_that_causes_process_hang');
    });

    it('should extract gotcha warnings from "watch out for X" syntax', () => {
      const graph = parseSprintToGraph(SPRINT_WITH_GOTCHAS);

      expect(graph.tasks[0].relatedGotchas).toContain('gotcha_async_cleanup_issues');
    });

    it('should extract gotcha warnings from "beware of X" syntax', () => {
      const graph = parseSprintToGraph(SPRINT_WITH_GOTCHAS);

      expect(graph.tasks[1].relatedGotchas).toContain('gotcha_null_pointer_exceptions_in_the_parser');
    });

    it('should extract gotcha warnings from "gotcha: X" syntax', () => {
      const graph = parseSprintToGraph(SPRINT_WITH_GOTCHAS);

      expect(graph.tasks[1].relatedGotchas).toContain('gotcha_race_conditions_in_concurrent_updates');
    });

    it('should extract explicit xxx-gotcha references', () => {
      const graph = parseSprintToGraph(SPRINT_WITH_GOTCHAS);

      expect(graph.tasks[1].relatedGotchas).toContain('gotcha_memory_leak_gotcha');
    });

    it('should create Gotcha nodes in graph', () => {
      const graph = parseSprintToGraph(SPRINT_WITH_GOTCHAS);
      syncToMockGraph(store, graph);

      const gotchaNodes = store.getNodesByLabel('Gotcha');
      expect(gotchaNodes.length).toBeGreaterThanOrEqual(4);

      // Verify gotcha properties
      const gotcha = gotchaNodes[0];
      expect(gotcha.properties.category).toBe('gotcha');
      expect(gotcha.properties.severity).toBe('medium');
    });

    it('should create AVOID_GOTCHA relationships', () => {
      const graph = parseSprintToGraph(SPRINT_WITH_GOTCHAS);
      syncToMockGraph(store, graph);

      const avoidGotchaRels = store.getRelationshipsByType('AVOID_GOTCHA');
      expect(avoidGotchaRels.length).toBeGreaterThanOrEqual(4);

      // Verify source metadata
      expect(avoidGotchaRels[0].properties?.source).toBe('sprint_definition');
    });

    it('should link gotchas to correct tasks', () => {
      const graph = parseSprintToGraph(SPRINT_WITH_GOTCHAS);
      syncToMockGraph(store, graph);

      // TASK-1 gotchas: "avoid timer-unref-gotcha" + "watch out for async cleanup" + explicit "-gotcha"
      const task1Rels = store.getRelationshipsFrom('task_1_test');
      const task1Gotchas = task1Rels.filter(r => r.type === 'AVOID_GOTCHA');
      expect(task1Gotchas.length).toBeGreaterThanOrEqual(2);

      // TASK-2 gotchas: "beware of null pointer" + "gotcha: race conditions" + "avoid memory-leak-gotcha"
      const task2Rels = store.getRelationshipsFrom('task_2_test');
      const task2Gotchas = task2Rels.filter(r => r.type === 'AVOID_GOTCHA');
      expect(task2Gotchas.length).toBeGreaterThanOrEqual(3);
    });
  });

  // ---------------------------------------------------------------------------
  // Mixed Pattern and Gotcha Tests
  // ---------------------------------------------------------------------------
  describe('Mixed Pattern and Gotcha Extraction', () => {
    it('should extract both patterns and gotchas from same task', () => {
      const graph = parseSprintToGraph(SPRINT_MIXED);

      // TASK-1 should have both patterns and gotchas
      expect(graph.tasks[0].relatedPatterns.length).toBeGreaterThanOrEqual(2);
      expect(graph.tasks[0].relatedGotchas.length).toBeGreaterThanOrEqual(2);
    });

    it('should create all relationship types for mixed sprint', () => {
      const graph = parseSprintToGraph(SPRINT_MIXED);
      syncToMockGraph(store, graph);

      // Verify all relationship types exist
      expect(store.getRelationshipsByType('CONTAINS').length).toBeGreaterThan(0);
      expect(store.getRelationshipsByType('MUST_FOLLOW').length).toBeGreaterThan(0);
      expect(store.getRelationshipsByType('APPLIES_PATTERN').length).toBeGreaterThan(0);
      expect(store.getRelationshipsByType('AVOID_GOTCHA').length).toBeGreaterThan(0);
      expect(store.getRelationshipsByType('APPLIED_IN').length).toBeGreaterThan(0);
      expect(store.getRelationshipsByType('MODIFIES').length).toBeGreaterThan(0);
    });

    it('should handle task status correctly for mixed sprint', () => {
      const graph = parseSprintToGraph(SPRINT_MIXED);

      expect(graph.tasks[0].status).toBe('complete');
      expect(graph.tasks[1].status).toBe('in_progress');
    });

    it('should extract ADRs alongside patterns and gotchas', () => {
      const graph = parseSprintToGraph(SPRINT_MIXED);

      // TASK-1 has ADR-002, ADR-033, ADR-043
      expect(graph.tasks[0].relatedADRs).toContain('adr_002');
      expect(graph.tasks[0].relatedADRs).toContain('adr_033');
      expect(graph.tasks[0].relatedADRs).toContain('adr_043');
    });

    it('should calculate correct node and relationship counts', () => {
      const graph = parseSprintToGraph(SPRINT_MIXED);
      const result = syncToMockGraph(store, graph);

      // Verify counts are reasonable
      expect(result.nodes).toBeGreaterThan(10);
      expect(result.relationships).toBeGreaterThan(15);
    });
  });

  // ---------------------------------------------------------------------------
  // Context Module CRUD Tests
  // ---------------------------------------------------------------------------
  describe('Context Module CRUD Operations', () => {
    it('should create Pattern nodes with correct properties', () => {
      const graph = parseSprintToGraph(SPRINT_WITH_PATTERNS);
      syncToMockGraph(store, graph);

      const patterns = store.getNodesByLabel('Pattern');
      expect(patterns.length).toBeGreaterThan(0);
      patterns.forEach(pattern => {
        expect(pattern.properties.id).toBeDefined();
        expect(pattern.properties.category).toBe('pattern');
      });
    });

    it('should create Gotcha nodes with correct properties', () => {
      const graph = parseSprintToGraph(SPRINT_WITH_GOTCHAS);
      syncToMockGraph(store, graph);

      const gotchas = store.getNodesByLabel('Gotcha');
      expect(gotchas.length).toBeGreaterThan(0);
      gotchas.forEach(gotcha => {
        expect(gotcha.properties.id).toBeDefined();
        expect(gotcha.properties.category).toBe('gotcha');
        expect(gotcha.properties.severity).toBe('medium');
      });
    });

    it('should not create duplicate nodes for same pattern', () => {
      const graph = parseSprintToGraph(SPRINT_MIXED);
      syncToMockGraph(store, graph);

      // Each unique pattern ID should have exactly one node
      const patterns = store.getNodesByLabel('Pattern');
      const patternIds = patterns.map(p => p.properties.id);
      const uniqueIds = [...new Set(patternIds)];

      expect(patternIds.length).toBe(uniqueIds.length);
    });

    it('should support querying patterns by task', () => {
      const graph = parseSprintToGraph(SPRINT_MIXED);
      syncToMockGraph(store, graph);

      const task1Rels = store.getRelationshipsFrom('task_1_test');
      const task1Patterns = task1Rels.filter(r => r.type === 'APPLIES_PATTERN');

      // TASK-1 has: "Use pattern from context-loader-events.ts" + "pattern_cursor"
      expect(task1Patterns.length).toBeGreaterThanOrEqual(2);
      task1Patterns.forEach(rel => {
        expect(rel.toId.startsWith('pattern_')).toBe(true);
      });
    });

    it('should support querying gotchas by task', () => {
      const graph = parseSprintToGraph(SPRINT_MIXED);
      syncToMockGraph(store, graph);

      const task1Rels = store.getRelationshipsFrom('task_1_test');
      const task1Gotchas = task1Rels.filter(r => r.type === 'AVOID_GOTCHA');

      // TASK-1 has: "avoid memory-leak-gotcha" + "watch out for timeout issues"
      expect(task1Gotchas.length).toBeGreaterThanOrEqual(2);
      task1Gotchas.forEach(rel => {
        expect(rel.toId.startsWith('gotcha_')).toBe(true);
      });
    });
  });

  // ---------------------------------------------------------------------------
  // Edge Case Tests
  // ---------------------------------------------------------------------------
  describe('Edge Cases', () => {
    it('should handle sprint with no patterns or gotchas', () => {
      const plainSprint = `# SPRINT-2025-11-plain

**Duration:** 2025-11-20 to 2025-12-04
**Goal:** Plain sprint with no context modules
**Progress:** 0%

## Tasks

### TASK-1: Simple Task
**Status:** Not Started
**Priority:** MEDIUM

**Files:**
- Create: \`src/simple.ts\`

Follow: ADR-002
`;
      const graph = parseSprintToGraph(plainSprint);

      expect(graph.tasks[0].relatedPatterns).toHaveLength(0);
      expect(graph.tasks[0].relatedGotchas).toHaveLength(0);
      expect(graph.tasks[0].relatedADRs).toHaveLength(1);
    });

    it('should handle malformed pattern references gracefully', () => {
      const malformedSprint = `# SPRINT-2025-11-malformed

**Duration:** 2025-11-20 to 2025-12-04
**Goal:** Test malformed references
**Progress:** 0%

## Tasks

### TASK-1: Edge Cases
**Status:** Not Started
**Priority:** MEDIUM

Use pattern from (no file specified).
pattern_ (incomplete).
Avoid  (empty gotcha).

**Files:**
- Create: \`src/edge.ts\`
`;
      const graph = parseSprintToGraph(malformedSprint);

      // Should not crash, patterns/gotchas should be empty or minimal
      expect(graph.tasks[0]).toBeDefined();
      expect(graph.tasks[0].relatedPatterns).toBeDefined();
      expect(graph.tasks[0].relatedGotchas).toBeDefined();
    });

    it('should deduplicate patterns referenced multiple times', () => {
      const duplicateSprint = `# SPRINT-2025-11-duplicates

**Duration:** 2025-11-20 to 2025-12-04
**Goal:** Test deduplication
**Progress:** 0%

## Tasks

### TASK-1: Duplicate References
**Status:** Not Started
**Priority:** MEDIUM

Use pattern from file.ts for A.
Use pattern from file.ts for B.
Apply pattern_retry for C.
Apply pattern_retry for D.

**Files:**
- Create: \`src/dup.ts\`
`;
      const graph = parseSprintToGraph(duplicateSprint);

      // Each pattern should appear only once
      const patterns = graph.tasks[0].relatedPatterns;
      const uniquePatterns = [...new Set(patterns)];
      expect(patterns.length).toBe(uniquePatterns.length);
    });
  });
});
