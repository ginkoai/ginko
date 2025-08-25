#!/bin/bash

# Live preview of Ginko status line states

echo "🚀 Ginko Status Line Live Preview"
echo "====================================="
echo ""
echo "Watch the status line at the bottom of your Claude Code window..."
echo ""

GINKO_DIR="$HOME/.ginko"
SESSIONS_DIR="$GINKO_DIR/sessions"
mkdir -p "$SESSIONS_DIR"

# Function to update session state
update_session() {
    local session_id="test_$(date +%s)"
    local state_file="$SESSIONS_DIR/$session_id.json"
    echo "$1" > "$state_file"
    sleep 3
    rm -f "$state_file"
}

# 1. Default state
echo "1. Default state (5 seconds)..."
sleep 5

# 2. Simulate session resume
echo "2. Simulating session resume..."
echo $(date +%s000) > "$GINKO_DIR/session-start-time"
sleep 5
rm -f "$GINKO_DIR/session-start-time"

# 3. Simulate agent activity
echo "3. Simulating agent activities..."
echo '{"action":"load_handoff","message":"Loading session context...","timestamp":'$(date +%s000)'}' > "$GINKO_DIR/agent-activity.json"
sleep 3
echo '{"action":"get_best_practices","message":"Fetching best practices...","timestamp":'$(date +%s000)'}' > "$GINKO_DIR/agent-activity.json"
sleep 3
echo '{"action":"store_handoff","message":"Saving session state...","timestamp":'$(date +%s000)'}' > "$GINKO_DIR/agent-activity.json"
sleep 3
rm -f "$GINKO_DIR/agent-activity.json"

# 4. Simulate vibecheck needed
echo "4. Simulating vibecheck trigger (high error count)..."
update_session '{
  "startTime": '$(date -v-30M +%s000)',
  "errorCount": 6,
  "progressRate": 0.1,
  "phase": "debugging",
  "timeSinceProgress": 0
}'

# 5. Simulate flow state
echo "5. Simulating flow state..."
update_session '{
  "startTime": '$(date -v-20M +%s000)',
  "errorCount": 0,
  "progressRate": 0.9,
  "phase": "implementing",
  "consistentCommits": true,
  "flowDuration": 1200000
}'

# 6. Simulate stuck pattern
echo "6. Simulating stuck pattern..."
update_session '{
  "startTime": '$(date -v-1H +%s000)',
  "errorCount": 2,
  "progressRate": 0.1,
  "phase": "debugging",
  "timeSinceProgress": 1800000
}'

# 7. Back to default
echo "7. Returning to default state..."
sleep 3

echo ""
echo "✅ Preview complete!"
echo ""
echo "You should have seen:"
echo "- Default: 'Ginko: 🎯 Watchhill session capture active'"
echo "- Resume: 'Ginko: 🔄 Session resumed - ready to continue!'"
echo "- Agent: 'Ginko: ⚡ Loading/Fetching/Saving...'"
echo "- Vibecheck: 'Ginko: 🎯 Vibecheck suggested - feeling stuck?'"
echo "- Flow: 'Ginko: 🌊 Flow state X min'"
echo "- Stuck: 'Ginko: 🛑 Consider taking a break'"