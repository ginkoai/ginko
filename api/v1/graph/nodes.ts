/**
 * @fileType: api-route
 * @status: current
 * @updated: 2025-11-02
 * @tags: [api, crud, nodes, knowledge-graph, serverless]
 * @related: [_cloud-graph-client.ts, init.ts, status.ts]
 * @priority: critical
 * @complexity: medium
 * @dependencies: []
 */

import type { VercelRequest, VercelResponse } from '@vercel/node';
import { CloudGraphClient } from './_cloud-graph-client.js';

/**
 * POST/GET/PATCH/DELETE /api/v1/graph/nodes
 *
 * CRUD operations for knowledge graph nodes (ADR, PRD, Pattern, Gotcha, etc.)
 *
 * POST - Create a new node
 * Request body:
 * {
 *   "graphId": "gin_xyz",
 *   "label": "ADR",
 *   "data": {
 *     "title": "Use JWT tokens",
 *     "status": "proposed",
 *     "content": "# ADR-042...",
 *     "tags": ["auth", "security"]
 *   }
 * }
 *
 * GET - Query nodes with filters
 * Query params:
 * - graphId: Graph ID (required)
 * - labels: Comma-separated labels (ADR,PRD)
 * - status: Filter by status
 * - tags: Filter by tags
 * - limit: Max results (default: 100)
 * - offset: Pagination offset (default: 0)
 *
 * PATCH - Update a node
 * Request body:
 * {
 *   "graphId": "gin_xyz",
 *   "nodeId": "adr_123",
 *   "data": {
 *     "status": "accepted"
 *   }
 * }
 *
 * DELETE - Delete a node
 * Query params:
 * - graphId: Graph ID (required)
 * - nodeId: Node ID to delete (required)
 */
export default async function handler(
  req: VercelRequest,
  res: VercelResponse
) {
  // Authentication
  const authHeader = req.headers.authorization;
  if (!authHeader?.startsWith('Bearer ')) {
    return res.status(401).json({
      error: { code: 'AUTH_REQUIRED', message: 'Bearer token required in Authorization header.' },
    });
  }

  const token = authHeader.substring(7);

  try {
    switch (req.method) {
      case 'POST':
        return await handleCreate(req, res, token);
      case 'GET':
        return await handleQuery(req, res, token);
      case 'PATCH':
        return await handleUpdate(req, res, token);
      case 'DELETE':
        return await handleDelete(req, res, token);
      default:
        return res.status(405).json({
          error: { code: 'METHOD_NOT_ALLOWED', message: `Method ${req.method} not allowed.` },
        });
    }
  } catch (error: any) {
    console.error('Error in /api/v1/graph/nodes:', error);
    return res.status(500).json({
      error: {
        code: 'INTERNAL_ERROR',
        message: error.message || 'An internal error occurred.',
      },
    });
  }
}

/**
 * POST - Create a new node
 */
async function handleCreate(
  req: VercelRequest,
  res: VercelResponse,
  token: string
) {
  const { graphId, label, data } = req.body;

  // Validation
  if (!graphId) {
    return res.status(400).json({
      error: { code: 'INVALID_REQUEST', message: 'graphId is required.' },
    });
  }

  if (!label) {
    return res.status(400).json({
      error: { code: 'INVALID_REQUEST', message: 'label is required (ADR, PRD, Pattern, etc.).' },
    });
  }

  if (!data || typeof data !== 'object') {
    return res.status(400).json({
      error: { code: 'INVALID_REQUEST', message: 'data object is required.' },
    });
  }

  // Validate label is one of the known types
  const validLabels = ['ADR', 'PRD', 'Pattern', 'Gotcha', 'LogEntry', 'Session', 'CodeFile', 'ContextModule'];
  if (!validLabels.includes(label)) {
    return res.status(400).json({
      error: {
        code: 'INVALID_LABEL',
        message: `Invalid label '${label}'. Must be one of: ${validLabels.join(', ')}`,
      },
    });
  }

  // Create client and node
  const client = await CloudGraphClient.fromBearerToken(token, graphId);
  const nodeId = await client.createNode(label, data);

  return res.status(201).json({
    nodeId,
    label,
    graphId,
    created: true,
  });
}

/**
 * GET - Query nodes with filters
 */
async function handleQuery(
  req: VercelRequest,
  res: VercelResponse,
  token: string
) {
  const {
    graphId,
    labels: labelsParam,
    limit: limitParam = '100',
    offset: offsetParam = '0',
    orderBy: orderByParam,
    orderDirection = 'DESC',
    ...propertyFilters
  } = req.query;

  // Validation
  if (!graphId || typeof graphId !== 'string') {
    return res.status(400).json({
      error: { code: 'INVALID_REQUEST', message: 'graphId query parameter is required.' },
    });
  }

  // Parse parameters
  const labels = labelsParam && typeof labelsParam === 'string'
    ? labelsParam.split(',').map(l => l.trim())
    : undefined;

  const limit = Math.min(parseInt(limitParam as string, 10) || 100, 1000); // Cap at 1000
  const offset = parseInt(offsetParam as string, 10) || 0;

  const orderBy = orderByParam && typeof orderByParam === 'string'
    ? { field: orderByParam, direction: orderDirection === 'ASC' ? 'ASC' : 'DESC' as 'ASC' | 'DESC' }
    : undefined;

  // Build property filters (any remaining query params are treated as property filters)
  const properties: Record<string, any> = {};
  Object.entries(propertyFilters).forEach(([key, value]) => {
    if (key !== 'labels' && key !== 'limit' && key !== 'offset' && key !== 'orderBy' && key !== 'orderDirection') {
      properties[key] = value;
    }
  });

  // Create client and query
  const client = await CloudGraphClient.fromBearerToken(token, graphId);
  const result = await client.queryNodes({
    labels,
    properties,
    limit,
    offset,
    orderBy,
  });

  return res.status(200).json({
    nodes: result.nodes,
    totalCount: result.totalCount,
    count: result.nodes.length,
    limit,
    offset,
    executionTime: result.executionTime,
  });
}

/**
 * PATCH - Update a node
 */
async function handleUpdate(
  req: VercelRequest,
  res: VercelResponse,
  token: string
) {
  const { graphId, nodeId, data } = req.body;

  // Validation
  if (!graphId) {
    return res.status(400).json({
      error: { code: 'INVALID_REQUEST', message: 'graphId is required.' },
    });
  }

  if (!nodeId) {
    return res.status(400).json({
      error: { code: 'INVALID_REQUEST', message: 'nodeId is required.' },
    });
  }

  if (!data || typeof data !== 'object') {
    return res.status(400).json({
      error: { code: 'INVALID_REQUEST', message: 'data object is required.' },
    });
  }

  // Create client and update
  const client = await CloudGraphClient.fromBearerToken(token, graphId);

  // Check node exists
  const existingNode = await client.getNode(nodeId);
  if (!existingNode) {
    return res.status(404).json({
      error: { code: 'NODE_NOT_FOUND', message: `Node ${nodeId} not found in graph ${graphId}.` },
    });
  }

  await client.updateNode(nodeId, data);

  return res.status(200).json({
    nodeId,
    graphId,
    updated: true,
  });
}

/**
 * DELETE - Delete a node
 */
async function handleDelete(
  req: VercelRequest,
  res: VercelResponse,
  token: string
) {
  const { graphId, nodeId } = req.query;

  // Validation
  if (!graphId || typeof graphId !== 'string') {
    return res.status(400).json({
      error: { code: 'INVALID_REQUEST', message: 'graphId query parameter is required.' },
    });
  }

  if (!nodeId || typeof nodeId !== 'string') {
    return res.status(400).json({
      error: { code: 'INVALID_REQUEST', message: 'nodeId query parameter is required.' },
    });
  }

  // Create client and delete
  const client = await CloudGraphClient.fromBearerToken(token, graphId);

  // Check node exists
  const existingNode = await client.getNode(nodeId);
  if (!existingNode) {
    return res.status(404).json({
      error: { code: 'NODE_NOT_FOUND', message: `Node ${nodeId} not found in graph ${graphId}.` },
    });
  }

  await client.deleteNode(nodeId);

  return res.status(200).json({
    nodeId,
    graphId,
    deleted: true,
  });
}
