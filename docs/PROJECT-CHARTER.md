---
version: 1.0.0
status: active
work_mode: think-build
created: 2025-11-19
updated: 2025-11-19
---

# Project Charter: Ginko

## Purpose

**Vision:** Build foundational infrastructure for human-AI collaboration that preserves rapport, continuity, and flow state across all domains.

**Problem:** AI-assisted development is emerging as the dominant mode of software development, but critical collaboration challenges remain:

- **Context Management**: Context windows have limits. Even large windows (1M+ tokens) experience degradation and hallucination. Loading the right amount of strategic and tactical context remains unsolved.

- **Loss of Rapport**: AI models are stateless by design. Each new session is a cold introduction, erasing the rapport and shared understanding built in previous sessions. For humans accustomed to durable working relationships, this is jarring and alienating.

- **Continuity of Flow State**: Human-AI collaboration leverages comparative advantages - human judgment/taste/intuition and AI stamina/speed/synthesis. When done well, this achieves deep flow states where focus and productivity are optimized. At session end, this rapport evaporates and must be rebuilt manually, causing frustration and fatigue.

- **Team Collaboration**: Legacy project management systems are built for humans only. Documents and plans in proprietary formats are locked in disparate cloud platforms, inaccessible to AI partners. Moreover, AI-assisted development occurs at a pace much faster than traditional human-only development. Legacy PM platforms cannot keep up.

- **Human-centered UX**: Legacy development tooling is human-centered, not human-AND-AI-centered. An AI-native platform must be equally accessible to both partners in formats optimized for each. By applying principles from User Experience and Human-Centered Design, we can adapt effective patterns to optimize tools for AI partners on an equal basis.

**Solution:** Ginko is a graph-based context management system that treats AI partners as equal collaborators. Through continuous event streaming, strategic context surfacing, and rapport-preserving architecture, Ginko enables anxiety-free AI collaboration that puts developers in flow state within seconds of every session.

## Users

**Primary (v1):**
- **Solo developers** using AI assistants (Claude, Cursor, Copilot) for software development
- **Small teams** (2-5 developers) coordinating AI-assisted work on shared codebases

**Secondary (Roadmap):**
- **SMB development teams** (5-50 developers) with established processes
- **Enterprise engineering organizations** with compliance and governance requirements

**Long-term Vision:**
- Human-AI collaboration across all domains: education, healthcare, entertainment, manufacturing, retail, finance, law, government, public safety
- Universal adoption wherever humans and AI work together

**User Needs:**
- Rapid return to flow state (< 30 seconds per session)
- Zero context loss across sessions
- Collaborative rapport with AI partners
- Team coordination without friction
- Privacy and control over data

## Success Criteria

### Qualitative (Primary)

The MVP succeeds when the experience is **bullet-proof magical**:

- [ ] **Magical onboarding**: New user productive in < 5 minutes, zero required configuration
- [ ] **Excellent rapport continuity**: AI partner resumes with full context, no "cold start" feeling
- [ ] **Rapid flow state recovery**: Developer back in flow within 30 seconds of `ginko start`
- [ ] **Reliability**: Zero context loss, zero crashes, works offline-capable
- [ ] **"Can't imagine working without it"**: Sticky, essential tool that feels broken to remove

### Quantitative (Secondary)

- [ ] Session startup < 2s (achieved)
- [ ] AI partner readiness: 7-8/10 (vs 6.5/10 baseline)
- [ ] Onboarding time: < 5 minutes from install to first productive session
- [ ] Context relevance: AI asks 1-3 clarifying questions (vs 5-7 baseline)

### Validation

- **Primary**: Founder's judgment as architect and developer ("does it feel right?")
- **Secondary**: Early adopter feedback when shared publicly
- **Timeline**: Weeks, not months

## Scope

### In Scope (v1)

- **Graph-based session management**: Neo4j knowledge graph as source of truth
- **Event-based context loading**: Continuous streaming of significant events (ADR-043)
- **Strategic context surfacing**: Charter, team activity, patterns/gotchas (EPIC-001)
- **Session synthesis**: Continuous synthesis under optimal pressure
- **Cloud-first architecture**: Graph hosted in cloud, documents in git synced for traversability
- **CLI for all operations**: Primary interface (`ginko start`, `ginko log`, `ginko handoff`)
- **Web dashboard**: Context visualization and exploration (already built)
- **Knowledge graph integration**: Typed relationships, WHY→WHAT→HOW chains (already built)
- **Handoff as housekeeping trigger**: Collaborative session closure with task verification

### Out of Scope (v1)

- **Native IDE plugins**: Use CLI integration via PATH/config (proven for VS Code)
- **Enterprise features**: SSO, audit logs, compliance reporting
- **Non-dev domains**: Healthcare, finance, education, etc. (roadmap)
- **Multi-project insights**: Cross-project pattern discovery
- **Handoff as synthesis mechanism**: Deprecated due to context pressure unreliability

### To Be Determined

- **Handoff evolution**: Role as session marker vs housekeeping checklist
- **Team collaboration depth**: How much coordination tooling for small teams?
- **Privacy controls**: What granularity of data sharing for team contexts?
- **AI model integrations**: Which models to support explicitly?

## Constraints

### Technical

- **Current stack**: Node.js, TypeScript, React, Neo4j, GraphQL
- **Hosting**: Vercel (frontend/API) + Supabase (auth/data) for MVP simplicity
- **At scale**: Likely migrate to AWS or similar cloud provider
- **Flexibility**: Can adapt and adopt as needed; stack is working well

### Resource

- **Funding**: Bootstrapped, self-funded (~$100s not $1,000s per month)
- **Team**: Solo developer (Chris Norton)
- **Philosophy**: Constraints force better thinking

### Timeline

- **Target**: Weeks, not months
- **Current state**: Close to MVP now
- **Approach**: Iterative, experience-driven development

## Risks & Mitigation

### High Priority

| Risk | Likelihood | Impact | Mitigation |
|------|-----------|--------|------------|
| **Magic doesn't translate to others** | Medium | High | Founder already can't work without it (strong signal). Early adopter validation. Accept that not everyone will feel it. |
| **Competition beats us to market** | Medium | Medium | Claude Code has "skills" overlap, many "context management" tools exist. **Differentiator: Rapport through AI-first collaboration.** Experience > features. If we nail the feel, people will notice. |
| **Adoption friction** | Medium | High | Magical onboarding (< 5min), works immediately, no configuration hell. Focus on "holy shit" first impression. |

### Low Priority

| Risk | Likelihood | Impact | Mitigation |
|------|-----------|--------|------------|
| **Technical complexity** | Low | Medium | Architecture is intentionally simple: CLI + graph + OAuth/REST. Nothing groundbreaking. Challenge is feel, not technology. |
| **Scaling costs** | Low | Medium | Bootstrap budget forces efficiency. Graph queries optimized. Can optimize or migrate if/when needed. |

## Differentiators

### What Makes Ginko Different

**Rapport over memory.** Most "context management" tools focus on storing information. Ginko focuses on preserving the *relationship* between human and AI partners.

**AI-first collaboration.** Tooling designed for both partners equally, not bolted onto human-only tools.

**Experience over features.** Goal: "Anxiety-free AI collaboration that puts you in flow state in seconds every time."

**Validated approach.** Claude Code's success shows that rapport and experience differentiate AI tools. People *feel* the difference.

## Team

- **Chris Norton** (chris@watchhill.ai) - Founder, Developer, Architect
- **Claude** (Anthropic) - AI Development Partner

## Timeline

### Current Phase: MVP Polish (November 2025)

**Status:** Close to completion

**Focus:** Experiential refinement
- Strategic context surfacing (EPIC-001 Sprint 1)
- Charter integration and display
- Magical onboarding experience
- Reliability and polish

**Target:** Production-ready MVP within weeks

### Next Phase: Early Adopters (December 2025)

- Share with trusted developers
- Validate "can't work without it" hypothesis
- Gather feedback on rapport continuity
- Iterate on feel and experience

### Roadmap: Scale & Expand (2026+)

- Small team features (team coordination, shared context)
- SMB features (multi-project, analytics)
- Enterprise features (SSO, audit, compliance)
- Cross-domain expansion (beyond software development)

## Alternatives Considered

### Cloud-first vs Privacy-first

**Decision:** Cloud-first
**Rationale:** Developers already use cloud AI models, cloud git hosts, cloud IDEs. Privacy-as-selling-point rejected - everything is online including AI models. Documents remain in git but sync to graph for traversability.

### Handoff synthesis vs Continuous logging

**Decision:** Continuous logging (ADR-033)
**Rationale:** Session synthesis under high context pressure (85%+) is unreliable. Continuous streaming of significant events provides better signal. Handoff preserved as collaborative closure ritual and housekeeping trigger.

### Git-native vs Graph-native

**Decision:** Graph-native with git as document store
**Rationale:** Graph provides relationship traversal, team coordination, cross-session continuity. Git remains authoritative for documents but synced to graph for traversability.

### Feature parity vs Experience focus

**Decision:** Experience focus
**Rationale:** Many tools have similar features. Differentiator is how it *feels*. Rapport, flow state, anxiety-free collaboration. Quality over completeness.

---

## Changelog

### v1.0.0 - 2025-11-19
- Initial charter creation
- Participants: Chris Norton (chris@watchhill.ai), Claude
- Conversation: ~30 minutes
- Format: AI-mediated natural conversation following charter template
- Work mode: Think & Build (standard depth)
