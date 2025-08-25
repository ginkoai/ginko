#!/usr/bin/env node

/**
 * @fileType: server
 * @status: current
 * @updated: 2025-01-31
 * @tags: [mcp, client, server, stdio, tools, entry-point]
 * @related: [client.ts, config.ts, logger.ts]
 * @priority: critical
 * @complexity: medium
 * @dependencies: [@modelcontextprotocol/sdk]
 */

import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
} from '@modelcontextprotocol/sdk/types.js';
import { GinkoClient } from './client.js';
import { Logger } from './logger.js';
import { Config } from './config.js';

class GinkoMCPServer {
  private server: Server;
  private client: GinkoClient;
  private config: Config;
  private startupContext: any = null;

  constructor() {
    Logger.info('🚀 Initializing Ginko MCP Client');
    
    this.config = new Config();
    this.client = new GinkoClient(this.config);
    
    this.server = new Server(
      {
        name: 'ginko-mcp-client',
        version: '0.6.0',
      },
      {
        capabilities: {
          tools: {},
        },
      }
    );

    this.setupToolHandlers();
    Logger.info('✅ Client initialization complete');
  }

  private async setupToolHandlers() {
    Logger.info('🔧 Setting up tool handlers');
    
    this.server.setRequestHandler(ListToolsRequestSchema, async () => {
      Logger.debug('📋 Handling ListTools request - fetching from server');
      try {
        // Fetch tools dynamically from the Ginko server
        const tools = await this.client.listTools();
        Logger.debug(`📋 Retrieved ${tools.length} tools from Ginko server`);
        return { tools };
      } catch (error) {
        Logger.error('❌ Failed to fetch tools from server, using fallback', { error });
        // Fallback to basic tools if server is unreachable
        return {
          tools: [
            {
              name: 'prepare_handoff',
              description: 'Prepare session handoff for seamless context transition to next Claude',
              inputSchema: {
                type: 'object',
                properties: {
                  currentTask: {
                    type: 'string',
                    description: 'Brief description of what you are currently working on'
                  }
                },
                required: ['currentTask']
              }
            },
            {
              name: 'handoff',
              description: 'Shortcut for prepare_handoff - Prepare session handoff',
              inputSchema: {
                type: 'object',
                properties: {
                  currentTask: {
                    type: 'string',
                    description: 'Brief description of what you are currently working on'
                  }
                },
                required: ['currentTask']
              }
            },
            {
              name: 'store_handoff',
              description: 'Store handoff content created by Claude',
              inputSchema: {
                type: 'object',
                properties: {
                  handoffContent: {
                    type: 'string',
                    description: 'The handoff content created by Claude'
                  }
                },
                required: ['handoffContent']
              }
            },
            {
              name: 'load_handoff',
              description: 'Load handoff content from previous session (auto-loads most recent if no sessionId provided)',
              inputSchema: {
                type: 'object',
                properties: {
                  sessionId: {
                    type: 'string',
                    description: 'Optional: Session ID to load specific handoff. If omitted, loads most recent handoff.'
                  }
                }
              }
            },
            {
              name: 'capture',
              description: 'Capture session progress for seamless handoff between sessions',
              inputSchema: {
                type: 'object',
                properties: {
                  filledTemplate: {
                    type: 'string',
                    description: 'Optional: Filled progress template to save. If not provided, returns empty template to fill.'
                  }
                }
              }
            }
          ],
        };
      }
    });

    this.server.setRequestHandler(CallToolRequestSchema, async (request) => {
      const { name, arguments: args } = request.params;
      const startTime = Date.now();
      
      Logger.info(`🛠️  Calling tool: ${name}`, { args });

      try {
        // Use generic callTool method to forward all tool calls to the server
        const result = await this.client.callTool(name, args);

        // If this is the first tool call and we have startup context, prepend it
        if (this.startupContext && result.content) {
          Logger.info('📋 Including startup context in first tool response');
          const contextContent = this.startupContext.content || [];
          const combinedContent = [...contextContent, ...result.content];
          this.startupContext = null; // Clear after first use
          
          const duration = Date.now() - startTime;
          Logger.info(`✅ Tool ${name} completed successfully in ${duration}ms (with startup context)`);
          return { ...result, content: combinedContent };
        }

        const duration = Date.now() - startTime;
        Logger.info(`✅ Tool ${name} completed successfully in ${duration}ms`);
        return result;
        
      } catch (error) {
        const duration = Date.now() - startTime;
        const errorMessage = error instanceof Error ? error.message : String(error);
        Logger.error(`❌ Tool ${name} failed after ${duration}ms`, { error: errorMessage });
        
        return {
          content: [
            {
              type: 'text',
              text: `Error: ${errorMessage}`,
            },
          ],
        };
      }
    });
  }

  async run() {
    Logger.info('🔌 Setting up stdio transport');
    const transport = new StdioServerTransport();
    
    Logger.info('🌐 Connecting to transport...');
    await this.server.connect(transport);
    
    Logger.info('🎯 Ginko MCP Client running on stdio - Ready for connections!');
    
    // Auto-load context on startup
    setTimeout(async () => {
      try {
        Logger.info('🚀 Auto-loading project context...');
        const contextResult = await this.client.callTool('context', { autoResume: true });
        Logger.info('✅ Project context auto-loaded successfully');
        
        // Send the context result as a notification to Claude
        // Since MCP doesn't support push notifications, we'll store it for the first tool call
        this.startupContext = contextResult;
      } catch (error) {
        Logger.warn('⚠️ Failed to auto-load context, will be available on first tool call', { error });
      }
    }, 100); // Small delay to ensure connection is established
    
    Logger.info('📡 Waiting for client requests...');
  }
}

const server = new GinkoMCPServer();
server.run().catch(console.error);