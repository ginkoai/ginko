/**
 * @fileType: api-route
 * @status: current
 * @updated: 2026-01-08
 * @tags: [api, graph, documents, upload, embeddings, voyage-ai]
 * @related: [../nodes/route.ts, ../../../lib/embeddings/voyage-client.ts]
 * @priority: critical
 * @complexity: high
 * @dependencies: [neo4j-driver, voyage-ai]
 */

/**
 * POST /api/v1/graph/documents
 *
 * Upload documents to the knowledge graph with automatic embedding generation.
 * Supports batch uploads of ADRs, PRDs, Epics, Sprints, Charters, Patterns, etc.
 *
 * Request Body:
 * {
 *   "graphId": "gin_xxx",
 *   "documents": [{
 *     "id": "EPIC-010",
 *     "type": "Epic",
 *     "title": "MVP Marketing Strategy",
 *     "content": "...",
 *     "filePath": "docs/epics/EPIC-010.md",
 *     "hash": "sha256:...",
 *     "metadata": {}
 *   }]
 * }
 *
 * Returns:
 * {
 *   "job": {
 *     "jobId": "job_xxx",
 *     "status": "completed",
 *     "progress": { "uploaded": N, "parsed": N, "embedded": N, "total": N }
 *   }
 * }
 */

import { NextRequest, NextResponse } from 'next/server';
import { verifyConnection, getSession } from '../_neo4j';
import { VoyageEmbeddingClient } from '@/lib/embeddings/voyage-client';
import { randomBytes } from 'crypto';

interface DocumentUpload {
  id: string;
  type: 'ADR' | 'PRD' | 'Epic' | 'Sprint' | 'Charter' | 'Pattern' | 'Gotcha' | 'Session' | 'ContextModule';
  title: string;
  content: string;
  filePath: string;
  hash: string;
  metadata?: Record<string, unknown>;
}

interface UploadRequest {
  graphId: string;
  documents: DocumentUpload[];
}

interface JobProgress {
  uploaded: number;
  parsed: number;
  embedded: number;
  total: number;
}

interface JobResponse {
  job: {
    jobId: string;
    status: 'queued' | 'processing' | 'completed' | 'failed';
    createdAt: string;
    progress: JobProgress;
  };
}

// Batch size for embedding generation
const EMBEDDING_BATCH_SIZE = 20;

export async function POST(request: NextRequest) {
  console.log('[Documents API] POST /api/v1/graph/documents called');
  const startTime = Date.now();
  const jobId = `job_${Date.now()}_${randomBytes(4).toString('hex')}`;

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
    const body = (await request.json()) as UploadRequest;
    console.log('[Documents API] Request:', {
      graphId: body.graphId,
      documentCount: body.documents?.length,
    });

    // Validate required fields
    if (!body.graphId) {
      return NextResponse.json(
        { error: { code: 'MISSING_GRAPH_ID', message: 'graphId is required' } },
        { status: 400 }
      );
    }

    if (!body.documents || !Array.isArray(body.documents) || body.documents.length === 0) {
      return NextResponse.json(
        { error: { code: 'MISSING_DOCUMENTS', message: 'documents array is required and must not be empty' } },
        { status: 400 }
      );
    }

    if (body.documents.length > 500) {
      return NextResponse.json(
        { error: { code: 'TOO_MANY_DOCUMENTS', message: 'Maximum 500 documents per request' } },
        { status: 400 }
      );
    }

    const progress: JobProgress = {
      uploaded: 0,
      parsed: body.documents.length,
      embedded: 0,
      total: body.documents.length,
    };

    // Initialize Voyage client for embeddings
    let voyageClient: VoyageEmbeddingClient | null = null;
    try {
      voyageClient = new VoyageEmbeddingClient();
    } catch (error) {
      console.warn('[Documents API] Voyage AI not configured, skipping embeddings:', error);
    }

    const session = getSession();
    try {
      // Process documents in batches
      for (let i = 0; i < body.documents.length; i += EMBEDDING_BATCH_SIZE) {
        const batch = body.documents.slice(i, i + EMBEDDING_BATCH_SIZE);

        // Generate embeddings for batch if Voyage is configured
        let embeddings: number[][] | null = null;
        if (voyageClient) {
          try {
            const textsToEmbed = batch.map(doc => `${doc.title}\n\n${doc.content.slice(0, 8000)}`);
            embeddings = await voyageClient.embed(textsToEmbed, 'document');
            progress.embedded += batch.length;
          } catch (embedError) {
            console.error('[Documents API] Embedding generation failed:', embedError);
            // Continue without embeddings
          }
        }

        // Insert documents into Neo4j
        await session.executeWrite(async (tx) => {
          for (let j = 0; j < batch.length; j++) {
            const doc = batch[j];
            const embedding = embeddings ? embeddings[j] : null;
            const now = new Date().toISOString();

            // Build properties object
            const properties: Record<string, any> = {
              id: doc.id,
              type: doc.type,
              title: doc.title,
              content: doc.content,
              filePath: doc.filePath,
              hash: doc.hash,
              graph_id: body.graphId,
              created_at: now,
              updated_at: now,
              // Sync tracking fields (ADR-054)
              synced: true,
              syncedAt: now,
              editedAt: now,
              editedBy: 'cli-upload',
              contentHash: doc.hash,
            };

            // Add metadata if present
            if (doc.metadata) {
              Object.entries(doc.metadata).forEach(([key, value]) => {
                if (value !== null && value !== undefined) {
                  properties[`meta_${key}`] = typeof value === 'object' ? JSON.stringify(value) : value;
                }
              });
            }

            // Add embedding if generated
            if (embedding) {
              properties.embedding = embedding;
            }

            // Use MERGE to create or update
            const propsList = Object.keys(properties)
              .filter(key => properties[key] !== null && properties[key] !== undefined)
              .map(key => `${key}: $${key}`)
              .join(', ');

            await tx.run(
              `MERGE (n:${doc.type} {id: $id, graph_id: $graph_id})
               ON CREATE SET n = {${propsList}}
               ON MATCH SET n += {${propsList.replace('id: $id, ', '').replace('graph_id: $graph_id, ', '')}}
               WITH n
               MATCH (g:Graph {graphId: $graph_id})
               MERGE (g)-[:CONTAINS]->(n)`,
              properties
            );

            progress.uploaded++;
          }
        });

        console.log(`[Documents API] Processed batch ${Math.floor(i / EMBEDDING_BATCH_SIZE) + 1}, progress: ${progress.uploaded}/${progress.total}`);
      }

      const duration = Date.now() - startTime;
      console.log(`[Documents API] Completed in ${duration}ms. Uploaded: ${progress.uploaded}, Embedded: ${progress.embedded}`);

      const response: JobResponse = {
        job: {
          jobId,
          status: 'completed',
          createdAt: new Date().toISOString(),
          progress,
        },
      };

      return NextResponse.json(response, { status: 201 });
    } finally {
      await session.close();
    }
  } catch (error) {
    console.error('[Documents API] ERROR:', error);
    return NextResponse.json(
      {
        error: {
          code: 'INTERNAL_ERROR',
          message: error instanceof Error ? error.message : 'Failed to upload documents',
        },
        job: {
          jobId,
          status: 'failed',
          createdAt: new Date().toISOString(),
          progress: { uploaded: 0, parsed: 0, embedded: 0, total: 0 },
        },
      },
      { status: 500 }
    );
  }
}
