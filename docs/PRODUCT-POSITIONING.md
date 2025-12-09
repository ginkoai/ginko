---
version: 1.0.0
status: draft
created: 2025-12-09
updated: 2025-12-09
epic: EPIC-005
sprint: Sprint 1
---

# Product Positioning: ginko

## Category Definition

**ginko is The AI Collaboration Platform.**

We are creating the category of AI-native project management—tools built from the ground up for teams that work with AI partners, not around them.

## Core Positioning

### Tagline

**"Where humans and AI ship together."**

### Product Description

**Primary (1 sentence):**
> The AI collaboration platform that makes enterprise-scale AI development safe, observable, and learnable.

**Extended (2 sentences):**
> The AI collaboration platform that makes enterprise-scale AI development safe, observable, and learnable. From first commit to production.

**Full (paragraph):**
> ginko is the AI collaboration platform for teams that build with AI partners. Unlike legacy PM tools built for human-only workflows, ginko treats AI as a first-class collaborator—with full observability, continuous context, and coaching insights that help your team adapt and excel. From solo developers to enterprise teams, ginko makes AI-assisted development safe, scalable, and learnable.

### A/B Test Variants

| Variant | Category Claim |
|---------|---------------|
| A (Primary) | "The AI Collaboration Platform" |
| B (Test) | "The AI-Native Collaboration Platform" |

**Hypothesis:** Variant A is simpler and more durable. "AI-Native" may feel jargon-y or date quickly.

---

## Emotional Journey

**Fear → Hope → Adoption → Success**

### Stage 1: Fear (Acknowledge the pain)

The world changed. Your tools didn't.

- AI capabilities are accelerating faster than teams can adapt
- Most developers are stuck in "dabbling" mode—ChatGPT for writing, Copilot for autocomplete
- The gap between AI potential and actual adoption is widening
- Legacy PM tools (Jira, ADO) assume humans do everything
- Fear of obsolescence is real and rational

**Message:** "You're not crazy. The ground is shifting. And your tools aren't helping."

### Stage 2: Hope (Show the path)

There's a better way to work with AI.

- AI partners can be observable, not opaque
- Context doesn't have to be lost every session
- Teams can scale AI-assisted development safely
- Adoption can be coached, not chaotic

**Message:** "ginko makes AI collaboration safe, observable, and learnable."

### Stage 3: Adoption (Make it easy)

Start in minutes. See results immediately.

- `npm install -g @ginkoai/cli`
- `ginko start` → flow state in 30 seconds
- No migration. Works alongside existing tools (initially)
- Git-native. Your code stays yours.

**Message:** "Try it in 5 minutes. Feel the difference."

### Stage 4: Success (Compound the wins)

Teams that adopt ginko don't go back.

- Observability builds confidence
- Coaching insights accelerate adaptation
- Knowledge compounds in the collaboration graph
- AI partners become trusted collaborators

**Message:** "This is how AI-native teams work."

---

## Competitive Positioning

### Primary Target: Jira (Atlassian)

**Positioning:** Direct replacement for AI-native teams.

**The Contrast:**

| Jira | ginko |
|------|-------|
| Built for humans only | Built for humans + AI partners |
| Manual status updates | Automatic event streaming |
| Knowledge trapped in tickets | Knowledge compounds in graph |
| Sprint planning is ceremony | Sprints adapt in real-time |
| Observability = stale reports | Observability = live dashboards |
| No coaching | AI-powered coaching insights |
| Context starts cold every time | Flow state in 30 seconds |

**Attack Lines:**
- "Jira was built for a world where humans did everything. That world is gone."
- "Your AI partner can't read your Jira board. It can read your ginko graph."
- "Stop updating tickets. Start shipping with AI."

**Proof Points Needed (post-EPIC-005):**
- [ ] Dashboard with live observability
- [ ] Graph visualization (knowledge compounds)
- [ ] Coaching insights (adaptation support)
- [ ] Sprint management that works with AI velocity

### Secondary: Linear

**Positioning:** Respectful. "Linear is great for human teams. ginko is for AI-native teams."

**Hold:** Do not attack Linear directly until we have feature parity on UX polish. Linear's design quality is exceptional. We earn the right to compete by matching their craft.

### Tertiary: GitHub Issues, ADO, Notion

**Positioning:** "Works alongside" for now. Future replacement path.

---

## Elevator Pitches

### Indie Developer Pitch (30 seconds)

**The Setup (5 sec):**
> You know that feeling when you start a new Claude session and spend 10 minutes re-explaining your project?

**The Problem (10 sec):**
> Context loss kills momentum. Every cold start means re-teaching your AI partner about your codebase, your decisions, your patterns. It's exhausting.

**The Solution (10 sec):**
> ginko fixes that. One command—`ginko start`—and you're back in flow in 30 seconds. Your context, your decisions, your patterns—all there. Git-native, works with any AI tool.

**The CTA (5 sec):**
> `npm install -g @ginkoai/cli`. Try it on your next project. You'll feel the difference immediately.

---

**Written Version (for README/docs):**

> **Stop re-explaining your project to AI.**
>
> ginko is the AI collaboration platform that preserves your context across sessions. One command gets you back in flow—with your decisions, patterns, and progress intact.
>
> ```bash
> npm install -g @ginkoai/cli
> ginko start
> ```
>
> Git-native. Works with Claude, Cursor, Copilot. Flow state in 30 seconds.

---

**Key Differentiators (for dev conversations):**

| Pain | ginko Solution |
|------|---------------|
| "I waste 10 min every session on context" | Flow state in 30 seconds |
| "My AI keeps forgetting decisions" | Knowledge graph preserves everything |
| "I don't trust vendor lock-in" | Git-native, all data in your repo |
| "Setup is always a nightmare" | `npm install` + `ginko start`. Done. |

---

### SWE Leader Pitch (60 seconds)

**The Fear (15 sec):**
> AI is changing software development faster than most teams can adapt. Your engineers are experimenting with Claude and Copilot, but nobody knows what's working, what's not, or how to scale it safely.

**The Problem (15 sec):**
> Legacy tools like Jira weren't built for this. They assume humans do everything. There's no observability into AI collaboration. No coaching structure. No way to know if your team is actually getting better—or just burning tokens.

**The Hope (15 sec):**
> ginko is the AI collaboration platform built for this moment. Full observability into what your team and their AI partners are building. Coaching insights that help developers adapt. Enterprise-scale from day one.

**The CTA (15 sec):**
> Your best engineers are already using AI. ginko helps you see what's working—and scale it across the team. Let me show you how it works.

---

**Written Version (for enterprise page/LinkedIn):**

> **Your team is using AI. Do you know how?**
>
> ginko is the AI collaboration platform that gives engineering leaders full visibility into AI-assisted development. See what your team is building with AI partners. Identify what's working. Coach continuous improvement.
>
> - **Observability:** Live dashboards, event streams, collaboration graphs
> - **Coaching:** AI-powered insights on patterns, velocity, and adoption
> - **Scale:** Enterprise-grade security, git-native architecture
>
> Jira wasn't built for AI. ginko was.

---

**How to Pitch to Decision Makers (for SWE leaders):**

**Frame 1: Competitive Pressure**
> "Teams using AI-native tools are shipping 2-3x faster. We need to close that gap—but we need visibility and governance to do it safely."

**Frame 2: Risk Mitigation**
> "Right now, AI usage is a black box. We don't know what's working, what's failing, or where we're wasting money. ginko gives us observability without slowing teams down."

**Frame 3: ROI**
> "Context loss costs us ~30 minutes per developer per day. With 20 engineers, that's 50+ hours/week. ginko cuts that to near zero."

**Frame 4: Talent Retention**
> "Top engineers want to work with AI-native tools. This is a recruiting and retention advantage."

---

**Objection Handling:**

| Objection | Response |
|-----------|----------|
| "We already have Jira" | "Jira tracks human work. ginko tracks human+AI collaboration. They solve different problems—but only one is built for where development is going." |
| "We're not ready for AI at scale" | "That's exactly why you need observability now. ginko helps you learn what works before you scale." |
| "Security concerns" | "Git-native architecture. Your code and context stay in your repos. We don't store source code." |
| "What's the cost?" | "Free CLI for individuals. Team plans start at [X]. ROI calculator shows break-even in [Y] weeks." |

---

## Audience Segmentation

### Segment 1: Indie Developers

**Profile:**
- Solo or small team (1-3)
- Already using AI assistants (Claude, Cursor, Copilot)
- Frustrated by context loss, cold starts
- Values speed, simplicity, git-native

**Primary Channel:** GitHub, npm, dev communities, Twitter/X

**Message Lead:** Speed + simplicity
> "Flow state in 30 seconds. Every session."

**CTA:** `npm install -g @ginkoai/cli`

**Content:**
- README with immediate value
- 30-second demo GIF
- "Get Started" in 5 minutes
- No signup required for CLI

### Segment 2: SWE Leaders

**Profile:**
- Engineering manager, tech lead, or architect
- Team of 5-50 developers
- Concerned about AI adoption at scale
- Needs to justify tools to leadership
- Values observability, governance, ROI

**Primary Channel:** Marketing site, LinkedIn, enterprise outreach

**Message Lead:** Fear → Hope → Control
> "AI is changing everything. ginko helps your team adapt—with full observability, coaching insights, and enterprise-grade collaboration."

**CTA:** "See how it works" → Demo / Trial

**Content:**
- ROI talking points
- "How to pitch to decision makers" guide
- Infographics (context loss cost, flow state ROI)
- Case study format for internal advocacy
- Comparison with Jira (feature table)

### Segment 3: Decision Makers (via SWE Leaders)

**Profile:**
- VP Engineering, CTO, Director
- Cares about: cost, risk, competitive advantage
- Doesn't use tools directly
- Needs to be convinced by their team

**Message Lead:** Competitive advantage + risk mitigation
> "Teams using AI-native tools ship faster. Teams that don't fall behind."

**Content (for SWE leaders to share):**
- Executive summary (1-pager)
- ROI calculator
- Risk/benefit analysis
- Competitive landscape ("what others are doing")

---

## Component Branding

### ginko CLI

**Name:** ginko CLI
**Tagline:** "Your AI collaboration command center."
**Description:** The developer's daily driver. Start sessions, log insights, manage context—all from the terminal.

**Key Commands:**
- `ginko start` — Back in flow in 30 seconds
- `ginko log` — Capture insights as you work
- `ginko handoff` — Clean session closure
- `ginko insights` — See your collaboration patterns

### Collaboration Graph

**Name:** Collaboration Graph
**Tagline:** "Knowledge that compounds."
**Description:** A living knowledge graph that captures decisions, patterns, and relationships. Unlike flat ticket systems, the graph shows how everything connects—and grows smarter over time.

**Key Concepts:**
- Nodes: Epics, Sprints, Tasks, ADRs, Patterns, Gotchas
- Relationships: Dependencies, references, causation
- Traversable by humans AND AI partners

### Dashboard

**Name:** ginko Dashboard
**Tagline:** "Full observability. Zero guesswork."
**Description:** See what your team and AI partners are building. Live event streams, graph visualization, and coaching insights—all in one place.

**Key Features:**
- Graph explorer (tree + card views)
- Coaching insights
- Session timeline
- Knowledge node editing

### Autonomous Agent Collaboration

**Name:** Agent Orchestration
**Tagline:** "AI partners that work together."
**Description:** Coordinate multiple AI agents on complex tasks. Real-time awareness, verification loops, and graceful recovery—built for enterprise reliability.

**Key Capabilities:**
- Multi-agent coordination
- State synchronization
- Verification and recovery
- Human oversight integration

---

## Proof Points & Validation

### Quantitative Claims (verified)

| Claim | Evidence |
|-------|----------|
| "Flow state in 30 seconds" | Session startup < 2s, context load < 500 tokens |
| "93K → 500 token reduction" | ADR-043 implementation, measured |
| "Git-native" | All context stored in `.ginko/` directory |

### Qualitative Claims (to validate with beta users)

| Claim | Validation Method |
|-------|-------------------|
| "Can't work without it" | User interviews, retention |
| "Reduces AI anxiety" | Survey, qualitative feedback |
| "Teams ship faster" | Before/after velocity comparison |
| "Knowledge compounds" | Graph growth over time |

### Claims Requiring Dashboard (EPIC-005)

| Claim | Dependency |
|-------|------------|
| "Full observability" | Graph visualization (Sprint 2) |
| "Coaching insights" | Insights engine (Sprint 3) |
| "Replaces Jira" | Feature parity demo (Sprint 4) |

---

## Messaging Do's and Don'ts

### Do

- Lead with emotion (fear → hope)
- Be specific about pain points
- Show, don't tell (demos, screenshots, GIFs)
- Acknowledge that change is hard
- Position AI as partner, not replacement
- Use developer-friendly language
- Be confident but not arrogant

### Don't

- Oversell before we have proof
- Attack Linear (yet)
- Use enterprise jargon with developers
- Assume everyone knows what "AI-native" means
- Promise features we haven't built
- Ignore the fear—acknowledge it

---

## Next Steps

### Sprint 1 (Current)
- [x] Core positioning document (this file)
- [ ] Update website hero with new tagline/description
- [ ] Indie developer elevator pitch
- [ ] SWE leader elevator pitch
- [ ] Component branding finalized
- [ ] GitHub README refresh

### Sprint 2-4
- [ ] Dashboard demonstrates claims
- [ ] Infographics and ROI tools
- [ ] Jira comparison page
- [ ] Case study template
- [ ] "How to pitch" guide

### Post-Beta
- [ ] A/B test tagline variants
- [ ] Validate claims with user data
- [ ] Refine based on feedback

---

## Changelog

### v1.0.0 - 2025-12-09
- Initial positioning document
- Defined category: "The AI Collaboration Platform"
- Established tagline: "Where humans and AI ship together."
- Mapped emotional journey: Fear → Hope → Adoption → Success
- Defined competitive stance: Jira (aggressive), Linear (hold)
- Segmented audiences: Indie devs, SWE leaders, Decision makers
- Created component branding framework
- Participants: Chris Norton (chris@watchhill.ai), Claude
