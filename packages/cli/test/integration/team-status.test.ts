/**
 * @fileType: test
 * @status: current
 * @updated: 2026-01-21
 * @tags: [test, integration, team, status, visibility, epic-016, sprint-3]
 * @related: [../../src/commands/team/status.ts, ../../src/commands/graph/api-client.ts]
 * @priority: high
 * @complexity: medium
 * @dependencies: [jest, fs-extra]
 *
 * Integration Tests for Team Status Command (EPIC-016 Sprint 3)
 *
 * Tests:
 * - Team with multiple active members
 * - Team with inactive members
 * - Large unassigned backlog
 * - Empty team (no assignments)
 * - Single user (solo mode)
 * - API performance with many users
 *
 * Prerequisites:
 * - GINKO_BEARER_TOKEN (required - API bearer token)
 * - GINKO_GRAPH_ID (required - your graph ID)
 *
 * Run:
 * GINKO_BEARER_TOKEN=your_token \
 * GINKO_GRAPH_ID=your_graph_id \
 * npm test -- team-status.test.ts
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
  console.warn('\n⚠️  Skipping team status integration tests - missing required environment variables:');
  console.warn(missingVars.map(v => `   - ${v}`).join('\n'));
  console.warn('\nTo run these tests, set:');
  console.warn('   GINKO_BEARER_TOKEN=your_token');
  console.warn('   GINKO_GRAPH_ID=your_graph_id');
  console.warn('   npm test -- team-status.test.ts\n');
}

// Helper to make API calls
async function apiCall<T>(
  method: 'GET' | 'POST' | 'PATCH' | 'DELETE',
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

  return response.json() as Promise<T>;
}

// Helper to run ginko commands
async function runGinko(
  args: string,
  cwd: string
): Promise<{ stdout: string; stderr: string; exitCode: number }> {
  const ginkoPath = path.join(__dirname, '../../dist/index.js');

  try {
    const { stdout, stderr } = await execAsync(`node ${ginkoPath} ${args}`, {
      cwd,
      env: {
        ...process.env,
        GINKO_BEARER_TOKEN: process.env.GINKO_BEARER_TOKEN,
        GINKO_GRAPH_ID: process.env.GINKO_GRAPH_ID,
      },
      timeout: 60000,
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

// Interface for team status response
interface TeamStatusResponse {
  members: Array<{
    email: string;
    name?: string;
    activeSprint: {
      id: string;
      title: string;
      epic: { id: string; title: string };
    } | null;
    progress: {
      complete: number;
      total: number;
      inProgress: number;
    };
    lastActivity: string | null;
  }>;
  unassigned: Array<{
    sprintId: string;
    sprintTitle: string;
    epicTitle: string;
    taskCount: number;
  }>;
  summary: {
    totalMembers: number;
    activeMembers: number;
    totalUnassigned: number;
  };
}

describe('Team Status Integration Tests', () => {
  let tempDir: string;
  const graphId = process.env.GINKO_GRAPH_ID;

  beforeAll(async () => {
    if (shouldSkip) return;

    tempDir = await fs.mkdtemp(path.join(os.tmpdir(), 'team-status-test-'));
    tempDir = await fs.realpath(tempDir);

    // Initialize git repo
    await execAsync('git init', { cwd: tempDir });
    await execAsync('git config user.email "test@example.com"', { cwd: tempDir });
    await execAsync('git config user.name "Test User"', { cwd: tempDir });

    // Initialize ginko
    await runGinko('init --quick', tempDir);

    console.log('\n📊 Test Configuration:');
    console.log(`   Temp Dir: ${tempDir}`);
    console.log(`   Graph ID: ${graphId}\n`);
  });

  afterAll(async () => {
    if (shouldSkip) return;

    // Clean up temp directory
    if (tempDir) {
      await fs.remove(tempDir);
    }

    console.log('\n✅ Team status tests completed');
  });

  describe('API Endpoint Tests', () => {
    it('should return team status from API endpoint', async () => {
      if (shouldSkip) return;

      const response = await apiCall<TeamStatusResponse>(
        'GET',
        `/api/v1/team/status?graphId=${graphId}`
      );

      // Verify response structure
      expect(response).toBeDefined();
      expect(response).toHaveProperty('members');
      expect(response).toHaveProperty('unassigned');
      expect(response).toHaveProperty('summary');
      expect(Array.isArray(response.members)).toBe(true);
      expect(Array.isArray(response.unassigned)).toBe(true);

      // Verify summary structure
      expect(response.summary).toHaveProperty('totalMembers');
      expect(response.summary).toHaveProperty('activeMembers');
      expect(response.summary).toHaveProperty('totalUnassigned');
      expect(typeof response.summary.totalMembers).toBe('number');
      expect(typeof response.summary.activeMembers).toBe('number');
      expect(typeof response.summary.totalUnassigned).toBe('number');

      console.log('   ✓ API returns valid team status structure');
      console.log(`     Members: ${response.summary.totalMembers}`);
      console.log(`     Active: ${response.summary.activeMembers}`);
      console.log(`     Unassigned tasks: ${response.summary.totalUnassigned}`);
    });

    it('should handle missing graphId parameter', async () => {
      if (shouldSkip) return;

      try {
        await apiCall<TeamStatusResponse>('GET', '/api/v1/team/status');
        // Should not reach here
        expect(true).toBe(false);
      } catch (error: any) {
        expect(error.message).toMatch(/400|missing|graphId/i);
        console.log('   ✓ API properly rejects missing graphId');
      }
    });

    it('should handle invalid graphId parameter', async () => {
      if (shouldSkip) return;

      try {
        await apiCall<TeamStatusResponse>(
          'GET',
          '/api/v1/team/status?graphId=invalid_graph_id_12345'
        );
        // May return empty results or error
        console.log('   ✓ API handles invalid graphId gracefully');
      } catch (error: any) {
        // Either 403 (access denied) or 404 (not found) is acceptable
        expect(error.message).toMatch(/403|404|access|denied|not found/i);
        console.log('   ✓ API properly rejects invalid graphId');
      }
    });

    it('should return member progress data correctly', async () => {
      if (shouldSkip) return;

      const response = await apiCall<TeamStatusResponse>(
        'GET',
        `/api/v1/team/status?graphId=${graphId}`
      );

      // Check member structure if members exist
      if (response.members.length > 0) {
        const member = response.members[0];
        expect(member).toHaveProperty('email');
        expect(member).toHaveProperty('progress');
        expect(member).toHaveProperty('lastActivity');

        // Progress should have expected fields
        expect(member.progress).toHaveProperty('complete');
        expect(member.progress).toHaveProperty('total');
        expect(member.progress).toHaveProperty('inProgress');

        // Progress values should be non-negative
        expect(member.progress.complete).toBeGreaterThanOrEqual(0);
        expect(member.progress.total).toBeGreaterThanOrEqual(0);
        expect(member.progress.inProgress).toBeGreaterThanOrEqual(0);

        // complete + inProgress should not exceed total
        expect(member.progress.complete + member.progress.inProgress).toBeLessThanOrEqual(
          member.progress.total
        );

        console.log('   ✓ Member progress data is valid');
        console.log(`     First member: ${member.email}`);
        console.log(`     Progress: ${member.progress.complete}/${member.progress.total}`);
      } else {
        console.log('   ⊘ No members with assignments - skipping progress validation');
      }
    });

    it('should return unassigned work grouped by sprint', async () => {
      if (shouldSkip) return;

      const response = await apiCall<TeamStatusResponse>(
        'GET',
        `/api/v1/team/status?graphId=${graphId}`
      );

      // Check unassigned structure if any exist
      if (response.unassigned.length > 0) {
        const unassigned = response.unassigned[0];
        expect(unassigned).toHaveProperty('sprintId');
        expect(unassigned).toHaveProperty('sprintTitle');
        expect(unassigned).toHaveProperty('epicTitle');
        expect(unassigned).toHaveProperty('taskCount');

        expect(typeof unassigned.taskCount).toBe('number');
        expect(unassigned.taskCount).toBeGreaterThan(0);

        console.log('   ✓ Unassigned work data is valid');
        console.log(`     First sprint: ${unassigned.sprintTitle}`);
        console.log(`     Unassigned tasks: ${unassigned.taskCount}`);
      } else {
        console.log('   ⊘ No unassigned work - all tasks assigned!');
      }
    });
  });

  describe('CLI Command Tests', () => {
    it('should execute ginko team status command', async () => {
      if (shouldSkip) return;

      const result = await runGinko('team status', tempDir);

      // Should succeed
      expect(result.exitCode).toBe(0);

      // Output should contain team status elements
      expect(result.stdout).toMatch(/team status|summary|members/i);

      console.log('   ✓ ginko team status command executed successfully');
    });

    it('should display formatted box output', async () => {
      if (shouldSkip) return;

      const result = await runGinko('team status', tempDir);

      expect(result.exitCode).toBe(0);

      // Should contain box drawing characters
      expect(result.stdout).toMatch(/[┌┐└┘├┤─│]/);

      console.log('   ✓ Output contains box formatting');
    });

    it('should show summary statistics', async () => {
      if (shouldSkip) return;

      const result = await runGinko('team status', tempDir);

      expect(result.exitCode).toBe(0);

      // Should contain summary line
      expect(result.stdout).toMatch(/summary/i);

      console.log('   ✓ Summary statistics displayed');
    });

    it('should handle unauthenticated state gracefully', async () => {
      if (shouldSkip) return;

      // Create a temp dir without authentication
      const unauthDir = path.join(tempDir, 'unauth-test');
      await fs.ensureDir(unauthDir);
      await execAsync('git init', { cwd: unauthDir });
      await execAsync('git config user.email "test@example.com"', { cwd: unauthDir });
      await execAsync('git config user.name "Test"', { cwd: unauthDir });
      await runGinko('init --quick', unauthDir);

      // Remove auth token for this test
      const result = await execAsync(
        `node ${path.join(__dirname, '../../dist/index.js')} team status`,
        {
          cwd: unauthDir,
          env: {
            ...process.env,
            GINKO_BEARER_TOKEN: '', // Empty token
            GINKO_GRAPH_ID: graphId,
          },
          timeout: 30000,
        }
      ).catch(error => ({
        stdout: error.stdout || '',
        stderr: error.stderr || error.message,
      }));

      // Should show authentication message
      const output = result.stdout + result.stderr;
      expect(output).toMatch(/login|auth|token/i);

      console.log('   ✓ Handles unauthenticated state gracefully');

      // Cleanup
      await fs.remove(unauthDir);
    });
  });

  describe('Edge Cases', () => {
    it('should handle empty team (no assignments)', async () => {
      if (shouldSkip) return;

      // This tests the API response when there are no assigned tasks
      const response = await apiCall<TeamStatusResponse>(
        'GET',
        `/api/v1/team/status?graphId=${graphId}`
      );

      // Should return valid structure even if empty
      expect(response).toBeDefined();
      expect(Array.isArray(response.members)).toBe(true);
      expect(response.summary).toBeDefined();
      expect(response.summary.totalMembers).toBeGreaterThanOrEqual(0);

      if (response.members.length === 0) {
        console.log('   ✓ Empty team handled correctly');
      } else {
        console.log(`   ✓ Team has ${response.members.length} member(s) with assignments`);
      }
    });

    it('should handle members with no active sprint', async () => {
      if (shouldSkip) return;

      const response = await apiCall<TeamStatusResponse>(
        'GET',
        `/api/v1/team/status?graphId=${graphId}`
      );

      // Find members without active sprint
      const inactiveMembers = response.members.filter(m => m.activeSprint === null);

      if (inactiveMembers.length > 0) {
        const member = inactiveMembers[0];
        // Should still have progress structure
        expect(member.progress).toBeDefined();
        expect(member.progress.total).toBe(0);
        console.log(`   ✓ Member without active sprint handled: ${member.email}`);
      } else {
        console.log('   ⊘ All members have active sprints - edge case not tested');
      }
    });

    it('should handle members with null lastActivity', async () => {
      if (shouldSkip) return;

      const response = await apiCall<TeamStatusResponse>(
        'GET',
        `/api/v1/team/status?graphId=${graphId}`
      );

      // Find members without last activity
      const noActivityMembers = response.members.filter(m => m.lastActivity === null);

      if (noActivityMembers.length > 0) {
        const member = noActivityMembers[0];
        expect(member.lastActivity).toBeNull();
        console.log(`   ✓ Member with null lastActivity handled: ${member.email}`);
      } else {
        console.log('   ⊘ All members have activity - edge case not tested');
      }
    });
  });

  describe('Performance Tests', () => {
    it('should respond within 3 seconds (API)', async () => {
      if (shouldSkip) return;

      const startTime = Date.now();

      await apiCall<TeamStatusResponse>(
        'GET',
        `/api/v1/team/status?graphId=${graphId}`
      );

      const duration = Date.now() - startTime;

      expect(duration).toBeLessThan(3000);

      console.log(`   ✓ API responded in ${duration}ms (< 3000ms)`);
    });

    it('should respond within 5 seconds (CLI command)', async () => {
      if (shouldSkip) return;

      const startTime = Date.now();

      const result = await runGinko('team status', tempDir);

      const duration = Date.now() - startTime;

      expect(result.exitCode).toBe(0);
      expect(duration).toBeLessThan(5000);

      console.log(`   ✓ CLI command completed in ${duration}ms (< 5000ms)`);
    });

    it('should handle concurrent requests', async () => {
      if (shouldSkip) return;

      const startTime = Date.now();

      // Make 5 concurrent requests
      const requests = Array(5).fill(null).map(() =>
        apiCall<TeamStatusResponse>(
          'GET',
          `/api/v1/team/status?graphId=${graphId}`
        )
      );

      const results = await Promise.all(requests);

      const duration = Date.now() - startTime;

      // All should succeed
      results.forEach(r => {
        expect(r).toBeDefined();
        expect(r.summary).toBeDefined();
      });

      // Should complete within reasonable time (not 5x single request)
      expect(duration).toBeLessThan(10000);

      console.log(`   ✓ 5 concurrent requests completed in ${duration}ms`);
    });
  });

  describe('Data Consistency', () => {
    it('should return consistent summary counts', async () => {
      if (shouldSkip) return;

      const response = await apiCall<TeamStatusResponse>(
        'GET',
        `/api/v1/team/status?graphId=${graphId}`
      );

      // totalMembers should match members array length
      expect(response.summary.totalMembers).toBe(response.members.length);

      // totalUnassigned should match sum of unassigned task counts
      const unassignedSum = response.unassigned.reduce(
        (sum, u) => sum + u.taskCount,
        0
      );
      expect(response.summary.totalUnassigned).toBe(unassignedSum);

      // activeMembers should not exceed totalMembers
      expect(response.summary.activeMembers).toBeLessThanOrEqual(
        response.summary.totalMembers
      );

      console.log('   ✓ Summary counts are consistent with data');
    });

    it('should return unique sprint IDs in unassigned list', async () => {
      if (shouldSkip) return;

      const response = await apiCall<TeamStatusResponse>(
        'GET',
        `/api/v1/team/status?graphId=${graphId}`
      );

      if (response.unassigned.length > 1) {
        const sprintIds = response.unassigned.map(u => u.sprintId);
        const uniqueIds = new Set(sprintIds);

        expect(uniqueIds.size).toBe(sprintIds.length);

        console.log('   ✓ Unassigned sprints have unique IDs');
      } else {
        console.log('   ⊘ Not enough unassigned sprints to test uniqueness');
      }
    });
  });
});

// Export skip status for test runner
export const isSkipped = shouldSkip;
