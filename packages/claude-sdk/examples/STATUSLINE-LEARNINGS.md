# Statusline Rapport Integration - Learnings

## Key Discoveries

### 1. Architecture Pattern
- **Separation of Concerns**: Agent writes to temp file, reader consumes and formats
- **JSON State File**: `/tmp/ginko-rapport-status.json` as communication channel
- **Polling Frequency**: 3s for updates, 500ms for reading provides smooth UX

### 2. Rapport Context Structure
```javascript
{
  emotionalTone: 'excited|focused|determined|celebratory|welcoming',
  urgency: 'normal|high|critical',
  sessionMinutes: number,
  completedTasks: number,
  errorCount: number,
  phase: 'working|debugging|achievement|task-complete'
}
```

### 3. Message Personalization
- Time-based greetings (morning/afternoon/evening)
- User name integration for personal touch
- Progress-aware messaging (task count, error handling)
- Achievement celebrations with special formatting

### 4. Visual Formatting
- **Brand Color**: `\x1b[38;5;141m` (Periwinkle blue) with bold
- **Emoji Selection**: Maps to emotional tone for quick visual recognition
- **Session Duration**: Shows after 5 minutes to avoid clutter

## Implementation Strategy

### Phase 1: Basic Integration
1. SessionAgent writes rapport context to temp file on state changes
2. Statusline reader polls and formats messages
3. Claude Code displays via `.mcp.json` statusline config

### Phase 2: Event-Driven Updates
1. SessionAgent triggers on:
   - Task completion
   - Error detection
   - Achievement unlock
   - Session milestones
2. Debounce updates to avoid statusline thrashing

### Phase 3: Persistence & Learning
1. Track message effectiveness (which messages correlate with productivity)
2. Learn user preferences (gamification level, message frequency)
3. Store rapport history for session continuity

## Technical Considerations

### File System
- Use OS temp directory for cross-platform compatibility
- Clean up temp files on graceful shutdown
- Handle missing files gracefully with defaults

### Performance
- Minimal file I/O (single JSON file)
- Efficient polling with early exit on no changes
- Lightweight message generation (no heavy computation)

### Error Handling
- Fallback messages for all error cases
- Silent failures in production (no console spam)
- Graceful degradation to basic statusline

## Integration Points

### 1. SessionAgent → Statusline
```javascript
// In SessionAgent.updateStatus()
const rapportContext = await this.generateRapportContext();
const statusFile = path.join(os.tmpdir(), 'ginko-status.json');
fs.writeFileSync(statusFile, JSON.stringify({
  message: this.formatMessage(rapportContext),
  rapportContext,
  timestamp: Date.now()
}));
```

### 2. Statusline Reader Configuration
```json
// In .mcp.json
{
  "statusLine": {
    "command": "node",
    "args": ["path/to/statusline-reader.cjs"],
    "refreshInterval": 3000
  }
}
```

### 3. Auto-Start Integration
```javascript
// In Claude Code initialization
if (config.ginko?.autoStart) {
  const sessionAgent = new SessionAgent();
  await sessionAgent.resumeFromLastSession();
  sessionAgent.startStatuslineUpdates();
}
```

## Next Steps

1. **Production Integration**
   - Merge rapport test code into production SessionAgent
   - Update ginko-statusline.cjs with rapport reader logic
   - Test with real Claude Code sessions

2. **MCP Tool Triggers**
   - Hook MCP tool calls to update statusline immediately
   - Show tool activity (e.g., "Loading best practices...")
   - Celebrate completions (e.g., "Handoff saved!")

3. **User Preferences**
   - Add settings for gamification level
   - Allow custom message templates
   - Support quiet/focus modes

## Success Metrics

- **Engagement**: Users feel more connected to their AI collaborator
- **Productivity**: Emotional support during challenging debugging
- **Continuity**: Seamless session resumption with context
- **Delight**: Achievement celebrations create positive reinforcement

## Code Quality Notes

- Use CommonJS (.cjs) for Node.js scripts in ESM packages
- Keep statusline messages concise (< 80 chars)
- Test with actual Claude Code integration, not just console
- Profile memory usage for long-running sessions