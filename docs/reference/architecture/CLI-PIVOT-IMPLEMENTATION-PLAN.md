# CLI Pivot Implementation Plan

## Executive Summary

We're pivoting Ginko from an MCP-specific tool to a universal CLI that works with any AI. Since we're pre-launch with only friendly alpha users, we can move aggressively without backward compatibility concerns.

## Timeline: 5 Days Total

### Day 1: Rip and Replace

#### Morning: Decision & Communication
- [ ] Email alpha users: "Big improvement coming, 2-day downtime"
- [ ] Archive current MCP approach (branch: `archive/mcp-version`)
- [ ] Create fresh `main` with CLI structure
- [ ] Update README: "Under construction, back Tuesday"

#### Afternoon: CLI Scaffold
```bash
# New structure from scratch
mkdir -p packages/cli
cd packages/cli
npm init -y
npm install commander chalk ora inquirer

# Create basic CLI
mkdir -p src/commands
touch src/index.js
touch src/commands/{start,handoff,context,compact}.js
```

### Day 2: Core Implementation

#### Morning: Essential Commands
```javascript
// Just the essentials for alpha
- [ ] ginko init     - Set up .ginko/ structure
- [ ] ginko start    - Load last handoff
- [ ] ginko handoff  - Save session
- [ ] ginko status   - Show context state
```

#### Afternoon: Git Integration
```javascript
// Git-native from day one
- [ ] Direct file operations (no database)
- [ ] .ginko/sessions/ management
- [ ] Git commit integration
- [ ] Simple, reliable, fast
```

### Day 3: Convert MCP to REST

#### Morning: API Transformation
```javascript
// Current MCP tools → REST endpoints
- [ ] /api/context    - Get/set context
- [ ] /api/handoffs   - Store/retrieve handoffs
- [ ] /api/analytics  - Session metrics
- [ ] /api/coaching   - AI insights

// Simple Express server
- [ ] Vercel serverless functions
- [ ] Same database, new interface
- [ ] API key authentication
```

#### Afternoon: CLI-API Integration
```javascript
// Optional enhancement
if (config.api.enabled) {
  await postToAPI('/handoffs', handoffContent);
  console.log('✅ Synced to cloud');
}
```

### Day 4: Polish & Test

#### Morning: AI Adapters
```javascript
// Just two for alpha
- [ ] Claude (markdown, colors, emojis)
- [ ] GPT-4 (JSON, structured)
- [ ] Universal fallback
```

#### Afternoon: Alpha Testing
- [ ] Test with friendly users
- [ ] Fix critical bugs only
- [ ] Update documentation
- [ ] Create quick tutorial

### Day 5: Alpha Launch

#### Morning: Package & Deploy
```bash
# Publish new CLI
npm publish @ginkoai/cli@0.1.0-alpha

# Update instructions
"Install: npm install -g @ginkoai/cli"
"Start: ginko init"
```

#### Afternoon: Support & Iterate
- [ ] Monitor alpha user feedback
- [ ] Hot fixes as needed
- [ ] Plan next iteration

## Technical Decisions

### What We're Cutting (for now)
1. ❌ **MCP protocol support** - REST is simpler
2. ❌ **Migration tools** - No legacy to migrate
3. ❌ **Backward compatibility** - Start fresh
4. ❌ **Complex AI detection** - Manual config is fine
5. ❌ **15 commands** - Start with 5 core ones
6. ❌ **Perfect polish** - Alpha means rough edges OK

### What We're Keeping
1. ✅ **Git-native storage** - Core innovation
2. ✅ **CLI interface** - Universal access
3. ✅ **Optional API** - For analytics/coaching
4. ✅ **AI adaptability** - Different output formats
5. ✅ **Free/paid model** - CLI free, API premium

## New File Structure (Simplified)

```
ginko/
├── packages/
│   ├── cli/                    # The new CLI package
│   │   ├── src/
│   │   │   ├── commands/       # CLI commands
│   │   │   ├── git/           # Git operations
│   │   │   └── api/           # Optional API client
│   │   └── package.json
│   └── api/                    # REST API (was MCP)
│       ├── routes/
│       └── package.json
├── .ginko/                     # Git-native storage
│   └── sessions/
└── docs/
    └── CLI.md                  # New documentation
```

## Alpha User Communication

```markdown
Subject: Ginko Evolution - Big Improvements Coming!

Hi Alpha Testers,

TL;DR: We're pivoting from MCP to CLI. Service disruption Monday-Tuesday.
New install will be: npm install -g @ginkoai/cli

Why the change:
- Works with ANY AI (not just Claude)
- Simpler, faster, more reliable
- No complex configuration
- Still git-native (your handoffs are safe)

What's changing:
- Installation method (npm global package)
- Commands (ginko start instead of MCP tools)
- Universal compatibility

What's NOT changing:
- Git-native handoffs
- Core workflow
- Your data (all preserved)

Timeline:
- Monday: Taking down MCP server
- Tuesday: CLI alpha release
- Wednesday: Back online, better than ever

Thanks for your patience. This positions Ginko for massive adoption.

Questions? Hit reply.

Chris
```

## Success Metrics

### Day 5 targets:
- [ ] 5 alpha users successfully using CLI
- [ ] Core workflow operational
- [ ] No data loss from transition
- [ ] Clear path to beta

### Week 2 targets:
- [ ] 20 active users
- [ ] Bug fixes from alpha feedback
- [ ] Beta release ready
- [ ] Documentation complete

## CLI Command Examples

### Core Commands (work offline)
```bash
ginko init                          # Initialize project
ginko start [session-id]            # Start/resume session
ginko handoff [message]             # Create handoff
ginko status                        # Show context status
ginko context [add|remove|show]    # Manage context
ginko compact [--preserve=file]    # Reduce context
ginko vibecheck [concern]          # Recalibration
```

### Git Integration
```bash
ginko commit [message]             # Commit with handoff
ginko ship [branch]                # Create PR
ginko archive                      # Archive session
```

### Team Features (require API)
```bash
ginko sync                        # Sync to server
ginko team status                 # Team activity
ginko coach                       # Get coaching
```

## AI Adaptation Strategy

### Output Formats
```bash
$ ginko start --format=json        # For GPT-4
$ ginko start --format=human       # For Claude
$ ginko start --format=minimal     # For Llama
```

### Model Detection
```javascript
function detectAI() {
  if (process.env.MCP_SERVER) return 'claude';
  if (process.env.OPENAI_API_KEY) return 'gpt4';
  if (process.env.GOOGLE_AI_KEY) return 'gemini';
  return 'universal';
}
```

## The Beautiful Simplicity

By not having legacy users, we can:

1. **Build it right** from the start
2. **Test with friendlies** who expect changes
3. **Iterate quickly** based on real usage
4. **Launch strong** when we go public

**The bottom line:** Since we're pre-launch, we can make this transition in 5 days instead of 31. Alpha users are our advantage - they signed up to test something new. Let's give them something amazing.

## Next Steps

1. **Monday morning**: Start fresh implementation
2. **Friday**: Alpha CLI ready
3. **No backward compatibility needed**
4. **No migration complexity**
5. **Pure forward momentum**

## References

- [ADR-020: CLI-First Architecture](./ADR-020-cli-first-pivot.md)
- [Original 31-day plan](#detailed-implementation-plan) (archived)
- [Git-Native Philosophy](/docs/GIT-NATIVE-HANDOFFS.md)