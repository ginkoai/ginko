/**
 * @fileType: test
 * @status: current
 * @updated: 2026-02-03
 * @tags: [test, api, task-sync, sprint-merge, adhoc_260203_s01_t02]
 * @related: [../route.ts, ../../../../graph/hierarchy/route.ts]
 * @priority: high
 * @complexity: medium
 * @dependencies: [jest]
 */

/**
 * Tests for POST /api/v1/task/sync - Sprint MERGE enrichment
 *
 * Context: The task sync route creates Sprint nodes via MERGE when creating
 * Task->Sprint relationships. This test suite verifies that the Sprint MERGE
 * includes essential properties (title, epic_id, status) so the hierarchy
 * route can discover sprints under epics.
 *
 * Test Categories:
 * 1. Sprint MERGE Cypher - ON CREATE SET includes title, epic_id, status
 * 2. Sprint MERGE Cypher - ON MATCH SET preserves status (ADR-060)
 * 3. Request Validation - Body validation for sync requests
 * 4. Sprint Title Passthrough - sprint_title flows from task data
 * 5. Epic MERGE Cypher - Relationship creation for Sprint->Epic
 */

// --- Mock setup ---
// Capture all Cypher queries and their parameters for inspection
const capturedQueries: Array<{ cypher: string; params: Record<string, unknown> }> = [];

// We define the mock tx.run as a var so it can be referenced before the jest.mock call
// (jest.mock is hoisted to the top by babel-jest, var declarations are hoisted too)
var mockTxRun: jest.Mock;
var mockSessionClose: jest.Mock;
var mockExecuteWrite: jest.Mock;

// Initialize the mocks (these run in declaration order, before jest.mock factory executes at runtime)
mockTxRun = jest.fn().mockImplementation((cypher: string, params: Record<string, unknown> = {}) => {
  capturedQueries.push({ cypher, params });
  return Promise.resolve({
    records: [{
      get: (key: string) => {
        if (key === 'action') return 'created';
        if (key === 'id') return params.taskId || 'test-task';
        if (key === 'count') return { toNumber: () => 1 };
        return null;
      },
    }],
  });
});

mockSessionClose = jest.fn().mockResolvedValue(undefined);

mockExecuteWrite = jest.fn().mockImplementation(async (work: (tx: any) => Promise<any>) => {
  return work({ run: mockTxRun });
});

// Mock the Neo4j module BEFORE route.ts gets imported
// jest.mock is hoisted to the top by babel-jest; var declarations are also hoisted
jest.mock('../../../graph/_neo4j', () => ({
  __esModule: true,
  verifyConnection: jest.fn().mockResolvedValue(true),
  getSession: jest.fn().mockReturnValue({
    executeWrite: mockExecuteWrite,
    executeRead: jest.fn(),
    close: mockSessionClose,
  }),
}));

// Import the route AFTER mock is declared
import { POST } from '../route';

// --- Helpers ---

function createMockRequest(body: unknown, headers?: Record<string, string>): Request {
  const defaultHeaders: Record<string, string> = {
    'content-type': 'application/json',
    'authorization': 'Bearer test-token-123',
    ...headers,
  };

  return new Request('http://localhost:3000/api/v1/task/sync', {
    method: 'POST',
    headers: defaultHeaders,
    body: JSON.stringify(body),
  });
}

function makeTask(overrides: Record<string, unknown> = {}) {
  return {
    id: 'e005_s01_t01',
    sprint_id: 'e005_s01',
    epic_id: 'EPIC-5',
    title: 'Implement feature X',
    sprint_title: 'Sprint 1 - Feature X',
    estimate: '2h',
    priority: 'HIGH',
    assignee: 'dev@example.com',
    initial_status: 'not_started',
    goal: 'Complete the feature',
    approach: 'Use existing patterns',
    acceptance_criteria: ['Tests pass', 'Code reviewed'],
    files: ['src/feature.ts'],
    related_adrs: ['ADR-001'],
    ...overrides,
  };
}

function makeSyncBody(overrides: Record<string, unknown> = {}) {
  return {
    graphId: 'test-graph-id',
    tasks: [makeTask()],
    createRelationships: true,
    ...overrides,
  };
}

/** Find captured queries whose Cypher text matches a pattern. */
function findQueries(pattern: RegExp) {
  return capturedQueries.filter((q) => pattern.test(q.cypher));
}

// --- Tests ---

describe('POST /api/v1/task/sync', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    capturedQueries.length = 0;

    // Re-apply default mock implementations after clearAllMocks
    mockTxRun.mockImplementation((cypher: string, params: Record<string, unknown> = {}) => {
      capturedQueries.push({ cypher, params });
      return Promise.resolve({
        records: [{
          get: (key: string) => {
            if (key === 'action') return 'created';
            if (key === 'id') return params.taskId || 'test-task';
            if (key === 'count') return { toNumber: () => 1 };
            return null;
          },
        }],
      });
    });

    mockExecuteWrite.mockImplementation(async (work: (tx: any) => Promise<any>) => {
      return work({ run: mockTxRun });
    });

    mockSessionClose.mockResolvedValue(undefined);

    // Re-wire the mocked module's getSession to use fresh mock references
    const neo4jMock = require('../../../graph/_neo4j');
    neo4jMock.verifyConnection.mockResolvedValue(true);
    neo4jMock.getSession.mockReturnValue({
      executeWrite: mockExecuteWrite,
      executeRead: jest.fn(),
      close: mockSessionClose,
    });
  });

  // =====================================================================
  // 1. Sprint MERGE - ON CREATE SET enrichment
  // =====================================================================
  describe('Sprint MERGE - ON CREATE SET', () => {
    it('should include title in Sprint ON CREATE SET', async () => {
      const body = makeSyncBody();
      const request = createMockRequest(body);

      await POST(request as any);

      const sprintMerges = findQueries(/MERGE \(s:Sprint/);
      expect(sprintMerges.length).toBeGreaterThanOrEqual(1);

      const sprintCypher = sprintMerges[0].cypher;
      expect(sprintCypher).toMatch(/ON CREATE SET[\s\S]*s\.title\s*=/);
    });

    it('should include epic_id in Sprint ON CREATE SET', async () => {
      const body = makeSyncBody();
      const request = createMockRequest(body);

      await POST(request as any);

      const sprintMerges = findQueries(/MERGE \(s:Sprint/);
      expect(sprintMerges.length).toBeGreaterThanOrEqual(1);

      const sprintCypher = sprintMerges[0].cypher;
      expect(sprintCypher).toMatch(/ON CREATE SET[\s\S]*s\.epic_id\s*=/);
    });

    it('should include status in Sprint ON CREATE SET', async () => {
      const body = makeSyncBody();
      const request = createMockRequest(body);

      await POST(request as any);

      const sprintMerges = findQueries(/MERGE \(s:Sprint/);
      expect(sprintMerges.length).toBeGreaterThanOrEqual(1);

      const sprintCypher = sprintMerges[0].cypher;
      expect(sprintCypher).toMatch(/ON CREATE SET[\s\S]*s\.status\s*=/);
    });

    it('should pass sprintTitle parameter to Sprint MERGE query', async () => {
      const task = makeTask({ sprint_title: 'My Custom Sprint Title' });
      const body = makeSyncBody({ tasks: [task] });
      const request = createMockRequest(body);

      await POST(request as any);

      const sprintMerges = findQueries(/MERGE \(s:Sprint/);
      expect(sprintMerges.length).toBeGreaterThanOrEqual(1);

      const params = sprintMerges[0].params;
      const allValues = Object.values(params);
      const hasSprintTitle = allValues.some(
        (v) => v === 'My Custom Sprint Title' || v === 'Sprint 1 - Feature X'
      );
      const hasTitleParam = Object.keys(params).some(
        (k) => k.toLowerCase().includes('title') || k.toLowerCase().includes('sprinttitle')
      );
      expect(hasSprintTitle || hasTitleParam).toBe(true);
    });

    it('should pass epicId parameter to Sprint MERGE query', async () => {
      const task = makeTask({ epic_id: 'EPIC-42' });
      const body = makeSyncBody({ tasks: [task] });
      const request = createMockRequest(body);

      await POST(request as any);

      const sprintMerges = findQueries(/MERGE \(s:Sprint/);
      expect(sprintMerges.length).toBeGreaterThanOrEqual(1);

      const params = sprintMerges[0].params;
      const allValues = Object.values(params);
      expect(allValues).toContain('EPIC-42');
    });

    it('should set initial status to not_started for new sprints', async () => {
      const body = makeSyncBody();
      const request = createMockRequest(body);

      await POST(request as any);

      const sprintMerges = findQueries(/MERGE \(s:Sprint/);
      expect(sprintMerges.length).toBeGreaterThanOrEqual(1);

      const sprintCypher = sprintMerges[0].cypher;
      const setsStatus = /s\.status\s*=\s*(\$\w+|'not_started')/.test(sprintCypher);
      expect(setsStatus).toBe(true);
    });
  });

  // =====================================================================
  // 2. Sprint MERGE - ON MATCH SET preserves status (ADR-060)
  // =====================================================================
  describe('Sprint MERGE - ON MATCH SET (ADR-060: graph-authoritative state)', () => {
    it('should NOT overwrite status on MATCH (graph is authoritative)', async () => {
      const body = makeSyncBody();
      const request = createMockRequest(body);

      await POST(request as any);

      const sprintMerges = findQueries(/MERGE \(s:Sprint/);
      expect(sprintMerges.length).toBeGreaterThanOrEqual(1);

      const sprintCypher = sprintMerges[0].cypher;

      // If there is an ON MATCH SET clause, it must NOT set s.status
      const onMatchBlock = sprintCypher.match(/ON MATCH SET([\s\S]*?)(?:RETURN|MERGE|$)/);
      if (onMatchBlock) {
        expect(onMatchBlock[1]).not.toMatch(/s\.status\s*=/);
      }
      // No ON MATCH SET at all is acceptable (status only set on CREATE)
    });

    it('should update synced_at on MATCH', async () => {
      const body = makeSyncBody();
      const request = createMockRequest(body);

      await POST(request as any);

      const sprintMerges = findQueries(/MERGE \(s:Sprint/);
      expect(sprintMerges.length).toBeGreaterThanOrEqual(1);

      const sprintCypher = sprintMerges[0].cypher;

      const hasAnySyncedAt = /s\.synced_at\s*=\s*datetime\(\)/.test(sprintCypher);
      expect(hasAnySyncedAt).toBe(true);

      if (/ON MATCH SET/.test(sprintCypher)) {
        const hasOnMatchSyncedAt = /ON MATCH SET[\s\S]*s\.synced_at\s*=\s*datetime\(\)/.test(sprintCypher);
        expect(hasOnMatchSyncedAt).toBe(true);
      }
    });
  });

  // =====================================================================
  // 3. Request body validation
  // =====================================================================
  describe('Request Validation', () => {
    it('should return 400 when graphId is missing', async () => {
      const body = makeSyncBody({ graphId: '' });
      const request = createMockRequest(body);

      const response = await POST(request as any);
      const json = await response.json();

      expect(response.status).toBe(400);
      expect(json.error.code).toBe('MISSING_GRAPH_ID');
    });

    it('should return 400 when graphId is whitespace-only', async () => {
      const body = makeSyncBody({ graphId: '   ' });
      const request = createMockRequest(body);

      const response = await POST(request as any);
      const json = await response.json();

      expect(response.status).toBe(400);
      expect(json.error.code).toBe('MISSING_GRAPH_ID');
    });

    it('should return 400 when tasks array is empty', async () => {
      const body = makeSyncBody({ tasks: [] });
      const request = createMockRequest(body);

      const response = await POST(request as any);
      const json = await response.json();

      expect(response.status).toBe(400);
      expect(json.error.code).toBe('INVALID_TASKS');
    });

    it('should return 401 when authorization header is missing', async () => {
      const body = makeSyncBody();
      const reqNoAuth = new Request('http://localhost:3000/api/v1/task/sync', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify(body),
      });

      const response = await POST(reqNoAuth as any);
      const json = await response.json();

      expect(response.status).toBe(401);
      expect(json.error.code).toBe('AUTH_REQUIRED');
    });

    it('should return 401 when authorization header is not Bearer', async () => {
      const body = makeSyncBody();
      const request = createMockRequest(body, { authorization: 'Basic abc123' });

      const response = await POST(request as any);
      const json = await response.json();

      expect(response.status).toBe(401);
      expect(json.error.code).toBe('AUTH_REQUIRED');
    });

    it('should skip tasks with missing required fields', async () => {
      const validTask = makeTask({ id: 'e005_s01_t01' });
      const invalidTask = makeTask({ id: '', title: '' });

      const body = makeSyncBody({ tasks: [invalidTask, validTask] });
      const request = createMockRequest(body);

      const response = await POST(request as any);
      const json = await response.json();

      expect(response.status).toBe(200);
      expect(json.success).toBe(true);
      expect(json.tasks).toContain('e005_s01_t01');
    });
  });

  // =====================================================================
  // 4. Sprint title passthrough from task data
  // =====================================================================
  describe('Sprint Title Passthrough', () => {
    it('should reference title in Sprint MERGE Cypher', async () => {
      const task = makeTask();
      const body = makeSyncBody({ tasks: [task] });
      const request = createMockRequest(body);

      await POST(request as any);

      const sprintMerges = findQueries(/MERGE \(s:Sprint/);
      expect(sprintMerges.length).toBeGreaterThanOrEqual(1);

      const sprintCypher = sprintMerges[0].cypher;
      expect(sprintCypher).toMatch(/s\.title/);
    });

    it('should process multiple tasks with different sprints', async () => {
      const task1 = makeTask({
        id: 'e005_s01_t01',
        sprint_id: 'e005_s01',
        sprint_title: 'Sprint 1',
      });
      const task2 = makeTask({
        id: 'e005_s02_t01',
        sprint_id: 'e005_s02',
        sprint_title: 'Sprint 2',
      });

      const body = makeSyncBody({ tasks: [task1, task2] });
      const request = createMockRequest(body);

      await POST(request as any);

      const sprintMerges = findQueries(/MERGE \(s:Sprint/);
      expect(sprintMerges.length).toBeGreaterThanOrEqual(2);

      const sprintIds = sprintMerges.map((q) => q.params.sprintId);
      expect(sprintIds).toContain('e005_s01');
      expect(sprintIds).toContain('e005_s02');
    });
  });

  // =====================================================================
  // 5. Epic MERGE relationship
  // =====================================================================
  describe('Epic MERGE Relationship', () => {
    it('should create Sprint->Epic BELONGS_TO relationship', async () => {
      const body = makeSyncBody();
      const request = createMockRequest(body);

      await POST(request as any);

      const epicMerges = findQueries(/MERGE \(e:Epic/);
      expect(epicMerges.length).toBeGreaterThanOrEqual(1);

      const epicCypher = epicMerges[0].cypher;
      expect(epicCypher).toMatch(/MERGE \(s\)-\[r:BELONGS_TO\]->\(e\)/);
    });

    it('should pass epicId to Epic MERGE query', async () => {
      const task = makeTask({ epic_id: 'EPIC-99' });
      const body = makeSyncBody({ tasks: [task] });
      const request = createMockRequest(body);

      await POST(request as any);

      const epicMerges = findQueries(/MERGE \(e:Epic/);
      expect(epicMerges.length).toBeGreaterThanOrEqual(1);

      expect(epicMerges[0].params.epicId).toBe('EPIC-99');
    });

    it('should not create relationships when createRelationships is false', async () => {
      const body = makeSyncBody({ createRelationships: false });
      const request = createMockRequest(body);

      await POST(request as any);

      const taskMerges = findQueries(/MERGE \(t:Task/);
      const sprintMerges = findQueries(/MERGE \(s:Sprint/);
      const epicMerges = findQueries(/MERGE \(e:Epic/);

      expect(taskMerges.length).toBeGreaterThanOrEqual(1);
      expect(sprintMerges.length).toBe(0);
      expect(epicMerges.length).toBe(0);
    });
  });

  // =====================================================================
  // 6. Task MERGE correctness (baseline)
  // =====================================================================
  describe('Task MERGE Baseline', () => {
    it('should MERGE task with correct id and graph_id', async () => {
      const body = makeSyncBody();
      const request = createMockRequest(body);

      await POST(request as any);

      const taskMerges = findQueries(/MERGE \(t:Task/);
      expect(taskMerges.length).toBe(1);
      expect(taskMerges[0].params.taskId).toBe('e005_s01_t01');
      expect(taskMerges[0].params.graphId).toBe('test-graph-id');
    });

    it('should set initial_status on Task ON CREATE', async () => {
      const body = makeSyncBody();
      const request = createMockRequest(body);

      await POST(request as any);

      const taskMerges = findQueries(/MERGE \(t:Task/);
      expect(taskMerges.length).toBe(1);

      const cypher = taskMerges[0].cypher;
      expect(cypher).toMatch(/ON CREATE SET[\s\S]*t\.status\s*=\s*\$initialStatus/);
    });

    it('should NOT overwrite status on Task ON MATCH (ADR-060)', async () => {
      const body = makeSyncBody();
      const request = createMockRequest(body);

      await POST(request as any);

      const taskMerges = findQueries(/MERGE \(t:Task/);
      expect(taskMerges.length).toBe(1);

      const cypher = taskMerges[0].cypher;
      const onMatchBlock = cypher.match(/ON MATCH SET([\s\S]*?)RETURN/);
      if (onMatchBlock) {
        expect(onMatchBlock[1]).not.toMatch(/t\.status\s*=/);
      }
    });

    it('should return correct created count', async () => {
      const body = makeSyncBody();
      const request = createMockRequest(body);

      const response = await POST(request as any);
      const json = await response.json();

      expect(response.status).toBe(200);
      expect(json.success).toBe(true);
      expect(json.created).toBe(1);
      expect(json.tasks).toEqual(['e005_s01_t01']);
    });
  });

  // =====================================================================
  // 7. Service availability
  // =====================================================================
  describe('Service Availability', () => {
    it('should return 503 when Neo4j is unavailable', async () => {
      const neo4jMock = require('../../../graph/_neo4j');
      neo4jMock.verifyConnection.mockResolvedValueOnce(false);

      const body = makeSyncBody();
      const request = createMockRequest(body);

      const response = await POST(request as any);
      const json = await response.json();

      expect(response.status).toBe(503);
      expect(json.error.code).toBe('SERVICE_UNAVAILABLE');
    });
  });

  // =====================================================================
  // 8. Hierarchy compatibility
  // =====================================================================
  describe('Hierarchy Route Compatibility', () => {
    it('Sprint MERGE should set properties that hierarchy route queries', async () => {
      // The hierarchy route queries Sprint nodes for: s.id, s.title, s.status, s.epic_id
      const body = makeSyncBody();
      const request = createMockRequest(body);

      await POST(request as any);

      const sprintMerges = findQueries(/MERGE \(s:Sprint/);
      expect(sprintMerges.length).toBeGreaterThanOrEqual(1);

      const sprintCypher = sprintMerges[0].cypher;

      // id and graph_id are set in the MERGE pattern itself
      expect(sprintCypher).toMatch(/MERGE \(s:Sprint \{id: \$sprintId, graph_id: \$graphId\}\)/);

      // title must be set (hierarchy queries s.title)
      expect(sprintCypher).toMatch(/s\.title/);

      // epic_id must be set (hierarchy filters WHERE s.epic_id IN ...)
      expect(sprintCypher).toMatch(/s\.epic_id/);

      // status must be set (hierarchy queries s.status)
      expect(sprintCypher).toMatch(/s\.status/);
    });

    it('Sprint MERGE params should include all hierarchy-required values', async () => {
      const task = makeTask({
        sprint_id: 'e005_s01',
        epic_id: 'EPIC-5',
        sprint_title: 'Feature Sprint',
      });
      const body = makeSyncBody({ tasks: [task] });
      const request = createMockRequest(body);

      await POST(request as any);

      const sprintMerges = findQueries(/MERGE \(s:Sprint/);
      expect(sprintMerges.length).toBeGreaterThanOrEqual(1);

      const params = sprintMerges[0].params;

      expect(params.sprintId).toBe('e005_s01');
      expect(params.graphId).toBe('test-graph-id');

      const allValues = Object.values(params);
      expect(allValues).toContain('EPIC-5');
    });
  });

  // =====================================================================
  // 9. Session cleanup
  // =====================================================================
  describe('Session Management', () => {
    it('should close the Neo4j session after processing', async () => {
      const body = makeSyncBody();
      const request = createMockRequest(body);

      await POST(request as any);

      expect(mockSessionClose).toHaveBeenCalled();
    });

    it('should close session even on error', async () => {
      mockExecuteWrite.mockRejectedValueOnce(new Error('DB error'));

      const body = makeSyncBody();
      const request = createMockRequest(body);

      const response = await POST(request as any);
      const json = await response.json();

      expect(response.status).toBe(500);
      expect(json.error.code).toBe('INTERNAL_ERROR');
      expect(mockSessionClose).toHaveBeenCalled();
    });
  });
});
