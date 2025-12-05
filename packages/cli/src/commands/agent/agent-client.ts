/**
 * @fileType: utility
 * @status: current
 * @updated: 2025-12-05
 * @tags: [agent, api, client, epic-004, multi-agent]
 * @related: [register.ts, list.ts, status.ts]
 * @priority: high
 * @complexity: medium
 * @dependencies: [auth-storage]
 */

/**
 * Agent API Client (EPIC-004 Sprint 1 TASK-6)
 *
 * Client for interacting with agent management API endpoints
 */

import { getAccessToken, isAuthenticated } from '../../utils/auth-storage.js';

interface RegisterAgentRequest {
  name: string;
  capabilities: string[];
  status?: 'active' | 'idle' | 'busy' | 'offline';
  metadata?: Record<string, any>;
}

interface RegisterAgentResponse {
  agentId: string;
  name: string;
  capabilities: string[];
  status: string;
  organizationId: string;
  createdAt: string;
}

interface ListAgentsRequest {
  status?: string;
  capability?: string;
  limit?: number;
  offset?: number;
}

interface ListAgentsResponse {
  agents: Array<{
    id: string;
    name: string;
    capabilities: string[];
    status: string;
    organizationId: string;
    createdAt: string;
    updatedAt: string;
    metadata?: Record<string, any>;
  }>;
  total: number;
  limit: number;
  offset: number;
}

interface ApiError {
  error: {
    code: string;
    message: string;
    field?: string;
    details?: Record<string, unknown>;
  };
}

/**
 * Agent API client
 */
export class AgentClient {
  private static apiUrl: string = process.env.GINKO_API_URL || 'https://app.ginkoai.com';

  /**
   * Check if user is authenticated
   */
  private static async requireAuth(): Promise<string> {
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
  private static async request<T>(
    method: string,
    endpoint: string,
    body?: unknown
  ): Promise<T> {
    const token = await this.requireAuth();
    const url = `${this.apiUrl}${endpoint}`;
    const debugMode = process.env.GINKO_DEBUG_API === 'true';

    if (debugMode) {
      console.log(`\n[Agent API Debug] ${method} ${url}`);
      if (body) {
        console.log('[Agent API Debug] Request body:', JSON.stringify(body, null, 2));
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
        console.log(`[Agent API Debug] Response status: ${response.status} ${response.statusText}`);
      }

      if (!response.ok) {
        const errorData = await response.json() as ApiError;
        if (debugMode) {
          console.log('[Agent API Debug] Error response:', JSON.stringify(errorData, null, 2));
        }

        throw new Error(errorData.error.message || `API error: ${response.status}`);
      }

      const responseData = await response.json() as T;
      if (debugMode) {
        console.log('[Agent API Debug] Response data:', JSON.stringify(responseData, null, 2));
      }

      return responseData;
    } catch (error) {
      if (error instanceof Error) {
        throw new Error(`Failed to ${method} ${url}: ${error.message}`);
      }
      throw error;
    }
  }

  /**
   * Register a new agent
   */
  static async register(data: RegisterAgentRequest): Promise<RegisterAgentResponse> {
    return this.request<RegisterAgentResponse>('POST', '/api/v1/agent', data);
  }

  /**
   * List agents with optional filtering
   */
  static async list(params: ListAgentsRequest = {}): Promise<ListAgentsResponse> {
    const queryParams = new URLSearchParams();

    if (params.status) {
      queryParams.append('status', params.status);
    }

    if (params.capability) {
      queryParams.append('capability', params.capability);
    }

    if (params.limit !== undefined) {
      queryParams.append('limit', params.limit.toString());
    }

    if (params.offset !== undefined) {
      queryParams.append('offset', params.offset.toString());
    }

    const queryString = queryParams.toString();
    const endpoint = queryString ? `/api/v1/agent?${queryString}` : '/api/v1/agent';

    return this.request<ListAgentsResponse>('GET', endpoint);
  }
}
