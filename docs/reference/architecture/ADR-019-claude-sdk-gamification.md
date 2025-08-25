---
type: decision
status: proposed
updated: 2025-08-15
tags: [sdk, agents, gamification, collaboration, coaching, status-line]
related: [ADR-016-handoff-tool-consolidation.md, ADR-011-best-practices-claude-code-integration.md, ADR-018-collaborative-slash-commands.md]
priority: critical
audience: [developer, ai-agent, stakeholder, user]
estimated-read: 20-min
dependencies: [ADR-016, ADR-011, ADR-018]
---

# ADR-019: Claude Code SDK Agent Architecture with Gamified Collaboration Coaching

**Status:** Proposed  
**Date:** 2025-08-15  
**Authors:** Chris Norton, Claude  
**Reviewers:** [To be determined]  
**Supersedes:** None  
**Superseded by:** None  

## Context

### Problem Statement
Ginko currently provides powerful context management through MCP tools, but lacks:
1. Programmatic control over AI agents for automated workflows
2. Progressive skill development framework for human-AI collaboration
3. Non-intrusive, continuous coaching mechanisms
4. Engagement mechanics that reinforce effective collaboration patterns

Users need both sophisticated agent automation AND deliberate skill development to become effective AI collaborators.

### Business Context
- **Mission Alignment**: Ginko's core mission is collaboration coaching between humans and AI
- **Market Opportunity**: "The Duolingo of vibecoding" - gamified learning for AI collaboration
- **Network Effects**: Community-driven pattern library creates defensible moat
- **Cost Efficiency**: Hybrid architecture minimizes inference costs while maximizing value

### Technical Context  
- **Current State**: 21 MCP tools, manual slash commands, documentation-based patterns
- **SDK Availability**: `@anthropic-ai/claude-code` enables programmatic agent control
- **Status Line**: Claude Code's status line provides perfect coaching interface
- **Infrastructure**: Serverless Vercel + Supabase PostgreSQL ready for expansion

### Key Requirements
1. Replace manual commands with intelligent agents
2. Implement progressive skill development system
3. Deliver coaching through non-intrusive status line
4. Create engagement without addiction
5. Preserve "vibecheck" as signature collaboration pattern

## Decision

Implement a hybrid client-server architecture with four specialized agent types, integrated with a gamified collaboration coaching system delivered through Claude Code's status line. This creates a progressive learning environment that develops real collaboration skills while automating routine tasks.

### Chosen Solution
1. **Hybrid Architecture**: Client-side agent execution with server-side orchestration
2. **Four Core Agent Types**: SessionAgent, ReviewAgent, CoachingAgent, OnboardingAgent
3. **Gamified Progression**: Skill tree, achievements, and levels that represent real capabilities
4. **Status Line Coaching**: Ambient intelligence providing contextual hints and celebrations
5. **Progressive Complexity**: From explicit teaching to natural flow

## Architecture

### System Design Overview

```typescript
// Three-layer architecture
interface GinkoArchitecture {
  // Layer 1: Client-side agents (user's environment)
  clientLayer: {
    agentRunner: "@ginko/agent-runner",      // 50KB NPM package
    statusLine: "ginko-statusline.js",       // Coaching display
    localStorage: "achievements, progress cache", // Privacy-first
  };
  
  // Layer 2: Orchestration (Ginko servers)
  serverLayer: {
    agentTemplates: "/api/agents/templates",
    progressTracking: "/api/gamification/progress",
    patternLibrary: "/api/patterns/community",
    analytics: "/api/metrics/collaboration"
  };
  
  // Layer 3: Intelligence (Claude API)
  intelligenceLayer: {
    claudeSDK: "@anthropic-ai/claude-code",
    userApiKey: "User provides their own",
    inference: "Happens on client side"
  };
}
```

## Core Agent Types

### 1. SessionAgent: Conversation Continuity Engine

**Purpose**: Seamlessly continue conversations from MCP handoffs, replacing manual `/start` and `/handoff` commands.

```typescript
class SessionAgent extends BaseAgent {
  // Replaces: /start, /handoff, manual context loading
  
  async resumeFromHandoff(sessionId: string): Promise<void> {
    const handoff = await this.db.getHandoff(sessionId);
    
    this.systemPrompt = `
      Resuming session with context:
      - Previous: ${handoff.completedTasks}
      - Current: ${handoff.currentTask}
      - Decisions: ${handoff.decisions}
      Maintain momentum and reference previous work naturally.
    `;
    
    await this.sdk.initialize({
      systemPrompt: this.systemPrompt,
      tools: ['Read', 'Write', 'Edit', 'Bash'],
      memory: handoff.conversationMemory
    });
  }
  
  // Automatic handoff generation
  async autoHandoff(): Promise<void> {
    // No user intervention needed
    const handoff = await this.generateFromSession();
    await this.store(handoff);
    this.updateStatusLine("💾 Session saved - ready to resume anytime");
  }
}
```

### 2. ReviewAgent: Intelligent Code Review System

**Purpose**: Automated code review following team-specific best practices.

```typescript
class ReviewAgent extends BaseAgent {
  // Replaces: Manual review processes, inconsistent standards
  
  async reviewPullRequest(prNumber: number): Promise<ReviewResult> {
    const bestPractices = await this.loadTeamPractices();
    
    // Multi-pass analysis
    const security = await this.reviewSecurity(changes);
    const performance = await this.reviewPerformance(changes);
    const patterns = await this.reviewPatterns(changes);
    
    return {
      summary: this.consolidate([security, performance, patterns]),
      score: this.calculateScore(),
      suggestions: this.generateSuggestions()
    };
  }
}
```

### 3. CoachingAgent: Real-time Collaboration Coach

**Purpose**: Generate contextual coaching delivered through status line.

```typescript
class CoachingAgent extends BaseAgent {
  // Replaces: CLAUDE.md instructions, manual pattern recognition
  
  async generateCoaching(context: SessionContext): Promise<CoachingHint> {
    const pattern = await this.detectPattern(context);
    const skill = await this.assessSkillLevel(context);
    
    // Progressive coaching based on skill level
    if (skill.level === 'beginner') {
      return this.explicitGuidance(pattern);
    } else if (skill.level === 'intermediate') {
      return this.subtleHint(pattern);
    } else {
      return this.ambientAwareness(pattern);
    }
  }
}
```

### 4. OnboardingAgent: Interactive Setup Assistant

**Purpose**: Guide new users through Ginko setup with adaptive onboarding.

```typescript
class OnboardingAgent extends BaseAgent {
  // Replaces: Documentation reading, manual setup
  
  async startOnboarding(projectPath: string): Promise<OnboardingResult> {
    const profile = await this.analyzeProject(projectPath);
    
    // Adaptive onboarding based on project type
    const flow = this.selectOnboardingFlow(profile);
    
    // Interactive teaching
    await this.teachVibecheck();
    await this.practiceHandoff();
    await this.demonstrateFlow();
    
    return this.generateConfiguration(profile);
  }
}
```

## Gamification System

### Core Philosophy: Real Skills, Not Fake Points

The gamification system reinforces actual collaboration skills through progressive challenges and recognition.

### Skill Progression Framework

```typescript
interface SkillTree {
  foundational: {
    "Pattern Recognition": {
      unlocks: ["Vibecheck Timing", "Stuck Detection"],
      achievement: "🎯 Pattern Hunter"
    },
    "Context Management": {
      unlocks: ["Handoff Mastery", "Session Flow"],
      achievement: "📚 Context Keeper"
    },
    "Communication": {
      unlocks: ["Problem Framing", "Solution Articulation"],
      achievement: "💬 Clear Communicator"
    }
  };
  
  intermediate: {
    "Proactive Alignment": "Calling vibecheck before crisis",
    "Role Negotiation": "Knowing when to lead/follow",
    "Flow Maintenance": "Sustaining productive momentum"
  };
  
  advanced: {
    "Implicit Coordination": "Wordless alignment",
    "Pattern Creation": "Contributing new patterns",
    "Mentorship": "Teaching others"
  };
}
```

### Achievement System

```typescript
class AchievementSystem {
  // Real accomplishments, not participation trophies
  achievements = {
    // Learning moments
    firstVibecheck: {
      trigger: "Called first vibecheck",
      celebration: "Nice! You've learned when to pause and reassess.",
      reward: "Unlock: Vibecheck patterns guide"
    },
    
    // Skill demonstration
    patternSpotter: {
      trigger: "Recognized pattern before system hint",
      celebration: "Impressive! You saw that coming before I did.",
      reward: "Unlock: Advanced pattern library"
    },
    
    // Mastery
    flowMaster: {
      trigger: "Maintained flow state for 2 hours",
      celebration: "You're in the zone! Perfect collaboration rhythm.",
      reward: "Title: Flow Master"
    },
    
    // Community contribution
    patternCreator: {
      trigger: "Created pattern adopted by community",
      celebration: "Your wisdom helps everyone!",
      reward: "🧙 Pattern Creator Badge"
    }
  };
}
```

### Progressive Difficulty Curve

```typescript
class ProgressionSystem {
  // Week 1: Tutorial Island
  tutorial = {
    coaching: "explicit",
    statusLine: "💡 Tutorial: Try 'vibecheck' to practice alignment",
    challenges: ["Use vibecheck", "Create handoff", "Load context"]
  };
  
  // Weeks 2-4: Training Grounds
  training = {
    coaching: "suggestive",
    statusLine: "🎯 Can you spot the thrashing pattern?",
    challenges: ["Spot patterns", "Time vibechecks", "Maintain flow"]
  };
  
  // Weeks 5+: The Real Game
  mastery = {
    coaching: "ambient",
    statusLine: "🚀 Collaboration score: 94/100",
    challenges: ["Predict issues", "Optimize flow", "Teach others"]
  };
  
  // Expert: New Game+
  expert = {
    coaching: "minimal",
    statusLine: "👑 Expert: Teaching mode available",
    challenges: ["Perfect sessions", "Mentor others", "Create patterns"]
  };
}
```

## Status Line Coaching Integration

### The Status Line as Primary Interface

```javascript
// ~/.claude/ginko-statusline.js
#!/usr/bin/env node

const { GinkoCoach } = require('@ginko/coaching-engine');

async function generateStatusLine(input) {
  const coach = new GinkoCoach(input.sessionId);
  const context = await coach.analyzeCurrentContext();
  
  // Progressive coaching based on context
  if (context.vibecheckNeeded) {
    return '🎯 Vibecheck suggested - feeling stuck?';
  }
  
  if (context.achievementUnlocked) {
    return `🏆 ${context.achievement} | +${context.xp} XP`;
  }
  
  if (context.inFlow) {
    return `🌊 Flow x${context.flowDuration} | Level ${context.level}`;
  }
  
  // Default: contextual hint
  return coach.getCoachingHint(context);
}
```

### Coaching Patterns

```typescript
class CoachingPatterns {
  // Preserve vibecheck as signature pattern
  vibecheck = {
    philosophy: "Mutual recalibration tool",
    triggers: {
      human: "User says 'vibecheck'",
      ai: "Pattern detection suggests misalignment",
      status: "🎯 shown in status line"
    },
    learning: "Teaches metacognition and communication"
  };
  
  // Context-aware hints
  patterns = {
    thrashing: "Multiple failed attempts → suggest different approach",
    rabbitHole: "Scope creep detected → return to original goal",
    flow: "Perfect momentum → maintain without interruption",
    stuck: "No progress → vibecheck or break suggested"
  };
}
```

## Pattern Replacement Matrix

| Current Pattern | Agent + Gamification Replacement | User Experience |
|-----------------|----------------------------------|-----------------|
| `/start` command | SessionAgent auto-loads | Zero friction startup |
| `/handoff` command | Continuous context capture | Automatic session saving |
| `/vibecheck` command | Pattern detection + coaching | "🎯 Vibecheck?" in status |
| Manual MCP calls | Transparent agent operations | Focus on coding |
| CLAUDE.md patterns | Encoded agent behaviors | Consistent application |
| Documentation reading | Interactive onboarding | Learn by doing |
| No feedback | Achievement celebrations | "🏆 Pattern Spotter!" |
| Working alone | Community leaderboards | See team progress |

## Implementation Approach

### Phase 1: Foundation (Week 1)
- Create `packages/claude-sdk/` workspace
- Implement base agent architecture
- Build status line coaching script
- Set up gamification database schema

### Phase 2: Core Agents (Week 2)
- Implement SessionAgent with auto-handoff
- Build CoachingAgent for status line
- Create achievement detection system
- Deploy client-side agent runner

### Phase 3: Gamification (Week 3)
- Implement skill progression system
- Create achievement categories
- Build leaderboard infrastructure
- Add daily quests and challenges

### Phase 4: Polish & Launch (Week 4)
- Dashboard integration
- Community features
- Beta testing with early adopters
- Refinement based on feedback

## Alternatives Considered

### Option 1: Server-Side Only Agents
**Rejected**: Would require sending user code to servers, privacy concerns, higher costs

### Option 2: Pure Gamification Without Agents
**Rejected**: Doesn't solve automation needs, limited to coaching only

### Option 3: Agents Without Gamification
**Rejected**: Misses opportunity for skill development and engagement

## Consequences

### Positive Impacts
- **Skill Development**: Users become better AI collaborators through practice
- **Reduced Friction**: Automation of routine tasks
- **Engagement**: Gamification creates stickiness without addiction
- **Community**: Shared learning and pattern creation
- **Cost Efficiency**: Client-side execution minimizes inference costs

### Negative Impacts  
- **Complexity**: More moving parts to maintain
- **Learning Curve**: Initial setup more complex than simple tools
- **Perception Risk**: Some users may find gamification juvenile

### Mitigation Strategy
- **Adaptive Profiles**: From "full gamer" to "metrics only"
- **Progressive Disclosure**: Complexity revealed gradually
- **Professional Mode**: Gamification can be completely hidden

## Security Considerations
- Client-side execution keeps code local
- Only metrics and achievements sent to server
- API keys managed by users
- Privacy-first architecture

## Performance Implications
- SDK adds ~200KB to client bundle
- Status line updates every 300ms max
- Local caching minimizes API calls
- Progressive loading of features

## Monitoring and Success Metrics

### Key Performance Indicators
- **Engagement**: Daily active users, session length
- **Skill Development**: Achievement unlock rate, pattern mastery
- **Collaboration Quality**: Vibecheck effectiveness, handoff quality scores
- **Community Growth**: Patterns shared, mentorship connections

### Success Criteria
- 100+ active users in first month
- 80% achievement engagement rate
- 50% improvement in collaboration metrics
- 90% positive feedback on coaching

## Risks and Mitigations

| Risk | Impact | Probability | Mitigation |
|------|---------|-------------|------------|
| Gamification seen as patronizing | High | Medium | Multiple profiles, professional mode |
| Gamification gets stale | Medium | High | Regular content updates, seasons |
| High-pressure situations | High | Low | Mood detection, delayed celebrations |
| Privacy concerns | High | Low | Client-side execution, opt-in metrics |

## Timeline and Milestones

### Implementation Phases
- **Week 1**: Core infrastructure, status line integration
- **Week 2**: Agent implementation, basic gamification
- **Week 3**: Full gamification system, achievements
- **Week 4**: Dashboard, community features, beta launch

### Key Milestones
- **Day 7**: Status line coaching live
- **Day 14**: First achievements earned
- **Day 21**: Community patterns shared
- **Day 28**: Beta launch complete

## The Vibecheck Philosophy

Vibecheck remains our signature pattern, representing the heart of two-way AI-human collaboration:

1. **Preserved Conceptually**: Always available as a recalibration tool
2. **Progressive Teaching**: From explicit instruction to natural usage
3. **Mutual Respect**: Either party can call for vibecheck
4. **Skill Development**: Teaches metacognition and communication
5. **Cultural Identity**: Defines Ginko's collaboration philosophy

## Ethical Gamification Pledge

We commit to:
- **Real Value**: Every achievement represents actual skill gained
- **User Autonomy**: Full control over gamification level
- **No Dark Patterns**: No pay-to-win, no manipulation
- **Quality over Quantity**: Reward understanding, not grinding
- **Inclusive Design**: Accessible to all users
- **Privacy First**: Achievements private by default

## References

### Documentation
- [Claude Code SDK Documentation](https://docs.anthropic.com/en/docs/claude-code/sdk)
- [Claude Code Status Line](https://docs.anthropic.com/en/docs/claude-code/statusline)
- [ADR-016: Handoff Tool Consolidation](ADR-016-handoff-tool-consolidation-and-vibecheck.md)
- [ADR-018: Collaborative Slash Commands](ADR-018-collaborative-slash-commands.md)

### Code References
- Implementation: `packages/claude-sdk/src/`
- Status Line: `mcp-client/src/statusline/`
- Gamification: `api/gamification/`
- Dashboard: `dashboard/src/app/dashboard/progress/`

---

**Decision Summary**: Implement Claude Code SDK agents with gamified collaboration coaching delivered through the status line, creating "The Duolingo of vibecoding" - a progressive learning system that develops real human-AI collaboration skills while automating routine tasks.