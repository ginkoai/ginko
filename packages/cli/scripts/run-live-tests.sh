#!/bin/bash

# Live Graph API Integration Test Runner
#
# This script runs end-to-end tests against the deployed graph API

set -e

echo "🚀 Live Graph API Integration Tests"
echo "===================================="
echo ""

# Load environment variables from project root .env file
PROJECT_ROOT="$(cd ../../ && pwd)"
if [ -f "$PROJECT_ROOT/.env" ]; then
  echo "📄 Loading environment from $PROJECT_ROOT/.env"
  set -a
  source "$PROJECT_ROOT/.env"
  set +a
  echo ""
fi

# Check for required environment variables
MISSING_VARS=()

if [ -z "$GINKO_GRAPH_TOKEN" ]; then
  MISSING_VARS+=("GINKO_GRAPH_TOKEN")
fi

if [ -z "$GINKO_GRAPH_ID" ]; then
  MISSING_VARS+=("GINKO_GRAPH_ID")
fi

if [ ${#MISSING_VARS[@]} -gt 0 ]; then
  echo "❌ Missing required environment variables:"
  for var in "${MISSING_VARS[@]}"; do
    echo "   - $var"
  done
  echo ""
  echo "Please set these variables and try again:"
  echo ""
  echo "export GINKO_GRAPH_TOKEN='your_token_here'"
  echo "export GINKO_GRAPH_ID='gin_1762125961056_dg4bsd'  # or your graph ID"
  echo "export GINKO_GRAPH_API_URL='https://ginko-8ywf93tl6-chris-nortons-projects.vercel.app'  # optional"
  echo "export GINKO_DUAL_WRITE='true'  # optional - test dual-write mode"
  echo ""
  echo "Then run:"
  echo "./scripts/run-live-tests.sh"
  echo ""
  exit 1
fi

# Set defaults
export GINKO_GRAPH_ENABLED='true'
export GINKO_GRAPH_API_URL=${GINKO_GRAPH_API_URL:-'https://ginko-8ywf93tl6-chris-nortons-projects.vercel.app'}

echo "📊 Configuration:"
echo "   API URL: $GINKO_GRAPH_API_URL"
echo "   Graph ID: $GINKO_GRAPH_ID"
echo "   Token: ${GINKO_GRAPH_TOKEN:0:10}..."
echo "   Dual-Write: ${GINKO_DUAL_WRITE:-false}"
echo ""

# Run the tests
echo "🧪 Running live integration tests..."
echo ""

# Export variables so Jest can access them
export GINKO_GRAPH_ENABLED
export GINKO_GRAPH_API_URL
export GINKO_GRAPH_TOKEN
export GINKO_GRAPH_ID
export GINKO_DUAL_WRITE
export VERCEL_AUTOMATION_BYPASS_SECRET

npm test -- test/e2e/live-graph-api.test.ts --verbose

echo ""
echo "✅ Live integration tests complete!"
