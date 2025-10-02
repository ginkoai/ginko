/**
 * @fileType: test
 * @status: current
 * @updated: 2025-10-01
 * @tags: [e2e, session-logging, pressure-monitoring, adr-033, integration]
 * @related: [../../src/core/pressure-monitor.ts, ../../src/core/session-log-manager.ts]
 * @priority: high
 * @complexity: high
 * @dependencies: [assert, fs, path, os]
 */

import * as assert from 'assert';
import * as fs from 'fs/promises';
import * as path from 'path';
import * as os from 'os';
import { PressureMonitor } from '../../src/core/pressure-monitor.js';
import { SessionLogManager } from '../../src/core/session-log-manager.js';

/**
 * E2E Test Suite: Session Logging Flow
 *
 * Tests complete flow: start → log → work → handoff → archive
 * Validates pressure monitoring throughout
 * Tests multi-session continuity
 */
describe('Session Logging Flow (E2E)', () => {
  let tempDir: string;
  let sessionDir: string;
  const testUser = 'test@example.com';
  const testBranch = 'feature/test';

  beforeEach(async () => {
    // Create temporary session directory
    tempDir = await fs.mkdtemp(path.join(os.tmpdir(), 'ginko-session-test-'));
    sessionDir = tempDir;

    // Reset pressure monitor
    PressureMonitor.reset();
    PressureMonitor.setMaxTokens(200000);
  });

  afterEach(async () => {
    // Clean up temporary directory
    try {
      await fs.rm(tempDir, { recursive: true, force: true });
    } catch {
      // Ignore cleanup errors
    }
  });

  describe('Session Initialization', () => {
    it('should create session log on start', async () => {
      // Create session log
      await SessionLogManager.createSessionLog(sessionDir, testUser, testBranch);

      // Verify log exists
      const hasLog = await SessionLogManager.hasSessionLog(sessionDir);
      assert.strictEqual(hasLog, true, 'Session log should exist');

      // Load and verify content
      const logContent = await SessionLogManager.loadSessionLog(sessionDir);
      assert.ok(logContent.includes('session_id:'), 'Should have session ID');
      assert.ok(logContent.includes(testUser), 'Should have user');
      assert.ok(logContent.includes(testBranch), 'Should have branch');
      assert.ok(logContent.includes('## Timeline'), 'Should have Timeline section');
      assert.ok(logContent.includes('## Key Decisions'), 'Should have Key Decisions section');
    });

    it('should initialize pressure at 0%', () => {
      const pressure = PressureMonitor.getCurrentPressure();
      assert.strictEqual(pressure, 0, 'Initial pressure should be 0');

      const zone = PressureMonitor.getPressureZone();
      assert.strictEqual(zone, 'optimal', 'Initial zone should be optimal');
    });

    it('should create log with correct metadata', async () => {
      await SessionLogManager.createSessionLog(sessionDir, testUser, testBranch);

      const logContent = await SessionLogManager.loadSessionLog(sessionDir);
      const metadata = SessionLogManager.parseMetadata(logContent);

      assert.ok(metadata, 'Should parse metadata');
      assert.ok(metadata!.session_id.startsWith('session-'), 'Should have valid session ID');
      assert.strictEqual(metadata!.user, testUser, 'Should have correct user');
      assert.strictEqual(metadata!.branch, testBranch, 'Should have correct branch');
      assert.ok(metadata!.context_pressure_at_start >= 0, 'Should have valid pressure');
    });
  });

  describe('Event Logging', () => {
    beforeEach(async () => {
      await SessionLogManager.createSessionLog(sessionDir, testUser, testBranch);
    });

    it('should append feature entry', async () => {
      await SessionLogManager.appendEntry(sessionDir, {
        timestamp: new Date().toISOString(),
        category: 'feature',
        description: 'Implemented user authentication',
        files: ['src/auth.ts', 'src/middleware.ts'],
        impact: 'high',
        context_pressure: 0.25
      });

      const logContent = await SessionLogManager.loadSessionLog(sessionDir);
      assert.ok(logContent.includes('Implemented user authentication'), 'Should include description');
      assert.ok(logContent.includes('src/auth.ts'), 'Should include files');
      assert.ok(logContent.includes('high'), 'Should include impact');
    });

    it('should append multiple entries', async () => {
      // Log multiple events
      await SessionLogManager.appendEntry(sessionDir, {
        timestamp: new Date().toISOString(),
        category: 'feature',
        description: 'Created login form',
        impact: 'high',
        context_pressure: 0.20
      });

      await SessionLogManager.appendEntry(sessionDir, {
        timestamp: new Date().toISOString(),
        category: 'insight',
        description: 'bcrypt rounds 10-11 optimal',
        impact: 'medium',
        context_pressure: 0.35
      });

      await SessionLogManager.appendEntry(sessionDir, {
        timestamp: new Date().toISOString(),
        category: 'decision',
        description: 'Chose JWT over sessions',
        impact: 'high',
        context_pressure: 0.42
      });

      const logContent = await SessionLogManager.loadSessionLog(sessionDir);
      const summary = SessionLogManager.getSummary(logContent);

      assert.strictEqual(summary.totalEntries, 3, 'Should have 3 entries');
      assert.strictEqual(summary.byCategory['feature'], 1, 'Should have 1 feature');
      assert.strictEqual(summary.byCategory['insight'], 1, 'Should have 1 insight');
      assert.strictEqual(summary.byCategory['decision'], 1, 'Should have 1 decision');
    });

    it('should track files affected', async () => {
      await SessionLogManager.appendEntry(sessionDir, {
        timestamp: new Date().toISOString(),
        category: 'feature',
        description: 'Implemented auth',
        files: ['src/auth.ts', 'src/types.ts'],
        impact: 'high',
        context_pressure: 0.25
      });

      await SessionLogManager.appendEntry(sessionDir, {
        timestamp: new Date().toISOString(),
        category: 'fix',
        description: 'Fixed bug',
        files: ['src/auth.ts', 'src/utils.ts'],
        impact: 'medium',
        context_pressure: 0.40
      });

      const logContent = await SessionLogManager.loadSessionLog(sessionDir);
      const summary = SessionLogManager.getSummary(logContent);

      assert.strictEqual(summary.filesAffected, 3, 'Should track 3 unique files');
    });

    it('should calculate average pressure', async () => {
      await SessionLogManager.appendEntry(sessionDir, {
        timestamp: new Date().toISOString(),
        category: 'feature',
        description: 'Test 1',
        impact: 'high',
        context_pressure: 0.20
      });

      await SessionLogManager.appendEntry(sessionDir, {
        timestamp: new Date().toISOString(),
        category: 'feature',
        description: 'Test 2',
        impact: 'high',
        context_pressure: 0.40
      });

      await SessionLogManager.appendEntry(sessionDir, {
        timestamp: new Date().toISOString(),
        category: 'feature',
        description: 'Test 3',
        impact: 'high',
        context_pressure: 0.60
      });

      const logContent = await SessionLogManager.loadSessionLog(sessionDir);
      const summary = SessionLogManager.getSummary(logContent);

      assert.strictEqual(summary.avgPressure, 0.40, 'Should calculate correct average');
    });
  });

  describe('Pressure Monitoring Throughout Session', () => {
    it('should track pressure increase', () => {
      // Initial pressure
      assert.strictEqual(PressureMonitor.getCurrentPressure(), 0);

      // Simulate token usage
      PressureMonitor.updateEstimatedTokens(50000);  // 25%
      assert.strictEqual(PressureMonitor.getCurrentPressure(), 0.25);
      assert.strictEqual(PressureMonitor.getPressureZone(), 'optimal');

      PressureMonitor.updateEstimatedTokens(120000); // 60%
      assert.strictEqual(PressureMonitor.getCurrentPressure(), 0.60);
      assert.strictEqual(PressureMonitor.getPressureZone(), 'degradation');

      PressureMonitor.updateEstimatedTokens(180000); // 90%
      assert.strictEqual(PressureMonitor.getCurrentPressure(), 0.90);
      assert.strictEqual(PressureMonitor.getPressureZone(), 'critical');
    });

    it('should provide correct recommendations at each zone', () => {
      // Optimal zone
      PressureMonitor.updateEstimatedTokens(40000); // 20%
      let rec = PressureMonitor.getRecommendation();
      assert.ok(rec.includes('Continue working'), 'Should recommend continuing');

      // Degradation zone
      PressureMonitor.updateEstimatedTokens(150000); // 75%
      rec = PressureMonitor.getRecommendation();
      assert.ok(rec.includes('Consider handoff soon'), 'Should suggest handoff soon');

      // Critical zone
      PressureMonitor.updateEstimatedTokens(190000); // 95%
      rec = PressureMonitor.getRecommendation();
      assert.ok(rec.includes('strongly recommended'), 'Should strongly recommend handoff');
    });

    it('should calculate quality estimates correctly', () => {
      // Optimal zone
      PressureMonitor.updateEstimatedTokens(50000); // 25%
      let quality = PressureMonitor.calculateQualityEstimate();
      assert.strictEqual(quality, 100, 'Should estimate 100% at 25%');

      // Degradation zone
      PressureMonitor.updateEstimatedTokens(140000); // 70%
      quality = PressureMonitor.calculateQualityEstimate();
      assert.strictEqual(quality, 95, 'Should estimate 95% at 70%');

      PressureMonitor.updateEstimatedTokens(170000); // 85%
      quality = PressureMonitor.calculateQualityEstimate();
      assert.strictEqual(quality, 85, 'Should estimate 85% at 85%');

      // Critical zone
      PressureMonitor.updateEstimatedTokens(190000); // 95%
      quality = PressureMonitor.calculateQualityEstimate();
      assert.strictEqual(quality, 65, 'Should estimate 65% at 95%');
    });

    it('should suggest logging at optimal pressure', () => {
      PressureMonitor.updateEstimatedTokens(60000); // 30%
      assert.strictEqual(PressureMonitor.shouldLogEvent(), true);

      PressureMonitor.updateEstimatedTokens(160000); // 80%
      assert.strictEqual(PressureMonitor.shouldLogEvent(), true);

      PressureMonitor.updateEstimatedTokens(180000); // 90%
      assert.strictEqual(PressureMonitor.shouldLogEvent(), false);
    });
  });

  describe('Session Archival', () => {
    beforeEach(async () => {
      await SessionLogManager.createSessionLog(sessionDir, testUser, testBranch);

      // Add some entries
      await SessionLogManager.appendEntry(sessionDir, {
        timestamp: new Date().toISOString(),
        category: 'feature',
        description: 'Implemented feature',
        impact: 'high',
        context_pressure: 0.40
      });
    });

    it('should archive log with timestamp', async () => {
      const archivePath = await SessionLogManager.archiveLog(sessionDir, 'Test handoff summary');

      // Verify archive exists
      const exists = await fs.access(archivePath).then(() => true).catch(() => false);
      assert.strictEqual(exists, true, 'Archive should exist');

      // Verify original log removed
      const hasLog = await SessionLogManager.hasSessionLog(sessionDir);
      assert.strictEqual(hasLog, false, 'Original log should be removed');

      // Verify archive content
      const archiveContent = await fs.readFile(archivePath, 'utf-8');
      assert.ok(archiveContent.includes('Implemented feature'), 'Should include entries');
      assert.ok(archiveContent.includes('Test handoff summary'), 'Should include handoff summary');
    });

    it('should create archive directory if not exists', async () => {
      const archivePath = await SessionLogManager.archiveLog(sessionDir);

      const archiveDir = path.dirname(archivePath);
      const exists = await fs.access(archiveDir).then(() => true).catch(() => false);
      assert.strictEqual(exists, true, 'Archive directory should exist');
    });
  });

  describe('Multi-Session Continuity', () => {
    it('should support multiple sessions', async () => {
      // Session 1
      await SessionLogManager.createSessionLog(sessionDir, testUser, 'feature/session-1');
      await SessionLogManager.appendEntry(sessionDir, {
        timestamp: new Date().toISOString(),
        category: 'feature',
        description: 'Session 1 work',
        impact: 'high',
        context_pressure: 0.50
      });
      const archive1 = await SessionLogManager.archiveLog(sessionDir, 'Session 1 complete');

      // Session 2
      await SessionLogManager.createSessionLog(sessionDir, testUser, 'feature/session-2');
      await SessionLogManager.appendEntry(sessionDir, {
        timestamp: new Date().toISOString(),
        category: 'feature',
        description: 'Session 2 work',
        impact: 'high',
        context_pressure: 0.45
      });
      const archive2 = await SessionLogManager.archiveLog(sessionDir, 'Session 2 complete');

      // Verify both archives exist
      const exists1 = await fs.access(archive1).then(() => true).catch(() => false);
      const exists2 = await fs.access(archive2).then(() => true).catch(() => false);

      assert.strictEqual(exists1, true, 'Session 1 archive should exist');
      assert.strictEqual(exists2, true, 'Session 2 archive should exist');

      // Verify different timestamps
      assert.notStrictEqual(archive1, archive2, 'Archives should have different filenames');
    });

    it('should reset pressure between sessions', async () => {
      // Session 1 - build up pressure
      PressureMonitor.updateEstimatedTokens(170000); // 85%
      assert.strictEqual(PressureMonitor.getPressureZone(), 'critical');

      // Reset (simulating new session)
      PressureMonitor.reset();
      assert.strictEqual(PressureMonitor.getCurrentPressure(), 0);
      assert.strictEqual(PressureMonitor.getPressureZone(), 'optimal');
    });
  });

  describe('Complete E2E Flow', () => {
    it('should execute full session lifecycle', async () => {
      // 1. Start session (pressure: 5%)
      PressureMonitor.reset();
      PressureMonitor.updateEstimatedTokens(10000); // 5%
      await SessionLogManager.createSessionLog(sessionDir, testUser, testBranch);

      const reading1 = PressureMonitor.getPressureReading();
      assert.strictEqual(reading1.zone, 'optimal');

      // 2. Work and log (pressure: 20-60%)
      PressureMonitor.updateEstimatedTokens(40000); // 20%
      await SessionLogManager.appendEntry(sessionDir, {
        timestamp: new Date().toISOString(),
        category: 'decision',
        description: 'Chose PostgreSQL for data layer',
        impact: 'high',
        context_pressure: PressureMonitor.getCurrentPressure()
      });

      PressureMonitor.updateEstimatedTokens(90000); // 45%
      await SessionLogManager.appendEntry(sessionDir, {
        timestamp: new Date().toISOString(),
        category: 'feature',
        description: 'Implemented database models',
        files: ['src/models/user.ts', 'src/models/post.ts'],
        impact: 'high',
        context_pressure: PressureMonitor.getCurrentPressure()
      });

      PressureMonitor.updateEstimatedTokens(120000); // 60%
      await SessionLogManager.appendEntry(sessionDir, {
        timestamp: new Date().toISOString(),
        category: 'insight',
        description: 'Prisma migrations require manual review in production',
        impact: 'medium',
        context_pressure: PressureMonitor.getCurrentPressure()
      });

      // 3. Check status (pressure: 76%)
      PressureMonitor.updateEstimatedTokens(152000); // 76%
      const reading2 = PressureMonitor.getPressureReading();
      assert.strictEqual(reading2.zone, 'degradation');
      assert.ok(reading2.recommendation.includes('Consider handoff'));

      // 4. Continue and complete work (pressure: 82%)
      PressureMonitor.updateEstimatedTokens(164000); // 82%
      await SessionLogManager.appendEntry(sessionDir, {
        timestamp: new Date().toISOString(),
        category: 'achievement',
        description: 'Database layer complete with tests passing',
        impact: 'high',
        context_pressure: PressureMonitor.getCurrentPressure()
      });

      // 5. Verify log summary before handoff
      const logContent = await SessionLogManager.loadSessionLog(sessionDir);
      const summary = SessionLogManager.getSummary(logContent);

      assert.strictEqual(summary.totalEntries, 4, 'Should have 4 entries');
      assert.strictEqual(summary.filesAffected, 2, 'Should have 2 files');
      assert.ok(summary.avgPressure > 0.40 && summary.avgPressure < 0.60, 'Average pressure should be ~50%');
      assert.strictEqual(summary.byCategory['decision'], 1);
      assert.strictEqual(summary.byCategory['feature'], 1);
      assert.strictEqual(summary.byCategory['insight'], 1);
      assert.strictEqual(summary.byCategory['achievement'], 1);

      // 6. Handoff (pressure: 85%)
      PressureMonitor.updateEstimatedTokens(170000); // 85%
      const reading3 = PressureMonitor.getPressureReading();
      assert.strictEqual(reading3.zone, 'degradation');
      assert.strictEqual(reading3.qualityEstimate, 85);

      const archivePath = await SessionLogManager.archiveLog(
        sessionDir,
        'Database layer complete, ready for API implementation'
      );

      // 7. Verify archive contains all entries
      const archiveContent = await fs.readFile(archivePath, 'utf-8');
      assert.ok(archiveContent.includes('Chose PostgreSQL'));
      assert.ok(archiveContent.includes('Implemented database models'));
      assert.ok(archiveContent.includes('Prisma migrations'));
      assert.ok(archiveContent.includes('Database layer complete'));
      assert.ok(archiveContent.includes('ready for API implementation'));

      // 8. New session starts fresh
      PressureMonitor.reset();
      await SessionLogManager.createSessionLog(sessionDir, testUser, 'feature/api-layer');

      const reading4 = PressureMonitor.getPressureReading();
      assert.strictEqual(reading4.pressure, 0);
      assert.strictEqual(reading4.zone, 'optimal');
      assert.strictEqual(reading4.qualityEstimate, 100);
    });
  });
});
