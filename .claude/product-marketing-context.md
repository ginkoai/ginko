# Product Marketing Context

*Last updated: 2026-02-08*
*Status: DRAFT - Needs Review*

## Product Overview

**One-liner:** The AI collaboration platform where humans and AI ship together.

**What it does:** Ginko is a git-native workflow tool that transforms human intent into structured, reusable knowledge. It solves the "context rot" problem—when AI assistants forget everything between sessions—by capturing decisions, patterns, and session context in version-controlled markdown files that any AI tool can discover.

**Product category:** AI Development Tools / Developer Productivity / Knowledge Management

**Product type:** SaaS with CLI

**Business model:** Freemium
- Free: $0/mo - Core CLI, local context, basic features
- Pro: $9/mo - Dashboard, graph visualization, coaching insights
- Enterprise: $29/mo - Team sync, analytics, priority support

## Target Audience

**Target companies:**
- Software development teams (2-50 developers)
- Startups and scale-ups using AI coding assistants
- Engineering teams with high AI tool adoption (Claude Code, Cursor, Copilot)

**Decision-makers:**
- Individual developers (self-serve)
- Engineering managers / Tech leads (team adoption)
- CTOs (enterprise deals)

**Primary use case:** Maintaining context continuity across AI-assisted development sessions

**Jobs to be done:**
- Resume work instantly without re-explaining context to AI
- Preserve decisions, patterns, and gotchas discovered during development
- Share team knowledge automatically through git
- Onboard new developers faster with captured institutional knowledge

**Use cases:**
- Solo developer who switches between AI tools (Claude, Cursor, Copilot)
- Team lead who wants visibility into what developers are building
- New team member who needs to get up to speed quickly
- Remote team that needs async knowledge sharing

## Personas

| Persona | Cares about | Challenge | Value we promise |
|---------|-------------|-----------|------------------|
| Individual Developer | Flow state, productivity | Re-explaining context every session | "Back in flow in 30 seconds" |
| Tech Lead / Manager | Team visibility, knowledge retention | No insight into AI-assisted work | "See what your team is building" |
| New Team Member | Getting productive fast | Learning tribal knowledge | "Onboard with full context" |

## Problems & Pain Points

**Core problem:** AI assistants have no memory. Every session starts from scratch, forcing developers to repeatedly explain context, decisions, and project nuances.

**Why alternatives fall short:**
- Wikis/docs: Static, quickly outdated, nobody maintains them
- README files: Not structured for AI consumption
- Notion pages: External to git workflow, sync friction
- Chat history: Unstructured, not shareable, tied to one tool

**What it costs them:**
- Time: 15-30 minutes per session re-establishing context
- Quality: AI makes mistakes without full context
- Knowledge: Insights vanish when sessions end
- Team: Silos form as context stays in individual heads

**Emotional tension:**
- Frustration at repeating yourself to AI
- Anxiety about losing hard-won insights
- Doubt about AI's value when it forgets everything

## Competitive Landscape

**Direct:** None identified (novel category)

**Secondary:**
- Cursor Rules / Claude Projects - Manual context setup, doesn't persist insights
- Memory features (ChatGPT) - Cloud-based, not git-native, not team-shareable
- Custom instructions - Static, doesn't learn from sessions

**Indirect:**
- Confluence/Notion - Knowledge management but not AI-optimized
- GitHub README - Documentation but not session-aware
- Slack channels - Communication but knowledge gets buried

## Differentiation

**Key differentiators:**
- Git-native: Context stored in `.ginko/` directory, version controlled
- AI-agnostic: Works with Claude, Cursor, Copilot, any AI that reads files
- Automatic capture: Session handoffs preserve context without manual docs
- Team-aware: Knowledge syncs through normal git workflow
- Privacy-first: All data local by default, opt-in sharing

**How we do it differently:**
Imperative commands (`ginko start`, `ginko handoff`) that write structured markdown to predictable locations. AI discovers context naturally by reading files.

**Why that's better:**
- No vendor lock-in (works with any AI)
- No cloud dependency (full offline operation)
- Integrates with existing git workflow
- Context compounds over time

**Why customers choose us:**
"Finally, my AI remembers what we did yesterday."

## Objections

| Objection | Response |
|-----------|----------|
| "I already use Cursor rules/Claude projects" | Those are static setup. Ginko captures evolving context—what you learned, decided, and discovered during sessions. |
| "Another tool to learn" | 3 commands to start: `init`, `start`, `handoff`. Most value in first 5 minutes. |
| "My team won't adopt it" | Starts as individual tool. Value is immediate and personal. Team features are additive. |
| "Why not just write better docs?" | You will. Ginko structures them in ways AI can consume. And it captures them automatically during work. |

**Anti-persona:**
- Teams not using AI coding assistants
- Developers who prefer to start fresh each session
- Organizations that prohibit local tooling
- Solo hobbyists with simple projects

## Switching Dynamics

**Push (away from current):**
- "I'm tired of explaining the same context every session"
- "My AI keeps making the same mistakes"
- "I lost all those insights when the chat window closed"

**Pull (toward ginko):**
- "Back in flow in 30 seconds"
- "My AI with a memory"
- "Context that compounds"

**Habit (keeping them stuck):**
- Existing workflow muscle memory
- "I'll just paste the README"
- "It's not that bad, I can re-explain"

**Anxiety (about switching):**
- "Will it slow me down?"
- "Is my code safe?"
- "Will it work with my AI tool?"

## Customer Language

**How they describe the problem:**
- "My AI forgot everything again"
- "I spent 20 minutes explaining what we did yesterday"
- "All that context is just... gone"
- "Every session is like starting over"

**How they describe us:**
- [NEEDS VERBATIM CUSTOMER QUOTES]

**Words to use:**
- Context (not "memory" - too anthropomorphic)
- Flow state
- Session continuity
- Git-native
- Compounds
- Handoff

**Words to avoid:**
- "AI memory" (implies cloud storage)
- "Sync" without privacy context
- "Magic" (undermines credibility)
- "Revolutionary" (overpromises)

**Glossary:**
| Term | Meaning |
|------|---------|
| Context rot | Loss of accumulated knowledge between AI sessions |
| Handoff | Preserving session state for future continuation |
| Flow state | Developer's productive mental state; metric (1-10) |
| Reflection | Ginko's process of transforming intent to structured output |

## Brand Voice

**Tone:** Technical but approachable. Confident without arrogance. Developer-to-developer.

**Style:** Direct, concise, shows-not-tells. Code examples over prose. Understated rather than hype.

**Personality:**
- Pragmatic (solves real problems)
- Respectful of developer time
- Quietly confident
- Privacy-conscious
- Anti-bloat

**Tagline:** "Nothing special, just quicker."

## Proof Points

**Metrics:**
- [NEEDS: Time saved per session]
- [NEEDS: Adoption metrics]
- [NEEDS: Retention data]

**Customers:**
- [NEEDS: Logo wall / testimonials]

**Testimonials:**
> [NEEDS VERBATIM CUSTOMER QUOTES]

**Value themes:**
| Theme | Proof |
|-------|-------|
| Time savings | "Back in flow in 30 seconds" |
| Knowledge preservation | Context persists across sessions |
| Team visibility | Dashboard shows what's being built |
| Privacy | Local-first, git-native, opt-in sharing |

## Goals

**Business goal:** Launch to public, achieve product-market fit with individual developers, expand to teams.

**Conversion action:**
- Primary: `npm install -g @ginkoai/cli`
- Secondary: Sign up for Pro trial

**Current metrics:**
- Status: Public Beta (Q1 2026)
- [NEEDS: Install counts, active users, conversion rates]

---

## Gaps to Fill (Discussion Needed)

1. **Customer quotes** - What are real users saying? Verbatim language?
2. **Metrics** - Install counts, DAU/MAU, conversion rates?
3. **Competitive positioning** - Anyone else doing git-native AI context?
4. **Success stories** - Any case studies or testimonials to feature?
5. **ICP refinement** - Are we targeting individuals first, then teams? Or both?
6. **Pricing validation** - Is $9 Pro / $29 Enterprise resonating?
