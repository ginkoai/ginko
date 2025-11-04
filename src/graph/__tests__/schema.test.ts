/**
 * @fileType: utility
 * @status: current
 * @updated: 2025-10-28
 * @tags: [testing, neo4j, schema, integration-test]
 * @related: [neo4j-client.ts, schema/]
 * @priority: high
 * @complexity: medium
 * @dependencies: [jest, neo4j-driver]
 */

import { Neo4jClient } from '../neo4j-client';
import { toNumber } from './setup';
import path from 'path';
import fs from 'fs/promises';

describe('Neo4j Schema', () => {
  let client: Neo4jClient;

  beforeAll(async () => {
    client = new Neo4jClient();
    await client.connect();
  });

  afterAll(async () => {
    await client.close();
  });

  describe('Schema Migrations', () => {
    it('should run migration 001 successfully', async () => {
      await expect(
        client.runMigration('001-initial-schema.cypher')
      ).resolves.not.toThrow();
    });

    it('should be idempotent (safe to run twice)', async () => {
      await client.runMigration('001-initial-schema.cypher');
      // Second run should not throw
      await expect(
        client.runMigration('001-initial-schema.cypher')
      ).resolves.not.toThrow();
    });

    it('should create all migration files in order', async () => {
      const migrations = [
        '001-initial-schema.cypher',
        '002-pattern-gotcha-nodes.cypher',
        '003-session-codefile-nodes.cypher',
        '004-contextmodule-nodes.cypher',
        '005-semantic-relationships.cypher',
        '006-temporal-relationships.cypher',
      ];

      for (const migration of migrations) {
        await expect(
          client.runMigration(migration)
        ).resolves.not.toThrow();
      }
    });
  });

  describe('Constraints', () => {
    beforeAll(async () => {
      // Ensure schema is set up
      await client.runMigration('001-initial-schema.cypher');
      await client.runMigration('002-pattern-gotcha-nodes.cypher');
      await client.runMigration('003-session-codefile-nodes.cypher');
      await client.runMigration('004-contextmodule-nodes.cypher');
    });

    it('should have constraint for ADR.id uniqueness', async () => {
      const constraints = await client.queryRecords('SHOW CONSTRAINTS');
      const adrConstraint = constraints.find(c =>
        c.labelsOrTypes && c.labelsOrTypes.includes('ADR') && c.properties.includes('id')
      );
      expect(adrConstraint).toBeDefined();
    });

    it('should have constraint for PRD.id uniqueness', async () => {
      const constraints = await client.queryRecords('SHOW CONSTRAINTS');
      const prdConstraint = constraints.find(c =>
        c.labelsOrTypes && c.labelsOrTypes.includes('PRD') && c.properties.includes('id')
      );
      expect(prdConstraint).toBeDefined();
    });

    it('should have constraint for Pattern.id uniqueness', async () => {
      const constraints = await client.queryRecords('SHOW CONSTRAINTS');
      const patternConstraint = constraints.find(c =>
        c.labelsOrTypes && c.labelsOrTypes.includes('Pattern') && c.properties.includes('id')
      );
      expect(patternConstraint).toBeDefined();
    });

    it('should have constraint for Gotcha.id uniqueness', async () => {
      const constraints = await client.queryRecords('SHOW CONSTRAINTS');
      const gotchaConstraint = constraints.find(c =>
        c.labelsOrTypes && c.labelsOrTypes.includes('Gotcha') && c.properties.includes('id')
      );
      expect(gotchaConstraint).toBeDefined();
    });

    it('should enforce unique constraint on ADR.id', async () => {
      // Create first ADR
      await client.query(`
        CREATE (a:ADR {id: 'ADR-TEST-001', title: 'Test', project_id: 'test'})
      `);

      // Try to create duplicate - should fail
      await expect(
        client.query(`
          CREATE (a:ADR {id: 'ADR-TEST-001', title: 'Duplicate', project_id: 'test'})
        `)
      ).rejects.toThrow();

      // Cleanup
      await client.query(`
        MATCH (a:ADR {id: 'ADR-TEST-001'}) DELETE a
      `);
    });
  });

  describe('Indexes', () => {
    beforeAll(async () => {
      // Ensure schema is set up
      await client.runMigration('001-initial-schema.cypher');
      await client.runMigration('002-pattern-gotcha-nodes.cypher');
      await client.runMigration('003-session-codefile-nodes.cypher');
      await client.runMigration('004-contextmodule-nodes.cypher');
    });

    it('should have at least 39 indexes total', async () => {
      const indexes = await client.queryRecords('SHOW INDEXES');
      expect(indexes.length).toBeGreaterThanOrEqual(39);
    });

    it('should have full-text index for ADR', async () => {
      const indexes = await client.queryRecords('SHOW INDEXES');
      const adrFulltext = indexes.find(i =>
        i.name === 'adr_fulltext' || (i.type === 'FULLTEXT' && i.labelsOrTypes?.includes('ADR'))
      );
      expect(adrFulltext).toBeDefined();
    });

    it('should have full-text index for PRD', async () => {
      const indexes = await client.queryRecords('SHOW INDEXES');
      const prdFulltext = indexes.find(i =>
        i.name === 'prd_fulltext' || (i.type === 'FULLTEXT' && i.labelsOrTypes?.includes('PRD'))
      );
      expect(prdFulltext).toBeDefined();
    });

    it('should have range index on ADR.project_id', async () => {
      const indexes = await client.queryRecords('SHOW INDEXES');
      const projectIndex = indexes.find(i =>
        (i.name === 'adr_project_idx' ||
         (i.labelsOrTypes?.includes('ADR') && i.properties?.includes('project_id')))
      );
      expect(projectIndex).toBeDefined();
    });

    it('should have range index on Session.started_at', async () => {
      const indexes = await client.queryRecords('SHOW INDEXES');
      const timeIndex = indexes.find(i =>
        i.labelsOrTypes?.includes('Session') && i.properties?.includes('started_at')
      );
      expect(timeIndex).toBeDefined();
    });
  });

  describe('Node Types', () => {
    beforeAll(async () => {
      // Ensure all migrations are run
      const migrations = [
        '001-initial-schema.cypher',
        '002-pattern-gotcha-nodes.cypher',
        '003-session-codefile-nodes.cypher',
        '004-contextmodule-nodes.cypher',
      ];
      for (const migration of migrations) {
        await client.runMigration(migration);
      }
    });

    it('should support all 7 node types', async () => {
      const testProjectId = 'test-schema-nodes';

      // Create one of each node type
      await client.query(`
        CREATE (adr:ADR {id: 'TEST-ADR', title: 'Test ADR', project_id: $projectId})
        CREATE (prd:PRD {id: 'TEST-PRD', title: 'Test PRD', project_id: $projectId})
        CREATE (p:Pattern {id: 'TEST-PATTERN', title: 'Test Pattern', project_id: $projectId})
        CREATE (g:Gotcha {id: 'TEST-GOTCHA', title: 'Test Gotcha', project_id: $projectId})
        CREATE (s:Session {id: 'TEST-SESSION', started_at: datetime(), project_id: $projectId})
        CREATE (cf:CodeFile {id: 'TEST-FILE', path: '/test.ts', project_id: $projectId})
        CREATE (cm:ContextModule {id: 'TEST-MODULE', name: 'Test Module', project_id: $projectId})
      `, { projectId: testProjectId });

      // Verify each node type exists
      const nodeTypes = ['ADR', 'PRD', 'Pattern', 'Gotcha', 'Session', 'CodeFile', 'ContextModule'];

      for (const nodeType of nodeTypes) {
        const result = await client.queryRecords(`
          MATCH (n:${nodeType} {project_id: $projectId})
          RETURN count(n) as count
        `, { projectId: testProjectId });

        expect(toNumber(result[0].count)).toBe(1);
      }

      // Cleanup
      await client.query(`
        MATCH (n {project_id: $projectId})
        DETACH DELETE n
      `, { projectId: testProjectId });
    });
  });

  describe('Schema Verification', () => {
    it('should verify schema without errors', async () => {
      await expect(client.verifySchema()).resolves.not.toThrow();
    });

    it('should have expected number of constraints', async () => {
      const constraints = await client.queryRecords('SHOW CONSTRAINTS');
      // At least 7 constraints (one per node type)
      expect(constraints.length).toBeGreaterThanOrEqual(7);
    });

    it('should have expected number of indexes', async () => {
      const indexes = await client.queryRecords('SHOW INDEXES');
      // At least 39 indexes as documented
      expect(indexes.length).toBeGreaterThanOrEqual(39);
    });
  });
});
