# ADR-020: Pivot to CLI-First Architecture

## Status
Proposed

## Date
2025-08-27

## Context

Ginko began as an MCP server for Claude Code context management but has evolved into something larger: a methodology and framework for human-AI pair programming. Our current identity crisis stems from being too narrowly positioned as "context management for Claude" when the real innovation is our git-native session management approach that could benefit all AI-assisted development.

### Current Pain Points
- Limited to Claude Code users only (MCP dependency)
- Complex installation and configuration 
- Difficult to explain value proposition
- Platform risk with Anthropic/MCP
- "Just some markdown templates" perception
- No clear monetization path at current scale

### Market Reality
- Developers expect core tools to be free
- AI landscape is fragmented (Claude, GPT, Gemini, Llama, etc.)
- Each IDE/AI has different integration methods
- Developers want tools that "just work" without complex setup
- Enterprise wants consistency and governance

### Key Insight
The git-native session management pattern is universally valuable, regardless of which AI or IDE is used. By pivoting to a CLI-first architecture, Ginko becomes a developer tool that enhances AI collaboration rather than an AI-specific plugin.

## Decision

We will pivot Ginko from an MCP-client package to a universal CLI tool that:

1. **Works with any AI** through consistent command-line interface
2. **Maintains git-native storage** as the core persistence layer
3. **Provides optional API services** for analytics and coaching
4. **Adapts output format** to different AI models' preferences
5. **Operates fully offline** with progressive enhancement when connected

The package will be renamed from `@ginkoai/mcp-client` to `@ginkoai/cli`.

## Consequences

### Positive
- **Universal adoption potential**: Works with any AI, any IDE
- **Simpler mental model**: CLI commands vs protocol abstractions  
- **Lower adoption friction**: `npm install -g @ginkoai/cli && ginko init`
- **Platform independence**: Not tied to MCP/Anthropic
- **Clear value proposition**: "Git for AI sessions"
- **Natural monetization**: Free CLI + paid team services
- **Better debugging**: Transparent command execution
- **Scriptable/composable**: Fits into existing workflows
- **Future-proof**: Survives AI platform changes

### Negative
- **Migration effort**: Existing MCP users need to switch
- **Feature parity**: Some MCP features need reimplementation
- **Re-education**: Users trained on MCP need new mental model
- **Brand confusion**: Short-term confusion during transition
- **Technical debt**: Maintaining dual systems during migration

### Neutral
- Dashboard and API services remain unchanged
- Git-native storage approach remains the same
- Core methodology and patterns unchanged
- Team features still require subscription

## Implementation Strategy

### Architecture Comparison

**Current (MCP-Focused):**
```
Claude Code → MCP Protocol → ginko-mcp server → Tools → Git/Files
                          ↘ Statusline hooks → Local state
```

**New (CLI-First):**
```
Any AI → Natural Language → CLI invocation → Ginko Core → Git/Files
                                          ↘ Optional API → Services
```

### Package Structure
```
@ginkoai/cli/
├── bin/
│   └── ginko                    # Main executable
├── lib/
│   ├── commands/               # Command implementations
│   │   ├── start.js           # Session initialization
│   │   ├── handoff.js         # Session capture
│   │   ├── context.js         # Context management
│   │   ├── compact.js         # Context reduction
│   │   ├── vibecheck.js       # Recalibration
│   │   ├── ship.js            # PR creation
│   │   └── coach.js           # AI coaching
│   ├── adapters/              # AI-specific adapters
│   │   ├── claude.js          # Claude optimizations
│   │   ├── gpt4.js            # GPT-4 formatting
│   │   ├── gemini.js          # Gemini XML output
│   │   └── universal.js       # Fallback adapter
│   ├── core/
│   │   ├── git-native.js      # Git operations
│   │   ├── session.js         # Session management
│   │   ├── patterns.js        # Pattern extraction
│   │   └── context-engine.js  # Context algorithms
│   └── api/
│       └── client.js           # Optional API client
├── templates/
│   ├── handoffs/              # Handoff templates
│   ├── instructions/          # Per-AI instructions
│   └── patterns/              # Common patterns
└── hooks/                     # Git/shell hooks
```

## Pre-Launch Advantage

Since we're pre-launch with only friendly alpha users, we can:
1. **Skip dual-mode entirely** - Go straight to CLI
2. **Repurpose MCP server** - Convert to REST API immediately
3. **No migration needed** - Alpha users expect changes
4. **Aggressive timeline** - Ship in 1 week, not 1 month

### Simplified Architecture

**Skip the transition, go straight to target:**
```
Any AI → CLI → Local Git Operations
            ↘ REST API (optional analytics)
```

## Business Model Evolution

**Before: Narrow MCP Tool**
- Free: Basic MCP tools
- Paid: Advanced features
- Market: Claude Code users only
- Value: "Better context management"

**After: Universal Developer Tool**
- Free: Complete CLI (all local operations)
- Paid: Team analytics, coaching, cloud sync
- Market: All developers using AI
- Value: "Professional AI pair programming"

## Success Metrics

1. **Adoption**: 10x increase in npm installs within 3 months
2. **Retention**: 40% weekly active usage after 1 month
3. **Universality**: Usage across 5+ different AI platforms
4. **Revenue**: 5% conversion to paid team features
5. **Community**: 1000+ GitHub stars within 6 months

## Risk Mitigation

1. **Platform Risk**: No longer dependent on MCP survival
2. **Competition Risk**: Harder for platforms to replicate git-native approach
3. **Adoption Risk**: Lower friction increases trial rate
4. **Technical Risk**: Simpler architecture reduces complexity
5. **Revenue Risk**: Broader market increases monetization potential

## References

- [CLI Implementation Plan](./CLI-PIVOT-IMPLEMENTATION-PLAN.md)
- [Git-Native Handoffs Documentation](/docs/GIT-NATIVE-HANDOFFS.md)
- [Original MCP Architecture](./ADR-014-mcp-server-consolidation-and-rationalization.md)