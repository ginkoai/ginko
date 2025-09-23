#!/bin/bash
# @fileType: script
# @status: current
# @updated: 2025-09-22
# @tags: [revert, backup, claude-settings, recovery, troubleshooting]
# @related: [install-statusline-intelligence.sh]
# @priority: high
# @complexity: low
# @dependencies: [bash, jq]
# @description: Reverts Claude Code settings to backup state for troubleshooting

# Revert Claude Code settings script
# This script restores the original Claude settings from backup

echo "🔄 Reverting Claude Code settings..."
echo "=================================================="

SETTINGS_FILE="$HOME/.claude/settings.json"
BACKUP_FILE="$HOME/.claude/settings.json.backup"

# Check if backup exists
if [ ! -f "$BACKUP_FILE" ]; then
    echo "❌ ERROR: Backup file not found at $BACKUP_FILE"
    echo "   Cannot revert settings - no backup available!"
    exit 1
fi

# Check if current settings file exists
if [ ! -f "$SETTINGS_FILE" ]; then
    echo "⚠️  WARNING: Current settings file not found at $SETTINGS_FILE"
    echo "   This is unusual but proceeding with restore..."
fi

# Show what we're about to do
echo "📍 Current settings file: $SETTINGS_FILE"
echo "📦 Backup file: $BACKUP_FILE"
echo ""

# Ask for confirmation
read -p "❓ Are you sure you want to revert to the backup? (y/N): " -n 1 -r
echo ""

if [[ $REPLY =~ ^[Yy]$ ]]; then
    # Create a backup of current state before reverting
    if [ -f "$SETTINGS_FILE" ]; then
        TIMESTAMP=$(date +"%Y%m%d_%H%M%S")
        cp "$SETTINGS_FILE" "$SETTINGS_FILE.pre-revert-$TIMESTAMP"
        echo "💾 Created backup of current settings: $SETTINGS_FILE.pre-revert-$TIMESTAMP"
    fi
    
    # Restore from backup
    cp "$BACKUP_FILE" "$SETTINGS_FILE"
    
    if [ $? -eq 0 ]; then
        echo "✅ SUCCESS: Settings reverted successfully!"
        echo "📋 Restored from: $BACKUP_FILE"
        echo "🔄 Please restart Claude Code for changes to take effect"
        echo ""
        echo "🗂️  Current settings contents:"
        echo "----------------------------------------"
        cat "$SETTINGS_FILE"
        echo "----------------------------------------"
    else
        echo "❌ ERROR: Failed to restore settings!"
        exit 1
    fi
else
    echo "🚫 Revert cancelled - no changes made"
    exit 0
fi

echo ""
echo "✨ Revert complete!"