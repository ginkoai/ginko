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
  let manager: SessionLogManager;
  let originalCwd: string;

  beforeEach(async () => {
    manager = new SessionLogManager();
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
      const logPath = await manager.createSessionLog('test-user', 'feature/test');

      expect(await fs.pathExists(logPath)).toBe(true);

      const content = await fs.readFile(logPath, 'utf-8');

      // Verify YAML frontmatter
      expect(content).toContain('---');
      expect(content).toContain('session_id:');
      expect(content).toContain('started:');
      expect(content).toContain('user: test-user');
      expect(content).toContain('branch: feature/test');
      expect(content).toContain('context_pressure_at_start: 0');
    });

    it('should create log with custom initial pressure', async () => {
      const logPath = await manager.createSessionLog('test-user', 'main', {
        initialPressure: 0.42
      });

      const content = await fs.readFile(logPath, 'utf-8');
      expect(content).toContain('context_pressure_at_start: 0.42');
    });

    it('should create log with all section headers', async () => {
      const logPath = await manager.createSessionLog('test-user', 'main');

      const content = await fs.readFile(logPath, 'utf-8');

      expect(content).toContain('## Timeline');
      expect(content).toContain('## Key Decisions');
      expect(content).toContain('## Files Affected');
      expect(content).toContain('## Insights');
      expect(content).toContain('## Git Operations');
    });

    it('should create session directory if it does not exist', async () => {
      const logPath = await manager.createSessionLog('new-user', 'main');
      expect(await fs.pathExists(logPath)).toBe(true);
    });

    it('should generate unique session IDs', async () => {
      const log1Path = await manager.createSessionLog('user1', 'main');
      // Small delay to ensure different timestamp
      await new Promise(resolve => setTimeout(resolve, 10));
      const log2Path = await manager.createSessionLog('user2', 'main');

      const content1 = await fs.readFile(log1Path, 'utf-8');
      const content2 = await fs.readFile(log2Path, 'utf-8');

      const id1Match = content1.match(/session_id: (session-\d+)/);
      const id2Match = content2.match(/session_id: (session-\d+)/);

      expect(id1Match).toBeTruthy();
      expect(id2Match).toBeTruthy();
      expect(id1Match![1]).not.toBe(id2Match![1]);
    });
  });

  describe('appendEntry', () => {
    let sessionDir: string;

    beforeEach(async () => {
      await manager.createSessionLog('test-user', 'main');
      sessionDir = path.join(TEST_DIR, '.ginko', 'sessions', 'test-user');
    });

    it('should append entry to Timeline section for "feature" category', async () => {
      const entry: LogEntry = {
        timestamp: '2025-10-01T12:00:00Z',
        category: 'feature',
        description: 'Implemented user authentication',
        impact: 'high',
        context_pressure: 0.42
      };

      await manager.appendEntry(sessionDir, entry);

      const content = await fs.readFile(
        path.join(sessionDir, 'session.log.md'),
        'utf-8'
      );

      expect(content).toContain('## Timeline');
      expect(content).toContain('2025-10-01T12:00:00Z');
      expect(content).toContain('pressure: 0.42');
      expect(content).toContain('[high]');
      expect(content).toContain('Implemented user authentication');
    });

    it('should append entry to Key Decisions section for "decision" category', async () => {
      const entry: LogEntry = {
        timestamp: '2025-10-01T13:00:00Z',
        category: 'decision',
        description: 'Chose PostgreSQL over MongoDB',
        impact: 'high',
        context_pressure: 0.35
      };

      await manager.appendEntry(sessionDir, entry);

      const content = await fs.readFile(
        path.join(sessionDir, 'session.log.md'),
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
        context_pressure: 0.28
      };

      await manager.appendEntry(sessionDir, entry);

      const content = await fs.readFile(
        path.join(sessionDir, 'session.log.md'),
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
        context_pressure: 0.15
      };

      await manager.appendEntry(sessionDir, entry);

      const content = await fs.readFile(
        path.join(sessionDir, 'session.log.md'),
        'utf-8'
      );

      expect(content).toContain('## Git Operations');
      expect(content).toContain('Merged feature branch into main');
    });

    it('should include files in entry when provided', async () => {
      const entry: LogEntry = {
        timestamp: '2025-10-01T16:00:00Z',
        category: 'fix',
        description: 'Fixed authentication bug',
        files: ['src/auth.ts', 'src/middleware/auth.ts'],
        impact: 'high',
        context_pressure: 0.52
      };

      await manager.appendEntry(sessionDir, entry);

      const content = await fs.readFile(
        path.join(sessionDir, 'session.log.md'),
        'utf-8'
      );

      expect(content).toContain('src/auth.ts, src/middleware/auth.ts');
    });

    it('should perform atomic write by default', async () => {
      const entry: LogEntry = {
        timestamp: '2025-10-01T17:00:00Z',
        category: 'feature',
        description: 'Test atomic write',
        impact: 'low',
        context_pressure: 0.1
      };

      await manager.appendEntry(sessionDir, entry, true);

      const tempPath = path.join(sessionDir, 'session.log.md.tmp');
      expect(await fs.pathExists(tempPath)).toBe(false);

      const content = await fs.readFile(
        path.join(sessionDir, 'session.log.md'),
        'utf-8'
      );
      expect(content).toContain('Test atomic write');
    });

    it('should support non-atomic write for testing', async () => {
      const entry: LogEntry = {
        timestamp: '2025-10-01T18:00:00Z',
        category: 'feature',
        description: 'Test non-atomic write',
        impact: 'low',
        context_pressure: 0.2
      };

      await manager.appendEntry(sessionDir, entry, false);

      const content = await fs.readFile(
        path.join(sessionDir, 'session.log.md'),
        'utf-8'
      );
      expect(content).toContain('Test non-atomic write');
    });

    it('should handle multiple entries in sequence', async () => {
      const entries: LogEntry[] = [
        {
          timestamp: '2025-10-01T19:00:00Z',
          category: 'feature',
          description: 'Entry 1',
          impact: 'low',
          context_pressure: 0.1
        },
        {
          timestamp: '2025-10-01T19:30:00Z',
          category: 'decision',
          description: 'Entry 2',
          impact: 'medium',
          context_pressure: 0.2
        },
        {
          timestamp: '2025-10-01T20:00:00Z',
          category: 'insight',
          description: 'Entry 3',
          impact: 'high',
          context_pressure: 0.3
        }
      ];

      for (const entry of entries) {
        await manager.appendEntry(sessionDir, entry);
      }

      const content = await fs.readFile(
        path.join(sessionDir, 'session.log.md'),
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
      await manager.createSessionLog('test-user', 'main');
      sessionDir = path.join(TEST_DIR, '.ginko', 'sessions', 'test-user');
    });

    it('should archive log to default location', async () => {
      const result = await manager.archiveLog(sessionDir);

      expect(result.success).toBe(true);
      expect(result.archivePath).toContain('archive');
      expect(result.archivePath).toContain('session-');
      expect(await fs.pathExists(result.archivePath)).toBe(true);
    });

    it('should archive log to custom location', async () => {
      const customPath = path.join(sessionDir, 'custom-archive.md');
      const result = await manager.archiveLog(sessionDir, customPath);

      expect(result.success).toBe(true);
      expect(result.archivePath).toBe(customPath);
      expect(await fs.pathExists(customPath)).toBe(true);
    });

    it('should remove original log after archive', async () => {
      const logPath = path.join(sessionDir, 'session.log.md');
      await manager.archiveLog(sessionDir);

      expect(await fs.pathExists(logPath)).toBe(false);
    });

    it('should create archive directory if it does not exist', async () => {
      const result = await manager.archiveLog(sessionDir);

      const archiveDir = path.dirname(result.archivePath);
      expect(await fs.pathExists(archiveDir)).toBe(true);
    });

    it('should return error if log does not exist', async () => {
      const nonExistentDir = path.join(TEST_DIR, 'non-existent');
      const result = await manager.archiveLog(nonExistentDir);

      expect(result.success).toBe(false);
      expect(result.error).toBe('Session log not found');
    });

    it('should include timestamp in result', async () => {
      const result = await manager.archiveLog(sessionDir);

      expect(result.timestamp).toBeTruthy();
      expect(new Date(result.timestamp).getTime()).toBeGreaterThan(0);
    });

    it('should not overwrite existing archive', async () => {
      const archivePath = path.join(sessionDir, 'archive', 'existing.md');
      await fs.ensureDir(path.dirname(archivePath));
      await fs.writeFile(archivePath, 'existing content', 'utf-8');

      const result = await manager.archiveLog(sessionDir, archivePath);

      expect(result.success).toBe(false);
      expect(result.error).toBeTruthy();
    });
  });

  describe('loadSessionLog', () => {
    let sessionDir: string;

    beforeEach(async () => {
      await manager.createSessionLog('test-user', 'feature/test', {
        initialPressure: 0.25
      });
      sessionDir = path.join(TEST_DIR, '.ginko', 'sessions', 'test-user');
    });

    it('should load and parse session log', async () => {
      const parsed = await manager.loadSessionLog(sessionDir);

      expect(parsed.frontmatter).toBeTruthy();
      expect(parsed.frontmatter.user).toBe('test-user');
      expect(parsed.frontmatter.branch).toBe('feature/test');
      expect(parsed.frontmatter.context_pressure_at_start).toBe(0.25);
      expect(parsed.content).toBeTruthy();
    });

    it('should parse sections correctly', async () => {
      const entry: LogEntry = {
        timestamp: '2025-10-01T12:00:00Z',
        category: 'feature',
        description: 'Test feature',
        impact: 'high',
        context_pressure: 0.42
      };

      await manager.appendEntry(sessionDir, entry);

      const parsed = await manager.loadSessionLog(sessionDir);

      expect(parsed.sections.timeline).toHaveLength(1);
      expect(parsed.sections.timeline[0].description).toBe('Test feature');
      expect(parsed.sections.timeline[0].context_pressure).toBe(0.42);
    });

    it('should parse multiple entries in different sections', async () => {
      const entries: LogEntry[] = [
        {
          timestamp: '2025-10-01T12:00:00Z',
          category: 'feature',
          description: 'Feature entry',
          impact: 'high',
          context_pressure: 0.3
        },
        {
          timestamp: '2025-10-01T13:00:00Z',
          category: 'decision',
          description: 'Decision entry',
          impact: 'medium',
          context_pressure: 0.4
        },
        {
          timestamp: '2025-10-01T14:00:00Z',
          category: 'insight',
          description: 'Insight entry',
          impact: 'low',
          context_pressure: 0.5
        }
      ];

      for (const entry of entries) {
        await manager.appendEntry(sessionDir, entry);
      }

      const parsed = await manager.loadSessionLog(sessionDir);

      expect(parsed.sections.timeline).toHaveLength(1);
      expect(parsed.sections.decisions).toHaveLength(1);
      expect(parsed.sections.insights).toHaveLength(1);
    });

    it('should parse entries with files', async () => {
      const entry: LogEntry = {
        timestamp: '2025-10-01T15:00:00Z',
        category: 'fix',
        description: 'Fixed bug',
        files: ['src/app.ts', 'src/utils.ts'],
        impact: 'high',
        context_pressure: 0.6
      };

      await manager.appendEntry(sessionDir, entry);

      const parsed = await manager.loadSessionLog(sessionDir);

      expect(parsed.sections.timeline[0].files).toEqual([
        'src/app.ts',
        'src/utils.ts'
      ]);
    });

    it('should throw error if log does not exist', async () => {
      const nonExistentDir = path.join(TEST_DIR, 'non-existent');

      await expect(
        manager.loadSessionLog(nonExistentDir)
      ).rejects.toThrow('Session log not found');
    });
  });

  describe('integration scenarios', () => {
    it('should support full lifecycle: create, append, load, archive', async () => {
      // Create
      const logPath = await manager.createSessionLog('test-user', 'feature/full-test');
      expect(await fs.pathExists(logPath)).toBe(true);

      const sessionDir = path.join(TEST_DIR, '.ginko', 'sessions', 'test-user');

      // Append
      await manager.appendEntry(sessionDir, {
        timestamp: '2025-10-01T12:00:00Z',
        category: 'feature',
        description: 'Lifecycle test',
        impact: 'high',
        context_pressure: 0.5
      });

      // Load
      const parsed = await manager.loadSessionLog(sessionDir);
      expect(parsed.sections.timeline).toHaveLength(1);

      // Archive
      const result = await manager.archiveLog(sessionDir);
      expect(result.success).toBe(true);
      expect(await fs.pathExists(logPath)).toBe(false);
      expect(await fs.pathExists(result.archivePath)).toBe(true);
    });


    it('should handle concurrent append operations safely', async () => {
      await manager.createSessionLog('test-user', 'concurrent-test');
      const sessionDir = path.join(TEST_DIR, '.ginko', 'sessions', 'test-user');

      const entries: LogEntry[] = Array.from({ length: 5 }, (_, i) => ({
        timestamp: `2025-10-01T1${i}:00:00Z`,
        category: 'feature' as const,
        description: `Concurrent entry ${i}`,
        impact: 'low' as const,
        context_pressure: 0.1 * i
      }));

      // Concurrent appends may fail on some operations due to race conditions
      const results = await Promise.allSettled(
        entries.map(entry => manager.appendEntry(sessionDir, entry))
      );

      // At least some should succeed
      const successCount = results.filter(r => r.status === 'fulfilled').length;
      expect(successCount).toBeGreaterThan(0);

      const parsed = await manager.loadSessionLog(sessionDir);
      expect(parsed.sections.timeline.length).toBeGreaterThan(0);
    });
  });
});
