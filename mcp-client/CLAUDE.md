# MCP Client Development Guide - CLI Tools & NPM Package

## Overview
This directory contains the **Ginko MCP Client** - a TypeScript CLI tool and NPM package for connecting Claude Code to the Ginko MCP server.

**Purpose**: Enable Claude Code to access Ginko's context management and collaboration tools directly from development environment.

## Architecture Patterns

### Core Design Principles
- **NPM Package Distribution**: Installable via `npm install` or direct tarball
- **Claude Code Integration**: Uses `.mcp.json` configuration for Claude Code
- **Remote MCP Server**: Connects to production https://mcp.ginko.ai
- **TypeScript CLI**: Built with TypeScript for type safety and maintainability

### Key Files & Structure
```
mcp-client/
├── src/
│   ├── client.ts          # Main MCP client implementation
│   ├── config.ts          # Configuration management
│   ├── index.ts           # CLI entry point
│   └── logger.ts          # Logging utilities
├── dist/                  # Compiled JavaScript output
├── package.json           # NPM package configuration
├── install.sh             # Installation script
└── setup-claude-code.sh  # Claude Code configuration script
```

## Development Patterns

### 1. MCP Client Implementation
```typescript
// src/client.ts
import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { StdioClientTransport } from '@modelcontextprotocol/sdk/client/stdio.js';

export class GinkoMCPClient {
  private client: Client;
  
  async connect() {
    // Connection logic to MCP server
  }
  
  async callTool(name: string, arguments: any) {
    // Tool execution via MCP protocol
  }
}
```

### 2. Configuration Management
```typescript
// src/config.ts
export interface MCPConfig {
  serverUrl: string;
  apiKey?: string;
  timeout?: number;
}

export function loadConfig(): MCPConfig {
  // Load from environment or config file
}
```

### 3. CLI Interface
```typescript
// src/index.ts
import { GinkoMCPClient } from './client.js';

async function main() {
  const client = new GinkoMCPClient();
  await client.connect();
  
  // Handle CLI commands
}
```

## Package Distribution

### NPM Package Structure
- **Name**: `ginko-mcp-client`
- **Version**: Semantic versioning (currently v0.6.0)
- **Entry point**: `dist/index.js`
- **TypeScript**: Compiled to JavaScript in `dist/`

### Build Process
```bash
# Compile TypeScript
npm run build

# Create package tarball
npm pack
# Output: ginko-mcp-client-0.6.0.tgz
```

### Installation Methods
```bash
# Via NPM (when published)
npm install ginko-mcp-client

# Via local tarball
npm install ./ginko-mcp-client-0.6.0.tgz

# Via install script
./install.sh
```

## Claude Code Integration

### MCP Configuration
The client creates a `.mcp.json` file for Claude Code:
```json
{
  "mcpServers": {
    "ginko": {
      "command": "node",
      "args": ["../mcp-client/dist/index.js"],
      "env": {
        "GINKO_API_KEY": "your-api-key"
      }
    }
  }
}
```

### Setup Process
1. **Build package**: `npm run build`
2. **Run setup script**: `./setup-claude-code.sh`
3. **Configure Claude Code**: Adds MCP server to settings
4. **Test connection**: Verify tools are available in Claude Code

## Testing & Debugging

### Development Testing
```bash
# Build the package
npm run build

# Test CLI directly
node dist/index.js

# Test MCP connection
node dist/index.js test-connection
```

### Production Integration Testing
⚠️ **Note**: Tests against production MCP server at https://mcp.ginko.ai

```bash
# Install and test full integration
./install.sh
./setup-claude-code.sh

# Verify in Claude Code
# Check that Ginko tools are available
```

### Debugging Tips
- **Connection issues**: Check API key and server URL
- **Tool execution**: Verify MCP server tools are responding
- **Claude Code integration**: Check `.mcp.json` configuration
- **Permissions**: Ensure proper file permissions on scripts

## Common Tasks

### Package Updates
1. **Bump version** in `package.json`
2. **Build package**: `npm run build`
3. **Create tarball**: `npm pack`
4. **Test installation** with new tarball

### Adding CLI Features
1. **Update `src/index.ts`** with new commands
2. **Add TypeScript types** in relevant files
3. **Build and test** functionality
4. **Update documentation**

### MCP Tool Integration
1. **Verify tools** via MCP server `api/tools/list`
2. **Test tool calls** via `api/tools/call`
3. **Update client** to handle new tool patterns
4. **Test in Claude Code**

## Integration Points

### With MCP Server
- **Tool discovery**: Connects to `api/tools/list`
- **Tool execution**: Calls `api/tools/call` with parameters
- **Authentication**: Uses API key for server authentication

### With Claude Code
- **Configuration**: Creates `.mcp.json` in Claude settings directory
- **Process management**: Runs as child process when Claude Code starts
- **Tool availability**: Makes Ginko tools available in Claude Code interface

## Deployment Notes

### Package Distribution
- **Build artifacts**: `dist/` directory with compiled JavaScript
- **Tarball creation**: `npm pack` for local distribution
- **Installation scripts**: `install.sh` and `setup-claude-code.sh`

### Environment Requirements
- **Node.js**: v18+ for MCP SDK compatibility
- **TypeScript**: For development (compiled to JavaScript for distribution)
- **MCP Server**: Production server at https://mcp.ginko.ai

---

**Quick Reference**:
- **Build**: `npm run build`
- **Package**: `npm pack`
- **Install**: `./install.sh`
- **Setup Claude Code**: `./setup-claude-code.sh`
- **Test connection**: `node dist/index.js test-connection`