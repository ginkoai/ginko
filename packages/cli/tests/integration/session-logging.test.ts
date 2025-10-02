/**
 * @fileType: test
 * @status: current
 * @updated: 2025-10-01
 * @tags: [test, session-logging, integration, ai-protocol]
 * @related: [../../src/utils/session-logger.ts]
 * @priority: high
 * @complexity: medium
 * @dependencies: [vitest, fs-extra]
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import fs from 'fs-extra';
import path from 'path';
import os from 'os';
import {
  SessionLogger,
  createSessionLog,
  loadSessionLog,
  logEvent,
  type EventCategory,
  type ImpactLevel
} from '../../src/utils/session-logger.js';

describe('Session Logging Integration Tests', () => {
  let testGinkoDir: string;
  let originalProcessEnv: NodeJS.ProcessEnv;

  beforeEach(async () => {
    // Create temporary .ginko directory for testing
    testGinkoDir = path.join(os.tmpdir(), `.ginko-test-${Date.now()}`);
    await fs.ensureDir(testGinkoDir);

    // Mock ginko directory
    originalProcessEnv = { ...process.env };
    process.env.GINKO_TEST_DIR = testGinkoDir;
  });

  afterEach(async () => {
    // Cleanup test directory
    await fs.remove(testGinkoDir);
    process.env = originalProcessEnv;
  });

  describe('Session Log Creation', () => {
    it('should create a new session log with proper structure', async () => {
      const logger = new SessionLogger();
      await logger.initialize('test-session-001', 'feature/test-branch', 0.15);

      const log = logger.getLog();
      expect(log).toBeDefined();
      expect(log?.metadata.session_id).toBe('test-session-001');
      expect(log?.metadata.branch).toBe('feature/test-branch');
      expect(log?.metadata.initial_pressure).toBe(0.15);
      expect(log?.timeline).toEqual([]);
      expect(log?.decisions).toEqual([]);
      expect(log?.insights).toEqual([]);
      expect(log?.gitOperations).toEqual([]);
      expect(log?.achievements).toEqual([]);
    });

    it('should create session log file on disk', async () => {
      const logger = new SessionLogger();
      await logger.initialize('test-session-002', 'main', 0.20);

      const sessionsDir = path.join(testGinkoDir, 'sessions', 'test-user');
      const logFile = path.join(sessionsDir, 'current-session-log.md');

      expect(await fs.pathExists(logFile)).toBe(true);

      const content = await fs.readFile(logFile, 'utf8');
      expect(content).toContain('session_id: test-session-002');
      expect(content).toContain('branch: main');
      expect(content).toContain('## Timeline');
      expect(content).toContain('## Key Decisions');
      expect(content).toContain('## Insights');
    });
  });

  describe('Event Logging', () => {
    it('should log a fix event with proper formatting', async () => {
      const logger = new SessionLogger();
      await logger.initialize('test-session-003', 'bugfix/crash', 0.25);

      await logger.logEvent('fix', 'Fixed null pointer exception in session parser', {
        files: ['session-logger.ts:245'],
        impact: 'high',
        contextPressure: 0.35
      });

      const log = logger.getLog();
      expect(log?.timeline.length).toBe(1);
      expect(log?.timeline[0].category).toBe('fix');
      expect(log?.timeline[0].description).toBe('Fixed null pointer exception in session parser');
      expect(log?.timeline[0].impact).toBe('high');
      expect(log?.timeline[0].contextPressure).toBe(0.35);
    });

    it('should log multiple events to different categories', async () => {
      const logger = new SessionLogger();
      await logger.initialize('test-session-004', 'feature/logging', 0.15);

      // Log different event types
      await logger.logEvent('fix', 'Resolved async race condition', { impact: 'high' });
      await logger.logEvent('feature', 'Added archive functionality', { impact: 'medium' });
      await logger.logEvent('decision', 'Chose Markdown over JSON for logs', { impact: 'high' });
      await logger.logEvent('insight', 'Discovered Set serialization issue', { impact: 'low' });
      await logger.logEvent('git', 'Committed Phase 2 changes', { impact: 'low' });
      await logger.logEvent('achievement', 'All tests passing', { impact: 'high' });

      const log = logger.getLog();
      expect(log?.timeline.length).toBe(6);
      expect(log?.decisions.length).toBe(1);
      expect(log?.insights.length).toBe(1);
      expect(log?.gitOperations.length).toBe(1);
      expect(log?.achievements.length).toBe(1);
    });

    it('should auto-capture context pressure when not provided', async () => {
      const logger = new SessionLogger();
      await logger.initialize('test-session-005', 'main', 0.15);

      // Log without explicit pressure
      await logger.logEvent('feature', 'Implemented automatic pressure capture', {
        impact: 'medium'
      });

      const log = logger.getLog();
      expect(log?.timeline[0].contextPressure).toBeDefined();
      expect(log?.timeline[0].contextPressure).toBeGreaterThanOrEqual(0);
      expect(log?.timeline[0].contextPressure).toBeLessThanOrEqual(1);
    });

    it('should track affected files across events', async () => {
      const logger = new SessionLogger();
      await logger.initialize('test-session-006', 'refactor/logging', 0.20);

      await logger.logEvent('fix', 'Fixed validation bug', {
        files: ['session-logger.ts:125', 'helpers.ts:45'],
        impact: 'high'
      });

      await logger.logEvent('feature', 'Added new logging category', {
        files: ['session-logger.ts:200'],
        impact: 'medium'
      });

      const log = logger.getLog();
      expect(log?.filesAffected.size).toBe(3);
      expect(log?.filesAffected.has('session-logger.ts:125')).toBe(true);
      expect(log?.filesAffected.has('helpers.ts:45')).toBe(true);
      expect(log?.filesAffected.has('session-logger.ts:200')).toBe(true);
    });

    it('should append events to existing log file', async () => {
      const logger = new SessionLogger();
      await logger.initialize('test-session-007', 'main', 0.15);

      await logger.logEvent('fix', 'First event', { impact: 'high' });
      await logger.logEvent('feature', 'Second event', { impact: 'medium' });

      const sessionsDir = path.join(testGinkoDir, 'sessions', 'test-user');
      const logFile = path.join(sessionsDir, 'current-session-log.md');
      const content = await fs.readFile(logFile, 'utf8');

      expect(content).toContain('[fix]');
      expect(content).toContain('First event');
      expect(content).toContain('[feature]');
      expect(content).toContain('Second event');
    });

    it('should validate event descriptions are concise', async () => {
      const logger = new SessionLogger();
      await logger.initialize('test-session-008', 'main', 0.15);

      // Should accept 1-2 sentences
      await expect(
        logger.logEvent('fix', 'This is one sentence fix', { impact: 'high' })
      ).resolves.not.toThrow();

      await expect(
        logger.logEvent('fix', 'This is sentence one. This is sentence two', { impact: 'high' })
      ).resolves.not.toThrow();
    });
  });

  describe('Event Categories', () => {
    const categories: EventCategory[] = ['fix', 'feature', 'decision', 'insight', 'git', 'achievement'];

    categories.forEach(category => {
      it(`should correctly categorize ${category} events`, async () => {
        const logger = new SessionLogger();
        await logger.initialize(`test-session-${category}`, 'main', 0.15);

        await logger.logEvent(category, `Test ${category} event`, { impact: 'medium' });

        const log = logger.getLog();
        expect(log?.timeline[0].category).toBe(category);

        // Check categorization in specific arrays
        switch (category) {
          case 'decision':
            expect(log?.decisions.length).toBe(1);
            break;
          case 'insight':
            expect(log?.insights.length).toBe(1);
            break;
          case 'git':
            expect(log?.gitOperations.length).toBe(1);
            break;
          case 'achievement':
            expect(log?.achievements.length).toBe(1);
            break;
        }
      });
    });
  });

  describe('Impact Levels', () => {
    const impacts: ImpactLevel[] = ['high', 'medium', 'low'];

    impacts.forEach(impact => {
      it(`should correctly set impact level: ${impact}`, async () => {
        const logger = new SessionLogger();
        await logger.initialize(`test-session-impact-${impact}`, 'main', 0.15);

        await logger.logEvent('feature', `Test ${impact} impact event`, { impact });

        const log = logger.getLog();
        expect(log?.timeline[0].impact).toBe(impact);
      });
    });
  });

  describe('Session Log Loading', () => {
    it('should load existing session log from disk', async () => {
      // Create a session log
      const logger1 = new SessionLogger();
      await logger1.initialize('test-session-009', 'feature/load-test', 0.20);
      await logger1.logEvent('fix', 'Initial fix', { impact: 'high' });
      await logger1.logEvent('feature', 'New feature', { impact: 'medium' });

      // Load it with a new logger instance
      const logger2 = new SessionLogger();
      const loadedLog = await logger2.load();

      expect(loadedLog).toBeDefined();
      expect(loadedLog?.metadata.session_id).toBe('test-session-009');
      expect(loadedLog?.timeline.length).toBe(2);
    });

    it('should return null when no session log exists', async () => {
      const logger = new SessionLogger();
      const loadedLog = await logger.load();

      expect(loadedLog).toBeNull();
    });
  });

  describe('Session Log Archiving', () => {
    it('should archive session log to archive directory', async () => {
      const logger = new SessionLogger();
      await logger.initialize('test-session-010', 'main', 0.15);
      await logger.logEvent('achievement', 'Feature complete', { impact: 'high' });

      const archivePath = await logger.archive('Testing handoff functionality');

      expect(await fs.pathExists(archivePath)).toBe(true);

      const archiveContent = await fs.readFile(archivePath, 'utf8');
      expect(archiveContent).toContain('## Handoff Summary');
      expect(archiveContent).toContain('Testing handoff functionality');
      expect(archiveContent).toContain('Feature complete');
    });

    it('should clear current log after archiving', async () => {
      const logger = new SessionLogger();
      await logger.initialize('test-session-011', 'main', 0.15);
      await logger.logEvent('fix', 'Bug fixed', { impact: 'high' });

      const sessionsDir = path.join(testGinkoDir, 'sessions', 'test-user');
      const currentLogPath = path.join(sessionsDir, 'current-session-log.md');

      expect(await fs.pathExists(currentLogPath)).toBe(true);

      await logger.archive();

      expect(await fs.pathExists(currentLogPath)).toBe(false);
      expect(logger.getLog()).toBeNull();
    });

    it('should create archive with timestamp in filename', async () => {
      const logger = new SessionLogger();
      await logger.initialize('test-session-012', 'main', 0.15);

      const archivePath = await logger.archive();
      const filename = path.basename(archivePath);

      expect(filename).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}-\d{2}-\d{2}-session-log\.md$/);
    });
  });

  describe('Concurrent Logging', () => {
    it('should handle concurrent log events without corruption', async () => {
      const logger = new SessionLogger();
      await logger.initialize('test-session-013', 'main', 0.15);

      // Log multiple events concurrently
      await Promise.all([
        logger.logEvent('fix', 'Fix 1', { impact: 'high' }),
        logger.logEvent('fix', 'Fix 2', { impact: 'medium' }),
        logger.logEvent('feature', 'Feature 1', { impact: 'high' }),
        logger.logEvent('feature', 'Feature 2', { impact: 'low' }),
        logger.logEvent('insight', 'Insight 1', { impact: 'medium' })
      ]);

      const log = logger.getLog();
      expect(log?.timeline.length).toBe(5);

      // Verify log file is not corrupted
      const sessionsDir = path.join(testGinkoDir, 'sessions', 'test-user');
      const logFile = path.join(sessionsDir, 'current-session-log.md');
      const content = await fs.readFile(logFile, 'utf8');

      expect(content).toContain('Fix 1');
      expect(content).toContain('Fix 2');
      expect(content).toContain('Feature 1');
      expect(content).toContain('Feature 2');
      expect(content).toContain('Insight 1');
    });
  });

  describe('Logging Format Validation', () => {
    it('should format timestamps as HH:MM', async () => {
      const logger = new SessionLogger();
      await logger.initialize('test-session-014', 'main', 0.15);

      await logger.logEvent('fix', 'Test formatting', { impact: 'high' });

      const log = logger.getLog();
      expect(log?.timeline[0].timestamp).toMatch(/^\d{2}:\d{2}$/);
    });

    it('should include all required fields in log file', async () => {
      const logger = new SessionLogger();
      await logger.initialize('test-session-015', 'main', 0.15);

      await logger.logEvent('fix', 'Complete event test', {
        files: ['test.ts:100'],
        impact: 'high',
        contextPressure: 0.45
      });

      const sessionsDir = path.join(testGinkoDir, 'sessions', 'test-user');
      const logFile = path.join(sessionsDir, 'current-session-log.md');
      const content = await fs.readFile(logFile, 'utf8');

      expect(content).toMatch(/### \d{2}:\d{2} - \[fix\]/);
      expect(content).toContain('Complete event test');
      expect(content).toContain('Files: test.ts:100');
      expect(content).toContain('Impact: high');
      expect(content).toContain('Pressure: 45%');
    });
  });

  describe('Error Handling', () => {
    it('should throw error when logging before initialization', async () => {
      const logger = new SessionLogger();

      await expect(
        logger.logEvent('fix', 'This should fail', { impact: 'high' })
      ).rejects.toThrow('Session log not initialized');
    });

    it('should throw error when archiving without active session', async () => {
      const logger = new SessionLogger();

      await expect(logger.archive()).rejects.toThrow('No active session log to archive');
    });

    it('should validate event timestamp format', async () => {
      const logger = new SessionLogger();
      await logger.initialize('test-session-016', 'main', 0.15);

      // Timestamp validation happens internally
      await logger.logEvent('fix', 'Valid event', { impact: 'high' });

      const log = logger.getLog();
      expect(log?.timeline[0].timestamp).toMatch(/^\d{2}:\d{2}$/);
    });

    it('should validate impact level', async () => {
      const logger = new SessionLogger();
      await logger.initialize('test-session-017', 'main', 0.15);

      // Valid impact levels
      await expect(
        logger.logEvent('fix', 'Test', { impact: 'high' })
      ).resolves.not.toThrow();

      await expect(
        logger.logEvent('fix', 'Test', { impact: 'medium' })
      ).resolves.not.toThrow();

      await expect(
        logger.logEvent('fix', 'Test', { impact: 'low' })
      ).resolves.not.toThrow();
    });
  });

  describe('Convenience Functions', () => {
    it('should create session log using convenience function', async () => {
      const logger = await createSessionLog('test-session-018', 'main');

      expect(logger).toBeInstanceOf(SessionLogger);
      expect(logger.getLog()?.metadata.session_id).toBe('test-session-018');
    });

    it('should load session log using convenience function', async () => {
      // Create a session first
      await createSessionLog('test-session-019', 'main');

      // Load it
      const logger = await loadSessionLog();

      expect(logger).toBeInstanceOf(SessionLogger);
      expect(logger?.getLog()?.metadata.session_id).toBe('test-session-019');
    });

    it('should log event using convenience function', async () => {
      await createSessionLog('test-session-020', 'main');

      await logEvent('fix', 'Convenience function test', {
        impact: 'high',
        files: ['test.ts:1']
      });

      const logger = await loadSessionLog();
      expect(logger?.getLog()?.timeline.length).toBe(1);
      expect(logger?.getLog()?.timeline[0].description).toBe('Convenience function test');
    });
  });
});
