#!/bin/bash
# Fixed PostToolUse hook for pattern detection
# Simplified version to eliminate shell errors

# Configuration
GINKO_DIR="$HOME/.ginko"
SESSION_FILE="$GINKO_DIR/session_state.json"
HISTORY_FILE="$GINKO_DIR/tool_history.jsonl"
STATUS_FILE="$GINKO_DIR/statusline.json"

# Ensure directory exists
mkdir -p "$GINKO_DIR"

# Read hook input
HOOK_INPUT=$(cat)

# Extract tool info with fallback
TOOL_NAME=$(echo "$HOOK_INPUT" | jq -r '.tool_name // "unknown"' 2>/dev/null || echo "unknown")
TIMESTAMP=$(date +%s)

# Log to history first (this always works)
echo "{\"timestamp\":$TIMESTAMP,\"tool\":\"$TOOL_NAME\"}" >> "$HISTORY_FILE"

# Keep history bounded
if [ -f "$HISTORY_FILE" ]; then
    LINES=$(wc -l < "$HISTORY_FILE" 2>/dev/null || echo "0")
    if [ "$LINES" -gt 50 ]; then
        tail -n 50 "$HISTORY_FILE" > "$HISTORY_FILE.tmp"
        mv "$HISTORY_FILE.tmp" "$HISTORY_FILE"
    fi
fi

# Simple pattern detection based on recent history
detect_simple_patterns() {
    # Count recent tools (last 10 entries)
    RECENT_TOOLS=$(tail -10 "$HISTORY_FILE" 2>/dev/null | jq -r '.tool' | sort | uniq | wc -l || echo "1")
    TOTAL_RECENT=$(tail -10 "$HISTORY_FILE" 2>/dev/null | wc -l || echo "1")
    
    # Calculate velocity (tools in last 2 minutes)
    TWO_MIN_AGO=$((TIMESTAMP - 120))
    RECENT_COUNT=0
    
    # Count recent activity
    while IFS= read -r line; do
        if [ -n "$line" ]; then
            TS=$(echo "$line" | jq -r '.timestamp // 0' 2>/dev/null || echo "0")
            if [ "$TS" -ge "$TWO_MIN_AGO" ]; then
                RECENT_COUNT=$((RECENT_COUNT + 1))
            fi
        fi
    done < <(tail -20 "$HISTORY_FILE" 2>/dev/null || echo "")
    
    VELOCITY=$(echo "scale=1; $RECENT_COUNT / 2" | bc 2>/dev/null || echo "0.5")
    
    # Check for repetition (same tool appearing frequently)
    REPETITION=""
    if [ -f "$HISTORY_FILE" ]; then
        LAST_TOOL=$(tail -1 "$HISTORY_FILE" 2>/dev/null | jq -r '.tool' 2>/dev/null || echo "unknown")
        RECENT_SAME=$(tail -5 "$HISTORY_FILE" 2>/dev/null | grep -c "\"$LAST_TOOL\"" 2>/dev/null || echo "0")
        if [ "$RECENT_SAME" -ge 3 ]; then
            REPETITION="$LAST_TOOL"
        fi
    fi
    
    # Generate coaching message
    MESSAGE="✨ Ready to assist"
    PATTERN="normal"
    
    if [ -n "$REPETITION" ]; then
        MESSAGE="🔄 Repeating $REPETITION. Try something different?"
        PATTERN="repetition"
    elif [ "$(echo "$VELOCITY > 2" | bc -l 2>/dev/null || echo "0")" = "1" ] && [ "$RECENT_TOOLS" -gt 3 ]; then
        MESSAGE="🚀 Great momentum! Keep exploring"
        PATTERN="flow"
    elif [ "$(echo "$VELOCITY > 2" | bc -l 2>/dev/null || echo "0")" = "1" ] && [ "$RECENT_TOOLS" -le 2 ]; then
        MESSAGE="🎯 Focused work. Stay on target!"
        PATTERN="focused"
    elif [ "$(echo "$VELOCITY < 0.5" | bc -l 2>/dev/null || echo "0")" = "1" ] && [ "$TOTAL_RECENT" -gt 5 ]; then
        MESSAGE="💭 Quiet moment. What's next?"
        PATTERN="idle"
    elif [ "$TOTAL_RECENT" -lt 3 ]; then
        MESSAGE="👋 Just getting started. I'm here to help!"
        PATTERN="startup"
    else
        MESSAGE="⚡ Good pace! What can I help with?"
        PATTERN="active"
    fi
    
    # Write status file with simple JSON
    cat > "$STATUS_FILE" <<EOF
{
  "message": "$MESSAGE",
  "pattern": "$PATTERN",
  "timestamp": $TIMESTAMP,
  "metrics": {
    "velocity": $VELOCITY,
    "diversity": $RECENT_TOOLS,
    "total_recent": $TOTAL_RECENT
  }
}
EOF
}

# Initialize session file if needed
if [ ! -f "$SESSION_FILE" ]; then
    echo "{\"start_time\":$TIMESTAMP,\"last_update\":$TIMESTAMP}" > "$SESSION_FILE"
fi

# Update last activity time
if [ -f "$SESSION_FILE" ]; then
    # Simple update - just change timestamp
    sed "s/\"last_update\":[0-9]*/\"last_update\":$TIMESTAMP/" "$SESSION_FILE" > "$SESSION_FILE.tmp"
    mv "$SESSION_FILE.tmp" "$SESSION_FILE"
fi

# Run pattern detection
detect_simple_patterns

# Pass through hook input (required)
echo "$HOOK_INPUT"