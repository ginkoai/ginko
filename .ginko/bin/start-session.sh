#!/bin/bash

# Ginko - Start Session with Git-Native Handoff
# This script loads the previous session handoff for context

# Get the user's email-based directory
EMAIL=$(git config user.email)
NAME=$(git config user.name)
SAFE_USERNAME=$(echo "$EMAIL" | sed 's/@/-at-/g' | sed 's/\./-/g')
HANDOFF_PATH=".ginko/sessions/$SAFE_USERNAME/session-handoff.md"

echo "🚀 Starting Ginko Session"
echo "================================"
echo ""

# Check if handoff exists
if [ ! -f "$HANDOFF_PATH" ]; then
    echo "📝 No previous handoff found. Starting fresh session."
    echo ""
    echo "💡 Tips:"
    echo "   - Use '/handoff generate' to create your first handoff"
    echo "   - Handoffs are saved to: $HANDOFF_PATH"
    echo "   - They're tracked in git for permanent history"
    echo ""
    echo "Ready to begin!"
    exit 0
fi

# Get handoff metadata
if [[ "$OSTYPE" == "darwin"* ]]; then
    MODIFIED=$(stat -f "%Sm" -t "%Y-%m-%d %H:%M" "$HANDOFF_PATH")
    SIZE=$(stat -f "%z" "$HANDOFF_PATH")
else
    MODIFIED=$(stat -c "%y" "$HANDOFF_PATH" | cut -d' ' -f1,2 | cut -d'.' -f1)
    SIZE=$(stat -c "%s" "$HANDOFF_PATH")
fi

SIZE_KB=$((SIZE / 1024))
LINES=$(wc -l < "$HANDOFF_PATH")

# Extract key information from handoff
SESSION_ID=$(grep "^**Session ID**:" "$HANDOFF_PATH" | cut -d':' -f2 | xargs)
BRANCH=$(grep "^**Branch**:" "$HANDOFF_PATH" | head -1 | cut -d':' -f2 | xargs)
DATE=$(grep "^**Date**:" "$HANDOFF_PATH" | cut -d':' -f2 | xargs)

echo "📋 Loading Previous Session Handoff"
echo "───────────────────────────────────"
echo "📅 Last Modified: $MODIFIED"
echo "🏷️  Session ID: ${SESSION_ID:-Unknown}"
echo "🌿 Branch: ${BRANCH:-$(git branch --show-current)}"
echo "📊 Size: ${SIZE_KB}KB ($LINES lines)"
echo ""

# Display the handoff content
echo "════════════════════════════════════════════════════════════════════"
cat "$HANDOFF_PATH"
echo "════════════════════════════════════════════════════════════════════"
echo ""

# Check git status for context
MODIFIED_FILES=$(git status --porcelain | wc -l | tr -d ' ')
if [ "$MODIFIED_FILES" -gt 0 ]; then
    echo "⚠️  Working Directory Status:"
    echo "   - $MODIFIED_FILES uncommitted changes"
    echo "   - Run 'git status' for details"
    echo ""
fi

# Provide session continuation hints
echo "✅ Session Context Loaded!"
echo ""
echo "📍 Quick Actions:"
echo "   • Review above handoff for context"
echo "   • Continue from 'Next Steps' section"
echo "   • Run '/status' to check current state"
echo "   • Use '/handoff generate' when done"
echo ""

# Check for todos or in-progress items
if grep -qE "In Progress|TODO|FIXME" "$HANDOFF_PATH" 2>/dev/null; then
    echo "📌 Found In-Progress Items:"
    grep -nE "In Progress|TODO|FIXME" "$HANDOFF_PATH" | head -5
    echo ""
fi

echo "🎯 Ready to continue where you left off!"