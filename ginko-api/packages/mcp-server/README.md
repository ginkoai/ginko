# Ginko MCP Server

Dedicated MCP (Model Context Protocol) server for Ginko context management.

## Endpoints

- `GET /api/mcp/health` - Health check
- `GET /api/mcp/tools/list` - List available tools
- `POST /api/mcp/tools/call` - Call MCP tools
- `GET /api/mcp/best-practices` - Get best practices
- `GET /api/mcp/sessions/{id}` - Get session data

## Deployment

This project is deployed to Vercel and serves as the backend for Ginko's MCP integration.

- **Domain**: `mcp.ginko.ai`
- **Auto-Deploy**: Connected to GitHub main branch
- **Status**: ✅ Production Ready