# ContextMCP Bug Tracking

## Active Bugs

### BUG-004: Foreign Key Constraint Violations in Session Storage (MEDIUM)
**Reported**: 2025-08-01  
**Reporter**: Chris Norton  
**Priority**: Medium  
**Status**: Open  

#### Problem Description
Session capture works but database storage fails due to foreign key constraints. The normalized team and project UUIDs don't exist in the `teams` and `projects` tables, causing constraint violations.

#### Evidence
**Error Messages**:
```
error: insert or update on table "user_sessions" violates foreign key constraint "user_sessions_team_id_fkey"
detail: Key (team_id)=(00000000-0000-0000-0000-000000000001) is not present in table "teams".

error: insert or update on table "session_handoffs" violates foreign key constraint "session_handoffs_team_id_fkey"  
detail: Key (team_id)=(00000000-0000-0000-0000-000000000001) is not present in table "teams".
```

#### Technical Details
- **UUID Conversion**: ✅ Working perfectly
- **Session Capture**: ✅ Succeeds with local fallback storage
- **Database Storage**: ❌ Fails due to missing foreign key references
- **Impact**: Session works but analytics/persistence incomplete

#### Root Cause Analysis
The database schema expects team and project IDs to reference existing records in `teams` and `projects` tables, but:
1. Default UUIDs (`00000000-0000-0000-0000-000000000001/002`) don't exist in these tables
2. No mechanism to create default team/project records automatically
3. Foreign key constraints are enforced strictly

#### Proposed Solutions

**Option 1: Create Default Records on Server Start**
```sql
INSERT INTO teams (id, name, slug) VALUES 
('00000000-0000-0000-0000-000000000001', 'Default Team', 'default-team');
INSERT INTO projects (id, name, slug, team_id) VALUES 
('00000000-0000-0000-0000-000000000002', 'Default Project', 'default-project', '00000000-0000-0000-0000-000000000001');
```

**Option 2: Make Foreign Keys Optional**
```sql
ALTER TABLE user_sessions ALTER COLUMN team_id DROP NOT NULL;
ALTER TABLE session_handoffs ALTER COLUMN team_id DROP NOT NULL;
```

**Option 3: Upsert Teams/Projects on Demand**
```javascript
// Create team/project if doesn't exist before using
await this.ensureTeamExists(normalizedTeamId, 'Default Team');
await this.ensureProjectExists(normalizedProjectId, 'Default Project', normalizedTeamId);
```

#### Impact
- **Functionality**: Low - session capture works with local fallback
- **Analytics**: Medium - missing database metrics and team collaboration features
- **Production Readiness**: Medium - affects PROD-003 testing completeness

#### Next Steps
1. **Implement Option 1**: Add default records creation on server startup
2. **Test database storage**: Verify sessions save to database properly
3. **Update PROD-003**: Include database persistence testing

### BUG-003: Invalid UUID Error in Session Capture (HIGH) ✅ **RESOLVED**
**Reported**: 2025-08-01  
**Reporter**: Chris Norton  
**Priority**: High  
**Status**: Open  

#### Problem Description
Session capture fails with PostgreSQL UUID validation error when trying to record handoff metrics. The system is attempting to use "default-team" as a UUID value, which is invalid.

#### Evidence
**Error Message**:
```
[SESSION] Could not record handoff metrics: error: invalid input syntax for type uuid: "default-team"
    at DatabaseManager.recordSessionHandoff (file:///Users/cnorton/Development/contextMCP/dist/database.js:463:9)
    at async RemoteMCPServer.captureSession (file:///Users/cnorton/Development/contextMCP/dist/remote-server.js:1115:17)
```

**PostgreSQL Error Details**:
- **Code**: 22P02 (invalid_text_representation)
- **Location**: uuid.c:137 in string_to_uuid routine
- **Parameter**: $4 = "default-team" (should be UUID format)

#### Technical Details
- **Function**: `DatabaseManager.recordSessionHandoff()`
- **Issue**: Using string "default-team" where UUID expected
- **Database**: PostgreSQL with strict UUID type checking
- **Impact**: Session capture partially works but handoff metrics fail

#### Root Cause Analysis
The `recordSessionHandoff` function is passing "default-team" as a team ID parameter where the database expects a proper UUID format (e.g., `123e4567-e89b-12d3-a456-426614174000`).

#### Impact
- **Session Capture**: Partially works but handoff tracking fails
- **Analytics**: Missing session handoff metrics in database
- **User Experience**: Session capture appears successful but data incomplete
- **PROD-003 Testing**: Could affect testing metrics and analysis

#### Proposed Solutions

**Option 1: Generate Proper UUID for Default Team**
```javascript
// Generate proper UUID for default team
const DEFAULT_TEAM_UUID = crypto.randomUUID();
// Or use consistent UUID: '00000000-0000-0000-0000-000000000001'
```

**Option 2: Handle String Team IDs**
```javascript
// Convert string to UUID or use nullable field
const teamId = isValidUUID(teamIdInput) ? teamIdInput : null;
```

**Option 3: Database Schema Update**
```sql
-- Make team_id nullable or change to TEXT type
ALTER TABLE session_handoffs ALTER COLUMN team_id DROP NOT NULL;
```

#### ✅ **RESOLVED** (2025-08-01)
**Fix Applied**: Added `normalizeToUUID()` function with proper UUID conversion
- `"default-team"` → `'00000000-0000-0000-0000-000000000001'`
- `"default-project"` → `'00000000-0000-0000-0000-000000000002'`
- Consistent hash-based UUID generation for other string IDs
- Applied to both `saveSession()` and `recordSessionHandoff()` functions

**Testing Results**: ✅ UUID conversion working perfectly
**Status**: **RESOLVED** - No more UUID format errors

### BUG-002: Claude Code Loses MCP Server Connection Mid-Session (HIGH)
**Reported**: 2025-08-01  
**Reporter**: Chris Norton  
**Priority**: High  
**Status**: Open  

#### Problem Description
Claude Code can lose connection to MCP server during extended sessions, even when MCP tools were working at session start. Tools become unavailable with "No such tool available" errors despite server running correctly.

#### Evidence
**Session Start** ✅ **MCP Tools Working**:
- Used contextMCP tools extensively for OAuth implementation
- Successfully captured sessions earlier in the session
- Tools like `get_best_practices`, `capture_session` working properly

**Mid-Session** ❌ **MCP Connection Lost**:
```
Error: No such tool available: get_best_practices
```
- Attempted to capture session to contextMCP server
- Tools not available despite server running on localhost:3001
- Connection appears to have been dropped silently

#### Technical Details
- **Server Status**: Confirmed running by user ("The server is already running")
- **Configuration**: contextMCP MCP tools were loaded and functional at session start
- **Connection Type**: MCP protocol connection via Claude Code
- **Failure Mode**: Silent disconnection without error notification

#### Impact
- **User Experience**: High - breaks session capture and context management
- **Testing**: Blocks PROD-003 testing of MCP integration
- **Reliability**: Users can't depend on MCP tools for extended sessions

#### Root Cause Analysis
**Potential Causes**:
1. **Session Timeout**: MCP connection may have timeout limits
2. **Process Management**: Similar to BUG-001 but at MCP protocol level
3. **Claude Code Internal**: Connection pooling or session management issues
4. **Network Issues**: Localhost connection drops (less likely)

#### Reproduction Steps
1. Start Claude Code session with contextMCP MCP server configured
2. Verify MCP tools work initially (successful early tool usage)
3. Continue extended development session (2+ hours)
4. Attempt to use MCP tools mid-session
5. Observe "No such tool available" errors

#### Impact on PROD-003 Testing
This bug directly affects our critical testing initiative:
- Cannot reliably capture test sessions to contextMCP server
- May impact user testing if MCP connection drops during evaluation
- Reduces confidence in production MCP integration reliability

#### Proposed Solutions

**Option 1: Connection Health Monitoring**
- Add MCP connection health checks in client sessions
- Implement automatic reconnection when connection drops
- Provide user notification when reconnection occurs

**Option 2: Session Persistence**
- Maintain MCP connection state across session lifecycle
- Add connection recovery mechanisms
- Implement graceful degradation when MCP unavailable

**Option 3: Robust Error Handling**
- Better error messages when MCP tools unavailable
- Fallback mechanisms for critical operations
- Clear user guidance on connection recovery

#### Workaround
- Restart Claude Code session to restore MCP connection
- Monitor MCP tool availability periodically in long sessions
- Use alternative methods for session capture when MCP unavailable

#### Next Steps
1. **Document Connection Pattern**: Track when/how MCP connections drop
2. **Test Connection Recovery**: Investigate if MCP tools can be restored mid-session
3. **Priority for PROD-003**: Include MCP connection reliability in testing framework
4. **User Documentation**: Add troubleshooting guide for MCP connection issues

### BUG-001: MCP Tools Disappear Mid-Session (CRITICAL)
**Reported**: 2025-01-31  
**Reporter**: Chris Norton  
**Priority**: Critical  
**Status**: Open  

#### Problem Description
MCP tools become unavailable during Claude Code sessions despite successful initialization. Tools work at session start but disappear mid-session without warning.

#### Evidence
**Session Start** ✅ **MCP Tools Working**:
```
⏺ context-mcp-remote - get_best_practices (MCP)(priority: "critical")
⏺ context-mcp-remote - get_project_overview (MCP)(path: "/Users/cnorton/Development/contextMCP")  
⏺ context-mcp-remote - suggest_best_practice (MCP)(scenario: "starting new development task")
```

**Mid-Session** ❌ **MCP Tools Missing**:
```
Error: No such tool available: mcp__context-mcp-remote__get_best_practices
Error: No such tool available: mcp__context-mcp-remote__list_sessions
```

#### Root Cause Analysis
**Multiple MCP Client Process Conflict**:
- Multiple `simple-remote-client.js` processes running simultaneously
- PIDs found: 21951 (12:01PM), 82670 (8:41AM), 15881 (long-running)
- Claude Code loses connection to original MCP client process
- New processes start but Claude Code doesn't reconnect

#### Technical Details
- **Server Status**: Running correctly (PID 74915, port 3031)
- **Configuration**: `.mcp.json` properly configured
- **Client Processes**: Multiple competing processes detected
- **Connection**: stdio transport loses connection mid-session

#### Impact
- **User Experience**: Critical - tools disappear without warning
- **Development Velocity**: High - breaks contextMCP core functionality
- **Trust**: Users lose confidence in tool reliability

#### Reproduction Steps
1. Start Claude Code session with contextMCP configured
2. Verify MCP tools work initially (get_best_practices, etc.)
3. Continue development session for extended period
4. Attempt to use MCP tools mid-session
5. Observe "No such tool available" errors

#### Proposed Solutions

**Option 1: Process Management**
- Kill competing MCP client processes before starting new ones
- Add process cleanup to client initialization
- Implement single-instance enforcement

**Option 2: Connection Recovery**
- Add connection health checks to MCP client  
- Implement automatic reconnection on failure
- Add heartbeat mechanism between Claude Code and client

**Option 3: Robust Client Architecture**
- Replace stdio transport with more reliable communication
- Add connection state monitoring
- Implement graceful failover between client instances

#### Workaround
Manual process cleanup:
```bash
ps aux | grep simple-remote-client | grep -v grep
kill [PIDs]  # Kill competing processes
# Restart Claude Code session
```

#### ✅ Fix Implemented (2025-01-31)
**Resolution**: Added process cleanup to `simple-remote-client.ts` constructor
- Automatically detects and kills competing MCP client processes on startup
- Uses `ps aux | grep simple-remote-client` to find existing processes
- Kills them with `execSync('kill [PIDs]')` before starting new instance
- Includes error handling for non-critical cleanup failures

**Testing Results**:
- ✅ Process cleanup working correctly
- ✅ Connection to contextMCP server restored
- ✅ `capture_session` tool working (session_1753977442104_e3acc3260fc8b03d created)
- ⚠️ `list_sessions` may have user ID matching issue (shows "No Sessions" after capture)

**Status**: **RESOLVED** - Core MCP tools connection issue fixed
**Follow-up**: Minor data persistence issue identified (BUG-002 candidate)

#### Next Steps ✅ **COMPLETED**
1. ✅ Implement process cleanup in MCP client startup
2. 🔄 Add connection monitoring and recovery (if needed in future)
3. ✅ Test with extended development sessions
4. 🔄 Document reliable setup procedures (if issues persist)

---

## Resolved Bugs

(None yet)

---

## Bug Report Template

### BUG-XXX: [Brief Description] ([Priority])
**Reported**: YYYY-MM-DD  
**Reporter**: [Name]  
**Priority**: [Critical|High|Medium|Low]  
**Status**: [Open|In Progress|Testing|Resolved|Closed]  

#### Problem Description
[Clear description of the issue]

#### Evidence
[Screenshots, logs, error messages]

#### Root Cause Analysis
[Technical investigation results]

#### Impact
[Effect on users, development, business]

#### Reproduction Steps
1. [Step 1]
2. [Step 2]
3. [Expected vs Actual behavior]

#### Proposed Solutions
[Potential fixes with pros/cons]

#### Workaround
[Temporary solution if available]

#### Next Steps
[Action items to resolve]