# ADR-064: Browser-First Strategy for Claude.ai Integration

## Status
Proposed

## Context

Our initial assumption was that developers using AI for coding would naturally adopt CLI tools like Claude Code for maximum efficiency. However, user research and observation reveal a different reality:

- **95% of Claude users** interact through the browser (claude.ai), not CLI tools
- Windows developers typically use WSL2 + VSCode + Browser, not specialized AI applications
- Non-technical experimenters (a growing segment) exclusively use browsers
- Even experienced developers often prefer browser UI for AI interactions

Current pain points for browser users:
- Context lost between sessions (25-45 minutes to rebuild)
- No mechanism for team knowledge sharing
- 96% higher token costs due to context repetition
- No progress tracking or success metrics
- Manual copy-paste workflow inefficiencies

Meanwhile, our git-native handoff system assumes CLI access and file system integration - capabilities browser users don't have.

## Decision

**We will build a Chrome browser extension as the primary interface for Ginko, designed specifically for browser-based Claude.ai users.**

Key architectural decisions:
1. **Sidebar companion model** - no DOM manipulation of Claude.ai
2. **User-initiated actions only** - full ToS compliance
3. **Progressive enhancement path** - from browser to CLI
4. **Git-optional** - works with local storage, GitHub integration optional
5. **Education-focused** - teaches better AI collaboration patterns

## Rationale

### Why Browser-First?

1. **Meet users where they are**: 95% market vs 5% for CLI
2. **Lower barrier to entry**: One-click install vs terminal setup
3. **Immediate value**: Time tracking and templates work instantly
4. **Progressive education**: Show CLI benefits through actual metrics
5. **Broader audience**: Include non-technical AI experimenters

### Why Extension vs Other Approaches?

**Chrome Extension** ✅
- Native browser integration
- Persistent sidebar UI
- Access to browser storage
- Chrome Web Store distribution
- OAuth capabilities for GitHub

**Bookmarklet** ❌
- Limited functionality
- Poor user experience
- No persistent storage
- Security restrictions

**Web App** ❌
- Requires tab switching
- No Claude.ai awareness
- Manual copy-paste only
- Higher friction

**Desktop App** ❌
- High barrier to entry
- Platform-specific builds
- No browser integration
- Defeats browser-first goal

### Compliance & Partnership Approach

This strategy positions Ginko as a **complementary service** that:
- Increases Claude.ai user success and retention
- Fully respects Anthropic's ToS (no automation/scraping)
- Adds value to the ecosystem
- Creates path for future official partnership

## Consequences

### Positive

1. **Immediate Market Access**: Reach 95% of Claude users vs 5%
2. **Viral Growth Potential**: Browser users share extensions easily
3. **Lower Development Cost**: Single platform initially (Chrome)
4. **Clear Value Proposition**: Time saved is immediately visible
5. **Educational Pathway**: Natural progression to power tools
6. **ToS Compliance**: Sidebar model avoids all gray areas
7. **Future Partnership**: Positions us as ecosystem enhancer

### Negative

1. **Browser Limitations**: Can't access file system directly
2. **Extension Fatigue**: Users wary of installing extensions
3. **Chrome Dependency**: Initial limitation to one browser
4. **Feature Constraints**: Some CLI features impossible in browser
5. **Update Distribution**: Dependent on Chrome Web Store review

### Mitigation Strategies

- **File System**: Use GitHub integration or local server bridge
- **Trust Building**: Clear privacy policy, open source option
- **Browser Support**: Plan Firefox/Edge after Chrome success
- **Feature Parity**: Focus on browser-appropriate features
- **Update Speed**: Use remote configuration where possible

## Implementation Approach

### Phase 1: MVP (2 weeks)
- Sidebar panel with session timer
- Template system
- Local storage handoffs
- Time tracking metrics

### Phase 2: GitHub Integration (1 week)
- OAuth flow
- Repository handoff storage
- Team handoff viewing

### Phase 3: Education Layer (1 week)
- Prompt improvements
- CLI comparison metrics
- Migration assistance

### Phase 4: Launch (1 week)
- Chrome Web Store submission
- Documentation
- Marketing preparation

## Metrics for Success

### Short Term (1 month)
- 100+ installations
- 70% activation rate (first handoff)
- 50% week-2 retention
- Zero ToS violations

### Medium Term (3 months)
- 1,000+ active users
- 10+ success stories
- 5% CLI migration rate
- Anthropic awareness

### Long Term (1 year)
- 10,000+ active users
- Official partnership discussions
- Sustainable revenue model
- Multi-browser support

## Alternatives Considered

### Alternative 1: Double Down on CLI
Continue focusing on Claude Code CLI integration only.
- **Rejected**: Misses 95% of market

### Alternative 2: Web Application
Build standalone web app for handoff management.
- **Rejected**: Too much friction, no Claude.ai integration

### Alternative 3: Wait for Anthropic API
Wait for official extension API from Anthropic.
- **Rejected**: No timeline, miss first-mover advantage

## References

- User research: Windows developer workflow analysis
- Market analysis: Claude.ai usage patterns
- Technical POC: Chrome Extension Manifest V3 capabilities
- Compliance review: Anthropic ToS analysis
- Competitive analysis: No existing solutions identified

## Decision Makers

- Chris Norton (Project Lead) - Approved
- Technical feasibility confirmed via POC
- ToS compliance verified

## Date

2024-01-17

## Notes

This represents a strategic pivot from our initial CLI-focused approach to a browser-first strategy. The CLI tools remain valuable for power users, but the browser extension becomes our primary user acquisition and education channel. This decision aligns with our mission to make AI collaboration more successful for everyone, not just CLI-comfortable developers.