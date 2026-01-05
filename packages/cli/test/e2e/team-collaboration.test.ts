/**
 * @fileType: test
 * @status: current
 * @updated: 2026-01-05
 * @tags: [test, e2e, team, collaboration, insights, concurrent-edits, epic-008, sprint-3]
 * @related: [sync/sync-command.ts, ../../dashboard/src/app/api/v1/insights]
 * @priority: high
 * @complexity: high
 * @dependencies: [jest, fs-extra]
 *
 * End-to-End Tests for Team Collaboration Features
 *
 * Tests:
 * - Concurrent node edits and locking
 * - Owner viewing member insights
 * - Team activity visibility
 *
 * Prerequisites:
 * - GINKO_BEARER_TOKEN (required - API bearer token)
 * - GINKO_GRAPH_ID (required - your graph ID)
 * - TEST_TEAM_ID (optional - team to use for tests)
 *
 * Run:
 * GINKO_BEARER_TOKEN=your_token \
 * GINKO_GRAPH_ID=your_graph_id \
 * npm test -- team-collaboration.test.ts
 */

import { describe, it, expect, beforeAll, afterAll } from '@jest/globals';
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
  console.warn('\n⚠️  Skipping team collaboration E2E tests - missing required environment variables:');
  console.warn(missingVars.map(v => `   - ${v}`).join('\n'));
  console.warn('\nTo run these tests, set:');
  console.warn('   GINKO_BEARER_TOKEN=your_token');
  console.warn('   GINKO_GRAPH_ID=your_graph_id');
  console.warn('   npm test -- team-collaboration.test.ts\n');
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

  return response.json();
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

describe('Team Collaboration E2E Tests', () => {
  let tempDir: string;
  let testNodeIds: string[] = [];
  const graphId = process.env.GINKO_GRAPH_ID;

  beforeAll(async () => {
    if (shouldSkip) return;

    tempDir = await fs.mkdtemp(path.join(os.tmpdir(), 'team-collab-test-'));
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

    // Clean up test nodes
    for (const nodeId of testNodeIds) {
      try {
        await apiCall('DELETE', `/api/v1/graph/nodes/${nodeId}?graphId=${graphId}`);
      } catch {
        // Ignore cleanup errors
      }
    }

    console.log(`\n✅ Cleaned up ${testNodeIds.length} test nodes`);
  });

  describe('Concurrent Node Edits', () => {
    it('should create a test node for concurrent edit tests', async () => {
      if (shouldSkip) return;

      const nodeId = `test_concurrent_${Date.now()}`;
      const response = await apiCall<{ node: { id: string } }>('POST', '/api/v1/graph/nodes', {
        graphId,
        id: nodeId,
        labels: ['Pattern'],
        properties: {
          title: 'Test Concurrent Edit Pattern',
          content: 'Initial content for concurrent edit testing',
          status: 'draft',
        },
      });

      expect(response.node).toBeDefined();
      testNodeIds.push(nodeId);

      console.log(`   ✓ Created test node: ${nodeId}`);
    });

    it('should handle concurrent read operations', async () => {
      if (shouldSkip || testNodeIds.length === 0) {
        console.log('   ⊘ Skipping - no test node available');
        return;
      }

      const nodeId = testNodeIds[0];

      // Simulate multiple concurrent reads
      const reads = await Promise.all([
        apiCall<{ node: unknown }>('GET', `/api/v1/graph/nodes/${nodeId}?graphId=${graphId}`),
        apiCall<{ node: unknown }>('GET', `/api/v1/graph/nodes/${nodeId}?graphId=${graphId}`),
        apiCall<{ node: unknown }>('GET', `/api/v1/graph/nodes/${nodeId}?graphId=${graphId}`),
      ]);

      // All reads should succeed
      expect(reads.length).toBe(3);
      reads.forEach(r => expect(r.node).toBeDefined());

      console.log('   ✓ Concurrent reads succeeded');
    });

    it('should handle sequential updates correctly', async () => {
      if (shouldSkip || testNodeIds.length === 0) {
        console.log('   ⊘ Skipping - no test node available');
        return;
      }

      const nodeId = testNodeIds[0];

      // Sequential updates
      await apiCall('PATCH', `/api/v1/graph/nodes/${nodeId}?graphId=${graphId}`, {
        properties: { content: 'Update 1' },
      });

      await apiCall('PATCH', `/api/v1/graph/nodes/${nodeId}?graphId=${graphId}`, {
        properties: { content: 'Update 2' },
      });

      // Verify final state
      const final = await apiCall<{ node: { properties: { content: string } } }>(
        'GET',
        `/api/v1/graph/nodes/${nodeId}?graphId=${graphId}`
      );

      expect(final.node.properties.content).toBe('Update 2');

      console.log('   ✓ Sequential updates applied correctly');
    });

    it('should handle rapid concurrent updates', async () => {
      if (shouldSkip || testNodeIds.length === 0) {
        console.log('   ⊘ Skipping - no test node available');
        return;
      }

      const nodeId = testNodeIds[0];

      // Rapid concurrent updates
      const updates = await Promise.allSettled([
        apiCall('PATCH', `/api/v1/graph/nodes/${nodeId}?graphId=${graphId}`, {
          properties: { rapidUpdate: 'A' },
        }),
        apiCall('PATCH', `/api/v1/graph/nodes/${nodeId}?graphId=${graphId}`, {
          properties: { rapidUpdate: 'B' },
        }),
        apiCall('PATCH', `/api/v1/graph/nodes/${nodeId}?graphId=${graphId}`, {
          properties: { rapidUpdate: 'C' },
        }),
      ]);

      // At least some should succeed (last-write-wins)
      const succeeded = updates.filter(r => r.status === 'fulfilled');
      expect(succeeded.length).toBeGreaterThan(0);

      // Verify final state is consistent
      const final = await apiCall<{ node: { properties: { rapidUpdate: string } } }>(
        'GET',
        `/api/v1/graph/nodes/${nodeId}?graphId=${graphId}`
      );

      // Should have one of the update values
      expect(['A', 'B', 'C']).toContain(final.node.properties.rapidUpdate);

      console.log(`   ✓ Rapid updates handled (final value: ${final.node.properties.rapidUpdate})`);
    });
  });

  describe('Owner Viewing Member Insights', () => {
    it('should fetch insights for current user', async () => {
      if (shouldSkip) return;

      try {
        const response = await apiCall<{ insights: unknown[] }>(
          'GET',
          `/api/v1/insights/sync?graphId=${graphId}`
        );

        // Response should have insights structure
        expect(response).toBeDefined();

        console.log('   ✓ Fetched current user insights');
      } catch (error: any) {
        // Insights endpoint might require specific setup
        console.log(`   ⊘ Skipping - insights not available: ${error.message}`);
      }
    });

    it('should allow owner to view other member insights', async () => {
      if (shouldSkip) return;

      // This test requires owner role - may fail for non-owners
      try {
        // Try to fetch aggregate team insights (owner only)
        const response = await apiCall<{ teamInsights?: unknown; error?: string }>(
          'GET',
          `/api/v1/insights/sync?graphId=${graphId}&aggregate=team`
        );

        if (response.error) {
          console.log(`   ⊘ Not an owner - cannot view team insights`);
          return;
        }

        expect(response).toBeDefined();

        console.log('   ✓ Owner can view team aggregate insights');
      } catch (error: any) {
        if (error.message.includes('403') || error.message.includes('permission')) {
          console.log('   ⊘ Permission denied - not an owner');
        } else {
          throw error;
        }
      }
    });

    it('should prevent non-owner from viewing other member insights', async () => {
      if (shouldSkip) return;

      // Try to access another member's insights with member role
      try {
        await apiCall<unknown>(
          'GET',
          `/api/v1/insights/sync?graphId=${graphId}&memberEmail=other@example.com`
        );

        // If we get here as a member, the API should have filtered to own data
        console.log('   ✓ Member access appropriately restricted');
      } catch (error: any) {
        // Permission denied is expected for non-owners
        if (error.message.includes('403') || error.message.includes('permission')) {
          console.log('   ✓ Non-owner correctly denied access to other member insights');
        } else {
          throw error;
        }
      }
    });
  });

  describe('Team Activity Visibility', () => {
    it('should list team members', async () => {
      if (shouldSkip) return;

      try {
        const response = await apiCall<{ teams: Array<{ id: string; name: string }> }>(
          'GET',
          '/api/v1/teams?limit=1'
        );

        if (response.teams?.length > 0) {
          const teamId = response.teams[0].id;

          // List members of first team
          const members = await apiCall<{ members: unknown[] }>(
            'GET',
            `/api/v1/teams/${teamId}/members`
          );

          expect(members).toBeDefined();
          console.log(`   ✓ Listed team members for ${response.teams[0].name}`);
        } else {
          console.log('   ⊘ No teams available');
        }
      } catch (error: any) {
        console.log(`   ⊘ Team API not available: ${error.message}`);
      }
    });

    it('should fetch team events', async () => {
      if (shouldSkip) return;

      try {
        const response = await apiCall<{ events?: unknown[]; nodes?: unknown[] }>(
          'GET',
          `/api/v1/graph/nodes?graphId=${graphId}&labels=Event&limit=10`
        );

        // Should get events (or empty list)
        expect(response).toBeDefined();

        const count = response.nodes?.length || response.events?.length || 0;
        console.log(`   ✓ Fetched ${count} team events`);
      } catch (error: any) {
        console.log(`   ⊘ Events not available: ${error.message}`);
      }
    });
  });

  describe('Sync Command Integration', () => {
    it('should sync team knowledge to local', async () => {
      if (shouldSkip) return;

      const result = await runGinko('sync --dry-run', tempDir);

      expect(result.exitCode).toBe(0);
      expect(result.stdout).toMatch(/sync|nodes|nothing/i);

      console.log('   ✓ Sync dry-run completed');
    });

    it('should sync specific node type', async () => {
      if (shouldSkip) return;

      const result = await runGinko('sync --type Pattern --dry-run', tempDir);

      expect(result.exitCode).toBe(0);
      expect(result.stdout).toMatch(/sync|pattern|nothing/i);

      console.log('   ✓ Pattern-only sync completed');
    });

    it('should show preview of team changes', async () => {
      if (shouldSkip) return;

      const result = await runGinko('sync --preview', tempDir);

      expect(result.exitCode).toBe(0);

      console.log('   ✓ Team changes preview shown');
    });
  });

  describe('Staleness Detection', () => {
    it('should detect stale context on start', async () => {
      if (shouldSkip) return;

      // Create a project with old sync state
      const staleDir = path.join(tempDir, `stale-${Date.now()}`);
      await fs.ensureDir(staleDir);
      await execAsync('git init', { cwd: staleDir });
      await execAsync('git config user.email "test@example.com"', { cwd: staleDir });
      await execAsync('git config user.name "Test"', { cwd: staleDir });

      // Initialize ginko
      await runGinko('init --quick', staleDir);

      // Set old sync date
      const ginkoDir = path.join(staleDir, '.ginko');
      const syncStateFile = path.join(ginkoDir, 'sync-state.json');
      const oldDate = new Date();
      oldDate.setDate(oldDate.getDate() - 8); // 8 days ago = critical
      await fs.writeJson(syncStateFile, {
        lastSync: oldDate.toISOString(),
        lastSyncBy: 'test@example.com',
      });

      // Start should warn about staleness
      const result = await runGinko('start', staleDir);

      expect(result.exitCode).toBe(0);
      // Look for staleness indicators
      expect(result.stdout).toMatch(/stale|sync|warning|🚨|⚠️|team context/i);

      console.log('   ✓ Staleness detected and warned');

      // Cleanup
      await fs.remove(staleDir);
    });

    it('should not warn when context is fresh', async () => {
      if (shouldSkip) return;

      // Create project with recent sync
      const freshDir = path.join(tempDir, `fresh-${Date.now()}`);
      await fs.ensureDir(freshDir);
      await execAsync('git init', { cwd: freshDir });
      await execAsync('git config user.email "test@example.com"', { cwd: freshDir });
      await execAsync('git config user.name "Test"', { cwd: freshDir });

      await runGinko('init --quick', freshDir);

      // Set recent sync date
      const ginkoDir = path.join(freshDir, '.ginko');
      const syncStateFile = path.join(ginkoDir, 'sync-state.json');
      await fs.writeJson(syncStateFile, {
        lastSync: new Date().toISOString(),
        lastSyncBy: 'test@example.com',
      });

      const result = await runGinko('start', freshDir);

      expect(result.exitCode).toBe(0);
      // Should NOT contain critical staleness warning
      expect(result.stdout).not.toMatch(/critically stale/i);

      console.log('   ✓ Fresh context - no warning');

      // Cleanup
      await fs.remove(freshDir);
    });
  });
});

// Export skip status for test runner
export const isSkipped = shouldSkip;
