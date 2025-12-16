/**
 * @fileType: api-route
 * @status: current
 * @updated: 2025-11-17
 * @tags: [api, graph, init, neo4j, onboarding]
 * @related: [../_neo4j.ts, ../events/route.ts]
 * @priority: critical
 * @complexity: medium
 * @dependencies: [neo4j-driver, crypto]
 */

import { NextRequest, NextResponse } from 'next/server';
import { runQuery, verifyConnection } from '../_neo4j';
import { randomUUID } from 'crypto';
import { extractUserIdFromToken } from '../_cloud-graph-client';

interface GraphInitRequest {
  projectPath: string;
  projectName: string;
  visibility?: 'private' | 'organization' | 'public';
  organization?: string;
  documents: {
    adr: number;
    prd: number;
    patterns: number;
    gotchas: number;
    sessions: number;
  };
}

interface GraphInitResponse {
  namespace: string;
  graphId: string;
  status: 'created' | 'initializing' | 'ready';
  estimatedProcessingTime: number;
  createdAt: string;
}

/**
 * POST /api/v1/graph/init
 * Initialize a new graph namespace for a project
 */
export async function POST(request: NextRequest) {
  console.log('[Graph Init API] POST /api/v1/graph/init called');

  try {
    // Verify Neo4j connection
    console.log('[Graph Init API] Verifying Neo4j connection...');
    const isConnected = await verifyConnection();
    console.log('[Graph Init API] Neo4j connection status:', isConnected);

    if (!isConnected) {
      console.error('[Graph Init API] Neo4j connection failed - returning 503');
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
    const body: GraphInitRequest = await request.json();
    console.log('[Graph Init API] Request body:', JSON.stringify(body, null, 2));

    // Validate required fields
    if (!body.projectName) {
      return NextResponse.json(
        {
          error: {
            code: 'VALIDATION_ERROR',
            message: 'projectName is required',
            field: 'projectName',
          },
        },
        { status: 400 }
      );
    }

    // Extract user ID from auth token (resolves to Supabase UUID)
    const token = authHeader.substring(7); // Remove 'Bearer '
    const userId = await extractUserIdFromToken(token);

    // Generate graph ID and namespace
    const graphId = `gin_${Date.now()}_${randomUUID().substring(0, 6)}`;
    const namespace = `${userId}/${body.projectName.toLowerCase().replace(/[^a-z0-9-]/g, '-')}`;
    const createdAt = new Date().toISOString();

    // Calculate total documents
    const totalDocs = Object.values(body.documents || {}).reduce((sum, count) => sum + count, 0);
    const estimatedProcessingTime = totalDocs * 0.5; // 0.5 seconds per document

    console.log('[Graph Init API] Creating project node:', {
      graphId,
      namespace,
      projectName: body.projectName,
      totalDocs,
    });

    // Create Project node in Neo4j
    const createProjectQuery = `
      CREATE (p:Project {
        graphId: $graphId,
        namespace: $namespace,
        projectName: $projectName,
        projectPath: $projectPath,
        visibility: $visibility,
        organization: $organization,
        userId: $userId,
        totalDocuments: $totalDocuments,
        documentCounts: $documentCounts,
        status: 'created',
        createdAt: datetime($createdAt),
        updatedAt: datetime($createdAt)
      })
      RETURN p
    `;

    await runQuery(createProjectQuery, {
      graphId,
      namespace,
      projectName: body.projectName,
      projectPath: body.projectPath || '',
      visibility: body.visibility || 'private',
      organization: body.organization || null,
      userId,
      totalDocuments: totalDocs,
      documentCounts: JSON.stringify(body.documents || {}),
      createdAt,
    });

    console.log('[Graph Init API] Project node created successfully');

    // Create indexes if they don't exist (idempotent)
    try {
      await runQuery('CREATE INDEX project_graphId IF NOT EXISTS FOR (p:Project) ON (p.graphId)');
      await runQuery('CREATE INDEX project_namespace IF NOT EXISTS FOR (p:Project) ON (p.namespace)');
      await runQuery('CREATE INDEX project_userId IF NOT EXISTS FOR (p:Project) ON (p.userId)');
      console.log('[Graph Init API] Indexes created/verified');
    } catch (indexError) {
      // Indexes might already exist, log but don't fail
      console.warn('[Graph Init API] Index creation warning:', indexError);
    }

    const response: GraphInitResponse = {
      namespace,
      graphId,
      status: totalDocs > 0 ? 'initializing' : 'created',
      estimatedProcessingTime: Math.ceil(estimatedProcessingTime),
      createdAt,
    };

    console.log('[Graph Init API] Returning success response:', response);

    return NextResponse.json(response, { status: 200 });

  } catch (error) {
    console.error('[Graph Init API] Error:', error);

    const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';

    return NextResponse.json(
      {
        error: {
          code: 'INTERNAL_ERROR',
          message: errorMessage,
          details: process.env.NODE_ENV === 'development' ? { stack: error instanceof Error ? error.stack : undefined } : undefined,
        },
      },
      { status: 500 }
    );
  }
}
