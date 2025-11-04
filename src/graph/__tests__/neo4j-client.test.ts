/**
 * @fileType: utility
 * @status: current
 * @updated: 2025-10-28
 * @tags: [testing, neo4j, unit-test, integration-test]
 * @related: [neo4j-client.ts, setup.ts]
 * @priority: high
 * @complexity: medium
 * @dependencies: [jest, neo4j-driver]
 */

import { Neo4jClient, ensureConnected } from '../neo4j-client';
import { TEST_PROJECT_ID, cleanupTestData, toNumber } from './setup';

describe('Neo4jClient', () => {
  let client: Neo4jClient;

  beforeAll(async () => {
    client = new Neo4jClient();
    await client.connect();
  });

  afterAll(async () => {
    await cleanupTestData(client);
    await client.close();
  });

  afterEach(async () => {
    await cleanupTestData(client);
  });

  describe('Connection Management', () => {
    it('should connect to Neo4j successfully', async () => {
      const testClient = new Neo4jClient();
      await expect(testClient.connect()).resolves.not.toThrow();
      await testClient.close();
    });

    it('should handle multiple connect calls gracefully', async () => {
      const testClient = new Neo4jClient();
      await testClient.connect();
      await testClient.connect(); // Second call should be no-op
      await testClient.close();
    });

    it('should throw error when getting session before connect', () => {
      const testClient = new Neo4jClient();
      expect(() => testClient.getSession()).toThrow('Not connected to Neo4j');
    });

    it('should close connection successfully', async () => {
      const testClient = new Neo4jClient();
      await testClient.connect();
      await expect(testClient.close()).resolves.not.toThrow();
    });
  });

  describe('Query Execution', () => {
    it('should execute simple query successfully', async () => {
      const result = await client.query('RETURN 1 as num');
      expect(result.records.length).toBe(1);
      expect(toNumber(result.records[0].get('num'))).toBe(1);
    });

    it('should execute query with parameters', async () => {
      const result = await client.query(
        'RETURN $value as result',
        { value: 'test' }
      );
      expect(result.records[0].get('result')).toBe('test');
    });

    it('should return records as objects', async () => {
      const records = await client.queryRecords(
        'RETURN $name as name, $age as age',
        { name: 'Alice', age: 30 }
      );
      expect(records).toHaveLength(1);
      expect(records[0].name).toBe('Alice');
      expect(toNumber(records[0].age)).toBe(30);
    });

    it('should handle empty results', async () => {
      const records = await client.queryRecords(
        'MATCH (n:NonExistent) RETURN n'
      );
      expect(records).toHaveLength(0);
    });
  });

  describe('Node Creation and Retrieval', () => {
    it('should create and retrieve a node', async () => {
      // Create node
      await client.query(`
        MERGE (a:ADR {id: $id})
        SET a.title = $title, a.project_id = $projectId
      `, {
        id: 'ADR-TEST-CREATE-001',
        title: 'Test Decision',
        projectId: TEST_PROJECT_ID
      });

      // Retrieve node
      const records = await client.queryRecords(`
        MATCH (a:ADR {id: $id, project_id: $projectId})
        RETURN a.id as id, a.title as title
      `, {
        id: 'ADR-TEST-CREATE-001',
        projectId: TEST_PROJECT_ID
      });

      expect(records).toHaveLength(1);
      expect(records[0].id).toBe('ADR-TEST-CREATE-001');
      expect(records[0].title).toBe('Test Decision');
    });

    it('should handle multiple nodes', async () => {
      // Create multiple nodes
      for (let i = 1; i <= 3; i++) {
        await client.query(`
          MERGE (a:ADR {id: $id})
          SET a.title = $title, a.project_id = $projectId
        `, {
          id: `ADR-MULTI-${String(i).padStart(3, '0')}`,
          title: `Decision ${i}`,
          projectId: TEST_PROJECT_ID
        });
      }

      // Count nodes with specific prefix
      const records = await client.queryRecords(`
        MATCH (a:ADR {project_id: $projectId})
        WHERE a.id STARTS WITH 'ADR-MULTI'
        RETURN count(a) as count
      `, { projectId: TEST_PROJECT_ID });

      expect(toNumber(records[0].count)).toBe(3);
    });
  });

  describe('Schema Operations', () => {
    it('should run multiple statements', async () => {
      const statements = `
        CREATE (a:TestNode {id: 'test1', project_id: '${TEST_PROJECT_ID}'});
        CREATE (b:TestNode {id: 'test2', project_id: '${TEST_PROJECT_ID}'});
        CREATE (c:TestNode {id: 'test3', project_id: '${TEST_PROJECT_ID}'})
      `;

      await expect(
        client.runMultipleStatements(statements)
      ).resolves.not.toThrow();

      // Verify nodes created
      const count = await client.queryRecords(`
        MATCH (n:TestNode {project_id: $projectId})
        RETURN count(n) as count
      `, { projectId: TEST_PROJECT_ID });

      expect(toNumber(count[0].count)).toBe(3);
    });

    it('should skip already existing constraints gracefully', async () => {
      const constraint = `
        CREATE CONSTRAINT test_unique IF NOT EXISTS
        FOR (n:TestNode)
        REQUIRE n.id IS UNIQUE
      `;

      // First run should succeed
      await expect(
        client.runMultipleStatements(constraint)
      ).resolves.not.toThrow();

      // Second run should also succeed (idempotent)
      await expect(
        client.runMultipleStatements(constraint)
      ).resolves.not.toThrow();
    });

    it('should get database statistics', async () => {
      // Create some test nodes
      await client.query(`
        CREATE (a:TestADR {id: 'test1', project_id: $projectId})
        CREATE (b:TestPRD {id: 'test2', project_id: $projectId})
      `, { projectId: TEST_PROJECT_ID });

      const stats = await client.getStats();
      expect(stats).toBeInstanceOf(Array);
      expect(stats.length).toBeGreaterThan(0);
    });
  });

  describe('Multi-Tenancy', () => {
    it('should isolate nodes by project_id', async () => {
      // Create nodes for different projects
      await client.query(`
        CREATE (a:ADR {id: 'ADR-001', project_id: 'project-1'})
        CREATE (b:ADR {id: 'ADR-002', project_id: 'project-2'})
      `);

      // Query project-1 nodes
      const project1 = await client.queryRecords(`
        MATCH (a:ADR {project_id: $projectId})
        RETURN a.id as id
      `, { projectId: 'project-1' });

      expect(project1).toHaveLength(1);
      expect(project1[0].id).toBe('ADR-001');

      // Query project-2 nodes
      const project2 = await client.queryRecords(`
        MATCH (a:ADR {project_id: $projectId})
        RETURN a.id as id
      `, { projectId: 'project-2' });

      expect(project2).toHaveLength(1);
      expect(project2[0].id).toBe('ADR-002');

      // Cleanup both projects
      await client.query('MATCH (n:ADR) WHERE n.project_id IN $ids DETACH DELETE n', {
        ids: ['project-1', 'project-2']
      });
    });
  });

  describe('Singleton Instance', () => {
    it('should provide ensureConnected helper', async () => {
      const instance = await ensureConnected();
      expect(instance).toBeInstanceOf(Neo4jClient);
    });
  });

  describe('Error Handling', () => {
    it('should handle invalid Cypher syntax', async () => {
      await expect(
        client.query('INVALID CYPHER SYNTAX')
      ).rejects.toThrow();
    });

    it('should handle connection errors gracefully', async () => {
      const badClient = new Neo4jClient({
        uri: 'bolt://invalid-host:7687',
        user: 'neo4j',
        password: 'wrong'
      });

      await expect(badClient.connect()).rejects.toThrow();
    });
  });
});
