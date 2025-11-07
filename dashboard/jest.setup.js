/**
 * Jest setup file
 */

// Setup environment variables for tests
process.env.NEO4J_URI = process.env.NEO4J_URI || 'neo4j://localhost:7687';
process.env.NEO4J_USER = process.env.NEO4J_USER || 'neo4j';
process.env.NEO4J_PASSWORD = process.env.NEO4J_PASSWORD || 'test-password';
process.env.GINKO_API_KEY = process.env.GINKO_API_KEY || 'test-api-key';
