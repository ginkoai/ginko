/**
 * @fileType: api-route
 * @status: current
 * @updated: 2025-11-25
 * @tags: [api, graph, semantic-search, embeddings, epic-003]
 * @related: [../nodes/route.ts, ../../knowledge/search/route.ts, voyage-client.ts]
 * @priority: high
 * @complexity: medium
 * @dependencies: [neo4j-driver, voyage-client]
 */

/**
 * POST /api/v1/graph/query
 *
 * Semantic search over graph nodes for EPIC-003 Natural Language Queries.
 * This endpoint allows AI assistants to query the knowledge graph using natural language.
 *
 * Request Body:
 * - graphId: Graph namespace (required)
 * - query: Search query text (required)
 * - limit: Number of results to return (default: 5, max: 20)
 * - labels: Array of node labels to filter (optional, e.g., ["ADR", "Pattern"])
 *
 * Returns:
 * - results: Array of matching nodes with similarity scores
 * - query: Original query
 * - totalCount: Number of results returned
 */

import { NextRequest, NextResponse } from 'next/server';
import { verifyConnection, getSession } from '../_neo4j';
import { getVoyageClient, VoyageAPIError, RateLimitError } from '@/lib/embeddings/voyage-client';
import neo4j from 'neo4j-driver';

interface QueryRequest {
  graphId: string;
  query: string;
  limit?: number;
  labels?: string[];
}

// CLI-expected format for QueryResult
interface QueryResult {
  document: {
    id: string;
    type: string;
    title: string;
    summary: string;
    tags: string[];
    filePath: string;
  };
  similarity: number;
  connections: number;
  matchContext: string;
}

// CLI-expected format for QueryResponse
interface QueryResponse {
  results: QueryResult[];
  totalResults: number;
  queryTime: number;
  embedding: {
    model: string;
    dimensions: number;
  };
}

export async function POST(request: NextRequest) {
  const startTime = Date.now();
  console.log('[Graph Query API] POST /api/v1/graph/query called');

  try {
    // Verify Neo4j connection
    const isConnected = await verifyConnection();
    if (!isConnected) {
      return NextResponse.json(
        {
          error: {
            code: 'SERVICE_UNAVAILABLE',
            message: 'Graph database is unavailable. Please try again later.',
          },
        },
        { status: 503 }
      );
    }

    // Verify authentication
    const authHeader = request.headers.get('authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json(
        {
          error: {
            code: 'AUTH_REQUIRED',
            message: 'Authentication required. Include Bearer token in Authorization header.',
          },
        },
        { status: 401 }
      );
    }

    // Parse request body
    const body: QueryRequest = await request.json();
    const { graphId, query, limit = 5, labels = [] } = body;

    // Validate required fields
    if (!graphId) {
      return NextResponse.json(
        {
          error: {
            code: 'MISSING_GRAPH_ID',
            message: 'graphId is required',
          },
        },
        { status: 400 }
      );
    }

    if (!query || typeof query !== 'string' || query.trim().length === 0) {
      return NextResponse.json(
        {
          error: {
            code: 'MISSING_QUERY',
            message: 'query is required and must be a non-empty string',
          },
        },
        { status: 400 }
      );
    }

    const searchLimit = Math.min(limit, 20);

    // Check for VOYAGE_API_KEY
    if (!process.env.VOYAGE_API_KEY) {
      console.error('[Graph Query API] VOYAGE_API_KEY not configured');
      return NextResponse.json(
        {
          error: {
            code: 'SERVICE_UNAVAILABLE',
            message: 'Embedding service not configured. Use local file fallbacks.',
          },
        },
        { status: 503 }
      );
    }

    // Generate query embedding
    let queryEmbedding: number[];
    try {
      const voyageClient = getVoyageClient();
      const embeddings = await voyageClient.embed([query], 'query');
      queryEmbedding = embeddings[0];
      console.log('[Graph Query API] Generated query embedding');
    } catch (error) {
      console.error('[Graph Query API] Embedding generation failed:', error);

      if (error instanceof RateLimitError) {
        return NextResponse.json(
          {
            error: {
              code: 'RATE_LIMITED',
              message: 'Rate limit exceeded. Please try again later.',
              retryAfter: error.retryAfter,
            },
          },
          { status: 429 }
        );
      }

      if (error instanceof VoyageAPIError) {
        return NextResponse.json(
          {
            error: {
              code: 'EMBEDDING_ERROR',
              message: 'Embedding service error. Use local file fallbacks.',
            },
          },
          { status: 503 }
        );
      }

      return NextResponse.json(
        {
          error: {
            code: 'INTERNAL_ERROR',
            message: 'Failed to generate query embedding',
          },
        },
        { status: 500 }
      );
    }

    // Build Cypher query for vector search
    const labelFilter = labels.length > 0 ? labels.map(l => `node:${l}`).join(' OR ') : '';

    let cypherQuery = `
      CALL db.index.vector.queryNodes(
        'knowledge_embeddings',
        $limit,
        $queryEmbedding
      )
      YIELD node, score
      WHERE node.graph_id = $graphId
    `;

    if (labelFilter) {
      cypherQuery += ` AND (${labelFilter})`;
    }

    cypherQuery += `
      WITH node, score, labels(node) as nodeLabels
      ORDER BY score DESC
      RETURN node, score, nodeLabels
    `;

    const session = getSession();
    try {
      const result = await session.executeRead(async (tx) => {
        return tx.run(cypherQuery, {
          queryEmbedding,
          limit: neo4j.int(searchLimit * 2), // Query extra for filtering
          graphId,
        });
      });

      const results: QueryResult[] = result.records
        .slice(0, searchLimit)
        .map((record) => {
          const node = record.get('node');
          const score = record.get('score');
          const nodeLabels = record.get('nodeLabels') as string[];
          const nodeType = nodeLabels.find(l => l !== 'Node') || 'Unknown';

          // Parse tags from node properties (may be string or array)
          let tags: string[] = [];
          if (node.properties.tags) {
            tags = Array.isArray(node.properties.tags)
              ? node.properties.tags
              : String(node.properties.tags).split(',').map((t: string) => t.trim());
          }

          return {
            document: {
              id: node.properties.id || '',
              type: nodeType,
              title: node.properties.title || node.properties.name || '',
              summary: node.properties.summary || node.properties.description || '',
              tags,
              filePath: node.properties.filePath || '',
            },
            similarity: parseFloat(score.toFixed(4)),
            connections: 0, // TODO: Could query for relationship count
            matchContext: node.properties.content?.substring(0, 200) || '',
          };
        });

      const response: QueryResponse = {
        results,
        totalResults: results.length,
        queryTime: Date.now() - startTime,
        embedding: {
          model: 'voyage-3.5',
          dimensions: 1024,
        },
      };

      console.log('[Graph Query API] Returning', results.length, 'results in', response.queryTime, 'ms');
      return NextResponse.json(response);
    } finally {
      await session.close();
    }
  } catch (error: any) {
    console.error('[Graph Query API] ERROR:', error);

    // Check for Neo4j vector index errors
    if (error.message?.includes('not found') || error.message?.includes('index')) {
      return NextResponse.json(
        {
          error: {
            code: 'INDEX_NOT_FOUND',
            message: 'Vector index not configured. Use local file fallbacks.',
          },
        },
        { status: 503 }
      );
    }

    return NextResponse.json(
      {
        error: {
          code: 'INTERNAL_ERROR',
          message: error.message || 'Failed to execute query',
        },
      },
      { status: 500 }
    );
  }
}
