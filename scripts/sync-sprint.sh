#!/bin/bash
# Sync active sprint to graph

SPRINT_FILE="${1:-/Users/cnorton/Development/ginko/docs/sprints/SPRINT-2025-11-epic002-phase1.md}"
GRAPH_ID="${GINKO_GRAPH_ID:-gin_1762125961056_dg4bsd}"
TOKEN=$(cat ~/.ginko/auth.json | jq -r '.api_key')
API_URL="${GINKO_GRAPH_API_URL:-https://app.ginkoai.com}"

echo "Syncing sprint: $SPRINT_FILE"
echo "Graph ID: $GRAPH_ID"
echo "API URL: $API_URL"

# Read sprint content
SPRINT_CONTENT=$(cat "$SPRINT_FILE")

# Create JSON payload
PAYLOAD=$(jq -n \
  --arg graphId "$GRAPH_ID" \
  --arg content "$SPRINT_CONTENT" \
  '{graphId: $graphId, sprintContent: $content}')

# Sync to graph
RESPONSE=$(curl -s -X POST "$API_URL/api/v1/sprint/sync" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d "$PAYLOAD")

echo ""
echo "Response:"
echo "$RESPONSE" | jq .
