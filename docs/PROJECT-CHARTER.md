---
version: 2.0.0
status: active
work_mode: think-build
created: 2025-11-19
updated: 2025-12-11
---

# Project Charter: ginko

## Purpose

**Category:** ginko is **The AI Collaboration Platform**.

**Tagline:** "Where humans and AI ship together."

**Vision:** Create the category of AI-native project management—tools built from the ground up for teams that work with AI partners, not around them.

**Problem:** AI is changing software development faster than most teams can adapt:

- **The Adoption Gap**: Most developers are stuck in "dabbling" mode—ChatGPT for writing, Copilot for autocomplete. The gap between AI potential and actual adoption is widening.

- **Context Loss**: Context windows have limits. Even large windows experience degradation. Every new session starts cold, erasing the shared understanding built in previous sessions. Developers waste 10+ minutes per session re-explaining their projects.

- **Invisible AI Work**: Engineering leaders have no visibility into how their teams collaborate with AI. What's working? What's failing? Where are we wasting tokens? Legacy PM tools assume humans do everything.

- **Team Coordination**: Legacy project management systems (Jira, ADO) aren't built for AI-assisted development velocity. Documents and plans are locked in proprietary formats, inaccessible to AI partners.

- **Fear of Obsolescence**: The ground is shifting. AI capabilities are accelerating faster than teams can adapt. Fear is real and rational—and current tools aren't helping.

**Solution:** ginko makes AI collaboration **safe, observable, and learnable**:

- **Safe**: Git-native architecture. Your code and context stay in your repos. Enterprise-ready from day one.
- **Observable**: Full visibility into what your team and AI partners are building. Live dashboards, event streams, collaboration graphs.
- **Learnable**: Coaching insights that help developers adapt. Knowledge compounds in the graph over time.

## Users

### Primary Audiences

**1. Indie Developers**
- Solo or small team (1-3)
- Already using AI assistants (Claude, Cursor, Copilot)
- Frustrated by context loss, cold starts
- Values speed, simplicity, git-native

**Primary Message:** "Flow state in 30 seconds. Every session."

**2. SWE Leaders**
- Engineering manager, tech lead, or architect
- Team of 5-50 developers
- Concerned about AI adoption at scale
- Needs to justify tools to leadership
- Values observability, governance, ROI

**Primary Message:** "Your team is using AI. Do you know how?"

**3. Decision Makers** (via SWE Leaders)
- VP Engineering, CTO, Director
- Cares about: cost, risk, competitive advantage
- Doesn't use tools directly
- Needs to be convinced by their team

**Primary Message:** "Teams using AI-native tools ship faster. Teams that don't fall behind."

### User Needs

| Audience | Primary Need | Secondary Needs |
|----------|-------------|-----------------|
| Indie Devs | Rapid flow state (< 30s) | Zero context loss, git-native, no lock-in |
| SWE Leaders | Visibility into AI work | Coaching structure, ROI metrics, governance |
| Decision Makers | Competitive advantage | Risk mitigation, cost control, talent retention |

## Success Criteria

### Qualitative (Primary)

The platform succeeds when:

- [x] **Magical onboarding**: New user productive in < 5 minutes, zero required configuration
- [x] **Rapid flow state**: Developer back in flow within 30 seconds of `ginko start`
- [ ] **"Can't imagine working without it"**: Sticky, essential tool that feels broken to remove
- [ ] **Observability delivers confidence**: Teams trust AI work because they can see it
- [ ] **Knowledge compounds**: Graph becomes more valuable over time, not stale

### Quantitative (Secondary)

- [x] Session startup < 2s (achieved: ADR-043)
- [x] Context token reduction > 65% (achieved: 93K → 500 tokens, 99%+ reduction)
- [ ] Onboarding time: < 5 minutes from install to first productive session
- [ ] Dashboard adoption: Teams check dashboard weekly for insights
- [ ] Retention: Users return daily after first week

### Validation

- **Primary**: User feedback on experience ("does it feel right?")
- **Secondary**: Usage metrics (session frequency, graph growth, dashboard engagement)
- **Timeline**: Iterative, experience-driven development

## Scope

### In Scope (Current)

**Core Platform:**
- **ginko CLI**: The developer's daily driver (`start`, `log`, `handoff`, `insights`)
- **Collaboration Graph**: Knowledge backbone with typed relationships (Neo4j)
- **Dashboard**: Observability layer with graph visualization and coaching insights
- **Event-based context loading**: Continuous streaming of significant events (ADR-043)

**Architecture:**
- Cloud-first: Graph hosted in cloud, documents in git synced for traversability
- Git-native: All context stored in `.ginko/` directory, portable and version-controlled
- OAuth/REST API: Simple, proven patterns

**Key Components:**
| Component | Tagline | Role |
|-----------|---------|------|
| ginko CLI | "Your AI collaboration command center" | Primary interface for developers |
| Collaboration Graph | "Knowledge that compounds" | Living knowledge graph of decisions, patterns, relationships |
| Dashboard | "Full observability. Zero guesswork" | Visibility into team + AI collaboration |
| Agent Orchestration | "AI partners that work together" | Multi-agent coordination (roadmap) |

### Out of Scope (Current)

- Native IDE plugins (CLI integration via PATH/config is sufficient)
- Enterprise features (SSO, audit logs, compliance reporting)
- Non-dev domains (healthcare, finance, education—roadmap)
- Multi-project insights (cross-project pattern discovery—roadmap)

### To Be Determined

- Team collaboration depth (how much coordination tooling?)
- Privacy controls granularity (data sharing for team contexts?)
- Coaching insights engine (what patterns to surface?)
- Agent orchestration scope (how autonomous?)

## Competitive Positioning

### Primary: Jira (Atlassian)

**Stance:** Direct replacement for AI-native teams

**The Contrast:**

| Jira | ginko |
|------|-------|
| Built for humans only | Built for humans + AI partners |
| Manual status updates | Automatic event streaming |
| Knowledge trapped in tickets | Knowledge compounds in graph |
| Sprint planning is ceremony | Sprints adapt in real-time |
| No observability | Live dashboards |
| No coaching | AI-powered insights |
| Context cold every time | Flow state in 30 seconds |

**Attack Line:** "Jira was built for a world where humans did everything. That world is gone."

### Secondary: Linear

**Stance:** Respectful hold

**Rationale:** Linear's design quality is exceptional. We earn the right to compete by matching their craft. Do not attack directly until we have feature parity on UX polish.

### Tertiary: GitHub Issues, ADO, Notion

**Stance:** "Works alongside" for now. Future replacement path.

## Differentiators

### What Makes ginko Different

**1. AI-First Collaboration**
Tooling designed for both partners equally—not bolted onto human-only tools.

**2. Observability, Not Just Memory**
Most "context management" tools focus on storing information. ginko provides visibility into the collaboration itself—what's working, what's not, where to improve.

**3. Knowledge That Compounds**
Unlike flat ticket systems, the collaboration graph shows how everything connects—and grows smarter over time. Your AI partner can traverse it, not just read it.

**4. Experience Over Features**
Goal: "Anxiety-free AI collaboration that puts you in flow state in seconds every time." Quality over completeness.

## Constraints

### Technical

- **Current stack**: Node.js, TypeScript, React, Neo4j, Voyage AI (embeddings)
- **Hosting**: Vercel (frontend/API) + Neo4j Aura (graph)
- **At scale**: Architecture supports enterprise scale
- **Flexibility**: Can adapt as needed; stack is working well

### Resource

- **Funding**: Bootstrapped, self-funded
- **Team**: Solo developer (Chris Norton) + AI partners
- **Philosophy**: Constraints force better thinking

### Timeline

- **Approach**: Iterative, experience-driven development
- **Current state**: Market readiness phase (EPIC-005)
- **Validation**: User feedback, not arbitrary deadlines

## Risks & Mitigation

### High Priority

| Risk | Likelihood | Impact | Mitigation |
|------|-----------|--------|------------|
| **Magic doesn't translate to others** | Medium | High | Founder validated. Early adopter feedback. Accept that not everyone will feel it. |
| **Competition beats us to market** | Medium | Medium | Many "context tools" exist. **Differentiator: Observability + Experience.** If we nail the feel, people will notice. |
| **Adoption friction** | Medium | High | Magical onboarding (< 5min), works immediately, "holy shit" first impression. |
| **Jira entrenchment** | High | Medium | Position as complement first, replacement over time. SWE leaders as internal advocates. |

### Low Priority

| Risk | Likelihood | Impact | Mitigation |
|------|-----------|--------|------------|
| **Technical complexity** | Low | Medium | Architecture intentionally simple. Challenge is feel, not technology. |
| **Scaling costs** | Low | Medium | Bootstrap budget forces efficiency. Can optimize if/when needed. |

## Team

- **Chris Norton** (chris@watchhill.ai) - Founder, Developer, Architect
- **Claude** (Anthropic) - AI Development Partner

## Timeline & Phases

### Completed: Foundation (Nov 2025)

- ✅ Core CLI functionality (`start`, `log`, `handoff`)
- ✅ Event-based context loading (ADR-043: 99% token reduction)
- ✅ Session logging under optimal pressure (ADR-033)
- ✅ Knowledge graph integration
- ✅ Basic dashboard

### Current: Market Readiness (Dec 2025 - EPIC-005)

**Sprint 1 (Complete):**
- ✅ Product positioning crystallized
- ✅ Dual audience strategy (indie devs + SWE leaders)
- ✅ Dashboard visual refresh (dark theme, brand alignment)
- ✅ Infographic concepts for internal advocacy

**Sprint 2-4 (Planned):**
- Graph visualization in dashboard
- Coaching insights engine
- Marketing site updates
- Early adopter outreach

### Next: Early Adopters (Q1 2026)

- Share with trusted developers
- Validate "can't work without it" hypothesis
- Iterate on observability and coaching features
- Gather feedback on team collaboration

### Roadmap: Scale & Expand (2026+)

- Small team features (team coordination, shared context)
- SMB features (multi-project, analytics)
- Enterprise features (SSO, audit, compliance)
- Agent orchestration (multi-agent coordination)
- Cross-domain expansion (beyond software development)

## Alternatives Considered

### "Context Management" vs "AI Collaboration Platform"

**Decision:** AI Collaboration Platform
**Rationale:** "Context management" is narrow and technical. "AI Collaboration Platform" captures the full vision: observability, coaching, team coordination—not just memory.

### Cloud-first vs Privacy-first

**Decision:** Cloud-first
**Rationale:** Developers already use cloud AI models, cloud git hosts, cloud IDEs. Privacy-as-selling-point rejected. Documents remain in git but sync to graph for traversability and team coordination.

### Aggressive vs Respectful Competition

**Decision:** Aggressive on Jira, respectful hold on Linear
**Rationale:** Jira represents the old world—human-only tooling. Clear contrast helps positioning. Linear's design quality demands respect—earn the right to compete.

### Feature Parity vs Experience Focus

**Decision:** Experience focus
**Rationale:** Many tools have similar features. Differentiator is how it *feels*. Rapport, flow state, observable collaboration. Quality over completeness.

---

## Changelog

### v2.0.0 - 2025-12-11
- **Major update** reflecting EPIC-005 product positioning work
- Reframed as "The AI Collaboration Platform" (not just context management)
- Added tagline: "Where humans and AI ship together"
- Expanded value proposition: safe, observable, learnable
- Added audience segmentation (indie devs, SWE leaders, decision makers)
- Added competitive positioning (Jira aggressive, Linear hold)
- Updated component branding (CLI, Graph, Dashboard, Agent Orchestration)
- Refreshed timeline to reflect current phase (Market Readiness)
- Added key decisions from Sprint 1 positioning work
- Participants: Chris Norton (chris@watchhill.ai), Claude

### v1.0.0 - 2025-11-19
- Initial charter creation
- Participants: Chris Norton (chris@watchhill.ai), Claude
- Format: AI-mediated natural conversation following charter template
