# MCP Authentication Guide

## Overview
The Ginko MCP server requires API key authentication for all tool calls. This guide documents the authentication requirements and troubleshooting steps.

## Production Endpoints
- **Base URL**: `https://mcp.ginko.ai`
- **Health Check**: `GET /api/health` (no auth required)
- **Tools List**: `POST /api/tools/list` (auth required)
- **Tool Call**: `POST /api/tools/call` (auth required)

## Authentication Methods

### 1. API Key Authentication
Include the API key in one of these headers:
- `Authorization: Bearer <api_key>`
- `X-API-Key: <api_key>`

### 2. Test API Keys
For testing and development:
- **E2E Test Key**: `wmcp_sk_test_Ar0MN4BeW_Fro5mESi5PciTsOg6qlPcIr7k0vBL2mIk`
- **Alternative Format**: `cmcp_sk_test_Ar0MN4BeW_Fro5mESi5PciTsOg6qlPcIr7k0vBL2mIk`

These keys provide enterprise-level access for testing all features.

## API Call Format

### Tools List
```bash
curl -X POST https://mcp.ginko.ai/api/tools/list \
  -H "Content-Type: application/json" \
  -H "X-API-Key: <your_api_key>"
```

### Tool Call
```bash
curl -X POST https://mcp.ginko.ai/api/tools/call \
  -H "Content-Type: application/json" \
  -H "X-API-Key: <your_api_key>" \
  -d '{
    "name": "tool_name",
    "arguments": {
      "param1": "value1",
      "param2": "value2"
    }
  }'
```

## Common Errors

### Authentication Required (500)
**Error**: `{"error":"Authentication required"}`
**Solution**: Include a valid API key in the request headers

### Tool Name Required (400)
**Error**: `{"error":"Tool name is required"}`
**Solution**: Include `"name"` field in the request body

### Unknown Tool (500)
**Error**: `{"error":"Unknown tool: <tool_name>"}`
**Solution**: Use a valid tool name from the tools list

## Testing Script

Save this as `test-mcp.sh`:
```bash
#!/bin/bash

API_KEY="wmcp_sk_test_Ar0MN4BeW_Fro5mESi5PciTsOg6qlPcIr7k0vBL2mIk"
BASE_URL="https://mcp.ginko.ai"

# Health check (no auth)
echo "Health Check:"
curl -s "$BASE_URL/api/health" | jq .

# List available tools
echo -e "\nAvailable Tools:"
curl -s -X POST "$BASE_URL/api/tools/list" \
  -H "Content-Type: application/json" \
  -H "X-API-Key: $API_KEY" | jq '.tools[].name'

# Test context tool
echo -e "\nContext Tool Test:"
curl -s -X POST "$BASE_URL/api/tools/call" \
  -H "Content-Type: application/json" \
  -H "X-API-Key: $API_KEY" \
  -d '{"name": "context", "arguments": {"autoResume": false}}' | jq -r '.result.content[0].text' | head -20
```

## Available Tools (as of 2025-08-14)
1. `context` - Auto-load project context
2. `load_handoff` - Load previous session handoff
3. `prepare_handoff` - Prepare session handoff template
4. `handoff` - Enhanced handoff workflow
5. `store_handoff` - Store completed handoff
6. `assess_handoff_quality` - Score handoff quality
7. `retrospective_handoff_feedback` - End-of-session feedback
8. `score_collaboration_session` - AI-driven session scoring
9. `generate_coaching_insights` - Personalized coaching insights

## MCP Client Configuration

For Claude Code or other MCP clients, the authentication issue occurs because the client doesn't automatically include the API key. Current workaround is to use the direct API endpoints with curl or HTTP clients that support custom headers.

## Troubleshooting Steps

1. **Verify server health**: `curl https://mcp.ginko.ai/api/health`
2. **Test with E2E key**: Use the test key to isolate authentication issues
3. **Check request format**: Ensure `name` and `arguments` fields are present
4. **Validate JSON**: Use `jq` or JSON validator to check request body
5. **Check headers**: Ensure Content-Type is `application/json`

## Database Connection
The server shows database is connected in production:
```json
{
  "database": {
    "status": "connected",
    "type": "postgresql",
    "note": "Database connected successfully"
  }
}
```

## Next Steps
- Configure MCP client to include API keys in requests
- Consider implementing OAuth flow for user authentication
- Add rate limiting information to API responses