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

export interface TeamCreateResponse {
  success: boolean;
  team: {
    id: string;
    name: string;
    slug: string;
    description: string | null;
    graph_id: string | null;
    created_by: string;
    created_at: string;
    updated_at: string;
    role: 'owner' | 'member';
  };
}

export interface DocumentUpload {
  id: string;
  type: 'ADR' | 'PRD' | 'Epic' | 'Sprint' | 'Charter' | 'Pattern' | 'Gotcha' | 'Session' | 'ContextModule';
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
  hierarchy?: {
    parent?: { id: string; type: string; title: string };
    children: Array<{ id: string; type: string; title: string; status?: string }>;
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
   *
   * Made public to allow external modules (like stale-agent-detector) to use it
   */
  async request<T>(
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
   * Create a team for a project (called after graph init)
   * Each project has its own team with the creator as owner
   *
   * @param name - Team/project name
   * @param graphId - Associated graph ID
   * @param description - Optional team description
   * @returns Created team with ID
   */
  async createTeam(
    name: string,
    graphId: string,
    description?: string
  ): Promise<TeamCreateResponse> {
    return this.request<TeamCreateResponse>('POST', '/api/v1/teams', {
      name,
      graph_id: graphId,
      description: description || `Team for ${name} project`,
    });
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

  /**
   * Check if an Epic ID already exists in the graph (ADR-058)
   * Used for first-claim-wins conflict detection
   *
   * @param graphId - Graph namespace identifier
   * @param epicId - Epic ID to check (e.g., "EPIC-010" or "e010")
   * @returns Conflict info if ID exists, null if available
   */
  async checkEpicConflict(graphId: string, epicId: string): Promise<EpicConflictCheck | null> {
    try {
      const response = await this.request<EpicConflictCheckResponse>(
        'GET',
        `/api/v1/epic/check?graphId=${encodeURIComponent(graphId)}&id=${encodeURIComponent(epicId)}`
      );

      if (response.exists) {
        return {
          exists: true,
          createdBy: response.createdBy || 'unknown',
          createdAt: response.createdAt,
          title: response.title,
          suggestedId: response.suggestedId,
        };
      }

      return null;
    } catch (error: any) {
      // If endpoint doesn't exist yet (404), treat as no conflict
      if (error.message?.includes('404')) {
        return null;
      }
      throw error;
    }
  }

  /**
   * Get all Epic IDs in a graph (for finding next available ID)
   */
  async getEpicIds(graphId: string): Promise<string[]> {
    try {
      const response = await this.request<{ ids: string[] }>(
        'GET',
        `/api/v1/epic/ids?graphId=${encodeURIComponent(graphId)}`
      );
      return response.ids || [];
    } catch {
      return [];
    }
  }

  /**
   * Sync an epic to the graph database
   * Creates Epic node with relationships to sprints
   */
  async syncEpic(epicData: EpicSyncData): Promise<EpicSyncResponse> {
    return this.request<EpicSyncResponse>(
      'POST',
      '/api/v1/epic/sync',
      epicData
    );
  }

  /**
   * Sync a charter to the graph database
   * Creates ProjectCharter node with project relationships
   */
  async syncCharter(charterData: CharterSyncData): Promise<CharterSyncResponse> {
    return this.request<CharterSyncResponse>(
      'POST',
      '/api/v1/charter/sync',
      charterData
    );
  }

  /**
   * Sync a sprint to the graph database
   * Creates Sprint and Task nodes with relationships
   */
  async syncSprint(graphId: string, sprintContent: string): Promise<SprintSyncResponse> {
    return this.request<SprintSyncResponse>(
      'POST',
      '/api/v1/sprint/sync',
      { graphId, sprintContent }
    );
  }

  /**
   * Send agent heartbeat to dashboard (EPIC-004)
   * Updates last_heartbeat timestamp for agent liveness tracking
   *
   * @param agentId - Agent ID to send heartbeat for
   * @returns Heartbeat confirmation with updated timestamp
   */
  async sendAgentHeartbeat(agentId: string): Promise<{
    success: boolean;
    agentId: string;
    lastHeartbeat: string;
    status: string;
  }> {
    return this.request<{
      success: boolean;
      agentId: string;
      lastHeartbeat: string;
      status: string;
    }>(
      'POST',
      `/api/v1/agent/${agentId}/heartbeat`
    );
  }

  /**
   * Get active sprint from graph (EPIC-005)
   * Graph is primary source of truth for collaborative environments
   *
   * @param graphId - Graph namespace identifier
   * @returns Active sprint with tasks and statistics
   */
  async getActiveSprint(graphId: string, preferredSprintId?: string): Promise<ActiveSprintResponse> {
    let url = `/api/v1/sprint/active?graphId=${encodeURIComponent(graphId)}`;
    if (preferredSprintId) {
      url += `&sprintId=${encodeURIComponent(preferredSprintId)}`;
    }
    return this.request<ActiveSprintResponse>('GET', url);
  }

  /**
   * Sync tasks to graph (EPIC-015 Sprint 0a)
   * Creates or updates Task nodes with BELONGS_TO relationships
   *
   * Key principle (ADR-060): Content from Git, State from Graph.
   * - On CREATE: Uses initial_status from markdown
   * - On UPDATE: Preserves existing status (graph-authoritative)
   *
   * @param graphId - Graph namespace identifier
   * @param tasks - Array of parsed tasks
   * @param createRelationships - Whether to create BELONGS_TO relationships
   * @returns Sync response with counts
   */
  async syncTasks(
    graphId: string,
    tasks: TaskSyncInput[],
    createRelationships: boolean = true
  ): Promise<TaskSyncResponse> {
    return this.request<TaskSyncResponse>(
      'POST',
      '/api/v1/task/sync',
      { graphId, tasks, createRelationships }
    );
  }

  /**
   * Get tasks from graph (EPIC-015 Sprint 0a)
   *
   * @param graphId - Graph namespace identifier
   * @param filters - Optional filters (sprintId, epicId)
   * @returns Array of task objects
   */
  async getTasks(
    graphId: string,
    filters?: { sprintId?: string; epicId?: string }
  ): Promise<TaskFromGraph[]> {
    let url = `/api/v1/task/sync?graphId=${encodeURIComponent(graphId)}`;
    if (filters?.sprintId) {
      url += `&sprintId=${encodeURIComponent(filters.sprintId)}`;
    }
    if (filters?.epicId) {
      url += `&epicId=${encodeURIComponent(filters.epicId)}`;
    }

    const response = await this.request<{ tasks: TaskFromGraph[]; count: number }>(
      'GET',
      url
    );
    return response.tasks || [];
  }

  // =============================================================================
  // EPIC-015 Sprint 1: Status Update Methods
  // =============================================================================

  /**
   * Update task status in graph (EPIC-015 Sprint 1)
   * Updates status directly in Neo4j, emits status change event
   *
   * @param graphId - Graph namespace identifier
   * @param taskId - Task ID to update
   * @param status - New status value
   * @param reason - Required for 'blocked' status
   * @returns Updated task info with previous status
   */
  async updateTaskStatus(
    graphId: string,
    taskId: string,
    status: TaskStatus,
    reason?: string
  ): Promise<TaskStatusResponse> {
    return this.request<TaskStatusResponse>(
      'PATCH',
      `/api/v1/task/${encodeURIComponent(taskId)}/status`,
      { graphId, status, reason }
    );
  }

  /**
   * Get task status from graph (EPIC-015 Sprint 1)
   *
   * @param graphId - Graph namespace identifier
   * @param taskId - Task ID to query
   * @returns Current task status
   */
  async getTaskStatus(
    graphId: string,
    taskId: string
  ): Promise<{ id: string; status: TaskStatus; blocked_reason?: string }> {
    return this.request<{ id: string; status: TaskStatus; blocked_reason?: string }>(
      'GET',
      `/api/v1/task/${encodeURIComponent(taskId)}/status?graphId=${encodeURIComponent(graphId)}`
    );
  }

  /**
   * Record user activity in graph (EPIC-016 Sprint 3)
   *
   * @param graphId - Graph namespace identifier
   * @param activityType - Type of activity being recorded
   * @returns Activity response with timestamp
   */
  async recordActivity(
    graphId: string,
    activityType: 'session_start' | 'task_start' | 'task_complete' | 'task_block' | 'event_logged'
  ): Promise<{ success: boolean; lastActivityAt: string }> {
    return this.request<{ success: boolean; lastActivityAt: string }>(
      'POST',
      '/api/v1/user/activity',
      { graphId, activityType }
    );
  }

  /**
   * Update sprint status in graph (EPIC-015 Sprint 1)
   *
   * @param graphId - Graph namespace identifier
   * @param sprintId - Sprint ID to update
   * @param status - New status value
   * @returns Updated sprint info with previous status
   */
  async updateSprintStatus(
    graphId: string,
    sprintId: string,
    status: SprintStatus
  ): Promise<SprintStatusResponse> {
    return this.request<SprintStatusResponse>(
      'PATCH',
      `/api/v1/sprint/${encodeURIComponent(sprintId)}/status`,
      { graphId, status }
    );
  }

  /**
   * Get sprint status from graph (EPIC-015 Sprint 1)
   *
   * @param graphId - Graph namespace identifier
   * @param sprintId - Sprint ID to query
   * @returns Current sprint status
   */
  async getSprintStatus(
    graphId: string,
    sprintId: string
  ): Promise<{ id: string; status: SprintStatus }> {
    return this.request<{ id: string; status: SprintStatus }>(
      'GET',
      `/api/v1/sprint/${encodeURIComponent(sprintId)}/status?graphId=${encodeURIComponent(graphId)}`
    );
  }

  /**
   * Update epic status in graph (EPIC-015 Sprint 1)
   *
   * @param graphId - Graph namespace identifier
   * @param epicId - Epic ID to update
   * @param status - New status value
   * @returns Updated epic info with previous status
   */
  async updateEpicStatus(
    graphId: string,
    epicId: string,
    status: EpicStatus
  ): Promise<EpicStatusResponse> {
    return this.request<EpicStatusResponse>(
      'PATCH',
      `/api/v1/epic/${encodeURIComponent(epicId)}/status`,
      { graphId, status }
    );
  }

  /**
   * Get epic status from graph (EPIC-015 Sprint 1)
   *
   * @param graphId - Graph namespace identifier
   * @param epicId - Epic ID to query
   * @returns Current epic status
   */
  async getEpicStatus(
    graphId: string,
    epicId: string
  ): Promise<{ id: string; status: EpicStatus }> {
    return this.request<{ id: string; status: EpicStatus }>(
      'GET',
      `/api/v1/epic/${encodeURIComponent(epicId)}/status?graphId=${encodeURIComponent(graphId)}`
    );
  }

  /**
   * Get all tasks in a sprint (for cascade completion checks)
   *
   * @param graphId - Graph namespace identifier
   * @param sprintId - Sprint ID to query
   * @returns Array of tasks with status
   */
  async getSprintTasks(
    graphId: string,
    sprintId: string
  ): Promise<Array<{ id: string; title: string; status: string }>> {
    const tasks = await this.getTasks(graphId, { sprintId });
    return tasks.map(t => ({ id: t.id, title: t.title, status: t.status }));
  }

  /**
   * Get all sprints in an epic (for cascade completion checks)
   *
   * @param graphId - Graph namespace identifier
   * @param epicId - Epic ID to query
   * @returns Array of sprints with status
   */
  async getEpicSprints(
    graphId: string,
    epicId: string
  ): Promise<Array<{ id: string; name: string; status: string }>> {
    // Query sprints that belong to this epic
    const response = await this.request<{ sprints: Array<{ id: string; name: string; status: string }> }>(
      'GET',
      `/api/v1/sprint/by-epic?graphId=${encodeURIComponent(graphId)}&epicId=${encodeURIComponent(epicId)}`
    );
    return response.sprints || [];
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
 * Sync an epic to the graph database
 */
export interface EpicSyncData {
  graphId: string;
  id: string;
  title: string;
  goal: string;
  vision: string;
  status: string;
  progress: number;
  successCriteria: string[];
  inScope: string[];
  outOfScope: string[];
}

/**
 * Charter sync data for graph database
 */
export interface CharterSyncData {
  graphId: string;
  id: string;
  projectId: string;
  status: string;
  workMode: string;
  version: string;
  purpose: string;
  users: string[];
  successCriteria: string[];
  inScope: string[];
  outOfScope: string[];
  tbd: string[];
  constraints?: string;
  timeline?: string;
  team?: string[];
  confidence: number;
}

export interface CharterSyncResponse {
  success: boolean;
  charter: {
    id: string;
    projectId: string;
    status: string;
  };
  nodesCreated: number;
  relationshipsCreated: number;
}

export interface EpicSyncResponse {
  success: boolean;
  epic: {
    id: string;
    title: string;
    status: string;
  };
  nodesCreated: number;
  relationshipsCreated: number;
}

/**
 * Epic ID conflict check response (ADR-058)
 */
export interface EpicConflictCheckResponse {
  exists: boolean;
  createdBy?: string;
  createdAt?: string;
  title?: string;
  suggestedId?: string;
}

/**
 * Epic ID conflict info for client-side handling
 */
export interface EpicConflictCheck {
  exists: boolean;
  createdBy: string;
  createdAt?: string;
  title?: string;
  suggestedId?: string;
}

export interface SprintSyncResponse {
  success: boolean;
  sprint: {
    id: string;
    name: string;
    progress: number;
  };
  nodes: number;
  relationships: number;
  nextTask?: string;
}

/**
 * Active sprint response from graph API
 * Returns current sprint with tasks and statistics
 */
export interface ActiveSprintResponse {
  sprint: {
    id: string;
    name: string;
    goal: string;
    startDate?: string;
    endDate?: string;
    progress: number;
    createdAt?: string;
    updatedAt?: string;
  };
  tasks: Array<{
    id: string;
    title: string;
    status: string;
    effort?: string;
    priority?: string;
    files?: string[];
    relatedADRs?: string[];
    owner?: string;
  }>;
  nextTask: {
    id: string;
    title: string;
    status: string;
    priority?: string;
    files?: string[];
    relatedADRs?: string[];
  } | null;
  stats: {
    totalTasks: number;
    completedTasks: number;
    inProgressTasks: number;
    notStartedTasks: number;
    progressPercentage: number;
  };
  meta?: {
    executionTime: number;
    timestamp: string;
  };
}

/**
 * Task sync input for API (EPIC-015 Sprint 0a)
 */
export interface TaskSyncInput {
  id: string;
  sprint_id: string;
  epic_id: string;
  title: string;
  estimate: string | null;
  priority: 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW';
  assignee: string | null;
  initial_status: 'not_started' | 'in_progress' | 'blocked' | 'complete' | 'paused';
  goal: string | null;
  acceptance_criteria: string[];
  files: string[];
  related_adrs: string[];
}

/**
 * Task sync response (EPIC-015 Sprint 0a)
 */
export interface TaskSyncResponse {
  success: boolean;
  created: number;
  updated: number;
  relationships: number;
  tasks: string[];
}

/**
 * Task retrieved from graph (EPIC-015 Sprint 0a)
 */
export interface TaskFromGraph {
  id: string;
  title: string;
  status: string;
  priority: string;
  sprint_id: string;
  epic_id: string;
  estimate: string | null;
  assignee: string | null;
  goal: string | null;
  synced_at: string | null;
}

// =============================================================================
// EPIC-015 Sprint 1: Status Update Types
// =============================================================================

/**
 * Task status values (graph-authoritative)
 */
export type TaskStatus = 'not_started' | 'in_progress' | 'blocked' | 'complete';

/**
 * Sprint status values
 */
export type SprintStatus = 'planned' | 'active' | 'paused' | 'complete';

/**
 * Epic status values
 */
export type EpicStatus = 'proposed' | 'active' | 'paused' | 'complete';

/**
 * Task status update response
 */
export interface TaskStatusResponse {
  success: boolean;
  task: {
    id: string;
    title?: string;
    status: TaskStatus;
    status_updated_at: string;
    status_updated_by: string;
    blocked_reason?: string;
  };
  previous_status: string;
}

/**
 * Sprint status update response
 */
export interface SprintStatusResponse {
  success: boolean;
  sprint: {
    id: string;
    name?: string;
    status: SprintStatus;
    status_updated_at: string;
    status_updated_by: string;
  };
  previous_status: string;
}

/**
 * Epic status update response
 */
export interface EpicStatusResponse {
  success: boolean;
  epic: {
    id: string;
    title?: string;
    status: EpicStatus;
    status_updated_at: string;
    status_updated_by: string;
  };
  previous_status: string;
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

/**
 * Helper function to send agent heartbeat to dashboard
 * Used by agent-heartbeat for liveness tracking (EPIC-004)
 */
export async function sendAgentHeartbeat(agentId: string): Promise<void> {
  if (!isAuthenticated()) {
    throw new Error('Not authenticated. Run `ginko graph init` first.');
  }

  const client = new GraphApiClient();
  await client.sendAgentHeartbeat(agentId);
}
