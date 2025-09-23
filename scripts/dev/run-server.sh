#!/bin/bash
# @fileType: script
# @status: current
# @updated: 2025-09-22
# @tags: [server, development, logging, mcp, startup]
# @related: [quick-test.sh, verify-all-tools.sh]
# @priority: high
# @complexity: low
# @dependencies: [npm, nodejs]
# @description: Starts the Ginko MCP server with enhanced logging for development

echo "🚀 Starting contextMCP server with enhanced logging..."
echo "📝 Server will output detailed logs to help monitor Claude Code connections"
echo "🔄 Server will restart automatically on file changes if using 'npm run dev'"
echo ""
echo "Press Ctrl+C to stop the server"
echo "=================================================="

npm run dev