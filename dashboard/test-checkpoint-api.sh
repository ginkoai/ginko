#!/bin/bash

# Test script for Checkpoint API
# Usage: ./test-checkpoint-api.sh

set -e

# Configuration
API_BASE="http://localhost:3000/api/v1"
BEARER_TOKEN="${GINKO_BEARER_TOKEN:-test-token-12345}"

echo "Testing Checkpoint API"
echo "======================"
echo ""

# Test 1: Create checkpoint
echo "Test 1: POST /api/v1/checkpoint - Create checkpoint"
echo "---------------------------------------------------"

CHECKPOINT_RESPONSE=$(curl -s -X POST "${API_BASE}/checkpoint" \
  -H "Authorization: Bearer ${BEARER_TOKEN}" \
  -H "Content-Type: application/json" \
  -d '{
    "graphId": "test-graph-001",
    "taskId": "TASK-1",
    "agentId": "agent_1733598000_abc123",
    "gitCommit": "abc123def456",
    "filesModified": ["src/file1.ts", "src/file2.ts"],
    "eventsSince": "event_1733598000_xyz789",
    "message": "Completed feature implementation",
    "metadata": {
      "branch": "feature/test",
      "linesChanged": 150
    }
  }')

echo "Response:"
echo "$CHECKPOINT_RESPONSE" | jq .
echo ""

# Extract checkpoint ID from response
CHECKPOINT_ID=$(echo "$CHECKPOINT_RESPONSE" | jq -r '.checkpoint.id')

if [ "$CHECKPOINT_ID" != "null" ] && [ -n "$CHECKPOINT_ID" ]; then
  echo "✅ Checkpoint created successfully: $CHECKPOINT_ID"
else
  echo "❌ Failed to create checkpoint"
  exit 1
fi

echo ""
echo ""

# Test 2: List checkpoints by graphId
echo "Test 2: GET /api/v1/checkpoint?graphId=test-graph-001"
echo "------------------------------------------------------"

LIST_RESPONSE=$(curl -s -X GET "${API_BASE}/checkpoint?graphId=test-graph-001&limit=10" \
  -H "Authorization: Bearer ${BEARER_TOKEN}")

echo "Response:"
echo "$LIST_RESPONSE" | jq .
echo ""

CHECKPOINT_COUNT=$(echo "$LIST_RESPONSE" | jq -r '.checkpoints | length')

if [ "$CHECKPOINT_COUNT" -gt 0 ]; then
  echo "✅ Found $CHECKPOINT_COUNT checkpoint(s)"
else
  echo "❌ No checkpoints found"
  exit 1
fi

echo ""
echo ""

# Test 3: Filter by taskId
echo "Test 3: GET /api/v1/checkpoint?graphId=test-graph-001&taskId=TASK-1"
echo "----------------------------------------------------------------------"

FILTER_RESPONSE=$(curl -s -X GET "${API_BASE}/checkpoint?graphId=test-graph-001&taskId=TASK-1" \
  -H "Authorization: Bearer ${BEARER_TOKEN}")

echo "Response:"
echo "$FILTER_RESPONSE" | jq .
echo ""

FILTERED_COUNT=$(echo "$FILTER_RESPONSE" | jq -r '.checkpoints | length')

if [ "$FILTERED_COUNT" -gt 0 ]; then
  echo "✅ Found $FILTERED_COUNT checkpoint(s) for TASK-1"
else
  echo "⚠️  No checkpoints found for TASK-1 (might be expected)"
fi

echo ""
echo ""

# Test 4: Missing authorization
echo "Test 4: POST without authorization (should fail)"
echo "-------------------------------------------------"

UNAUTH_RESPONSE=$(curl -s -X POST "${API_BASE}/checkpoint" \
  -H "Content-Type: application/json" \
  -d '{"graphId": "test", "taskId": "TASK-1", "agentId": "agent_1", "gitCommit": "abc", "filesModified": [], "eventsSince": "event_1"}')

echo "Response:"
echo "$UNAUTH_RESPONSE" | jq .
echo ""

ERROR_CODE=$(echo "$UNAUTH_RESPONSE" | jq -r '.error.code')

if [ "$ERROR_CODE" = "AUTH_REQUIRED" ]; then
  echo "✅ Authorization check working correctly"
else
  echo "❌ Authorization check failed"
fi

echo ""
echo ""

# Test 5: Missing required field
echo "Test 5: POST with missing required field (should fail)"
echo "-------------------------------------------------------"

INVALID_RESPONSE=$(curl -s -X POST "${API_BASE}/checkpoint" \
  -H "Authorization: Bearer ${BEARER_TOKEN}" \
  -H "Content-Type: application/json" \
  -d '{
    "graphId": "test-graph-001",
    "taskId": "TASK-1"
  }')

echo "Response:"
echo "$INVALID_RESPONSE" | jq .
echo ""

ERROR_CODE=$(echo "$INVALID_RESPONSE" | jq -r '.error.code')

if [ "$ERROR_CODE" = "MISSING_FIELD" ]; then
  echo "✅ Field validation working correctly"
else
  echo "❌ Field validation failed"
fi

echo ""
echo ""

# Test 6: Missing graphId in GET request
echo "Test 6: GET without graphId (should fail)"
echo "------------------------------------------"

NO_GRAPH_RESPONSE=$(curl -s -X GET "${API_BASE}/checkpoint" \
  -H "Authorization: Bearer ${BEARER_TOKEN}")

echo "Response:"
echo "$NO_GRAPH_RESPONSE" | jq .
echo ""

ERROR_CODE=$(echo "$NO_GRAPH_RESPONSE" | jq -r '.error.code')

if [ "$ERROR_CODE" = "MISSING_GRAPH_ID" ]; then
  echo "✅ GraphId validation working correctly"
else
  echo "❌ GraphId validation failed"
fi

echo ""
echo "======================"
echo "All tests completed!"
echo "======================"
