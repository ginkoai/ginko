# Ginko Claude SDK - Rapport Features 🚀

## What's New in v0.2.0

The Ginko Claude SDK now includes **Rapport Continuity** - a revolutionary feature that creates emotional connection and session continuity in AI collaboration.

### 🎯 Dynamic Statusline Messages

Your Claude Code statusline now shows context-aware, personalized messages that evolve with your session:

- **Personal Greetings**: "Good afternoon, Chris! Ready to build something amazing?"
- **Progress Celebrations**: "🔥 On fire! 9 tasks crushed!"
- **Error Support**: "💪 Working through challenges - you've got this!"
- **Achievement Unlocks**: "🏆 Achievement: Flow State Master!"

### 🔄 Seamless Session Continuity

When you return to Claude Code, the SessionAgent:
1. Automatically resumes from your last handoff
2. Remembers what you accomplished
3. Maintains emotional context
4. Continues with the same momentum

### 📊 Emotional Intelligence

The rapport system tracks:
- **Task Completion Rate** - Adjusts tone based on progress
- **Error Patterns** - Provides encouragement during debugging
- **Session Duration** - Celebrates milestones and flow states
- **Work Phases** - Adapts messages to current activity

## Setup

### 1. Install the SDK

```bash
npm install @ginko/claude-sdk
```

### 2. Configure Claude Code

Add to your `.mcp.json`:

```json
{
  "mcpServers": {
    "ginko-mcp": {
      "command": "npx",
      "args": ["ginko-mcp-client"],
      "env": {
        "GINKO_ENABLE_RAPPORT": "true"
      }
    }
  },
  "statusLine": {
    "command": "node",
    "args": ["node_modules/@ginko/claude-sdk/dist/statusline/ginko-statusline.cjs"],
    "refreshInterval": 3000
  }
}
```

### 3. Start Coding!

The SessionAgent automatically:
- Starts when Claude Code launches
- Updates statusline every 3 seconds
- Saves handoffs every 5 minutes
- Resumes from previous sessions

## How It Works

### Rapport Context Structure

```typescript
interface RapportContext {
  personalizedGreeting: string;    // "Good morning, Chris!"
  sharedHistory: string;           // "We completed 5 tasks together"
  emotionalTone: 'welcoming' | 'focused' | 'excited' | 'determined' | 'celebratory';
  contextualMood: {
    situation: 'challenging' | 'progressing_well' | 'steady_work';
    urgency: 'normal' | 'high' | 'critical';
  };
}
```

### Message Examples

**Starting a Session:**
- 👋 "Good morning, Chris! Ready to build something amazing?"
- 🚀 "Welcome back! Let's continue where we left off"

**During Work:**
- 🎯 "Deep focus mode - 3 tasks completed"
- 💪 "Persistence pays off - debugging error 2"
- 🔥 "On fire! 7 tasks crushed!"

**Achievements:**
- 🏆 "Achievement: Flow State Master!"
- 🎉 "Milestone reached! 10 completed!"

## Customization

### Disable Rapport

Set environment variable:
```bash
export GINKO_DISABLE_RAPPORT=true
```

### Custom Greeting Name

```bash
export GINKO_USER_NAME="Your Name"
```

### Adjust Update Frequency

In `.mcp.json`:
```json
"refreshInterval": 5000  // 5 seconds instead of 3
```

## Architecture

```
SessionAgent (TypeScript)
    ↓
Writes rapport status to temp file
    ↓
Statusline Reader (CommonJS)
    ↓
Claude Code Status Bar
```

The system uses a temp file (`/tmp/ginko-status.json`) for IPC between the TypeScript SessionAgent and the CommonJS statusline reader.

## Testing

Run the rapport demo:
```bash
npm run demo:rapport good-progress
npm run demo:rapport challenging
npm run demo:rapport steady
```

Test the integration:
```bash
node examples/test-session-rapport.js
```

## Troubleshooting

**No statusline updates:**
- Check temp directory permissions
- Verify SessionAgent is running: `ps aux | grep session-agent`
- Check logs: `cat /tmp/ginko-*.log`

**Wrong emotional tone:**
- SessionAgent adapts based on actual progress
- Complete more tasks to see "excited" messages
- Errors trigger "determined" support

**Session not resuming:**
- Handoffs are stored via MCP server
- Check API key configuration
- Verify network connectivity

## Future Enhancements

- **Voice Synthesis**: Hear encouragement during long sessions
- **Team Rapport**: Shared emotional context across team
- **AI Personality**: Choose coaching style (cheerleader, mentor, peer)
- **Rapport Analytics**: Track which messages boost productivity

## Contributing

We'd love your feedback on rapport features! 

- Report issues: [GitHub Issues](https://github.com/ginko/claude-sdk/issues)
- Share success stories: chris@ginko.ai
- Suggest new emotional tones or messages

## License

MIT - Build amazing things with emotional intelligence! 🚀