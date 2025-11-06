/**
 * @fileType: script
 * @status: current
 * @updated: 2025-11-06
 * @tags: [graph, sprint, knowledge-management]
 * @priority: high
 * @complexity: medium
 * @dependencies: [neo4j-driver, fs, path]
 */

import neo4j, { Driver, Session } from 'neo4j-driver';
import * as fs from 'fs';
import * as path from 'path';
import * as dotenv from 'dotenv';

// Load environment variables
dotenv.config({ path: path.resolve(__dirname, '../.env') });

interface SprintDocument {
  filePath: string;
  title: string;
  fileType: string;
  tokens: number;
  description: string;
}

async function addSprintToGraph() {
  const driver = neo4j.driver(
    process.env.NEO4J_URI!,
    neo4j.auth.basic(process.env.NEO4J_USER!, process.env.NEO4J_PASSWORD!),
    { maxConnectionPoolSize: 10 }
  );

  const session: Session = driver.session({
    database: process.env.NEO4J_DATABASE || 'neo4j',
  });

  try {
    await driver.verifyConnectivity();
    console.log('✅ Connected to Neo4j');

    // 1. Create Sprint node
    const sprintResult = await session.run(`
      MERGE (s:Sprint {id: $id})
      SET s += $properties
      RETURN s
    `, {
      id: 'SPRINT-2025-10-27',
      properties: {
        title: 'Cloud-First Knowledge Graph Platform',
        startDate: '2025-10-27',
        endDate: '2025-11-24',
        duration: '4 weeks',
        type: 'foundation',
        status: 'active',
        progress: 0.262, // 26.2% (37/141 tasks)
        tasksCompleted: 37,
        tasksTotal: 141,
        daysRemaining: 18,
        goal: 'Launch MVP of cloud-first knowledge graph platform with GitHub OAuth, graph database, GraphQL API, and CLI integration',
        organizationId: 'watchhill-ai',
        projectId: 'ginko',
        updatedAt: new Date().toISOString(),
      },
    });
    const sprintNode = sprintResult.records[0].get('s');
    console.log(`✅ Created Sprint node: SPRINT-2025-10-27`);

    // 2. Define sprint documents
    const documents: SprintDocument[] = [
      {
        filePath: 'docs/sprints/SPRINT-2025-10-27-cloud-knowledge-graph.md',
        title: 'Sprint Dashboard',
        fileType: 'sprint-dashboard',
        tokens: 2000,
        description: 'Main sprint file with progress tracking, current priorities, and quick links',
      },
      {
        filePath: 'docs/sprints/SPRINT-2025-10-27-tasks-detailed.md',
        title: 'Detailed Task Specifications',
        fileType: 'sprint-tasks',
        tokens: 8000,
        description: 'Complete technical specifications for all sprint tasks with acceptance criteria',
      },
      {
        filePath: 'docs/sprints/SPRINT-2025-10-27-plan-and-risks.md',
        title: 'Plan & Risk Management',
        fileType: 'sprint-planning',
        tokens: 1500,
        description: 'Success metrics, risk analysis, mitigation strategies, and retrospective template',
      },
      {
        filePath: 'docs/sprints/sessions/2025-11-03-01-relationship-quality.md',
        title: 'Session: Relationship Quality Analysis',
        fileType: 'session-log',
        tokens: 2000,
        description: 'Session accomplishments: CLI performance optimization, relationship quality analysis, ADR-042 creation',
      },
      {
        filePath: 'docs/sprints/sessions/2025-11-04-01-unified-api-auth.md',
        title: 'Session: Unified API Auth',
        fileType: 'session-log',
        tokens: 800,
        description: 'Session accomplishments: ADR-043 Phase 3 completion, unified domain architecture deployment',
      },
      {
        filePath: 'docs/sprints/sessions/2025-11-05-01-production-deployment.md',
        title: 'Session: Production Deployment',
        fileType: 'session-log',
        tokens: 1800,
        description: 'Session accomplishments: Vercel CI/CD fix, production deployment, API authentication resolution',
      },
    ];

    // 3. Create Document nodes and relationships
    for (const doc of documents) {
      const fullPath = path.join(process.cwd(), doc.filePath);
      const exists = fs.existsSync(fullPath);
      const stats = exists ? fs.statSync(fullPath) : null;
      const content = exists ? fs.readFileSync(fullPath, 'utf-8') : '';
      const lines = content.split('\n').length;

      // Create document and relationship in one query
      await session.run(`
        MATCH (s:Sprint {id: $sprintId})
        MERGE (d:Document:SprintDocument {filePath: $filePath})
        SET d += $properties
        MERGE (s)-[r:HAS_DOCUMENT]->(d)
        SET r.createdAt = datetime()
        RETURN d
      `, {
        sprintId: 'SPRINT-2025-10-27',
        filePath: doc.filePath,
        properties: {
          title: doc.title,
          fileType: doc.fileType,
          estimatedTokens: doc.tokens,
          actualLines: lines,
          description: doc.description,
          exists: exists,
          lastModified: stats ? stats.mtime.toISOString() : null,
          organizationId: 'watchhill-ai',
          projectId: 'ginko',
          updatedAt: new Date().toISOString(),
        },
      });
      console.log(`✅ Created Document + relationship: ${doc.title}`);
    }

    // 4. Create relationships between documents
    // Main dashboard REFERENCES tasks-detailed and plan-and-risks
    await session.run(`
      MATCH (main:Document {fileType: 'sprint-dashboard'})
      MATCH (tasks:Document {fileType: 'sprint-tasks'})
      MERGE (main)-[r:REFERENCES]->(tasks)
      SET r.context = 'Links to detailed task specifications',
          r.createdAt = datetime()
    `);
    console.log('✅ Created relationship: Dashboard → Tasks');

    await session.run(`
      MATCH (main:Document {fileType: 'sprint-dashboard'})
      MATCH (plan:Document {fileType: 'sprint-planning'})
      MERGE (main)-[r:REFERENCES]->(plan)
      SET r.context = 'Links to planning and risk management',
          r.createdAt = datetime()
    `);
    console.log('✅ Created relationship: Dashboard → Plan');

    // 5. Create relationships to ADRs and PRDs
    const adrIds = ['ADR-039', 'ADR-041', 'ADR-042', 'ADR-043', 'ADR-044'];
    const prdIds = ['PRD-010'];

    for (const adrId of adrIds) {
      const result = await session.run(`
        MATCH (s:Sprint {id: $sprintId})
        MATCH (adr:ADR {id: $adrId})
        MERGE (s)-[r:IMPLEMENTS]->(adr)
        SET r.context = $context,
            r.createdAt = datetime()
        RETURN adr
      `, {
        sprintId: 'SPRINT-2025-10-27',
        adrId,
        context: `Sprint implements architecture decisions from ${adrId}`,
      });

      if (result.records.length > 0) {
        console.log(`✅ Created relationship: Sprint → ${adrId}`);
      } else {
        console.log(`⚠️  ADR not found: ${adrId}`);
      }
    }

    for (const prdId of prdIds) {
      const result = await session.run(`
        MATCH (s:Sprint {id: $sprintId})
        MATCH (prd:PRD {id: $prdId})
        MERGE (s)-[r:DELIVERS]->(prd)
        SET r.context = $context,
            r.createdAt = datetime()
        RETURN prd
      `, {
        sprintId: 'SPRINT-2025-10-27',
        prdId,
        context: `Sprint delivers features defined in ${prdId}`,
      });

      if (result.records.length > 0) {
        console.log(`✅ Created relationship: Sprint → ${prdId}`);
      } else {
        console.log(`⚠️  PRD not found: ${prdId}`);
      }
    }

    // 6. Get summary stats
    const statsResult = await session.run(`
      MATCH (n) WITH count(n) as nodeCount
      MATCH ()-[r]->() WITH nodeCount, count(r) as relCount
      RETURN nodeCount, relCount
    `);
    const stats = statsResult.records[0];
    console.log('\n📊 Graph Statistics:');
    console.log(`   Total nodes: ${stats.get('nodeCount')}`);
    console.log(`   Total relationships: ${stats.get('relCount')}`);

    console.log('\n✅ Sprint documents successfully added to knowledge graph!');
  } catch (error) {
    console.error('❌ Error adding sprint to graph:', error);
    throw error;
  } finally {
    await session.close();
    await driver.close();
    console.log('✅ Disconnected from Neo4j');
  }
}

// Run the script
addSprintToGraph().catch(console.error);
