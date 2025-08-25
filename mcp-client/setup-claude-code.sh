#!/bin/bash

# ContextMCP Client - Claude Code Integration Setup
set -e

echo "🎯 Setting up ContextMCP Client for Claude Code..."

# Get current directory for project context
PROJECT_DIR=$(pwd)
PROJECT_NAME=$(basename "$PROJECT_DIR")

echo "📁 Project: $PROJECT_NAME"
echo "📍 Directory: $PROJECT_DIR"

# Check if .mcp.json exists
MCP_CONFIG="$PROJECT_DIR/.mcp.json"

if [ -f "$MCP_CONFIG" ]; then
    echo "🔍 Found existing .mcp.json file"
    
    # Create backup
    cp "$MCP_CONFIG" "$MCP_CONFIG.backup.$(date +%s)"
    echo "💾 Created backup of existing .mcp.json"
    
    # Check if contextmcp-client is already configured
    if grep -q "contextmcp-client" "$MCP_CONFIG"; then
        echo "✅ ContextMCP Client already configured"
        
        # Show current configuration
        echo "📄 Current configuration:"
        python3 -c "
import json
with open('$MCP_CONFIG', 'r') as f:
    config = json.load(f)
    if 'contextmcp-client' in config:
        print(json.dumps(config['contextmcp-client'], indent=2))
"
    else
        echo "➕ Adding ContextMCP Client to existing configuration..."
        
        # Add contextmcp-client to existing config
        python3 -c "
import json

with open('$MCP_CONFIG', 'r') as f:
    config = json.load(f)

config['contextmcp-client'] = {
    'command': 'contextmcp-client',
    'args': []
}

with open('$MCP_CONFIG', 'w') as f:
    json.dump(config, f, indent=2)

print('✅ Added ContextMCP Client to .mcp.json')
"
    fi
else
    echo "📝 Creating new .mcp.json configuration..."
    cat > "$MCP_CONFIG" << 'EOF'
{
  "contextmcp-client": {
    "command": "contextmcp-client",
    "args": []
  }
}
EOF
    echo "✅ Created .mcp.json with ContextMCP Client configuration"
fi

# Check/create user configuration
CONFIG_DIR="$HOME/.contextmcp"
CONFIG_FILE="$CONFIG_DIR/config.json"

echo "🔧 Checking user configuration..."

if [ ! -d "$CONFIG_DIR" ]; then
    mkdir -p "$CONFIG_DIR"
    echo "📁 Created configuration directory: $CONFIG_DIR"
fi

if [ ! -f "$CONFIG_FILE" ]; then
    echo "📝 Creating user configuration file..."
    cat > "$CONFIG_FILE" << EOF
{
  "serverUrl": "https://mcp.ginko.ai",
  "apiKey": "",
  "userId": "${USER:-current-user}",
  "teamId": "default-team",
  "projectId": "$PROJECT_NAME",
  "timeout": 30000
}
EOF
    echo "✅ Created configuration file: $CONFIG_FILE"
else
    echo "✅ Configuration file exists: $CONFIG_FILE"
    
    # Update project ID to match current directory
    python3 -c "
import json

try:
    with open('$CONFIG_FILE', 'r') as f:
        config = json.load(f)
    
    config['projectId'] = '$PROJECT_NAME'
    
    with open('$CONFIG_FILE', 'w') as f:
        json.dump(config, f, indent=2)
    
    print('✅ Updated projectId to: $PROJECT_NAME')
except Exception as e:
    print('⚠️ Could not update projectId:', str(e))
"
fi

# Test MCP client availability
echo "🧪 Testing ContextMCP Client installation..."

if command -v contextmcp-client &> /dev/null; then
    echo "✅ ContextMCP Client is installed and available"
    
    # Try to get version info (this will fail gracefully if server is not running)
    echo "🔍 Testing client configuration..."
    timeout 5s contextmcp-client --help 2>/dev/null || echo "ℹ️  Client installed but server may not be running"
    
else
    echo "❌ ContextMCP Client not found in PATH"
    echo "   Please install with: npm install -g @contextmcp/mcp-client"
    exit 1
fi

echo ""
echo "🎉 Claude Code integration setup complete!"
echo ""
echo "📋 Configuration Summary:"
echo "   MCP Config: $MCP_CONFIG"
echo "   User Config: $CONFIG_FILE" 
echo "   Project: $PROJECT_NAME"
echo ""
echo "🚀 Getting Started:"
echo "1. Edit your configuration: $CONFIG_FILE"
echo "2. Set serverUrl, apiKey, and team details"
echo "3. Start Claude Code in this directory"
echo "4. Try these tools:"
echo "   - list_sessions"
echo "   - capture_session currentTask=\"Your current work\""
echo "   - resume_session sessionId=\"session-id-here\""
echo ""
echo "🔧 Configuration Template:"
echo "   serverUrl: Your ContextMCP server URL"
echo "   apiKey: Your authentication key (if required)"
echo "   userId: Your user identifier"
echo "   teamId: Your team identifier"
echo "   projectId: $PROJECT_NAME (auto-set)"
echo ""
echo "📚 Documentation: https://github.com/contextmcp/contextmcp"