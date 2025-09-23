#!/bin/bash
# @fileType: script
# @status: current
# @updated: 2025-09-22
# @tags: [statusline, reader, coaching, patterns, session-management]
# @related: [ginko-privacy.sh, install-statusline-intelligence.sh, preview-status-line.sh]
# @priority: high
# @complexity: medium
# @dependencies: [bash, jq, date]
# @description: Core statusline reader for displaying Ginko coaching messages and session state
#
# Ginko Statusline Reader
# Reads pattern data and displays coaching messages

GINKO_DIR="$HOME/.ginko"
STATUS_FILE="$GINKO_DIR/statusline.json"
SESSION_FILE="$GINKO_DIR/session_state.json"

# Default message if no status file
DEFAULT_MESSAGE="Ginko Ready"

# Function to get coaching message
get_coaching() {
    if [ ! -f "$STATUS_FILE" ]; then
        echo "$DEFAULT_MESSAGE"
        return
    fi
    
    # Check if status file is recent (less than 5 minutes old)
    if [ -f "$STATUS_FILE" ]; then
        local status_time=$(jq -r '.timestamp // 0' "$STATUS_FILE" 2>/dev/null)
        local current_time=$(date +%s)
        local age=$((current_time - status_time))
        
        # If status is stale (> 5 minutes), show idle message
        if [ "$age" -gt 300 ]; then
            echo "💤 Session idle for $((age / 60)) minutes"
            return
        fi
        
        # Read and display current message
        local message=$(jq -r '.message // "Ready"' "$STATUS_FILE" 2>/dev/null)
        echo "$message"
    else
        echo "$DEFAULT_MESSAGE"
    fi
}

# Function to show detailed status (debug mode)
show_details() {
    echo "=== Ginko Session Status ==="
    echo
    
    if [ -f "$SESSION_FILE" ]; then
        echo "Session Metrics:"
        jq -r '
            "  Start Time: " + (.start_time | todate) + 
            "\n  Tools Used: " + (.patterns.total_tools | tostring) +
            "\n  Diversity: " + (.patterns.tool_diversity | tostring) + " unique tools" +
            "\n  Velocity: " + (.patterns.velocity_per_min | tostring) + " tools/min" +
            "\n  Most Used: " + .patterns.most_used_tool + " (" + (.patterns.most_used_count | tostring) + "x)"
        ' "$SESSION_FILE" 2>/dev/null
        echo
    fi
    
    if [ -f "$STATUS_FILE" ]; then
        echo "Current Coaching:"
        jq -r '.message' "$STATUS_FILE" 2>/dev/null
        echo
        
        echo "Pattern Type:"
        jq -r '.pattern' "$STATUS_FILE" 2>/dev/null
        echo
    fi
    
    if [ -f "$GINKO_DIR/tool_history.jsonl" ]; then
        echo "Recent Tools:"
        tail -5 "$GINKO_DIR/tool_history.jsonl" | jq -r '"  " + (.timestamp | todate) + " - " + .tool' 2>/dev/null
    fi
}

# Function to reset session data
reset_session() {
    echo "Resetting Ginko session data..."
    rm -f "$SESSION_FILE" "$STATUS_FILE" "$GINKO_DIR/tool_history.jsonl"
    echo "Session reset complete"
}

# Main logic
case "${1:-status}" in
    "status"|"")
        get_coaching
        ;;
    "details"|"debug")
        show_details
        ;;
    "reset")
        reset_session
        ;;
    "test")
        echo "Testing Ginko statusline..."
        if [ -f "$STATUS_FILE" ]; then
            echo "✅ Status file exists"
            echo "Message: $(jq -r '.message' "$STATUS_FILE")"
        else
            echo "❌ No status file found at $STATUS_FILE"
        fi
        
        if [ -f "$SESSION_FILE" ]; then
            echo "✅ Session file exists"
        else
            echo "❌ No session file found at $SESSION_FILE"
        fi
        ;;
    *)
        echo "Usage: $0 [status|details|reset|test]"
        echo "  status   - Show current coaching message (default)"
        echo "  details  - Show detailed session information"
        echo "  reset    - Clear all session data"
        echo "  test     - Test file existence and status"
        ;;
esac