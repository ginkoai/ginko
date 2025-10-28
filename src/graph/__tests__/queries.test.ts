/**
 * @fileType: utility
 * @status: current
 * @updated: 2025-10-28
 * @tags: [testing, neo4j, performance, queries, integration-test]
 * @related: [neo4j-client.ts, schema.test.ts]
 * @priority: high
 * @complexity: medium
 * @dependencies: [jest, neo4j-driver]
 */

import { Neo4jClient } from '../neo4j-client';
import { TEST_PROJECT_ID, cleanupTestData, toNumber } from './setup';

describe('Neo4j Query Performance', () => {
  let client: Neo4jClient;

  beforeAll(async () => {
    client = new Neo4jClient();
    await client.connect();

    // Ensure schema is set up
    await client.runMigration('001-initial-schema.cypher');
    await client.runMigration('002-pattern-gotcha-nodes.cypher');
    await client.runMigration('003-session-codefile-nodes.cypher');
    await client.runMigration('004-contextmodule-nodes.cypher');
  });

  afterAll(async () => {
    await cleanupTestData(client);
    await client.close();
  });

  beforeEach(async () => {
    await cleanupTestData(client);
  });

  describe('Full-Text Search Performance', () => {
    beforeEach(async () => {
      // Create sample ADRs for testing
      for (let i = 1; i <= 10; i++) {
        await client.query(`
          MERGE (a:ADR {id: $id})
          SET a.title = $title,
              a.content = $content,
              a.summary = $summary,
              a.status = 'accepted',
              a.tags = ['graph', 'knowledge', 'ai'],
              a.project_id = $projectId
        `, {
          id: `ADR-${String(i).padStart(3, '0')}`,
          title: `Architecture Decision ${i}`,
          content: `This is a detailed architecture decision about knowledge graphs and AI systems. Decision number ${i}.`,
          summary: `Summary of decision ${i}`,
          projectId: TEST_PROJECT_ID
        });
      }
    });

    it('should perform full-text search in under 100ms', async () => {
      const start = Date.now();

      await client.query(`
        CALL db.index.fulltext.queryNodes('adr_fulltext', $query)
        YIELD node, score
        WHERE node.project_id = $projectId AND score > 0.5
        RETURN node.id as id, node.title as title, score
        ORDER BY score DESC
        LIMIT 10
      `, {
        query: 'knowledge graph',
        projectId: TEST_PROJECT_ID
      });

      const duration = Date.now() - start;
      expect(duration).toBeLessThan(100);
    });

    it('should return relevant results by score', async () => {
      const results = await client.queryRecords(`
        CALL db.index.fulltext.queryNodes('adr_fulltext', $query)
        YIELD node, score
        WHERE node.project_id = $projectId
        RETURN node.id as id, score
        ORDER BY score DESC
        LIMIT 5
      `, {
        query: 'architecture decision',
        projectId: TEST_PROJECT_ID
      });

      expect(results.length).toBeGreaterThan(0);
      expect(results.length).toBeLessThanOrEqual(5);

      // Verify scores are descending
      for (let i = 1; i < results.length; i++) {
        expect(results[i].score).toBeLessThanOrEqual(results[i - 1].score);
      }
    });
  });

  describe('Tag-Based Filtering Performance', () => {
    beforeEach(async () => {
      // Create ADRs with different tags
      await client.query(`
        MERGE (a1:ADR {id: 'ADR-001'}) SET a1.title = 'Auth Decision', a1.tags = ['auth', 'security'], a1.project_id = $projectId
        MERGE (a2:ADR {id: 'ADR-002'}) SET a2.title = 'Graph Decision', a2.tags = ['graph', 'database'], a2.project_id = $projectId
        MERGE (a3:ADR {id: 'ADR-003'}) SET a3.title = 'API Decision', a3.tags = ['api', 'rest'], a3.project_id = $projectId
      `, { projectId: TEST_PROJECT_ID });
    });

    it('should filter by tag in under 50ms', async () => {
      const start = Date.now();

      await client.queryRecords(`
        MATCH (a:ADR {project_id: $projectId})
        WHERE $tag IN a.tags
        RETURN a.id as id, a.title as title
      `, {
        projectId: TEST_PROJECT_ID,
        tag: 'graph'
      });

      const duration = Date.now() - start;
      expect(duration).toBeLessThan(50);
    });

    it('should return only matching tags', async () => {
      const results = await client.queryRecords(`
        MATCH (a:ADR {project_id: $projectId})
        WHERE $tag IN a.tags
        RETURN a.id as id, a.title as title, a.tags as tags
      `, {
        projectId: TEST_PROJECT_ID,
        tag: 'auth'
      });

      expect(results).toHaveLength(1);
      expect(results[0].id).toBe('ADR-001');
      expect(results[0].tags).toContain('auth');
    });
  });

  describe('Context Loading Performance', () => {
    beforeEach(async () => {
      // Create comprehensive test data
      await client.query(`
        MERGE (adr1:ADR {id: 'ADR-001'})
        SET adr1.title = 'Knowledge Graph Architecture',
            adr1.content = 'Using Neo4j for knowledge graphs',
            adr1.summary = 'Graph DB decision',
            adr1.tags = ['graph', 'architecture'],
            adr1.project_id = $projectId
        MERGE (adr2:ADR {id: 'ADR-002'})
        SET adr2.title = 'AI Context Loading',
            adr2.content = 'Optimizing context loading for AI',
            adr2.summary = 'Context optimization',
            adr2.tags = ['ai', 'performance'],
            adr2.project_id = $projectId
        MERGE (prd:PRD {id: 'PRD-001'})
        SET prd.title = 'Knowledge Graph Platform',
            prd.content = 'Build AI-first knowledge graph',
            prd.summary = 'Graph platform',
            prd.tags = ['graph', 'platform'],
            prd.project_id = $projectId
      `, { projectId: TEST_PROJECT_ID });
    });

    it('should load context in under 100ms', async () => {
      const start = Date.now();

      await client.query(`
        CALL db.index.fulltext.queryNodes('adr_fulltext', $query)
        YIELD node, score
        WHERE node.project_id = $projectId AND score > 0.5
        WITH node, score
        ORDER BY score DESC
        LIMIT 5
        RETURN node.id as id, node.title as title, labels(node)[0] as type, score
      `, {
        query: 'graph architecture',
        projectId: TEST_PROJECT_ID
      });

      const duration = Date.now() - start;
      expect(duration).toBeLessThan(100);
    });

    it('should load mixed document types', async () => {
      const results = await client.queryRecords(`
        MATCH (n {project_id: $projectId})
        WHERE n:ADR OR n:PRD
        RETURN n.id as id, labels(n)[0] as type
      `, { projectId: TEST_PROJECT_ID });

      expect(results.length).toBe(3);

      const types = results.map(r => r.type);
      expect(types).toContain('ADR');
      expect(types).toContain('PRD');
    });
  });

  describe('Multi-Hop Graph Traversal', () => {
    beforeEach(async () => {
      // Create nodes with relationships
      await client.query(`
        MERGE (prd:PRD {id: 'PRD-001'}) SET prd.title = 'Feature Spec', prd.project_id = $projectId
        MERGE (adr:ADR {id: 'ADR-001'}) SET adr.title = 'Implementation Decision', adr.project_id = $projectId
        MERGE (cf:CodeFile {id: 'CF-001'}) SET cf.path = 'src/feature.ts', cf.project_id = $projectId
        MERGE (adr)-[:IMPLEMENTS]->(prd)
        MERGE (cf)-[:REALIZES]->(adr)
      `, { projectId: TEST_PROJECT_ID });
    });

    it('should traverse 2-hop path in under 100ms', async () => {
      const start = Date.now();

      await client.queryRecords(`
        MATCH (cf:CodeFile {project_id: $projectId})-[:REALIZES]->(adr:ADR)-[:IMPLEMENTS]->(prd:PRD)
        RETURN cf.path as code, adr.title as decision, prd.title as requirement
      `, { projectId: TEST_PROJECT_ID });

      const duration = Date.now() - start;
      expect(duration).toBeLessThan(100);
    });

    it('should return complete path', async () => {
      const results = await client.queryRecords(`
        MATCH (cf:CodeFile {project_id: $projectId})-[:REALIZES]->(adr:ADR)-[:IMPLEMENTS]->(prd:PRD)
        RETURN cf.path as code, adr.title as decision, prd.title as requirement
      `, { projectId: TEST_PROJECT_ID });

      expect(results).toHaveLength(1);
      expect(results[0].code).toBe('src/feature.ts');
      expect(results[0].decision).toBe('Implementation Decision');
      expect(results[0].requirement).toBe('Feature Spec');
    });
  });

  describe('Multi-Tenancy Performance', () => {
    beforeEach(async () => {
      // Create nodes for different projects
      for (let projectNum = 1; projectNum <= 3; projectNum++) {
        for (let i = 1; i <= 10; i++) {
          await client.query(`
            CREATE (a:ADR {
              id: $id,
              title: $title,
              project_id: $projectId
            })
          `, {
            id: `ADR-P${projectNum}-${String(i).padStart(3, '0')}`,
            title: `Project ${projectNum} Decision ${i}`,
            projectId: `project-${projectNum}`
          });
        }
      }
    });

    afterEach(async () => {
      // Clean up all test projects
      await client.query(`
        MATCH (n)
        WHERE n.project_id IN ['project-1', 'project-2', 'project-3']
        DETACH DELETE n
      `);
    });

    it('should filter by project_id efficiently', async () => {
      const start = Date.now();

      const results = await client.queryRecords(`
        MATCH (a:ADR {project_id: $projectId})
        RETURN count(a) as count
      `, { projectId: 'project-2' });

      const duration = Date.now() - start;
      expect(duration).toBeLessThan(50);
      expect(toNumber(results[0].count)).toBe(10);
    });

    it('should not leak data between projects', async () => {
      const project1 = await client.queryRecords(`
        MATCH (a:ADR {project_id: $projectId})
        RETURN a.id as id
      `, { projectId: 'project-1' });

      const project2 = await client.queryRecords(`
        MATCH (a:ADR {project_id: $projectId})
        RETURN a.id as id
      `, { projectId: 'project-2' });

      expect(project1).toHaveLength(10);
      expect(project2).toHaveLength(10);

      // Verify no overlap
      const project1Ids = project1.map(r => r.id);
      const project2Ids = project2.map(r => r.id);

      const overlap = project1Ids.filter(id => project2Ids.includes(id));
      expect(overlap).toHaveLength(0);
    });
  });

  describe('Temporal Queries', () => {
    beforeEach(async () => {
      // Create sessions with timestamps
      const now = new Date();
      for (let i = 0; i < 5; i++) {
        const timestamp = new Date(now.getTime() - i * 24 * 60 * 60 * 1000); // Days ago
        await client.query(`
          CREATE (s:Session {
            id: $id,
            started_at: datetime($timestamp),
            project_id: $projectId
          })
        `, {
          id: `SESSION-${i}`,
          timestamp: timestamp.toISOString(),
          projectId: TEST_PROJECT_ID
        });
      }
    });

    it('should query by date range efficiently', async () => {
      const start = Date.now();

      const threeDaysAgo = new Date(Date.now() - 3 * 24 * 60 * 60 * 1000);
      await client.queryRecords(`
        MATCH (s:Session {project_id: $projectId})
        WHERE s.started_at >= datetime($startDate)
        RETURN s.id as id
        ORDER BY s.started_at DESC
      `, {
        projectId: TEST_PROJECT_ID,
        startDate: threeDaysAgo.toISOString()
      });

      const duration = Date.now() - start;
      expect(duration).toBeLessThan(50);
    });

    it('should return sessions in chronological order', async () => {
      const results = await client.queryRecords(`
        MATCH (s:Session {project_id: $projectId})
        RETURN s.id as id, s.started_at as started
        ORDER BY s.started_at DESC
      `, { projectId: TEST_PROJECT_ID });

      expect(results).toHaveLength(5);

      // Verify descending order
      for (let i = 1; i < results.length; i++) {
        const prev = new Date(results[i - 1].started);
        const curr = new Date(results[i].started);
        expect(prev.getTime()).toBeGreaterThanOrEqual(curr.getTime());
      }
    });
  });
});
