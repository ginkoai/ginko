/**
 * @fileType: utility
 * @status: current
 * @updated: 2025-10-31
 * @tags: [graph, api, cloud, http-client]
 * @related: [init.ts, load.ts, query.ts, status.ts, explore.ts]
 * @priority: high
 * @complexity: medium
 * @dependencies: [auth-storage]
 */

import { getAccessToken, isAuthenticated } from '../../utils/auth-storage.js';

export interface GraphApiError {
  error: {
    code: string;
    message: string;
    field?: string;
    details?: Record<string, unknown>;
  };
}

export interface GraphInitResponse {
  namespace: string;
  graphId: string;
  status: 'created' | 'initializing' | 'ready';
  estimatedProcessingTime: number;
  createdAt: string;
}

export interface DocumentUpload {
  id: string;
  type: 'ADR' | 'PRD' | 'Pattern' | 'Gotcha' | 'Session' | 'ContextModule';
  title: string;
  content: string;
  filePath: string;
  hash: string;
  metadata?: Record<string, unknown>;
}

export interface JobResponse {
  job: {
    jobId: string;
    status: 'queued' | 'processing' | 'completed' | 'failed';
    createdAt: string;
    estimatedCompletion?: string;
    progress: {
      uploaded: number;
      parsed: number;
      embedded: number;
      total: number;
    };
  };
}

export interface JobStatusResponse extends JobResponse {
  job: JobResponse['job'] & {
    completedAt?: string;
    result?: {
      nodesCreated: number;
      relationshipsCreated: number;
      processingTime: number;
    };
  };
}

export interface GraphStatusResponse {
  namespace: string;
  graphId: string;
  visibility: 'private' | 'organization' | 'public';
  nodes: {
    total: number;
    byType: Record<string, number>;
    withEmbeddings: number;
  };
  relationships: {
    total: number;
    byType: Record<string, number>;
  };
  lastSync: string;
  health: string;
  stats?: {
    averageConnections: number;
    mostConnected: {
      id: string;
      connections: number;
    };
  };
}

export interface QueryResult {
  document: {
    id: string;
    type: string;
    title: string;
    summary: string;
    tags: string[];
    filePath: string;
  };
  similarity: number;
  connections: number;
  matchContext: string;
}

export interface QueryResponse {
  results: QueryResult[];
  totalResults: number;
  queryTime: number;
  embedding: {
    model: string;
    dimensions: number;
  };
}

export interface ExploreResponse {
  document: {
    id: string;
    type: string;
    title: string;
    summary: string;
    content: string;
    tags: string[];
    filePath: string;
    metadata?: Record<string, unknown>;
    createdAt: string;
    updatedAt: string;
  };
  relationships: {
    implements?: Array<{ id: string; type: string; title: string; similarity: number | null }>;
    referencedBy?: Array<{ id: string; type: string; title: string; similarity: number | null }>;
    similarTo?: Array<{ id: string; type: string; title: string; similarity: number }>;
    appliedPatterns?: Array<{ id: string; type: string; title: string; similarity: number | null }>;
  };
  totalConnections: number;
  connectionsByType: Record<string, number>;
}

/**
 * API client for Ginko Cloud graph operations
 */
export class GraphApiClient {
  private apiUrl: string;

  constructor(apiUrl?: string) {
    // Use GINKO_GRAPH_API_URL for graph operations (separate from auth API)
    this.apiUrl = apiUrl || process.env.GINKO_GRAPH_API_URL || process.env.GINKO_API_URL || 'https://app.ginkoai.com';
  }

  /**
   * Check if user is authenticated
   */
  async requireAuth(): Promise<string> {
    if (!await isAuthenticated()) {
      throw new Error('Not authenticated. Run "ginko login" first.');
    }

    const token = await getAccessToken();
    if (!token) {
      throw new Error('Failed to get access token. Run "ginko login" again.');
    }

    return token;
  }

  /**
   * Make authenticated API request
   */
  private async request<T>(
    method: string,
    endpoint: string,
    body?: unknown
  ): Promise<T> {
    const token = await this.requireAuth();

    const response = await fetch(`${this.apiUrl}${endpoint}`, {
      method,
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
        'X-Client-Version': 'ginko-cli@1.2.0',
      },
      body: body ? JSON.stringify(body) : undefined,
    });

    if (!response.ok) {
      const errorData = await response.json() as GraphApiError;
      throw new Error(errorData.error.message || `API error: ${response.status}`);
    }

    return response.json() as Promise<T>;
  }

  /**
   * Initialize a new graph namespace
   */
  async initGraph(data: {
    projectPath: string;
    projectName: string;
    visibility?: 'private' | 'organization' | 'public';
    organization?: string;
    documents: Record<string, number>;
  }): Promise<GraphInitResponse> {
    return this.request<GraphInitResponse>('POST', '/api/v1/graph/init', data);
  }

  /**
   * Upload documents for processing
   */
  async uploadDocuments(graphId: string, documents: DocumentUpload[]): Promise<JobResponse> {
    return this.request<JobResponse>('POST', '/api/v1/graph/documents', {
      graphId,
      documents,
    });
  }

  /**
   * Check job status
   */
  async getJobStatus(jobId: string): Promise<JobStatusResponse> {
    return this.request<JobStatusResponse>('GET', `/api/v1/graph/jobs/${jobId}`);
  }

  /**
   * Get graph status and statistics
   */
  async getGraphStatus(graphId: string): Promise<GraphStatusResponse> {
    return this.request<GraphStatusResponse>('GET', `/api/v1/graph/status?graphId=${graphId}`);
  }

  /**
   * Perform semantic query
   */
  async query(data: {
    graphId: string;
    query: string;
    limit?: number;
    threshold?: number;
    types?: string[];
  }): Promise<QueryResponse> {
    return this.request<QueryResponse>('POST', '/api/v1/graph/query', data);
  }

  /**
   * Explore document connections
   */
  async explore(graphId: string, documentId: string, depth?: number): Promise<ExploreResponse> {
    const params = new URLSearchParams({ graphId });
    if (depth) params.append('depth', depth.toString());

    return this.request<ExploreResponse>('GET', `/api/v1/graph/explore/${documentId}?${params}`);
  }

  /**
   * Poll job until completion
   */
  async pollJob(jobId: string, onProgress?: (progress: JobResponse['job']['progress']) => void): Promise<JobStatusResponse> {
    let attempts = 0;
    const maxAttempts = 120; // 2 minutes max

    while (attempts < maxAttempts) {
      const status = await this.getJobStatus(jobId);

      if (onProgress) {
        onProgress(status.job.progress);
      }

      if (status.job.status === 'completed') {
        return status;
      }

      if (status.job.status === 'failed') {
        throw new Error('Job failed to complete');
      }

      // Wait 1 second before next poll
      await new Promise(resolve => setTimeout(resolve, 1000));
      attempts++;
    }

    throw new Error('Job polling timeout');
  }

  /**
   * Create events in the graph (for event stream)
   */
  async createEvents(graphId: string, events: any[]): Promise<{ created: number }> {
    return this.request<{ created: number }>('POST', '/api/v1/graph/events', {
      graphId,
      events
    });
  }
}

/**
 * Helper function to create graph events with default client
 * Used by event-queue for async syncing
 */
export async function createGraphEvents(events: any[]): Promise<void> {
  if (!isAuthenticated()) {
    throw new Error('Not authenticated. Run `ginko graph init` first.');
  }

  const client = new GraphApiClient();

  // TODO: Get graphId from config or session context
  // For now, use a placeholder that will be replaced in integration
  const graphId = process.env.GINKO_GRAPH_ID || 'default';

  await client.createEvents(graphId, events);
}
