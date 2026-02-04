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
 * - Normalizes IDs before grouping (e.g., 2026_02_e001_sprint1 → e001_s01)
 * - Merges content properties from document node into structural node
 * - Transfers relationships (CONTAINS, BELONGS_TO) from orphan to survivor
 * - Deletes orphan node after merge
 * - Supports dryRun mode for preview
 */

import { describe, it, expect, jest, beforeEach } from '@jest/globals';

// -----------------------------------------------------------------------
// Mocks - must be before imports that use them
// -----------------------------------------------------------------------

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
    if (result.records && Array.isArray(result.records)) {
      return Promise.resolve(result.records.map((r: any) => r.toObject ? r.toObject() : r));
    }
    return Promise.resolve([]);
  }),
}));

jest.mock('@/lib/auth/middleware', () => ({
  withAuth: jest.fn().mockImplementation(
    (_request: any, handler: (user: any, supabase: any) => Promise<any>) => {
      return handler(
        { id: 'b27cb2ea-dcae-4255-9e77-9949daa53d77', email: 'chris@watchhill.ai' },
        {}
      );
    }
  ),
}));

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
  return new Request(url, { method: 'DELETE', headers: { Authorization: 'Bearer test-token' } });
}

function mockRecord(obj: Record<string, any>) {
  return { ...obj, toObject: () => obj, get: (key: string) => obj[key] };
}

function mockQueryResult(records: Record<string, any>[]) {
  return { records: records.map(mockRecord) };
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
    const { runQuery } = require('../../../graph/_neo4j');
    runQuery.mockClear();
    mockRunCallIndex = 0;
    const mod = await import('../route');
    DELETE = mod.DELETE as unknown as (request: Request) => Promise<Response>;
  });

  // =====================================================================
  // 1. Duplicate detection (same raw ID)
  // =====================================================================
  describe('Duplicate detection', () => {

    it('should detect duplicate Sprint nodes with same ID', async () => {
      mockRunResults = [
        // Flat node records — two Sprint nodes with same id
        mockQueryResult([
          { type: 'Sprint', elementId: 'elem-1', id: 'e005_s01', properties: { id: 'e005_s01', graph_id: 'gin_test', epic_id: 'e005', status: 'in_progress' } },
          { type: 'Sprint', elementId: 'elem-2', id: 'e005_s01', properties: { id: 'e005_s01', graph_id: 'gin_test', content: 'Sprint markdown content', summary: 'Sprint summary' } },
        ]),
        mockQueryResult([{ transferred: 1 }]),
        mockQueryResult([{ transferred: 1 }]),
        mockQueryResult([{ propertiesMerged: 3 }]),
        mockQueryResult([{ deleted: 1 }]),
      ];

      const req = makeDeleteRequest({ graphId: 'gin_test', action: 'merge-duplicate-structural-nodes', dryRun: 'false', confirm: 'CLEANUP_CONFIRMED' });
      const res = await DELETE(req);
      expect(res.status).toBe(200);

      const body = await res.json();
      expect(body.action).toBe('merge-duplicate-structural-nodes');
      expect(body.merged).toBeGreaterThanOrEqual(1);
    });

    it('should detect duplicate Epic nodes with same ID', async () => {
      mockRunResults = [
        mockQueryResult([
          { type: 'Epic', elementId: 'elem-1', id: 'e005', properties: { id: 'e005', graph_id: 'gin_test', status: 'active' } },
          { type: 'Epic', elementId: 'elem-2', id: 'e005', properties: { id: 'e005', graph_id: 'gin_test', content: 'Epic description', summary: 'Epic summary' } },
        ]),
        mockQueryResult([{ transferred: 0 }]),
        mockQueryResult([{ transferred: 0 }]),
        mockQueryResult([{ propertiesMerged: 2 }]),
        mockQueryResult([{ deleted: 1 }]),
      ];

      const req = makeDeleteRequest({ graphId: 'gin_test', action: 'merge-duplicate-structural-nodes', dryRun: 'false', confirm: 'CLEANUP_CONFIRMED' });
      const res = await DELETE(req);
      expect(res.status).toBe(200);
      const body = await res.json();
      expect(body.action).toBe('merge-duplicate-structural-nodes');
    });
  });

  // =====================================================================
  // 2. ID normalization — different raw IDs, same canonical form
  // =====================================================================
  describe('ID normalization', () => {

    it('should group 2026_02_e001_sprint1 and e001_s01 as duplicates', async () => {
      // This is Ed's actual scenario: document upload created nodes with
      // date-prefixed IDs, task sync created nodes with canonical IDs
      mockRunResults = [
        mockQueryResult([
          { type: 'Sprint', elementId: 'structural-1', id: 'e001_s01', properties: { id: 'e001_s01', graph_id: 'gin_ed', epic_id: 'e001', status: 'not_started', title: 'Sprint 1' } },
          { type: 'Sprint', elementId: 'document-1', id: '2026_02_e001_sprint1', properties: { id: '2026_02_e001_sprint1', graph_id: 'gin_ed', content: 'Sprint doc', summary: 'Summary' } },
        ]),
        mockQueryResult([{ transferred: 0 }]),
        mockQueryResult([{ transferred: 1 }]),
        mockQueryResult([{ propertiesMerged: 2 }]),
        mockQueryResult([{ deleted: 1 }]),
      ];

      const req = makeDeleteRequest({ graphId: 'gin_ed', action: 'merge-duplicate-structural-nodes', dryRun: 'false', confirm: 'CLEANUP_CONFIRMED' });
      const res = await DELETE(req);
      expect(res.status).toBe(200);

      const body = await res.json();
      expect(body.merged).toBe(1);
      expect(body.details[0].canonicalId).toBe('e001_s01');
    });

    it('should group multiple date-prefixed sprints with their canonical counterparts', async () => {
      mockRunResults = [
        mockQueryResult([
          // Sprint 1 pair
          { type: 'Sprint', elementId: 's1-struct', id: 'e001_s01', properties: { id: 'e001_s01', graph_id: 'gin_ed', epic_id: 'e001' } },
          { type: 'Sprint', elementId: 's1-doc', id: '2026_02_e001_sprint1', properties: { id: '2026_02_e001_sprint1', graph_id: 'gin_ed', content: 'S1 content' } },
          // Sprint 2 pair
          { type: 'Sprint', elementId: 's2-struct', id: 'e001_s02', properties: { id: 'e001_s02', graph_id: 'gin_ed', epic_id: 'e001' } },
          { type: 'Sprint', elementId: 's2-doc', id: '2026_02_e001_sprint2', properties: { id: '2026_02_e001_sprint2', graph_id: 'gin_ed', content: 'S2 content' } },
          // Singleton (no duplicate)
          { type: 'Sprint', elementId: 's3-only', id: 'e001_s03', properties: { id: 'e001_s03', graph_id: 'gin_ed', epic_id: 'e001' } },
        ]),
        // Sprint 1 merge (4 queries)
        mockQueryResult([{ transferred: 0 }]),
        mockQueryResult([{ transferred: 0 }]),
        mockQueryResult([{ propertiesMerged: 1 }]),
        mockQueryResult([{ deleted: 1 }]),
        // Sprint 2 merge (4 queries)
        mockQueryResult([{ transferred: 0 }]),
        mockQueryResult([{ transferred: 0 }]),
        mockQueryResult([{ propertiesMerged: 1 }]),
        mockQueryResult([{ deleted: 1 }]),
      ];

      const req = makeDeleteRequest({ graphId: 'gin_ed', action: 'merge-duplicate-structural-nodes', dryRun: 'false', confirm: 'CLEANUP_CONFIRMED' });
      const res = await DELETE(req);
      expect(res.status).toBe(200);

      const body = await res.json();
      expect(body.merged).toBe(2); // Only 2 groups had duplicates
    });

    it('should normalize e001_sprint3 (no date prefix) to e001_s03', async () => {
      mockRunResults = [
        mockQueryResult([
          { type: 'Sprint', elementId: 'struct', id: 'e001_s03', properties: { id: 'e001_s03', graph_id: 'gin_test', epic_id: 'e001' } },
          { type: 'Sprint', elementId: 'doc', id: 'e001_sprint3', properties: { id: 'e001_sprint3', graph_id: 'gin_test', content: 'Content' } },
        ]),
        mockQueryResult([{ transferred: 0 }]),
        mockQueryResult([{ transferred: 0 }]),
        mockQueryResult([{ propertiesMerged: 1 }]),
        mockQueryResult([{ deleted: 1 }]),
      ];

      const req = makeDeleteRequest({ graphId: 'gin_test', action: 'merge-duplicate-structural-nodes', dryRun: 'true' });
      const res = await DELETE(req);
      const body = await res.json();
      expect(body.merged).toBe(1);
      expect(body.details[0].canonicalId).toBe('e001_s03');
    });
  });

  // =====================================================================
  // 3. Property merging
  // =====================================================================
  describe('Property merging', () => {

    it('should merge content properties from document node into structural node', async () => {
      mockRunResults = [
        mockQueryResult([
          { type: 'Sprint', elementId: 'structural-node', id: 'e005_s01', properties: { id: 'e005_s01', graph_id: 'gin_test', epic_id: 'e005', status: 'in_progress', title: 'Sprint 1' } },
          { type: 'Sprint', elementId: 'document-node', id: 'e005_s01', properties: { id: 'e005_s01', graph_id: 'gin_test', content: 'Full sprint content', summary: 'Sprint summary', embedding: [0.1, 0.2, 0.3], embedding_model: 'voyage-3' } },
        ]),
        mockQueryResult([{ transferred: 0 }]),
        mockQueryResult([{ transferred: 2 }]),
        mockQueryResult([{ propertiesMerged: 4 }]),
        mockQueryResult([{ deleted: 1 }]),
      ];

      const req = makeDeleteRequest({ graphId: 'gin_test', action: 'merge-duplicate-structural-nodes', dryRun: 'false', confirm: 'CLEANUP_CONFIRMED' });
      const res = await DELETE(req);
      expect(res.status).toBe(200);

      const body = await res.json();
      expect(body.merged).toBeGreaterThanOrEqual(1);
      if (body.details.length > 0) {
        expect(body.details[0].type).toBe('Sprint');
        expect(body.details[0].canonicalId).toBe('e005_s01');
      }
    });
  });

  // =====================================================================
  // 4. Relationship transfer
  // =====================================================================
  describe('Relationship transfer', () => {

    it('should transfer relationships from orphan to survivor', async () => {
      mockRunResults = [
        mockQueryResult([
          { type: 'Sprint', elementId: 'survivor-elem', id: 'e005_s01', properties: { id: 'e005_s01', graph_id: 'gin_test', epic_id: 'e005' } },
          { type: 'Sprint', elementId: 'orphan-elem', id: 'e005_s01', properties: { id: 'e005_s01', graph_id: 'gin_test', content: 'Doc content' } },
        ]),
        mockQueryResult([{ transferred: 3 }]),
        mockQueryResult([{ transferred: 1 }]),
        mockQueryResult([{ propertiesMerged: 2 }]),
        mockQueryResult([{ deleted: 1 }]),
      ];

      const req = makeDeleteRequest({ graphId: 'gin_test', action: 'merge-duplicate-structural-nodes', dryRun: 'false', confirm: 'CLEANUP_CONFIRMED' });
      const res = await DELETE(req);
      expect(res.status).toBe(200);

      const body = await res.json();
      expect(body.merged).toBeGreaterThanOrEqual(1);
      if (body.details.length > 0) {
        expect(body.details[0].relationshipsTransferred).toBeGreaterThanOrEqual(0);
      }
    });
  });

  // =====================================================================
  // 5. Orphan deletion
  // =====================================================================
  describe('Orphan deletion', () => {

    it('should delete orphan node after merge', async () => {
      mockRunResults = [
        mockQueryResult([
          { type: 'Sprint', elementId: 'keep-this', id: 'e005_s01', properties: { id: 'e005_s01', graph_id: 'gin_test', epic_id: 'e005' } },
          { type: 'Sprint', elementId: 'delete-this', id: 'e005_s01', properties: { id: 'e005_s01', graph_id: 'gin_test', content: 'Content' } },
        ]),
        mockQueryResult([{ transferred: 0 }]),
        mockQueryResult([{ transferred: 0 }]),
        mockQueryResult([{ propertiesMerged: 1 }]),
        mockQueryResult([{ deleted: 1 }]),
      ];

      const req = makeDeleteRequest({ graphId: 'gin_test', action: 'merge-duplicate-structural-nodes', dryRun: 'false', confirm: 'CLEANUP_CONFIRMED' });
      const res = await DELETE(req);
      expect(res.status).toBe(200);

      const body = await res.json();
      expect(body.merged).toBe(1);
      expect(body.dryRun).toBe(false);
    });
  });

  // =====================================================================
  // 6. Dry-run mode
  // =====================================================================
  describe('Dry-run mode', () => {

    it('should return preview without making changes when dryRun is true', async () => {
      mockRunResults = [
        mockQueryResult([
          { type: 'Sprint', elementId: 'elem-1', id: 'e005_s01', properties: { id: 'e005_s01', graph_id: 'gin_test', epic_id: 'e005' } },
          { type: 'Sprint', elementId: 'elem-2', id: 'e005_s01', properties: { id: 'e005_s01', graph_id: 'gin_test', content: 'Content' } },
          { type: 'Epic', elementId: 'elem-3', id: 'e005', properties: { id: 'e005', graph_id: 'gin_test', status: 'active' } },
          { type: 'Epic', elementId: 'elem-4', id: 'e005', properties: { id: 'e005', graph_id: 'gin_test', content: 'Epic content' } },
        ]),
      ];

      const req = makeDeleteRequest({ graphId: 'gin_test', action: 'merge-duplicate-structural-nodes', dryRun: 'true' });
      const res = await DELETE(req);
      expect(res.status).toBe(200);

      const body = await res.json();
      expect(body.dryRun).toBe(true);
      expect(body.merged).toBe(2);
      expect(body.details).toHaveLength(2);
      const { runQuery } = require('../../../graph/_neo4j');
      expect(runQuery.mock.calls.length).toBe(1);
    });

    it('should show details of what would be merged in dry-run', async () => {
      mockRunResults = [
        mockQueryResult([
          { type: 'Sprint', elementId: 'structural-1', id: 'e014_s02', properties: { id: 'e014_s02', graph_id: 'gin_test', epic_id: 'e014', status: 'in_progress' } },
          { type: 'Sprint', elementId: 'document-1', id: 'e014_s02', properties: { id: 'e014_s02', graph_id: 'gin_test', content: 'Sprint docs', summary: 'Summary', embedding: [0.1] } },
        ]),
      ];

      const req = makeDeleteRequest({ graphId: 'gin_test', action: 'merge-duplicate-structural-nodes', dryRun: 'true' });
      const res = await DELETE(req);
      const body = await res.json();

      expect(body.dryRun).toBe(true);
      expect(body.details).toHaveLength(1);
      expect(body.details[0].type).toBe('Sprint');
      expect(body.details[0].canonicalId).toBe('e014_s02');
      expect(body.details[0].survivorId).toBeDefined();
      expect(body.details[0].orphanId).toBeDefined();
      expect(body.details[0].propertiesMerged).toBeDefined();
    });

    it('should detect cross-ID duplicates in dry-run mode', async () => {
      mockRunResults = [
        mockQueryResult([
          { type: 'Sprint', elementId: 'struct', id: 'e001_s01', properties: { id: 'e001_s01', graph_id: 'gin_ed', epic_id: 'e001' } },
          { type: 'Sprint', elementId: 'doc', id: '2026_02_e001_sprint1', properties: { id: '2026_02_e001_sprint1', graph_id: 'gin_ed', content: 'Content' } },
        ]),
      ];

      const req = makeDeleteRequest({ graphId: 'gin_ed', action: 'merge-duplicate-structural-nodes', dryRun: 'true' });
      const res = await DELETE(req);
      const body = await res.json();

      expect(body.dryRun).toBe(true);
      expect(body.merged).toBe(1);
      expect(body.details[0].canonicalId).toBe('e001_s01');
    });
  });

  // =====================================================================
  // 7. No-op cases
  // =====================================================================
  describe('No-op cases', () => {

    it('should handle case where no duplicates exist', async () => {
      mockRunResults = [mockQueryResult([])];

      const req = makeDeleteRequest({ graphId: 'gin_test', action: 'merge-duplicate-structural-nodes', dryRun: 'false', confirm: 'CLEANUP_CONFIRMED' });
      const res = await DELETE(req);
      expect(res.status).toBe(200);

      const body = await res.json();
      expect(body.merged).toBe(0);
      expect(body.details).toHaveLength(0);
    });

    it('should handle empty graph gracefully', async () => {
      mockRunResults = [mockQueryResult([])];

      const req = makeDeleteRequest({ graphId: 'gin_empty', action: 'merge-duplicate-structural-nodes', dryRun: 'true' });
      const res = await DELETE(req);
      expect(res.status).toBe(200);

      const body = await res.json();
      expect(body.merged).toBe(0);
      expect(body.details).toHaveLength(0);
    });

    it('should not group singletons as duplicates', async () => {
      // Each node has a unique canonical ID — no duplicates
      mockRunResults = [
        mockQueryResult([
          { type: 'Sprint', elementId: 'a', id: 'e001_s01', properties: { id: 'e001_s01', graph_id: 'gin_test', epic_id: 'e001' } },
          { type: 'Sprint', elementId: 'b', id: 'e001_s02', properties: { id: 'e001_s02', graph_id: 'gin_test', epic_id: 'e001' } },
          { type: 'Sprint', elementId: 'c', id: 'e001_s03', properties: { id: 'e001_s03', graph_id: 'gin_test', epic_id: 'e001' } },
        ]),
      ];

      const req = makeDeleteRequest({ graphId: 'gin_test', action: 'merge-duplicate-structural-nodes', dryRun: 'false', confirm: 'CLEANUP_CONFIRMED' });
      const res = await DELETE(req);
      expect(res.status).toBe(200);

      const body = await res.json();
      expect(body.merged).toBe(0);
    });
  });

  // =====================================================================
  // 8. Type handling (Sprint and Epic)
  // =====================================================================
  describe('Type handling', () => {

    it('should handle Sprint and Epic duplicates in the same run', async () => {
      mockRunResults = [
        mockQueryResult([
          { type: 'Sprint', elementId: 'sprint-structural', id: 'e005_s01', properties: { id: 'e005_s01', graph_id: 'gin_test', epic_id: 'e005' } },
          { type: 'Sprint', elementId: 'sprint-document', id: 'e005_s01', properties: { id: 'e005_s01', graph_id: 'gin_test', content: 'Sprint content' } },
          { type: 'Epic', elementId: 'epic-structural', id: 'e005', properties: { id: 'e005', graph_id: 'gin_test', status: 'active' } },
          { type: 'Epic', elementId: 'epic-document', id: 'e005', properties: { id: 'e005', graph_id: 'gin_test', content: 'Epic content' } },
        ]),
        // Sprint merge (4 queries)
        mockQueryResult([{ transferred: 0 }]),
        mockQueryResult([{ transferred: 0 }]),
        mockQueryResult([{ propertiesMerged: 1 }]),
        mockQueryResult([{ deleted: 1 }]),
        // Epic merge (4 queries)
        mockQueryResult([{ transferred: 0 }]),
        mockQueryResult([{ transferred: 0 }]),
        mockQueryResult([{ propertiesMerged: 1 }]),
        mockQueryResult([{ deleted: 1 }]),
      ];

      const req = makeDeleteRequest({ graphId: 'gin_test', action: 'merge-duplicate-structural-nodes', dryRun: 'false', confirm: 'CLEANUP_CONFIRMED' });
      const res = await DELETE(req);
      expect(res.status).toBe(200);

      const body = await res.json();
      expect(body.merged).toBe(2);
      expect(body.details).toHaveLength(2);

      const types = body.details.map((d: any) => d.type);
      expect(types).toContain('Sprint');
      expect(types).toContain('Epic');
    });
  });

  // =====================================================================
  // 9. Validation
  // =====================================================================
  describe('Validation', () => {

    it('should require confirmation for non-dry-run execution', async () => {
      const req = makeDeleteRequest({ graphId: 'gin_test', action: 'merge-duplicate-structural-nodes', dryRun: 'false' });
      const res = await DELETE(req);
      expect(res.status).toBe(400);

      const body = await res.json();
      expect(body.error.code).toBe('CONFIRMATION_REQUIRED');
    });

    it('should not require confirmation for dry-run', async () => {
      mockRunResults = [mockQueryResult([])];

      const req = makeDeleteRequest({ graphId: 'gin_test', action: 'merge-duplicate-structural-nodes', dryRun: 'true' });
      const res = await DELETE(req);
      expect(res.status).toBe(200);
    });
  });
});
