#!/bin/bash

# ContextMCP Client Installation Script
set -e

echo "🚀 Installing ContextMCP Client..."

# Check if Node.js is installed
if ! command -v node &> /dev/null; then
    echo "❌ Node.js is required but not installed. Please install Node.js 18+ first."
    exit 1
fi

# Check Node.js version
NODE_VERSION=$(node --version | cut -d'v' -f2 | cut -d'.' -f1)
if [ "$NODE_VERSION" -lt 18 ]; then
    echo "❌ Node.js 18+ is required. Current version: $(node --version)"
    exit 1
fi

# Check if npm is installed
if ! command -v npm &> /dev/null; then
    echo "❌ npm is required but not installed."
    exit 1
fi

echo "✅ Node.js $(node --version) and npm $(npm --version) found"

# Install the package globally
echo "📦 Installing @contextmcp/mcp-client globally..."
npm install -g @contextmcp/mcp-client

# Create config directory
CONFIG_DIR="$HOME/.contextmcp"
mkdir -p "$CONFIG_DIR"

# Check if config file exists
CONFIG_FILE="$CONFIG_DIR/config.json"
if [ ! -f "$CONFIG_FILE" ]; then
    echo "📝 Creating example configuration file..."
    cat > "$CONFIG_FILE" << 'EOF'
{
  "serverUrl": "https://mcp.ginko.ai",
  "apiKey": "",
  "userId": "your-user-id",
  "teamId": "default-team",
  "projectId": "your-project-name",
  "timeout": 30000
}
EOF
    echo "📁 Configuration file created at: $CONFIG_FILE"
    echo "⚠️  Please edit this file with your actual server details and credentials."
else
    echo "✅ Configuration file already exists at: $CONFIG_FILE"
fi

# Check if Claude Code MCP config exists
CLAUDE_MCP_CONFIG="$PWD/.mcp.json"
if [ -f "$CLAUDE_MCP_CONFIG" ]; then
    echo "🔍 Found existing Claude Code MCP configuration"
    
    # Check if contextmcp-client is already configured
    if grep -q "contextmcp-client" "$CLAUDE_MCP_CONFIG"; then
        echo "✅ ContextMCP Client already configured in Claude Code"
    else
        echo "📝 Adding ContextMCP Client to Claude Code configuration..."
        
        # Create backup
        cp "$CLAUDE_MCP_CONFIG" "$CLAUDE_MCP_CONFIG.backup"
        
        # Add contextmcp-client to existing config
        python3 -c "
import json
import sys

try:
    with open('$CLAUDE_MCP_CONFIG', 'r') as f:
        config = json.load(f)
    
    if 'contextmcp-client' not in config:
        config['contextmcp-client'] = {
            'command': 'contextmcp-client',
            'args': []
        }
        
        with open('$CLAUDE_MCP_CONFIG', 'w') as f:
            json.dump(config, f, indent=2)
        
        print('✅ Added ContextMCP Client to existing .mcp.json')
    else:
        print('✅ ContextMCP Client already in .mcp.json')
        
except Exception as e:
    print('❌ Error updating .mcp.json:', str(e))
    sys.exit(1)
"
    fi
else
    echo "📝 Creating Claude Code MCP configuration..."
    cat > "$CLAUDE_MCP_CONFIG" << 'EOF'
{
  "contextmcp-client": {
    "command": "contextmcp-client",
    "args": []
  }
}
EOF
    echo "📁 Claude Code MCP configuration created at: $CLAUDE_MCP_CONFIG"
fi

echo ""
echo "🎉 ContextMCP Client installation complete!"
echo ""
echo "📋 Next Steps:"
echo "1. Edit configuration file: $CONFIG_FILE"
echo "2. Set your server URL, API key, and team/project details"
echo "3. Start Claude Code in this directory"
echo "4. Use 'capture_session' and 'resume_session' tools"
echo ""
echo "🔧 Configuration:"
echo "   Config file: $CONFIG_FILE"
echo "   Claude MCP:  $CLAUDE_MCP_CONFIG"
echo ""
echo "🚀 Test the installation:"
echo "   Start Claude Code and try: list_sessions"
echo ""
echo "📚 Documentation: https://github.com/contextmcp/contextmcp"