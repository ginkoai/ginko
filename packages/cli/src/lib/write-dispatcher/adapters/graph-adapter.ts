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
  /** Static bearer token (used if tokenResolver is not provided) */
  bearerToken?: string;
  /** Lazy token resolver — called at write time for fresh tokens */
  tokenResolver?: () => Promise<string | null>;
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
      tokenResolver: config.tokenResolver,
      graphId: config.graphId,
      timeout: config.timeout || 10000,
    };
  }

  /**
   * Resolve the bearer token at call time.
   * Prefers tokenResolver (lazy) over static bearerToken.
   */
  private async resolveToken(): Promise<string> {
    if (this.config.tokenResolver) {
      const token = await this.config.tokenResolver();
      if (token) return token;
    }
    return this.config.bearerToken || '';
  }

  /**
   * Check if adapter is enabled.
   * Enabled when config has a token source (static or resolver) + graphId.
   * GINKO_GRAPH_ENABLED=false can explicitly disable (opt-out override).
   */
  enabled(): boolean {
    if (process.env.GINKO_GRAPH_ENABLED === 'false') {
      return false;
    }
    const hasTokenSource = !!this.config.bearerToken || !!this.config.tokenResolver;
    return hasTokenSource && !!this.config.graphId;
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
   * Create node in graph via REST API.
   * Uses lazy token resolution and retries once on 401/403 with a fresh token.
   */
  private async createNode(
    label: string,
    data: Record<string, any>,
    isRetry: boolean = false
  ): Promise<{ nodeId: string; label: string; graphId: string; created: boolean }> {
    const url = `${this.config.apiUrl}/api/v1/graph/nodes`;
    const bearerToken = await this.resolveToken();

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
          'Authorization': `Bearer ${bearerToken}`,
        },
        body: JSON.stringify(payload),
        signal: controller.signal,
        redirect: 'follow', // Follow redirects (should be default, but explicitly set)
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        const errorBody = await response.text().catch(() => 'Unknown error');

        // Retry once on 401/403 with a fresh token (token may have been refreshed on disk)
        if ((response.status === 401 || response.status === 403) && !isRetry) {
          return this.createNode(label, data, true);
        }

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
 * Create GraphAdapter from config files, with env vars as overrides.
 * Loads graphId from .ginko/graph/config.json and auth token from ~/.ginko/auth.json.
 * Env vars (GINKO_GRAPH_API_URL, GINKO_GRAPH_TOKEN, GINKO_GRAPH_ID) take precedence.
 */
export async function createGraphAdapterFromEnv(): Promise<GraphAdapter> {
  let apiUrl = process.env.GINKO_GRAPH_API_URL || '';
  let bearerToken = process.env.GINKO_GRAPH_TOKEN || '';
  let graphId = process.env.GINKO_GRAPH_ID || '';

  // Load from config files if env vars not set
  if (!graphId || !apiUrl) {
    try {
      const { loadGraphConfig } = await import('../../../commands/graph/config.js');
      const config = await loadGraphConfig();
      if (config) {
        if (!graphId) graphId = config.graphId || '';
        if (!apiUrl) apiUrl = config.apiEndpoint || '';
      }
    } catch {
      // Config not available - continue with env vars only
    }
  }

  // Use lazy token resolver instead of loading token once at creation time.
  // This ensures the adapter always uses the freshest token from disk,
  // matching the pattern that works in GraphApiClient.requireAuth().
  let tokenResolver: (() => Promise<string | null>) | undefined;

  if (!bearerToken) {
    try {
      const { getAccessToken } = await import('../../../utils/auth-storage.js');
      // Try to load once to validate auth is available
      const initialToken = await getAccessToken();
      if (initialToken) {
        // Set up lazy resolver for future calls
        tokenResolver = async () => {
          const { getAccessToken: getToken } = await import('../../../utils/auth-storage.js');
          return getToken();
        };
        // Also set static token for enabled() check
        bearerToken = initialToken;
      }
    } catch {
      // Auth not available - continue without token
    }
  }

  if (!apiUrl) {
    apiUrl = 'https://app.ginkoai.com';
  }

  return new GraphAdapter({
    apiUrl,
    bearerToken,
    tokenResolver,
    graphId,
    timeout: parseInt(process.env.GINKO_GRAPH_TIMEOUT || '10000', 10),
  });
}
