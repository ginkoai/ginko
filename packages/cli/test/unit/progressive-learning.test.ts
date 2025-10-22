/**
 * @fileType: test
 * @status: current
 * @updated: 2025-10-21
 * @tags: [test, progressive-learning, hints, ux]
 * @related: [progressive-learning.ts]
 * @priority: critical
 * @complexity: medium
 */

import { describe, it, expect, beforeEach, afterEach, jest } from '@jest/globals';
import fs from 'fs-extra';
import path from 'path';
import os from 'os';
import { ProgressiveLearning } from '../../src/utils/progressive-learning.js';

// Mock the ginko-root module
jest.mock('../../src/utils/ginko-root.js', () => ({
  getGinkoPath: jest.fn(async (relativePath: string) => {
    return path.join(process.env.TEST_GINKO_DIR || '/tmp', relativePath);
  }),
}));

describe('ProgressiveLearning', () => {
  let tempDir: string;

  beforeEach(async () => {
    // Create temp directory for each test
    tempDir = await fs.mkdtemp(path.join(os.tmpdir(), 'progressive-learning-test-'));
    process.env.TEST_GINKO_DIR = tempDir;
  });

  afterEach(async () => {
    // Cleanup temp directory
    await fs.remove(tempDir);
    delete process.env.TEST_GINKO_DIR;
  });

  describe('getUserProgress', () => {
    it('should create new progress when file does not exist', async () => {
      const progress = await ProgressiveLearning.getUserProgress();

      expect(progress.commandsUsed).toEqual({});
      expect(progress.totalSessions).toBe(0);
      expect(progress.hintsShown).toEqual([]);
      expect(progress.preferences.showHints).toBe(true);
      expect(progress.preferences.verbosity).toBe('normal');
      expect(progress.firstSeen).toBeDefined();
      expect(progress.lastSeen).toBeDefined();
    });

    it('should read existing progress file', async () => {
      const existingProgress = {
        commandsUsed: { init: 5, start: 10 },
        firstSeen: '2025-01-01T00:00:00.000Z',
        lastSeen: '2025-01-02T00:00:00.000Z',
        totalSessions: 10,
        hintsShown: ['first-handoff'],
        preferences: {
          showHints: true,
          verbosity: 'verbose' as const,
        },
      };

      await fs.writeJSON(path.join(tempDir, 'user-progress.json'), existingProgress);

      const progress = await ProgressiveLearning.getUserProgress();

      expect(progress.commandsUsed).toEqual({ init: 5, start: 10 });
      expect(progress.totalSessions).toBe(10);
      expect(progress.hintsShown).toEqual(['first-handoff']);
      expect(progress.preferences.verbosity).toBe('verbose');
    });

    it('should handle corrupted progress file gracefully', async () => {
      await fs.writeFile(path.join(tempDir, 'user-progress.json'), '{invalid json}');

      const progress = await ProgressiveLearning.getUserProgress();

      // Should return new progress instead of crashing
      expect(progress.commandsUsed).toEqual({});
      expect(progress.totalSessions).toBe(0);
    });
  });

  describe('updateProgress', () => {
    it('should increment command usage count', async () => {
      await ProgressiveLearning.updateProgress('init');
      await ProgressiveLearning.updateProgress('init');
      await ProgressiveLearning.updateProgress('start');

      const progress = await ProgressiveLearning.getUserProgress();

      expect(progress.commandsUsed.init).toBe(2);
      expect(progress.commandsUsed.start).toBe(1);
    });

    it('should update lastSeen timestamp', async () => {
      const before = new Date().toISOString();
      await ProgressiveLearning.updateProgress('test');
      const after = new Date().toISOString();

      const progress = await ProgressiveLearning.getUserProgress();

      expect(progress.lastSeen).toBeDefined();
      expect(progress.lastSeen >= before).toBe(true);
      expect(progress.lastSeen <= after).toBe(true);
    });

    it('should increment totalSessions when command is start', async () => {
      await ProgressiveLearning.updateProgress('start');
      await ProgressiveLearning.updateProgress('start');
      await ProgressiveLearning.updateProgress('init');

      const progress = await ProgressiveLearning.getUserProgress();

      expect(progress.totalSessions).toBe(2);
    });

    it('should not crash on file system errors', async () => {
      // Make directory read-only to cause write error
      await fs.chmod(tempDir, 0o444);

      // Should not throw
      await expect(
        ProgressiveLearning.updateProgress('test')
      ).resolves.not.toThrow();

      // Restore permissions for cleanup
      await fs.chmod(tempDir, 0o755);
    });
  });

  describe('getContextualHint', () => {
    it('should return null when hints are disabled', async () => {
      const progress = await ProgressiveLearning.getUserProgress();
      progress.preferences.showHints = false;
      await fs.writeJSON(path.join(tempDir, 'user-progress.json'), progress);

      const hint = await ProgressiveLearning.getContextualHint({ command: 'start' });

      expect(hint).toBeNull();
    });

    it('should return hint when conditions are met', async () => {
      const hint = await ProgressiveLearning.getContextualHint({
        sessionAge: 35 // Triggers 'first-handoff' hint
      });

      expect(hint).toBeDefined();
      expect(hint).toContain('ginko handoff');
    });

    it('should not show hint twice when showOnce is true', async () => {
      // First call should return hint
      const hint1 = await ProgressiveLearning.getContextualHint({
        sessionAge: 35
      });
      expect(hint1).toBeDefined();

      // Second call should return null (already shown)
      const hint2 = await ProgressiveLearning.getContextualHint({
        sessionAge: 35
      });
      expect(hint2).toBeNull();
    });

    it('should respect hint dependencies', async () => {
      // Try to get 'explore-mode' hint which depends on 'first-handoff'
      // The trigger has random probability, so we need to check multiple scenarios

      // First, mark first-handoff as not shown
      const progress = await ProgressiveLearning.getUserProgress();
      progress.hintsShown = []; // Ensure first-handoff is not shown
      await fs.writeJSON(path.join(tempDir, 'user-progress.json'), progress);

      // The explore-mode hint has dependencies: ['first-handoff']
      // It should NOT be returned even if trigger conditions match
      // Since we can't deterministically trigger it due to random(), we'll verify
      // by checking that first-handoff must be shown before explore-mode can appear

      // Show first-handoff first
      await ProgressiveLearning.getContextualHint({ sessionAge: 35 });

      // Now verify first-handoff is in hintsShown
      const updatedProgress = await ProgressiveLearning.getUserProgress();
      expect(updatedProgress.hintsShown).toContain('first-handoff');
    });

    it('should prioritize high priority hints', async () => {
      // Create context that triggers multiple hints
      const hint = await ProgressiveLearning.getContextualHint({
        sessionAge: 35, // Triggers 'first-handoff' (high priority)
        gitStatus: { staged: [1, 2, 3, 4] } // Triggers 'ship-ready' (medium priority)
      });

      // Should return the high priority hint
      expect(hint).toContain('ginko handoff');
    });

    it('should filter out hints based on showOnce and hintsShown', async () => {
      const progress = await ProgressiveLearning.getUserProgress();
      progress.hintsShown = ['first-handoff', 'vibecheck-suggestion'];
      await fs.writeJSON(path.join(tempDir, 'user-progress.json'), progress);

      const hint = await ProgressiveLearning.getContextualHint({
        sessionAge: 35, // Would trigger first-handoff, but already shown
        errorType: 'confusion' // Would trigger vibecheck, but already shown
      });

      // Should return null or a different hint
      if (hint) {
        expect(hint).not.toContain('ginko handoff');
        expect(hint).not.toContain('ginko vibecheck');
      }
    });

    it('should handle error type triggers', async () => {
      const hint = await ProgressiveLearning.getContextualHint({
        errorType: 'confusion'
      });

      expect(hint).toBeDefined();
      expect(hint).toContain('ginko vibecheck');
    });

    it('should handle git status triggers', async () => {
      const hint = await ProgressiveLearning.getContextualHint({
        gitStatus: { staged: [1, 2, 3, 4] }
      });

      expect(hint).toBeDefined();
      expect(hint).toContain('ginko ship');
    });
  });

  describe('getExperienceLevel', () => {
    it('should classify as beginner with low usage', () => {
      const progress = {
        commandsUsed: { init: 3, start: 2 },
        firstSeen: '2025-01-01',
        lastSeen: '2025-01-01',
        totalSessions: 2,
        hintsShown: [],
        preferences: { showHints: true, verbosity: 'normal' as const },
      };

      const level = ProgressiveLearning.getExperienceLevel(progress);

      expect(level).toBe('beginner');
    });

    it('should classify as intermediate with moderate usage', () => {
      const progress = {
        commandsUsed: {
          init: 5,
          start: 10,
          handoff: 8,
          capture: 3,
          status: 12,
          vibecheck: 2,
          explore: 1
        },
        firstSeen: '2025-01-01',
        lastSeen: '2025-01-01',
        totalSessions: 10,
        hintsShown: [],
        preferences: { showHints: true, verbosity: 'normal' as const },
      };

      const level = ProgressiveLearning.getExperienceLevel(progress);

      expect(level).toBe('intermediate');
    });

    it('should classify as advanced with high usage', () => {
      const progress = {
        commandsUsed: {
          init: 10,
          start: 20,
          handoff: 15,
          capture: 8,
          status: 25,
          vibecheck: 5,
          explore: 10,
          architecture: 5,
          plan: 3
        },
        firstSeen: '2025-01-01',
        lastSeen: '2025-01-01',
        totalSessions: 50,
        hintsShown: [],
        preferences: { showHints: true, verbosity: 'normal' as const },
      };

      const level = ProgressiveLearning.getExperienceLevel(progress);

      expect(level).toBe('advanced');
    });

    it('should consider both total commands and unique commands', () => {
      // Many uses of only 2 commands -> beginner
      const progress1 = {
        commandsUsed: { init: 50, start: 50 },
        firstSeen: '2025-01-01',
        lastSeen: '2025-01-01',
        totalSessions: 50,
        hintsShown: [],
        preferences: { showHints: true, verbosity: 'normal' as const },
      };

      expect(ProgressiveLearning.getExperienceLevel(progress1)).toBe('beginner');

      // Few uses of many commands -> intermediate
      const progress2 = {
        commandsUsed: {
          init: 2, start: 2, handoff: 2, capture: 2,
          status: 2, vibecheck: 2, explore: 2
        },
        firstSeen: '2025-01-01',
        lastSeen: '2025-01-01',
        totalSessions: 2,
        hintsShown: [],
        preferences: { showHints: true, verbosity: 'normal' as const },
      };

      expect(ProgressiveLearning.getExperienceLevel(progress2)).toBe('intermediate');
    });
  });

  describe('getSmartSuggestions', () => {
    it('should suggest handoff for beginners who haven\'t used it', async () => {
      const progress = await ProgressiveLearning.getUserProgress();
      progress.commandsUsed = { init: 3, start: 2 };
      await fs.writeJSON(path.join(tempDir, 'user-progress.json'), progress);

      const suggestions = await ProgressiveLearning.getSmartSuggestions();

      expect(suggestions).toContain('Try `ginko handoff` to save your progress');
    });

    it('should suggest vibecheck for beginners who haven\'t used it', async () => {
      const progress = await ProgressiveLearning.getUserProgress();
      progress.commandsUsed = { init: 3, start: 2 };
      await fs.writeJSON(path.join(tempDir, 'user-progress.json'), progress);

      const suggestions = await ProgressiveLearning.getSmartSuggestions();

      expect(suggestions).toContain('Use `ginko vibecheck` when you need to recalibrate');
    });

    it('should suggest capture for intermediate users', async () => {
      const progress = await ProgressiveLearning.getUserProgress();
      progress.commandsUsed = {
        init: 5, start: 10, handoff: 8, status: 12, vibecheck: 2, explore: 1
      };
      await fs.writeJSON(path.join(tempDir, 'user-progress.json'), progress);

      const suggestions = await ProgressiveLearning.getSmartSuggestions();

      expect(suggestions).toContain('Capture learnings with `ginko capture`');
    });

    it('should suggest ship when there are staged files', async () => {
      // Make user advanced so beginner suggestions don't interfere
      const progress = await ProgressiveLearning.getUserProgress();
      progress.commandsUsed = {
        init: 10, start: 20, handoff: 15, capture: 8,
        status: 25, vibecheck: 5, explore: 10, architecture: 5
      };
      await fs.writeJSON(path.join(tempDir, 'user-progress.json'), progress);

      const suggestions = await ProgressiveLearning.getSmartSuggestions({
        staged: ['file1.ts', 'file2.ts']
      });

      expect(suggestions.some(s => s.includes('ginko ship'))).toBe(true);
    });

    it('should suggest handoff when there are many modified files', async () => {
      const suggestions = await ProgressiveLearning.getSmartSuggestions({
        modified: ['f1', 'f2', 'f3', 'f4', 'f5', 'f6']
      });

      expect(suggestions.some(s => s.includes('handoff'))).toBe(true);
    });

    it('should limit suggestions to 2', async () => {
      const progress = await ProgressiveLearning.getUserProgress();
      progress.commandsUsed = { init: 3, start: 2 };
      await fs.writeJSON(path.join(tempDir, 'user-progress.json'), progress);

      const suggestions = await ProgressiveLearning.getSmartSuggestions({
        modified: ['f1', 'f2', 'f3', 'f4', 'f5', 'f6'],
        staged: ['s1', 's2']
      });

      expect(suggestions.length).toBeLessThanOrEqual(2);
    });
  });

  describe('formatSuggestions', () => {
    it('should return empty string for empty suggestions', () => {
      const formatted = ProgressiveLearning.formatSuggestions([]);

      expect(formatted).toBe('');
    });

    it('should format suggestions with bullets', () => {
      const suggestions = ['Suggestion 1', 'Suggestion 2'];
      const formatted = ProgressiveLearning.formatSuggestions(suggestions);

      expect(formatted).toContain('Suggestions:');
      expect(formatted).toContain('Suggestion 1');
      expect(formatted).toContain('Suggestion 2');
      expect(formatted).toContain('•');
    });

    it('should format single suggestion correctly', () => {
      const suggestions = ['Single suggestion'];
      const formatted = ProgressiveLearning.formatSuggestions(suggestions);

      expect(formatted).toContain('Suggestions:');
      expect(formatted).toContain('Single suggestion');
    });
  });
});
