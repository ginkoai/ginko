#!/usr/bin/env node
import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { CallToolRequestSchema, ListToolsRequestSchema, } from '@modelcontextprotocol/sdk/types.js';
// Remote MCP Client that proxies to the SaaS service
class RemoteMCPClient {
    server;
    apiUrl;
    apiKey;
    teamId;
    projectId;
    constructor() {
        // Get configuration from environment
        this.apiUrl = process.env.GINKO_MCP_SERVER_URL || '';
        this.apiKey = process.env.GINKO_API_KEY || '';
        if (!this.apiUrl) {
            throw new Error('GINKO_MCP_SERVER_URL environment variable is required');
        }
        if (!this.apiKey) {
            throw new Error('GINKO_API_KEY environment variable is required');
        }
        this.teamId = process.env.GINKO_TEAM_ID || 'auto';
        this.projectId = process.env.GINKO_PROJECT_ID || 'auto';
        console.error(`[Remote MCP] Connecting to ${this.apiUrl}`);
        console.error(`[Remote MCP] Team: ${this.teamId}, Project: ${this.projectId}`);
        this.server = new Server({
            name: 'ginko-mcp',
            version: '0.2.0',
        }, {
            capabilities: {
                tools: {},
            },
        });
        this.setupToolHandlers();
    }
    setupToolHandlers() {
        this.server.setRequestHandler(ListToolsRequestSchema, async () => {
            console.error('[Remote MCP] Fetching available tools from remote server');
            try {
                const response = await fetch(`${this.apiUrl}/mcp/tools/list`, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'Authorization': `Bearer ${this.apiKey}`,
                    },
                });
                if (!response.ok) {
                    throw new Error(`HTTP ${response.status}: ${response.statusText}`);
                }
                const data = await response.json();
                console.error(`[Remote MCP] Retrieved ${data.tools.length} tools`);
                return { tools: data.tools };
            }
            catch (error) {
                console.error('[Remote MCP] Failed to fetch tools:', error);
                // Fallback to basic tools if remote server is unavailable
                return {
                    tools: [
                        {
                            name: 'get_project_overview',
                            description: 'Get project overview (remote server unavailable)',
                            inputSchema: { type: 'object', properties: {} }
                        }
                    ]
                };
            }
        });
        this.server.setRequestHandler(CallToolRequestSchema, async (request) => {
            const { name, arguments: args } = request.params;
            const startTime = Date.now();
            console.error(`[Remote MCP] Calling remote tool: ${name}`);
            try {
                // Add team and project context to all tool calls
                const enhancedArgs = {
                    ...args,
                    teamId: this.teamId,
                    projectId: this.projectId,
                };
                const response = await fetch(`${this.apiUrl}/mcp/tools/call`, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'Authorization': `Bearer ${this.apiKey}`,
                    },
                    body: JSON.stringify({
                        name,
                        arguments: enhancedArgs,
                    }),
                });
                if (!response.ok) {
                    throw new Error(`HTTP ${response.status}: ${response.statusText}`);
                }
                const data = await response.json();
                const duration = Date.now() - startTime;
                console.error(`[Remote MCP] Tool ${name} completed in ${duration}ms`);
                // Add remote context indicator
                if (data.result?.content?.[0]?.text) {
                    data.result.content[0].text = `🌐 **Remote Context** (Team: ${this.teamId})\n\n${data.result.content[0].text}`;
                }
                return data.result;
            }
            catch (error) {
                const duration = Date.now() - startTime;
                const errorMessage = error instanceof Error ? error.message : String(error);
                console.error(`[Remote MCP] Tool ${name} failed after ${duration}ms:`, errorMessage);
                return {
                    content: [
                        {
                            type: 'text',
                            text: `❌ Remote ContextMCP Error: ${errorMessage}\n\nPlease check:\n1. Remote server is running at ${this.apiUrl}\n2. API key is valid\n3. Network connectivity`,
                        },
                    ],
                };
            }
        });
    }
    async run() {
        const transport = new StdioServerTransport();
        await this.server.connect(transport);
        console.error('[Remote MCP] Client connected to stdio, proxying to remote server');
    }
}
const client = new RemoteMCPClient();
client.run().catch(console.error);
//# sourceMappingURL=remote-client.js.map