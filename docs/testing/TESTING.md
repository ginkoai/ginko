---
type: testing
status: current
updated: 2025-01-31
tags: [testing, mcp-server, integration, validation]
related: [test-session-resume.md, MCP_CLIENT_INTEGRATION.md, session-handoff.md]
priority: high
audience: [developer, ai-agent]
estimated-read: 10-min
dependencies: [MCP_CLIENT_INTEGRATION.md]
---

# Testing the contextMCP Server

## Quick Start

1. **Build the server**:
   ```bash
   npm run build
   ```

2. **Test the server manually**:
   ```bash
   npm run dev
   ```

3. **Test with Claude Code**:
   Configure the MCP server in your Claude Code settings and test the tools.

## Available Tools

### 1. `get_project_overview`
Get a high-level overview of project structure and key files.

**Parameters:**
- `path` (optional): Project root path

**Example usage in Claude Code:**
```
Can you give me an overview of this project structure?
```

### 2. `find_relevant_code` 
Find code files relevant to a specific task or query.

**Parameters:**
- `query` (required): Search query or task description
- `file_types` (optional): Array of file extensions to focus on

**Example usage in Claude Code:**
```
Find code related to user authentication
```

### 3. `get_file_context`
Get contextual information about a specific file including dependencies.

**Parameters:**
- `file_path` (required): Path to the file
- `include_dependencies` (optional): Include dependency information (default: true)

**Example usage in Claude Code:**
```
Show me the context for src/components/UserController.ts
```

### 4. `get_recent_changes`
Get information about recent changes in the project (requires git).

**Parameters:**
- `since` (optional): Time period (default: "1 day")

**Example usage in Claude Code:**
```
What has changed in the last week?
```

## Testing Strategy

### Manual Testing
Test each tool individually by running the server and sending MCP requests.

### Integration Testing with Claude Code
1. Configure the MCP server in Claude Code settings
2. Start a new Claude Code session in the test-project directory
3. Try natural language requests that should trigger the tools
4. Verify the responses are helpful and accurate

### Test Scenarios

#### Scenario 1: New Developer Onboarding
- Request project overview
- Ask about specific files and their dependencies
- Look for authentication-related code
- Check recent changes

#### Scenario 2: Bug Investigation
- Search for error handling patterns
- Find files related to a specific bug report
- Get context on suspicious files
- Review recent commits

#### Scenario 3: Feature Development
- Find similar existing implementations
- Identify where to add new functionality
- Check dependencies and imports
- Review project structure

## Expected Benefits

- **Faster Context Switching**: Quickly understand different parts of the codebase
- **Reduced Redundant Work**: Know what's already been implemented
- **Better Code Navigation**: Find relevant files without manual searching
- **Historical Awareness**: Understand recent changes and their impact

## Troubleshooting

### Common Issues
1. **TypeScript errors**: Run `npm run typecheck` to identify issues
2. **Missing dependencies**: Run `npm install` 
3. **Git commands failing**: Ensure you're in a git repository
4. **File access errors**: Check file permissions and paths

### Debug Mode
Set environment variable for verbose logging:
```bash
DEBUG=context-mcp npm run dev
```