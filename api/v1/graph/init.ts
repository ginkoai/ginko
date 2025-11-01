/**
 * @fileType: api-route
 * @status: current
 * @updated: 2025-10-31
 * @tags: [api, graph, init, serverless]
 * @related: []
 * @priority: critical
 * @complexity: high
 * @dependencies: []
 */

import type { VercelRequest, VercelResponse } from '@vercel/node';
import { runQuery, verifyConnection } from './_neo4j.js';

interface InitRequest {
  projectPath: string;
  projectName: string;
  visibility?: 'private' | 'organization' | 'public';
  organization?: string;
  documents: Record<string, number>;
}

interface InitResponse {
  namespace: string;
  graphId: string;
  status: 'created' | 'initializing' | 'ready';
  estimatedProcessingTime: number;
  createdAt: string;
}

/**
 * POST /api/v1/graph/init
 * Initialize a new knowledge graph namespace
 */
export default async function handler(
  req: VercelRequest,
  res: VercelResponse
): Promise<void> {
  // Only allow POST
  if (req.method !== 'POST') {
    return res.status(405).json({
      error: {
        code: 'METHOD_NOT_ALLOWED',
        message: 'Method not allowed. Use POST.',
      },
    });
  }

  try {
    // Verify Neo4j connection
    const isConnected = await verifyConnection();
    if (!isConnected) {
      return res.status(503).json({
        error: {
          code: 'SERVICE_UNAVAILABLE',
          message: 'Graph database is unavailable. Please try again later.',
        },
      });
    }

    // TODO: Verify authentication (MVP: skip for now)
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({
        error: {
          code: 'AUTH_REQUIRED',
          message: 'Authentication required. Include Bearer token in Authorization header.',
        },
      });
    }

    const token = authHeader.substring(7);
    // For MVP, accept any non-empty token
    // TODO: Verify token with Supabase in production
    const userId = 'user_' + Buffer.from(token).toString('base64').substring(0, 8);

    // Parse request body
    const body = req.body as InitRequest;

    // Validate required fields
    if (!body.projectPath || !body.projectName || !body.documents) {
      return res.status(400).json({
        error: {
          code: 'INVALID_REQUEST',
          message: 'Missing required fields: projectPath, projectName, documents',
        },
      });
    }

    // Validate project name format
    if (!/^[a-z0-9-]+$/.test(body.projectName)) {
      return res.status(400).json({
        error: {
          code: 'INVALID_PROJECT_NAME',
          message: 'Project name must be lowercase alphanumeric with hyphens only.',
          field: 'projectName',
        },
      });
    }

    // Check if graph already exists
    const organization = body.organization || 'personal';
    const namespace = `/${organization}/${body.projectName}`;

    const existing = await runQuery<{ graphId: string }>(
      `MATCH (g:Graph {namespace: $namespace, userId: $userId})
       RETURN g.graphId as graphId
       LIMIT 1`,
      { namespace, userId}
    );

    if (existing.length > 0) {
      return res.status(409).json({
        error: {
          code: 'GRAPH_EXISTS',
          message: 'Graph already exists for this project. Use sync endpoint to update.',
          existingGraphId: existing[0].graphId,
        },
      });
    }

    // Generate graph ID
    const graphId = `gin_${Date.now()}_${Math.random().toString(36).substring(7)}`;

    // Calculate estimated processing time
    const totalDocs = Object.values(body.documents).reduce((sum, count) => sum + count, 0);
    const estimatedTime = Math.ceil(totalDocs * 0.4); // ~400ms per document

    // Create graph metadata node in Neo4j
    await runQuery(
      `CREATE (g:Graph {
        graphId: $graphId,
        namespace: $namespace,
        projectName: $projectName,
        userId: $userId,
        organization: $organization,
        visibility: $visibility,
        documentCounts: $documentCounts,
        status: 'created',
        createdAt: datetime(),
        updatedAt: datetime()
      })
      RETURN g`,
      {
        graphId,
        namespace,
        projectName: body.projectName,
        userId,
        organization,
        visibility: body.visibility || 'private',
        documentCounts: JSON.stringify(body.documents),
      }
    );

    console.log(`[Graph Init] Created graph ${graphId} for ${namespace}`);

    const response: InitResponse = {
      namespace,
      graphId,
      status: 'created',
      estimatedProcessingTime: estimatedTime,
      createdAt: new Date().toISOString(),
    };

    return res.status(201).json(response);

  } catch (error) {
    console.error('Error in /api/v1/graph/init:', error);
    return res.status(500).json({
      error: {
        code: 'INTERNAL_ERROR',
        message: 'An internal error occurred. Please try again later.',
      },
    });
  }
}
