# Context System Architecture Overview

## Executive Summary

This document synthesizes the complete vision for Ginko's context management system - a comprehensive approach to maintaining alignment and awareness in human-AI collaboration through active context management, natural reflexes, and adaptive methodologies.

## Core Philosophy

**"The context system should amplify the developer's chosen workflow, not replace it."**

The system respects developer autonomy while providing intelligent support that:
- Preserves flow states
- Maintains alignment naturally
- Adapts to project needs
- Grows with the developer

## System Components

### 1. AI-Actively-Managed Context Loading
**PRD-004** | [Full Document](./PRD-004-ai-actively-managed-context.md)

The AI takes responsibility for its own context awareness:
- Self-assesses context quality (0-100 score)
- Identifies gaps before starting work
- Progressively loads relevant information
- Updates understanding as discoveries are made

**Key Innovation**: The AI asks "What don't I know?" rather than waiting to be told.

### 2. Continuous Context Invocation Pattern
**ADR-006** | [Full Document](./ADR-065-continuous-context-invocation.md)

Context awareness through natural reflexes rather than mechanical checking:
- Four core reflexes embedded in AI behavior
- Natural language integration
- Flow-preserving thought patterns

**Key Innovation**: Context reflexes feel like thinking, not process.

### 3. Context Reflexes Architecture
**ADR-008** | [Full Document](./ADR-068-context-reflexes.md)

The four automatic thought patterns:

1. **"Why Am I Doing This?"** - Alignment checking
2. **"Have We Done This Before?"** - Pattern recognition
3. **"Something Feels Off"** - Gap detection
4. **"Update My Understanding"** - Learning capture

**Key Innovation**: Subconscious professional habits, not explicit commands.

### 4. Statusline Evolution & Phase Tracking
**PRD-005** | [Full Document](./PRD-005-statusline-evolution.md)

Real-time visibility into collaboration state:
```bash
[ginko] 📍 Building: auth | 📚 85% | 🔧 12 patterns
```

- Current phase display
- Context confidence score
- Loaded resources
- Alignment warnings

**Key Innovation**: Misalignment becomes immediately visible.

### 5. Phase Context Coherence
**ADR-007** | [Full Document](./ADR-067-phase-context-coherence.md)

Ensures the right context for the current phase:
- Phase detection from activity
- Context mapping to phases
- Hierarchy tracking (PRD→Architecture→Sprint→Task)

**Key Innovation**: Context matches current need, not everything always.

### 6. Progressive Context Loading
**ADR-009** | [Full Document](./ADR-069-progressive-context-loading.md)

Three-stage loading strategy:
1. **Initial Load** - Minimal to start
2. **On-Demand** - As needed during work
3. **Just-In-Time** - When specifically relevant

**Key Innovation**: Right information at the right time.

### 7. Flow Dynamics & Methodology Matching
**PRD-006** | [Full Document](./PRD-006-flow-dynamics-methodology.md)

Intelligent methodology selection based on:
- Project type and scope
- Developer preferences
- Flow decay curves
- Natural evolution

Methodologies:
- 🚀 **Hack & Ship** - Maximum exploration
- 🎨 **Think & Build** - Balanced approach
- 🏗️ **Design & Deliver** - Thoughtful architecture
- 📋 **Full Stack Planning** - Complete rigor

**Key Innovation**: Methodology matches mission, then adapts as both evolve.

## Integration Architecture

```
┌─────────────────────────────────────────┐
│           Developer Intent              │
└────────────┬────────────────────────────┘
             │
             ▼
┌─────────────────────────────────────────┐
│        Methodology Selection            │
│  (Hack/Think/Design/Full + Evolution)   │
└────────────┬────────────────────────────┘
             │
             ▼
┌─────────────────────────────────────────┐
│         Context Assessment              │
│    (Score: Understanding/Approach/      │
│     Constraints/Patterns)               │
└────────────┬────────────────────────────┘
             │
             ▼
┌─────────────────────────────────────────┐
│       Progressive Loading               │
│   (Initial → On-Demand → Just-in-Time)  │
└────────────┬────────────────────────────┘
             │
             ▼
┌─────────────────────────────────────────┐
│        Context Reflexes                 │
│  (Why/Pattern/Confusion/Learning)       │
└────────────┬────────────────────────────┘
             │
             ▼
┌─────────────────────────────────────────┐
│      Phase Context Coherence            │
│   (Phase Detection + Context Mapping)   │
└────────────┬────────────────────────────┘
             │
             ▼
┌─────────────────────────────────────────┐
│        Statusline Display               │
│  (Phase | Score | Resources | Warnings) │
└─────────────────────────────────────────┘
```

## Implementation Roadmap

### Phase 1: Foundation (Weeks 1-2)
- [ ] Context Reflexes in CLAUDE.md
- [ ] Basic assessment in ginko start
- [ ] Simple statusline display
- [ ] Methodology selection in init

### Phase 2: Intelligence (Weeks 3-4)
- [ ] ActiveContextManager service
- [ ] Phase detection algorithms
- [ ] Progressive loading implementation
- [ ] Context scoring system

### Phase 3: Adaptation (Weeks 5-6)
- [ ] Methodology evolution detection
- [ ] Predictive context loading
- [ ] Developer profile learning
- [ ] Flow optimization

### Phase 4: Polish (Weeks 7-8)
- [ ] Natural language refinement
- [ ] Performance optimization
- [ ] Metrics and analytics
- [ ] Team features

## Success Metrics

### Quantitative
- Context score >70% during active work
- 50% reduction in vibechecks
- 40% increase in sustained flow
- 80% methodology recommendation acceptance

### Qualitative
- AI feels like informed teammate
- Context loading feels natural
- Methodology matches comfort level
- Flow states preserved longer

## Configuration Example

```json
{
  "methodology": "think-build",
  "context": {
    "assessment": true,
    "reflexes": {
      "sensitivity": "medium",
      "frequency": "natural"
    },
    "loading": {
      "strategy": "progressive",
      "caching": "smart"
    }
  },
  "statusline": {
    "enabled": true,
    "mode": "compact"
  },
  "project": {
    "type": "startup-mvp",
    "phase": "implementing"
  }
}
```

## Key Concepts Summary

1. **Context Hierarchy**: PRD → Architecture → Sprint → Task
2. **Context Reflexes**: Automatic awareness patterns
3. **Progressive Loading**: Right info at right time
4. **Phase Coherence**: Context matches current work
5. **Flow Dynamics**: Methodology preserves productivity
6. **Natural Language**: Organic, not mechanical
7. **Vibecheck Integration**: Gentle realignment
8. **Developer Growth**: Methodology evolution

## The Beautiful Outcome

When fully implemented, this system creates:

- **For Developers**: A collaborator that understands context, respects style, and preserves flow
- **For AI**: Clear understanding of purpose, appropriate information access, and natural communication
- **For Teams**: Shared context, preserved knowledge, and sustainable velocity

The context system becomes invisible infrastructure that makes collaboration feel natural, productive, and enjoyable.

---

*This overview document connects all context system components into a unified vision for intelligent, adaptive, flow-preserving human-AI collaboration.*