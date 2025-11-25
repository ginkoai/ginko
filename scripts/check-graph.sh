#!/bin/bash
# Check graph status

TOKEN=$(cat ~/.ginko/auth.json | jq -r '.api_key')
GRAPH_ID="${GINKO_GRAPH_ID:-gin_1762125961056_dg4bsd}"

echo "Checking graph: $GRAPH_ID"
echo ""

curl -s "https://app.ginkoai.com/api/v1/graph/status?graphId=$GRAPH_ID" \
  -H "Authorization: Bearer $TOKEN" | jq .
