# PRD-005: Statusline Evolution & Phase Tracking

## Problem Statement

Human-AI collaboration suffers from invisible misalignment. The AI might think it's implementing authentication while the human is focused on database design. This misalignment remains hidden until:

- Work products don't match expectations
- Rework becomes necessary
- Frustration builds on both sides
- Flow states are broken by clarification

Currently, there's no real-time visibility into:
- What phase the AI thinks it's in
- How confident the AI is in its context
- Whether human and AI are aligned
- When a vibecheck might be needed

## Solution Overview

Implement an intelligent statusline that provides continuous visibility into:
1. **Current Phase**: What the AI thinks it's doing
2. **Context Score**: How well-equipped the AI is
3. **Loaded Resources**: What patterns/modules are active
4. **Alignment Indicators**: Warnings when drift detected

## User Stories

### As a Developer
- I want to see what the AI thinks we're working on
- I want to know if the AI has sufficient context
- I want early warning of misalignment
- I want phase visibility without intrusion

### As an AI Assistant
- I want to communicate my current understanding
- I want to signal when I need more context
- I want to show my confidence level
- I want to indicate phase transitions naturally

## Success Criteria

### Quantitative Metrics
- **Alignment Detection**: Catch 80% of misalignments within 2 minutes
- **Vibecheck Reduction**: 40% fewer manual alignment checks
- **Context Visibility**: 100% of sessions show context score
- **Phase Accuracy**: 90% accuracy in phase detection

### Qualitative Metrics
- Developers report feeling "in sync" with AI
- Statusline becomes trusted indicator
- Natural phase transitions feel smooth
- Misalignment correction feels proactive

## Core Features

### 1. Phase Display
```bash
[ginko] 📍 Implementing: auth middleware
[ginko] 🎨 Designing: database schema
[ginko] 🧪 Testing: payment flow
[ginko] 🐛 Debugging: connection timeout
```

### 2. Context Score
```bash
[ginko] Phase: Building auth | 📚 85% | ✅ Ready
[ginko] Phase: Building auth | 📚 45% | ⚠️ Need patterns
[ginko] Phase: Building auth | 📚 25% | 🔴 Missing context
```

### 3. Resource Indicators
```bash
[ginko] 📍 Implementing auth | 📚 92% | 🔧 12 patterns | 📋 PRD ✓
[ginko] 📍 Implementing auth | 📚 92% | ⚡ 3 gotchas loaded
```

### 4. Alignment Warnings
```bash
[ginko] ⚠️ Phase jump detected: Design → Test (skipped implementation)
[ginko] ❓ Confusion: You mentioned "deploy" but I'm in "design" phase
[ginko] 🔄 Context drift: Been in same file 3+ hours
```

### 5. Methodology Adaptation
```bash
# Hack & Ship
[ginko] 🚀 Hacking: auth | 📚 45% is fine!

# Think & Build
[ginko] 🎨 Building: auth | 📚 70% | Plan ✓

# Full Planning
[ginko] 📋 Implementing: auth | 📚 95% | PRD ✓ Arch ✓ Plan ✓
```

## Technical Requirements

### Phase Detection
- Natural language processing of current work
- Activity pattern recognition
- Git operation analysis
- File type awareness

### Context Scoring
- Real-time calculation (0-100)
- Multi-factor assessment
- Progressive thresholds based on methodology

### Display System
- Terminal-compatible output
- Emoji/ASCII fallbacks
- Configurable verbosity
- Color coding for urgency

### Update Triggers
- File changes
- Command execution
- Time intervals
- Explicit phase changes
- Error detection

## Visual Design

### Compact Mode (Default)
```bash
[ginko] 📍 Building: auth | 📚 85% | 🔧 12
```

### Verbose Mode
```bash
[ginko] Phase: Implementing authentication middleware
        Context: 85% (PRD ✓ | Arch ✓ | Patterns: 12)
        Status: Aligned and ready
```

### Warning States
```bash
[ginko] ⚠️ Low context (45%) for complex task
[ginko] ❓ Phase confusion: design vs deploy
[ginko] 🔄 Consider vibecheck: 3 corrections in 5 min
```

## Implementation Phases

### Phase 1: Basic Display (Week 1)
- [ ] Show current phase
- [ ] Basic context score
- [ ] Simple formatting

### Phase 2: Intelligence (Week 2)
- [ ] Auto-detect phases
- [ ] Calculate context scores
- [ ] Alignment detection

### Phase 3: Adaptation (Week 3)
- [ ] Methodology-specific displays
- [ ] Progressive warnings
- [ ] Resource indicators

### Phase 4: Polish (Week 4)
- [ ] Smooth transitions
- [ ] Configurable themes
- [ ] Performance optimization

## Configuration

```json
{
  "statusline": {
    "enabled": true,
    "mode": "compact",
    "showPhase": true,
    "showContext": true,
    "showResources": true,
    "showWarnings": true,
    "updateInterval": 30,
    "theme": "emoji"
  }
}
```

## Risks & Mitigations

| Risk | Impact | Mitigation |
|------|--------|------------|
| Information overload | High | Default to compact mode |
| Incorrect phase detection | Medium | Allow manual override |
| Performance impact | Low | Batch updates, caching |
| Terminal compatibility | Low | ASCII fallbacks |

## Future Enhancements

1. **Rich Terminal UI**: Progress bars, graphs
2. **Historical Tracking**: Phase time analysis
3. **Team Sync**: Shared phase visibility
4. **Predictive Warnings**: Anticipate misalignment
5. **Custom Indicators**: Project-specific metrics

## Success Indicators

Week 1:
- Basic statusline visible in all sessions
- Developers notice phase displays

Month 1:
- Trust statusline for alignment
- Proactively respond to warnings
- Report better collaboration

Month 3:
- Statusline becomes invisible (just works)
- Dramatic reduction in misalignment
- Flow states preserved longer

---

*This PRD defines the evolution of the statusline into an intelligent collaboration indicator that maintains human-AI alignment without disrupting flow.*