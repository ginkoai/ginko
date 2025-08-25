# @ginkoai/claude-sdk

AI collaboration SDK with emotional intelligence and rapport continuity for Claude Code.

## 🚀 Quick Start

```bash
npm install @ginkoai/claude-sdk
```

## ✨ Features

### Rapport-Enabled Sessions
- **Personalized Greetings**: "Good afternoon, Chris! Ready to build something amazing?"
- **Progress Celebrations**: "🔥 On fire! 9 tasks crushed!"
- **Error Support**: "💪 Working through challenges - you've got this!"
- **Achievement Unlocks**: "🏆 Achievement: Flow State Master!"

### Emotional Intelligence
The SDK tracks your collaboration patterns and adapts its tone:
- `excited` - When making great progress
- `focused` - Deep work mode
- `determined` - Pushing through challenges
- `celebratory` - Milestone achievements

### Session Continuity
- Automatic handoff generation every 5 minutes
- Resume from previous sessions with full context
- Maintains emotional momentum across sessions

## 📦 What's Included

### Agents
- **SessionAgent** - Manages rapport, handoffs, and statusline updates
- **CoachingAgent** - Provides real-time collaboration guidance
- **BaseAgent** - Foundation for custom agents

### Gamification
- Achievement system with XP tracking
- Skill progression monitoring
- Flow state detection

## 🔧 Configuration

### Basic Setup

```javascript
import { SessionAgent } from '@ginkoai/claude-sdk';

const agent = new SessionAgent({
  apiKey: process.env.GINKO_API_KEY,
  serverUrl: 'https://mcp.ginko.ai',
  userId: 'your-user-id'
});
```

### Claude Code Integration

Add to `.mcp.json`:

```json
{
  "statusLine": {
    "command": "node",
    "args": ["node_modules/@ginkoai/claude-sdk/dist/statusline/ginko-statusline.cjs"],
    "refreshInterval": 3000
  }
}
```

## 🎯 Usage Examples

### Resume Previous Session

```javascript
await agent.resumeFromHandoff('previous-session-id');
```

### Generate Handoff

```javascript
const handoff = await agent.generateHandoff();
console.log('Session saved:', handoff.sessionId);
```

### Track Progress

```javascript
agent.memory.context.completedTasks.push('Implemented auth');
await agent.updateStatusline(); // Updates Claude Code statusline
```

## 📊 Rapport Context

The SDK generates rich emotional context:

```typescript
{
  personalizedGreeting: "Good morning, Chris!",
  sharedHistory: "We completed 5 tasks together",
  emotionalTone: "excited",
  contextualMood: {
    situation: "progressing_well",
    urgency: "normal"
  }
}
```

## 🛠 Development

```bash
# Build the SDK
npm run build

# Run tests
npm test

# Try rapport demo
npm run demo:rapport good-progress
```

## 📝 License

MIT

## 🤝 Contributing

We'd love your feedback! Report issues or suggest features at [GitHub](https://github.com/ginko/claude-sdk).

---

Built with ❤️ by Ginko AI - Making AI collaboration more human.