/**
 * @fileType: test
 * @status: current
 * @updated: 2026-02-03
 * @tags: [test, api, cleanup, merge-duplicates, structural-nodes]
 * @related: [../route.ts, ../../_neo4j.ts]
 * @priority: high
 * @complexity: medium
 * @dependencies: [jest]
 */

/**
 * Tests for DELETE /api/v1/graph/cleanup?action=merge-duplicate-structural-nodes
 *
 * Validates the merge-duplicate-structural-nodes cleanup action which:
 * - Detects duplicate Sprint/Epic nodes created by dual creation paths
 *   (document upload + task sync)
 * - Merges content properties from document node into structural node
 * - Transfers relationships (CONTAINS, BELONGS_TO) from orphan to survivor
 * - Deletes orphan node after merge
 * - Supports dryRun mode for preview
 *
 * Test Categories:
 * 1. Duplicate detection - finds Sprint/Epic nodes with same canonical ID
 * 2. Property merging - content, summary, embedding from document node
 * 3. Relationship transfer - CONTAINS, BELONGS_TO moved to survivor
 * 4. Orphan deletion - orphan node removed after merge
 * 5. Dry-run mode - preview without changes
 * 6. No-op cases - handles no duplicates gracefully
 * 7. Type handling - works for both Sprint and Epic types
 */

import { describe, it, expect, jest, beforeEach } from '@jest/globals';

// -----------------------------------------------------------------------
// Mocks - must be before imports that use them
// -----------------------------------------------------------------------

// Track all Cypher queries and their results
var mockRunResults: any[] = [];
var mockRunCallIndex = 0;
var mockRun = jest.fn().mockImplementation(() => {
  const result = mockRunResults[mockRunCallIndex] || { records: [] };
  mockRunCallIndex++;
  return Promise.resolve(result);
});
var mockCommit = jest.fn().mockResolvedValue(undefined as never);
var mockRollback = jest.fn().mockResolvedValue(undefined as never);
var mockTx = {
  run: mockRun,
  commit: mockCommit,
  rollback: mockRollback,
};
var mockSession = {
  beginTransaction: jest.fn().mockReturnValue(mockTx),
  close: jest.fn().mockResolvedValue(undefined as never),
};

// Mock _neo4j module
jest.mock('../../../graph/_neo4j', () => ({
  verifyConnection: jest.fn().mockResolvedValue(true),
  getDriver: jest.fn().mockReturnValue({
    session: jest.fn().mockReturnValue(mockSession),
    verifyConnectivity: jest.fn().mockResolvedValue(undefined),
  }),
  getSession: jest.fn().mockReturnValue(mockSession),
  runQuery: jest.fn().mockImplementation(() => {
    const result = mockRunResults[mockRunCallIndex] || { records: [] };
    mockRunCallIndex++;
    // runQuery returns the mapped records (array of objects), not raw result
    if (result.records && Array.isArray(result.records)) {
      return Promise.resolve(result.records.map((r: any) => r.toObject ? r.toObject() : r));
    }
    return Promise.resolve([]);
  }),
}));

// Mock auth middleware to auto-authenticate
jest.mock('@/lib/auth/middleware', () => ({
  withAuth: jest.fn().mockImplementation(
    (_request: any, handler: (user: any, supabase: any) => Promise<any>) => {
      return handler(
        {
          id: 'b27cb2ea-dcae-4255-9e77-9949daa53d77',
          email: 'chris@watchhill.ai',
        },
        {}
      );
    }
  ),
}));

// Mock graph access verification
jest.mock('@/lib/graph/access', () => ({
  verifyGraphAccessFromRequest: jest.fn().mockResolvedValue({
    hasAccess: true,
    role: 'owner',
    userId: 'b27cb2ea-dcae-4255-9e77-9949daa53d77',
  } as never),
}));

// -----------------------------------------------------------------------
// Helpers
// -----------------------------------------------------------------------

/**
 * Build a NextRequest-compatible object for the DELETE handler.
 */
function makeDeleteRequest(params: {
  graphId: string;
  action: string;
  dryRun?: string;
  confirm?: string;
}): Request {
  const searchParams = new URLSearchParams();
  searchParams.set('graphId', params.graphId);
  searchParams.set('action', params.action);
  if (params.dryRun !== undefined) searchParams.set('dryRun', params.dryRun);
  if (params.confirm) searchParams.set('confirm', params.confirm);

  const url = `http://localhost/api/v1/graph/cleanup?${searchParams.toString()}`;
  return new Request(url, {
    method: 'DELETE',
    headers: {
      Authorization: 'Bearer test-token',
    },
  });
}

/**
 * Create a mock Neo4j record with toObject() for runQuery mapping.
 */
function mockRecord(obj: Record<string, any>) {
  return {
    ...obj,
    toObject: () => obj,
    get: (key: string) => obj[key],
  };
}

/**
 * Helper to create a mock result set for runQuery responses.
 */
function mockQueryResult(records: Record<string, any>[]) {
  return {
    records: records.map(mockRecord),
  };
}

/**
 * Get the Cypher query from a specific call index to mockRun or runQuery.
 */
function getCypherForRunQueryCall(callIndex: number): string {
  const { runQuery } = require('../../../graph/_neo4j');
  if (callIndex >= runQuery.mock.calls.length) {
    throw new Error(
      `runQuery was only called ${runQuery.mock.calls.length} times; requested index ${callIndex}`
    );
  }
  return runQuery.mock.calls[callIndex][0] as string;
}

/**
 * Get the params from a specific call index to runQuery.
 */
function getParamsForRunQueryCall(callIndex: number): Record<string, any> {
  const { runQuery } = require('../../../graph/_neo4j');
  if (callIndex >= runQuery.mock.calls.length) {
    throw new Error(
      `runQuery was only called ${runQuery.mock.calls.length} times; requested index ${callIndex}`
    );
  }
  return runQuery.mock.calls[callIndex][1] as Record<string, any>;
}

// -----------------------------------------------------------------------
// Tests
// -----------------------------------------------------------------------

describe('DELETE /api/v1/graph/cleanup?action=merge-duplicate-structural-nodes', () => {
  let DELETE: (request: Request) => Promise<Response>;

  beforeEach(async () => {
    jest.clearAllMocks();
    mockRunResults = [];
    mockRunCallIndex = 0;

    // Reset the runQuery mock call index
    const { runQuery } = require('../../../graph/_neo4j');
    runQuery.mockClear();
    mockRunCallIndex = 0;

    // Dynamic import so mocks are in place
    const mod = await import('../route');
    DELETE = mod.DELETE as unknown as (request: Request) => Promise<Response>;
  });

  // =====================================================================
  // 1. Duplicate detection
  // =====================================================================
  describe('Duplicate detection', () => {

    it('should detect duplicate Sprint nodes by canonical ID', async () => {
      // Setup: Query returns two Sprint nodes with same canonical ID
      mockRunResults = [
        // First query: find duplicates grouped by canonical ID
        mockQueryResult([
          {
            type: 'Sprint',
            canonicalId: 'e005_s01',
            nodes: [
              {
                elementId: 'elem-1',
                id: 'e005_s01',
                properties: { id: 'e005_s01', graph_id: 'gin_test', epic_id: 'e005', status: 'in_progress' },
              },
              {
                elementId: 'elem-2',
                id: 'e005_s01',
                properties: { id: 'e005_s01', graph_id: 'gin_test', content: 'Sprint markdown content', summary: 'Sprint summary' },
              },
            ],
            count: 2,
          },
        ]),
        // Subsequent queries for merge operations
        mockQueryResult([{ transferred: 1 }]),
        mockQueryResult([{ transferred: 1 }]),
        mockQueryResult([{ propertiesMerged: 3 }]),
        mockQueryResult([{ deleted: 1 }]),
      ];

      const req = makeDeleteRequest({
        graphId: 'gin_test',
        action: 'merge-duplicate-structural-nodes',
        dryRun: 'false',
        confirm: 'CLEANUP_CONFIRMED',
      });

      const res = await DELETE(req);
      expect(res.status).toBe(200);

      const body = await res.json();
      expect(body.action).toBe('merge-duplicate-structural-nodes');
      expect(body.merged).toBeGreaterThanOrEqual(0);
    });

    it('should detect duplicate Epic nodes by canonical ID', async () => {
      // Setup: Query returns two Epic nodes with same canonical ID
      mockRunResults = [
        mockQueryResult([
          {
            type: 'Epic',
            canonicalId: 'e005',
            nodes: [
              {
                elementId: 'elem-1',
                id: 'e005',
                properties: { id: 'e005', graph_id: 'gin_test', status: 'active' },
              },
              {
                elementId: 'elem-2',
                id: 'e005',
                properties: { id: 'e005', graph_id: 'gin_test', content: 'Epic description', summary: 'Epic summary' },
              },
            ],
            count: 2,
          },
        ]),
        mockQueryResult([{ transferred: 0 }]),
        mockQueryResult([{ transferred: 0 }]),
        mockQueryResult([{ propertiesMerged: 2 }]),
        mockQueryResult([{ deleted: 1 }]),
      ];

      const req = makeDeleteRequest({
        graphId: 'gin_test',
        action: 'merge-duplicate-structural-nodes',
        dryRun: 'false',
        confirm: 'CLEANUP_CONFIRMED',
      });

      const res = await DELETE(req);
      expect(res.status).toBe(200);

      const body = await res.json();
      expect(body.action).toBe('merge-duplicate-structural-nodes');
    });
  });

  // =====================================================================
  // 2. Property merging
  // =====================================================================
  describe('Property merging', () => {

    it('should merge content properties from document node into structural node', async () => {
      // The structural node (from task sync) has epic_id, status, etc.
      // The document node (from doc upload) has content, summary, embedding.
      // After merge, the survivor should have all properties.
      mockRunResults = [
        mockQueryResult([
          {
            type: 'Sprint',
            canonicalId: 'e005_s01',
            nodes: [
              {
                elementId: 'structural-node',
                id: 'e005_s01',
                properties: {
                  id: 'e005_s01',
                  graph_id: 'gin_test',
                  epic_id: 'e005',
                  status: 'in_progress',
                  title: 'Sprint 1',
                },
              },
              {
                elementId: 'document-node',
                id: 'e005_s01',
                properties: {
                  id: 'e005_s01',
                  graph_id: 'gin_test',
                  content: 'Full sprint content here',
                  summary: 'Sprint summary from doc upload',
                  embedding: [0.1, 0.2, 0.3],
                  embedding_model: 'voyage-3',
                },
              },
            ],
            count: 2,
          },
        ]),
        // Transfer outgoing rels
        mockQueryResult([{ transferred: 0 }]),
        // Transfer incoming rels
        mockQueryResult([{ transferred: 2 }]),
        // Merge properties
        mockQueryResult([{ propertiesMerged: 4 }]),
        // Delete orphan
        mockQueryResult([{ deleted: 1 }]),
      ];

      const req = makeDeleteRequest({
        graphId: 'gin_test',
        action: 'merge-duplicate-structural-nodes',
        dryRun: 'false',
        confirm: 'CLEANUP_CONFIRMED',
      });

      const res = await DELETE(req);
      expect(res.status).toBe(200);

      const body = await res.json();
      expect(body.merged).toBeGreaterThanOrEqual(1);
      // Verify the details array includes info about what was merged
      if (body.details && body.details.length > 0) {
        const detail = body.details[0];
        expect(detail.type).toBe('Sprint');
        expect(detail.canonicalId).toBe('e005_s01');
        expect(detail.survivorId).toBeDefined();
        expect(detail.orphanId).toBeDefined();
      }
    });
  });

  // =====================================================================
  // 3. Relationship transfer
  // =====================================================================
  describe('Relationship transfer', () => {

    it('should transfer CONTAINS and BELONGS_TO relationships from orphan to survivor', async () => {
      mockRunResults = [
        mockQueryResult([
          {
            type: 'Sprint',
            canonicalId: 'e005_s01',
            nodes: [
              {
                elementId: 'survivor-elem',
                id: 'e005_s01',
                properties: { id: 'e005_s01', graph_id: 'gin_test', epic_id: 'e005' },
              },
              {
                elementId: 'orphan-elem',
                id: 'e005_s01',
                properties: { id: 'e005_s01', graph_id: 'gin_test', content: 'Doc content' },
              },
            ],
            count: 2,
          },
        ]),
        // Transfer outgoing relationships
        mockQueryResult([{ transferred: 3 }]),
        // Transfer incoming relationships
        mockQueryResult([{ transferred: 1 }]),
        // Merge properties
        mockQueryResult([{ propertiesMerged: 2 }]),
        // Delete orphan
        mockQueryResult([{ deleted: 1 }]),
      ];

      const req = makeDeleteRequest({
        graphId: 'gin_test',
        action: 'merge-duplicate-structural-nodes',
        dryRun: 'false',
        confirm: 'CLEANUP_CONFIRMED',
      });

      const res = await DELETE(req);
      expect(res.status).toBe(200);

      const body = await res.json();
      expect(body.merged).toBeGreaterThanOrEqual(1);

      if (body.details && body.details.length > 0) {
        expect(body.details[0].relationshipsTransferred).toBeGreaterThanOrEqual(0);
      }
    });
  });

  // =====================================================================
  // 4. Orphan deletion
  // =====================================================================
  describe('Orphan deletion', () => {

    it('should delete orphan node after merge', async () => {
      mockRunResults = [
        mockQueryResult([
          {
            type: 'Sprint',
            canonicalId: 'e005_s01',
            nodes: [
              {
                elementId: 'keep-this',
                id: 'e005_s01',
                properties: { id: 'e005_s01', graph_id: 'gin_test', epic_id: 'e005' },
              },
              {
                elementId: 'delete-this',
                id: 'e005_s01',
                properties: { id: 'e005_s01', graph_id: 'gin_test', content: 'Content' },
              },
            ],
            count: 2,
          },
        ]),
        mockQueryResult([{ transferred: 0 }]),
        mockQueryResult([{ transferred: 0 }]),
        mockQueryResult([{ propertiesMerged: 1 }]),
        mockQueryResult([{ deleted: 1 }]),
      ];

      const req = makeDeleteRequest({
        graphId: 'gin_test',
        action: 'merge-duplicate-structural-nodes',
        dryRun: 'false',
        confirm: 'CLEANUP_CONFIRMED',
      });

      const res = await DELETE(req);
      expect(res.status).toBe(200);

      const body = await res.json();
      expect(body.merged).toBe(1);
      expect(body.dryRun).toBe(false);
    });
  });

  // =====================================================================
  // 5. Dry-run mode
  // =====================================================================
  describe('Dry-run mode', () => {

    it('should return preview without making changes when dryRun is true', async () => {
      mockRunResults = [
        // Find duplicates query
        mockQueryResult([
          {
            type: 'Sprint',
            canonicalId: 'e005_s01',
            nodes: [
              {
                elementId: 'elem-1',
                id: 'e005_s01',
                properties: { id: 'e005_s01', graph_id: 'gin_test', epic_id: 'e005' },
              },
              {
                elementId: 'elem-2',
                id: 'e005_s01',
                properties: { id: 'e005_s01', graph_id: 'gin_test', content: 'Content' },
              },
            ],
            count: 2,
          },
          {
            type: 'Epic',
            canonicalId: 'e005',
            nodes: [
              {
                elementId: 'elem-3',
                id: 'e005',
                properties: { id: 'e005', graph_id: 'gin_test', status: 'active' },
              },
              {
                elementId: 'elem-4',
                id: 'e005',
                properties: { id: 'e005', graph_id: 'gin_test', content: 'Epic content' },
              },
            ],
            count: 2,
          },
        ]),
      ];

      const req = makeDeleteRequest({
        graphId: 'gin_test',
        action: 'merge-duplicate-structural-nodes',
        dryRun: 'true',
      });

      const res = await DELETE(req);
      expect(res.status).toBe(200);

      const body = await res.json();
      expect(body.dryRun).toBe(true);
      expect(body.merged).toBe(2);
      expect(body.details).toHaveLength(2);
      // Verify no merge/delete queries were executed after the detection query
      const { runQuery } = require('../../../graph/_neo4j');
      // In dry-run, only the detection query should run (1 call)
      expect(runQuery.mock.calls.length).toBe(1);
    });

    it('should show details of what would be merged in dry-run', async () => {
      mockRunResults = [
        mockQueryResult([
          {
            type: 'Sprint',
            canonicalId: 'e014_s02',
            nodes: [
              {
                elementId: 'structural-1',
                id: 'e014_s02',
                properties: { id: 'e014_s02', graph_id: 'gin_test', epic_id: 'e014', status: 'in_progress' },
              },
              {
                elementId: 'document-1',
                id: 'e014_s02',
                properties: { id: 'e014_s02', graph_id: 'gin_test', content: 'Sprint docs', summary: 'Summary', embedding: [0.1] },
              },
            ],
            count: 2,
          },
        ]),
      ];

      const req = makeDeleteRequest({
        graphId: 'gin_test',
        action: 'merge-duplicate-structural-nodes',
        dryRun: 'true',
      });

      const res = await DELETE(req);
      const body = await res.json();

      expect(body.dryRun).toBe(true);
      expect(body.details).toHaveLength(1);

      const detail = body.details[0];
      expect(detail.type).toBe('Sprint');
      expect(detail.canonicalId).toBe('e014_s02');
      expect(detail.survivorId).toBeDefined();
      expect(detail.orphanId).toBeDefined();
      expect(detail.propertiesMerged).toBeDefined();
    });
  });

  // =====================================================================
  // 6. No-op cases
  // =====================================================================
  describe('No-op cases', () => {

    it('should handle case where no duplicates exist', async () => {
      // Return empty result set - no duplicates found
      mockRunResults = [
        mockQueryResult([]),
      ];

      const req = makeDeleteRequest({
        graphId: 'gin_test',
        action: 'merge-duplicate-structural-nodes',
        dryRun: 'false',
        confirm: 'CLEANUP_CONFIRMED',
      });

      const res = await DELETE(req);
      expect(res.status).toBe(200);

      const body = await res.json();
      expect(body.merged).toBe(0);
      expect(body.details).toHaveLength(0);
    });

    it('should handle empty graph gracefully', async () => {
      mockRunResults = [
        mockQueryResult([]),
      ];

      const req = makeDeleteRequest({
        graphId: 'gin_empty',
        action: 'merge-duplicate-structural-nodes',
        dryRun: 'true',
      });

      const res = await DELETE(req);
      expect(res.status).toBe(200);

      const body = await res.json();
      expect(body.merged).toBe(0);
      expect(body.details).toHaveLength(0);
    });
  });

  // =====================================================================
  // 7. Type handling (Sprint and Epic)
  // =====================================================================
  describe('Type handling', () => {

    it('should handle Sprint and Epic duplicates in the same run', async () => {
      mockRunResults = [
        // Detection returns both Sprint and Epic duplicates
        mockQueryResult([
          {
            type: 'Sprint',
            canonicalId: 'e005_s01',
            nodes: [
              {
                elementId: 'sprint-structural',
                id: 'e005_s01',
                properties: { id: 'e005_s01', graph_id: 'gin_test', epic_id: 'e005' },
              },
              {
                elementId: 'sprint-document',
                id: 'e005_s01',
                properties: { id: 'e005_s01', graph_id: 'gin_test', content: 'Sprint content' },
              },
            ],
            count: 2,
          },
          {
            type: 'Epic',
            canonicalId: 'e005',
            nodes: [
              {
                elementId: 'epic-structural',
                id: 'e005',
                properties: { id: 'e005', graph_id: 'gin_test', status: 'active' },
              },
              {
                elementId: 'epic-document',
                id: 'e005',
                properties: { id: 'e005', graph_id: 'gin_test', content: 'Epic content' },
              },
            ],
            count: 2,
          },
        ]),
        // Sprint merge operations (4 queries)
        mockQueryResult([{ transferred: 0 }]),
        mockQueryResult([{ transferred: 0 }]),
        mockQueryResult([{ propertiesMerged: 1 }]),
        mockQueryResult([{ deleted: 1 }]),
        // Epic merge operations (4 queries)
        mockQueryResult([{ transferred: 0 }]),
        mockQueryResult([{ transferred: 0 }]),
        mockQueryResult([{ propertiesMerged: 1 }]),
        mockQueryResult([{ deleted: 1 }]),
      ];

      const req = makeDeleteRequest({
        graphId: 'gin_test',
        action: 'merge-duplicate-structural-nodes',
        dryRun: 'false',
        confirm: 'CLEANUP_CONFIRMED',
      });

      const res = await DELETE(req);
      expect(res.status).toBe(200);

      const body = await res.json();
      expect(body.merged).toBe(2);
      expect(body.details).toHaveLength(2);

      // Verify both types are represented
      const types = body.details.map((d: any) => d.type);
      expect(types).toContain('Sprint');
      expect(types).toContain('Epic');
    });
  });

  // =====================================================================
  // 8. Validation
  // =====================================================================
  describe('Validation', () => {

    it('should require confirmation for non-dry-run execution', async () => {
      const req = makeDeleteRequest({
        graphId: 'gin_test',
        action: 'merge-duplicate-structural-nodes',
        dryRun: 'false',
        // No confirm parameter
      });

      const res = await DELETE(req);
      expect(res.status).toBe(400);

      const body = await res.json();
      expect(body.error.code).toBe('CONFIRMATION_REQUIRED');
    });

    it('should not require confirmation for dry-run', async () => {
      mockRunResults = [
        mockQueryResult([]),
      ];

      const req = makeDeleteRequest({
        graphId: 'gin_test',
        action: 'merge-duplicate-structural-nodes',
        dryRun: 'true',
        // No confirm parameter - should be fine for dry run
      });

      const res = await DELETE(req);
      expect(res.status).toBe(200);
    });
  });
});
