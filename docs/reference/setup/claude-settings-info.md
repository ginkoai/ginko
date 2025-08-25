---
type: setup
status: current
updated: 2025-01-31
tags: [claude-settings, safety, backup, configuration]
related: [team-claude-setup.md, MCP_CLIENT_INTEGRATION.md]
priority: medium
audience: [developer, ai-agent]
estimated-read: 5-min
dependencies: [none]
---

# Claude Settings Safety Guide

## 📁 Files Created

### Backup Files
- **Original Settings**: `~/.claude/settings.json`
- **Backup Created**: `~/.claude/settings.json.backup`

### Recovery Scripts
- **Revert Script**: `./revert-claude-settings.sh`

## 🔧 Usage

### To Revert Settings (Emergency Recovery)
```bash
cd /Users/cnorton/Development/contextMCP
./revert-claude-settings.sh
```

### Manual Revert (if script fails)
```bash
# Quick restore command
cp ~/.claude/settings.json.backup ~/.claude/settings.json

# Then restart Claude Code
```

### Check Current Settings
```bash
cat ~/.claude/settings.json
```

### Verify Backup Exists
```bash
ls -la ~/.claude/settings.json*
```

## ⚠️ Important Notes

1. **Always restart Claude Code** after changing settings
2. **The backup is automatic** - created when you first ran the contextMCP setup
3. **The revert script is safe** - it creates another backup before reverting
4. **Keep this directory** - it contains your recovery tools

## 🛟 Emergency Recovery

If Claude Code stops working entirely:

1. Run the revert script: `./revert-claude-settings.sh`
2. Restart Claude Code
3. If still broken, check the pre-revert backups created by the script

## 📞 Current Configuration

Your current settings include the contextMCP server:
```json
{
  "mcpServers": {
    "context-mcp": {
      "command": "node",
      "args": ["dist/index.js"],
      "cwd": "/Users/cnorton/Development/contextMCP"
    }
  }
}
```

This should allow Claude Code to connect to your contextMCP server for enhanced context management.