/**
 * @fileType: api-route
 * @status: current
 * @updated: 2025-11-07
 * @tags: [graphql, yoga, api, task-024]
 * @related: [schema.ts, resolvers.ts]
 * @priority: high
 * @complexity: medium
 * @dependencies: [graphql-yoga]
 */

/**
 * GraphQL API Endpoint
 * TASK-024: GraphQL API Implementation
 *
 * Provides GraphQL query interface for knowledge graph
 * Uses GraphQL Yoga for Next.js 14 App Router compatibility
 *
 * Endpoint: POST /api/graphql
 * Authentication: Bearer token required
 *
 * Features:
 * - Semantic search across knowledge nodes
 * - Node relationship graph traversal
 * - Context-aware queries for AI assistance
 * - Implementation progress tracking
 * - Tag-based filtering
 */

import { createYoga } from 'graphql-yoga';
import { createSchema } from 'graphql-yoga';
import { typeDefs } from './schema';
import { resolvers } from './resolvers';

const { handleRequest } = createYoga({
  schema: createSchema({
    typeDefs,
    resolvers,
  }),

  // Extract Bearer token from headers and pass to context
  context: async ({ request }) => {
    const authHeader = request.headers.get('authorization');

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      throw new Error('Missing or invalid authorization header');
    }

    const token = authHeader.substring(7);

    return {
      token,
    };
  },

  // GraphQL Yoga configuration for Next.js
  graphqlEndpoint: '/api/graphql',

  // Enable GraphiQL in development
  graphiql: process.env.NODE_ENV === 'development' ? {
    title: 'Ginko Knowledge Graph API (Read-Only)',
    defaultQuery: `# Welcome to Ginko Knowledge Graph GraphQL API
#
# This API is READ-ONLY for complex queries and graph traversal
# For write operations (create, update, delete), use REST API:
#   POST   /api/v1/knowledge/nodes
#   GET    /api/v1/knowledge/nodes
#   GET    /api/v1/knowledge/nodes/[id]
#   PUT    /api/v1/knowledge/nodes/[id]
#   DELETE /api/v1/knowledge/nodes/[id]
#
# Example queries:

# 1. Semantic search
query SearchKnowledge {
  search(
    query: "authentication patterns"
    graphId: "your-graph-id"
    limit: 5
  ) {
    node {
      id
      title
      type
      content
    }
    score
    relationshipType
  }
}

# 2. Get node with relationships
query NodeGraph {
  nodeGraph(
    nodeId: "adr_123"
    graphId: "your-graph-id"
    depth: 2
  ) {
    centerNode {
      id
      title
      type
    }
    connectedNodes {
      id
      title
      type
    }
    relationships {
      type
      fromId
      toId
    }
  }
}

# 3. Find nodes by tags
query NodesByTag {
  nodesByTag(
    tags: ["authentication", "security"]
    graphId: "your-graph-id"
  ) {
    id
    title
    type
    tags
  }
}

# 4. Implementation progress
query Progress {
  implementationProgress(
    projectId: "my-project"
    graphId: "your-graph-id"
  ) {
    totalPRDs
    implementedPRDs
    completionPercentage
    recentDecisions {
      id
      title
    }
  }
}
`,
  } : false,

  // Logging
  logging: {
    debug: (...args) => console.log('[GraphQL Debug]', ...args),
    info: (...args) => console.log('[GraphQL Info]', ...args),
    warn: (...args) => console.warn('[GraphQL Warn]', ...args),
    error: (...args) => console.error('[GraphQL Error]', ...args),
  },

  // CORS configuration
  cors: {
    origin: process.env.NODE_ENV === 'production'
      ? ['https://app.ginkoai.com', 'https://ginko.vercel.app']
      : ['http://localhost:3000', 'http://localhost:3001'],
    credentials: true,
  },

  // Error masking (disable in development for debugging)
  maskedErrors: process.env.NODE_ENV === 'production',
});

// Export as Next.js route handlers
export { handleRequest as GET, handleRequest as POST };
