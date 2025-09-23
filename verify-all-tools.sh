#!/bin/bash
# @fileType: script
# @status: current
# @updated: 2025-09-22
# @tags: [testing, tools, comprehensive, mcp, verification]
# @related: [quick-test.sh, track-status.sh, simple-test.sh]
# @priority: high
# @complexity: medium
# @dependencies: [curl, jq, bash]
# @description: Comprehensive test suite for all 21 MCP tools with detailed reporting

BASE_URL=$1
API_KEY="wmcp_sk_test_Ar0MN4BeW_Fro5mESi5PciTsOg6qlPcIr7k0vBL2mIk"

echo "🧪 Comprehensive MCP Tool Testing"
echo "=================================="

# All 21 MCP tools to test
TOOLS=(
  "get_best_practices"
  "suggest_best_practice" 
  "search_best_practices"
  "create_best_practice"
  "adopt_best_practice"
  "get_project_best_practices"
  "get_project_overview"
  "find_relevant_code"
  "get_file_context"
  "get_recent_changes"
  "get_team_activity"
  "capture_session"
  "resume_session"
  "list_sessions"
  "get_dashboard_metrics"
  "get_file_hotspots"
  "get_team_analytics"
  "context"
  "ctx"
  "sessions"
  "__startup"
)

PASSED=0
FAILED=0

for tool in "${TOOLS[@]}"; do
  echo -n "Testing $tool: "
  
  # Construct appropriate test arguments
  case $tool in
    "suggest_best_practice")
      ARGS='{"scenario": "error handling", "codeContext": "try/catch block"}'
      ;;
    "search_best_practices")
      ARGS='{"query": "javascript", "limit": 5}'
      ;;
    "create_best_practice")
      ARGS='{"name": "Test Practice", "description": "Test description", "visibility": "private"}'
      ;;
    "adopt_best_practice")
      # Skip this one as it requires a valid practice ID
      echo "⏭️  (requires practice ID)"
      continue
      ;;
    "get_file_context")
      ARGS='{"filePath": "package.json"}'
      ;;
    "capture_session")
      ARGS='{"currentTask": "Testing session capture"}'
      ;;
    "resume_session")
      # Skip as it requires valid session ID
      echo "⏭️  (requires session ID)"
      continue
      ;;
    *)
      ARGS='{}'
      ;;
  esac
  
  RESPONSE=$(curl -s -X POST "$BASE_URL/api/tools/call" \
    -H "Content-Type: application/json" \
    -H "X-API-Key: $API_KEY" \
    -d "{\"name\": \"$tool\", \"arguments\": $ARGS}")
  
  if echo "$RESPONSE" | grep -q '"result"'; then
    echo "✅"
    ((PASSED++))
  else
    echo "❌"
    echo "   Error: $(echo "$RESPONSE" | jq -r '.error // "Unknown error"')"
    ((FAILED++))
  fi
done

echo ""
echo "📊 Results: $PASSED passed, $FAILED failed"
echo "Success Rate: $(( PASSED * 100 / (PASSED + FAILED) ))%"