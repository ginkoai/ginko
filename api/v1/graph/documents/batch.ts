/**
 * @fileType: api-route
 * @status: current
 * @updated: 2025-11-04
 * @tags: [documents, batch-loading, adr-043, context-loading]
 * @related: [_cloud-graph-client.ts, context-loader-events.ts]
 * @priority: critical
 * @complexity: medium
 * @dependencies: [neo4j-driver]
 */

/**
 * POST /api/v1/graph/documents/batch
 *
 * Load multiple documents by ID (ADR-043 Phase 3)
 *
 * Request Body:
 * {
 *   "graphId": "gin_xxx",
 *   "documentIds": ["ADR-043", "PRD-009", "Pattern-001"]
 * }
 *
 * Returns:
 * - documents: Array of knowledge nodes
 * - totalCount: Number of documents loaded
 * - notFound: Array of document IDs that weren't found
 */

import { VercelRequest, VercelResponse } from '@vercel/node';
import { runQuery } from '../_neo4j.js';

interface KnowledgeNode {
  id: string;
  type: string;
  title?: string;
  content?: string;
  status?: string;
  tags?: string[];
  created?: Date;
  updated?: Date;
}

export default async function handler(
  req: VercelRequest,
  res: VercelResponse
) {
  // Only allow POST requests
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    // Extract Bearer token
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ error: 'Missing or invalid authorization header' });
    }

    // Parse request body
    const { graphId, documentIds } = req.body;

    if (!graphId || typeof graphId !== 'string') {
      return res.status(400).json({ error: 'Missing required field: graphId' });
    }

    if (!Array.isArray(documentIds) || documentIds.length === 0) {
      return res.status(400).json({ error: 'documentIds must be a non-empty array' });
    }

    if (documentIds.length > 100) {
      return res.status(400).json({ error: 'Maximum 100 documents per request' });
    }

    // Validate document IDs are strings
    if (!documentIds.every(id => typeof id === 'string')) {
      return res.status(400).json({ error: 'All documentIds must be strings' });
    }

    // Query documents by ID
    const result = await runQuery<any>(
      `
      MATCH (g:Graph {graphId: $graphId})-[:CONTAINS]->(doc)
      WHERE doc.id IN $documentIds
      RETURN doc, labels(doc) as labels
      `,
      {
        graphId,
        documentIds,
      }
    );

    const documents: KnowledgeNode[] = result.map((r: any) => {
      const props = r.doc.properties;
      const labels = r.labels || [];
      return {
        id: props.id,
        type: labels.find((l: string) => l !== 'Document') || 'Unknown',
        title: props.title,
        content: props.content,
        status: props.status,
        tags: props.tags || [],
        created: props.created ? new Date(props.created) : undefined,
        updated: props.updated ? new Date(props.updated) : undefined,
      };
    });

    // Find which document IDs weren't found
    const foundIds = new Set(documents.map(d => d.id));
    const notFound = documentIds.filter(id => !foundIds.has(id));

    return res.status(200).json({
      documents,
      totalCount: documents.length,
      notFound,
      requested: documentIds.length,
    });
  } catch (error: any) {
    console.error('[Batch Documents API] Error:', error);

    return res.status(500).json({
      error: 'Failed to load documents',
      message: error.message,
    });
  }
}
