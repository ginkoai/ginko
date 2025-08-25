#!/bin/bash

# Ginko - Open Session Handoff in Default Editor
# This script opens the current handoff in the user's preferred editor

# Get the user's email-based directory
EMAIL=$(git config user.email)
SAFE_USERNAME=$(echo "$EMAIL" | sed 's/@/-at-/g' | sed 's/\./-/g')
HANDOFF_PATH=".ginko/sessions/$SAFE_USERNAME/session-handoff.md"

# Check if handoff exists
if [ ! -f "$HANDOFF_PATH" ]; then
    echo "❌ No handoff found at $HANDOFF_PATH"
    echo "Creating initial handoff..."
    mkdir -p ".ginko/sessions/$SAFE_USERNAME"
    echo "# Session Handoff" > "$HANDOFF_PATH"
fi

# Detect the user's preferred editor
if command -v code &> /dev/null; then
    # VSCode
    echo "📝 Opening handoff in VSCode..."
    code "$HANDOFF_PATH"
elif command -v subl &> /dev/null; then
    # Sublime Text
    echo "📝 Opening handoff in Sublime Text..."
    subl "$HANDOFF_PATH"
elif command -v atom &> /dev/null; then
    # Atom
    echo "📝 Opening handoff in Atom..."
    atom "$HANDOFF_PATH"
elif command -v vim &> /dev/null; then
    # Vim
    echo "📝 Opening handoff in Vim..."
    vim "$HANDOFF_PATH"
elif command -v nano &> /dev/null; then
    # Nano
    echo "📝 Opening handoff in Nano..."
    nano "$HANDOFF_PATH"
else
    # Fallback to system default
    echo "📝 Opening handoff in system default editor..."
    if [[ "$OSTYPE" == "darwin"* ]]; then
        # macOS
        open "$HANDOFF_PATH"
    elif [[ "$OSTYPE" == "linux-gnu"* ]]; then
        # Linux
        xdg-open "$HANDOFF_PATH"
    elif [[ "$OSTYPE" == "msys" || "$OSTYPE" == "cygwin" ]]; then
        # Windows (Git Bash)
        start "$HANDOFF_PATH"
    else
        echo "⚠️  Could not detect editor. Please open manually:"
        echo "   $HANDOFF_PATH"
    fi
fi

echo ""
echo "📍 Handoff location: $HANDOFF_PATH"
echo "💡 Tip: Use 'ginko handoff' to open this anytime"