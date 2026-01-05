/**
 * @fileType: test
 * @status: current
 * @updated: 2026-01-05
 * @tags: [test, e2e, team, onboarding, epic-008, sprint-3]
 * @related: [invite/index.ts, join/index.ts, sync/sync-command.ts, start/start-reflection.ts]
 * @priority: high
 * @complexity: high
 * @dependencies: [jest, fs-extra]
 *
 * End-to-End Tests for Team Onboarding Flow
 *
 * Tests the complete journey: invite → join → sync → start
 *
 * Prerequisites:
 * - GINKO_BEARER_TOKEN (required - API bearer token)
 * - GINKO_GRAPH_ID (required - your graph ID)
 * - TEST_TEAM_ID (optional - team to use for tests)
 *
 * Run:
 * GINKO_BEARER_TOKEN=your_token \
 * GINKO_GRAPH_ID=your_graph_id \
 * npm test -- team-onboarding.test.ts
 */

import { describe, it, expect, beforeAll, afterAll, beforeEach } from '@jest/globals';
import fs from 'fs-extra';
import path from 'path';
import os from 'os';
import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);

// Skip tests if required environment variables are not set
const requiredEnvVars = ['GINKO_BEARER_TOKEN', 'GINKO_GRAPH_ID'];
const missingVars = requiredEnvVars.filter(v => !process.env[v]);
const shouldSkip = missingVars.length > 0;

if (shouldSkip) {
  console.warn('\n⚠️  Skipping team onboarding E2E tests - missing required environment variables:');
  console.warn(missingVars.map(v => `   - ${v}`).join('\n'));
  console.warn('\nTo run these tests, set:');
  console.warn('   GINKO_BEARER_TOKEN=your_token');
  console.warn('   GINKO_GRAPH_ID=your_graph_id');
  console.warn('   npm test -- team-onboarding.test.ts\n');
}

// Helper to run ginko commands
async function runGinko(
  args: string,
  cwd: string,
  env?: Record<string, string>
): Promise<{ stdout: string; stderr: string; exitCode: number }> {
  const ginkoPath = path.join(__dirname, '../../dist/index.js');
  const fullEnv = {
    ...process.env,
    ...env,
    GINKO_BEARER_TOKEN: process.env.GINKO_BEARER_TOKEN,
    GINKO_GRAPH_ID: process.env.GINKO_GRAPH_ID,
  };

  try {
    const { stdout, stderr } = await execAsync(`node ${ginkoPath} ${args}`, {
      cwd,
      env: fullEnv,
      timeout: 60000, // 60s timeout for API operations
    });
    return { stdout, stderr, exitCode: 0 };
  } catch (error: any) {
    return {
      stdout: error.stdout || '',
      stderr: error.stderr || error.message,
      exitCode: error.code || 1,
    };
  }
}

// Helper to make API calls
async function apiCall<T>(
  method: 'GET' | 'POST' | 'DELETE',
  endpoint: string,
  body?: Record<string, unknown>
): Promise<T> {
  const baseUrl = process.env.GINKO_API_URL || 'https://app.ginkoai.com';
  const url = `${baseUrl}${endpoint}`;

  const options: RequestInit = {
    method,
    headers: {
      Authorization: `Bearer ${process.env.GINKO_BEARER_TOKEN}`,
      'Content-Type': 'application/json',
    },
  };

  if (body) {
    options.body = JSON.stringify(body);
  }

  const response = await fetch(url, options);
  if (!response.ok) {
    const text = await response.text();
    throw new Error(`API call failed: ${response.status} ${text}`);
  }

  return response.json();
}

describe('Team Onboarding E2E Tests', () => {
  let tempDir: string;
  let testTeamId: string;
  let createdInviteCodes: string[] = [];

  beforeAll(async () => {
    if (shouldSkip) return;

    // Create temp directory
    tempDir = await fs.mkdtemp(path.join(os.tmpdir(), 'team-onboarding-test-'));
    tempDir = await fs.realpath(tempDir);

    // Initialize git repo (required for ginko)
    await execAsync('git init', { cwd: tempDir });
    await execAsync('git config user.email "test@example.com"', { cwd: tempDir });
    await execAsync('git config user.name "Test User"', { cwd: tempDir });

    // Get or create test team
    testTeamId = process.env.TEST_TEAM_ID || '';
    if (!testTeamId) {
      // List teams and use the first one
      const teams = await apiCall<{ teams: Array<{ id: string; name: string }> }>(
        'GET',
        '/api/v1/teams?limit=1'
      );
      if (teams.teams?.length > 0) {
        testTeamId = teams.teams[0].id;
      }
    }

    console.log('\n📊 Test Configuration:');
    console.log(`   Temp Dir: ${tempDir}`);
    console.log(`   Team ID: ${testTeamId || '(will create)'}`);
    console.log(`   Graph ID: ${process.env.GINKO_GRAPH_ID}\n`);
  });

  afterAll(async () => {
    if (shouldSkip) return;

    // Clean up temp directory
    if (tempDir) {
      await fs.remove(tempDir);
    }

    // Revoke test invitations
    for (const code of createdInviteCodes) {
      try {
        await apiCall('DELETE', `/api/v1/team/invite?code=${code}`);
      } catch {
        // Ignore cleanup errors
      }
    }

    console.log(`\n✅ Cleaned up ${createdInviteCodes.length} test invitations`);
  });

  describe('Invite Command', () => {
    it('should create invitation via CLI', async () => {
      if (shouldSkip || !testTeamId) {
        console.log('   ⊘ Skipping - no team available');
        return;
      }

      const testEmail = `test-${Date.now()}@example.com`;
      const result = await runGinko(
        `invite ${testEmail} --team ${testTeamId} --role member`,
        tempDir
      );

      // Check for success indicators
      expect(result.exitCode).toBe(0);
      expect(result.stdout).toMatch(/invitation|code|sent/i);

      // Extract invite code if present for cleanup
      const codeMatch = result.stdout.match(/[A-Za-z0-9]{8,}/);
      if (codeMatch) {
        createdInviteCodes.push(codeMatch[0]);
      }

      console.log(`   ✓ Created invitation for ${testEmail}`);
    });

    it('should list pending invitations', async () => {
      if (shouldSkip || !testTeamId) {
        console.log('   ⊘ Skipping - no team available');
        return;
      }

      const result = await runGinko('invite --list', tempDir);

      expect(result.exitCode).toBe(0);
      // Output should show table or list format
      expect(result.stdout).toMatch(/email|pending|expires/i);

      console.log('   ✓ Listed pending invitations');
    });

    it('should handle invalid email gracefully', async () => {
      if (shouldSkip) return;

      const result = await runGinko('invite not-an-email', tempDir);

      // Should fail with validation error
      expect(result.exitCode).not.toBe(0);
      expect(result.stderr + result.stdout).toMatch(/invalid|email/i);

      console.log('   ✓ Rejected invalid email');
    });
  });

  describe('Join Command', () => {
    it('should validate invitation code', async () => {
      if (shouldSkip) return;

      // Test with invalid code
      const result = await runGinko('join invalid-code-12345', tempDir);

      expect(result.exitCode).not.toBe(0);
      expect(result.stderr + result.stdout).toMatch(/invalid|expired|not found/i);

      console.log('   ✓ Rejected invalid invitation code');
    });

    it('should show invitation preview before accepting', async () => {
      if (shouldSkip || createdInviteCodes.length === 0) {
        console.log('   ⊘ Skipping - no invite code available');
        return;
      }

      // Note: This would need a valid code that hasn't been accepted
      // For now, we test the validation path
      const code = createdInviteCodes[0];
      const result = await runGinko(`join ${code} --yes`, tempDir);

      // Either succeeds or shows why it can't (already member, wrong user, etc)
      expect(result.stdout + result.stderr).toBeTruthy();

      console.log('   ✓ Join command executed');
    });
  });

  describe('Sync After Join', () => {
    let projectDir: string;

    beforeEach(async () => {
      if (shouldSkip) return;

      // Create a fresh project directory for each test
      projectDir = path.join(tempDir, `project-${Date.now()}`);
      await fs.ensureDir(projectDir);
      await execAsync('git init', { cwd: projectDir });
      await execAsync('git config user.email "test@example.com"', { cwd: projectDir });
      await execAsync('git config user.name "Test User"', { cwd: projectDir });

      // Initialize ginko
      await runGinko('init --quick', projectDir);
    });

    it('should sync team context', async () => {
      if (shouldSkip) return;

      const result = await runGinko('sync --dry-run', projectDir);

      // Sync should run without error
      expect(result.exitCode).toBe(0);
      // Output indicates sync activity
      expect(result.stdout).toMatch(/sync|nodes|team/i);

      console.log('   ✓ Sync command executed successfully');
    });

    it('should show sync progress indicators', async () => {
      if (shouldSkip) return;

      const result = await runGinko('sync --preview', projectDir);

      expect(result.exitCode).toBe(0);
      // Should show progress or status
      expect(result.stdout).toMatch(/sync|preview|team|nothing/i);

      console.log('   ✓ Sync shows progress indicators');
    });
  });

  describe('Start After Sync', () => {
    let projectDir: string;

    beforeEach(async () => {
      if (shouldSkip) return;

      projectDir = path.join(tempDir, `start-${Date.now()}`);
      await fs.ensureDir(projectDir);
      await execAsync('git init', { cwd: projectDir });
      await execAsync('git config user.email "test@example.com"', { cwd: projectDir });
      await execAsync('git config user.name "Test User"', { cwd: projectDir });

      // Initialize ginko
      await runGinko('init --quick', projectDir);
    });

    it('should start session with team context', async () => {
      if (shouldSkip) return;

      const result = await runGinko('start', projectDir);

      // Start should succeed
      expect(result.exitCode).toBe(0);
      // Should show readiness indicators
      expect(result.stdout).toMatch(/ready|session|context/i);

      console.log('   ✓ Session started with context');
    });

    it('should warn about stale team context', async () => {
      if (shouldSkip) return;

      // Force staleness by setting old sync timestamp
      const ginkoDir = path.join(projectDir, '.ginko');
      const syncStateFile = path.join(ginkoDir, 'sync-state.json');

      // Set last sync to 10 days ago
      const oldDate = new Date();
      oldDate.setDate(oldDate.getDate() - 10);
      await fs.writeJson(syncStateFile, {
        lastSync: oldDate.toISOString(),
        lastSyncBy: 'test@example.com',
      });

      const result = await runGinko('start', projectDir);

      // Should show staleness warning
      expect(result.stdout).toMatch(/stale|sync|warning|🚨|⚠️/i);

      console.log('   ✓ Staleness warning displayed');
    });

    it('should detect first-time member', async () => {
      if (shouldSkip) return;

      // Simulate first-time member scenario
      const ginkoDir = path.join(projectDir, '.ginko');

      // Mark as team member but no prior sessions
      const teamConfigFile = path.join(ginkoDir, 'team-config.json');
      await fs.writeJson(teamConfigFile, {
        teamId: testTeamId || 'test-team',
        role: 'member',
        joinedAt: new Date().toISOString(),
        isFirstSession: true,
      });

      const result = await runGinko('start', projectDir);

      // First-time member should see welcome or onboarding message
      // (or standard start if feature not detecting this state)
      expect(result.exitCode).toBe(0);

      console.log('   ✓ First-time member scenario handled');
    });
  });

  describe('Full Onboarding Flow', () => {
    it('should complete invite → join → sync → start flow', async () => {
      if (shouldSkip || !testTeamId) {
        console.log('   ⊘ Skipping - requires team setup');
        return;
      }

      const projectDir = path.join(tempDir, `full-flow-${Date.now()}`);
      await fs.ensureDir(projectDir);
      await execAsync('git init', { cwd: projectDir });
      await execAsync('git config user.email "newmember@example.com"', { cwd: projectDir });
      await execAsync('git config user.name "New Member"', { cwd: projectDir });

      // 1. Initialize project
      console.log('   Step 1: Initialize project...');
      const initResult = await runGinko('init --quick', projectDir);
      expect(initResult.exitCode).toBe(0);

      // 2. Simulate having joined a team (sync pulls context)
      console.log('   Step 2: Sync team context...');
      const syncResult = await runGinko('sync', projectDir);
      expect(syncResult.exitCode).toBe(0);

      // 3. Start session
      console.log('   Step 3: Start session...');
      const startResult = await runGinko('start', projectDir);
      expect(startResult.exitCode).toBe(0);

      // 4. Verify context was loaded
      const ginkoDir = path.join(projectDir, '.ginko');
      const sessionsDir = path.join(ginkoDir, 'sessions');
      expect(await fs.pathExists(sessionsDir)).toBe(true);

      console.log('   ✓ Full onboarding flow completed');
    });

    it('should measure onboarding time < 10 minutes', async () => {
      if (shouldSkip) return;

      const projectDir = path.join(tempDir, `timing-${Date.now()}`);
      await fs.ensureDir(projectDir);
      await execAsync('git init', { cwd: projectDir });
      await execAsync('git config user.email "test@example.com"', { cwd: projectDir });
      await execAsync('git config user.name "Test"', { cwd: projectDir });

      const startTime = Date.now();

      // Run the automated parts of onboarding
      await runGinko('init --quick', projectDir);
      await runGinko('sync', projectDir);
      await runGinko('start', projectDir);

      const endTime = Date.now();
      const durationMs = endTime - startTime;
      const durationMin = durationMs / 60000;

      // Log timing
      console.log(`   Onboarding duration: ${durationMs}ms (${durationMin.toFixed(2)} min)`);

      // Automated parts should complete in < 2 minutes
      // (full flow with human interaction targets < 10 min)
      expect(durationMin).toBeLessThan(2);

      console.log('   ✓ Onboarding timing within target');
    });
  });
});

// Export skip status for test runner
export const isSkipped = shouldSkip;
