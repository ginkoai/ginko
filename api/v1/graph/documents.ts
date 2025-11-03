/**
 * @fileType: api-route
 * @status: current
 * @updated: 2025-11-02
 * @tags: [api, graph, upload, documents, embeddings, serverless]
 * @related: [init.ts, nodes.ts, _cloud-graph-client.ts]
 * @priority: critical
 * @complexity: high
 * @dependencies: [@xenova/transformers]
 */

import type { VercelRequest, VercelResponse } from '@vercel/node';
import { CloudGraphClient } from './_cloud-graph-client.js';

/**
 * POST /api/v1/graph/documents
 *
 * Upload knowledge documents with automatic embedding generation using all-mpnet-base-v2.
 * Supports ADRs, PRDs, Patterns, Gotchas, Context Modules, Sessions.
 *
 * Request body:
 * {
 *   "graphId": "gin_xyz",
 *   "documents": [
 *     {
 *       "type": "ADR",
 *       "title": "Use JWT tokens",
 *       "content": "# ADR-042: JWT Authentication Strategy\n\n...",
 *       "status": "proposed",
 *       "tags": ["auth", "security"],
 *       "metadata": {
 *         "number": 42,
 *         "decision_date": "2025-11-02",
 *         "authors": ["Chris Norton"]
 *       }
 *     }
 *   ],
 *   "generateEmbeddings": true
 * }
 *
 * Response:
 * {
 *   "graphId": "gin_xyz",
 *   "processed": 1,
 *   "documents": [
 *     {
 *       "nodeId": "adr_123456_abc",
 *       "type": "ADR",
 *       "title": "Use JWT tokens",
 *       "embedded": true,
 *       "embeddingDimensions": 768
 *     }
 *   ],
 *   "totalTime": 1234
 * }
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

  // Authentication
  const authHeader = req.headers.authorization;
  if (!authHeader?.startsWith('Bearer ')) {
    return res.status(401).json({
      error: { code: 'AUTH_REQUIRED', message: 'Bearer token required in Authorization header.' },
    });
  }

  const token = authHeader.substring(7);

  try {
    const { graphId, documents, generateEmbeddings = true } = req.body;

    // Validation
    if (!graphId) {
      return res.status(400).json({
        error: { code: 'INVALID_REQUEST', message: 'graphId is required.' },
      });
    }

    if (!documents || !Array.isArray(documents) || documents.length === 0) {
      return res.status(400).json({
        error: { code: 'INVALID_REQUEST', message: 'documents array is required and cannot be empty.' },
      });
    }

    if (documents.length > 100) {
      return res.status(413).json({
        error: {
          code: 'PAYLOAD_TOO_LARGE',
          message: 'Maximum 100 documents per request. Split into smaller batches.',
        },
      });
    }

    // Validate documents
    for (const doc of documents) {
      if (!doc.type || !doc.title || !doc.content) {
        return res.status(400).json({
          error: {
            code: 'INVALID_DOCUMENT',
            message: 'Each document must have type, title, and content fields.',
          },
        });
      }
    }

    const startTime = Date.now();

    // Create client
    const client = await CloudGraphClient.fromBearerToken(token, graphId);

    // Process documents
    const results = [];

    for (const doc of documents) {
      try {
        const { type, title, content, metadata = {}, tags = [] } = doc;

        // Prepare node data
        const nodeData: any = {
          title,
          content,
          tags,
          ...metadata,
        };

        // Generate embeddings if requested
        if (generateEmbeddings) {
          try {
            // Import embeddings service (lazy load to avoid cold start penalty)
            const { EmbeddingsService } = await import('../../../src/graph/embeddings-service.js');

            // Initialize service (cached across requests in same function instance)
            if (!global.__embeddingsService) {
              global.__embeddingsService = new EmbeddingsService();
              await global.__embeddingsService.initialize();
            }

            const embedder = global.__embeddingsService;

            // Generate embedding from title + content
            const textToEmbed = `${title}\n\n${content}`;
            const result = await embedder.embed(textToEmbed);

            // Store 768-dimensional vector in node data
            nodeData.embedding = result.embedding;

            console.log(`✓ Generated ${result.dimensions}d embedding for: ${title.substring(0, 50)}...`);
          } catch (embedError: any) {
            console.error(`⚠️  Failed to generate embedding: ${embedError.message}`);
            // Continue without embedding (non-blocking)
            // The document will be created but won't be searchable via semantic search
          }
        }

        // Create node in graph
        const nodeId = await client.createNode(type, nodeData);

        results.push({
          nodeId,
          type,
          title,
          embedded: generateEmbeddings && nodeData.embedding !== undefined,
          embeddingDimensions: nodeData.embedding ? nodeData.embedding.length : null,
        });
      } catch (error: any) {
        results.push({
          type: doc.type,
          title: doc.title,
          error: error.message,
          failed: true,
        });
      }
    }

    const totalTime = Date.now() - startTime;
    const successCount = results.filter(r => !('failed' in r)).length;

    return res.status(successCount > 0 ? 201 : 207).json({
      graphId,
      processed: successCount,
      failed: results.length - successCount,
      documents: results,
      totalTime,
    });
  } catch (error: any) {
    console.error('Error in /api/v1/graph/documents:', error);
    return res.status(500).json({
      error: {
        code: 'INTERNAL_ERROR',
        message: error.message || 'An internal error occurred.',
      },
    });
  }
}

/**
 * Embeddings Integration TODO:
 *
 * The existing EmbeddingsService (src/graph/embeddings-service.ts) provides production-ready embeddings.
 *
 * Integration steps:
 * 1. Resolve module path for importing from src/ in api/
 * 2. Initialize service once per serverless function (reuse across requests)
 * 3. Generate embeddings: const result = await embedder.embed(text);
 * 4. Store in Neo4j: nodeData.embedding = result.embedding;
 * 5. Use existing vector indexes (768d) from schema/007-vector-indexes.cypher
 *
 * Performance considerations:
 * - First call downloads model (~420MB, cached after)
 * - Subsequent calls: ~50-100 embeddings/sec
 * - Memory: ~1GB during inference
 * - Serverless timeout: May need longer timeout for batch processing
 *
 * Alternative: For production scale, consider moving embeddings to background job queue
 * to avoid serverless function timeout limits (10 seconds on Vercel Hobby, 60s on Pro).
 */
