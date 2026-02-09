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
    warnings?: string[];
  };
}

// Batch size for embedding generation
const EMBEDDING_BATCH_SIZE = 20;

/**
 * Generate a summary from document content.
 * Strips frontmatter and extracts first meaningful paragraph.
 */
function generateSummary(content: string, maxLength: number = 500): string {
  // Strip YAML frontmatter (---...---)
  let text = content.replace(/^---[\s\S]*?---\n*/m, '');

  // Strip markdown headers at the start
  text = text.replace(/^#+\s+[^\n]+\n*/gm, '');

  // Get first meaningful paragraph (non-empty, non-header)
  const paragraphs = text.split(/\n\n+/).filter(p => p.trim().length > 0);
  const firstParagraph = paragraphs[0] || '';

  // Clean up markdown syntax
  let summary = firstParagraph
    .replace(/\*\*([^*]+)\*\*/g, '$1')  // Bold
    .replace(/\*([^*]+)\*/g, '$1')       // Italic
    .replace(/`([^`]+)`/g, '$1')         // Code
    .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1')  // Links
    .replace(/^[-*]\s+/gm, '')           // List items
    .replace(/\n/g, ' ')                 // Newlines to spaces
    .replace(/\s+/g, ' ')                // Multiple spaces to single
    .trim();

  // Truncate with ellipsis if needed
  if (summary.length > maxLength) {
    summary = summary.substring(0, maxLength - 3).replace(/\s+\S*$/, '') + '...';
  }

  return summary;
}

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
    const warnings: string[] = [];

    // Validate Epic IDs against canonical format (ADR-052)
    // Warn (but don't reject) during transition period
    for (const doc of body.documents) {
      if (doc.type === 'Epic' && !/^e\d{3}$/.test(doc.id)) {
        console.warn(`[Documents API] Non-canonical Epic ID: "${doc.id}" (expected eNNN format per ADR-052)`);
        warnings.push(`Epic "${doc.id}" uses non-canonical ID format. Expected eNNN (e.g., e001). Use \`ginko push epic\` to auto-normalize.`);
      }
    }

    // Initialize Voyage client for embeddings
    let voyageClient: VoyageEmbeddingClient | null = null;
    try {
      voyageClient = new VoyageEmbeddingClient();
    } catch (error) {
      console.warn('[Documents API] Voyage AI not configured, skipping embeddings:', error);
      warnings.push('Embedding service not configured. Documents will be searchable by content but not by semantic similarity.');
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
            // Continue without embeddings but track the failure
            const errorMsg = embedError instanceof Error ? embedError.message : 'Unknown error';
            if (!warnings.some(w => w.includes('Embedding generation failed'))) {
              warnings.push(`Embedding generation failed: ${errorMsg}. Documents uploaded but semantic search may not work.`);
            }
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
              // Generate summary from content (first 500 chars, frontmatter stripped)
              summary: generateSummary(doc.content, 500),
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
              // Track embedding status for diagnostics
              has_embedding: !!embedding,
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

            // Build property lists for Cypher SET clauses
            const propsList = Object.keys(properties)
              .filter(key => properties[key] !== null && properties[key] !== undefined)
              .map(key => `${key}: $${key}`)
              .join(', ');

            // Match-only types (Sprint): use MATCH+SET (enrich-only).
            // Task sync is the sole creator of Sprint nodes. Document upload
            // should never create Sprint nodes from scratch (prevents duplicates).
            // Epic uses MERGE (like non-structural types) because new Epics may
            // be pushed before any sprints exist — task sync only creates Epic
            // nodes when sprints reference them (BUG-026 fix).
            const matchOnlyTypes = ['Sprint'];
            const isMatchOnly = matchOnlyTypes.includes(doc.type);

            if (isMatchOnly) {
              // Enrich existing node only — task sync creates the node
              const contentPropsList = Object.keys(properties)
                .filter(key => properties[key] !== null && properties[key] !== undefined)
                .map(key => `${key}: $${key}`)
                .join(', ');

              const result = await tx.run(
                `MATCH (n:${doc.type} {id: $id, graph_id: $graph_id})
                 SET n += {${contentPropsList}}
                 WITH n
                 MATCH (g:Graph {graphId: $graph_id})
                 MERGE (g)-[:CONTAINS]->(n)`,
                properties
              );

              if (result.records.length === 0) {
                console.warn(`[Documents API] ${doc.type} node ${doc.id} not found. Task sync may not have run yet.`);
                warnings.push(`${doc.type} "${doc.id}" was not found in the graph. Task sync may not have created it yet. The document content was not applied.`);
              }
            } else {
              // Original MERGE behavior for non-structural types (ADR, Pattern, etc.)
              await tx.run(
                `MERGE (n:${doc.type} {id: $id, graph_id: $graph_id})
                 ON CREATE SET n = {${propsList}}
                 ON MATCH SET n += {${propsList.replace('id: $id, ', '').replace('graph_id: $graph_id, ', '')}}
                 WITH n
                 MATCH (g:Graph {graphId: $graph_id})
                 MERGE (g)-[:CONTAINS]->(n)`,
                properties
              );
            }

            progress.uploaded++;
          }
        });

        console.log(`[Documents API] Processed batch ${Math.floor(i / EMBEDDING_BATCH_SIZE) + 1}, progress: ${progress.uploaded}/${progress.total}`);
      }

      const duration = Date.now() - startTime;
      console.log(`[Documents API] Completed in ${duration}ms. Uploaded: ${progress.uploaded}, Embedded: ${progress.embedded}`);

      // Determine status based on embedding success
      const embeddingsComplete = progress.embedded === progress.total;
      const response: JobResponse = {
        job: {
          jobId,
          status: 'completed',
          createdAt: new Date().toISOString(),
          progress,
          ...(warnings.length > 0 && { warnings }),
        },
      };

      // Log warning if embeddings were incomplete
      if (!embeddingsComplete) {
        console.warn(`[Documents API] Partial success: ${progress.embedded}/${progress.total} documents embedded`);
      }

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
