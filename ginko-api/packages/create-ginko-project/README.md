# create-ginko-project

Interactive installer for Ginko AI context management projects.

## Usage

### Interactive Mode (Default)
```bash
npx create-ginko-project my-project
cd my-project
code .  # Open in Claude Code
```

### Non-Interactive Mode (CI/Automation)
```bash
npx create-ginko-project my-project \
  --non-interactive \
  --template=basic \
  --description="My Ginko project" \
  --api-key=cmcp_your_api_key_here

# Or use environment variables
export GINKO_API_KEY="cmcp_your_api_key_here"
export GINKO_TEMPLATE="react"
export GINKO_DESCRIPTION="My React project"
npx create-ginko-project my-project --non-interactive
```

## What it does

1. **Creates project structure** with your chosen template (React, Node.js, Library, or Basic)
2. **Guides you through Ginko signup** at https://app.ginko.ai/auth/login
3. **Configures MCP client** with your API key
4. **Tests the connection** to Ginko servers
5. **Provides next steps** for using Ginko AI features

## Templates

- **Basic**: Just Ginko configuration and README
- **React**: Vite + React + Ginko setup  
- **Node.js**: Modern Node.js project with Ginko
- **Library**: Package template with Ginko integration

## Features Created

- `package.json` with appropriate scripts
- `.mcp.json` with Ginko configuration
- `README.md` with usage instructions
- Template-specific files (components, entry points, etc.)
- `.gitignore` with sensible defaults

## End-to-End User Journey

The installer validates the complete Ginko workflow:

1. **Account Creation**: https://app.ginko.ai/auth/login
2. **API Key Generation**: Automatic `cmcp_` key creation
3. **MCP Configuration**: `.mcp.json` with production endpoints
4. **Connection Testing**: Validates API connectivity
5. **Usage Guidance**: Shows Claude Code commands

## Requirements

- Node.js 18+
- Internet connection for Ginko signup
- Claude Code (for using Ginko features)

## Development

```bash
# Test locally
cd packages/create-ginko-project
npm install
node bin/create-ginko-project.js test-project --dry-run
```

## Architecture

This installer creates the bridge between:
- **Users**: Developers wanting AI context management
- **Ginko Dashboard**: Account/API key management
- **MCP Server**: Production context management
- **Claude Code**: AI assistant with context

Built with:
- ES modules for modern Node.js
- Inquirer for interactive prompts
- Chalk for colorful output
- Ora for loading spinners
- fs-extra for file operations