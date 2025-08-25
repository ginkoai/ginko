#!/bin/bash

# Copy handoff context to clipboard for pasting into Claude.ai

EMAIL=$(git config user.email)
SAFE_USERNAME=$(echo "$EMAIL" | sed 's/@/-at-/g' | sed 's/\./-/g')
HANDOFF_PATH=".ginko/sessions/$SAFE_USERNAME/session-handoff.md"

if [ ! -f "$HANDOFF_PATH" ]; then
    echo "❌ No handoff found"
    exit 1
fi

# Create context with clear markers
{
    echo "=== GINKO SESSION CONTEXT ==="
    echo "Generated: $(date)"
    echo "Project: $(basename $(pwd))"
    echo "Branch: $(git branch --show-current)"
    echo ""
    echo "=== SESSION HANDOFF ==="
    cat "$HANDOFF_PATH"
    echo ""
    echo "=== RECENT CHANGES ==="
    git diff --stat HEAD~1
    echo ""
    echo "=== END CONTEXT ==="
} | tee /tmp/context.txt

# Copy to clipboard based on OS
if command -v clip.exe &> /dev/null; then
    # WSL2/Windows
    cat /tmp/context.txt | clip.exe
    echo ""
    echo "✅ Context copied to Windows clipboard!"
elif command -v pbcopy &> /dev/null; then
    # macOS
    cat /tmp/context.txt | pbcopy
    echo ""
    echo "✅ Context copied to macOS clipboard!"
elif command -v xclip &> /dev/null; then
    # Linux with X11
    cat /tmp/context.txt | xclip -selection clipboard
    echo ""
    echo "✅ Context copied to clipboard!"
else
    echo ""
    echo "📋 Copy the above context manually"
fi

echo "📝 Paste into Claude.ai to continue your session"