#!/bin/bash
# Test script for event logging dual-write system (ADR-043)

set -e

echo "🧪 Testing Event Logging System (ADR-043)"
echo "========================================="
echo ""

# Change to project directory
cd "$(dirname "$0")"

# Build CLI
echo "📦 Building CLI..."
cd packages/cli
npm run build
cd ../..
echo "✓ CLI built"
echo ""

# Clear previous test events
echo "🧹 Clearing previous test events..."
EVENTS_FILE=".ginko/sessions/$(git config user.email | sed 's/@/-at-/g' | sed 's/\./-/g')/current-events.jsonl"
if [ -f "$EVENTS_FILE" ]; then
  rm "$EVENTS_FILE"
  echo "✓ Cleared $EVENTS_FILE"
else
  echo "  No previous events file found"
fi
echo ""

# Test 1: Log 10 events
echo "📝 Test 1: Logging 10 events..."
for i in {1..10}; do
  echo "  Event $i..."
  ginko log "Test event $i - dual-write validation" \
    --category=feature \
    --impact=medium \
    --quick
done
echo "✓ Logged 10 events"
echo ""

# Test 2: Verify local file
echo "📂 Test 2: Verifying local file storage..."
if [ -f "$EVENTS_FILE" ]; then
  EVENT_COUNT=$(wc -l < "$EVENTS_FILE" | tr -d ' ')
  echo "  Events in local file: $EVENT_COUNT"

  if [ "$EVENT_COUNT" -eq 10 ]; then
    echo "✓ All 10 events persisted locally"
  else
    echo "❌ Expected 10 events, found $EVENT_COUNT"
    exit 1
  fi
else
  echo "❌ Events file not found: $EVENTS_FILE"
  exit 1
fi
echo ""

# Test 3: Verify event structure
echo "🔍 Test 3: Verifying event structure..."
FIRST_EVENT=$(head -n 1 "$EVENTS_FILE")
echo "  Sample event: $FIRST_EVENT"

# Check required fields
if echo "$FIRST_EVENT" | jq -e '.id' > /dev/null 2>&1; then
  echo "  ✓ Has event ID"
else
  echo "  ❌ Missing event ID"
  exit 1
fi

if echo "$FIRST_EVENT" | jq -e '.user_id' > /dev/null 2>&1; then
  echo "  ✓ Has user_id"
else
  echo "  ❌ Missing user_id"
  exit 1
fi

if echo "$FIRST_EVENT" | jq -e '.organization_id' > /dev/null 2>&1; then
  echo "  ✓ Has organization_id"
else
  echo "  ❌ Missing organization_id"
  exit 1
fi

if echo "$FIRST_EVENT" | jq -e '.project_id' > /dev/null 2>&1; then
  echo "  ✓ Has project_id"
else
  echo "  ❌ Missing project_id"
  exit 1
fi

if echo "$FIRST_EVENT" | jq -e '.category' > /dev/null 2>&1; then
  echo "  ✓ Has category"
else
  echo "  ❌ Missing category"
  exit 1
fi

if echo "$FIRST_EVENT" | jq -e '.description' > /dev/null 2>&1; then
  echo "  ✓ Has description"
else
  echo "  ❌ Missing description"
  exit 1
fi
echo ""

# Test 4: Verify event IDs are unique
echo "🔑 Test 4: Verifying event ID uniqueness..."
UNIQUE_IDS=$(jq -r '.id' "$EVENTS_FILE" | sort -u | wc -l | tr -d ' ')
if [ "$UNIQUE_IDS" -eq 10 ]; then
  echo "✓ All event IDs are unique"
else
  echo "❌ Found $UNIQUE_IDS unique IDs, expected 10"
  exit 1
fi
echo ""

# Test 5: Display sample event
echo "📄 Test 5: Sample event display..."
echo "$FIRST_EVENT" | jq '.'
echo ""

# Test 6: Check for --shared flag
echo "🔓 Test 6: Testing --shared flag..."
ginko log "Shared event for team visibility" \
  --category=insight \
  --impact=high \
  --shared \
  --quick

LAST_EVENT=$(tail -n 1 "$EVENTS_FILE")
SHARED_VALUE=$(echo "$LAST_EVENT" | jq -r '.shared')
if [ "$SHARED_VALUE" = "true" ]; then
  echo "✓ --shared flag working correctly"
else
  echo "❌ --shared flag not applied (got: $SHARED_VALUE)"
  exit 1
fi
echo ""

# Summary
echo "✅ All tests passed!"
echo ""
echo "📊 Summary:"
echo "  - Events logged: 11"
echo "  - Local file: $EVENTS_FILE"
echo "  - Event structure: Valid"
echo "  - Event ID uniqueness: Verified"
echo "  - Multi-tenancy fields: Present"
echo "  - Shared flag: Working"
echo ""
echo "🚀 Next steps:"
echo "  1. Start a session: ginko start"
echo "  2. Log events during work"
echo "  3. Events sync to Neo4j every 5min OR 5 events"
echo "  4. Handoff flushes queue: ginko handoff"
echo ""
echo "Note: Neo4j sync requires GINKO_GRAPH_ID env var and authentication"
echo "      Use 'ginko graph init' to set up graph integration"
