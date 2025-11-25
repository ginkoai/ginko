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
import { graphHealthMonitor } from '../../utils/graph-health-monitor.js';

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
   * Make authenticated API request with retry logic (TASK-013)
   *
   * Retry strategy for transient failures:
   * - Network errors (ECONNRESET, ETIMEDOUT, etc.)
   * - Server errors (500, 502, 503, 504)
   * - Rate limiting (429)
   *
   * Exponential backoff: 1s, 2s, 4s (max 3 attempts)
   */
  private async request<T>(
    method: string,
    endpoint: string,
    body?: unknown,
    attempt: number = 1
  ): Promise<T> {
    const token = await this.requireAuth();
    const url = `${this.apiUrl}${endpoint}`;
    const debugMode = process.env.GINKO_DEBUG_API === 'true';
    const maxAttempts = 3;
    const baseDelay = 1000; // 1 second
    const startTime = Date.now();

    if (debugMode) {
      console.log(`\n[API Debug] ${method} ${url}${attempt > 1 ? ` (attempt ${attempt}/${maxAttempts})` : ''}`);
      if (body) {
        console.log('[API Debug] Request body:', JSON.stringify(body, null, 2));
      }
    }

    try {
      const response = await fetch(url, {
        method,
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
          'X-Client-Version': 'ginko-cli@1.2.0',
        },
        body: body ? JSON.stringify(body) : undefined,
      });

      if (debugMode) {
        console.log(`[API Debug] Response status: ${response.status} ${response.statusText}`);
      }

      // Check if response indicates a retryable error
      const isRetryable = this.isRetryableStatusCode(response.status);

      if (!response.ok) {
        const errorData = await response.json() as GraphApiError;
        if (debugMode) {
          console.log('[API Debug] Error response:', JSON.stringify(errorData, null, 2));
        }

        const error = new Error(errorData.error.message || `API error: ${response.status}`);

        // Retry if retryable and haven't exceeded max attempts
        if (isRetryable && attempt < maxAttempts) {
          graphHealthMonitor.recordRetry();
          const delay = baseDelay * Math.pow(2, attempt - 1); // Exponential backoff
          console.log(`⚠️  Retryable error (${response.status}). Retrying in ${delay}ms...`);
          await this.sleep(delay);
          return this.request<T>(method, endpoint, body, attempt + 1);
        }

        graphHealthMonitor.recordFailure(`${method} ${endpoint}`, error.message);
        throw error;
      }

      const responseData = await response.json() as T;
      if (debugMode) {
        console.log('[API Debug] Response data:', JSON.stringify(responseData, null, 2));
      }

      const latency = Date.now() - startTime;
      graphHealthMonitor.recordSuccess(latency);

      return responseData;
    } catch (error) {
      // Network errors (timeouts, connection refused, etc.)
      const isNetworkError = error instanceof Error && (
        error.message.includes('ECONNRESET') ||
        error.message.includes('ETIMEDOUT') ||
        error.message.includes('ECONNREFUSED') ||
        error.message.includes('fetch failed') ||
        error.message.includes('network')
      );

      // Retry network errors
      if (isNetworkError && attempt < maxAttempts) {
        graphHealthMonitor.recordRetry();
        const delay = baseDelay * Math.pow(2, attempt - 1);
        console.log(`⚠️  Network error. Retrying in ${delay}ms...`);
        await this.sleep(delay);
        return this.request<T>(method, endpoint, body, attempt + 1);
      }

      // Add detailed error logging
      const errorMessage = error instanceof Error ? error.message : String(error);
      graphHealthMonitor.recordFailure(`${method} ${endpoint}`, errorMessage);

      if (error instanceof Error) {
        throw new Error(`Failed to ${method} ${url}: ${error.message}`);
      }
      throw error;
    }
  }

  /**
   * Check if HTTP status code is retryable
   */
  private isRetryableStatusCode(status: number): boolean {
    return (
      status === 429 || // Rate limit
      status === 500 || // Internal server error
      status === 502 || // Bad gateway
      status === 503 || // Service unavailable
      status === 504    // Gateway timeout
    );
  }

  /**
   * Sleep utility for retry backoff
   */
  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
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

  /**
   * Get ADR constraints for a task (EPIC-002 Phase 1)
   * Returns MUST_FOLLOW relationships between task and ADRs
   */
  async getTaskConstraints(taskId: string): Promise<TaskConstraintsResponse> {
    return this.request<TaskConstraintsResponse>('GET', `/api/v1/task/${taskId}/constraints`);
  }

  /**
   * Get patterns for a task (EPIC-002 Sprint 3)
   * Returns APPLIES_PATTERN relationships with confidence scores
   */
  async getTaskPatterns(taskId: string): Promise<TaskPatternsResponse> {
    return this.request<TaskPatternsResponse>('GET', `/api/v1/task/${taskId}/patterns`);
  }

  /**
   * Get gotchas for a task (EPIC-002 Sprint 3)
   * Returns AVOID_GOTCHA relationships with severity and resolution stats
   */
  async getTaskGotchas(taskId: string): Promise<TaskGotchasResponse> {
    return this.request<TaskGotchasResponse>('GET', `/api/v1/task/${taskId}/gotchas`);
  }

  /**
   * Record a gotcha encounter (EPIC-002 Sprint 3 TASK-4)
   * Called when `ginko log --category=gotcha` references a gotcha
   *
   * @param gotchaId - The gotcha ID to increment encounter count
   * @param context - Optional context about the encounter
   * @returns Updated gotcha stats including effectiveness score
   */
  async recordGotchaEncounter(
    gotchaId: string,
    context?: {
      description?: string;
      sessionId?: string;
      commitHash?: string;
    }
  ): Promise<GotchaEncounterResponse> {
    return this.request<GotchaEncounterResponse>(
      'POST',
      `/api/v1/gotcha/${gotchaId}/encounter`,
      context || {}
    );
  }

  /**
   * Resolve a gotcha (EPIC-002 Sprint 3 TASK-4)
   * Links the gotcha to a fix commit
   *
   * @param gotchaId - The gotcha ID to mark as resolved
   * @param data - Resolution details including commit hash
   * @returns Updated gotcha stats
   */
  async resolveGotcha(
    gotchaId: string,
    data: {
      commitHash: string;
      description?: string;
      sessionId?: string;
      files?: string[];
    }
  ): Promise<GotchaResolveResponse> {
    return this.request<GotchaResolveResponse>(
      'POST',
      `/api/v1/gotcha/${gotchaId}/resolve`,
      data
    );
  }

  /**
   * Get gotcha resolution history (EPIC-002 Sprint 3 TASK-4)
   *
   * @param gotchaId - The gotcha ID to get history for
   * @returns Gotcha stats and resolution history
   */
  async getGotchaResolutions(gotchaId: string): Promise<GotchaResolutionsResponse> {
    return this.request<GotchaResolutionsResponse>(
      'GET',
      `/api/v1/gotcha/${gotchaId}/resolve`
    );
  }
}

/**
 * Gotcha encounter response (EPIC-002 Sprint 3 TASK-4)
 */
export interface GotchaEncounterResponse {
  gotcha: {
    id: string;
    encounters: number;
    resolutions: number;
    effectivenessScore: number;
  };
  encounter: {
    timestamp: string;
    description?: string;
  };
}

/**
 * Gotcha resolve response (EPIC-002 Sprint 3 TASK-4)
 */
export interface GotchaResolveResponse {
  gotcha: {
    id: string;
    encounters: number;
    resolutions: number;
    effectivenessScore: number;
  };
  resolution: {
    timestamp: string;
    commitHash: string;
    description?: string;
  };
}

/**
 * Gotcha resolutions response (EPIC-002 Sprint 3 TASK-4)
 */
export interface GotchaResolutionsResponse {
  gotcha: {
    id: string;
    title: string;
    encounters: number;
    resolutions: number;
    effectivenessScore: number;
  };
  resolutionHistory: Array<{
    commitHash: string;
    timestamp: string;
    description?: string;
    sessionId?: string;
    files?: string[];
  }>;
}

/**
 * Task constraints response from API (EPIC-002 Phase 1)
 */
export interface TaskConstraintsResponse {
  task: {
    id: string;
    title: string;
    status: string;
  };
  constraints: Array<{
    adr: {
      id: string;
      title: string;
      status: string;
      summary: string;
      filePath?: string;
    };
    relationship: {
      source: string;
      extracted_at: string;
    };
  }>;
  count: number;
}

/**
 * Task patterns response from API (EPIC-002 Sprint 3)
 */
export interface TaskPatternsResponse {
  task: {
    id: string;
    title: string;
    status: string;
  };
  patterns: Array<{
    pattern: {
      id: string;
      title: string;
      category: string;
      confidence: 'high' | 'medium' | 'low';
      confidenceScore: number;
      usageCount: number;
      content?: string;
    };
    relationship: {
      source: string;
      extracted_at: string;
    };
    usages: Array<{
      fileId: string;
      context?: string;
    }>;
  }>;
  count: number;
}

/**
 * Task gotchas response from API (EPIC-002 Sprint 3)
 */
export interface TaskGotchasResponse {
  task: {
    id: string;
    title: string;
    status: string;
  };
  gotchas: Array<{
    gotcha: {
      id: string;
      title: string;
      severity: 'critical' | 'high' | 'medium' | 'low';
      confidence: 'high' | 'medium' | 'low';
      confidenceScore: number;
      symptom?: string;
      cause?: string;
      solution?: string;
    };
    relationship: {
      source: string;
      extracted_at: string;
    };
    stats: {
      encounters: number;
      resolutions: number;
      resolutionRate: number;
    };
  }>;
  count: number;
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
