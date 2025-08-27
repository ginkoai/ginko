# CLI Pivot Implementation Plan (Privacy-First Edition)

## Executive Summary

We're pivoting Ginko from an MCP-specific tool to a universal CLI that works with any AI. **Critical update**: All session data stays local in git. No proprietary code ever leaves the machine. Only anonymous metrics sync to servers (opt-in).

## Core Principles

1. **Privacy First** - No code, files, or proprietary data leaves the machine
2. **Git Native** - All data stored in `.ginko/` directory, tracked by git  
3. **Offline First** - Full functionality without internet connection
4. **Optional Analytics** - Anonymous metrics only, explicit opt-in
5. **Zero Trust** - No API keys required for core functionality

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

### Day 2: Core Implementation (Privacy-First)

#### Morning: Essential Commands (Local-Only)
```javascript
// Everything stays on machine
- [ ] ginko init     - Create .ginko/ structure (git-tracked)
- [ ] ginko start    - Load from .ginko/sessions/ (local file)
- [ ] ginko handoff  - Save to .ginko/sessions/ (local file)
- [ ] ginko status   - Analyze local git state only
- [ ] ginko context  - Read local files only (no server)
```

#### Afternoon: Git-Native Storage
```javascript
// Pure git operations, zero network
- [ ] Session storage in .ginko/sessions/
- [ ] Pattern library in .ginko/patterns/
- [ ] Best practices in .ginko/best-practices/
- [ ] All git-tracked and versioned
- [ ] No database, no API, just files
```

### Day 3: Optional Analytics API (Privacy-Preserving)

#### Morning: Anonymous Metrics Only
```javascript
// NO CODE SENT TO SERVER - Only anonymous metrics
- [ ] /api/metrics    - Session duration, command usage (anonymous)
- [ ] /api/patterns   - Aggregated patterns (no code)
- [ ] /api/coaching   - Insights based on metrics only
- [ ] /api/health     - Service status check

// Privacy-first design
- [ ] No file paths sent
- [ ] No code snippets sent
- [ ] No commit messages sent
- [ ] Only statistical data
```

#### Afternoon: Opt-in Configuration
```javascript
// Explicit user consent required
ginko config set analytics.enabled false  // Default: disabled
ginko config set analytics.anonymous true // Always anonymous

// When enabled, sends only:
{
  "duration": 45,
  "commands": ["start", "handoff"],
  "context_size": 40,
  "pattern": "debugging"
  // NO identifying information
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

## New File Structure (Privacy-First)

```
ginko/
├── packages/
│   ├── cli/                    # The new CLI package
│   │   ├── src/
│   │   │   ├── commands/       # CLI commands (all local)
│   │   │   ├── git/           # Git operations (local only)
│   │   │   ├── analytics/    # Optional metrics (anonymous)
│   │   │   └── patterns/     # Local pattern detection
│   │   └── package.json
│   └── api/                    # Analytics API (optional)
│       ├── routes/
│       │   ├── metrics.ts    # Anonymous metrics only
│       │   └── health.ts     # Service status
│       └── package.json
└── .ginko/                     # Git-native storage (ALL LOCAL)
    ├── sessions/               # Session handoffs (git-tracked)
    ├── patterns/               # Discovered patterns (local)
    ├── best-practices/         # Team standards (git-shared)
    ├── context/                # Context rules (local)
    └── config.json             # User preferences (local)
```

## Alpha User Communication

```markdown
Subject: Ginko Evolution - Privacy-First CLI Coming!

Hi Alpha Testers,

TL;DR: Pivoting to privacy-first CLI. NO code ever leaves your machine.
New install: npm install -g @ginkoai/cli

BIG NEWS - Complete Privacy:
- Your code NEVER leaves your machine
- All handoffs stay in local git
- No proprietary data sent to servers
- Optional anonymous metrics only (opt-in)
- Works 100% offline

Why this matters:
- Enterprise ready (no compliance issues)
- Zero trust required
- Works with ANY AI (Claude, GPT, Gemini, etc.)
- Faster (no network latency)
- Your IP stays yours

What's changing:
- CLI instead of MCP (simpler, universal)
- Local-first storage (git-native)
- Optional analytics (you control)

What's NOT changing:
- Git-native philosophy
- Core workflow
- Your existing handoffs (all preserved)

Timeline:
- Monday: Begin implementation
- Tuesday: Core CLI ready
- Wednesday: Alpha release
- Privacy-first from day one!

This positions Ginko for massive enterprise adoption.
No security questionnaires will block us!

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

## Privacy Guarantees

### What NEVER Leaves Your Machine
- ❌ Source code files
- ❌ File contents
- ❌ File paths or names
- ❌ Commit messages
- ❌ Variable/function names  
- ❌ API keys or secrets
- ❌ Session handoff content
- ❌ Error messages with code
- ❌ Any proprietary information

### What Can Be Shared (Opt-in Only)
- ✅ Command usage frequency
- ✅ Session duration
- ✅ Context size percentage
- ✅ Pattern types (not content)
- ✅ Anonymous metrics
- ✅ Performance statistics
- ✅ Success/failure rates
- ✅ Language detection (generic)

### Core Commands (work 100% offline)
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