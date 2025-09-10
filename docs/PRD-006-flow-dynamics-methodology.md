# PRD-006: Flow Dynamics & Project-Methodology Matching

## Problem Statement

Developer productivity follows predictable flow decay curves that vary by methodology:

- **Hack & Ship**: Explosive initial productivity, catastrophic complexity collapse
- **Full Planning**: Slow start, sustainable long-term velocity
- **One-Size-Fits-All**: Forces square pegs into round holes

Current problems:
- Developers forced into inappropriate methodologies
- Personal projects over-engineered to death
- Production systems under-planned
- Flow states killed by wrong process
- No recognition of project evolution

## Solution Overview

Implement intelligent methodology matching that:
1. **Recommends** methodology based on project type and scope
2. **Respects** developer preferences and growth stage
3. **Adapts** as projects evolve
4. **Preserves** flow while encouraging best practices
5. **Learns** what actually works for each developer

## User Stories

### As a Weekend Hacker
- I want to dive straight into code without planning overhead
- I want the system to support exploration, not judge it
- I want to capture learnings without formal documentation
- I want gentle structure suggestions only when I'm stuck

### As a Professional Developer
- I want methodology that matches project requirements
- I want to switch approaches based on project phase
- I want my personal style respected
- I want to grow without being forced

### As a Team Lead
- I want appropriate rigor for production systems
- I want flexibility for prototypes
- I want team members to find their best methodology
- I want organic adoption of better practices

## Flow Dynamics Model

### Flow Decay Curves

```
Flow Level (0-100)
    ↑
100 | 🚀 Hack & Ship: ╱╲
    |              ╱  ╲___
 75 | 🎨 Think:   ╱────────╲___
    |           ╱            ╲___
 50 | 🏗️ Design: ╱──────────────────╲___
    |         ╱                      ╲___
 25 | 📋 Full: ────────────────────────────
    |
    |___________|_________|_________|_______
      Week 1    Month 1   Month 6   Year 1
```

### Methodology Characteristics

| Methodology | Initial Flow | Sustainability | Complexity Limit | Best For |
|------------|--------------|----------------|-----------------|----------|
| Hack & Ship | 95% | Low | ~50 files | Exploration, Learning |
| Think & Build | 75% | Medium | ~200 files | MVPs, Features |
| Design & Deliver | 60% | High | ~1000 files | Products, Libraries |
| Full Stack | 40% | Very High | Unlimited | Enterprise, Critical |

## Core Features

### 1. Smart Project Analysis

```bash
$ ginko init

🎯 Let's match your workflow to your project!

What are you building?
├── Production system (critical/financial/health)
├── Startup MVP (speed + iteration)
├── Learning project (exploration)
├── Prototype/POC (proof of concept)
├── Library/Framework (other devs)
└── Creative/Game (fun, experimental)

Project timeline?
├── Weekend (< 1 week)
├── Sprint (1-4 weeks)
├── Quarter (1-3 months)
└── Long-term (3+ months)

Team size?
├── Solo
├── Pair
├── Small team (3-5)
└── Large team (6+)

Based on: Learning project + Sprint + Solo
→ Recommended: Hack & Ship 🚀
→ Alternative: Think & Build 🎨
```

### 2. Methodology Profiles

#### Hack & Ship 🚀
```json
{
  "phases": ["explore", "code", "refactor"],
  "contextThreshold": 40,
  "planningRequired": false,
  "documentationStyle": "inline-comments",
  "vibecheckTolerance": "high",
  "flowPriority": "maximum"
}
```

#### Think & Build 🎨
```json
{
  "phases": ["think", "plan", "code", "test"],
  "contextThreshold": 60,
  "planningRequired": "light",
  "documentationStyle": "key-decisions",
  "vibecheckTolerance": "medium",
  "flowPriority": "balanced"
}
```

### 3. Evolution Detection

```bash
$ ginko methodology check

📊 Your project is evolving!

Started: Weekend hack (2 weeks ago)
Now: 127 commits, 84 files, 3 contributors

Growth indicators:
✓ Consistent daily commits
✓ Test coverage added
✓ Multiple contributors
✓ Documentation started

Current: Hack & Ship
Suggested: Think & Build

What changes:
+ Light planning phase
+ Decision documentation
+ Pattern recognition
━ Still rapid iteration
━ Flow stays priority

Evolve? [Y/n]:
```

### 4. Respectful Nudging

```typescript
// For over-engineering detection
if (methodology === "full-stack" && 
    projectType === "learning" && 
    timeInPlanning > timeInCoding * 2) {
  
  "I notice lots of planning for a learning project.
   Sometimes the best learning comes from doing!
   Want to try 'Hack & Ship' mode? [Y/n]"
}

// For under-engineering detection
if (methodology === "hack-ship" && 
    files > 100 && 
    contributors > 2) {
  
  "Your project is growing beautifully!
   Light structure might help coordinate.
   Consider 'Think & Build'? [Y/n]"
}
```

### 5. Flow Preservation Strategies

```typescript
const flowPreservation = {
  "hack-ship": {
    blockers: "Jump to different area",
    stuck: "Try wild alternative",
    refactor: "Only if it feels good",
    documentation: "Capture surprises only"
  },
  
  "think-build": {
    blockers: "Quick planning sprint",
    stuck: "Review patterns",
    refactor: "Plan then execute",
    documentation: "Key decisions only"
  },
  
  "full-stack": {
    blockers: "Review requirements",
    stuck: "Consult architecture",
    refactor: "Update design first",
    documentation: "Comprehensive"
  }
};
```

## Implementation Phases

### Phase 1: Methodology System (Week 1)
- [ ] Create methodology profiles
- [ ] Build project analyzer
- [ ] Implement init wizard

### Phase 2: Evolution Detection (Week 2)
- [ ] Growth indicators
- [ ] Transition suggestions
- [ ] Nudging system

### Phase 3: Flow Optimization (Week 3)
- [ ] Flow preservation strategies
- [ ] Context adaptation
- [ ] Vibecheck calibration

### Phase 4: Learning System (Week 4)
- [ ] Developer profiles
- [ ] Success tracking
- [ ] Recommendation improvement

## Success Criteria

### Quantitative
- 80% accept initial recommendation
- 60% successful methodology evolution
- 40% increase in sustained flow
- 50% reduction in abandoned projects

### Qualitative
- Developers feel understood
- Methodology feels natural
- Growth feels organic
- Flow states preserved

## Configuration

```json
{
  "methodology": {
    "current": "think-build",
    "allowEvolution": true,
    "nudging": "gentle",
    "flowPriority": 8,
    "trackSuccess": true
  },
  "project": {
    "type": "startup-mvp",
    "timeline": "quarter",
    "team": "small"
  }
}
```

## Future Enhancements

1. **Team Methodology Sync**: Coordinate team approaches
2. **Project Templates**: Methodology-specific starters
3. **Flow Analytics**: Measure and optimize
4. **Methodology Coaching**: Active improvement suggestions
5. **Cross-Project Learning**: What works across projects

## Success Indicators

Week 1:
- Developers choosing methodologies
- Positive initial reactions

Month 1:
- Measurable flow improvements
- Successful evolution transitions
- Reduced project abandonment

Month 3:
- Methodology becomes invisible
- Natural workflow enhancement
- Developers graduating naturally

---

*This PRD establishes a system that respects developer autonomy while providing intelligent methodology matching, preserving flow while enabling growth.*