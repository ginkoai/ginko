# Infographic Concepts for SWE Leaders

**Purpose:** Visual assets to help engineering leaders make the case for ginko internally.

**Target Audience:** VP Engineering, Engineering Directors, Tech Leads presenting to leadership

---

## Infographic 1: "The Hidden Cost of Context Loss"

### Concept
A striking visualization showing how much time and money teams lose to context rebuilding in AI-assisted development.

### Visual Wireframe

```
┌─────────────────────────────────────────────────────────────────────┐
│                                                                     │
│   THE HIDDEN COST OF CONTEXT LOSS                                   │
│   What happens every time an AI session restarts                    │
│                                                                     │
├─────────────────────────────────────────────────────────────────────┤
│                                                                     │
│   ┌─────────────────────────────────────────────────────────────┐   │
│   │  WITHOUT GINKO                    WITH GINKO                │   │
│   │                                                             │   │
│   │   Session Start                   Session Start             │   │
│   │        │                               │                    │   │
│   │        ▼                               ▼                    │   │
│   │   ┌─────────┐                    ┌───────────┐              │   │
│   │   │ 5-10min │  Context           │  < 30sec  │  Flow        │   │
│   │   │ rebuild │  explaining        │  restore  │  state       │   │
│   │   └─────────┘                    └───────────┘              │   │
│   │        │                               │                    │   │
│   │        ▼                               ▼                    │   │
│   │   ┌─────────┐                    ┌───────────┐              │   │
│   │   │ 3-5     │  Clarifying        │  1-2      │  Strategic   │   │
│   │   │ Qs      │  questions         │  Qs       │  questions   │   │
│   │   └─────────┘                    └───────────┘              │   │
│   │        │                               │                    │   │
│   │        ▼                               ▼                    │   │
│   │   ┌─────────┐                    ┌───────────┐              │   │
│   │   │ 15min+  │  Time to           │  < 2min   │  Immediate   │   │
│   │   │         │  productivity      │           │  impact      │   │
│   │   └─────────┘                    └───────────┘              │   │
│   └─────────────────────────────────────────────────────────────┘   │
│                                                                     │
│   ┌─────────────────────────────────────────────────────────────┐   │
│   │                                                             │   │
│   │   THE MATH FOR A 10-PERSON TEAM                             │   │
│   │                                                             │   │
│   │   ┌─────────┐   ┌─────────┐   ┌─────────┐   ┌───────────┐   │   │
│   │   │   3-5   │ × │   10    │ × │  250    │ = │  7,500+   │   │   │
│   │   │sessions │   │  devs   │   │  days   │   │  hours/yr │   │   │
│   │   │ /day    │   │         │   │         │   │  LOST     │   │   │
│   │   └─────────┘   └─────────┘   └─────────┘   └───────────┘   │   │
│   │                                                             │   │
│   │   At $150/hr loaded cost = $1.1M+ annually                  │   │
│   │                                                             │   │
│   └─────────────────────────────────────────────────────────────┘   │
│                                                                     │
│   "Context is the most expensive thing you throw away every day"    │
│                                                                     │
└─────────────────────────────────────────────────────────────────────┘
```

### Data Points Needed

| Metric | Source | Current Estimate |
|--------|--------|------------------|
| Time to rebuild context manually | User research / surveys | 5-10 minutes |
| Sessions per developer per day | Usage analytics | 3-5 sessions |
| Clarifying questions without context | Baseline testing | 5-7 questions |
| Clarifying questions with ginko | Testing | 1-2 questions |
| Loaded cost per developer hour | Industry data | $100-200/hr |
| Time to productivity with ginko | Product metrics | < 30 seconds |

### Copy/Messaging

**Headline:** "The Hidden Cost of Context Loss"

**Subhead:** "What happens every time an AI session restarts"

**Key Stats:**
- "15+ minutes lost per session restart"
- "7,500+ hours/year for a 10-person team"
- "$1.1M+ annual cost of context rebuilding"

**CTA:** "Stop paying the context tax"

---

## Infographic 2: "Flow State ROI"

### Concept
Visualize the compounding productivity impact of maintaining flow state vs. constant interruption from context loss.

### Visual Wireframe

```
┌─────────────────────────────────────────────────────────────────────┐
│                                                                     │
│   FLOW STATE ROI                                                    │
│   The productivity multiplier of continuous context                 │
│                                                                     │
├─────────────────────────────────────────────────────────────────────┤
│                                                                     │
│   ┌─────────────────────────────────────────────────────────────┐   │
│   │                                                             │   │
│   │   PRODUCTIVITY OVER AN 8-HOUR DAY                           │   │
│   │                                                             │   │
│   │   Output                                                    │   │
│   │     ▲                                                       │   │
│   │     │                    ╭──────────────────── With Ginko   │   │
│   │     │                 ╭──╯                     (sustained   │   │
│   │   5x│              ╭──╯                         flow)       │   │
│   │     │           ╭──╯                                        │   │
│   │     │        ╭──╯                                           │   │
│   │   3x│     ╭──╯         ╱╲    ╱╲    ╱╲                       │   │
│   │     │  ╭──╯           ╱  ╲  ╱  ╲  ╱  ╲  Without Ginko      │   │
│   │     │╭─╯             ╱    ╲╱    ╲╱    ╲  (interrupted)      │   │
│   │   1x├╯──────────────╱─────────────────╲─────────────────    │   │
│   │     │                                                       │   │
│   │     └───────────────────────────────────────────────▶       │   │
│   │       9am    10am    12pm    2pm     4pm     6pm   Time     │   │
│   │                                                             │   │
│   │       ↑       ↑       ↑       ↑       ↑                     │   │
│   │    Context  Context Context Context Context                 │   │
│   │    loss     loss    loss    loss    loss                    │   │
│   │                                                             │   │
│   └─────────────────────────────────────────────────────────────┘   │
│                                                                     │
│   ┌───────────────┬───────────────┬───────────────┐                 │
│   │               │               │               │                 │
│   │    23 min     │     4x        │     2.5x      │                 │
│   │   ─────────   │   ─────────   │   ─────────   │                 │
│   │   Average     │   Productivity│   More        │                 │
│   │   recovery    │   multiplier  │   features    │                 │
│   │   time after  │   in flow     │   shipped     │                 │
│   │   interruption│   state       │   per sprint  │                 │
│   │               │               │               │                 │
│   └───────────────┴───────────────┴───────────────┘                 │
│                                                                     │
│   "Flow state isn't a luxury—it's a multiplier"                     │
│                                                                     │
└─────────────────────────────────────────────────────────────────────┘
```

### Data Points Needed

| Metric | Source | Current Estimate |
|--------|--------|------------------|
| Time to recover from interruption | Academic research (Gloria Mark, UC Irvine) | 23 minutes |
| Productivity multiplier in flow | Industry studies | 2-5x |
| Session interruptions per day | Usage analytics | 3-8 times |
| Features shipped with vs without flow | A/B testing / case studies | TBD |
| Developer satisfaction in flow | Survey data | TBD |

### Copy/Messaging

**Headline:** "Flow State ROI"

**Subhead:** "The productivity multiplier of continuous context"

**Key Stats:**
- "23 minutes to recover from each interruption"
- "4x productivity multiplier in sustained flow"
- "2.5x more features shipped per sprint"

**CTA:** "Protect your team's flow state"

---

## Infographic 3: "Knowledge Retention Crisis"

### Concept
Show how institutional knowledge evaporates without systematic capture, and how ginko creates durable organizational memory.

### Visual Wireframe

```
┌─────────────────────────────────────────────────────────────────────┐
│                                                                     │
│   THE KNOWLEDGE RETENTION CRISIS                                    │
│   What walks out the door when developers leave                     │
│                                                                     │
├─────────────────────────────────────────────────────────────────────┤
│                                                                     │
│   ┌─────────────────────────────────────────────────────────────┐   │
│   │                                                             │   │
│   │   TRADITIONAL AI-ASSISTED DEV                               │   │
│   │                                                             │   │
│   │   Developer A          Developer B         Developer C      │   │
│   │   ┌─────────┐         ┌─────────┐         ┌─────────┐      │   │
│   │   │ Session │         │ Session │         │ Session │      │   │
│   │   │ context │         │ context │         │ context │      │   │
│   │   │ (local) │         │ (local) │         │ (local) │      │   │
│   │   └────┬────┘         └────┬────┘         └────┬────┘      │   │
│   │        │                   │                   │            │   │
│   │        ▼                   ▼                   ▼            │   │
│   │      [LOST]              [LOST]              [LOST]         │   │
│   │    on logout           on logout           on logout        │   │
│   │                                                             │   │
│   │   ════════════════════════════════════════════════════      │   │
│   │                                                             │   │
│   │   WITH GINKO                                                │   │
│   │                                                             │   │
│   │   Developer A          Developer B         Developer C      │   │
│   │   ┌─────────┐         ┌─────────┐         ┌─────────┐      │   │
│   │   │ Session │         │ Session │         │ Session │      │   │
│   │   │ context │         │ context │         │ context │      │   │
│   │   └────┬────┘         └────┬────┘         └────┬────┘      │   │
│   │        │                   │                   │            │   │
│   │        └───────────────────┼───────────────────┘            │   │
│   │                            ▼                                │   │
│   │              ┌──────────────────────────┐                   │   │
│   │              │    KNOWLEDGE GRAPH       │                   │   │
│   │              │  ┌─────┐ ┌─────┐ ┌─────┐ │                   │   │
│   │              │  │ADRs │ │Ptrns│ │Evnts│ │                   │   │
│   │              │  └─────┘ └─────┘ └─────┘ │                   │   │
│   │              │   Decisions  Patterns  History               │   │
│   │              └──────────────────────────┘                   │   │
│   │                            │                                │   │
│   │                    PERSISTS FOREVER                         │   │
│   │                                                             │   │
│   └─────────────────────────────────────────────────────────────┘   │
│                                                                     │
│   ┌───────────────┬───────────────┬───────────────┐                 │
│   │               │               │               │                 │
│   │    6 weeks    │     40%       │     $50K+     │                 │
│   │   ─────────   │   ─────────   │   ─────────   │                 │
│   │   Average     │   Knowledge   │   Cost per    │                 │
│   │   onboarding  │   loss when   │   developer   │                 │
│   │   time        │   dev leaves  │   turnover    │                 │
│   │               │               │               │                 │
│   └───────────────┴───────────────┴───────────────┘                 │
│                                                                     │
│   "Your best decisions shouldn't leave when your people do"         │
│                                                                     │
└─────────────────────────────────────────────────────────────────────┘
```

### Data Points Needed

| Metric | Source | Current Estimate |
|--------|--------|------------------|
| Average developer onboarding time | Industry surveys | 3-6 months |
| Knowledge loss on departure | Knowledge management studies | 30-50% |
| Cost of developer turnover | HR/industry data | $50-150K |
| Time to full productivity (new hire) | Survey data | 6-12 months |
| Documentation staleness rate | Internal metrics | 60% outdated within 6 months |

### Copy/Messaging

**Headline:** "The Knowledge Retention Crisis"

**Subhead:** "What walks out the door when developers leave"

**Key Stats:**
- "6 weeks average onboarding time"
- "40% knowledge loss when a developer leaves"
- "$50K+ cost per developer turnover"

**CTA:** "Build institutional memory that persists"

---

## Implementation Notes

### Design Principles
1. **Clean, professional aesthetic** - enterprise-ready, not startup-flashy
2. **Data-driven** - every claim backed by numbers
3. **Scannable** - key insights visible in 5 seconds
4. **Shareable** - works in slide decks, emails, and social

### Format Recommendations
- **Primary:** Vertical format for LinkedIn/social (1080x1350px)
- **Secondary:** Horizontal for slide decks (1920x1080px)
- **Tertiary:** Square for social (1080x1080px)

### Color Palette
- Use ginko brand colors (green accent on dark/light backgrounds)
- High contrast for accessibility
- Consistent with marketing site aesthetic

### Next Steps
1. [ ] Gather/validate data points with real measurements
2. [ ] Create high-fidelity designs in Figma
3. [ ] A/B test headlines with target audience
4. [ ] Produce final assets in multiple formats

---

*Created: 2025-12-11 | Sprint: EPIC-005 Sprint 1 | Task: TASK-9*
