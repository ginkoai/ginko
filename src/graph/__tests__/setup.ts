/**
 * @fileType: config
 * @status: current
 * @updated: 2025-10-28
 * @tags: [testing, jest, neo4j, setup]
 * @related: [neo4j-client.ts]
 * @priority: high
 * @complexity: low
 * @dependencies: [jest]
 */

/**
 * Global test setup for Neo4j tests
 * Runs before all tests to ensure clean environment
 */

// Extend Jest timeout for integration tests
jest.setTimeout(30000);

// Environment variables for test database
process.env.NEO4J_URI = process.env.NEO4J_URI || 'bolt://localhost:7687';
process.env.NEO4J_USER = process.env.NEO4J_USER || 'neo4j';
process.env.NEO4J_PASSWORD = process.env.NEO4J_PASSWORD || 'devpassword123';

// Test project ID for isolation
export const TEST_PROJECT_ID = 'test-jest';

// Cleanup helper
export async function cleanupTestData(client: any) {
  try {
    // Clean up test project data
    await client.query(`
      MATCH (n)
      WHERE n.project_id = $projectId OR n.project_id STARTS WITH 'test-'
      DETACH DELETE n
    `, { projectId: TEST_PROJECT_ID });
  } catch (error) {
    console.warn('Cleanup failed:', error);
  }
}

// Helper to extract integer from Neo4j Integer type
export function toNumber(value: any): number {
  if (typeof value === 'number') {
    return value;
  }
  if (value && typeof value.toNumber === 'function') {
    return value.toNumber();
  }
  if (value && typeof value.low === 'number') {
    return value.low;
  }
  return 0;
}
