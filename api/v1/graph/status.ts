/**
 * @fileType: api-route
 * @status: current
 * @updated: 2025-10-31
 * @tags: [api, graph, status, serverless]
 * @related: [init.ts]
 * @priority: high
 * @complexity: medium
 * @dependencies: []
 */

import type { VercelRequest, VercelResponse } from '@vercel/node';
import { runQuery, verifyConnection } from './_neo4j.js';

/**
 * GET /api/v1/graph/status
 * Get graph statistics and health information
 */
export default async function handler(
  req: VercelRequest,
  res: VercelResponse
) {
  if (req.method !== 'GET') {
    return res.status(405).json({
      error: { code: 'METHOD_NOT_ALLOWED', message: 'Method not allowed. Use GET.' },
    });
  }

  try {
    // Verify Neo4j connection
    const isConnected = await verifyConnection();
    if (!isConnected) {
      return res.status(503).json({
        error: { code: 'SERVICE_UNAVAILABLE', message: 'Graph database unavailable.' },
      });
    }

    // Verify authentication
    const authHeader = req.headers.authorization;
    if (!authHeader?.startsWith('Bearer ')) {
      return res.status(401).json({
        error: { code: 'AUTH_REQUIRED', message: 'Authentication required.' },
      });
    }

    const { graphId } = req.query;

    if (!graphId || typeof graphId !== 'string') {
      return res.status(400).json({
        error: { code: 'INVALID_REQUEST', message: 'Missing graphId query parameter.' },
      });
    }

    // Get graph metadata
    const graphMetadata = await runQuery<any>(
      `MATCH (g:Graph {graphId: $graphId})
       RETURN g.namespace as namespace,
              g.visibility as visibility,
              g.updatedAt as lastSync`,
      { graphId }
    );

    if (graphMetadata.length === 0) {
      return res.status(404).json({
        error: { code: 'GRAPH_NOT_FOUND', message: 'Graph not found.' },
      });
    }

    // Count nodes by type
    const nodesByType = await runQuery<{ type: string; count: number }>(
      `MATCH (g:Graph {graphId: $graphId})-[:CONTAINS]->(doc)
       WHERE doc:ADR OR doc:PRD OR doc:Pattern OR doc:Gotcha OR doc:Session OR doc:ContextModule
       RETURN labels(doc)[0] as type, count(doc) as count`,
      { graphId }
    );

    // Count total nodes
    const totalNodes = nodesByType.reduce((sum, item) => sum + item.count, 0);

    // Count nodes with embeddings
    const embeddingsCount = await runQuery<{ count: number }>(
      `MATCH (g:Graph {graphId: $graphId})-[:CONTAINS]->(doc)
       WHERE EXISTS(doc.embedding)
       RETURN count(doc) as count`,
      { graphId }
    );

    // Count relationships by type
    const relsByType = await runQuery<{ type: string; count: number }>(
      `MATCH (g:Graph {graphId: $graphId})-[:CONTAINS]->(doc)-[r]->()
       RETURN type(r) as type, count(r) as count`,
      { graphId }
    );

    // Calculate total relationships
    const totalRels = relsByType.reduce((sum, item) => sum + item.count, 0);

    // Find most connected document
    const mostConnected = await runQuery<{ id: string; connections: number }>(
      `MATCH (g:Graph {graphId: $graphId})-[:CONTAINS]->(doc)
       OPTIONAL MATCH (doc)-[r]-()
       WITH doc, count(r) as connections
       ORDER BY connections DESC
       LIMIT 1
       RETURN doc.id as id, connections`,
      { graphId }
    );

    // Calculate average connections
    const avgConnections = totalNodes > 0 ? (totalRels / totalNodes).toFixed(1) : 0;

    // Build response
    const byType: Record<string, number> = {};
    nodesByType.forEach(item => {
      byType[item.type] = item.count;
    });

    const relsByTypeMap: Record<string, number> = {};
    relsByType.forEach(item => {
      relsByTypeMap[item.type] = item.count;
    });

    return res.status(200).json({
      namespace: graphMetadata[0].namespace,
      graphId,
      visibility: graphMetadata[0].visibility,
      nodes: {
        total: totalNodes,
        byType,
        withEmbeddings: embeddingsCount[0]?.count || 0,
      },
      relationships: {
        total: totalRels,
        byType: relsByTypeMap,
      },
      lastSync: graphMetadata[0].lastSync || new Date().toISOString(),
      health: 'healthy',
      stats: {
        averageConnections: parseFloat(avgConnections as string),
        mostConnected: mostConnected[0] || { id: '', connections: 0 },
      },
    });

  } catch (error) {
    console.error('Error in /api/v1/graph/status:', error);
    return res.status(500).json({
      error: { code: 'INTERNAL_ERROR', message: 'An internal error occurred.' },
    });
  }
}
