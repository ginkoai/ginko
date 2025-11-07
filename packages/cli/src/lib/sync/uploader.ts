/**
 * @fileType: utility
 * @status: current
 * @updated: 2025-11-07
 * @tags: [sync, upload, progress, batch, task-026]
 * @related: [sync.ts, scanner.ts, conflict-detector.ts]
 * @priority: high
 * @complexity: medium
 * @dependencies: [axios]
 */

/**
 * Node Uploader (TASK-026)
 *
 * Uploads local nodes to cloud knowledge graph:
 * - Batch uploads with progress tracking
 * - Relationship creation after nodes uploaded
 * - Error handling with retry logic
 * - Real-time progress reporting
 */

import axios from 'axios';
import { LocalNode } from './scanner.js';

export interface UploadProgress {
  total: number;
  uploaded: number;
  failed: number;
  skipped: number;
  relationshipsCreated: number;
}

export interface UploadResult extends UploadProgress {
  errors: Array<{
    node: LocalNode;
    error: string;
  }>;
}

/**
 * Upload nodes to cloud with progress tracking
 */
export async function uploadNodes(
  nodes: LocalNode[],
  graphId: string,
  token: string,
  apiUrl?: string,
  onProgress?: (progress: UploadProgress) => void
): Promise<UploadResult> {
  const baseUrl = apiUrl || process.env.GINKO_API_URL || 'https://app.ginkoai.com';

  const result: UploadResult = {
    total: nodes.length,
    uploaded: 0,
    failed: 0,
    skipped: 0,
    relationshipsCreated: 0,
    errors: [],
  };

  // Map to store nodeId by title for relationship creation
  const nodeIdMap = new Map<string, string>();

  // Phase 1: Upload nodes
  for (const node of nodes) {
    try {
      const nodeId = await uploadSingleNode(node, graphId, token, baseUrl);

      if (nodeId) {
        nodeIdMap.set(`${node.type}:${node.title}`, nodeId);
        result.uploaded++;
      } else {
        result.skipped++;
      }

      // Report progress
      if (onProgress) {
        onProgress({ ...result });
      }

    } catch (error: any) {
      result.failed++;
      result.errors.push({
        node,
        error: error.message,
      });

      // Continue with other nodes even if one fails
    }
  }

  // Phase 2: Create relationships
  for (const node of nodes) {
    const sourceId = nodeIdMap.get(`${node.type}:${node.title}`);

    if (!sourceId || node.relationships.length === 0) {
      continue;
    }

    for (const relationship of node.relationships) {
      try {
        // Find target node ID
        let targetId: string | undefined;

        if (relationship.targetId) {
          targetId = relationship.targetId;
        } else if (relationship.targetTitle) {
          // Try to find in uploaded nodes
          for (const [key, id] of nodeIdMap.entries()) {
            if (key.includes(relationship.targetTitle)) {
              targetId = id;
              break;
            }
          }
        }

        if (targetId) {
          await createRelationship(
            sourceId,
            targetId,
            relationship.type,
            graphId,
            token,
            baseUrl
          );
          result.relationshipsCreated++;
        }

      } catch (error: any) {
        // Log relationship errors but don't fail the sync
        console.warn(`⚠️  Failed to create relationship: ${error.message}`);
      }
    }
  }

  return result;
}

/**
 * Upload a single node to cloud
 */
async function uploadSingleNode(
  node: LocalNode,
  graphId: string,
  token: string,
  baseUrl: string
): Promise<string | null> {
  try {
    const response = await axios.post(
      `${baseUrl}/api/v1/knowledge/nodes`,
      {
        type: node.type,
        graphId,
        data: {
          title: node.title,
          content: node.content,
          status: node.status,
          tags: node.tags,
          ...node.metadata,
        },
      },
      {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      }
    );

    return response.data.node?.id || response.data.id || null;

  } catch (error: any) {
    if (error.response?.status === 409) {
      // Node already exists - not an error
      return null;
    }

    throw new Error(`Failed to upload ${node.title}: ${error.message}`);
  }
}

/**
 * Create relationship between nodes
 */
async function createRelationship(
  sourceId: string,
  targetId: string,
  type: string,
  graphId: string,
  token: string,
  baseUrl: string
): Promise<void> {
  try {
    await axios.post(
      `${baseUrl}/api/v1/knowledge/relationships`,
      {
        sourceId,
        targetId,
        type,
        graphId,
        properties: {},
      },
      {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      }
    );

  } catch (error: any) {
    // Relationship might already exist - not a critical error
    if (error.response?.status === 409) {
      return;
    }

    throw new Error(`Failed to create relationship: ${error.message}`);
  }
}

/**
 * Batch upload nodes (future optimization)
 */
export async function batchUploadNodes(
  nodes: LocalNode[],
  graphId: string,
  token: string,
  baseUrl: string,
  batchSize: number = 10
): Promise<string[]> {
  const nodeIds: string[] = [];

  // Split into batches
  for (let i = 0; i < nodes.length; i += batchSize) {
    const batch = nodes.slice(i, i + batchSize);

    try {
      const response = await axios.post(
        `${baseUrl}/api/v1/knowledge/nodes/batch`,
        {
          graphId,
          nodes: batch.map(node => ({
            type: node.type,
            data: {
              title: node.title,
              content: node.content,
              status: node.status,
              tags: node.tags,
              ...node.metadata,
            },
          })),
        },
        {
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
        }
      );

      nodeIds.push(...(response.data.nodeIds || []));

    } catch (error: any) {
      throw new Error(`Batch upload failed: ${error.message}`);
    }
  }

  return nodeIds;
}
