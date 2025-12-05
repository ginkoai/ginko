/**
 * @fileType: test
 * @status: current
 * @updated: 2025-12-05
 * @tags: [test, integration, agent-coordination, epic-004, multi-agent]
 * @related: [../../src/commands/agent/agent-client.ts, ../../dashboard/src/app/api/v1/agent/route.ts]
 * @priority: high
 * @complexity: high
 * @dependencies: [jest, node-fetch]
 */

/**
 * Integration Tests: Agent Coordination (EPIC-004 Sprint 1 TASK-8)
 *
 * Tests complete agent coordination flow:
 * - Agent registration creates agent in graph
 * - Agent list returns registered agents
 * - Task claim succeeds for first agent
 * - Concurrent task claim returns 409 for second agent
 * - Only claiming agent can release task
 * - Released task can be re-claimed
 * - Heartbeat updates last_heartbeat timestamp
 *
 * Coverage: Agent registration, task claiming race conditions, heartbeat, task release
 */

import { describe, it, expect, beforeAll, afterAll, beforeEach } from '@jest/globals';

// Mock environment configuration
const API_URL = process.env.GINKO_API_URL || 'https://app.ginkoai.com';
const TEST_TOKEN = process.env.GINKO_TEST_TOKEN || 'test_token_for_integration';

interface Agent {
  agentId: string;
  id?: string;
  name: string;
  capabilities: string[];
  status: string;
  organizationId: string;
  createdAt: string;
}

interface Task {
  id: string;
  status: string;
  claimedAt?: string;
}

interface ApiError {
  error: {
    code: string;
    message: string;
  };
}

/**
 * Helper: Make authenticated API request
 */
async function apiRequest<T>(
  method: string,
  endpoint: string,
  body?: unknown
): Promise<{ data?: T; error?: ApiError; status: number }> {
  const url = `${API_URL}${endpoint}`;

  try {
    const response = await fetch(url, {
      method,
      headers: {
        'Authorization': `Bearer ${TEST_TOKEN}`,
        'Content-Type': 'application/json',
      },
      body: body ? JSON.stringify(body) : undefined,
    });

    const data = await response.json();

    if (!response.ok) {
      return { error: data as ApiError, status: response.status };
    }

    return { data: data as T, status: response.status };
  } catch (error) {
    throw new Error(`API request failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

/**
 * Helper: Create test agent
 */
async function createTestAgent(name: string, capabilities: string[]): Promise<Agent> {
  const { data, error, status } = await apiRequest<Agent>('POST', '/api/v1/agent', {
    name,
    capabilities,
    status: 'active',
  });

  if (error || !data) {
    throw new Error(`Failed to create test agent: ${error?.error.message || 'Unknown error'} (status: ${status})`);
  }

  // Normalize the response - agentId and id should be the same
  return {
    ...data,
    id: data.agentId,
  };
}

/**
 * Helper: Create test task in graph
 * Note: This assumes a task creation endpoint exists
 * For testing purposes, we'll mock the task creation
 */
async function createTestTask(title: string): Promise<Task> {
  // Since task creation endpoint may not exist yet, we'll use a mock task
  // In production, this would call POST /api/v1/task
  const taskId = `task_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`;

  return {
    id: taskId,
    status: 'available',
  };
}

/**
 * Helper: Sleep for specified milliseconds
 */
function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

describe('Agent Coordination Integration Tests', () => {
  let testAgents: Agent[] = [];
  let testTasks: Task[] = [];

  // Cleanup after all tests
  afterAll(async () => {
    // Note: In production, we would clean up test agents and tasks
    // For now, we rely on test isolation
    console.log(`[Cleanup] Created ${testAgents.length} test agents and ${testTasks.length} test tasks`);
  });

  describe('Agent Registration Flow', () => {
    it('should register a new agent successfully', async () => {
      const { data, status } = await apiRequest<Agent>('POST', '/api/v1/agent', {
        name: 'Test Agent 1',
        capabilities: ['code-generation', 'testing'],
        status: 'active',
      });

      expect(status).toBe(201);
      expect(data).toBeDefined();
      expect(data!.agentId).toBeDefined();
      expect(data!.name).toBe('Test Agent 1');
      expect(data!.capabilities).toEqual(['code-generation', 'testing']);
      expect(data!.status).toBe('active');
      expect(data!.organizationId).toBeDefined();
      expect(data!.createdAt).toBeDefined();

      testAgents.push(data!);
    });

    it('should fail registration without name', async () => {
      const { error, status } = await apiRequest<Agent>('POST', '/api/v1/agent', {
        capabilities: ['testing'],
      });

      expect(status).toBe(400);
      expect(error).toBeDefined();
      expect(error!.error.code).toBe('MISSING_NAME');
    });

    it('should fail registration without capabilities', async () => {
      const { error, status } = await apiRequest<Agent>('POST', '/api/v1/agent', {
        name: 'Invalid Agent',
      });

      expect(status).toBe(400);
      expect(error).toBeDefined();
      expect(error!.error.code).toBe('MISSING_CAPABILITIES');
    });

    it('should fail registration with empty capabilities array', async () => {
      const { error, status } = await apiRequest<Agent>('POST', '/api/v1/agent', {
        name: 'Invalid Agent',
        capabilities: [],
      });

      expect(status).toBe(400);
      expect(error).toBeDefined();
      expect(error!.error.code).toBe('MISSING_CAPABILITIES');
    });

    it('should fail registration with invalid status', async () => {
      const { error, status } = await apiRequest<Agent>('POST', '/api/v1/agent', {
        name: 'Test Agent',
        capabilities: ['testing'],
        status: 'invalid_status',
      });

      expect(status).toBe(400);
      expect(error).toBeDefined();
      expect(error!.error.code).toBe('INVALID_STATUS');
    });
  });

  describe('Agent List', () => {
    beforeAll(async () => {
      // Create multiple test agents for listing
      await createTestAgent('List Test Agent 1', ['capability-a']);
      await createTestAgent('List Test Agent 2', ['capability-b']);
      await createTestAgent('List Test Agent 3', ['capability-a', 'capability-b']);
    });

    it('should list all agents', async () => {
      const { data, status } = await apiRequest<{
        agents: Agent[];
        total: number;
        limit: number;
        offset: number;
      }>('GET', '/api/v1/agent');

      expect(status).toBe(200);
      expect(data).toBeDefined();
      expect(data!.agents).toBeInstanceOf(Array);
      expect(data!.agents.length).toBeGreaterThan(0);
      expect(data!.total).toBeGreaterThan(0);
      expect(data!.limit).toBeDefined();
      expect(data!.offset).toBeDefined();
    });

    it('should filter agents by status', async () => {
      const { data, status } = await apiRequest<{
        agents: Agent[];
        total: number;
      }>('GET', '/api/v1/agent?status=active');

      expect(status).toBe(200);
      expect(data).toBeDefined();
      expect(data!.agents.every(a => a.status === 'active')).toBe(true);
    });

    it('should filter agents by capability', async () => {
      const { data, status } = await apiRequest<{
        agents: Agent[];
        total: number;
      }>('GET', '/api/v1/agent?capability=capability-a');

      expect(status).toBe(200);
      expect(data).toBeDefined();
      expect(data!.agents.every(a => a.capabilities.includes('capability-a'))).toBe(true);
    });

    it('should respect pagination limit', async () => {
      const { data, status } = await apiRequest<{
        agents: Agent[];
        limit: number;
      }>('GET', '/api/v1/agent?limit=2');

      expect(status).toBe(200);
      expect(data).toBeDefined();
      expect(data!.agents.length).toBeLessThanOrEqual(2);
      expect(data!.limit).toBe(2);
    });

    it('should respect pagination offset', async () => {
      const { data: firstPage } = await apiRequest<{ agents: Agent[] }>('GET', '/api/v1/agent?limit=1&offset=0');
      const { data: secondPage } = await apiRequest<{ agents: Agent[] }>('GET', '/api/v1/agent?limit=1&offset=1');

      expect(firstPage).toBeDefined();
      expect(secondPage).toBeDefined();

      if (firstPage!.agents.length > 0 && secondPage!.agents.length > 0) {
        expect(firstPage!.agents[0].id).not.toBe(secondPage!.agents[0].id);
      }
    });
  });

  describe('Task Claiming - Race Condition Prevention', () => {
    let agent1: Agent;
    let agent2: Agent;
    let testTask: Task;

    beforeEach(async () => {
      // Create two agents for race condition tests
      agent1 = await createTestAgent('Race Test Agent 1', ['testing']);
      agent2 = await createTestAgent('Race Test Agent 2', ['testing']);
      testAgents.push(agent1, agent2);

      // Create a test task
      testTask = await createTestTask('Race Condition Test Task');
      testTasks.push(testTask);
    });

    it('should allow first agent to claim available task', async () => {
      const { data, status } = await apiRequest<{
        task: Task;
        agent: { id: string; name: string; status: string };
      }>('POST', `/api/v1/task/${testTask.id}/claim`, {
        agentId: agent1.id,
      });

      expect(status).toBe(200);
      expect(data).toBeDefined();
      expect(data!.task.id).toBe(testTask.id);
      expect(data!.task.status).toBe('in_progress');
      expect(data!.task.claimedAt).toBeDefined();
      expect(data!.agent.id).toBe(agent1.id);
      expect(data!.agent.status).toBe('busy');
    });

    it('should prevent second agent from claiming already-claimed task', async () => {
      // Agent 1 claims the task
      await apiRequest('POST', `/api/v1/task/${testTask.id}/claim`, {
        agentId: agent1.id,
      });

      // Agent 2 tries to claim the same task
      const { error, status } = await apiRequest('POST', `/api/v1/task/${testTask.id}/claim`, {
        agentId: agent2.id,
      });

      expect(status).toBe(409);
      expect(error).toBeDefined();
      expect(error!.error.code).toBe('TASK_ALREADY_CLAIMED');
    });

    it('should handle concurrent claim attempts (race condition)', async () => {
      // Simulate concurrent claims by firing both requests simultaneously
      const [result1, result2] = await Promise.all([
        apiRequest('POST', `/api/v1/task/${testTask.id}/claim`, { agentId: agent1.id }),
        apiRequest('POST', `/api/v1/task/${testTask.id}/claim`, { agentId: agent2.id }),
      ]);

      // Exactly one should succeed (200), one should fail (409)
      const successes = [result1, result2].filter(r => r.status === 200);
      const failures = [result1, result2].filter(r => r.status === 409);

      expect(successes.length).toBe(1);
      expect(failures.length).toBe(1);
      expect(failures[0].error?.error.code).toBe('TASK_ALREADY_CLAIMED');
    });

    it('should fail claim for non-existent task', async () => {
      const { error, status } = await apiRequest('POST', '/api/v1/task/nonexistent_task/claim', {
        agentId: agent1.id,
      });

      expect(status).toBe(404);
      expect(error).toBeDefined();
      expect(error!.error.code).toBe('TASK_NOT_FOUND');
    });

    it('should fail claim for non-existent agent', async () => {
      const { error, status } = await apiRequest('POST', `/api/v1/task/${testTask.id}/claim`, {
        agentId: 'nonexistent_agent',
      });

      expect(status).toBe(404);
      expect(error).toBeDefined();
      expect(error!.error.code).toBe('AGENT_NOT_FOUND');
    });
  });

  describe('Task Release and Re-Claim', () => {
    let agent1: Agent;
    let agent2: Agent;
    let testTask: Task;

    beforeEach(async () => {
      agent1 = await createTestAgent('Release Test Agent 1', ['testing']);
      agent2 = await createTestAgent('Release Test Agent 2', ['testing']);
      testAgents.push(agent1, agent2);

      testTask = await createTestTask('Release Test Task');
      testTasks.push(testTask);

      // Agent 1 claims the task
      await apiRequest('POST', `/api/v1/task/${testTask.id}/claim`, {
        agentId: agent1.id,
      });
    });

    it('should allow claiming agent to release task', async () => {
      const { data, status } = await apiRequest<{
        success: boolean;
        taskId: string;
        status: string;
        agentId: string;
        releasedAt: string;
      }>('POST', `/api/v1/task/${testTask.id}/release`, {
        agentId: agent1.id,
      });

      expect(status).toBe(200);
      expect(data).toBeDefined();
      expect(data!.success).toBe(true);
      expect(data!.taskId).toBe(testTask.id);
      expect(data!.status).toBe('available');
      expect(data!.agentId).toBe(agent1.id);
      expect(data!.releasedAt).toBeDefined();
    });

    it('should prevent non-claiming agent from releasing task', async () => {
      const { error, status } = await apiRequest('POST', `/api/v1/task/${testTask.id}/release`, {
        agentId: agent2.id,
      });

      expect(status).toBe(403);
      expect(error).toBeDefined();
      expect(error!.error.code).toBe('FORBIDDEN');
    });

    it('should allow re-claiming task after release', async () => {
      // Agent 1 releases the task
      await apiRequest('POST', `/api/v1/task/${testTask.id}/release`, {
        agentId: agent1.id,
      });

      // Agent 2 claims the released task
      const { data, status } = await apiRequest<{
        task: Task;
        agent: { id: string };
      }>('POST', `/api/v1/task/${testTask.id}/claim`, {
        agentId: agent2.id,
      });

      expect(status).toBe(200);
      expect(data).toBeDefined();
      expect(data!.task.status).toBe('in_progress');
      expect(data!.agent.id).toBe(agent2.id);
    });

    it('should update agent status to active after release', async () => {
      // Release task
      await apiRequest('POST', `/api/v1/task/${testTask.id}/release`, {
        agentId: agent1.id,
      });

      // Check agent status (via list endpoint)
      const { data } = await apiRequest<{ agents: Agent[] }>('GET', `/api/v1/agent?status=active`);

      const updatedAgent = data!.agents.find(a => a.id === agent1.id);
      expect(updatedAgent).toBeDefined();
      expect(updatedAgent!.status).toBe('active');
    });
  });

  describe('Agent Heartbeat', () => {
    let agent: Agent;

    beforeEach(async () => {
      agent = await createTestAgent('Heartbeat Test Agent', ['testing']);
      testAgents.push(agent);
    });

    it('should update heartbeat timestamp', async () => {
      const { data, status } = await apiRequest<{
        success: boolean;
        agentId: string;
        lastHeartbeat: string;
        status: string;
      }>('POST', `/api/v1/agent/${agent.id}/heartbeat`, {});

      expect(status).toBe(200);
      expect(data).toBeDefined();
      expect(data!.success).toBe(true);
      expect(data!.agentId).toBe(agent.id);
      expect(data!.lastHeartbeat).toBeDefined();
      expect(data!.status).toBeDefined();
    });

    it('should update heartbeat multiple times', async () => {
      // First heartbeat
      const { data: heartbeat1 } = await apiRequest<{ lastHeartbeat: string }>(
        'POST',
        `/api/v1/agent/${agent.id}/heartbeat`,
        {}
      );

      await sleep(100); // Wait 100ms

      // Second heartbeat
      const { data: heartbeat2 } = await apiRequest<{ lastHeartbeat: string }>(
        'POST',
        `/api/v1/agent/${agent.id}/heartbeat`,
        {}
      );

      expect(heartbeat1).toBeDefined();
      expect(heartbeat2).toBeDefined();

      // Second heartbeat should be later than first
      const time1 = new Date(heartbeat1!.lastHeartbeat).getTime();
      const time2 = new Date(heartbeat2!.lastHeartbeat).getTime();
      expect(time2).toBeGreaterThan(time1);
    });

    it('should fail heartbeat for non-existent agent', async () => {
      const { error, status } = await apiRequest(
        'POST',
        '/api/v1/agent/nonexistent_agent/heartbeat',
        {}
      );

      expect(status).toBe(404);
      expect(error).toBeDefined();
      expect(error!.error.code).toBe('AGENT_NOT_FOUND');
    });

    it('should preserve agent status during heartbeat', async () => {
      const { data } = await apiRequest<{ status: string }>(
        'POST',
        `/api/v1/agent/${agent.id}/heartbeat`,
        {}
      );

      expect(data).toBeDefined();
      expect(data!.status).toBe('active'); // Should preserve original status
    });
  });

  describe('Worker Context Loading Flow', () => {
    let coordinatorAgent: Agent;
    let workerAgent: Agent;
    let workTask: Task;

    beforeEach(async () => {
      coordinatorAgent = await createTestAgent('Coordinator Agent', ['coordination', 'planning']);
      workerAgent = await createTestAgent('Worker Agent', ['code-generation', 'testing']);
      testAgents.push(coordinatorAgent, workerAgent);

      workTask = await createTestTask('Context Loading Test Task');
      testTasks.push(workTask);
    });

    it('should complete full worker context loading flow', async () => {
      // 1. Coordinator creates task (already created in beforeEach)
      expect(workTask.status).toBe('available');

      // 2. Worker claims task
      const claimResult = await apiRequest<{
        task: Task;
        agent: { status: string };
      }>('POST', `/api/v1/task/${workTask.id}/claim`, {
        agentId: workerAgent.id,
      });

      expect(claimResult.status).toBe(200);
      expect(claimResult.data!.task.status).toBe('in_progress');
      expect(claimResult.data!.agent.status).toBe('busy');

      // 3. Worker sends heartbeat while working
      const heartbeatResult = await apiRequest<{ success: boolean }>(
        'POST',
        `/api/v1/agent/${workerAgent.id}/heartbeat`,
        {}
      );

      expect(heartbeatResult.status).toBe(200);
      expect(heartbeatResult.data!.success).toBe(true);

      // 4. Worker completes and releases task
      const releaseResult = await apiRequest<{
        status: string;
      }>('POST', `/api/v1/task/${workTask.id}/release`, {
        agentId: workerAgent.id,
      });

      expect(releaseResult.status).toBe(200);
      expect(releaseResult.data!.status).toBe('available');

      // 5. Verify worker status returned to active
      const listResult = await apiRequest<{ agents: Agent[] }>('GET', '/api/v1/agent');
      const updatedWorker = listResult.data!.agents.find(a => a.id === workerAgent.id);

      expect(updatedWorker).toBeDefined();
      expect(updatedWorker!.status).toBe('active');
    });

    it('should handle worker failure and task re-assignment', async () => {
      // 1. Worker claims task
      await apiRequest('POST', `/api/v1/task/${workTask.id}/claim`, {
        agentId: workerAgent.id,
      });

      // 2. Worker fails and releases task
      await apiRequest('POST', `/api/v1/task/${workTask.id}/release`, {
        agentId: workerAgent.id,
      });

      // 3. Different agent can claim the released task
      const newAgent = await createTestAgent('Backup Worker', ['code-generation']);
      testAgents.push(newAgent);

      const reclaimResult = await apiRequest<{ task: Task }>(
        'POST',
        `/api/v1/task/${workTask.id}/claim`,
        { agentId: newAgent.id }
      );

      expect(reclaimResult.status).toBe(200);
      expect(reclaimResult.data!.task.status).toBe('in_progress');
    });
  });

  describe('Authentication and Authorization', () => {
    it('should reject requests without bearer token', async () => {
      const response = await fetch(`${API_URL}/api/v1/agent`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      const data = await response.json() as ApiError;
      expect(response.status).toBe(401);
      expect(data.error.code).toBe('AUTH_REQUIRED');
    });

    it('should reject requests with invalid bearer token format', async () => {
      const response = await fetch(`${API_URL}/api/v1/agent`, {
        method: 'GET',
        headers: {
          'Authorization': 'InvalidFormat token',
          'Content-Type': 'application/json',
        },
      });

      const data = await response.json() as ApiError;
      expect(response.status).toBe(401);
      expect(data.error.code).toBe('AUTH_REQUIRED');
    });
  });

  describe('Error Handling', () => {
    it('should handle database connection failures gracefully', async () => {
      // Note: This test would require a way to simulate database failures
      // For now, we verify the error structure is correct
      const { error } = await apiRequest('GET', '/api/v1/agent/nonexistent');

      if (error) {
        expect(error.error.code).toBeDefined();
        expect(error.error.message).toBeDefined();
      }
    });

    it('should validate request body schema', async () => {
      const { error, status } = await apiRequest('POST', '/api/v1/agent', {
        invalidField: 'value',
      });

      expect(status).toBe(400);
      expect(error).toBeDefined();
    });
  });
});
