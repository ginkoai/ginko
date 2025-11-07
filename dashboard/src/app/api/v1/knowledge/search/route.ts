/**
 * @fileType: api-route
 * @status: current
 * @updated: 2025-11-07
 * @tags: [knowledge, semantic-search, embeddings, vector-search, adr-045]
 * @related: [_neo4j.ts, voyage-client.ts, similarity-matcher.ts]
 * @priority: high
 * @complexity: medium
 * @dependencies: [neo4j-driver, voyage-client]
 */

/**
 * POST /api/v1/knowledge/search
 *
 * Semantic search over knowledge nodes using vector similarity (ADR-045 Phase 3)
 *
 * Request Body:
 * - query: Search query text (required)
 * - limit: Number of results to return (default: 10, max: 50)
 * - projectId: Filter by project ID (optional)
 * - minScore: Minimum similarity score threshold (default: 0.75)
 * - status: Filter by node status (default: 'active')
 *
 * Returns:
 * - results: Array of knowledge nodes with similarity scores
 * - query: Original query
 * - totalCount: Number of results returned
 * - performanceMetrics: Query timing information
 */

import { NextRequest, NextResponse } from 'next/server';
import { runQuery } from '../../graph/_neo4j';
import { getVoyageClient, VoyageAPIError, RateLimitError } from '@/lib/embeddings/voyage-client';
import { SIMILARITY_CONFIG } from '@/lib/embeddings/config';
import neo4j from 'neo4j-driver';

interface SearchRequest {
  query: string;
  limit?: number;
  projectId?: string;
  minScore?: number;
  status?: 'active' | 'archived' | 'all';
}

interface KnowledgeNode {
  id: string;
  content: string;
  title?: string;
  type: string;
  projectId: string;
  userId: string;
  createdAt: Date;
  updatedAt: Date;
  status: string;
  tags?: string[];
}

interface SearchResult {
  node: KnowledgeNode;
  score: number;
  relationshipType: string;
}

export async function POST(request: NextRequest) {
  const startTime = Date.now();
  let embeddingTime = 0;
  let queryTime = 0;

  try {
    // Extract Bearer token
    const authHeader = request.headers.get('authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json(
        { error: 'Missing or invalid authorization header' },
        { status: 401 }
      );
    }

    // TODO: Extract userId from Bearer token
    // For now, we'll just validate the token exists
    // In production, decode JWT and verify userId
    const token = authHeader.substring(7);
    if (!token) {
      return NextResponse.json(
        { error: 'Invalid bearer token' },
        { status: 401 }
      );
    }

    // Parse request body
    const body: SearchRequest = await request.json();
    const { query, limit, projectId, minScore, status } = body;

    // Validate required parameters
    if (!query || typeof query !== 'string' || query.trim().length === 0) {
      return NextResponse.json(
        { error: 'Missing or invalid query parameter' },
        { status: 400 }
      );
    }

    // Validate and set defaults
    const searchLimit = Math.min(
      limit || SIMILARITY_CONFIG.SEARCH_LIMIT_DEFAULT,
      SIMILARITY_CONFIG.SEARCH_LIMIT_MAX
    );

    const scoreThreshold = minScore || SIMILARITY_CONFIG.MIN_SCORE;
    if (scoreThreshold < 0 || scoreThreshold > 1) {
      return NextResponse.json(
        { error: 'Invalid minScore (must be 0-1)' },
        { status: 400 }
      );
    }

    const nodeStatus = status || 'active';

    // Check for VOYAGE_API_KEY
    if (!process.env.VOYAGE_API_KEY) {
      console.error('[Knowledge Search API] VOYAGE_API_KEY not configured');
      return NextResponse.json(
        { error: 'Embedding service not configured' },
        { status: 503 }
      );
    }

    // Generate query embedding
    const embeddingStart = Date.now();
    let queryEmbedding: number[];

    try {
      const voyageClient = getVoyageClient();
      const embeddings = await voyageClient.embed([query], 'query');
      queryEmbedding = embeddings[0];
      embeddingTime = Date.now() - embeddingStart;

      console.log(`[Knowledge Search] Generated query embedding in ${embeddingTime}ms`);
    } catch (error) {
      console.error('[Knowledge Search API] Embedding generation failed:', error);

      if (error instanceof RateLimitError) {
        return NextResponse.json(
          { error: 'Rate limit exceeded. Please try again later.', retryAfter: error.retryAfter },
          { status: 429 }
        );
      }

      if (error instanceof VoyageAPIError) {
        return NextResponse.json(
          { error: 'Embedding service error', details: error.message },
          { status: 503 }
        );
      }

      return NextResponse.json(
        { error: 'Failed to generate query embedding', message: (error as Error).message },
        { status: 500 }
      );
    }

    // Build Neo4j query with filters
    const queryStart = Date.now();
    let cypherQuery = `
      CALL db.index.vector.queryNodes(
        'knowledge_embeddings',
        $limit,
        $queryEmbedding
      )
      YIELD node, score
      WHERE score >= $minScore
    `;

    const queryParams: Record<string, any> = {
      queryEmbedding,
      limit: neo4j.int(searchLimit * 2), // Query more for filtering
      minScore: scoreThreshold,
    };

    // Add optional filters
    if (projectId) {
      cypherQuery += ` AND node.projectId = $projectId`;
      queryParams.projectId = projectId;
    }

    if (nodeStatus !== 'all') {
      cypherQuery += ` AND node.status = $status`;
      queryParams.status = nodeStatus;
    }

    cypherQuery += `
      WITH node, score
      ORDER BY score DESC
      LIMIT $finalLimit
      RETURN node, score
    `;
    queryParams.finalLimit = neo4j.int(searchLimit);

    // Execute vector similarity search
    const results = await runQuery<any>(cypherQuery, queryParams);
    queryTime = Date.now() - queryStart;

    console.log(`[Knowledge Search] Vector search completed in ${queryTime}ms, found ${results.length} results`);

    // Map relationship types by score
    const searchResults: SearchResult[] = results.map((r: any) => {
      const node: KnowledgeNode = {
        ...r.node.properties,
        createdAt: new Date(r.node.properties.createdAt),
        updatedAt: new Date(r.node.properties.updatedAt),
      };

      // Classify relationship type based on score
      let relationshipType: string;
      if (r.score >= SIMILARITY_CONFIG.DUPLICATE_THRESHOLD) {
        relationshipType = 'DUPLICATE_OF';
      } else if (r.score >= SIMILARITY_CONFIG.HIGH_RELEVANCE_THRESHOLD) {
        relationshipType = 'HIGHLY_RELATED_TO';
      } else if (r.score >= SIMILARITY_CONFIG.MEDIUM_RELEVANCE_THRESHOLD) {
        relationshipType = 'RELATED_TO';
      } else {
        relationshipType = 'LOOSELY_RELATED_TO';
      }

      return {
        node,
        score: r.score,
        relationshipType,
      };
    });

    const totalTime = Date.now() - startTime;

    return NextResponse.json({
      results: searchResults,
      query,
      totalCount: searchResults.length,
      appliedFilters: {
        projectId: projectId || null,
        minScore: scoreThreshold,
        status: nodeStatus,
      },
      performanceMetrics: {
        totalMs: totalTime,
        embeddingMs: embeddingTime,
        queryMs: queryTime,
        overheadMs: totalTime - embeddingTime - queryTime,
      },
    });
  } catch (error: any) {
    console.error('[Knowledge Search API] Error:', error);

    // Check for Neo4j connection errors
    if (error.message?.includes('not found') || error.message?.includes('index')) {
      return NextResponse.json(
        { error: 'Vector index not found. Please ensure knowledge_embeddings index is created.' },
        { status: 503 }
      );
    }

    if (error.message?.includes('Neo4j') || error.message?.includes('connection')) {
      return NextResponse.json(
        { error: 'Database connection failed', details: error.message },
        { status: 503 }
      );
    }

    return NextResponse.json(
      {
        error: 'Search failed',
        message: error.message,
      },
      { status: 500 }
    );
  }
}
