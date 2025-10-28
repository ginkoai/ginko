/**
 * @fileType: utility
 * @status: current
 * @updated: 2025-10-28
 * @tags: [neo4j, testing, queries, performance]
 * @related: [neo4j-client.ts, test-full-schema.ts]
 * @priority: high
 * @complexity: medium
 * @dependencies: [neo4j-driver]
 */

import { neo4jClient } from '../neo4j-client';

/**
 * Test advanced query patterns and performance
 */
async function testAdvancedQueries() {
  try {
    console.log('🔬 Testing Advanced Neo4j Query Patterns\n');

    await neo4jClient.connect();

    // Set up test data
    console.log('📝 Setting up test data...\n');

    // Create multiple projects for multi-tenancy testing
    await neo4jClient.query(`
      CREATE (adr1:ADR {
        id: 'ADR-PROJ-A-001',
        title: 'Authentication Strategy',
        status: 'accepted',
        content: 'We will use JWT tokens for authentication with bcrypt password hashing',
        summary: 'JWT-based auth with bcrypt',
        tags: ['auth', 'security', 'jwt'],
        project_id: 'project-a',
        created_at: datetime(),
        updated_at: datetime()
      }),
      (adr2:ADR {
        id: 'ADR-PROJ-A-002',
        title: 'Database Selection',
        status: 'accepted',
        content: 'Selected Neo4j graph database for knowledge management and context discovery',
        summary: 'Neo4j for graph-based knowledge',
        tags: ['database', 'architecture', 'neo4j'],
        project_id: 'project-a',
        created_at: datetime(),
        updated_at: datetime()
      }),
      (adr3:ADR {
        id: 'ADR-PROJ-B-001',
        title: 'API Design Principles',
        status: 'proposed',
        content: 'RESTful API design with GraphQL for complex queries',
        summary: 'REST + GraphQL hybrid API',
        tags: ['api', 'architecture', 'graphql'],
        project_id: 'project-b',
        created_at: datetime(),
        updated_at: datetime()
      }),
      (pattern:Pattern {
        id: 'PATTERN-001',
        title: 'Bcrypt optimal rounds',
        category: 'security',
        content: 'Use bcrypt rounds=11 for optimal security/performance balance',
        context: 'Production authentication systems',
        confidence: 0.92,
        tags: ['security', 'performance', 'bcrypt'],
        project_id: 'project-a',
        discovered_at: datetime(),
        last_validated: datetime()
      }),
      (gotcha:Gotcha {
        id: 'GOTCHA-001',
        title: 'JWT expiration edge cases',
        severity: 'high',
        symptom: 'Users logged out unexpectedly',
        cause: 'Token expires during active session',
        solution: 'Implement refresh token rotation',
        affected_areas: ['auth', 'sessions'],
        hit_count: 5,
        tags: ['auth', 'jwt', 'sessions'],
        project_id: 'project-a',
        discovered_at: datetime()
      }),
      (session:Session {
        id: 'SESSION-001',
        user_email: 'dev@example.com',
        task_id: 'TASK-AUTH-001',
        task_title: 'Implement JWT authentication',
        intent: 'Add secure authentication to API',
        outcome: 'JWT auth with refresh tokens implemented',
        insights: ['Bcrypt rounds matter', 'Token expiration tricky'],
        tags: ['auth', 'security'],
        project_id: 'project-a',
        started_at: datetime(),
        ended_at: datetime(),
        duration_minutes: 180,
        git_branch: 'feature/jwt-auth'
      })
    `);

    // Create relationships
    await neo4jClient.query(`
      MATCH (pattern:Pattern {id: 'PATTERN-001'})
      MATCH (adr:ADR {id: 'ADR-PROJ-A-001'})
      CREATE (pattern)-[:APPLIES_TO]->(adr)
    `);

    await neo4jClient.query(`
      MATCH (session:Session {id: 'SESSION-001'})
      MATCH (adr:ADR {id: 'ADR-PROJ-A-001'})
      MATCH (gotcha:Gotcha {id: 'GOTCHA-001'})
      CREATE (session)-[:CREATED {during_task: 'TASK-AUTH-001'}]->(adr)
      CREATE (session)-[:ENCOUNTERED]->(gotcha)
    `);

    console.log('  ✓ Test data created\n');

    // Test 1: Full-text search
    console.log('🔍 Test 1: Full-Text Search\n');
    const searchStart = Date.now();

    const searchResults = await neo4jClient.queryRecords(`
      CALL db.index.fulltext.queryNodes('adr_fulltext', 'authentication jwt')
      YIELD node, score
      WHERE node.project_id = 'project-a'
      RETURN node.id as id, node.title as title, score
      ORDER BY score DESC
      LIMIT 5
    `);

    const searchTime = Date.now() - searchStart;
    console.log(`  Query Time: ${searchTime}ms`);
    console.log(`  Results Found: ${searchResults.length}`);
    searchResults.forEach((r: any) => {
      console.log(`    - ${r.id}: "${r.title}" (score: ${r.score.toFixed(2)})`);
    });
    console.log();

    // Test 2: Multi-hop traversal
    console.log('🔗 Test 2: Multi-Hop Graph Traversal\n');
    const traversalStart = Date.now();

    const traversalResults = await neo4jClient.queryRecords(`
      MATCH (session:Session {id: 'SESSION-001'})-[:CREATED]->(adr:ADR)
      MATCH (pattern:Pattern)-[:APPLIES_TO]->(adr)
      RETURN
        session.task_title as task,
        adr.title as decision,
        pattern.title as pattern,
        pattern.confidence as confidence
    `);

    const traversalTime = Date.now() - traversalStart;
    console.log(`  Query Time: ${traversalTime}ms`);
    console.log(`  Results:`);
    traversalResults.forEach((r: any) => {
      console.log(`    Task: ${r.task}`);
      console.log(`    Decision: ${r.decision}`);
      console.log(`    Applied Pattern: ${r.pattern} (confidence: ${r.confidence})`);
    });
    console.log();

    // Test 3: Multi-tenancy filtering
    console.log('🏢 Test 3: Multi-Tenancy Filtering\n');
    const multiTenancyStart = Date.now();

    const projectAResults = await neo4jClient.queryRecords(`
      MATCH (n)
      WHERE n.project_id = 'project-a'
      RETURN labels(n) as type, count(n) as count
      ORDER BY count DESC
    `);

    const projectBResults = await neo4jClient.queryRecords(`
      MATCH (n)
      WHERE n.project_id = 'project-b'
      RETURN labels(n) as type, count(n) as count
      ORDER BY count DESC
    `);

    const multiTenancyTime = Date.now() - multiTenancyStart;
    console.log(`  Query Time: ${multiTenancyTime}ms`);
    console.log(`  Project A nodes:`);
    projectAResults.forEach((r: any) => {
      console.log(`    ${r.type[0]}: ${r.count}`);
    });
    console.log(`  Project B nodes:`);
    projectBResults.forEach((r: any) => {
      console.log(`    ${r.type[0]}: ${r.count}`);
    });
    console.log();

    // Test 4: Aggregation query (context loading simulation)
    console.log('⚡ Test 4: Context Loading Query (Simulated)\n');
    const contextStart = Date.now();

    const contextResults = await neo4jClient.queryRecords(`
      MATCH (adr:ADR {project_id: 'project-a'})
      WHERE adr.status = 'accepted' AND any(tag IN adr.tags WHERE tag IN ['auth', 'security'])
      OPTIONAL MATCH (pattern:Pattern)-[:APPLIES_TO]->(adr)
      OPTIONAL MATCH (gotcha:Gotcha {project_id: 'project-a'})
      WHERE any(tag IN gotcha.tags WHERE tag IN ['auth', 'security'])
      RETURN
        adr.id as adr_id,
        adr.title as adr_title,
        collect(DISTINCT pattern.title) as patterns,
        collect(DISTINCT gotcha.title) as gotchas
      LIMIT 5
    `);

    const contextTime = Date.now() - contextStart;
    console.log(`  Query Time: ${contextTime}ms`);
    console.log(`  Loaded Context:`);
    contextResults.forEach((r: any) => {
      console.log(`    ADR: ${r.adr_id} - ${r.adr_title}`);
      if (r.patterns.filter((p: any) => p).length > 0) {
        console.log(`      Patterns: ${r.patterns.filter((p: any) => p).join(', ')}`);
      }
      if (r.gotchas.filter((g: any) => g).length > 0) {
        console.log(`      Gotchas: ${r.gotchas.filter((g: any) => g).join(', ')}`);
      }
    });
    console.log();

    // Test 5: Temporal query
    console.log('📅 Test 5: Temporal Query (Session Timeline)\n');
    const temporalStart = Date.now();

    const temporalResults = await neo4jClient.queryRecords(`
      MATCH (s:Session {project_id: 'project-a'})
      OPTIONAL MATCH (s)-[r:CREATED|ENCOUNTERED]->(n)
      RETURN
        s.task_title as task,
        s.duration_minutes as duration,
        type(r) as action,
        labels(n)[0] as artifact_type,
        CASE
          WHEN n.title IS NOT NULL THEN n.title
          ELSE null
        END as artifact
      ORDER BY s.started_at ASC
    `);

    const temporalTime = Date.now() - temporalStart;
    console.log(`  Query Time: ${temporalTime}ms`);
    console.log(`  Timeline:`);
    temporalResults.forEach((r: any) => {
      if (r.action && r.artifact) {
        console.log(`    ${r.task} (${r.duration}min)`);
        console.log(`      → ${r.action} ${r.artifact_type}: ${r.artifact}`);
      }
    });
    console.log();

    // Clean up
    console.log('🧹 Cleaning up test data...');
    await neo4jClient.query(`
      MATCH (n)
      WHERE n.project_id IN ['project-a', 'project-b']
      DETACH DELETE n
    `);
    console.log('  ✓ Test data removed\n');

    // Performance summary
    console.log('📊 Performance Summary\n');
    console.log(`  Full-text search: ${searchTime}ms ${searchTime < 50 ? '✓' : '⚠️'}`);
    console.log(`  Multi-hop traversal: ${traversalTime}ms ${traversalTime < 100 ? '✓' : '⚠️'}`);
    console.log(`  Multi-tenancy filter: ${multiTenancyTime}ms ${multiTenancyTime < 50 ? '✓' : '⚠️'}`);
    console.log(`  Context loading: ${contextTime}ms ${contextTime < 100 ? '✓' : '⚠️'}`);
    console.log(`  Temporal query: ${temporalTime}ms ${temporalTime < 100 ? '✓' : '⚠️'}`);
    console.log();

    const allPassing = searchTime < 50 && traversalTime < 100 &&
                       multiTenancyTime < 50 && contextTime < 100 && temporalTime < 100;

    if (allPassing) {
      console.log('✅ All performance targets met!');
    } else {
      console.log('⚠️  Some queries above target (acceptable for MVP)');
    }

  } catch (error) {
    console.error('\n❌ Advanced query test failed:', error);
    process.exit(1);
  } finally {
    await neo4jClient.close();
  }
}

// Run if called directly
if (require.main === module) {
  testAdvancedQueries();
}

export { testAdvancedQueries };
