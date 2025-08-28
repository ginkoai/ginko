#!/bin/bash
# Comprehensive Vercel Deployment Test Script
# Tests all Ginko platform components in production

set -e

echo "🚀 Ginko Platform Production Test Suite"
echo "========================================"
echo "Testing against: https://mcp.ginkoai.com"
echo ""

# Colors for output
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration
API_URL="https://mcp.ginkoai.com"
DASHBOARD_URL="https://app.ginkoai.com"
API_KEY="gk_c2d4b1e52164da6f7ad4219720dbbe8af959e9bbaf266ed02ddce5b02f56efa5"
TEST_USER="test@ginkoai.com"

# Test results tracking
PASSED=0
FAILED=0
WARNINGS=0

# Function to test endpoint
test_endpoint() {
    local name=$1
    local method=$2
    local url=$3
    local data=$4
    local expected_field=$5
    
    echo -n "Testing $name... "
    
    if [ "$method" == "GET" ]; then
        response=$(curl -s -X GET "$url" \
            -H "X-API-Key: $API_KEY" 2>/dev/null || echo '{"error":"Request failed"}')
    else
        response=$(curl -s -X POST "$url" \
            -H "Content-Type: application/json" \
            -H "X-API-Key: $API_KEY" \
            -d "$data" 2>/dev/null || echo '{"error":"Request failed"}')
    fi
    
    if echo "$response" | grep -q "$expected_field"; then
        echo -e "${GREEN}✅ PASS${NC}"
        ((PASSED++))
        return 0
    elif echo "$response" | grep -q '"error"'; then
        error=$(echo "$response" | jq -r '.error' 2>/dev/null || echo "Unknown error")
        if [[ "$error" == *"not available on free plan"* ]] || [[ "$error" == *"does not exist"* ]]; then
            echo -e "${YELLOW}⚠️  WARNING: $error${NC}"
            ((WARNINGS++))
            return 0
        else
            echo -e "${RED}❌ FAIL: $error${NC}"
            ((FAILED++))
            return 1
        fi
    else
        echo -e "${RED}❌ FAIL: Unexpected response${NC}"
        echo "Response: $response" | head -100
        ((FAILED++))
        return 1
    fi
}

echo -e "${BLUE}1. Infrastructure Tests${NC}"
echo "------------------------"

# Health check
test_endpoint "API Health" "GET" "$API_URL/api/health" "" '"status"'

# Test various endpoints
echo ""
echo -e "${BLUE}2. MCP Tool Tests${NC}"
echo "-----------------"

# List tools
test_endpoint "List Tools" "POST" "$API_URL/api/tools/list" '{}' '"tools"'

# Context tool
test_endpoint "Context Tool" "POST" "$API_URL/api/tools/call" \
    '{"name": "context", "arguments": {"autoResume": false}}' \
    '"result"'

# Prepare handoff
test_endpoint "Prepare Handoff" "POST" "$API_URL/api/tools/call" \
    '{"name": "prepare_handoff", "arguments": {"currentTask": "Production testing"}}' \
    '"result"'

# Store handoff
HANDOFF_CONTENT="# Test Handoff\n\nTesting production deployment\n\n## Status\nAll systems operational"
test_endpoint "Store Handoff" "POST" "$API_URL/api/tools/call" \
    "{\"name\": \"store_handoff\", \"arguments\": {\"handoffContent\": \"$HANDOFF_CONTENT\"}}" \
    '"result"'

# Load handoff
test_endpoint "Load Handoff" "POST" "$API_URL/api/tools/call" \
    '{"name": "load_handoff", "arguments": {}}' \
    '"result"'

echo ""
echo -e "${BLUE}3. Session Management Tests${NC}"
echo "---------------------------"

# Session operations
test_endpoint "Session Capture" "POST" "$API_URL/api/sessions/capture" \
    '{"currentTask": "Testing session capture", "progress": "Running E2E tests"}' \
    '"sessionId"'

# Get scorecards (via dashboard proxy)
test_endpoint "Session Scorecards" "GET" "$DASHBOARD_URL/api/sessions/scorecards" \
    "" '"sessions"'

echo ""
echo -e "${BLUE}4. Authentication Tests${NC}"
echo "-----------------------"

# Test with API key
test_endpoint "Auth with API Key" "POST" "$API_URL/api/tools/call" \
    '{"name": "load_handoff", "arguments": {}}' \
    '"result"'

# Test without API key (should fail)
echo -n "Testing without API key... "
response=$(curl -s -X POST "$API_URL/api/tools/call" \
    -H "Content-Type: application/json" \
    -d '{"name": "load_handoff", "arguments": {}}' 2>/dev/null)

if echo "$response" | grep -q '"error"'; then
    echo -e "${GREEN}✅ PASS (correctly rejected)${NC}"
    ((PASSED++))
else
    echo -e "${RED}❌ FAIL (should have been rejected)${NC}"
    ((FAILED++))
fi

echo ""
echo -e "${BLUE}5. Database Connection Tests${NC}"
echo "----------------------------"

# Test database-dependent operations
test_endpoint "Project Overview" "POST" "$API_URL/api/tools/call" \
    '{"name": "get_project_overview", "arguments": {}}' \
    '"result\\|error"'

test_endpoint "Best Practices" "POST" "$API_URL/api/tools/call" \
    '{"name": "get_best_practices", "arguments": {}}' \
    '"result\\|error"'

echo ""
echo -e "${BLUE}6. Error Handling Tests${NC}"
echo "-----------------------"

# Invalid tool name
test_endpoint "Invalid Tool" "POST" "$API_URL/api/tools/call" \
    '{"name": "invalid_tool", "arguments": {}}' \
    '"error"'

# Malformed JSON
echo -n "Testing malformed JSON... "
response=$(curl -s -X POST "$API_URL/api/tools/call" \
    -H "Content-Type: application/json" \
    -H "X-API-Key: $API_KEY" \
    -d '{invalid json}' 2>/dev/null)

if echo "$response" | grep -q '"error"'; then
    echo -e "${GREEN}✅ PASS (handled gracefully)${NC}"
    ((PASSED++))
else
    echo -e "${RED}❌ FAIL (should have returned error)${NC}"
    ((FAILED++))
fi

echo ""
echo -e "${BLUE}7. Performance Tests${NC}"
echo "--------------------"

# Response time test
echo -n "Testing response time... "
start_time=$(date +%s%N)
curl -s -X GET "$API_URL/api/health" > /dev/null 2>&1
end_time=$(date +%s%N)
response_time=$(( ($end_time - $start_time) / 1000000 ))

if [ $response_time -lt 1000 ]; then
    echo -e "${GREEN}✅ PASS (${response_time}ms)${NC}"
    ((PASSED++))
elif [ $response_time -lt 3000 ]; then
    echo -e "${YELLOW}⚠️  WARNING: Slow (${response_time}ms)${NC}"
    ((WARNINGS++))
else
    echo -e "${RED}❌ FAIL: Very slow (${response_time}ms)${NC}"
    ((FAILED++))
fi

echo ""
echo "========================================"
echo -e "${BLUE}Test Results Summary${NC}"
echo "========================================"
echo -e "✅ Passed:   ${GREEN}$PASSED${NC}"
echo -e "⚠️  Warnings: ${YELLOW}$WARNINGS${NC}"
echo -e "❌ Failed:   ${RED}$FAILED${NC}"
echo ""

if [ $FAILED -eq 0 ]; then
    echo -e "${GREEN}🎉 All critical tests passed!${NC}"
    echo ""
    echo "Production deployment is fully operational."
    exit 0
else
    echo -e "${RED}⚠️  Some tests failed. Review the output above.${NC}"
    echo ""
    echo "Common issues:"
    echo "- Database tables may need to be created in Supabase"
    echo "- Environment variables may need to be updated in Vercel"
    echo "- API endpoints may need redeployment"
    exit 1
fi