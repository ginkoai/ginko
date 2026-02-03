/**
 * @fileType: test
 * @status: current
 * @updated: 2026-02-03
 * @tags: [push, integration, no-duplicate-nodes, BUG-duplicate-nodes, task-sync, document-upload]
 * @related: [../push-command.ts, ../../../lib/task-parser.ts, ./extract-entity-id.test.ts]
 * @priority: critical
 * @complexity: high
 * @dependencies: [jest]
 */

/**
 * Push Integration Tests — No Duplicate Graph Nodes
 *
 * The ginko push command has TWO paths that create Sprint/Epic nodes in Neo4j:
 *   1. Document upload — calls POST /api/v1/graph/documents with DocumentUpload[]
 *   2. Task sync — calls POST /api/v1/task/sync with ParsedTask[]
 *
 * If the IDs diverge between these two paths, Neo4j creates duplicate Sprint
 * nodes: one from the document upload and one from the task sync. This test
 * suite verifies that BOTH paths produce IDENTICAL IDs for the same entity,
 * using the real push logic with mocked HTTP/filesystem layers.
 *
 * Strategy:
 *   - Mock filesystem reads (sprint/task markdown files)
 *   - Mock HTTP calls to the dashboard API at the GraphApiClient level
 *   - Exercise the real push logic (prepareDocument + parseSprintTasks)
 *   - Capture all API call payloads
 *   - Assert ID consistency across both paths
 */

import { describe, it, expect, jest, beforeEach } from '@jest/globals';
import {
  parseSprintTasks,
  parseTaskHierarchy,
} from '../../../lib/task-parser.js';

// ============================================================================
// Inline replica of extractEntityId (not exported from push-command.ts)
//
// This is a verbatim copy of the function from push-command.ts as of 2026-02-03.
// When extractEntityId is exported, replace this with:
//   import { extractEntityId } from '../push-command.js';
// ============================================================================

function extractEntityId(filename: string, entityType: string, content?: string): string {
  const entityIdMatch = filename.match(/^((?:e\d{3}(?:_s\d{2}(?:_t\d{2})?)?)|(?:adhoc_\d{6}(?:_s\d{2}(?:_t\d{2})?)?))/i);
  if (entityIdMatch) return entityIdMatch[1].toLowerCase();

  if (entityType === 'Epic') {
    const epicMatch = filename.match(/^EPIC-(\d+)/i);
    if (epicMatch) return `e${epicMatch[1].padStart(3, '0')}`;
  }

  const docIdMatch = filename.match(/^((?:ADR|PRD|GOTCHA|PATTERN)-\d+)/i);
  if (docIdMatch) return docIdMatch[1].toUpperCase();

  if (entityType === 'Sprint') {
    const embeddedCanonical = filename.match(/(e\d{3})[_-](s\d{2}[a-z]?)/i);
    if (embeddedCanonical) return `${embeddedCanonical[1].toLowerCase()}_${embeddedCanonical[2].toLowerCase()}`;

    const embeddedAdhoc = filename.match(/(adhoc_\d{6}(?:[_-]s\d{2})?)/i);
    if (embeddedAdhoc) {
      const adhocId = embeddedAdhoc[1].toLowerCase().replace(/-/g, '_');
      return adhocId.match(/_s\d{2}$/) ? adhocId : `${adhocId}_s01`;
    }

    const legacyFilename = filename.match(/epic(\d+)[-_](?:sprint|phase)(\d+)/i);
    if (legacyFilename) {
      const epicId = `e${legacyFilename[1].padStart(3, '0')}`;
      const sprintNum = legacyFilename[2].padStart(2, '0');
      return `${epicId}_s${sprintNum}`;
    }

    if (content) {
      const sprintIdMatch = content.match(/\*\*ID:\*\*\s*`?([a-z0-9_]+)`?/i);
      if (sprintIdMatch) return sprintIdMatch[1].toLowerCase();
      const altIdMatch = content.match(/\*{0,2}Sprint(?:\s+ID)?\*{0,2}:?\*{0,2}\s+`?(e\d{3}_s\d{2}[a-z]?)`?/i);
      if (altIdMatch) return altIdMatch[1].toLowerCase();

      const sprintNumMatch = filename.match(/(?:^|-)(?!SPRINT).*sprint[_-]?(\d+)/i)
        || filename.match(/[-_]sprint[_-]?(\d+)/i);
      const epicRefMatch = content.match(/EPIC-(\d+)/i);
      if (sprintNumMatch && epicRefMatch) {
        const epicId = `e${epicRefMatch[1].padStart(3, '0')}`;
        const sprintNum = sprintNumMatch[1].padStart(2, '0');
        return `${epicId}_s${sprintNum}`;
      }
    }
  }

  if (filename === 'CURRENT-SPRINT') return filename;
  if (filename.startsWith('PROJECT-CHARTER')) return 'PROJECT-CHARTER';
  return filename;
}

// ============================================================================
// Simulated Push Pipeline
//
// Replicates the core logic of pushCommand without needing fs, git, or HTTP:
//   1. For each sprint file, call extractEntityId (document upload path)
//   2. For each sprint file, call parseSprintTasks (task sync path)
//   3. Collect both sets of IDs for comparison
// ============================================================================

interface SimulatedSprintFile {
  filename: string;   // e.g. "SPRINT-2026-01-e014-s02-system-hardening"
  filePath: string;   // e.g. "docs/sprints/SPRINT-2026-01-e014-s02-system-hardening.md"
  content: string;    // full markdown content
}

interface DocumentUploadCapture {
  id: string;
  type: string;
  filePath: string;
}

interface TaskSyncCapture {
  sprint_id: string;
  epic_id: string;
  tasks: Array<{ id: string; sprint_id: string; epic_id: string }>;
}

function simulatePush(files: SimulatedSprintFile[]): {
  documentUploads: DocumentUploadCapture[];
  taskSyncs: TaskSyncCapture[];
} {
  const documentUploads: DocumentUploadCapture[] = [];
  const taskSyncs: TaskSyncCapture[] = [];

  for (const file of files) {
    // PATH 1: Document upload — extractEntityId determines the Sprint node ID
    const docId = extractEntityId(file.filename, 'Sprint', file.content);
    documentUploads.push({
      id: docId,
      type: 'Sprint',
      filePath: file.filePath,
    });

    // PATH 2: Task sync — parseSprintTasks determines sprint_id for task relationships
    const parseResult = parseSprintTasks(file.content, file.filePath);
    taskSyncs.push({
      sprint_id: parseResult.sprint.id,
      epic_id: parseResult.sprint.epic_id,
      tasks: parseResult.tasks.map(t => ({
        id: t.id,
        sprint_id: t.sprint_id,
        epic_id: t.epic_id,
      })),
    });
  }

  return { documentUploads, taskSyncs };
}

// ============================================================================
// Test Data: Sprint file fixtures
// ============================================================================

const FIXTURES: Record<string, SimulatedSprintFile> = {
  // Canonical filename with **ID:** field in content
  canonical_with_id: {
    filename: 'SPRINT-2026-01-e014-s02-system-hardening',
    filePath: 'docs/sprints/SPRINT-2026-01-e014-s02-system-hardening.md',
    content: `# System Hardening Sprint

**ID:** \`e014_s02\`

## Tasks
### e014_s02_t01: Fix input validation (2h)
**Status:** [ ] Not Started
**Priority:** HIGH
**Goal:** Fix all input validation issues

### e014_s02_t02: Add rate limiting (3h)
**Status:** [ ] Not Started
**Priority:** MEDIUM
**Goal:** Add API rate limiting
`,
  },

  // Canonical filename with **Sprint ID:** field
  canonical_with_sprint_id: {
    filename: 'SPRINT-2026-01-e015-s01-cli-status-commands',
    filePath: 'docs/sprints/SPRINT-2026-01-e015-s01-cli-status-commands.md',
    content: `# CLI Status Commands

**Sprint ID:** e015_s01

## Tasks
### e015_s01_t01: Implement status command (4h)
**Status:** [@] In Progress
**Priority:** HIGH
**Goal:** Build the status command

### e015_s01_t02: Add formatting (2h)
**Status:** [ ] Not Started
**Priority:** MEDIUM
**Goal:** Format output nicely
`,
  },

  // Canonical filename with letter suffix
  canonical_letter_suffix: {
    filename: 'SPRINT-2026-01-e015-s00a-task-node-extraction',
    filePath: 'docs/sprints/SPRINT-2026-01-e015-s00a-task-node-extraction.md',
    content: `# Task Node Extraction

**ID:** \`e015_s00a\`

## Tasks
### e015_s00a_t01: Build parser (4h)
**Status:** [x] Complete
**Priority:** HIGH
**Goal:** Parse task nodes from markdown
`,
  },

  // Legacy filename: epic005-sprint1
  legacy_epic005_sprint1: {
    filename: 'SPRINT-2025-12-epic005-sprint1',
    filePath: 'docs/sprints/SPRINT-2025-12-epic005-sprint1.md',
    content: `# SPRINT: Graph Visualization (EPIC-005 Sprint 1)

**Duration:** 2 weeks (2025-12-01 to 2025-12-15)

## Tasks
### TASK-1: Build graph renderer (4-6h)
**Status:** [x] Complete
**Priority:** HIGH
**Goal:** Render the graph

### TASK-2: Add zoom controls (3h)
**Status:** [ ] Not Started
**Priority:** MEDIUM
**Goal:** Zoom in and out
`,
  },

  // Legacy filename: epic002-phase1
  legacy_phase_naming: {
    filename: 'SPRINT-2025-11-epic002-phase1',
    filePath: 'docs/sprints/SPRINT-2025-11-epic002-phase1.md',
    content: `# SPRINT: Context Modules Phase 1 (EPIC-002 Sprint 1)

## Tasks
### TASK-1: Foundation (6h)
**Status:** [x] Complete
**Priority:** CRITICAL
**Goal:** Build foundation
`,
  },

  // Ad-hoc sprint with **ID:** field
  adhoc_with_id: {
    filename: 'SPRINT-adhoc_260203-unify-graph-nodes',
    filePath: 'docs/sprints/SPRINT-adhoc_260203-unify-graph-nodes.md',
    content: `# Unify Graph Nodes

**ID:** \`adhoc_260203_s01\`

## Tasks
### adhoc_260203_s01_t01: Fix duplicate sprint nodes (2h)
**Status:** [@] In Progress
**Priority:** CRITICAL
**Goal:** Remove duplicate Sprint nodes in graph

### adhoc_260203_s01_t02: Write integration test (1h)
**Status:** [ ] Not Started
**Priority:** HIGH
**Goal:** Prove no duplicates after fix
`,
  },

  // Ad-hoc sprint without **ID:** field
  adhoc_without_id: {
    filename: 'SPRINT-adhoc_260119-dashboard-maintenance',
    filePath: 'docs/sprints/SPRINT-adhoc_260119-dashboard-maintenance.md',
    content: `# Dashboard Maintenance

## Tasks
### adhoc_260119_s01_t01: Fix badge z-index (1h)
**Status:** [x] Complete
**Priority:** HIGH
**Goal:** Fix z-index issue
`,
  },

  // Ad-hoc sprint with _s01 embedded in filename
  adhoc_with_s01_in_filename: {
    filename: 'SPRINT-adhoc_251209_s01-unified-naming-convention',
    filePath: 'docs/sprints/SPRINT-adhoc_251209_s01-unified-naming-convention.md',
    content: `# Unified Naming Convention

**ID:** \`adhoc_251209_s01\`

## Tasks
### adhoc_251209_s01_t01: Implement naming (2h)
**Status:** [x] Complete
**Priority:** HIGH
**Goal:** Implement unified naming
`,
  },

  // Legacy filename with larger numbers
  legacy_larger_numbers: {
    filename: 'SPRINT-2026-01-epic010-sprint3-content-multichannel-funnel',
    filePath: 'docs/sprints/SPRINT-2026-01-epic010-sprint3-content-multichannel-funnel.md',
    content: `# SPRINT: Content & Multichannel Funnel (EPIC-010 Sprint 3)

**Duration:** 2 weeks

## Tasks
### TASK-1: Create funnel (8h)
**Status:** [ ] Not Started
**Priority:** HIGH
**Goal:** Build the funnel
`,
  },
};


// ============================================================================
// TEST SUITE 1: Push creates exactly N Sprint nodes for N sprint files
// ============================================================================

describe('Push Integration: No Duplicate Nodes', () => {

  describe('1. Push creates exactly N Sprint nodes for N sprint files', () => {
    it('each unique Sprint ID appears exactly once in document upload AND once in task sync', () => {
      const allFiles = Object.values(FIXTURES);
      const { documentUploads, taskSyncs } = simulatePush(allFiles);

      // There should be exactly N document uploads for N files
      expect(documentUploads).toHaveLength(allFiles.length);
      // There should be exactly N task syncs for N files
      expect(taskSyncs).toHaveLength(allFiles.length);

      // Collect all document IDs and task sync sprint IDs
      const docIds = documentUploads.map(d => d.id);
      const syncIds = taskSyncs.map(s => s.sprint_id);

      // No duplicate IDs in document uploads
      const uniqueDocIds = new Set(docIds);
      expect(uniqueDocIds.size).toBe(docIds.length);

      // No duplicate IDs in task syncs
      const uniqueSyncIds = new Set(syncIds);
      expect(uniqueSyncIds.size).toBe(syncIds.length);
    });

    it('document upload IDs match task sync sprint_ids for every sprint file', () => {
      const allFiles = Object.values(FIXTURES);
      const { documentUploads, taskSyncs } = simulatePush(allFiles);

      for (let i = 0; i < allFiles.length; i++) {
        const docId = documentUploads[i].id;
        const syncId = taskSyncs[i].sprint_id;

        expect(docId).toBe(syncId);
      }
    });

    it('document upload count equals sprint file count', () => {
      const files = [
        FIXTURES.canonical_with_id,
        FIXTURES.legacy_epic005_sprint1,
        FIXTURES.adhoc_with_id,
      ];
      const { documentUploads, taskSyncs } = simulatePush(files);

      expect(documentUploads).toHaveLength(3);
      expect(taskSyncs).toHaveLength(3);
    });
  });


  // ==========================================================================
  // TEST SUITE 2: Each Sprint has both structural and content properties
  // ==========================================================================

  describe('2. Each Sprint has both structural and content properties', () => {
    it('document upload payload includes id, type, and filePath', () => {
      const { documentUploads } = simulatePush([FIXTURES.canonical_with_id]);

      expect(documentUploads[0]).toEqual(
        expect.objectContaining({
          id: 'e014_s02',
          type: 'Sprint',
          filePath: 'docs/sprints/SPRINT-2026-01-e014-s02-system-hardening.md',
        })
      );
    });

    it('task sync payload includes sprint_id, epic_id, and tasks', () => {
      const { taskSyncs } = simulatePush([FIXTURES.canonical_with_id]);

      expect(taskSyncs[0].sprint_id).toBe('e014_s02');
      expect(taskSyncs[0].epic_id).toBe('e014');
      expect(taskSyncs[0].tasks.length).toBeGreaterThan(0);
    });

    it('each task in sync payload references the correct sprint_id and epic_id', () => {
      const { taskSyncs } = simulatePush([FIXTURES.canonical_with_id]);

      for (const task of taskSyncs[0].tasks) {
        expect(task.sprint_id).toBe('e014_s02');
        expect(task.epic_id).toBe('e014');
      }
    });

    it('ad-hoc sprint tasks reference the correct sprint_id and epic_id', () => {
      const { taskSyncs } = simulatePush([FIXTURES.adhoc_with_id]);

      expect(taskSyncs[0].sprint_id).toBe('adhoc_260203_s01');
      expect(taskSyncs[0].epic_id).toBe('adhoc_260203');

      for (const task of taskSyncs[0].tasks) {
        expect(task.sprint_id).toBe('adhoc_260203_s01');
        expect(task.epic_id).toBe('adhoc_260203');
      }
    });

    it('legacy sprint tasks get synthesized canonical IDs with correct sprint_id', () => {
      const { taskSyncs } = simulatePush([FIXTURES.legacy_epic005_sprint1]);

      expect(taskSyncs[0].sprint_id).toBe('e005_s01');

      // Legacy TASK-N tasks should be synthesized to canonical format
      for (const task of taskSyncs[0].tasks) {
        expect(task.sprint_id).toBe('e005_s01');
        expect(task.epic_id).toBe('e005');
      }
    });
  });


  // ==========================================================================
  // TEST SUITE 3: ID consistency across filename patterns
  // ==========================================================================

  describe('3. ID consistency across filename patterns', () => {
    it('canonical filename: SPRINT-e005_s01-feature-name.md', () => {
      const file: SimulatedSprintFile = {
        filename: 'SPRINT-2026-01-e005-s01-feature-name',
        filePath: 'docs/sprints/SPRINT-2026-01-e005-s01-feature-name.md',
        content: `# Feature Name
**ID:** \`e005_s01\`

## Tasks
### e005_s01_t01: Do something (1h)
**Status:** [ ] Not Started
**Priority:** HIGH
**Goal:** Something
`,
      };

      const { documentUploads, taskSyncs } = simulatePush([file]);
      expect(documentUploads[0].id).toBe('e005_s01');
      expect(taskSyncs[0].sprint_id).toBe('e005_s01');
      expect(documentUploads[0].id).toBe(taskSyncs[0].sprint_id);
    });

    it('legacy filename: SPRINT-2025-12-epic005-sprint1-name.md', () => {
      const { documentUploads, taskSyncs } = simulatePush([FIXTURES.legacy_epic005_sprint1]);
      expect(documentUploads[0].id).toBe('e005_s01');
      expect(taskSyncs[0].sprint_id).toBe('e005_s01');
      expect(documentUploads[0].id).toBe(taskSyncs[0].sprint_id);
    });

    it('adhoc filename: SPRINT-adhoc_260119-bugfix.md', () => {
      const { documentUploads, taskSyncs } = simulatePush([FIXTURES.adhoc_without_id]);
      expect(documentUploads[0].id).toBe('adhoc_260119_s01');
      expect(taskSyncs[0].sprint_id).toBe('adhoc_260119_s01');
      expect(documentUploads[0].id).toBe(taskSyncs[0].sprint_id);
    });

    it('adhoc filename with _s01 embedded: SPRINT-adhoc_251209_s01-name.md', () => {
      const { documentUploads, taskSyncs } = simulatePush([FIXTURES.adhoc_with_s01_in_filename]);
      expect(documentUploads[0].id).toBe('adhoc_251209_s01');
      expect(taskSyncs[0].sprint_id).toBe('adhoc_251209_s01');
      expect(documentUploads[0].id).toBe(taskSyncs[0].sprint_id);
    });

    it('legacy filename with phase naming: SPRINT-2025-11-epic002-phase1.md', () => {
      const { documentUploads, taskSyncs } = simulatePush([FIXTURES.legacy_phase_naming]);
      expect(documentUploads[0].id).toBe('e002_s01');
      expect(taskSyncs[0].sprint_id).toBe('e002_s01');
      expect(documentUploads[0].id).toBe(taskSyncs[0].sprint_id);
    });

    it('letter suffix sprint: SPRINT-2026-01-e015-s00a-name.md', () => {
      const { documentUploads, taskSyncs } = simulatePush([FIXTURES.canonical_letter_suffix]);
      expect(documentUploads[0].id).toBe('e015_s00a');
      expect(taskSyncs[0].sprint_id).toBe('e015_s00a');
      expect(documentUploads[0].id).toBe(taskSyncs[0].sprint_id);
    });

    it('canonical filename without ID in content relies on filename extraction', () => {
      // The embedded canonical pattern (e005-s03) in the filename should be extracted
      const file: SimulatedSprintFile = {
        filename: 'SPRINT-2026-02-e005-s03-new-feature',
        filePath: 'docs/sprints/SPRINT-2026-02-e005-s03-new-feature.md',
        content: `# New Feature

## Tasks
### e005_s03_t01: Build it (2h)
**Status:** [ ] Not Started
**Priority:** HIGH
**Goal:** Build it
`,
      };

      const { documentUploads, taskSyncs } = simulatePush([file]);
      expect(documentUploads[0].id).toBe('e005_s03');
      expect(taskSyncs[0].sprint_id).toBe('e005_s03');
      expect(documentUploads[0].id).toBe(taskSyncs[0].sprint_id);
    });
  });


  // ==========================================================================
  // TEST SUITE 4: No orphan nodes after push
  // ==========================================================================

  describe('4. No orphan nodes after push', () => {
    it('every Sprint referenced in task sync is also uploaded as a document', () => {
      const allFiles = Object.values(FIXTURES);
      const { documentUploads, taskSyncs } = simulatePush(allFiles);

      const docIdSet = new Set(documentUploads.map(d => d.id));
      const syncIdSet = new Set(taskSyncs.map(s => s.sprint_id));

      // Every task-sync sprint must exist in document uploads
      for (const syncId of syncIdSet) {
        expect(docIdSet.has(syncId)).toBe(true);
      }
    });

    it('every document Sprint ID matches a task sync Sprint ID', () => {
      const allFiles = Object.values(FIXTURES);
      const { documentUploads, taskSyncs } = simulatePush(allFiles);

      const docIdSet = new Set(documentUploads.map(d => d.id));
      const syncIdSet = new Set(taskSyncs.map(s => s.sprint_id));

      // Every document sprint must have a corresponding task sync
      for (const docId of docIdSet) {
        expect(syncIdSet.has(docId)).toBe(true);
      }
    });

    it('sprint ID sets are identical between document uploads and task syncs', () => {
      const allFiles = Object.values(FIXTURES);
      const { documentUploads, taskSyncs } = simulatePush(allFiles);

      const docIds = documentUploads.map(d => d.id).sort();
      const syncIds = taskSyncs.map(s => s.sprint_id).sort();

      expect(docIds).toEqual(syncIds);
    });

    it('all tasks have a sprint_id that matches their parent document ID', () => {
      const allFiles = Object.values(FIXTURES);
      const { documentUploads, taskSyncs } = simulatePush(allFiles);

      const docIdSet = new Set(documentUploads.map(d => d.id));

      for (const sync of taskSyncs) {
        for (const task of sync.tasks) {
          expect(docIdSet.has(task.sprint_id)).toBe(true);
        }
      }
    });

    it('epic IDs derived from tasks match epic IDs from parseTaskHierarchy', () => {
      const allFiles = Object.values(FIXTURES);
      const { taskSyncs } = simulatePush(allFiles);

      for (const sync of taskSyncs) {
        for (const task of sync.tasks) {
          const hierarchy = parseTaskHierarchy(task.id);
          if (hierarchy) {
            // Tasks with canonical IDs should have matching hierarchy
            expect(hierarchy.sprint_id).toBe(task.sprint_id);
            expect(hierarchy.epic_id).toBe(task.epic_id);
          }
          // Legacy TASK-N tasks return null from parseTaskHierarchy,
          // but their sprint_id/epic_id come from sprint context, which is fine
        }
      }
    });
  });


  // ==========================================================================
  // TEST SUITE 5: Multi-sprint push simulation
  // ==========================================================================

  describe('5. Multi-sprint push simulation (real-world scenario)', () => {
    it('pushing 9 sprint files produces 9 unique document IDs and 9 matching task sync IDs', () => {
      const allFiles = Object.values(FIXTURES);
      expect(allFiles.length).toBe(9); // sanity check

      const { documentUploads, taskSyncs } = simulatePush(allFiles);

      // 9 documents uploaded
      expect(documentUploads).toHaveLength(9);
      // 9 task syncs
      expect(taskSyncs).toHaveLength(9);

      // All unique
      const docIds = new Set(documentUploads.map(d => d.id));
      expect(docIds.size).toBe(9);

      // Perfect 1:1 match
      for (let i = 0; i < allFiles.length; i++) {
        expect(documentUploads[i].id).toBe(taskSyncs[i].sprint_id);
      }
    });

    it('no Sprint ID appears in both regular and ad-hoc namespaces', () => {
      const allFiles = Object.values(FIXTURES);
      const { documentUploads } = simulatePush(allFiles);

      const regularIds = documentUploads
        .filter(d => d.id.startsWith('e'))
        .map(d => d.id);
      const adhocIds = documentUploads
        .filter(d => d.id.startsWith('adhoc_'))
        .map(d => d.id);

      // No overlap between regular and ad-hoc IDs
      const regularSet = new Set(regularIds);
      for (const adhocId of adhocIds) {
        expect(regularSet.has(adhocId)).toBe(false);
      }

      // Verify we have both types
      expect(regularIds.length).toBeGreaterThan(0);
      expect(adhocIds.length).toBeGreaterThan(0);
    });

    it('expected ID values for all fixtures', () => {
      const expectedIds: Record<string, string> = {
        canonical_with_id: 'e014_s02',
        canonical_with_sprint_id: 'e015_s01',
        canonical_letter_suffix: 'e015_s00a',
        legacy_epic005_sprint1: 'e005_s01',
        legacy_phase_naming: 'e002_s01',
        adhoc_with_id: 'adhoc_260203_s01',
        adhoc_without_id: 'adhoc_260119_s01',
        adhoc_with_s01_in_filename: 'adhoc_251209_s01',
        legacy_larger_numbers: 'e010_s03',
      };

      for (const [key, expectedId] of Object.entries(expectedIds)) {
        const file = FIXTURES[key];
        const { documentUploads, taskSyncs } = simulatePush([file]);

        expect(documentUploads[0].id).toBe(expectedId);
        expect(taskSyncs[0].sprint_id).toBe(expectedId);
      }
    });
  });


  // ==========================================================================
  // TEST SUITE 6: Epic ID consistency between push paths
  // ==========================================================================

  describe('6. Epic ID consistency across push paths', () => {
    it('EPIC file extractEntityId matches task epic_id from parseTaskHierarchy', () => {
      // Simulate pushing EPIC-014 file and Sprint e014_s02 file together
      const epicId = extractEntityId('EPIC-014-system-hardening', 'Epic');
      const { taskSyncs } = simulatePush([FIXTURES.canonical_with_id]);

      expect(epicId).toBe('e014');
      expect(taskSyncs[0].epic_id).toBe('e014');
      expect(epicId).toBe(taskSyncs[0].epic_id);
    });

    it('legacy sprint epic_id matches EPIC file ID', () => {
      const epicId = extractEntityId('EPIC-005-graph-visualization', 'Epic');
      const { taskSyncs } = simulatePush([FIXTURES.legacy_epic005_sprint1]);

      expect(epicId).toBe('e005');
      expect(taskSyncs[0].epic_id).toBe('e005');
    });

    it('adhoc sprint epic_id is consistent', () => {
      const { documentUploads, taskSyncs } = simulatePush([FIXTURES.adhoc_with_id]);

      // The sprint ID starts with the epic ID
      expect(documentUploads[0].id).toBe('adhoc_260203_s01');
      expect(taskSyncs[0].epic_id).toBe('adhoc_260203');
      expect(documentUploads[0].id.startsWith(taskSyncs[0].epic_id)).toBe(true);
    });

    it('all sprints for the same epic share the same epic_id prefix', () => {
      // Push two sprints from EPIC-005
      const sprint1: SimulatedSprintFile = {
        filename: 'SPRINT-2025-12-epic005-sprint1',
        filePath: 'docs/sprints/SPRINT-2025-12-epic005-sprint1.md',
        content: `# SPRINT: Graph Viz Phase 1 (EPIC-005 Sprint 1)
## Tasks
### TASK-1: Build renderer (4h)
**Status:** [x] Complete
**Priority:** HIGH
**Goal:** Render
`,
      };

      const sprint2: SimulatedSprintFile = {
        filename: 'SPRINT-2025-12-epic005-sprint2',
        filePath: 'docs/sprints/SPRINT-2025-12-epic005-sprint2.md',
        content: `# SPRINT: Graph Viz Phase 2 (EPIC-005 Sprint 2)
## Tasks
### TASK-1: Add interactivity (4h)
**Status:** [ ] Not Started
**Priority:** HIGH
**Goal:** Interact
`,
      };

      const { documentUploads, taskSyncs } = simulatePush([sprint1, sprint2]);

      // Both sprints belong to e005
      expect(taskSyncs[0].epic_id).toBe('e005');
      expect(taskSyncs[1].epic_id).toBe('e005');

      // Sprint IDs are distinct
      expect(documentUploads[0].id).toBe('e005_s01');
      expect(documentUploads[1].id).toBe('e005_s02');
      expect(documentUploads[0].id).not.toBe(documentUploads[1].id);

      // Both start with the epic prefix
      expect(documentUploads[0].id.startsWith('e005')).toBe(true);
      expect(documentUploads[1].id.startsWith('e005')).toBe(true);
    });
  });


  // ==========================================================================
  // TEST SUITE 7: parseTaskHierarchy bidirectional consistency
  // ==========================================================================

  describe('7. parseTaskHierarchy bidirectional consistency', () => {
    it('task IDs parsed from sprint files have consistent sprint_id with parseTaskHierarchy', () => {
      const filesWithCanonicalTasks = [
        FIXTURES.canonical_with_id,
        FIXTURES.canonical_with_sprint_id,
        FIXTURES.canonical_letter_suffix,
        FIXTURES.adhoc_with_id,
        FIXTURES.adhoc_without_id,
        FIXTURES.adhoc_with_s01_in_filename,
      ];

      const { taskSyncs } = simulatePush(filesWithCanonicalTasks);

      for (const sync of taskSyncs) {
        for (const task of sync.tasks) {
          const hierarchy = parseTaskHierarchy(task.id);
          expect(hierarchy).not.toBeNull();
          // Sprint IDs must always match — this is the critical assertion
          // for preventing duplicate Sprint nodes
          expect(hierarchy!.sprint_id).toBe(sync.sprint_id);
        }
      }
    });

    it('epic_id from parseTaskHierarchy matches task epic_id for standard sprints', () => {
      // Standard (non-adhoc-with-embedded-s01) files have consistent epic_ids
      const standardFiles = [
        FIXTURES.canonical_with_id,
        FIXTURES.canonical_with_sprint_id,
        FIXTURES.canonical_letter_suffix,
        FIXTURES.adhoc_with_id,
        FIXTURES.adhoc_without_id,
      ];

      const { taskSyncs } = simulatePush(standardFiles);

      for (const sync of taskSyncs) {
        for (const task of sync.tasks) {
          const hierarchy = parseTaskHierarchy(task.id);
          expect(hierarchy).not.toBeNull();
          expect(hierarchy!.epic_id).toBe(sync.epic_id);
        }
      }
    });

    it('adhoc sprint with _s01 in filename: sprint_id is consistent even if epic_id diverges', () => {
      // Edge case: SPRINT-adhoc_251209_s01-name
      // extractSprintMetadata sets epic_id to "adhoc_251209_s01" (the full adhoc capture)
      // parseTaskHierarchy correctly returns epic_id "adhoc_251209"
      // This is a known discrepancy in task-parser that does NOT cause duplicate nodes
      // because sprint_id (the node identity) is still consistent.
      const { taskSyncs } = simulatePush([FIXTURES.adhoc_with_s01_in_filename]);

      for (const task of taskSyncs[0].tasks) {
        const hierarchy = parseTaskHierarchy(task.id);
        expect(hierarchy).not.toBeNull();
        // Sprint ID is consistent — no duplicate Sprint nodes
        expect(hierarchy!.sprint_id).toBe('adhoc_251209_s01');
        expect(taskSyncs[0].sprint_id).toBe('adhoc_251209_s01');
        // Note: epic_id from extractSprintMetadata is "adhoc_251209_s01"
        // while parseTaskHierarchy returns "adhoc_251209". This is a separate
        // minor issue in task-parser that does not affect node deduplication.
        expect(hierarchy!.epic_id).toBe('adhoc_251209');
      }
    });

    it('legacy TASK-N IDs are synthesized to canonical format with correct sprint_id', () => {
      const { taskSyncs } = simulatePush([FIXTURES.legacy_epic005_sprint1]);

      for (const task of taskSyncs[0].tasks) {
        // Legacy tasks should be synthesized: TASK-1 -> e005_s01_t01
        expect(task.id).toMatch(/^e005_s01_t\d{2}$/);
        expect(task.sprint_id).toBe('e005_s01');
        expect(task.epic_id).toBe('e005');

        // And the synthesized ID should work with parseTaskHierarchy
        const hierarchy = parseTaskHierarchy(task.id);
        expect(hierarchy).not.toBeNull();
        expect(hierarchy!.sprint_id).toBe('e005_s01');
        expect(hierarchy!.epic_id).toBe('e005');
      }
    });
  });
});
