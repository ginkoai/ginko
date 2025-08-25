/**
 * @fileType: client
 * @status: current
 * @updated: 2025-01-31
 * @tags: [mcp, client, http, sessions, handoff, api]
 * @related: [config.ts, logger.ts, index.ts]
 * @priority: critical
 * @complexity: medium
 * @dependencies: [axios]
 */

import axios, { AxiosInstance } from 'axios';
import { Config } from './config.js';
import { Logger } from './logger.js';

export interface PrepareHandoffOptions {
  // No additional options needed for new handoff system
}

export class GinkoClient {
  private httpClient: AxiosInstance;
  private config: Config;

  constructor(config: Config) {
    this.config = config;
    
    this.httpClient = axios.create({
      baseURL: config.serverUrl,
      timeout: 30000, // 30 seconds
      headers: {
        'Content-Type': 'application/json',
        'Authorization': config.apiKey ? `Bearer ${config.apiKey}` : undefined,
        'User-Agent': 'Ginko-Client/0.1.0'
      }
    });

    // Add request/response interceptors for logging
    this.httpClient.interceptors.request.use((config) => {
      Logger.debug(`🌐 Making request to ${config.method?.toUpperCase()} ${config.url}`);
      return config;
    });

    this.httpClient.interceptors.response.use(
      (response) => {
        Logger.debug(`✅ Response ${response.status} from ${response.config.url}`);
        return response;
      },
      (error) => {
        const status = error.response?.status || 'unknown';
        const url = error.config?.url || 'unknown';
        Logger.error(`❌ Request failed ${status} from ${url}`, { error: error.message });
        return Promise.reject(error);
      }
    );
  }

  /**
   * Fetch available tools from the server
   */
  async listTools() {
    try {
      Logger.debug('📋 Fetching tools from server');
      
      const response = await this.httpClient.post('/api/tools/list', {});

      if (response.data.error) {
        throw new Error(response.data.error);
      }

      Logger.debug(`📋 Retrieved ${response.data.tools?.length || 0} tools from server`);
      return response.data.tools || [];
    } catch (error) {
      Logger.error('❌ Failed to fetch tools from server', { error });
      throw this.handleError(error, 'list tools');
    }
  }

  /**
   * Call any tool on the server
   */
  async callTool(name: string, args: any = {}) {
    try {
      Logger.debug(`🛠️  Calling server tool: ${name}`);
      
      const response = await this.httpClient.post('/api/tools/call', {
        name,
        arguments: {
          ...args,
          userId: this.config.userId,
          teamId: this.config.teamId,
          projectId: this.config.projectId,
        }
      });

      if (response.data.error) {
        throw new Error(response.data.error);
      }

      Logger.debug(`✅ Server tool ${name} completed successfully`);
      return response.data.result;
    } catch (error) {
      Logger.error(`❌ Server tool ${name} failed`, { error });
      throw this.handleError(error, `call tool ${name}`);
    }
  }

  /**
   * Prepare handoff for next Claude session
   */
  async prepareHandoff(currentTask: string, options: PrepareHandoffOptions = {}) {
    try {
      Logger.info(`📝 Preparing handoff for task: "${currentTask}"`);
      
      const response = await this.httpClient.post('/api/tools/call', {
        name: 'prepare_handoff',
        arguments: {
          currentTask,
          userId: this.config.userId,
          teamId: this.config.teamId,
          projectId: this.config.projectId
        }
      });

      if (response.data.error) {
        throw new Error(response.data.error);
      }

      Logger.info('📝 Handoff prepared successfully');
      return response.data.result;
    } catch (error) {
      Logger.error('❌ Failed to prepare handoff', { error });
      throw this.handleError(error, 'prepare handoff');
    }
  }

  /**
   * Store handoff content created by Claude
   */
  async storeHandoff(handoffContent: string) {
    try {
      Logger.info('💾 Storing handoff content');
      
      const response = await this.httpClient.post('/api/tools/call', {
        name: 'store_handoff',
        arguments: {
          handoffContent,
          userId: this.config.userId,
          teamId: this.config.teamId,
          projectId: this.config.projectId
        }
      });

      if (response.data.error) {
        throw new Error(response.data.error);
      }

      Logger.info('💾 Handoff stored successfully');
      return response.data.result;
    } catch (error) {
      Logger.error('❌ Failed to store handoff', { error });
      throw this.handleError(error, 'store handoff');
    }
  }

  /**
   * Load handoff content from previous session
   * If sessionId is not provided, loads the most recent handoff
   */
  async loadHandoff(sessionId?: string) {
    try {
      Logger.info(`📂 Loading handoff: ${sessionId || 'most recent'}`);
      
      const response = await this.httpClient.post('/api/tools/call', {
        name: 'load_handoff',
        arguments: {
          sessionId,
          userId: this.config.userId,
          teamId: this.config.teamId,
          projectId: this.config.projectId
        }
      });

      if (response.data.error) {
        throw new Error(response.data.error);
      }

      Logger.info('📂 Handoff loaded successfully');
      return response.data.result;
    } catch (error) {
      Logger.error('❌ Failed to load handoff', { error });
      throw this.handleError(error, 'load handoff');
    }
  }


  /**
   * Get session analytics dashboard metrics
   */
  async getDashboardMetrics(days: number = 7, userId?: string) {
    try {
      Logger.info(`📊 Getting dashboard metrics (${days} days)`);
      
      const response = await this.httpClient.post('/api/tools/call', {
        name: 'get_dashboard_metrics',
        arguments: {
          days,
          userId: userId || this.config.userId,
          teamId: this.config.teamId,
          projectId: this.config.projectId
        }
      });

      if (response.data.error) {
        throw new Error(response.data.error);
      }

      Logger.info('📊 Dashboard metrics retrieved successfully');
      return response.data.result;
    } catch (error) {
      Logger.error('❌ Failed to get dashboard metrics', { error });
      throw this.handleError(error, 'get dashboard metrics');
    }
  }

  /**
   * Test connection to remote server
   */
  async testConnection(): Promise<boolean> {
    try {
      Logger.info('🔍 Testing connection to Ginko MCP server');
      
      const response = await this.httpClient.get('/api/health');
      
      if (response.status === 200) {
        Logger.info('✅ Connection test successful');
        return true;
      } else {
        Logger.warn(`⚠️ Unexpected response status: ${response.status}`);
        return false;
      }
    } catch (error) {
      Logger.error('❌ Connection test failed', { error });
      return false;
    }
  }

  private handleError(error: any, operation: string): Error {
    if (axios.isAxiosError(error)) {
      if (error.response) {
        // Server responded with error status
        const status = error.response.status;
        const message = error.response.data?.error || error.response.statusText;
        
        if (status === 401) {
          return new Error(`Authentication failed. Please check your API key configuration.`);
        } else if (status === 404) {
          return new Error(`Ginko MCP server not found. Please check your server URL configuration.`);
        } else if (status >= 500) {
          return new Error(`Server error (${status}): ${message}. Please try again later.`);
        } else {
          return new Error(`Failed to ${operation}: ${message} (${status})`);
        }
      } else if (error.request) {
        // Request was made but no response received
        return new Error(`Unable to connect to Ginko MCP server. Please check your network connection and server URL.`);
      }
    }
    
    // Generic error fallback
    const message = error instanceof Error ? error.message : String(error);
    return new Error(`Failed to ${operation}: ${message}`);
  }
}