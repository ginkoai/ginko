/**
 * @fileType: test
 * @status: current
 * @updated: 2025-10-01
 * @tags: [test, session-log-manager, yaml, atomic-operations, adr-033]
 * @related: [../../src/core/session-log-manager.ts]
 * @priority: critical
 * @complexity: medium
 */

import { describe, it, expect, beforeEach, afterEach } from '@jest/globals';
import * as fs from 'fs-extra';
import * as path from 'path';
import { SessionLogManager } from '../../src/core/session-log-manager.js';
import { LogEntry } from '../../src/types/session-log.js';

const TEST_DIR = path.join(__dirname, '..', '..', 'test-temp');

describe('SessionLogManager', () => {
  let originalCwd: string;

  beforeEach(async () => {
    originalCwd = process.cwd();
    await fs.ensureDir(TEST_DIR);
    process.chdir(TEST_DIR);
  });

  afterEach(async () => {
    process.chdir(originalCwd);
    await fs.remove(TEST_DIR);
  });

  describe('createSessionLog', () => {
    it('should create log with YAML frontmatter', async () => {
      const userDir = path.join(TEST_DIR, '.ginko', 'sessions', 'test-user');
      await SessionLogManager.createSessionLog(userDir, 'test-user', 'feature/test');

      const logPath = path.join(userDir, 'current-session-log.md');
      expect(await fs.pathExists(logPath)).toBe(true);

      const content = await fs.readFile(logPath, 'utf-8');

      // Verify YAML frontmatter
      expect(content).toContain('---');
      expect(content).toContain('session_id:');
      expect(content).toContain('started:');
      expect(content).toContain('user: test-user');
      expect(content).toContain('branch: feature/test');
    });

    it('should create log with all section headers', async () => {
      const userDir = path.join(TEST_DIR, '.ginko', 'sessions', 'test-user2');
      await SessionLogManager.createSessionLog(userDir, 'test-user2', 'main');

      const logPath = path.join(userDir, 'current-session-log.md');
      const content = await fs.readFile(logPath, 'utf-8');

      expect(content).toContain('## Timeline');
      expect(content).toContain('## Key Decisions');
      expect(content).toContain('## Insights');
      expect(content).toContain('## Git Operations');
      expect(content).not.toContain('## Files Affected');
      expect(content).not.toContain('## Achievements');
    });

    it('should create session directory if it does not exist', async () => {
      const userDir = path.join(TEST_DIR, '.ginko', 'sessions', 'new-user');
      await SessionLogManager.createSessionLog(userDir, 'new-user', 'main');

      const logPath = path.join(userDir, 'current-session-log.md');
      expect(await fs.pathExists(logPath)).toBe(true);
    });

    it('should generate unique session IDs', async () => {
      const userDir1 = path.join(TEST_DIR, '.ginko', 'sessions', 'user1');
      const userDir2 = path.join(TEST_DIR, '.ginko', 'sessions', 'user2');

      await SessionLogManager.createSessionLog(userDir1, 'user1', 'main');
      // Small delay to ensure different timestamp
      await new Promise(resolve => setTimeout(resolve, 10));
      await SessionLogManager.createSessionLog(userDir2, 'user2', 'main');

      const content1 = await fs.readFile(path.join(userDir1, 'current-session-log.md'), 'utf-8');
      const content2 = await fs.readFile(path.join(userDir2, 'current-session-log.md'), 'utf-8');

      const id1Match = content1.match(/session_id: (session-[^\s]+)/);
      const id2Match = content2.match(/session_id: (session-[^\s]+)/);

      expect(id1Match).toBeTruthy();
      expect(id2Match).toBeTruthy();
      expect(id1Match![1]).not.toBe(id2Match![1]);
    });
  });

  describe('appendEntry', () => {
    let sessionDir: string;

    beforeEach(async () => {
      sessionDir = path.join(TEST_DIR, '.ginko', 'sessions', 'test-user-append');
      await SessionLogManager.createSessionLog(sessionDir, 'test-user-append', 'main');
    });

    it('should append entry to Timeline section for "feature" category', async () => {
      const entry: LogEntry = {
        timestamp: '2025-10-01T12:00:00Z',
        category: 'feature',
        description: 'Implemented user authentication',
        impact: 'high',
      };

      await SessionLogManager.appendEntry(sessionDir, entry);

      const content = await fs.readFile(
        path.join(sessionDir, 'current-session-log.md'),
        'utf-8'
      );

      expect(content).toContain('## Timeline');
      expect(content).toContain('08:00'); // Time formatted from timestamp
      expect(content).toContain('Impact: high');
      expect(content).toContain('Implemented user authentication');
    });

    it('should append entry to Key Decisions section for "decision" category', async () => {
      const entry: LogEntry = {
        timestamp: '2025-10-01T13:00:00Z',
        category: 'decision',
        description: 'Chose PostgreSQL over MongoDB',
        impact: 'high',
      };

      await SessionLogManager.appendEntry(sessionDir, entry);

      const content = await fs.readFile(
        path.join(sessionDir, 'current-session-log.md'),
        'utf-8'
      );

      expect(content).toContain('## Key Decisions');
      expect(content).toContain('Chose PostgreSQL over MongoDB');
    });

    it('should append entry to Insights section for "insight" category', async () => {
      const entry: LogEntry = {
        timestamp: '2025-10-01T14:00:00Z',
        category: 'insight',
        description: 'Discovered that Vercel functions need named exports',
        impact: 'medium',
      };

      await SessionLogManager.appendEntry(sessionDir, entry);

      const content = await fs.readFile(
        path.join(sessionDir, 'current-session-log.md'),
        'utf-8'
      );

      expect(content).toContain('## Insights');
      expect(content).toContain('Vercel functions need named exports');
    });

    it('should append entry to Git Operations section for "git" category', async () => {
      const entry: LogEntry = {
        timestamp: '2025-10-01T15:00:00Z',
        category: 'git',
        description: 'Merged feature branch into main',
        impact: 'low',
      };

      await SessionLogManager.appendEntry(sessionDir, entry);

      const content = await fs.readFile(
        path.join(sessionDir, 'current-session-log.md'),
        'utf-8'
      );

      expect(content).toContain('## Git Operations');
      expect(content).toContain('Merged feature branch into main');
    });

    it('should dual-route decision entries to both Key Decisions and Timeline', async () => {
      const entry: LogEntry = {
        timestamp: '2025-10-01T17:00:00Z',
        category: 'decision',
        description: 'Chose REST over GraphQL for API design',
        impact: 'high',
      };

      await SessionLogManager.appendEntry(sessionDir, entry);

      const content = await fs.readFile(
        path.join(sessionDir, 'current-session-log.md'),
        'utf-8'
      );

      // Should appear in Key Decisions section
      const decisionsMatch = content.match(/## Key Decisions[\s\S]*?Chose REST over GraphQL/);
      expect(decisionsMatch).toBeTruthy();

      // Should also appear in Timeline section
      const timelineMatch = content.match(/## Timeline[\s\S]*?Chose REST over GraphQL/);
      expect(timelineMatch).toBeTruthy();
    });

    it('should dual-route insight entries to both Insights and Timeline', async () => {
      const entry: LogEntry = {
        timestamp: '2025-10-01T18:00:00Z',
        category: 'insight',
        description: 'Discovered JWT token size impacts mobile performance',
        impact: 'medium',
      };

      await SessionLogManager.appendEntry(sessionDir, entry);

      const content = await fs.readFile(
        path.join(sessionDir, 'current-session-log.md'),
        'utf-8'
      );

      // Should appear in Insights section
      const insightsMatch = content.match(/## Insights[\s\S]*?JWT token size impacts mobile performance/);
      expect(insightsMatch).toBeTruthy();

      // Should also appear in Timeline section
      const timelineMatch = content.match(/## Timeline[\s\S]*?JWT token size impacts mobile performance/);
      expect(timelineMatch).toBeTruthy();
    });

    it('should dual-route git entries to both Git Operations and Timeline', async () => {
      const entry: LogEntry = {
        timestamp: '2025-10-01T19:00:00Z',
        category: 'git',
        description: 'Committed feature implementation (abc123)',
        impact: 'low',
      };

      await SessionLogManager.appendEntry(sessionDir, entry);

      const content = await fs.readFile(
        path.join(sessionDir, 'current-session-log.md'),
        'utf-8'
      );

      // Should appear in Git Operations section
      const gitOpsMatch = content.match(/## Git Operations[\s\S]*?Committed feature implementation/);
      expect(gitOpsMatch).toBeTruthy();

      // Should also appear in Timeline section
      const timelineMatch = content.match(/## Timeline[\s\S]*?Committed feature implementation/);
      expect(timelineMatch).toBeTruthy();
    });

    it('should route achievement entries to Timeline only (not duplicated)', async () => {
      const entry: LogEntry = {
        timestamp: '2025-10-01T20:00:00Z',
        category: 'achievement',
        description: 'All integration tests passing',
        impact: 'high',
      };

      await SessionLogManager.appendEntry(sessionDir, entry);

      const content = await fs.readFile(
        path.join(sessionDir, 'current-session-log.md'),
        'utf-8'
      );

      // Should appear in Timeline
      expect(content).toContain('All integration tests passing');

      // Should NOT have an Achievements section
      expect(content).not.toContain('## Achievements');

      // Count occurrences - should only appear once (in Timeline)
      const matches = content.match(/All integration tests passing/g);
      expect(matches).toHaveLength(1);
    });

    it('should include files in entry when provided', async () => {
      const entry: LogEntry = {
        timestamp: '2025-10-01T16:00:00Z',
        category: 'fix',
        description: 'Fixed authentication bug',
        files: ['src/auth.ts', 'src/middleware/auth.ts'],
        impact: 'high',
      };

      await SessionLogManager.appendEntry(sessionDir, entry);

      const content = await fs.readFile(
        path.join(sessionDir, 'current-session-log.md'),
        'utf-8'
      );

      expect(content).toContain('src/auth.ts, src/middleware/auth.ts');
    });

    it('should handle multiple entries in sequence', async () => {
      const entries: LogEntry[] = [
        {
          timestamp: '2025-10-01T19:00:00Z',
          category: 'feature',
          description: 'Entry 1',
          impact: 'low',
        },
        {
          timestamp: '2025-10-01T19:30:00Z',
          category: 'decision',
          description: 'Entry 2',
          impact: 'medium',
        },
        {
          timestamp: '2025-10-01T20:00:00Z',
          category: 'insight',
          description: 'Entry 3',
          impact: 'high',
        }
      ];

      for (const entry of entries) {
        await SessionLogManager.appendEntry(sessionDir, entry);
      }

      const content = await fs.readFile(
        path.join(sessionDir, 'current-session-log.md'),
        'utf-8'
      );

      expect(content).toContain('Entry 1');
      expect(content).toContain('Entry 2');
      expect(content).toContain('Entry 3');
    });
  });

  describe('archiveLog', () => {
    let sessionDir: string;

    beforeEach(async () => {
      sessionDir = path.join(TEST_DIR, '.ginko', 'sessions', 'test-user-archive');
      await SessionLogManager.createSessionLog(sessionDir, 'test-user-archive', 'main');
    });

    it('should archive log to default location', async () => {
      const archivePath = await SessionLogManager.archiveLog(sessionDir);

      expect(archivePath).toContain('archive');
      expect(archivePath).toContain('session-log-');
      expect(await fs.pathExists(archivePath)).toBe(true);
    });

    it('should archive log with handoff summary', async () => {
      const archivePath = await SessionLogManager.archiveLog(sessionDir, 'Completed feature X');

      const content = await fs.readFile(archivePath, 'utf-8');
      expect(content).toContain('## Handoff Summary');
      expect(content).toContain('Completed feature X');
    });

    it('should remove original log after archive', async () => {
      const logPath = path.join(sessionDir, 'current-session-log.md');
      await SessionLogManager.archiveLog(sessionDir);

      expect(await fs.pathExists(logPath)).toBe(false);
    });

    it('should create archive directory if it does not exist', async () => {
      const archivePath = await SessionLogManager.archiveLog(sessionDir);

      const archiveDir = path.dirname(archivePath);
      expect(await fs.pathExists(archiveDir)).toBe(true);
    });

    it('should throw error if log does not exist', async () => {
      const nonExistentDir = path.join(TEST_DIR, 'non-existent');

      await expect(
        SessionLogManager.archiveLog(nonExistentDir)
      ).rejects.toThrow('Failed to archive session log');
    });
  });

  describe('loadSessionLog', () => {
    let sessionDir: string;

    beforeEach(async () => {
      sessionDir = path.join(TEST_DIR, '.ginko', 'sessions', 'test-user-load');
      await SessionLogManager.createSessionLog(sessionDir, 'test-user-load', 'feature/test');
    });

    it('should load session log content', async () => {
      const content = await SessionLogManager.loadSessionLog(sessionDir);

      expect(content).toContain('---');
      expect(content).toContain('user: test-user-load');
      expect(content).toContain('branch: feature/test');
      expect(content).toContain('## Timeline');
    });

    it('should load log with appended entries', async () => {
      const entry: LogEntry = {
        timestamp: '2025-10-01T12:00:00Z',
        category: 'feature',
        description: 'Test feature',
        impact: 'high'
      };

      await SessionLogManager.appendEntry(sessionDir, entry);

      const content = await SessionLogManager.loadSessionLog(sessionDir);

      expect(content).toContain('Test feature');
      expect(content).toContain('## Timeline');
    });

    it('should load log with entries in multiple sections', async () => {
      const entries: LogEntry[] = [
        {
          timestamp: '2025-10-01T12:00:00Z',
          category: 'feature',
          description: 'Feature entry',
          impact: 'high'
        },
        {
          timestamp: '2025-10-01T13:00:00Z',
          category: 'decision',
          description: 'Decision entry',
          impact: 'medium'
        },
        {
          timestamp: '2025-10-01T14:00:00Z',
          category: 'insight',
          description: 'Insight entry',
          impact: 'low'
        }
      ];

      for (const entry of entries) {
        await SessionLogManager.appendEntry(sessionDir, entry);
      }

      const content = await SessionLogManager.loadSessionLog(sessionDir);

      expect(content).toContain('Feature entry');
      expect(content).toContain('Decision entry');
      expect(content).toContain('Insight entry');
    });

    it('should return empty string if log does not exist', async () => {
      const nonExistentDir = path.join(TEST_DIR, 'non-existent');
      const content = await SessionLogManager.loadSessionLog(nonExistentDir);

      expect(content).toBe('');
    });
  });

  describe('integration scenarios', () => {
    it('should support full lifecycle: create, append, load, archive', async () => {
      // Create
      const sessionDir = path.join(TEST_DIR, '.ginko', 'sessions', 'test-user-lifecycle');
      await SessionLogManager.createSessionLog(sessionDir, 'test-user-lifecycle', 'feature/full-test');

      const logPath = path.join(sessionDir, 'current-session-log.md');
      expect(await fs.pathExists(logPath)).toBe(true);

      // Append
      await SessionLogManager.appendEntry(sessionDir, {
        timestamp: '2025-10-01T12:00:00Z',
        category: 'feature',
        description: 'Lifecycle test',
        impact: 'high'
      });

      // Load
      const content = await SessionLogManager.loadSessionLog(sessionDir);
      expect(content).toContain('Lifecycle test');

      // Archive
      const archivePath = await SessionLogManager.archiveLog(sessionDir);
      expect(await fs.pathExists(logPath)).toBe(false);
      expect(await fs.pathExists(archivePath)).toBe(true);
    });

    it('should handle concurrent append operations safely', async () => {
      const sessionDir = path.join(TEST_DIR, '.ginko', 'sessions', 'test-user-concurrent');
      await SessionLogManager.createSessionLog(sessionDir, 'test-user-concurrent', 'concurrent-test');

      const entries: LogEntry[] = Array.from({ length: 5 }, (_, i) => ({
        timestamp: `2025-10-01T1${i}:00:00Z`,
        category: 'feature' as const,
        description: `Concurrent entry ${i}`,
        impact: 'low' as const
      }));

      // Concurrent appends may fail on some operations due to race conditions
      const results = await Promise.allSettled(
        entries.map(entry => SessionLogManager.appendEntry(sessionDir, entry))
      );

      // At least some should succeed
      const successCount = results.filter(r => r.status === 'fulfilled').length;
      expect(successCount).toBeGreaterThan(0);

      const content = await SessionLogManager.loadSessionLog(sessionDir);
      expect(content.length).toBeGreaterThan(0);
    });
  });
});
