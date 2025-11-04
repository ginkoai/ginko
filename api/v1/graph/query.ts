/**
 * @fileType: api-route
 * @status: current
 * @updated: 2025-10-31
 * @tags: [api, graph, query, search, semantic, serverless]
 * @related: [status.ts, explore/[documentId].ts]
 * @priority: critical
 * @complexity: high
 * @dependencies: []
 */

import type { VercelRequest, VercelResponse } from '@vercel/node';

/**
 * POST /api/v1/graph/query
 * Semantic search across documents
 */
export default async function handler(
  req: VercelRequest,
  res: VercelResponse
) {
  if (req.method !== 'POST') {
    return res.status(405).json({
      error: { code: 'METHOD_NOT_ALLOWED', message: 'Method not allowed. Use POST.' },
    });
  }

  try {
    // Verify authentication
    const authHeader = req.headers.authorization;
    if (!authHeader?.startsWith('Bearer ')) {
      return res.status(401).json({
        error: { code: 'AUTH_REQUIRED', message: 'Authentication required.' },
      });
    }

    const token = authHeader.substring(7);
    const { graphId, query, limit = 10, threshold = 0.70, types } = req.body;

    if (!graphId || !query) {
      return res.status(400).json({
        error: { code: 'INVALID_REQUEST', message: 'Missing graphId or query.' },
      });
    }

    if (query.length < 3) {
      return res.status(400).json({
        error: {
          code: 'INVALID_QUERY',
          message: 'Query must be at least 3 characters.',
          query,
        },
      });
    }

    const startTime = Date.now();

    try {
      // Import embeddings service (lazy load)
      const { EmbeddingsService } = await import('../../../src/graph/embeddings-service.js');

      // Initialize service (cached across requests)
      if (!global.__embeddingsService) {
        global.__embeddingsService = new EmbeddingsService();
        await global.__embeddingsService.initialize();
      }

      const embedder = global.__embeddingsService;

      // Generate embedding for query
      const embeddingResult = await embedder.embed(query);
      const queryEmbedding = embeddingResult.embedding;

      // Import CloudGraphClient for Neo4j queries
      const { CloudGraphClient } = await import('./_cloud-graph-client.js');
      const client = await CloudGraphClient.fromBearerToken(token, graphId);

      // Perform vector similarity search
      const results = await client.semanticSearch(queryEmbedding, {
        limit,
        threshold,
        types,
      });

      const queryTime = Date.now() - startTime;

      return res.status(200).json({
        results,
        totalResults: results.length,
        queryTime,
        embedding: {
          model: 'all-mpnet-base-v2',
          dimensions: 768,
        },
      });
    } catch (embedError: any) {
      console.error('Embedding or search error:', embedError);
      return res.status(500).json({
        error: {
          code: 'SEARCH_FAILED',
          message: `Semantic search failed: ${embedError.message}`,
        },
      });
    }

  } catch (error) {
    console.error('Error in /api/v1/graph/query:', error);
    return res.status(500).json({
      error: { code: 'INTERNAL_ERROR', message: 'An internal error occurred.' },
    });
  }
}
