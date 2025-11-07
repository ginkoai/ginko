/**
 * @fileType: utility
 * @status: current
 * @updated: 2025-11-07
 * @tags: [sync, conflict-detection, duplicate-check, task-026]
 * @related: [scanner.ts, sync.ts, uploader.ts]
 * @priority: high
 * @complexity: medium
 * @dependencies: [axios]
 */

/**
 * Conflict Detector (TASK-026)
 *
 * Detects conflicts between local and cloud knowledge nodes:
 * - Matches nodes by title + type
 * - Compares content hashes
 * - Supports multiple resolution strategies:
 *   - skip: Keep cloud version (safe default)
 *   - overwrite: Replace with local version
 *   - merge: Future support for intelligent merging
 */

import axios from 'axios';
import { LocalNode } from './scanner.js';

export type ConflictResolution = 'skip' | 'overwrite' | 'merge';

export interface CloudNode {
  id: string;
  type: string;
  title: string;
  status: string;
  tags: string[];
  hash?: string;
  createdAt: string;
  updatedAt: string;
}

export interface Conflict {
  local: LocalNode;
  cloud: CloudNode;
  resolution: ConflictResolution;
  reason: string;
}

/**
 * Detect conflicts between local and cloud nodes
 */
export async function detectConflicts(
  localNodes: LocalNode[],
  graphId: string,
  token: string,
  apiUrl?: string
): Promise<Conflict[]> {
  const conflicts: Conflict[] = [];

  try {
    // Fetch existing nodes from cloud
    const cloudNodes = await fetchCloudNodes(graphId, token, apiUrl);

    // Create lookup map for cloud nodes (by title + type)
    const cloudNodeMap = new Map<string, CloudNode>();
    cloudNodes.forEach(node => {
      const key = `${node.type}:${node.title}`;
      cloudNodeMap.set(key, node);
    });

    // Check each local node for conflicts
    for (const localNode of localNodes) {
      const key = `${localNode.type}:${localNode.title}`;
      const cloudNode = cloudNodeMap.get(key);

      if (cloudNode) {
        // Conflict detected - same title + type exists
        const reason = determineConflictReason(localNode, cloudNode);

        conflicts.push({
          local: localNode,
          cloud: cloudNode,
          resolution: 'skip', // Default to safe option
          reason,
        });
      }
    }

  } catch (error: any) {
    throw new Error(`Failed to detect conflicts: ${error.message}`);
  }

  return conflicts;
}

/**
 * Fetch existing nodes from cloud API
 */
async function fetchCloudNodes(
  graphId: string,
  token: string,
  apiUrl?: string
): Promise<CloudNode[]> {
  const baseUrl = apiUrl || process.env.GINKO_API_URL || 'https://app.ginkoai.com';

  try {
    const response = await axios.get(`${baseUrl}/api/v1/knowledge/nodes`, {
      params: {
        graphId,
        limit: 1000, // Fetch all nodes
      },
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
    });

    return response.data.nodes || [];

  } catch (error: any) {
    if (error.response?.status === 404) {
      // Graph doesn't exist or has no nodes
      return [];
    }

    throw new Error(`Failed to fetch cloud nodes: ${error.message}`);
  }
}

/**
 * Determine why nodes conflict
 */
function determineConflictReason(local: LocalNode, cloud: CloudNode): string {
  // Check if content is different
  if (local.hash && cloud.hash && local.hash !== cloud.hash) {
    return 'Content differs';
  }

  // Check if status changed
  if (local.status !== cloud.status) {
    return `Status differs (local: ${local.status}, cloud: ${cloud.status})`;
  }

  // Check if tags changed
  const localTags = new Set(local.tags);
  const cloudTags = new Set(cloud.tags);

  if (localTags.size !== cloudTags.size ||
      ![...localTags].every(tag => cloudTags.has(tag))) {
    return 'Tags differ';
  }

  // Nodes are essentially the same
  return 'Exact duplicate';
}

/**
 * Apply resolution strategy to conflicts
 */
export function applyResolution(
  conflicts: Conflict[],
  resolution: ConflictResolution
): Conflict[] {
  return conflicts.map(conflict => ({
    ...conflict,
    resolution,
  }));
}

/**
 * Get summary of conflicts by reason
 */
export function getConflictSummary(conflicts: Conflict[]): Record<string, number> {
  return conflicts.reduce((acc, conflict) => {
    acc[conflict.reason] = (acc[conflict.reason] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);
}
