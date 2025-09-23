#!/bin/bash
# @fileType: script
# @status: current
# @updated: 2025-09-22
# @tags: [privacy, data-management, analytics, consent, user-control]
# @related: [install-statusline-intelligence.sh, statusline-reader.sh]
# @priority: high
# @complexity: medium
# @dependencies: [jq, bash]
# @description: Privacy management utility for Ginko data collection and analytics settings
#
# Ginko Privacy Management Utility
# Manage data collection and privacy settings

GINKO_DIR="$HOME/.ginko"
PRIVACY_FILE="$GINKO_DIR/privacy_settings.json"

show_status() {
    echo "=== Ginko Privacy Settings ==="
    echo
    
    if [ -f "$PRIVACY_FILE" ]; then
        local coaching=$(jq -r '.local_coaching_enabled // false' "$PRIVACY_FILE")
        local analytics=$(jq -r '.anonymous_analytics_enabled // false' "$PRIVACY_FILE")
        local consent_date=$(jq -r '.consent_date // "unknown"' "$PRIVACY_FILE")
        
        echo "🏠 Local Coaching: $([ "$coaching" = "true" ] && echo "ENABLED" || echo "DISABLED")"
        echo "📊 Anonymous Analytics: $([ "$analytics" = "true" ] && echo "ENABLED" || echo "DISABLED")"
        echo "📅 Consent Date: $consent_date"
        echo
        
        if [ "$coaching" = "true" ]; then
            echo "Local coaching collects:"
            echo "  ✅ Tool usage patterns (Read, Write, Bash, etc.)"
            echo "  ✅ Timing data for velocity analysis"
            echo "  🏠 All processing happens on your machine"
            echo "  🚫 No external transmission"
        fi
        
        echo
        if [ "$analytics" = "true" ]; then
            echo "Anonymous analytics shares:"
            echo "  📊 Aggregate pattern summaries"
            echo "  🎯 Coaching effectiveness data"
            echo "  📈 Anonymous productivity indicators"
            echo "  ❌ Never file names, contents, or personal data"
        else
            echo "Anonymous analytics: DISABLED"
            echo "  🏠 All data stays on your machine"
        fi
    else
        echo "❌ Ginko not configured. Run install-statusline-intelligence.sh first."
    fi
    echo
}

enable_analytics() {
    if [ ! -f "$PRIVACY_FILE" ]; then
        echo "❌ Ginko not installed. Please run the installer first."
        exit 1
    fi
    
    echo "🤔 Enable Anonymous Analytics?"
    echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
    echo
    echo "This will help improve coaching quality for all Ginko users by sharing:"
    echo "  📊 Anonymous pattern summaries"
    echo "  🎯 Which coaching messages are most effective"
    echo "  📈 General productivity trends"
    echo
    echo "We will NEVER share:"
    echo "  ❌ File names, paths, or contents"
    echo "  ❌ Personal identifiers"
    echo "  ❌ Specific commands or project details"
    echo
    
    read -p "Enable anonymous analytics? (y/N): " consent
    if [[ "$consent" =~ ^[Yy]$ ]]; then
        # Update privacy settings
        jq '.anonymous_analytics_enabled = true | .analytics_consent_date = now | .analytics_consent_date |= todate' "$PRIVACY_FILE" > "$PRIVACY_FILE.tmp"
        mv "$PRIVACY_FILE.tmp" "$PRIVACY_FILE"
        
        echo "✅ Anonymous analytics enabled!"
        echo "   Data will be aggregated and shared to improve coaching quality."
        echo "   You can disable this anytime with: ginko-privacy disable-analytics"
    else
        echo "Analytics not enabled. Your data remains completely local."
    fi
}

disable_analytics() {
    if [ ! -f "$PRIVACY_FILE" ]; then
        echo "❌ Ginko not installed."
        exit 1
    fi
    
    # Update privacy settings
    jq '.anonymous_analytics_enabled = false | .analytics_disabled_date = now | .analytics_disabled_date |= todate' "$PRIVACY_FILE" > "$PRIVACY_FILE.tmp"
    mv "$PRIVACY_FILE.tmp" "$PRIVACY_FILE"
    
    echo "✅ Anonymous analytics disabled!"
    echo "   All data processing is now completely local."
    echo "   You can re-enable anytime with: ginko-privacy enable-analytics"
}

export_data() {
    echo "=== Ginko Data Export ==="
    echo
    
    if [ ! -d "$GINKO_DIR" ]; then
        echo "❌ No Ginko data found."
        exit 1
    fi
    
    local export_file="$HOME/ginko-data-export-$(date +%Y%m%d_%H%M%S).tar.gz"
    
    echo "📦 Creating export archive..."
    tar -czf "$export_file" -C "$HOME" ".ginko/"
    
    echo "✅ Data exported to: $export_file"
    echo
    echo "Export contains:"
    echo "• Privacy settings and consent records"
    echo "• Tool usage history (anonymized)"
    echo "• Session pattern data"
    echo "• Coaching message history"
    echo
    echo "This export is for your records. It contains no personal information"
    echo "beyond tool usage patterns and timestamps."
}

delete_data() {
    echo "⚠️  Delete All Ginko Data?"
    echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
    echo
    echo "This will permanently delete:"
    echo "• All tool usage history"
    echo "• Session pattern data"  
    echo "• Privacy settings and consent records"
    echo "• Coaching message cache"
    echo
    echo "Your Claude Code hooks will remain installed but will start collecting"
    echo "fresh data. You can also uninstall hooks entirely if desired."
    echo
    
    read -p "Are you sure you want to delete all data? (y/N): " confirm
    if [[ "$confirm" =~ ^[Yy]$ ]]; then
        read -p "This cannot be undone. Type 'DELETE' to confirm: " double_confirm
        if [ "$double_confirm" = "DELETE" ]; then
            rm -rf "$GINKO_DIR"
            echo "✅ All Ginko data deleted."
            echo "   Hooks remain installed but will start fresh."
        else
            echo "❌ Deletion cancelled."
        fi
    else
        echo "❌ Deletion cancelled."
    fi
}

# Main command processing
case "${1:-status}" in
    "status"|"")
        show_status
        ;;
    "enable-analytics")
        enable_analytics
        ;;
    "disable-analytics") 
        disable_analytics
        ;;
    "export-data"|"export")
        export_data
        ;;
    "delete-data"|"delete")
        delete_data
        ;;
    "help"|"-h"|"--help")
        echo "Ginko Privacy Management"
        echo
        echo "Usage: ginko-privacy [command]"
        echo
        echo "Commands:"
        echo "  status              Show current privacy settings (default)"
        echo "  enable-analytics    Enable anonymous data sharing"
        echo "  disable-analytics   Disable anonymous data sharing"
        echo "  export-data         Export all your data to archive"
        echo "  delete-data         Permanently delete all data"
        echo "  help                Show this help message"
        echo
        ;;
    *)
        echo "Unknown command: $1"
        echo "Run 'ginko-privacy help' for usage information."
        exit 1
        ;;
esac