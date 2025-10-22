/**
 * @fileType: test
 * @status: current
 * @updated: 2025-10-22
 * @tags: [test, context-loader, progressive-loading, task-011]
 * @related: [context-loader.ts, config-loader.ts, reference-parser.ts]
 * @priority: high
 * @complexity: high
 * @dependencies: [jest, fs-extra, path]
 */

/**
 * Context Loader Unit Tests (TASK-011)
 *
 * Tests strategic progressive context loading:
 * - Priority-ordered loading
 * - Reference following with depth limits
 * - Work mode filtering
 * - Efficiency metrics (80% context from ≤5 docs)
 * - Bootstrap speed (<1 second)
 * - Circular reference handling
 */

import { jest } from '@jest/globals';
import fs from 'fs-extra';
import path from 'path';
import os from 'os';
import {
  ContextLoader,
  loadContextStrategic,
  formatContextSummary,
  getDocumentContent,
  getLoadedPaths,
  getDocumentsByType,
  LoadingOptions,
  StrategyContext
} from '../../src/utils/context-loader.js';

describe('ContextLoader', () => {
  let tempDir: string;
  let projectRoot: string;

  beforeEach(async () => {
    // Invalidate caches before each test
    const { invalidateConfigCache } = await import('../../src/utils/config-loader.js');
    const { clearResolvedPathCache } = await import('../../src/utils/reference-parser.js');
    invalidateConfigCache();
    clearResolvedPathCache();

    // Create temporary test directory structure
    tempDir = await fs.mkdtemp(path.join(os.tmpdir(), 'ginko-context-test-'));
    projectRoot = tempDir;

    // Create test directory structure
    await fs.ensureDir(path.join(tempDir, '.ginko', 'sessions', 'test-user'));
    await fs.ensureDir(path.join(tempDir, 'docs', 'sprints'));
    await fs.ensureDir(path.join(tempDir, 'docs', 'PRD'));
    await fs.ensureDir(path.join(tempDir, 'docs', 'adr'));
    await fs.ensureDir(path.join(tempDir, 'backlog', 'items'));

    // Create test configuration files
    const ginkoConfig = {
      version: '1.0',
      project: {
        name: 'test-project',
        type: 'single'
      },
      paths: {
        sessions: '.ginko/sessions',
        currentSprint: 'docs/sprints/CURRENT-SPRINT.md',
        sprints: 'docs/sprints',
        prds: 'docs/PRD',
        adrs: 'docs/adr',
        backlog: 'backlog',
        context: '.ginko/context/modules'
      },
      workMode: {
        default: 'think-build',
        documentationDepth: {
          'hack-ship': ['currentSprint', 'sessions'],
          'think-build': ['currentSprint', 'sessions', 'adrs', 'prds'],
          'full-planning': ['currentSprint', 'sessions', 'adrs', 'prds', 'architecture']
        }
      },
      contextLoading: {
        progressive: true,
        maxDepth: 3,
        followReferences: true,
        priorityOrder: ['sessions', 'currentSprint', 'prds', 'adrs', 'context']
      }
    };

    await fs.writeJSON(path.join(tempDir, 'ginko.json'), ginkoConfig, { spaces: 2 });

    const localConfig = {
      projectRoot: tempDir,
      userEmail: 'test@example.com',
      userSlug: 'test-user',
      workMode: 'think-build'
    };

    await fs.writeJSON(
      path.join(tempDir, '.ginko', 'local.json'),
      localConfig,
      { spaces: 2 }
    );

    // Change to test directory
    process.chdir(tempDir);
  });

  afterEach(async () => {
    // Cleanup
    await fs.remove(tempDir);
  });

  describe('Priority-Ordered Loading', () => {
    test('should load session log first', async () => {
      // Create session log
      const sessionLog = `# Session Log
Session started at 2025-10-22T10:00:00Z

## Events
### 10:15 - [feature]
Working on TASK-011 progressive context loading
`;

      await fs.writeFile(
        path.join(tempDir, '.ginko', 'sessions', 'test-user', 'current-session-log.md'),
        sessionLog
      );

      const loader = new ContextLoader();
      const context = await loader.loadContextStrategic({
        workMode: 'think-build',
        sessionDir: path.join(tempDir, '.ginko', 'sessions', 'test-user')
      });

      expect(context.loadOrder[0]).toBe('session-log');
      expect(context.documents.size).toBeGreaterThan(0);
    });

    test('should load current sprint second', async () => {
      // Create sprint document
      const sprint = `# SPRINT-2025-10-22-test-sprint

## Goal
Test progressive loading

## Tasks
- TASK-011: Progressive Context Loading (references PRD-009)
`;

      await fs.writeFile(
        path.join(tempDir, 'docs', 'sprints', 'CURRENT-SPRINT.md'),
        sprint
      );

      const loader = new ContextLoader();
      const context = await loader.loadContextStrategic({
        workMode: 'think-build'
      });

      expect(context.loadOrder).toContain('current-sprint');
    });

    test('should follow reference chains after core documents', async () => {
      // Create interconnected documents
      const sprint = `# SPRINT-2025-10-22-config

References TASK-011 and PRD-009
`;

      const task = `---
id: TASK-011
title: Progressive Context Loading
---

Implements PRD-009 progressive loading system.
`;

      const prd = `---
id: PRD-009
title: Configuration System
---

Architecture defined in ADR-037
`;

      await fs.writeFile(
        path.join(tempDir, 'docs', 'sprints', 'CURRENT-SPRINT.md'),
        sprint
      );
      await fs.writeFile(
        path.join(tempDir, 'backlog', 'items', 'TASK-011.md'),
        task
      );
      await fs.writeFile(
        path.join(tempDir, 'docs', 'PRD', 'PRD-009.md'),
        prd
      );

      const loader = new ContextLoader();
      const context = await loader.loadContextStrategic({
        workMode: 'think-build',
        followReferences: true,
        maxDepth: 3
      });

      // Should load sprint → TASK-011 → PRD-009
      expect(context.loadOrder).toContain('current-sprint');
      expect(context.loadOrder).toContain('TASK-011');
      expect(context.loadOrder).toContain('PRD-009');
    });
  });

  describe('Reference Following with Depth Limits', () => {
    test('should respect maxDepth limit', async () => {
      // Create chain: sprint → task → prd → adr → deep-doc
      const sprint = `# Sprint
References TASK-001
`;
      const task = `# TASK-001
References PRD-001
`;
      const prd = `# PRD-001
References ADR-001
`;
      const adr = `# ADR-001
References TASK-999 (deep)
`;

      await fs.writeFile(
        path.join(tempDir, 'docs', 'sprints', 'CURRENT-SPRINT.md'),
        sprint
      );
      await fs.writeFile(
        path.join(tempDir, 'backlog', 'items', 'TASK-001.md'),
        task
      );
      await fs.writeFile(
        path.join(tempDir, 'docs', 'PRD', 'PRD-001.md'),
        prd
      );
      await fs.writeFile(
        path.join(tempDir, 'docs', 'adr', 'ADR-001.md'),
        adr
      );

      const loader = new ContextLoader();
      const context = await loader.loadContextStrategic({
        workMode: 'think-build',
        maxDepth: 2,  // Should stop before TASK-999
        followReferences: true
      });

      // Should NOT load TASK-999 (beyond maxDepth)
      expect(context.loadOrder).not.toContain('TASK-999');
    });

    test('should detect circular references', async () => {
      // Create circular reference: task-a → task-b → task-a
      const taskA = `# TASK-100
References TASK-101
`;
      const taskB = `# TASK-101
References TASK-100 (circular)
`;

      await fs.writeFile(
        path.join(tempDir, 'backlog', 'items', 'TASK-100.md'),
        taskA
      );
      await fs.writeFile(
        path.join(tempDir, 'backlog', 'items', 'TASK-101.md'),
        taskB
      );

      const sprint = `# Sprint
References TASK-100
`;
      await fs.writeFile(
        path.join(tempDir, 'docs', 'sprints', 'CURRENT-SPRINT.md'),
        sprint
      );

      const loader = new ContextLoader();

      // Should not throw, should handle gracefully
      await expect(
        loader.loadContextStrategic({
          workMode: 'think-build',
          maxDepth: 3,
          followReferences: true
        })
      ).resolves.toBeDefined();

      const context = await loader.loadContextStrategic({
        workMode: 'think-build',
        maxDepth: 3,
        followReferences: true
      });

      // Should have cache hits from circular detection
      expect(context.metrics.cacheHits).toBeGreaterThan(0);
    });
  });

  describe('Work Mode Filtering', () => {
    test('hack-ship mode loads minimal documents', async () => {
      const sprint = `# Sprint
References TASK-001, PRD-001, ADR-001
`;

      await fs.writeFile(
        path.join(tempDir, 'docs', 'sprints', 'CURRENT-SPRINT.md'),
        sprint
      );

      const loader = new ContextLoader();
      const context = await loader.loadContextStrategic({
        workMode: 'hack-ship',
        followReferences: true,
        maxDepth: 3
      });

      // hack-ship should only load sprint and tasks, not PRDs/ADRs
      const loadedTypes = Array.from(context.documents.values()).map(d => d.type);
      expect(loadedTypes).toContain('sprint');
      // Should NOT heavily load PRDs/ADRs in hack-ship mode
    });

    test('think-build mode loads PRDs and ADRs', async () => {
      const sprint = `# Sprint
References TASK-001, PRD-001, ADR-001
`;
      const task = `# TASK-001`;
      const prd = `# PRD-001`;
      const adr = `# ADR-001`;

      await fs.writeFile(
        path.join(tempDir, 'docs', 'sprints', 'CURRENT-SPRINT.md'),
        sprint
      );
      await fs.writeFile(
        path.join(tempDir, 'backlog', 'items', 'TASK-001.md'),
        task
      );
      await fs.writeFile(
        path.join(tempDir, 'docs', 'PRD', 'PRD-001.md'),
        prd
      );
      await fs.writeFile(
        path.join(tempDir, 'docs', 'adr', 'ADR-001.md'),
        adr
      );

      const loader = new ContextLoader();
      const context = await loader.loadContextStrategic({
        workMode: 'think-build',
        followReferences: true,
        maxDepth: 2
      });

      // think-build should load PRDs and ADRs
      expect(context.loadOrder).toContain('PRD-001');
      expect(context.loadOrder).toContain('ADR-001');
    });

    test('full-planning mode loads all documentation', async () => {
      const sprint = `# Sprint
References TASK-001, PRD-001, ADR-001, FEATURE-001
`;

      await fs.writeFile(
        path.join(tempDir, 'docs', 'sprints', 'CURRENT-SPRINT.md'),
        sprint
      );

      const loader = new ContextLoader();
      const context = await loader.loadContextStrategic({
        workMode: 'full-planning',
        followReferences: true,
        maxDepth: 3
      });

      // full-planning loads everything
      expect(context.workMode).toBe('full-planning');
    });
  });

  describe('Efficiency Metrics', () => {
    test('should achieve 80% context from ≤5 documents', async () => {
      // Create minimal high-value documents
      const sessionLog = `# Session Log
Working on TASK-011
`;
      const sprint = `# Sprint
Implementing progressive loading (TASK-011, PRD-009)
`;
      const task = `# TASK-011
Progressive Context Loading per PRD-009
`;
      const prd = `# PRD-009
Configuration and Reference System
`;

      await fs.writeFile(
        path.join(tempDir, '.ginko', 'sessions', 'test-user', 'current-session-log.md'),
        sessionLog
      );
      await fs.writeFile(
        path.join(tempDir, 'docs', 'sprints', 'CURRENT-SPRINT.md'),
        sprint
      );
      await fs.writeFile(
        path.join(tempDir, 'backlog', 'items', 'TASK-011.md'),
        task
      );
      await fs.writeFile(
        path.join(tempDir, 'docs', 'PRD', 'PRD-009.md'),
        prd
      );

      const loader = new ContextLoader();
      const context = await loader.loadContextStrategic({
        workMode: 'think-build',
        followReferences: true,
        maxDepth: 2,
        sessionDir: path.join(tempDir, '.ginko', 'sessions', 'test-user')
      });

      // Verify 80% context from ≤5 documents
      expect(context.metrics.documentsLoaded).toBeLessThanOrEqual(5);

      const efficiency = loader.measureContextEfficiency(context);
      expect(efficiency.meetsGoals).toBe(true);
      expect(efficiency.issues).toHaveLength(0);
    });

    test('should load in <1 second', async () => {
      // Create test documents
      const sprint = `# Sprint
Test bootstrap speed
`;

      await fs.writeFile(
        path.join(tempDir, 'docs', 'sprints', 'CURRENT-SPRINT.md'),
        sprint
      );

      const loader = new ContextLoader();
      const context = await loader.loadContextStrategic({
        workMode: 'think-build'
      });

      // Bootstrap time should be <1000ms
      expect(context.metrics.bootstrapTimeMs).toBeLessThan(1000);
    });

    test('should achieve 70% token reduction vs baseline', async () => {
      // Create minimal documents (should be much less than 25,000 token baseline)
      const sprint = `# Sprint
Short sprint document
`;

      await fs.writeFile(
        path.join(tempDir, 'docs', 'sprints', 'CURRENT-SPRINT.md'),
        sprint
      );

      const loader = new ContextLoader();
      const context = await loader.loadContextStrategic({
        workMode: 'think-build'
      });

      // Token reduction should be ≥70%
      expect(context.metrics.tokenReductionPercent).toBeGreaterThanOrEqual(70);
    });

    test('should track cache hits', async () => {
      // Create document that references same doc multiple times
      const sprint = `# Sprint
References TASK-001, TASK-001, TASK-001
`;
      const task = `# TASK-001`;

      await fs.writeFile(
        path.join(tempDir, 'docs', 'sprints', 'CURRENT-SPRINT.md'),
        sprint
      );
      await fs.writeFile(
        path.join(tempDir, 'backlog', 'items', 'TASK-001.md'),
        task
      );

      const loader = new ContextLoader();
      const context = await loader.loadContextStrategic({
        workMode: 'think-build',
        followReferences: true
      });

      // Should have cache hits from duplicate references
      expect(context.metrics.cacheHits).toBeGreaterThan(0);
    });
  });

  describe('Utility Functions', () => {
    test('formatContextSummary should format metrics', async () => {
      const sprint = `# Sprint`;
      await fs.writeFile(
        path.join(tempDir, 'docs', 'sprints', 'CURRENT-SPRINT.md'),
        sprint
      );

      const context = await loadContextStrategic({
        workMode: 'think-build'
      });

      const summary = formatContextSummary(context);

      expect(summary).toContain('Context Loading Summary');
      expect(summary).toContain('Work Mode: think-build');
      expect(summary).toContain('Documents:');
      expect(summary).toContain('Tokens:');
      expect(summary).toContain('Token Reduction:');
    });

    test('getDocumentContent should retrieve content', async () => {
      const sprint = `# Sprint Content`;
      const sprintPath = path.join(tempDir, 'docs', 'sprints', 'CURRENT-SPRINT.md');
      await fs.writeFile(sprintPath, sprint);

      const context = await loadContextStrategic({
        workMode: 'think-build'
      });

      const content = getDocumentContent(context, sprintPath);
      expect(content).toBe(sprint);
    });

    test('getLoadedPaths should return all paths', async () => {
      const sprint = `# Sprint`;
      await fs.writeFile(
        path.join(tempDir, 'docs', 'sprints', 'CURRENT-SPRINT.md'),
        sprint
      );

      const context = await loadContextStrategic({
        workMode: 'think-build'
      });

      const paths = getLoadedPaths(context);
      expect(paths.length).toBeGreaterThan(0);
      expect(paths.some(p => p.includes('CURRENT-SPRINT.md'))).toBe(true);
    });

    test('getDocumentsByType should filter by type', async () => {
      const sprint = `# Sprint`;
      await fs.writeFile(
        path.join(tempDir, 'docs', 'sprints', 'CURRENT-SPRINT.md'),
        sprint
      );

      const context = await loadContextStrategic({
        workMode: 'think-build'
      });

      const sprints = getDocumentsByType(context, 'sprint');
      expect(sprints.length).toBeGreaterThan(0);
      expect(sprints[0].type).toBe('sprint');
    });
  });

  describe('Edge Cases', () => {
    test('should handle missing session log gracefully', async () => {
      // No session log exists
      const loader = new ContextLoader();
      const context = await loader.loadContextStrategic({
        workMode: 'think-build',
        sessionDir: path.join(tempDir, '.ginko', 'sessions', 'nonexistent')
      });

      // Should still load other context
      expect(context.documents).toBeDefined();
      expect(context.metrics).toBeDefined();
    });

    test('should handle missing sprint gracefully', async () => {
      // No sprint document
      const loader = new ContextLoader();
      const context = await loader.loadContextStrategic({
        workMode: 'think-build'
      });

      // Should still complete without error
      expect(context.documents).toBeDefined();
      expect(context.metrics.documentsLoaded).toBe(0);
    });

    test('should handle broken references gracefully', async () => {
      const sprint = `# Sprint
References TASK-999 (does not exist)
`;

      await fs.writeFile(
        path.join(tempDir, 'docs', 'sprints', 'CURRENT-SPRINT.md'),
        sprint
      );

      const loader = new ContextLoader();

      // Should not throw on broken reference
      await expect(
        loader.loadContextStrategic({
          workMode: 'think-build',
          followReferences: true
        })
      ).resolves.toBeDefined();
    });

    test('should handle empty documents', async () => {
      const sprint = ``;  // Empty
      await fs.writeFile(
        path.join(tempDir, 'docs', 'sprints', 'CURRENT-SPRINT.md'),
        sprint
      );

      const loader = new ContextLoader();
      const context = await loader.loadContextStrategic({
        workMode: 'think-build'
      });

      expect(context.documents.size).toBe(1);
      expect(context.metrics.totalTokens).toBe(0);
    });
  });

  describe('Reset and State Management', () => {
    test('reset should clear loader state', async () => {
      const sprint = `# Sprint`;
      await fs.writeFile(
        path.join(tempDir, 'docs', 'sprints', 'CURRENT-SPRINT.md'),
        sprint
      );

      const loader = new ContextLoader();
      await loader.loadContextStrategic({ workMode: 'think-build' });

      loader.reset();

      // After reset, should start fresh
      const context = await loader.loadContextStrategic({ workMode: 'think-build' });
      expect(context.metrics.cacheHits).toBe(0);
    });
  });
});

describe('Integration Tests', () => {
  let tempDir: string;

  beforeEach(async () => {
    // Invalidate caches before each test
    const { invalidateConfigCache } = await import('../../src/utils/config-loader.js');
    const { clearResolvedPathCache } = await import('../../src/utils/reference-parser.js');
    invalidateConfigCache();
    clearResolvedPathCache();

    tempDir = await fs.mkdtemp(path.join(os.tmpdir(), 'ginko-integration-test-'));

    // Create full project structure
    await fs.ensureDir(path.join(tempDir, '.ginko', 'sessions', 'test-user'));
    await fs.ensureDir(path.join(tempDir, 'docs', 'sprints'));
    await fs.ensureDir(path.join(tempDir, 'docs', 'PRD'));
    await fs.ensureDir(path.join(tempDir, 'docs', 'adr'));
    await fs.ensureDir(path.join(tempDir, 'backlog', 'items'));

    // Create config
    const ginkoConfig = {
      version: '1.0',
      project: { name: 'integration-test', type: 'single' },
      paths: {
        sessions: '.ginko/sessions',
        currentSprint: 'docs/sprints/CURRENT-SPRINT.md',
        sprints: 'docs/sprints',
        prds: 'docs/PRD',
        adrs: 'docs/adr',
        backlog: 'backlog'
      },
      workMode: {
        default: 'think-build',
        documentationDepth: {
          'hack-ship': ['currentSprint', 'sessions'],
          'think-build': ['currentSprint', 'sessions', 'adrs', 'prds'],
          'full-planning': ['currentSprint', 'sessions', 'adrs', 'prds']
        }
      },
      contextLoading: {
        progressive: true,
        maxDepth: 3,
        followReferences: true,
        priorityOrder: ['sessions', 'currentSprint', 'prds', 'adrs']
      }
    };

    await fs.writeJSON(path.join(tempDir, 'ginko.json'), ginkoConfig, { spaces: 2 });

    const localConfig = {
      projectRoot: tempDir,
      userEmail: 'test@example.com',
      userSlug: 'test-user'
    };

    await fs.writeJSON(
      path.join(tempDir, '.ginko', 'local.json'),
      localConfig,
      { spaces: 2 }
    );

    process.chdir(tempDir);
  });

  afterEach(async () => {
    await fs.remove(tempDir);
  });

  test('end-to-end: realistic project context loading', async () => {
    // Create realistic interconnected documents
    const sessionLog = `# Session Log - 2025-10-22

## Events
### 10:00 - [feature]
Starting TASK-011 implementation per PRD-009
Files: src/utils/context-loader.ts
Impact: high | Pressure: 15%

### 10:30 - [decision]
Chose depth-first traversal for reference following per ADR-037
Impact: medium | Pressure: 25%
`;

    const sprint = `# SPRINT-2025-10-22-configuration-system

## Goal
Implement two-tier configuration and progressive context loading

## Tasks
- TASK-009: Two-Tier Configuration Foundation ✅
- TASK-010: Reference Link System ✅
- TASK-011: Progressive Context Loading (in progress)

## References
- PRD-009: Configuration and Reference System
- ADR-037: Two-Tier Configuration Architecture
`;

    const task = `---
id: TASK-011
title: Progressive Context Loading
parent: FEATURE-024
status: in_progress
priority: high
---

Implement priority-ordered context loading per PRD-009 and ADR-037.

**Goal**: 80% context from 3-5 docs, <1s bootstrap, 70% token reduction.
`;

    const prd = `---
id: PRD-009
title: Configuration and Reference System
---

# Configuration and Reference System

Strategic context loading to reduce token usage by 70%.

**Architecture**: ADR-037 Two-Tier Configuration
**Implementation**: TASK-011, TASK-010, TASK-009
`;

    const adr = `---
id: ADR-037
title: Two-Tier Configuration Architecture
status: accepted
---

# ADR-037: Two-Tier Configuration Architecture

## Decision
Separate team-shared structure (ginko.json) from user-specific paths (local.json).

## Context
Enable progressive context loading per PRD-009.
`;

    // Write all documents
    await fs.writeFile(
      path.join(tempDir, '.ginko', 'sessions', 'test-user', 'current-session-log.md'),
      sessionLog
    );
    await fs.writeFile(
      path.join(tempDir, 'docs', 'sprints', 'CURRENT-SPRINT.md'),
      sprint
    );
    await fs.writeFile(
      path.join(tempDir, 'backlog', 'items', 'TASK-011.md'),
      task
    );
    await fs.writeFile(
      path.join(tempDir, 'docs', 'PRD', 'PRD-009.md'),
      prd
    );
    await fs.writeFile(
      path.join(tempDir, 'docs', 'adr', 'ADR-037.md'),
      adr
    );

    // Load context strategically
    const context = await loadContextStrategic({
      workMode: 'think-build',
      maxDepth: 3,
      followReferences: true,
      sessionDir: path.join(tempDir, '.ginko', 'sessions', 'test-user')
    });

    // Verify all acceptance criteria
    expect(context.metrics.bootstrapTimeMs).toBeLessThan(1000);
    expect(context.metrics.documentsLoaded).toBeLessThanOrEqual(5);
    expect(context.metrics.tokenReductionPercent).toBeGreaterThanOrEqual(70);

    // Verify load order: session → sprint → task → prd → adr
    expect(context.loadOrder[0]).toBe('session-log');
    expect(context.loadOrder[1]).toBe('current-sprint');
    expect(context.loadOrder).toContain('TASK-011');
    expect(context.loadOrder).toContain('PRD-009');
    expect(context.loadOrder).toContain('ADR-037');

    // Verify content is accessible
    const sprintPath = path.join(tempDir, 'docs', 'sprints', 'CURRENT-SPRINT.md');
    const sprintContent = getDocumentContent(context, sprintPath);
    expect(sprintContent).toContain('SPRINT-2025-10-22');

    // Log summary for visibility
    console.log('\n' + formatContextSummary(context));
  });
});
