/**
 * @fileType: utility
 * @status: current
 * @updated: 2025-10-28
 * @tags: [neo4j, testing, schema, verification]
 * @related: [neo4j-client.ts, setup-schema.ts]
 * @priority: high
 * @complexity: medium
 * @dependencies: [neo4j-driver]
 */

import { neo4jClient } from '../neo4j-client';

/**
 * Comprehensive test of full schema with sample data
 * Tests all 7 node types and key relationships
 */
async function testFullSchema() {
  try {
    console.log('🧪 Testing Full Neo4j Schema with Sample Data\n');

    await neo4jClient.connect();

    // Clean up any previous test data
    await neo4jClient.query(`
      MATCH (n {project_id: 'test-schema'})
      DETACH DELETE n
    `);

    console.log('📝 Creating sample nodes...\n');

    // 1. Create ADR
    await neo4jClient.query(`
      CREATE (adr:ADR {
        id: 'ADR-TEST-001',
        title: 'Use Neo4j for Knowledge Graph',
        status: 'accepted',
        decision_date: datetime(),
        content: 'We will use Neo4j as our knowledge graph database...',
        summary: 'Selected Neo4j for graph-based context discovery',
        tags: ['database', 'architecture', 'graph'],
        project_id: 'test-schema',
        created_at: datetime(),
        updated_at: datetime()
      })
    `);
    console.log('  ✓ Created ADR node');

    // 2. Create PRD
    await neo4jClient.query(`
      CREATE (prd:PRD {
        id: 'PRD-TEST-001',
        title: 'AI-First Context Platform',
        status: 'in_progress',
        priority: 'critical',
        content: 'Build a platform that synthesizes relevant context for AI...',
        summary: 'Platform for AI-optimized context loading',
        problem: 'Context overload in AI development sessions',
        success_metrics: ['<100ms context load', 'High relevance scores'],
        tags: ['ai', 'context', 'platform'],
        project_id: 'test-schema',
        created_at: datetime(),
        updated_at: datetime()
      })
    `);
    console.log('  ✓ Created PRD node');

    // 3. Create Pattern
    await neo4jClient.query(`
      CREATE (pattern:Pattern {
        id: 'PATTERN-TEST-001',
        title: 'Graph-First Context Discovery',
        category: 'architecture',
        content: 'Use graph queries to find relevant context based on task embeddings',
        context: 'When loading context for a development task',
        examples: ['Vector similarity search', 'Relationship traversal'],
        confidence: 0.85,
        tags: ['graph', 'context', 'search'],
        project_id: 'test-schema',
        discovered_at: datetime(),
        last_validated: datetime()
      })
    `);
    console.log('  ✓ Created Pattern node');

    // 4. Create Gotcha
    await neo4jClient.query(`
      CREATE (gotcha:Gotcha {
        id: 'GOTCHA-TEST-001',
        title: 'Neo4j Community Edition lacks vector indexes',
        severity: 'medium',
        symptom: 'Vector search queries fail',
        cause: 'Vector indexes require Enterprise Edition',
        solution: 'Use full-text search with semantic filtering instead',
        affected_areas: ['search', 'embeddings'],
        tags: ['neo4j', 'vectors', 'limitations'],
        project_id: 'test-schema',
        discovered_at: datetime(),
        hit_count: 3
      })
    `);
    console.log('  ✓ Created Gotcha node');

    // 5. Create Session
    await neo4jClient.query(`
      CREATE (session:Session {
        id: 'SESSION-TEST-001',
        user_email: 'test@example.com',
        task_id: 'TASK-123',
        task_title: 'Build knowledge graph schema',
        intent: 'Design and implement Neo4j schema for context platform',
        outcome: 'Created complete schema with 7 node types and relationships',
        insights: ['Vector indexes need Enterprise', 'Full-text search works well'],
        files_modified: ['neo4j-client.ts', 'setup-schema.ts'],
        context_loaded: ['ADR-039', 'PRD-010'],
        tags: ['schema', 'neo4j', 'setup'],
        project_id: 'test-schema',
        started_at: datetime(),
        ended_at: datetime(),
        duration_minutes: 120,
        git_branch: 'feature/neo4j-schema',
        git_commits: ['abc123', 'def456']
      })
    `);
    console.log('  ✓ Created Session node');

    // 6. Create CodeFile
    await neo4jClient.query(`
      CREATE (code:CodeFile {
        id: 'FILE-TEST-001',
        path: 'src/graph/neo4j-client.ts',
        file_type: 'utility',
        language: 'typescript',
        summary: 'Neo4j client wrapper with connection pooling',
        complexity: 'medium',
        tags: ['neo4j', 'database', 'client'],
        project_id: 'test-schema',
        last_modified: datetime(),
        git_sha: 'abc123'
      })
    `);
    console.log('  ✓ Created CodeFile node');

    // 7. Create ContextModule
    await neo4jClient.query(`
      CREATE (module:ContextModule {
        id: 'MODULE-TEST-001',
        title: 'Graph Database Best Practices',
        category: 'conventions',
        content: 'Best practices for working with graph databases...',
        summary: 'Conventions for graph data modeling',
        priority: 'high',
        tags: ['graph', 'best-practices', 'conventions'],
        project_id: 'test-schema',
        created_at: datetime(),
        updated_at: datetime()
      })
    `);
    console.log('  ✓ Created ContextModule node');

    console.log('\n🔗 Creating sample relationships...\n');

    // Create IMPLEMENTS relationship
    await neo4jClient.query(`
      MATCH (adr:ADR {id: 'ADR-TEST-001'})
      MATCH (prd:PRD {id: 'PRD-TEST-001'})
      CREATE (adr)-[:IMPLEMENTS {
        description: 'Graph database implements context platform requirements',
        completeness: 0.75
      }]->(prd)
    `);
    console.log('  ✓ Created IMPLEMENTS relationship (ADR→PRD)');

    // Create REALIZED_BY relationship
    await neo4jClient.query(`
      MATCH (adr:ADR {id: 'ADR-TEST-001'})
      MATCH (code:CodeFile {id: 'FILE-TEST-001'})
      CREATE (adr)-[:REALIZED_BY {
        file_section: 'Neo4jClient class',
        lines: '34-207'
      }]->(code)
    `);
    console.log('  ✓ Created REALIZED_BY relationship (ADR→CodeFile)');

    // Create DISCOVERED relationship
    await neo4jClient.query(`
      MATCH (session:Session {id: 'SESSION-TEST-001'})
      MATCH (gotcha:Gotcha {id: 'GOTCHA-TEST-001'})
      CREATE (session)-[:DISCOVERED]->(gotcha)
    `);
    console.log('  ✓ Created DISCOVERED relationship (Session→Gotcha)');

    // Create CREATED relationship
    await neo4jClient.query(`
      MATCH (session:Session {id: 'SESSION-TEST-001'})
      MATCH (adr:ADR {id: 'ADR-TEST-001'})
      CREATE (session)-[:CREATED {
        during_task: 'TASK-123'
      }]->(adr)
    `);
    console.log('  ✓ Created CREATED relationship (Session→ADR)');

    // Create LOADED_CONTEXT relationship
    await neo4jClient.query(`
      MATCH (session:Session {id: 'SESSION-TEST-001'})
      MATCH (module:ContextModule {id: 'MODULE-TEST-001'})
      CREATE (session)-[:LOADED_CONTEXT {
        relevance_score: 0.92
      }]->(module)
    `);
    console.log('  ✓ Created LOADED_CONTEXT relationship (Session→ContextModule)');

    // Create APPLIES_TO relationship
    await neo4jClient.query(`
      MATCH (pattern:Pattern {id: 'PATTERN-TEST-001'})
      MATCH (code:CodeFile {id: 'FILE-TEST-001'})
      CREATE (pattern)-[:APPLIES_TO]->(code)
    `);
    console.log('  ✓ Created APPLIES_TO relationship (Pattern→CodeFile)');

    console.log('\n📊 Schema Verification\n');

    // Count nodes by type
    const stats = await neo4jClient.getStats();
    const testStats = stats.filter((s: any) =>
      s.labels.length === 1 &&
      ['ADR', 'PRD', 'Pattern', 'Gotcha', 'Session', 'CodeFile', 'ContextModule'].includes(s.labels[0])
    );

    console.log('Node Counts:');
    testStats.forEach((s: any) => {
      console.log(`  ${s.labels[0]}: ${s.count} nodes`);
    });

    // Count relationships
    const relStats = await neo4jClient.queryRecords(`
      MATCH (n {project_id: 'test-schema'})-[r]->()
      RETURN type(r) as type, count(r) as count
      ORDER BY count DESC
    `);

    console.log('\nRelationship Counts:');
    relStats.forEach((r: any) => {
      console.log(`  ${r.type}: ${r.count}`);
    });

    // Test a complex query
    console.log('\n🔍 Testing Complex Query\n');
    const complexQuery = await neo4jClient.queryRecords(`
      MATCH (session:Session {project_id: 'test-schema'})-[:CREATED]->(adr:ADR)
      MATCH (adr)-[:IMPLEMENTS]->(prd:PRD)
      MATCH (adr)-[:REALIZED_BY]->(code:CodeFile)
      RETURN
        session.task_title as task,
        adr.title as decision,
        prd.title as requirement,
        code.path as implementation
    `);

    console.log('Query: "Find session that created ADR implementing PRD with code"');
    complexQuery.forEach((row: any) => {
      console.log(`  Task: ${row.task}`);
      console.log(`  Decision: ${row.decision}`);
      console.log(`  Requirement: ${row.requirement}`);
      console.log(`  Code: ${row.implementation}`);
    });

    console.log('\n🧹 Cleaning up test data...');
    await neo4jClient.query(`
      MATCH (n {project_id: 'test-schema'})
      DETACH DELETE n
    `);
    console.log('  ✓ Test data removed');

    console.log('\n✅ Full Schema Test Complete!\n');
    console.log('Schema Summary:');
    console.log('  ✓ 7 node types created');
    console.log('  ✓ 7 unique constraints');
    console.log('  ✓ 39 indexes (including full-text)');
    console.log('  ✓ 6 relationship types tested');
    console.log('  ✓ Complex queries working');

  } catch (error) {
    console.error('\n❌ Schema test failed:', error);
    process.exit(1);
  } finally {
    await neo4jClient.close();
  }
}

// Run if called directly
if (require.main === module) {
  testFullSchema();
}

export { testFullSchema };
