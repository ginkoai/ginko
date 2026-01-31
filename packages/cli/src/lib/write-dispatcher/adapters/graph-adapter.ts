/**
 * @fileType: adapter
 * @status: deprecated
 * @deprecated: true
 * @updated: 2025-11-02
 * @tags: [write-adapter, graph, neo4j, cloud, multi-tenant, adr-041]
 * @related: [../write-dispatcher.ts, ../../api/v1/graph/_cloud-graph-client.ts, local-adapter.ts]
 * @priority: critical
 * @complexity: medium
 * @dependencies: []
 */

import type {
  WriteAdapter,
  KnowledgeDocument,
  WriteResult,
} from '../write-dispatcher.js';

/**
 * GraphAdapter Configuration
 */
export interface GraphAdapterConfig {
  apiUrl: string;
  bearerToken: string;
  graphId: string;
  timeout?: number;
}

/**
 * GraphAdapter
 *
 * Writes knowledge documents to Neo4j cloud graph via REST API.
 * Implements multi-tenant writes using CloudGraphClient.
 *
 * Environment Variables:
 * - GINKO_GRAPH_ENABLED: 'true' to enable graph writes
 * - GINKO_GRAPH_API_URL: Graph API endpoint (default: https://mcp.ginko.ai)
 * - GINKO_GRAPH_TOKEN: Bearer token for authentication
 * - GINKO_GRAPH_ID: Graph ID for user's namespace
 *
 * Usage:
 * ```typescript
 * const adapter = new GraphAdapter({
 *   apiUrl: process.env.GINKO_GRAPH_API_URL || 'https://mcp.ginko.ai',
 *   bearerToken: process.env.GINKO_GRAPH_TOKEN || '',
 *   graphId: process.env.GINKO_GRAPH_ID || ''
 * });
 *
 * dispatcher.registerAdapter(adapter);
 * ```
 */
export class GraphAdapter implements WriteAdapter {
  name = 'graph';
  private config: GraphAdapterConfig;

  constructor(config: GraphAdapterConfig) {
    this.config = {
      apiUrl: config.apiUrl,
      bearerToken: config.bearerToken,
      graphId: config.graphId,
      timeout: config.timeout || 10000,
    };
  }

  /**
   * Check if adapter is enabled via environment variable
   */
  enabled(): boolean {
    return process.env.GINKO_GRAPH_ENABLED === 'true' &&
           !!this.config.bearerToken &&
           !!this.config.graphId;
  }

  /**
   * Write knowledge document to graph via REST API
   */
  async write(document: KnowledgeDocument): Promise<WriteResult> {
    if (!this.enabled()) {
      throw new Error('GraphAdapter is not enabled. Check GINKO_GRAPH_ENABLED environment variable.');
    }

    try {
      // Map KnowledgeDocument to graph node data
      const nodeData = this.mapDocumentToNodeData(document);

      // POST to /api/v1/graph/nodes
      const response = await this.createNode(document.type, nodeData);

      return {
        source: 'graph',
        id: response.nodeId,
        timestamp: new Date().toISOString(),
      };
    } catch (error) {
      throw new Error(
        `GraphAdapter write failed: ${error instanceof Error ? error.message : String(error)}`
      );
    }
  }

  /**
   * Create node in graph via REST API
   */
  private async createNode(
    label: string,
    data: Record<string, any>
  ): Promise<{ nodeId: string; label: string; graphId: string; created: boolean }> {
    const url = `${this.config.apiUrl}/api/v1/graph/nodes`;

    const payload = {
      graphId: this.config.graphId,
      label,
      data,
    };

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), this.config.timeout);

    try {
      // Add Vercel bypass token to URL if available (for deployment protection)
      let requestUrl = url;
      const bypassToken = process.env.VERCEL_AUTOMATION_BYPASS_SECRET;
      if (bypassToken) {
        requestUrl += `?x-vercel-set-bypass-cookie=true&x-vercel-protection-bypass=${bypassToken}`;
      }

      const response = await fetch(requestUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.config.bearerToken}`,
        },
        body: JSON.stringify(payload),
        signal: controller.signal,
        redirect: 'follow', // Follow redirects (should be default, but explicitly set)
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        const errorBody = await response.text().catch(() => 'Unknown error');
        throw new Error(`HTTP ${response.status}: ${errorBody}`);
      }

      const result = await response.json() as { nodeId: string; label: string; graphId: string; created: boolean };
      return result;
    } catch (error) {
      clearTimeout(timeoutId);
      throw error;
    }
  }

  /**
   * Map KnowledgeDocument to Neo4j node data
   */
  private mapDocumentToNodeData(document: KnowledgeDocument): Record<string, any> {
    const nodeData: Record<string, any> = {
      id: document.id,
      title: document.title,
      content: document.content,
      ...document.data,
    };

    // Add metadata if provided
    if (document.metadata) {
      if (document.metadata.tags) {
        nodeData.tags = document.metadata.tags;
      }
      if (document.metadata.status) {
        nodeData.status = document.metadata.status;
      }
      if (document.metadata.category) {
        nodeData.category = document.metadata.category;
      }
      if (document.metadata.impact) {
        nodeData.impact = document.metadata.impact;
      }
      if (document.metadata.files) {
        nodeData.files = document.metadata.files;
      }
      if (document.metadata.timestamp) {
        nodeData.timestamp = document.metadata.timestamp;
      }

      // Include any other metadata fields
      Object.entries(document.metadata).forEach(([key, value]) => {
        if (!['tags', 'status', 'category', 'impact', 'files', 'timestamp'].includes(key)) {
          nodeData[key] = value;
        }
      });
    }

    return nodeData;
  }

  /**
   * Get adapter configuration (for debugging)
   */
  getConfig(): { apiUrl: string; graphId: string; hasToken: boolean } {
    return {
      apiUrl: this.config.apiUrl,
      graphId: this.config.graphId,
      hasToken: !!this.config.bearerToken,
    };
  }
}

/**
 * Create GraphAdapter from environment variables
 */
export function createGraphAdapterFromEnv(): GraphAdapter {
  return new GraphAdapter({
    apiUrl: process.env.GINKO_GRAPH_API_URL || 'https://mcp.ginko.ai',
    bearerToken: process.env.GINKO_GRAPH_TOKEN || '',
    graphId: process.env.GINKO_GRAPH_ID || '',
    timeout: parseInt(process.env.GINKO_GRAPH_TIMEOUT || '10000', 10),
  });
}
