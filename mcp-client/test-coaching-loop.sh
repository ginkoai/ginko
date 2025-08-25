#!/bin/bash

# Test coaching loop - shows status line updates in terminal
# Usage: ./test-coaching-loop.sh

echo "🚀 Ginko Coaching Test Mode"
echo "================================"
echo "This simulates the status line updates you should see in Claude Code"
echo ""

SESSION_ID="test-session-$(date +%s)"
SCRIPT_PATH="/Users/cnorton/Development/ginko/mcp-client/src/statusline/ginko-statusline.cjs"

# Initialize session
echo "Starting session: $SESSION_ID"
echo ""

# Create initial session state
mkdir -p ~/.ginko/sessions
cat > ~/.ginko/sessions/${SESSION_ID}.json << EOF
{
  "sessionId": "$SESSION_ID",
  "startTime": $(date +%s)000,
  "errorCount": 0,
  "phase": "implementing",
  "progressRate": 0.5,
  "vibecheckCount": 0
}
EOF

echo "Status line updates (Ctrl+C to stop):"
echo "--------------------------------------"

# Loop to show status updates
while true; do
  # Get current status
  STATUS=$(echo "{\"sessionId\":\"$SESSION_ID\",\"cwd\":\"$PWD\",\"model\":\"claude\"}" | node $SCRIPT_PATH 2>/dev/null)
  
  # Remove ANSI codes for display
  CLEAN_STATUS=$(echo "$STATUS" | sed 's/\x1b\[[0-9;]*m//g')
  
  # Display with timestamp
  echo -ne "\r[$(date +%H:%M:%S)] $STATUS     "
  
  sleep 5
done