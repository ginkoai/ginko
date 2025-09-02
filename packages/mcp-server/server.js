#!/usr/bin/env node
/**
 * Ginko MCP Server for Cursor
 * Provides context management via Model Context Protocol
 */

const { Server } = require('@modelcontextprotocol/sdk/server/index.js');
const { StdioServerTransport } = require('@modelcontextprotocol/sdk/server/stdio.js');
const { exec } = require('child_process');
const { promisify } = require('util');
const fs = require('fs').promises;
const path = require('path');

const execAsync = promisify(exec);

// Create MCP server
const server = new Server(
  {
    name: 'ginko-mcp',
    version: '1.0.0',
  },
  {
    capabilities: {
      tools: {},
    },
  }
);

// Register tools
server.setRequestHandler('tools/list', async () => ({
  tools: [
    {
      name: 'ginko_start',
      description: 'Start a new ginko session',
      inputSchema: {
        type: 'object',
        properties: {},
      },
    },
    {
      name: 'ginko_handoff',
      description: 'Create a session handoff',
      inputSchema: {
        type: 'object',
        properties: {
          message: {
            type: 'string',
            description: 'Handoff message',
          },
        },
      },
    },
    {
      name: 'ginko_vibecheck',
      description: 'Quick realignment check',
      inputSchema: {
        type: 'object',
        properties: {},
      },
    },
    {
      name: 'ginko_context',
      description: 'Load context modules',
      inputSchema: {
        type: 'object',
        properties: {},
      },
    },
  ],
}));

// Handle tool calls
server.setRequestHandler('tools/call', async (request) => {
  const { name, arguments: args } = request.params;

  try {
    switch (name) {
      case 'ginko_start': {
        const output = await execAsync('ginko start');
        return {
          content: [
            {
              type: 'text',
              text: `🌿 Session started!\n${output}`,
            },
          ],
        };
      }

      case 'ginko_handoff': {
        const message = args.message || 'Session progress';
        const output = await execAsync(`ginko handoff "${message}"`);
        return {
          content: [
            {
              type: 'text',
              text: `✅ Handoff saved: ${message}\n${output}`,
            },
          ],
        };
      }

      case 'ginko_vibecheck': {
        return {
          content: [
            {
              type: 'text',
              text: `🎯 Vibecheck\n\n1. What are we trying to achieve?\n2. Is this the right approach?\n3. Should we pivot?\n\nRun 'ginko handoff' to save any pivot decision.`,
            },
          ],
        };
      }

      case 'ginko_context': {
        const modulesDir = path.join(process.cwd(), '.ginko', 'context', 'modules');
        try {
          const files = await fs.readdir(modulesDir);
          const modules = files.filter(f => f.endsWith('.md'));
          
          return {
            content: [
              {
                type: 'text',
                text: `📚 Context Modules:\n${modules.map(m => `- ${m}`).join('\n')}`,
              },
            ],
          };
        } catch (error) {
          return {
            content: [
              {
                type: 'text',
                text: 'No context modules found. Run ginko init first.',
              },
            ],
          };
        }
      }

      default:
        return {
          content: [
            {
              type: 'text',
              text: `Unknown tool: ${name}`,
            },
          ],
        };
    }
  } catch (error) {
    return {
      content: [
        {
          type: 'text',
          text: `Error: ${error.message}`,
        },
      ],
    };
  }
});

// Start server
const transport = new StdioServerTransport();
server.connect(transport);

console.error('Ginko MCP Server started');