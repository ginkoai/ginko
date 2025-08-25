#!/usr/bin/env node
import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { CallToolRequestSchema, ListToolsRequestSchema, } from '@modelcontextprotocol/sdk/types.js';
import { execSync } from 'child_process';
// Simplified remote client that just proxies to HTTP API
class SimpleRemoteMCPClient {
    server;
    apiUrl;
    apiKey;
    constructor() {
        // Clean up any existing MCP client processes to prevent conflicts
        this.cleanupExistingProcesses();
        this.apiUrl = process.env.GINKO_MCP_SERVER_URL || '';
        this.apiKey = process.env.GINKO_API_KEY;
        if (!this.apiUrl) {
            throw new Error('GINKO_MCP_SERVER_URL environment variable is required');
        }
        if (this.apiKey) {
            console.error(`[${new Date().toISOString()}] [AUTH] Using API key: ${this.apiKey.substring(0, 8)}...`);
        }
        else {
            console.error(`[${new Date().toISOString()}] [AUTH] No API key configured (development mode)`);
        }
        this.server = new Server({
            name: 'ginko-mcp',
            version: '0.2.0',
        }, {
            capabilities: {
                tools: {},
            },
        });
        this.setupHandlers();
    }
    cleanupExistingProcesses() {
        try {
            // Find all simple-remote-client processes (excluding this one)
            const processes = execSync('ps aux | grep simple-remote-client | grep -v grep', { encoding: 'utf8' });
            if (processes.trim()) {
                console.error(`[${new Date().toISOString()}] [CLEANUP] Found existing MCP client processes:`);
                console.error(processes);
                // Extract PIDs and filter out the current process
                const currentPid = process.pid.toString();
                const lines = processes.trim().split('\n');
                const pids = lines.map(line => {
                    const parts = line.trim().split(/\s+/);
                    return parts[1]; // PID is second column
                }).filter(pid => pid && !isNaN(parseInt(pid)) && pid !== currentPid);
                if (pids.length > 0) {
                    console.error(`[${new Date().toISOString()}] [CLEANUP] Killing PIDs: ${pids.join(', ')} (excluding current: ${currentPid})`);
                    execSync(`kill ${pids.join(' ')}`, { encoding: 'utf8' });
                    // Wait a moment for processes to terminate
                    execSync('sleep 0.5');
                    console.error(`[${new Date().toISOString()}] [CLEANUP] Process cleanup completed`);
                }
                else {
                    console.error(`[${new Date().toISOString()}] [CLEANUP] No other processes to clean up (current PID: ${currentPid})`);
                }
            }
        }
        catch (error) {
            // Ignore cleanup errors - they're not critical
            console.error(`[${new Date().toISOString()}] [CLEANUP] Non-critical cleanup error:`, error instanceof Error ? error.message : String(error));
        }
    }
    setupHandlers() {
        this.server.setRequestHandler(ListToolsRequestSchema, async () => {
            try {
                const headers = { 'Content-Type': 'application/json' };
                if (this.apiKey) {
                    headers['Authorization'] = `Bearer ${this.apiKey}`;
                }
                const response = await fetch(`${this.apiUrl}/api/mcp/tools/list`, {
                    method: 'POST',
                    headers,
                    signal: AbortSignal.timeout(10000) // 10 second timeout
                });
                if (!response.ok) {
                    throw new Error(`HTTP ${response.status}`);
                }
                const data = await response.json();
                return { tools: data.tools };
            }
            catch (error) {
                // Log error to stderr for debugging
                console.error(`[${new Date().toISOString()}] [REMOTE CLIENT] Failed to connect to server:`, error instanceof Error ? error.message : String(error));
                // Fallback if remote server is down
                return {
                    tools: [
                        {
                            name: 'get_project_overview',
                            description: 'Get project overview (remote server offline)',
                            inputSchema: { type: 'object', properties: {} }
                        }
                    ]
                };
            }
        });
        this.server.setRequestHandler(CallToolRequestSchema, async (request) => {
            const { name, arguments: args } = request.params;
            const timestamp = new Date().toISOString();
            console.error(`[${timestamp}] [REMOTE CLIENT] Tool call received: ${name}`);
            console.error(`[${timestamp}] [REMOTE CLIENT] Arguments:`, JSON.stringify(args, null, 2));
            try {
                // Add default team/project IDs
                const enhancedArgs = {
                    ...args,
                    teamId: process.env.GINKO_TEAM_ID || 'auto',
                    projectId: process.env.GINKO_PROJECT_ID || 'auto',
                };
                const headers = { 'Content-Type': 'application/json' };
                if (this.apiKey) {
                    headers['Authorization'] = `Bearer ${this.apiKey}`;
                }
                const response = await fetch(`${this.apiUrl}/api/mcp/tools/call`, {
                    method: 'POST',
                    headers,
                    body: JSON.stringify({
                        name,
                        arguments: enhancedArgs,
                    }),
                    signal: AbortSignal.timeout(30000) // 30 second timeout for tool calls
                });
                if (!response.ok) {
                    throw new Error(`HTTP ${response.status}: ${response.statusText}`);
                }
                const data = await response.json();
                // Add remote indicator
                if (data.result?.content?.[0]?.text) {
                    data.result.content[0].text = `🌐 **Remote Team Context**\n\n${data.result.content[0].text}`;
                }
                return data.result;
            }
            catch (error) {
                return {
                    content: [
                        {
                            type: 'text',
                            text: `❌ Remote Ginko Error: ${error instanceof Error ? error.message : String(error)}`,
                        },
                    ],
                };
            }
        });
    }
    async run() {
        const transport = new StdioServerTransport();
        await this.server.connect(transport);
    }
}
const client = new SimpleRemoteMCPClient();
client.run().catch(console.error);
//# sourceMappingURL=simple-remote-client.js.map