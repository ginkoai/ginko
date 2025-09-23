#!/bin/bash
# @fileType: script
# @status: current
# @updated: 2025-09-22
# @tags: [installer, hooks, claude-code, coaching, statusline, intelligence]
# @related: [ginko-privacy.sh, statusline-reader.sh, preview-status-line.sh]
# @priority: critical
# @complexity: high
# @dependencies: [bash, jq, curl, claude-code]
# @description: Main installer for Ginko statusline intelligence and Claude Code hooks
#
# Ginko Statusline Intelligence Installer
# Configures Claude Code hooks for real-time coaching

set -e  # Exit on error

echo "🚀 === Ginko Statusline Intelligence Installer === 🚀"
echo
echo "Transform your Claude Code experience with intelligent, real-time coaching!"
echo
echo "✨ What you'll get:"
echo "  🎯 Smart pattern recognition - detects when you're in flow, stuck, or exploring"
echo "  💬 Contextual coaching messages - helpful hints at just the right moment"
echo "  ⚡ Real-time feedback - updates within milliseconds of your actions"
echo "  🔒 Complete privacy - all processing happens locally on your machine"
echo
echo "Examples of intelligent coaching:"
echo "  🚀 \"Great momentum! Keep exploring\" (when rapidly using diverse tools)"
echo "  🔄 \"Repeating Bash. Try something different?\" (when stuck in a pattern)"
echo "  💭 \"Quiet moment. What's next?\" (during idle periods)"
echo "  🎯 \"Focused work. Stay on target!\" (when working intensively)"
echo

# Configuration
CLAUDE_HOOKS_DIR="$HOME/.claude/hooks"
CLAUDE_SETTINGS="$HOME/.claude/settings.json"
GINKO_DIR="$HOME/.ginko"
HOOKS_SOURCE="$(dirname "$0")/hooks"

# Backup function
backup_file() {
    local file="$1"
    if [ -f "$file" ]; then
        cp "$file" "$file.backup.$(date +%Y%m%d_%H%M%S)"
        echo "✅ Backed up $file"
    fi
}

# Technical details and consent
echo "📋 Technical Details"
echo "━━━━━━━━━━━━━━━━━━━━"
echo "This feature uses Claude Code's official 'hooks' system to monitor your"
echo "tool usage patterns. Here's exactly what happens:"
echo
echo "How it works:"
echo "  ✅ Monitors tool usage (Read, Write, Bash, etc.) for patterns"
echo "  ✅ Generates helpful coaching messages based on your workflow"
echo "  ✅ Stores pattern data locally in $GINKO_DIR"
echo "  ✅ Updates your statusline with contextual guidance"
echo
echo "Privacy & Data Usage:"
echo "  🏠 **LOCAL PROCESSING ONLY** - All coaching happens on your machine"
echo "  🚫 **NO DATA TRANSMISSION** - Nothing sent to Ginko servers"  
echo "  👁️  **MINIMAL DATA** - Only tool names and timing, never file contents"
echo "  🛡️  **READ-ONLY** - Never modifies your files or projects"
echo "  📁 **TRANSPARENT** - Hook scripts stored in $CLAUDE_HOOKS_DIR (inspect anytime)"
echo
echo "The hooks system runs small shell scripts when you use Claude Code tools."
echo "All pattern analysis and coaching generation happens entirely on your machine."
echo

read -p "🎉 Ready to enable intelligent statusline coaching? (y/N): " consent
if [[ ! "$consent" =~ ^[Yy]$ ]]; then
    echo
    echo "We understand! Hooks are a big decision. 🤗"
    echo
    echo "Unfortunately, Ginko's intelligent coaching requires hooks to work."
    echo "Without them, there wouldn't be any real-time pattern detection or"
    echo "coaching messages - you'd miss the core Ginko experience."
    echo
    echo "💡 Take your time to consider it. When you're ready:"
    echo "   • Re-run this installer anytime: ./install-statusline-intelligence.sh"
    echo "   • Read more about hooks at: https://docs.anthropic.com/en/docs/claude-code/hooks"
    echo "   • Check out our privacy design: privacy-permissions-design.md"
    echo
    echo "We'd love to help you be more productive when you're ready! 🚀"
    echo "Thanks for considering Ginko."
    exit 0
fi

echo
echo "🤔 Optional: Help Improve Coaching for Everyone"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo
echo "Ginko can learn from anonymous usage patterns to improve coaching"
echo "quality for all users. This is completely separate from your local coaching."
echo
echo "If you opt in, we would occasionally collect:"
echo "  📊 Anonymous pattern summaries (e.g., \"flow state lasted 15 minutes\")"
echo "  🎯 Coaching effectiveness data (which messages help most)"
echo "  📈 Aggregate productivity indicators"
echo
echo "We would NEVER collect:"
echo "  ❌ File names, paths, or contents"
echo "  ❌ Personal identifiers or project details"
echo "  ❌ Individual commands or specific activities"
echo
echo "Benefits of sharing:"
echo "  🚀 Help build better coaching algorithms"
echo "  🎯 Contribute to evidence-based productivity insights"
echo "  📊 Access to anonymous community insights (future feature)"
echo

read -p "📊 Enable anonymous analytics to help improve coaching? (y/N): " analytics_consent
if [[ "$analytics_consent" =~ ^[Yy]$ ]]; then
    ENABLE_ANALYTICS=true
    echo "✅ Anonymous analytics enabled - thank you for helping improve Ginko!"
else
    ENABLE_ANALYTICS=false
    echo "✅ Local-only coaching enabled - you can enable analytics later if desired"
fi

echo
echo "🔧 Starting installation..."

# 1. Create directories
echo "📁 Creating directories..."
mkdir -p "$CLAUDE_HOOKS_DIR"
mkdir -p "$GINKO_DIR"

# 2. Backup existing files
echo "💾 Creating backups..."
backup_file "$CLAUDE_SETTINGS"
if [ -f "$CLAUDE_HOOKS_DIR/post_tool_use.sh" ]; then
    backup_file "$CLAUDE_HOOKS_DIR/post_tool_use.sh"
fi

# 3. Install hook script
echo "🎣 Installing hook script..."
if [ -f "$HOOKS_SOURCE/post_tool_use_fixed.sh" ]; then
    cp "$HOOKS_SOURCE/post_tool_use_fixed.sh" "$CLAUDE_HOOKS_DIR/post_tool_use.sh"
    chmod +x "$CLAUDE_HOOKS_DIR/post_tool_use.sh"
    echo "✅ Hook script installed"
else
    echo "❌ Hook script not found at $HOOKS_SOURCE/post_tool_use_fixed.sh"
    echo "Please ensure you're running this from the Ginko directory"
    exit 1
fi

# 4. Configure Claude Code settings
echo "⚙️  Configuring Claude Code settings..."

# Create or update settings.json
if [ -f "$CLAUDE_SETTINGS" ]; then
    # Merge with existing settings
    jq '. + {
        "hooks": {
            "PostToolUse": [
                {
                    "matcher": "*",
                    "hooks": [
                        {
                            "type": "command",
                            "command": "'$CLAUDE_HOOKS_DIR'/post_tool_use.sh"
                        }
                    ]
                }
            ]
        }
    }' "$CLAUDE_SETTINGS" > "$CLAUDE_SETTINGS.tmp"
    mv "$CLAUDE_SETTINGS.tmp" "$CLAUDE_SETTINGS"
else
    # Create new settings file
    cat > "$CLAUDE_SETTINGS" <<EOF
{
  "hooks": {
    "PostToolUse": [
      {
        "matcher": "*",
        "hooks": [
          {
            "type": "command",
            "command": "$CLAUDE_HOOKS_DIR/post_tool_use.sh"
          }
        ]
      }
    ]
  }
}
EOF
fi

echo "✅ Claude Code settings updated"

# 5. Save privacy preferences
echo "💾 Saving privacy preferences..."
cat > "$GINKO_DIR/privacy_settings.json" <<EOF
{
  "local_coaching_enabled": true,
  "anonymous_analytics_enabled": $ENABLE_ANALYTICS,
  "consent_date": "$(date -Iseconds)",
  "version": "1.0"
}
EOF
echo "✅ Privacy preferences saved"

# 6. Install command-line utilities
echo "📊 Installing command-line utilities..."

# Install statusline reader
if [ -f "$(dirname "$0")/statusline-reader.sh" ]; then
    mkdir -p "$HOME/.local/bin"
    cp "$(dirname "$0")/statusline-reader.sh" "$HOME/.local/bin/ginko-status"
    chmod +x "$HOME/.local/bin/ginko-status"
    echo "✅ Statusline reader installed: ginko-status"
else
    echo "⚠️  Statusline reader not found"
fi

# Install privacy utility
if [ -f "$(dirname "$0")/ginko-privacy.sh" ]; then
    cp "$(dirname "$0")/ginko-privacy.sh" "$HOME/.local/bin/ginko-privacy"
    chmod +x "$HOME/.local/bin/ginko-privacy"
    echo "✅ Privacy manager installed: ginko-privacy"
else
    echo "⚠️  Privacy utility not found"
fi

if [ -d "$HOME/.local/bin" ]; then
    echo "💡 Add $HOME/.local/bin to your PATH to use these commands globally"
fi

# 7. Test installation
echo "🧪 Testing installation..."

# Check if hook file exists and is executable
if [ -x "$CLAUDE_HOOKS_DIR/post_tool_use.sh" ]; then
    echo "✅ Hook script is executable"
else
    echo "❌ Hook script installation failed"
    exit 1
fi

# Check settings file
if [ -f "$CLAUDE_SETTINGS" ] && jq -e '.hooks.PostToolUse' "$CLAUDE_SETTINGS" >/dev/null 2>&1; then
    echo "✅ Settings file configured correctly"
else
    echo "❌ Settings file configuration failed"
    exit 1
fi

echo
echo "🎉 Installation Complete!"
echo
echo "Next Steps:"
echo "━━━━━━━━━━"
echo "1. 🔄 Restart Claude Code completely (required for hooks to activate)"
echo "2. 🎯 In your new Claude Code session, run: /hooks"
echo "3. ✅ Verify hooks are active (should see confirmation message)"
echo "4. 🚀 Start using Claude Code - coaching will appear automatically!"
echo
echo "Commands Available:"
echo "• Check coaching: ginko-status"
echo "• Detailed view: ginko-status details" 
echo "• Reset data: ginko-status reset"
echo "• Privacy settings: ginko-privacy"
echo "• Enable analytics: ginko-privacy enable-analytics"
echo "• Disable analytics: ginko-privacy disable-analytics"
echo
echo "Files Created:"
echo "• Hook script: $CLAUDE_HOOKS_DIR/post_tool_use.sh"
echo "• Claude Code settings: $CLAUDE_SETTINGS"
echo "• Privacy preferences: $GINKO_DIR/privacy_settings.json"
echo "• Data directory: $GINKO_DIR"
echo
echo "Your Privacy Settings:"
if [ "$ENABLE_ANALYTICS" = "true" ]; then
    echo "• 🏠 Local coaching: ENABLED"
    echo "• 📊 Anonymous analytics: ENABLED"
    echo "  └─ Helps improve coaching for everyone"
    echo "  └─ Can be disabled anytime: ginko-privacy disable-analytics"
else
    echo "• 🏠 Local coaching: ENABLED" 
    echo "• 📊 Anonymous analytics: DISABLED"
    echo "  └─ All data stays on your machine"
    echo "  └─ Can be enabled later: ginko-privacy enable-analytics"
fi
echo
echo "If you experience issues:"
echo "• Check that Claude Code restarted completely"
echo "• Run /hooks command to activate hooks"
echo "• Contact support with logs from $GINKO_DIR"
echo
echo "To uninstall:"
echo "• Remove hook configuration from $CLAUDE_SETTINGS"
echo "• Delete $CLAUDE_HOOKS_DIR/post_tool_use.sh"
echo "• Delete $GINKO_DIR (optional - contains your data)"
echo
echo "Happy coding with intelligent statusline coaching! 🚀"