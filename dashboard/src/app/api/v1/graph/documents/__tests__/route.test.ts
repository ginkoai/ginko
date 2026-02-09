/**
 * @fileType: test
 * @status: current
 * @updated: 2026-02-03
 * @tags: [test, api, documents, deduplication, adhoc_260203_s01_t03]
 * @related: [../route.ts, ../../_neo4j.ts]
 * @priority: high
 * @complexity: medium
 * @dependencies: [jest]
 */

/**
 * Tests for POST /api/v1/graph/documents
 *
 * Validates the document upload deduplication strategy:
 *
 * - Sprint (match-only): Use MATCH+SET to enrich existing nodes only.
 *   Task sync is the sole creator of Sprint nodes. Document upload should
 *   never create Sprint nodes from scratch.
 *
 * - Epic and non-structural types (ADR, Pattern, ContextModule, Charter, etc.):
 *   Use MERGE to create-or-update. Epic uses MERGE because new Epics may be
 *   pushed before any sprints exist (BUG-026 fix).
 *
 * Test Categories:
 * 1. Match-only types (Sprint) - MATCH-only behavior
 * 2. Non-structural types (ADR, Pattern, Epic, etc.) - MERGE behavior preserved
 * 3. Cross-path integration - task sync creates, document upload enriches
 * 4. Property handling - correct props set on each path
 * 5. Validation and error handling
 */

import { describe, it, expect, jest, beforeEach, afterEach } from '@jest/globals';

// -----------------------------------------------------------------------
// Mocks
// -----------------------------------------------------------------------

// Capture all Cypher queries that flow through tx.run
const txRunMock = jest.fn().mockResolvedValue({ records: [] } as never);
const sessionCloseMock = jest.fn().mockResolvedValue(undefined as never);

// executeWrite calls the callback with a fake transaction
const executeWriteMock = jest.fn().mockImplementation(async (cb: (tx: any) => Promise<void>) => {
  await cb({ run: txRunMock });
});

jest.mock('../../../graph/_neo4j', () => ({
  verifyConnection: jest.fn().mockResolvedValue(true),
  getSession: jest.fn().mockReturnValue({
    executeWrite: executeWriteMock,
    executeRead: jest.fn(),
    close: sessionCloseMock,
  }),
}));

// Mock VoyageEmbeddingClient - skip embeddings for unit tests
jest.mock('@/lib/embeddings/voyage-client', () => ({
  VoyageEmbeddingClient: jest.fn().mockImplementation(() => {
    throw new Error('Voyage AI not configured');
  }),
}));

// -----------------------------------------------------------------------
// Helpers
// -----------------------------------------------------------------------

/**
 * Build a minimal NextRequest-compatible object for the POST handler.
 */
function makeRequest(body: Record<string, unknown>, hasAuth = true): Request {
  const headers = new Headers({ 'Content-Type': 'application/json' });
  if (hasAuth) {
    headers.set('Authorization', 'Bearer test-token');
  }
  return new Request('http://localhost/api/v1/graph/documents', {
    method: 'POST',
    headers,
    body: JSON.stringify(body),
  });
}

/**
 * Extract the first Cypher query string sent to tx.run for a given document index.
 * When multiple documents are in a batch, tx.run is called once per document.
 */
function getCypherForCall(callIndex: number): string {
  if (callIndex >= txRunMock.mock.calls.length) {
    throw new Error(`tx.run was only called ${txRunMock.mock.calls.length} times; requested index ${callIndex}`);
  }
  return txRunMock.mock.calls[callIndex][0] as string;
}

/**
 * Extract the params object passed to tx.run for a given call index.
 */
function getParamsForCall(callIndex: number): Record<string, unknown> {
  if (callIndex >= txRunMock.mock.calls.length) {
    throw new Error(`tx.run was only called ${txRunMock.mock.calls.length} times; requested index ${callIndex}`);
  }
  return txRunMock.mock.calls[callIndex][1] as Record<string, unknown>;
}

/** Match-only types that should use MATCH (not MERGE) — Sprint only (BUG-026) */
const MATCH_ONLY_TYPES = ['Sprint'] as const;

/** Types that use MERGE (create-or-update) — includes Epic after BUG-026 fix */
const MERGE_TYPES = ['ADR', 'Pattern', 'ContextModule', 'Charter', 'Gotcha', 'Session', 'PRD', 'Epic'] as const;

/**
 * Build a minimal document upload payload.
 */
function makeDocument(overrides: Partial<{
  id: string;
  type: string;
  title: string;
  content: string;
  filePath: string;
  hash: string;
  metadata: Record<string, unknown>;
}> = {}) {
  return {
    id: overrides.id ?? 'test_001',
    type: overrides.type ?? 'ADR',
    title: overrides.title ?? 'Test Document',
    content: overrides.content ?? 'Test content body for the document.',
    filePath: overrides.filePath ?? 'docs/test.md',
    hash: overrides.hash ?? 'sha256:abc123',
    ...(overrides.metadata && { metadata: overrides.metadata }),
  };
}

// -----------------------------------------------------------------------
// Tests
// -----------------------------------------------------------------------

describe('POST /api/v1/graph/documents', () => {
  let POST: (request: Request) => Promise<Response>;

  beforeEach(async () => {
    jest.clearAllMocks();
    // Dynamic import so mocks are in place
    const mod = await import('../route');
    POST = mod.POST as unknown as (request: Request) => Promise<Response>;
  });

  // =====================================================================
  // 1. Match-only types (Sprint) -- MATCH-only behavior
  // =====================================================================
  describe('Match-only types (Sprint)', () => {

    it.each(MATCH_ONLY_TYPES)(
      'should use MATCH (not MERGE) for %s documents',
      async (docType) => {
        const req = makeRequest({
          graphId: 'gin_test',
          documents: [makeDocument({ id: `${docType.toLowerCase()}_001`, type: docType })],
        });

        const res = await POST(req);
        expect(res.status).toBe(201);

        const cypher = getCypherForCall(0);

        // The Cypher MUST start with MATCH, not MERGE
        expect(cypher).toMatch(/^\s*MATCH\s/i);
        expect(cypher).not.toMatch(/MERGE\s*\(\s*n\s*:/i);
      }
    );

    it.each(MATCH_ONLY_TYPES)(
      'should SET content properties on existing %s node',
      async (docType) => {
        const req = makeRequest({
          graphId: 'gin_test',
          documents: [makeDocument({
            id: `${docType.toLowerCase()}_001`,
            type: docType,
            content: 'Rich markdown content here',
            filePath: `docs/${docType.toLowerCase()}s/${docType}-001.md`,
            hash: 'sha256:deadbeef',
          })],
        });

        const res = await POST(req);
        expect(res.status).toBe(201);

        const cypher = getCypherForCall(0);
        const params = getParamsForCall(0);

        // The SET clause should include content-enrichment properties
        expect(cypher).toContain('SET');
        expect(params).toHaveProperty('content', 'Rich markdown content here');
        expect(params).toHaveProperty('filePath', `docs/${docType.toLowerCase()}s/${docType}-001.md`);
        expect(params).toHaveProperty('hash', 'sha256:deadbeef');
        // summary is auto-generated from content
        expect(params).toHaveProperty('summary');
      }
    );

    it.each(MATCH_ONLY_TYPES)(
      'should match %s node by {id, graph_id}',
      async (docType) => {
        const req = makeRequest({
          graphId: 'gin_test',
          documents: [makeDocument({ id: `${docType.toLowerCase()}_001`, type: docType })],
        });

        await POST(req);
        const cypher = getCypherForCall(0);

        // MATCH clause must filter on both id and graph_id
        expect(cypher).toMatch(/\{.*id:\s*\$id.*graph_id:\s*\$graph_id.*\}/s);
      }
    );

    it.each(MATCH_ONLY_TYPES)(
      'should still MERGE the Graph CONTAINS relationship for %s',
      async (docType) => {
        const req = makeRequest({
          graphId: 'gin_test',
          documents: [makeDocument({ id: `${docType.toLowerCase()}_001`, type: docType })],
        });

        await POST(req);
        const cypher = getCypherForCall(0);

        // CONTAINS relationship must still be created/maintained
        expect(cypher).toMatch(/MERGE\s*\(\s*g\s*\)\s*-\s*\[\s*:\s*CONTAINS\s*\]\s*->\s*\(\s*n\s*\)/i);
      }
    );

    it('should include warning in response when Sprint node does not exist', async () => {
      // When MATCH finds nothing, tx.run still resolves but with 0 records.
      // The route should add a warning to the response (not just console.warn).
      txRunMock.mockResolvedValueOnce({ records: [], summary: { counters: { nodesCreated: () => 0 } } } as never);
      const consoleWarnSpy = jest.spyOn(console, 'warn').mockImplementation(() => {});

      const req = makeRequest({
        graphId: 'gin_test',
        documents: [makeDocument({ id: 'e001_s99', type: 'Sprint' })],
      });

      const res = await POST(req);
      const body = await res.json();

      // Should NOT fail the batch -- still 201
      expect(res.status).toBe(201);

      // Warning should appear in response body
      expect(body.job.warnings).toBeDefined();
      expect(body.job.warnings.some((w: string) => w.includes('e001_s99') && w.includes('not found'))).toBe(true);

      consoleWarnSpy.mockRestore();
    });

    it('should not fail the batch when a Sprint node is missing', async () => {
      txRunMock.mockResolvedValueOnce({ records: [] } as never);
      const consoleWarnSpy = jest.spyOn(console, 'warn').mockImplementation(() => {});

      const req = makeRequest({
        graphId: 'gin_test',
        documents: [
          makeDocument({ id: 'e001_s99', type: 'Sprint' }),
          makeDocument({ id: 'adr_001', type: 'ADR' }),
        ],
      });

      const res = await POST(req);
      const body = await res.json();

      // Both documents should be processed (batch not aborted)
      expect(res.status).toBe(201);
      expect(body.job.progress.uploaded).toBe(2);

      consoleWarnSpy.mockRestore();
    });

    it('should not include ON CREATE SET for Sprint types', async () => {
      const req = makeRequest({
        graphId: 'gin_test',
        documents: [makeDocument({ id: 'e001_s01', type: 'Sprint' })],
      });

      await POST(req);
      const cypher = getCypherForCall(0);

      // Match-only path must NOT have ON CREATE SET (no node creation)
      expect(cypher).not.toMatch(/ON\s+CREATE\s+SET/i);
    });
  });

  // =====================================================================
  // 2. MERGE types (ADR, Pattern, Epic, Charter, etc.) -- create-or-update
  // =====================================================================
  describe('MERGE types (ADR, Pattern, Epic, Charter, etc.)', () => {

    it.each(MERGE_TYPES)(
      'should use MERGE for %s documents',
      async (docType) => {
        const req = makeRequest({
          graphId: 'gin_test',
          documents: [makeDocument({ id: `${docType.toLowerCase()}_001`, type: docType })],
        });

        const res = await POST(req);
        expect(res.status).toBe(201);

        const cypher = getCypherForCall(0);

        // Must use MERGE (create-or-update)
        expect(cypher).toMatch(/MERGE\s*\(\s*n\s*:/i);
      }
    );

    it.each(MERGE_TYPES)(
      'should include ON CREATE SET for %s documents',
      async (docType) => {
        const req = makeRequest({
          graphId: 'gin_test',
          documents: [makeDocument({ id: `${docType.toLowerCase()}_001`, type: docType })],
        });

        await POST(req);
        const cypher = getCypherForCall(0);

        expect(cypher).toMatch(/ON\s+CREATE\s+SET/i);
      }
    );

    it.each(MERGE_TYPES)(
      'should include ON MATCH SET for %s documents',
      async (docType) => {
        const req = makeRequest({
          graphId: 'gin_test',
          documents: [makeDocument({ id: `${docType.toLowerCase()}_001`, type: docType })],
        });

        await POST(req);
        const cypher = getCypherForCall(0);

        expect(cypher).toMatch(/ON\s+MATCH\s+SET/i);
      }
    );

    it('should set all required properties for non-structural types', async () => {
      const req = makeRequest({
        graphId: 'gin_test',
        documents: [makeDocument({
          id: 'adr_054',
          type: 'ADR',
          title: 'Entity Naming Convention',
          content: 'All graph entities use a hierarchical naming convention.',
          filePath: 'docs/adr/ADR-054.md',
          hash: 'sha256:adr054hash',
        })],
      });

      await POST(req);
      const params = getParamsForCall(0);

      // Core properties
      expect(params).toHaveProperty('id', 'adr_054');
      expect(params).toHaveProperty('type', 'ADR');
      expect(params).toHaveProperty('title', 'Entity Naming Convention');
      expect(params).toHaveProperty('content', 'All graph entities use a hierarchical naming convention.');
      expect(params).toHaveProperty('filePath', 'docs/adr/ADR-054.md');
      expect(params).toHaveProperty('hash', 'sha256:adr054hash');
      expect(params).toHaveProperty('graph_id', 'gin_test');

      // Auto-generated properties
      expect(params).toHaveProperty('summary');
      expect(typeof params.summary).toBe('string');
      expect(params).toHaveProperty('created_at');
      expect(params).toHaveProperty('updated_at');

      // Sync tracking (ADR-054)
      expect(params).toHaveProperty('synced', true);
      expect(params).toHaveProperty('syncedAt');
      expect(params).toHaveProperty('editedAt');
      expect(params).toHaveProperty('editedBy', 'cli-upload');
      expect(params).toHaveProperty('contentHash', 'sha256:adr054hash');
    });

    it('should preserve metadata as prefixed properties', async () => {
      const req = makeRequest({
        graphId: 'gin_test',
        documents: [makeDocument({
          id: 'pattern_001',
          type: 'Pattern',
          metadata: { confidence: 'high', source: 'session-analysis' },
        })],
      });

      await POST(req);
      const params = getParamsForCall(0);

      expect(params).toHaveProperty('meta_confidence', 'high');
      expect(params).toHaveProperty('meta_source', 'session-analysis');
    });
  });

  // =====================================================================
  // 3. Cross-path: task sync creates, document upload enriches
  // =====================================================================
  describe('Cross-path integration (task sync + document upload)', () => {

    it('should enrich an existing Sprint node without creating a duplicate', async () => {
      // Scenario: task sync has already created a Sprint node with structural
      // properties (epic_id, status, etc.). Document upload should add content
      // properties (content, summary, embedding, hash, filePath) without
      // creating a second node.

      // The Sprint node already exists in the graph (created by task sync).
      // When document upload runs MATCH, it finds this node and does SET.
      // We verify that the Cypher uses MATCH (no MERGE) so no second node
      // can be created.

      const req = makeRequest({
        graphId: 'gin_project',
        documents: [makeDocument({
          id: 'e014_s02',
          type: 'Sprint',
          title: 'Enrichment Test Sprint',
          content: '## Sprint Goals\n\nTest enrichment without duplication.',
          filePath: 'docs/sprints/e014_s02.md',
          hash: 'sha256:sprint_enrichment',
        })],
      });

      const res = await POST(req);
      expect(res.status).toBe(201);

      const cypher = getCypherForCall(0);

      // Must be MATCH, not MERGE -- ensures no node creation
      expect(cypher).toMatch(/^\s*MATCH\s/i);
      expect(cypher).not.toMatch(/MERGE\s*\(\s*n\s*:/i);

      // Properties passed should include content-enrichment fields
      const params = getParamsForCall(0);
      expect(params).toHaveProperty('content');
      expect(params).toHaveProperty('summary');
      expect(params).toHaveProperty('hash', 'sha256:sprint_enrichment');
      expect(params).toHaveProperty('filePath', 'docs/sprints/e014_s02.md');

      // The SET should use += so structural props (epic_id, status) are preserved
      expect(cypher).toMatch(/SET\s+n\s*\+=/i);
    });

    it('should create or update an Epic node via MERGE (BUG-026 fix)', async () => {
      // Scenario: Epic may or may not exist. MERGE handles both cases:
      // - New Epic: creates node with all properties
      // - Existing Epic: updates with ON MATCH SET
      // This fixes BUG-026 where new Epics without sprints were silently lost.

      const req = makeRequest({
        graphId: 'gin_project',
        documents: [makeDocument({
          id: 'e014',
          type: 'Epic',
          title: 'Blog Infrastructure',
          content: '## Epic: Blog Infrastructure\n\nBuild the blog system.',
          filePath: 'docs/epics/EPIC-014.md',
          hash: 'sha256:epic_enrichment',
        })],
      });

      const res = await POST(req);
      expect(res.status).toBe(201);

      const cypher = getCypherForCall(0);
      const params = getParamsForCall(0);

      // MERGE — creates if not exists, updates if exists
      expect(cypher).toMatch(/MERGE\s*\(\s*n\s*:Epic/i);
      expect(cypher).toMatch(/ON\s+CREATE\s+SET/i);
      expect(cypher).toMatch(/ON\s+MATCH\s+SET/i);

      // Content props
      expect(params).toHaveProperty('content');
      expect(params).toHaveProperty('summary');
      expect(params).toHaveProperty('hash');
      expect(params).toHaveProperty('filePath');
    });

    it('should create a new Epic node even without prior task sync (BUG-026)', async () => {
      // Core BUG-026 scenario: a brand-new Epic with no sprints yet.
      // Previously this silently failed because MATCH found nothing.
      // Now MERGE creates the node.

      const req = makeRequest({
        graphId: 'gin_test',
        documents: [makeDocument({
          id: 'e020',
          type: 'Epic',
          title: 'Graph-Authoritative Tasks',
          content: '## EPIC-020\n\nMake the graph the source of truth for task status.',
          filePath: 'docs/epics/EPIC-020.md',
          hash: 'sha256:e020_new',
        })],
      });

      const res = await POST(req);
      expect(res.status).toBe(201);

      const cypher = getCypherForCall(0);

      // Must use MERGE (not MATCH) so the node gets created
      expect(cypher).toMatch(/MERGE\s*\(\s*n\s*:Epic/i);
      expect(cypher).not.toMatch(/^\s*MATCH\s*\(\s*n\s*:Epic/i);

      // Must include ON CREATE SET for initial property assignment
      expect(cypher).toMatch(/ON\s+CREATE\s+SET/i);
    });

    it('should handle a mixed batch: Epic uses MERGE, Sprint uses MATCH', async () => {
      const req = makeRequest({
        graphId: 'gin_test',
        documents: [
          makeDocument({ id: 'e001', type: 'Epic', title: 'Epic One' }),
          makeDocument({ id: 'adr_001', type: 'ADR', title: 'ADR One' }),
          makeDocument({ id: 'e001_s01', type: 'Sprint', title: 'Sprint One' }),
          makeDocument({ id: 'pattern_001', type: 'Pattern', title: 'Pattern One' }),
        ],
      });

      const res = await POST(req);
      expect(res.status).toBe(201);

      // 4 documents means 4 tx.run calls
      expect(txRunMock).toHaveBeenCalledTimes(4);

      // Epic (index 0) -> MERGE (BUG-026 fix)
      const epicCypher = getCypherForCall(0);
      expect(epicCypher).toMatch(/MERGE\s*\(\s*n\s*:Epic/i);

      // ADR (index 1) -> MERGE
      const adrCypher = getCypherForCall(1);
      expect(adrCypher).toMatch(/MERGE\s*\(\s*n\s*:/i);

      // Sprint (index 2) -> MATCH (still match-only)
      const sprintCypher = getCypherForCall(2);
      expect(sprintCypher).toMatch(/^\s*MATCH\s/i);
      expect(sprintCypher).not.toMatch(/MERGE\s*\(\s*n\s*:/i);

      // Pattern (index 3) -> MERGE
      const patternCypher = getCypherForCall(3);
      expect(patternCypher).toMatch(/MERGE\s*\(\s*n\s*:/i);
    });

    it('should result in a single node when task sync then document upload run in sequence', async () => {
      // This test verifies the contract: if a Sprint node exists (from task sync),
      // the document upload's MATCH path will find it and SET properties on it,
      // rather than creating a duplicate via MERGE.
      //
      // We can't simulate the actual Neo4j state here, but we verify that:
      // 1. The Sprint Cypher uses MATCH (not MERGE) -- guarantees no creation
      // 2. The SET uses += -- guarantees structural props are preserved
      // 3. Content props are included in the SET params

      const req = makeRequest({
        graphId: 'gin_project',
        documents: [makeDocument({
          id: 'e014_s02',
          type: 'Sprint',
          title: 'Sprint 2 - Enrichment Test',
          content: '## Sprint 2\n\nVerify human output format.',
          filePath: 'docs/sprints/CURRENT-SPRINT.md',
          hash: 'sha256:sprint2_hash',
        })],
      });

      const res = await POST(req);
      const body = await res.json();

      expect(res.status).toBe(201);
      expect(body.job.progress.uploaded).toBe(1);

      const cypher = getCypherForCall(0);
      const params = getParamsForCall(0);

      // Contract 1: MATCH only
      expect(cypher).toMatch(/^\s*MATCH\s/i);
      expect(cypher).not.toMatch(/MERGE\s*\(\s*n\s*:/i);

      // Contract 2: += preserves existing props
      expect(cypher).toMatch(/SET\s+n\s*\+=/i);

      // Contract 3: Content enrichment props included
      expect(params).toHaveProperty('content', '## Sprint 2\n\nVerify human output format.');
      expect(params).toHaveProperty('summary');
      expect(params).toHaveProperty('hash', 'sha256:sprint2_hash');
      expect(params).toHaveProperty('filePath', 'docs/sprints/CURRENT-SPRINT.md');
      expect(params).toHaveProperty('title', 'Sprint 2 - Enrichment Test');
    });
  });

  // =====================================================================
  // 4. Property handling details
  // =====================================================================
  describe('Property handling', () => {

    it('should generate summary from content', async () => {
      const req = makeRequest({
        graphId: 'gin_test',
        documents: [makeDocument({
          id: 'adr_099',
          type: 'ADR',
          content: '---\nstatus: accepted\n---\n# ADR-099\n\nThis is the first paragraph that should become the summary.\n\nThis is the second paragraph.',
        })],
      });

      await POST(req);
      const params = getParamsForCall(0);

      // Summary should strip frontmatter and headers, take first paragraph
      expect(params.summary).toBe('This is the first paragraph that should become the summary.');
    });

    it('should set has_embedding to false when Voyage is not configured', async () => {
      const req = makeRequest({
        graphId: 'gin_test',
        documents: [makeDocument({ id: 'adr_001', type: 'ADR' })],
      });

      await POST(req);
      const params = getParamsForCall(0);

      expect(params).toHaveProperty('has_embedding', false);
    });

    it('should include sync tracking fields (ADR-054)', async () => {
      const req = makeRequest({
        graphId: 'gin_test',
        documents: [makeDocument({ id: 'charter_001', type: 'Charter' })],
      });

      await POST(req);
      const params = getParamsForCall(0);

      expect(params).toHaveProperty('synced', true);
      expect(params).toHaveProperty('syncedAt');
      expect(params).toHaveProperty('editedAt');
      expect(params).toHaveProperty('editedBy', 'cli-upload');
      expect(params).toHaveProperty('contentHash');
    });

    it('should not include null or undefined metadata values', async () => {
      const req = makeRequest({
        graphId: 'gin_test',
        documents: [makeDocument({
          id: 'pattern_002',
          type: 'Pattern',
          metadata: { valid: 'yes', empty: null as unknown as string, missing: undefined as unknown as string },
        })],
      });

      await POST(req);
      const params = getParamsForCall(0);

      expect(params).toHaveProperty('meta_valid', 'yes');
      expect(params).not.toHaveProperty('meta_empty');
      expect(params).not.toHaveProperty('meta_missing');
    });
  });

  // =====================================================================
  // 5. Validation and error handling (baseline)
  // =====================================================================
  describe('Validation', () => {

    it('should return 401 without authorization header', async () => {
      const req = makeRequest({ graphId: 'gin_test', documents: [] }, false);
      const res = await POST(req);
      expect(res.status).toBe(401);

      const body = await res.json();
      expect(body.error.code).toBe('AUTH_REQUIRED');
    });

    it('should return 400 without graphId', async () => {
      const req = makeRequest({ documents: [makeDocument()] });
      const res = await POST(req);
      expect(res.status).toBe(400);

      const body = await res.json();
      expect(body.error.code).toBe('MISSING_GRAPH_ID');
    });

    it('should return 400 with empty documents array', async () => {
      const req = makeRequest({ graphId: 'gin_test', documents: [] });
      const res = await POST(req);
      expect(res.status).toBe(400);

      const body = await res.json();
      expect(body.error.code).toBe('MISSING_DOCUMENTS');
    });

    it('should warn for non-canonical Epic IDs (ADR-052)', async () => {
      const req = makeRequest({
        graphId: 'gin_test',
        documents: [makeDocument({ id: 'EPIC-010', type: 'Epic' })],
      });

      const res = await POST(req);
      const body = await res.json();

      expect(res.status).toBe(201);
      expect(body.job.warnings).toBeDefined();
      expect(body.job.warnings.some((w: string) => w.includes('non-canonical'))).toBe(true);
    });

    it('should close the session after processing', async () => {
      const req = makeRequest({
        graphId: 'gin_test',
        documents: [makeDocument()],
      });

      await POST(req);
      expect(sessionCloseMock).toHaveBeenCalledTimes(1);
    });
  });
});
