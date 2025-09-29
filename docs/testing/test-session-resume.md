---
type: testing
status: current
updated: 2025-01-31
tags: [session-resume, testing, validation, handoff]
related: [TESTING.md, session-handoff.md, MCP_CLIENT_INTEGRATION.md]
priority: medium
audience: [developer, ai-agent]
estimated-read: 5-min
dependencies: [session-handoff.md]
---

# Test Session Resume

## For New Claude Code Session

**Session ID to Resume**: `session-20250730-contextmcp-dev`

### Quick Test Commands

1. **Start new Claude Code session** in different terminal:
   ```bash
   cd /Users/cnorton/Development/contextMCP
   claude
   ```

2. **Verify contextMCP tools are available**:
   - Look for tools: `capture_session`, `resume_session`, `list_sessions`
   - If not available, check that remote server is running on port 3031

3. **Test list_sessions**:
   - Use `list_sessions` tool to see available sessions
   - Should show our created session: `session-20250730-contextmcp-dev`

4. **Test resume_session**:
   - Use `resume_session` with session ID: `session-20250730-contextmcp-dev`
   - Should return detailed context and resumption prompt

### Expected Session Data

The session contains:
- **Task**: Testing and validation of session handoff features after full implementation
- **Working Directory**: `/Users/cnorton/Development/contextMCP`
- **Focus Areas**: Session handoff testing, database validation, MCP integration
- **Recent Files**: session-handoff.ts, database.ts, remote-server.ts, schema.sql
- **Context Quality**: 9.2/10
- **Productivity Score**: 8.5/10

### Success Criteria

✅ `list_sessions` shows the session  
✅ `resume_session` returns comprehensive context  
✅ Generated resumption prompt captures current state  
✅ Context preservation demonstrates session handoff effectiveness

### Server Status Check

```bash
# Verify server is running
ps aux | grep remote-server
curl http://localhost:3031/health
```

If server isn't running:
```bash
node dist/remote-server.js
```