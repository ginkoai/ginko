# Ginko

**"Nothing special, just quicker."** 🌿

A git-native workflow tool for AI-assisted development that transforms human intent into structured, reusable knowledge.

**Version**: 2.0.0
**Status**: Production Ready - Phase 1 Complete

---

## 🎯 Core Innovation

Ginko introduces the **Universal Reflection Pattern**: a single interface that transforms natural language intent into structured outputs across unlimited domains, stored in git-native `.ginko/` directories for seamless AI discovery.

**Imperative commands with structured output to predictable locations.**

This simple pattern solves four critical problems in AI-assisted development:
1. **Context Rot** - Sessions lose critical information
2. **Lost Knowledge** - Insights vanish between sessions
3. **Broken Rapport** - New sessions restart from scratch
4. **Team Friction** - Knowledge silos block collaboration

---

## 🚀 Quick Start

```bash
# Install
npm install -g @ginkoai/cli

# Initialize your project
cd your-project
ginko init

# Start working
ginko start

# Preserve your session
ginko handoff "completed auth refactor, next: test coverage"

# Next session picks up where you left off
ginko start
```

---

## 💡 How It Works

### AI-Agnostic Design

Ginko works with **any AI tool** (Claude Code, Cursor, GitHub Copilot, ChatGPT) through a git-native architecture:

1. **You give intent**: `ginko handoff "completed OAuth integration"`
2. **Ginko creates structure**: Markdown with frontmatter saved to `.ginko/sessions/`
3. **AI discovers automatically**: Next session, AI reads `.ginko/` files naturally
4. **Knowledge persists**: Git-tracked, team-shared, version-controlled

No MCP server. No special protocols. Just structured markdown in predictable locations.

### Core Commands

| Command | Purpose | Output Location |
|---------|---------|-----------------|
| `ginko init` | Initialize project | `.ginko/config.json` |
| `ginko start` | Begin/resume session | Displays context summary |
| `ginko handoff` | Save session insights | `.ginko/sessions/[user]/archive/` |
| `ginko context` | Manage knowledge modules | `.ginko/context/modules/` |
| `ginko capture` | Document decisions | `.ginko/captures/` |
| `ginko explore` | Problem space analysis | `.ginko/prd/` |
| `ginko plan` | Sprint planning | `.ginko/plans/` |
| `ginko ship` | PR preparation | Git branch + push |
| `ginko doctor` | Health diagnostics | Console + `.ginko/health/` |

### Universal Reflection Pattern

Every command follows the same pipeline:

```
Human Intent → Context Gathering → AI Enhancement → Quality Validation → Git Storage
```

**Example**:
```bash
ginko handoff "fixed the token refresh bug, discovered rate limiting issue"
```

Creates:
```markdown
---
type: session-handoff
timestamp: 2025-09-22T15:30:00Z
quality_score: 85
---

# Session Summary

## Accomplishments
- Fixed token refresh bug in auth service
- Identified rate limiting issue with OAuth provider

## Next Session Goals
- Implement exponential backoff for rate limits
- Add monitoring for auth failures

## Critical Context
- Token refresh now uses sliding window approach
- Rate limit: 100 requests/minute per API key
```

---

## 🏗️ Architecture Highlights

### Three Design Philosophies

1. **Git-Native Storage**
   - All data in `.ginko/` directory
   - Version controlled like code
   - Shareable via git push/pull
   - Full offline operation

2. **Quality Templates**
   - Domain-specific templates ensure consistency
   - AI generates to template structure
   - Quality scoring (70%+ threshold)
   - Predictable, parseable outputs

3. **Safe Defaults**
   - Commands perform beneficial analyses by default
   - Explicit `--no-analysis` flags for speed
   - Silent success (5-second rule)
   - Flow-state optimized

### Simple Builder Pattern

Ginko's reflector implementation uses a chainable pipeline pattern (complexity: 2/10):

```typescript
export abstract class ReflectionPipeline {
  async execute(): Promise<PipelineContext> {
    return this
      .withDomain(domain)
      .withTemplate(template)
      .gatherContext()
      .validate()
      .recover()
      .generate()
      .evaluateQuality()
      .execute();
  }
}
```

Every reflector follows this same pattern, making new domains trivial to implement.

### Available Reflection Domains

Ginko includes 15 specialized reflection domains:

**Session Management**:
- `start` - Session initialization and context loading
- `handoff` - Session preservation and handoff

**Documentation**:
- `capture` - Decision and pattern capture
- `explore` - Problem space analysis and PRD generation
- `documentation` - Technical documentation generation

**Planning & Execution**:
- `plan` - Sprint planning with phase breakdown
- `architecture` - System design and ADR creation
- `backlog` - Backlog refinement and prioritization

**Development Workflow**:
- `ship` - PR preparation with git integration
- `git` - Commit generation with changelog chaining
- `changelog` - Release note generation
- `testing` - Test strategy and implementation

**Quality & Debugging**:
- `bug` - Bug analysis and resolution planning
- `prd` - Product requirement documentation

**Future**:
- `meta` - Self-reflection for creating new reflectors

Use any domain via shortcut (`ginko <domain>`) or universal pattern (`ginko reflect --domain <domain>`).

---

## 🔐 Privacy First

- **Local by default**: All code and context stay on your machine
- **Opt-in sharing**: Explicit git push to share with team
- **No cloud dependency**: Full functionality offline
- **Git-native security**: Standard git access controls

---

## 📊 Phase 1 Status (Complete ✅)

### Essential Reflectors Delivered
- ✅ **handoff** - Session preservation and restoration
- ✅ **start** - Context loading and work mode detection
- ✅ **context** - Knowledge module management
- ✅ **capture** - Decision and pattern documentation
- ✅ **explore** - Problem space analysis and PRD generation
- ✅ **plan** - Sprint planning with phase generation
- ✅ **ship** - PR preparation with git integration
- ✅ **init** - Project initialization with validation
- ✅ **doctor** - Health diagnostics and repair

### Universal Reflection Pattern Implementation
All core commands now use the Universal Reflection Pattern, providing dual syntax support:

```bash
# Shortcut syntax (convenient)
ginko capture "important decision"
ginko explore "problem space"
ginko plan "new feature"

# Universal pattern syntax (powerful)
ginko reflect --domain capture "important decision"
ginko reflect --domain explore "problem space"
ginko reflect --domain plan "new feature"
```

Both syntaxes execute identically - use whichever fits your workflow.

### Success Metrics Achieved
- ⚡ **Time to First Value**: <5 minutes (target: <5 min)
- 🎯 **Installation Success**: >95% (target: >90%)
- 📈 **Session Startup**: <5 seconds (target: <10 sec)
- ✅ **Cross-Platform**: 100% feature parity (Windows/Mac/Linux)

---

## 🔮 Roadmap

### Phase 2: Team Collaboration (Q4 2025)
- Real-time context synchronization
- Team activity insights
- Shared knowledge modules
- Collaborative handoffs

### Phase 3: Marketplace & Extensions (Q1 2026)
- Custom reflector marketplace
- IDE integrations (VS Code, JetBrains)
- Third-party domain plugins
- Enterprise authentication

---

## 📚 Documentation

### Architecture
- **[Complete Architecture Guide](docs/architecture/ARCHITECTURE.md)** - Full technical details
- **[ADR Index](docs/architecture/ADR-INDEX.md)** - Architecture decision records
- **[PRD-006](docs/prd/PRD-006-phase-1-developer-tools-implementation.md)** - Phase 1 implementation plan

### Key ADRs
- **[ADR-020](docs/adr/ADR-020-cli-first-pivot.md)** - CLI-first pivot from MCP
- **[ADR-021](docs/adr/ADR-021-privacy-first-git-native.md)** - Git-native architecture
- **[ADR-023](docs/adr/ADR-023-flow-state-design-philosophy.md)** - Flow state design
- **[ADR-032](docs/adr/ADR-032-core-cli-architecture-and-reflection-system.md)** - Reflection system

---

## 🛠️ Development

### Local Development
```bash
# Clone and setup
git clone https://github.com/ginko-ai/ginko
cd ginko
npm install

# Build all packages
npm run build

# Test CLI locally
cd packages/cli
npm run build
npm link
ginko --version
```

### Testing
```bash
# Run all tests
npm test

# CLI package tests
cd packages/cli
npm test

# Cross-platform validation
npm run test:cross-platform
```

---

## 🌟 Why Ginko?

### Advantages of Imperative Commands

1. **Predictability** - Same command, same output location, every time
2. **Scriptability** - Shell scripts, CI/CD pipelines, automation
3. **Git-Native Ambient AI** - AI discovers context naturally from `.ginko/`
4. **Tool Agnostic** - Works with any AI assistant that can read files
5. **Determinism** - Structured outputs despite AI variability

### Developer Experience

- **Flow State Optimized**: Silent success, 5-second rule, minimal interruptions
- **Cross-Platform**: Native Node.js, no OS-specific dependencies
- **Git Integration**: Seamless with existing workflows
- **Privacy Focused**: Local-first, opt-in sharing

---

## 🤝 Contributing

Ginko is built on extensible architecture. New reflectors can be added by:
1. Implementing `ReflectionPipeline` base class
2. Creating quality template
3. Defining context gatherers
4. Registering domain plugin

See [CONTRIBUTING.md](CONTRIBUTING.md) for guidelines.

---

## 📄 License

MIT License - See [LICENSE](LICENSE) for details

---

## 🎯 Vision

**Transform AI-assisted development from ephemeral conversations into persistent, collaborative knowledge systems through git-native structured reflection.**

Every session builds on the last. Every insight becomes team knowledge. Every developer works with full context.

**Nothing special, just quicker.** 🌿
