/**
 * @fileType: test
 * @status: current
 * @updated: 2026-01-30
 * @tags: [push, pull, test, ADR-077, sync-state, entity-classifier, git-change-detector]
 * @related: [../../src/lib/sync-state.ts, ../../src/lib/entity-classifier.ts, ../../src/lib/git-change-detector.ts]
 * @priority: high
 * @complexity: medium
 * @dependencies: [jest]
 */

import { describe, it, expect } from '@jest/globals';
import {
  classifyFile,
  classifyFiles,
  filterByType,
  isPushableFile,
} from '../../src/lib/entity-classifier.js';

// =============================================================================
// Entity Classifier Tests
// =============================================================================

describe('Entity Classifier', () => {
  describe('classifyFile', () => {
    it('classifies ADR files', () => {
      const result = classifyFile('docs/adr/ADR-077-push-pull-sync.md');
      expect(result.entityType).toBe('ADR');
    });

    it('classifies PRD files', () => {
      const result = classifyFile('docs/PRD/feature-spec.md');
      expect(result.entityType).toBe('PRD');
    });

    it('classifies Epic files', () => {
      const result = classifyFile('docs/epics/EPIC-017-push-pull-sync.md');
      expect(result.entityType).toBe('Epic');
    });

    it('classifies Sprint files', () => {
      const result = classifyFile('docs/sprints/SPRINT-2026-02-e017-s01.md');
      expect(result.entityType).toBe('Sprint');
    });

    it('classifies Charter files', () => {
      const result = classifyFile('docs/PROJECT-CHARTER.md');
      expect(result.entityType).toBe('Charter');
    });

    it('classifies Pattern files', () => {
      const result = classifyFile('.ginko/context/modules/retry-pattern.md');
      expect(result.entityType).toBe('Pattern');
    });

    it('classifies Gotcha files', () => {
      const result = classifyFile('.ginko/context/modules/timer-gotcha.md');
      expect(result.entityType).toBe('Gotcha');
    });

    it('classifies Session files', () => {
      const result = classifyFile('.ginko/sessions/user/current-session-log.md');
      expect(result.entityType).toBe('Session');
    });

    it('detects misfiled epics in sprints directory', () => {
      const result = classifyFile('docs/sprints/EPIC-001-something.md');
      expect(result.entityType).toBe('Epic');
      expect(result.warning).toContain('Epic file found in sprints directory');
    });

    it('detects misfiled epics by content', () => {
      const result = classifyFile('docs/sprints/something.md', '# EPIC-001: My Epic');
      expect(result.entityType).toBe('Epic');
      expect(result.warning).toBeDefined();
    });

    it('classifies unknown files as ContextModule', () => {
      const result = classifyFile('docs/random.md');
      expect(result.entityType).toBe('ContextModule');
    });
  });

  describe('classifyFiles', () => {
    it('groups files by entity type', () => {
      const files = [
        'docs/adr/ADR-001.md',
        'docs/adr/ADR-002.md',
        'docs/sprints/SPRINT-001.md',
        'docs/epics/EPIC-001.md',
      ];

      const groups = classifyFiles(files);
      expect(groups.get('ADR')?.length).toBe(2);
      expect(groups.get('Sprint')?.length).toBe(1);
      expect(groups.get('Epic')?.length).toBe(1);
    });
  });

  describe('filterByType', () => {
    it('filters by type case-insensitively', () => {
      const files = [
        { filePath: 'docs/adr/ADR-001.md', entityType: 'ADR' as const },
        { filePath: 'docs/sprints/SPRINT-001.md', entityType: 'Sprint' as const },
      ];

      const filtered = filterByType(files, 'adr');
      expect(filtered.length).toBe(1);
      expect(filtered[0].entityType).toBe('ADR');
    });
  });

  describe('isPushableFile', () => {
    it('accepts docs/*.md files', () => {
      expect(isPushableFile('docs/adr/ADR-001.md')).toBe(true);
      expect(isPushableFile('docs/sprints/SPRINT-001.md')).toBe(true);
      expect(isPushableFile('docs/epics/EPIC-001.md')).toBe(true);
    });

    it('accepts .ginko/sessions/*.jsonl files', () => {
      expect(isPushableFile('.ginko/sessions/user/events.jsonl')).toBe(true);
    });

    it('accepts PROJECT-CHARTER.md', () => {
      expect(isPushableFile('docs/PROJECT-CHARTER.md')).toBe(true);
    });

    it('rejects non-markdown, non-jsonl files', () => {
      expect(isPushableFile('src/index.ts')).toBe(false);
      expect(isPushableFile('package.json')).toBe(false);
    });

    it('rejects node_modules files', () => {
      expect(isPushableFile('node_modules/chalk/README.md')).toBe(false);
    });

    it('rejects dist files', () => {
      expect(isPushableFile('dist/templates/something.md')).toBe(false);
    });

    it('rejects .git files', () => {
      expect(isPushableFile('.git/HEAD.md')).toBe(false);
    });
  });
});

// =============================================================================
// Sync State Tests (interface verification)
// =============================================================================

describe('Sync State', () => {
  it('default state has expected properties', async () => {
    const { readSyncState } = await import('../../src/lib/sync-state.js');

    const state = await readSyncState();
    expect(state).toHaveProperty('lastPushCommit');
    expect(state).toHaveProperty('lastPushTimestamp');
    expect(state).toHaveProperty('lastPullTimestamp');
    expect(state).toHaveProperty('pushedFiles');
  });
});
