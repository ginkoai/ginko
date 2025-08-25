#!/bin/bash
echo "📈 Endpoint Status Tracker"
echo "========================="

# Test direct API endpoints
echo "Direct API Endpoints:"
echo -n "  /api/health: "
curl -f -s https://mcp.ginko.ai/api/health > /dev/null && echo "✅" || echo "❌"

echo -n "  /api/tools/list: "
curl -f -s https://mcp.ginko.ai/api/tools/list \
  -H "X-API-Key: wmcp_sk_test_Ar0MN4BeW_Fro5mESi5PciTsOg6qlPcIr7k0vBL2mIk" > /dev/null && echo "✅" || echo "❌"

echo -n "  /api/best-practices: "
curl -f -s https://mcp.ginko.ai/api/best-practices \
  -H "X-API-Key: wmcp_sk_test_Ar0MN4BeW_Fro5mESi5PciTsOg6qlPcIr7k0vBL2mIk" > /dev/null && echo "✅" || echo "❌"

echo -n "  /api/sessions/list: "
curl -f -s https://mcp.ginko.ai/api/sessions/list \
  -H "X-API-Key: wmcp_sk_test_Ar0MN4BeW_Fro5mESi5PciTsOg6qlPcIr7k0vBL2mIk" > /dev/null && echo "✅" || echo "❌"

echo ""
echo "MCP Tool Status:"
./verify-all-tools.sh https://mcp.ginko.ai