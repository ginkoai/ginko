#!/bin/bash
# Enhanced PostToolUse hook for pattern detection
# Tracks velocity, diversity, idle time, and repetition

# Configuration
GINKO_DIR="$HOME/.ginko"
SESSION_FILE="$GINKO_DIR/session_state.json"
HISTORY_FILE="$GINKO_DIR/tool_history.jsonl"
STATUS_FILE="$GINKO_DIR/statusline.json"
MAX_HISTORY=50  # Keep last 50 tool uses for pattern analysis

# Ensure directory exists
mkdir -p "$GINKO_DIR"

# Read hook input
HOOK_INPUT=$(cat)

# Extract tool info
TOOL_NAME=$(echo "$HOOK_INPUT" | jq -r '.tool_name // "unknown"')
TIMESTAMP=$(date +%s)

# Initialize session file if not exists
if [ ! -f "$SESSION_FILE" ]; then
    echo '{"start_time":'$TIMESTAMP',"last_activity":'$TIMESTAMP',"tool_counts":{},"recent_tools":[],"patterns":{}}' > "$SESSION_FILE"
fi

# Log to history (JSONL format for easy streaming)
echo '{"timestamp":'$TIMESTAMP',"tool":"'$TOOL_NAME'"}' >> "$HISTORY_FILE"

# Keep history file bounded
if [ $(wc -l < "$HISTORY_FILE") -gt $MAX_HISTORY ]; then
    tail -n $MAX_HISTORY "$HISTORY_FILE" > "$HISTORY_FILE.tmp"
    mv "$HISTORY_FILE.tmp" "$HISTORY_FILE"
fi

# Load current session state
SESSION_DATA=$(cat "$SESSION_FILE")

# Update session state with jq
UPDATED_SESSION=$(echo "$SESSION_DATA" | jq --arg tool "$TOOL_NAME" --arg ts "$TIMESTAMP" '
    # Update last activity time
    .last_activity = ($ts | tonumber) |
    
    # Update tool counts
    .tool_counts[$tool] = ((.tool_counts[$tool] // 0) + 1) |
    
    # Update recent tools list (keep last 10)
    .recent_tools = ([$tool] + .recent_tools)[0:10]
')

# Pattern Detection Functions (using jq for JSON processing)
detect_patterns() {
    local session="$1"
    local current_time="$2"
    
    # Calculate metrics
    local last_activity=$(echo "$session" | jq -r '.last_activity')
    local idle_time=$((current_time - last_activity))
    local unique_tools=$(echo "$session" | jq -r '.tool_counts | keys | length')
    local total_tools=$(echo "$session" | jq -r '[.tool_counts[]] | add')
    local recent_tools=$(echo "$session" | jq -r '.recent_tools | length')
    
    # Get most used tool
    local most_used=$(echo "$session" | jq -r '.tool_counts | to_entries | max_by(.value) | .key')
    local most_used_count=$(echo "$session" | jq -r '.tool_counts | to_entries | max_by(.value) | .value')
    
    # Velocity calculation (tools per minute in last 5 minutes)
    local five_min_ago=$((current_time - 300))
    local recent_count=$(grep -c "\"timestamp\":$five_min_ago" "$HISTORY_FILE" 2>/dev/null || echo 0)
    for ts in $(tail -20 "$HISTORY_FILE" 2>/dev/null | jq -r '.timestamp'); do
        if [ "$ts" -ge "$five_min_ago" ]; then
            recent_count=$((recent_count + 1))
        fi
    done
    local velocity=$(echo "scale=2; $recent_count / 5" | bc 2>/dev/null || echo "0")
    
    # Repetition detection (same tool used 3+ times in last 5 tools)
    local last_5=$(echo "$session" | jq -r '.recent_tools[0:5][]' 2>/dev/null)
    local repetition_tool=""
    for tool in $(echo "$last_5" | sort | uniq); do
        local count=$(echo "$last_5" | grep -c "^$tool$")
        if [ "$count" -ge 3 ]; then
            repetition_tool="$tool"
            break
        fi
    done
    
    # Build patterns JSON
    echo "$session" | jq \
        --arg idle "$idle_time" \
        --arg velocity "$velocity" \
        --arg diversity "$unique_tools" \
        --arg total "$total_tools" \
        --arg repetition "$repetition_tool" \
        --arg most_used "$most_used" \
        --arg most_used_count "$most_used_count" '
        .patterns = {
            "idle_seconds": ($idle | tonumber),
            "velocity_per_min": ($velocity | tonumber),
            "tool_diversity": ($diversity | tonumber),
            "total_tools": ($total | tonumber),
            "repetition_detected": $repetition,
            "most_used_tool": $most_used,
            "most_used_count": ($most_used_count | tonumber),
            "status": "active"
        }'
}

# Detect patterns
UPDATED_WITH_PATTERNS=$(detect_patterns "$UPDATED_SESSION" "$TIMESTAMP")

# Save updated session
echo "$UPDATED_WITH_PATTERNS" > "$SESSION_FILE"

# Generate coaching message based on patterns
generate_coaching() {
    local patterns=$(cat "$SESSION_FILE" | jq -r '.patterns')
    local velocity=$(echo "$patterns" | jq -r '.velocity_per_min')
    local diversity=$(echo "$patterns" | jq -r '.tool_diversity')
    local idle=$(echo "$patterns" | jq -r '.idle_seconds')
    local repetition=$(echo "$patterns" | jq -r '.repetition_detected')
    local total=$(echo "$patterns" | jq -r '.total_tools')
    
    local message="✨ Ready to assist"
    local pattern_type="normal"
    
    # High velocity + high diversity = exploring/flow
    if (( $(echo "$velocity > 3" | bc -l) )) && [ "$diversity" -gt 4 ]; then
        message="🚀 Great exploration! Keep the momentum"
        pattern_type="flow"
        
    # Repetition detected = might be stuck
    elif [ -n "$repetition" ] && [ "$repetition" != "null" ]; then
        message="🔄 Repeating $repetition. Try a different approach?"
        pattern_type="stuck"
        
    # Low velocity after initial activity = thinking or stuck
    elif [ "$total" -gt 10 ] && (( $(echo "$velocity < 0.5" | bc -l) )); then
        message="💭 Quiet moment. Need fresh ideas?"
        pattern_type="idle"
        
    # High velocity but low diversity = focused work
    elif (( $(echo "$velocity > 2" | bc -l) )) && [ "$diversity" -le 2 ]; then
        message="🎯 Focused work detected. Stay on target!"
        pattern_type="focused"
        
    # Just starting (< 5 tools)
    elif [ "$total" -lt 5 ]; then
        message="👋 Getting started? I'm here to help"
        pattern_type="startup"
        
    # Moderate activity
    elif (( $(echo "$velocity > 1" | bc -l) )); then
        message="⚡ Good pace! What's next?"
        pattern_type="active"
    fi
    
    # Create statusline file
    cat > "$STATUS_FILE" <<EOF
{
    "message": "$message",
    "pattern": "$pattern_type",
    "timestamp": $TIMESTAMP,
    "metrics": {
        "velocity": $velocity,
        "diversity": $diversity,
        "idle_seconds": $idle,
        "total_tools": $total
    }
}
EOF
}

# Generate and save coaching message
generate_coaching

# Pass through hook input (required)
echo "$HOOK_INPUT"