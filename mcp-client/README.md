# ContextMCP Client

MCP client for ContextMCP session capture and resume functionality. This package provides the "magic moment" of seamless context handoff between AI sessions, preventing context rot and maintaining development continuity.

## Quick Start

### Installation

```bash
npm install -g @contextmcp/mcp-client
```

### Configuration

Create a configuration file at `~/.contextmcp/config.json`:

```json
{
  "serverUrl": "https://your-contextmcp-server.com",
  "apiKey": "your-api-key",
  "userId": "your-user-id",
  "teamId": "your-team-id",
  "projectId": "your-project-id"
}
```

Or use environment variables:

```bash
export CONTEXTMCP_SERVER_URL="https://your-contextmcp-server.com"
export CONTEXTMCP_API_KEY="your-api-key"
export CONTEXTMCP_USER_ID="your-user-id"
export CONTEXTMCP_TEAM_ID="your-team-id"
export CONTEXTMCP_PROJECT_ID="your-project-id"
```

### Claude Code Integration

Add to your Claude Code MCP configuration (`.mcp.json`):

```json
{
  "contextmcp-client": {
    "command": "contextmcp-client",
    "args": []
  }
}
```

## Usage

### Capture Session

When you're at a good stopping point and want to prevent context rot:

```
capture_session currentTask="Implementing user authentication system"
```

This captures:
- Current working context and files
- Conversation history and key decisions
- Open tasks and progress
- Technical challenges and solutions
- Recent commands and development state

### Resume Session

Start a fresh Claude Code session and resume your work:

```
list_sessions
```

Then resume with:

```
resume_session sessionId="session_1234567890_abcdef12"
```

### View Analytics

Track your productivity and session effectiveness:

```
get_dashboard_metrics days=7
```

## Features

### 🎯 Smart Context Capture
- Automatically analyzes your working context
- Preserves conversation history and key decisions
- Captures development state and progress
- Records technical challenges and solutions

### 🔄 Seamless Resumption
- Generates comprehensive resumption prompts
- Maintains context quality across sessions
- Preserves task continuity and focus areas
- Reduces ramp-up time in new sessions

### 📊 Analytics & Insights
- Track session quality and effectiveness
- Monitor productivity patterns
- Identify context rot prevention success
- Team collaboration metrics

### 🔒 Security & Privacy
- API key authentication
- Secure data transmission
- Configurable data retention
- Team-level access controls

## Architecture

The client connects to a remote ContextMCP server that provides:

1. **Session Storage**: Persistent session context with database backing
2. **Context Analysis**: Intelligent analysis of development state
3. **Team Collaboration**: Shared context across team members
4. **Analytics**: Productivity and effectiveness tracking

## Configuration Options

### Config File (`~/.contextmcp/config.json`)

```json
{
  "serverUrl": "https://api.contextmcp.com",
  "apiKey": "your-api-key",
  "userId": "developer@company.com",
  "teamId": "engineering-team",
  "projectId": "main-product",
  "timeout": 30000
}
```

### Environment Variables

- `CONTEXTMCP_SERVER_URL`: Remote server URL
- `CONTEXTMCP_API_KEY`: Authentication API key
- `CONTEXTMCP_USER_ID`: Your user identifier
- `CONTEXTMCP_TEAM_ID`: Team identifier
- `CONTEXTMCP_PROJECT_ID`: Project identifier
- `CONTEXTMCP_TIMEOUT`: Request timeout in milliseconds
- `CONTEXTMCP_DEBUG`: Enable debug logging

## Development

### Building

```bash
npm run build
```

### Testing

```bash
npm test
```

### Local Development

```bash
npm run dev
```

## Troubleshooting

### Connection Issues

1. Verify server URL is correct and accessible
2. Check API key authentication
3. Ensure network connectivity
4. Review server logs for errors

### Session Issues

1. Check session hasn't expired (24 hour default)
2. Verify user/team/project IDs match
3. Review session storage permissions
4. Check server disk space and database health

### Debug Mode

Enable detailed logging:

```bash
export CONTEXTMCP_DEBUG=true
```

## API Reference

### Tools

#### `capture_session`

Captures current session state for handoff.

**Parameters:**
- `currentTask` (required): Brief description of current work
- `preserveConversation` (optional): Whether to preserve conversation history (default: true)
- `compressionLevel` (optional): 'minimal', 'standard', or 'comprehensive' (default: 'standard')

#### `resume_session`

Resumes work from a previously captured session.

**Parameters:**
- `sessionId` (required): Session ID to resume from

#### `list_sessions`

Lists available sessions that can be resumed.

**Parameters:**
- `limit` (optional): Maximum number of sessions to return (default: 10)

#### `get_dashboard_metrics`

Gets productivity and effectiveness metrics.

**Parameters:**
- `days` (optional): Number of days to analyze (default: 7)
- `userId` (optional): User ID to analyze (defaults to current user)

## License

MIT

## Support

For issues and support, please visit our [GitHub repository](https://github.com/contextmcp/contextmcp).